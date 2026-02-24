/**
 * src/app/auth/PrivateRoute.tsx — Route guard for authenticated users.
 *
 * Redirects unauthenticated users to /login.
 * Shows a loading spinner while auth state is resolving (no flash of redirect).
 */

import React from 'react';
import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/app/auth/AuthContext';

export function PrivateRoute() {
  const { user, loading } = useAuth();

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

  return <Outlet />;
}
