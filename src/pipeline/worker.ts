/**
 * src/pipeline/worker.ts — Worker polling loop for the scan job queue.
 *
 * Uses atomic job claiming via Firestore transactions for safe parallel
 * execution across multiple worker processes and machines. Includes
 * heartbeat for stale job detection and automatic recovery.
 */

import {
  claimNextJob,
  markJobCompleted,
  markJobFailed,
  updateHeartbeat,
  reclaimStaleJobs,
  POLL_INTERVAL_MS,
} from './queue.js';
import { getWorkerId } from './worker-id.js';
import type { ScanJob } from '../types/scan-job.js';

// ─── Job handler type ─────────────────────────────────────────────────────────

/**
 * A job handler receives a ScanJob and runs it.
 * Throw any error to trigger retry/failure logic.
 */
export type JobHandler = (job: ScanJob & { id: string }) => Promise<void>;

/** Registry of handlers keyed by ScanJobType. */
export type JobHandlerRegistry = Partial<Record<ScanJob['type'], JobHandler>>;

// ─── Worker state ─────────────────────────────────────────────────────────────

let _running = false;
let _pollTimer: ReturnType<typeof setTimeout> | null = null;
let _pollCount = 0;

const STALE_CHECK_EVERY = 6; // Every 6th poll ≈ 60s at 10s interval
const HEARTBEAT_INTERVAL_MS = 60_000;

/** Returns true if the worker is currently running. */
export function isWorkerRunning(): boolean {
  return _running;
}

// ─── Worker loop ──────────────────────────────────────────────────────────────

/**
 * Starts the worker polling loop.
 * Polls every POLL_INTERVAL_MS for the next pending job.
 * Calls stopWorker() to halt.
 */
export function startWorker(handlers: JobHandlerRegistry): void {
  if (_running) {
    console.log('[worker] Already running — ignoring duplicate start.');
    return;
  }

  _running = true;
  const wid = getWorkerId();
  console.log(`[worker:${wid}] Starting. Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
  scheduleNextPoll(handlers);
}

/** Stops the worker polling loop after the current poll cycle completes. */
export function stopWorker(): void {
  _running = false;
  if (_pollTimer !== null) {
    clearTimeout(_pollTimer);
    _pollTimer = null;
  }
  console.log(`[worker:${getWorkerId()}] Stopped.`);
}

/** Schedules the next poll cycle. */
function scheduleNextPoll(handlers: JobHandlerRegistry): void {
  if (!_running) return;
  _pollTimer = setTimeout(() => void pollOnce(handlers), POLL_INTERVAL_MS);
}

/** Returns true every Nth poll cycle for periodic stale-job checks. */
function shouldCheckStale(): boolean {
  _pollCount++;
  return _pollCount % STALE_CHECK_EVERY === 0;
}

/**
 * Executes one poll cycle:
 * 1. (Periodically) Reclaim stale jobs from crashed workers
 * 2. Atomically claim next pending job via transaction
 * 3. Execute handler with heartbeat
 * 4. Mark completed or failed
 * 5. Schedule next poll
 */
export async function pollOnce(handlers: JobHandlerRegistry): Promise<void> {
  const wid = getWorkerId();

  try {
    if (shouldCheckStale()) {
      const reclaimed = await reclaimStaleJobs();
      if (reclaimed > 0) console.log(`[worker:${wid}] Reclaimed ${reclaimed} stale job(s).`);
    }

    const job = await claimNextJob(wid);
    if (!job) {
      scheduleNextPoll(handlers);
      return;
    }

    console.log(`[worker:${wid}] Claimed job ${job.id} (type=${job.type}, attempts=${job.attempts})`);
    await executeJob(job, handlers);
  } catch (err) {
    console.error(`[worker:${wid}] Unexpected poll error:`, err);
  } finally {
    scheduleNextPoll(handlers);
  }
}

/**
 * Processes the next pending job without scheduling follow-up polls.
 * Used by the `scan run` interactive command for batch processing.
 * Returns true if a job was processed, false if no pending jobs exist.
 */
export async function processOneJob(handlers: JobHandlerRegistry): Promise<boolean> {
  const wid = getWorkerId();
  const job = await claimNextJob(wid);
  if (!job) return false;

  console.log(`[worker:${wid}] Claimed job ${job.id} (type=${job.type}, attempts=${job.attempts})`);
  await executeJob(job, handlers);
  return true;
}

/**
 * Executes a job via its registered handler with heartbeat.
 * Heartbeat interval keeps the job alive during long-running tasks;
 * cleared on completion or failure.
 */
async function executeJob(
  job: ScanJob & { id: string },
  handlers: JobHandlerRegistry
): Promise<void> {
  const handler = handlers[job.type];

  if (!handler) {
    console.warn(`[worker] No handler registered for job type "${job.type}" — marking failed.`);
    await markJobFailed(
      job.id,
      job.attempts,
      job.maxAttempts,
      `No handler registered for job type: ${job.type}`
    );
    return;
  }

  // Start heartbeat interval for stale detection
  const heartbeatTimer = setInterval(() => {
    void updateHeartbeat(job.id).catch((err) =>
      console.warn(`[worker] Heartbeat failed for ${job.id}:`, err)
    );
  }, HEARTBEAT_INTERVAL_MS);

  try {
    await handler(job);
    await markJobCompleted(job.id);
    console.log(`[worker] Job ${job.id} completed.`);
  } catch (err) {
    const errorMessage = err instanceof Error ? err.message : String(err);
    console.error(`[worker] Job ${job.id} failed: ${errorMessage}`);

    await markJobFailed(job.id, job.attempts, job.maxAttempts, errorMessage);

    const nextAttempts = job.attempts + 1;
    if (nextAttempts < job.maxAttempts) {
      const backoffMin = Math.pow(2, nextAttempts);
      console.log(`[worker] Job ${job.id} will retry in ~${backoffMin}m (attempt ${nextAttempts}/${job.maxAttempts}).`);
    } else {
      console.log(`[worker] Job ${job.id} permanently failed after ${nextAttempts} attempts.`);
    }
  } finally {
    clearInterval(heartbeatTimer);
  }
}
