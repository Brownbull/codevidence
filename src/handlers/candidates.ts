/**
 * src/handlers/candidates.ts — Candidate data operations.
 *
 * Fetches candidate docs and linked repository docs from Firestore.
 */

import type { Candidate } from '../types/candidate.js';
import type { Repository } from '../types/repository.js';
import type { TaxonomyItem } from '../types/taxonomy.js';
import {
  getDoc,
  updateDoc,
  queryDocs,
  serverTimestamp,
  where,
  orderBy,
  limit,
  type Timestamp,
} from '../core/db/firestore.js';

const CANDIDATES_COLLECTION = 'candidates';
const REPOSITORIES_COLLECTION = 'repositories';
const TAXONOMY_COLLECTION = 'taxonomy';

/**
 * Fetches a single candidate by GitHub username (= Firestore doc ID).
 */
export async function getCandidate(
  username: string
): Promise<(Candidate & { id: string }) | null> {
  return getDoc<Candidate>(CANDIDATES_COLLECTION, username);
}

/**
 * Fetches repositories owned by a GitHub username.
 * Used on the candidate profile page to load linked repos.
 */
export async function getCandidateRepositories(
  owner: string
): Promise<(Repository & { id: string })[]> {
  return queryDocs<Repository>(
    REPOSITORIES_COLLECTION,
    where('owner', '==', owner),
  );
}

/**
 * Fetches all candidates for the admin candidates table.
 */
export async function getAllCandidates(): Promise<(Candidate & { id: string })[]> {
  return queryDocs<Candidate>(
    CANDIDATES_COLLECTION,
    orderBy('skillScore', 'desc'),
    limit(500),
  );
}

/**
 * Fetches language taxonomy items for coverage breakdown.
 */
export async function getLanguageTaxonomy(): Promise<(TaxonomyItem & { id: string })[]> {
  return queryDocs<TaxonomyItem>(
    TAXONOMY_COLLECTION,
    where('category', '==', 'language'),
    where('isSearchable', '==', true),
    orderBy('candidateCount', 'desc'),
  );
}

/**
 * Updates the AI Maturity Score for a candidate.
 *
 * CRITICAL: Only writes the three aiMaturity fields — never touches
 * skillScore or other pipeline-owned fields.
 */
export async function updateAiMaturityScore(
  candidateId: string,
  score: number,
  adminUid: string
): Promise<void> {
  await updateDoc<Candidate>(CANDIDATES_COLLECTION, candidateId, {
    aiMaturityScore: score,
    aiMaturityScoredAt: serverTimestamp() as unknown as Timestamp,
    aiMaturityScoredBy: adminUid,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  });
}
