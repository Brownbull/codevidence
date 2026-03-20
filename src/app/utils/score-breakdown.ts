/**
 * src/app/utils/score-breakdown.ts — Client-side score breakdown reconstruction.
 *
 * Mirrors the pipeline's computeSkillScore formula to produce a per-component
 * breakdown from Candidate + Repository[] data already loaded in the browser.
 * All functions are pure — no I/O, no Firestore, no Node.js APIs.
 */

import type { Candidate } from '@/types/candidate';
import type { Repository } from '@/types/repository';
import { getMethodology, PHASE_LABELS } from './score-methodology';

export interface ScoreComponent {
  id: string;
  label: string;
  points: number;
  maxPoints: number;
  phase: 'core' | 'phase2' | 'phase3' | 'phase4' | 'phase5';
  /** Human-readable explanation of what this component measures and how it's scored. */
  description: string;
  /** Position weight: 0=irrelevant, 1=minor, 2=important, 3=critical. Undefined = general view. */
  weight?: 0 | 1 | 2 | 3;
}

export interface PhaseSubtotal {
  points: number;
  max: number;
  label: string;
}

export interface ScoreBreakdown {
  total: number;
  rawTotal: number;
  components: ScoreComponent[];
  phaseSubtotals: Record<string, PhaseSubtotal>;
  /** If a position filter is applied, the weighted normalized score (0-100). */
  weightedTotal?: number;
  /** Position ID used for weighting, if any. */
  positionId?: string;
}

const QUALIFYING_CONFIDENCE = 0.5;
const DEPTH_POINTS: Record<string, number> = { beginner: 1, intermediate: 3, advanced: 5, expert: 8 };
const QUALITY_POINTS: Record<string, number> = { A: 8, B: 6, C: 4, D: 2, F: 0 };
const TIER_POINTS: Record<string, number> = { none: 0, basic: 3, intermediate: 6, advanced: 10 };
const TEST_POINTS: Record<string, number> = { none: 0, low: 2, medium: 5, high: 10 };

export function reconstructScoreBreakdown(
  candidate: Candidate,
  repos: (Repository & { id: string })[],
): ScoreBreakdown {
  const c: ScoreComponent[] = [];
  const add = (
    id: string, points: number, max: number, phase: ScoreComponent['phase'],
  ) => {
    const m = getMethodology(id);
    c.push({
      id, label: m?.name ?? id, points: Math.min(points, max), maxPoints: max, phase,
      description: m?.summary ?? '',
    });
  };

  // Core
  add('language', candidate.detectedLanguages.length > 0 ? 15 : 0, 15, 'core');
  add('frameworks', candidate.detectedFrameworks.length * 4, 20, 'core');
  add('tools', candidate.detectedTools.length * 3, 9, 'core');
  add('commitSpan', candidate.commitSpanMonths, 7, 'core');
  add('ownership', repos.some((r) => r.isOwnerRepo) ? 8 : 0, 8, 'core');
  add('tests', bestTestPoints(repos), 10, 'core');
  add('aiSignals', computeAiSignalPoints(candidate), 7, 'core');
  add('proficiency', candidate.proficiencyBonus ?? 0, 14, 'core');
  add('domain', countDomainPoints(candidate), 10, 'core');

  // Phase 2
  add('importConfirm', (candidate.confirmedFrameworks?.length ?? 0) * 2, 6, 'phase2');
  add('frameworkDepth', bestFrameworkDepthPoints(candidate), 8, 'phase2');
  add('logicRatio', logicRatioPoints(candidate.avgLogicCodeRatio), 3, 'phase2');
  add('codeQuality', QUALITY_POINTS[candidate.codeQualityGrade ?? ''] ?? 0, 8, 'phase2');

  // Phase 3
  add('durability', computeDurabilityPoints(repos), 12, 'phase3');
  add('behavioral', computeBehavioralPoints(repos), 5, 'phase3');
  add('commitMessage', computeCommitMessagePoints(repos), 8, 'phase3');

  // Phase 4
  add('designPatterns', bestDesignPatternPoints(repos), 10, 'phase4');
  add('codeStyle', bestCodeStylePoints(repos), 8, 'phase4');

  // Phase 5
  add('evolution', candidate.evolutionBonus ?? 0, 8, 'phase5');

  const rawTotal = c.reduce((sum, comp) => sum + comp.points, 0);
  const total = Math.max(0, Math.min(100, rawTotal));

  return { total, rawTotal, components: c, phaseSubtotals: buildPhaseSubtotals(c) };
}

