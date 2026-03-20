---
stepsCompleted: [step-01-validate-prerequisites, step-02-design-epics, step-03-create-stories, step-04-final-validation]
inputDocuments:
  - ideas/planning/candidate-skill-scanner/brief.md
  - ideas/planning/candidate-skill-scanner/ux-design.md
  - ideas/planning/candidate-skill-scanner/architecture.md
---

# candidate-skill-scanner — Epic Breakdown

## Overview

This document provides the complete epic and story breakdown for candidate-skill-scanner, decomposing the requirements from the PRD, UX Design, and Architecture documents into implementable stories. The project is a Chrome-only SPA + local Node.js scan pipeline that finds developer candidates by analysing public GitHub repositories — replacing self-reported CVs with verifiable commit-level evidence.

**Starter kit:** `setup/tools/claude-code-mastery-project-starter-kit` — Epic 1 Story 1 scaffolds the project from this base.

---

## Requirements Inventory

### Functional Requirements

FR1: The system discovers GitHub repositories matching a configurable query (language, topic, keyword) via the GitHub Search API
FR2: The system filters discovered repositories by surface-level relevance signals before cloning (activity, star count, language match, recency)
FR3: The system clones qualifying repositories to local storage for deep analysis
FR4: The system deduplicates discovered repositories and candidates against the existing stored pool
FR5: The system derives candidate/user records from repository contributor data — candidates are outputs of repo analysis, not inputs
FR6: The system performs Layer 1 analysis on cloned repos: detect programming languages, identify frameworks and libraries from package files and dependency manifests
FR7: The system performs Layer 2 analysis on cloned repos: analyse code structure, test coverage signals, project complexity, commit patterns, and ownership vs. contribution indicators
FR8: The system detects AI tooling signals in cloned repos: presence of known AI config files (CLAUDE.md, .cursor/rules, etc.), co-authored-by commit trailers, AI attribution patterns in commit messages
FR9: The system tracks evolution of AI config files over time: first-introduced date, number of modifications, diff complexity between first and current version
FR10: The system generates a structured candidate context profile containing commit signals, AI tooling traces, config file evolution data, repo complexity indicators, and detected skills — stored in a scoring-method-agnostic format
FR11: The system maps detected signals to taxonomy categories and flags previously-unseen signals for taxonomy expansion
FR12: Authenticated users can view a candidate profile showing detected skills, repositories analysed, AI tooling signals, config file evolution, Skill Score, AI Maturity Score, and `last_scanned` timestamp
FR13: Admin users can manually assign or update an AI Maturity Score (Level 0–5) on a candidate profile
FR14: Admin users can trigger a rescan of an individual candidate or repository
FR15: The system visually flags candidate profiles where `last_scanned` exceeds 90 days as potentially stale
FR16: Authenticated users can search the candidate pool using structured faceted search with category panels (Languages, Frameworks, Tools, AI Agent Usage Patterns, AI Maturity Level)
FR17: Authenticated users can filter search results by minimum AI Maturity Level
FR18: Authenticated users can sort search results by Skill Score, AI Maturity Score, or `last_scanned` date independently
FR19: The system returns ranked search results with Skill Score and AI Maturity Score displayed as independent visible dimensions per candidate
FR20: The system detects when a search query returns fewer than 10 results and automatically stores and flags that query as underserved
FR21: The system displays a thin-results state when fewer than 10 results are returned, surfacing the underserved query status and a suggested CLI discovery command to the user
FR22: The system ships with a curated seed taxonomy covering Languages, Frameworks, Tools, AI Agent Usage Patterns, and AI Maturity Levels
FR23: The system automatically expands the taxonomy by adding newly detected signals (frameworks, tools, AI patterns) identified during repository scanning
FR24: Authenticated users can browse and select from the full taxonomy in the search interface
FR25: Any user can register and sign in using Google Authentication via Firebase
FR26: The system enforces role-based access: authenticated non-admin users access Search UI only; authenticated admin users access Search UI and Admin UI
FR27: Admin role can only be granted via CLI command acting on Firebase custom claims — not via the web UI
FR28: Unauthenticated users cannot access any part of the application
FR29: Admin users can trigger a discovery run from the Admin UI with configurable parameters (query, source, limit)
FR30: Admin users can view the job queue status (queued, running, completed, failed jobs) in the Admin UI
FR31: Admin users can view and action flagged/underserved queries in the Admin UI, including triggering targeted discovery runs for specific underserved queries
FR32: Admin users can view a candidate pool overview showing total candidate count and coverage distribution by skill/taxonomy category
FR33: Admin users can trigger a rescan of an individual candidate or repository from the Admin UI
FR34: Admin users can view a repos-of-interest queue in the Admin UI showing flagged repositories and candidate profiles with associated labels and signals, for identification of repos to clone locally for manual Claude Code evaluation
FR35: The system processes discovery and scanning jobs asynchronously via a background job queue, without blocking the web UI
FR36: The system enforces rate-limit-aware pacing on GitHub API calls to stay within the authenticated API limit (5,000 req/hr)
FR37: The system stores enriched candidate profiles persistently — scan once, query many times
FR38: The system records a `last_scanned` timestamp on every candidate profile, updated on each rescan
FR39: Operators can trigger a discovery run via CLI with configurable query, source, and limit parameters
FR40: Operators can trigger a rescan of a specific candidate or repository via CLI
FR41: Operators can query scan pipeline and job queue status via CLI
FR42: Operators can grant admin role to a registered user via CLI by setting a Firebase custom claim

### Non-Functional Requirements

NFR1: Search response time — structured faceted search queries return results within 2 seconds for a pool of up to 500 candidates
NFR2: Candidate profile load time — individual profile views render within 1.5 seconds; all data is pre-stored
NFR3: UI responsiveness during pipeline activity — web UI remains fully responsive while background scan jobs are running
NFR4: Job queue throughput — async scan pipeline processes at least 50 candidate profiles per hour under normal conditions
NFR5: Authentication required — no application surface is accessible without a valid Firebase Auth session
NFR6: Admin role enforcement — admin-only routes and actions enforced server-side via Firebase custom claims verification, not client-side route guards alone
NFR7: No self-service role escalation — no code path exists through which a user can elevate their own role via web UI, API, or application mechanism
NFR8: Data scope — only publicly available repository data is ingested; GitHub PAT stored securely (env var / secret manager, never hardcoded)
NFR9: Local storage headroom — supports ephemeral local cloning of up to 50 concurrent repositories; clones deleted after analysis
NFR10: Candidate pool growth — supports a stored candidate pool of at least 1,000 profiles without query performance degradation
NFR11: Job queue resilience — failed scan jobs do not crash the queue; failed jobs logged, retained in visible failed state, retriable individually
NFR12: GitHub API rate limit compliance — never exceeds 5,000 req/hr; rate-limit-aware pacing enforced at job queue level
NFR13: Firebase Auth dependency — acceptable single-provider dependency for personal MVP; no fallback auth path required
NFR14: GitHub PAT expiry detection — clear error state in Admin UI and CLI when PAT expires or is revoked
NFR15: Source-agnostic architecture — GitHub integration behind a source adapter interface; adding GitLab/Bitbucket must not require redesigning core pipeline

### Additional Requirements

**From Architecture:**

