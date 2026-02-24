/**
 * tests/unit/us-015-profile.test.ts
 *
 * Unit tests for US-015: Candidate profile page with full evidence sections.
 */

import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const ROOT = resolve(__dirname, '../..');

function readSource(relativePath: string): string {
  return readFileSync(resolve(ROOT, relativePath), 'utf-8');
}

// ─── Candidates Handler ─────────────────────────────────────────────────────

describe('US-015: Candidates Handler', () => {
  const src = readSource('src/handlers/candidates.ts');

  it('exports getCandidate async function', () => {
    expect(src).toContain('export async function getCandidate');
  });

  it('exports getCandidateRepositories async function', () => {
    expect(src).toContain('export async function getCandidateRepositories');
  });

  it('fetches candidate by username as doc ID', () => {
    expect(src).toContain('getDoc<Candidate>');
    expect(src).toContain('username');
  });

  it('queries repositories by owner', () => {
    expect(src).toContain("where('owner', '==', owner)");
  });

  it('imports from Firestore wrapper only', () => {
    expect(src).toContain("from '../core/db/firestore.js'");
    expect(src).not.toContain("from 'firebase/");
  });
});

// ─── useCandidate Hook ──────────────────────────────────────────────────────

describe('US-015: useCandidate Hook', () => {
  const src = readSource('src/app/hooks/useCandidate.ts');

  it('exports useCandidate function', () => {
    expect(src).toContain('export function useCandidate');
  });

  it('exports useCandidateRepos function', () => {
    expect(src).toContain('export function useCandidateRepos');
  });

  it('uses TanStack Query useQuery', () => {
    expect(src).toContain("from '@tanstack/react-query'");
    expect(src).toContain('useQuery');
  });

  it('caches candidate under queryKey ["candidate", username]', () => {
    expect(src).toContain("queryKey: ['candidate', username]");
  });

  it('caches repos under separate queryKey', () => {
    expect(src).toContain("queryKey: ['candidate-repos', owner]");
  });

  it('sets 5-minute staleTime', () => {
    expect(src).toContain('staleTime: 5 * 60 * 1000');
  });

  it('calls getCandidate handler', () => {
    expect(src).toContain('getCandidate(username)');
  });

  it('calls getCandidateRepositories handler', () => {
    expect(src).toContain('getCandidateRepositories(owner)');
  });
});

// ─── CandidateProfilePage ───────────────────────────────────────────────────

describe('US-015: CandidateProfilePage', () => {
  const src = readSource('src/app/pages/CandidateProfilePage.tsx');

  it('reads :id param from URL', () => {
    expect(src).toContain('useParams');
    expect(src).toContain("{ id: string }");
  });

  it('loads candidate via useCandidate hook', () => {
    expect(src).toContain('useCandidate(username)');
  });

  it('loads repos via useCandidateRepos hook', () => {
    expect(src).toContain('useCandidateRepos(username)');
  });

  it('renders 404 state when candidate not found', () => {
    expect(src).toContain('Candidate not found');
    expect(src).toContain('!candidate');
  });

  it('shows loading skeleton while fetching', () => {
    expect(src).toContain('isLoading');
    expect(src).toContain('animate-pulse');
  });

  it('renders GitHub username as heading', () => {
    expect(src).toContain('candidate.githubUsername');
    expect(src).toContain('<h1');
  });

  it('links to GitHub profile in new tab', () => {
    expect(src).toContain('candidate.githubProfileUrl');
    expect(src).toContain('target="_blank"');
    expect(src).toContain('rel="noopener noreferrer"');
  });

  it('renders SkillScoreBadge', () => {
    expect(src).toContain('SkillScoreBadge');
    expect(src).toContain('candidate.skillScore');
  });

  it('renders AIMaturityBadge', () => {
    expect(src).toContain('AIMaturityBadge');
    expect(src).toContain('candidate.aiMaturityScore');
  });

  it('renders StalenessTag', () => {
    expect(src).toContain('StalenessTag');
    expect(src).toContain('candidate.isStale');
  });

  it('shows lastScanned date', () => {
    expect(src).toContain('lastScanned');
    expect(src).toContain('toLocaleDateString');
  });

  it('shows commitSpanMonths', () => {
    expect(src).toContain('commitSpanMonths');
    expect(src).toContain('commit span');
  });

  it('renders back to search link', () => {
    expect(src).toContain('Back to search');
    expect(src).toContain('to="/search"');
  });

  it('shows avatar image', () => {
    expect(src).toContain('candidate.avatarUrl');
    expect(src).toContain('rounded-full');
  });

  it('shows repo count', () => {
    expect(src).toContain('candidate.repoCount');
    expect(src).toContain('repo');
  });
});

// ─── Evidence Sections ──────────────────────────────────────────────────────

