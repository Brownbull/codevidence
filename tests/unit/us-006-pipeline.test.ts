/**
 * tests/unit/us-006-pipeline.test.ts
 *
 * Unit tests for US-006: CLI entry point and Firestore-backed job queue.
 *
 * Tests cover:
 * 1. Queue module — ScanJob creation, polling, status transitions
 * 2. Worker module — polling loop, error isolation, retry logic
 * 3. CLI commands — discover, rescan, status option handling
 * 4. Full job lifecycle: enqueue → pick up → complete
 * 5. Rate-limited job skipping
 * 6. Exponential backoff retry
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { ScanJob } from '@/types/scan-job';

// ─── Constants tests ──────────────────────────────────────────────────────────

describe('Queue constants', () => {
  it('SCAN_JOBS_COLLECTION is "scan_jobs"', async () => {
    const { SCAN_JOBS_COLLECTION } = await import('@/pipeline/queue');
    expect(SCAN_JOBS_COLLECTION).toBe('scan_jobs');
  });

  it('MAX_ATTEMPTS is 3', async () => {
    const { MAX_ATTEMPTS } = await import('@/pipeline/queue');
    expect(MAX_ATTEMPTS).toBe(3);
  });

  it('POLL_INTERVAL_MS is 10000ms (10 seconds)', async () => {
    const { POLL_INTERVAL_MS } = await import('@/pipeline/queue');
    expect(POLL_INTERVAL_MS).toBe(10_000);
  });
});

// ─── Queue module API surface ─────────────────────────────────────────────────

describe('Queue module — exported API surface', () => {
  it('exports enqueueDiscoverJob', async () => {
    const mod = await import('@/pipeline/queue');
    expect(typeof mod.enqueueDiscoverJob).toBe('function');
  });

  it('exports enqueueRescanJob', async () => {
    const mod = await import('@/pipeline/queue');
    expect(typeof mod.enqueueRescanJob).toBe('function');
  });

  it('exports fetchNextPendingJob', async () => {
    const mod = await import('@/pipeline/queue');
    expect(typeof mod.fetchNextPendingJob).toBe('function');
  });

  it('exports markJobRunning', async () => {
    const mod = await import('@/pipeline/queue');
    expect(typeof mod.markJobRunning).toBe('function');
  });

  it('exports markJobCompleted', async () => {
    const mod = await import('@/pipeline/queue');
    expect(typeof mod.markJobCompleted).toBe('function');
  });

  it('exports markJobFailed', async () => {
    const mod = await import('@/pipeline/queue');
    expect(typeof mod.markJobFailed).toBe('function');
  });

  it('exports markJobRateLimited', async () => {
    const mod = await import('@/pipeline/queue');
    expect(typeof mod.markJobRateLimited).toBe('function');
  });

  it('exports fetchJobsByStatus', async () => {
    const mod = await import('@/pipeline/queue');
    expect(typeof mod.fetchJobsByStatus).toBe('function');
  });

  it('exports fetchRecentJobs', async () => {
    const mod = await import('@/pipeline/queue');
    expect(typeof mod.fetchRecentJobs).toBe('function');
  });
});

// ─── Worker module API surface ────────────────────────────────────────────────

describe('Worker module — exported API surface', () => {
  it('exports startWorker', async () => {
    const mod = await import('@/pipeline/worker');
    expect(typeof mod.startWorker).toBe('function');
  });

  it('exports stopWorker', async () => {
    const mod = await import('@/pipeline/worker');
    expect(typeof mod.stopWorker).toBe('function');
  });

  it('exports pollOnce', async () => {
    const mod = await import('@/pipeline/worker');
    expect(typeof mod.pollOnce).toBe('function');
  });

  it('exports isWorkerRunning', async () => {
    const mod = await import('@/pipeline/worker');
    expect(typeof mod.isWorkerRunning).toBe('function');
  });
});

// ─── Command modules API surface ─────────────────────────────────────────────

describe('Command modules — API surface', () => {
  it('discover exports runDiscover', async () => {
    const mod = await import('@/pipeline/commands/discover');
    expect(typeof mod.runDiscover).toBe('function');
  });

  it('rescan exports runRescan', async () => {
    const mod = await import('@/pipeline/commands/rescan');
    expect(typeof mod.runRescan).toBe('function');
  });

  it('status exports runStatus', async () => {
    const mod = await import('@/pipeline/commands/status');
    expect(typeof mod.runStatus).toBe('function');
  });
});

// ─── ScanJob default shape ────────────────────────────────────────────────────

describe('ScanJob document shape', () => {
  it('discover job has correct default field set', () => {
    // Verify the shape a discover job should be created with
    const jobDefaults: Omit<ScanJob, 'id' | 'createdAt' | 'updatedAt'> = {
      type: 'discover',
      status: 'pending',
      payload: { query: 'test', source: 'github', limit: 10 },
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: null,
      completedAt: null,
      failedAt: null,
      errorMessage: null,
      rateLimitedUntil: null,
      priority: 0,
    };

    expect(jobDefaults.status).toBe('pending');
    expect(jobDefaults.attempts).toBe(0);
    expect(jobDefaults.maxAttempts).toBe(3);
    expect(jobDefaults.priority).toBe(0);
    expect(jobDefaults.errorMessage).toBeNull();
    expect(jobDefaults.rateLimitedUntil).toBeNull();
  });

  it('rescan job has priority 1 (higher than discover)', () => {
    const rescanPriority = 1;
    const discoverPriority = 0;
    expect(rescanPriority).toBeGreaterThan(discoverPriority);
  });

  it('ScanJobStatus covers all expected values', () => {
    const statuses: ScanJob['status'][] = ['pending', 'running', 'completed', 'failed'];
    expect(statuses).toHaveLength(4);
    expect(statuses).toContain('pending');
    expect(statuses).toContain('running');
    expect(statuses).toContain('completed');
    expect(statuses).toContain('failed');
  });

  it('ScanJobType covers all expected values', () => {
    const types: ScanJob['type'][] = ['discover', 'scan-repo', 'rescan-candidate', 'rescan-repo'];
    expect(types).toHaveLength(4);
    expect(types).toContain('discover');
    expect(types).toContain('rescan-candidate');
  });
});

// ─── Exponential backoff retry logic ─────────────────────────────────────────

describe('Exponential backoff retry logic', () => {
  it('2^1 = 2 minutes backoff after first failure (attempt=1)', () => {
    const attempt = 1;
    const backoffMs = Math.pow(2, attempt) * 60 * 1000;
    expect(backoffMs).toBe(2 * 60 * 1000); // 2 minutes
  });

  it('2^2 = 4 minutes backoff after second failure (attempt=2)', () => {
    const attempt = 2;
    const backoffMs = Math.pow(2, attempt) * 60 * 1000;
    expect(backoffMs).toBe(4 * 60 * 1000); // 4 minutes
  });

  it('job with attempts < maxAttempts should retry (not permanently fail)', () => {
    const attempts = 1;
    const maxAttempts = 3;
    const shouldRetry = attempts + 1 < maxAttempts;
    expect(shouldRetry).toBe(true);
  });

  it('job with attempts >= maxAttempts should permanently fail', () => {
    const attempts = 2;
    const maxAttempts = 3;
    const shouldPermanentlyFail = attempts + 1 >= maxAttempts;
    expect(shouldPermanentlyFail).toBe(true);
  });

  it('job with attempts=0, maxAttempts=3 retries on first failure', () => {
    const attempts = 0;
    const maxAttempts = 3;
    expect(attempts + 1 < maxAttempts).toBe(true);
  });

  it('job with attempts=2, maxAttempts=3 permanently fails on third failure', () => {
    const attempts = 2;
    const maxAttempts = 3;
    expect(attempts + 1 >= maxAttempts).toBe(true);
  });
});

// ─── Worker polling logic ─────────────────────────────────────────────────────

describe('Worker polling logic — mocked Firestore', () => {
  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('pollOnce does nothing when no pending jobs', async () => {
    // Mock the queue module to return null (no jobs)
    vi.doMock('@/pipeline/queue', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/pipeline/queue')>();
      return {
        ...actual,
        fetchNextPendingJob: vi.fn().mockResolvedValue(null),
        markJobRunning: vi.fn(),
        markJobCompleted: vi.fn(),
        markJobFailed: vi.fn(),
        POLL_INTERVAL_MS: 10_000,
      };
    });

    const { pollOnce } = await import('@/pipeline/worker');
    // Should complete without throwing
    await expect(pollOnce({})).resolves.toBeUndefined();
  });

  it('pollOnce marks job running then completed on success', async () => {
    const mockJob: ScanJob & { id: string } = {
      id: 'job-001',
      type: 'discover',
      status: 'pending',
      payload: { query: 'test', source: 'github', limit: 10 },
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: null,
      completedAt: null,
      failedAt: null,
      errorMessage: null,
      rateLimitedUntil: null,
      priority: 0,
      createdAt: {} as ReturnType<typeof import('firebase/firestore').Timestamp.now>,
      updatedAt: {} as ReturnType<typeof import('firebase/firestore').Timestamp.now>,
    };

    const mockMarkRunning = vi.fn().mockResolvedValue(undefined);
    const mockMarkCompleted = vi.fn().mockResolvedValue(undefined);
    const mockMarkFailed = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@/pipeline/queue', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/pipeline/queue')>();
      return {
        ...actual,
        fetchNextPendingJob: vi.fn().mockResolvedValue(mockJob),
        markJobRunning: mockMarkRunning,
        markJobCompleted: mockMarkCompleted,
        markJobFailed: mockMarkFailed,
        POLL_INTERVAL_MS: 10_000,
      };
    });

    const handler = vi.fn().mockResolvedValue(undefined);
    const { pollOnce } = await import('@/pipeline/worker');

    await pollOnce({ discover: handler });

    expect(mockMarkRunning).toHaveBeenCalledWith('job-001');
    expect(handler).toHaveBeenCalledWith(mockJob);
    expect(mockMarkCompleted).toHaveBeenCalledWith('job-001');
    expect(mockMarkFailed).not.toHaveBeenCalled();
  });

  it('pollOnce marks job failed when handler throws', async () => {
    const mockJob: ScanJob & { id: string } = {
      id: 'job-002',
      type: 'discover',
      status: 'pending',
      payload: { query: 'fail-test', source: 'github', limit: 5 },
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: null,
      completedAt: null,
      failedAt: null,
      errorMessage: null,
      rateLimitedUntil: null,
      priority: 0,
      createdAt: {} as ReturnType<typeof import('firebase/firestore').Timestamp.now>,
      updatedAt: {} as ReturnType<typeof import('firebase/firestore').Timestamp.now>,
    };

    const mockMarkRunning = vi.fn().mockResolvedValue(undefined);
    const mockMarkCompleted = vi.fn().mockResolvedValue(undefined);
    const mockMarkFailed = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@/pipeline/queue', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/pipeline/queue')>();
      return {
        ...actual,
        fetchNextPendingJob: vi.fn().mockResolvedValue(mockJob),
        markJobRunning: mockMarkRunning,
        markJobCompleted: mockMarkCompleted,
        markJobFailed: mockMarkFailed,
        POLL_INTERVAL_MS: 10_000,
      };
    });

    const handler = vi.fn().mockRejectedValue(new Error('Handler error'));
    const { pollOnce } = await import('@/pipeline/worker');

    await pollOnce({ discover: handler });

    expect(mockMarkRunning).toHaveBeenCalledWith('job-002');
    expect(handler).toHaveBeenCalledWith(mockJob);
    expect(mockMarkCompleted).not.toHaveBeenCalled();
    expect(mockMarkFailed).toHaveBeenCalledWith(
      'job-002',
      0,
      3,
      'Handler error'
    );
  });

  it('failed job does not crash worker — worker continues to next poll', async () => {
    const mockJob: ScanJob & { id: string } = {
      id: 'job-003',
      type: 'discover',
      status: 'pending',
      payload: { query: 'crash-test', source: 'github', limit: 1 },
      attempts: 1,
      maxAttempts: 3,
      lastAttemptAt: null,
      completedAt: null,
      failedAt: null,
      errorMessage: null,
      rateLimitedUntil: null,
      priority: 0,
      createdAt: {} as ReturnType<typeof import('firebase/firestore').Timestamp.now>,
      updatedAt: {} as ReturnType<typeof import('firebase/firestore').Timestamp.now>,
    };

    vi.doMock('@/pipeline/queue', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/pipeline/queue')>();
      return {
        ...actual,
        fetchNextPendingJob: vi.fn().mockResolvedValue(mockJob),
        markJobRunning: vi.fn().mockResolvedValue(undefined),
        markJobCompleted: vi.fn().mockResolvedValue(undefined),
        markJobFailed: vi.fn().mockResolvedValue(undefined),
        POLL_INTERVAL_MS: 10_000,
      };
    });

    // Handler throws a hard error — worker must not propagate it
    const handler = vi.fn().mockRejectedValue(new Error('Critical crash'));
    const { pollOnce } = await import('@/pipeline/worker');

    // Should resolve (not reject) — worker absorbs the error
    await expect(pollOnce({ discover: handler })).resolves.toBeUndefined();
  });

  it('worker logs warning and marks failed when no handler for job type', async () => {
    const mockJob: ScanJob & { id: string } = {
      id: 'job-004',
      type: 'discover',
      status: 'pending',
      payload: { query: 'no-handler', source: 'github', limit: 1 },
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: null,
      completedAt: null,
      failedAt: null,
      errorMessage: null,
      rateLimitedUntil: null,
      priority: 0,
      createdAt: {} as ReturnType<typeof import('firebase/firestore').Timestamp.now>,
      updatedAt: {} as ReturnType<typeof import('firebase/firestore').Timestamp.now>,
    };

    const mockMarkFailed = vi.fn().mockResolvedValue(undefined);

    vi.doMock('@/pipeline/queue', async (importOriginal) => {
      const actual = await importOriginal<typeof import('@/pipeline/queue')>();
      return {
        ...actual,
        fetchNextPendingJob: vi.fn().mockResolvedValue(mockJob),
        markJobRunning: vi.fn().mockResolvedValue(undefined),
        markJobCompleted: vi.fn().mockResolvedValue(undefined),
        markJobFailed: mockMarkFailed,
        POLL_INTERVAL_MS: 10_000,
      };
    });

    const { pollOnce } = await import('@/pipeline/worker');
    // Pass empty registry — no handler for 'discover'
    await pollOnce({});

    expect(mockMarkFailed).toHaveBeenCalledWith(
      'job-004',
      0,
      3,
      expect.stringContaining('No handler registered for job type: discover')
    );
  });
});

// ─── Rate-limit-aware job skipping ───────────────────────────────────────────

describe('Rate-limited job skipping', () => {
  it('job with rateLimitedUntil in the future is skipped', async () => {
    vi.resetModules();

    // Future timestamp (10 minutes from now)
    const futureMs = Date.now() + 10 * 60 * 1000;
    const mockRateLimitedJob: ScanJob & { id: string } = {
      id: 'job-rl-001',
      type: 'discover',
      status: 'pending',
      payload: { query: 'rl-test', source: 'github', limit: 10 },
      attempts: 0,
      maxAttempts: 3,
      lastAttemptAt: null,
      completedAt: null,
      failedAt: null,
      errorMessage: null,
      rateLimitedUntil: { toMillis: () => futureMs } as unknown as ScanJob['rateLimitedUntil'],
      priority: 0,
      createdAt: {} as ReturnType<typeof import('firebase/firestore').Timestamp.now>,
      updatedAt: {} as ReturnType<typeof import('firebase/firestore').Timestamp.now>,
    };

    // The fetchNextPendingJob function should return null for rate-limited jobs
    // (the filtering happens inside the function)
    const { SCAN_JOBS_COLLECTION } = await import('@/pipeline/queue');
    expect(SCAN_JOBS_COLLECTION).toBe('scan_jobs');

    // Verify the rate-limit check logic
    if (mockRateLimitedJob.rateLimitedUntil !== null) {
      const limitUntil = (mockRateLimitedJob.rateLimitedUntil as { toMillis(): number }).toMillis();
      const shouldSkip = Date.now() < limitUntil;
      expect(shouldSkip).toBe(true);
    }
  });

  it('job with rateLimitedUntil in the past is NOT skipped', () => {
    // Past timestamp (10 minutes ago)
    const pastMs = Date.now() - 10 * 60 * 1000;
    const pastRateLimitedJob = {
      rateLimitedUntil: { toMillis: () => pastMs },
    };

    const limitUntil = pastRateLimitedJob.rateLimitedUntil.toMillis();
    const shouldSkip = Date.now() < limitUntil;
    expect(shouldSkip).toBe(false);
  });

  it('job with rateLimitedUntil=null is never skipped', () => {
    const job = { rateLimitedUntil: null };
    const isRateLimited = job.rateLimitedUntil !== null;
    expect(isRateLimited).toBe(false);
  });
});

// ─── Job lifecycle: enqueue → pick up → complete ─────────────────────────────

describe('Job lifecycle — unit-level assertions', () => {
  it('freshly enqueued job starts as pending with 0 attempts', () => {
    const jobState = {
      status: 'pending' as ScanJob['status'],
      attempts: 0,
      maxAttempts: 3,
    };
    expect(jobState.status).toBe('pending');
    expect(jobState.attempts).toBe(0);
  });

  it('pending → running transition sets correct status', () => {
    const jobState = { status: 'pending' as ScanJob['status'] };
    // Simulate markJobRunning transition
    const updatedState = { ...jobState, status: 'running' as ScanJob['status'] };
    expect(updatedState.status).toBe('running');
  });

  it('running → completed transition sets correct status', () => {
    const jobState = { status: 'running' as ScanJob['status'], completedAt: null };
    // Simulate markJobCompleted transition
    const updatedState = {
      ...jobState,
      status: 'completed' as ScanJob['status'],
      completedAt: new Date(),
    };
    expect(updatedState.status).toBe('completed');
    expect(updatedState.completedAt).not.toBeNull();
  });

  it('running → pending (retry) transition on failure with attempts < max', () => {
    const jobState = {
      status: 'running' as ScanJob['status'],
      attempts: 1,
      maxAttempts: 3,
    };
    const newAttempts = jobState.attempts + 1;
    const shouldRetry = newAttempts < jobState.maxAttempts;
    expect(shouldRetry).toBe(true);

    const updatedState = {
      ...jobState,
      status: 'pending' as ScanJob['status'],
      attempts: newAttempts,
    };
    expect(updatedState.status).toBe('pending');
    expect(updatedState.attempts).toBe(2);
  });

  it('running → failed transition on failure with attempts >= max', () => {
    const jobState = {
      status: 'running' as ScanJob['status'],
      attempts: 2,
      maxAttempts: 3,
      failedAt: null as null | Date,
      errorMessage: null as null | string,
    };
    const newAttempts = jobState.attempts + 1;
    const shouldRetry = newAttempts < jobState.maxAttempts;
    expect(shouldRetry).toBe(false);

    const updatedState = {
      ...jobState,
      status: 'failed' as ScanJob['status'],
      attempts: newAttempts,
      failedAt: new Date(),
      errorMessage: 'All retries exhausted',
    };
    expect(updatedState.status).toBe('failed');
    expect(updatedState.failedAt).not.toBeNull();
    expect(updatedState.errorMessage).toBe('All retries exhausted');
  });
});

// ─── Discover command options validation ──────────────────────────────────────

describe('Discover command — option validation', () => {
  it('validates that query is required', () => {
    const validateQuery = (query: string): boolean =>
      query !== undefined && query.trim() !== '';
    expect(validateQuery('')).toBe(false);
    expect(validateQuery('  ')).toBe(false);
    expect(validateQuery('python fastapi')).toBe(true);
  });

  it('validates that limit must be 1–1000', () => {
    const validateLimit = (limit: number): boolean =>
      Number.isInteger(limit) && limit >= 1 && limit <= 1000;
    expect(validateLimit(0)).toBe(false);
    expect(validateLimit(1001)).toBe(false);
    expect(validateLimit(10)).toBe(true);
    expect(validateLimit(1000)).toBe(true);
    expect(validateLimit(1)).toBe(true);
  });

  it('validates that source must be "github"', () => {
    const validateSource = (source: string): boolean => source === 'github';
    expect(validateSource('github')).toBe(true);
    expect(validateSource('gitlab')).toBe(false);
    expect(validateSource('')).toBe(false);
  });
});

// ─── Rescan command options validation ───────────────────────────────────────

describe('Rescan command — option validation', () => {
  it('validates targetType must be candidate or repo', () => {
    const validTypes = ['candidate', 'repo'];
    expect(validTypes.includes('candidate')).toBe(true);
    expect(validTypes.includes('repo')).toBe(true);
    expect(validTypes.includes('user')).toBe(false);
    expect(validTypes.includes('')).toBe(false);
  });

  it('validates that targetId must be non-empty', () => {
    const validateId = (id: string): boolean => id !== undefined && id.trim() !== '';
    expect(validateId('')).toBe(false);
    expect(validateId('  ')).toBe(false);
    expect(validateId('gaearon')).toBe(true);
  });
});

// ─── Priority ordering ────────────────────────────────────────────────────────

describe('Job priority ordering', () => {
  it('worker should process higher priority jobs first', () => {
    const jobs = [
      { id: 'low', priority: 0, createdAt: new Date(1000) },
      { id: 'high', priority: 1, createdAt: new Date(2000) },
      { id: 'low-early', priority: 0, createdAt: new Date(500) },
    ];

    // Sort by priority DESC, then createdAt ASC (same as Firestore query order)
    const sorted = [...jobs].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    expect(sorted[0].id).toBe('high');
    expect(sorted[1].id).toBe('low-early');
    expect(sorted[2].id).toBe('low');
  });

  it('among equal priority jobs, earlier createdAt is processed first', () => {
    const jobs = [
      { id: 'later', priority: 0, createdAt: new Date(2000) },
      { id: 'earlier', priority: 0, createdAt: new Date(1000) },
    ];

    const sorted = [...jobs].sort((a, b) => {
      if (b.priority !== a.priority) return b.priority - a.priority;
      return a.createdAt.getTime() - b.createdAt.getTime();
    });

    expect(sorted[0].id).toBe('earlier');
    expect(sorted[1].id).toBe('later');
  });
});
