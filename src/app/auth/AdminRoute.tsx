/**
 * src/app/auth/AdminRoute.tsx — Route guard for admin users.
 *
 * Requires both authentication AND admin custom claim (admin: true in ID token).
 * Redirects:
 *   - unauthenticated users → /login
 *   - authenticated non-admin users → /search
 *
 * Shows a loading spinner while auth state is resolving (no flash of redirect).
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/auth/AuthContext';

export function AdminRoute() {
  const { user, isAdmin, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div
          className="text-slate-400 font-mono text-sm"
          role="status"
          aria-label="Loading authentication"
        >
          Loading…
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Authenticated but not admin → redirect to search (not 404)
  if (!isAdmin) {
    return <Navigate to="/search" replace />;
  }

  return <Outlet />;
}
