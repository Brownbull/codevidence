/**
 * src/pipeline/commands/normalize-languages.ts — Fix language data in Firestore.
 *
 * Reads ALL repositories, normalizes primaryLanguage from raw GitHub names
 * (e.g. "JavaScript") to taxonomy IDs (e.g. "language:javascript"), then
 * rebuilds affected candidate profiles.
 */

import { queryDocs, updateDoc } from '../../core/db/firestore.js';
import type { Repository } from '../../types/repository.js';
import { normalizeGitHubLanguage } from '../analysis/layer1.js';
import { updateCandidateProfile } from '../scoring/skill-score.js';

const REPOSITORIES_COLLECTION = 'repositories';

/**
 * Normalizes all repository primaryLanguage values and rebuilds candidate profiles.
 *
 * Steps:
 *   1. Read all repositories
 *   2. Find repos where primaryLanguage is a raw GitHub name (not "language:*" format)
 *   3. Update each to the normalized taxonomy ID
 *   4. Rebuild candidate profiles for affected owners
 */
export async function runNormalizeLanguages(): Promise<void> {
  console.log('[normalize-languages] Reading all repositories...');
  const repos = await queryDocs<Repository>(REPOSITORIES_COLLECTION);
  console.log(`[normalize-languages] Found ${repos.length} repositories.`);

  // Find repos that need normalization
  const toFix: { repo: Repository & { id: string }; normalized: string }[] = [];

  for (const repo of repos) {
    if (!repo.primaryLanguage) continue;

    const normalized = normalizeGitHubLanguage(repo.primaryLanguage);
    if (normalized && normalized !== repo.primaryLanguage) {
      toFix.push({ repo, normalized });
    }
  }

  if (toFix.length === 0) {
    console.log('[normalize-languages] All repositories already normalized. Nothing to fix.');
    return;
  }

  console.log(`[normalize-languages] ${toFix.length} repos need normalization:`);
  for (const { repo, normalized } of toFix) {
    console.log(`  ${repo.fullName}: "${repo.primaryLanguage}" → "${normalized}"`);
  }

  // Update repos in parallel (batch by 500 for Firestore limits)
  for (let i = 0; i < toFix.length; i += 500) {
    const batch = toFix.slice(i, i + 500);
    await Promise.all(
      batch.map(({ repo, normalized }) =>
        updateDoc(REPOSITORIES_COLLECTION, repo.id, {
          primaryLanguage: normalized,
        })
      )
    );
  }

  console.log(`[normalize-languages] Updated ${toFix.length} repository documents.`);

  // Rebuild candidate profiles for affected owners
  const affectedOwners = [...new Set(toFix.map(({ repo }) => repo.owner))];
  console.log(
    `[normalize-languages] Rebuilding ${affectedOwners.length} candidate profile(s): ` +
    affectedOwners.join(', ')
  );

  for (const owner of affectedOwners) {
    try {
      await updateCandidateProfile(owner);
      console.log(`  [normalize-languages] Rebuilt profile: ${owner}`);
    } catch (err) {
      console.error(`  [normalize-languages] Failed to rebuild ${owner}:`, err);
    }
  }

  console.log('[normalize-languages] Done.');
}
