/**
 * src/pipeline/analysis/diff-stats.ts — File classification and code composition.
 *
 * Classifies all files in a repo into categories (logic, test, config, etc.)
 * and computes code composition ratios. Runs in Layer 2.
 * No API calls — pure filesystem analysis.
 */

import { readFileSync, readdirSync, lstatSync } from 'fs';
import { join, basename, extname } from 'path';

// ─── Types ──────────────────────────────────────────────────────────────────

export type FileCategory =
  | 'logic' | 'config' | 'test' | 'generated' | 'vendor'
  | 'asset' | 'documentation';

export interface DiffStatsResult {
  logicLinesOfCode: number;
  logicCodeRatio: number;       // 0-1
  testToLogicRatio: number;     // 0-1
}

// ─── Constants ──────────────────────────────────────────────────────────────

const VENDOR_DIRS = new Set([
  'node_modules', 'vendor', '.venv', 'venv', 'target',
  'dist', 'build', '.next', '__pycache__', 'coverage',
  '.cache', '.parcel-cache', '.git',
]);

const LOCK_FILES = new Set([
  'package-lock.json', 'yarn.lock', 'pnpm-lock.yaml',
  'Pipfile.lock', 'Cargo.lock', 'go.sum', 'poetry.lock',
  'composer.lock', 'Gemfile.lock',
]);

const CONFIG_EXTENSIONS = new Set([
  '.json', '.yaml', '.yml', '.toml', '.ini', '.cfg',
  '.env', '.env.example', '.editorconfig',
]);

const CONFIG_NAMES = new Set([
  'tsconfig.json', 'tsconfig.app.json', 'tsconfig.node.json',
  'package.json', 'vite.config.ts', 'vitest.config.ts',
  '.eslintrc', '.eslintrc.js', '.eslintrc.json', '.prettierrc',
  'tailwind.config.ts', 'tailwind.config.js',
  'jest.config.ts', 'jest.config.js', 'babel.config.js',
  'webpack.config.js', 'rollup.config.js',
  'Makefile', 'Dockerfile', 'docker-compose.yml',
  'firebase.json', 'firestore.rules', 'firestore.indexes.json',
  '.gitignore', '.dockerignore', '.npmignore',
]);

const TEST_PATTERNS = [
  /\.test\.[jt]sx?$/, /\.spec\.[jt]sx?$/, /\.e2e\.[jt]sx?$/,
  /_test\.py$/, /test_\w+\.py$/,
];

const DOC_EXTENSIONS = new Set(['.md', '.txt', '.rst', '.adoc']);

const ASSET_EXTENSIONS = new Set([
  '.png', '.jpg', '.jpeg', '.gif', '.svg', '.ico', '.webp',
  '.woff', '.woff2', '.ttf', '.eot',
  '.mp3', '.mp4', '.wav', '.ogg',
  '.pdf', '.zip', '.tar', '.gz',
]);

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.go', '.rs',
  '.java', '.kt', '.rb', '.php', '.cs', '.cpp', '.c',
  '.swift', '.scala', '.ex', '.exs', '.hs', '.clj',
]);

const MAX_DEPTH = 5;
const MAX_FILES = 2000;
const GENERATED_MARKERS = ['@generated', 'do not edit', 'auto-generated'];

// ─── Main Entry ─────────────────────────────────────────────────────────────

export function analyzeDiffStats(cloneDir: string): DiffStatsResult {
  const counts: Record<FileCategory, number> = {
    logic: 0, config: 0, test: 0, generated: 0,
    vendor: 0, asset: 0, documentation: 0,
  };

  const files: string[] = [];
  collectAllFiles(cloneDir, 0, files);

  for (const file of files) {
    const category = classifyFile(file);
    if (category === 'vendor' || category === 'asset') {
      // UNIT: file count (not line count) — these are excluded from all ratios below
      counts[category]++;
      continue;
    }
    // UNIT: non-blank line count
    const lines = countNonBlankLines(file);
    counts[category] += lines;
  }

  const meaningful = counts.logic + counts.test + counts.config + counts.documentation;
  const logicRatio = meaningful > 0 ? counts.logic / meaningful : 0;
  const testRatio = counts.logic > 0 ? counts.test / counts.logic : 0;

  return {
    logicLinesOfCode: counts.logic,
    logicCodeRatio: Math.round(logicRatio * 100) / 100,
    testToLogicRatio: Math.round(testRatio * 100) / 100,
  };
}

// ─── File Classification ────────────────────────────────────────────────────

export function classifyFile(filePath: string): FileCategory {
  const name = basename(filePath);
  const ext = extname(filePath).toLowerCase();

  // Lock files → config
  if (LOCK_FILES.has(name)) return 'config';

  // Test files
  if (TEST_PATTERNS.some((p) => p.test(name))) return 'test';
  if (filePath.includes('__tests__/') || filePath.includes('/tests/') ||
      filePath.includes('/test/') || filePath.includes('/spec/')) {
    if (SOURCE_EXTENSIONS.has(ext)) return 'test';
  }

  // Documentation
  if (DOC_EXTENSIONS.has(ext)) return 'documentation';

  // Assets (binary)
  if (ASSET_EXTENSIONS.has(ext)) return 'asset';

  // Config by name
  if (CONFIG_NAMES.has(name)) return 'config';

  // Config by extension (only if not a source file)
  if (CONFIG_EXTENSIONS.has(ext) && !SOURCE_EXTENSIONS.has(ext)) return 'config';

  // Minified files
  if (name.endsWith('.min.js') || name.endsWith('.min.css')) return 'generated';

  // Generated file check (first 5 lines)
  if (SOURCE_EXTENSIONS.has(ext) && isGeneratedFile(filePath)) return 'generated';

  // Source code → logic
  if (SOURCE_EXTENSIONS.has(ext)) return 'logic';

  // CSS/HTML as logic-adjacent
  if (ext === '.css' || ext === '.scss' || ext === '.html') return 'logic';

  return 'config'; // fallback
}

function isGeneratedFile(filePath: string): boolean {
  try {
    const content = readFileSync(filePath, 'utf-8');
    const header = content.slice(0, 500).toLowerCase();
    return GENERATED_MARKERS.some((m) => header.includes(m));
  } catch {
    return false;
  }
}

// ─── File Utilities ─────────────────────────────────────────────────────────

function collectAllFiles(dir: string, depth: number, out: string[]): void {
  if (depth > MAX_DEPTH || out.length >= MAX_FILES) return;
  let entries: string[];
  try { entries = readdirSync(dir); } catch { return; }

  for (const entry of entries) {
    if (out.length >= MAX_FILES) return;
    if (VENDOR_DIRS.has(entry)) continue;
    const fullPath = join(dir, entry);
    try {
      const ls = lstatSync(fullPath);
      if (ls.isSymbolicLink()) continue;
      if (ls.isDirectory()) collectAllFiles(fullPath, depth + 1, out);
      else if (ls.isFile()) out.push(fullPath);
    } catch { /* skip */ }
  }
}

function countNonBlankLines(filePath: string): number {
  try {
    const content = readFileSync(filePath, 'utf-8');
    return content.split('\n').filter((l) => l.trim().length > 0).length;
  } catch {
    return 0;
  }
}
