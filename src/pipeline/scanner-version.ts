/**
 * src/pipeline/scanner-version.ts — Pipeline scanner version constant.
 *
 * Used to track which version of the scanning pipeline was used to analyze
 * a repository. When the scanner version changes, repos are re-scanned
 * even if the repo itself hasn't changed.
 *
 * Bump this when analysis logic changes materially (new signals, scoring
 * formula changes, etc.). Follows semver from package.json.
 */

import { readFileSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

function loadVersion(): string {
  try {
    // Resolve relative to this file → src/pipeline/ → ../../package.json
    const dir = dirname(fileURLToPath(import.meta.url));
    const pkgPath = resolve(dir, '../../package.json');
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8')) as { version: string };
    return pkg.version;
  } catch {
    return '0.0.0';
  }
}

/** Current scanner pipeline version, read from package.json. */
export const SCANNER_VERSION: string = loadVersion();
