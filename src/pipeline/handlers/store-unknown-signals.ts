/**
 * src/pipeline/handlers/store-unknown-signals.ts — Taxonomy auto-discovery.
 *
 * Stores unknown framework/tool signals as new taxonomy items
 * with isSearchable: false for admin review.
 * Extracted from scan-repo.ts to keep files under 300 lines.
 */

import type { TaxonomyItem } from '../../types/taxonomy.js';
import {
  getDoc,
  setDoc,
  serverTimestamp,
} from '../../core/db/firestore.js';

const TAXONOMY_COLLECTION = 'taxonomy';

/**
 * Stores unknown signals as taxonomy items with isSearchable: false.
 * Uses setDoc for idempotency — running twice won't duplicate.
 */
export async function storeUnknownSignals(
  signals: Array<{ name: string; category: 'framework' | 'tool'; source: string }>
): Promise<void> {
  const now = serverTimestamp();

  await Promise.all(
    signals.map(async (signal) => {
      // Replace "/" in names like "@tanstack/react-query" — Firestore doc IDs cannot contain "/"
      const safeName = signal.name.replace(/\//g, '__');
      const taxonomyId = `${signal.category}:${safeName}`;

      // Check if already exists to avoid overwriting curated items
      const existing = await getDoc<TaxonomyItem>(TAXONOMY_COLLECTION, taxonomyId);
      if (existing) return;

      const item: Omit<TaxonomyItem, 'id'> = {
        category: signal.category,
        displayName: signal.name,
        aliases: [],
        candidateCount: 0,
        isSeeded: false,
        isSearchable: false, // Admin must review and enable
        firstDetectedAt: now as unknown as TaxonomyItem['firstDetectedAt'],
        addedToTaxonomyAt: now as unknown as TaxonomyItem['addedToTaxonomyAt'],
        sortOrder: 999,
        createdAt: now as unknown as TaxonomyItem['createdAt'],
        updatedAt: now as unknown as TaxonomyItem['updatedAt'],
      };

      await setDoc<Omit<TaxonomyItem, 'id'>>(TAXONOMY_COLLECTION, taxonomyId, item);
      console.log(`[scan-repo] New taxonomy item stored: ${taxonomyId} (isSearchable: false)`);
    })
  );
}
