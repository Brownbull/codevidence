---
status: complete
current_section: complete
inputDocuments:
  - ideas/planning/candidate-skill-scanner/brief.md
  - ideas/planning/candidate-skill-scanner/ux-design.md
  - ideas/planning/candidate-skill-scanner/idea.md
starterKit: setup/tools/claude-code-mastery-project-starter-kit
---

# candidate-skill-scanner — Architecture

**Author:** Winston (Architect)
**Date:** 2026-02-18
**Status:** Complete

---

## Section 1 — System Overview

### System Context

candidate-skill-scanner operates across three distinct runtime contexts that are fully decoupled by design:

1. **Browser SPA** — the user-facing React app (Chrome-only). Reads from Firestore. No direct GitHub calls. No compute-heavy work.
2. **Scan Pipeline** — a local Node.js CLI + worker process. Talks to GitHub API, clones repos locally, runs analysis, writes results to Firestore.
3. **Firebase Backend** — Firestore (data), Auth (identity), Hosting (SPA delivery). Firebase Functions used minimally for server-enforced auth logic and post-scan flagging triggers.

The two phases are **fully decoupled by design**: the pipeline writes to Firestore; the SPA reads from Firestore. They never communicate directly.

### High-Level System Diagram

```
┌──────────────────────────────────────────────────────────────────┐
│  BROWSER (Chrome SPA)                                            │
│                                                                  │
│  ┌─────────────────────────────────┐  ┌──────────────────────┐  │
│  │  Search UI  (/search)           │  │  Admin UI  (/admin)  │  │
│  │  Faceted search → Results →     │  │  Pipeline mgmt       │  │
│  │  Candidate profile              │  │  Score assignment    │  │
│  └────────────────┬────────────────┘  └──────────┬───────────┘  │
│                   │ reads                         │ reads/writes  │
└───────────────────┼───────────────────────────────┼──────────────┘
                    │                               │
         ┌──────────▼───────────────────────────────▼──────────┐
         │               FIREBASE                               │
         │                                                      │
         │  ┌─────────────┐  ┌──────────────┐  ┌───────────┐  │
         │  │  Firestore  │  │     Auth     │  │  Hosting  │  │
         │  │  (data)     │  │  (identity)  │  │  (SPA)    │  │
         │  └──────┬──────┘  └──────────────┘  └───────────┘  │
         │         │                                            │
         │  ┌──────┴──────┐                                    │
         │  │  Functions  │                                    │
         │  │  (minimal)  │                                    │
         │  └─────────────┘                                    │
         └─────────┼────────────────────────────────────────────┘
                   │ reads/writes
         ┌─────────▼────────────────────────────────────────────┐
         │  SCAN PIPELINE  (local Node.js process)               │
         │                                                        │
         │  CLI → Job Queue → Worker                             │
         │                    │                                  │
         │         ┌──────────┴─────────┐                        │
         │         │                    │                        │
         │  GitHub API          Local Clone Store                │
         │  (discovery +        (ephemeral — analyse             │
         │   shallow meta)       then delete)                    │
         └────────────────────────────────────────────────────────┘
```

### Component List

| Component | Runtime | Responsibilities |
|-----------|---------|-----------------|
| **React SPA** | Browser | Search UI, Admin UI, Auth flow, URL state management, display |
| **Firebase Auth** | Firebase cloud | Google Sign-In, session tokens, custom claims (admin role) |
| **Firestore** | Firebase cloud | All persistent data — candidates, repos, scan jobs, flags, taxonomy |
| **Firebase Hosting** | Firebase cloud | SPA static asset serving, SPA rewrite rules |
| **Firebase Functions** | Firebase cloud | Admin claim verification, post-scan flagging triggers (thin — 2–3 functions only) |
| **Scan Pipeline CLI** | Local Node.js | `scan discover`, `scan rescan`, `scan status`, admin role grant |
| **Scan Worker** | Local Node.js | Job queue consumer — GitHub API calls, repo cloning, analysis, Firestore writes |
| **GitHub API** | External | Repo discovery, shallow metadata only |
| **Local Clone Store** | Local filesystem | Ephemeral — repos cloned for analysis then deleted |

### Deployment Model

- **SPA**: deployed to Firebase Hosting. Single rewrite rule sends all routes to `index.html`.
- **Firestore + Auth**: Firebase cloud (managed, no server to operate).
- **Firebase Functions**: minimal deployment — admin claims verification + post-scan Firestore triggers (taxonomy count updates, underserved query flagging).
- **Scan Pipeline**: runs **locally** on Gabe's machine. Not deployed to any cloud. All deep analysis requires local compute + `git clone` access. Writes results to cloud Firestore. Cloud migration (Cloud Run / GCP) is the documented Growth phase path for unattended scheduled scanning.

### Key Architectural Decision

> The scan pipeline is a **local process, not a cloud service**. It writes to cloud Firestore but runs on local hardware. This is correct for MVP: ephemeral repo cloning, local disk usage, and the need for `git clone` access all favour local execution. Firebase Functions are limited to server-side trust enforcement and lightweight post-scan triggers — not compute-heavy pipeline work.
>
> **Growth path**: Migrate pipeline worker to Cloud Run (GCP), triggered by Pub/Sub, for unattended scheduled scanning. No application code changes required — only deployment target changes.

---

## Section 2 — Tech Stack

### Project Structure — Option A: Monorepo (single `package.json`)

One repository, one `package.json`, two runtime targets. The starter kit's single-package pattern is followed directly. A root `tsconfig.json` is extended by target-specific configs to prevent DOM/Node cross-contamination.

