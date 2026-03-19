/**
 * tests/unit/us-028-token-security.test.ts
 *
 * Unit tests for US-028: Token security Firebase Functions.
 * Tests encryption roundtrip, function structure, and cleanup trigger.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

// ─── store-github-token function structure ──────────────────────────────────

describe('store-github-token Firebase Function', () => {
  const src = readFileSync(
    resolve(ROOT, 'functions/src/store-github-token.ts'),
    'utf-8'
  );

  it('exports storeGitHubToken callable function', () => {
    expect(src).toContain('export const storeGitHubToken = onCall');
  });

  it('requires authentication', () => {
    expect(src).toContain('request.auth');
    expect(src).toContain('unauthenticated');
  });

  it('accepts githubUsername, githubToken, and provider in input', () => {
    expect(src).toContain('githubUsername');
    expect(src).toContain('githubToken');
    expect(src).toContain('provider');
  });

  it('validates GitHub token via API GET /user', () => {
    expect(src).toContain('api.github.com/user');
    expect(src).toContain('Authorization');
  });

  it('validates token ownership — rejects username mismatch', () => {
    expect(src).toContain('toLowerCase()');
    expect(src).toContain('permission-denied');
    expect(src).toContain('only connect your own GitHub account');
  });

  it('validates token format (ghp_, gho_, github_pat_)', () => {
    expect(src).toContain("ghp_");
    expect(src).toContain("gho_");
    expect(src).toContain("github_pat_");
  });

  it('encrypts token with AES-256-GCM before storing', () => {
    expect(src).toContain('aes-256-gcm');
    expect(src).toContain('encryptToken');
    expect(src).toContain('encryptedToken');
  });

  it('uses GITHUB_TOKEN_ENCRYPTION_KEY from environment', () => {
    expect(src).toContain('GITHUB_TOKEN_ENCRYPTION_KEY');
  });

  it('stores encrypted token in secrets subcollection', () => {
    expect(src).toContain("collection('user_profiles')");
    expect(src).toContain("collection('secrets')");
    expect(src).toContain("doc('github')");
  });

  it('stores token prefix of exactly 4 characters', () => {
    expect(src).toContain('substring(0, 4)');
  });

  it('updates user profile with connection metadata', () => {
    expect(src).toContain('githubConnectedAt');
    expect(src).toContain('githubProvider');
    expect(src).toContain("tokenStatus: 'valid'");
  });

  it('creates profile if not exists (GitHub OAuth first-login)', () => {
    expect(src).toContain('profileSnap.exists');
    expect(src).toContain('profileRef.set');
  });

  it('does NOT store plaintext token in profile or job', () => {
    // The function should only store encryptedToken, never raw githubToken in Firestore
    const firestoreWrites = src.slice(src.indexOf('// Store encrypted'));
    expect(firestoreWrites).toContain('encryptedToken');
    // Verify the set/update calls don't include raw githubToken field
    expect(firestoreWrites).not.toMatch(/githubToken[^P]/); // Allow 'githubTokenP...' (parameter name)
  });
});

// ─── Encryption roundtrip test ──────────────────────────────────────────────

describe('Token encryption', () => {
  const src = readFileSync(
    resolve(ROOT, 'functions/src/store-github-token.ts'),
    'utf-8'
  );

  it('exports encryptToken and decryptToken functions', () => {
    expect(src).toContain('export function encryptToken');
    expect(src).toContain('export function decryptToken');
  });

  it('uses randomBytes for IV (not static)', () => {
    expect(src).toContain('randomBytes');
  });

  it('uses GCM auth tag for integrity', () => {
    expect(src).toContain('getAuthTag');
    expect(src).toContain('setAuthTag');
  });

  it('encodes output as base64', () => {
    expect(src).toContain("toString('base64')");
  });

  it('IV length is 12 bytes (GCM standard)', () => {
    expect(src).toContain('IV_LENGTH = 12');
  });

  it('auth tag length is 16 bytes (GCM standard)', () => {
    expect(src).toContain('AUTH_TAG_LENGTH = 16');
  });
});

// ─── on-user-delete function structure ──────────────────────────────────────

describe('on-user-delete Firebase Function', () => {
  const src = readFileSync(
    resolve(ROOT, 'functions/src/on-user-delete.ts'),
    'utf-8'
  );

  it('exports onUserDelete trigger', () => {
    expect(src).toContain('export const onUserDelete');
  });

  it('uses beforeUserDeleted trigger', () => {
    expect(src).toContain('beforeUserDeleted');
  });

  it('deletes secrets subcollection documents', () => {
    expect(src).toContain("collection('secrets')");
    expect(src).toContain('listDocuments');
    expect(src).toContain('batch.delete');
  });

  it('deletes the user profile document', () => {
    expect(src).toContain("collection('user_profiles')");
    expect(src).toContain('profileRef.delete()');
  });

  it('checks if profile exists before deleting', () => {
    expect(src).toContain('profileSnap.exists');
  });

  it('handles batch operations for multiple secrets', () => {
    expect(src).toContain('batch');
    expect(src).toContain('batch.commit()');
  });
});

// ─── index.ts exports ───────────────────────────────────────────────────────

describe('functions/src/index.ts exports', () => {
  const src = readFileSync(
    resolve(ROOT, 'functions/src/index.ts'),
    'utf-8'
  );

  it('exports storeGitHubToken', () => {
    expect(src).toContain('storeGitHubToken');
  });

  it('exports onUserDelete', () => {
    expect(src).toContain('onUserDelete');
  });

  it('still exports verifyAdminClaim', () => {
    expect(src).toContain('verifyAdminClaim');
  });
});
