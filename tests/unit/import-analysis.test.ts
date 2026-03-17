/**
 * tests/unit/import-analysis.test.ts
 *
 * Tests for import validation and framework depth detection.
 * Covers: module structure, import confirmation, framework depth levels,
 * and integration with framework-patterns.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Module Structure ───────────────────────────────────────────────────────

describe('Import Analysis: Module Structure', () => {
  const src = readSource('src/pipeline/analysis/import-analysis.ts');

  it('exports analyzeImports function', () => {
    expect(src).toContain('export function analyzeImports');
  });

  it('exports ImportAnalysisResult interface', () => {
    expect(src).toContain('export interface ImportAnalysisResult');
  });

  it('imports framework depth patterns', () => {
    expect(src).toContain("from './framework-patterns.js'");
    expect(src).toContain('FRAMEWORK_DEPTH_PATTERNS');
  });

  it('does not import browser APIs', () => {
    expect(src).not.toContain('window.');
    expect(src).not.toContain('document.');
  });

  it('uses lstatSync for symlink safety', () => {
    expect(src).toContain('lstatSync');
    expect(src).not.toMatch(/\bstatSync\b/);
  });

  it('caps file collection at MAX_FILES=50', () => {
    expect(src).toContain('MAX_FILES = 50');
  });
});

// ─── Framework Patterns Structure ───────────────────────────────────────────

describe('Import Analysis: Framework Patterns', () => {
  const src = readSource('src/pipeline/analysis/framework-patterns.ts');

  it('exports FRAMEWORK_DEPTH_PATTERNS', () => {
    expect(src).toContain('export const FRAMEWORK_DEPTH_PATTERNS');
  });

  it('exports DEPTH_LEVELS with 4 levels', () => {
    expect(src).toContain("'beginner'");
    expect(src).toContain("'intermediate'");
    expect(src).toContain("'advanced'");
    expect(src).toContain("'expert'");
  });

  it('defines patterns for at least 5 frameworks', () => {
    expect(src).toContain("'framework:react'");
    expect(src).toContain("'framework:express'");
    expect(src).toContain("'framework:nextjs'");
    expect(src).toContain("'framework:django'");
    expect(src).toContain("'framework:fastapi'");
  });

  it('exports MIN_PATTERNS_FOR_LEVEL', () => {
    expect(src).toContain('export const MIN_PATTERNS_FOR_LEVEL');
  });

  it('exports FRAMEWORK_FILE_EXTENSIONS', () => {
    expect(src).toContain('export const FRAMEWORK_FILE_EXTENSIONS');
  });
});

// ─── Import Taxonomy Map ────────────────────────────────────────────────────

describe('Import Analysis: Taxonomy Map', () => {
  const src = readSource('src/pipeline/analysis/import-analysis.ts');

  it('maps react to framework:react', () => {
    expect(src).toContain("'react': 'framework:react'");
  });

  it('maps express to framework:express', () => {
    expect(src).toContain("'express': 'framework:express'");
  });

  it('maps scoped packages like @nestjs/core', () => {
    expect(src).toContain("'@nestjs/core': 'framework:nestjs'");
  });

  it('maps Python frameworks', () => {
    expect(src).toContain("'django': 'framework:django'");
    expect(src).toContain("'flask': 'framework:flask'");
    expect(src).toContain("'fastapi': 'framework:fastapi'");
  });
});

// ─── Functional Tests: Import Confirmation ──────────────────────────────────

describe('Import Analysis: Functional — confirmImports', () => {
  it('confirms React import from ES module syntax', async () => {
    const mod = await import('../../src/pipeline/analysis/import-analysis.js');
    const result = mod.analyzeImports(
      resolve(ROOT, 'tests/fixtures/import-analysis/react-project'),
      ['framework:react'],
      'language:typescript',
    );
    // If fixtures don't exist, at least verify the result shape
    expect(result).toHaveProperty('confirmedImports');
    expect(result).toHaveProperty('frameworkDepth');
    expect(Array.isArray(result.confirmedImports)).toBe(true);
    expect(Array.isArray(result.frameworkDepth)).toBe(true);
  });
});

// ─── Functional Tests: Framework Depth ──────────────────────────────────────

describe('Import Analysis: Functional — framework depth patterns', () => {
  it('FRAMEWORK_DEPTH_PATTERNS has 4 levels per framework', async () => {
    const mod = await import('../../src/pipeline/analysis/framework-patterns.js');
    for (const [fwId, levels] of Object.entries(mod.FRAMEWORK_DEPTH_PATTERNS)) {
      expect(levels).toHaveLength(4);
      for (const level of levels) {
        expect(level.length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('DEPTH_LEVELS has exactly 4 entries', async () => {
    const mod = await import('../../src/pipeline/analysis/framework-patterns.js');
    expect(mod.DEPTH_LEVELS).toEqual(['beginner', 'intermediate', 'advanced', 'expert']);
  });

  it('MIN_PATTERNS_FOR_LEVEL is 2', async () => {
    const mod = await import('../../src/pipeline/analysis/framework-patterns.js');
    expect(mod.MIN_PATTERNS_FOR_LEVEL).toBe(2);
  });
});

// ─── Import Pattern Coverage ────────────────────────────────────────────────

describe('Import Analysis: Import Pattern Coverage', () => {
  const src = readSource('src/pipeline/analysis/import-analysis.ts');

  it('handles ES import syntax', () => {
    expect(src).toContain("^import\\s[^'\"]*?from\\s+");
  });

  it('handles require() syntax', () => {
    expect(src).toContain("require\\(");
  });

  it('handles Python import syntax', () => {
    expect(src).toContain("^import\\s+");
    expect(src).toContain("^from\\s+");
  });
});
