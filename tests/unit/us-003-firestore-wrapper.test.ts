/**
 * tests/unit/us-003-firestore-wrapper.test.ts
 *
 * Verifies the centralized Firestore wrapper (src/core/db/firestore.ts):
 * 1. All required exports are present
 * 2. isEmulatorEnabled() detects VITE_USE_EMULATOR env var correctly
 * 3. getDb() returns a Firestore instance
 * 4. Helper functions are callable with correct signatures
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// ─── Export presence tests (no Firebase network calls needed) ────────────────

describe('Firestore wrapper — exported API surface', () => {
  it('exports getDb function', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.getDb).toBe('function');
  });

  it('exports getDoc function', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.getDoc).toBe('function');
  });

  it('exports setDoc function', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.setDoc).toBe('function');
  });

  it('exports updateDoc function', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.updateDoc).toBe('function');
  });

  it('exports deleteDoc function', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.deleteDoc).toBe('function');
  });

  it('exports addDoc function', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.addDoc).toBe('function');
  });

  it('exports queryDocs function', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.queryDocs).toBe('function');
  });

  it('exports serverTimestamp function', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.serverTimestamp).toBe('function');
  });

  it('exports collectionRef function', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.collectionRef).toBe('function');
  });

  it('exports docRef function', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.docRef).toBe('function');
  });

  it('exports isEmulatorEnabled function', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.isEmulatorEnabled).toBe('function');
  });

  it('exports where query constraint builder', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.where).toBe('function');
  });

  it('exports orderBy query constraint builder', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.orderBy).toBe('function');
  });

  it('exports limit query constraint builder', async () => {
    const mod = await import('@/core/db/firestore');
    expect(typeof mod.limit).toBe('function');
  });
});

// ─── Emulator detection tests ─────────────────────────────────────────────────

describe('isEmulatorEnabled()', () => {
  beforeEach(() => {
    // Reset module registry before each test so fresh imports get new env values
    vi.resetModules();
  });

  afterEach(() => {
    // Restore all stubbed env vars
    vi.unstubAllEnvs();
  });

  it('returns true when VITE_USE_EMULATOR=true (process.env)', async () => {
    vi.stubEnv('VITE_USE_EMULATOR', 'true');
    const mod = await import('@/core/db/firestore');
    expect(mod.isEmulatorEnabled()).toBe(true);
  });

  it('returns false when VITE_USE_EMULATOR is not set', async () => {
    vi.stubEnv('VITE_USE_EMULATOR', '');
    const mod = await import('@/core/db/firestore');
    expect(mod.isEmulatorEnabled()).toBe(false);
  });

  it('returns false when VITE_USE_EMULATOR=false', async () => {
    vi.stubEnv('VITE_USE_EMULATOR', 'false');
    const mod = await import('@/core/db/firestore');
    expect(mod.isEmulatorEnabled()).toBe(false);
  });

  it('returns false when VITE_USE_EMULATOR is empty string', async () => {
    vi.stubEnv('VITE_USE_EMULATOR', '');
    const mod = await import('@/core/db/firestore');
    expect(mod.isEmulatorEnabled()).toBe(false);
  });

  it('returns false when VITE_USE_EMULATOR=1 (only "true" string is accepted)', async () => {
    vi.stubEnv('VITE_USE_EMULATOR', '1');
    const mod = await import('@/core/db/firestore');
    expect(mod.isEmulatorEnabled()).toBe(false);
  });
});

// ─── getDb() initialization tests ────────────────────────────────────────────

describe('getDb()', () => {
  it('returns a Firestore instance with a type identifier', async () => {
    const { getDb } = await import('@/core/db/firestore');
    const db = getDb();
    // Firestore modular SDK (v9) uses standalone functions — the instance itself
    // is an opaque object. We verify it's a non-null object with the expected
    // internal identifier exposed via the SDK.
    expect(db).toBeDefined();
    expect(db).not.toBeNull();
    expect(typeof db).toBe('object');
    // Firestore instance has an internal 'type' field set to 'firestore'
    expect((db as unknown as Record<string, unknown>)['type']).toBe('firestore');
  });

  it('returns the same instance on repeated calls (singleton)', async () => {
    const { getDb } = await import('@/core/db/firestore');
    const db1 = getDb();
    const db2 = getDb();
    expect(db1).toBe(db2);
  });
});

// ─── serverTimestamp tests ────────────────────────────────────────────────────

describe('serverTimestamp', () => {
  it('returns a FieldValue sentinel (not a plain timestamp)', async () => {
    const { serverTimestamp } = await import('@/core/db/firestore');
    const ts = serverTimestamp();
    // FieldValue sentinels are objects, not Date or number
    expect(ts).toBeDefined();
    expect(typeof ts).toBe('object');
  });
});
