/**
 * src/pipeline/scoring/phase4-helpers.ts — Phase 4 scoring helpers.
 * Design pattern points, code style points, and Phase 4 candidate aggregation.
 */

import type { Repository } from '../../types/repository.js';
import { TIER_POINTS } from '../analysis/design-pattern-rules.js';

const TIER_RANK: Record<string, number> = {
  'none': 0, 'basic': 1, 'intermediate': 2, 'advanced': 3,
};

/** Computes design pattern points (0-10) from best repo sophistication tier. */
export function computeDesignPatternPoints(
  repos: ReadonlyArray<Pick<Repository, 'designSophisticationTier'>>,
): number {
  let bestTier = 'none';
  for (const repo of repos) {
    const tier = repo.designSophisticationTier ?? 'none';
    if ((TIER_RANK[tier] ?? 0) > (TIER_RANK[bestTier] ?? 0)) bestTier = tier;
  }
  return Math.min(TIER_POINTS[bestTier] ?? 0, 10);
}

/** Computes code style points (0-8) from best repo composite style score. */
export function computeCodeStylePoints(
  repos: ReadonlyArray<Pick<Repository, 'codeStyleMetrics'>>,
): number {
  let bestScore = 0;
  for (const repo of repos) {
    const score = repo.codeStyleMetrics?.compositeStyleScore ?? 0;
    if (score > bestScore) bestScore = score;
  }
  if (bestScore >= 76) return 8;
  if (bestScore >= 51) return 5;
  if (bestScore >= 31) return 2;
  return 0;
}

/** Collects Phase 4 data (design patterns, code style) from all repos. */
export function collectPhase4Data(repos: ReadonlyArray<Repository>) {
  const allPatternIds = new Set<string>();
  const allArchStyles = new Set<string>();
  let bestTier: 'none' | 'basic' | 'intermediate' | 'advanced' = 'none';
  let bestStyleScore: number | null = null;

  for (const repo of repos) {
    for (const signal of repo.designPatternSignals ?? []) {
      allPatternIds.add(signal.patternId);
    }
    if (repo.architectureStyle && repo.architectureStyle !== 'flat') {
      allArchStyles.add(repo.architectureStyle);
    }
    const tier = repo.designSophisticationTier ?? 'none';
    if ((TIER_RANK[tier] ?? 0) > (TIER_RANK[bestTier] ?? 0)) {
      bestTier = tier as typeof bestTier;
    }
    const styleScore = repo.codeStyleMetrics?.compositeStyleScore;
    if (styleScore != null && (bestStyleScore === null || styleScore > bestStyleScore)) {
      bestStyleScore = styleScore;
    }
  }

  return {
    designPatternDiversity: allPatternIds.size,
    designSophisticationTier: bestTier,
    architectureStyles: [...allArchStyles].sort(),
    codeStyleScore: bestStyleScore,
  };
}
