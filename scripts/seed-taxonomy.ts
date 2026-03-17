#!/usr/bin/env tsx
/**
 * scripts/seed-taxonomy.ts — Idempotent taxonomy seed script.
 *
 * Reads scripts/seeds/taxonomy.json and writes each item to the taxonomy
 * collection in Firestore (emulator or live, depending on VITE_USE_EMULATOR).
 *
 * Idempotent: uses setDoc with the item's `id` as the document ID, so
 * running this script twice will NOT create duplicates — it overwrites
 * existing seed docs with the same data.
 *
 * Usage:
 *   pnpm db:seed            — seeds against emulator (VITE_USE_EMULATOR=true in .env.local)
 *   VITE_USE_EMULATOR=false pnpm db:seed  — seed live project (use with caution)
 */

import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { setDoc, getDoc, serverTimestamp, isEmulatorEnabled } from '@/core/db/firestore.js';
import { authenticateWorker } from '@/pipeline/auth.js';
import type { TaxonomyItem } from '@/types/taxonomy.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ─── Types ────────────────────────────────────────────────────────────────────

interface SeedEntry {
  id: string;
  category: TaxonomyItem['category'];
  displayName: string;
  aliases: string[];
  sortOrder: number;
  isSearchable: boolean;
}

interface SeedFile {
  taxonomy: SeedEntry[];
}

// ─── Load seed data ───────────────────────────────────────────────────────────

function loadSeedData(): SeedEntry[] {
  const seedPath = path.join(__dirname, 'seeds', 'taxonomy.json');
  const raw = JSON.parse(readFileSync(seedPath, 'utf8')) as SeedFile;
  if (!Array.isArray(raw.taxonomy)) {
    throw new Error('taxonomy.json must have a top-level "taxonomy" array');
  }
  return raw.taxonomy;
}

// ─── Seed a single item ───────────────────────────────────────────────────────

async function seedItem(entry: SeedEntry): Promise<void> {
  const now = serverTimestamp();

  // Preserve existing candidateCount if the doc already exists (avoid resetting counts)
  const existing = await getDoc<TaxonomyItem>('taxonomy', entry.id);
  const candidateCount = existing?.candidateCount ?? 0;

  const item = {
    id: entry.id,
    category: entry.category,
    displayName: entry.displayName,
    aliases: entry.aliases,
    candidateCount,
    isSeeded: true,
    isSearchable: entry.isSearchable,
    sortOrder: entry.sortOrder,
    firstDetectedAt: existing?.firstDetectedAt ?? now,
    addedToTaxonomyAt: existing?.addedToTaxonomyAt ?? now,
    createdAt: existing?.createdAt ?? now,
    updatedAt: now,
  };

  await setDoc('taxonomy', entry.id, item);
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function main(): Promise<void> {
  const usingEmulator = isEmulatorEnabled();
  console.log(`Seeding taxonomy — emulator: ${String(usingEmulator)}`);

  // Authenticate before writing to production Firestore
  if (!usingEmulator) await authenticateWorker();

  const entries = loadSeedData();
  console.log(`Found ${entries.length} taxonomy items to seed`);

  let seeded = 0;
  for (const entry of entries) {
    await seedItem(entry);
    seeded++;
    process.stdout.write(`\r  Seeded ${seeded}/${entries.length}: ${entry.id}                `);
  }

  console.log(`\nDone. ${seeded} items seeded to 'taxonomy' collection.`);
}

main().catch((err: unknown) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
