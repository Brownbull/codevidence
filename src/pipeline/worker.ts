/**
 * src/pipeline/worker.ts — Worker polling loop for the scan job queue.
 *
 * Polls scan_jobs every 10s for pending jobs, executes them atomically,
 * and handles retry/failure with exponential backoff. Failed jobs never
 * crash the worker — all errors are caught and logged.
 */

import {
  fetchNextPendingJob,
  markJobRunning,
  markJobCompleted,
  markJobFailed,
  POLL_INTERVAL_MS,
} from './queue.js';
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

/** Returns true if the worker is currently running. */
export function isWorkerRunning(): boolean {
  return _running;
}

// ─── Worker loop ──────────────────────────────────────────────────────────────

/**
 * Starts the worker polling loop.
 * Polls every POLL_INTERVAL_MS for the next pending job.
 * Calls stop() to halt.
 */
export function startWorker(handlers: JobHandlerRegistry): void {
  if (_running) {
    console.log('[worker] Already running — ignoring duplicate start.');
    return;
  }

  _running = true;
  console.log(`[worker] Starting. Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
  scheduleNextPoll(handlers);
}

/** Stops the worker polling loop after the current poll cycle completes. */
export function stopWorker(): void {
  _running = false;
  if (_pollTimer !== null) {
    clearTimeout(_pollTimer);
    _pollTimer = null;
  }
  console.log('[worker] Stopped.');
}

/** Schedules the next poll cycle. */
function scheduleNextPoll(handlers: JobHandlerRegistry): void {
  if (!_running) return;
  _pollTimer = setTimeout(() => void pollOnce(handlers), POLL_INTERVAL_MS);
}

/**
 * Executes one poll cycle:
 * 1. Fetch next pending job (priority DESC, createdAt ASC)
 * 2. Mark running
 * 3. Execute handler
 * 4. Mark completed or failed
 * 5. Schedule next poll
 */
export async function pollOnce(handlers: JobHandlerRegistry): Promise<void> {
  try {
    const job = await fetchNextPendingJob();

    if (!job) {
      scheduleNextPoll(handlers);
      return;
    }

    console.log(`[worker] Picked up job ${job.id} (type=${job.type}, attempts=${job.attempts})`);

    await markJobRunning(job.id);
    await executeJob(job, handlers);
  } catch (err) {
    // Top-level error guard: worker must never crash
    console.error('[worker] Unexpected poll error:', err);
  } finally {
    scheduleNextPoll(handlers);
  }
}

/** Executes a job via its registered handler, handling success and failure. */
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
  }
}
