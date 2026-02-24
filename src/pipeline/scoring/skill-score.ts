/**
 * src/pipeline/scoring/skill-score.ts — Skill Score computation and candidate profile generation.
 *
 * Deterministic Skill Score formula + Candidate document builder.
 * Pipeline scoring output MUST NOT include aiMaturityScore fields.
 * This is enforced via the PipelineScoringOutput type.
 */

import type { Repository } from '../../types/repository.js';
import type { Candidate } from '../../types/candidate.js';
import {
  getDoc,
  setDoc,
  updateDoc,
  queryDocs,
  serverTimestamp,
  where,
} from '../../core/db/firestore.js';

const CANDIDATES_COLLECTION = 'candidates';
const REPOSITORIES_COLLECTION = 'repositories';

// ─── Types ────────────────────────────────────────────────────────────────────

/** Clean input for the deterministic skill scoring function. */
export interface SkillScoreInput {
  hasLanguage: boolean;
  frameworkCount: number;
  toolCount: number;
  commitSpanMonths: number;
  isOwnerRepo: boolean;
  estimatedTestCoverage: 'none' | 'low' | 'medium' | 'high';
  aiSignalPoints: number;
}

/**
 * Pipeline scoring output type — TypeScript-enforces absence of aiMaturity fields.
 * Pipeline code MUST use this type, never the full Candidate type for writes.
 */
export type PipelineScoringOutput = Omit<
  Candidate,
  'aiMaturityScore' | 'aiMaturityScoredAt' | 'aiMaturityScoredBy'
>;

// ─── AI Config File → Agent Pattern Mapping ──────────────────────────────────

const AI_CONFIG_PATTERN_MAP: Record<string, string> = {
  'CLAUDE.md': 'ai-agent-pattern:claude-md',
  '.claude': 'ai-agent-pattern:claude-md',
  '.cursor/rules': 'ai-agent-pattern:cursor-rules',
  '.cursor/settings.json': 'ai-agent-pattern:cursor-rules',
  '.cursor': 'ai-agent-pattern:cursor-rules',
  'ai-context.md': 'ai-agent-pattern:ai-context-file',
  '.github/copilot-instructions.md': 'ai-agent-pattern:copilot-instructions',
};

/** Maps an AI config file name to its taxonomy agent pattern ID. */
export function mapConfigFileToPattern(fileName: string): string | null {
  if (AI_CONFIG_PATTERN_MAP[fileName]) return AI_CONFIG_PATTERN_MAP[fileName] ?? null;
  if (fileName.toLowerCase().startsWith('.aider')) return 'ai-agent-pattern:aider-config';
  return null;
}

// ─── Score Constants ─────────────────────────────────────────────────────────

export const TEST_COVERAGE_POINTS: Record<string, number> = {
  'none': 0,
  'low': 3,
  'medium': 8,
  'high': 15,
};

const COVERAGE_RANK: Record<string, number> = {
  'none': 0,
  'low': 1,
  'medium': 2,
  'high': 3,
};

// ─── Skill Score Computation ─────────────────────────────────────────────────

/**
 * Computes the Skill Score using the deterministic formula.
 *
 * Formula:
 *   primaryLanguage (20) + frameworks (6 each, capped 30) +
 *   tools (5 each, capped 15) + commitSpan (capped 10) +
 *   ownership bonus (10) + test coverage (0/3/8/15) +
 *   AI signals (capped 10)
 *
 * Result clamped to 0-100.
 */
export function computeSkillScore(input: SkillScoreInput): number {
  const languagePoints = input.hasLanguage ? 20 : 0;
  const frameworkPoints = Math.min(input.frameworkCount * 6, 30);
  const toolPoints = Math.min(input.toolCount * 5, 15);
  const commitSpanPoints = Math.min(input.commitSpanMonths, 10);
  const ownershipPoints = input.isOwnerRepo ? 10 : 0;
  const testPoints = TEST_COVERAGE_POINTS[input.estimatedTestCoverage] ?? 0;
  const aiPoints = Math.min(input.aiSignalPoints, 10);

  const total = languagePoints + frameworkPoints + toolPoints +
    commitSpanPoints + ownershipPoints + testPoints + aiPoints;

  return Math.max(0, Math.min(100, total));
}

/**
 * Computes the AI signal points from repositories.
 * Each unique AI agent pattern: 2 points. coAuthoredByAI: 3 points. Cap 10.
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
  return Math.min(filePoints + coAuthoredPoints, 10);
}

// ─── Candidate Profile Builder ───────────────────────────────────────────────

/**
 * Aggregates data from all repos for a given owner and builds/updates the Candidate.
 * Called after Layer 2 analysis completes for a repo.
 */
