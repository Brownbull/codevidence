/**
 * src/pipeline/analysis/ai-signals.ts — AI signal detection.
 *
 * Detects AI config files, analyses their evolution via git log,
 * and detects co-authored-by AI commit trailers.
 *
 * Known AI config files:
 * - CLAUDE.md, .claude/
 * - .cursor/rules, .cursor/settings.json
 * - ai-context.md
 * - .github/copilot-instructions.md
 * - .aider*, .aiderignore, .aider.conf.yml
 */

import { existsSync, readdirSync } from 'fs';
import { join } from 'path';
import simpleGit from 'simple-git';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AiSignalResult {
  aiConfigFiles: AiConfigFileSignalRaw[];
  coAuthoredByAI: boolean;
  aiAttributionPatterns: string[];
}

/** Raw AI config file signal — dates as JS Dates (converted to Timestamps at write time). */
export interface AiConfigFileSignalRaw {
  fileName: string;
  firstDetectedAt: Date;
  modificationCount: number;
  lastModifiedAt: Date;
  diffComplexity: 'minimal' | 'moderate' | 'extensive';
  isEvolved: boolean;
  originSignal: 'likely-original' | 'modified-from-template' | 'likely-copied' | 'unknown';
}

// ─── Known AI config file patterns ────────────────────────────────────────────

const AI_CONFIG_FILES = [
  'CLAUDE.md',
  '.cursor/rules',
  '.cursor/settings.json',
  'ai-context.md',
  '.github/copilot-instructions.md',
];

/** Directory patterns — presence of directory itself is a signal. */
const AI_CONFIG_DIRS = [
  '.claude',
  '.cursor',
];

/** Glob-like prefix patterns for aider files. */
const AI_CONFIG_PREFIXES = [
  '.aider',
];

/** Known AI tool names in co-authored-by trailers. */
const AI_TOOL_NAMES = [
  'github copilot',
  'copilot',
  'cursor',
  'claude',
  'anthropic',
  'aider',
  'codeium',
  'tabnine',
  'cody',
  'sourcegraph',
  'amazon q',
  'devin',
];

// ─── Analysis ─────────────────────────────────────────────────────────────────

/**
 * Analyses a cloned repo for AI tooling signals.
 *
 * @param cloneDir  Path to the cloned repository directory (must be a git repo)
 */
export async function analyzeAiSignals(cloneDir: string): Promise<AiSignalResult> {
  const git = simpleGit(cloneDir);

  // 1. Detect AI config files in the file tree
  const detectedFiles = detectAiConfigFiles(cloneDir);

  // 2. Analyse each detected file's git history
  const aiConfigFiles: AiConfigFileSignalRaw[] = [];
  for (const fileName of detectedFiles) {
    const signal = await analyzeFileHistory(git, fileName);
    if (signal) {
      aiConfigFiles.push(signal);
    }
  }

  // 3. Detect co-authored-by AI trailers in commit messages
  const { coAuthoredByAI, aiAttributionPatterns } = await detectAiAttribution(git);

  return { aiConfigFiles, coAuthoredByAI, aiAttributionPatterns };
}

// ─── File detection ───────────────────────────────────────────────────────────

/**
 * Detects known AI config files in the clone directory.
 * Returns relative file paths.
 */
function detectAiConfigFiles(cloneDir: string): string[] {
  const found: string[] = [];

  // Check specific files
  for (const file of AI_CONFIG_FILES) {
    if (existsSync(join(cloneDir, file))) {
      found.push(file);
    }
  }

  // Check directories
  for (const dir of AI_CONFIG_DIRS) {
    const dirPath = join(cloneDir, dir);
    if (existsSync(dirPath)) {
      // Add the directory itself as a signal if not already found via a specific file
      const hasSpecificFile = found.some((f) => f.startsWith(dir + '/'));
      if (!hasSpecificFile) {
        found.push(dir);
      }
    }
  }

  // Check prefix patterns (e.g., .aider*)
  try {
    const entries = readdirSync(cloneDir);
    for (const entry of entries) {
      for (const prefix of AI_CONFIG_PREFIXES) {
        if (entry.toLowerCase().startsWith(prefix) && !found.includes(entry)) {
          found.push(entry);
        }
      }
    }
  } catch {
    // Skip if can't read directory
  }

  return found;
}

// ─── File history analysis ────────────────────────────────────────────────────

/**
 * Analyses a single file's git history to build an AiConfigFileSignalRaw.
 */
