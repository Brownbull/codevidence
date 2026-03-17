/**
 * src/pipeline/analysis/behavioral-patterns.ts — Behavioral commit pattern analysis.
 *
 * Extracts commit discipline metrics (size distribution, burstiness,
 * type diversity, remedy commits) from git log. Runs in Layer 2.
 * Single git process call, pure computation. Zero API costs.
 */

import simpleGit from 'simple-git';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface BehavioralPatternResult {
  commitSizeMedian: number;
  commitSizeP90: number;
  commitBurstiness: number;
  conventionalCommitRatio: number;
  commitTypeDiversity: number;
  refactorCommitRatio: number;
  remedyCommitRatio: number;
  commitMessageMedianLength: number;
  uniqueMessageRatio: number;
}

export interface CommitRecord {
  hash: string;
  authorDate: Date;    // MUST use AuthorDate, not CommitDate
  message: string;
  linesChanged: number;  // insertions + deletions
  filesChanged: number;
}

export type CommitType = 'feat' | 'fix' | 'refactor' | 'docs' | 'test'
  | 'style' | 'chore' | 'perf' | 'ci' | 'build' | 'other';

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_COMMITS = 200;
const MIN_COMMITS = 3;
const REMEDY_THRESHOLD_MS = 5 * 60 * 1000; // 5 minutes

const CONVENTIONAL_RE =
  /^(feat|fix|docs|style|refactor|perf|test|build|chore|ci|revert)(\(.+\))?!?:\s/i;

const KEYWORD_PATTERNS: ReadonlyArray<readonly [RegExp, CommitType]> = [
  [/\b(fix|bug|patch|hotfix|resolve|crash)\b/i, 'fix'],
  [/\b(refactor|restructure|reorganize|simplify|clean\s?up|rename)\b/i, 'refactor'],
  [/\b(test|spec|coverage|assert)\b/i, 'test'],
  [/\b(doc|readme|changelog|comment|jsdoc|typedoc)\b/i, 'docs'],
  [/\b(style|format|lint|prettier|eslint|whitespace)\b/i, 'style'],
  [/\b(perf|performance|optimize|speed|cache)\b/i, 'perf'],
  [/\b(ci|pipeline|workflow|deploy|release)\b/i, 'ci'],
  [/\b(build|compile|bundle|webpack|vite|esbuild)\b/i, 'build'],
  [/\b(chore|bump|update dep|upgrade)\b/i, 'chore'],
] as const;

// ─── Main Entry ─────────────────────────────────────────────────────────────

/**
 * Analyze behavioral commit patterns from a cloned repository.
 * Returns null if insufficient data (<3 commits).
 */
export async function analyzeBehavioralPatterns(
  cloneDir: string,
): Promise<BehavioralPatternResult | null> {
  const git = simpleGit(cloneDir);
  const raw = await git.raw([
    'log', '--no-merges', `-n`, `${MAX_COMMITS}`,
    '--format=COMMIT_START|%H|%aI|%s', '--numstat',
  ]);

  const commits = parseCommitLog(raw);
  if (commits.length < MIN_COMMITS) return null;

  const types = commits.map((c) => classifyCommitType(c.message));
  const sizes = commits.map((c) => c.linesChanged);
  const msgLengths = commits.map((c) => c.message.length);
  const { median: sizeMedian, p90: sizeP90 } = computeStats(sizes);
  const { median: msgMedian } = computeStats(msgLengths);

  const conventionalCount = commits.filter((c) => CONVENTIONAL_RE.test(c.message)).length;
  const refactorCount = types.filter((t) => t === 'refactor').length;
  const uniqueMessages = new Set(commits.map((c) => c.message.toLowerCase().trim()));

  return {
    commitSizeMedian: sizeMedian,
    commitSizeP90: sizeP90,
    commitBurstiness: computeBurstiness(commits),
    conventionalCommitRatio: round(conventionalCount / commits.length),
    commitTypeDiversity: computeTypeDiversity(types),
    refactorCommitRatio: round(refactorCount / commits.length),
    remedyCommitRatio: computeRemedyRatio(commits),
    commitMessageMedianLength: msgMedian,
    uniqueMessageRatio: round(uniqueMessages.size / commits.length),
  };
}

// ─── Parsing ────────────────────────────────────────────────────────────────

/** Parse raw `git log --numstat` output into structured commit records. */
export function parseCommitLog(rawLog: string): CommitRecord[] {
  const commits: CommitRecord[] = [];
  const blocks = rawLog.split('COMMIT_START|').filter(Boolean);

  for (const block of blocks) {
    const lines = block.split('\n');
    const header = lines[0];
    if (!header) continue;

    const [hash, dateStr, ...messageParts] = header.split('|');
    if (!hash || !dateStr) continue;

    const date = new Date(dateStr);
    if (isNaN(date.getTime())) continue;

    let linesChanged = 0;
    let filesChanged = 0;

    for (let i = 1; i < lines.length; i++) {
      const line = lines[i]!;
      const m = line.match(/^(\d+|-)\t(\d+|-)\t/);
      if (!m) continue;
      const added = m[1] === '-' ? 0 : parseInt(m[1] ?? '0', 10);
      const deleted = m[2] === '-' ? 0 : parseInt(m[2] ?? '0', 10);
      linesChanged += added + deleted;
      filesChanged++;
    }

    commits.push({
      hash: hash.trim(),
      authorDate: date,
      message: messageParts.join('|').trim(),
      linesChanged,
      filesChanged,
    });
  }

  return commits;
}

