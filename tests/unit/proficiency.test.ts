/**
 * tests/unit/proficiency.test.ts — Proficiency analysis tests.
 *
 * Tests the proficiency pattern catalog structure, scoring formula,
 * proficiency bonus computation, and overall classification.
 */

import { describe, it, expect } from 'vitest';
import {
  PROFICIENCY_PATTERNS,
  getRelevantPatternSets,
  type PatternDef,
  type TechPatternSet,
} from '../../src/pipeline/analysis/proficiency-patterns.js';
import {
  computeProficiencyBonus,
  classifyOverallProficiency,
} from '../../src/pipeline/analysis/proficiency.js';
import type { TechProficiency } from '../../src/types/repository.js';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function makeTechProf(score: number): TechProficiency {
  return { level: 'beginner', score, patternCount: 0, topPatterns: [] };
}

// ─── Pattern Catalog Structure ───────────────────────────────────────────────

describe('PROFICIENCY_PATTERNS catalog', () => {
  it('contains exactly 5 technology pattern sets', () => {
    expect(PROFICIENCY_PATTERNS).toHaveLength(5);
  });

  it('covers expected technologies', () => {
    const ids = PROFICIENCY_PATTERNS.map((ps) => ps.technologyId).sort();
    expect(ids).toEqual([
      'framework:react',
      'language:python',
      'language:typescript',
      'testing',
      'tool:docker',
    ]);
  });

  it('every pattern has required fields', () => {
    for (const ps of PROFICIENCY_PATTERNS) {
      for (const p of ps.patterns) {
        expect(p.id).toBeTruthy();
        expect(['beginner', 'intermediate', 'advanced']).toContain(p.level);
        expect(p.weight).toBeGreaterThan(0);
        expect(typeof p.isAntiPattern).toBe('boolean');
        // Must have at least one matching strategy
        const hasStrategy = !!(p.contentPattern || p.fileExists || p.fileExtensions);
        expect(hasStrategy).toBe(true);
      }
    }
  });

  it('no duplicate pattern IDs within a tech', () => {
    for (const ps of PROFICIENCY_PATTERNS) {
      const ids = ps.patterns.map((p) => p.id);
      expect(new Set(ids).size).toBe(ids.length);
    }
  });

  it('totalPossibleWeight equals sum of positive pattern weights', () => {
    for (const ps of PROFICIENCY_PATTERNS) {
      const expectedWeight = ps.patterns
        .filter((p) => !p.isAntiPattern)
        .reduce((sum, p) => sum + p.weight, 0);
      expect(ps.totalPossibleWeight).toBe(expectedWeight);
    }
  });

  it('every tech has at least one anti-pattern or intermediate+ pattern', () => {
    for (const ps of PROFICIENCY_PATTERNS) {
      const hasDepth = ps.patterns.some(
        (p) => p.isAntiPattern || p.level !== 'beginner'
      );
      expect(hasDepth).toBe(true);
    }
  });
});

// ─── getRelevantPatternSets ──────────────────────────────────────────────────

describe('getRelevantPatternSets', () => {
  it('always includes testing patterns', () => {
    const sets = getRelevantPatternSets(null, [], []);
    const ids = sets.map((ps) => ps.technologyId);
    expect(ids).toContain('testing');
  });

  it('includes React when framework:react detected', () => {
    const sets = getRelevantPatternSets(null, ['framework:react'], []);
    const ids = sets.map((ps) => ps.technologyId);
    expect(ids).toContain('framework:react');
    expect(ids).toContain('testing');
  });

  it('includes TypeScript when language:typescript is primary', () => {
    const sets = getRelevantPatternSets('language:typescript', [], []);
    const ids = sets.map((ps) => ps.technologyId);
    expect(ids).toContain('language:typescript');
  });

  it('includes Docker when tool:docker detected', () => {
    const sets = getRelevantPatternSets(null, [], ['tool:docker']);
    const ids = sets.map((ps) => ps.technologyId);
    expect(ids).toContain('tool:docker');
  });

  it('returns only testing for unknown technologies', () => {
    const sets = getRelevantPatternSets('language:ruby', ['framework:rails'], []);
    expect(sets).toHaveLength(1);
    expect(sets[0].technologyId).toBe('testing');
  });
});

// ─── computeProficiencyBonus ─────────────────────────────────────────────────

