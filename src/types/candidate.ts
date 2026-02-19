import type { Timestamp } from 'firebase/firestore';

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
