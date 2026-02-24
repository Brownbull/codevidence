import type { Timestamp } from 'firebase/firestore';

/**
 * AiConfigFileSignal — tracks a single AI config file found in a repository.
 * Used to build the evidence trail for the AI Maturity Score model.
 */
export interface AiConfigFileSignal {
  fileName: string;
  firstDetectedAt: Timestamp;
  modificationCount: number;
  lastModifiedAt: Timestamp;
  diffComplexity: 'minimal' | 'moderate' | 'extensive';
  isEvolved: boolean;
  originSignal: 'likely-original' | 'likely-copied' | 'unknown';
}

/**
 * Converts a repo fullName ("owner/repo") to a safe Firestore doc ID.
 * Firestore doc IDs cannot contain "/" — we replace with "__".
 */
export function repoDocId(fullName: string): string {
  return fullName.replace(/\//g, '__');
}

/**
 * Repository — Firestore document shape for a scanned GitHub repository.
 * id = repoDocId(fullName) e.g. "owner__repo".
 */
export interface Repository {
  id: string;                          // "owner__repo" (repoDocId)
  githubUrl: string;
  owner: string;
  name: string;
  fullName: string;
  primaryLanguage: string | null;
  languages: Record<string, number>;
  starCount: number;
  forkCount: number;
  lastPushedAt: Timestamp;
  topics: string[];
  detectedFrameworks: string[];
  detectedTools: string[];
  detectedDependencies: string[];
  aiConfigFiles: AiConfigFileSignal[];
  coAuthoredByAI: boolean;
  aiAttributionPatterns: string[];
  commitCount: number;
  firstCommitAt: Timestamp | null;
  lastCommitAt: Timestamp | null;
  commitSpanMonths: number;
  isOwnerRepo: boolean;
  hasTestDirectory: boolean;
  estimatedTestCoverage: 'none' | 'low' | 'medium' | 'high';
  skillScoreContribution: number;
  scanStatus: 'surface' | 'layer1' | 'layer2';
  lastScanned: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
