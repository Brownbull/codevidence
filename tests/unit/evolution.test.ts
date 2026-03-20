/** Unit tests for cross-repo evolution analysis. */

import { describe, it, expect } from 'vitest';
import type { Repository } from '../../src/types/repository.js';

import {
  analyzeEvolution,
  computeTechSophisticationTier,
  computeTestingMaturityTier,
  computeArchitectureTier,
  computeAiAdoptionTier,
  computeGrowthSlope,
  classifyTrend,
} from '../../src/pipeline/analysis/evolution.js';

function makeRepo(overrides: Partial<Repository> & { name: string }): Repository {
  const ts = { seconds: 0, nanoseconds: 0 } as never;
  return {
    id: overrides.name, githubUrl: `https://github.com/test/${overrides.name}`,
    owner: 'test', fullName: `test/${overrides.name}`,
    primaryLanguage: null, languages: {}, starCount: 0, forkCount: 0,
    lastPushedAt: ts, topics: [],
    detectedFrameworks: [], detectedTools: [], detectedDependencies: [],
    aiConfigFiles: [], coAuthoredByAI: false, aiAttributionPatterns: [],
    commitCount: 0, firstCommitAt: null, lastCommitAt: null, commitSpanMonths: 0,
    isOwnerRepo: false, hasTestDirectory: false, estimatedTestCoverage: 'none' as const,
    skillScoreContribution: 0, scanStatus: 'layer2' as const, scannerVersion: '1.0.0',
    lastScanned: ts, createdAt: ts, updatedAt: ts,
    ...overrides,
  } as Repository;
}

function tsDate(iso: string) {
  return { toDate: () => new Date(iso), seconds: Math.floor(new Date(iso).getTime() / 1000) } as never;
}

// ─── Tech Sophistication Tier ────────────────────────────────────────────────

describe('Evolution: computeTechSophisticationTier', () => {
  it('returns 1 for script-only repo', () => {
    expect(computeTechSophisticationTier(makeRepo({ name: 'a', primaryLanguage: 'python' }))).toBe(1);
  });

  it('returns 2 for basic framework', () => {
    expect(computeTechSophisticationTier(makeRepo({
      name: 'a', primaryLanguage: 'javascript', detectedFrameworks: ['express'],
    }))).toBe(2);
  });

  it('returns 3 for typed language + framework', () => {
    expect(computeTechSophisticationTier(makeRepo({
      name: 'a', primaryLanguage: 'typescript', detectedFrameworks: ['some-fw'],
    }))).toBe(3);
  });

  it('returns 3 for modern framework (React)', () => {
    expect(computeTechSophisticationTier(makeRepo({
      name: 'a', primaryLanguage: 'javascript', detectedFrameworks: ['react'],
    }))).toBe(3);
  });

  it('returns 4 for meta-framework', () => {
    expect(computeTechSophisticationTier(makeRepo({
      name: 'a', primaryLanguage: 'typescript', detectedFrameworks: ['next.js'],
    }))).toBe(4);
  });

  it('returns 5 for full infra stack', () => {
    expect(computeTechSophisticationTier(makeRepo({
      name: 'a', primaryLanguage: 'go',
      detectedTools: ['docker', 'kubernetes'],
      detectedDependencies: ['kafka'],
    }))).toBe(5);
  });
});

// ─── Testing Maturity Tier ───────────────────────────────────────────────────

