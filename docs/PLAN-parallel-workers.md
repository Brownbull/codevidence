# Plan: Parallel Worker Support

> Atomic job claiming via Firestore transactions, enabling multiple `pnpm scan run`
> instances across terminals and machines without duplicate job processing.

---

## Problem Statement

The current worker architecture has a **race condition** between two separate Firestore operations:

```
Worker A: fetchNextPendingJob()  →  gets job-123 (pending)
Worker B: fetchNextPendingJob()  →  gets job-123 (pending)  ← SAME JOB
Worker A: markJobRunning(job-123)
Worker B: markJobRunning(job-123)  ← both now "own" it
```

**Root cause:** `src/pipeline/queue.ts:fetchNextPendingJob()` (line 82) and
`src/pipeline/worker.ts:markJobRunning()` are two separate network round trips
with no atomicity. Any number of workers can read the same pending job before
any of them marks it running.

**Impact:** Running multiple `pnpm scan run` terminals causes duplicate clones,
duplicate analysis, wasted GitHub API calls, and potential Firestore write conflicts.

---

## Solution Overview

Replace the two-step fetch+mark with a single **Firestore transaction** that
atomically reads a job's status and updates it to `running` — only if still `pending`.
Firestore's optimistic concurrency ensures exactly one worker wins the claim.

Additionally:
- **Worker ID** tracks which process owns each running job
- **Heartbeat** enables stale job detection when a worker crashes
- **Stale recovery** reclaims abandoned jobs automatically

---

## Schema Changes

### File: `src/types/scan-job.ts`

Add three new nullable fields to the `ScanJob` interface (lines 26-41):

```typescript
export interface ScanJob {
  // ... existing fields (id, type, status, payload, attempts, etc.) ...

  /** ID of the worker that claimed this job. Null when pending/completed/failed. */
  workerId: string | null;

  /** Timestamp when the worker last sent a heartbeat. Null when not running. */
  heartbeatAt: Timestamp | null;

  /** Timestamp when the worker claimed this job. Null when not running. */
  claimedAt: Timestamp | null;
}
```

**Backwards compatibility:** All new fields default to `null`. Existing Firestore
documents without these fields read as `null` via Firestore's implicit behavior.
No migration needed.

---

## Firestore Wrapper Changes

### File: `src/core/db/firestore.ts` (currently 207 lines)

Add ~25 lines for transaction support. Must stay under 300 lines.

**1. Import `runTransaction` from SDK (line 12-32):**

```typescript
import {
  // ... existing imports ...
  runTransaction as sdkRunTransaction,
} from 'firebase/firestore';
```

**2. Add `runTransaction` wrapper (after line 193):**

```typescript
/**
 * Runs a Firestore transaction. Firestore automatically retries on
 * contention (up to 5 times). The callback receives a Transaction
 * object with get/update/set/delete methods.
 */
export async function runTransaction<T>(
  callback: (transaction: import('firebase/firestore').Transaction) => Promise<T>
): Promise<T> {
  return sdkRunTransaction(getDb(), callback);
}
```

**3. Re-export `Transaction` type (line 198-207):**

```typescript
export {
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  type QueryConstraint,
  type Timestamp,
  type FieldValue,
  type Transaction,          // ← NEW
  type DocumentSnapshot,     // ← NEW (needed inside transactions)
} from 'firebase/firestore';
```

**4. Export `docRef` publicly** (currently private helper at line 108-113):

The `docRef` function is already exported. Transaction callers need it to get
`DocumentReference` for `transaction.get(ref)` and `transaction.update(ref, data)`.
No change needed — it's already `export function docRef`.

---

## New File: Worker ID Generator

### File: `src/pipeline/worker-id.ts` (~20 lines)

```typescript
/**
 * src/pipeline/worker-id.ts — Unique worker identifier.
 *
 * Format: {hostname}-{pid}-{random4hex}
 * Example: macbook-42019-a3f1
 *
 * Stable within a process lifetime. Unique across machines and processes.
 */

import { hostname } from 'os';
import { randomBytes } from 'crypto';

let _workerId: string | null = null;

/** Returns the unique worker ID for this process. */
export function getWorkerId(): string {
  if (_workerId) return _workerId;
  const host = hostname().slice(0, 20);
  const pid = process.pid;
  const rand = randomBytes(2).toString('hex');
  _workerId = `${host}-${pid}-${rand}`;
  return _workerId;
}
```