```
candidate-skill-scanner/
├── CLAUDE.md                         # Project instructions (starter kit pattern)
├── CLAUDE.local.md                   # Personal overrides (gitignored)
├── .claude/
│   ├── commands/                     # Slash commands
│   ├── agents/
│   └── hooks/
├── src/
│   ├── app/                          # ── React SPA (Vite entry point)
│   │   ├── main.tsx                  # Vite SPA entry
│   │   ├── App.tsx                   # Root router + auth guard
│   │   ├── components/               # All React components
│   │   │   ├── search/               # FacetPanel, ActiveFilterChips, CandidateCard, etc.
│   │   │   ├── profile/              # EvidenceSection variants, AIMaturityBadge (profile)
│   │   │   ├── admin/                # AdminQueueRow, pipeline management views
│   │   │   └── shared/               # SkillScoreBadge, AIMaturityBadge, StalenessTag, etc.
│   │   ├── pages/                    # Route-level page components
│   │   │   ├── SearchPage.tsx
│   │   │   ├── CandidateProfilePage.tsx
│   │   │   └── admin/
│   │   │       └── AdminPage.tsx
│   │   ├── hooks/                    # React hooks (useSearchQuery, useCandidates, etc.)
│   │   └── lib/                      # SPA-specific utilities (url-state, auth helpers)
│   ├── pipeline/                     # ── Node.js scan pipeline (tsx entry point)
│   │   ├── index.ts                  # CLI entry (Commander.js)
│   │   ├── worker.ts                 # Job queue consumer
│   │   ├── discovery/                # GitHub API repo discovery
│   │   ├── analysis/                 # Layer 1 + Layer 2 analysis
│   │   │   ├── layer1.ts             # Language/framework detection
│   │   │   ├── layer2.ts             # Commit patterns, complexity, ownership
│   │   │   └── ai-signals.ts         # AI tooling signal extraction
│   │   └── scoring/                  # Skill Score computation
│   ├── core/
│   │   └── db/
│   │       └── firestore.ts          # ← CENTRALIZED Firestore wrapper (all DB access here)
│   ├── adapters/
│   │   ├── github.ts                 # GitHub API adapter (Octokit wrapper)
│   │   └── source-adapter.ts         # Source-agnostic interface
│   ├── handlers/                     # Business logic (shared where applicable)
│   │   ├── candidates.ts             # Candidate CRUD + scoring
│   │   ├── search.ts                 # Search query construction + client-side filter
│   │   ├── scan-jobs.ts              # Job queue management
│   │   ├── taxonomy.ts               # Taxonomy reads + expansion
│   │   └── admin-flags.ts            # Underserved query + repos-of-interest logic
│   └── types/                        # ALL shared TypeScript types (strict, no any)
│       ├── candidate.ts
│       ├── repository.ts
│       ├── scan-job.ts
│       ├── taxonomy.ts
│       └── admin.ts
├── functions/                        # Firebase Functions source (separate tsconfig)
│   └── src/
│       ├── index.ts                  # Function exports
│       ├── verify-admin-claim.ts     # Admin claim server-side check
│       └── on-scan-complete.ts       # Post-scan Firestore trigger
├── scripts/
│   ├── db-query.ts                   # Firestore dev/test query registry (starter kit pattern)
│   ├── queries/                      # Individual registered query files
│   └── admin-ops.ts                  # Firebase Admin SDK — grant admin custom claim via CLI
├── tests/
│   ├── unit/                         # Vitest unit tests
│   ├── integration/                  # Vitest integration tests (Firestore emulator)
│   └── e2e/                          # Playwright E2E (Chromium only)
├── project-docs/
│   ├── ARCHITECTURE.md               # (symlink / copy of this doc)
│   ├── INFRASTRUCTURE.md
│   └── DECISIONS.md
├── .env.example                      # Env template (committed)
├── .env                              # Secrets (never committed)
├── .env.local                        # Emulator config (committed, no secrets)
├── package.json                      # Single package, all scripts
├── tsconfig.json                     # Base tsconfig (strict, shared)
├── tsconfig.app.json                 # Extends base — lib: DOM, Vite paths
├── tsconfig.pipeline.json            # Extends base — lib: Node, no DOM
├── tsconfig.functions.json           # Extends base — Firebase Functions target
├── vite.config.ts                    # Vite SPA config (src/app/ only)
├── vitest.config.ts                  # Unit/integration test config
├── playwright.config.ts              # E2E config (Chromium, port 4000)
├── firebase.json                     # Firebase Hosting + Functions config
├── firestore.rules                   # Firestore security rules
├── firestore.indexes.json            # Composite index definitions
└── tailwind.config.ts                # Tailwind tokens (Direction 2 theme)
```

### TypeScript Configuration Strategy

Three `tsconfig` files extend a shared base — preventing DOM/Node cross-contamination while sharing types:

```
tsconfig.json              # base: strict=true, no lib set, paths aliases (@/ → src/)
├── tsconfig.app.json      # lib: ["DOM","ES2022"], include: src/app, src/types, src/core
├── tsconfig.pipeline.json # lib: ["ES2022"], types: ["node"], include: src/pipeline, src/core, src/types, src/adapters, src/handlers
└── tsconfig.functions.json # Firebase Functions target, include: functions/src
```

### Frontend Stack — React SPA (`src/app/`)

| Concern | Choice | Version | Rationale |
|---------|--------|---------|-----------|
| Framework | **React** | 18 | Confirmed |
| Language | **TypeScript strict** | 5.4+ | No `any` |
| Build tool | **Vite** | 5 | Fast HMR, ESM-native, SPA-optimal |
| Styling | **Tailwind CSS** | 3 | Utility-first, Direction 2 theme tokens |
| Component library | **shadcn/ui** | latest | Copied into codebase — full ownership |
| Accessible primitives | **Radix UI** | via shadcn/ui | Keyboard nav, ARIA, focus management |
| Icons | **Lucide React** | latest | Clean, consistent, technical aesthetic |
| Routing | **React Router** | v6 | `useSearchParams` for URL facet state |
| Server state | **TanStack Query** | v5 | Firestore reads — caching, invalidation |
| Client state | **Zustand** | v4 | UI state only (modals, panel open/closed) — NOT filter values |
| Forms | **React Hook Form + Zod** | latest | Admin score assignment, pipeline triggers |
| Font (default) | **Space Grotesk + JetBrains Mono** | — | Direction 2 per UX spec |
| Post-build CSS | **Classpresso** | latest | Starter kit requirement — `postbuild` hook |

### Backend / BaaS Stack

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Database | **Firestore** | Document store, generous free tier, real-time capable |
| Auth | **Firebase Auth + Google Sign-In** | Custom claims for admin role |
| Hosting | **Firebase Hosting** | SPA CDN, built-in `/**` → `index.html` rewrite |
| Functions | **Firebase Functions (Node.js 20)** | 2–3 functions: admin claim check, post-scan trigger |
| DB wrapper | **`src/core/db/firestore.ts`** | **Absolute rule**: all Firestore access through this wrapper |

### Scan Pipeline Stack — Node.js (`src/pipeline/`)

| Concern | Choice | Rationale |
|---------|--------|-----------|
| Runtime | **Node.js 20 + TypeScript strict** | Runs via `tsx` in dev, compiled for production |
| Git operations | **simple-git** | Programmatic `git clone`, `git log`, `git diff` — well-maintained, typed |
| GitHub API | **Octokit (`@octokit/rest`)** | Official client, typed, handles auth + rate-limit headers |
| Job queue | **Firestore-backed in-process queue** | Jobs stored in `scan_jobs` collection; worker polls and processes. No Redis/BullMQ at this scale. |
| File analysis | **Node.js `fs` + custom parsers** | Package.json parsing, config file detection — no heavy dep needed |
| CLI framework | **Commander.js** | Clean typed CLI arg parsing: `scan discover`, `scan rescan`, `scan status` |

### Tooling (Full Project)

| Concern | Choice | Notes |
|---------|--------|-------|
| Package manager | **pnpm** | Required by starter kit |
| Unit/integration | **Vitest** | Required by starter kit |
| E2E | **Playwright (Chromium only)** | Required; Chrome-only SPA aligns perfectly |
| Type checking | **`tsc --noEmit`** | Precommit gate |
| CI/CD | **GitHub Actions** | See Section 9 |
| Dev port | **3000** (SPA) | Starter kit fixed port |
| Test port | **4000** (SPA) | Starter kit fixed port |

### Script Reference

```json
{
  "dev": "vite --port 3000",
  "dev:pipeline": "tsx watch src/pipeline/index.ts",
  "build": "tsc --noEmit && vite build",
  "postbuild": "pnpm build:optimize",
  "build:optimize": "classpresso optimize",
  "build:functions": "tsc -p tsconfig.functions.json",
  "typecheck": "tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.pipeline.json",
  "test": "pnpm test:unit && pnpm test:e2e",
  "test:unit": "vitest run",
  "test:unit:watch": "vitest",
  "test:coverage": "vitest run --coverage",
  "test:e2e": "pnpm test:kill-ports && playwright test",
  "test:e2e:chromium": "pnpm test:kill-ports && playwright test --project=chromium",
  "test:kill-ports": "lsof -ti:4000 | xargs kill -9 2>/dev/null || true",
  "scan": "tsx src/pipeline/index.ts",
  "db:query": "tsx scripts/db-query.ts",
  "db:query:list": "tsx scripts/db-query.ts --list",
  "admin:ops": "tsx scripts/admin-ops.ts",
  "deploy": "firebase deploy --only hosting",
  "deploy:functions": "firebase deploy --only functions",
  "clean": "rm -rf dist coverage test-results playwright-report",
  "precommit": "tsc --noEmit -p tsconfig.app.json && tsc --noEmit -p tsconfig.pipeline.json"
}
```

---

## Section 3 — Data Models

### Firestore Query Constraints — Honest Assessment

Firestore imposes two hard limits that shape every schema decision:

