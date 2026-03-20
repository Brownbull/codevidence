/**
 * src/core/db/firestore-admin.ts — Admin SDK Firestore implementation.
 *
 * Used by the pipeline when FIREBASE_ADMIN=true.
 * Provides the same interface as the client SDK wrapper (firestore.ts)
 * but uses firebase-admin to bypass security rules.
 *
 * This module is ONLY imported in Node.js pipeline context (never in browser).
 * It reads from tsconfig.pipeline.json which has Node types.
 */

import {
  initializeApp,
  getApps,
  cert,
  type App,
} from 'firebase-admin/app';
import {
  getFirestore,
  FieldValue,
  type Firestore,
  type DocumentData,
  type Query,
} from 'firebase-admin/firestore';

// ─── Firebase Admin app initialization ───────────────────────────────────────

let _adminApp: App | null = null;
let _adminDb: Firestore | null = null;

function getAdminApp(): App {
  if (_adminApp) return _adminApp;

  const existingApps = getApps();
  if (existingApps.length > 0) {
    _adminApp = existingApps[0]!;
    return _adminApp;
  }

  const projectId = process.env['FIREBASE_PROJECT_ID'];
  const clientEmail = process.env['FIREBASE_CLIENT_EMAIL'];
  const privateKey = process.env['FIREBASE_PRIVATE_KEY']?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    _adminApp = initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
      projectId,
    });
  } else if (projectId) {
    _adminApp = initializeApp({ projectId });
  } else {
    _adminApp = initializeApp({
      projectId: 'demo-candidate-skill-scanner',
    });
  }

  return _adminApp;
}

/** Returns the Admin SDK Firestore instance. */
export function getAdminDb(): Firestore {
  if (_adminDb) return _adminDb;

  _adminDb = getFirestore(getAdminApp());

  const emulatorHost = process.env['FIRESTORE_EMULATOR_HOST'];
  if (emulatorHost) {
    _adminDb.settings({ host: emulatorHost, ssl: false });
  }

  return _adminDb;
}

// ─── Typed helper functions (mirror client SDK interface) ────────────────────

export async function getDoc<T extends DocumentData>(
  collectionPath: string,
  docId: string
): Promise<(T & { id: string }) | null> {
  const snap = await getAdminDb().collection(collectionPath).doc(docId).get();
  if (!snap.exists) return null;
  return { id: snap.id, ...snap.data() } as T & { id: string };
}

export async function setDoc<T extends DocumentData>(
  collectionPath: string,
  docId: string,
  data: T
): Promise<void> {
  await getAdminDb().collection(collectionPath).doc(docId).set(data);
}

export async function updateDoc<T extends DocumentData>(
  collectionPath: string,
  docId: string,
  data: Partial<T>
): Promise<void> {
  await getAdminDb().collection(collectionPath).doc(docId).update(data);
}

export async function deleteDoc(
  collectionPath: string,
  docId: string
): Promise<void> {
  await getAdminDb().collection(collectionPath).doc(docId).delete();
}

export async function addDoc<T extends DocumentData>(
  collectionPath: string,
  data: T
): Promise<string> {
  const ref = await getAdminDb().collection(collectionPath).add(data);
  return ref.id;
}

export async function queryDocs<T extends DocumentData>(
  collectionPath: string,
  ...constraints: AdminQueryConstraint[]
): Promise<(T & { id: string })[]> {
  let q: Query = getAdminDb().collection(collectionPath);
  for (const c of constraints) {
    q = c(q);
  }
  const snap = await q.get();
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T & { id: string });
}

/**
 * Admin SDK serverTimestamp equivalent.
 */
export function serverTimestamp(): FieldValue {
  return FieldValue.serverTimestamp();
}

export function increment(n: number): FieldValue {
  return FieldValue.increment(n);
}

// ─── Query constraint builders (functional style matching client SDK) ─────────

export type AdminQueryConstraint = (q: Query) => Query;

export function where(
  field: string,
  op: FirebaseFirestore.WhereFilterOp,
  value: unknown
): AdminQueryConstraint {
  return (q) => q.where(field, op, value);
}

export function orderBy(
  field: string,
  direction: 'asc' | 'desc' = 'asc'
): AdminQueryConstraint {
  return (q) => q.orderBy(field, direction);
}

export function limit(n: number): AdminQueryConstraint {
  return (q) => q.limit(n);
}

/** Returns true if FIREBASE_ADMIN env var is set to 'true'. */
export function isAdminMode(): boolean {
  return (
    typeof process !== 'undefined' &&
    process.env?.['FIREBASE_ADMIN'] === 'true'
  );
}
