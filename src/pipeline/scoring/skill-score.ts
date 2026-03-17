/**
 * src/pipeline/scoring/skill-score.ts — Skill Score computation and candidate profile orchestration.
 *
 * Deterministic Skill Score formula + profile orchestrator.
 * Pipeline scoring output MUST NOT include aiMaturityScore fields.
 * This is enforced via the PipelineScoringOutput type.
 *
 * Candidate aggregation and Firestore persistence: see candidate-writer.ts
 */

import type { Repository } from '../../types/repository.js';
import type { Candidate } from '../../types/candidate.js';
import { createGitHubAdapter } from '../../adapters/github.js';
import { queryDocs, where } from '../../core/db/firestore.js';
import {
  inferDomains,
  countQualifyingDomains,
  QUALIFYING_CONFIDENCE,
} from './domain-inference.js';
import { mapConfigFileToPattern } from '../analysis/ai-config-patterns.js';
import { aggregateRepoData, writeCandidateDoc } from './candidate-writer.js';
import {
  computeFrameworkDepthPoints,
  computeLogicRatioPoints,
  computeCodeQualityPoints,
  computeDurabilityPoints,
  computeBehavioralPoints,
  computeCommitMessagePoints,
} from './scoring-helpers.js';
import {
  computeDesignPatternPoints,
  computeCodeStylePoints,
} from './phase4-helpers.js';
import { analyzeEvolution, computeEvolutionBonus } from '../analysis/evolution.js';

const REPOSITORIES_COLLECTION = 'repositories';

// Re-export for backward compat with existing callers/tests
export { mapConfigFileToPattern };

// ─── Types ───────────────────────────────────────────────────────────────────

/** Clean input for the deterministic skill scoring function. */
export interface SkillScoreInput {
  hasLanguage: boolean;
  frameworkCount: number;
  toolCount: number;
  commitSpanMonths: number;
  isOwnerRepo: boolean;
  estimatedTestCoverage: 'none' | 'low' | 'medium' | 'high';
  aiSignalPoints: number;
  proficiencyBonus?: number;
  domainPoints?: number;
  // Phase 2: Import validation + code quality
  confirmedFrameworkCount?: number;  // confirmed via actual imports (cap 6)
  frameworkDepthPoints?: number;     // depth-level bonus (cap 8)
  logicCodeRatioPoints?: number;     // logic code ratio bonus (0-3)
  codeQualityPoints?: number;        // code quality grade bonus (cap 8)
  // Phase 3: Git history analysis
  codeDurabilityPoints?: number;     // churn rate + rewrite ratio (cap 12)
  behavioralPoints?: number;         // atomic commits + type diversity + remedy (cap 5)
  commitMessagePoints?: number;      // commit message quality (cap 8)
  // Phase 4: Architecture + style
  designPatternPoints?: number;      // design sophistication tier (cap 10)
  codeStylePoints?: number;          // code style discipline (cap 8)
  // Phase 5: Cross-repo evolution
  evolutionBonus?: number;           // growth vector + breadth + span (cap 8)
}

/**
 * Pipeline scoring output type — TypeScript-enforces absence of aiMaturity fields.
 * Pipeline code MUST use this type, never the full Candidate type for writes.
 */
export type PipelineScoringOutput = Omit<
  Candidate,
  'aiMaturityScore' | 'aiMaturityScoredAt' | 'aiMaturityScoredBy'
>;

// ─── Score Constants ─────────────────────────────────────────────────────────

export const TEST_COVERAGE_POINTS: Record<string, number> = {
  'none': 0,
  'low': 2,
  'medium': 5,
  'high': 10,
};

// ─── Skill Score Computation ─────────────────────────────────────────────────