1. **One inequality filter per query** — `<`, `>`, `<=`, `>=`, `!=` can only apply to one field per query. `aiMaturityScore >= 2` consumes this slot.
2. **No native AND across array fields** — `array-contains` works for single-value tag filtering; `array-contains-any` handles multi-value OR (max 10 values). AND across multiple distinct tags requires post-query client-side filtering (see Section 5).

The strategy: store skills as a **single flat `skillTags` array** for Firestore queries, plus separate display arrays for the UI. This is the most query-efficient structure Firestore supports for faceted search.

---

### Collection: `candidates`

Primary read target for all search queries and profile views.

```typescript
// src/types/candidate.ts

interface Candidate {
  // Identity
  id: string;                          // Firestore doc ID = GitHub username
  githubUsername: string;
  githubProfileUrl: string;
  avatarUrl: string | null;

  // Scores — always independent, NEVER combined
  skillScore: number;                  // 0–100, deterministic from Layer 1 + Layer 2
  aiMaturityScore: number | null;      // 0–5, null = NOT YET EVALUATED (never use 0 as sentinel)
  aiMaturityScoredAt: Timestamp | null;
  aiMaturityScoredBy: string | null;   // admin UID who assigned it

  // Skill signals — FLAT ARRAY for Firestore array-contains queries
  skillTags: string[];                 // ["python","fastapi","postgresql","docker"]
                                       // merged normalized taxonomy IDs — the query field

  // Separate display arrays — for UI rendering (NOT used in Firestore queries)
  detectedLanguages: string[];         // ["python","typescript"]
  detectedFrameworks: string[];        // ["fastapi","sqlalchemy"]
  detectedTools: string[];             // ["docker","postgresql"]
  aiToolingSignals: string[];          // ["claude-md","cursor-rules","copilot"]
  aiAgentPatterns: string[];           // ["multi-agent","agent-hooks","rules-config"]

  // Repo summary
  repoCount: number;
  primaryRepoIds: string[];            // doc IDs in repositories collection (top matches)
  commitSpanMonths: number;            // months between first and most recent commit

  // Freshness
  lastScanned: Timestamp;
  isStale: boolean;                    // DENORMALIZED: true when lastScanned > 90 days
                                       // set by pipeline on write — never computed at query time

  // Pipeline metadata
  scanDepth: 'layer1' | 'layer2';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Required composite indexes (`firestore.indexes.json`):**

| Query pattern | Fields |
|---------------|--------|
| Tag filter + sort by skillScore | `skillTags ASC`, `skillScore DESC` |
| Tag filter + sort by aiMaturityScore | `skillTags ASC`, `aiMaturityScore DESC` |
| Tag filter + sort by lastScanned | `skillTags ASC`, `lastScanned DESC` |
| AI maturity min filter + sort by skillScore | `aiMaturityScore ASC`, `skillScore DESC` |
| Stale candidates admin view | `isStale ASC`, `lastScanned ASC` |

---

### Collection: `repositories`

One document per analysed repository. Linked from `candidates.primaryRepoIds`.

```typescript
// src/types/repository.ts

interface Repository {
  id: string;                          // Firestore doc ID = "{owner}/{repo}"
  githubUrl: string;
  owner: string;
  name: string;
  fullName: string;                    // "owner/repo"

  // Surface signals (GitHub API — no clone required)
  primaryLanguage: string | null;
  languages: Record<string, number>;   // { "Python": 12340, "TypeScript": 4200 }
  starCount: number;
  forkCount: number;
  lastPushedAt: Timestamp;
  topics: string[];

  // Deep signals (local clone — Layer 1)
  detectedFrameworks: string[];
  detectedTools: string[];
  detectedDependencies: string[];      // raw package names before taxonomy mapping

  // AI tooling signals (local clone — Layer 2)
  aiConfigFiles: AiConfigFileSignal[];
  coAuthoredByAI: boolean;
  aiAttributionPatterns: string[];

  // Commit signals (local clone — Layer 2)
  commitCount: number;
  firstCommitAt: Timestamp | null;
  lastCommitAt: Timestamp | null;
  commitSpanMonths: number;
  isOwnerRepo: boolean;                // owner === dominant contributor

  // Test signals
  hasTestDirectory: boolean;
  estimatedTestCoverage: 'none' | 'low' | 'medium' | 'high';

  // Score contribution
  skillScoreContribution: number;      // this repo's contribution to candidate skillScore

  // Pipeline metadata
  scanStatus: 'surface' | 'layer1' | 'layer2';
  lastScanned: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface AiConfigFileSignal {
  fileName: string;                    // "CLAUDE.md", ".cursor/rules", "ai-context.md"
  firstDetectedAt: Timestamp;
  modificationCount: number;           // commits that touched this file
  lastModifiedAt: Timestamp;
  diffComplexity: 'minimal' | 'moderate' | 'extensive';
  isEvolved: boolean;                  // modificationCount > 3
  originSignal: 'likely-original' | 'likely-copied' | 'unknown';
}
```

**Required composite indexes:**

| Query pattern | Fields |
|---------------|--------|
| Repos by owner + sort lastScanned | `owner ASC`, `lastScanned DESC` |
| Repos by scan status | `scanStatus ASC`, `lastPushedAt DESC` |

---

### Collection: `scan_jobs`

The job queue. Written and read by the local pipeline worker; also read by the Admin UI for monitoring.

```typescript
// src/types/scan-job.ts

type ScanJobStatus = 'pending' | 'running' | 'completed' | 'failed';
type ScanJobType   = 'discover' | 'scan-repo' | 'rescan-candidate' | 'rescan-repo';

interface ScanJob {
  id: string;                          // Firestore auto-ID
  type: ScanJobType;
  status: ScanJobStatus;
  payload: DiscoverPayload | ScanRepoPayload | RescanPayload;

  // Execution tracking
  attempts: number;
  maxAttempts: number;                 // default: 3
  lastAttemptAt: Timestamp | null;
  completedAt: Timestamp | null;
  failedAt: Timestamp | null;
  errorMessage: string | null;

  // Rate limiting
  rateLimitedUntil: Timestamp | null;  // set when GitHub returns 429/403 with retry-after

  // Queue ordering
  priority: number;                    // 0 = normal, 1 = high (admin-triggered rescans)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface DiscoverPayload {
  query: string;
  source: 'github';                    // extensible for future sources
  limit: number;
}

interface ScanRepoPayload {
  repoFullName: string;
  targetDepth: 'layer1' | 'layer2';
}

interface RescanPayload {
  targetType: 'candidate' | 'repo';
  targetId: string;
}
```

**Required composite indexes:**

| Query pattern | Fields |
|---------------|--------|
| Admin queue: status + time | `status ASC`, `createdAt DESC` |
| Worker polling: pending + priority | `status ASC`, `priority DESC`, `createdAt ASC` |
| Failed jobs view | `status ASC`, `failedAt DESC` |

---

### Collection: `admin_flags`

Two subtypes in one collection: underserved search queries and repos flagged for manual AI maturity evaluation.

```typescript
// src/types/admin.ts

type AdminFlagType   = 'underserved-query' | 'repo-of-interest';
type AdminFlagStatus = 'active' | 'actioned' | 'dismissed';

interface AdminFlag {
  id: string;                          // Firestore auto-ID
  type: AdminFlagType;
  status: AdminFlagStatus;

  // Populated for 'underserved-query'
  queryParams?: SearchQueryParams;
  resultCount?: number;                // 0–9

  // Populated for 'repo-of-interest'
  repoId?: string;                     // references repositories/{id}
  repoFullName?: string;
  detectedSignals?: string[];
  autoSuggestedAiLevel?: number | null;

