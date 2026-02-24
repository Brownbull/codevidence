# CLAUDE.md — candidate-skill-scanner

> Based on Claude Code Mastery Guides V1-V5 by TheDecipherist
> Chrome-only SPA + local Node.js scan pipeline for developer talent discovery

---

## Ralph Agent Instructions

You are an autonomous coding agent building a software project from a PRD.

### Your Task

1. Read the PRD at `prd.json`
2. Read `progress.txt` if it exists (check **Codebase Patterns** section first)
3. Check you're on the correct branch from PRD `branchName`. If not, create it from master.
4. Pick the **highest priority** user story where `passes: false`
5. Implement that single user story
6. Run quality checks (build, typecheck, lint, test — whatever the project needs)
7. If checks pass, commit ALL changes with message: `feat: [Story ID] - [Story Title]`
8. Update `prd.json` to set `passes: true` for the completed story
9. Append your progress to `progress.txt`

### Progress Report Format

APPEND to progress.txt (never replace, always append):

```
## [Date/Time] - [Story ID]
- What was implemented
- Files changed
- **Learnings for future iterations:**
  - Patterns discovered
  - Gotchas encountered
  - Useful context
---
```

### Stop Condition

After completing a user story, check if ALL stories have `passes: true`.

If ALL stories are complete and passing:
<promise>COMPLETE</promise>

If there are still stories with `passes: false`, end your response normally
(another iteration will pick up the next story).

---

## Quick Reference — Scripts

| Command | What it does |
|---------|-------------|
| `pnpm dev` | Start Vite dev server on port 3000 |
| `pnpm build` | TypeScript typecheck + Vite build |
| `pnpm preview` | Preview production build on port 3000 |
| `pnpm typecheck` | TypeScript type-check only (no emit) |
| `pnpm scan` | Run pipeline CLI (Commander.js) |
| `pnpm admin:ops` | Admin operations CLI |
| **Testing** | |
| `pnpm test` | Run unit tests |
| `pnpm test:unit` | Run unit/integration tests (Vitest) |
| `pnpm test:unit:watch` | Unit tests in watch mode |
| `pnpm test:coverage` | Unit tests with coverage report |
| `pnpm test:e2e` | Run E2E tests (Playwright, Chromium only) |
| `pnpm test:e2e:chromium` | E2E on Chromium only (fast) |
| **Database** | |
| `pnpm db:query <name>` | Run a dev/test database query |
| `pnpm db:query:list` | List all registered database queries |
| `pnpm db:seed` | Seed taxonomy collection in emulator |
| **CSS Optimization** | |
| `pnpm build:optimize` | Post-build CSS optimization via Classpresso |
| **Utility** | |
| `pnpm clean` | Remove dist/, coverage/, test-results/, playwright-report/ |

---

## Project Architecture

This project has TWO distinct runtime contexts:

### 1. Web App (`src/app/`)
- React 18 SPA, Vite 5, TypeScript
- Runs in browser (Chrome only)
- Entrypoint: `src/app/main.tsx`
- Compiled with `tsconfig.app.json` (DOM + React types)

### 2. Scan Pipeline (`src/pipeline/`)
- Node.js CLI, Commander.js, tsx
- Runs locally — NO browser APIs
- Entrypoint: `src/pipeline/index.ts`
- Compiled with `tsconfig.pipeline.json` (Node types, NO DOM)

**CRITICAL: Never import browser APIs (`window`, `document`) in pipeline code. Never import Node-only APIs (`fs`, `process`) directly in app code.**

---

## Critical Rules

### 0. NEVER Publish Sensitive Data

- NEVER commit passwords, API keys, tokens, or secrets to git
- NEVER commit `.env` or `.env.local` — they are in `.gitignore`
- Before ANY commit: verify no secrets are included
- `GITHUB_PAT` must ONLY exist in `.env.local` — never in code

### 1. TypeScript Always

- ALWAYS use TypeScript for new files (strict mode)
- NEVER use `any` unless absolutely necessary and documented why
- Types are specs — they tell you what functions accept and return
- `tsconfig.json` is the base; `tsconfig.app.json` and `tsconfig.pipeline.json` extend it

### 2. Firestore Access — Wrapper Only (`src/core/db/firestore.ts`)

**ABSOLUTE RULE: ALL Firestore access goes through `src/core/db/firestore.ts`. No exceptions.**

- NEVER import Firebase SDK directly outside the wrapper
- The wrapper auto-detects `VITE_USE_EMULATOR=true` and routes to emulator

### 3. AI Maturity Score Invariant

**THE MOST CRITICAL INVARIANT IN THE CODEBASE:**

- `aiMaturityScore: null` = not evaluated (never been scored)
- `aiMaturityScore: 0` = evaluated, rated Level 0
- **NEVER use a sentinel numeric value** (e.g., -1) for "unscored"
- Pipeline code MUST NOT write `aiMaturityScore`, `aiMaturityScoredAt`, or `aiMaturityScoredBy`
- This is enforced at the TypeScript type level via pipeline scoring output type

### 4. Testing — Explicit Success Criteria

- ALWAYS define explicit success criteria for E2E tests
- Every test MUST verify: URL, visible elements, data displayed
- NEVER write tests without assertions (minimum 3 per test)

