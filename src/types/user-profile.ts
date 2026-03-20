import type { Timestamp } from 'firebase/firestore';

/**
 * UserProfile — Firestore document in user_profiles/{uid}.
 *
 * Two groups of fields:
 *   Client-writable: githubUsername, updatedAt (via Firestore rules)
 *   Pipeline-only:   githubProvider, githubConnectedAt, tokenStatus,
 *                    lastSelfScanAt, selfScanCount (via Admin SDK)
 */
export interface UserProfile {
  uid: string;
  githubUsername: string | null;
  githubConnectedAt: Timestamp | null;
  /** How GitHub was linked. Pipeline-only writable. */
  githubProvider: 'oauth' | 'pat' | null;
  /** Health of stored token. Pipeline-only writable. */
  tokenStatus: 'valid' | 'expired' | 'revoked' | null;
  /** Last time user triggered a self-scan. Pipeline-only writable. */
  lastSelfScanAt: Timestamp | null;
  /** Total number of self-scans triggered. Pipeline-only writable. */
  selfScanCount: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Fields that clients are allowed to write on user_profiles.
 * All other fields are pipeline-only (written via Admin SDK).
 */
export type UserProfileClientWritableFields = Pick<
  UserProfile,
  'uid' | 'githubUsername' | 'createdAt' | 'updatedAt'
>;

/**
 * UserGitHubSecret — Firestore document in user_profiles/{uid}/secrets/github.
 *
 * Stored encrypted. Client can read (to show prefix), but NEVER write.
 * All writes go through the storeGitHubToken Firebase Function.
 */
export interface UserGitHubSecret {
  /** AES-256 encrypted GitHub token. */
  encryptedToken: string;
  /** First 4 characters of original token (type indicator: ghp_, gho_). */
  tokenPrefix: string;
  /** When the PAT expires. null for OAuth tokens or unknown expiry. */
  expiresAt: Timestamp | null;
  updatedAt: Timestamp;
}
