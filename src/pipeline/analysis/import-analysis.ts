/**
 * src/pipeline/analysis/import-analysis.ts — Import validation + framework depth.
 *
 * Extracts actual import statements from source files to confirm which
 * dependencies declared in package.json/manifests are really used.
 * Also detects framework depth via API pattern matching.
 * Runs in Layer 1 on shallow clone. Zero API cost.
 */

import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join } from 'path';
import type { FrameworkDepthEntry } from '../../types/repository.js';
import {
  FRAMEWORK_DEPTH_PATTERNS,
  FRAMEWORK_FILE_EXTENSIONS,
  DEPTH_LEVELS,
  MIN_PATTERNS_FOR_LEVEL,
} from './framework-patterns.js';

// Validate: depth patterns must NOT have global/sticky flags (breaks .test() statefulness)
for (const levels of Object.values(FRAMEWORK_DEPTH_PATTERNS)) {
  for (const level of levels) {
    for (const re of level) {
      if (re.global || re.sticky) {
        throw new Error(`Framework depth pattern must not be global/sticky: ${re.source}`);
      }
    }
  }
}

// ─── Constants ──────────────────────────────────────────────────────────────

const MAX_FILES = 50;
const MAX_FILE_SIZE = 100_000;
const MAX_DEPTH = 4;
const SKIP_DIRS = new Set([
  'node_modules', '.git', 'vendor', 'dist', 'build',
  '__pycache__', '.venv', 'venv', 'target', '.next',
  'coverage', '.cache', '.parcel-cache',
]);

// ─── Types ──────────────────────────────────────────────────────────────────

export interface ImportAnalysisResult {
  confirmedImports: string[];        // taxonomy IDs confirmed via actual imports
  frameworkDepth: FrameworkDepthEntry[];
}

// ─── Main Entry ─────────────────────────────────────────────────────────────

export function analyzeImports(
  cloneDir: string,
  detectedFrameworks: string[],
  primaryLanguage: string | null,
): ImportAnalysisResult {
  const extensions = getExtensionsForLanguage(primaryLanguage);
  const files = collectFiles(cloneDir, extensions);

  // Read all file contents once
  const fileContents = readFiles(files);

  // Extract confirmed imports
  const confirmedImports = confirmImports(fileContents, primaryLanguage);

  // Detect framework depth for each detected framework
  const frameworkDepth: FrameworkDepthEntry[] = [];
  for (const fwId of detectedFrameworks) {
    if (!FRAMEWORK_DEPTH_PATTERNS[fwId]) continue;
    const fwExtensions = FRAMEWORK_FILE_EXTENSIONS[fwId] ?? extensions;
    const fwFiles = filterByExtension(fileContents, fwExtensions);
    const entry = detectFrameworkDepth(fwId, fwFiles);
    if (entry) frameworkDepth.push(entry);
  }

  return { confirmedImports, frameworkDepth };
}

// ─── Import Extraction ──────────────────────────────────────────────────────

const IMPORT_PATTERNS: Record<string, RegExp[]> = {
  'js': [
    /^import\s[^'"]*?from\s+['"]([@\w][^'"]*)['"]/gm,
    /require\(\s*['"]([@\w][^'"]*)['"]\s*\)/g,
  ],
  'python': [
    /^import\s+([\w.]+)/gm,
    /^from\s+([\w.]+)\s+import/gm,
  ],
};

/** Known npm package → taxonomy ID mapping. */
const IMPORT_TAXONOMY_MAP: Record<string, string> = {
  'react': 'framework:react', 'react-dom': 'framework:react',
  'next': 'framework:nextjs', 'vue': 'framework:vue',
  'express': 'framework:express', '@nestjs/core': 'framework:nestjs',
  '@nestjs/common': 'framework:nestjs',
  'typescript': 'language:typescript',
  'tailwindcss': 'tool:tailwind', 'prisma': 'tool:prisma',
  '@prisma/client': 'tool:prisma',
  'vitest': 'tool:vitest', 'jest': 'tool:jest',
  'webpack': 'tool:webpack', 'vite': 'tool:vite',
  'docker-compose': 'tool:docker',
  'django': 'framework:django', 'flask': 'framework:flask',
  'fastapi': 'framework:fastapi', 'pandas': 'tool:pandas',
  'numpy': 'tool:numpy', 'tensorflow': 'tool:tensorflow',
  'torch': 'tool:pytorch', 'scikit-learn': 'tool:scikit-learn',
};

