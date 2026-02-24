/**
 * src/handlers/candidates.ts — Candidate data operations.
 *
 * Fetches candidate docs and linked repository docs from Firestore.
 */

import type { Candidate } from '../types/candidate.js';
import type { Repository } from '../types/repository.js';
import { getDoc, queryDocs, where } from '../core/db/firestore.js';

const CANDIDATES_COLLECTION = 'candidates';
const REPOSITORIES_COLLECTION = 'repositories';

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