---

## Queue Changes

### File: `src/pipeline/queue.ts` (currently 199 lines)

**1. New import: `runTransaction` + `docRef`**

```typescript
import {
  addDoc,
  updateDoc,
  queryDocs,
  serverTimestamp,
  where,
  orderBy,
  limit,
  runTransaction,  // ← NEW
  docRef,          // ← NEW
  type Timestamp,
} from '../core/db/firestore.js';
```

**2. New function: `claimNextJob()` — replaces `fetchNextPendingJob()` + `markJobRunning()`**

```typescript
/**
 * Atomically claims the next pending job via Firestore transaction.
 *
 * 1. Query top 5 pending jobs (outside transaction — read-only)
 * 2. For each candidate, attempt a transaction:
 *    a. Re-read job inside transaction
 *    b. Verify still 'pending'
 *    c. Update to 'running' with workerId + timestamps
 * 3. First successful transaction wins; losers try next candidate
 *
 * Returns null if no claimable jobs exist.
 */
export async function claimNextJob(
  workerId: string
): Promise<(ScanJob & { id: string }) | null> {
  // Step 1: Get candidates (read-only, outside transaction)
  const candidates = await queryDocs<ScanJob>(
    SCAN_JOBS_COLLECTION,
    where('status', '==', 'pending'),
    orderBy('priority', 'desc'),
    orderBy('createdAt', 'asc'),
    limit(5)
  );

  if (candidates.length === 0) return null;

  // Step 2: Try to claim each candidate
  for (const candidate of candidates) {
    // Skip rate-limited jobs
    if (candidate.rateLimitedUntil !== null) {
      const limitUntil = (candidate.rateLimitedUntil as Timestamp).toMillis();
      if (Date.now() < limitUntil) continue;
    }

    const claimed = await tryClaimJob(candidate.id, workerId);
    if (claimed) return claimed;
  }

  return null;
}
```

**3. New private function: `tryClaimJob()`**

```typescript
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

      return { id: snap.id, ...job } as ScanJob & { id: string };
    });
  } catch {
    // Transaction contention — another worker claimed it
    return null;
  }
}
```

**4. New function: `updateHeartbeat()`**

```typescript
/** Updates the heartbeat timestamp for a running job. */
export async function updateHeartbeat(jobId: string): Promise<void> {
  await updateDoc<ScanJob>(SCAN_JOBS_COLLECTION, jobId, {
    heartbeatAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
```

**5. New function: `reclaimStaleJobs()`**

```typescript
/** Stale threshold: 5 minutes without heartbeat. */
export const STALE_JOB_THRESHOLD_MS = 5 * 60 * 1000;

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
```

**6. Update `markJobCompleted()` (line 109-115) — clear ownership fields:**

```typescript
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
```

**7. Update `markJobFailed()` (line 125-158) — clear ownership in both branches**

Both the retry branch (→ pending) and permanent failure branch (→ failed)
must set `workerId: null`, `claimedAt: null`, `heartbeatAt: null`.

**8. Update `enqueueJob()` (line 51-67) — include new fields as null:**

```typescript
const jobData = {
  // ... existing fields ...
  workerId: null,
  heartbeatAt: null,
  claimedAt: null,
};
```

**9. Deprecate `fetchNextPendingJob()` and `markJobRunning()`**

Keep them for backwards compatibility but add `@deprecated` JSDoc. They are
still used by existing tests. New code should use `claimNextJob()`.

---

## Worker Changes

### File: `src/pipeline/worker.ts` (currently 153 lines)

**1. Switch imports:**

```typescript
import {
  claimNextJob,         // ← replaces fetchNextPendingJob + markJobRunning
  markJobCompleted,
  markJobFailed,
  updateHeartbeat,      // ← NEW
  reclaimStaleJobs,     // ← NEW
  POLL_INTERVAL_MS,
} from './queue.js';
import { getWorkerId } from './worker-id.js';
```

**2. Update `pollOnce()` (line 81-100):**

```typescript
export async function pollOnce(handlers: JobHandlerRegistry): Promise<void> {
  const workerId = getWorkerId();

  try {
    // Periodically reclaim stale jobs (~every 60s)
    if (shouldCheckStale()) {
      const reclaimed = await reclaimStaleJobs();
      if (reclaimed > 0) console.log(`[worker:${workerId}] Reclaimed ${reclaimed} stale job(s).`);
    }

    const job = await claimNextJob(workerId);
    if (!job) {
      scheduleNextPoll(handlers);
      return;
    }

    console.log(`[worker:${workerId}] Claimed job ${job.id} (type=${job.type})`);
    await executeJob(job, handlers);
  } catch (err) {
    console.error(`[worker:${workerId}] Unexpected poll error:`, err);
  } finally {
    scheduleNextPoll(handlers);
  }
}
```

