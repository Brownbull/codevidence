/**
 * src/pipeline/analysis/ai-signals-helpers.ts — Git history helpers for AI signal analysis.
 * Extracted from ai-signals.ts to stay under 300-line limit.
 */

import simpleGit from 'simple-git';
import type { AiConfigFileSignalRaw } from './ai-signals.js';

type Git = ReturnType<typeof simpleGit>;

/**
 * Analyses a single file/directory's git history to build an AiConfigFileSignalRaw.
 */
export async function analyzeFileHistory(
  git: Git,
  fileName: string,
  fileType: 'file' | 'directory',
): Promise<AiConfigFileSignalRaw | null> {
  try {
    const log = await git.log({ file: fileName, maxCount: 100 });
    const commits = log.all;
    if (commits.length === 0) return null;

    const modificationCount = commits.length;
    const dates = commits.map((c) => new Date(c.date)).sort((a, b) => a.getTime() - b.getTime());
    const firstDetectedAt = dates[0] ?? new Date();
    const lastModifiedAt = dates[dates.length - 1] ?? new Date();
    const totalLinesChanged = await computeTotalLinesChanged(git, fileName);
    const diffComplexity = classifyDiffComplexity(totalLinesChanged);
    const isEvolved = modificationCount > 3;
    const originSignal = await determineOriginSignal(git, fileName, commits, modificationCount);

    return {
      fileName, fileType, firstDetectedAt, modificationCount,
      lastModifiedAt, diffComplexity, isEvolved, originSignal,
    };
  } catch {
    return null;
  }
}

/** Computes total lines changed across all modifications to a file. */
async function computeTotalLinesChanged(git: Git, fileName: string): Promise<number> {
  try {
    const diffStat = await git.raw([
      'log', '--follow', '--numstat', '--format=', '--', fileName,
    ]);
    let total = 0;
    for (const line of diffStat.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      const added = parseInt(parts[0] ?? '0', 10);
      const deleted = parseInt(parts[1] ?? '0', 10);
      if (!isNaN(added)) total += added;
      if (!isNaN(deleted)) total += deleted;
    }
    return total;
  } catch {
    return 0;
  }
}

function classifyDiffComplexity(totalLines: number): 'minimal' | 'moderate' | 'extensive' {
  if (totalLines < 10) return 'minimal';
  if (totalLines < 100) return 'moderate';
  return 'extensive';
}

/**
 * Determines the origin signal for an AI config file.
 *
 * - likely-original:         ≤50 lines in first commit (built from scratch)
 * - modified-from-template:  >50 lines in first commit AND >3 modifications
 * - likely-copied:           >50 lines in first commit AND ≤3 modifications
 * - unknown:                 insufficient data
 */
async function determineOriginSignal(
  git: Git,
  fileName: string,
  commits: ReadonlyArray<{ hash: string }>,
  modificationCount: number,
): Promise<'likely-original' | 'modified-from-template' | 'likely-copied' | 'unknown'> {
  if (commits.length === 0) return 'unknown';
  const firstCommit = commits[commits.length - 1];
  if (!firstCommit) return 'unknown';

  try {
    const diffStat = await git.raw([
      'diff-tree', '--numstat', '-r', firstCommit.hash, '--', fileName,
    ]);
    let linesAdded = 0;
    for (const line of diffStat.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed) continue;
      const parts = trimmed.split(/\s+/);
      const added = parseInt(parts[0] ?? '0', 10);
      if (!isNaN(added)) linesAdded += added;
    }

    if (linesAdded <= 50) return 'likely-original';
    if (modificationCount > 3) return 'modified-from-template';
    return 'likely-copied';
  } catch {
    return 'unknown';
  }
}
