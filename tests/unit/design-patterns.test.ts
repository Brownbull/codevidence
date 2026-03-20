/**
 * tests/unit/design-patterns.test.ts
 *
 * Unit tests for design pattern detection: tier classification, tier-to-points,
 * pattern signal constants, and integration with temp directories.
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync, mkdirSync, writeFileSync, rmSync } from 'fs';
import { resolve, join } from 'path';
import { tmpdir } from 'os';
import { randomBytes } from 'crypto';

import {
  analyzeDesignPatterns,
  classifySophisticationTier,
  tierToPoints,
  FILE_PATTERN_SIGNALS,
  DIR_PATTERN_SIGNALS,
  CONTENT_SIGNALS,
  TIER_POINTS,
} from '../../src/pipeline/analysis/design-patterns.js';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Module Structure ───────────────────────────────────────────────────────

describe('Design Patterns: Module Structure', () => {
  const src = readSource('src/pipeline/analysis/design-patterns.ts');

  it('exports analyzeDesignPatterns function', () => {
    expect(src).toContain('export function analyzeDesignPatterns');
  });

  it('exports classifySophisticationTier function', () => {
    expect(src).toContain('export function classifySophisticationTier');
  });

  it('exports tierToPoints function', () => {
    expect(src).toContain('export function tierToPoints');
  });

  it('does not import browser APIs', () => {
    expect(src).not.toContain('window.');
    expect(src).not.toContain('document.');
  });

  it('skips symlinks in walkDirectories', () => {
    expect(src).toContain('isSymbolicLink()');
  });

  it('uses lstatSync for safe file reads', () => {
    expect(src).toContain('lstatSync');
  });
});

// ─── Tier Classification ────────────────────────────────────────────────────

describe('Design Patterns: classifySophisticationTier', () => {
  it('returns none for 0 patterns, no arch', () => {
    expect(classifySophisticationTier(0, false, 0)).toBe('none');
  });

  it('returns basic for 1 pattern, no arch', () => {
    expect(classifySophisticationTier(1, false, 0)).toBe('basic');
  });

  it('returns basic for 2 patterns with arch (≤2 = basic)', () => {
    expect(classifySophisticationTier(2, true, 0)).toBe('basic');
  });

  it('returns basic for arch style alone', () => {
    expect(classifySophisticationTier(0, true, 0)).toBe('basic');
  });

  it('returns intermediate for 3 patterns + arch', () => {
    expect(classifySophisticationTier(3, true, 0)).toBe('intermediate');
  });

  it('returns intermediate for 5 patterns + arch', () => {
    expect(classifySophisticationTier(5, true, 0)).toBe('intermediate');
  });

  it('returns advanced for 6+ patterns + arch + 0 anti-patterns', () => {
    expect(classifySophisticationTier(6, true, 0)).toBe('advanced');
    expect(classifySophisticationTier(8, true, 0)).toBe('advanced');
  });

  it('downgrades from advanced when anti-patterns present', () => {
    expect(classifySophisticationTier(6, true, 1)).toBe('intermediate');
  });

  it('returns basic when no arch even with many patterns', () => {
    expect(classifySophisticationTier(6, false, 0)).toBe('basic');
    expect(classifySophisticationTier(3, false, 0)).toBe('basic');
  });
});

// ─── Tier to Points ─────────────────────────────────────────────────────────

describe('Design Patterns: tierToPoints', () => {
  it('maps none → 0', () => expect(tierToPoints('none')).toBe(0));
  it('maps basic → 3', () => expect(tierToPoints('basic')).toBe(3));
  it('maps intermediate → 6', () => expect(tierToPoints('intermediate')).toBe(6));
  it('maps advanced → 10', () => expect(tierToPoints('advanced')).toBe(10));
});

// ─── Pattern Signal Constants ───────────────────────────────────────────────

describe('Design Patterns: Constants', () => {
  it('FILE_PATTERN_SIGNALS has 8 entries', () => {
    expect(FILE_PATTERN_SIGNALS).toHaveLength(8);
  });

  it('DIR_PATTERN_SIGNALS has 21 entries', () => {
    expect(DIR_PATTERN_SIGNALS).toHaveLength(21);
  });

  it('CONTENT_SIGNALS has 5 entries', () => {
    expect(CONTENT_SIGNALS).toHaveLength(5);
  });

  it('TIER_POINTS has all four tiers', () => {
    expect(Object.keys(TIER_POINTS)).toHaveLength(4);
  });

  it('all CONTENT_SIGNALS regexes compile', () => {
    for (const cs of CONTENT_SIGNALS) {
      expect(() => cs.regex.test('test')).not.toThrow();
    }
  });
});

// ─── Integration with Temp Directories ──────────────────────────────────────

describe('Design Patterns: analyzeDesignPatterns integration', () => {
  let tempDir: string;

  beforeAll(() => {
    tempDir = join(tmpdir(), `dp-test-${randomBytes(4).toString('hex')}`);
    mkdirSync(tempDir, { recursive: true });
  });

  afterAll(() => {
    rmSync(tempDir, { recursive: true, force: true });
  });

  it('returns none for empty directory', () => {
    const result = analyzeDesignPatterns(tempDir, null);
    expect(result.designPatternSignals).toHaveLength(0);
    expect(result.designSophisticationTier).toBe('none');
  });

  it('detects MVC architecture style', () => {
    const dir = join(tempDir, 'mvc-app');
    mkdirSync(join(dir, 'controllers'), { recursive: true });
    mkdirSync(join(dir, 'models'), { recursive: true });
    mkdirSync(join(dir, 'views'), { recursive: true });
    writeFileSync(join(dir, 'controllers', 'app.ts'), 'export class App {}');

    const result = analyzeDesignPatterns(dir, null);
    expect(result.architectureStyle).toBe('mvc');
  });

  it('detects file name patterns', () => {
    const dir = join(tempDir, 'pattern-app');
    mkdirSync(join(dir, 'services'), { recursive: true });
    writeFileSync(join(dir, 'services', 'UserFactory.ts'), 'export class UserFactory {}');
    writeFileSync(join(dir, 'services', 'AuthStrategy.ts'), 'export class AuthStrategy {}');

    const result = analyzeDesignPatterns(dir, null);
    const patternIds = result.designPatternSignals.map((s) => s.patternId);
    expect(patternIds).toContain('pattern:factory');
    expect(patternIds).toContain('pattern:strategy');
    expect(patternIds).toContain('pattern:service-layer');
  });

  it('detects content patterns (interface)', () => {
    const dir = join(tempDir, 'interface-app');
    mkdirSync(dir, { recursive: true });
    writeFileSync(join(dir, 'types.ts'), 'export interface User {\n  name: string;\n}');

    const result = analyzeDesignPatterns(dir, null);
    const patternIds = result.designPatternSignals.map((s) => s.patternId);
    expect(patternIds).toContain('pattern:interface-segregation');
  });

  it('detects clean architecture', () => {
    const dir = join(tempDir, 'clean-app');
    mkdirSync(join(dir, 'src', 'domain'), { recursive: true });
    mkdirSync(join(dir, 'src', 'use-cases'), { recursive: true });
    mkdirSync(join(dir, 'src', 'adapters'), { recursive: true });
    writeFileSync(join(dir, 'src', 'domain', 'user.ts'), 'export class User {}');

    const result = analyzeDesignPatterns(dir, null);
    expect(result.architectureStyle).toBe('clean');
  });
});
