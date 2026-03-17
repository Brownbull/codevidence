/**
 * src/pipeline/analysis/design-patterns.ts — Design pattern & architecture detection.
 *
 * Two-tier heuristic analysis:
 *   Tier 1: File/directory naming conventions (fast, multi-language)
 *   Tier 2: File content sampling for structural signals
 *
 * Produces designPatternPoints bonus (0-10) in skill score.
 * Runs in Layer 2 alongside existing analyses — no new scan pass.
 */

import { readdirSync, readFileSync, lstatSync } from 'fs';
import { join, basename, extname } from 'path';
import type { DesignPatternSignal, ArchitectureStyle } from '../../types/repository.js';
import {
  MAX_DEPTH, MAX_SAMPLE_FILES, MAX_LINES_PER_FILE,
  GOD_CLASS_LINE_THRESHOLD, SKIP_DIRS, SOURCE_EXTENSIONS,
  TECH_LAYER_DIRS, FILE_PATTERN_SIGNALS, DIR_PATTERN_SIGNALS,
  CONTENT_SIGNALS, ARCH_RULES, TIER_POINTS,
} from './design-pattern-rules.js';

// Re-export rules for tests
export {
  FILE_PATTERN_SIGNALS, DIR_PATTERN_SIGNALS, CONTENT_SIGNALS,
  TIER_POINTS,
} from './design-pattern-rules.js';

export interface DesignPatternResult {
  designPatternSignals: DesignPatternSignal[];
  architectureStyle: ArchitectureStyle | null;
  antiPatternCount: number;
  designSophisticationTier: 'none' | 'basic' | 'intermediate' | 'advanced';
}

// ─── Public API ──────────────────────────────────────────────

export function analyzeDesignPatterns(
  cloneDir: string,
  _primaryLanguage: string | null,
): DesignPatternResult {
  const signalMap = detectFileStructurePatterns(cloneDir);
  const sourceFiles = collectSourceFiles(cloneDir, MAX_SAMPLE_FILES);
  detectContentPatterns(sourceFiles, signalMap);
  const architectureStyle = detectArchitectureStyle(cloneDir);
  const antiPatternCount = countAntiPatterns(sourceFiles);

  const signals: DesignPatternSignal[] = [];
  for (const [patternId, evidence] of signalMap) {
    signals.push({
      patternId,
      confidence: evidence.length >= 3 ? 'high' : evidence.length >= 2 ? 'medium' : 'low',
      evidence: evidence.slice(0, 5),
    });
  }

  const tier = classifySophisticationTier(
    signals.length,
    architectureStyle !== null && architectureStyle !== 'flat',
    antiPatternCount,
  );

  return { designPatternSignals: signals, architectureStyle, antiPatternCount, designSophisticationTier: tier };
}

export function classifySophisticationTier(
  patternCount: number,
  hasArchitectureStyle: boolean,
  antiPatternCount: number,
): 'none' | 'basic' | 'intermediate' | 'advanced' {
  if (patternCount === 0 && !hasArchitectureStyle) return 'none';
  if (patternCount >= 6 && hasArchitectureStyle && antiPatternCount === 0) return 'advanced';
  if (patternCount >= 3 && hasArchitectureStyle) return 'intermediate';
  return 'basic';
}

export function tierToPoints(
  tier: 'none' | 'basic' | 'intermediate' | 'advanced',
): number {
  return TIER_POINTS[tier] ?? 0;
}

// ─── Internal: Tier 1 — File Structure ───────────────────────

function detectFileStructurePatterns(cloneDir: string): Map<string, string[]> {
  const signalMap = new Map<string, string[]>();
  walkDirectories(cloneDir, 0, MAX_DEPTH, (entryPath, entryName, isDir) => {
    if (isDir) {
      const lower = entryName.toLowerCase();
      for (const ds of DIR_PATTERN_SIGNALS) {
        if (lower === ds.dir) addSignal(signalMap, ds.patternId, entryName);
      }
    } else if (isSourceFile(entryName)) {
      const stem = basename(entryName, extname(entryName));
      for (const fs of FILE_PATTERN_SIGNALS) {
        if (fs.regex.test(stem)) addSignal(signalMap, fs.patternId, entryPath);
      }
    }
  });
  return signalMap;
}

// ─── Internal: Tier 2 — Content Sampling ─────────────────────

