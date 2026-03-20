/**
 * src/handlers/user-profile.ts — User profile data operations.
 *
 * Client-safe operations for user_profiles collection.
 * All Firestore access goes through src/core/db/firestore.ts.
 *
 * Field-level write control:
 *   Client-writable: uid, githubUsername, createdAt, updatedAt
 *   Pipeline-only:   githubProvider, githubConnectedAt, tokenStatus,
 *                    lastSelfScanAt, selfScanCount (via Admin SDK)
 */

import type { UserProfile, UserGitHubSecret } from '../types/user-profile.js';
import {
  getDoc,
  setDoc,
  updateDoc,
  queryDocs,
  serverTimestamp,
  where,
} from '../core/db/firestore.js';

export const USER_PROFILES_COLLECTION = 'user_profiles';

/**
 * Returns the Firestore path for a user's secrets subcollection.
 */
export function secretsPath(uid: string): string {
  return `${USER_PROFILES_COLLECTION}/${uid}/secrets`;
}

/**
 * Fetches a user profile by Firebase Auth UID.
 */
export async function getUserProfile(
  uid: string
): Promise<(UserProfile & { id: string }) | null> {
  return getDoc<UserProfile>(USER_PROFILES_COLLECTION, uid);
}

/**
 * Creates a new user profile. Only sets client-writable fields.
 * Pipeline-owned fields are initialized to null/0 defaults.
 */
export async function createUserProfile(
  uid: string,
  githubUsername: string | null
): Promise<void> {
  const ts = serverTimestamp();
  await setDoc<UserProfile>(USER_PROFILES_COLLECTION, uid, {
    uid,
    githubUsername,
    githubConnectedAt: null,
    githubProvider: null,
    tokenStatus: null,
    lastSelfScanAt: null,
    selfScanCount: 0,
    createdAt: ts,
    updatedAt: ts,
  } as UserProfile);
}

/**
 * Updates the GitHub username on a user profile.
 * Only touches client-writable fields.
 */
export async function updateGitHubUsername(
  uid: string,
  githubUsername: string | null
): Promise<void> {
  await updateDoc<UserProfile>(USER_PROFILES_COLLECTION, uid, {
    githubUsername,
    updatedAt: serverTimestamp(),
  } as Partial<UserProfile>);
}

/**
 * Fetches the stored GitHub secret for a user.
 * Returns null if no secret is stored.
 */
export async function getGitHubSecret(
  uid: string
): Promise<(UserGitHubSecret & { id: string }) | null> {
  return getDoc<UserGitHubSecret>(secretsPath(uid), 'github');
}

/**
 * Checks if a user has a pending or running self-scan job.
 */
export async function hasPendingSelfScan(uid: string): Promise<boolean> {
  const jobs = await queryDocs(
    'scan_jobs',
    where('type', '==', 'self-scan'),
    where('payload.requestedBy', '==', uid),
    where('status', 'in', ['pending', 'running']),
  );
  return jobs.length > 0;
}
