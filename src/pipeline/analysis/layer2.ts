/**
 * src/pipeline/analysis/layer2.ts — Layer 2 analysis.
 *
 * Analyses a full-depth clone to extract:
 * - Commit count and commit span in months
 * - Ownership detection (isOwnerRepo = dominant committer with >50% commits)
 * - Test directory detection and estimated test coverage
 *
 * Layer 2 requires a full clone (not shallow) to access full commit history.
 * Uses git log --format='%H %ae %ad' -n 200 for commit analysis.
 */

import { existsSync, readdirSync, statSync } from 'fs';
import { join } from 'path';
import simpleGit from 'simple-git';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Layer2Result {
  commitCount: number;
  firstCommitAt: Date | null;
  lastCommitAt: Date | null;
  commitSpanMonths: number;
  isOwnerRepo: boolean;
  hasTestDirectory: boolean;
  testFileCount: number;
  estimatedTestCoverage: 'none' | 'low' | 'medium' | 'high';
}

// ─── Analysis ─────────────────────────────────────────────────────────────────

/**
 * Runs Layer 2 analysis on a full-depth clone.
 *
 * @param cloneDir  Path to the cloned repository directory (full clone)
 * @param repoOwner  GitHub username of the repo owner
 */
export async function analyzeLayer2(
  cloneDir: string,
  repoOwner: string
): Promise<Layer2Result> {
  const git = simpleGit(cloneDir);

  // Get commit history (up to 200 commits)
  const logResult = await git.log({
    maxCount: 200,
    format: { hash: '%H', email: '%ae', date: '%aI' },
  });

  const commits = logResult.all;
  const commitCount = commits.length;

  // Compute first/last commit dates and span
  let firstCommitAt: Date | null = null;
  let lastCommitAt: Date | null = null;
  let commitSpanMonths = 0;

  if (commitCount > 0) {
    const dates = commits.map((c) => new Date(c.date)).sort((a, b) => a.getTime() - b.getTime());
    firstCommitAt = dates[0] ?? null;
    lastCommitAt = dates[dates.length - 1] ?? null;

    if (firstCommitAt && lastCommitAt) {
      commitSpanMonths = computeMonthSpan(firstCommitAt, lastCommitAt);
    }
  }

  // Ownership detection: is repo owner the dominant committer (>50%)?
  const isOwnerRepo = detectOwnership(commits, repoOwner);

  // Test coverage detection
  const { hasTestDirectory, testFileCount } = detectTestCoverage(cloneDir);
  const estimatedTestCoverage = classifyTestCoverage(testFileCount);

  return {
    commitCount,
    firstCommitAt,
    lastCommitAt,
    commitSpanMonths,
    isOwnerRepo,
    hasTestDirectory,
    testFileCount,
    estimatedTestCoverage,
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Computes the span in months between two dates.
 */
function computeMonthSpan(start: Date, end: Date): number {
  const yearDiff = end.getFullYear() - start.getFullYear();
  const monthDiff = end.getMonth() - start.getMonth();
  return Math.max(0, yearDiff * 12 + monthDiff);
}

/**
 * Detects if the repo owner is the dominant committer (>50% of commits).
 * Matches owner username against commit author email prefix.
 */
function detectOwnership(
  commits: ReadonlyArray<{ hash: string; email: string; date: string }>,
  repoOwner: string
): boolean {
  if (commits.length === 0) return false;

  const ownerLower = repoOwner.toLowerCase();

  // Count commits where author email starts with owner username
  // e.g., owner "johndoe" matches "johndoe@gmail.com", "johndoe@users.noreply.github.com"
  let ownerCommits = 0;
  for (const commit of commits) {
    const emailPrefix = commit.email.toLowerCase().split('@')[0] ?? '';
    if (emailPrefix === ownerLower || emailPrefix.includes(ownerLower)) {
      ownerCommits++;
    }
  }

  return ownerCommits > commits.length * 0.5;
}

/**
 * Detects test directories and counts test files.
 */
function detectTestCoverage(cloneDir: string): {
  hasTestDirectory: boolean;
  testFileCount: number;
} {
  const TEST_DIRS = ['tests', '__tests__', 'spec', 'test'];
  let hasTestDirectory = false;
  let testFileCount = 0;

  for (const testDir of TEST_DIRS) {
    const fullPath = join(cloneDir, testDir);
    if (existsSync(fullPath)) {
      hasTestDirectory = true;
      testFileCount += countTestFiles(fullPath, 0, 4);
    }
  }

  // Also check for test files in src/ directory (co-located tests)
  const srcDir = join(cloneDir, 'src');
  if (existsSync(srcDir)) {
    testFileCount += countColocatedTestFiles(srcDir, 0, 5);
  }

  return { hasTestDirectory, testFileCount };
}

/**
 * Recursively counts test files in a test directory.
 */
function countTestFiles(dir: string, depth: number, maxDepth: number): number {
  if (depth > maxDepth) return 0;

  let count = 0;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return 0;
  }

  for (const entry of entries) {
    if (entry === 'node_modules' || entry === '.git') continue;

    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        count += countTestFiles(fullPath, depth + 1, maxDepth);
      } else if (stat.isFile() && isTestFile(entry)) {
        count++;
      }
    } catch {
      // Skip inaccessible
    }
  }

  return count;
}

/**
 * Counts co-located test files within src/ (e.g., *.test.ts, *.spec.ts).
 */
function countColocatedTestFiles(dir: string, depth: number, maxDepth: number): number {
  if (depth > maxDepth) return 0;

  const SKIP_DIRS = new Set(['node_modules', '.git', 'dist', 'build', '__pycache__']);

  let count = 0;
  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return 0;
  }

  for (const entry of entries) {
    if (SKIP_DIRS.has(entry)) continue;

    const fullPath = join(dir, entry);
    try {
      const stat = statSync(fullPath);
      if (stat.isDirectory()) {
        count += countColocatedTestFiles(fullPath, depth + 1, maxDepth);
      } else if (stat.isFile() && isTestFile(entry)) {
        count++;
      }
    } catch {
      // Skip inaccessible
    }
  }

  return count;
}

/**
 * Returns true if the filename looks like a test file.
 */
function isTestFile(filename: string): boolean {
  const lower = filename.toLowerCase();
  return (
    lower.endsWith('.test.ts') ||
    lower.endsWith('.test.tsx') ||
    lower.endsWith('.test.js') ||
    lower.endsWith('.test.jsx') ||
    lower.endsWith('.spec.ts') ||
    lower.endsWith('.spec.tsx') ||
    lower.endsWith('.spec.js') ||
    lower.endsWith('.spec.jsx') ||
    lower.endsWith('_test.py') ||
    lower.startsWith('test_') ||
    lower.endsWith('_test.go') ||
    lower.endsWith('_test.rs')
  );
}

/**
 * Classifies test coverage level based on test file count.
 * none (0), low (<10), medium (10-50), high (50+)
 */
function classifyTestCoverage(
  testFileCount: number
): 'none' | 'low' | 'medium' | 'high' {
  if (testFileCount === 0) return 'none';
  if (testFileCount < 10) return 'low';
  if (testFileCount <= 50) return 'medium';
  return 'high';
}
