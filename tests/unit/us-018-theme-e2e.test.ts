/**
 * tests/unit/us-018-theme-e2e.test.ts
 *
 * Unit tests for US-018: Theme switching, PAT expiry surface,
 * E2E test suite, and Firebase Hosting deploy.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── SettingsPopover ────────────────────────────────────────────────────────

describe('US-018: SettingsPopover Component', () => {
  const src = readSource('src/app/components/layout/SettingsPopover.tsx');

  it('renders theme selector with Light, Dark, Dim options', () => {
    expect(src).toContain("label: 'Light'");
    expect(src).toContain("label: 'Dark'");
    expect(src).toContain("label: 'Dim'");
  });

  it('renders font family selector with all required fonts', () => {
    expect(src).toContain('Space Grotesk');
    expect(src).toContain('Inter');
    expect(src).toContain('Outfit');
    expect(src).toContain('IBM Plex Sans');
    expect(src).toContain('Geist');
  });

  it('persists theme to localStorage', () => {
    expect(src).toContain("localStorage.setItem(STORAGE_THEME_KEY");
    expect(src).toContain('css-theme');
  });

  it('persists font to localStorage', () => {
    expect(src).toContain("localStorage.setItem(STORAGE_FONT_KEY");
    expect(src).toContain('css-font-family');
  });

  it('reads stored theme on init', () => {
    expect(src).toContain("localStorage.getItem(STORAGE_THEME_KEY)");
    expect(src).toContain('getStoredTheme');
  });

  it('reads stored font on init', () => {
    expect(src).toContain("localStorage.getItem(STORAGE_FONT_KEY)");
    expect(src).toContain('getStoredFont');
  });

  it('applies dark class to html element', () => {
    expect(src).toContain("html.classList.add('dark')");
  });

  it('applies dim class to html element', () => {
    expect(src).toContain("html.classList.add('dim')");
  });

  it('removes dark/dim classes for light theme', () => {
    expect(src).toContain("html.classList.remove('dark', 'dim')");
  });

  it('applies font via CSS variable --font-sans', () => {
    expect(src).toContain("'--font-sans'");
    expect(src).toContain('setProperty');
  });

  it('mentions JetBrains Mono stays as monospace', () => {
    expect(src).toContain('JetBrains Mono');
    expect(src).toContain('monospace');
  });

  it('uses gear icon button', () => {
    expect(src).toContain("'\\u2699'");
    expect(src).toContain('Settings');
  });

  it('highlights active theme', () => {
    expect(src).toContain('theme === t.id');
    expect(src).toContain('bg-indigo-600 text-white');
  });
});

// ─── Flash Prevention ───────────────────────────────────────────────────────

describe('US-018: Theme Flash Prevention', () => {
  const src = readSource('index.html');

  it('index.html has inline script before React mount', () => {
    expect(src).toContain('<script>');
    expect(src).toContain('css-theme');
  });

  it('reads theme from localStorage before render', () => {
    expect(src).toContain("localStorage.getItem('css-theme')");
  });

  it('applies dark class immediately', () => {
    expect(src).toContain("classList.add('dark')");
  });

  it('applies dim class immediately', () => {
    expect(src).toContain("classList.add('dim')");
  });

  it('reads font from localStorage', () => {
    expect(src).toContain("localStorage.getItem('css-font-family')");
  });

  it('sets --font-sans CSS variable', () => {
    expect(src).toContain('--font-sans');
  });

  it('loads additional Google Fonts for font options', () => {
    expect(src).toContain('Inter');
    expect(src).toContain('Outfit');
    expect(src).toContain('IBM+Plex+Sans');
  });
});

// ─── AppShell Integration ───────────────────────────────────────────────────

describe('US-018: AppShell — SettingsPopover Integration', () => {
  const src = readSource('src/app/components/layout/AppShell.tsx');

  it('imports SettingsPopover', () => {
    expect(src).toContain('SettingsPopover');
  });

  it('renders SettingsPopover in nav', () => {
    expect(src).toContain('<SettingsPopover');
  });
});

// ─── CSS Themes ─────────────────────────────────────────────────────────────

describe('US-018: CSS Theme Styles', () => {
  const src = readSource('src/app/styles.css');

  it('has dark theme styles', () => {
    expect(src).toContain('html.dark');
    expect(src).toContain('color-scheme: dark');
  });

  it('has dim theme styles', () => {
    expect(src).toContain('html.dim');
  });

  it('JetBrains Mono stays as monospace', () => {
    expect(src).toContain('JetBrains Mono');
    expect(src).toContain('var(--font-mono)');
  });

  it('uses darkMode class strategy in tailwind config', () => {
    const twSrc = readSource('tailwind.config.ts');
    expect(twSrc).toContain("darkMode: 'class'");
  });
});

// ─── PAT Expiry Handler ─────────────────────────────────────────────────────

describe('US-018: PAT Expiry Handler', () => {
  const src = readSource('src/handlers/pat-expiry.ts');

  it('exports flagPatExpiry async function', () => {
    expect(src).toContain('export async function flagPatExpiry');
  });

  it('exports clearPatExpiryFlag async function', () => {
    expect(src).toContain('export async function clearPatExpiryFlag');
  });

  it('exports hasActivePatExpiryFlag async function', () => {
    expect(src).toContain('export async function hasActivePatExpiryFlag');
  });

  it('writes admin_flags doc with type pat-expired', () => {
    expect(src).toContain("'pat-expired'");
    expect(src).toContain("status: 'active'");
  });

  it('checks for existing active pat-expired flag', () => {
    expect(src).toContain("where('type', '==', 'pat-expired')");
    expect(src).toContain("where('status', '==', 'active')");
  });

  it('clears flag by setting status to actioned', () => {
    expect(src).toContain("status: 'actioned'");
  });

  it('imports from Firestore wrapper only', () => {
    expect(src).toContain("from '../core/db/firestore.js'");
    expect(src).not.toContain("from 'firebase/");
  });
});

// ─── PipelineTab Banner ─────────────────────────────────────────────────────

describe('US-018: PipelineTab PAT Expiry Banner', () => {
  const src = readSource('src/app/components/admin/PipelineTab.tsx');

  it('queries for active PAT expiry flag', () => {
    expect(src).toContain('hasActivePatExpiryFlag');
    expect(src).toContain("queryKey: ['pat-expiry-flag']");
  });

  it('renders PAT expiry banner when flag is active', () => {
    expect(src).toContain('patExpired');
    expect(src).toContain('GitHub API authentication error');
    expect(src).toContain('PAT may have expired');
  });

  it('suggests checking GITHUB_PAT env var', () => {
    expect(src).toContain('GITHUB_PAT');
  });

  it('uses red styling for error banner', () => {
    expect(src).toContain('bg-red-50');
    expect(src).toContain('text-red-800');
  });
});

// ─── AdminFlagType ──────────────────────────────────────────────────────────

describe('US-018: AdminFlagType includes pat-expired', () => {
  const src = readSource('src/types/admin.ts');

  it('AdminFlagType includes pat-expired', () => {
    expect(src).toContain("'pat-expired'");
  });
});

// ─── E2E Test Suite ─────────────────────────────────────────────────────────

describe('US-018: E2E Test Suite', () => {
  const src = readSource('tests/e2e/app.spec.ts');

  it('tests unauthenticated redirect to /login', () => {
    expect(src).toContain('unauthenticated');
    expect(src).toContain('/login');
  });

  it('tests login page renders sign in button', () => {
    expect(src).toContain('sign in');
  });

  it('tests non-admin /admin redirect', () => {
    expect(src).toContain('/admin');
    expect(src).toContain('redirected');
  });

  it('tests candidate profile 404 state', () => {
    expect(src).toContain('candidate not found');
  });

  it('tests theme flash prevention', () => {
    expect(src).toContain('css-theme');
    expect(src).toContain('dark');
  });

  it('tests root redirect', () => {
    expect(src).toContain("page.goto('/')");
    expect(src).toContain('/login');
  });

  it('uses Chromium only (playwright config)', () => {
    const pwSrc = readSource('playwright.config.ts');
    expect(pwSrc).toContain('chromium');
    expect(pwSrc).not.toContain('firefox');
    expect(pwSrc).not.toContain('webkit');
  });
});

// ─── CI Workflow ────────────────────────────────────────────────────────────

describe('US-018: GitHub Actions CI Deploy', () => {
  const src = readSource('.github/workflows/ci.yml');

  it('deploy job is gated on main branch', () => {
    expect(src).toContain("github.ref == 'refs/heads/main'");
  });

  it('deploy job depends on ci job', () => {
    expect(src).toContain('needs: ci');
  });

  it('uses Firebase deploy action', () => {
    expect(src).toContain('FirebaseExtended/action-hosting-deploy');
  });

  it('uses Firebase service account secret', () => {
    expect(src).toContain('FIREBASE_SERVICE_ACCOUNT');
  });

  it('runs build before deploy', () => {
    expect(src).toContain('pnpm build');
  });

  it('failed tests block deploy', () => {
    // ci job runs typecheck + test:unit + build; deploy needs: ci
    expect(src).toContain('pnpm test:unit');
    expect(src).toContain('pnpm typecheck');
    expect(src).toContain('pnpm build');
  });
});
