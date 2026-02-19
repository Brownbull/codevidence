import type { Timestamp } from 'firebase/firestore';

export type TaxonomyCategory =
  | 'language'
  | 'framework'
  | 'tool'
  | 'ai-agent-pattern'
  | 'ai-maturity-level';

/**
 * TaxonomyItem — Firestore document shape for a taxonomy entry.
 * Used to power the FacetPanel checkboxes in the Search UI.
 * Items with isSearchable: false are candidates for admin review.
 */
export interface TaxonomyItem {
  id: string;
  category: TaxonomyCategory;
  displayName: string;
  aliases: string[];
  candidateCount: number;
  isSeeded: boolean;
  isSearchable: boolean;
  firstDetectedAt: Timestamp;
  addedToTaxonomyAt: Timestamp;
  sortOrder: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
