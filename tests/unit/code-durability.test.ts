/**
 * tests/unit/code-durability.test.ts
 *
 * Unit tests for code durability analysis: churn rate computation,
 * rewrite ratio, file stats, owner email resolution, git log parsing.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  computeChurnRate,
  computeRewriteRatio,
  computeFileStats,
  resolveOwnerEmails,
  MIN_CHANGES,
  MAX_COMMITS,
} from '../../src/pipeline/analysis/code-durability.js';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Module Structure ───────────────────────────────────────────────────────

describe('Code Durability: Module Structure', () => {
  const src = readSource('src/pipeline/analysis/code-durability.ts');

  it('exports analyzeCodeDurability as async function', () => {
    expect(src).toContain('export async function analyzeCodeDurability');
  });

  it('exports CodeDurabilityResult interface with all fields', () => {
    expect(src).toContain('export interface CodeDurabilityResult');
    expect(src).toContain('churnRate14d: number');
    expect(src).toContain('ownerChurnRate14d: number');
    expect(src).toContain('rewriteRatio: number');
    expect(src).toContain('hotFileCount: number');
  });

  it('uses git log --no-merges --numstat format with pipe delimiters', () => {
    expect(src).toContain("'log', '--no-merges', '--numstat'");
    // Uses pipe delimiter to avoid colon-in-email parsing bug
    expect(src).toContain('COMMIT:%H|%ae|%at');
  });

  it('filters git rename paths', () => {
    expect(src).toContain("' => '");
  });

  it('enforces MAX_COMMITS limit', () => {
    expect(MAX_COMMITS).toBe(10_000);
    expect(src).toContain('--max-count=');
  });

  it('enforces MIN_CHANGES threshold', () => {
    expect(MIN_CHANGES).toBe(50);
  });

  it('filters non-code files via SKIP_PATTERNS', () => {
    expect(src).toContain('package-lock\\.json');
    expect(src).toContain('node_modules');
    expect(src).toContain('\\.min\\.');
  });
});

// ─── Churn Rate ─────────────────────────────────────────────────────────────

describe('Code Durability: computeChurnRate', () => {
  const DAY = 86_400;

  it('returns 0 for empty changes', () => {
    expect(computeChurnRate([], 14)).toBe(0);
  });

  it('returns 0 when no deletions within window', () => {
    const changes = [
      { path: 'a.ts', added: 100, deleted: 0, timestamp: 1000, authorEmail: 'a@x.com' },
      { path: 'a.ts', added: 0, deleted: 50, timestamp: 1000 + 30 * DAY, authorEmail: 'a@x.com' },
    ];
    // Deletion at 30 days, outside 14-day window
    expect(computeChurnRate(changes, 14)).toBe(0);
  });

  it('computes churn within 14-day window', () => {
    const changes = [
      { path: 'a.ts', added: 100, deleted: 0, timestamp: 1000, authorEmail: 'a@x.com' },
      { path: 'a.ts', added: 0, deleted: 40, timestamp: 1000 + 5 * DAY, authorEmail: 'a@x.com' },
    ];
    // 40 deleted within 14d of 100 added → churn = 40/100 = 0.4
    expect(computeChurnRate(changes, 14)).toBe(0.4);
  });

  it('caps churned at added amount per event', () => {
    const changes = [
      { path: 'a.ts', added: 10, deleted: 0, timestamp: 1000, authorEmail: 'a@x.com' },
      { path: 'a.ts', added: 0, deleted: 100, timestamp: 1000 + DAY, authorEmail: 'a@x.com' },
    ];
    // churned = min(100, 10) = 10, total added = 10 → rate = 1.0
    expect(computeChurnRate(changes, 14)).toBe(1);
  });

  it('groups changes by file path', () => {
    const changes = [
      { path: 'a.ts', added: 50, deleted: 0, timestamp: 1000, authorEmail: 'a@x.com' },
      { path: 'b.ts', added: 0, deleted: 30, timestamp: 1000 + DAY, authorEmail: 'a@x.com' },
    ];
    // Deletion in b.ts doesn't affect a.ts churn
    expect(computeChurnRate(changes, 14)).toBe(0);
  });
});

// ─── Rewrite Ratio ──────────────────────────────────────────────────────────

describe('Code Durability: computeRewriteRatio', () => {
  it('returns 0 for empty changes', () => {
    expect(computeRewriteRatio([])).toBe(0);
  });

  it('returns 0 when no additions', () => {
    const changes = [
      { path: 'a.ts', added: 0, deleted: 50, timestamp: 1000, authorEmail: 'a@x.com' },
    ];
    expect(computeRewriteRatio(changes)).toBe(0);
  });

  it('computes ratio of deleted to added', () => {
    const changes = [
      { path: 'a.ts', added: 100, deleted: 30, timestamp: 1000, authorEmail: 'a@x.com' },
      { path: 'b.ts', added: 100, deleted: 70, timestamp: 2000, authorEmail: 'a@x.com' },
    ];
    // total: 200 added, 100 deleted → ratio = 0.5
    expect(computeRewriteRatio(changes)).toBe(0.5);
  });

  it('clamps at 2.0', () => {
    const changes = [
      { path: 'a.ts', added: 10, deleted: 50, timestamp: 1000, authorEmail: 'a@x.com' },
    ];
    // 50/10 = 5.0, clamped to 2.0
    expect(computeRewriteRatio(changes)).toBe(2.0);
  });
});

// ─── File Stats ─────────────────────────────────────────────────────────────

describe('Code Durability: computeFileStats', () => {
  it('returns zeros for empty changes', () => {
    expect(computeFileStats([])).toEqual({ avgChurnCount: 0, hotFileCount: 0 });
  });

  it('computes average modification count', () => {
    const changes = [
      { path: 'a.ts', added: 1, deleted: 0, timestamp: 1, authorEmail: 'a@x.com' },
      { path: 'a.ts', added: 1, deleted: 0, timestamp: 2, authorEmail: 'a@x.com' },
      { path: 'b.ts', added: 1, deleted: 0, timestamp: 3, authorEmail: 'a@x.com' },
    ];
    // a.ts: 2 changes, b.ts: 1 change → avg = 1.5
    expect(computeFileStats(changes).avgChurnCount).toBe(1.5);
  });

  it('counts hot files (>10 modifications)', () => {
    const changes = Array.from({ length: 12 }, (_, i) => ({
      path: 'hot.ts', added: 1, deleted: 0, timestamp: i, authorEmail: 'a@x.com',
    }));
    changes.push({ path: 'cold.ts', added: 1, deleted: 0, timestamp: 100, authorEmail: 'a@x.com' });
    expect(computeFileStats(changes).hotFileCount).toBe(1);
  });
});

// ─── Owner Email Resolution ─────────────────────────────────────────────────

describe('Code Durability: resolveOwnerEmails', () => {
  const changes = [
    { path: 'a.ts', added: 1, deleted: 0, timestamp: 1, authorEmail: 'alice@users.noreply.github.com' },
    { path: 'b.ts', added: 1, deleted: 0, timestamp: 2, authorEmail: 'alice@example.com' },
    { path: 'c.ts', added: 1, deleted: 0, timestamp: 3, authorEmail: 'bob@example.com' },
  ];

  it('matches GitHub noreply format', () => {
    const emails = resolveOwnerEmails(changes, 'alice');
    expect(emails.has('alice@users.noreply.github.com')).toBe(true);
  });

  it('matches username in email local part', () => {
    const emails = resolveOwnerEmails(changes, 'alice');
    expect(emails.has('alice@example.com')).toBe(true);
  });

  it('excludes non-owner emails', () => {
    const emails = resolveOwnerEmails(changes, 'alice');
    expect(emails.has('bob@example.com')).toBe(false);
  });

  it('is case-insensitive', () => {
    const emails = resolveOwnerEmails(changes, 'ALICE');
    expect(emails.size).toBe(2);
  });
});