/**
 * Computes the Skill Score using the deterministic formula.
 *
 * Core formula (max = 100):
 *   primaryLanguage (15) + frameworks (4 each, capped 20) +
 *   tools (3 each, capped 9) + commitSpan (capped 7) +
 *   ownership bonus (8) + test coverage (0/2/5/10) +
 *   AI signals (capped 7) + proficiency bonus (capped 14) +
 *   domain expertise (capped 10)
 *
 * Phase 2 extras (differentiation beyond 90+):
 *   confirmed imports (2 each, capped 6) +
 *   framework depth (capped 8) +
 *   logic code ratio (0-3) +
 *   code quality grade (capped 8)
 *
 * Phase 3 extras (git history analysis):
 *   code durability (capped 12) +
 *   behavioral discipline (capped 5) +
 *   commit message quality (capped 8)
 *
 * Phase 4 extras (architecture + style):
 *   design pattern sophistication (capped 10) +
 *   code style discipline (capped 8)
 *
 * Phase 5 extras (cross-repo evolution):
 *   evolution bonus: growth vector + breadth + span (capped 8)
 *
 * Theoretical max ~176, clamped to 100.
 */
export function computeSkillScore(input: SkillScoreInput): number {
  const languagePoints = input.hasLanguage ? 15 : 0;
  const frameworkPoints = Math.min(input.frameworkCount * 4, 20);
  const toolPoints = Math.min(input.toolCount * 3, 9);
  const commitSpanPoints = Math.min(input.commitSpanMonths, 7);
  const ownershipPoints = input.isOwnerRepo ? 8 : 0;
  const testPoints = TEST_COVERAGE_POINTS[input.estimatedTestCoverage] ?? 0;
  const aiPoints = Math.min(input.aiSignalPoints, 7);
  const proficiencyPoints = Math.min(input.proficiencyBonus ?? 0, 14);
  const domainPts = Math.min(input.domainPoints ?? 0, 10);

  // Phase 2: import validation + code quality
  const importConfirmPts = Math.min((input.confirmedFrameworkCount ?? 0) * 2, 6);
  const depthPts = Math.min(input.frameworkDepthPoints ?? 0, 8);
  const logicRatioPts = Math.min(input.logicCodeRatioPoints ?? 0, 3);
  const qualityPts = Math.min(input.codeQualityPoints ?? 0, 8);

  // Phase 3: git history analysis
  const durabilityPts = Math.min(input.codeDurabilityPoints ?? 0, 12);
  const behavioralPts = Math.min(input.behavioralPoints ?? 0, 5);
  const commitMsgPts = Math.min(input.commitMessagePoints ?? 0, 8);

  // Phase 4: architecture + style
  const designPts = Math.min(input.designPatternPoints ?? 0, 10);
  const stylePts = Math.min(input.codeStylePoints ?? 0, 8);

  // Phase 5: cross-repo evolution
  const evolutionPts = Math.min(input.evolutionBonus ?? 0, 8);

  const total = languagePoints + frameworkPoints + toolPoints +
    commitSpanPoints + ownershipPoints + testPoints + aiPoints +
    proficiencyPoints + domainPts +
    importConfirmPts + depthPts + logicRatioPts + qualityPts +
    durabilityPts + behavioralPts + commitMsgPts +
    designPts + stylePts + evolutionPts;

  return Math.max(0, Math.min(100, total));
}

/**
 * Computes the AI signal points from repositories.
 * Each unique AI agent pattern: 2 points. coAuthoredByAI: 3 points. Cap 7.
 */
export function computeAiSignalPoints(
  repos: ReadonlyArray<Pick<Repository, 'aiConfigFiles' | 'coAuthoredByAI'>>
): number {
  const uniquePatterns = new Set<string>();
  let hasCoAuthored = false;

  for (const repo of repos) {
    if (repo.coAuthoredByAI) hasCoAuthored = true;
    for (const signal of repo.aiConfigFiles ?? []) {
      const pattern = mapConfigFileToPattern(signal.fileName);
      if (pattern) uniquePatterns.add(pattern);
    }
  }

  const filePoints = uniquePatterns.size * 2;
  const coAuthoredPoints = hasCoAuthored ? 3 : 0;
  return Math.min(filePoints + coAuthoredPoints, 7);
}

// Re-export scoring helpers for backward compat with existing callers/tests
export {
  computeFrameworkDepthPoints,
  computeLogicRatioPoints,
  computeCodeQualityPoints,
  computeDurabilityPoints,
  computeBehavioralPoints,
  computeCommitMessagePoints,
} from './scoring-helpers.js';
export {
  computeDesignPatternPoints,
  computeCodeStylePoints,
} from './phase4-helpers.js';
export { analyzeEvolution, computeEvolutionBonus } from '../analysis/evolution.js';

// ─── Candidate Profile Orchestrator ──────────────────────────────────────────

