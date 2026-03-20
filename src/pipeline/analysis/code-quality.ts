/**
 * src/pipeline/analysis/code-quality.ts — Code quality orchestrator.
 *
 * Discovers TS/JS source files, applies stratified sampling (max 30),
 * runs ts-metrics on each, and aggregates into a composite score + grade.
 * Returns null if fewer than 3 functions found (insufficient data).
 * Runs in Layer 1 on shallow clone. Zero API cost.
 */

import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, extname } from 'path';
import type { CodeQualityMetrics } from '../../types/repository.js';
import { analyzeFileMetrics, type FileMetrics, type FunctionMetric } from './ts-metrics.js';

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_FILES = 30;
const MAX_FILE_SIZE = 100_000;
const MAX_DEPTH = 4;
const MIN_FUNCTIONS = 3;
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'vendor', 'dist', 'build',
  '__pycache__', '.venv', 'venv', 'target', '.next',
  'coverage', '.cache', '.parcel-cache',
]);
const SOURCE_EXTENSIONS = new Set(['.ts', '.tsx', '.js', '.jsx']);

// Grade thresholds: score → grade
const GRADE_THRESHOLDS: [number, CodeQualityMetrics['codeQualityGrade']][] = [
  [80, 'A'],
  [60, 'B'],
  [40, 'C'],
  [20, 'D'],
  [0, 'F'],
];

// ─── Main Entry ─────────────────────────────────────────────────────────────

/**
 * Analyzes code quality of TS/JS files in a repository.
 * Returns null if unsupported language or insufficient functions.
 */
export function analyzeCodeQuality(
  cloneDir: string,
  primaryLanguage: string | null,
): CodeQualityMetrics | null {
  // Only analyze TS/JS repositories
  if (!isSupportedLanguage(primaryLanguage)) return null;

  const files = discoverFiles(cloneDir);
  if (files.length === 0) return null;

  // Read and analyze files
  const allMetrics: FileMetrics[] = [];
  for (const file of files) {
    const content = readFileSafe(file);
    if (!content) continue;
    const metrics = analyzeFileMetrics(file, content);
    if (metrics && metrics.functions.length > 0) allMetrics.push(metrics);
  }

  // Collect all functions
  const allFunctions = allMetrics.flatMap((m) => m.functions);
  if (allFunctions.length < MIN_FUNCTIONS) return null;

  return aggregateMetrics(allMetrics, allFunctions);
}

// ─── Aggregation ────────────────────────────────────────────────────────────

function aggregateMetrics(
  fileMetrics: FileMetrics[],
  functions: FunctionMetric[],
): CodeQualityMetrics {
  const complexities = functions.map((f) => f.complexity).sort((a, b) => a - b);
  const lengths = functions.map((f) => f.lineCount).sort((a, b) => a - b);
  const nestings = functions.map((f) => f.maxNesting);

  const medianComplexity = median(complexities);
  const p90Complexity = percentile90(complexities);
  const medianFunctionLength = median(lengths);
  const p90FunctionLength = percentile90(lengths);
  const maxNestingDepth = Math.max(...nestings);

  // Naming consistency: % of files with consistent naming
  const consistentFiles = fileMetrics.filter((m) => m.namingStyle !== 'mixed').length;
  const namingConsistency = Math.round((consistentFiles / fileMetrics.length) * 100);

  // Error handling ratio: % of non-trivial functions with try-catch
  const nonTrivial = functions.filter((f) => f.lineCount >= 5);
  const withErrorHandling = nonTrivial.filter((f) => f.hasErrorHandling).length;
  const errorHandlingRatio = nonTrivial.length > 0
    ? Math.round((withErrorHandling / nonTrivial.length) * 100)
    : 0;

  const codeQualityScore = computeCompositeScore(
    medianComplexity, p90Complexity, medianFunctionLength,
    p90FunctionLength, maxNestingDepth, namingConsistency,
  );
  const codeQualityGrade = scoreToGrade(codeQualityScore);

  return {
    filesAnalyzed: fileMetrics.length,
    functionCount: functions.length,
    medianComplexity,
    p90Complexity,
    medianFunctionLength,
    p90FunctionLength,
    maxNestingDepth,
    namingConsistency,
    errorHandlingRatio,
    codeQualityGrade,
    codeQualityScore,
  };
}

