/**
 * tests/unit/us-012-app-shell.test.ts
 *
 * Unit tests for US-012: App shell, routing, taxonomy facet panel, and URL state.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── AppShell Layout ─────────────────────────────────────────────────────────

describe('US-012: AppShell Layout', () => {
  const src = readSource('src/app/components/layout/AppShell.tsx');

  it('renders top nav with h-12 and slate-900 background', () => {
    expect(src).toContain('h-12');
    expect(src).toContain('bg-slate-900');
  });

  it('uses Space Grotesk via font-sans for branding', () => {
    expect(src).toContain('font-sans');
  });

  it('shows user avatar with photo URL', () => {
    expect(src).toContain('user?.photoURL');
    expect(src).toContain('rounded-full');
  });

  it('shows user display name', () => {
    expect(src).toContain('user?.displayName');
  });

  it('includes sign-out button', () => {
    expect(src).toContain('Sign out');
    expect(src).toContain('signOut()');
  });

  it('shows admin link for admin users', () => {
    expect(src).toContain('isAdmin');
    expect(src).toContain('/admin');
  });

  it('uses responsive layout with mobile support', () => {
    expect(src).toContain('hidden md:block');
    expect(src).toContain('mobileFiltersOpen');
  });

  it('uses slate-50 body background', () => {
    expect(src).toContain('bg-surface');
  });

  it('accepts sidebar and children props', () => {
    expect(src).toContain('sidebar');
    expect(src).toContain('children');
  });

  it('renders three-zone layout (nav + sidebar + main)', () => {
    expect(src).toContain('<nav');
    expect(src).toContain('{sidebar}');
    expect(src).toContain('<main');
  });
});

// ─── FacetPanel ──────────────────────────────────────────────────────────────

describe('US-012: FacetPanel', () => {
  const src = readSource('src/app/components/search/FacetPanel.tsx');

  it('is located at src/app/components/search/FacetPanel.tsx', () => {
    expect(src).toBeDefined();
    expect(src.length).toBeGreaterThan(0);
  });

  it('uses <fieldset> and <legend> for WCAG 2.1 AA', () => {
    expect(src).toContain('<fieldset');
    expect(src).toContain('<legend');
  });

  it('renders five category sections', () => {
    expect(src).toContain("'Languages'");
    expect(src).toContain("'Frameworks'");
    expect(src).toContain("'Tools'");
    expect(src).toContain("'AI Agent Patterns'");
    expect(src).toContain('AI Maturity Level');
  });

  it('renders checkboxes for taxonomy items', () => {
    expect(src).toContain('type="checkbox"');
  });

  it('shows candidateCount as muted badge', () => {
    expect(src).toContain('item.candidateCount');
    expect(src).toContain('text-th-text-muted');
  });

  it('sections are collapsible with aria-expanded', () => {
    expect(src).toContain('aria-expanded');
  });

  it('imports useTaxonomy hook', () => {
    expect(src).toContain("from '@/app/hooks/useTaxonomy'");
    expect(src).toContain('useTaxonomy');
  });

  it('imports useSearchQuery hook', () => {
    expect(src).toContain("from '@/app/hooks/useSearchQuery'");
    expect(src).toContain('useSearchQuery');
  });

  it('imports useUiStore for section open/closed state', () => {
    expect(src).toContain("from '@/app/store/ui-store'");
    expect(src).toContain('useUiStore');
  });

  it('uses groupByCategory to organize taxonomy items', () => {
    expect(src).toContain('groupByCategory');
  });

  it('shows displayName for each item', () => {
    expect(src).toContain('item.displayName');
  });

  it('uses font-mono for technical identifiers', () => {
    expect(src).toContain('font-mono');
  });

  it('shows loading skeleton while taxonomy loads', () => {
    expect(src).toContain('isLoading');
    expect(src).toContain('animate-pulse');
  });

  it('has w-64 width', () => {
    expect(src).toContain('w-64');
  });
});

// ─── useSearchQuery Hook ─────────────────────────────────────────────────────

describe('US-012: useSearchQuery Hook', () => {
  const src = readSource('src/app/hooks/useSearchQuery.ts');

  it('exports useSearchQuery function', () => {
    expect(src).toContain('export function useSearchQuery');
  });

  it('uses useSearchParams from react-router-dom', () => {
    expect(src).toContain("from 'react-router-dom'");
    expect(src).toContain('useSearchParams');
  });

  it('imports SearchQueryParams type', () => {
    expect(src).toContain('SearchQueryParams');
  });

  it('parses lang param to language taxonomy IDs', () => {
    expect(src).toContain("'lang'");
    expect(src).toContain("'language'");
  });

  it('parses framework param to framework taxonomy IDs', () => {
    expect(src).toContain("'framework'");
  });

  it('parses tool param to tool taxonomy IDs', () => {
    expect(src).toContain("'tool'");
  });

  it('parses aiPattern param to ai-agent-pattern taxonomy IDs', () => {
    expect(src).toContain("'aiPattern'");
    expect(src).toContain("'ai-agent-pattern'");
  });

  it('parses aiMin param to aiMaturityMin', () => {
    expect(src).toContain("'aiMin'");
    expect(src).toContain('aiMaturityMin');
  });

  it('parses sort param to sortBy', () => {
    expect(src).toContain("'sort'");
    expect(src).toContain("'skillScore'");
    expect(src).toContain("'aiMaturityScore'");
    expect(src).toContain("'lastScanned'");
  });

  it('provides clearAll function', () => {
    expect(src).toContain('clearAll');
    expect(src).toContain('new URLSearchParams()');
  });

  it('provides toggleTaxonomyId function', () => {
    expect(src).toContain('toggleTaxonomyId');
  });

  it('provides hasAnyFilter computed value', () => {
    expect(src).toContain('hasAnyFilter');
  });

  it('URL is single source of truth — uses useMemo for params', () => {
    expect(src).toContain('useMemo');
  });

  it('writes changes back to URL via setSearchParams', () => {
    expect(src).toContain('setSearchParams');
  });
});

// ─── useTaxonomy Hook ────────────────────────────────────────────────────────

describe('US-012: useTaxonomy Hook', () => {
  const src = readSource('src/app/hooks/useTaxonomy.ts');

  it('exports useTaxonomy hook', () => {
    expect(src).toContain('export function useTaxonomy');
  });

  it('uses TanStack Query useQuery', () => {
    expect(src).toContain("from '@tanstack/react-query'");
    expect(src).toContain('useQuery');
  });

  it('queries isSearchable: true taxonomy items', () => {
    expect(src).toContain("where('isSearchable', '==', true)");
  });

  it('orders by category and sortOrder', () => {
    expect(src).toContain("orderBy('category')");
    expect(src).toContain("orderBy('sortOrder')");
  });

  it('exports groupByCategory function', () => {
    expect(src).toContain('export function groupByCategory');
  });

  it('groups into five categories', () => {
    expect(src).toContain("'language'");
    expect(src).toContain("'framework'");
    expect(src).toContain("'tool'");
    expect(src).toContain("'ai-agent-pattern'");
    expect(src).toContain("'ai-maturity-level'");
  });

  it('sets staleTime to 5 minutes', () => {
    expect(src).toContain('staleTime: 5 * 60 * 1000');
  });

  it('uses Firestore wrapper, not direct SDK imports', () => {
    expect(src).toContain("from '@/core/db/firestore'");
    expect(src).not.toContain("from 'firebase/firestore'");
  });
});

// ─── Zustand UI Store ────────────────────────────────────────────────────────

describe('US-012: Zustand UI Store', () => {
  const src = readSource('src/app/store/ui-store.ts');

  it('exports useUiStore Zustand hook', () => {
    expect(src).toContain('export const useUiStore');
    expect(src).toContain("from 'zustand'");
  });

  it('holds only UI state (panel open/closed)', () => {
    expect(src).toContain('openSections');
    expect(src).toContain('toggleSection');
  });

  it('does NOT hold filter values', () => {
    expect(src).not.toContain('languages');
    expect(src).not.toContain('frameworks');
    expect(src).not.toContain('sortBy');
  });

  it('defaults all sections to open', () => {
    expect(src).toContain("'language': true");
    expect(src).toContain("'framework': true");
    expect(src).toContain("'tool': true");
    expect(src).toContain("'ai-agent-pattern': true");
    expect(src).toContain("'ai-maturity-level': true");
  });
});

// ─── SearchPage Integration ──────────────────────────────────────────────────

describe('US-012: SearchPage Integration', () => {
  const src = readSource('src/app/pages/SearchPage.tsx');

  it('imports AppShell layout component', () => {
    expect(src).toContain("from '@/app/components/layout/AppShell'");
    expect(src).toContain('AppShell');
  });

  it('imports FacetPanel component', () => {
    expect(src).toContain("from '@/app/components/search/FacetPanel'");
    expect(src).toContain('FacetPanel');
  });

  it('imports useSearchQuery hook', () => {
    expect(src).toContain("from '@/app/hooks/useSearchQuery'");
    expect(src).toContain('useSearchQuery');
  });

  it('passes FacetPanel as sidebar to AppShell', () => {
    expect(src).toContain('<FacetPanel');
    expect(src).toContain('sidebar=');
  });
});

// ─── main.tsx QueryClientProvider ────────────────────────────────────────────

describe('US-012: main.tsx — QueryClientProvider', () => {
  const src = readSource('src/app/main.tsx');

  it('imports QueryClient and QueryClientProvider', () => {
    expect(src).toContain("from '@tanstack/react-query'");
    expect(src).toContain('QueryClient');
    expect(src).toContain('QueryClientProvider');
  });

  it('creates QueryClient with default staleTime', () => {
    expect(src).toContain('new QueryClient');
    expect(src).toContain('staleTime');
  });

  it('wraps app in QueryClientProvider', () => {
    expect(src).toContain('<QueryClientProvider');
    expect(src).toContain('</QueryClientProvider>');
  });

  it('maintains existing routing structure', () => {
    expect(src).toContain('<BrowserRouter>');
    expect(src).toContain('<AuthProvider>');
    expect(src).toContain('PrivateRoute');
    expect(src).toContain('AdminRoute');
    expect(src).toContain('/search');
    expect(src).toContain('/candidates/:id');
    expect(src).toContain('/admin/*');
  });
});

// ─── JetBrains Mono for Technical Identifiers ───────────────────────────────

describe('US-012: JetBrains Mono for Technical Identifiers', () => {
  const styles = readSource('src/app/styles.css');
  const tailwind = readSource('tailwind.config.ts');

  it('defines JetBrains Mono as mono font in Tailwind config', () => {
    expect(tailwind).toContain('JetBrains Mono');
    expect(tailwind).toContain('mono:');
  });

  it('applies font-mono via CSS to code elements', () => {
    expect(styles).toContain('.font-mono');
    expect(styles).toContain('var(--font-mono)');
  });

  it('FacetPanel uses font-mono for taxonomy display names', () => {
    const facet = readSource('src/app/components/search/FacetPanel.tsx');
    expect(facet).toContain('font-mono');
  });
});
