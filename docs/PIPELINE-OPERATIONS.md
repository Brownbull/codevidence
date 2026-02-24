# Pipeline Operations Guide

How to scan a developer's GitHub profile end-to-end.

---

## Prerequisites

1. **Firebase project configured** — `.env.local` with all `VITE_FIREBASE_*` vars
2. **GitHub PAT** — `GITHUB_PAT` in `.env.local` (needs `public_repo` scope)
3. **Admin user** — Firebase Auth user with `admin: true` custom claim
4. **Pipeline auth** — `PIPELINE_AUTH_EMAIL` and `PIPELINE_AUTH_PASSWORD` in `.env.local`
5. **Taxonomy seeded** — `pnpm db:seed` (only needed once per environment)
6. **Firestore indexes deployed** — `firebase deploy --only firestore:indexes`

---

## Chain of Events (Step by Step)

### Step 1: Enqueue a Discover Job

**Option A — Admin UI (browser):**
1. Go to Admin > Pipeline tab
2. Enter GitHub username in "Scan Developer" (e.g., `user:brownbull`)
3. Set limit (max repos to discover)
4. Click "Scan"

**Option B — CLI:**
```bash
pnpm scan discover --query "user:brownbull" --limit 100
```

This creates a single `discover` job in the `scan_jobs` Firestore collection.

### Step 2: Start the Worker

```bash
node --env-file=.env.local --import tsx src/pipeline/index.ts worker
```

Or simply:
```bash
pnpm scan worker
```

> The worker polls Firestore every 10 seconds for pending jobs.

### Step 3: Discover Phase (Automatic)

The worker picks up the discover job and:
1. Queries GitHub API for the user's repositories
2. Deduplicates against existing repos in Firestore
3. Stores each repo in the `repositories` collection
4. Enqueues one `scan-repo` (Layer 1) job per repo

**Result:** N repositories stored, N Layer 1 jobs created.

### Step 4: Layer 1 — Shallow Analysis (Automatic)

For each repo, the worker:
1. Shallow-clones the repo (`--depth 1`)
2. Detects languages, frameworks, tools from `package.json`, file extensions, configs
3. Stores detected `skillTags` on the repository doc
4. Creates/updates the candidate profile with aggregated skills
5. Computes `skillScore` (0-100)
6. Enqueues a Layer 2 job for the same repo

**Result:** Candidate profile created, skill score calculated.

### Step 5: Layer 2 — Deep Analysis (Automatic)

For each repo, the worker:
1. Full-clones the repo (entire history)
2. Analyzes commit history (count, time span, ownership)
3. Detects test files and estimates coverage level
4. Scans for AI signals (CLAUDE.md, copilot configs, co-authored-by patterns)
5. Updates repository and candidate docs with deep metrics
6. Recalculates `skillScore`

**Result:** Full candidate profile with commit history, test metrics, AI signals.

### Step 6: Review Results

- **Search page:** Select taxonomy facets to find the candidate
- **Admin > Candidates tab:** See all candidates with scores
- **Candidate profile:** Full detail view with skills, repos, AI signals
- **Admin > Queue tab:** Monitor job status (All/Pending/Running/Completed/Failed)

---

## Complete Timeline (Typical)

| Phase | Duration | Jobs |
|-------|----------|------|
| Discover | ~10s | 1 job |
| Layer 1 (all repos) | ~15-20 min | 1 per repo |
| Layer 2 (all repos) | ~30-45 min | 1 per repo |
| **Total for ~76 repos** | **~50-70 min** | ~153 jobs |

---

## Monitoring

### Admin UI (Queue Tab)
- Filter by status: All / Pending / Running / Completed / Failed
- Each job shows: type, target repo link, status + duration, attempts, error
- Actions: Cancel (pending/running), Retry (failed), Dismiss (failed)

### CLI
```bash
pnpm scan status
```

---

## Error Recovery

| Error | What Happens | Action |
|-------|-------------|--------|
| GitHub rate limit | Job paused with `rateLimitedUntil` | Worker auto-retries after window |
| Empty repo (no commits) | Job fails after 3 attempts | Expected — dismiss in UI |
| Network error | Exponential backoff retry (2^n min) | Usually self-heals |
| Worker killed mid-job | Job stuck in "running" | Restart worker — or cancel + retry in UI |

---

## Current Architecture: Local Worker

```
Browser (Admin UI)
  |
  | enqueues jobs (writes to Firestore)
  v
Firestore (scan_jobs collection)
  ^
  | polls every 10s
  |
Local Machine (pnpm scan worker)
  |
  | clones repos, runs analysis
  | writes results back to Firestore
  v
Firestore (repositories, candidates, taxonomy)
```

**Why local?**
- Git clone operations need disk space and network bandwidth
- No cold-start delays (worker is always warm)
- Simple — no cloud infrastructure to manage
- Good enough for MVP / small-to-medium scale

**What this means in practice:**
- Someone must run `pnpm scan worker` on a machine for jobs to process
- If no worker is running, jobs sit in "pending" indefinitely
- Multiple workers can run simultaneously (they won't conflict — each claims one job at a time)

---

## Production Path (Future)

The current architecture is designed for easy migration to cloud:

### Option 1: Always-On VM / VPS
- Deploy worker to a small VM (e.g., GCP Compute Engine, DigitalOcean)
- Run as a systemd service or Docker container
- Same code, same `pnpm scan worker` command
- Cost: ~$5-15/month for a small instance

### Option 2: Cloud Run Jobs (Recommended)
- Package worker as a Docker container
- Trigger via Pub/Sub on Firestore `scan_jobs` writes
- Each job runs in its own Cloud Run instance
- Auto-scales with demand, pay per use
- No code changes needed — same handlers

### Option 3: Firebase Cloud Functions (Limited)
- Cloud Functions have a 9-minute timeout (540s)
- Layer 2 jobs on large repos could exceed this
- Better suited for the discover phase only
- Not recommended for scan-repo jobs

### What Would Change for Cloud Deployment
1. **Environment variables** — set in cloud provider instead of `.env.local`
2. **Dockerfile** — package the worker as a container
3. **Trigger mechanism** — Pub/Sub instead of polling (optional optimization)
4. **No code changes** — same `src/pipeline/` code runs everywhere