describe('US-015: SkillsSection', () => {
  const src = readSource('src/app/components/profile/EvidenceSection.tsx');

  it('renders Languages group', () => {
    expect(src).toContain('Languages');
    expect(src).toContain('candidate.detectedLanguages');
  });

  it('renders Frameworks group', () => {
    expect(src).toContain('Frameworks');
    expect(src).toContain('candidate.detectedFrameworks');
  });

  it('renders Tools group', () => {
    expect(src).toContain('Tools');
    expect(src).toContain('candidate.detectedTools');
  });

  it('strips category prefix from tag display', () => {
    expect(src).toContain("tag.split(':')[1]");
  });
});

describe('US-015: RepositoriesSection', () => {
  const src = readSource('src/app/components/profile/EvidenceSection.tsx');

  it('shows empty state when no repos', () => {
    expect(src).toContain('No repositories scanned yet');
  });

  it('links to GitHub repo URL in new tab', () => {
    expect(src).toContain('repo.githubUrl');
    expect(src).toContain('target="_blank"');
  });

  it('shows repo fullName', () => {
    expect(src).toContain('repo.fullName');
  });

  it('shows primary language', () => {
    expect(src).toContain('repo.primaryLanguage');
  });

  it('shows star count', () => {
    expect(src).toContain('repo.starCount');
  });

  it('shows commit span', () => {
    expect(src).toContain('repo.commitSpanMonths');
  });

  it('shows scan status badge', () => {
    expect(src).toContain('ScanStatusBadge');
    expect(src).toContain('repo.scanStatus');
  });

  it('renders repo count in section header', () => {
    expect(src).toContain('repos.length');
  });
});

describe('US-015: AiSignalsSection', () => {
  const src = readSource('src/app/components/profile/EvidenceSection.tsx');

  it('shows empty state when no AI signals', () => {
    expect(src).toContain('No AI tooling signals detected');
  });

  it('renders AI config files with modificationCount', () => {
    expect(src).toContain('signal.modificationCount');
    expect(src).toContain('mods');
  });

  it('shows isEvolved indicator', () => {
    expect(src).toContain('signal.isEvolved');
    expect(src).toContain('Evolved');
  });

  it('shows diffComplexity', () => {
    expect(src).toContain('signal.diffComplexity');
  });

  it('shows originSignal', () => {
    expect(src).toContain('signal.originSignal');
  });

  it('renders coAuthoredByAI chip', () => {
    expect(src).toContain('coAuthoredByAI');
    expect(src).toContain('Co-authored by AI');
  });

  it('renders aiAgentPatterns chips', () => {
    expect(src).toContain('candidate.aiAgentPatterns');
    expect(src).toContain('AI Agent Patterns');
  });

  it('aggregates config files from all repos', () => {
    expect(src).toContain('repos.flatMap');
    expect(src).toContain('aiConfigFiles');
  });
});

describe('US-015: EvolutionSection', () => {
  const src = readSource('src/app/components/profile/EvidenceSection.tsx');

  it('renders timeline heading', () => {
    expect(src).toContain('AI Evolution Timeline');
  });

  it('shows empty state when no config file history', () => {
    expect(src).toContain('No AI config file history available');
  });

  it('shows first seen date', () => {
    expect(src).toContain('First seen');
    expect(src).toContain('firstDetectedAt');
  });

  it('shows modification count', () => {
    expect(src).toContain('Modifications');
    expect(src).toContain('signal.modificationCount');
  });

  it('shows last modified date', () => {
    expect(src).toContain('Last modified');
    expect(src).toContain('lastModifiedAt');
  });

  it('shows isEvolved classification', () => {
    expect(src).toContain('Evolved');
    expect(src).toContain('Static');
  });

  it('includes repo name for context', () => {
    expect(src).toContain('repoName');
  });

  it('timeline items are expandable', () => {
    expect(src).toContain('expanded');
    expect(src).toContain('setExpanded');
  });
});

// ─── Integration: Routing ───────────────────────────────────────────────────

describe('US-015: Routing Integration', () => {
  const mainSrc = readSource('src/app/main.tsx');

  it('route /candidates/:id maps to CandidateProfilePage', () => {
    expect(mainSrc).toContain('/candidates/:id');
    expect(mainSrc).toContain('CandidateProfilePage');
  });

  it('CandidateProfilePage is inside PrivateRoute', () => {
    expect(mainSrc).toContain('PrivateRoute');
    expect(mainSrc).toContain('CandidateProfilePage');
  });
});

// ─── Integration: CandidateCard links to profile ────────────────────────────

describe('US-015: CandidateCard → Profile Navigation', () => {
  const cardSrc = readSource('src/app/components/search/CandidateCard.tsx');

  it('CandidateCard links to /candidates/:username', () => {
    expect(cardSrc).toContain('/candidates/');
    expect(cardSrc).toContain('candidate.githubUsername');
  });
});
