/**
 * src/app/hooks/usePoolStats.ts — Fetches pool statistics for search empty state.
 *
 * Returns total candidates and repositories counts from Firestore.
 * Cached for 10 minutes since these rarely change during a session.
 */

import { useQuery } from '@tanstack/react-query';
import { getCollectionCount } from '@/core/db/firestore';

interface PoolStats {
  candidateCount: number;
  repoCount: number;
}

async function fetchPoolStats(): Promise<PoolStats> {
  const [candidateCount, repoCount] = await Promise.all([
    getCollectionCount('candidates'),
    getCollectionCount('repositories'),
  ]);
  return { candidateCount, repoCount };
}

export function usePoolStats() {
  return useQuery({
    queryKey: ['poolStats'],
    queryFn: fetchPoolStats,
    staleTime: 10 * 60 * 1000,
  });
}