describe('Evolution: computeTestingMaturityTier', () => {
  it('returns 0 for no tests', () => {
    expect(computeTestingMaturityTier(makeRepo({ name: 'a' }))).toBe(0);
  });

  it('returns 1 for test directory only', () => {
    expect(computeTestingMaturityTier(makeRepo({ name: 'a', hasTestDirectory: true }))).toBe(1);
  });

  it('returns 2 for test framework + coverage', () => {
    expect(computeTestingMaturityTier(makeRepo({
      name: 'a', hasTestDirectory: true, estimatedTestCoverage: 'low',
      detectedDependencies: ['jest'],
    }))).toBe(2);
  });

  it('returns 3 for medium coverage', () => {
    expect(computeTestingMaturityTier(makeRepo({
      name: 'a', hasTestDirectory: true, estimatedTestCoverage: 'medium',
      detectedDependencies: ['vitest'],
    }))).toBe(3);
  });

  it('returns 4 for high + CI + E2E', () => {
    expect(computeTestingMaturityTier(makeRepo({
      name: 'a', hasTestDirectory: true, estimatedTestCoverage: 'high',
      detectedTools: ['github-actions'], detectedDependencies: ['vitest', 'playwright'],
    }))).toBe(4);
  });
});

// ─── Architecture Tier ───────────────────────────────────────────────────────

describe('Evolution: computeArchitectureTier', () => {
  it('returns 1 for simple repo', () => {
    expect(computeArchitectureTier(makeRepo({ name: 'a' }))).toBe(1);
  });

  it('returns 2 for framework + DB', () => {
    expect(computeArchitectureTier(makeRepo({
      name: 'a', detectedFrameworks: ['express'], detectedDependencies: ['postgresql'],
    }))).toBe(2);
  });

  it('returns 3 for framework + DB + cache', () => {
    expect(computeArchitectureTier(makeRepo({
      name: 'a', detectedFrameworks: ['express'],
      detectedDependencies: ['postgresql', 'redis'],
    }))).toBe(3);
  });

  it('returns 4 for Docker + orchestration', () => {
    expect(computeArchitectureTier(makeRepo({
      name: 'a', detectedFrameworks: ['express'],
      detectedTools: ['docker', 'kubernetes'],
    }))).toBe(4);
  });
});

// ─── AI Adoption Tier ────────────────────────────────────────────────────────

describe('Evolution: computeAiAdoptionTier', () => {
  it('returns 0 for no AI signals', () => {
    expect(computeAiAdoptionTier(makeRepo({ name: 'a' }))).toBe(0);
  });

  it('returns 1 for one config file', () => {
    expect(computeAiAdoptionTier(makeRepo({
      name: 'a',
      aiConfigFiles: [{ fileName: '.cursorrules', isEvolved: false } as never],
    }))).toBe(1);
  });

  it('returns 2 for co-authored', () => {
    expect(computeAiAdoptionTier(makeRepo({ name: 'a', coAuthoredByAI: true }))).toBe(2);
  });

  it('returns 3 for evolved + co-authored', () => {
    expect(computeAiAdoptionTier(makeRepo({
      name: 'a', coAuthoredByAI: true,
      aiConfigFiles: [{ fileName: '.cursorrules', isEvolved: true } as never],
    }))).toBe(3);
  });
});

// ─── Growth Slope ────────────────────────────────────────────────────────────

describe('Evolution: computeGrowthSlope', () => {
  it('returns 0 for single point', () => {
    expect(computeGrowthSlope([{ dateMs: 0, tier: 1 }])).toBe(0);
  });

  it('returns 0 for same dates', () => {
    expect(computeGrowthSlope([{ dateMs: 1000, tier: 1 }, { dateMs: 1000, tier: 3 }])).toBe(0);
  });

  it('returns positive slope for ascending tiers', () => {
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    const slope = computeGrowthSlope([
      { dateMs: 0, tier: 1 },
      { dateMs: msPerYear, tier: 3 },
    ]);
    expect(slope).toBeCloseTo(2, 1);
  });

  it('returns negative slope for descending tiers', () => {
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    const slope = computeGrowthSlope([
      { dateMs: 0, tier: 4 },
      { dateMs: msPerYear, tier: 1 },
    ]);
    expect(slope).toBeLessThan(0);
  });

  it('returns 0 for flat trajectory', () => {
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    const slope = computeGrowthSlope([
      { dateMs: 0, tier: 2 },
      { dateMs: msPerYear, tier: 2 },
    ]);
    expect(slope).toBeCloseTo(0, 5);
  });
});

