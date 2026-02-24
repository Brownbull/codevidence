/**
 * tests/unit/us-017-admin-candidates.test.ts
 *
 * Unit tests for US-017: Admin candidates tab, rescan triggers,
 * and inline AI Maturity Score assignment.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Candidates Handler ─────────────────────────────────────────────────────

describe('US-017: Candidates Handler — updateAiMaturityScore', () => {
  const src = readSource('src/handlers/candidates.ts');

  it('exports updateAiMaturityScore async function', () => {
    expect(src).toContain('export async function updateAiMaturityScore');
  });

  it('writes aiMaturityScore to Firestore', () => {
    expect(src).toContain('aiMaturityScore: score');
  });

  it('writes aiMaturityScoredAt with serverTimestamp', () => {
    expect(src).toContain('aiMaturityScoredAt:');
    expect(src).toContain('serverTimestamp()');
  });

  it('writes aiMaturityScoredBy with admin UID', () => {
    expect(src).toContain('aiMaturityScoredBy: adminUid');
  });

  it('only writes aiMaturity fields — never skillScore', () => {
    // updateAiMaturityScore should use updateDoc, not setDoc
    expect(src).toContain('updateDoc<Candidate>');
    // And should NOT contain skillScore in the update data
    const updateBlock = src.slice(src.indexOf('updateAiMaturityScore'));
    expect(updateBlock).not.toContain('skillScore:');
  });

  it('exports getAllCandidates function', () => {
    expect(src).toContain('export async function getAllCandidates');
  });

  it('exports getLanguageTaxonomy function', () => {
    expect(src).toContain('export async function getLanguageTaxonomy');
  });

  it('imports from Firestore wrapper only', () => {
    expect(src).toContain("from '../core/db/firestore.js'");
    expect(src).not.toContain("from 'firebase/");
  });
});

// ─── CandidatesTab ──────────────────────────────────────────────────────────

describe('US-017: CandidatesTab Component', () => {
  const src = readSource('src/app/components/admin/CandidatesTab.tsx');

  it('shows summary row with total candidates', () => {
    expect(src).toContain('Total Candidates');
    expect(src).toContain('totalCount');
  });

  it('shows count with AI Maturity Score assigned', () => {
    expect(src).toContain('AI Maturity Scored');
    expect(src).toContain('scoredCount');
    expect(src).toContain('aiMaturityScore !== null');
  });

  it('shows count of stale candidates', () => {
    expect(src).toContain('Stale');
    expect(src).toContain('staleCount');
    expect(src).toContain('c.isStale');
  });

  it('shows taxonomy coverage breakdown for languages', () => {
    expect(src).toContain('Language Coverage');
    expect(src).toContain('languageTaxonomy');
    expect(src).toContain('item.displayName');
    expect(src).toContain('item.candidateCount');
  });

  it('renders candidates table with correct columns', () => {
    expect(src).toContain('Username');
    expect(src).toContain('Skill Score');
    expect(src).toContain('AI Maturity');
    expect(src).toContain('Last Scanned');
    expect(src).toContain('Status');
    expect(src).toContain('Actions');
  });

  it('renders SkillScoreBadge in table', () => {
    expect(src).toContain('SkillScoreBadge');
    expect(src).toContain('candidate.skillScore');
  });

  it('renders AIMaturityBadge in table', () => {
    expect(src).toContain('AIMaturityBadge');
    expect(src).toContain('candidate.aiMaturityScore');
  });

  it('highlights stale rows visually', () => {
    expect(src).toContain('candidate.isStale');
    expect(src).toContain('bg-amber-50');
  });

  it('shows loading skeleton', () => {
    expect(src).toContain('animate-pulse');
    expect(src).toContain('isLoading');
  });

  it('shows empty state when no candidates', () => {
    expect(src).toContain('No candidates yet');
  });
});

// ─── Rescan Trigger ─────────────────────────────────────────────────────────

describe('US-017: Rescan Trigger', () => {
  const src = readSource('src/app/components/admin/CandidatesTab.tsx');

  it('has Rescan button per candidate row', () => {
    expect(src).toContain('Rescan');
    expect(src).toContain('rescanMutation');
  });

  it('creates rescan-candidate job via enqueueRescanJob', () => {
    expect(src).toContain('enqueueRescanJob');
    expect(src).toContain("targetType: 'candidate'");
    expect(src).toContain('candidate.githubUsername');
  });

  it('invalidates admin-jobs query on rescan success', () => {
    expect(src).toContain("queryKey: ['admin-jobs']");
  });

  it('disables button while queuing', () => {
    expect(src).toContain('rescanMutation.isPending');
    expect(src).toContain('Queuing...');
  });
});

// ─── Inline Score Assignment ────────────────────────────────────────────────

describe('US-017: InlineScoreStepper', () => {
  const src = readSource('src/app/components/admin/CandidatesTab.tsx');

  it('renders segmented stepper [0][1][2][3][4][5]', () => {
    expect(src).toContain('[0, 1, 2, 3, 4, 5]');
    expect(src).toContain('{level}');
  });

  it('highlights current score with violet background', () => {
    expect(src).toContain('candidate.aiMaturityScore === level');
    expect(src).toContain('bg-violet-600 text-white');
  });

  it('calls updateAiMaturityScore on click', () => {
    expect(src).toContain('updateAiMaturityScore');
    expect(src).toContain('scoreMutation.mutate(level)');
  });

  it('passes admin UID to updateAiMaturityScore', () => {
    expect(src).toContain('user.uid');
  });

  it('invalidates candidate query cache on success', () => {
    expect(src).toContain("queryKey: ['candidate', candidate.id]");
    expect(src).toContain("queryKey: ['admin-candidates']");
  });

  it('shows success confirmation', () => {
    expect(src).toContain('scoreMutation.isSuccess');
    expect(src).toContain('Score saved');
  });

  it('row is expandable to show stepper', () => {
    expect(src).toContain('expanded');
    expect(src).toContain('setExpanded');
    expect(src).toContain('InlineScoreStepper');
  });
});

// ─── AdminPage Integration ──────────────────────────────────────────────────

describe('US-017: AdminPage Integration', () => {
  const src = readSource('src/app/pages/AdminPage.tsx');

  it('imports CandidatesTab', () => {
    expect(src).toContain('CandidatesTab');
  });

  it('renders CandidatesTab when candidates tab is active', () => {
    expect(src).toContain("activeTab === 'candidates'");
    expect(src).toContain('<CandidatesTab');
  });

  it('no longer shows US-017 stub', () => {
    expect(src).not.toContain('US-017');
  });
});

// ─── getAllCandidates & getLanguageTaxonomy ──────────────────────────────────

describe('US-017: Admin data queries', () => {
  const src = readSource('src/handlers/candidates.ts');

  it('getAllCandidates orders by skillScore desc', () => {
    expect(src).toContain("orderBy('skillScore', 'desc')");
  });

  it('getAllCandidates limits to 500', () => {
    expect(src).toContain('limit(500)');
  });

  it('getLanguageTaxonomy filters by category language', () => {
    expect(src).toContain("where('category', '==', 'language')");
  });

  it('getLanguageTaxonomy filters searchable items', () => {
    expect(src).toContain("where('isSearchable', '==', true)");
  });

  it('getLanguageTaxonomy orders by candidateCount desc', () => {
    expect(src).toContain("orderBy('candidateCount', 'desc')");
  });
});