- Monorepo (single `package.json`), two runtime targets: `src/app/` (Vite/React SPA) and `src/pipeline/` (Node.js via tsx). Shared: `src/core/`, `src/types/`, `src/adapters/`, `src/handlers/`
- Starter kit base: `setup/tools/claude-code-mastery-project-starter-kit` — Epic 1 Story 1 must scaffold from this
- All Firestore access through `src/core/db/firestore.ts` — never direct SDK calls in components or handlers
- Three tsconfig files extending a shared base: `tsconfig.app.json` (DOM), `tsconfig.pipeline.json` (Node), `tsconfig.functions.json` (Firebase Functions)
- TypeScript strict, no `any` — enforced project-wide
- pnpm package manager (starter kit requirement)
- Vitest for unit/integration tests; Playwright for E2E (Chromium only)
- Firebase emulators for local Firestore/Auth development
- `aiMaturityScore: number | null` — `null` and `0` are categorically different values; TypeScript enforces this throughout
- Pipeline writes must never include `aiMaturityScore` fields — enforced by TypeScript type exclusion
- `isStale` denormalized boolean set at write time; never computed at query time
- URL is the single source of truth for search filter state — `useSearchParams` owns filter values; Zustand owns UI-only state
- Rarest-tag-first + client-side AND filter for Firestore search; 200-doc cap
- `aiMaturityMin` filter uses two parallel Firestore queries (score >= N + score == null) merged client-side
- `scripts/admin-ops.ts` follows starter kit registered CLI pattern
- Firebase Functions limited to 2–3: admin claim verification, taxonomy count trigger, underserved query flagging
- Quality gates: no file >300 lines, no function >50 lines
- CLAUDE.md generated for the project following starter kit format
- Classpresso post-build CSS optimization (`postbuild` hook)
- Service ports: Website 3000 (dev) / 4000 (test)

**From UX Design:**

- Design system: shadcn/ui + Tailwind CSS + Radix UI + Lucide React
- Design direction: "Evidence" — `slate-900` top nav + `slate-50` body, Space Grotesk + JetBrains Mono
- Three-zone layout: top nav (h-12) + left facet panel (w-64, fixed) + main content area
- 9 custom components: CandidateCard, AIMaturityBadge, SkillScoreBadge, FacetPanel, ActiveFilterChips, EvidenceSection (4 variants), ThinResultsState/ZeroResultsState, StalenessTag, AdminQueueRow, SettingsPopover
- Skill Score = indigo circle badge `● 87`; AI Maturity = violet pip bar `████░░ Lvl 3`
- Light / Dark / Dim themes — user-selectable, persisted via localStorage
- Space Grotesk configurable font family (default); JetBrains Mono for all technical identifiers (non-configurable)
- Minimum viewport: 1280px desktop-only
- WCAG 2.1 AA throughout; `<fieldset>`/`<legend>` for facet checkbox groups
- Admin inline score editing: expand row → segmented score stepper `[0][1][2][3][4][5]` → auto-save → toast
- URL-encoded facet state is MVP requirement (not future enhancement); back-navigation preserves state

---

### FR Coverage Map

FR1: Epic 4 — GitHub API repo discovery in scan pipeline
FR2: Epic 4 — Repository relevance filtering before clone
FR3: Epic 4 — Local repo cloning for deep analysis
FR4: Epic 4 — Deduplication against existing candidate store
FR5: Epic 4 — Candidate derivation from repo contributor data
FR6: Epic 4 — Layer 1 analysis (language/framework detection)
FR7: Epic 4 — Layer 2 analysis (commit patterns, complexity, ownership)
FR8: Epic 4 — AI tooling signal detection
FR9: Epic 4 — AI config file evolution tracking
FR10: Epic 4 — Structured context profile generation and storage
FR11: Epic 4 — Taxonomy signal mapping and auto-expansion
FR12: Epic 6 — Candidate profile page with full evidence display
FR13: Epic 7 — Admin AI Maturity Score assignment UI
FR14: Epic 7 — Admin rescan trigger (individual candidate or repo)
FR15: Epic 5 — Staleness visual flag on results list and profile
FR16: Epic 5 — Structured faceted search UI with category panels
FR17: Epic 5 — Minimum AI Maturity Level filter
FR18: Epic 5 — Sort controls (Skill Score, AI Maturity, last_scanned)
FR19: Epic 5 — Results list with independent Skill Score + AI Maturity Score columns
FR20: Epic 5 — Underserved query auto-detection and storage
FR21: Epic 5 — Thin-results state with CLI command surface
FR22: Epic 2 — Seed taxonomy shipped with product
FR23: Epic 4 — Auto-expansion from pipeline scan signals
FR24: Epic 5 — Taxonomy browsing in search facet panel
FR25: Epic 3 — Google Sign-In via Firebase Auth
FR26: Epic 3 — Role-based access control (PrivateRoute + AdminRoute)
FR27: Epic 3 — Admin role grant via CLI (`scripts/admin-ops.ts`)
FR28: Epic 3 — Unauthenticated redirect to login
FR29: Epic 7 — Admin discovery run trigger with configurable parameters
FR30: Epic 7 — Admin job queue status view
FR31: Epic 7 — Admin flagged/underserved query list and action
FR32: Epic 7 — Admin candidate pool overview
FR33: Epic 7 — Admin rescan trigger per candidate/repo
FR34: Epic 7 — Admin repos-of-interest queue
FR35: Epic 4 — Async job queue (no UI blocking)
FR36: Epic 4 — Rate-limit-aware GitHub API pacing
FR37: Epic 2 — Persistent enriched profile storage (Firestore data layer)
FR38: Epic 4 — `last_scanned` timestamp update on every scan/rescan
FR39: Epic 4 — CLI `scan discover` command
FR40: Epic 4 — CLI `scan rescan` command
FR41: Epic 4 — CLI `scan status` command
FR42: Epic 3 — CLI admin role grant (`scripts/admin-ops.ts`)

---

## Epic List

### Epic 1: Project Scaffold & Foundation
Set up the monorepo from the starter kit, configure TypeScript targets, install all dependencies, wire up Firebase emulators, configure Vite, Tailwind, and CI — so that the project runs locally and all tooling is operational.
**FRs covered:** None directly — infrastructure that enables all subsequent epics.

### Epic 2: Data Layer & Taxonomy
Stand up the Firestore wrapper, define all TypeScript types, deploy Firestore security rules and composite indexes, and seed the taxonomy — so that all downstream pipeline and UI code has a reliable, type-safe data foundation with real seed data to query against.
**FRs covered:** FR22, FR37

### Epic 3: Authentication & Access Control
Implement Google Sign-In via Firebase Auth, protect all routes with `PrivateRoute` and `AdminRoute` guards, implement the CLI admin role grant command, and enforce server-side admin claim verification — so that only authenticated users can access the app and only admins can reach the admin section.
**FRs covered:** FR25, FR26, FR27, FR28

### Epic 4: Scan Pipeline
Build the complete CLI + async job queue + pipeline worker including GitHub repo discovery, relevance filtering, local cloning, Layer 1 analysis, Layer 2 analysis, AI tooling signal extraction, Skill Score computation, candidate profile generation, and taxonomy auto-expansion — so that Gabe can run `scan discover` and populate the candidate database with real, enriched profiles.
**FRs covered:** FR1–FR11, FR35–FR41, FR23

### Epic 5: Search UI
Implement the structured faceted search page with category panels, URL state management, Firestore query construction, results list with dual score display, sort controls, staleness flags, thin-results state, and underserved query auto-flagging — so that recruiters and project leads can find candidates by implementation evidence.
**FRs covered:** FR15–FR21, FR24

