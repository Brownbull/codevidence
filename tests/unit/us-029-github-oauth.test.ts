/**
 * tests/unit/us-029-github-oauth.test.ts
 *
 * Unit tests for US-029: GitHub OAuth login with auto-link.
 * Tests auth module, AuthContext, and LoginPage structure.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

// ─── firebase-auth.ts — GitHub OAuth support ────────────────────────────────

describe('firebase-auth.ts — GitHub OAuth', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/core/auth/firebase-auth.ts'),
    'utf-8'
  );

  it('imports GithubAuthProvider', () => {
    expect(src).toContain('GithubAuthProvider');
  });

  it('exports signInWithGitHub function', () => {
    expect(src).toContain('export async function signInWithGitHub');
  });

  it('exports GitHubSignInResult interface', () => {
    expect(src).toContain('export interface GitHubSignInResult');
    expect(src).toContain('accessToken: string');
    expect(src).toContain('githubUsername: string');
  });

  it('requests read:user scope', () => {
    expect(src).toContain("addScope('read:user')");
  });

  it('requests repo scope for private repo access', () => {
    expect(src).toContain("addScope('repo')");
  });

  it('uses signInWithPopup (same pattern as Google)', () => {
    expect(src).toContain('signInWithPopup(getAuthInstance(), provider)');
  });

  it('extracts credential from GithubAuthProvider', () => {
    expect(src).toContain('GithubAuthProvider.credentialFromResult');
  });

  it('extracts GitHub username from provider data', () => {
    expect(src).toContain("providerId === 'github.com'");
  });
});

// ─── AuthContext.tsx — GitHub state exposure ─────────────────────────────────

describe('AuthContext.tsx — GitHub state', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/app/auth/AuthContext.tsx'),
    'utf-8'
  );

  it('imports signInWithGitHub from firebase-auth', () => {
    expect(src).toContain('signInWithGitHub');
  });

  it('imports getUserProfile handler', () => {
    expect(src).toContain("from '@/handlers/user-profile'");
  });

  it('imports UserProfile type', () => {
    expect(src).toContain("from '@/types/user-profile'");
  });

  it('exposes githubUsername in AuthContextValue', () => {
    expect(src).toContain('githubUsername: string | null');
  });

  it('exposes isGitHubConnected in AuthContextValue', () => {
    expect(src).toContain('isGitHubConnected: boolean');
  });

  it('exposes tokenStatus in AuthContextValue', () => {
    expect(src).toContain("tokenStatus: UserProfile['tokenStatus']");
  });

  it('exposes signInWithGitHub in AuthContextValue', () => {
    expect(src).toContain('signInWithGitHub: () => Promise<void>');
  });

  it('exposes refreshProfile in AuthContextValue', () => {
    expect(src).toContain('refreshProfile: () => Promise<void>');
  });

  it('loads user profile on auth state change', () => {
    expect(src).toContain('loadProfile');
    expect(src).toContain('getUserProfile');
  });

  it('computes isGitHubConnected from githubUsername', () => {
    expect(src).toContain('isGitHubConnected: githubUsername !== null');
  });

  it('resets GitHub state on sign out', () => {
    // When firebaseUser is null, GitHub state should be cleared
    expect(src).toContain('setGithubUsername(null)');
    expect(src).toContain('setTokenStatus(null)');
  });
});

// ─── LoginPage.tsx — GitHub button ──────────────────────────────────────────

describe('LoginPage.tsx — GitHub sign-in button', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/app/pages/LoginPage.tsx'),
    'utf-8'
  );

  it('destructures signInWithGitHub from useAuth', () => {
    expect(src).toContain('signInWithGitHub');
  });

  it('has a GitHub sign-in button', () => {
    expect(src).toContain('Sign in with GitHub');
  });

  it('has data-testid for GitHub button', () => {
    expect(src).toContain('data-testid="github-login-button"');
  });

  it('has aria-label for GitHub button', () => {
    expect(src).toContain('aria-label="Sign in with GitHub"');
  });

  it('has GitHub octocat SVG icon', () => {
    // GitHub's octocat SVG uses viewBox 0 0 16 16
    expect(src).toContain('viewBox="0 0 16 16"');
  });

  it('GitHub button has distinct dark styling', () => {
    expect(src).toContain('bg-slate-800');
  });

  it('still has Google sign-in button', () => {
    expect(src).toContain('Sign in with Google');
    expect(src).toContain('aria-label="Sign in with Google"');
  });
});
