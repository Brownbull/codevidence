/**
 * src/pipeline/analysis/code-style.ts — Code style discipline analysis.
 *
 * Five dimensions of lightweight heuristics measuring developer DISCIPLINE:
 *   1. Formatting tool adoption (25%) — config file presence
 *   2. Naming descriptiveness (15%) — identifier quality
 *   3. Documentation habits (25%) — JSDoc/docstring coverage
 *   4. Import organization (15%) — sorting, grouping, wildcards
 *   5. Cross-file consistency (20%) — indent, quotes, semicolons
 *
 * Produces codeStylePoints bonus (0-8) in skill score.
 * Runs in Layer 1 (shallow clone) — no git history needed.
 */

import { readdirSync, readFileSync, existsSync, lstatSync } from 'fs';
import { join, extname } from 'path';
import type { CodeStyleMetrics } from '../../types/repository.js';
import {
  analyzeNaming,
  analyzeDocumentation,
  analyzeImportOrg,
  analyzeConsistency,
} from './code-style-dimensions.js';

export type CodeStyleResult = CodeStyleMetrics;

// ─── Constants ────────────────────────────────────────────────

const MAX_SAMPLE_FILES = 30;
const MAX_DEPTH = 3;

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'vendor', 'dist', 'build', '__pycache__',
  '.venv', 'target', '.next', '.nuxt', 'coverage', '.cache',
]);

const SOURCE_EXTENSIONS = new Set([
  '.ts', '.tsx', '.js', '.jsx', '.py', '.rs', '.go', '.java', '.kt', '.rb',
]);

// ─── Formatting Tool Registry ────────────────────────────────

const CONFIG_PATTERNS: ReadonlyArray<{ pattern: RegExp; tool: string }> = [
  { pattern: /^\.prettierrc/i, tool: 'prettier' },
  { pattern: /^prettier\.config\./i, tool: 'prettier' },
  { pattern: /^\.eslintrc/i, tool: 'eslint' },
  { pattern: /^eslint\.config\./i, tool: 'eslint' },
  { pattern: /^\.editorconfig$/i, tool: 'editorconfig' },
  { pattern: /^biome\.jsonc?$/i, tool: 'biome' },
  { pattern: /^\.stylelintrc/i, tool: 'stylelint' },
  { pattern: /^rustfmt\.toml$|^\.rustfmt\.toml$/i, tool: 'rustfmt' },
  { pattern: /^clippy\.toml$|^\.clippy\.toml$/i, tool: 'clippy' },
  { pattern: /^\.golangci\.ya?ml$/i, tool: 'golangci-lint' },
  { pattern: /^\.rubocop\.yml$/i, tool: 'rubocop' },
  { pattern: /^\.clang-format$/i, tool: 'clang-format' },
];

const PKG_JSON_TOOLS = ['prettier', 'eslintConfig', 'stylelint'] as const;

// ─── Public API ──────────────────────────────────────────────

export function analyzeCodeStyle(
  cloneDir: string,
  _primaryLanguage: string | null,
): CodeStyleResult {
  const sourceFiles = collectSourceFiles(cloneDir);
  const fileContents = readSourceContents(sourceFiles);

  const formattingResult = analyzeFormattingTools(cloneDir);
  const naming = analyzeNaming(fileContents);
  const docs = analyzeDocumentation(cloneDir, fileContents);
  const imports = analyzeImportOrg(fileContents);
  const consistency = analyzeConsistency(fileContents);

  const composite = Math.round(
    formattingResult.score * 0.25 +
    naming * 0.15 +
    docs * 0.25 +
    imports * 0.15 +
    consistency * 0.20,
  );

  return {
    formattingToolScore: formattingResult.score,
    namingDescriptiveness: naming,
    documentationHabits: docs,
    importOrganization: imports,
    crossFileConsistency: consistency,
    compositeStyleScore: composite,
    formattingToolsDetected: formattingResult.tools,
    filesAnalyzed: sourceFiles.length,
  };
}

export function styleScoreToPoints(compositeStyleScore: number): number {
  if (compositeStyleScore >= 76) return 8;
  if (compositeStyleScore >= 51) return 5;
  if (compositeStyleScore >= 31) return 2;
  return 0;
}

// ─── Dimension 1: Formatting Tool Adoption ───────────────────

function analyzeFormattingTools(cloneDir: string): { score: number; tools: string[] } {
  const tools = new Set<string>();
  try {
    for (const entry of readdirSync(cloneDir, { withFileTypes: true })) {
      if (!entry.isFile()) continue;
      for (const cp of CONFIG_PATTERNS) {
        if (cp.pattern.test(entry.name)) tools.add(cp.tool);
      }
    }
  } catch { /* empty */ }

  // Check package.json for inline configs
  const pkgPath = join(cloneDir, 'package.json');
  if (existsSync(pkgPath)) {
    try {
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      for (const key of PKG_JSON_TOOLS) {
        if (pkg[key]) tools.add(key === 'eslintConfig' ? 'eslint' : key);
      }
    } catch { /* invalid JSON */ }
  }

  // Check pyproject.toml for Python tools
  const pypath = join(cloneDir, 'pyproject.toml');
  if (existsSync(pypath)) {
    try {
      const content = readFileSync(pypath, 'utf-8');
      if (/\[tool\.(?:black|ruff)\]/m.test(content)) tools.add('ruff/black');
    } catch { /* skip */ }
  }

  const count = tools.size;
  const score = count === 0 ? 0 : count === 1 ? 60 : count === 2 ? 85 : 100;
  return { score, tools: [...tools].sort() };
}

// ─── File Collection ─────────────────────────────────────────

function collectSourceFiles(cloneDir: string): string[] {
  const files: string[] = [];
  walkDir(cloneDir, 0, (path) => {
    if (files.length < MAX_SAMPLE_FILES) files.push(path);
  });
  return files;
}

function walkDir(
  dir: string, depth: number,
  callback: (filePath: string) => void,
): void {
  if (depth > MAX_DEPTH) return;
  let entries: import('fs').Dirent[];
  try { entries = readdirSync(dir, { withFileTypes: true }); }
  catch { return; }
  for (const entry of entries) {
    if (entry.isSymbolicLink()) continue;
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walkDir(fullPath, depth + 1, callback);
    } else if (entry.isFile() && SOURCE_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
      callback(fullPath);
    }
  }
}

const MAX_FILE_BYTES = 512 * 1024; // 512 KB — skip generated/minified files

function readSourceContents(files: string[]): string[] {
  const results: string[] = [];
  for (const file of files) {
    try {
      const stat = lstatSync(file);
      if (!stat.isSymbolicLink() && stat.isFile() && stat.size <= MAX_FILE_BYTES) {
        results.push(readFileSync(file, 'utf-8'));
      }
    } catch { /* skip */ }
  }
  return results;
}
