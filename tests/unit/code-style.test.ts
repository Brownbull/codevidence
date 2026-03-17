/**
 * tests/unit/code-style.test.ts
 *
 * Unit tests for code style analysis: formatting tools, naming, documentation,
 * imports, consistency, composite score, and style points.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

import {
  analyzeCodeStyle,
  styleScoreToPoints,
} from '../../src/pipeline/analysis/code-style.js';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Module Structure ───────────────────────────────────────────────────────

describe('Code Style: Module Structure', () => {
  const src = readSource('src/pipeline/analysis/code-style.ts');

  it('exports analyzeCodeStyle function', () => {
    expect(src).toContain('export function analyzeCodeStyle');
  });

  it('exports styleScoreToPoints function', () => {
    expect(src).toContain('export function styleScoreToPoints');
  });

  it('does not import browser APIs', () => {
    expect(src).not.toContain('window.');
    expect(src).not.toContain('document.');
  });

  it('uses lstatSync for safe file reads', () => {
    expect(src).toContain('lstatSync');
  });

  it('skips symlinks in walkDir', () => {
    expect(src).toContain('isSymbolicLink()');
  });
});

// ─── styleScoreToPoints ─────────────────────────────────────────────────────

describe('Code Style: styleScoreToPoints', () => {
  it('returns 0 for score 0', () => expect(styleScoreToPoints(0)).toBe(0));
  it('returns 0 for score 30', () => expect(styleScoreToPoints(30)).toBe(0));
  it('returns 2 for score 31', () => expect(styleScoreToPoints(31)).toBe(2));
  it('returns 2 for score 50', () => expect(styleScoreToPoints(50)).toBe(2));
  it('returns 5 for score 51', () => expect(styleScoreToPoints(51)).toBe(5));
  it('returns 5 for score 75', () => expect(styleScoreToPoints(75)).toBe(5));
  it('returns 8 for score 76', () => expect(styleScoreToPoints(76)).toBe(8));
  it('returns 8 for score 100', () => expect(styleScoreToPoints(100)).toBe(8));
});

// ─── Dimension Tests with Temp Directories ──────────────────────────────────

describe('Code Style: analyzeCodeStyle integration', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = join(tmpdir(), `cs-test-${randomBytes(4).toString('hex')}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns neutral scores for empty directory', () => {
    const result = analyzeCodeStyle(tempDir, null);
    expect(result.filesAnalyzed).toBe(0);
    expect(result.formattingToolScore).toBe(0);
    expect(result.formattingToolsDetected).toEqual([]);
  });

  it('detects .prettierrc as formatting tool', () => {
    const dir = join(tempDir, 'prettier-only');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '.prettierrc'), '{}');
    writeFileSync(join(dir, 'app.ts'), 'export const x = 1;');

    const result = analyzeCodeStyle(dir, 'TypeScript');
    expect(result.formattingToolsDetected).toContain('prettier');
    expect(result.formattingToolScore).toBe(60);
  });

  it('detects multiple formatting tools', () => {
    const dir = join(tempDir, 'multi-tools');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '.prettierrc'), '{}');
    writeFileSync(join(dir, '.eslintrc.json'), '{}');
    writeFileSync(join(dir, 'app.ts'), 'export const x = 1;');

    const result = analyzeCodeStyle(dir, 'TypeScript');
    expect(result.formattingToolsDetected).toContain('prettier');
    expect(result.formattingToolsDetected).toContain('eslint');
    expect(result.formattingToolScore).toBe(85);
  });

  it('detects 3+ tools → score 100', () => {
    const dir = join(tempDir, 'many-tools');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '.prettierrc'), '{}');
    writeFileSync(join(dir, '.eslintrc.json'), '{}');
    writeFileSync(join(dir, '.editorconfig'), 'root = true');
    writeFileSync(join(dir, 'app.ts'), 'export const x = 1;');

    const result = analyzeCodeStyle(dir, 'TypeScript');
    expect(result.formattingToolScore).toBe(100);
  });

  it('detects tools from package.json', () => {
    const dir = join(tempDir, 'pkg-tools');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'package.json'), JSON.stringify({ prettier: {} }));
    writeFileSync(join(dir, 'app.ts'), 'export const x = 1;');

    const result = analyzeCodeStyle(dir, 'TypeScript');
    expect(result.formattingToolsDetected).toContain('prettier');
  });

  it('detects Python tools from pyproject.toml', () => {
    const dir = join(tempDir, 'py-tools');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'pyproject.toml'), '[tool.ruff]\nline-length = 88');
    writeFileSync(join(dir, 'main.py'), 'def hello(): pass');

    const result = analyzeCodeStyle(dir, 'Python');
    expect(result.formattingToolsDetected).toContain('ruff/black');
  });

  it('detects README presence in documentation habits', () => {
    const dir = join(tempDir, 'readme-app');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'README.md'), '# Hello');
    writeFileSync(join(dir, 'app.ts'), 'export const x = 1;');

    const result = analyzeCodeStyle(dir, 'TypeScript');
    expect(result.documentationHabits).toBeGreaterThan(0);
  });

  it('produces composite score in 0-100 range', () => {
    const dir = join(tempDir, 'full-app');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, '.prettierrc'), '{}');
    writeFileSync(join(dir, 'README.md'), '# App');
    writeFileSync(join(dir, 'app.ts'), [
      'import { foo } from "./foo";',
      'import { bar } from "./bar";',
      '',
      '/** Main handler */',
      'export function main() {',
      '  const userName = "hello";',
      '  return userName;',
      '}',
    ].join('\n'));
    writeFileSync(join(dir, 'foo.ts'), 'export const foo = 1;');
    writeFileSync(join(dir, 'bar.ts'), 'export const bar = 2;');

    const result = analyzeCodeStyle(dir, 'TypeScript');
    expect(result.compositeStyleScore).toBeGreaterThanOrEqual(0);
    expect(result.compositeStyleScore).toBeLessThanOrEqual(100);
    expect(result.filesAnalyzed).toBe(3);
  });
});

// ─── Scoring Structure ──────────────────────────────────────────────────────

describe('Code Style: Scoring Structure', () => {
  const src = readSource('src/pipeline/scoring/skill-score.ts');

  it('includes codeStylePoints in SkillScoreInput', () => {
    expect(src).toContain('codeStylePoints?: number');
  });

  it('caps code style points at 8', () => {
    expect(src).toContain('codeStylePoints ?? 0, 8');
  });
});

describe('Code Style: Phase4 Helpers', () => {
  const src = readSource('src/pipeline/scoring/phase4-helpers.ts');

  it('exports computeCodeStylePoints (aggregator)', () => {
    expect(src).toContain('export function computeCodeStylePoints');
  });

  it('exports collectPhase4Data', () => {
    expect(src).toContain('export function collectPhase4Data');
  });
});
