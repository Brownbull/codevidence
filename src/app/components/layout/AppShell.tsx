/**
 * src/app/components/layout/AppShell.tsx — Responsive app layout.
 *
 * Desktop: top nav (h-12, slate-900) + left facet panel (w-64) + main content.
 * Mobile (<768px): nav collapses, sidebar becomes slide-out drawer.
 */

import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/app/auth/AuthContext';
import { SettingsPopover } from './SettingsPopover';
import { useUiStore } from '@/app/store/ui-store';

interface AppShellProps {
  sidebar?: React.ReactNode;
  children: React.ReactNode;
}

export function AppShell({ sidebar, children }: AppShellProps) {
  const { user, isAdmin, signOut } = useAuth();
  const { mobileFiltersOpen, setMobileFiltersOpen } = useUiStore();

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <nav className="h-12 bg-slate-900 flex items-center justify-between px-3 md:px-4 sticky top-0 z-50">
        <div className="flex items-center gap-2">
          {/* Mobile filter toggle */}
          {sidebar && (
            <button
              type="button"
              onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
              className="md:hidden text-slate-300 hover:text-white p-1"
              aria-label="Toggle filters"
            >
              <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M3 5a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 10a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zM3 15a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
              </svg>
            </button>
          )}
          <Link to="/search" className="text-white font-semibold text-sm font-sans tracking-tight">
            <span className="hidden sm:inline">Candidate Skill Scanner</span>
            <span className="sm:hidden">CSS</span>
          </Link>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
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
          <span className="text-slate-300 text-xs hidden sm:inline">
            {user?.displayName ?? user?.email}
          </span>
          <SettingsPopover />
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
      <div className="flex relative">
        {/* Desktop sidebar */}
        {sidebar && (
          <div className="hidden md:block flex-shrink-0">
            {sidebar}
          </div>
        )}

        {/* Mobile drawer overlay */}
        {sidebar && mobileFiltersOpen && (
          <>
            <div
              className="fixed inset-0 bg-black/40 z-40 md:hidden"
              onClick={() => setMobileFiltersOpen(false)}
            />
            <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 md:hidden overflow-y-auto shadow-xl pt-12">
              <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
                <span className="text-sm font-medium text-slate-900">Filters</span>
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(false)}
                  className="text-slate-400 hover:text-slate-600 p-1"
                  aria-label="Close filters"
                >
                  <svg width="20" height="20" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              {sidebar}
            </div>
          </>
        )}

        <main className="flex-1 p-4 md:p-6 min-w-0">
          {children}
        </main>
      </div>
    </div>
  );
}