  // Resolution
  actionedAt: Timestamp | null;
  actionedBy: string | null;           // admin UID

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

interface SearchQueryParams {
  languages: string[];
  frameworks: string[];
  tools: string[];
  aiAgentPatterns: string[];
  aiMaturityMin: number | null;
  sortBy: 'skillScore' | 'aiMaturityScore' | 'lastScanned';
}
```

**Required composite indexes:**

| Query pattern | Fields |
|---------------|--------|
| Active flags by type | `type ASC`, `status ASC`, `createdAt DESC` |
| Underserved queries sorted by scarcity | `type ASC`, `status ASC`, `resultCount ASC` |

---

### Collection: `taxonomy`

Living taxonomy — curated seed items ship with the product; new entries auto-added from pipeline scan signals.

```typescript
// src/types/taxonomy.ts

type TaxonomyCategory =
  | 'language'
  | 'framework'
  | 'tool'
  | 'ai-agent-pattern'
  | 'ai-maturity-level';

interface TaxonomyItem {
  id: string;                          // normalized: "fastapi", "python", "cursor-rules"
  category: TaxonomyCategory;
  displayName: string;                 // "FastAPI", "Python", "Cursor Rules"
  aliases: string[];                   // for detection matching during scans

  // Counts — DENORMALIZED, updated by post-scan Firebase Function trigger
  candidateCount: number;