### 5. NEVER Hardcode Credentials

- All Firebase config via `VITE_FIREBASE_*` env vars
- `GITHUB_PAT` from `.env.local` — never hardcoded
- Firebase Admin SDK credentials from `FIREBASE_*` env vars

### 6. Quality Gates

- No file > 300 lines (split if larger)
- No function > 50 lines (extract helper functions)
- All tests must pass before committing
- TypeScript must compile with no errors (`tsc --noEmit`)

### 7. Parallelize Independent Awaits

- When multiple `await` calls are independent, ALWAYS use `Promise.all`
- NEVER await independent operations sequentially

---

## Service Ports (FIXED — NEVER CHANGE)

| Service | Dev Port | Test Port |
|---------|----------|-----------|
| Web App | 3000 | 4000 |

---

## Project Structure

```
candidate-skill-scanner/
├── CLAUDE.md                    # You are here
├── index.html                   # Vite HTML entry
├── vite.config.ts               # Vite config (React, @/* alias, port 3000)
├── tailwind.config.ts           # Direction 2 tokens (slate-900, slate-50, Space Grotesk)
├── tsconfig.json                # Base TypeScript config (strict, @/* paths)
├── tsconfig.app.json            # App config (DOM + React)
├── tsconfig.pipeline.json       # Pipeline config (Node, NO DOM)
├── vitest.config.ts             # Vitest config
├── playwright.config.ts         # Playwright config (Chromium only)
├── firebase.json                # Firebase Hosting + Functions config
├── firestore.rules              # Firestore security rules
├── firestore.indexes.json       # Composite indexes
├── .env.example                 # Template (committed)
├── .env.local                   # Secrets (NEVER committed)
├── prd.json                     # PRD with user stories
├── progress.txt                 # Ralph agent progress log
├── project-docs/
│   ├── ARCHITECTURE.md
│   ├── DECISIONS.md
│   └── INFRASTRUCTURE.md
├── src/
│   ├── app/                     # React SPA (browser only)
│   │   ├── main.tsx             # React entry point
│   │   ├── styles.css           # Tailwind base + global styles
│   │   └── components/
│   │       ├── search/          # FacetPanel, CandidateCard, etc.
│   │       └── admin/           # Admin UI components
│   ├── pipeline/                # Node.js CLI pipeline (no browser APIs)
│   │   ├── index.ts             # Commander.js entry point
│   │   └── analysis/            # Layer1, Layer2, AI signals
│   ├── core/
│   │   └── db/
│   │       └── firestore.ts     # Centralized Firestore wrapper
│   ├── handlers/                # Business logic (search, candidates, admin)
│   ├── adapters/                # External service wrappers (GitHub, etc.)
│   └── types/                   # Shared TypeScript types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── scripts/
    ├── db-query.ts              # Test Query Master
    ├── queries/                 # Dev/test queries only
    ├── admin-ops.ts             # Admin CLI (grant-admin)
    └── seed-taxonomy.ts         # Taxonomy seed script
```

---

## Codebase Patterns

- **Dual runtime context**: `src/app/` = browser/React (DOM types), `src/pipeline/` = Node.js (no DOM). Enforce with separate tsconfigs.
- **Firestore wrapper**: ALL Firestore access via `src/core/db/firestore.ts`. Never import Firebase SDK directly in business logic.
- **aiMaturityScore invariant**: `null` = not scored, `0` = scored Level 0. Pipeline scoring output type uses `Omit<Candidate, aiMaturity fields>` to TypeScript-enforce absence.
- **URL as filter state**: Filter values live in URL params only. Zustand holds UI state only (panel collapse).
- **Rarest-tag-first query**: Find the tag with lowest candidateCount, use as primary `array-contains` Firestore filter. Remaining tags filtered client-side.
- **Dual Firestore query for aiMaturityMin**: Two parallel queries (scored >= N + unscored == null) merged client-side to preserve null inclusion.
- **TanStack Query patterns**: 5-minute staleTime, queryKey includes params for auto-refetch. Separate query keys for candidates list vs candidate profile.
- **Admin score assignment**: `updateAiMaturityScore` uses `updateDoc` (not `setDoc`) to only write three aiMaturity fields, preserving pipeline-owned fields.
- **Theme flash prevention**: Inline `<script>` in `index.html` reads localStorage before React mount.
- **Test patterns**: Source-level tests use `readFileSync` + `toContain()`. Functional tests use dynamic `import()` for module loading.
- **Build chain**: `pnpm build` = `tsc --noEmit && vite build && classpresso optimize`. All three must pass.

---

## When Something Seems Wrong

- TypeScript error in pipeline? → Check you're not importing browser APIs
- TypeScript error in app? → Check you're not importing Node-only APIs
- Firestore not connecting? → Check `VITE_USE_EMULATOR=true` in `.env.local`
- GitHub API 403? → Check `GITHUB_PAT` in `.env.local`
- `aiMaturityScore` accidentally written by pipeline? → See Rule 3 above

---

## Important

- Work on ONE story per iteration
- Commit after each completed story
- Keep CI green
- Read the Codebase Patterns section in progress.txt before starting each story