function buildPhaseSubtotals(components: ScoreComponent[]): Record<string, PhaseSubtotal> {
  const result: Record<string, PhaseSubtotal> = {};
  for (const phase of ['core', 'phase2', 'phase3', 'phase4', 'phase5']) {
    const group = components.filter((c) => c.phase === phase);
    result[phase] = {
      points: group.reduce((s, c) => s + c.points, 0),
      max: group.reduce((s, c) => s + c.maxPoints, 0),
      label: PHASE_LABELS[phase]?.label ?? phase,
    };
  }
  return result;
}

// ─── Helper functions mirroring pipeline scoring ────────────────────────────

function bestTestPoints(repos: (Repository & { id: string })[]): number {
  let best = 0;
  for (const r of repos) best = Math.max(best, TEST_POINTS[r.estimatedTestCoverage] ?? 0);
  return best;
}

/**
 * Uses candidate.aiAgentPatterns (already computed by pipeline) to derive AI signal points.
 * This avoids reimplementing mapConfigFileToPattern and guarantees match with stored score.
 */
function computeAiSignalPoints(candidate: Candidate): number {
  const patterns = candidate.aiAgentPatterns ?? [];
  const CO_AUTHORED_ID = 'ai-agent-pattern:co-authored-by-ai';
  const hasCoAuthored = patterns.includes(CO_AUTHORED_ID);
  const filePatternCount = patterns.filter((p) => p !== CO_AUTHORED_ID).length;
  return Math.min(filePatternCount * 2 + (hasCoAuthored ? 3 : 0), 7);
}

function countDomainPoints(candidate: Candidate): number {
  const qualifying = (candidate.detectedDomains ?? []).filter((d) => d.confidence >= QUALIFYING_CONFIDENCE);
  return qualifying.length * 5;
}

function bestFrameworkDepthPoints(candidate: Candidate): number {
  let best = 0;
  for (const e of candidate.frameworkDepthSummary ?? []) {
    best = Math.max(best, DEPTH_POINTS[e.depth] ?? 0);
  }
  return best;
}

function logicRatioPoints(ratio: number | undefined): number {
  if (ratio === undefined || ratio === null) return 0;
  if (ratio >= 0.7) return 3;
  if (ratio >= 0.5) return 2;
  if (ratio >= 0.3) return 1;
  return 0;
}

function computeDurabilityPoints(repos: (Repository & { id: string })[]): number {
  const withData = repos.filter((r) => r.codeDurability != null && r.commitCount > 0);
  if (withData.length === 0) return 0;
  let wChurn = 0, wRewrite = 0, wTotal = 0;
  for (const r of withData) {
    const d = r.codeDurability!;
    wChurn += d.ownerChurnRate14d * r.commitCount;
    wRewrite += d.rewriteRatio * r.commitCount;
    wTotal += r.commitCount;
  }
  if (wTotal === 0) return 0;
  const avgChurn = wChurn / wTotal;
  const avgRewrite = wRewrite / wTotal;
  let churnPts = avgChurn <= 0.03 ? 8 : avgChurn <= 0.05 ? 6 : avgChurn <= 0.08 ? 4 : avgChurn <= 0.12 ? 2 : 0;
  let rewritePts: number;
  if (avgRewrite > 0.7) rewritePts = 0;
  else if (avgRewrite >= 0.2 && avgRewrite <= 0.5) rewritePts = 4;
  else if (avgRewrite > 0.5) rewritePts = 2;
  else if (avgRewrite >= 0.1) rewritePts = 3;
  else rewritePts = 1;
  return Math.min(churnPts + rewritePts, 12);
}