  // Lifecycle
  isSeeded: boolean;                   // true = shipped with product
  isSearchable: boolean;               // false = detected but not yet promoted to search panel
  firstDetectedAt: Timestamp;
  addedToTaxonomyAt: Timestamp;
  sortOrder: number;                   // display order within category panel

  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

**Required composite indexes:**

| Query pattern | Fields |
|---------------|--------|
| Search panel items by category | `category ASC`, `isSearchable ASC`, `sortOrder ASC` |
| Auto-expansion candidates | `isSearchable ASC`, `candidateCount DESC` |

---

### Critical Distinction: `aiMaturityScore: null` vs `aiMaturityScore: 0`

| Value | Meaning | UI Rendering |
|-------|---------|-------------|
| `null` | Not yet evaluated — admin has not scored this candidate | Dashed pip bar: `░░░░░` + label "Not yet evaluated" |
| `0` | Evaluated — assessed as Level 0 (no AI signals detected) | Empty pip bar: `○○○○○` + label "Level 0 — No AI signals" |

**This distinction is enforced everywhere:** TypeScript type is `number | null`, never `number` with a sentinel. The Firestore wrapper, all handlers, and all UI components treat these as categorically different states.

---

## Section 4 — Scoring Architecture

### Overview

Two scores exist and are **never combined or conflated**:

- **Skill Score (0–100)** — deterministic, computed by the pipeline from concrete evidence in the codebase
- **AI Maturity Score (0–5)** — assigned manually by an admin via the Admin UI; `null` until assigned

---

### 4.1 — Skill Score Algorithm

The Skill Score is computed by `src/pipeline/scoring/` at the end of every scan. It is deterministic — the same inputs always produce the same score.

#### Signal Sources

| Layer | Signal Type | Weight Bucket |
|-------|-------------|---------------|
| Layer 1 — surface | Primary language detected | base (required) |
| Layer 1 — surface | Number of distinct languages | breadth modifier |
| Layer 1 — surface | Frameworks detected (normalised taxonomy match) | +per match |
| Layer 1 — surface | Tools detected (Docker, DB, CI, etc.) | +per match |
| Layer 2 — deep | Commit span in months (ownership proxy) | depth modifier |
| Layer 2 — deep | Is owner of repo (dominant contributor) | ownership bonus |
| Layer 2 — deep | Commit count (above threshold → diminishing returns) | volume modifier |
| Layer 2 — deep | Test directory detected | quality signal |
| Layer 2 — deep | Estimated test coverage level (`none/low/medium/high`) | quality signal |
| Layer 2 — deep | AI tooling signal count | ai-engagement bonus |

#### Scoring Formula

```typescript
// src/pipeline/scoring/skill-score.ts

interface ScoringInput {
  repositories: Repository[];       // all repos analysed for this candidate
  primaryLanguage: string | null;
  detectedFrameworks: string[];
  detectedTools: string[];
  aiToolingSignals: string[];
  commitSpanMonths: number;
  isOwnerRepo: boolean;             // true if candidate is dominant contributor
  estimatedTestCoverage: 'none' | 'low' | 'medium' | 'high';
}

function computeSkillScore(input: ScoringInput): number {
  let score = 0;

  // BASE: primary language detected (required for any meaningful score)
  if (input.primaryLanguage !== null) score += 20;

  // BREADTH: frameworks (cap at 30 pts, 6 pts each, max 5)
  score += Math.min(input.detectedFrameworks.length * 6, 30);

  // TOOLS: infra/tooling depth (cap at 15 pts, 5 pts each, max 3)
  score += Math.min(input.detectedTools.length * 5, 15);

  // DEPTH: commit span (0–12 months → up to 10 pts, pro-rata)
  score += Math.min(Math.floor(input.commitSpanMonths / 1.2), 10);

  // OWNERSHIP: dominant contributor confirmed
  if (input.isOwnerRepo) score += 10;

  // QUALITY: test coverage
  const coveragePoints = { none: 0, low: 3, medium: 8, high: 15 };
  score += coveragePoints[input.estimatedTestCoverage];

  // AI ENGAGEMENT: tooling signals detected (cap at 10 pts, 5 pts each, max 2)
  score += Math.min(input.aiToolingSignals.length * 5, 10);

  // Clamp to 0–100
  return Math.min(Math.max(Math.round(score), 0), 100);
}
```

> **Design rationale:** Weights are tuned so a candidate with one strong language, 2–3 frameworks, real commit history, ownership, and basic test coverage achieves ~70. Hitting 90+ requires breadth + depth + tooling + quality. 100 is achievable but not trivial.

#### `isStale` Denormalization

At write time, the pipeline sets `isStale` based on `lastScanned`:

```typescript
// src/pipeline/scoring/staleness.ts
const STALE_THRESHOLD_DAYS = 90;

function computeIsStale(lastScanned: Date): boolean {
  const ageMs = Date.now() - lastScanned.getTime();
  return ageMs > STALE_THRESHOLD_DAYS * 24 * 60 * 60 * 1000;
}
```

`isStale` is **never computed at query time** — it is set once on write. The Admin UI uses it directly from Firestore for the "Stale candidates" view.

---

### 4.2 — AI Maturity Score Flow

The AI Maturity Score is manual-only in MVP. No LLM API is called. The flow is:

```
Admin opens candidate profile
        ↓
Admin selects level (0–5) via AIMaturitySelector component
        ↓
Form submits → src/handlers/candidates.ts → updateAiMaturityScore()
        ↓
Firestore write:
  aiMaturityScore: number (0–5)
  aiMaturityScoredAt: serverTimestamp()
  aiMaturityScoredBy: currentUser.uid
  updatedAt: serverTimestamp()
        ↓
TanStack Query cache invalidated: ['candidate', candidateId]
        ↓
All mounted components showing this candidate re-render with new score
```

#### AI Maturity Score Levels (Reference)

| Level | Label | Meaning |
|-------|-------|---------|
| `null` | Not evaluated | No admin has scored this candidate yet |
| `0` | No AI signals | Evaluated — no detectable AI tooling usage |
| `1` | Aware | Has AI config files but no modification history |
| `2` | Practitioner | Modified AI config files; co-authored commits present |
| `3` | Active user | Multiple evolved config files; consistent AI engagement patterns |
| `4` | Advanced | Evidence of multi-agent patterns; custom workflows |
| `5` | Expert | Deep, systematic AI integration; original AI workflow construction |

#### Handler Contract

```typescript
// src/handlers/candidates.ts

async function updateAiMaturityScore(
  candidateId: string,
  score: number,          // validated 0–5 by Zod before calling this
  adminUid: string
): Promise<void> {
  // All Firestore access through the centralized wrapper — never direct
  await db.update('candidates', candidateId, {
    aiMaturityScore: score,
    aiMaturityScoredAt: serverTimestamp(),
    aiMaturityScoredBy: adminUid,
    updatedAt: serverTimestamp(),
  });
}
```

> **`aiMaturityScore: null` invariant:** This function is only called when a score is being assigned (0–5). The `null` state is established at candidate creation and is never set by this function. Resetting to `null` ("unscoring") is an explicit separate operation if ever needed — never implicit.

---

### 4.3 — Scoring Pipeline Triggers

| Event | Trigger | Action |
|-------|---------|--------|
| Scan job completes (`scan-repo`) | Pipeline worker — in-process | Compute Skill Score, write to `candidates`, set `isStale: false`, update `updatedAt` |
| Rescan completes (`rescan-candidate`) | Pipeline worker — in-process | Recompute Skill Score only; AI Maturity Score is **never overwritten by pipeline** |
| Admin assigns AI Maturity Score | Admin UI form submit | Write `aiMaturityScore`, `aiMaturityScoredAt`, `aiMaturityScoredBy` to `candidates` |
| Post-scan Firebase Function trigger | Firestore `onDocumentUpdated` on `candidates` | Update `taxonomy.candidateCount` for all `skillTags` in updated doc; flag underserved queries |

#### Critical Protection: Pipeline Must Never Overwrite AI Maturity Score

```typescript
// src/pipeline/worker.ts — enforced on every write

const candidateUpdate: Partial<Candidate> = {
  skillScore: computedScore,
  skillTags: mergedTags,
  // ... all pipeline-owned fields
  // aiMaturityScore is EXPLICITLY ABSENT from pipeline writes
  // aiMaturityScoredAt is EXPLICITLY ABSENT from pipeline writes
  // aiMaturityScoredBy is EXPLICITLY ABSENT from pipeline writes
};

await db.update('candidates', candidateId, candidateUpdate);
```

This is enforced by TypeScript: the pipeline's scoring output type does not include `aiMaturityScore` — it cannot accidentally include it.

---

## Section 5 — Search Architecture

### 5.1 — URL Parameter Parsing

The search state lives entirely in the URL. This is an MVP requirement — shareable, bookmarkable search queries.

```
/search?lang=python&framework=fastapi&tool=docker&ai_maturity_min=2&sort=skillScore
```

```typescript
// src/app/hooks/useSearchQuery.ts

// Parses URL params → typed SearchQueryParams
// Writes SearchQueryParams back → URL params (bidirectional)

function useSearchQuery(): {
  params: SearchQueryParams;
  setParams: (next: SearchQueryParams) => void;
} {
  const [searchParams, setSearchParams] = useSearchParams();

  const params: SearchQueryParams = {
    languages:       searchParams.getAll('lang'),
    frameworks:      searchParams.getAll('framework'),
    tools:           searchParams.getAll('tool'),
    aiAgentPatterns: searchParams.getAll('ai_pattern'),
    aiMaturityMin:   searchParams.has('ai_maturity_min')
                       ? Number(searchParams.get('ai_maturity_min'))
                       : null,
    sortBy: (searchParams.get('sort') ?? 'skillScore') as SearchQueryParams['sortBy'],
  };

  const setParams = (next: SearchQueryParams) => {
    const p = new URLSearchParams();
    next.languages.forEach(v => p.append('lang', v));
    next.frameworks.forEach(v => p.append('framework', v));
    next.tools.forEach(v => p.append('tool', v));
    next.aiAgentPatterns.forEach(v => p.append('ai_pattern', v));
    if (next.aiMaturityMin !== null) p.set('ai_maturity_min', String(next.aiMaturityMin));
    if (next.sortBy !== 'skillScore') p.set('sort', next.sortBy);
    setSearchParams(p, { replace: true });
  };

  return { params, setParams };
}
```

**State ownership:** `useSearchQuery` is the single source of truth for filter values. Zustand holds UI state only (facet panel open/closed, hover state) — never the filter values themselves.

---

### 5.2 — Firestore Query Construction

```typescript
// src/handlers/search.ts

function buildSearchQuery(
  params: SearchQueryParams,
  taxonomy: TaxonomyItem[]   // needed to find rarest tag
): FirebaseFirestore.Query {
  const allSelectedTags = [
    ...params.languages,
    ...params.frameworks,
    ...params.tools,
    ...params.aiAgentPatterns,
  ];

  let query: FirebaseFirestore.Query = db.collection('candidates');

  // STEP 1: Pick the rarest tag as the primary Firestore filter
  if (allSelectedTags.length > 0) {
    const rarestTag = findRarestTag(allSelectedTags, taxonomy);
    query = query.where('skillTags', 'array-contains', rarestTag);
  }

  // STEP 2: Sort order — drives composite index selection
  // NOTE: aiMaturityMin filter is handled via parallel queries (see 5.4)
  switch (params.sortBy) {
    case 'skillScore':      query = query.orderBy('skillScore', 'desc'); break;
    case 'aiMaturityScore': query = query.orderBy('aiMaturityScore', 'desc'); break;
    case 'lastScanned':     query = query.orderBy('lastScanned', 'desc'); break;
  }

  // STEP 3: Hard cap — max 200 docs before client-side filter
  return query.limit(200);
}

function findRarestTag(tags: string[], taxonomy: TaxonomyItem[]): string {
  return tags.reduce((rarest, tag) => {
    const item = taxonomy.find(t => t.id === tag);
    const rarestItem = taxonomy.find(t => t.id === rarest);
    const count = item?.candidateCount ?? 0;
    const rarestCount = rarestItem?.candidateCount ?? 0;
    return count < rarestCount ? tag : rarest;
  }, tags[0]);
}
```

---

### 5.3 — The AND-Across-Skills Problem

**The constraint:** Firestore does not support AND across multiple `array-contains` filters on the same field in one query. Only one `array-contains` filter is allowed per query.

**The solution — rarest-tag-first + client-side filter:**

```
User selects: python + fastapi + docker

Firestore query: skillTags array-contains "fastapi"   ← rarest of the three
                 limit: 200

Result set (up to 200 docs)
        ↓
Client-side filter:
  doc.skillTags.includes('python') &&
  doc.skillTags.includes('docker')
        ↓
Final results shown
```

```typescript
// src/handlers/search.ts

function applyClientSideTagFilter(
  docs: Candidate[],
  allSelectedTags: string[],
  primaryTag: string   // already filtered in Firestore — skip it
): Candidate[] {
  const remainingTags = allSelectedTags.filter(tag => tag !== primaryTag);
  return docs.filter(candidate =>
    remainingTags.every(tag => candidate.skillTags.includes(tag))
  );
}
```

**Why the 200-doc cap is safe:** The rarest tag is chosen because it has the fewest candidates. A rarest-tag result set of 200 is a degenerate case — in practice, rare skill queries return far fewer. The cap prevents unbounded client-side work.

**MVP pool size note:** This approach is correct for MVP candidate pool sizes (dozens to low hundreds). As pool size grows, the 200-doc cap becomes a real constraint.

> **Growth path:** When the candidate pool exceeds several hundred and complex multi-skill AND queries become common, migrate search to **Algolia** or **Typesense** for true server-side faceted AND queries, pagination, and relevance ranking. The `src/handlers/search.ts` abstraction layer makes this a handler-level swap — the SPA components and URL state do not change.

---

### 5.4 — AI Maturity Minimum Filter: Null Inclusion Strategy

**The requirement:** When `aiMaturityMin` is active, unscored candidates (`aiMaturityScore: null`) should **still appear** in results. The filter should only exclude candidates with a *scored* level below the minimum.

**The problem with a single Firestore query:** Firestore inequality filters (`aiMaturityScore >= N`) exclude documents where the field is `null` or missing. A single query cannot express "scored AND >= N, OR unscored".

**The solution — two parallel queries, merged client-side:**

```typescript
// src/handlers/search.ts

async function searchCandidates(
  params: SearchQueryParams,
  taxonomy: TaxonomyItem[]
): Promise<Candidate[]> {
  if (params.aiMaturityMin === null) {
    // Simple case: single query, no AI maturity filter
    const baseQuery = buildSearchQuery(params, taxonomy);
    const docs = await db.getDocs(baseQuery);
    return applyClientSideTagFilter(docs, getAllTags(params), findRarestTag(getAllTags(params), taxonomy));
  }

  // Parallel queries for null-inclusion
  const [scoredDocs, unscoredDocs] = await Promise.all([
    // Query 1: scored candidates at or above minimum
    db.getDocs(
      buildSearchQuery(params, taxonomy)
        .where('aiMaturityScore', '>=', params.aiMaturityMin)
    ),
    // Query 2: unscored candidates (always included when filter is active)
    db.getDocs(
      buildSearchQuery(params, taxonomy)
        .where('aiMaturityScore', '==', null)
    ),
  ]);

  // Merge and apply remaining tag filters
  const allDocs = [...scoredDocs, ...unscoredDocs];
  const allTags = getAllTags(params);
  const primaryTag = findRarestTag(allTags, taxonomy);
  const filtered = applyClientSideTagFilter(allDocs, allTags, primaryTag);

  // Sort the merged set by the selected sort field
  return sortCandidates(filtered, params.sortBy);
}

function sortCandidates(docs: Candidate[], sortBy: SearchQueryParams['sortBy']): Candidate[] {
  return [...docs].sort((a, b) => {
    switch (sortBy) {
      case 'skillScore':
        return b.skillScore - a.skillScore;
      case 'aiMaturityScore':
        // Unscored (null) sort to the end
        if (a.aiMaturityScore === null && b.aiMaturityScore === null) return 0;
        if (a.aiMaturityScore === null) return 1;
        if (b.aiMaturityScore === null) return -1;
        return b.aiMaturityScore - a.aiMaturityScore;
      case 'lastScanned':
        return b.lastScanned.toMillis() - a.lastScanned.toMillis();
    }
  });
}
```

> **Why not a sentinel value?** Using a sentinel (e.g. `aiMaturityScore: -1` to mean "unscored") would collapse the critical `null` vs `0` distinction that is enforced throughout the system. The two-query merge is explicit, readable, and preserves the invariant.

---

### 5.5 — Thin Results Detection

After query + client-side filter, if `results.length < 10`:

```typescript
// src/handlers/search.ts

const THIN_RESULTS_THRESHOLD = 10;
const REFLAG_COOLDOWN_HOURS = 24;

async function maybeFlagUnderservedQuery(
  params: SearchQueryParams,
  resultCount: number
): Promise<void> {
  if (resultCount >= THIN_RESULTS_THRESHOLD) return;

  // Debounce: don't re-flag the same params within 24 hours
  const recentFlag = await db.queryOne('admin_flags', [
    ['type', '==', 'underserved-query'],
    ['queryParams', '==', params],
    ['createdAt', '>', Timestamp.fromDate(
      new Date(Date.now() - REFLAG_COOLDOWN_HOURS * 3600 * 1000)
    )],
  ]);

  if (recentFlag) return;

  await db.create('admin_flags', {
    type: 'underserved-query',
    status: 'active',
    queryParams: params,
    resultCount,
    actionedAt: null,
    actionedBy: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
}
```

The Admin UI surfaces these flags in the **Repos of Interest** tab, ranked by `resultCount ASC` (scarcest first).

---

### 5.6 — TanStack Query Integration

```typescript
// src/app/hooks/useCandidates.ts

function useCandidates(params: SearchQueryParams) {
  return useQuery({
    queryKey: ['candidates', serializeParams(params)],   // cache key = serialized params
    queryFn: () => searchCandidates(params),
    staleTime: 5 * 60 * 1000,    // 5 minutes
    enabled: hasAnyFilter(params),
  });
}

// Prefetch on hover of search button
function usePrefetchOnHover(params: SearchQueryParams) {
  const queryClient = useQueryClient();
  return () => queryClient.prefetchQuery({
    queryKey: ['candidates', serializeParams(params)],
    queryFn: () => searchCandidates(params),
    staleTime: 5 * 60 * 1000,
  });
}
```

**Cache invalidation:** TanStack Query's 5-minute stale time is correct for search results. Admin mutations (AI Maturity Score assignment) invalidate `['candidate', candidateId]` only — not the search cache — so results don't flash-reload on every admin action.

---

## Section 6 — Scan Pipeline Architecture

### 6.1 — CLI Commands

The pipeline is a Commander.js CLI, run locally via `tsx`:

```bash
# Discover repos matching a query and enqueue scan jobs
pnpm tsx src/pipeline/index.ts discover --query "python fastapi" --limit 50

# Trigger a rescan for a specific candidate
pnpm tsx src/pipeline/index.ts rescan --candidate <githubUsername>

# Show current queue status
pnpm tsx src/pipeline/index.ts status
```

---

### 6.2 — Layer 1 Scan (Surface — GitHub API Only)

No `git clone`. Uses GitHub API via Octokit. ~2 API calls per repo.

**Signals extracted:**
- Primary language (GitHub's detected primary)
- Full language breakdown with byte counts
- Star and fork counts
- Repository topics
- Last pushed date
- README content (truncated to 2000 chars)

**Output:** Writes/updates a `repositories` document with `scanStatus: 'layer1'`.

---

### 6.3 — Layer 2 Scan (Deep — Local Clone)

Requires local disk access. Performs full codebase analysis.

```
git clone --depth=50 <repo-url> /tmp/css-scan-<repoId>
        ↓
File tree analysis:
  - Detect CLAUDE.md, .cursor/rules, .github/copilot-instructions.md
  - Parse package.json / requirements.txt / pyproject.toml for dependencies
  - Detect test directories (tests/, __tests__/, spec/)
  - Estimate test coverage level from test file density
        ↓
Commit history analysis:
  git log --format="%H %ae %ad" -n 200
  - Determine dominant contributor (ownership)
  - Compute commit span in months
  - Detect "Co-authored-by: github-actions[bot]" or AI attribution patterns
        ↓
AI config file signal analysis (per detected config file):
  git log --follow --format="%H" -- <filename>
  - Count modifications (commits touching this file)
  - Compute diff complexity (minimal/moderate/extensive)
  - Set isEvolved = modificationCount > 3
  - Set originSignal based on first commit content heuristics
        ↓
rm -rf /tmp/css-scan-<repoId>   ← ALWAYS cleanup, even on error
        ↓
Write to Firestore:
  - Update repositories/{id} with scanStatus: 'layer2' + all deep signals
  - Update candidates/{username} with merged skillTags + new Skill Score
```

---

### 6.4 — Job Queue Design

The job queue is backed by the `scan_jobs` Firestore collection. The worker is a simple polling loop — no external queue infrastructure needed at MVP scale.

```
Worker loop (every 10 seconds):
  1. Query scan_jobs WHERE status='pending'
     ORDER BY priority DESC, createdAt ASC
     LIMIT 1
  2. If no job: sleep 10s, repeat
  3. Atomically set job.status = 'running', job.lastAttemptAt = now()
  4. Execute job (discover / scan-repo / rescan)
  5. On success: set status='completed', completedAt=now()
  6. On error: increment attempts
     - If attempts < maxAttempts: set status='pending', schedule retry
       (exponential backoff: wait 2^attempts minutes before next attempt)
     - If attempts >= maxAttempts: set status='failed', errorMessage=err.message
```

**Single-threaded in MVP:** One job at a time. No parallel workers. Acceptable for Gabe's solo usage pattern.

**Job status transitions:**

```
pending → running → completed
                 → failed      (attempts >= maxAttempts)
                 → pending     (retry: attempts < maxAttempts)
failed  → pending              (admin-triggered retry via UI)
```

---

### 6.5 — GitHub API Rate Limiting

```typescript
// src/adapters/github.ts

// After every Octokit request:
function checkRateLimit(response: OctokitResponse): void {
  const remaining = Number(response.headers['x-ratelimit-remaining']);
  const resetAt   = Number(response.headers['x-ratelimit-reset']); // Unix timestamp

  if (remaining < 10) {
    const resetDate = new Date(resetAt * 1000);
    // Set rateLimitedUntil on current job — worker will pause until this time
    throw new RateLimitError(`Rate limit low (${remaining} remaining). Reset at ${resetDate.toISOString()}`);
  }
}
```

- **Always use authenticated Octokit**: `GITHUB_TOKEN` in `.env`. Authenticated = 5,000 req/hour vs 60/hour unauthenticated.
- **Worker pause on rate limit**: When `RateLimitError` is thrown, the worker sets `rateLimitedUntil` on the current job and sleeps until the reset time.
- **Layer 1 cost**: ~2 API calls per repo (repo metadata + languages endpoint).
- **Layer 2 cost**: 0 additional API calls (all work is local clone analysis).

---

### 6.6 — Admin Pipeline Management

The Admin UI provides real-time pipeline visibility via Firestore `onSnapshot`:

```typescript
// src/app/hooks/useScanJobs.ts

function useScanJobs() {
  // Real-time listener — updates as pipeline processes jobs
  return useFirestoreSnapshot('scan_jobs', [
    ['status', 'in', ['pending', 'running', 'failed']],
    orderBy('createdAt', 'desc'),
    limit(50),
  ]);
}
```

**Admin UI capabilities:**
- Live count badges: running / pending / failed
- Failed job rows show `errorMessage`, `attempts`, `failedAt`
- **[Retry ↺]** button: resets `status='pending'`, `attempts=0`, `errorMessage=null`
- **[Dismiss ×]** button: sets `status='dismissed'` (removes from active queue view)
- **Rescan trigger**: Admin writes a new `rescan-candidate` job to `scan_jobs` (priority=1)

> **Growth path:** Migrate pipeline worker to **Cloud Run** (GCP), triggered by Pub/Sub messages written by the Admin UI. The `scan_jobs` Firestore collection remains the canonical job store — Cloud Run simply replaces the local polling worker. No SPA changes required.

---

## Section 7 — Auth & Security

### 7.1 — Firebase Auth Flow

```
SPA loads
    ↓
Firebase Auth SDK: onAuthStateChanged()
    ↓
No session → redirect to /login
    ↓
/login: "Sign in with Google" button
    ↓
Firebase Google Sign-In popup
    ↓
Auth success → ID token issued
    ↓
Decode ID token → check claims.admin
    ↓
claims.admin === true → AdminRoute components unlock
claims.admin missing/false → PrivateRoute only
```

---

### 7.2 — Admin Role Grant

Admin access is granted via CLI only. There is no self-service admin promotion.

```bash
# Grant admin custom claim to a Firebase UID
pnpm tsx scripts/admin-ops.ts grant-admin <uid>

# Revoke admin custom claim
pnpm tsx scripts/admin-ops.ts revoke-admin <uid>

# List current admins
pnpm tsx scripts/admin-ops.ts list-admins
```

`scripts/admin-ops.ts` follows the starter kit's registered-scripts pattern — it is discoverable, documented, and not ad-hoc. It uses the Firebase Admin SDK with a service account.

```typescript
// scripts/admin-ops.ts

import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const serviceAccount = JSON.parse(
  Buffer.from(process.env.FIREBASE_SERVICE_ACCOUNT_JSON!, 'base64').toString()
);

initializeApp({ credential: cert(serviceAccount) });

async function grantAdmin(uid: string): Promise<void> {
  await getAuth().setCustomUserClaims(uid, { admin: true });
  console.log(`Admin claim granted to ${uid}`);
}
```

---

### 7.3 — Route Protection

```typescript
// src/app/components/shared/PrivateRoute.tsx
// Requires: authenticated user
// Redirects to: /login if not authenticated

// src/app/components/shared/AdminRoute.tsx
// Requires: authenticated user + claims.admin === true
// Redirects to: /login if not authenticated or not admin
```

Route structure:
```
/login          → public (LoginPage)
/search         → PrivateRoute → SearchPage
/candidates/:id → PrivateRoute → CandidateProfilePage
/admin/*        → AdminRoute  → AdminPage (all admin subroutes)
```

---

### 7.4 — Firestore Security Rules

```javascript
// firestore.rules

rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // Helper: authenticated user
    function isAuthenticated() {
      return request.auth != null;
    }

    // Helper: admin custom claim
    function isAdmin() {
      return request.auth != null && request.auth.token.admin == true;
    }

    // candidates: any authenticated user can read; only admin/service-account can write
    match /candidates/{candidateId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // repositories: any authenticated user can read; only admin/service-account can write
    match /repositories/{repoId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }

    // scan_jobs: admin only for both read and write
    match /scan_jobs/{jobId} {
      allow read, write: if isAdmin();
    }

    // admin_flags: admin only for both read and write
    match /admin_flags/{flagId} {
      allow read, write: if isAdmin();
    }

    // taxonomy: any authenticated user can read; only admin/service-account can write
    match /taxonomy/{itemId} {
      allow read: if isAuthenticated();
      allow write: if isAdmin();
    }
  }
}
```

> **Note on pipeline writes:** The scan pipeline uses the Firebase Admin SDK with a service account. Admin SDK writes bypass Firestore security rules entirely — the rules above govern only client-side (SPA) access.

---

### 7.5 — Service Account & Secrets

| Variable | Content | Where |
|----------|---------|-------|
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Base64-encoded service account JSON | `.env` only — NEVER committed |
| `GITHUB_TOKEN` | GitHub Personal Access Token (authenticated Octokit) | `.env` only — NEVER committed |
| `VITE_FIREBASE_API_KEY` | Firebase web API key (safe for client) | `.env` — committed to `.env.example` with placeholder |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID | `.env` — committed to `.env.example` with placeholder |

`.env` is always in `.gitignore`. `.env.example` has all keys with placeholder values and is committed.

---

## Section 8 — Frontend Architecture

### 8.1 — React Component Tree

```
App.tsx
  └── BrowserRouter
        ├── /login          → LoginPage (public, eager)
        ├── /               → redirect to /search
        ├── /search         → PrivateRoute → SearchPage (eager)
        │     ├── FacetPanel
        │     │     ├── LanguageSection
        │     │     ├── FrameworkSection
        │     │     ├── ToolSection
        │     │     ├── AIPatternSection
        │     │     └── AIMaturitySection
        │     ├── ActiveFilterChips
        │     ├── SearchButton (with prefetch-on-hover)
        │     └── ResultsList
        │           ├── CandidateCard[] (SkillScoreBadge + AIMaturityBadge)
        │           ├── ThinResultsState  (results < 10)
        │           └── ZeroResultsState (results = 0)
        ├── /candidates/:id → PrivateRoute → CandidateProfilePage (lazy)
        │     ├── ProfileHeader
        │     │     ├── SkillScoreBadge (profile variant)
        │     │     └── AIMaturityBadge (profile variant)
        │     └── EvidenceSection[]
        │           ├── AISignalsSection
        │           ├── RepositoriesSection
        │           ├── DetectedSkillsSection
        │           └── CommitTimelineSection
        └── /admin/*        → AdminRoute → AdminPage (lazy)
              └── TabBar
                    ├── PipelineTab        (scan controls)
                    ├── QueueTab           (scan_jobs — onSnapshot)
                    ├── ReposOfInterestTab (admin_flags — onSnapshot)
                    └── CandidatesTab      (stale candidates, score assignment)
```

---

### 8.2 — State Management

| State type | Owner | Rationale |
|-----------|-------|-----------|
| Search filter values | **URL (`useSearchParams`)** | Single source of truth — shareable, bookmarkable, browser-nav-compatible |
| UI state (panel open/close, hover, modals) | **Zustand** | Ephemeral, non-serializable UI state |
| All Firestore data | **TanStack Query** | Caching, background refetch, loading/error states |
| Admin score assignment form | **React Hook Form + Zod** | Validated form state (0–5 stepper) |

**Zustand store — UI state only:**
```typescript
// src/app/lib/store.ts

interface UIStore {
  facetPanelOpen: boolean;
  setFacetPanelOpen: (open: boolean) => void;

  activeModal: 'score-assignment' | 'rescan-confirm' | null;
  setActiveModal: (modal: UIStore['activeModal']) => void;
}
```

---

### 8.3 — URL State Sync

```
User clicks facet chip
        ↓
FacetPanel → calls setParams(newParams) from useSearchQuery
        ↓
useSearchQuery → setSearchParams(newURLParams, { replace: true })
        ↓
URL updates: /search?lang=python&framework=fastapi
        ↓
useCandidates re-evaluates: queryKey changes → TanStack Query fires new fetch
        ↓
ResultsList re-renders with new results

Browser back/forward:
        ↓
URL changes → useSearchQuery re-reads params → useCandidates refetches
```

---

### 8.4 — Code Splitting

| Route | Loading strategy | Rationale |
|-------|-----------------|-----------|
| `/search` | **Eager** | Default route — always needed on first load |
| `/login` | **Eager** | Required before any auth |
| `/candidates/:id` | **Lazy** (dynamic import) | Profile viewed after search — not on initial load |
| `/admin/*` | **Lazy** (dynamic import) | Admin-only — unnecessary for regular users' bundles |

```typescript
// src/app/App.tsx

const CandidateProfilePage = lazy(() => import('./pages/CandidateProfilePage'));
const AdminPage = lazy(() => import('./pages/admin/AdminPage'));
```

---

### 8.5 — Firestore Wrapper Rule (Frontend)

All Firestore reads in the SPA go through typed functions in `src/core/db/firestore.ts`. This is the same principle as the starter kit's MongoDB wrapper pattern.

```typescript
// CORRECT — through the wrapper
import { db } from '@/core/db/firestore';
const candidate = await db.getDoc('candidates', candidateId);

// FORBIDDEN — direct Firestore SDK calls in components/hooks/handlers
import { getFirestore, doc, getDoc } from 'firebase/firestore';  // ← never in src/app/
```

This rule is enforced by ESLint (import restriction rule on `firebase/firestore` outside of `src/core/db/`).

---

## Section 9 — Infrastructure & DevOps

### 9.1 — Firebase Hosting Configuration

```json
// firebase.json

{
  "hosting": {
    "public": "dist",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [
      {
        "source": "**",
        "destination": "/index.html"
      }
    ]
  }
}
```

Single rewrite rule: all routes → `index.html`. React Router handles client-side routing.

---

### 9.2 — Firebase Emulators (Local Dev)

```bash
# Start Firestore + Auth emulators
firebase emulators:start --only firestore,auth
```

```bash
# .env.local — emulator config (committed, no secrets)
FIRESTORE_EMULATOR_HOST=localhost:8080
FIREBASE_AUTH_EMULATOR_HOST=localhost:9099
```

The Firebase SDK auto-detects these environment variables and redirects all calls to the local emulators. No production data is touched during local development or integration testing.

**Emulator ports:**
- Firestore emulator: `localhost:8080`
- Auth emulator: `localhost:9099`
- Emulator UI: `localhost:4000`

---

### 9.3 — Local Development Workflow

```bash
# Terminal 1: Start Firebase emulators
firebase emulators:start --only firestore,auth

# Terminal 2: Start Vite dev server (SPA, port 3000)
pnpm dev

# Terminal 3 (when running pipeline): Start pipeline worker
pnpm dev:pipeline
```

The SPA connects to emulators in dev. The pipeline also writes to emulators in dev (via `FIRESTORE_EMULATOR_HOST`).

---

### 9.4 — Environment Configuration

| File | Contents | Committed? |
|------|----------|-----------|
| `.env` | Firebase config keys, service account, GitHub token | **NEVER** — in `.gitignore` |
| `.env.example` | All keys with placeholder values | **Yes** — documents required env vars |
| `.env.local` | Emulator host overrides | **Yes** — no secrets, just ports |

---

### 9.5 — pnpm Scripts Reference

```bash
pnpm dev               # Vite dev server — port 3000 (connects to emulators)
pnpm dev:pipeline      # tsx watch src/pipeline/index.ts (local pipeline worker)
pnpm build             # tsc --noEmit && vite build && classpresso optimize
pnpm typecheck         # tsc --noEmit (both app + pipeline tsconfigs)
pnpm test:unit         # vitest run
pnpm test:unit:watch   # vitest (watch mode)
pnpm test:e2e          # kill ports + playwright test --project=chromium
pnpm deploy            # firebase deploy --only hosting
pnpm deploy:functions  # firebase deploy --only functions (manual only)
pnpm admin:ops         # tsx scripts/admin-ops.ts (grant/revoke admin claims)
pnpm db:query          # tsx scripts/db-query.ts (registered Firestore dev queries)
```

---

### 9.6 — GitHub Actions CI/CD

```yaml
# .github/workflows/ci.yml

# On every push to any branch:
on: [push]
jobs:
  ci:
    steps:
      - typecheck   # tsc --noEmit (app + pipeline)
      - test:unit   # vitest run

# On PR merge to main:
on:
  push:
    branches: [main]
jobs:
  deploy:
    steps:
      - typecheck
      - test:unit
      - build       # vite build + classpresso optimize
      - deploy      # firebase deploy --only hosting
```

**Functions are deployed manually** (`pnpm deploy:functions`) — not auto-deployed. This keeps the CI pipeline fast and prevents accidental function deployments.

---

## Section 10 — Technical Risks & Mitigations

| # | Risk | Likelihood | Impact | Mitigation |
|---|------|-----------|--------|-----------|
| 1 | **Firestore AND-across-fields** | Medium | Medium | Rarest-tag-first strategy + 200-doc client-side filter cap. Acceptable at MVP pool sizes (dozens to low hundreds). **Growth path**: migrate search to Algolia or Typesense for true server-side faceted AND — documented as explicit upgrade path in Section 5. |
| 2 | **GitHub API rate limits** | High (without mitigation) | High | Always use authenticated Octokit (`GITHUB_TOKEN`) for 5,000 req/hour vs 60/hour unauthenticated. Check `X-RateLimit-Remaining` header on every response. Pause worker and set `rateLimitedUntil` when < 10 remaining. Exponential backoff on retry. |
| 3 | **Local clone disk usage** | Low/Medium | Low | Always `rm -rf` clone directory after analysis — including in `finally` blocks (cleanup even on error). Worker checks available disk space before cloning. Configurable `MAX_CLONE_SIZE_MB` in `.env` — skip repos exceeding limit and log warning. |
| 4 | **AI Maturity Score bottleneck** | High | Medium | Gabe is the only scorer in MVP. Mitigations: (1) `autoSuggestedAiLevel` on `admin_flags` docs gives a starting point for each review. (2) Batch review UI in Admin `CandidatesTab` — score multiple candidates without navigating away. (3) Queue sorted by strongest signals first. **Growth path**: automated scoring via LLM API call during Layer 2 scan — documented for Phase 2. |
| 5 | **Firestore composite index proliferation** | Medium | Low | Centralise ALL index definitions in `firestore.indexes.json` — no inline index creation. Document each index's exact query pattern as a comment. Review `firestore.indexes.json` before adding any new query pattern. Firestore caps at 200 composite indexes per database — well within range for this app, but worth tracking. |
