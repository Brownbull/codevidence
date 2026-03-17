/**
 * src/core/db/firestore.ts — Centralized Firestore wrapper.
 *
 * ABSOLUTE RULE: ALL Firestore access in this codebase goes through this file.
 * NEVER import Firebase SDK directly in business logic, pipeline, or app code.
 *
 * Dual runtime compatible: importable from src/app (browser) and src/pipeline (Node.js).
 * Auto-detects VITE_USE_EMULATOR env var (Vite env OR process.env) and connects to emulator.
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getFirestore,
  connectFirestoreEmulator,
  doc,
  collection,
  getDoc as sdkGetDoc,
  setDoc as sdkSetDoc,
  updateDoc as sdkUpdateDoc,
  deleteDoc as sdkDeleteDoc,
  addDoc as sdkAddDoc,
  getDocs,
  getCountFromServer as sdkGetCountFromServer,
  query,
  serverTimestamp as sdkServerTimestamp,
  runTransaction as sdkRunTransaction,
  type DocumentData,
  type WithFieldValue,
  type UpdateData,
  type QueryConstraint,
  type CollectionReference,
  type DocumentReference,
  type Firestore,
  type Transaction,
} from 'firebase/firestore';

// ─── Firebase app initialization ─────────────────────────────────────────────

/**
 * Reads an env var from either Node.js (process.env) or Vite (import.meta.env).
 *
 * Priority order:
 * 1. process.env — used in Node.js pipeline context AND by Vitest's vi.stubEnv()
 * 2. import.meta.env — used in browser (Vite) context
 *
 * process.env is checked first so that vi.stubEnv() in tests correctly overrides
 * the .env.local values that Vitest loads into import.meta.env.
 */
function readEnvVar(key: string): string | undefined {
  // Node.js / pipeline / Vitest context — check process.env first
  if (typeof process !== 'undefined' && process.env && key in process.env) {
    return process.env[key];
  }

  // Vite browser context — cast to avoid TS errors in base tsconfig where
  // vite/client augmentation of ImportMeta is not available.
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

/** Returns true if the emulator should be used. */
export function isEmulatorEnabled(): boolean {
  return readEnvVar('VITE_USE_EMULATOR') === 'true';
}

let _db: Firestore | null = null;
let _emulatorConnected = false;

/** Returns the singleton Firestore instance, initializing if needed. */
export function getDb(): Firestore {
  if (_db) return _db;

  const app = getApps().length === 0 ? initializeApp(getFirebaseConfig()) : getApp();
  _db = getFirestore(app);

  if (isEmulatorEnabled() && !_emulatorConnected) {
    connectFirestoreEmulator(_db, 'localhost', 8080);
    _emulatorConnected = true;
  }

  return _db;
}

// ─── Typed helper functions ───────────────────────────────────────────────────

/**
 * Returns a typed CollectionReference for the given collection path.
 */
export function collectionRef<T extends DocumentData>(
  path: string
): CollectionReference<T> {
  return collection(getDb(), path) as CollectionReference<T>;
}

/**
 * Returns a typed DocumentReference for the given collection + doc ID.
 */
export function docRef<T extends DocumentData>(
  collectionPath: string,
  docId: string
): DocumentReference<T> {
  return doc(getDb(), collectionPath, docId) as DocumentReference<T>;
}

/**
 * Fetches a document by collection + ID. Returns null if not found.
 */
export async function getDoc<T extends DocumentData>(
  collectionPath: string,
  docId: string
): Promise<(T & { id: string }) | null> {
  const ref = docRef<T>(collectionPath, docId);
  const snap = await sdkGetDoc(ref);
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as T & { id: string };
}

/**
 * Writes (creates or overwrites) a document at the given collection + ID.
 */
export async function setDoc<T extends DocumentData>(
  collectionPath: string,
  docId: string,
  data: WithFieldValue<T>
): Promise<void> {
  const ref = docRef<T>(collectionPath, docId);
  await sdkSetDoc(ref, data);
}

/**
 * Partially updates a document at the given collection + ID.
 */
export async function updateDoc<T extends DocumentData>(
  collectionPath: string,
  docId: string,
  data: UpdateData<T>
): Promise<void> {
  const ref = docRef<T>(collectionPath, docId);
  await sdkUpdateDoc(ref, data);
}

/**
 * Deletes a document at the given collection + ID.
 */
export async function deleteDoc(
  collectionPath: string,
  docId: string
): Promise<void> {
  const ref = docRef(collectionPath, docId);
  await sdkDeleteDoc(ref);
}

/**
 * Adds a new document to the collection with an auto-generated ID.
 * Returns the new document's ID.
 */
export async function addDoc<T extends DocumentData>(
  collectionPath: string,
  data: WithFieldValue<T>
): Promise<string> {
  const ref = collectionRef<T>(collectionPath);
  const newDoc = await sdkAddDoc(ref, data);
  return newDoc.id;
}

/**
 * Queries a collection with the given constraints.
 * Returns an array of documents with their IDs included.
 */
export async function queryDocs<T extends DocumentData>(
  collectionPath: string,
  ...constraints: QueryConstraint[]
): Promise<(T & { id: string })[]> {
  const ref = collectionRef<T>(collectionPath);
  const q = query(ref, ...constraints);
  const snap = await getDocs(q);
  return snap.docs.map((d) => ({ id: d.id, ...d.data() }) as T & { id: string });
}

/**
 * Re-export serverTimestamp for use in business logic without direct SDK imports.
 */
export const serverTimestamp = sdkServerTimestamp;

/**
 * Returns the count of documents in a collection matching optional constraints.
 */
export async function getCollectionCount(
  collectionPath: string,
  ...constraints: QueryConstraint[]
): Promise<number> {
  const ref = collectionRef(collectionPath);
  const q = query(ref, ...constraints);
  const snap = await sdkGetCountFromServer(q);
  return snap.data().count;
}

/**
 * Runs a Firestore transaction. Firestore automatically retries on
 * contention (up to 5 times). The callback receives a Transaction
 * object with get/update/set/delete methods that operate on DocumentReferences.
 */
export async function runTransaction<T>(
  callback: (transaction: Transaction) => Promise<T>
): Promise<T> {
  return sdkRunTransaction(getDb(), callback);
}

// ─── Re-export query constraint builders for convenience ─────────────────────
// These allow callers to build queries without importing from firebase/firestore.

export {
  where,
  orderBy,
  limit,
  startAfter,
  endBefore,
  increment,
  type QueryConstraint,
  type Timestamp,
  type FieldValue,
  type Transaction,
} from 'firebase/firestore';
