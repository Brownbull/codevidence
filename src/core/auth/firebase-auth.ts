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
  signInWithPopup,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
  setPersistence,
  browserLocalPersistence,
  type Auth,
  type User,
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

/** Signs in with email and password (pre-created accounts only, no registration). */
export async function signInWithEmail(email: string, password: string): Promise<void> {
  await signInWithEmailAndPassword(getAuthInstance(), email, password);
}

/** Signs out the current user. */
export function signOut(): Promise<void> {
  return firebaseSignOut(getAuthInstance());
}

export { type User };
