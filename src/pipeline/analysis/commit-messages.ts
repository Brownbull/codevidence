/**
 * src/pipeline/analysis/commit-messages.ts — Commit message quality analysis.
 *
 * Scores commit messages across 6 dimensions: weak patterns, conventional commits,
 * imperative mood, body presence, issue references, subject length.
 * Runs in Layer 2. Single git process call, pure regex/string analysis. Zero API costs.
 */

import simpleGit from 'simple-git';
import type { CommitMessageQuality } from '../../types/repository.js';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CommitMessageInput {
  hash: string;
  subject: string;    // first line (git %s)
  body: string;       // everything after blank line (git %b)
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_COMMITS = 200;
const MIN_COMMITS = 5;

const CONVENTIONAL_COMMIT_RE =
  /^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\([^)]+\))?!?:\s+(.+)$/;

const MERGE_RE = /^Merge\s+(branch|pull request|remote)/i;
const ISSUE_RE = /#\d+/;
const JIRA_RE = /\b[A-Z][A-Z0-9]*-\d+\b/;

const IMPERATIVE_VERBS = new Set([
  'add', 'fix', 'remove', 'update', 'refactor', 'implement', 'change',
  'move', 'rename', 'delete', 'create', 'revert', 'bump', 'set', 'use',
  'make', 'improve', 'handle', 'replace', 'extract', 'convert', 'apply',
  'enable', 'disable', 'allow', 'prevent', 'ensure', 'support', 'drop',
  'introduce', 'simplify', 'optimize', 'clean', 'correct', 'adjust',
  'migrate', 'upgrade', 'deprecate', 'document', 'clarify', 'split',
  'combine', 'wrap', 'normalize', 'validate', 'sanitize', 'resolve',
]);

const WEAK_PATTERNS: ReadonlyArray<{ pattern: RegExp; label: string }> = [
  { pattern: /^(fix|update|updates?|changes?|wip|misc|stuff|temp|test|cleanup|typo)$/i, label: 'single-word' },
  { pattern: /^\S+\.\w{1,4}$/i, label: 'filename-only' },
  { pattern: /^(minor|small)\s+(fix|change|update|tweak)s?$/i, label: 'vague-minor' },
  { pattern: /^fix(ed)?\s+(stuff|things|it|this|bug|issue)$/i, label: 'vague-fix' },
  { pattern: /^[.\-]$/, label: 'punctuation-only' },
  { pattern: /^asdf/i, label: 'keyboard-mash' },
  { pattern: /^aaa+$/i, label: 'keyboard-mash' },
  { pattern: /^.{1,7}$/, label: 'too-short' },
];

const COMMIT_DELIMITER = '---CSS_COMMIT_SEP---';
const FIELD_DELIMITER = '---CSS_FIELD_SEP---';

// ─── Main Entry ─────────────────────────────────────────────────────────────

/**
 * Analyze commit message quality from a cloned repository.
 * Returns null if insufficient data (<5 non-merge commits).
 */
export async function analyzeCommitMessageQuality(
  cloneDir: string,
): Promise<CommitMessageQuality | null> {
  const git = simpleGit(cloneDir);
  const raw = await git.raw([
    'log', '--no-merges', '-n', `${MAX_COMMITS}`,
    `--format=${COMMIT_DELIMITER}%H${FIELD_DELIMITER}%s${FIELD_DELIMITER}%b`,
  ]);

  const commits = parseCommitLog(raw);
  const nonMerge = commits.filter((c) => !isMergeCommit(c.subject));
  if (nonMerge.length < MIN_COMMITS) return null;

  return analyzeCommitMessages(nonMerge);
}

// ─── Core Analysis ──────────────────────────────────────────────────────────

