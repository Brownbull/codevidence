/**
 * src/app/store/ui-store.ts — Zustand store for UI-only state.
 *
 * Filter values live in URL (useSearchQuery hook).
 * This store holds only ephemeral UI state: panel section open/closed.
 */

import { create } from 'zustand';
import type { TaxonomyCategory } from '@/types/taxonomy';

interface UiState {
  /** Which facet panel sections are open. */
  openSections: Record<string, boolean>;
  toggleSection: (category: TaxonomyCategory) => void;
}

export const useUiStore = create<UiState>((set) => ({
  openSections: {
    'language': true,
    'framework': true,
    'tool': true,
    'ai-agent-pattern': true,
    'ai-maturity-level': true,
  },
  toggleSection: (category) =>
    set((state) => ({
      openSections: {
        ...state.openSections,
        [category]: !state.openSections[category],
      },
    })),
}));
