/**
 * src/handlers/search.ts — Search query handler.
 *
 * Uses array-contains-any for OR-within-category search:
 * 1. Collect all selected tags across categories
 * 2. Firestore query with array-contains-any (chunks of 10 if needed)
 * 3. Client-side: OR within each category, AND across categories
 * 4. Client-side: aiMaturityMin filter + sorting
 */

import type { Candidate } from '../types/candidate.js';
import type { TaxonomyItem } from '../types/taxonomy.js';
import type { SearchQueryParams } from '../types/admin.js';
import { queryDocs, where, limit } from '../core/db/firestore.js';

const CANDIDATES_COLLECTION = 'candidates';
const MAX_RESULTS = 200;
/** Firestore array-contains-any supports up to 10 values per clause. */
const ARRAY_CONTAINS_ANY_LIMIT = 10;

/**
 * Searches candidates using array-contains-any for OR-within-category logic.
 *
 * Within the same category (e.g., Languages), selecting TypeScript + Python
 * returns candidates who have TypeScript OR Python (union).
 * Across categories, filters use AND (must match at least one from each).
 *
 * aiMaturityMin is applied client-side to avoid Firestore inequality+array
 * constraint conflicts.
 */
export async function searchCandidates(
  params: SearchQueryParams,
  taxonomyItems: TaxonomyItem[]
): Promise<(Candidate & { id: string })[]> {
  const categoryGroups = buildCategoryGroups(params);
  const activeGroups = categoryGroups.filter((g) => g.length > 0);

  if (activeGroups.length === 0) return [];

  const allTags = activeGroups.flat();
  const results = await queryWithChunking(allTags);

  // Client-side: OR within each category, AND across categories
  const filtered = results.filter((candidate) => {
    const matchesTags = activeGroups.every((groupTags) =>
      groupTags.some((tag) => candidate.skillTags.includes(tag))
    );
    if (!matchesTags) return false;

    // aiMaturityMin: include unscored (null), exclude scored below threshold
    if (params.aiMaturityMin !== null && params.aiMaturityMin > 0) {
      if (candidate.aiMaturityScore !== null &&
          candidate.aiMaturityScore < params.aiMaturityMin) {
        return false;
      }
    }
    return true;
  });

  return sortCandidates(filtered, params.sortBy);
}

/** Groups selected tags by category for OR-within, AND-across filtering. */
export function buildCategoryGroups(params: SearchQueryParams): string[][] {
  return [
    params.languages,
    params.frameworks,
    params.tools,
    params.aiAgentPatterns,
  ];
}

/**
 * Runs array-contains-any queries, chunking into batches of 10.
 * Merges and deduplicates results across chunks.
 */
async function queryWithChunking(
  allTags: string[],
): Promise<(Candidate & { id: string })[]> {
  const chunks: string[][] = [];
  for (let i = 0; i < allTags.length; i += ARRAY_CONTAINS_ANY_LIMIT) {
    chunks.push(allTags.slice(i, i + ARRAY_CONTAINS_ANY_LIMIT));
  }

  const chunkResults = await Promise.all(
    chunks.map((chunk) =>
      queryDocs<Candidate>(
        CANDIDATES_COLLECTION,
        where('skillTags', 'array-contains-any', chunk),
        limit(MAX_RESULTS),
      )
    ),
  );

  // Merge and deduplicate by ID
  const seen = new Set<string>();
  const merged: (Candidate & { id: string })[] = [];
  for (const batch of chunkResults) {
    for (const candidate of batch) {
      if (!seen.has(candidate.id)) {
        seen.add(candidate.id);
        merged.push(candidate);
      }
    }
  }
  return merged;
}

/**
 * Finds the tag with the lowest candidateCount in the taxonomy.
 * Falls back to the first tag if no taxonomy match found.
 */
export function findRarestTag(
  tags: string[],
  taxonomyItems: TaxonomyItem[]
): string | null {
  if (tags.length === 0) return null;

  const countMap = new Map<string, number>();
  for (const item of taxonomyItems) {
    countMap.set(item.id, item.candidateCount);
  }

  let rarest = tags[0] ?? null;
  let lowestCount = Infinity;

  for (const tag of tags) {
    const count = countMap.get(tag) ?? Infinity;
    if (count < lowestCount) {
      lowestCount = count;
      rarest = tag;
    }
  }

  return rarest;
}

/**
 * Sorts candidates client-side by the specified field.
 */
export function sortCandidates(
  candidates: (Candidate & { id: string })[],
  sortBy: SearchQueryParams['sortBy']
): (Candidate & { id: string })[] {
  const sorted = [...candidates];

  switch (sortBy) {
    case 'skillScore':
      sorted.sort((a, b) => b.skillScore - a.skillScore);
      break;
    case 'aiMaturityScore':
      // Descending, nulls last
      sorted.sort((a, b) => {
        if (a.aiMaturityScore === null && b.aiMaturityScore === null) return 0;
        if (a.aiMaturityScore === null) return 1;
        if (b.aiMaturityScore === null) return -1;
        return b.aiMaturityScore - a.aiMaturityScore;
      });
      break;
    case 'lastScanned':
      sorted.sort((a, b) => {
        const aTime = a.lastScanned?.toMillis?.() ?? 0;
        const bTime = b.lastScanned?.toMillis?.() ?? 0;
        return bTime - aTime;
      });
      break;
  }

  return sorted;
}
