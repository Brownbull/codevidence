/**
 * tests/unit/diff-stats.test.ts
 *
 * Tests for file classification and code composition analysis.
 * Covers: module structure, file classification rules, and composition ratios.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Module Structure ───────────────────────────────────────────────────────

describe('Diff Stats: Module Structure', () => {
  const src = readSource('src/pipeline/analysis/diff-stats.ts');

  it('exports analyzeDiffStats function', () => {
    expect(src).toContain('export function analyzeDiffStats');
  });

  it('exports classifyFile function', () => {
    expect(src).toContain('export function classifyFile');
  });

  it('exports FileCategory type', () => {
    expect(src).toContain('export type FileCategory');
  });

  it('exports DiffStatsResult interface', () => {
    expect(src).toContain('export interface DiffStatsResult');
  });

  it('does not import browser APIs', () => {
    expect(src).not.toContain('window.');
    expect(src).not.toContain('document.');
  });

  it('uses lstatSync for symlink safety', () => {
    expect(src).toContain('lstatSync');
  });
});

// ─── File Classification Rules ──────────────────────────────────────────────

describe('Diff Stats: File Classification — classifyFile', () => {
  it('classifies lock files as config', async () => {
    const mod = await import('../../src/pipeline/analysis/diff-stats.js');
    expect(mod.classifyFile('/repo/package-lock.json')).toBe('config');
    expect(mod.classifyFile('/repo/yarn.lock')).toBe('config');
    expect(mod.classifyFile('/repo/pnpm-lock.yaml')).toBe('config');
  });

  it('classifies test files by pattern', async () => {
    const mod = await import('../../src/pipeline/analysis/diff-stats.js');
    expect(mod.classifyFile('/repo/app.test.ts')).toBe('test');
    expect(mod.classifyFile('/repo/app.spec.tsx')).toBe('test');
    expect(mod.classifyFile('/repo/app.e2e.ts')).toBe('test');
  });

  it('classifies test files by directory', async () => {
    const mod = await import('../../src/pipeline/analysis/diff-stats.js');
    expect(mod.classifyFile('/repo/__tests__/helper.ts')).toBe('test');
    expect(mod.classifyFile('/repo/tests/unit/foo.ts')).toBe('test');
  });

  it('classifies documentation files', async () => {
    const mod = await import('../../src/pipeline/analysis/diff-stats.js');
    expect(mod.classifyFile('/repo/README.md')).toBe('documentation');
    expect(mod.classifyFile('/repo/docs/guide.txt')).toBe('documentation');
  });

  it('classifies asset files', async () => {
    const mod = await import('../../src/pipeline/analysis/diff-stats.js');
    expect(mod.classifyFile('/repo/logo.png')).toBe('asset');
    expect(mod.classifyFile('/repo/font.woff2')).toBe('asset');
  });

  it('classifies config by name', async () => {
    const mod = await import('../../src/pipeline/analysis/diff-stats.js');
    expect(mod.classifyFile('/repo/tsconfig.json')).toBe('config');
    expect(mod.classifyFile('/repo/Dockerfile')).toBe('config');
    expect(mod.classifyFile('/repo/.gitignore')).toBe('config');
  });

  it('classifies source files as logic', async () => {
    const mod = await import('../../src/pipeline/analysis/diff-stats.js');
    expect(mod.classifyFile('/repo/src/app.ts')).toBe('logic');
    expect(mod.classifyFile('/repo/src/main.py')).toBe('logic');
    expect(mod.classifyFile('/repo/component.tsx')).toBe('logic');
  });

  it('classifies CSS/HTML as logic', async () => {
    const mod = await import('../../src/pipeline/analysis/diff-stats.js');
    expect(mod.classifyFile('/repo/styles.css')).toBe('logic');
    expect(mod.classifyFile('/repo/index.html')).toBe('logic');
    expect(mod.classifyFile('/repo/theme.scss')).toBe('logic');
  });

  it('classifies minified files as generated', async () => {
    const mod = await import('../../src/pipeline/analysis/diff-stats.js');
    expect(mod.classifyFile('/repo/bundle.min.js')).toBe('generated');
    expect(mod.classifyFile('/repo/styles.min.css')).toBe('generated');
  });

  it('falls back to config for unknown extensions', async () => {
    const mod = await import('../../src/pipeline/analysis/diff-stats.js');
    expect(mod.classifyFile('/repo/unknown.xyz')).toBe('config');
  });
});

// ─── Classification Priority ────────────────────────────────────────────────

describe('Diff Stats: Classification Priority', () => {
  it('lock files take priority over config extension', async () => {
    const mod = await import('../../src/pipeline/analysis/diff-stats.js');
    // package-lock.json has .json extension (config ext) but lock files check first
    expect(mod.classifyFile('/repo/package-lock.json')).toBe('config');
  });

  it('test patterns take priority over source extension', async () => {
    const mod = await import('../../src/pipeline/analysis/diff-stats.js');
    expect(mod.classifyFile('/repo/utils.test.ts')).toBe('test');
  });
});

// ─── Vendor Directory Exclusion ─────────────────────────────────────────────

describe('Diff Stats: Vendor Directories', () => {
  const src = readSource('src/pipeline/analysis/diff-stats.ts');

  it('excludes node_modules', () => {
    expect(src).toContain("'node_modules'");
  });

  it('excludes dist and build', () => {
    expect(src).toContain("'dist'");
    expect(src).toContain("'build'");
  });

  it('excludes .git', () => {
    expect(src).toContain("'.git'");
  });
});

// ─── DiffStatsResult Shape ──────────────────────────────────────────────────

describe('Diff Stats: Result Shape', () => {
  const src = readSource('src/pipeline/analysis/diff-stats.ts');

  it('returns logicLinesOfCode', () => {
    expect(src).toContain('logicLinesOfCode');
  });

  it('returns logicCodeRatio (0-1)', () => {
    expect(src).toContain('logicCodeRatio');
  });

  it('returns testToLogicRatio (0-1)', () => {
    expect(src).toContain('testToLogicRatio');
  });
});

// ─── Constants ──────────────────────────────────────────────────────────────

describe('Diff Stats: Constants', () => {
  const src = readSource('src/pipeline/analysis/diff-stats.ts');

  it('limits depth to 5', () => {
    expect(src).toContain('MAX_DEPTH = 5');
  });

  it('limits files to 2000', () => {
    expect(src).toContain('MAX_FILES = 2000');
  });

  it('checks for generated file markers', () => {
    expect(src).toContain('@generated');
    expect(src).toContain('do not edit');
    expect(src).toContain('auto-generated');
  });
});
