/**
 * src/pipeline/commands/rebuild-counts.ts — Rebuild taxonomy candidateCount.
 *
 * Reads ALL candidates, tallies skillTags, and sets the correct
 * candidateCount on each taxonomy doc. Fixes counters that got
 * out of sync (e.g. after re-seeding taxonomy).
 */

import { queryDocs, updateDoc } from '../../core/db/firestore.js';
import type { Candidate } from '../../types/candidate.js';
import type { TaxonomyItem } from '../../types/taxonomy.js';

const CANDIDATES_COLLECTION = 'candidates';
const TAXONOMY_COLLECTION = 'taxonomy';

/**
 * Rebuilds all taxonomy candidateCount fields from candidate skillTags.
 *
 * Algorithm:
 *   1. Fetch all candidates
 *   2. Count occurrences of each skillTag across all candidates
 *   3. Fetch all taxonomy items
 *   4. Update candidateCount for each taxonomy item
 */
export async function runRebuildCounts(): Promise<void> {
  console.log('[rebuild-counts] Reading all candidates...');
  const candidates = await queryDocs<Candidate>(CANDIDATES_COLLECTION);
  console.log(`[rebuild-counts] Found ${candidates.length} candidates.`);

  // Tally skill tags across all candidates
  const tagCounts = new Map<string, number>();
  for (const candidate of candidates) {
    for (const tag of candidate.skillTags ?? []) {
      tagCounts.set(tag, (tagCounts.get(tag) ?? 0) + 1);
    }
  }

  console.log(`[rebuild-counts] Found ${tagCounts.size} unique tags with candidates.`);

  // Fetch all taxonomy items
  const taxonomyItems = await queryDocs<TaxonomyItem>(TAXONOMY_COLLECTION);
  console.log(`[rebuild-counts] Found ${taxonomyItems.length} taxonomy items.`);

  // Update each taxonomy item's candidateCount
  let updated = 0;
  const updates: Promise<void>[] = [];

  for (const item of taxonomyItems) {
    const correctCount = tagCounts.get(item.id) ?? 0;
    if (item.candidateCount !== correctCount) {
      updates.push(
        updateDoc(TAXONOMY_COLLECTION, item.id, {
          candidateCount: correctCount,
        }).then(() => {
          updated++;
          console.log(`  ${item.id}: ${item.candidateCount} → ${correctCount}`);
        })
      );
    }
  }

  await Promise.all(updates);

  console.log(`[rebuild-counts] Done. Updated ${updated}/${taxonomyItems.length} taxonomy items.`);

  // Report tags that exist in candidates but not in taxonomy
  const taxonomyIds = new Set(taxonomyItems.map((t) => t.id));
  const orphanTags = [...tagCounts.entries()]
    .filter(([tag]) => !taxonomyIds.has(tag));

  if (orphanTags.length > 0) {
    console.log(`\n[rebuild-counts] ${orphanTags.length} tags found in candidates but not in taxonomy:`);
    for (const [tag, count] of orphanTags) {
      console.log(`  ${tag} (${count} candidates)`);
    }
  }
}
