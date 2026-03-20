/**
 * src/pipeline/scoring/scoring-helpers.ts — Scoring helper functions.
 *
 * Point conversion helpers for Phase 2 (import/quality) and Phase 3 (durability/behavioral/commit msg).
 * These are pure functions: no I/O, no Firestore, no side effects.
 */

import type { Repository, FrameworkDepthEntry } from '../../types/repository.js';

// ─── Phase 2: Import Validation + Code Quality ─────────────────────────────

const DEPTH_POINTS: Record<string, number> = {
  'beginner': 1, 'intermediate': 3, 'advanced': 5, 'expert': 8,
};

/** Computes framework depth points from best depth entry. Cap 8. */
export function computeFrameworkDepthPoints(
  entries: ReadonlyArray<{ depth: string }>,
): number {
  let best = 0;
  for (const e of entries) {
    const pts = DEPTH_POINTS[e.depth] ?? 0;
    if (pts > best) best = pts;
  }
  return Math.min(best, 8);
}

/** Converts logic code ratio (0-1) → 0-3 points. */
export function computeLogicRatioPoints(ratio: number | undefined): number {
  if (ratio === undefined || ratio === null) return 0;
  if (ratio >= 0.7) return 3;
  if (ratio >= 0.5) return 2;
  if (ratio >= 0.3) return 1;
  return 0;
}

const QUALITY_GRADE_POINTS: Record<string, number> = {
  'A': 8, 'B': 6, 'C': 4, 'D': 2, 'F': 0,
};

/** Converts code quality grade → 0-8 points. */
export function computeCodeQualityPoints(
  grade: string | undefined | null,
): number {
  if (!grade) return 0;
  return QUALITY_GRADE_POINTS[grade] ?? 0;
}

// ─── Phase 3: Code Durability ───────────────────────────────────────────────

/**
 * Computes durability points (0-12) from a candidate's repositories.
 * Weighted by commit count. Primary: 14d owner churn (0-8), secondary: rewrite ratio (0-4).
 */
export function computeDurabilityPoints(
  repos: ReadonlyArray<Pick<Repository, 'codeDurability' | 'commitCount'>>,
): number {
  const withData = repos.filter((r) => r.codeDurability != null && r.commitCount > 0);
  if (withData.length === 0) return 0;

  let weightedChurn = 0;
  let weightedRewrite = 0;
  let totalWeight = 0;

  for (const repo of withData) {
    const d = repo.codeDurability!;
    const weight = repo.commitCount;
    weightedChurn += d.ownerChurnRate14d * weight;
    weightedRewrite += d.rewriteRatio * weight;
    totalWeight += weight;
  }
  if (totalWeight === 0) return 0;

  const avgChurn = weightedChurn / totalWeight;
  const avgRewrite = weightedRewrite / totalWeight;

  let churnPoints: number;
  if (avgChurn <= 0.03) churnPoints = 8;
  else if (avgChurn <= 0.05) churnPoints = 6;
  else if (avgChurn <= 0.08) churnPoints = 4;
  else if (avgChurn <= 0.12) churnPoints = 2;
  else churnPoints = 0;

  let rewritePoints: number;
  if (avgRewrite > 0.7) rewritePoints = 0;                          // excessive rewrites
  else if (avgRewrite >= 0.2 && avgRewrite <= 0.5) rewritePoints = 4; // ideal range
  else if (avgRewrite > 0.5) rewritePoints = 2;                     // high-churn
  else if (avgRewrite >= 0.1) rewritePoints = 3;                    // moderate
  else rewritePoints = 1;                                           // near-zero (stale)

  return Math.min(churnPoints + rewritePoints, 12);
}

// ─── Phase 3: Behavioral Discipline ─────────────────────────────────────────

/**
 * Computes behavioral discipline points (0-5) from best repo.
 * Reduced from cap 8 → cap 5 (conventional/message sub-metrics moved to Spec 09).
 * Sub-metrics: atomic commits (0-2), type diversity (0-2), low remedy (0-1).
 */
export function computeBehavioralPoints(
  repos: ReadonlyArray<Pick<Repository, 'behavioralMetrics'>>,
): number {
  let bestPoints = 0;

  for (const repo of repos) {
    const m = repo.behavioralMetrics;
    if (!m) continue;

    let points = 0;
    if (m.commitSizeMedian <= 50) points += 2;
    else if (m.commitSizeMedian <= 150) points += 1;

    if (m.commitTypeDiversity >= 0.6) points += 2;
    else if (m.commitTypeDiversity >= 0.3) points += 1;

    if (m.remedyCommitRatio <= 0.05) points += 1;

    bestPoints = Math.max(bestPoints, points);
  }

  return Math.min(bestPoints, 5);
}

// ─── Phase 3: Commit Message Quality ────────────────────────────────────────

const MIN_COMMITS_FOR_SCORING = 20;

/**
 * Computes commit message quality points (0-8) from best eligible repo.
 * Requires ≥20 non-merge commits for scoring eligibility.
 * Formula: min(floor(qualityScore / 10), 8).
 */