**3. Update `processOneJob()` (line 107-115):**

```typescript
export async function processOneJob(handlers: JobHandlerRegistry): Promise<boolean> {
  const workerId = getWorkerId();
  const job = await claimNextJob(workerId);
  if (!job) return false;

  console.log(`[worker:${workerId}] Claimed job ${job.id} (type=${job.type})`);
  await executeJob(job, handlers);
  return true;
}
```

**4. Add heartbeat to `executeJob()` (line 118-153):**

```typescript
const HEARTBEAT_INTERVAL_MS = 60_000;

async function executeJob(
  job: ScanJob & { id: string },
  handlers: JobHandlerRegistry
): Promise<void> {
  const handler = handlers[job.type];
  if (!handler) {
    await markJobFailed(job.id, job.attempts, job.maxAttempts, `No handler for: ${job.type}`);
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
    const msg = err instanceof Error ? err.message : String(err);
    console.error(`[worker] Job ${job.id} failed: ${msg}`);
    await markJobFailed(job.id, job.attempts, job.maxAttempts, msg);
  } finally {
    clearInterval(heartbeatTimer);
  }
}
```

**5. Add stale-check counter:**

```typescript
let _pollCount = 0;
const STALE_CHECK_EVERY = 6; // Every 6th poll ≈ 60s at 10s interval

function shouldCheckStale(): boolean {
  _pollCount++;
  return _pollCount % STALE_CHECK_EVERY === 0;
}
```

**6. Update `startWorker()` to log worker ID (line 46-55):**

```typescript
export function startWorker(handlers: JobHandlerRegistry): void {
  if (_running) return;
  _running = true;
  console.log(`[worker:${getWorkerId()}] Starting. Poll interval: ${POLL_INTERVAL_MS / 1000}s`);
  scheduleNextPoll(handlers);
}
```

---

## CLI Changes

### File: `src/pipeline/commands/run.ts`

**Optional enhancement:** Show worker ID and active workers in status display.

```typescript
// After the status box (line 44-52), add:
const workerId = getWorkerId();
console.log(`  Worker ID: ${workerId}`);

// In running jobs section, show active workers:
if (running.length > 0) {
  const workerIds = new Set(running.map((j) => (j as ScanJob & { workerId: string | null }).workerId).filter(Boolean));
  console.log(`  Active workers: ${workerIds.size}`);
}
```

### File: `src/pipeline/index.ts`

**Bug fix:** The `worker` command (line 79-89) is missing `rescan-candidate` in its
HANDLERS registry. Add it to match `run.ts`:

```typescript
import { handleRescanCandidate } from './handlers/rescan-candidate.js';

// line 84-87:
startWorker({
  discover: handleDiscover,
  'scan-repo': handleScanRepo,
  'rescan-candidate': handleRescanCandidate,  // ← ADD
});
```

---

## Firestore Index Changes

**None required.** The `claimNextJob()` query uses the same shape as the
existing `fetchNextPendingJob()`:

```
scan_jobs WHERE status == 'pending' ORDER BY priority DESC, createdAt ASC LIMIT 5
```

The existing composite index on `(status, priority, createdAt)` serves this query.
`reclaimStaleJobs()` uses `WHERE status == 'running' LIMIT 50` which only needs
the single-field index on `status` (auto-created by Firestore).

---

## Test Strategy

### New file: `tests/unit/us-parallel-workers.test.ts`

Organized into these describe blocks:

**1. Worker ID generation (unit)**
- `getWorkerId()` returns non-empty string
- `getWorkerId()` returns same value on repeated calls (singleton)
- Format matches `hostname-pid-hex` pattern

**2. Atomic claim logic (source-level)**
- `queue.ts` exports `claimNextJob`
- `queue.ts` contains `runTransaction`
- `claimNextJob` verifies `job.status !== 'pending'` inside transaction
- `claimNextJob` fetches `limit(5)` candidates
- `claimNextJob` sets `workerId` on claim