// ─── Burstiness ─────────────────────────────────────────────────────────────

/** Finite-corrected Goh-Barabasi burstiness (Kim et al. 2016). */
export function computeBurstiness(
  commits: ReadonlyArray<{ authorDate: Date }>,
): number {
  if (commits.length < 3) return 0;

  const intervals: number[] = [];
  const sorted = [...commits].sort((a, b) => a.authorDate.getTime() - b.authorDate.getTime());

  for (let i = 1; i < sorted.length; i++) {
    intervals.push(sorted[i]!.authorDate.getTime() - sorted[i - 1]!.authorDate.getTime());
  }

  if (intervals.length === 0) return 0;

  const mu = intervals.reduce((a, b) => a + b, 0) / intervals.length;
  if (mu === 0) return 0;

  const variance = intervals.reduce((sum, x) => sum + (x - mu) ** 2, 0) / intervals.length;
  const sigma = Math.sqrt(variance);
  const n = intervals.length;

  // Finite-corrected formula: B_n = (sqrt(n+1) * sigma - sqrt(n-1) * mu) / ((sqrt(n+1) - 2) * sigma + sqrt(n-1) * mu)
  const sqrtNp1 = Math.sqrt(n + 1);
  const sqrtNm1 = Math.sqrt(n - 1);
  const numerator = sqrtNp1 * sigma - sqrtNm1 * mu;
  const denominator = (sqrtNp1 - 2) * sigma + sqrtNm1 * mu;

  if (denominator === 0) return 0;
  return Math.max(-1, Math.min(1, Math.round((numerator / denominator) * 100) / 100));
}

// ─── Commit Classification ──────────────────────────────────────────────────

/** Classify a commit message into a type. Conventional Commits regex first, keyword fallback. */
export function classifyCommitType(message: string): CommitType {
  const match = message.match(CONVENTIONAL_RE);
  if (match) {
    const type = match[1]?.toLowerCase();
    if (type === 'revert') return 'other';
    return (type as CommitType) ?? 'other';
  }

  for (const [pattern, type] of KEYWORD_PATTERNS) {
    if (pattern.test(message)) return type;
  }

  return 'other';
}

// ─── Type Diversity ─────────────────────────────────────────────────────────

/** Normalized Shannon entropy of commit type distribution (0.0-1.0). */
export function computeTypeDiversity(types: ReadonlyArray<CommitType>): number {
  if (types.length === 0) return 0;

  const counts = new Map<string, number>();
  for (const t of types) counts.set(t, (counts.get(t) ?? 0) + 1);

  const total = types.length;
  let entropy = 0;
  for (const count of counts.values()) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }

  // Normalize by log2(10) — 10 possible non-other types
  const maxEntropy = Math.log2(10);
  return round(Math.min(entropy / maxEntropy, 1.0));
}

// ─── Remedy Ratio ───────────────────────────────────────────────────────────

/** Ratio of remedy commits (consecutive commits < 5 min apart). */
export function computeRemedyRatio(
  commits: ReadonlyArray<{ authorDate: Date }>,
): number {
  if (commits.length <= 1) return 0;

  const sorted = [...commits].sort((a, b) => a.authorDate.getTime() - b.authorDate.getTime());
  let remedyCount = 0;

  for (let i = 1; i < sorted.length; i++) {
    const gap = sorted[i]!.authorDate.getTime() - sorted[i - 1]!.authorDate.getTime();
    if (gap > 0 && gap < REMEDY_THRESHOLD_MS) remedyCount++;
  }

  // Denominator is N-1 gaps (not N commits)
  return round(remedyCount / (sorted.length - 1));
}

// ─── Stats ──────────────────────────────────────────────────────────────────

/** Median and 90th percentile of an array of numbers. */
export function computeStats(
  values: ReadonlyArray<number>,
): { median: number; p90: number } {
  if (values.length === 0) return { median: 0, p90: 0 };

  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const median = sorted.length % 2 === 1
    ? sorted[mid] ?? 0
    : ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;

  const p90Idx = Math.floor(sorted.length * 0.9);
  const p90 = sorted[Math.min(p90Idx, sorted.length - 1)] ?? 0;

  return { median: Math.round(median), p90: Math.round(p90) };
}

function round(n: number): number {
  return Math.round(n * 100) / 100;
}
