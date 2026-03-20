/**
 * functions/src/on-user-delete.ts — Auth trigger for user deletion cleanup.
 *
 * When a Firebase Auth user is deleted, this function cleans up:
 *   1. All documents in user_profiles/{uid}/secrets/ subcollection
 *   2. The user_profiles/{uid} document itself
 *
 * This prevents orphaned tokens and satisfies GDPR data retention requirements.
 */

import * as admin from 'firebase-admin';
import { auth } from 'firebase-functions/v1';

export const onUserDelete = auth.user().onDelete(async (user: auth.UserRecord) => {
  const uid = user.uid;
  const db = admin.firestore();

  // Delete all documents in secrets subcollection
  const secretsRef = db
    .collection('user_profiles')
    .doc(uid)
    .collection('secrets');

  const secretsDocs = await secretsRef.listDocuments();
  if (secretsDocs.length > 0) {
    const batch = db.batch();
    for (const docRef of secretsDocs) {
      batch.delete(docRef);
    }
    await batch.commit();
  }

  // Delete the user profile document
  const profileRef = db.collection('user_profiles').doc(uid);
  const profileSnap = await profileRef.get();
  if (profileSnap.exists) {
    await profileRef.delete();
  }
});
