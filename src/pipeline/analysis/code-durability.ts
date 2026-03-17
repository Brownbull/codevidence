/**
 * src/pipeline/analysis/code-durability.ts — Code churn rate & rewrite analysis.
 *
 * Uses `git log --numstat` on full clones to compute churn rates
 * (14-day and 90-day windows) and rewrite ratios per repository.
 * Runs in Layer 2, parallel with existing analyses. Zero API costs.
 */

import simpleGit from 'simple-git';

// ─── Types ──────────────────────────────────────────────────────────────────

export interface CodeDurabilityResult {
  churnRate14d: number;        // 0.0-1.0
  churnRate90d: number;        // 0.0-1.0
  ownerChurnRate14d: number;   // 0.0-1.0
  ownerChurnRate90d: number;   // 0.0-1.0
  rewriteRatio: number;        // 0.0-2.0
  avgFileChurnCount: number;
  hotFileCount: number;        // files with >10 modifications
  totalLinesAnalyzed: number;
}

interface FileChange {
  path: string;
  added: number;
  deleted: number;
  timestamp: number;           // unix epoch seconds
  authorEmail: string;
}

// ─── Constants ──────────────────────────────────────────────────────────────

export const MAX_COMMITS = 10_000;
export const MIN_CHANGES = 50;
const SECONDS_PER_DAY = 86_400;

const SKIP_PATTERNS: ReadonlyArray<RegExp> = [
  /^package-lock\.json$/,   /^yarn\.lock$/,      /^pnpm-lock\.yaml$/,
  /^Cargo\.lock$/,          /^go\.sum$/,          /^poetry\.lock$/,
  /\.min\.(js|css)$/,       /\.map$/,             /\.svg$/,
  /\.png$/,                 /\.jpg$/,             /\.gif$/,
  /\.ico$/,                 /\.woff2?$/,          /\.ttf$/,
  /\.eot$/,                 /\.pdf$/,
  /node_modules\//,         /vendor\//,           /dist\//,
  /build\//,                /__pycache__\//,      /\.venv\//,
  /venv\//,                 /target\//,           /\.git\//,
];

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Analyses code durability from a full git clone.
 * Returns null if insufficient history (< MIN_CHANGES entries).
 */
export async function analyzeCodeDurability(
  cloneDir: string,
  owner: string,
): Promise<CodeDurabilityResult | null> {
  const changes = await parseGitLogNumstat(cloneDir);
  if (changes.length < MIN_CHANGES) return null;

  const ownerEmails = resolveOwnerEmails(changes, owner);
  const ownerChanges = changes.filter((c) => ownerEmails.has(c.authorEmail));

  const { avgChurnCount, hotFileCount } = computeFileStats(changes);

  return {
    churnRate14d: computeChurnRate(changes, 14),
    churnRate90d: computeChurnRate(changes, 90),
    ownerChurnRate14d: ownerChanges.length > 0 ? computeChurnRate(ownerChanges, 14) : 0,
    ownerChurnRate90d: ownerChanges.length > 0 ? computeChurnRate(ownerChanges, 90) : 0,
    rewriteRatio: computeRewriteRatio(changes),
    avgFileChurnCount: avgChurnCount,
    hotFileCount,
    totalLinesAnalyzed: changes.reduce((sum, c) => sum + c.added, 0),
  };
}

// ─── Git Log Parsing ────────────────────────────────────────────────────────

/**
 * Parses `git log --no-merges --numstat --format=COMMIT:%H:%ae:%at` output.
 * Filters non-code files via SKIP_PATTERNS.
 */
export async function parseGitLogNumstat(cloneDir: string): Promise<FileChange[]> {
  const git = simpleGit(cloneDir);
  const raw = await git.raw([
    'log', '--no-merges', '--numstat',
    `--format=COMMIT:%H|%ae|%at`,
    `--max-count=${MAX_COMMITS}`,
  ]);

  const changes: FileChange[] = [];
  let currentEmail = '';
  let currentTimestamp = 0;

  for (const line of raw.split('\n')) {
    if (line.startsWith('COMMIT:')) {
      const parts = line.slice(7).split('|');
      currentEmail = parts[1]?.toLowerCase() ?? '';
      currentTimestamp = parseInt(parts[2] ?? '0', 10);
      continue;
    }

    if (!line.trim() || currentTimestamp === 0) continue;

    const match = line.match(/^(\d+|-)\t(\d+|-)\t(.+)$/);
    if (!match) continue;

    const added = match[1] === '-' ? 0 : parseInt(match[1] ?? '0', 10);
    const deleted = match[2] === '-' ? 0 : parseInt(match[2] ?? '0', 10);
    const path = match[3] ?? '';

    // Skip git renames (e.g. "old.ts => new.ts") and non-code files
    if (path.includes(' => ')) continue;
    if (shouldSkip(path)) continue;

    changes.push({
      path,
      added,
      deleted,
      timestamp: currentTimestamp,
      authorEmail: currentEmail,
    });
  }

  return changes;
}

