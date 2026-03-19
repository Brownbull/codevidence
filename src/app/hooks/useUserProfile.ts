/**
 * src/app/hooks/useUserProfile.ts — TanStack Query hooks for user profile.
 *
 * Provides hooks for:
 *   - useUserProfile: fetch current user's profile
 *   - useConnectGitHub: mutation to connect GitHub via storeGitHubToken function
 *   - useDisconnectGitHub: mutation to clear githubUsername
 *   - useGitHubSecret: fetch token metadata (prefix, expiry)
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { httpsCallable, getFunctions } from 'firebase/functions';
import { getApp } from 'firebase/app';
import { useAuth } from '@/app/auth/AuthContext';
import {
  getUserProfile,
  updateGitHubUsername,
  getGitHubSecret,
} from '@/handlers/user-profile';

export const USER_PROFILE_KEY = 'user-profile';
export const GITHUB_SECRET_KEY = 'github-secret';

/**
 * Fetches the current user's profile from Firestore.
 */
export function useUserProfile() {
  const { user } = useAuth();
  return useQuery({
    queryKey: [USER_PROFILE_KEY, user?.uid],
    queryFn: () => getUserProfile(user!.uid),
    enabled: !!user,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Fetches the current user's GitHub secret metadata (prefix, expiry).
 */
export function useGitHubSecret() {
  const { user, isGitHubConnected } = useAuth();
  return useQuery({
    queryKey: [GITHUB_SECRET_KEY, user?.uid],
    queryFn: () => getGitHubSecret(user!.uid),
    enabled: !!user && isGitHubConnected,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Mutation to connect a GitHub account by submitting username + PAT
 * to the storeGitHubToken Firebase Function.
 */
export function useConnectGitHub() {
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async ({
      githubUsername,
      githubToken,
    }: {
      githubUsername: string;
      githubToken: string;
    }) => {
      const functions = getFunctions(getApp());
      const storeToken = httpsCallable(functions, 'storeGitHubToken');
      const result = await storeToken({
        githubUsername,
        githubToken,
        provider: 'pat',
      });
      return result.data as { success: boolean; githubUsername: string; tokenPrefix: string };
    },
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: [USER_PROFILE_KEY, user?.uid] });
      await queryClient.invalidateQueries({ queryKey: [GITHUB_SECRET_KEY, user?.uid] });
    },
  });
}

/**
 * Mutation to disconnect GitHub by clearing githubUsername.
 */
export function useDisconnectGitHub() {
  const queryClient = useQueryClient();
  const { user, refreshProfile } = useAuth();

  return useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('Not authenticated');
      await updateGitHubUsername(user.uid, null);
    },
    onSuccess: async () => {
      await refreshProfile();
      await queryClient.invalidateQueries({ queryKey: [USER_PROFILE_KEY, user?.uid] });
    },
  });
}
