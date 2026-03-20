/**
 * tests/unit/us-027-user-profiles.test.ts
 *
 * Unit tests for US-027: User profile data model, types, Firestore rules,
 * Admin SDK wrapper, and scan-job type extensions.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

// ─── Type structure tests ────────────────────────────────────────────────────

describe('UserProfile type', () => {
  const src = readFileSync(resolve(ROOT, 'src/types/user-profile.ts'), 'utf-8');

  it('exports UserProfile interface with required fields', () => {
    expect(src).toContain('export interface UserProfile');
    expect(src).toContain('uid: string');
    expect(src).toContain('githubUsername: string | null');
    expect(src).toContain('githubConnectedAt: Timestamp | null');
    expect(src).toContain("githubProvider: 'oauth' | 'pat' | null");
    expect(src).toContain("tokenStatus: 'valid' | 'expired' | 'revoked' | null");
    expect(src).toContain('lastSelfScanAt: Timestamp | null');
    expect(src).toContain('selfScanCount: number');
    expect(src).toContain('createdAt: Timestamp');
    expect(src).toContain('updatedAt: Timestamp');
  });

  it('exports UserProfileClientWritableFields with only safe fields', () => {
    expect(src).toContain('export type UserProfileClientWritableFields');
    expect(src).toContain("'uid' | 'githubUsername' | 'createdAt' | 'updatedAt'");
  });

  it('exports UserGitHubSecret interface with encrypted token', () => {
    expect(src).toContain('export interface UserGitHubSecret');
    expect(src).toContain('encryptedToken: string');
    expect(src).toContain('tokenPrefix: string');
    expect(src).toContain('expiresAt: Timestamp | null');
  });

  it('does NOT store plaintext token', () => {
    // The field must be encryptedToken, not githubToken or token
    expect(src).not.toMatch(/^\s+githubToken:\s+string;/m);
    expect(src).not.toMatch(/^\s+token:\s+string;/m);
  });
});

// ─── ScanJob type extensions ────────────────────────────────────────────────

describe('ScanJob type extensions', () => {
  const src = readFileSync(resolve(ROOT, 'src/types/scan-job.ts'), 'utf-8');

  it('includes self-scan in ScanJobType union', () => {
    expect(src).toContain("'self-scan'");
  });

  it('exports SelfScanPayload with requestedBy and githubUsername', () => {
    expect(src).toContain('export interface SelfScanPayload');
    expect(src).toContain('requestedBy: string');
    expect(src).toContain('githubUsername: string');
  });

  it('SelfScanPayload does NOT contain githubToken', () => {
    // Extract just the SelfScanPayload interface
    const match = src.match(/export interface SelfScanPayload \{[\s\S]*?\}/);
    expect(match).not.toBeNull();
    expect(match![0]).not.toContain('githubToken');
  });

  it('ScanRepoPayload includes tokenSourceUid for self-scan flow', () => {
    expect(src).toContain('tokenSourceUid?: string');
  });

  it('ScanJob payload union includes SelfScanPayload', () => {
    expect(src).toContain('SelfScanPayload');
    expect(src).toMatch(/payload:.*SelfScanPayload/);
  });
});

// ─── Firestore rules tests ──────────────────────────────────────────────────

describe('Firestore security rules - user_profiles', () => {
  const rules = readFileSync(resolve(ROOT, 'firestore.rules'), 'utf-8');

  it('has user_profiles collection rules', () => {
    expect(rules).toContain('match /user_profiles/{uid}');
  });

  it('allows owner to read their own profile', () => {
    expect(rules).toContain('request.auth.uid == uid');
  });

  it('allows admin to read profiles', () => {
    expect(rules).toContain('isAdmin()');
  });

  it('enforces field-level protection on create', () => {
    // Must block pipeline-only fields on client create
    expect(rules).toContain('githubProvider');
    expect(rules).toContain('githubConnectedAt');
    expect(rules).toContain('tokenStatus');
    expect(rules).toContain('lastSelfScanAt');
    expect(rules).toContain('selfScanCount');
    expect(rules).toContain('hasAny');
  });

  it('restricts update to only githubUsername + updatedAt', () => {
    expect(rules).toContain('affectedKeys');
    expect(rules).toContain("hasOnly(['githubUsername', 'updatedAt'])");
  });

  it('has secrets subcollection rules', () => {
    expect(rules).toContain('match /secrets/{secretId}');
  });

  it('denies all client writes to secrets', () => {
    expect(rules).toContain('allow write: if false');
  });

  it('allows owner and admin to read secrets', () => {
    const secretsSection = rules.slice(
      rules.indexOf('match /secrets/{secretId}')
    );
    expect(secretsSection).toContain('request.auth.uid == uid || isAdmin()');
  });
});

describe('Firestore security rules - self-scan jobs', () => {
  const rules = readFileSync(resolve(ROOT, 'firestore.rules'), 'utf-8');

  it('allows authenticated users to create self-scan jobs', () => {
    expect(rules).toContain("request.resource.data.type == 'self-scan'");
    expect(rules).toContain("request.resource.data.status == 'pending'");
  });

  it('validates requestedBy matches auth uid', () => {
    expect(rules).toContain(
      'request.resource.data.payload.requestedBy == request.auth.uid'
    );
  });

  it('validates githubUsername matches user profile', () => {
    expect(rules).toContain('user_profiles');
    expect(rules).toContain('githubUsername');
  });

  it('blocks githubToken in self-scan payload', () => {
    expect(rules).toContain("!('githubToken' in request.resource.data.payload)");
  });

  it('allows users to read their own self-scan jobs', () => {
    expect(rules).toContain("resource.data.type == 'self-scan'");
    expect(rules).toContain('resource.data.payload.requestedBy == request.auth.uid');
  });
});

// ─── Firestore indexes tests ────────────────────────────────────────────────

describe('Firestore indexes - self-scan queries', () => {
  const indexes = JSON.parse(
    readFileSync(resolve(ROOT, 'firestore.indexes.json'), 'utf-8')
  );

  it('has index for querying self-scan jobs by type + requestedBy + status', () => {
    const found = indexes.indexes.some(
      (idx: { collectionGroup: string; fields: { fieldPath: string }[] }) =>
        idx.collectionGroup === 'scan_jobs' &&
        idx.fields.some((f: { fieldPath: string }) => f.fieldPath === 'type') &&
        idx.fields.some(
          (f: { fieldPath: string }) => f.fieldPath === 'payload.requestedBy'
        ) &&
        idx.fields.some((f: { fieldPath: string }) => f.fieldPath === 'status')
    );
    expect(found).toBe(true);
  });

  it('has index for querying self-scan jobs by type + requestedBy + createdAt', () => {
    const found = indexes.indexes.some(
      (idx: { collectionGroup: string; fields: { fieldPath: string }[] }) =>
        idx.collectionGroup === 'scan_jobs' &&
        idx.fields.some((f: { fieldPath: string }) => f.fieldPath === 'type') &&
        idx.fields.some(
          (f: { fieldPath: string }) => f.fieldPath === 'payload.requestedBy'
        ) &&
        idx.fields.some(
          (f: { fieldPath: string }) => f.fieldPath === 'createdAt'
        )
    );
    expect(found).toBe(true);
  });
});

// ─── Admin SDK wrapper tests ────────────────────────────────────────────────

describe('Admin SDK Firestore wrapper', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/core/db/firestore-admin.ts'),
    'utf-8'
  );

  it('imports from firebase-admin packages', () => {
    expect(src).toContain("from 'firebase-admin/app'");
    expect(src).toContain("from 'firebase-admin/firestore'");
  });

  it('exports matching interface: getDoc, setDoc, updateDoc, deleteDoc, addDoc', () => {
    expect(src).toContain('export async function getDoc');
    expect(src).toContain('export async function setDoc');
    expect(src).toContain('export async function updateDoc');
    expect(src).toContain('export async function deleteDoc');
    expect(src).toContain('export async function addDoc');
  });

  it('exports queryDocs function', () => {
    expect(src).toContain('export async function queryDocs');
  });

  it('exports serverTimestamp function', () => {
    expect(src).toContain('export function serverTimestamp');
  });

  it('exports increment function', () => {
    expect(src).toContain('export function increment');
  });

  it('exports query constraint builders: where, orderBy, limit', () => {
    expect(src).toContain('export function where');
    expect(src).toContain('export function orderBy');
    expect(src).toContain('export function limit');
  });

  it('exports isAdminMode detection function', () => {
    expect(src).toContain('export function isAdminMode');
    expect(src).toContain("FIREBASE_ADMIN");
  });

  it('supports emulator connection', () => {
    expect(src).toContain('FIRESTORE_EMULATOR_HOST');
  });

  it('does NOT import from client SDK (firebase/firestore)', () => {
    expect(src).not.toContain("from 'firebase/firestore'");
  });
});

// ─── Handler tests ──────────────────────────────────────────────────────────

describe('user-profile handler', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/handlers/user-profile.ts'),
    'utf-8'
  );

  it('exports USER_PROFILES_COLLECTION constant', () => {
    expect(src).toContain("export const USER_PROFILES_COLLECTION = 'user_profiles'");
  });

  it('exports getUserProfile function', () => {
    expect(src).toContain('export async function getUserProfile');
  });

  it('exports createUserProfile function', () => {
    expect(src).toContain('export async function createUserProfile');
  });

  it('exports updateGitHubUsername function', () => {
    expect(src).toContain('export async function updateGitHubUsername');
  });

  it('exports getGitHubSecret function', () => {
    expect(src).toContain('export async function getGitHubSecret');
  });

  it('exports hasPendingSelfScan function', () => {
    expect(src).toContain('export async function hasPendingSelfScan');
  });

  it('exports secretsPath helper', () => {
    expect(src).toContain('export function secretsPath');
  });

  it('imports from Firestore wrapper (not direct SDK)', () => {
    expect(src).toContain("from '../core/db/firestore.js'");
    expect(src).not.toContain("from 'firebase/firestore'");
  });

  it('initializes pipeline-only fields to null/0 in createUserProfile', () => {
    expect(src).toContain('githubConnectedAt: null');
    expect(src).toContain('githubProvider: null');
    expect(src).toContain('tokenStatus: null');
    expect(src).toContain('lastSelfScanAt: null');
    expect(src).toContain('selfScanCount: 0');
  });
});

// ─── Queue extension tests ──────────────────────────────────────────────────

describe('queue.ts - self-scan support', () => {
  const src = readFileSync(resolve(ROOT, 'src/pipeline/queue.ts'), 'utf-8');

  it('imports SelfScanPayload type', () => {
    expect(src).toContain('SelfScanPayload');
  });

  it('exports enqueueSelfScanJob function', () => {
    expect(src).toContain('export async function enqueueSelfScanJob');
  });

  it('enqueueSelfScanJob uses self-scan type', () => {
    expect(src).toContain("enqueueJob('self-scan'");
  });
});