function confirmImports(
  fileContents: Map<string, string>,
  primaryLanguage: string | null,
): string[] {
  const lang = detectLangFamily(primaryLanguage);
  const patternList = IMPORT_PATTERNS[lang] ?? IMPORT_PATTERNS['js'] ?? [];
  const foundModules = new Set<string>();

  for (const content of fileContents.values()) {
    for (const pattern of patternList) {
      const re = new RegExp(pattern.source, pattern.flags);
      let match: RegExpExecArray | null;
      while ((match = re.exec(content)) !== null) {
        const mod = match[1] ? normalizeModuleName(match[1]) : null;
        if (mod) foundModules.add(mod);
      }
    }
  }

  // Map to taxonomy IDs
  const confirmed = new Set<string>();
  for (const mod of foundModules) {
    const taxId = IMPORT_TAXONOMY_MAP[mod];
    if (taxId) confirmed.add(taxId);
  }

  return [...confirmed].sort();
}

function normalizeModuleName(raw: string): string | null {
  if (!raw || raw.startsWith('.') || raw.startsWith('/')) return null;
  // Scoped packages: @scope/name → @scope/name
  if (raw.startsWith('@')) {
    const parts = raw.split('/');
    return parts.length >= 2 ? `${parts[0]}/${parts[1]}` : null;
  }
  // Regular packages: name/subpath → name
  return raw.split('/')[0] ?? null;
}

function detectLangFamily(primaryLanguage: string | null): string {
  if (!primaryLanguage) return 'js';
  if (primaryLanguage.includes('python')) return 'python';
  return 'js';
}

// ─── Framework Depth Detection ──────────────────────────────────────────────

function detectFrameworkDepth(
  frameworkId: string,
  fileContents: Map<string, string>,
): FrameworkDepthEntry | null {
  const levels = FRAMEWORK_DEPTH_PATTERNS[frameworkId];
  if (!levels) return null;

  let bestLevel = -1;
  const allMatchedAPIs: string[] = [];
  let totalEvidence = 0;

  for (let levelIdx = 0; levelIdx < levels.length; levelIdx++) {
    const levelPatterns = levels[levelIdx];
    if (!levelPatterns) continue;
    let matchCount = 0;

    for (const pattern of levelPatterns) {
      for (const content of fileContents.values()) {
        if (pattern.test(content)) {
          matchCount++;
          if (allMatchedAPIs.length < 10) {
            allMatchedAPIs.push(pattern.source.slice(0, 30));
          }
          break; // found in at least one file, move to next pattern
        }
      }
    }

    if (matchCount >= MIN_PATTERNS_FOR_LEVEL) {
      bestLevel = levelIdx;
      totalEvidence += matchCount;
    } else {
      break; // Ladder model: cannot advance past a level that doesn't qualify
    }
  }

  if (bestLevel < 0) return null;

  const depth = DEPTH_LEVELS[bestLevel] ?? 'beginner';
  const confidence = Math.min(1, totalEvidence / 8);

  return {
    frameworkId,
    depth: depth as FrameworkDepthEntry['depth'],
    confidence: Math.round(confidence * 100) / 100,
    evidenceCount: totalEvidence,
    specificAPIs: allMatchedAPIs.slice(0, 10),
  };
}

// ─── File Collection ────────────────────────────────────────────────────────

function getExtensionsForLanguage(lang: string | null): string[] {
  if (!lang) return ['.ts', '.tsx', '.js', '.jsx', '.py'];
  if (lang.includes('python')) return ['.py'];
  return ['.ts', '.tsx', '.js', '.jsx'];
}

function collectFiles(dir: string, extensions: string[]): string[] {
  const files: string[] = [];
  walkDir(dir, 0, extensions, files);
  return files.slice(0, MAX_FILES);
}

function walkDir(dir: string, depth: number, exts: string[], out: string[]): void {
  if (depth > MAX_DEPTH || out.length >= MAX_FILES) return;
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return; }

  for (const entry of entries) {
    if (out.length >= MAX_FILES) return;
    if (SKIP_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    try {
      const ls = lstatSync(fullPath);
      if (ls.isSymbolicLink()) continue;
      if (ls.isDirectory()) walkDir(fullPath, depth + 1, exts, out);
      else if (ls.isFile() && exts.some((e) => entry.endsWith(e))) out.push(fullPath);
    } catch { /* skip */ }
  }
}

function readFiles(files: string[]): Map<string, string> {
  const map = new Map<string, string>();
  for (const f of files) {
    try {
      const stat = lstatSync(f);
      if (stat.size > MAX_FILE_SIZE) continue;
      map.set(f, readFileSync(f, 'utf-8'));
    } catch { /* skip */ }
  }
  return map;
}

function filterByExtension(
  contents: Map<string, string>, exts: string[],
): Map<string, string> {
  const result = new Map<string, string>();
  for (const [path, content] of contents) {
    if (exts.some((e) => path.endsWith(e))) result.set(path, content);
  }
  return result;
}
