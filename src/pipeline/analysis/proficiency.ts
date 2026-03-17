/**
 * src/pipeline/analysis/proficiency.ts — Proficiency analysis engine.
 *
 * Runs after Layer 1 on the same shallow clone. Matches regex patterns against
 * source files to assess how deeply a developer uses each detected technology.
 * Zero API cost, zero extra clone — pure filesystem + regex.
 */

import { readFileSync, existsSync, readdirSync, statSync, lstatSync } from 'fs';
import { join, extname } from 'path';
import type { Layer1Result } from './layer1.js';
import type { ProficiencySignal, TechProficiency } from '../../types/repository.js';
import {
  getRelevantPatternSets,
  type PatternDef,
  type TechPatternSet,
} from './proficiency-patterns.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_FILES_PER_SCAN = 30;
const MAX_FILE_SIZE_BYTES = 100_000; // 100 KB
const MAX_DEPTH = 3;
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'vendor', 'dist', 'build',
  '__pycache__', '.venv', 'venv', 'target', '.next',
  'coverage', '.cache', '.parcel-cache',
]);

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ProficiencyAnalysisResult {
  proficiencySignals: ProficiencySignal[];
  techProficiency: Record<string, TechProficiency>;
  proficiencyBonus: number;
  overallProficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert';
}

// ─── Main Entry Point ───────────────────────────────────────────────────────

export function analyzeProficiency(
  cloneDir: string,
  layer1Result: Layer1Result,
): ProficiencyAnalysisResult {
  const patternSets = getRelevantPatternSets(
    layer1Result.primaryLanguage,
    layer1Result.detectedFrameworks,
    layer1Result.detectedTools,
  );

  const allSignals: ProficiencySignal[] = [];
  const techProficiency: Record<string, TechProficiency> = {};

  for (const ps of patternSets) {
    const { score, signals } = evaluateTechPatterns(cloneDir, ps);
    allSignals.push(...signals);

    if (signals.length > 0 || score > 0) {
      techProficiency[ps.technologyId] = buildTechProficiency(score, signals);
    }
  }

  const proficiencyBonus = computeProficiencyBonus(techProficiency);
  const overallProficiency = classifyOverallProficiency(techProficiency);

  return { proficiencySignals: allSignals, techProficiency, proficiencyBonus, overallProficiency };
}

// ─── Pattern Evaluation ─────────────────────────────────────────────────────

interface EvalResult {
  score: number;
  signals: ProficiencySignal[];
}

function evaluateTechPatterns(cloneDir: string, ps: TechPatternSet): EvalResult {
  const signals: ProficiencySignal[] = [];
  let positiveWeightSum = 0;
  let antiPatternWeightSum = 0;

  for (const pattern of ps.patterns) {
    const result = matchPattern(cloneDir, pattern);
    if (!result.matched) continue;

    signals.push({
      technology: ps.technologyId,
      patternId: pattern.id,
      level: pattern.level,
      occurrences: result.occurrences,
    });

    if (pattern.isAntiPattern) {
      antiPatternWeightSum += pattern.weight;
    } else {
      positiveWeightSum += pattern.weight;
    }
  }

  if (ps.totalPossibleWeight === 0) return { score: 0, signals };

  const rawScore = ((positiveWeightSum - antiPatternWeightSum) / ps.totalPossibleWeight) * 100;
  const score = Math.max(0, Math.min(100, Math.round(rawScore)));

  return { score, signals };
}

// ─── Pattern Matching ───────────────────────────────────────────────────────

interface MatchResult {
  matched: boolean;
  occurrences: number;
}

function matchPattern(cloneDir: string, pattern: PatternDef): MatchResult {
  try {
    // File existence check (e.g. Dockerfile, tsconfig.json)
    if (pattern.fileExists && !pattern.contentPattern) {
      const exists = existsSync(join(cloneDir, pattern.fileExists));
      return { matched: exists, occurrences: exists ? 1 : 0 };
    }

    // File existence + content pattern (e.g. Dockerfile with multi-stage)
    if (pattern.fileExists && pattern.contentPattern) {
      return matchFileContent(cloneDir, pattern.fileExists, pattern.contentPattern);
    }

    // Content pattern across files with specific extensions
    if (pattern.contentPattern && pattern.fileExtensions) {
      return matchContentInFiles(cloneDir, pattern.contentPattern, pattern.fileExtensions);
    }

    // Content pattern across all source files
    if (pattern.contentPattern) {
      return matchContentInFiles(cloneDir, pattern.contentPattern, null);
    }

    // File extension existence check (e.g. test files)
    if (pattern.fileExtensions && !pattern.contentPattern) {
      const count = countFilesWithExtensions(cloneDir, pattern.fileExtensions);
      return { matched: count > 0, occurrences: count };
    }

    return { matched: false, occurrences: 0 };
  } catch {
    return { matched: false, occurrences: 0 };
  }
}