// ─── Trend Classification ────────────────────────────────────────────────────

describe('Evolution: classifyTrend', () => {
  it('rapid-growth for slope >= 0.5', () => expect(classifyTrend(0.5)).toBe('rapid-growth'));
  it('steady-growth for slope >= 0.15', () => expect(classifyTrend(0.2)).toBe('steady-growth'));
  it('plateau for slope >= -0.1', () => expect(classifyTrend(0)).toBe('plateau'));
  it('regression for slope < -0.1', () => expect(classifyTrend(-0.5)).toBe('regression'));
});

// ─── Main Entry Point ────────────────────────────────────────────────────────

describe('Evolution: analyzeEvolution', () => {
  it('returns null for 1 repo', () => {
    const repo = makeRepo({ name: 'a', createdAt: tsDate('2023-01-01') });
    expect(analyzeEvolution([repo])).toBeNull();
  });

  it('returns null for repos without dates', () => {
    expect(analyzeEvolution([
      makeRepo({ name: 'a', firstCommitAt: null, createdAt: null as never }),
      makeRepo({ name: 'b', firstCommitAt: null, createdAt: null as never }),
    ])).toBeNull();
  });

  it('returns profile for 2+ repos with growth', () => {
    const repos = [
      makeRepo({ name: 'old', primaryLanguage: 'javascript', createdAt: tsDate('2021-01-01') }),
      makeRepo({
        name: 'new', primaryLanguage: 'typescript', createdAt: tsDate('2023-06-01'),
        detectedFrameworks: ['next.js'], detectedTools: ['docker'],
        hasTestDirectory: true, estimatedTestCoverage: 'medium',
        detectedDependencies: ['vitest', 'postgresql'],
      }),
    ];

    const result = analyzeEvolution(repos);
    expect(result).not.toBeNull();
    expect(result!.reposSampled).toBe(2);
    expect(result!.growthVector).toBeGreaterThan(0);
    expect(result!.dimensions.techSophistication.trend).not.toBe('regression');
  });

  it('returns negative growth vector for regression', () => {
    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    const repos = [
      makeRepo({
        name: 'advanced', createdAt: tsDate('2020-01-01'),
        primaryLanguage: 'typescript', detectedFrameworks: ['next.js'],
        detectedTools: ['docker', 'kubernetes'], detectedDependencies: ['kafka', 'postgresql'],
        hasTestDirectory: true, estimatedTestCoverage: 'high',
      }),
      makeRepo({
        name: 'simple', createdAt: tsDate('2024-01-01'),
        primaryLanguage: 'python',
      }),
    ];

    const result = analyzeEvolution(repos);
    expect(result).not.toBeNull();
    expect(result!.growthVector).toBeLessThan(0);
  });

  it('caps trajectories at MAX_TRAJECTORY_POINTS', () => {
    const repos: Repository[] = [];
    for (let i = 0; i < 40; i++) {
      repos.push(makeRepo({
        name: `repo-${i}`,
        createdAt: tsDate(`20${String(i).padStart(2, '0')}-01-01`),
        primaryLanguage: 'javascript',
      }));
    }
    const result = analyzeEvolution(repos);
    expect(result).not.toBeNull();
    expect(result!.dimensions.techSophistication.trajectory.length).toBeLessThanOrEqual(30);
  });

  it('includes adoption timeline', () => {
    const repos = [
      makeRepo({
        name: 'a', createdAt: tsDate('2021-01-01'),
        primaryLanguage: 'javascript', detectedFrameworks: ['express'],
      }),
      makeRepo({
        name: 'b', createdAt: tsDate('2023-01-01'),
        primaryLanguage: 'typescript', detectedFrameworks: ['react'],
      }),
    ];
    const result = analyzeEvolution(repos)!;
    expect(result.adoptionTimeline.length).toBeGreaterThan(0);
    const langs = result.adoptionTimeline.filter((e) => e.category === 'language');
    expect(langs.length).toBeGreaterThanOrEqual(2);
  });
});