**3. Stale job recovery (source-level)**
- `queue.ts` exports `reclaimStaleJobs`
- `STALE_JOB_THRESHOLD_MS` is 5 minutes
- `reclaimStaleJobs` skips jobs with null heartbeat (legacy compat)
- `reclaimStaleJobs` resets status to `pending`

**4. Heartbeat (source-level)**
- `queue.ts` exports `updateHeartbeat`
- `worker.ts` contains `setInterval` for heartbeat
- `worker.ts` contains `clearInterval` in finally block

**5. Worker module integration (mocked Firestore)**
- `pollOnce` with no pending jobs resolves without error
- `pollOnce` with claimable job calls handler and marks completed
- `pollOnce` handles handler failure gracefully
- Stale check runs every 6th poll

**6. Handler registration completeness**
- `run.ts` registers `rescan-candidate`
- `index.ts` registers `rescan-candidate` in worker command

**7. Schema backwards compatibility**
- `enqueueJob` includes `workerId: null`
- `enqueueJob` includes `heartbeatAt: null`
- `enqueueJob` includes `claimedAt: null`

---

## Implementation Sequence

| Step | File(s) | What | Est. Lines Changed |
|------|---------|------|--------------------|
| 1 | `src/types/scan-job.ts` | Add `workerId`, `heartbeatAt`, `claimedAt` | +6 |
| 2 | `src/core/db/firestore.ts` | Add `runTransaction` wrapper + type re-exports | +20 |
| 3 | `src/pipeline/worker-id.ts` | New file — worker ID generator | +20 |
| 4 | `src/pipeline/queue.ts` | `claimNextJob`, `tryClaimJob`, `updateHeartbeat`, `reclaimStaleJobs`, update `enqueueJob`/`markJobCompleted`/`markJobFailed` | +90, ~20 modified |
| 5 | `src/pipeline/worker.ts` | Switch to `claimNextJob`, add heartbeat interval, stale check | ~60 modified |
| 6 | `src/pipeline/commands/run.ts` | Worker ID display (optional) | +5 |
| 7 | `src/pipeline/index.ts` | Add `rescan-candidate` to worker command HANDLERS | +2 |
| 8 | `tests/unit/us-parallel-workers.test.ts` | Full test suite | +200 |
| 9 | Verification | `pnpm typecheck && pnpm build && pnpm test` | — |

**Estimated total: ~400 new lines, ~80 modified lines across 8 files.**

---

## Edge Cases and Mitigations

### 1. Firestore transaction limitation
Transactions cannot contain queries — only document reads by reference.
**Mitigation:** Query for candidates *outside* the transaction (step 1), then
re-read + verify inside the transaction (step 2). This is the standard pattern.

### 2. High contention (many workers)
If 10+ workers poll simultaneously, they all get the same 5 candidates.
Most will waste time on failed transaction attempts.
**Mitigation:** `limit(5)` gives 5 attempts per poll. For very high parallelism,
increase limit or add random jitter: `POLL_INTERVAL_MS + Math.random() * 2000`.

### 3. Network partition during heartbeat
Worker is still processing but heartbeat updates fail due to network issues.
**Mitigation:** 5-minute stale threshold is generous. Heartbeat failure logs
a warning but does not abort the job.

### 4. Worker crash during job execution
Job stays in `running` with a stale heartbeat.
**Mitigation:** `reclaimStaleJobs()` runs every ~60s on all active workers.
After 5 minutes without heartbeat, the job is reset to `pending`.

### 5. Backwards compatibility with existing `running` jobs
Pre-upgrade jobs in `running` status lack `heartbeatAt` field.
**Mitigation:** `reclaimStaleJobs()` explicitly skips `heartbeatAt === null`
(legacy jobs). Admin must manually retry or cancel these.

### 6. Emulator compatibility
Firestore emulator supports transactions.
**Mitigation:** No special handling needed. Works identically in dev and prod.

---

## Validation Checklist

Before merging, verify:

- [ ] Multiple `pnpm scan run` instances process different jobs (no duplicates)
- [ ] Worker ID appears in all log lines
- [ ] Killing a worker mid-job → job recovered by another worker within 5 minutes
- [ ] Rate-limited jobs are still respected (not claimed)
- [ ] Single-worker mode still works identically
- [ ] All existing tests pass (no breaking changes)
- [ ] New parallel-workers test suite passes
- [ ] `pnpm typecheck && pnpm build` clean
- [ ] File line counts all under 300 lines