### Epic 6: Candidate Profile
Build the candidate profile page with full evidence sections (detected skills, repositories, AI tooling signals, config file evolution, score badges, staleness tag) — so that users can evaluate a specific candidate's verifiable work history in depth.
**FRs covered:** FR12

### Epic 7: Admin UI
Implement the protected `/admin` section with pipeline management, job queue monitoring, flagged query list, repos-of-interest queue, candidate pool overview, rescan triggers, and AI Maturity Score assignment — so that Gabe can manage the pipeline and build ground truth manually.
**FRs covered:** FR13, FR14, FR29–FR34

### Epic 8: Polish & Hardening
Add theme switching (Light/Dark/Dim), font selection, settings persistence, E2E test suite, GitHub Actions CI/CD deploy pipeline, and address any outstanding NFRs (rate-limit error states, PAT expiry surfacing, staleness cron) — so that the product is reliable, accessible, and deployable.
**FRs covered:** Cross-cutting NFRs 1–15

---

## Epic 1: Project Scaffold & Foundation

Set up the monorepo from the starter kit base (`setup/tools/claude-code-mastery-project-starter-kit`), configure the three TypeScript targets, install all dependencies, wire up Firebase emulators, configure Vite, Tailwind with Direction 2 tokens, shadcn/ui, and GitHub Actions CI — so that every subsequent epic starts with a fully operational, correctly configured foundation.

### Story 1.1: Scaffold Monorepo from Starter Kit

As a developer,
I want the project scaffolded from the starter kit into `candidate-skill-scanner/`,
So that the monorepo structure, tooling conventions, and quality gates are established from day one.

**Acceptance Criteria:**

**Given** the starter kit exists at `setup/tools/claude-code-mastery-project-starter-kit`
**When** the scaffold step runs
**Then** a new directory `candidate-skill-scanner/` is created at the project root with the starter kit as its base
**And** `package.json` is initialised with project name `candidate-skill-scanner`, pnpm workspace, and the following dependency groups: React 18, Vite 5, TypeScript 5.4+, Tailwind 3, shadcn/ui, Radix UI, Lucide React, React Router v6, TanStack Query v5, Zustand v4, React Hook Form, Zod, Classpresso, Firebase SDK, Octokit, simple-git, Commander.js, Vitest, Playwright
**And** `pnpm install` runs successfully with no errors
**And** `CLAUDE.md` is generated following the starter kit format with project-specific instructions

### Story 1.2: Configure TypeScript Targets

As a developer,
I want three tsconfig files extending a shared strict base,
So that DOM and Node.js libs are never cross-contaminated and all type checking is enforced.

**Acceptance Criteria:**

**Given** the monorepo is scaffolded
**When** TypeScript configs are written
**Then** `tsconfig.json` exists at root with `strict: true`, no `lib` set, `paths: { "@/*": ["src/*"] }`
**And** `tsconfig.app.json` extends base with `lib: ["DOM","ES2022"]`, `include: ["src/app","src/types","src/core"]`
**And** `tsconfig.pipeline.json` extends base with `lib: ["ES2022"]`, `types: ["node"]`, `include: ["src/pipeline","src/core","src/types","src/adapters","src/handlers"]`
**And** `tsconfig.functions.json` extends base targeting `functions/src`
**And** `pnpm typecheck` passes with zero errors on the empty scaffold

### Story 1.3: Configure Vite and Tailwind with Direction 2 Theme

As a developer,
I want Vite and Tailwind configured with the Direction 2 design tokens,
So that the development server, build process, and styling foundation are ready for component work.

**Acceptance Criteria:**

**Given** the monorepo is scaffolded with tsconfigs
**When** Vite and Tailwind are configured
**Then** `vite.config.ts` targets `src/app/main.tsx` as entry, serves on port 3000, uses `@vitejs/plugin-react`
**And** `tailwind.config.ts` includes Direction 2 tokens: `slate-900` nav, `slate-50` body, Space Grotesk as default sans, JetBrains Mono as mono
**And** `postbuild` script invokes Classpresso optimize
**And** `pnpm dev` starts without errors and loads a blank `index.html` at `localhost:3000`
**And** `pnpm build` succeeds and the `dist/` output exists

### Story 1.4: Configure Firebase Project and Emulators

As a developer,
I want Firebase project configuration and local emulators wired up,
So that all Firestore and Auth interactions can be tested locally without hitting production services.

**Acceptance Criteria:**

**Given** a Firebase project has been created in the Firebase console
**When** Firebase is configured locally
**Then** `firebase.json` exists with Hosting config (`public: "dist"`, SPA rewrite `/**` → `index.html`) and Functions config
**And** `.firebaserc` references the correct project alias
**And** `.env.example` documents all required env vars: `VITE_FIREBASE_*` (apiKey, authDomain, projectId, etc.) and `GITHUB_PAT`
**And** `.env` (gitignored) is populated with real values
**And** `.env.local` (committed) contains emulator overrides (`VITE_USE_EMULATOR=true`, `FIRESTORE_EMULATOR_HOST`, `FIREBASE_AUTH_EMULATOR_HOST`)
**And** `firebase emulators:start` launches Firestore + Auth emulators successfully

### Story 1.5: Configure Testing Tooling

As a developer,
I want Vitest and Playwright configured and passing on empty scaffolds,
So that the test infrastructure is operational before any feature code is written.

**Acceptance Criteria:**

**Given** the monorepo is set up with tsconfigs and dev server
**When** test configs are written
**Then** `vitest.config.ts` is configured for unit/integration tests using the emulator environment
**And** `playwright.config.ts` targets Chromium only, base URL `http://localhost:4000`, with `webServer` config for `pnpm preview`
**And** `pnpm test:unit` runs with zero test files and exits 0
**And** `pnpm test:e2e` starts the preview server on port 4000, opens Chromium, and exits 0 with zero tests

### Story 1.6: Configure GitHub Actions CI

As a developer,
I want a GitHub Actions CI workflow that runs type-check, unit tests, and build on every push,
So that regressions are caught automatically.

**Acceptance Criteria:**

**Given** the repository is on GitHub and the scaffold is complete
**When** a push is made to any branch
**Then** the CI workflow runs: `pnpm install`, `pnpm typecheck`, `pnpm test:unit`, `pnpm build`
**And** the workflow fails and reports clearly if any step fails
**And** the workflow file is at `.github/workflows/ci.yml`
**And** Firebase deploy step is present but gated on `main` branch only

---

## Epic 2: Data Layer & Taxonomy

Stand up all Firestore infrastructure — the centralized wrapper, all TypeScript types, security rules, composite indexes — and seed the taxonomy with curated starter data — so that all downstream pipeline and UI code has a reliable, type-safe, queryable foundation.

### Story 2.1: Define All TypeScript Types

As a developer,
I want all shared TypeScript types defined in `src/types/`,
So that the pipeline, handlers, and SPA all work against the same type contracts with no `any`.

**Acceptance Criteria:**

**Given** the scaffold is complete with strict TypeScript configured
**When** all type files are written
**Then** `src/types/candidate.ts` exports `Candidate` with `aiMaturityScore: number | null` (never a numeric sentinel for unscored)
**And** `src/types/repository.ts` exports `Repository` and `AiConfigFileSignal`
**And** `src/types/scan-job.ts` exports `ScanJob`, `ScanJobStatus`, `ScanJobType`, and all payload interfaces
**And** `src/types/taxonomy.ts` exports `TaxonomyItem` and `TaxonomyCategory`
**And** `src/types/admin.ts` exports `AdminFlag`, `AdminFlagType`, `AdminFlagStatus`, `SearchQueryParams`
**And** a pipeline-specific scoring output type exists that explicitly excludes `aiMaturityScore`, `aiMaturityScoredAt`, `aiMaturityScoredBy` — preventing accidental pipeline overwrites of manual scores
**And** `pnpm typecheck` passes with all types defined

