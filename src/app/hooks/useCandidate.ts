/**
 * src/app/hooks/useCandidate.ts — TanStack Query hooks for candidate profile.
 *
 * useCandidate: loads single candidate by username (doc ID).
 * useCandidateRepos: loads repositories owned by the candidate.
 * Separate queries to avoid loading all repos on every search result render.
 */

import { useQuery } from '@tanstack/react-query';
import { getCandidate, getCandidateRepositories } from '@/handlers/candidates';

export function useCandidate(username: string) {
  return useQuery({
    queryKey: ['candidate', username],
    queryFn: () => getCandidate(username),
    staleTime: 5 * 60 * 1000,
    enabled: username.length > 0,
  });
}

export function useCandidateRepos(owner: string) {
  return useQuery({
    queryKey: ['candidate-repos', owner],
    queryFn: () => getCandidateRepositories(owner),
    staleTime: 5 * 60 * 1000,
    enabled: owner.length > 0,
  });
}
