/**
 * src/pipeline/scoring/candidate-writer.ts — Candidate document aggregation and persistence.
 * Aggregates repository data, builds Candidate doc, writes to Firestore.
 */
import type { Repository, TechProficiency, FrameworkDepthEntry } from '../../types/repository.js';
import type { Candidate, DomainExpertise } from '../../types/candidate.js';
import { mapConfigFileToPattern } from '../analysis/ai-config-patterns.js';
import { computeProficiencyBonus, classifyOverallProficiency } from '../analysis/proficiency.js';
import {
  collectPhase3Data,
  deduplicateDepthEntries,
  pickBestQuality,
} from './scoring-helpers.js';
import { collectPhase4Data } from './phase4-helpers.js';
import {
  getDoc,
  setDoc,
  updateDoc,
  serverTimestamp,
  increment,
} from '../../core/db/firestore.js';

const CANDIDATES_COLLECTION = 'candidates';
const TAXONOMY_COLLECTION = 'taxonomy';

const COVERAGE_RANK: Record<string, number> = {
  'none': 0,
  'low': 1,
  'medium': 2,
  'high': 3,
};

/** Aggregated data from all repos for a candidate. */
export interface AggregatedRepoData {
  languages: string[];
  frameworks: string[];
  tools: string[];
  topics: string[];
  aiToolingSignals: string[];
  aiAgentPatterns: string[];
  maxCommitSpan: number;
  hasOwnerRepo: boolean;
  bestCoverage: 'none' | 'low' | 'medium' | 'high';
  bestScanDepth: 'layer1' | 'layer2';
  proficiencyScores: Record<string, number>;
  overallProficiency: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  proficiencyBonus: number;
  // Phase 2: Import validation + code quality
  confirmedFrameworks?: string[];
  frameworkDepthSummary?: FrameworkDepthEntry[];
  avgLogicCodeRatio?: number;
  bestCodeQualityGrade?: 'A' | 'B' | 'C' | 'D' | 'F' | null;
  codeQualityScore?: number | null;
  // Phase 3: Git history analysis
  codeDurabilityScore?: number | null;
  avgChurnRate14d?: number | null;
  avgChurnRate90d?: number | null;
  behavioralScore?: number | null;
  commitDisciplineLevel?: 'low' | 'moderate' | 'high' | null;
  commitMessageScore?: number | null;
  // Phase 4: Design patterns + code style
  designPatternDiversity?: number;
  designSophisticationTier?: 'none' | 'basic' | 'intermediate' | 'advanced';
  architectureStyles?: string[];
  codeStyleScore?: number | null;
}

export function aggregateRepoData(repos: ReadonlyArray<Repository>): AggregatedRepoData {
  const languages = new Set<string>();
  const frameworks = new Set<string>();
  const tools = new Set<string>();
  const topics = new Set<string>();
  const aiToolingSignals = new Set<string>();
  const aiAgentPatterns = new Set<string>();
  const confirmedFw = new Set<string>();
  const proficiencyScores: Record<string, number> = {};
  let maxCommitSpan = 0;
  let hasOwnerRepo = false;
  let bestCoverage: 'none' | 'low' | 'medium' | 'high' = 'none';
  let bestScanDepth: 'layer1' | 'layer2' = 'layer1';
  const phase2 = collectPhase2Data(repos);

  for (const repo of repos) {
    collectRepoSignals(repo, {
      languages, frameworks, tools, topics,
      aiToolingSignals, aiAgentPatterns, proficiencyScores,
    });
    if (repo.commitSpanMonths > maxCommitSpan) maxCommitSpan = repo.commitSpanMonths;
    if (repo.isOwnerRepo) hasOwnerRepo = true;
    const repoRank = COVERAGE_RANK[repo.estimatedTestCoverage] ?? 0;
    if (repoRank > (COVERAGE_RANK[bestCoverage] ?? 0)) bestCoverage = repo.estimatedTestCoverage;
    if (repo.scanStatus === 'layer2') bestScanDepth = 'layer2';
    for (const ci of repo.confirmedImports ?? []) confirmedFw.add(ci);
  }

  const { proficiencyBonus, overallProficiency } = computeAggregatedProficiency(proficiencyScores);

  return {
    languages: [...languages].sort(),
    frameworks: [...frameworks].sort(),
    tools: [...tools].sort(),
    topics: [...topics].sort(),
    aiToolingSignals: [...aiToolingSignals].sort(),
    aiAgentPatterns: [...aiAgentPatterns].sort(),
    maxCommitSpan, hasOwnerRepo, bestCoverage, bestScanDepth,
    proficiencyScores, overallProficiency, proficiencyBonus,
    confirmedFrameworks: [...confirmedFw].sort(),
    frameworkDepthSummary: phase2.bestDepth,
    avgLogicCodeRatio: phase2.avgLogicCodeRatio,
    bestCodeQualityGrade: phase2.bestQuality.grade,
    codeQualityScore: phase2.bestQuality.score,
    ...collectPhase3Data(repos),
    ...collectPhase4Data(repos),
  };
}

