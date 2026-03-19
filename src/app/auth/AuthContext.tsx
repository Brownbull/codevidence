/**
 * src/app/auth/AuthContext.tsx — Firebase Auth React context.
 *
 * Provides:
 *   - user: Firebase User | null
 *   - isAdmin: boolean (read from ID token custom claim, NOT Firestore)
 *   - loading: boolean (true while auth state is resolving)
 *   - signInWithGoogle: () => void
 *   - signOut: () => void
 *
 * Admin status is determined solely by `request.auth.token.admin === true`
 * in Firestore rules and by the `admin: true` custom claim in the ID token.
 * It is NEVER stored in Firestore or client-side state.
 */

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  getAuthInstance,
  signInWithGoogle,
  signInWithGitHub as firebaseSignInWithGitHub,
  signInWithEmail,
  signOut,
} from '@/core/auth/firebase-auth';
import { getUserProfile } from '@/handlers/user-profile';
import type { UserProfile } from '@/types/user-profile';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthContextValue {
  user: User | null;
  isAdmin: boolean;
  loading: boolean;
  githubUsername: string | null;
  isGitHubConnected: boolean;
  tokenStatus: UserProfile['tokenStatus'];
  signInWithGoogle: () => Promise<void>;
  signInWithGitHub: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────────

interface AuthProviderProps {
  children: React.ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [githubUsername, setGithubUsername] = useState<string | null>(null);
  const [tokenStatus, setTokenStatus] = useState<UserProfile['tokenStatus']>(null);

  const loadProfile = useCallback(async (uid: string) => {
    try {
      const profile = await getUserProfile(uid);
      if (profile) {
        setGithubUsername(profile.githubUsername);
        setTokenStatus(profile.tokenStatus);
      } else {
        setGithubUsername(null);
        setTokenStatus(null);
      }
    } catch {
      // Profile may not exist yet — this is normal for new users
      setGithubUsername(null);
      setTokenStatus(null);
    }
  }, []);

  useEffect(() => {
    const auth = getAuthInstance();

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);

      if (firebaseUser) {
        const tokenResult = await firebaseUser.getIdTokenResult();
        setIsAdmin(tokenResult.claims['admin'] === true);
        await loadProfile(firebaseUser.uid);
      } else {
        setIsAdmin(false);
        setGithubUsername(null);
        setTokenStatus(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, [loadProfile]);

  const handleSignInWithGitHub = useCallback(async () => {
    const result = await firebaseSignInWithGitHub();
    if (result) {
      // The storeGitHubToken Firebase Function call happens after redirect
      // when AuthContext detects the new user. For now, store a reference
      // so the profile page or auto-link logic can call storeGitHubToken.
      // The actual Firebase Function call is orchestrated by the profile hooks.
      setGithubUsername(result.githubUsername);
    }
  }, []);

  const refreshProfile = useCallback(async () => {
    if (user) await loadProfile(user.uid);
  }, [user, loadProfile]);

  const value: AuthContextValue = {
    user,
    isAdmin,
    loading,
    githubUsername,
    isGitHubConnected: githubUsername !== null,
    tokenStatus,
    signInWithGoogle,
    signInWithGitHub: handleSignInWithGitHub,
    signInWithEmail,
    signOut,
    refreshProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

/** Returns the current auth context. Must be used inside <AuthProvider>. */
export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
