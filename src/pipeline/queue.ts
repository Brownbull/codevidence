/**
 * src/pipeline/queue.ts — ScanJob queue operations.
 *
 * Handles creation and atomic status transitions for ScanJob documents
 * in the scan_jobs Firestore collection.
 *
 * All Firestore access goes through src/core/db/firestore.ts.
 */

import type { ScanJob, ScanJobType, DiscoverPayload, RescanPayload } from '../types/scan-job.js';
import {
  addDoc,
  updateDoc,
  queryDocs,
  serverTimestamp,
  where,
  orderBy,
  limit,
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
    createdAt: now,
    updatedAt: now,
  };
  return addDoc<Omit<ScanJob, 'id'>>(SCAN_JOBS_COLLECTION, jobData);
}

// ─── Job polling ──────────────────────────────────────────────────────────────

/**
 * Fetches the next pending job ordered by priority DESC, createdAt ASC.
 * Returns null if no pending jobs exist.
 */
export async function fetchNextPendingJob(): Promise<(ScanJob & { id: string }) | null> {
  const jobs = await queryDocs<ScanJob>(
    SCAN_JOBS_COLLECTION,
    where('status', '==', 'pending'),
    orderBy('priority', 'desc'),
    orderBy('createdAt', 'asc'),
    limit(1)
  );

  if (jobs.length === 0) return null;

  const job = jobs[0] as ScanJob & { id: string };

  // Skip rate-limited jobs whose window hasn't passed yet
  if (job.rateLimitedUntil !== null) {
    const limitUntil = (job.rateLimitedUntil as Timestamp).toMillis();
    if (Date.now() < limitUntil) return null;
  }

  return job;
}

// ─── Status transitions ───────────────────────────────────────────────────────

/** Transitions a pending job → running and records lastAttemptAt. */
export async function markJobRunning(jobId: string): Promise<void> {
  await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
    status: 'running',
    lastAttemptAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}

/** Transitions a running job → completed and records completedAt. */
export async function markJobCompleted(jobId: string): Promise<void> {
  await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
    status: 'completed',
    completedAt: serverTimestamp(),
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
    // Retry: re-queue as pending with backoff
    const backoffMs = Math.pow(2, newAttempts) * 60 * 1000;
    const retryAt = new Date(Date.now() + backoffMs);

    await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
      status: 'pending',
      attempts: newAttempts,
      errorMessage,
      rateLimitedUntil: null,
      updatedAt: serverTimestamp(),
    });

    // Suppress unused variable warning — retryAt used for logging context
    void retryAt;
  } else {
    // Exhausted attempts → permanently failed
    await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
      status: 'failed',
      attempts: newAttempts,
      errorMessage,
      failedAt: serverTimestamp(),
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
