/**
 * src/handlers/admin-flags.ts — Admin flag operations.
 *
 * Handles underserved query flagging with 24-hour deduplication cooldown.
 */

import type { AdminFlag } from '../types/admin.js';
import type { SearchQueryParams } from '../types/admin.js';
import {
  addDoc,
  queryDocs,
  serverTimestamp,
  where,
  orderBy,
  limit,
  type Timestamp,
} from '../core/db/firestore.js';

const ADMIN_FLAGS_COLLECTION = 'admin_flags';
const DEDUP_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Flags an underserved query (results < 10) in admin_flags.
 * Does not re-flag the same query params within 24 hours.
 */
export async function maybeFlagUnderservedQuery(
  queryParams: SearchQueryParams,
  resultCount: number
): Promise<boolean> {
  if (resultCount >= 10) return false;

  // Check for recent duplicate flags
  const recentFlags = await queryDocs<AdminFlag>(
    ADMIN_FLAGS_COLLECTION,
    where('type', '==', 'underserved-query'),
    where('status', '==', 'active'),
    orderBy('createdAt', 'desc'),
    limit(20),
  );

  const paramsHash = serializeParams(queryParams);
  const now = Date.now();

  for (const flag of recentFlags) {
    if (!flag.queryParams) continue;
    if (serializeParams(flag.queryParams) !== paramsHash) continue;

    // Same params found — check if within cooldown
    const flagTime = (flag.createdAt as Timestamp)?.toMillis?.() ?? 0;
    if (now - flagTime < DEDUP_COOLDOWN_MS) {
      return false; // Within 24h cooldown, skip
    }
  }

  // No recent duplicate — create the flag
  await addDoc<Omit<AdminFlag, 'id'>>(ADMIN_FLAGS_COLLECTION, {
    type: 'underserved-query',
    status: 'active',
    queryParams,
    resultCount,
    actionedAt: null,
    actionedBy: null,
    createdAt: serverTimestamp() as unknown as Timestamp,
    updatedAt: serverTimestamp() as unknown as Timestamp,
  });

  return true;
}

/** Deterministic serialization of SearchQueryParams for deduplication. */
function serializeParams(params: SearchQueryParams): string {
  return JSON.stringify({
    l: [...params.languages].sort(),
    f: [...params.frameworks].sort(),
    t: [...params.tools].sort(),
    a: [...params.aiAgentPatterns].sort(),
    m: params.aiMaturityMin,
  });
}

/**
 * Builds a suggested CLI discover command from search params.
 */
export function buildSuggestedCommand(params: SearchQueryParams): string {
  const tags = [
    ...params.languages.map((l) => l.split(':')[1] ?? l),
    ...params.frameworks.map((f) => f.split(':')[1] ?? f),
    ...params.tools.map((t) => t.split(':')[1] ?? t),
  ];
  const query = tags.join(' ') || 'developer';
  return `pnpm scan discover --query '${query}' --limit 100`;
}
