/**
 * tests/unit/us-031-self-scan.test.ts
 *
 * Unit tests for US-031: Self-scan trigger and pipeline handler.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

// ─── SelfScanSection component ──────────────────────────────────────────────

describe('SelfScanSection component', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/app/components/profile/SelfScanSection.tsx'),
    'utf-8'
  );

  it('has data-testid', () => {
    expect(src).toContain('data-testid="self-scan-section"');
  });

  it('has Scan My Repos button', () => {
    expect(src).toContain('data-testid="scan-my-repos-button"');
    expect(src).toContain('Scan My Repos');
  });

  it('disables button when scan is pending', () => {
    expect(src).toContain('hasPending');
    expect(src).toContain('disabled={!canScan}');
  });

  it('creates self-scan job with correct payload', () => {
    expect(src).toContain("type: 'self-scan'");
    expect(src).toContain("status: 'pending'");
    expect(src).toContain('requestedBy: user.uid');
    expect(src).toContain('githubUsername');
  });

  it('does NOT include githubToken in job payload', () => {
    // Extract the mutationFn to check payload
    const mutationMatch = src.match(/mutationFn:[\s\S]*?payload:[\s\S]*?\}/);
    expect(mutationMatch).not.toBeNull();
    expect(mutationMatch![0]).not.toContain('githubToken');
  });

  it('checks for pending self-scan before allowing new scan', () => {
    expect(src).toContain('hasPendingSelfScan');
  });

  it('shows recent scan jobs with status', () => {
    expect(src).toContain('data-testid="recent-scans"');
    expect(src).toContain('job.status');
  });

  it('polls for updates via refetchInterval', () => {
    expect(src).toContain('refetchInterval');
  });

  it('shows error messages', () => {
    expect(src).toContain('data-testid="scan-error"');
  });
});

// ─── self-scan pipeline handler ─────────────────────────────────────────────

describe('self-scan pipeline handler', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/pipeline/handlers/self-scan.ts'),
    'utf-8'
  );

  it('exports handleSelfScan function', () => {
    expect(src).toContain('export async function handleSelfScan');
  });

  it('reads token via resolveToken', () => {
    expect(src).toContain('resolveToken(requestedBy)');
  });

  it('throws when no token is found', () => {
    expect(src).toContain('No valid GitHub token found');
  });

  it('enqueues scan-repo jobs with tokenSourceUid', () => {
    expect(src).toContain('tokenSourceUid: requestedBy');
  });

  it('does NOT pass githubToken to downstream jobs', () => {
    // Verify enqueueScanRepoJob calls don't include githubToken
    const enqueueCall = src.match(/enqueueScanRepoJob\(\s*\{[\s\S]*?\}/);
    expect(enqueueCall).not.toBeNull();
    expect(enqueueCall![0]).not.toContain('githubToken:');
    expect(enqueueCall![0]).toContain('tokenSourceUid');
  });

  it('marks token as expired on 401', () => {
    expect(src).toContain('markTokenExpired');
    expect(src).toContain('401');
  });

  it('updates user scan stats', () => {
    expect(src).toContain('updateUserScanStats');
    expect(src).toContain('updateDoc');
    expect(src).toContain('lastSelfScanAt');
    expect(src).toContain('selfScanCount');
    expect(src).toContain('increment(1)');
  });

  it('handles rate limiting', () => {
    expect(src).toContain('GitHubRateLimitError');
    expect(src).toContain('markJobRateLimited');
  });

  it('imports from Firestore wrapper', () => {
    expect(src).toContain("from '../../core/db/firestore.js'");
  });
});

// ─── token-resolver ─────────────────────────────────────────────────────────

describe('token-resolver', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/pipeline/token-resolver.ts'),
    'utf-8'
  );

  it('exports resolveToken function', () => {
    expect(src).toContain('export async function resolveToken');
  });

  it('exports markTokenExpired function', () => {
    expect(src).toContain('export async function markTokenExpired');
  });

  it('reads from user_profiles secrets subcollection', () => {
    expect(src).toContain('user_profiles');
    expect(src).toContain('/secrets');
  });

  it('uses standard Firestore wrapper (worker is admin)', () => {
    expect(src).toContain("from '../core/db/firestore.js'");
  });

  it('decrypts using AES-256-GCM', () => {
    expect(src).toContain('aes-256-gcm');
    expect(src).toContain('createDecipheriv');
  });

  it('uses GITHUB_TOKEN_ENCRYPTION_KEY', () => {
    expect(src).toContain('GITHUB_TOKEN_ENCRYPTION_KEY');
  });

  it('returns null on missing token', () => {
    expect(src).toContain('return null');
  });

  it('markTokenExpired writes tokenStatus to user profile', () => {
    expect(src).toContain("tokenStatus: 'expired'");
    expect(src).toContain('updateDoc');
  });
});

// ─── scan-repo.ts — tokenSourceUid support ──────────────────────────────────

describe('scan-repo.ts — tokenSourceUid support', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/pipeline/handlers/scan-repo.ts'),
    'utf-8'
  );

  it('imports resolveToken', () => {
    expect(src).toContain("from '../token-resolver.js'");
  });

  it('extracts tokenSourceUid from payload', () => {
    expect(src).toContain('tokenSourceUid');
  });

  it('resolves token from user secrets when tokenSourceUid is present', () => {
    expect(src).toContain('resolveToken(tokenSourceUid)');
  });

  it('falls back to direct githubToken for admin flow', () => {
    expect(src).toContain('payload.githubToken');
  });
});

// ─── Worker registration ────────────────────────────────────────────────────

describe('Worker registration — self-scan', () => {
  const indexSrc = readFileSync(
    resolve(ROOT, 'src/pipeline/index.ts'),
    'utf-8'
  );
  const runSrc = readFileSync(
    resolve(ROOT, 'src/pipeline/commands/run.ts'),
    'utf-8'
  );

  it('index.ts imports handleSelfScan', () => {
    expect(indexSrc).toContain('handleSelfScan');
    expect(indexSrc).toContain("from './handlers/self-scan.js'");
  });

  it('index.ts registers self-scan handler in worker', () => {
    expect(indexSrc).toContain("'self-scan': handleSelfScan");
  });

  it('run.ts imports handleSelfScan', () => {
    expect(runSrc).toContain('handleSelfScan');
  });

  it('run.ts registers self-scan handler', () => {
    expect(runSrc).toContain("'self-scan': handleSelfScan");
  });
});

// ─── MyProfilePage includes SelfScanSection ─────────────────────────────────

describe('MyProfilePage — SelfScanSection integration', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/app/pages/MyProfilePage.tsx'),
    'utf-8'
  );

  it('imports SelfScanSection', () => {
    expect(src).toContain('SelfScanSection');
  });

  it('renders SelfScanSection when GitHub is connected', () => {
    expect(src).toContain('<SelfScanSection');
  });
});

// ─── rescan-candidate.ts still works unchanged ──────────────────────────────

describe('rescan-candidate.ts — existing flow unchanged', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/pipeline/handlers/rescan-candidate.ts'),
    'utf-8'
  );

  it('still passes githubToken directly to scan-repo jobs', () => {
    // Admin rescan flow continues to use direct githubToken
    expect(src).toContain('githubToken');
    expect(src).toContain('enqueueScanRepoJob');
  });
});

// ─── Queue — enqueueSelfScanJob ─────────────────────────────────────────────

describe('queue.ts — enqueueSelfScanJob', () => {
  const src = readFileSync(resolve(ROOT, 'src/pipeline/queue.ts'), 'utf-8');

  it('exports enqueueSelfScanJob', () => {
    expect(src).toContain('export async function enqueueSelfScanJob');
  });

  it('uses self-scan job type', () => {
    expect(src).toContain("enqueueJob('self-scan'");
  });

  it('uses priority 1 (same as rescans)', () => {
    const match = src.match(/enqueueSelfScanJob.*\n.*enqueueJob\('self-scan',\s*payload,\s*(\d)/);
    expect(match).not.toBeNull();
    expect(match![1]).toBe('1');
  });
});
