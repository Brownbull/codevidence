/**
 * src/app/pages/AdminPage.tsx — Admin dashboard with four tabs.
 *
 * Tabs: Pipeline / Queue / Flags / Candidates
 * Deep-linking via URL ?tab= param.
 */
import React from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '@/app/auth/AuthContext';
import { PipelineTab } from '@/app/components/admin/PipelineTab';
import { QueueTab } from '@/app/components/admin/QueueTab';
import { FlagsTab } from '@/app/components/admin/FlagsTab';

type AdminTabId = 'pipeline' | 'queue' | 'flags' | 'candidates';

const TABS: { id: AdminTabId; label: string }[] = [
  { id: 'pipeline', label: 'Pipeline' },
  { id: 'queue', label: 'Queue' },
  { id: 'flags', label: 'Flags' },
  { id: 'candidates', label: 'Candidates' },
];

export function AdminPage() {
  const { user, signOut } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const rawTab = searchParams.get('tab') ?? 'pipeline';
  const activeTab: AdminTabId = TABS.some((t) => t.id === rawTab)
    ? (rawTab as AdminTabId)
    : 'pipeline';

  const handleTabChange = (tabId: AdminTabId) => {
    setSearchParams({ tab: tabId });
  };

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Top nav */}
      <nav className="h-12 bg-slate-900 flex items-center justify-between px-4 sticky top-0 z-50">
        <div className="flex items-center gap-4">
          <Link to="/search" className="text-white font-semibold text-sm font-sans tracking-tight">
            Candidate Skill Scanner
          </Link>
          <span className="text-slate-500 text-xs">Admin</span>
        </div>
        <div className="flex items-center gap-3">
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

      {/* Tab bar */}
      <div className="border-b border-slate-200 bg-white sticky top-12 z-40">
        <div className="flex gap-0 px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-4 py-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? 'border-slate-900 text-slate-900'
                  : 'border-transparent text-slate-500 hover:text-slate-700'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <main className="p-6 max-w-6xl mx-auto">
        {activeTab === 'pipeline' && <PipelineTab />}
        {activeTab === 'queue' && <QueueTab />}
        {activeTab === 'flags' && <FlagsTab />}
        {activeTab === 'candidates' && (
          <p className="text-slate-500 font-mono text-sm text-center mt-8">
            Candidates tab — US-017
          </p>
        )}
      </main>
    </div>
  );
}
