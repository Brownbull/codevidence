# Candidate Skill Scanner

A Chrome-only SPA + local Node.js scan pipeline that discovers developer talent by analysing public GitHub repositories. Replaces self-reported CVs with verifiable, commit-level evidence and surfaces ranked candidates via structured faceted search with independent Skill Score and AI Maturity Score dimensions.

## Prerequisites

- Node.js 20+
- pnpm 9+
- Firebase CLI (`npm install -g firebase-tools`)
- A Firebase project with Firestore and Authentication enabled
- A GitHub Personal Access Token (PAT) with `public_repo` scope

## Local Setup

### 1. Clone and install

```bash
cd eggs/candidate-skill-scanner
pnpm install
```

### 2. Firebase project

Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com). Enable:
- **Authentication** with Google sign-in provider
- **Firestore Database** in production mode

### 3. Environment variables

Copy `.env.example` to `.env.local` and fill in your values:

```bash
cp .env.example .env.local
```

| Variable | Description |
|----------|-------------|
| `VITE_FIREBASE_API_KEY` | Firebase Web API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | Firebase Auth domain (`project-id.firebaseapp.com`) |
| `VITE_FIREBASE_PROJECT_ID` | Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `VITE_FIREBASE_APP_ID` | Firebase app ID |
| `VITE_USE_EMULATOR` | Set to `true` to use Firebase emulators locally |
| `GITHUB_PAT` | GitHub Personal Access Token (pipeline only, never exposed to browser) |
| `FIREBASE_PROJECT_ID` | Firebase project ID (for Admin SDK) |
| `FIREBASE_CLIENT_EMAIL` | Service account email (for Admin SDK) |
| `FIREBASE_PRIVATE_KEY` | Service account private key (for Admin SDK) |

### 4. Start Firebase emulators

```bash
firebase emulators:start
```

This starts Firestore (port 8080) and Auth (port 9099) emulators.

### 5. Seed taxonomy

```bash
pnpm db:seed
```

Populates the taxonomy collection with Languages, Frameworks, Tools, AI Agent Patterns, and AI Maturity Levels.

## Running the Scan Pipeline

### Discover candidates

```bash
pnpm scan discover --query "python fastapi" --limit 100
```

Searches GitHub for repositories matching the query, deduplicates against existing repos, and enqueues scan jobs.

### Check status

```bash
pnpm scan status
```

Shows pending, running, completed, and failed jobs.

### Grant admin role

```bash
pnpm admin:ops grant-admin --uid <firebase-uid>
```

Sets the `admin: true` custom claim on a Firebase Auth user, granting access to the Admin UI.

## Web UI

### Development server

```bash
pnpm dev
```

Starts the Vite dev server on `http://localhost:3000`. Requires Firebase emulators for Firestore and Auth.

### Features

- **Search page** (`/search`): Faceted search with taxonomy filters (Languages, Frameworks, Tools, AI Agent Patterns, AI Maturity Level). URL is the single source of truth for filter state.
- **Candidate profile** (`/candidates/:id`): Full evidence sections — Skills, Repositories, AI Signals, Evolution Timeline.
- **Admin dashboard** (`/admin`): Pipeline trigger, job queue monitor, admin flags, candidates table with inline AI Maturity Score assignment.
- **Theme switching**: Light/Dark/Dim themes + font family selection, persisted to localStorage.

## Running Tests

### Unit tests

```bash
pnpm test:unit           # Run once
pnpm test:unit:watch     # Watch mode
pnpm test:coverage       # With coverage report
```

### E2E tests

```bash
pnpm test:e2e            # Full suite (Chromium only)
pnpm test:e2e:chromium   # Chromium only (same as above)
```

E2E tests require the dev server and Firebase emulators to be running.

## Deploying to Firebase Hosting

The CI workflow (`.github/workflows/ci.yml`) automatically deploys to Firebase Hosting on merge to `main`:

1. CI job runs: typecheck, unit tests, build
2. Deploy job (gated on `main`): builds and deploys via `FirebaseExtended/action-hosting-deploy`

Required GitHub secrets:
- `FIREBASE_SERVICE_ACCOUNT`: Firebase service account JSON key
- `FIREBASE_PROJECT_ID` (as a variable): Firebase project ID

## CLI Command Reference

| Command | Description |
|---------|-------------|
| `pnpm scan discover --query <query> --limit <n>` | Discover repos matching query |
| `pnpm scan status` | Show job queue status |
| `pnpm admin:ops grant-admin --uid <uid>` | Grant admin role to a user |
| `pnpm dev` | Start dev server (port 3000) |
| `pnpm build` | TypeScript typecheck + Vite build |
| `pnpm typecheck` | TypeScript type-check only |
| `pnpm test:unit` | Run unit tests |
| `pnpm test:e2e` | Run E2E tests (Chromium) |
| `pnpm db:seed` | Seed taxonomy collection |

## AI Maturity Model

The AI Maturity Model classifies developers on a 0-5 scale based on their AI tooling adoption evidence:

| Level | Label | Signals |
|-------|-------|---------|
| Level 0 | No AI signals | No AI config files, no co-authored-by AI trailers |
| Level 1 | AI Tool Present | AI config file detected (e.g., CLAUDE.md, .cursor/) but minimal modifications |
| Level 2 | Active AI Usage | AI config files with moderate modifications; co-authored-by AI trailers present |
| Level 3 | AI-Integrated | Evolved AI config files (>3 modifications, extensive diffs); multiple AI tool patterns |
| Level 4 | AI-Native | Multiple evolved AI configs across repos; consistent AI attribution patterns |
| Level 5 | AI-First | Comprehensive AI tooling across all repos; AI-driven development as primary workflow |

Key invariants:
- `aiMaturityScore: null` = not yet evaluated by a human
- `aiMaturityScore: 0` = evaluated and rated Level 0
- Scores are assigned manually by admin users, never by the pipeline