function matchFileContent(cloneDir: string, relPath: string, regex: string): MatchResult {
  const filePath = join(cloneDir, relPath);
  if (!existsSync(filePath)) return { matched: false, occurrences: 0 };

  try {
    const content = readFileSync(filePath, 'utf-8');
    const re = new RegExp(regex, 'gm');
    const matches = content.match(re);
    return { matched: matches !== null, occurrences: matches?.length ?? 0 };
  } catch {
    return { matched: false, occurrences: 0 };
  }
}

function matchContentInFiles(
  cloneDir: string,
  regex: string,
  extensions: string[] | null,
): MatchResult {
  const files = collectSourceFiles(cloneDir, extensions);
  let totalOccurrences = 0;

  const re = new RegExp(regex, 'gm');

  for (const file of files) {
    try {
      const stat = statSync(file);
      if (stat.size > MAX_FILE_SIZE_BYTES) continue;

      const content = readFileSync(file, 'utf-8');
      const matches = content.match(re);
      if (matches) totalOccurrences += matches.length;
    } catch {
      // Skip unreadable files
    }
  }

  return { matched: totalOccurrences > 0, occurrences: totalOccurrences };
}

// ─── File Collection ────────────────────────────────────────────────────────

function collectSourceFiles(
  cloneDir: string,
  extensions: string[] | null,
): string[] {
  const files: string[] = [];
  walkDir(cloneDir, 0, extensions, files);
  return files.slice(0, MAX_FILES_PER_SCAN);
}

function walkDir(
  dir: string,
  depth: number,
  extensions: string[] | null,
  out: string[],
): void {
  if (depth > MAX_DEPTH || out.length >= MAX_FILES_PER_SCAN) return;

  let entries: string[];
  try {
    entries = readdirSync(dir);
  } catch {
    return;
  }

  for (const entry of entries) {
    if (out.length >= MAX_FILES_PER_SCAN) return;
    if (SKIP_DIRS.has(entry)) continue;

    const fullPath = join(dir, entry);
    try {
      const ls = lstatSync(fullPath);
      if (ls.isSymbolicLink()) continue; // skip symlinks to prevent cycles
      if (ls.isDirectory()) {
        walkDir(fullPath, depth + 1, extensions, out);
      } else if (ls.isFile()) {
        if (extensions === null || matchesExtension(entry, extensions)) {
          out.push(fullPath);
        }
      }
    } catch {
      // Skip inaccessible entries
    }
  }
}

function matchesExtension(fileName: string, extensions: string[]): boolean {
  return extensions.some((ext) => fileName.endsWith(ext));
}

function countFilesWithExtensions(cloneDir: string, extensions: string[]): number {
  const files = collectSourceFiles(cloneDir, extensions);
  return files.length;
}

// ─── Scoring ────────────────────────────────────────────────────────────────

function buildTechProficiency(
  score: number,
  signals: ProficiencySignal[],
): TechProficiency {
  const topPatterns = signals
    .sort((a, b) => b.occurrences - a.occurrences)
    .slice(0, 5)
    .map((s) => s.patternId);

  return {
    level: classifyLevel(score),
    score,
    patternCount: signals.length,
    topPatterns,
  };
}

function classifyLevel(score: number): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  if (score >= 81) return 'expert';
  if (score >= 56) return 'advanced';
  if (score >= 26) return 'intermediate';
  return 'beginner';
}

/**
 * Computes the proficiency bonus from the top 3 technology scores.
 * Range: 0-14 points.
 */
export function computeProficiencyBonus(
  techProficiency: Record<string, TechProficiency>,
): number {
  const scores = Object.values(techProficiency).map((tp) => tp.score);
  if (scores.length === 0) return 0;

  scores.sort((a, b) => b - a);
  const top3 = scores.slice(0, 3);
  const avg = top3.reduce((sum, s) => sum + s, 0) / top3.length;

  return Math.min(14, Math.round((avg / 100) * 14));
}

/**
 * Classifies the overall proficiency level across all technologies.
 */
export function classifyOverallProficiency(
  techProficiency: Record<string, TechProficiency>,
): 'beginner' | 'intermediate' | 'advanced' | 'expert' {
  const scores = Object.values(techProficiency).map((tp) => tp.score);
  if (scores.length === 0) return 'beginner';

  const avg = scores.reduce((sum, s) => sum + s, 0) / scores.length;
  return classifyLevel(Math.round(avg));
}
