/**
 * functions/src/store-github-token.ts — Callable Firebase Function.
 *
 * Validates a GitHub token via the GitHub API, encrypts it with AES-256,
 * and stores it in user_profiles/{uid}/secrets/github.
 *
 * Called by:
 *   - GitHub OAuth auto-link flow (provider: 'oauth')
 *   - Manual PAT connect flow (provider: 'pat')
 *
 * Security:
 *   - Requires authenticated caller
 *   - Validates token ownership via GitHub API GET /user
 *   - Token is encrypted before Firestore write — never stored in plaintext
 *   - Encryption key from GITHUB_TOKEN_ENCRYPTION_KEY env var
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// ─── Encryption helpers ──────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyBase64 = process.env['GITHUB_TOKEN_ENCRYPTION_KEY'];
  if (!keyBase64) {
    throw new HttpsError(
      'internal',
      'Server encryption key not configured.'
    );
  }
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new HttpsError(
      'internal',
      'Invalid encryption key length. Expected 32 bytes (base64-encoded).'
    );
  }
  return key;
}

export function encryptToken(plaintext: string): string {
  const key = getEncryptionKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf8'),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  // Format: base64(iv + authTag + ciphertext)
  return Buffer.concat([iv, authTag, encrypted]).toString('base64');
}

export function decryptToken(encryptedBase64: string): string {
  const key = getEncryptionKey();
  const data = Buffer.from(encryptedBase64, 'base64');
  const iv = data.subarray(0, IV_LENGTH);
  const authTag = data.subarray(IV_LENGTH, IV_LENGTH + AUTH_TAG_LENGTH);
  const ciphertext = data.subarray(IV_LENGTH + AUTH_TAG_LENGTH);
  const decipher = createDecipheriv(ALGORITHM, key, iv);
  decipher.setAuthTag(authTag);
  return decipher.update(ciphertext) + decipher.final('utf8');
}

// ─── GitHub API validation ──────────────────────────────────────────────────

interface GitHubUser {
  login: string;
}

async function validateGitHubToken(
  token: string,
  expectedUsername: string
): Promise<GitHubUser> {
  const response = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new HttpsError(
        'unauthenticated',
        'GitHub token is invalid or expired.'
      );
    }
    throw new HttpsError(
      'internal',
      `GitHub API returned ${response.status}.`
    );
  }

  const user = (await response.json()) as GitHubUser;

  if (user.login.toLowerCase() !== expectedUsername.toLowerCase()) {
    throw new HttpsError(
      'permission-denied',
      `Token belongs to "${user.login}", not "${expectedUsername}". You can only connect your own GitHub account.`
    );
  }

  return user;
}

// ─── Token prefix extraction ────────────────────────────────────────────────

function extractTokenPrefix(token: string): string {
  // Only 4 characters — type indicator (ghp_, gho_, gith)
  return token.substring(0, 4);
}

// ─── Callable Function ──────────────────────────────────────────────────────

interface StoreTokenInput {
  githubUsername: string;
  githubToken: string;
  provider: 'oauth' | 'pat';
}

export const storeGitHubToken = onCall(async (request) => {
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const { githubUsername, githubToken, provider } =
    request.data as StoreTokenInput;

  // Input validation
  if (!githubUsername || typeof githubUsername !== 'string') {
    throw new HttpsError('invalid-argument', 'githubUsername is required.');
  }
  if (!githubToken || typeof githubToken !== 'string') {
    throw new HttpsError('invalid-argument', 'githubToken is required.');
  }
  if (provider !== 'oauth' && provider !== 'pat') {
    throw new HttpsError('invalid-argument', 'provider must be "oauth" or "pat".');
  }

  // Validate token format
  if (
    !githubToken.startsWith('ghp_') &&
    !githubToken.startsWith('gho_') &&
    !githubToken.startsWith('github_pat_')
  ) {
    throw new HttpsError(
      'invalid-argument',
      'Token must start with ghp_, gho_, or github_pat_.'
    );
  }

  // Validate token ownership via GitHub API
  await validateGitHubToken(githubToken, githubUsername);

  const uid = request.auth.uid;
  const db = admin.firestore();
  const now = admin.firestore.FieldValue.serverTimestamp();

  // Encrypt the token
  const encryptedToken = encryptToken(githubToken);
  const tokenPrefix = extractTokenPrefix(githubToken);

  // Store encrypted secret
  await db
    .collection('user_profiles')
    .doc(uid)
    .collection('secrets')
    .doc('github')
    .set({
      encryptedToken,
      tokenPrefix,
      expiresAt: null, // PAT expiry parsing is best-effort; null for now
      updatedAt: now,
    });

  // Update user profile with connection info (pipeline-owned fields via Admin SDK)
  const profileRef = db.collection('user_profiles').doc(uid);
  const profileSnap = await profileRef.get();

  if (!profileSnap.exists) {
    // Create profile if it doesn't exist (GitHub OAuth first-login case)
    await profileRef.set({
      uid,
      githubUsername,
      githubConnectedAt: now,
      githubProvider: provider,
      tokenStatus: 'valid',
      lastSelfScanAt: null,
      selfScanCount: 0,
      createdAt: now,
      updatedAt: now,
    });
  } else {
    await profileRef.update({
      githubUsername,
      githubConnectedAt: now,
      githubProvider: provider,
      tokenStatus: 'valid',
      updatedAt: now,
    });
  }

  return {
    success: true,
    githubUsername,
    tokenPrefix,
  };
});