// ─── Composite Score ────────────────────────────────────────────────────────

/**
 * Composite score 0-100 based on weighted sub-scores.
 * Lower complexity/length/nesting = higher score.
 */
function computeCompositeScore(
  medianComplexity: number,
  p90Complexity: number,
  medianLength: number,
  p90Length: number,
  maxNesting: number,
  namingConsistency: number,
): number {
  // Each dimension scored 0-100, inverted so lower complexity = higher score
  const complexityScore = scoreInverse(medianComplexity, 1, 15);
  const p90ComplexityScore = scoreInverse(p90Complexity, 3, 30);
  const lengthScore = scoreInverse(medianLength, 5, 50);
  const p90LengthScore = scoreInverse(p90Length, 10, 100);
  const nestingScore = scoreInverse(maxNesting, 1, 6);

  // Weighted combination (total = 100%)
  const composite =
    complexityScore * 0.25 +
    p90ComplexityScore * 0.15 +
    lengthScore * 0.20 +
    p90LengthScore * 0.10 +
    nestingScore * 0.15 +
    namingConsistency * 0.15;

  return Math.round(Math.max(0, Math.min(100, composite)));
}

/**
 * Inverse linear score: maps [idealMin..badMax] → [100..0].
 * Values <= idealMin score 100, values >= badMax score 0.
 */
function scoreInverse(value: number, idealMin: number, badMax: number): number {
  if (value <= idealMin) return 100;
  if (value >= badMax) return 0;
  return Math.round(((badMax - value) / (badMax - idealMin)) * 100);
}

function scoreToGrade(score: number): CodeQualityMetrics['codeQualityGrade'] {
  for (const [threshold, grade] of GRADE_THRESHOLDS) {
    if (score >= threshold) return grade;
  }
  return 'F';
}

// ─── Statistics ─────────────────────────────────────────────────────────────

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return ((sorted[mid - 1] ?? 0) + (sorted[mid] ?? 0)) / 2;
  }
  return sorted[mid] ?? 0;
}

function percentile90(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const idx = Math.ceil(sorted.length * 0.9) - 1;
  return sorted[Math.min(idx, sorted.length - 1)] ?? 0;
}

// ─── File Discovery ─────────────────────────────────────────────────────────

function isSupportedLanguage(lang: string | null): boolean {
  if (!lang) return false;
  const lower = lang.toLowerCase();
  return lower.includes('typescript') || lower.includes('javascript') ||
    lower === 'language:typescript' || lower === 'language:javascript';
}

function discoverFiles(dir: string): string[] {
  const files: string[] = [];
  walkDir(dir, 0, files);
  return files.slice(0, MAX_FILES);
}

function walkDir(dir: string, depth: number, out: string[]): void {
  if (depth > MAX_DEPTH || out.length >= MAX_FILES) return;
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return; }

  for (const entry of entries) {
    if (out.length >= MAX_FILES) return;
    if (SKIP_DIRS.has(entry)) continue;
    // Skip test files — we want to measure production code quality
    if (entry.match(/\.(test|spec|e2e)\.[jt]sx?$/)) continue;
    const fullPath = join(dir, entry);
    try {
      const ls = lstatSync(fullPath);
      if (ls.isSymbolicLink()) continue;
      if (ls.isDirectory()) walkDir(fullPath, depth + 1, out);
      else if (ls.isFile() && SOURCE_EXTENSIONS.has(extname(entry))) {
        if (ls.size <= MAX_FILE_SIZE) out.push(fullPath);
      }
    } catch { /* skip */ }
  }
}

function readFileSafe(filePath: string): string | null {
  try {
    return readFileSync(filePath, 'utf-8');
  } catch {
    return null;
  }
}
