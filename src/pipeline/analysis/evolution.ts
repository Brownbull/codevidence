/**
 * src/pipeline/analysis/evolution.ts — Cross-repository evolution analysis.
 * Computes growth trajectories across 4 dimensions over time → growth vector (-1..+1).
 * Pure computation on Repository data — zero API costs, <5ms.
 */

import type { Repository } from '../../types/repository.js';
import type {
  EvolutionProfile,
  EvolutionDimension,
  AdoptionEvent,
} from '../../types/candidate.js';
import {
  TYPED_LANGUAGES, FRAMEWORK_TIER, INFRA_TOOLS, DISTRIBUTED_TOOLS,
  TEST_FRAMEWORK_DEPS, E2E_DEPS, CI_TOOLS,
  DB_DEPS, QUEUE_DEPS, CACHE_DEPS, ORCHESTRATION_TOOLS,
  DIMENSION_WEIGHTS, TREND_THRESHOLDS,
  MAX_TRAJECTORY_POINTS, MAX_ADOPTION_EVENTS,
} from './evolution-tiers.js';

// Re-export for tests
export { DIMENSION_WEIGHTS, TREND_THRESHOLDS } from './evolution-tiers.js';

// ─── Public API ──────────────────────────────────────────────

/**
 * Analyzes cross-repo evolution for a candidate.
 * Returns null if fewer than 2 repos with dates are available.
 */
export function analyzeEvolution(
  repos: ReadonlyArray<Repository>,
): EvolutionProfile | null {
  const sorted = sortReposByDate(repos);
  if (sorted.length < 2) return null;

  const techTrajectory = buildTrajectory(sorted, computeTechSophisticationTier);
  const testTrajectory = buildTrajectory(sorted, computeTestingMaturityTier);
  const archTrajectory = buildTrajectory(sorted, computeArchitectureTier);
  const aiTrajectory = buildTrajectory(sorted, computeAiAdoptionTier);

  const techDim = buildDimension(techTrajectory);
  const testDim = buildDimension(testTrajectory);
  const archDim = buildDimension(archTrajectory);
  const aiDim = buildDimension(aiTrajectory);

  const rawVector =
    techDim.slope * DIMENSION_WEIGHTS.techSophistication +
    testDim.slope * DIMENSION_WEIGHTS.testingMaturity +
    archDim.slope * DIMENSION_WEIGHTS.architectureComplexity +
    aiDim.slope * DIMENSION_WEIGHTS.aiAdoption;

  const growthVector = Math.max(-1, Math.min(1, rawVector));

  return {
    growthVector,
    dimensions: {
      techSophistication: techDim,
      testingMaturity: testDim,
      architectureComplexity: archDim,
      aiAdoption: aiDim,
    },
    adoptionTimeline: buildAdoptionTimeline(sorted),
    reposSampled: sorted.length,
    earliestRepoDate: sorted[0]!.date,
    latestRepoDate: sorted[sorted.length - 1]!.date,
  };
}

/** Computes evolution bonus (0-8). Returns 0 for null profiles. */
export function computeEvolutionBonus(
  profile: EvolutionProfile | null,
): number {
  if (!profile) return 0;

  // Growth vector contribution: 0-4
  let vectorPts: number;
  if (profile.growthVector >= 0.5) vectorPts = 4;
  else if (profile.growthVector >= 0.3) vectorPts = 3;
  else if (profile.growthVector >= 0.15) vectorPts = 2;
  else if (profile.growthVector >= 0) vectorPts = 1;
  else vectorPts = 0;

  // Breadth: count positive-trend dimensions (0-2, capped)
  const dims = profile.dimensions;
  let positiveDims = 0;
  for (const dim of [dims.techSophistication, dims.testingMaturity, dims.architectureComplexity, dims.aiAdoption]) {
    if (dim.trend === 'rapid-growth' || dim.trend === 'steady-growth') positiveDims++;
  }
  const breadthPts = Math.min(positiveDims, 2);

  // Time span: 0-2
  const spanMs = new Date(profile.latestRepoDate).getTime() - new Date(profile.earliestRepoDate).getTime();
  const spanYears = spanMs / (365.25 * 24 * 60 * 60 * 1000);
  let spanPts: number;
  if (spanYears >= 3) spanPts = 2;
  else if (spanYears >= 1) spanPts = 1;
  else spanPts = 0;

  return Math.min(vectorPts + breadthPts + spanPts, 8);
}

