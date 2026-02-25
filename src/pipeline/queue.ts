/**
 * src/pipeline/queue.ts — ScanJob queue operations.
 *
 * Handles creation and atomic status transitions for ScanJob documents
 * in the scan_jobs Firestore collection.
 *
 * All Firestore access goes through src/core/db/firestore.ts.
 */

import type { ScanJob, ScanJobType, DiscoverPayload, ScanRepoPayload, RescanPayload } from '../types/scan-job.js';
import {
  addDoc,
  updateDoc,
  queryDocs,
  serverTimestamp,
  where,
  orderBy,
  limit,
  runTransaction,
  docRef,
  type Timestamp,
} from '../core/db/firestore.js';

export const SCAN_JOBS_COLLECTION = 'scan_jobs';
export const MAX_ATTEMPTS = 3;
export const POLL_INTERVAL_MS = 10_000;

// ─── Job creation ─────────────────────────────────────────────────────────────

/**
 * Enqueues a discover ScanJob in scan_jobs collection.
 * Returns the new document ID.
 */
export async function enqueueDiscoverJob(payload: DiscoverPayload): Promise<string> {
  return enqueueJob('discover', payload, 0);
}

/**
 * Enqueues a scan-repo ScanJob. Priority 0 for normal scans, 1 for rescans.
 */
export async function enqueueScanRepoJob(payload: ScanRepoPayload, priority = 0): Promise<string> {
  return enqueueJob('scan-repo', payload, priority);
}

/**
 * Enqueues a rescan ScanJob in scan_jobs collection.
 * Rescan jobs get higher priority (1) than discover jobs (0).
 */
export async function enqueueRescanJob(payload: RescanPayload): Promise<string> {
  return enqueueJob('rescan-candidate', payload, 1);
}

/** Internal helper to create a ScanJob with common defaults. */
async function enqueueJob(
  type: ScanJobType,
  payload: ScanJob['payload'],
  priority: number
): Promise<string> {
  const now = serverTimestamp();
  const jobData = {
    type,
    status: 'pending' as const,
    payload,
    attempts: 0,
    maxAttempts: MAX_ATTEMPTS,
    lastAttemptAt: null,
    completedAt: null,
    failedAt: null,
    errorMessage: null,
    rateLimitedUntil: null,
    priority,
    workerId: null,
    heartbeatAt: null,
    claimedAt: null,
    createdAt: now,
    updatedAt: now,
  };
  return addDoc<Omit<ScanJob, 'id'>>(SCAN_JOBS_COLLECTION, jobData);
}

// ─── Atomic job claiming ──────────────────────────────────────────────────────

/**
 * Atomically claims the next pending job via Firestore transaction.
 *
 * 1. Query top 5 pending jobs (outside transaction — read-only)
 * 2. For each candidate, attempt a transaction that re-reads and verifies
 *    the job is still pending before updating to running
 * 3. First successful transaction wins; losers try next candidate
 *
 * Returns null if no claimable jobs exist.
 */
export async function claimNextJob(
  workerId: string
): Promise<(ScanJob & { id: string }) | null> {
  const candidates = await queryDocs<ScanJob>(
    SCAN_JOBS_COLLECTION,
    where('status', '==', 'pending'),
    orderBy('priority', 'desc'),
    orderBy('createdAt', 'asc'),
    limit(5)
  );

  if (candidates.length === 0) return null;

  for (const candidate of candidates) {
    if (candidate.rateLimitedUntil !== null) {
      const limitUntil = (candidate.rateLimitedUntil as Timestamp).toMillis();
      if (Date.now() < limitUntil) continue;
    }

    const claimed = await tryClaimJob(candidate.id, workerId);
    if (claimed) return claimed;
  }

  return null;
}

/**
 * Attempts to atomically claim a job via Firestore transaction.
 * Returns the job if claimed, null if already taken by another worker.
 */
async function tryClaimJob(
  jobId: string,
  workerId: string
): Promise<(ScanJob & { id: string }) | null> {
  try {
    return await runTransaction(async (transaction) => {
      const ref = docRef<ScanJob>(SCAN_JOBS_COLLECTION, jobId);
      const snap = await transaction.get(ref);

      if (!snap.exists()) return null;

      const job = snap.data() as ScanJob;
      if (job.status !== 'pending') return null;

      transaction.update(ref, {
        status: 'running',
        workerId,
        claimedAt: serverTimestamp(),
        heartbeatAt: serverTimestamp(),
        lastAttemptAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });

      return { ...job, id: snap.id } as ScanJob & { id: string };
    });
  } catch {
    return null;
  }
}