/** Computes quality metrics from an array of commit messages. Pure function. */
export function analyzeCommitMessages(
  commits: ReadonlyArray<CommitMessageInput>,
): CommitMessageQuality {
  if (commits.length === 0) {
    return emptyResult();
  }

  let conventional = 0;
  let imperative = 0;
  let weak = 0;
  let withBody = 0;
  let withIssue = 0;
  let subjectLengthSum = 0;
  const typeCounts: Record<string, number> = {};

  for (const c of commits) {
    const cc = parseConventionalCommit(c.subject);
    if (cc.isConventional) {
      conventional++;
      const type = cc.type ?? 'other';
      typeCounts[type] = (typeCounts[type] ?? 0) + 1;
    }
    if (isImperativeMood(c.subject)) imperative++;
    if (!cc.isConventional && isWeakMessage(c.subject)) weak++;
    if (c.body.trim().length > 0) withBody++;
    if (hasIssueReference(c.subject + ' ' + c.body)) withIssue++;
    subjectLengthSum += c.subject.length;
  }

  const n = commits.length;
  const conventionalRatio = round(conventional / n);
  const imperativeRatio = round(imperative / n);
  const weakRatio = round(weak / n);
  const bodyPresenceRatio = round(withBody / n);
  const issueReferenceRatio = round(withIssue / n);
  const avgSubjectLength = Math.round(subjectLengthSum / n);

  const qualityScore = computeQualityScore(
    weakRatio, conventionalRatio, imperativeRatio,
    bodyPresenceRatio, issueReferenceRatio, avgSubjectLength,
  );

  return {
    totalAnalyzed: n,
    conventionalRatio,
    imperativeRatio,
    weakRatio,
    bodyPresenceRatio,
    issueReferenceRatio,
    avgSubjectLength,
    typeDistribution: typeCounts,
    qualityScore,
  };
}

function computeQualityScore(
  weakRatio: number, conventionalRatio: number, imperativeRatio: number,
  bodyPresenceRatio: number, issueReferenceRatio: number, avgSubjectLength: number,
): number {
  const raw =
    (1 - weakRatio) * 25 +
    conventionalRatio * 25 +
    imperativeRatio * 15 +
    bodyPresenceRatio * 15 +
    issueReferenceRatio * 10 +
    Math.min(avgSubjectLength / 50, 1) * 10;
  return Math.round(Math.max(0, Math.min(100, raw)));
}

// ─── Detectors ──────────────────────────────────────────────────────────────

/** Parse a commit subject for Conventional Commits format. */
export function parseConventionalCommit(subject: string): {
  isConventional: boolean;
  type?: string;
  scope?: string;
  isBreaking: boolean;
  description?: string;
} {
  const match = subject.match(CONVENTIONAL_COMMIT_RE);
  if (!match) return { isConventional: false, isBreaking: false };

  return {
    isConventional: true,
    type: match[1]?.toLowerCase(),
    scope: match[2]?.slice(1, -1),  // remove parens
    isBreaking: subject.includes('!:'),
    description: match[3],
  };
}

/** Detect imperative mood by checking first word (after stripping conventional prefix). */
export function isImperativeMood(subject: string): boolean {
  let text = subject;
  const ccMatch = text.match(CONVENTIONAL_COMMIT_RE);
  if (ccMatch) text = ccMatch[3] ?? '';

  const firstWord = text.trim().split(/\s+/)[0]?.toLowerCase();
  return firstWord ? IMPERATIVE_VERBS.has(firstWord) : false;
}

/** Detect weak/low-effort commit message patterns. */
export function isWeakMessage(subject: string): boolean {
  const trimmed = subject.trim();
  return WEAK_PATTERNS.some((w) => w.pattern.test(trimmed));
}

/** Check if a commit message references issues (GitHub #N or JIRA PROJ-N). */
export function hasIssueReference(message: string): boolean {
  return ISSUE_RE.test(message) || JIRA_RE.test(message);
}

/** Check if a subject line is a merge commit. */
export function isMergeCommit(subject: string): boolean {
  return MERGE_RE.test(subject);
}

// ─── Parsing ────────────────────────────────────────────────────────────────

/** Parse raw git log output into structured CommitMessageInput array. */
export function parseCommitLog(rawLog: string): CommitMessageInput[] {
  const commits: CommitMessageInput[] = [];
  const blocks = rawLog.split(COMMIT_DELIMITER).filter(Boolean);

  for (const block of blocks) {
    const parts = block.split(FIELD_DELIMITER);
    const hash = parts[0]?.trim();
    const subject = parts[1]?.trim();
    const body = parts.slice(2).join(FIELD_DELIMITER).trim();

    if (!hash || !subject) continue;
    commits.push({ hash, subject, body });
  }

  return commits;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function emptyResult(): CommitMessageQuality {
  return {
    totalAnalyzed: 0,
    conventionalRatio: 0,
    imperativeRatio: 0,
    weakRatio: 0,
    bodyPresenceRatio: 0,
    issueReferenceRatio: 0,
    avgSubjectLength: 0,
    typeDistribution: {},
    qualityScore: 0,
  };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
