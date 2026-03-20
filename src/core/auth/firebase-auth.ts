/**
 * src/core/auth/firebase-auth.ts — Firebase Auth singleton.
 *
 * Provides a singleton Firebase Auth instance, auto-connecting to the
 * Auth emulator when VITE_USE_EMULATOR=true.
 *
 * Browser-only: this file must NOT be imported from pipeline code.
 */

import { getApps, initializeApp, getApp } from 'firebase/app';
import {
  getAuth,
  connectAuthEmulator,
  GoogleAuthProvider,
  GithubAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type User,
  type OAuthCredential,
} from 'firebase/auth';

// ─── Env helpers ──────────────────────────────────────────────────────────────

function readEnvVar(key: string): string | undefined {
  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return process.env[key];
  }
  const metaEnv = (import.meta as unknown as { env?: Record<string, string> }).env;
  if (metaEnv && key in metaEnv) return metaEnv[key];
  return undefined;
}

function getFirebaseConfig() {
  return {
    apiKey: readEnvVar('VITE_FIREBASE_API_KEY') ?? '',
    authDomain: readEnvVar('VITE_FIREBASE_AUTH_DOMAIN') ?? '',
    projectId: readEnvVar('VITE_FIREBASE_PROJECT_ID') ?? 'demo-candidate-skill-scanner',
    storageBucket: readEnvVar('VITE_FIREBASE_STORAGE_BUCKET') ?? '',
    messagingSenderId: readEnvVar('VITE_FIREBASE_MESSAGING_SENDER_ID') ?? '',
    appId: readEnvVar('VITE_FIREBASE_APP_ID') ?? '',
  };
}

// ─── Auth singleton ───────────────────────────────────────────────────────────

let _auth: Auth | null = null;
let _emulatorConnected = false;

export function getAuthInstance(): Auth {
  if (_auth) return _auth;

  const app = getApps().length === 0 ? initializeApp(getFirebaseConfig()) : getApp();
  _auth = getAuth(app);

  // Persist auth state in localStorage (survives tab close/reopen)
  setPersistence(_auth, browserLocalPersistence);

  const useEmulator = readEnvVar('VITE_USE_EMULATOR') === 'true';
  if (useEmulator && !_emulatorConnected) {
    connectAuthEmulator(_auth, 'http://localhost:9099', { disableWarnings: true });
    _emulatorConnected = true;
  }

  return _auth;
}

// ─── Auth actions ─────────────────────────────────────────────────────────────

/** Initiates Google Sign-In via popup. Popup avoids cross-origin storage issues
 *  that break signInWithRedirect when authDomain differs from hosting origin. */
export async function signInWithGoogle(): Promise<void> {
  const provider = new GoogleAuthProvider();
  await signInWithPopup(getAuthInstance(), provider);
}

/**
 * GitHub Sign-In result containing the OAuth access token and username.
 * The token is captured from the OAuthCredential — it must be sent to the
 * storeGitHubToken Firebase Function immediately, NOT stored client-side.
 */
export interface GitHubSignInResult {
  accessToken: string;
  githubUsername: string;
}

/** Initiates GitHub Sign-In via popup. Returns the OAuth credential for token extraction.
 *  Scopes: read:user (profile) + repo (private repos access). */
export async function signInWithGitHub(): Promise<GitHubSignInResult | null> {
  const provider = new GithubAuthProvider();
  provider.addScope('read:user');
  provider.addScope('repo');

  const result = await signInWithPopup(getAuthInstance(), provider);
  const credential = GithubAuthProvider.credentialFromResult(result) as OAuthCredential | null;

  if (!credential?.accessToken) return null;

  // Extract GitHub username from the provider data
  const githubProvider = result.user.providerData.find(
    (p) => p.providerId === 'github.com'
  );
  const githubUsername = githubProvider?.displayName
    ?? (result.user as unknown as { reloadUserInfo?: { screenName?: string } })
        .reloadUserInfo?.screenName
    ?? '';

  return {
    accessToken: credential.accessToken,
    githubUsername,
  };
}

/** Signs in with email and password (pre-created accounts only, no registration). */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getAuthInstance(), email, password);
}

/** Signs out the current user. */
export function signOut(): Promise<void> {
  return firebaseSignOut(getAuthInstance());
}

export { type User };