function detectContentPatterns(
  sourceFiles: string[],
  signalMap: Map<string, string[]>,
): void {
  for (const filePath of sourceFiles) {
    const content = readFirstLines(filePath, MAX_LINES_PER_FILE);
    if (!content) continue;
    for (const cs of CONTENT_SIGNALS) {
      if (cs.regex.test(content)) {
        if (cs.boost && !signalMap.has(cs.patternId)) continue;
        addSignal(signalMap, cs.patternId, filePath);
      }
    }
  }
}

// ─── Internal: Architecture Style ────────────────────────────

function detectArchitectureStyle(cloneDir: string): ArchitectureStyle | null {
  const topDirs = new Set<string>();
  try {
    for (const entry of readdirSync(cloneDir, { withFileTypes: true })) {
      if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
        topDirs.add(entry.name.toLowerCase());
      }
    }
    // Also check one level deeper (e.g., src/controllers/)
    try {
      for (const entry of readdirSync(join(cloneDir, 'src'), { withFileTypes: true })) {
        if (entry.isDirectory() && !SKIP_DIRS.has(entry.name)) {
          topDirs.add(entry.name.toLowerCase());
        }
      }
    } catch { /* src/ may not exist */ }
  } catch { return null; }

  for (const rule of ARCH_RULES) {
    if (rule.required.every((d) => topDirs.has(d))) return rule.style;
  }

  const featureDirs = [...topDirs].filter(
    (d) => !TECH_LAYER_DIRS.has(d) && !SKIP_DIRS.has(d),
  );
  if (featureDirs.length >= 3) return 'modular';
  return 'flat';
}

// ─── Internal: Anti-Patterns ─────────────────────────────────

function countAntiPatterns(sourceFiles: string[]): number {
  let count = 0;

  // Anti-pattern 1: God class (>500 LOC) — one occurrence is enough to penalize
  for (const file of sourceFiles) {
    try {
      const stat = lstatSync(file);
      if (stat.isSymbolicLink() || !stat.isFile()) continue;
      const lines = readFileSync(file, 'utf-8').split('\n').length;
      if (lines > GOD_CLASS_LINE_THRESHOLD) { count++; break; }
    } catch { /* skip */ }
  }

  // Anti-pattern 2: No abstraction (no interface/abstract class)
  if (sourceFiles.length >= 5) {
    let hasAbstraction = false;
    for (const file of sourceFiles) {
      const content = readFirstLines(file, MAX_LINES_PER_FILE);
      if (content && (/\binterface\b/.test(content) || /abstract\s+class/.test(content))) {
        hasAbstraction = true;
        break;
      }
    }
    if (!hasAbstraction) count++;
  }

  return count;
}

// ─── Internal: Utilities ─────────────────────────────────────

function walkDirectories(
  dir: string, depth: number, maxDepth: number,
  callback: (entryPath: string, entryName: string, isDir: boolean) => void,
): void {
  if (depth > maxDepth) return;
  let entries: import('fs').Dirent[];
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) continue;
      callback(fullPath, entry.name, true);
      walkDirectories(fullPath, depth + 1, maxDepth, callback);
    } else if (entry.isFile()) {
      callback(fullPath, entry.name, false);
    }
  }
}

function collectSourceFiles(cloneDir: string, maxFiles: number): string[] {
  const files: string[] = [];
  walkDirectories(cloneDir, 0, MAX_DEPTH, (entryPath, entryName, isDir) => {
    if (!isDir && isSourceFile(entryName) && files.length < maxFiles) {
      files.push(entryPath);
    }
  });
  return files;
}

function isSourceFile(fileName: string): boolean {
  return SOURCE_EXTENSIONS.has(extname(fileName).toLowerCase());
}

function readFirstLines(filePath: string, maxLines: number): string | null {
  try {
    const stat = lstatSync(filePath);
    if (stat.isSymbolicLink() || !stat.isFile()) return null;
    return readFileSync(filePath, 'utf-8').split('\n').slice(0, maxLines).join('\n');
  } catch { return null; }
}

function addSignal(map: Map<string, string[]>, patternId: string, evidence: string): void {
  const existing = map.get(patternId);
  if (existing) { if (existing.length < 5) existing.push(evidence); }
  else map.set(patternId, [evidence]);
}
