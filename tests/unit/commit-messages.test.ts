/**
 * tests/unit/commit-messages.test.ts
 *
 * Unit tests for commit message quality analysis: conventional commits,
 * imperative mood, weak patterns, issue references, quality score.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

import {
  analyzeCommitMessages,
  parseConventionalCommit,
  isImperativeMood,
  isWeakMessage,
  hasIssueReference,
  isMergeCommit,
  parseCommitLog,
} from '../../src/pipeline/analysis/commit-messages.js';
import type { CommitMessageInput } from '../../src/pipeline/analysis/commit-messages.js';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Module Structure ───────────────────────────────────────────────────────

describe('Commit Messages: Module Structure', () => {
  const src = readSource('src/pipeline/analysis/commit-messages.ts');

  it('exports analyzeCommitMessageQuality as async function', () => {
    expect(src).toContain('export async function analyzeCommitMessageQuality');
  });

  it('uses custom delimiters (not default format)', () => {
    expect(src).toContain('CSS_COMMIT_SEP');
    expect(src).toContain('CSS_FIELD_SEP');
  });

  it('uses non-global regex for ISSUE_RE and JIRA_RE', () => {
    // Non-global regexes avoid stale lastIndex state
    expect(src).toMatch(/const ISSUE_RE\s*=\s*\//);
    expect(src).not.toMatch(/const ISSUE_RE\s*=\s*\/.*\/g/);
    expect(src).not.toMatch(/const JIRA_RE\s*=\s*\/.*\/g/);
  });

  it('has MIN_COMMITS = 5', () => {
    expect(src).toContain('MIN_COMMITS = 5');
  });
});

// ─── Conventional Commit Parsing ────────────────────────────────────────────

describe('Commit Messages: parseConventionalCommit', () => {
  it('parses standard conventional commit', () => {
    const result = parseConventionalCommit('feat: add login page');
    expect(result.isConventional).toBe(true);
    expect(result.type).toBe('feat');
    expect(result.description).toBe('add login page');
    expect(result.isBreaking).toBe(false);
  });

  it('parses scoped conventional commit', () => {
    const result = parseConventionalCommit('fix(auth): resolve token expiry');
    expect(result.isConventional).toBe(true);
    expect(result.type).toBe('fix');
    expect(result.scope).toBe('auth');
  });

  it('detects breaking changes', () => {
    const result = parseConventionalCommit('feat!: remove deprecated API');
    expect(result.isBreaking).toBe(true);
  });

  it('rejects non-conventional messages', () => {
    const result = parseConventionalCommit('updated the login page');
    expect(result.isConventional).toBe(false);
  });

  it('handles all standard types', () => {
    const types = ['feat', 'fix', 'docs', 'style', 'refactor', 'perf', 'test', 'build', 'ci', 'chore', 'revert'];
    for (const type of types) {
      expect(parseConventionalCommit(`${type}: message`).isConventional).toBe(true);
    }
  });
});

// ─── Imperative Mood ────────────────────────────────────────────────────────

describe('Commit Messages: isImperativeMood', () => {
  it('detects imperative verbs', () => {
    expect(isImperativeMood('add new feature')).toBe(true);
    expect(isImperativeMood('fix login bug')).toBe(true);
    expect(isImperativeMood('remove deprecated code')).toBe(true);
  });

  it('strips conventional prefix before checking', () => {
    expect(isImperativeMood('feat: add login')).toBe(true);
    expect(isImperativeMood('fix(auth): resolve token issue')).toBe(true);
  });

  it('rejects non-imperative', () => {
    expect(isImperativeMood('added new feature')).toBe(false);
    expect(isImperativeMood('fixing bug')).toBe(false);
    expect(isImperativeMood('the change is ready')).toBe(false);
  });
});

// ─── Weak Messages ──────────────────────────────────────────────────────────

describe('Commit Messages: isWeakMessage', () => {
  it('detects single-word messages', () => {
    expect(isWeakMessage('fix')).toBe(true);
    expect(isWeakMessage('update')).toBe(true);
    expect(isWeakMessage('wip')).toBe(true);
  });

  it('detects filename-only messages', () => {
    expect(isWeakMessage('app.tsx')).toBe(true);
  });

  it('detects vague messages', () => {
    expect(isWeakMessage('minor fix')).toBe(true);
    expect(isWeakMessage('fixed stuff')).toBe(true);
  });

  it('detects too-short messages', () => {
    expect(isWeakMessage('abc')).toBe(true);
    expect(isWeakMessage('ok')).toBe(true);
  });

  it('accepts good messages', () => {
    expect(isWeakMessage('add user authentication flow')).toBe(false);
    expect(isWeakMessage('refactor database connection pooling')).toBe(false);
  });
});

// ─── Issue References ───────────────────────────────────────────────────────

describe('Commit Messages: hasIssueReference', () => {
  it('detects GitHub issue references', () => {
    expect(hasIssueReference('fix login bug #42')).toBe(true);
    expect(hasIssueReference('closes #123')).toBe(true);
  });

  it('detects JIRA references', () => {
    expect(hasIssueReference('PROJ-123: fix auth')).toBe(true);
    expect(hasIssueReference('resolve AB-1')).toBe(true);
  });

  it('returns false for no references', () => {
    expect(hasIssueReference('add login page')).toBe(false);
  });
});

// ─── Merge Commit Detection ─────────────────────────────────────────────────

describe('Commit Messages: isMergeCommit', () => {
  it('detects merge branch', () => {
    expect(isMergeCommit('Merge branch \'main\' into feature')).toBe(true);
  });

  it('detects merge pull request', () => {
    expect(isMergeCommit('Merge pull request #42 from org/feature')).toBe(true);
  });

  it('rejects non-merge commits', () => {
    expect(isMergeCommit('feat: merge logic for auth')).toBe(false);
  });
});

// ─── Log Parsing ────────────────────────────────────────────────────────────

describe('Commit Messages: parseCommitLog', () => {
  it('parses well-formed log output', () => {
    const raw = [
      '---CSS_COMMIT_SEP---abc123---CSS_FIELD_SEP---feat: add login---CSS_FIELD_SEP---Added login page with form validation.',
      '---CSS_COMMIT_SEP---def456---CSS_FIELD_SEP---fix: typo---CSS_FIELD_SEP---',
    ].join('\n');

    const commits = parseCommitLog(raw);
    expect(commits).toHaveLength(2);
    expect(commits[0]!.hash).toBe('abc123');
    expect(commits[0]!.subject).toBe('feat: add login');
    expect(commits[0]!.body).toBe('Added login page with form validation.');
    expect(commits[1]!.body).toBe('');
  });

  it('handles empty input', () => {
    expect(parseCommitLog('')).toHaveLength(0);
  });
});

// ─── Quality Score Integration ──────────────────────────────────────────────

describe('Commit Messages: analyzeCommitMessages', () => {
  it('returns zero-filled result for empty array', () => {
    const result = analyzeCommitMessages([]);
    expect(result.totalAnalyzed).toBe(0);
    expect(result.qualityScore).toBe(0);
  });

  it('computes high score for quality messages', () => {
    const commits: CommitMessageInput[] = Array.from({ length: 20 }, (_, i) => ({
      hash: `hash${i}`,
      subject: `feat: add feature ${i} (#${i + 1})`,
      body: 'Detailed explanation of the change.',
    }));

    const result = analyzeCommitMessages(commits);
    expect(result.totalAnalyzed).toBe(20);
    expect(result.conventionalRatio).toBe(1);
    expect(result.qualityScore).toBeGreaterThan(70);
  });

  it('computes low score for weak messages', () => {
    const commits: CommitMessageInput[] = Array.from({ length: 10 }, (_, i) => ({
      hash: `hash${i}`,
      subject: 'fix',
      body: '',
    }));

    const result = analyzeCommitMessages(commits);
    expect(result.weakRatio).toBe(1);
    expect(result.qualityScore).toBeLessThan(30);
  });

  it('tracks type distribution', () => {
    const commits: CommitMessageInput[] = [
      { hash: 'a', subject: 'feat: add login', body: '' },
      { hash: 'b', subject: 'feat: add signup', body: '' },
      { hash: 'c', subject: 'fix: resolve crash', body: '' },
    ];

    const result = analyzeCommitMessages(commits);
    expect(result.typeDistribution).toEqual({ feat: 2, fix: 1 });
  });

  it('quality score is clamped to 0-100', () => {
    const commits: CommitMessageInput[] = [
      { hash: 'a', subject: 'feat: add feature (#1)', body: 'Body text here.' },
    ];
    const result = analyzeCommitMessages(commits);
    expect(result.qualityScore).toBeGreaterThanOrEqual(0);
    expect(result.qualityScore).toBeLessThanOrEqual(100);
  });
});
