/**
 * tests/unit/behavioral-patterns.test.ts
 *
 * Unit tests for behavioral commit pattern analysis: log parsing,
 * burstiness, commit classification, type diversity, remedy ratio, stats.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  parseCommitLog,
  computeBurstiness,
  classifyCommitType,
  computeTypeDiversity,
  computeRemedyRatio,
  computeStats,
} from '../../src/pipeline/analysis/behavioral-patterns.js';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Module Structure ───────────────────────────────────────────────────────

describe('Behavioral Patterns: Module Structure', () => {
  const src = readSource('src/pipeline/analysis/behavioral-patterns.ts');

  it('exports analyzeBehavioralPatterns as async function', () => {
    expect(src).toContain('export async function analyzeBehavioralPatterns');
  });

  it('exports BehavioralPatternResult interface', () => {
    expect(src).toContain('export interface BehavioralPatternResult');
    expect(src).toContain('commitSizeMedian: number');
    expect(src).toContain('commitBurstiness: number');
    expect(src).toContain('commitTypeDiversity: number');
    expect(src).toContain('remedyCommitRatio: number');
  });

  it('uses git log format with author date', () => {
    expect(src).toContain('%aI');
  });

  it('uses non-global regex patterns', () => {
    // All keyword patterns should NOT have 'g' flag (prevents stale lastIndex)
    expect(src).not.toMatch(/new RegExp\(.+,\s*['"]g['"]\)/);
  });
});

// ─── Log Parsing ────────────────────────────────────────────────────────────

describe('Behavioral Patterns: parseCommitLog', () => {
  it('parses well-formed commit log', () => {
    const raw = [
      'COMMIT_START|abc123|2024-01-15T10:00:00Z|feat: add login',
      '5\t2\tsrc/auth.ts',
      '3\t0\tsrc/util.ts',
      '',
      'COMMIT_START|def456|2024-01-14T09:00:00Z|fix: typo',
      '1\t1\tREADME.md',
    ].join('\n');

    const commits = parseCommitLog(raw);
    expect(commits).toHaveLength(2);
    expect(commits[0]!.hash).toBe('abc123');
    expect(commits[0]!.message).toBe('feat: add login');
    expect(commits[0]!.linesChanged).toBe(10); // 5+2+3+0
    expect(commits[0]!.filesChanged).toBe(2);
  });

  it('handles empty input', () => {
    expect(parseCommitLog('')).toHaveLength(0);
  });

  it('skips malformed entries', () => {
    const raw = 'COMMIT_START|abc||feat: no date';
    const commits = parseCommitLog(raw);
    expect(commits).toHaveLength(0);
  });

  it('handles binary files (- markers)', () => {
    const raw = [
      'COMMIT_START|abc123|2024-01-15T10:00:00Z|add image',
      '-\t-\timage.png',
      '10\t0\tsrc/app.ts',
    ].join('\n');

    const commits = parseCommitLog(raw);
    expect(commits[0]!.linesChanged).toBe(10); // binary = 0+0, ts = 10+0
    expect(commits[0]!.filesChanged).toBe(2);
  });
});

// ─── Burstiness ─────────────────────────────────────────────────────────────

describe('Behavioral Patterns: computeBurstiness', () => {
  it('returns 0 for fewer than 3 commits', () => {
    expect(computeBurstiness([])).toBe(0);
    expect(computeBurstiness([
      { authorDate: new Date('2024-01-01') },
      { authorDate: new Date('2024-01-02') },
    ])).toBe(0);
  });

  it('returns value in [-1, 1] range', () => {
    const commits = Array.from({ length: 10 }, (_, i) => ({
      authorDate: new Date(2024, 0, 1 + i),
    }));
    const b = computeBurstiness(commits);
    expect(b).toBeGreaterThanOrEqual(-1);
    expect(b).toBeLessThanOrEqual(1);
  });

  it('returns negative for regular intervals (Poisson-like)', () => {
    // Evenly spaced commits → low burstiness → negative value
    const commits = Array.from({ length: 20 }, (_, i) => ({
      authorDate: new Date(2024, 0, 1, i * 2), // every 2 hours
    }));
    const b = computeBurstiness(commits);
    expect(b).toBeLessThanOrEqual(0);
  });

  it('returns 0 for identical timestamps', () => {
    const same = new Date('2024-01-01');
    const commits = Array.from({ length: 5 }, () => ({ authorDate: same }));
    expect(computeBurstiness(commits)).toBe(0);
  });
});

// ─── Commit Classification ──────────────────────────────────────────────────

describe('Behavioral Patterns: classifyCommitType', () => {
  it('detects conventional commit prefix', () => {
    expect(classifyCommitType('feat: add new feature')).toBe('feat');
    expect(classifyCommitType('fix(auth): resolve login bug')).toBe('fix');
    expect(classifyCommitType('docs: update README')).toBe('docs');
    expect(classifyCommitType('refactor!: breaking change')).toBe('refactor');
  });

  it('maps revert to other', () => {
    expect(classifyCommitType('revert: undo previous change')).toBe('other');
  });

  it('falls back to keyword matching', () => {
    expect(classifyCommitType('fixed a crash in the app')).toBe('fix');
    expect(classifyCommitType('refactor the auth module')).toBe('refactor');
    expect(classifyCommitType('added test coverage for login')).toBe('test');
    expect(classifyCommitType('doc update for API')).toBe('docs');
  });

  it('returns other for unclassifiable messages', () => {
    expect(classifyCommitType('initial commit')).toBe('other');
    expect(classifyCommitType('hello world')).toBe('other');
  });
});

// ─── Type Diversity ─────────────────────────────────────────────────────────

describe('Behavioral Patterns: computeTypeDiversity', () => {
  it('returns 0 for empty array', () => {
    expect(computeTypeDiversity([])).toBe(0);
  });

  it('returns 0 for single type', () => {
    expect(computeTypeDiversity(['feat', 'feat', 'feat'])).toBe(0);
  });

  it('returns higher value for more diverse types', () => {
    const low = computeTypeDiversity(['feat', 'feat', 'fix']);
    const high = computeTypeDiversity(['feat', 'fix', 'refactor', 'docs', 'test']);
    expect(high).toBeGreaterThan(low);
  });

  it('returns value in [0, 1] range', () => {
    const d = computeTypeDiversity(['feat', 'fix', 'docs', 'test', 'refactor', 'chore']);
    expect(d).toBeGreaterThanOrEqual(0);
    expect(d).toBeLessThanOrEqual(1);
  });
});

// ─── Remedy Ratio ───────────────────────────────────────────────────────────

describe('Behavioral Patterns: computeRemedyRatio', () => {
  it('returns 0 for single commit', () => {
    expect(computeRemedyRatio([{ authorDate: new Date() }])).toBe(0);
  });

  it('returns 0 when all commits are spaced out', () => {
    const commits = [
      { authorDate: new Date('2024-01-01T10:00:00Z') },
      { authorDate: new Date('2024-01-01T12:00:00Z') },
      { authorDate: new Date('2024-01-01T14:00:00Z') },
    ];
    expect(computeRemedyRatio(commits)).toBe(0);
  });

  it('detects rapid-fire commits (<5 min apart)', () => {
    const commits = [
      { authorDate: new Date('2024-01-01T10:00:00Z') },
      { authorDate: new Date('2024-01-01T10:02:00Z') }, // 2 min → remedy
      { authorDate: new Date('2024-01-01T10:04:00Z') }, // 2 min → remedy
      { authorDate: new Date('2024-01-01T12:00:00Z') }, // 2h → not remedy
    ];
    // 2 remedy gaps out of 3 total gaps → 2/3 ≈ 0.67
    expect(computeRemedyRatio(commits)).toBe(0.67);
  });
});

// ─── Stats ──────────────────────────────────────────────────────────────────

describe('Behavioral Patterns: computeStats', () => {
  it('returns zeros for empty array', () => {
    expect(computeStats([])).toEqual({ median: 0, p90: 0 });
  });

  it('computes median for odd-length array', () => {
    expect(computeStats([3, 1, 2]).median).toBe(2);
  });

  it('computes median for even-length array (rounds to integer)', () => {
    // computeStats uses Math.round on median, so (2+3)/2 = 2.5 → 3
    expect(computeStats([1, 2, 3, 4]).median).toBe(3);
  });

  it('computes p90', () => {
    const values = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    expect(computeStats(values).p90).toBe(10);
  });
});