/** Collects Phase 2 data (depth, logic ratio, quality) from all repos. */
function collectPhase2Data(repos: ReadonlyArray<Repository>) {
  const allDepthEntries: FrameworkDepthEntry[] = [];
  const logicRatios: number[] = [];
  const qualityGrades: string[] = [];
  const qualityScores: number[] = [];

  for (const repo of repos) {
    if (repo.frameworkDepth) allDepthEntries.push(...repo.frameworkDepth);
    if (repo.logicCodeRatio !== undefined) logicRatios.push(repo.logicCodeRatio);
    if (repo.codeQualityMetrics) {
      qualityGrades.push(repo.codeQualityMetrics.codeQualityGrade);
      qualityScores.push(repo.codeQualityMetrics.codeQualityScore);
    }
  }

  return {
    bestDepth: deduplicateDepthEntries(allDepthEntries),
    avgLogicCodeRatio: logicRatios.length > 0
      ? Math.round((logicRatios.reduce((a, b) => a + b, 0) / logicRatios.length) * 100) / 100
      : undefined,
    bestQuality: pickBestQuality(qualityGrades, qualityScores),
  };
}

/** Computes proficiency bonus and overall level from aggregated scores. */
function computeAggregatedProficiency(proficiencyScores: Record<string, number>) {
  const techProfMap: Record<string, TechProficiency> = {};
  for (const [techId, score] of Object.entries(proficiencyScores)) {
    techProfMap[techId] = { level: 'beginner', score, patternCount: 0, topPatterns: [] };
  }
  return {
    proficiencyBonus: computeProficiencyBonus(techProfMap),
    overallProficiency: Object.keys(proficiencyScores).length > 0
      ? classifyOverallProficiency(techProfMap) : null,
  };
}

function collectRepoSignals(repo: Repository, acc: {
  languages: Set<string>; frameworks: Set<string>; tools: Set<string>;
  topics: Set<string>; aiToolingSignals: Set<string>;
  aiAgentPatterns: Set<string>; proficiencyScores: Record<string, number>;
}): void {
  if (repo.primaryLanguage) acc.languages.add(repo.primaryLanguage);
  for (const fw of repo.detectedFrameworks ?? []) acc.frameworks.add(fw);
  for (const tool of repo.detectedTools ?? []) acc.tools.add(tool);
  for (const topic of repo.topics ?? []) acc.topics.add(topic);
  for (const signal of repo.aiConfigFiles ?? []) {
    acc.aiToolingSignals.add(signal.fileName);
    const pattern = mapConfigFileToPattern(signal.fileName);
    if (pattern) acc.aiAgentPatterns.add(pattern);
  }
  if (repo.coAuthoredByAI) {
    acc.aiAgentPatterns.add('ai-agent-pattern:co-authored-by-ai');
  }
  if (repo.techProficiency) {
    for (const [techId, tp] of Object.entries(repo.techProficiency)) {
      if (techId === 'testing') continue;
      const existing = acc.proficiencyScores[techId] ?? 0;
      if (tp.score > existing) acc.proficiencyScores[techId] = tp.score;
    }
  }
}

export async function writeCandidateDoc(
  owner: string,
  skillScore: number,
  skillTags: string[],
  data: AggregatedRepoData,
  repos: ReadonlyArray<Repository & { id: string }>,
  profile: import('../../adapters/source-adapter.js').UserProfile | null,
  detectedDomains: DomainExpertise[],
  evolutionProfile: import('../../types/candidate.js').EvolutionProfile | null = null,
  evolutionBonus: number = 0,
): Promise<void> {
  const now = serverTimestamp();
  const existing = await getDoc<Candidate>(CANDIDATES_COLLECTION, owner);

  const pipelineFields = buildPipelineFields(
    owner, skillScore, skillTags, data, repos, profile, detectedDomains, now,
    evolutionProfile, evolutionBonus,
  );

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

  await updateTaxonomyCounts(existing?.skillTags ?? [], skillTags);
}

