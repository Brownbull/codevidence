import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from '@/app/auth/AuthContext';
import { PrivateRoute } from '@/app/auth/PrivateRoute';
import { AdminRoute } from '@/app/auth/AdminRoute';
import { LoginPage } from '@/app/pages/LoginPage';
import { SearchPage } from '@/app/pages/SearchPage';
import { CandidateProfilePage } from '@/app/pages/CandidateProfilePage';
import { AdminPage } from '@/app/pages/AdminPage';
import { GrantAccessPage } from '@/app/pages/GrantAccessPage';
import { ScoreMethodologyPage } from '@/app/pages/ScoreMethodologyPage';
import { MyProfilePage } from '@/app/pages/MyProfilePage';
import './styles.css';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
          <Routes>
            {/* Public */}
            <Route path="/login" element={<LoginPage />} />
            <Route path="/grant-access" element={<GrantAccessPage />} />

            {/* Authenticated */}
            <Route element={<PrivateRoute />}>
              <Route path="/search" element={<SearchPage />} />
              <Route path="/candidates/:id" element={<CandidateProfilePage />} />
              <Route path="/methodology" element={<ScoreMethodologyPage />} />
              <Route path="/my-profile" element={<MyProfilePage />} />
            </Route>

            {/* Admin-only */}
            <Route element={<AdminRoute />}>
              <Route path="/admin/*" element={<AdminPage />} />
            </Route>

            {/* Root redirect — LoginPage handles auth-aware redirect to /search */}
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Catch-all */}
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error('Root element not found');
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
