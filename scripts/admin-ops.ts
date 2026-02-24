#!/usr/bin/env tsx
/**
 * scripts/admin-ops.ts — Admin operations CLI.
 *
 * Commands:
 *   grant-admin --uid <firebase-uid>   Sets { admin: true } custom claim on user
 *   revoke-admin --uid <firebase-uid>  Removes the admin custom claim from user
 *   check-admin --uid <firebase-uid>   Checks if user has admin custom claim
 *
 * Usage:
 *   pnpm admin:ops grant-admin --uid abc123
 *   pnpm admin:ops revoke-admin --uid abc123
 *   pnpm admin:ops check-admin --uid abc123
 *
 * Requires Firebase Admin SDK credentials:
 *   FIREBASE_PROJECT_ID in .env.local
 *   GOOGLE_APPLICATION_CREDENTIALS (service account) or
 *   FIREBASE_AUTH_EMULATOR_HOST=localhost:9099 for emulator
 */

import { Command } from 'commander';
import * as admin from 'firebase-admin';

// ─── Firebase Admin initialization ────────────────────────────────────────────

function initAdminApp(): void {
  if (admin.apps.length > 0) return;

  const projectId = process.env['FIREBASE_PROJECT_ID'] ?? 'demo-candidate-skill-scanner';

  admin.initializeApp({
    projectId,
    credential: admin.credential.applicationDefault(),
  });
}

// ─── Admin claim operations ───────────────────────────────────────────────────

async function grantAdmin(uid: string): Promise<void> {
  initAdminApp();
  await admin.auth().setCustomUserClaims(uid, { admin: true });
  console.log(`✓ Admin claim granted to user: ${uid}`);
  console.log('  Note: User must sign out and back in for the claim to take effect.');
}

async function revokeAdmin(uid: string): Promise<void> {
  initAdminApp();
  // getCustomUserClaims to preserve other claims
  const user = await admin.auth().getUser(uid);
  const currentClaims = (user.customClaims ?? {}) as Record<string, unknown>;
  const { admin: _removed, ...remaining } = currentClaims;
  await admin.auth().setCustomUserClaims(uid, remaining);
  console.log(`✓ Admin claim revoked from user: ${uid}`);
}

async function checkAdmin(uid: string): Promise<void> {
  initAdminApp();
  const user = await admin.auth().getUser(uid);
  const claims = (user.customClaims ?? {}) as Record<string, unknown>;
  const isAdmin = claims['admin'] === true;
  console.log(`User ${uid}: admin = ${String(isAdmin)}`);
  if (user.email) console.log(`  Email: ${user.email}`);
  if (user.displayName) console.log(`  Name: ${user.displayName}`);
}

// ─── CLI ─────────────────────────────────────────────────────────────────────

const program = new Command();

program
  .name('admin-ops')
  .description('Admin operations CLI for candidate-skill-scanner')
  .version('0.1.0');

program
  .command('grant-admin')
  .description('Grant admin custom claim to a Firebase user')
  .requiredOption('--uid <uid>', 'Firebase user UID')
  .action(async (opts: { uid: string }) => {
    await grantAdmin(opts.uid).catch((err: unknown) => {
      console.error('Failed to grant admin:', err);
      process.exit(1);
    });
  });

program
  .command('revoke-admin')
  .description('Revoke admin custom claim from a Firebase user')
  .requiredOption('--uid <uid>', 'Firebase user UID')
  .action(async (opts: { uid: string }) => {
    await revokeAdmin(opts.uid).catch((err: unknown) => {
      console.error('Failed to revoke admin:', err);
      process.exit(1);
    });
  });

program
  .command('check-admin')
  .description('Check if a Firebase user has the admin custom claim')
  .requiredOption('--uid <uid>', 'Firebase user UID')
  .action(async (opts: { uid: string }) => {
    await checkAdmin(opts.uid).catch((err: unknown) => {
      console.error('Failed to check admin:', err);
      process.exit(1);
    });
  });

program.parse(process.argv);
