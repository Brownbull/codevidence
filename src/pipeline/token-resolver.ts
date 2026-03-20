/**
 * src/pipeline/token-resolver.ts — Resolves and decrypts GitHub tokens.
 *
 * Used by the scan-repo handler when processing jobs with tokenSourceUid.
 * Reads the encrypted token from user_profiles/{uid}/secrets/github
 * via the standard Firestore wrapper (worker is signed in as admin,
 * and the Firestore rule allows admin reads on secrets).
 *
 * This module is pipeline-only (Node.js). Never import from browser code.
 */

import { createDecipheriv } from 'node:crypto';
import {
  getDoc,
  updateDoc,
  serverTimestamp,
} from '../core/db/firestore.js';
import type { UserGitHubSecret } from '../types/user-profile.js';
import type { UserProfile } from '../types/user-profile.js';

const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

/**
 * Decrypts a token that was encrypted by the storeGitHubToken function.
 * Uses AES-256-GCM with the same project-level key.
 */
function decryptToken(encryptedBase64: string): string {
  const keyBase64 = process.env['GITHUB_TOKEN_ENCRYPTION_KEY'];
  if (!keyBase64) {
    throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY not configured');
  }
  const key = Buffer.from(keyBase64, 'base64');
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

/**
 * Resolves a GitHub token for a user by reading from their secrets
 * subcollection and decrypting.
 *
 * Returns null if no token is stored or decryption fails.
 */
export async function resolveToken(uid: string): Promise<string | null> {
  const secretPath = `user_profiles/${uid}/secrets`;

  const secret = await getDoc<UserGitHubSecret>(secretPath, 'github');
  if (!secret?.encryptedToken) {
    console.warn(`[token-resolver] No GitHub token found for user ${uid}`);
    return null;
  }

  try {
    return decryptToken(secret.encryptedToken);
  } catch (err) {
    console.error(`[token-resolver] Failed to decrypt token for user ${uid}:`, err);
    return null;
  }
}

/**
 * Marks a user's token as expired. Called when the pipeline encounters
 * a 401/403 from GitHub while using the token.
 */
export async function markTokenExpired(uid: string): Promise<void> {
  try {
    await updateDoc<UserProfile>('user_profiles', uid, {
      tokenStatus: 'expired',
      updatedAt: serverTimestamp(),
    } as Partial<UserProfile>);
    console.log(`[token-resolver] Marked token as expired for user ${uid}`);
  } catch (err) {
    console.error(`[token-resolver] Failed to mark token expired for user ${uid}:`, err);
  }
}
