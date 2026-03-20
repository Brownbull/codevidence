/**
 * src/pipeline/worker-id.ts — Unique worker identifier.
 *
 * Format: {hostname}-{pid}-{random4hex}
 * Example: macbook-42019-a3f1
 *
 * Stable within a process lifetime. Unique across machines and processes.
 */

import { hostname } from 'os';
import { randomBytes } from 'crypto';

let _workerId: string | null = null;

/** Returns the unique worker ID for this process. Cached after first call. */
export function getWorkerId(): string {
  if (_workerId) return _workerId;
  const host = hostname().slice(0, 20);
  const pid = process.pid;
  const rand = randomBytes(2).toString('hex');
  _workerId = `${host}-${pid}-${rand}`;
  return _workerId;
}
