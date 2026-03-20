/**
 * functions/src/store-github-token.ts — Callable Firebase Function (v1).
 *
 * Validates a GitHub token via the GitHub API, encrypts it with AES-256,
 * and stores it in user_profiles/{uid}/secrets/github.
 *
 * Uses v1 onCall (not v2) because v2 Cloud Run functions have CORS issues
 * with browser preflight requests. v1 handles CORS automatically.
 *
 * Called by:
 *   - GitHub OAuth auto-link flow (provider: 'oauth')
 *   - Manual PAT connect flow (provider: 'pat')
 *
 * Security:
 *   - Requires authenticated caller (context.auth)
 *   - Validates token ownership via GitHub API GET /user
 *   - Token is encrypted before Firestore write — never stored in plaintext
 *   - Encryption key from GITHUB_TOKEN_ENCRYPTION_KEY secret
 */

import * as admin from 'firebase-admin';
import * as functionsV1 from 'firebase-functions/v1';
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

// ─── Encryption helpers ──────────────────────────────────────────────────────

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 12;
const AUTH_TAG_LENGTH = 16;

function getEncryptionKey(): Buffer {
  const keyBase64 = process.env['GITHUB_TOKEN_ENCRYPTION_KEY'];
  if (!keyBase64) {
    throw new functionsV1.https.HttpsError(
      'internal',
      'Server encryption key not configured.'
    );
  }
  const key = Buffer.from(keyBase64, 'base64');
  if (key.length !== 32) {
    throw new functionsV1.https.HttpsError(
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
      throw new functionsV1.https.HttpsError(
        'unauthenticated',
        'GitHub token is invalid or expired.'
      );
    }
    throw new functionsV1.https.HttpsError(
      'internal',
      `GitHub API returned ${response.status}.`
    );
  }

  const user = (await response.json()) as GitHubUser;

  if (user.login.toLowerCase() !== expectedUsername.toLowerCase()) {
    throw new functionsV1.https.HttpsError(
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

// ─── Callable Function (v1 — auto-handles CORS) ────────────────────────────

interface StoreTokenInput {
  githubUsername: string;
  githubToken: string;
  provider: 'oauth' | 'pat';
}

export const storeGitHubToken = functionsV1
  .runWith({ secrets: ['GITHUB_TOKEN_ENCRYPTION_KEY'] })
  .https.onCall(async (data: StoreTokenInput, context: functionsV1.https.CallableContext) => {
    if (!context.auth) {
      throw new functionsV1.https.HttpsError('unauthenticated', 'User must be authenticated.');
    }

    const { githubUsername, githubToken, provider } = data;

    // Input validation
    if (!githubUsername || typeof githubUsername !== 'string') {
      throw new functionsV1.https.HttpsError('invalid-argument', 'githubUsername is required.');
    }
    if (!githubToken || typeof githubToken !== 'string') {
      throw new functionsV1.https.HttpsError('invalid-argument', 'githubToken is required.');
    }
    if (provider !== 'oauth' && provider !== 'pat') {
      throw new functionsV1.https.HttpsError('invalid-argument', 'provider must be "oauth" or "pat".');
    }

    // Validate token format
    if (
      !githubToken.startsWith('ghp_') &&
      !githubToken.startsWith('gho_') &&
      !githubToken.startsWith('github_pat_')
    ) {
      throw new functionsV1.https.HttpsError(
        'invalid-argument',
        'Token must start with ghp_, gho_, or github_pat_.'
      );
    }

    // Validate token ownership via GitHub API
    await validateGitHubToken(githubToken, githubUsername);

    const uid = context.auth.uid;
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
        expiresAt: null,
        updatedAt: now,
      });

    // Update user profile with connection info
    const profileRef = db.collection('user_profiles').doc(uid);
    const profileSnap = await profileRef.get();

    if (!profileSnap.exists) {
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
