/**
 * src/pipeline/auth.ts — Pipeline worker authentication.
 *
 * Signs in the pipeline worker as an admin user via email/password.
 * Credentials are read from env vars PIPELINE_AUTH_EMAIL / PIPELINE_AUTH_PASSWORD.
 *
 * This is separate from src/core/auth/firebase-auth.ts which is browser-only.
 * The pipeline auth module uses the same Firebase app instance as the Firestore wrapper
 * so that all subsequent Firestore operations carry the admin auth token.
 */

import { getApps, getApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getDb } from '../core/db/firestore.js';

/**
 * Signs in the pipeline worker as an admin user.
 * Must be called before any Firestore writes that require auth.
 *
 * Reads credentials from:
 *   - PIPELINE_AUTH_EMAIL (default: test-admin@candskill.test)
 *   - PIPELINE_AUTH_PASSWORD
 */
export async function authenticateWorker(): Promise<void> {
  // Ensure Firebase app is initialized (getDb triggers initialization)
  getDb();

  const app = getApps().length > 0 ? getApp() : null;
  if (!app) {
    throw new Error('[pipeline-auth] Firebase app not initialized');
  }

  const email = process.env['PIPELINE_AUTH_EMAIL'] ?? 'test-admin@candskill.test';
  const password = process.env['PIPELINE_AUTH_PASSWORD'];

  if (!password) {
    throw new Error(
      '[pipeline-auth] PIPELINE_AUTH_PASSWORD is required.\n' +
      '  Set it in .env.local:\n' +
      '  PIPELINE_AUTH_EMAIL=test-admin@candskill.test\n' +
      '  PIPELINE_AUTH_PASSWORD=YourPassword'
    );
  }

  const auth = getAuth(app);
  const credential = await signInWithEmailAndPassword(auth, email, password);
  console.log(`[pipeline-auth] Signed in as ${credential.user.email}`);
}
