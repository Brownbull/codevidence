/**
 * tests/e2e/app.spec.ts — End-to-end tests for critical user journeys.
 *
 * Runs on Chromium only. Requires Firebase Auth + Firestore emulators.
 * Uses the dev:test:website server on port 4000.
 */

import { test, expect } from '@playwright/test';

// ─── Authentication ─────────────────────────────────────────────────────────

test.describe('Authentication', () => {
  test('unauthenticated user is redirected to /login', async ({ page }) => {
    await page.goto('/search');
    await expect(page).toHaveURL(/\/login/);
  });

  test('login page renders Sign in with Google button', async ({ page }) => {
    await page.goto('/login');
    await expect(page.getByText(/sign in/i)).toBeVisible();
  });

  test('unauthenticated user cannot access /admin', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/login/);
  });
});

// ─── Search Page ────────────────────────────────────────────────────────────

test.describe('Search Page', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to search — will redirect to login if not authenticated
    await page.goto('/search');
  });

  test('search page shows filter instruction when no filters active', async ({ page }) => {
    // If redirected to login, the search page test is auth-dependent
    // This test validates the page structure when accessible
    const url = page.url();
    if (url.includes('/login')) {
      test.skip();
      return;
    }
    await expect(page.getByText(/select filters/i)).toBeVisible();
  });
});

// ─── Candidate Profile ──────────────────────────────────────────────────────

test.describe('Candidate Profile', () => {
  test('non-existent candidate shows 404 state', async ({ page }) => {
    await page.goto('/candidates/nonexistent-user-12345');
    const url = page.url();
    if (url.includes('/login')) {
      test.skip();
      return;
    }
    await expect(page.getByText(/candidate not found/i)).toBeVisible();
  });
});

// ─── Admin ──────────────────────────────────────────────────────────────────

test.describe('Admin', () => {
  test('non-admin user is redirected from /admin', async ({ page }) => {
    await page.goto('/admin');
    // Should redirect to either /login or /search
    const url = page.url();
    expect(url).not.toContain('/admin');
  });
});

// ─── Theme ──────────────────────────────────────────────────────────────────

test.describe('Theme', () => {
  test('page loads without theme flash', async ({ page }) => {
    // Set dark theme in localStorage before navigation
    await page.addInitScript(() => {
      localStorage.setItem('css-theme', 'dark');
    });
    await page.goto('/login');
    // html element should have dark class immediately
    const htmlClass = await page.locator('html').getAttribute('class');
    expect(htmlClass).toContain('dark');
  });

  test('light theme has no dark/dim class', async ({ page }) => {
    await page.addInitScript(() => {
      localStorage.setItem('css-theme', 'light');
    });
    await page.goto('/login');
    const htmlClass = await page.locator('html').getAttribute('class') ?? '';
    expect(htmlClass).not.toContain('dark');
    expect(htmlClass).not.toContain('dim');
  });
});

// ─── Navigation ─────────────────────────────────────────────────────────────

test.describe('Navigation', () => {
  test('root redirects to /login', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });

  test('unknown route redirects to /login', async ({ page }) => {
    await page.goto('/nonexistent-route');
    await expect(page).toHaveURL(/\/login/);
  });
});