// ─── Tier Computation Functions ─────────────────────────────

/** Tech sophistication tier: 1-5. */
export function computeTechSophisticationTier(repo: Repository): number {
  const lang = repo.primaryLanguage?.toLowerCase() ?? '';
  const fws = new Set((repo.detectedFrameworks ?? []).map((f) => f.toLowerCase()));
  const tools = new Set((repo.detectedTools ?? []).map((t) => t.toLowerCase()));
  const deps = new Set((repo.detectedDependencies ?? []).map((d) => d.toLowerCase()));

  const allTools = new Set([...tools, ...deps]);
  const infraCount = [...allTools].filter((t) => INFRA_TOOLS.has(t)).length;
  const distCount = [...allTools].filter((t) => DISTRIBUTED_TOOLS.has(t)).length;
  if (infraCount >= 2 && distCount >= 1) return 5;

  // Typed languages get a floor of tier 3 when any framework is present
  const typedFloor = TYPED_LANGUAGES.has(lang) ? 3 : 0;
  const fwArray = [...fws];
  for (const entry of FRAMEWORK_TIER) {
    if (fwArray.some((f) => entry.names.has(f))) return Math.max(entry.tier, typedFloor);
  }

  if (typedFloor > 0 && fws.size > 0) return typedFloor;
  if (fws.size > 0) return 2;
  return 1;
}

/** Testing maturity tier: 0-4. */
export function computeTestingMaturityTier(repo: Repository): number {
  const tools = new Set((repo.detectedTools ?? []).map((t) => t.toLowerCase()));
  const deps = new Set((repo.detectedDependencies ?? []).map((d) => d.toLowerCase()));
  const allDeps = new Set([...tools, ...deps]);

  const hasTestFw = [...allDeps].some((d) => TEST_FRAMEWORK_DEPS.has(d));
  const hasE2e = [...allDeps].some((d) => E2E_DEPS.has(d));
  const hasCi = [...allDeps].some((d) => CI_TOOLS.has(d));
  const coverage = repo.estimatedTestCoverage ?? 'none';

  if (coverage === 'high' && hasCi && hasE2e) return 4;
  if (coverage === 'medium' || coverage === 'high') return 3;
  if (hasTestFw && coverage !== 'none') return 2;
  if (repo.hasTestDirectory || hasTestFw) return 1;
  return 0;
}

/** Architecture complexity tier: 1-4. */
export function computeArchitectureTier(repo: Repository): number {
  const fws = new Set((repo.detectedFrameworks ?? []).map((f) => f.toLowerCase()));
  const tools = new Set((repo.detectedTools ?? []).map((t) => t.toLowerCase()));
  const deps = new Set((repo.detectedDependencies ?? []).map((d) => d.toLowerCase()));
  const allDeps = new Set([...tools, ...deps]);

  const hasDocker = allDeps.has('docker');
  const hasOrch = [...allDeps].some((d) => ORCHESTRATION_TOOLS.has(d));
  const hasQueue = [...allDeps].some((d) => QUEUE_DEPS.has(d));
  const hasDb = [...allDeps].some((d) => DB_DEPS.has(d));
  const hasCache = [...allDeps].some((d) => CACHE_DEPS.has(d));

  if (hasDocker && (hasOrch || hasQueue)) return 4;
  if (fws.size > 0 && hasDb && (hasCache || hasQueue)) return 3;
  if (fws.size > 0 && hasDb) return 2;
  return 1;
}

/** AI adoption tier: 0-3. */
export function computeAiAdoptionTier(repo: Repository): number {
  const configCount = (repo.aiConfigFiles ?? []).length;
  const coAuthored = repo.coAuthoredByAI ?? false;
  const hasEvolved = (repo.aiConfigFiles ?? []).some((c) => c.isEvolved);

  if (hasEvolved && coAuthored) return 3;
  if (configCount >= 2 || coAuthored) return 2;
  if (configCount >= 1) return 1;
  return 0;
}

// ─── Growth Calculation ─────────────────────────────────────

