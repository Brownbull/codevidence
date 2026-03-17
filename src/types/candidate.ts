import type { Timestamp } from 'firebase/firestore';

/**
 * DomainExpertise — an inferred technical domain for a candidate.
 * Computed from aggregated technology signals across all repositories.
 */
export interface DomainExpertise {
  domainId: string;       // e.g. "domain:ml-engineer"
  label: string;          // e.g. "ML Engineer"
  confidence: number;     // 0.0-1.0, must be >= 0.50 to qualify for scoring
  evidenceCount: number;  // number of defining techs matched
  topEvidence: string[];  // up to 3 taxonomy IDs that contributed
}

/**
 * EvolutionTrajectoryPoint — a single data point on a growth trajectory.
 * Represents one repo's tier value at a point in time.
 */
export interface EvolutionTrajectoryPoint {
  date: string;         // ISO 8601
  tier: number;         // dimension-specific tier value
  repoName: string;     // short repo name (without owner prefix)
}

/**
 * EvolutionDimension — growth trajectory for a single dimension.
 * Slope is in tier-units per year via OLS linear regression.
 */
export interface EvolutionDimension {
  trajectory: EvolutionTrajectoryPoint[];
  slope: number;
  trend: 'rapid-growth' | 'steady-growth' | 'plateau' | 'regression';
}

/** AdoptionEvent — first appearance of a technology across repos. */
export interface AdoptionEvent {
  date: string;         // ISO 8601
  taxonomyId: string;   // e.g. "language:typescript"
  repoName: string;
  category: 'language' | 'framework' | 'tool';
}

/**
 * EvolutionProfile — cross-repo growth analysis for a candidate.
 * Null until >= 2 repos are scanned.
 */
export interface EvolutionProfile {
  growthVector: number; // -1.0 to +1.0
  dimensions: {
    techSophistication: EvolutionDimension;
    testingMaturity: EvolutionDimension;
    architectureComplexity: EvolutionDimension;
    aiAdoption: EvolutionDimension;
  };
  adoptionTimeline: AdoptionEvent[];
  reposSampled: number;
  earliestRepoDate: string;
  latestRepoDate: string;
}

/**
 * Candidate — the full Firestore document shape.
 *
 * CRITICAL INVARIANT:
 *   aiMaturityScore: null  → not yet evaluated (never been scored by a human)
 *   aiMaturityScore: 0     → evaluated and rated Level 0
 *   NEVER use a numeric sentinel (e.g. -1) for unscored state.
 *
 * The three aiMaturity* fields are ONLY written by the admin UI (updateAiMaturityScore).
 * Pipeline writes MUST use CandidatePipelineUpdate which TypeScript-excludes these fields.
 */
export interface Candidate {
  id: string;                          // Firestore doc ID = GitHub username
  githubUsername: string;
  githubProfileUrl: string;
  avatarUrl: string | null;
  // ─── GitHub profile fields (populated from Users API) ───
  email: string | null;                // Public email (null if private)
  name: string | null;                 // Display name
  bio: string | null;                  // Profile bio
  location: string | null;             // Geographic location
  company: string | null;              // Current company/org
  hireable: boolean | null;            // GitHub "available for hire" flag
  websiteUrl: string | null;           // Blog / portfolio URL
  followers: number | null;            // Follower count
  githubCreatedAt: string | null;      // Account creation date (ISO 8601)
  // ─── Scored fields ───
  skillScore: number;                  // 0–100
  aiMaturityScore: number | null;      // 0–5, null = NOT YET EVALUATED
  aiMaturityScoredAt: Timestamp | null;
  aiMaturityScoredBy: string | null;
  skillTags: string[];                 // flat merged taxonomy IDs for Firestore queries
  detectedLanguages: string[];
  detectedFrameworks: string[];
  detectedTools: string[];
  aiToolingSignals: string[];
  aiAgentPatterns: string[];
  // ─── Proficiency fields (Spec 01) ───
  proficiencyScores?: Record<string, number>;
  overallProficiency?: 'beginner' | 'intermediate' | 'advanced' | 'expert' | null;
  proficiencyBonus?: number;
  // ─── Domain expertise fields (Spec 02) ───
  detectedDomains?: DomainExpertise[];
  // ─── Import validation + code quality (Specs 03/04) ───
  confirmedFrameworks?: string[];
  frameworkDepthSummary?: import('./repository.js').FrameworkDepthEntry[];
  avgLogicCodeRatio?: number;
  codeQualityGrade?: 'A' | 'B' | 'C' | 'D' | 'F' | null;
  codeQualityScore?: number | null;
  // ─── Git history analysis (Specs 05/08/09) ───
  codeDurabilityScore?: number | null;
  avgChurnRate14d?: number | null;
  avgChurnRate90d?: number | null;
  behavioralScore?: number | null;
  commitDisciplineLevel?: 'low' | 'moderate' | 'high' | null;
  commitMessageScore?: number | null;
  // ─── Design patterns + code style (Specs 06/07) ───
  designPatternDiversity?: number;
  designSophisticationTier?: 'none' | 'basic' | 'intermediate' | 'advanced';
  architectureStyles?: string[];
  codeStyleScore?: number | null;
  // ─── Cross-repo evolution (Spec 10) ───
  evolutionProfile?: EvolutionProfile | null;
  evolutionBonus?: number;
  repoCount: number;
  primaryRepoIds: string[];
  commitSpanMonths: number;
  lastScanned: Timestamp;
  isStale: boolean;
  scanDepth: 'layer1' | 'layer2';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * CandidatePipelineUpdate — the type pipeline writes MUST use.
 *
 * TypeScript-enforces that pipeline code cannot write aiMaturityScore,
 * aiMaturityScoredAt, or aiMaturityScoredBy. This is the primary guard
 * against a rescan accidentally overwriting a manually assigned score.
 */
export type CandidatePipelineUpdate = Omit<
  Candidate,
  'aiMaturityScore' | 'aiMaturityScoredAt' | 'aiMaturityScoredBy'
>;