/**
 * Aggregates data from all repos for a given owner and builds/updates the Candidate.
 * Called after Layer 2 analysis completes for a repo.
 */
export async function updateCandidateProfile(owner: string): Promise<void> {
  // Parallelize independent network calls (Rule 7)
  const [repos, userProfile] = await Promise.all([
    queryDocs<Repository>(REPOSITORIES_COLLECTION, where('owner', '==', owner)),
    fetchUserProfileSafe(owner),
  ]);
  const scannedRepos = repos.filter((r) =>
    r.scanStatus === 'layer1' || r.scanStatus === 'layer2'
  );
  if (scannedRepos.length === 0) {
    console.log(`[skill-score] No scanned repos for ${owner}, skipping.`);
    return;
  }

  const aggregated = aggregateRepoData(scannedRepos);
  const aiSignalPoints = computeAiSignalPoints(scannedRepos);
  const detectedDomains = inferDomains(
    aggregated.languages, aggregated.frameworks,
    aggregated.tools, aggregated.topics,
    aggregated.aiAgentPatterns,
  );
  const domainPoints = Math.min(countQualifyingDomains(detectedDomains) * 5, 10);

  const evolutionProfile = analyzeEvolution(scannedRepos);
  const evolutionBonusPts = computeEvolutionBonus(evolutionProfile);

  const scoreInput = buildSkillScoreInput(
    aggregated, aiSignalPoints, domainPoints, scannedRepos, evolutionBonusPts,
  );
  const skillScore = computeSkillScore(scoreInput);
  const skillTags = buildSkillTags(aggregated, detectedDomains);

  await writeCandidateDoc(
    owner, skillScore, skillTags, aggregated,
    scannedRepos, userProfile, detectedDomains,
    evolutionProfile, evolutionBonusPts,
  );
}

function buildSkillScoreInput(
  data: import('./candidate-writer.js').AggregatedRepoData,
  aiSignalPoints: number,
  domainPoints: number,
  scannedRepos: ReadonlyArray<Repository>,
  evolutionBonusPts: number,
): SkillScoreInput {
  return {
    hasLanguage: data.languages.length > 0,
    frameworkCount: data.frameworks.length,
    toolCount: data.tools.length,
    commitSpanMonths: data.maxCommitSpan,
    isOwnerRepo: data.hasOwnerRepo,
    estimatedTestCoverage: data.bestCoverage,
    aiSignalPoints,
    proficiencyBonus: data.proficiencyBonus,
    domainPoints,
    confirmedFrameworkCount: data.confirmedFrameworks?.length ?? 0,
    frameworkDepthPoints: computeFrameworkDepthPoints(data.frameworkDepthSummary ?? []),
    logicCodeRatioPoints: computeLogicRatioPoints(data.avgLogicCodeRatio),
    codeQualityPoints: computeCodeQualityPoints(data.bestCodeQualityGrade),
    codeDurabilityPoints: computeDurabilityPoints(scannedRepos),
    behavioralPoints: computeBehavioralPoints(scannedRepos),
    commitMessagePoints: computeCommitMessagePoints(scannedRepos),
    designPatternPoints: computeDesignPatternPoints(scannedRepos),
    codeStylePoints: computeCodeStylePoints(scannedRepos),
    evolutionBonus: evolutionBonusPts,
  };
}

function buildSkillTags(
  aggregated: import('./candidate-writer.js').AggregatedRepoData,
  detectedDomains: import('../../types/candidate.js').DomainExpertise[],
): string[] {
  const qualifyingDomainIds = detectedDomains
    .filter((d) => d.confidence >= QUALIFYING_CONFIDENCE)
    .map((d) => d.domainId);
  return [
    ...aggregated.languages, ...aggregated.frameworks,
    ...aggregated.tools, ...aggregated.aiAgentPatterns,
    ...qualifyingDomainIds,
  ].sort();
}

async function fetchUserProfileSafe(
  owner: string,
): Promise<import('../../adapters/source-adapter.js').UserProfile | null> {
  try {
    const adapter = createGitHubAdapter();
    return await adapter.getUserProfile(owner);
  } catch (err) {
    console.warn(`[skill-score] Failed to fetch user profile for ${owner}:`, err);
    return null;
  }
}
