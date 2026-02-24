/**
 * src/handlers/search.ts — Search query handler.
 *
 * Builds a Firestore query using rarest-tag-first optimization:
 * 1. Find tag with lowest candidateCount → primary array-contains filter
 * 2. Firestore query with 200-doc cap
 * 3. Client-side AND filter for remaining tags
 * 4. Client-side sorting
 */

import type { Candidate } from '../types/candidate.js';
import type { TaxonomyItem } from '../types/taxonomy.js';
import type { SearchQueryParams } from '../types/admin.js';
import { queryDocs, where, orderBy, limit } from '../core/db/firestore.js';

const CANDIDATES_COLLECTION = 'candidates';
const MAX_RESULTS = 200;

/**
 * Searches candidates using rarest-tag-first Firestore query optimization.
 *
 * When aiMaturityMin > 0: runs two parallel queries merged client-side:
 *   1. scored >= N (candidates at or above minimum)
 *   2. unscored == null (always included — never excluded by the filter)
 */
export async function searchCandidates(
  params: SearchQueryParams,
  taxonomyItems: TaxonomyItem[]
): Promise<(Candidate & { id: string })[]> {
  const allTags = [
    ...params.languages,
    ...params.frameworks,
    ...params.tools,
    ...params.aiAgentPatterns,
  ];

  if (allTags.length === 0) return [];

  const rarestTag = findRarestTag(allTags, taxonomyItems);
  if (!rarestTag) return [];

  let results: (Candidate & { id: string })[];

  if (params.aiMaturityMin !== null && params.aiMaturityMin > 0) {
    // Dual query: scored >= N + unscored (null), merged client-side
    const [scored, unscored] = await Promise.all([
      queryDocs<Candidate>(
        CANDIDATES_COLLECTION,
        where('skillTags', 'array-contains', rarestTag),
        where('aiMaturityScore', '>=', params.aiMaturityMin),
        limit(MAX_RESULTS),
      ),
      queryDocs<Candidate>(
        CANDIDATES_COLLECTION,
        where('skillTags', 'array-contains', rarestTag),
        where('aiMaturityScore', '==', null),
        limit(MAX_RESULTS),
      ),
    ]);

    // Merge and deduplicate by ID
    const seen = new Set<string>();
    results = [];
    for (const candidate of [...scored, ...unscored]) {
      if (!seen.has(candidate.id)) {
        seen.add(candidate.id);
        results.push(candidate);
      }
    }
  } else {
    results = await queryDocs<Candidate>(
      CANDIDATES_COLLECTION,
      where('skillTags', 'array-contains', rarestTag),
      limit(MAX_RESULTS),
    );
  }

  // Client-side AND filter: all remaining tags must also be present
  const filtered = results.filter((candidate) =>
    allTags.every((tag) => candidate.skillTags.includes(tag))
  );

  return sortCandidates(filtered, params.sortBy);
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
