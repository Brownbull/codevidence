/**
 * tests/unit/us-030-my-profile.test.ts
 *
 * Unit tests for US-030: My Profile page with Connect GitHub flow.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';

const ROOT = resolve(import.meta.dirname, '../..');

// ─── MyProfilePage structure ────────────────────────────────────────────────

describe('MyProfilePage', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/app/pages/MyProfilePage.tsx'),
    'utf-8'
  );

  it('renders with data-testid', () => {
    expect(src).toContain('data-testid="my-profile-page"');
  });

  it('uses AppShell layout', () => {
    expect(src).toContain('<AppShell>');
  });

  it('imports useAuth for GitHub state', () => {
    expect(src).toContain('useAuth');
    expect(src).toContain('githubUsername');
    expect(src).toContain('isGitHubConnected');
    expect(src).toContain('tokenStatus');
  });

  it('imports useUserProfile and useGitHubSecret hooks', () => {
    expect(src).toContain('useUserProfile');
    expect(src).toContain('useGitHubSecret');
  });

  it('shows connected status when GitHub is linked', () => {
    expect(src).toContain('data-testid="github-connected-status"');
  });

  it('shows ConnectGitHubForm when not connected', () => {
    expect(src).toContain('data-testid="github-not-connected"');
    expect(src).toContain('<ConnectGitHubForm');
  });

  it('shows token status indicator', () => {
    expect(src).toContain('data-testid="token-status"');
  });

  it('shows token prefix from secret', () => {
    expect(src).toContain('tokenPrefix');
  });

  it('has disconnect button', () => {
    expect(src).toContain('data-testid="disconnect-github-button"');
    expect(src).toContain('useDisconnectGitHub');
  });

  it('links to candidate profile when scanned', () => {
    expect(src).toContain('data-testid="view-candidate-profile-link"');
    expect(src).toContain('/candidates/');
  });

  it('has scan history section (placeholder)', () => {
    expect(src).toContain('data-testid="scan-history-placeholder"');
    expect(src).toContain('Scan History');
  });
});

// ─── ConnectGitHubForm ──────────────────────────────────────────────────────

describe('ConnectGitHubForm', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/app/components/profile/ConnectGitHubForm.tsx'),
    'utf-8'
  );

  it('has data-testid', () => {
    expect(src).toContain('data-testid="connect-github-form"');
  });

  it('has GitHub username input', () => {
    expect(src).toContain('data-testid="github-username-input"');
    expect(src).toContain('type="text"');
  });

  it('has GitHub token input (password type)', () => {
    expect(src).toContain('data-testid="github-token-input"');
    expect(src).toContain('type="password"');
  });

  it('validates GitHub username format', () => {
    expect(src).toContain('GITHUB_USERNAME_REGEX');
    expect(src).toMatch(/\[a-zA-Z0-9\]/);
  });

  it('validates token prefix (ghp_, gho_, github_pat_)', () => {
    expect(src).toContain("'ghp_'");
    expect(src).toContain("'gho_'");
    expect(src).toContain("'github_pat_'");
  });

  it('uses sanitizeInput for username', () => {
    expect(src).toContain('sanitizeInput');
  });

  it('calls useConnectGitHub mutation', () => {
    expect(src).toContain('useConnectGitHub');
    expect(src).toContain('mutateAsync');
  });

  it('shows error messages', () => {
    expect(src).toContain('data-testid="connect-error"');
    expect(src).toContain('role="alert"');
  });

  it('has submit button', () => {
    expect(src).toContain('data-testid="connect-github-button"');
    expect(src).toContain('Connect GitHub');
  });

  it('links to grant-access page for PAT creation help', () => {
    expect(src).toContain('/grant-access');
    expect(src).toContain('How to create one');
  });

  it('enforces maxLength on username input', () => {
    expect(src).toContain('maxLength={39}');
  });
});

// ─── useUserProfile hooks ───────────────────────────────────────────────────

describe('useUserProfile hooks', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/app/hooks/useUserProfile.ts'),
    'utf-8'
  );

  it('exports useUserProfile hook', () => {
    expect(src).toContain('export function useUserProfile');
  });

  it('exports useGitHubSecret hook', () => {
    expect(src).toContain('export function useGitHubSecret');
  });

  it('exports useConnectGitHub mutation', () => {
    expect(src).toContain('export function useConnectGitHub');
  });

  it('exports useDisconnectGitHub mutation', () => {
    expect(src).toContain('export function useDisconnectGitHub');
  });

  it('uses TanStack Query with staleTime', () => {
    expect(src).toContain('useQuery');
    expect(src).toContain('useMutation');
    expect(src).toContain('staleTime: 5 * 60 * 1000');
  });

  it('calls storeGitHubToken Firebase Function', () => {
    expect(src).toContain('httpsCallable');
    expect(src).toContain("'storeGitHubToken'");
  });

  it('invalidates queries on success', () => {
    expect(src).toContain('invalidateQueries');
    expect(src).toContain('USER_PROFILE_KEY');
  });

  it('calls refreshProfile after mutations', () => {
    expect(src).toContain('refreshProfile');
  });
});

// ─── AppShell nav link ──────────────────────────────────────────────────────

describe('AppShell — My Profile nav link', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/app/components/layout/AppShell.tsx'),
    'utf-8'
  );

  it('has My Profile link', () => {
    expect(src).toContain('My Profile');
    expect(src).toContain('/my-profile');
  });

  it('has data-testid for nav link', () => {
    expect(src).toContain('data-testid="my-profile-nav-link"');
  });

  it('My Profile link appears before Admin link', () => {
    const profileIdx = src.indexOf('/my-profile');
    const adminIdx = src.indexOf('/admin');
    expect(profileIdx).toBeLessThan(adminIdx);
  });
});

// ─── Route registration ─────────────────────────────────────────────────────

describe('main.tsx — /my-profile route', () => {
  const src = readFileSync(resolve(ROOT, 'src/app/main.tsx'), 'utf-8');

  it('imports MyProfilePage', () => {
    expect(src).toContain('MyProfilePage');
  });

  it('registers /my-profile route under PrivateRoute', () => {
    expect(src).toContain('/my-profile');
    expect(src).toContain('MyProfilePage');
  });

  it('/my-profile is inside PrivateRoute (not public)', () => {
    const privateRouteIdx = src.indexOf('<Route element={<PrivateRoute');
    const myProfileIdx = src.indexOf('/my-profile');
    const adminRouteIdx = src.indexOf('<Route element={<AdminRoute');
    expect(myProfileIdx).toBeGreaterThan(privateRouteIdx);
    expect(myProfileIdx).toBeLessThan(adminRouteIdx);
  });
});

// ─── sanitizeInput utility ──────────────────────────────────────────────────

describe('sanitizeInput utility', () => {
  const src = readFileSync(
    resolve(ROOT, 'src/core/utils/sanitize.ts'),
    'utf-8'
  );

  it('exports sanitizeInput function', () => {
    expect(src).toContain('export function sanitizeInput');
  });

  it('accepts input and maxLength parameters', () => {
    expect(src).toContain('maxLength: number');
  });

  it('trims whitespace', () => {
    expect(src).toContain('.trim()');
  });

  it('slices to maxLength', () => {
    expect(src).toContain('.slice(0, maxLength)');
  });
});

// ─── Functional tests for sanitizeInput ─────────────────────────────────────

describe('sanitizeInput — functional', () => {
  it('trims and slices input', async () => {
    const { sanitizeInput } = await import('../../src/core/utils/sanitize.js');
    expect(sanitizeInput('  hello  ', 10)).toBe('hello');
    expect(sanitizeInput('abcdefghij', 5)).toBe('abcde');
  });

  it('returns empty string for null/undefined', async () => {
    const { sanitizeInput } = await import('../../src/core/utils/sanitize.js');
    expect(sanitizeInput(null, 10)).toBe('');
    expect(sanitizeInput(undefined, 10)).toBe('');
  });
});