export async function updateCandidateProfile(owner: string): Promise<void> {
  const repos = await queryDocs<Repository>(
    REPOSITORIES_COLLECTION,
    where('owner', '==', owner),
  );

  const scannedRepos = repos.filter((r) =>
    r.scanStatus === 'layer1' || r.scanStatus === 'layer2'
  );

  if (scannedRepos.length === 0) {
    console.log(`[skill-score] No scanned repos for ${owner}, skipping.`);
    return;
  }

  const aggregated = aggregateRepoData(scannedRepos);
  const aiSignalPoints = computeAiSignalPoints(scannedRepos);

  const skillScore = computeSkillScore({
    hasLanguage: aggregated.languages.length > 0,
    frameworkCount: aggregated.frameworks.length,
    toolCount: aggregated.tools.length,
    commitSpanMonths: aggregated.maxCommitSpan,
    isOwnerRepo: aggregated.hasOwnerRepo,
    estimatedTestCoverage: aggregated.bestCoverage,
    aiSignalPoints,
  });

  const skillTags = [
    ...aggregated.languages,
    ...aggregated.frameworks,
    ...aggregated.tools,
    ...aggregated.aiAgentPatterns,
  ].sort();

  await writeCandidateDoc(owner, skillScore, skillTags, aggregated, scannedRepos);
}

/** Aggregated data from all repos for a candidate. */
interface AggregatedRepoData {
  languages: string[];
  frameworks: string[];
  tools: string[];
  aiToolingSignals: string[];
  aiAgentPatterns: string[];
  maxCommitSpan: number;
  hasOwnerRepo: boolean;
  bestCoverage: 'none' | 'low' | 'medium' | 'high';
  bestScanDepth: 'layer1' | 'layer2';
}

function aggregateRepoData(repos: ReadonlyArray<Repository>): AggregatedRepoData {
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const tools = new Set<string>();
  const aiToolingSignals = new Set<string>();
  const aiAgentPatterns = new Set<string>();
  let maxCommitSpan = 0;
  let hasOwnerRepo = false;
  let bestCoverage: 'none' | 'low' | 'medium' | 'high' = 'none';
  let bestScanDepth: 'layer1' | 'layer2' = 'layer1';

  for (const repo of repos) {
    if (repo.primaryLanguage) languages.add(repo.primaryLanguage);
    for (const fw of repo.detectedFrameworks ?? []) frameworks.add(fw);
    for (const tool of repo.detectedTools ?? []) tools.add(tool);
    if (repo.commitSpanMonths > maxCommitSpan) maxCommitSpan = repo.commitSpanMonths;
    if (repo.isOwnerRepo) hasOwnerRepo = true;

    const repoRank = COVERAGE_RANK[repo.estimatedTestCoverage] ?? 0;
    if (repoRank > (COVERAGE_RANK[bestCoverage] ?? 0)) {
      bestCoverage = repo.estimatedTestCoverage;
    }
    if (repo.scanStatus === 'layer2') bestScanDepth = 'layer2';

    for (const signal of repo.aiConfigFiles ?? []) {
      aiToolingSignals.add(signal.fileName);
      const pattern = mapConfigFileToPattern(signal.fileName);
      if (pattern) aiAgentPatterns.add(pattern);
    }
    if (repo.coAuthoredByAI) {
      aiAgentPatterns.add('ai-agent-pattern:co-authored-by-ai');
    }
  }

  return {
    languages: [...languages].sort(),
    frameworks: [...frameworks].sort(),
    tools: [...tools].sort(),
    aiToolingSignals: [...aiToolingSignals].sort(),
    aiAgentPatterns: [...aiAgentPatterns].sort(),
    maxCommitSpan,
    hasOwnerRepo,
    bestCoverage,
    bestScanDepth,
  };
}

async function writeCandidateDoc(
  owner: string,
  skillScore: number,
  skillTags: string[],
  data: AggregatedRepoData,
  repos: ReadonlyArray<Repository & { id: string }>
): Promise<void> {
  const now = serverTimestamp();
  const existing = await getDoc<Candidate>(CANDIDATES_COLLECTION, owner);

  const pipelineFields = {
    githubUsername: owner,
    githubProfileUrl: `https://github.com/${owner}`,
    avatarUrl: `https://github.com/${owner}.png`,
    skillScore,
    skillTags,
    detectedLanguages: data.languages,
    detectedFrameworks: data.frameworks,
    detectedTools: data.tools,
    aiToolingSignals: data.aiToolingSignals,
    aiAgentPatterns: data.aiAgentPatterns,
    repoCount: repos.length,
    primaryRepoIds: repos.map((r) => r.fullName).sort(),
    commitSpanMonths: data.maxCommitSpan,
    lastScanned: now,
    isStale: false,
    scanDepth: data.bestScanDepth,
    updatedAt: now,
  };

  if (existing) {
    await updateDoc<Candidate>(CANDIDATES_COLLECTION, owner, pipelineFields);
    console.log(`[skill-score] Updated candidate ${owner}: score=${skillScore}`);
  } else {
    const fullDoc = {
      ...pipelineFields,
      aiMaturityScore: null,
      aiMaturityScoredAt: null,
      aiMaturityScoredBy: null,
      createdAt: now,
    };
    await setDoc<Record<string, unknown>>(CANDIDATES_COLLECTION, owner, fullDoc);
    console.log(`[skill-score] Created candidate ${owner}: score=${skillScore}`);
  }
}
