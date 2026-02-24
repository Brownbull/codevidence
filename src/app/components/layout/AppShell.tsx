/**
 * src/app/components/layout/AppShell.tsx — Three-zone app layout.
 *
 * Layout: top nav (h-12, slate-900) + left facet panel (w-64) + main content.
 * Minimum viewport: 1280px.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/auth/AuthContext';

interface AppShellProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  const { user, isAdmin, signOut } = useAuth();

  return (
    <div className="min-h-screen min-w-[1280px] bg-slate-50">
      {/* Top nav */}
      <nav className="h-12 bg-slate-900 flex items-center justify-between px-4 sticky top-0 z-50">
        <Link to="/search" className="text-white font-semibold text-sm font-sans tracking-tight">
          Candidate Skill Scanner
        </Link>
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Link
              to="/admin"
              className="text-slate-300 text-xs hover:text-white transition-colors"
            >
              Admin
            </Link>
          )}
          {user?.photoURL && (
            <img
              src={user.photoURL}
              alt=""
              className="h-6 w-6 rounded-full"
              referrerPolicy="no-referrer"
            />
          )}
          <span className="text-slate-300 text-xs">
            {user?.displayName ?? user?.email}
          </span>
          <button
            onClick={() => void signOut()}
            className="text-slate-400 text-xs hover:text-white transition-colors"
            type="button"
          >
            Sign out
          </button>
        </div>
      </nav>

      {/* Content area */}
      <div className="flex">
        {sidebar}
        <main className="flex-1 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