function buildOptionalAnalysisFields(data: AggregatedRepoData) {
  return {
    ...(data.avgLogicCodeRatio !== undefined && { avgLogicCodeRatio: data.avgLogicCodeRatio }),
    ...(data.bestCodeQualityGrade != null && { codeQualityGrade: data.bestCodeQualityGrade }),
    ...(data.codeQualityScore != null && { codeQualityScore: data.codeQualityScore }),
    ...(data.codeDurabilityScore != null && { codeDurabilityScore: data.codeDurabilityScore }),
    ...(data.avgChurnRate14d != null && { avgChurnRate14d: data.avgChurnRate14d }),
    ...(data.avgChurnRate90d != null && { avgChurnRate90d: data.avgChurnRate90d }),
    ...(data.behavioralScore != null && { behavioralScore: data.behavioralScore }),
    ...(data.commitDisciplineLevel != null && { commitDisciplineLevel: data.commitDisciplineLevel }),
    ...(data.commitMessageScore != null && { commitMessageScore: data.commitMessageScore }),
    ...(data.designPatternDiversity != null && { designPatternDiversity: data.designPatternDiversity }),
    ...(data.designSophisticationTier != null && { designSophisticationTier: data.designSophisticationTier }),
    ...(data.architectureStyles && data.architectureStyles.length > 0 && { architectureStyles: data.architectureStyles }),
    ...(data.codeStyleScore != null && { codeStyleScore: data.codeStyleScore }),
  };
}

function buildPipelineFields(
  owner: string,
  skillScore: number,
  skillTags: string[],
  data: AggregatedRepoData,
  repos: ReadonlyArray<Repository & { id: string }>,
  profile: import('../../adapters/source-adapter.js').UserProfile | null,
  detectedDomains: DomainExpertise[],
  now: ReturnType<typeof serverTimestamp>,
  evolutionProfile: import('../../types/candidate.js').EvolutionProfile | null,
  evolutionBonus: number,
) {
  return {
    githubUsername: owner,
    githubProfileUrl: `https://github.com/${owner}`,
    avatarUrl: profile?.avatarUrl ?? `https://github.com/${owner}.png`,
    email: profile?.email ?? null, name: profile?.name ?? null,
    bio: profile?.bio ?? null, location: profile?.location ?? null,
    company: profile?.company ?? null, hireable: profile?.hireable ?? null,
    websiteUrl: profile?.websiteUrl ?? null, followers: profile?.followers ?? null,
    githubCreatedAt: profile?.createdAt ?? null,
    skillScore, skillTags,
    detectedLanguages: data.languages, detectedFrameworks: data.frameworks,
    detectedTools: data.tools, aiToolingSignals: data.aiToolingSignals,
    aiAgentPatterns: data.aiAgentPatterns,
    proficiencyScores: data.proficiencyScores, overallProficiency: data.overallProficiency,
    proficiencyBonus: data.proficiencyBonus, detectedDomains,
    confirmedFrameworks: data.confirmedFrameworks ?? [],
    frameworkDepthSummary: data.frameworkDepthSummary ?? [],
    ...buildOptionalAnalysisFields(data),
    evolutionProfile: evolutionProfile ?? null, evolutionBonus,
    repoCount: repos.length,
    primaryRepoIds: repos.map((r) => r.fullName).sort(),
    commitSpanMonths: data.maxCommitSpan,
    lastScanned: now, isStale: false, scanDepth: data.bestScanDepth, updatedAt: now,
  };
}

async function updateTaxonomyCounts(
  oldTags: string[],
  newTags: string[],
): Promise<void> {
  const oldSet = new Set(oldTags);
  const newSet = new Set(newTags);

  const added = newTags.filter((t) => !oldSet.has(t));
  const removed = oldTags.filter((t) => !newSet.has(t));

  if (added.length === 0 && removed.length === 0) return;

  const updates = [
    ...added.map((tag) => updateDoc(TAXONOMY_COLLECTION, tag, { candidateCount: increment(1) }).catch(() => {})),
    ...removed.map((tag) => updateDoc(TAXONOMY_COLLECTION, tag, { candidateCount: increment(-1) }).catch(() => {})),
  ];

  await Promise.all(updates);
}
