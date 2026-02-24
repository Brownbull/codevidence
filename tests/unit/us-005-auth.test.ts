/**
 * tests/unit/us-005-auth.test.ts
 *
 * Verifies US-005 deliverables:
 * 1. Firebase Auth singleton structure and emulator detection
 * 2. AuthContext exports (hook, provider, correct types)
 * 3. PrivateRoute and AdminRoute component exports and structure
 * 4. verify-admin-claim Firebase Function structure (403 on missing claim)
 * 5. admin-ops CLI structure (grant-admin, revoke-admin, check-admin)
 * 6. React Router wiring in main.tsx
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(__dirname, '../..');

function readFile(relativePath: string): string {
  return readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

// ─── Firebase Auth singleton ──────────────────────────────────────────────────

describe('src/core/auth/firebase-auth.ts', () => {
  it('exists', () => {
    const content = readFile('src/core/auth/firebase-auth.ts');
    expect(content.length).toBeGreaterThan(0);
  });

  it('exports getAuthInstance function', () => {
    const content = readFile('src/core/auth/firebase-auth.ts');
    expect(content).toContain('export function getAuthInstance');
  });

  it('exports signInWithGoogle function', () => {
    const content = readFile('src/core/auth/firebase-auth.ts');
    expect(content).toContain('export async function signInWithGoogle');
  });

  it('exports signOut function', () => {
    const content = readFile('src/core/auth/firebase-auth.ts');
    expect(content).toContain('export function signOut');
  });

  it('connects to Auth emulator when VITE_USE_EMULATOR is true', () => {
    const content = readFile('src/core/auth/firebase-auth.ts');
    expect(content).toContain('connectAuthEmulator');
    expect(content).toContain('VITE_USE_EMULATOR');
    expect(content).toContain('localhost:9099');
  });

  it('uses signInWithPopup to avoid cross-origin storage issues with redirect flow', () => {
    const content = readFile('src/core/auth/firebase-auth.ts');
    expect(content).toContain('signInWithPopup');
  });
});

// ─── AuthContext ──────────────────────────────────────────────────────────────

describe('src/app/auth/AuthContext.tsx', () => {
  it('exists', () => {
    const content = readFile('src/app/auth/AuthContext.tsx');
    expect(content.length).toBeGreaterThan(0);
  });

  it('exports AuthProvider component', () => {
    const content = readFile('src/app/auth/AuthContext.tsx');
    expect(content).toContain('export function AuthProvider');
  });

  it('exports useAuth hook', () => {
    const content = readFile('src/app/auth/AuthContext.tsx');
    expect(content).toContain('export function useAuth');
  });

  it('reads admin claim from ID token (not Firestore or local state)', () => {
    const content = readFile('src/app/auth/AuthContext.tsx');
    expect(content).toContain('getIdTokenResult');
    expect(content).toContain("claims['admin'] === true");
    // Must NOT query Firestore for admin status
    expect(content).not.toContain('getDoc');
    expect(content).not.toContain('queryDocs');
  });

  it('exposes user, isAdmin, loading, signInWithGoogle, signOut in context value', () => {
    const content = readFile('src/app/auth/AuthContext.tsx');
    expect(content).toContain('user,');
    expect(content).toContain('isAdmin,');
    expect(content).toContain('loading,');
    expect(content).toContain('signInWithGoogle,');
    expect(content).toContain('signOut,');
  });

  it('throws if useAuth is used outside AuthProvider', () => {
    const content = readFile('src/app/auth/AuthContext.tsx');
    expect(content).toContain("'useAuth must be used inside <AuthProvider>'");
  });

  it('sets loading: true initially and false after auth resolves', () => {
    const content = readFile('src/app/auth/AuthContext.tsx');
    expect(content).toContain('useState(true)');  // loading starts true
    expect(content).toContain('setLoading(false)');
  });
});

// ─── PrivateRoute ─────────────────────────────────────────────────────────────

describe('src/app/auth/PrivateRoute.tsx', () => {
  it('exists', () => {
    const content = readFile('src/app/auth/PrivateRoute.tsx');
    expect(content.length).toBeGreaterThan(0);
  });

  it('exports PrivateRoute component', () => {
    const content = readFile('src/app/auth/PrivateRoute.tsx');
    expect(content).toContain('export function PrivateRoute');
  });

  it('redirects unauthenticated users to /login', () => {
    const content = readFile('src/app/auth/PrivateRoute.tsx');
    expect(content).toContain('Navigate to="/login"');
  });

  it('renders Outlet for authenticated users', () => {
    const content = readFile('src/app/auth/PrivateRoute.tsx');
    expect(content).toContain('<Outlet');
  });

  it('shows loading state while auth resolves (no flash of redirect)', () => {
    const content = readFile('src/app/auth/PrivateRoute.tsx');
    expect(content).toContain('if (loading)');
    // Must NOT return Navigate while loading
    const loadingBlock = extractIfBlock(content, 'if (loading)');
    expect(loadingBlock).not.toContain('<Navigate');
  });
});

// ─── AdminRoute ───────────────────────────────────────────────────────────────

describe('src/app/auth/AdminRoute.tsx', () => {
  it('exists', () => {
    const content = readFile('src/app/auth/AdminRoute.tsx');
    expect(content.length).toBeGreaterThan(0);
  });

  it('exports AdminRoute component', () => {
    const content = readFile('src/app/auth/AdminRoute.tsx');
    expect(content).toContain('export function AdminRoute');
  });

  it('redirects non-admin authenticated users to /search (not /login)', () => {
    const content = readFile('src/app/auth/AdminRoute.tsx');
    expect(content).toContain('Navigate to="/search"');
  });

  it('redirects unauthenticated users to /login', () => {
    const content = readFile('src/app/auth/AdminRoute.tsx');
    expect(content).toContain('Navigate to="/login"');
  });

  it('reads isAdmin from auth context (ID token custom claim)', () => {
    const content = readFile('src/app/auth/AdminRoute.tsx');
    expect(content).toContain('isAdmin');
    expect(content).toContain('useAuth');
  });

  it('shows loading state while auth resolves', () => {
    const content = readFile('src/app/auth/AdminRoute.tsx');
    expect(content).toContain('if (loading)');
  });

  it('renders Outlet for admin users', () => {
    const content = readFile('src/app/auth/AdminRoute.tsx');
    expect(content).toContain('<Outlet');
  });
});

// ─── verify-admin-claim Firebase Function ─────────────────────────────────────

describe('functions/src/index.ts (verify-admin-claim)', () => {
  it('exists', () => {
    const content = readFile('functions/src/index.ts');
    expect(content.length).toBeGreaterThan(0);
  });

  it('exports verifyAdminClaim function', () => {
    const content = readFile('functions/src/index.ts');
    expect(content).toContain('export const verifyAdminClaim');
  });

  it('uses onCall (HTTPS callable function)', () => {
    const content = readFile('functions/src/index.ts');
    expect(content).toContain('onCall');
  });

  it('throws permission-denied (403) when admin claim is absent', () => {
    const content = readFile('functions/src/index.ts');
    expect(content).toContain("'permission-denied'");
    expect(content).toContain('does not have admin privileges');
  });

  it('throws unauthenticated (401) when user is not signed in', () => {
    const content = readFile('functions/src/index.ts');
    expect(content).toContain("'unauthenticated'");
  });

  it('reads admin claim from token (not Firestore)', () => {
    const content = readFile('functions/src/index.ts');
    expect(content).toContain("request.auth.token['admin'] === true");
    expect(content).not.toContain('getFirestore');
  });

  it('returns { isAdmin: true } on success', () => {
    const content = readFile('functions/src/index.ts');
    expect(content).toContain('isAdmin: true');
  });
});

// ─── admin-ops CLI ────────────────────────────────────────────────────────────

describe('scripts/admin-ops.ts', () => {
  it('exists', () => {
    const content = readFile('scripts/admin-ops.ts');
    expect(content.length).toBeGreaterThan(0);
  });

  it('has grant-admin command', () => {
    const content = readFile('scripts/admin-ops.ts');
    expect(content).toContain("'grant-admin'");
  });

  it('has revoke-admin command', () => {
    const content = readFile('scripts/admin-ops.ts');
    expect(content).toContain("'revoke-admin'");
  });

  it('has check-admin command', () => {
    const content = readFile('scripts/admin-ops.ts');
    expect(content).toContain("'check-admin'");
  });

  it('uses --uid option for all commands', () => {
    const content = readFile('scripts/admin-ops.ts');
    const uidCount = (content.match(/--uid/g) ?? []).length;
    expect(uidCount).toBeGreaterThanOrEqual(3);
  });

  it('sets { admin: true } custom claim via firebase-admin', () => {
    const content = readFile('scripts/admin-ops.ts');
    expect(content).toContain('setCustomUserClaims');
    expect(content).toContain('admin: true');
  });

  it('uses firebase-admin SDK (not firebase/auth client SDK)', () => {
    const content = readFile('scripts/admin-ops.ts');
    expect(content).toContain("from 'firebase-admin'");
    expect(content).not.toContain("from 'firebase/auth'");
  });
});

// ─── main.tsx routing ─────────────────────────────────────────────────────────

describe('src/app/main.tsx — routing', () => {
  it('imports and uses BrowserRouter', () => {
    const content = readFile('src/app/main.tsx');
    expect(content).toContain('BrowserRouter');
  });

  it('wraps app in AuthProvider', () => {
    const content = readFile('src/app/main.tsx');
    expect(content).toContain('AuthProvider');
  });

  it('has /login route (public)', () => {
    const content = readFile('src/app/main.tsx');
    expect(content).toContain('path="/login"');
  });

  it('has /search route inside PrivateRoute', () => {
    const content = readFile('src/app/main.tsx');
    expect(content).toContain('PrivateRoute');
    expect(content).toContain('path="/search"');
  });

  it('has /admin/* route inside AdminRoute', () => {
    const content = readFile('src/app/main.tsx');
    expect(content).toContain('AdminRoute');
    expect(content).toContain('path="/admin/*"');
  });

  it('has /candidates/:id route inside PrivateRoute', () => {
    const content = readFile('src/app/main.tsx');
    expect(content).toContain('path="/candidates/:id"');
  });

  it('root / redirects to /login', () => {
    const content = readFile('src/app/main.tsx');
    expect(content).toContain('path="/"');
    expect(content).toContain('/login');
  });
});

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Extracts the body of the first `if (...)` block matching the given condition.
 * Used to verify no <Navigate> inside loading blocks.
 */
function extractIfBlock(source: string, condition: string): string {
  const idx = source.indexOf(condition);
  if (idx === -1) return '';

  let depth = 0;
  let inside = false;
  let start = idx;
  const result: string[] = [];

  for (let i = start; i < source.length; i++) {
    const ch = source[i];
    if (ch === '{') { depth++; inside = true; }
    else if (ch === '}') {
      depth--;
      if (inside && depth === 0) {
        result.push(ch);
        break;
      }
    }
    if (inside || i >= start) result.push(ch ?? '');
  }

  return result.join('');
}
