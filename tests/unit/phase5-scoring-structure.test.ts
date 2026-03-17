/**
 * tests/unit/phase5-scoring-structure.test.ts
 *
 * Structural tests for Phase 5 scoring: evolution bonus, integration,
 * and candidate writer fields.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';
import type { Repository } from '../../src/types/repository.js';

import {
  analyzeEvolution,
  computeEvolutionBonus,
  DIMENSION_WEIGHTS,
  TREND_THRESHOLDS,
} from '../../src/pipeline/analysis/evolution.js';

const ROOT = resolve(__dirname, '../..');

function readSource(path: string): string {
  return readFileSync(resolve(ROOT, path), 'utf-8');
}

function makeRepo(overrides: Partial<Repository> & { name: string }): Repository {
  return {
    id: overrides.name, githubUrl: `https://github.com/test/${overrides.name}`,
    owner: 'test', fullName: `test/${overrides.name}`,
    primaryLanguage: null, languages: {}, starCount: 0, forkCount: 0,
    lastPushedAt: { seconds: 0, nanoseconds: 0 } as never,
    topics: [], detectedFrameworks: [], detectedTools: [], detectedDependencies: [],
    aiConfigFiles: [], coAuthoredByAI: false, aiAttributionPatterns: [],
    commitCount: 0, firstCommitAt: null, lastCommitAt: null, commitSpanMonths: 0,
    isOwnerRepo: false, hasTestDirectory: false, estimatedTestCoverage: 'none' as const,
    skillScoreContribution: 0, scanStatus: 'layer2' as const, scannerVersion: '1.0.0',
    lastScanned: { seconds: 0, nanoseconds: 0 } as never,
    createdAt: { seconds: 0, nanoseconds: 0 } as never,
    updatedAt: { seconds: 0, nanoseconds: 0 } as never,
    ...overrides,
  } as Repository;
}

function tsDate(iso: string) {
  return { toDate: () => new Date(iso), seconds: Math.floor(new Date(iso).getTime() / 1000) } as never;
}

// ─── Module Structure ────────────────────────────────────────────────────────

describe('Phase 5: Module Structure', () => {
  const src = readSource('src/pipeline/analysis/evolution.ts');

  it('exports analyzeEvolution', () => {
    expect(src).toContain('export function analyzeEvolution');
  });

  it('exports computeEvolutionBonus', () => {
    expect(src).toContain('export function computeEvolutionBonus');
  });

  it('exports tier computation functions', () => {
    expect(src).toContain('export function computeTechSophisticationTier');
    expect(src).toContain('export function computeTestingMaturityTier');
    expect(src).toContain('export function computeArchitectureTier');
    expect(src).toContain('export function computeAiAdoptionTier');
  });

  it('exports growth slope and trend', () => {
    expect(src).toContain('export function computeGrowthSlope');
    expect(src).toContain('export function classifyTrend');
  });
});

// ─── Evolution Bonus ─────────────────────────────────────────────────────────

describe('Phase 5: computeEvolutionBonus', () => {
  it('returns 0 for null profile', () => {
    expect(computeEvolutionBonus(null)).toBe(0);
  });

  it('returns max 8 for rapid growth + multi-dim + long span', () => {
    const profile = analyzeEvolution([
      makeRepo({ name: 'old', primaryLanguage: 'javascript', createdAt: tsDate('2019-01-01') }),
      makeRepo({
        name: 'mid', createdAt: tsDate('2021-06-01'),
        primaryLanguage: 'typescript', detectedFrameworks: ['react'],
        hasTestDirectory: true, estimatedTestCoverage: 'low', detectedDependencies: ['jest'],
      }),
      makeRepo({
        name: 'new', createdAt: tsDate('2024-01-01'),
        primaryLanguage: 'typescript', detectedFrameworks: ['next.js'],
        detectedTools: ['docker', 'kubernetes', 'github-actions'],
        detectedDependencies: ['kafka', 'postgresql', 'vitest', 'playwright'],
        hasTestDirectory: true, estimatedTestCoverage: 'high',
        coAuthoredByAI: true,
        aiConfigFiles: [{ fileName: '.cursorrules', isEvolved: true } as never],
      }),
    ]);
    expect(profile).not.toBeNull();
    expect(computeEvolutionBonus(profile)).toBe(8);
  });

  it('caps at 8', () => {
    expect(computeEvolutionBonus({
      growthVector: 1.0,
      dimensions: {
        techSophistication: { trajectory: [], slope: 1, trend: 'rapid-growth' },
        testingMaturity: { trajectory: [], slope: 1, trend: 'rapid-growth' },
        architectureComplexity: { trajectory: [], slope: 1, trend: 'rapid-growth' },
        aiAdoption: { trajectory: [], slope: 1, trend: 'rapid-growth' },
      },
      adoptionTimeline: [], reposSampled: 5,
      earliestRepoDate: '2018-01-01', latestRepoDate: '2024-01-01',
    })).toBe(8);
  });

  it('returns 0 for regression', () => {
    expect(computeEvolutionBonus({
      growthVector: -0.5,
      dimensions: {
        techSophistication: { trajectory: [], slope: -1, trend: 'regression' },
        testingMaturity: { trajectory: [], slope: -1, trend: 'regression' },
        architectureComplexity: { trajectory: [], slope: -1, trend: 'regression' },
        aiAdoption: { trajectory: [], slope: -1, trend: 'regression' },
      },
      adoptionTimeline: [], reposSampled: 2,
      earliestRepoDate: '2023-01-01', latestRepoDate: '2023-06-01',
    })).toBe(0);
  });
});

// ─── Scoring Structure ───────────────────────────────────────────────────────

describe('Phase 5: Score Formula Constants', () => {
  const src = readSource('src/pipeline/scoring/skill-score.ts');

  it('includes evolutionBonus in SkillScoreInput', () => {
    expect(src).toContain('evolutionBonus?: number');
  });

  it('caps evolution at 8', () => {
    expect(src).toContain('evolutionBonus ?? 0, 8');
  });

  it('re-exports evolution helpers', () => {
    expect(src).toContain("from '../analysis/evolution.js'");
  });
});

describe('Phase 5: Candidate Writer Fields', () => {
  const src = readSource('src/pipeline/scoring/candidate-writer.ts');

  it('writes evolutionProfile', () => {
    expect(src).toContain('evolutionProfile');
  });

  it('writes evolutionBonus', () => {
    expect(src).toContain('evolutionBonus');
  });
});

describe('Phase 5: Constants', () => {
  it('DIMENSION_WEIGHTS sum to 1.0', () => {
    const sum = DIMENSION_WEIGHTS.techSophistication + DIMENSION_WEIGHTS.testingMaturity +
      DIMENSION_WEIGHTS.architectureComplexity + DIMENSION_WEIGHTS.aiAdoption;
    expect(sum).toBeCloseTo(1.0, 5);
  });

  it('TREND_THRESHOLDS are ordered', () => {
    expect(TREND_THRESHOLDS.rapidGrowth).toBeGreaterThan(TREND_THRESHOLDS.steadyGrowth);
    expect(TREND_THRESHOLDS.steadyGrowth).toBeGreaterThan(TREND_THRESHOLDS.plateau);
  });
});