function shouldSkip(path: string): boolean {
  const basename = path.split('/').pop() ?? path;
  return SKIP_PATTERNS.some((p) => p.test(path) || p.test(basename));
}

// ─── Churn Rate ─────────────────────────────────────────────────────────────

/**
 * Computes churn rate: fraction of lines added that were subsequently
 * deleted/modified within `windowDays` in the same file.
 */
export function computeChurnRate(changes: FileChange[], windowDays: number): number {
  if (changes.length === 0) return 0;

  const byFile = groupByFile(changes);
  let totalAdded = 0;
  let totalChurned = 0;

  for (const fileChanges of byFile.values()) {
    const sorted = [...fileChanges].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < sorted.length; i++) {
      const event = sorted[i]!;
      if (event.added === 0) continue;
      totalAdded += event.added;

      let deletedInWindow = 0;
      for (let j = i + 1; j < sorted.length; j++) {
        const future = sorted[j]!;
        if (future.timestamp - event.timestamp > windowDays * SECONDS_PER_DAY) break;
        deletedInWindow += future.deleted;
      }

      totalChurned += Math.min(deletedInWindow, event.added);
    }
  }

  return totalAdded > 0 ? Math.round((totalChurned / totalAdded) * 1000) / 1000 : 0;
}

// ─── Rewrite Ratio ──────────────────────────────────────────────────────────

/** Computes rewrite ratio = totalDeleted / totalAdded. Clamped 0-2.0. */
export function computeRewriteRatio(changes: FileChange[]): number {
  let totalAdded = 0;
  let totalDeleted = 0;
  for (const c of changes) {
    totalAdded += c.added;
    totalDeleted += c.deleted;
  }
  if (totalAdded === 0) return 0;
  return Math.min(Math.round((totalDeleted / totalAdded) * 100) / 100, 2.0);
}

// ─── File Stats ─────────────────────────────────────────────────────────────

/** Computes per-file modification counts and identifies hot files. */
export function computeFileStats(
  changes: FileChange[],
): { avgChurnCount: number; hotFileCount: number } {
  const fileCounts = new Map<string, number>();
  for (const c of changes) {
    fileCounts.set(c.path, (fileCounts.get(c.path) ?? 0) + 1);
  }

  if (fileCounts.size === 0) return { avgChurnCount: 0, hotFileCount: 0 };

  let total = 0;
  let hotFiles = 0;
  for (const count of fileCounts.values()) {
    total += count;
    if (count > 10) hotFiles++;
  }

  return {
    avgChurnCount: Math.round((total / fileCounts.size) * 100) / 100,
    hotFileCount: hotFiles,
  };
}

// ─── Owner Email Resolution ─────────────────────────────────────────────────

/**
 * Heuristic: matches GitHub noreply format and username in email local part.
 */
export function resolveOwnerEmails(
  changes: FileChange[],
  owner: string,
): Set<string> {
  const ownerLower = owner.toLowerCase();
  const emails = new Set<string>();
  const allEmails = new Set<string>();

  for (const c of changes) {
    allEmails.add(c.authorEmail);
  }

  for (const email of allEmails) {
    if (email.includes(`${ownerLower}@users.noreply.github.com`)) {
      emails.add(email);
    } else if (email.split('@')[0]?.toLowerCase() === ownerLower) {
      emails.add(email);
    }
  }

  return emails;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function groupByFile(changes: FileChange[]): Map<string, FileChange[]> {
  const map = new Map<string, FileChange[]>();
  for (const c of changes) {
    const arr = map.get(c.path);
    if (arr) arr.push(c);
    else map.set(c.path, [c]);
  }
  return map;
}