function computeBehavioralPoints(repos: (Repository & { id: string })[]): number {
  let best = 0;
  for (const r of repos) {
    const m = r.behavioralMetrics;
    if (!m) continue;
    let pts = 0;
    if (m.commitSizeMedian <= 50) pts += 2; else if (m.commitSizeMedian <= 150) pts += 1;
    if (m.commitTypeDiversity >= 0.6) pts += 2; else if (m.commitTypeDiversity >= 0.3) pts += 1;
    if (m.remedyCommitRatio <= 0.05) pts += 1;
    best = Math.max(best, pts);
  }
  return Math.min(best, 5);
}

function computeCommitMessagePoints(repos: (Repository & { id: string })[]): number {
  const scores = repos
    .filter((r) => r.commitMessageQuality && r.commitMessageQuality.totalAnalyzed >= 20)
    .map((r) => r.commitMessageQuality!.qualityScore);
  if (scores.length === 0) return 0;
  return Math.min(Math.floor(Math.max(...scores) / 10), 8);
}

function bestDesignPatternPoints(repos: (Repository & { id: string })[]): number {
  const TIER_RANK: Record<string, number> = { none: 0, basic: 1, intermediate: 2, advanced: 3 };
  let bestTier = 'none';
  for (const r of repos) {
    const tier = r.designSophisticationTier ?? 'none';
    if ((TIER_RANK[tier] ?? 0) > (TIER_RANK[bestTier] ?? 0)) bestTier = tier;
  }
  return TIER_POINTS[bestTier] ?? 0;
}

function bestCodeStylePoints(repos: (Repository & { id: string })[]): number {
  let best = 0;
  for (const r of repos) {
    best = Math.max(best, r.codeStyleMetrics?.compositeStyleScore ?? 0);
  }
  if (best >= 76) return 8;
  if (best >= 51) return 5;
  if (best >= 31) return 2;
  return 0;
}

// ─── Position-weighted scoring ──────────────────────────────────────────────

import type { PositionProfile } from './position-weights';

/**
 * Applies position weights to a general score breakdown and normalizes to 0-100.
 *
 * Formula: weightedTotal = sum(points_i * weight_i) / sum(maxPoints_i * weight_i) * 100
 * Components with weight=0 are excluded from both numerator and denominator.
 */
export function applyPositionWeights(
  breakdown: ScoreBreakdown,
  position: PositionProfile,
): ScoreBreakdown {
  const weightMap = new Map(position.weights.map((w) => [w.componentId, w.weight]));

  const weightedComponents = breakdown.components.map((comp) => ({
    ...comp,
    weight: weightMap.get(comp.id) ?? (1 as 0 | 1 | 2 | 3),
  }));

  let weightedNumerator = 0;
  let weightedDenominator = 0;
  for (const comp of weightedComponents) {
    if (comp.weight === 0) continue;
    weightedNumerator += comp.points * comp.weight;
    weightedDenominator += comp.maxPoints * comp.weight;
  }

  const weightedTotal = weightedDenominator > 0
    ? Math.round((weightedNumerator / weightedDenominator) * 100)
    : 0;

  return {
    ...breakdown,
    components: weightedComponents,
    phaseSubtotals: buildWeightedPhaseSubtotals(weightedComponents),
    weightedTotal,
    positionId: position.id,
  };
}

function buildWeightedPhaseSubtotals(
  components: (ScoreComponent & { weight?: number })[],
): Record<string, PhaseSubtotal> {
  const result: Record<string, PhaseSubtotal> = {};
  for (const phase of ['core', 'phase2', 'phase3', 'phase4', 'phase5']) {
    const group = components.filter((c) => c.phase === phase);
    const active = group.filter((c) => (c.weight ?? 1) > 0);
    result[phase] = {
      points: active.reduce((s, c) => s + c.points, 0),
      max: active.reduce((s, c) => s + c.maxPoints, 0),
      label: PHASE_LABELS[phase]?.label ?? phase,
    };
  }
  return result;
}
