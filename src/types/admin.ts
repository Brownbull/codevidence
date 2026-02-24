import type { Timestamp } from 'firebase/firestore';

export type AdminFlagType = 'underserved-query' | 'repo-of-interest' | 'pat-expired';
export type AdminFlagStatus = 'active' | 'actioned' | 'dismissed';

/**
 * SearchQueryParams — the typed representation of search filter URL state.
 * Lives in URL only; Zustand holds only UI state (panel open/closed).
 *
 * aiMaturityMin: null = no filter applied (includes unscored candidates)
 */
export interface SearchQueryParams {
  languages: string[];
  frameworks: string[];
  tools: string[];
  aiAgentPatterns: string[];
  aiMaturityMin: number | null;
  sortBy: 'skillScore' | 'aiMaturityScore' | 'lastScanned';
}

/**
 * AdminFlag — Firestore document shape for admin review flags.
 * Two flag types: underserved-query (thin search results) and repo-of-interest.
 */
export interface AdminFlag {
  id: string;
  type: AdminFlagType;
  status: AdminFlagStatus;
  queryParams?: SearchQueryParams;
  resultCount?: number;
  repoId?: string;
  repoFullName?: string;
  detectedSignals?: string[];
  autoSuggestedAiLevel?: number | null;
  actionedAt: Timestamp | null;
  actionedBy: string | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