### Story 2.2: Implement Centralized Firestore Wrapper

As a developer,
I want all Firestore access going through `src/core/db/firestore.ts`,
So that direct SDK calls never appear in components, handlers, or pipeline code — maintaining a single point of control.

**Acceptance Criteria:**

**Given** all TypeScript types are defined and Firebase is configured
**When** the Firestore wrapper is implemented
**Then** `src/core/db/firestore.ts` exports typed `get`, `set`, `update`, `delete`, `query`, `collection`, `serverTimestamp` methods
**And** the wrapper detects the `VITE_USE_EMULATOR` env var and points to the emulator automatically
**And** the wrapper is importable from both `src/app` and `src/pipeline` (both tsconfigs include `src/core`)
**And** a unit test verifies the wrapper routes to the emulator in test environment
**And** no file outside `src/core/db/firestore.ts` imports from `firebase/firestore` directly (enforced by a lint rule or documented convention)

### Story 2.3: Write Firestore Security Rules and Composite Indexes

As a developer,
I want Firestore security rules and all required composite indexes deployed,
So that the data layer is secure and all planned query patterns perform correctly.

**Acceptance Criteria:**

**Given** the Firestore wrapper is implemented and Firebase emulators are running
**When** rules and indexes are written and deployed to emulators
**Then** `firestore.rules` enforces: unauthenticated users get no read/write access; authenticated non-admin users get read access to `candidates`, `repositories`, `taxonomy`; authenticated admin users get read/write to all collections; pipeline service account gets write access to all collections
**And** `firestore.indexes.json` defines all composite indexes from the architecture spec for `candidates`, `repositories`, `scan_jobs`, `admin_flags`, and `taxonomy`
**And** an integration test (Vitest + emulator) verifies that a non-admin auth token cannot read `admin_flags`
**And** an integration test verifies that a valid candidate read query using a composite index returns results correctly

### Story 2.4: Seed Taxonomy Data

As a developer,
I want the curated seed taxonomy loaded into Firestore (via emulator for dev, via seed script for production),
So that the search interface has real categories to display and the pipeline has taxonomy items to map signals against.

**Acceptance Criteria:**

