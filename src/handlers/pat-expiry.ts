/**
 * src/handlers/pat-expiry.ts — PAT expiry/rate-limit error detection.
 *
 * Detects 401 errors from the GitHub API and writes an admin_flags
 * system alert so the admin UI can surface a banner.
 */

import type { AdminFlag } from '../types/admin.js';
import {
  addDoc,
  updateDoc,
  queryDocs,
  serverTimestamp,
  where,
  limit,
  type Timestamp,
} from '../core/db/firestore.js';

const ADMIN_FLAGS_COLLECTION = 'admin_flags';

/**
 * Called by the pipeline worker when a 401 error is detected from GitHub API.
 * Writes an admin_flags document of type 'pat-expired' if no recent flag exists.
 */
export async function flagPatExpiry(): Promise<void> {
  // Check if a recent pat-expired flag already exists
  const existing = await queryDocs<AdminFlag>(
    ADMIN_FLAGS_COLLECTION,
    where('type', '==', 'pat-expired'),
    where('status', '==', 'active'),
    limit(1),
  );

  if (existing.length > 0) return; // Already flagged

  await addDoc<Omit<AdminFlag, 'id'>>(ADMIN_FLAGS_COLLECTION, {
    type: 'pat-expired' as AdminFlag['type'],
    status: 'active',
    actionedAt: null,
    actionedBy: null,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  });
}

/**
 * Called after a successful GitHub API call to clear any active pat-expired flags.
 */
export async function clearPatExpiryFlag(): Promise<void> {
  const existing = await queryDocs<AdminFlag>(
    ADMIN_FLAGS_COLLECTION,
    where('type', '==', 'pat-expired'),
    where('status', '==', 'active'),
    limit(5),
  );

  for (const flag of existing) {
    await updateDoc<AdminFlag>(ADMIN_FLAGS_COLLECTION, flag.id, {
      status: 'actioned',
      updatedAt: serverTimestamp(),
    });
  }
}

/**
 * Returns true if there is an active pat-expired admin flag.
 */
export async function hasActivePatExpiryFlag(): Promise<boolean> {
  const flags = await queryDocs<AdminFlag>(
    ADMIN_FLAGS_COLLECTION,
    where('type', '==', 'pat-expired'),
    where('status', '==', 'active'),
    limit(1),
  );
  return flags.length > 0;
}