// ─── Heartbeat and stale recovery ─────────────────────────────────────────────

/** Stale threshold: 5 minutes without heartbeat. */
export const STALE_JOB_THRESHOLD_MS = 5 * 60 * 1000;

/** Updates the heartbeat timestamp for a running job. */
export async function updateHeartbeat(jobId: string): Promise<void> {
  await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
    heartbeatAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/**
 * Finds running jobs with stale heartbeats and resets them to pending.
 * Skips legacy jobs (heartbeatAt === null) to avoid reclaiming pre-upgrade jobs.
 */
export async function reclaimStaleJobs(): Promise<number> {
  const running = await queryDocs<ScanJob>(
    SCAN_JOBS_COLLECTION,
    where('status', '==', 'running'),
    limit(50)
  );

  const staleThreshold = Date.now() - STALE_JOB_THRESHOLD_MS;
  let reclaimed = 0;

  for (const job of running) {
    if (!job.heartbeatAt) continue;
    const heartbeatMs = (job.heartbeatAt as Timestamp).toMillis();
    if (heartbeatMs < staleThreshold) {
      await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, job.id, {
        status: 'pending',
        workerId: null,
        claimedAt: null,
        heartbeatAt: null,
        errorMessage: `Reclaimed: worker ${job.workerId ?? 'unknown'} went stale`,
        updatedAt: serverTimestamp(),
      });
      reclaimed++;
      console.log(`[queue] Reclaimed stale job ${job.id} (worker: ${job.workerId ?? 'unknown'})`);
    }
  }

  return reclaimed;
}

// ─── Status transitions ───────────────────────────────────────────────────────

/** Transitions a running job → completed, clears worker ownership. */
export async function markJobCompleted(jobId: string): Promise<void> {
  await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
    status: 'completed',
    completedAt: serverTimestamp(),
    workerId: null,
    claimedAt: null,
    heartbeatAt: null,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Handles job failure with exponential backoff retry logic.
 *
 * - attempts < maxAttempts → status: pending (retry), no failedAt set
 * - attempts >= maxAttempts → status: failed, failedAt set
 *
 * Backoff delay: 2^attempts minutes.
 */
export async function markJobFailed(
  jobId: string,
  attempts: number,
  maxAttempts: number,
  errorMessage: string
): Promise<void> {
  const newAttempts = attempts + 1;

  if (newAttempts < maxAttempts) {
    // Retry: re-queue as pending with backoff, clear worker ownership
    await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
      status: 'pending',
      attempts: newAttempts,
      errorMessage,
      rateLimitedUntil: null,
      workerId: null,
      claimedAt: null,
      heartbeatAt: null,
      updatedAt: serverTimestamp(),
    });
  } else {
    // Exhausted attempts → permanently failed, clear worker ownership
    await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
      status: 'failed',
      attempts: newAttempts,
      errorMessage,
      failedAt: serverTimestamp(),
      workerId: null,
      claimedAt: null,
      heartbeatAt: null,
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Sets rateLimitedUntil on a job and keeps it pending.
 * Worker will skip this job until the timestamp passes.
 */
export async function markJobRateLimited(jobId: string, retryAfterMs: number): Promise<void> {
  const rateLimitedUntilMs = Date.now() + retryAfterMs;
  const rateLimitedUntil = new Date(rateLimitedUntilMs);

  // Store as a plain number (ms since epoch) since serverTimestamp() can't be
  // used for future timestamps — Firestore Timestamps are constructed from Dates.
  await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
    status: 'pending',
    rateLimitedUntil: rateLimitedUntil as unknown as Timestamp,
    updatedAt: serverTimestamp(),
  });
}

// ─── Status query ─────────────────────────────────────────────────────────────

/** Returns jobs filtered by status for the scan status command. */
export async function fetchJobsByStatus(
  status: ScanJob['status'],
  maxResults = 20
): Promise<(ScanJob & { id: string })[]> {
  return queryDocs<ScanJob>(
    SCAN_JOBS_COLLECTION,
    where('status', '==', status),
    orderBy('updatedAt', 'desc'),
    limit(maxResults)
  );
}

/** Returns recent jobs across all statuses for summary display. */
export async function fetchRecentJobs(maxResults = 50): Promise<(ScanJob & { id: string })[]> {
  return queryDocs<ScanJob>(
    SCAN_JOBS_COLLECTION,
    orderBy('createdAt', 'desc'),
    limit(maxResults)
  );
}