describe('computeProficiencyBonus', () => {
  it('returns 0 for empty tech proficiency', () => {
    expect(computeProficiencyBonus({})).toBe(0);
  });

  it('computes bonus from single tech', () => {
    const tp = { 'framework:react': makeTechProf(50) };
    // avg(50) / 100 * 14 = 7
    expect(computeProficiencyBonus(tp)).toBe(7);
  });

  it('computes bonus from two techs', () => {
    const tp = {
      'framework:react': makeTechProf(60),
      'language:typescript': makeTechProf(40),
    };
    // avg(60, 40) = 50 → 50/100 * 14 = 7
    expect(computeProficiencyBonus(tp)).toBe(7);
  });

  it('uses top 3 scores when more than 3 techs', () => {
    const tp = {
      'framework:react': makeTechProf(100),
      'language:typescript': makeTechProf(80),
      'language:python': makeTechProf(60),
      'tool:docker': makeTechProf(20), // ignored — not in top 3
    };
    // avg(100, 80, 60) = 80 → 80/100 * 14 = 11.2 → 11
    expect(computeProficiencyBonus(tp)).toBe(11);
  });

  it('caps at 14', () => {
    const tp = {
      'framework:react': makeTechProf(100),
      'language:typescript': makeTechProf(100),
      'language:python': makeTechProf(100),
    };
    // avg(100, 100, 100) = 100 → 100/100 * 14 = 14
    expect(computeProficiencyBonus(tp)).toBe(14);
  });

  it('returns 0 for all-zero scores', () => {
    const tp = {
      'framework:react': makeTechProf(0),
      'language:typescript': makeTechProf(0),
    };
    expect(computeProficiencyBonus(tp)).toBe(0);
  });

  it('handles score of 1 correctly (rounds properly)', () => {
    const tp = { 'framework:react': makeTechProf(1) };
    // 1/100 * 14 = 0.14 → round → 0
    expect(computeProficiencyBonus(tp)).toBe(0);
  });
});

// ─── classifyOverallProficiency ──────────────────────────────────────────────

describe('classifyOverallProficiency', () => {
  it('returns beginner for empty map', () => {
    expect(classifyOverallProficiency({})).toBe('beginner');
  });

  it('returns beginner for score 0-25', () => {
    expect(classifyOverallProficiency({ a: makeTechProf(0) })).toBe('beginner');
    expect(classifyOverallProficiency({ a: makeTechProf(25) })).toBe('beginner');
  });

  it('returns intermediate for score 26-55', () => {
    expect(classifyOverallProficiency({ a: makeTechProf(26) })).toBe('intermediate');
    expect(classifyOverallProficiency({ a: makeTechProf(55) })).toBe('intermediate');
  });

  it('returns advanced for score 56-80', () => {
    expect(classifyOverallProficiency({ a: makeTechProf(56) })).toBe('advanced');
    expect(classifyOverallProficiency({ a: makeTechProf(80) })).toBe('advanced');
  });

  it('returns expert for score 81-100', () => {
    expect(classifyOverallProficiency({ a: makeTechProf(81) })).toBe('expert');
    expect(classifyOverallProficiency({ a: makeTechProf(100) })).toBe('expert');
  });

  it('averages across multiple techs', () => {
    const tp = {
      a: makeTechProf(100), // expert
      b: makeTechProf(0),   // beginner
    };
    // avg = 50 → intermediate
    expect(classifyOverallProficiency(tp)).toBe('intermediate');
  });

  it('boundary: score 25.5 rounds to 26 → intermediate', () => {
    const tp = {
      a: makeTechProf(26),
      b: makeTechProf(25),
    };
    // avg = 25.5 → round = 26 → intermediate
    expect(classifyOverallProficiency(tp)).toBe('intermediate');
  });
});

// ─── Anti-Pattern Score Subtraction ──────────────────────────────────────────

describe('anti-pattern scoring', () => {
  it('React has anti-patterns that subtract from score', () => {
    const react = PROFICIENCY_PATTERNS.find(
      (ps) => ps.technologyId === 'framework:react'
    )!;
    const antiPatterns = react.patterns.filter((p) => p.isAntiPattern);
    expect(antiPatterns.length).toBeGreaterThan(0);

    // Anti-patterns should have beginner level
    for (const ap of antiPatterns) {
      expect(ap.level).toBe('beginner');
    }
  });

  it('TypeScript has anti-patterns for any/ts-ignore', () => {
    const ts = PROFICIENCY_PATTERNS.find(
      (ps) => ps.technologyId === 'language:typescript'
    )!;
    const antiIds = ts.patterns
      .filter((p) => p.isAntiPattern)
      .map((p) => p.id);
    expect(antiIds).toContain('ts:any-usage');
    expect(antiIds).toContain('ts:ts-ignore');
  });

  it('Docker has anti-patterns for root user and latest tag', () => {
    const docker = PROFICIENCY_PATTERNS.find(
      (ps) => ps.technologyId === 'tool:docker'
    )!;
    const antiIds = docker.patterns
      .filter((p) => p.isAntiPattern)
      .map((p) => p.id);
    expect(antiIds).toContain('docker:root-user');
    expect(antiIds).toContain('docker:latest-tag');
  });

  it('anti-pattern weights are excluded from totalPossibleWeight', () => {
    for (const ps of PROFICIENCY_PATTERNS) {
      const antiWeightSum = ps.patterns
        .filter((p) => p.isAntiPattern)
        .reduce((sum, p) => sum + p.weight, 0);
      const allWeightSum = ps.patterns.reduce((sum, p) => sum + p.weight, 0);
      expect(ps.totalPossibleWeight).toBe(allWeightSum - antiWeightSum);
    }
  });
});
