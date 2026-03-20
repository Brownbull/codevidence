/**
 * tests/unit/phase4-scoring-structure.test.ts
 *
 * Structural tests for Phase 4 scoring: design patterns + code style.
 * Verifies formula constants, handler integration, and candidate writer fields.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

describe('Phase 4: Score Formula Constants', () => {
  const src = readSource('src/pipeline/scoring/skill-score.ts');

  it('includes designPatternPoints in SkillScoreInput', () => {
    expect(src).toContain('designPatternPoints?: number');
  });

  it('includes codeStylePoints in SkillScoreInput', () => {
    expect(src).toContain('codeStylePoints?: number');
  });

  it('caps design pattern points at 10', () => {
    expect(src).toContain('designPatternPoints ?? 0, 10');
  });

  it('caps code style points at 8', () => {
    expect(src).toContain('codeStylePoints ?? 0, 8');
  });

  it('re-exports Phase 4 helpers from phase4-helpers', () => {
    expect(src).toContain('computeDesignPatternPoints');
    expect(src).toContain("from './phase4-helpers.js'");
  });
});

describe('Phase 4: Scan Repo Handler — Integration', () => {
  const src = readSource('src/pipeline/handlers/scan-repo.ts') +
    readSource('src/pipeline/handlers/scan-repo-helpers.ts');

  it('imports analyzeDesignPatterns', () => {
    expect(src).toContain("from '../analysis/design-patterns.js'");
    expect(src).toContain('analyzeDesignPatterns');
  });

  it('imports analyzeCodeStyle', () => {
    expect(src).toContain("from '../analysis/code-style.js'");
    expect(src).toContain('analyzeCodeStyle');
  });

  it('runs design patterns in Layer 2 Promise.all', () => {
    expect(src).toContain('analyzeDesignPatterns(cloneDir');
  });

  it('runs code style in Layer 1', () => {
    expect(src).toContain('analyzeCodeStyle(cloneDir');
  });

  it('writes design pattern fields to Repository doc', () => {
    expect(src).toContain('designPatternSignals: designResult.designPatternSignals');
    expect(src).toContain('architectureStyle: designResult.architectureStyle');
    expect(src).toContain('antiPatternCount: designResult.antiPatternCount');
    expect(src).toContain('designSophisticationTier: designResult.designSophisticationTier');
  });

  it('writes code style metrics to Repository doc in Layer 1', () => {
    expect(src).toContain('codeStyleMetrics: styleResult');
  });
});

describe('Phase 4: Candidate Writer Fields', () => {
  const src = readSource('src/pipeline/scoring/candidate-writer.ts');

  it('includes Phase 4 fields in AggregatedRepoData', () => {
    expect(src).toContain('designPatternDiversity');
    expect(src).toContain('designSophisticationTier');
    expect(src).toContain('architectureStyles');
    expect(src).toContain('codeStyleScore');
  });

  it('collects Phase 4 data in aggregation', () => {
    expect(src).toContain('collectPhase4Data');
  });

  it('imports from phase4-helpers', () => {
    expect(src).toContain("from './phase4-helpers.js'");
  });
});

describe('Phase 4: Phase4 Helpers', () => {
  const src = readSource('src/pipeline/scoring/phase4-helpers.ts');

  it('exports computeDesignPatternPoints', () => {
    expect(src).toContain('export function computeDesignPatternPoints');
  });

  it('exports computeCodeStylePoints', () => {
    expect(src).toContain('export function computeCodeStylePoints');
  });

  it('exports collectPhase4Data', () => {
    expect(src).toContain('export function collectPhase4Data');
  });

  it('uses tier ranking for design pattern points', () => {
    expect(src).toContain('TIER_RANK');
    expect(src).toContain('TIER_POINTS');
  });
});