async function analyzeFileHistory(
  git: ReturnType<typeof simpleGit>,
  fileName: string
): Promise<AiConfigFileSignalRaw | null> {
  try {
    // Get commit history for this file
    const log = await git.log({ file: fileName, maxCount: 100 });
    const commits = log.all;

    if (commits.length === 0) {
      return null;
    }

    const modificationCount = commits.length;
    const dates = commits.map((c) => new Date(c.date)).sort((a, b) => a.getTime() - b.getTime());
    const firstDetectedAt = dates[0] ?? new Date();
    const lastModifiedAt = dates[dates.length - 1] ?? new Date();

    // Compute diff complexity (total lines changed across all modifications)
    const totalLinesChanged = await computeTotalLinesChanged(git, fileName);
    const diffComplexity = classifyDiffComplexity(totalLinesChanged);

    // Determine if evolved (more than 3 modifications)
    const isEvolved = modificationCount > 3;

    // Determine origin signal (uses modificationCount for template vs copy distinction)
    const originSignal = await determineOriginSignal(git, fileName, commits, modificationCount);

    return {
      fileName,
      firstDetectedAt,
      modificationCount,
      lastModifiedAt,
      diffComplexity,
      isEvolved,
      originSignal,
    };
  } catch {
    // File may not be tracked by git (e.g., in .gitignore)
    return null;
  }
}

/**
 * Computes total lines changed across all modifications to a file.
 */
async function computeTotalLinesChanged(
  git: ReturnType<typeof simpleGit>,
  fileName: string
): Promise<number> {
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

/**
 * Classifies diff complexity based on total lines changed.
 */
function classifyDiffComplexity(totalLines: number): 'minimal' | 'moderate' | 'extensive' {
  if (totalLines < 10) return 'minimal';
  if (totalLines < 100) return 'moderate';
  return 'extensive';
}

/**
 * Determines the origin signal for an AI config file.
 *
 * Combines first-commit size with modification count for better accuracy:
 * - likely-original:         ≤50 lines in first commit (built from scratch)
 * - modified-from-template:  >50 lines in first commit AND >3 modifications (started from template, heavily customized)
 * - likely-copied:           >50 lines in first commit AND ≤3 modifications (copied, barely touched)
 * - unknown:                 insufficient data
 */
async function determineOriginSignal(
  git: ReturnType<typeof simpleGit>,
  fileName: string,
  commits: ReadonlyArray<{ hash: string }>,
  modificationCount: number
): Promise<'likely-original' | 'modified-from-template' | 'likely-copied' | 'unknown'> {
  if (commits.length === 0) return 'unknown';

  // Get the first (oldest) commit that introduced the file
  const firstCommit = commits[commits.length - 1];
  if (!firstCommit) return 'unknown';

  try {
    // Check the size of the file in the first commit
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

    // Small first commit → built from scratch
    if (linesAdded <= 50) return 'likely-original';

    // Large first commit (>50 lines) — distinguish template-based vs plain copy
    if (modificationCount > 3) return 'modified-from-template';
    return 'likely-copied';
  } catch {
    return 'unknown';
  }
}

// ─── AI attribution detection ─────────────────────────────────────────────────

/**
 * Scans commit messages for co-authored-by AI trailers and attribution patterns.
 */
async function detectAiAttribution(
  git: ReturnType<typeof simpleGit>
): Promise<{ coAuthoredByAI: boolean; aiAttributionPatterns: string[] }> {
  let coAuthoredByAI = false;
  const patterns = new Set<string>();

  try {
    // Read up to 200 commit messages
    const log = await git.log({ maxCount: 200 });

    for (const commit of log.all) {
      const body = commit.body?.toLowerCase() ?? '';
      const message = commit.message?.toLowerCase() ?? '';
      const fullText = `${message}\n${body}`;

      // Check for Co-authored-by: trailers
      if (fullText.includes('co-authored-by:')) {
        for (const toolName of AI_TOOL_NAMES) {
          if (fullText.includes(toolName)) {
            coAuthoredByAI = true;
            patterns.add(`co-authored-by:${toolName}`);
          }
        }
      }

      // Check for other AI attribution patterns
      if (fullText.includes('generated by') || fullText.includes('created by')) {
        for (const toolName of AI_TOOL_NAMES) {
          if (fullText.includes(toolName)) {
            patterns.add(`attribution:${toolName}`);
          }
        }
      }
    }
  } catch {
    // If git log fails, return defaults
  }

  return {
    coAuthoredByAI,
    aiAttributionPatterns: [...patterns].sort(),
  };
}
