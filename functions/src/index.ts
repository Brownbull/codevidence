/**
 * functions/src/index.ts — Firebase Functions entry point.
 *
 * verify-admin-claim: HTTPS callable that verifies the caller has
 * the admin: true custom claim. Returns { isAdmin: true } on success,
 * throws HttpsError with code 'permission-denied' (HTTP 403) if not.
 *
 * Used by the Admin UI as a server-side claim verification endpoint.
 * NOTE: The primary admin gate is the Firestore security rules
 * (request.auth.token.admin == true) — this function provides an
 * explicit server-side check for clients that need it.
 */

import * as admin from 'firebase-admin';
import { onCall, HttpsError } from 'firebase-functions/v2/https';

admin.initializeApp();

/**
 * Verifies that the calling user has the `admin: true` custom claim.
 * Returns { isAdmin: true } or throws permission-denied (403).
 */
export const verifyAdminClaim = onCall(async (request) => {
  // Must be authenticated
  if (!request.auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated.');
  }

  const isAdmin = request.auth.token['admin'] === true;

  if (!isAdmin) {
    throw new HttpsError(
      'permission-denied',
      'User does not have admin privileges.'
    );
  }

  return { isAdmin: true };
});