**Given** Firestore security rules are deployed and the wrapper is functional
**When** the seed script runs (`pnpm db:query --seed taxonomy` or similar)
**Then** the `taxonomy` collection is populated with seed items covering: Languages (Python, TypeScript, JavaScript, Rust, Go, Java, C#, Ruby, PHP, Swift), Frameworks (FastAPI, Django, Express, Next.js, React, Vue, Spring, Rails, etc.), Tools (Docker, PostgreSQL, Redis, GitHub Actions, Terraform, etc.), AI Agent Patterns (multi-agent, agent-hooks, rules-config, cursor-rules, claude-md, copilot), AI Maturity Levels (0–5 as descriptive items)
**And** each seed item has `isSeeded: true`, `isSearchable: true`, `candidateCount: 0`, correct `sortOrder` and `displayName`
**And** a Vitest test verifies the seed script is idempotent (running twice does not duplicate items)
**And** the seed data is version-controlled as a JSON file in `scripts/seeds/taxonomy.json`

---

## Epic 3: Authentication & Access Control

Implement Google Sign-In via Firebase Auth, protect all routes with `PrivateRoute` and `AdminRoute` guards backed by server-side Firebase custom claims, implement the CLI admin role grant command, and confirm that unauthenticated requests cannot access any application surface.

### Story 3.1: Implement Google Sign-In with Firebase Auth

As a user,
I want to sign in with my Google account,
So that I can access the candidate search tool.

**Acceptance Criteria:**

**Given** the user is not signed in and navigates to any app route
**When** they are redirected to the login page
**Then** a "Sign in with Google" button is displayed using the Direction 2 design (Space Grotesk, slate-900 nav)
**And** clicking it initiates the Firebase Google OAuth popup flow
**And** on successful sign-in, the user is redirected to `/search`
**And** the user's display name and avatar are visible in the top nav after sign-in
**And** sign-out is accessible from the top nav and returns the user to the login page
**And** the Firebase Auth emulator is used in the test environment

### Story 3.2: Implement PrivateRoute and AdminRoute Guards

As a developer,
I want `PrivateRoute` and `AdminRoute` React components that enforce access control,
So that unauthenticated users cannot reach any page and non-admin users cannot reach `/admin`.

**Acceptance Criteria:**

**Given** the app is running and auth state is available
**When** any route is accessed
**Then** `PrivateRoute` wraps all routes — unauthenticated users are redirected to `/login`
**And** `AdminRoute` wraps `/admin/*` routes — authenticated non-admin users are redirected to `/search`
**And** admin status is read from the Firebase ID token custom claim (`admin: true`), NOT from Firestore or client-side state
**And** both guards show a loading state while auth state is being resolved (prevents flash of redirect)
**And** a Vitest test confirms `AdminRoute` blocks a non-admin auth token

### Story 3.3: Server-Side Admin Claim Verification via Firebase Function

As a developer,
I want a Firebase Function that verifies admin claims server-side,
So that the admin role cannot be spoofed by manipulating client-side state or Firestore directly.

**Acceptance Criteria:**

**Given** Firebase Functions are configured (`functions/src/`)
**When** an admin action is attempted from the SPA
**Then** the `verify-admin-claim` Firebase Function is called and verifies the ID token's custom claim server-side before allowing the action
**And** a non-admin token passed to this function returns a 403 with a clear error message
**And** the function is deployed to the Firebase Functions emulator locally
**And** a unit test verifies the function rejects tokens without the `admin: true` claim

### Story 3.4: Implement CLI Admin Role Grant Command

As an operator,
I want to grant admin role to a registered Firebase user via CLI,
So that admin provisioning is gated to CLI-only access and can never be done through the web UI.

**Acceptance Criteria:**

**Given** a user has registered via Google Sign-In and their Firebase UID is known
**When** the operator runs `pnpm admin:ops grant-admin --uid <firebase-uid>`
**Then** the Firebase Admin SDK sets a custom claim `{ admin: true }` on the specified user
**And** the script outputs a success confirmation with the user's UID and email
**And** the script fails with a descriptive error if the UID does not exist in Firebase Auth
**And** the script follows the starter kit registered CLI pattern in `scripts/admin-ops.ts`
**And** the script is documented with a usage comment at the top of the file

---

## Epic 4: Scan Pipeline

Build the complete local CLI + async job queue + pipeline worker that discovers GitHub repos, filters by relevance, clones locally, runs Layer 1 and Layer 2 analysis, extracts AI tooling signals, computes Skill Scores, generates candidate context profiles, and handles rate limiting — so that `pnpm scan discover --query "python fastapi" --limit 50` populates the candidate database with real, enriched profiles.

### Story 4.1: CLI Entry Point and Commander.js Structure

As an operator,
I want a working CLI entry point with `scan discover`, `scan rescan`, and `scan status` sub-commands,
So that all pipeline operations are accessible via typed, documented CLI commands.

**Acceptance Criteria:**

**Given** the monorepo scaffold is complete and Commander.js is installed
**When** `pnpm scan --help` is run
**Then** the CLI displays available sub-commands: `discover`, `rescan`, `status`
**And** `pnpm scan discover --help` shows: `--query <string>`, `--source <github>` (default: github), `--limit <number>` (default: 100)
**And** `pnpm scan rescan --help` shows: `--user <username>` and `--repo <owner/repo>` options
**And** `pnpm scan status` shows "pipeline not yet implemented" placeholder
**And** the CLI entry point is at `src/pipeline/index.ts` and runs via `tsx`
**And** TypeScript compilation of `src/pipeline/` passes with `tsconfig.pipeline.json`

### Story 4.2: Firestore-Backed Job Queue Implementation

As a developer,
I want a Firestore-backed in-process job queue that stores, polls, and processes scan jobs,
So that discovery and scanning work is decoupled from the CLI and can be monitored from the Admin UI.

**Acceptance Criteria:**

**Given** the Firestore wrapper and all types are implemented
**When** a job is enqueued
**Then** a `ScanJob` document is written to the `scan_jobs` collection with status `pending`, correct `type` and `payload`, `priority: 0`, `attempts: 0`, `maxAttempts: 3`
**And** the worker polls for `pending` jobs ordered by `priority DESC`, `createdAt ASC`
**And** when a job is picked up, its status transitions to `running` with `lastAttemptAt` set
**And** on success, status transitions to `completed` with `completedAt` set
**And** on failure, `attempts` is incremented; if `attempts >= maxAttempts`, status transitions to `failed` with `errorMessage` and `failedAt` set
**And** a rate-limited job sets `rateLimitedUntil` timestamp and remains in `pending` state until that time passes
**And** failed jobs do not crash the worker — the worker continues processing subsequent jobs
**And** a unit test verifies the full job lifecycle: enqueue → pick up → complete

### Story 4.3: GitHub API Adapter and Repo Discovery

As an operator,
I want `scan discover` to query the GitHub Search API and enqueue repos for scanning,
So that the pipeline can be seeded with real GitHub repos matching a skill query.

**Acceptance Criteria:**

**Given** the job queue is operational and a `GITHUB_PAT` env var is set
**When** `pnpm scan discover --query "python fastapi" --limit 50` is run
**Then** the GitHub API adapter (`src/adapters/github.ts`) wraps Octokit and is the only code that calls the GitHub API
**And** the adapter searches for repos matching the query using `GET /search/repositories`
**And** up to `limit` repos are returned, with surface metadata: `fullName`, `primaryLanguage`, `starCount`, `forkCount`, `lastPushedAt`, `topics`
**And** each discovered repo is deduplicated against existing `repositories` docs in Firestore
**And** new repos are stored as `Repository` documents with `scanStatus: 'surface'`
**And** a `scan-repo` job is enqueued for each new repo with `targetDepth: 'layer1'`
**And** the CLI outputs a summary: N repos discovered, M new repos enqueued
**And** the GitHub adapter respects the source adapter interface (`src/adapters/source-adapter.ts`) for future source extensibility

### Story 4.4: Rate-Limit-Aware API Pacing

As a developer,
I want the pipeline to enforce GitHub API rate limits automatically,
So that the pipeline never exceeds 5,000 req/hr and handles 429/403 responses gracefully.

**Acceptance Criteria:**

**Given** the GitHub API adapter is implemented
**When** the adapter makes requests
**Then** the adapter reads the `X-RateLimit-Remaining` and `X-RateLimit-Reset` headers from every response
**And** when `X-RateLimit-Remaining` falls below 100, the adapter throttles subsequent requests with a calculated delay
**And** when a 429 or 403 with `retry-after` is received, the current job's `rateLimitedUntil` is set and the job is requeued
**And** the worker skips rate-limited jobs until their `rateLimitedUntil` timestamp has passed
**And** an integration test (with a mocked GitHub API) verifies that a 429 response causes the job to be re-queued with correct `rateLimitedUntil`
**And** the Admin UI `scan status` view (Epic 7) will read these fields — no additional work needed here beyond the data being correctly written

### Story 4.5: Local Repository Cloning

As a developer,
I want the pipeline to clone qualifying repos locally for deep analysis,
So that Layer 1 and Layer 2 analysis can run on actual file contents without further GitHub API calls.

**Acceptance Criteria:**

**Given** a `scan-repo` job with `targetDepth: 'layer1'` is processed
**When** the worker executes the job
**Then** the repo is cloned to a temporary local directory using `simple-git`
**And** the clone is shallow (`--depth 1`) for Layer 1; a full clone is used for Layer 2 (commit history required)
**And** the clone directory is cleaned up (deleted) after analysis is complete, whether the analysis succeeds or fails
**And** the system supports up to 50 concurrent clones without exceeding NFR9's local storage constraint
**And** if the repo is private or returns a 404 (deleted since discovery), the job fails gracefully with a descriptive error message

### Story 4.6: Layer 1 Analysis — Language and Framework Detection

As a developer,
I want Layer 1 analysis to detect programming languages and frameworks from package files,
So that candidate skill profiles can be populated with language and dependency signals from each repo.

**Acceptance Criteria:**

**Given** a repo has been cloned locally
**When** Layer 1 analysis runs (`src/pipeline/analysis/layer1.ts`)
**Then** the primary programming language is detected from file extensions and GitHub language metadata
**And** frameworks and libraries are detected by parsing: `package.json` (Node/JS), `requirements.txt`/`pyproject.toml`/`setup.py` (Python), `Cargo.toml` (Rust), `go.mod` (Go), `pom.xml`/`build.gradle` (Java)
**And** detected dependencies are normalised against the taxonomy (e.g. `"fastapi"` → taxonomy ID `"fastapi"`)
**And** previously-unseen dependencies are stored as `isSearchable: false` taxonomy items for later review
**And** `Repository.detectedFrameworks`, `Repository.detectedTools`, and `Repository.detectedDependencies` are updated in Firestore
**And** `Repository.scanStatus` is updated to `'layer1'`
**And** a unit test verifies correct framework extraction from a sample `package.json` and `requirements.txt` fixture

### Story 4.7: Layer 2 Analysis — Commit Patterns, Complexity, and Ownership

As a developer,
I want Layer 2 analysis to extract commit signals, ownership indicators, test coverage signals, and project complexity from the full repo history,
So that the Skill Score can be computed with depth signals beyond package file parsing.

**Acceptance Criteria:**

**Given** a full-depth clone of a repo is available locally
**When** Layer 2 analysis runs (`src/pipeline/analysis/layer2.ts`)
**Then** commit count and commit span in months are computed using `simple-git` log
**And** ownership is determined: `isOwnerRepo = true` if the repository owner is the dominant committer (>50% of commits)
**And** test coverage signals are detected: presence of test directories (`tests/`, `__tests__/`, `spec/`), test file count, framework detection (pytest, jest, mocha)
**And** `estimatedTestCoverage` is assigned: `'none'` (no test files), `'low'` (< 10 test files), `'medium'` (10–50), `'high'` (50+)
**And** `Repository.commitCount`, `firstCommitAt`, `lastCommitAt`, `commitSpanMonths`, `isOwnerRepo`, `hasTestDirectory`, `estimatedTestCoverage` are written to Firestore
**And** `Repository.scanStatus` is updated to `'layer2'`
**And** a unit test verifies ownership detection logic with a mock git log fixture

### Story 4.8: AI Tooling Signal Detection and Evolution Tracking

As a developer,
I want the pipeline to detect AI config files, co-authored-by trailers, and track config file evolution over time,
So that the candidate context profile contains the raw AI signal data needed for manual AI Maturity Score assignment.

**Acceptance Criteria:**

**Given** a full-depth clone is available and Layer 2 analysis has run
**When** AI signal detection runs (`src/pipeline/analysis/ai-signals.ts`)
**Then** the following AI config file patterns are detected: `CLAUDE.md`, `.claude/`, `.cursor/rules`, `.cursor/settings.json`, `ai-context.md`, `.github/copilot-instructions.md`, `.aider*`
**And** for each detected AI config file: `firstDetectedAt` is set from the git log, `modificationCount` is the number of commits touching that file, `lastModifiedAt` is the most recent such commit, `diffComplexity` is classified (`minimal` < 10 lines changed, `moderate` < 100, `extensive` >= 100), `isEvolved = modificationCount > 3`, `originSignal` is `'likely-copied'` if the file was introduced in a single large commit matching known templates, otherwise `'likely-original'`
**And** `coAuthoredByAI: true` if any commit trailer contains `Co-authored-by:` with a known AI tool name (GitHub Copilot, Cursor, etc.)
**And** `aiAttributionPatterns` captures any `# Generated by` or similar attribution comments found in files
**And** `Repository.aiConfigFiles`, `coAuthoredByAI`, `aiAttributionPatterns` are written to Firestore
**And** a unit test verifies `AiConfigFileSignal` population from a mock git log with a CLAUDE.md file

### Story 4.9: Skill Score Computation and Candidate Profile Generation

As a developer,
I want the pipeline to compute a Skill Score and derive/update the candidate profile after analysis is complete,
So that each scanned candidate has a queryable, scored record in Firestore.

**Acceptance Criteria:**

**Given** Layer 1, Layer 2, and AI signal analysis have completed for at least one repo
**When** the scoring step runs (`src/pipeline/scoring/skill-score.ts`)
**Then** the Skill Score is computed deterministically: primary language (20 pts) + frameworks capped at 30 + tools capped at 15 + commit depth capped at 10 + ownership bonus (10 pts) + test coverage (0/3/8/15) + AI tooling signals capped at 10, clamped to 0–100
**And** `aiMaturityScore` is NOT set or modified by the pipeline — the scoring output type excludes this field entirely
**And** a `Candidate` document is created or updated in Firestore: `skillScore`, `skillTags` (flat merged array of all taxonomy IDs), display arrays (`detectedLanguages`, `detectedFrameworks`, `detectedTools`, `aiToolingSignals`, `aiAgentPatterns`), `repoCount`, `primaryRepoIds`, `commitSpanMonths`, `lastScanned`, `isStale: false`, `scanDepth`
**And** `isStale` is computed at write time using the staleness threshold (90 days) and written as a denormalized boolean
**And** the candidate is derived from the repo's owner GitHub username
**And** a unit test verifies `computeSkillScore` returns the correct score for a known input set

### Story 4.10: CLI `scan status` and Deduplication

As an operator,
I want `scan status` to show pipeline health and want the pipeline to deduplicate correctly,
So that I can monitor progress and avoid re-scanning the same repos.

**Acceptance Criteria:**

**Given** the job queue and candidate store are populated
**When** `pnpm scan status` is run
**Then** the CLI outputs: total jobs by status (pending/running/completed/failed), rate limit remaining (from last GitHub API response cached in memory), count of candidates in Firestore, last scan timestamp
**And** when `scan discover` is run again with an overlapping query, repos already in the `repositories` collection are not re-enqueued (deduplication by `fullName`)
**And** candidates already in the `candidates` collection are not re-created (deduplication by GitHub username)
**And** a unit test verifies deduplication: calling the discovery function twice with the same repo returns 0 new repos on the second call

---

## Epic 5: Search UI

Implement the structured faceted search page with category panels, URL-encoded facet state, Firestore query construction, results list with dual score display, sort controls, staleness flags, thin-results state, and underserved query auto-flagging — so that users can find candidates by implementation evidence through a fast, bookmarkable, evidence-forward interface.

### Story 5.1: App Shell, Navigation, and Routing

As a user,
I want the application shell with top navigation and client-side routing,
So that I can navigate between search, profile, and admin pages with a consistent, responsive shell.

**Acceptance Criteria:**

**Given** the scaffold, auth, and data layer are complete
**When** the React app loads after sign-in
**Then** the app shell renders: top nav (`h-12`, `slate-900` background) with Space Grotesk branding, user avatar, sign-out link; main content area with `slate-50` background
**And** React Router v6 routes are configured: `/login` (public), `/search` (PrivateRoute), `/candidates/:id` (PrivateRoute), `/admin/*` (AdminRoute)
**And** navigating to `/` redirects to `/search` for authenticated users and `/login` for unauthenticated users
**And** the minimum viewport is 1280px (no layout breakpoints below this)
**And** JetBrains Mono is applied globally to all technical identifier elements via Tailwind class

### Story 5.2: Taxonomy-Driven Facet Panel

As a user,
I want the left-hand facet panel showing all taxonomy categories with checkboxes,
So that I can build a structured skill query by selecting from verified taxonomy items.

**Acceptance Criteria:**

**Given** the app shell is rendered and the taxonomy collection has seed data
**When** the Search page loads
**Then** a fixed left panel (`w-64`) renders five collapsible category sections: Languages, Frameworks, Tools, AI Agent Usage Patterns, AI Maturity Level
**And** each category section uses `<fieldset>` and `<legend>` elements for WCAG 2.1 AA compliance
**And** checkboxes are rendered for each `isSearchable: true` taxonomy item, sorted by `sortOrder`
**And** `candidateCount` is displayed next to each item as a muted badge
**And** selecting a checkbox updates the URL via `useSearchQuery` hook (URL becomes source of truth immediately)
**And** active filters are reflected in the URL: `?lang=python&framework=fastapi`
**And** the panel is implemented as the `FacetPanel` component in `src/app/components/search/FacetPanel.tsx`

### Story 5.3: Active Filter Chips and Clear All

As a user,
I want to see and remove my active search filters as chips,
So that I can understand and adjust my current query at a glance.

**Acceptance Criteria:**

**Given** one or more facet checkboxes are selected
**When** the results area is visible
**Then** `ActiveFilterChips` renders above the results: one chip per selected filter showing the display name and a remove `×` button
**And** clicking a chip's `×` removes that filter from the URL and re-triggers the search
**And** a "Clear all" button appears when any filters are active and removes all filter params from the URL
**And** the chip list reflects the URL state exactly — refreshing the page with a URL containing filter params shows the correct chips
**And** `ActiveFilterChips` is implemented in `src/app/components/search/ActiveFilterChips.tsx`

### Story 5.4: Firestore Search Query and Results Rendering

As a user,
I want the search to execute and render results from Firestore as I select facets,
So that I see real, ranked candidates matching my skill selection.

**Acceptance Criteria:**

**Given** at least one facet is selected and the `candidates` collection has data
**When** the URL contains filter params
**Then** `useSearchQuery` parses URL params into a typed `SearchQueryParams`
**And** `src/handlers/search.ts` builds the Firestore query using rarest-tag-first + 200-doc cap
**And** the client-side AND filter removes docs that don't match all selected tags
**And** results are rendered as `CandidateCard` components in the main content area, sorted by the active `sortBy` param
**And** each `CandidateCard` shows: GitHub username, avatar, `SkillScoreBadge` (indigo circle), `AIMaturityBadge` (violet pip bar or "Not evaluated"), top 3 matched skill tags, `last_scanned` date, `StalenessTag` if `isStale: true`
**And** TanStack Query caches the Firestore result and shows a loading skeleton while fetching
**And** results update reactively when URL params change (no page reload)

### Story 5.5: Sort Controls and AI Maturity Min Filter

As a user,
I want to sort results by Skill Score, AI Maturity Score, or last scanned date, and filter by minimum AI Maturity Level,
So that I can rank candidates by the dimension most relevant to my search.

**Acceptance Criteria:**

**Given** the results list is rendering
**When** I change the sort order or AI maturity minimum
**Then** a sort control (dropdown or button group) renders above results: "Sort by: Skill Score | AI Maturity | Last Scanned"
**And** changing sort updates the URL `?sort=aiMaturityScore` and re-executes the Firestore query with the correct `orderBy`
**And** the AI Maturity minimum filter renders as a slider or select (0–5) in the FacetPanel under the "AI Maturity Level" section
**And** when `aiMaturityMin > 0` is selected, the URL gets `?ai_maturity_min=2` and two parallel Firestore queries are executed: `aiMaturityScore >= N` + `aiMaturityScore == null`, merged client-side
**And** unscored candidates (`null`) always appear in results when `aiMaturityMin` filter is active — they are never excluded
**And** sort selection is persisted in the URL and survives page refresh

### Story 5.6: Thin Results State and Underserved Query Flagging

As a user,
I want a clear, actionable thin-results state when fewer than 10 candidates match my query,
So that I understand pool coverage is limited and know what to do about it.

**Acceptance Criteria:**

**Given** a search query returns fewer than 10 results
**When** the results are rendered
**Then** the `ThinResultsState` component renders above the result cards showing: result count (e.g. "3 candidates found"), "Pool coverage for this skill combination is limited", the exact `scan discover` CLI command with the current filter params as the `--query` argument
**And** the underserved query is automatically stored as an `admin_flags` document of type `underserved-query` with `resultCount` and `queryParams` populated (via `src/handlers/admin-flags.ts`)
**And** a toast or inline note confirms "This search has been flagged for pool expansion"
**And** when zero results are returned, the `ZeroResultsState` variant renders with the same CLI command surface
**And** deduplication: if the exact same query params were already flagged and the flag status is `active`, a new flag document is not created
**And** `ThinResultsState` and `ZeroResultsState` are implemented in `src/app/components/search/`

---

## Epic 6: Candidate Profile

Build the candidate profile page (`/candidates/:id`) that shows the full evidence basis for a candidate — detected skills, repository list, AI tooling signals, config file evolution, score badges, staleness tag, and commit span context — so that users can evaluate a candidate's verifiable work history in depth before deciding to shortlist.

### Story 6.1: Candidate Profile Page Layout and Data Loading

As a user,
I want the candidate profile page to load and display the core candidate record,
So that I can see the candidate's scores, identity, and top-level signals without navigating away from the results list.

**Acceptance Criteria:**

**Given** a user clicks a `CandidateCard` on the search results page
**When** `/candidates/:id` is navigated to
**Then** the page loads the `Candidate` document from Firestore by the `:id` param (GitHub username)
**And** TanStack Query caches the candidate record under key `['candidate', id]`
**And** the page shows: GitHub username, avatar, GitHub profile link, `SkillScoreBadge`, `AIMaturityBadge`, `StalenessTag` (if stale), `last_scanned` date, commit span in months
**And** a loading skeleton is shown while data is fetching
**And** navigating back to the search results page preserves the facet state via the URL (the URL was not mutated by profile navigation)
**And** if the candidate ID does not exist in Firestore, a 404 state is rendered

### Story 6.2: Evidence Sections — Skills and Repositories

As a user,
I want to see the detected skills and analysed repositories for a candidate,
So that I can verify that the skill signals are backed by real, specific repositories.

**Acceptance Criteria:**

**Given** the candidate profile page has loaded a candidate record
**When** the skills and repositories sections render
**Then** the detected skills section (`EvidenceSection` variant: skills) shows grouped chips: Languages, Frameworks, Tools — each chip is a taxonomy display name
**And** the repositories section (`EvidenceSection` variant: repositories) lists `primaryRepoIds` resolved to `Repository` documents, showing: repo name, primary language, star count, commit span, `scanStatus` badge
**And** each repo entry is linked to its GitHub URL (opens in new tab)
**And** if no repositories are linked to the candidate, a "No repositories analysed yet" empty state is shown
**And** the repositories are loaded via a separate TanStack Query (not embedded in the main candidate query)

### Story 6.3: Evidence Sections — AI Tooling Signals and Config Evolution

As a user,
I want to see the AI tooling signals and config file evolution for a candidate,
So that I can assess their AI Maturity before or after the admin assigns a formal score.

**Acceptance Criteria:**

**Given** the candidate profile page has loaded and repositories are resolved
**When** the AI tooling signals section renders
**Then** the AI signals section (`EvidenceSection` variant: ai-signals) shows: list of detected AI config files with file name, `modificationCount`, `isEvolved` indicator, `diffComplexity`, `originSignal`
**And** `coAuthoredByAI: true` surfaces as a chip "Co-authored with AI"
**And** `aiAgentPatterns` chips are shown (e.g. "Multi-agent orchestration", "Custom hooks")
**And** the config evolution section (`EvidenceSection` variant: evolution) shows a timeline-style display: file first seen → number of modifications → last modified → evolution classification
**And** if no AI signals are detected, an "No AI tooling signals detected" empty state is shown (distinct from "not yet evaluated")

---

## Epic 7: Admin UI

Implement the protected `/admin` section with four tabs — Pipeline, Queue, Flags, Candidates — covering: discovery run triggers, job queue monitoring, flagged/underserved query actioning, repos-of-interest queue, candidate pool overview, rescan triggers, and AI Maturity Score assignment with inline editing.

### Story 7.1: Admin Section Shell and Tab Navigation

As an admin user,
I want the `/admin` route to render a protected admin shell with tab navigation,
So that all admin operations are accessible from a single protected section.

**Acceptance Criteria:**

**Given** an authenticated admin user navigates to `/admin`
**When** the Admin page loads
**Then** the admin shell renders with a tab bar: Pipeline | Queue | Flags | Candidates
**And** each tab renders its own sub-section with appropriate content (content from subsequent stories)
**And** a non-admin authenticated user attempting to navigate to `/admin` is redirected to `/search`
**And** the admin shell displays the current admin user's email in the header
**And** deep-linking to `/admin?tab=queue` opens the Queue tab directly

### Story 7.2: Pipeline Tab — Discovery Run Trigger

As an admin user,
I want to trigger a discovery run from the Admin UI,
So that I can seed the pipeline with new candidates without switching to the CLI.

**Acceptance Criteria:**

**Given** I am on the Pipeline tab of the Admin UI
**When** I fill in the discovery form and submit
**Then** a form renders with fields: Query (text input), Source (select: GitHub), Limit (number input, default 100)
**And** submitting the form calls `src/handlers/scan-jobs.ts` which creates a `discover` job in `scan_jobs` with the form values as payload
**And** on submission, a toast confirms "Discovery run queued: [query], limit [N]"
**And** validation (React Hook Form + Zod) requires Query to be non-empty and Limit to be 1–1000
**And** the form is disabled while submission is in progress

### Story 7.3: Queue Tab — Job Queue Monitoring

As an admin user,
I want to see the current state of the scan job queue,
So that I can monitor pipeline progress and identify stuck or failed jobs.

**Acceptance Criteria:**

**Given** I am on the Queue tab of the Admin UI
**When** the tab renders
**Then** jobs are displayed in a table with columns: Type, Status, Created At, Attempts, Error (truncated), Actions
**And** jobs are filterable by status (All / Pending / Running / Completed / Failed) via a tab strip above the table
**And** each failed job shows its `errorMessage` in a tooltip or expandable row
**And** a "Retry" button on failed jobs re-queues the job (resets status to `pending`, increments `maxAttempts`)
**And** the table auto-refreshes every 30 seconds using TanStack Query's `refetchInterval`
**And** `AdminQueueRow` component is implemented in `src/app/components/admin/AdminQueueRow.tsx`

### Story 7.4: Flags Tab — Underserved Query Actioning

As an admin user,
I want to see and action underserved queries flagged by the search UI,
So that I can trigger targeted discovery runs to expand pool coverage for thin-result searches.

**Acceptance Criteria:**

**Given** I am on the Flags tab and there are `admin_flags` documents with `type: 'underserved-query'`
**When** the tab renders
**Then** underserved queries are listed sorted by `resultCount ASC` (scarcest first), showing: facet params, result count, flagged date, status badge
**And** each row has a "Trigger Discovery" button that opens an inline form pre-filled with the flagged query params
**And** submitting the discovery form queues a `discover` job (same as Pipeline tab) and updates the flag's status to `actioned`
**And** flags with status `actioned` or `dismissed` are visually de-emphasised and shown in a collapsed "Resolved" section
**And** the repos-of-interest sub-section on this tab shows `admin_flags` of type `repo-of-interest`, listing flagged repos with detected signals and a "Mark as actioned" button

### Story 7.5: Candidates Tab — Pool Overview and Rescan Triggers

As an admin user,
I want to see the candidate pool overview and trigger rescans on individual candidates,
So that I can understand pool coverage and keep profiles fresh.

**Acceptance Criteria:**

**Given** I am on the Candidates tab and the `candidates` collection has data
**When** the tab renders
**Then** a summary row shows: total candidate count, count with AI Maturity Score assigned, count that are stale (`isStale: true`)
**And** a taxonomy coverage breakdown shows each `language` taxonomy item with its `candidateCount`
**And** a candidates table lists all candidates: username, skillScore, aiMaturityScore (or "Not evaluated"), lastScanned, isStale indicator
**And** each row has a "Rescan" button that creates a `rescan-candidate` job for that candidate
**And** stale candidates are visually highlighted (amber row background or `StalenessTag`)

### Story 7.6: Inline AI Maturity Score Assignment

As an admin user,
I want to assign or update an AI Maturity Score on a candidate directly from the Admin UI,
So that I can build ground truth without navigating to a separate editing page.

**Acceptance Criteria:**

**Given** I am on the Candidates tab and a candidate row is visible
**When** I expand a candidate row
**Then** an inline score assignment section expands below the row
**And** a segmented score stepper renders: `[0] [1] [2] [3] [4] [5]` with the current score highlighted (or no highlight if `null`)
**And** clicking a score level calls `src/handlers/candidates.ts → updateAiMaturityScore()` immediately (no separate save button)
**And** the Firestore update sets `aiMaturityScore`, `aiMaturityScoredAt`, `aiMaturityScoredBy` (current admin UID)
**And** a toast confirms "AI Maturity Score updated: Level [N] for [username]"
**And** the TanStack Query cache for `['candidate', id]` is invalidated after the update
**And** the candidate row reflects the new score immediately after the toast

---

## Epic 8: Polish & Hardening

Add theme switching (Light/Dark/Dim), font family selection, settings persistence, GitHub Actions deploy to Firebase Hosting, comprehensive E2E test coverage, rate-limit error surface in Admin UI, PAT expiry detection, and any remaining NFR gaps — so that the product is reliable, accessible, fully deployable, and ready for daily use.

### Story 8.1: Theme Switching and Settings Persistence

As a user,
I want to switch between Light, Dark, and Dim themes and choose my preferred font family,
So that I can use the tool in my preferred visual environment with settings preserved across sessions.

**Acceptance Criteria:**

**Given** the app is running
**When** I open the settings popover (gear icon in top nav)
**Then** `SettingsPopover` renders with: theme selector (Light / Dark / Dim), font family selector (Space Grotesk / Inter / Outfit / IBM Plex Sans / Geist)
**And** selecting a theme applies a Tailwind CSS class to the `<html>` element and persists the choice to `localStorage`
**And** selecting a font family applies it via a CSS variable and persists to `localStorage`
**And** JetBrains Mono remains the monospace font for technical identifiers regardless of font family selection
**And** settings are restored from `localStorage` on page load (no flash of wrong theme)
**And** `SettingsPopover` is implemented in `src/app/components/shared/SettingsPopover.tsx`

### Story 8.2: PAT Expiry and Rate Limit Error Surfaces

As an admin user,
I want clear error states when the GitHub PAT expires or rate limits are exhausted,
So that I know exactly what action to take rather than seeing silent failures or empty results.

**Acceptance Criteria:**

**Given** the pipeline worker is running and the GitHub API adapter is in use
**When** a PAT expiry (401) or rate limit exhaustion (403/429 with no retry-after) is detected
**Then** the pipeline logs a structured error with the error type and timestamp
**And** an `admin_flags` document of type `repo-of-interest` (or a new `system-alert` type) is written to Firestore with a descriptive message
**And** the Admin UI Pipeline tab shows a banner: "GitHub API authentication error — PAT may have expired. Check your GITHUB_PAT env var." when this flag is active
**And** the CLI `scan status` command surfaces the error condition with a clear message
**And** after the PAT is rotated and the env var updated, the error state clears on the next successful API call

### Story 8.3: E2E Test Suite

As a developer,
I want a comprehensive Playwright E2E test suite covering the critical user journeys,
So that regressions in the core flows are caught automatically before deployment.

**Acceptance Criteria:**

**Given** the app is fully functional (all previous epics complete) and Playwright is configured
**When** `pnpm test:e2e` is run against the preview server on port 4000
**Then** the following flows are covered by passing tests:
  — Unauthenticated user is redirected to `/login`
  — User signs in with Google (Firebase Auth emulator) and is redirected to `/search`
  — User selects a language facet; URL updates to `?lang=python`; results appear
  — User selects a second facet; results update; active filter chips show both
  — User clicks "Clear all"; URL clears; empty state renders
  — User opens a candidate profile; evidence sections render; back navigation returns to search with filter state preserved
  — Admin signs in; `/admin` loads; can navigate tabs
  — Non-admin navigating to `/admin` is redirected to `/search`
**And** all tests pass on Chromium only (no other browsers configured)
**And** test run takes under 3 minutes on CI

### Story 8.4: Firebase Hosting Deployment and CI Deploy Gate

As a developer,
I want the production SPA deployed to Firebase Hosting via GitHub Actions on merge to `main`,
So that the product is accessible at its Firebase Hosting URL after every production merge.

**Acceptance Criteria:**

**Given** the GitHub Actions CI workflow is configured
**When** a PR is merged to `main`
**Then** the deploy job runs: `pnpm build`, then `firebase deploy --only hosting`
**And** the deploy step uses a Firebase service account credential stored as a GitHub Actions secret
**And** a failed build or failed test step prevents the deploy from running
**And** the deployment URL is output in the GitHub Actions log
**And** Firebase Functions are deployed separately via `firebase deploy --only functions` in the same workflow, gated on `main`
