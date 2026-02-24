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
import { CandidatesTab } from '@/app/components/admin/CandidatesTab';

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
      <nav className="h-12 bg-slate-900 flex items-center justify-between px-3 md:px-4 sticky top-0 z-50">
        <div className="flex items-center gap-2 sm:gap-4">
          <Link to="/search" className="text-white font-semibold text-sm font-sans tracking-tight">
            <span className="hidden sm:inline">Candidate Skill Scanner</span>
            <span className="sm:hidden">CSS</span>
          </Link>
          <span className="text-slate-500 text-xs">Admin</span>
        </div>
        <div className="flex items-center gap-2 md:gap-3">
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
      <div className="border-b border-slate-200 bg-white sticky top-12 z-40 overflow-x-auto">
        <div className="flex gap-0 px-2 md:px-4">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => handleTabChange(tab.id)}
              className={`px-3 md:px-4 py-3 text-xs md:text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${
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
      <main className="p-4 md:p-6 max-w-6xl mx-auto">
        {activeTab === 'pipeline' && <PipelineTab />}
        {activeTab === 'queue' && <QueueTab />}
        {activeTab === 'flags' && <FlagsTab />}
        {activeTab === 'candidates' && <CandidatesTab />}
      </main>
    </div>
  );
}
