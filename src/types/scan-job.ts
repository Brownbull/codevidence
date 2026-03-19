import type { Timestamp } from 'firebase/firestore';

export type ScanJobStatus = 'pending' | 'running' | 'completed' | 'failed';
export type ScanJobType = 'discover' | 'scan-repo' | 'rescan-candidate' | 'rescan-repo' | 'self-scan';

export interface DiscoverPayload {
  query: string;
  source: 'github';
  limit: number;
}

export interface ScanRepoPayload {
  repoFullName: string;
  targetDepth: 'layer1' | 'layer2';
  /** Optional fine-grained PAT for accessing private repositories (admin flow). */
  githubToken?: string;
  /** UID of user whose stored token to resolve (self-scan flow). */
  tokenSourceUid?: string;
}

export interface RescanPayload {
  targetType: 'candidate' | 'repo';
  targetId: string;
  /** Optional fine-grained PAT for accessing private repositories. */
  githubToken?: string;
}

/**
 * SelfScanPayload — payload for user-triggered self-scan jobs.
 * Token is NOT stored in the payload — pipeline resolves it from
 * user_profiles/{requestedBy}/secrets/github via Admin SDK.
 */
export interface SelfScanPayload {
  /** Firebase Auth UID of the requesting user. */
  requestedBy: string;
  /** GitHub username to scan. Must match user_profiles.githubUsername. */
  githubUsername: string;
}

/**
 * ScanJob — Firestore document shape for a job in the scan pipeline queue.
 * Workers poll scan_jobs ordered by priority DESC, createdAt ASC.
 */
export interface ScanJob {
  id: string;
  type: ScanJobType;
  status: ScanJobStatus;
  payload: DiscoverPayload | ScanRepoPayload | RescanPayload | SelfScanPayload;
  attempts: number;
  maxAttempts: number;
  lastAttemptAt: Timestamp | null;
  completedAt: Timestamp | null;
  failedAt: Timestamp | null;
  errorMessage: string | null;
  rateLimitedUntil: Timestamp | null;
  priority: number;
  /** ID of the worker that claimed this job. Null when pending/completed/failed. */
  workerId: string | null;
  /** Timestamp when the worker last sent a heartbeat. Null when not running. */
  heartbeatAt: Timestamp | null;
  /** Timestamp when the worker claimed this job. Null when not running. */
  claimedAt: Timestamp | null;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