/** OLS linear regression slope in tier-units per year. */
export function computeGrowthSlope(
  trajectory: ReadonlyArray<{ dateMs: number; tier: number }>,
): number {
  if (trajectory.length < 2) return 0;
  const first = trajectory[0]!.dateMs;
  const last = trajectory[trajectory.length - 1]!.dateMs;
  if (last === first) return 0;

  const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
  const n = trajectory.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumXX = 0;

  for (const pt of trajectory) {
    const x = (pt.dateMs - first) / msPerYear;
    sumX += x;
    sumY += pt.tier;
    sumXY += x * pt.tier;
    sumXX += x * x;
  }

  const denom = n * sumXX - sumX * sumX;
  if (Math.abs(denom) < 1e-10) return 0;
  return (n * sumXY - sumX * sumY) / denom;
}

export function classifyTrend(
  slope: number,
): 'rapid-growth' | 'steady-growth' | 'plateau' | 'regression' {
  if (slope >= TREND_THRESHOLDS.rapidGrowth) return 'rapid-growth';
  if (slope >= TREND_THRESHOLDS.steadyGrowth) return 'steady-growth';
  if (slope >= TREND_THRESHOLDS.plateau) return 'plateau';
  return 'regression';
}

// ─── Internals ──────────────────────────────────────────────

interface DatedRepo { repo: Repository; date: string; dateMs: number }

function sortReposByDate(repos: ReadonlyArray<Repository>): DatedRepo[] {
  const dated: DatedRepo[] = [];
  for (const repo of repos) {
    const dateStr = getRepoDate(repo);
    if (!dateStr) continue;
    dated.push({ repo, date: dateStr, dateMs: new Date(dateStr).getTime() });
  }
  dated.sort((a, b) => a.dateMs - b.dateMs);
  return dated;
}

/** Extract ISO date string from a Firestore Timestamp (browser or Admin SDK shapes). */
function getRepoDate(repo: Repository): string | null {
  return timestampToIso(repo.firstCommitAt) ?? timestampToIso(repo.createdAt);
}

function timestampToIso(val: unknown): string | null {
  if (val == null) return null;
  const ts = val as { toDate?: () => Date; seconds?: number; _seconds?: number };
  if (typeof ts.toDate === 'function') return ts.toDate().toISOString();
  if (typeof ts.seconds === 'number') return new Date(ts.seconds * 1000).toISOString();
  if (typeof ts._seconds === 'number') return new Date(ts._seconds * 1000).toISOString();
  return null;
}

function buildTrajectory(
  sorted: DatedRepo[],
  tierFn: (repo: Repository) => number,
): Array<{ date: string; dateMs: number; tier: number; repoName: string }> {
  const points = sorted.map((d) => ({
    date: d.date,
    dateMs: d.dateMs,
    tier: tierFn(d.repo),
    repoName: d.repo.name,
  }));
  return points.slice(-MAX_TRAJECTORY_POINTS);
}

function buildDimension(
  trajectory: Array<{ date: string; dateMs: number; tier: number; repoName: string }>,
): EvolutionDimension {
  const slope = computeGrowthSlope(trajectory);
  return {
    trajectory: trajectory.map((p) => ({ date: p.date, tier: p.tier, repoName: p.repoName })),
    slope,
    trend: classifyTrend(slope),
  };
}

function buildAdoptionTimeline(sorted: DatedRepo[]): AdoptionEvent[] {
  const seen = new Set<string>();
  const events: AdoptionEvent[] = [];

  const addEvent = (date: string, id: string, name: string, cat: AdoptionEvent['category']) => {
    if (seen.has(id) || events.length >= MAX_ADOPTION_EVENTS) return;
    seen.add(id);
    events.push({ date, taxonomyId: id, repoName: name, category: cat });
  };

  for (const { repo, date } of sorted) {
    if (repo.primaryLanguage) {
      addEvent(date, ensurePrefix('language', repo.primaryLanguage), repo.name, 'language');
    }
    for (const fw of repo.detectedFrameworks ?? []) {
      if (events.length >= MAX_ADOPTION_EVENTS) break;
      addEvent(date, ensurePrefix('framework', fw), repo.name, 'framework');
    }
    for (const tool of repo.detectedTools ?? []) {
      if (events.length >= MAX_ADOPTION_EVENTS) break;
      addEvent(date, ensurePrefix('tool', tool), repo.name, 'tool');
    }
    if (events.length >= MAX_ADOPTION_EVENTS) break;
  }
  return events;
}

/** Ensures a taxonomy ID has the expected prefix (idempotent). */
function ensurePrefix(prefix: string, id: string): string {
  const lower = id.toLowerCase();
  return lower.startsWith(`${prefix}:`) ? lower : `${prefix}:${lower}`;
}
