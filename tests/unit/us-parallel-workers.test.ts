/**
 * tests/unit/us-parallel-workers.test.ts
 *
 * Unit tests for parallel worker support:
 * 1. Worker ID generation
 * 2. Atomic job claiming (source-level)
 * 3. Heartbeat and stale recovery (source-level)
 * 4. Schema backwards compatibility
 * 5. Handler registration completeness
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');
function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Worker ID generation ────────────────────────────────────────────────────

describe('Worker ID generation', () => {
  it('getWorkerId returns a non-empty string', async () => {
    const { getWorkerId } = await import('../../src/pipeline/worker-id');
    const id = getWorkerId();
    expect(typeof id).toBe('string');
    expect(id.length).toBeGreaterThan(0);
  });

  it('getWorkerId returns the same value on repeated calls (singleton)', async () => {
    const { getWorkerId } = await import('../../src/pipeline/worker-id');
    const id1 = getWorkerId();
    const id2 = getWorkerId();
    expect(id1).toBe(id2);
  });

  it('worker ID format contains hostname, pid, and hex', async () => {
    const { getWorkerId } = await import('../../src/pipeline/worker-id');
    const id = getWorkerId();
    // Format: hostname-pid-hex4
    const parts = id.split('-');
    expect(parts.length).toBeGreaterThanOrEqual(3);
    // Last part should be 4 hex chars
    const hex = parts[parts.length - 1]!;
    expect(hex).toMatch(/^[0-9a-f]{4}$/);
  });
});

// ─── Worker ID module structure ──────────────────────────────────────────────

describe('Worker ID module — source structure', () => {
  const src = readSource('src/pipeline/worker-id.ts');

  it('imports hostname from os', () => {
    expect(src).toContain("from 'os'");
    expect(src).toContain('hostname');
  });

  it('imports randomBytes from crypto', () => {
    expect(src).toContain("from 'crypto'");
    expect(src).toContain('randomBytes');
  });

  it('exports getWorkerId function', () => {
    expect(src).toContain('export function getWorkerId');
  });

  it('caches the worker ID as singleton', () => {
    expect(src).toContain('if (_workerId)');
  });
});

// ─── Firestore wrapper — transaction support ─────────────────────────────────

describe('Firestore wrapper — transaction support', () => {
  const src = readSource('src/core/db/firestore.ts');

  it('imports runTransaction from Firebase SDK', () => {
    expect(src).toContain('runTransaction as sdkRunTransaction');
  });

  it('exports runTransaction wrapper function', () => {
    expect(src).toContain('export async function runTransaction');
  });

  it('re-exports Transaction type', () => {
    expect(src).toContain('type Transaction');
  });

  it('runTransaction calls sdkRunTransaction with getDb()', () => {
    expect(src).toContain('sdkRunTransaction(getDb()');
  });
});

// ─── Atomic job claiming — source structure ──────────────────────────────────

describe('Atomic job claiming — queue.ts', () => {
  const src = readSource('src/pipeline/queue.ts');

  it('exports claimNextJob function', () => {
    expect(src).toContain('export async function claimNextJob');
  });

  it('claimNextJob accepts workerId parameter', () => {
    expect(src).toContain('claimNextJob(\n  workerId: string');
  });

  it('fetches top 5 candidates for contention resilience', () => {
    expect(src).toContain('limit(5)');
  });

  it('uses runTransaction for atomic claiming', () => {
    expect(src).toContain('runTransaction(async (transaction)');
  });

  it('verifies job is still pending inside transaction', () => {
    expect(src).toContain("job.status !== 'pending'");
  });

  it('sets workerId on claim', () => {
    expect(src).toContain('workerId,');
  });

  it('sets claimedAt timestamp on claim', () => {
    expect(src).toContain('claimedAt: serverTimestamp()');
  });

  it('sets heartbeatAt timestamp on claim', () => {
    expect(src).toContain('heartbeatAt: serverTimestamp()');
  });

  it('skips rate-limited jobs in claimNextJob', () => {
    expect(src).toContain('rateLimitedUntil');
  });

  it('catches transaction contention errors gracefully', () => {
    expect(src).toContain('} catch {');
    expect(src).toContain('return null;');
  });
});

// ─── Heartbeat — source structure ────────────────────────────────────────────

describe('Heartbeat — queue.ts', () => {
  const src = readSource('src/pipeline/queue.ts');

  it('exports updateHeartbeat function', () => {
    expect(src).toContain('export async function updateHeartbeat');
  });

  it('updateHeartbeat writes heartbeatAt timestamp', () => {
    expect(src).toContain('heartbeatAt: serverTimestamp()');
  });
});

// ─── Stale job recovery — source structure ───────────────────────────────────

describe('Stale job recovery — queue.ts', () => {
  const src = readSource('src/pipeline/queue.ts');

  it('exports reclaimStaleJobs function', () => {
    expect(src).toContain('export async function reclaimStaleJobs');
  });

  it('exports STALE_JOB_THRESHOLD_MS constant (5 minutes)', () => {
    expect(src).toContain('STALE_JOB_THRESHOLD_MS');
    expect(src).toContain('5 * 60 * 1000');
  });

  it('queries for running jobs', () => {
    expect(src).toContain("where('status', '==', 'running')");
  });

  it('skips legacy jobs with null heartbeat', () => {
    expect(src).toContain('if (!job.heartbeatAt) continue');
  });

  it('resets stale jobs to pending status', () => {
    expect(src).toContain("status: 'pending'");
  });

  it('clears worker ownership on reclaim', () => {
    expect(src).toContain('workerId: null');
    expect(src).toContain('claimedAt: null');
    expect(src).toContain('heartbeatAt: null');
  });
});

// ─── Worker module — parallel support ────────────────────────────────────────

describe('Worker module — parallel support', () => {
  const src = readSource('src/pipeline/worker.ts');

  it('imports claimNextJob (not fetchNextPendingJob)', () => {
    expect(src).toContain("claimNextJob,");
    expect(src).not.toContain('fetchNextPendingJob');
  });

  it('imports getWorkerId from worker-id', () => {
    expect(src).toContain("from './worker-id.js'");
    expect(src).toContain('getWorkerId');
  });

  it('imports updateHeartbeat for stale detection', () => {
    expect(src).toContain('updateHeartbeat');
  });

  it('imports reclaimStaleJobs', () => {
    expect(src).toContain('reclaimStaleJobs');
  });

  it('starts heartbeat interval during job execution', () => {
    expect(src).toContain('setInterval');
    expect(src).toContain('updateHeartbeat(job.id)');
  });

  it('clears heartbeat interval in finally block', () => {
    expect(src).toContain('clearInterval(heartbeatTimer)');
  });

  it('periodically checks for stale jobs', () => {
    expect(src).toContain('shouldCheckStale()');
    expect(src).toContain('reclaimStaleJobs()');
  });

  it('includes worker ID in log messages', () => {
    expect(src).toContain('[worker:${wid}]');
  });

  it('does not use markJobRunning (replaced by claimNextJob)', () => {
    expect(src).not.toContain('markJobRunning');
  });
});

// ─── Schema backwards compatibility ─────────────────────────────────────────

describe('Schema — new ScanJob fields', () => {
  const src = readSource('src/types/scan-job.ts');

  it('ScanJob includes workerId field (nullable)', () => {
    expect(src).toContain('workerId: string | null');
  });

  it('ScanJob includes heartbeatAt field (nullable)', () => {
    expect(src).toContain('heartbeatAt: Timestamp | null');
  });

  it('ScanJob includes claimedAt field (nullable)', () => {
    expect(src).toContain('claimedAt: Timestamp | null');
  });
});

describe('Schema — queue.ts includes new fields', () => {
  const src = readSource('src/pipeline/queue.ts');

  it('enqueueJob sets new fields to null', () => {
    expect(src).toContain('workerId: null');
    expect(src).toContain('heartbeatAt: null');
    expect(src).toContain('claimedAt: null');
  });
});

// ─── Handler registration completeness ───────────────────────────────────────

describe('Handler registration — all entry points', () => {
  it('index.ts registers rescan-candidate in worker HANDLERS', () => {
    const src = readSource('src/pipeline/index.ts');
    expect(src).toContain("from './handlers/rescan-candidate.js'");
    expect(src).toContain("'rescan-candidate': handleRescanCandidate");
  });

  it('run.ts registers rescan-candidate in HANDLERS', () => {
    const src = readSource('src/pipeline/commands/run.ts');
    expect(src).toContain("'rescan-candidate': handleRescanCandidate");
  });

  it('discover.ts includes new ScanJob fields in inline job creation', () => {
    const src = readSource('src/pipeline/handlers/discover.ts');
    expect(src).toContain('workerId: null');
    expect(src).toContain('heartbeatAt: null');
    expect(src).toContain('claimedAt: null');
  });
});