export function computeCommitMessagePoints(
  repos: ReadonlyArray<Pick<Repository, 'commitMessageQuality'>>,
): number {
  const eligibleScores = repos
    .filter((r) =>
      r.commitMessageQuality &&
      r.commitMessageQuality.totalAnalyzed >= MIN_COMMITS_FOR_SCORING
    )
    .map((r) => r.commitMessageQuality!.qualityScore);

  if (eligibleScores.length === 0) return 0;
  const bestScore = Math.max(...eligibleScores);
  return Math.min(Math.floor(bestScore / 10), 8);
}

// ─── Candidate Aggregation Helpers ──────────────────────────────────────────

/** Collects Phase 3 data (durability, behavioral, commit messages) from all repos. */
export function collectPhase3Data(repos: ReadonlyArray<Repository>) {
  const churnRates14d: number[] = [];
  const churnRates90d: number[] = [];
  let bestBehavioralScore = 0;
  let bestCommitMsgScore: number | null = null;

  for (const repo of repos) {
    if (repo.codeDurability) {
      churnRates14d.push(repo.codeDurability.ownerChurnRate14d);
      churnRates90d.push(repo.codeDurability.ownerChurnRate90d);
    }
    if (repo.behavioralMetrics) {
      const score = computeBehavioralAggregate(repo.behavioralMetrics);
      if (score > bestBehavioralScore) bestBehavioralScore = score;
    }
    if (repo.commitMessageQuality) {
      const s = repo.commitMessageQuality.qualityScore;
      if (bestCommitMsgScore === null || s > bestCommitMsgScore) bestCommitMsgScore = s;
    }
  }

  const avgChurn14d = churnRates14d.length > 0
    ? Math.round((churnRates14d.reduce((a, b) => a + b, 0) / churnRates14d.length) * 1000) / 1000
    : null;
  const avgChurn90d = churnRates90d.length > 0
    ? Math.round((churnRates90d.reduce((a, b) => a + b, 0) / churnRates90d.length) * 1000) / 1000
    : null;

  return {
    codeDurabilityScore: avgChurn14d !== null ? classifyDurability(avgChurn14d) : null,
    avgChurnRate14d: avgChurn14d,
    avgChurnRate90d: avgChurn90d,
    behavioralScore: bestBehavioralScore > 0 ? bestBehavioralScore : null,
    commitDisciplineLevel: classifyDiscipline(bestBehavioralScore),
    commitMessageScore: bestCommitMsgScore,
  };
}

function computeBehavioralAggregate(
  m: NonNullable<Repository['behavioralMetrics']>,
): number {
  let pts = 0;
  if (m.commitSizeMedian <= 50) pts += 2;
  else if (m.commitSizeMedian <= 150) pts += 1;
  if (m.commitTypeDiversity >= 0.6) pts += 2;
  else if (m.commitTypeDiversity >= 0.3) pts += 1;
  if (m.remedyCommitRatio <= 0.05) pts += 1;
  return Math.min(pts, 5);
}

function classifyDurability(avgChurn14d: number): number {
  if (avgChurn14d <= 0.03) return 5;
  if (avgChurn14d <= 0.05) return 4;
  if (avgChurn14d <= 0.08) return 3;
  if (avgChurn14d <= 0.12) return 2;
  return 1;
}

function classifyDiscipline(score: number): 'low' | 'moderate' | 'high' | null {
  if (score === 0) return null;
  if (score >= 4) return 'high';
  if (score >= 2) return 'moderate';
  return 'low';
}

// ─── Phase 2 Dedup Helpers ──────────────────────────────────────────────────

const DEPTH_RANK: Record<string, number> = {
  'beginner': 0, 'intermediate': 1, 'advanced': 2, 'expert': 3,
};

/** Keeps only the best depth entry per framework across repos. */
export function deduplicateDepthEntries(entries: FrameworkDepthEntry[]): FrameworkDepthEntry[] {
  const best = new Map<string, FrameworkDepthEntry>();
  for (const e of entries) {
    const existing = best.get(e.frameworkId);
    if (!existing || (DEPTH_RANK[e.depth] ?? 0) > (DEPTH_RANK[existing.depth] ?? 0)) {
      best.set(e.frameworkId, e);
    }
  }
  return [...best.values()];
}

const QUALITY_GRADE_RANK: Record<string, number> = {
  'F': 0, 'D': 1, 'C': 2, 'B': 3, 'A': 4,
};

export function pickBestQuality(
  grades: string[], scores: number[],
): { grade: 'A' | 'B' | 'C' | 'D' | 'F' | null; score: number | null } {
  if (grades.length === 0) return { grade: null, score: null };
  let bestIdx = 0;
  for (let i = 1; i < grades.length; i++) {
    const curr = grades[i] ?? '';
    const best = grades[bestIdx] ?? '';
    if ((QUALITY_GRADE_RANK[curr] ?? 0) > (QUALITY_GRADE_RANK[best] ?? 0)) {
      bestIdx = i;
    }
  }
  return {
    grade: (grades[bestIdx] ?? null) as 'A' | 'B' | 'C' | 'D' | 'F' | null,
    score: scores[bestIdx] ?? null,
  };
}
