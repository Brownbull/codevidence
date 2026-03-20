---
stepsCompleted: [step-01-init, step-02-discovery, step-02b-vision, step-02c-executive-summary, step-03-success, step-04-journeys, step-05-domain, step-06-innovation, step-07-project-type, step-08-scoping, step-09-functional, step-10-nonfunctional, step-11-polish]
inputDocuments:
  - ideas/planning/candidate-skill-scanner/idea.md
  - ideas/planning/candidate-skill-scanner/next-steps.md
workflowType: 'prd'
briefCount: 1
researchCount: 0
brainstormingCount: 0
projectDocsCount: 0
classification:
  projectType: web_app
  domain: developer-tooling/hr-tech
  complexity: high
  projectContext: greenfield
author: Gabe
date: 2026-02-18
---

## Executive Summary

**candidate-skill-scanner** is a web application that surfaces developer talent by analysing public repositories — replacing self-reported CVs with verifiable, commit-level evidence of real work. It serves two primary users: **recruiters** screening candidates at scale, and **project leads** searching for developers who have already built the specific architecture or patterns they need to implement.

The system operates in two decoupled phases: an async **scan phase** that ingests public profiles, analyses repositories at multiple depths, and stores enriched candidate profiles; and a fast, interactive **match phase** that queries the stored pool against a structured skill selection and returns ranked results. This separation ensures the UI remains responsive regardless of API rate limits or ingestion volume.

The core thesis: **you can't fake a commit history.** In a landscape where CVs are optimised for automated filters rather than truth, and where the best developers frequently undersell themselves in writing, public repositories are the most reliable, tamper-proof signal of actual capability that exists.

### What Makes This Different

candidate-skill-scanner doesn't search by keyword — it searches by **implementation**. A recruiter finds a developer who has *already built* the exact system architecture they're hiring for, without that developer having listed it on a CV. This is the differentiation moment: discovering hidden talent through what people actually ship.

The product introduces a novel **Developer AI Maturity Model** — an independent scoring dimension, separate from the Skill Score, classifying how sophisticatedly a candidate uses AI tooling:

| Level | Signal |
|---|---|
| 0 | No AI signals |
| 1 | Autocomplete (Copilot-style) |
| 2 | Vibe coding (AI-generated blocks, shallow ownership) |
| 3 | Agent coding (single agent, human-directed) |
| 4 | Multi-agent orchestration |
| 5 | Configured/constrained agents (hooks, rules, skills, safeguards) |

This maturity score is **3-dimensional**: level (what kind of AI tooling), origin (built from scratch vs. copied), and evolution (static since introduction vs. actively iterated over time). Every candidate surfaces two independent scores — **Skill Score** and **AI Maturity Score** — which users weight themselves per search query.

## Project Classification

- **Project Type:** Web application (SPA)
- **Domain:** Developer tooling / HR tech
- **Complexity:** High — async job queues, rate-limit-aware ingestion, multi-layer skill inference, novel AI maturity scoring model, source-agnostic architecture
- **Project Context:** Greenfield
- **Primary sources:** GitHub (v1), extensible to GitLab, Bitbucket, and others

## Success Criteria

### User Success

**Recruiter:** Success is finding candidates that cannot be found on LinkedIn — qualified developers whose skills are proven through repository and commit analysis, not self-reported. The system surfaces evidence automatically; no manual profile-digging required.

**Project / Team Lead:** Success is finding a developer with *actual commit history* related to the architecture or patterns they need — not claimed experience. The profile shows real code changes, real project ownership, real evolution of work over time.

**The "aha" moment:** A user finds a candidate who has already built the exact system or pattern they're hiring for — in a side project, with no CV entry for it. That discovery is only possible through this system.

### Business Success

Personal-utility-first project. Success at 3 months is Gabe using the system to fill open positions — specifically roles requiring software developers, software engineers, software architects, lead software engineers, and AI software engineers. External users are welcome but not required for v1 success.

### Technical Success

- System scans and stores enriched profiles for 200+ GitHub users
- Given a skill selection, system returns at least 5 candidates with demonstrably matching qualifications
- Candidate profiles contain rich context nodes (commit signals, AI tooling traces, evolution data) sufficient for manual AI maturity evaluation via Claude Code
- Async scan pipeline handles GitHub API rate limits without blocking the UI
- Admin can manually assign AI Maturity Scores via Admin UI; ground truth accumulates for future automated scoring

### Measurable Outcomes

- End-to-end flow works: structured faceted search → ranked candidate list with evidence
- At least 5 credible matches returned for a software engineering skill selection against a pool of 200 scanned candidates
- Candidate profile view shows verifiable evidence (repos, detected skills, commit signals) — not assertions
- AI Maturity Score visible as an independent dimension on every profile
- Scan pipeline runs async and recovers gracefully from rate limiting

## User Journeys

### Journey 1: The Recruiter — Finding What LinkedIn Can't Surface

**Meet Sarah.** She's a technical recruiter at a mid-sized software consultancy. She has three open positions for senior Python backend engineers and a stack of 200+ LinkedIn applications — 80% with virtually identical CVs optimised to pass keyword filters. She's drowning in noise and deeply skeptical that the best candidates are even applying.

*She opens candidate-skill-scanner.*

The search interface presents structured category panels. Sarah works through them deliberately: under **Languages** she selects Python. Under **Frameworks** she selects FastAPI and SQLAlchemy. Under **Tools** she selects Docker and PostgreSQL. Under **AI Maturity** she leaves it open — she doesn't have a requirement there yet.

She hits search. In under 30 seconds she has a ranked list of 14 GitHub users whose repositories *demonstrate* those skills through actual code — not self-reported, not keyword-matched against a CV.

She clicks the third result — a developer she's never heard of, no LinkedIn presence, sparse CV. His profile shows: 4 Python repos with FastAPI and PostgreSQL, test coverage above 70%, a Docker-composed deployment setup, commits spanning 18 months showing consistent complexity growth. His AI Maturity Score is displayed separately: Level 3.

Sarah has never seen this person anywhere. He hasn't applied. But he's already built what she's hiring for.

She shortlists him. End of week she has three credible candidates she couldn't have found any other way.

**Capabilities revealed:** Structured faceted search UI with category panels (Languages, Frameworks, Tools, AI Maturity, etc.), ranked results list, Skill Score + AI Maturity Score as independent visible dimensions, candidate profile view with evidence basis.

---

### Journey 2: The Project Lead — Matching Architecture, Not Keywords

**Meet Daniel.** He's a lead engineer at an AI-native startup building an orchestration layer for multi-agent pipelines. He needs someone who has *actually built and managed* agent workflows in real code — not someone who listed "LangChain" on their CV.

*He opens candidate-skill-scanner.*

Daniel goes straight to the **AI Agent Usage Patterns** category. He selects: multi-agent orchestration, agent hooks, rules file configuration. Under **AI Maturity Level** he sets the minimum to Level 4. Under **Tools** he selects Claude and Cursor. He ignores Languages entirely — irrelevant to what he needs.

Results come back sorted by AI Maturity Score descending by default. Two candidates at Level 4, one at Level 5.

He clicks the Level 5 candidate. The profile shows: a `CLAUDE.md` with 23 commits over 6 months — iteratively built, not copied. Custom hook scripts. A rules file evolved from 3 entries to 47. Commit messages referencing agent task outcomes. This person doesn't just *use* AI agents — they *architect around them*.

Daniel has found his hire. In 8 minutes.

**Capabilities revealed:** AI Agent Usage Patterns as a top-level search category, minimum AI Maturity Level filter, sort by AI Maturity Score, profile showing config file evolution over time, origin vs. evolution signals on agent configs.

---

### Journey 3: The Scan Pipeline — Background Work That Makes Everything Possible

**This is the system's own story.** It runs without a human watching.

Gabe deploys a fresh instance and runs: `scan discover --query "python fastapi postgresql" --source github --limit 500`. The pipeline wakes up.

It queries the GitHub Search API, extracts contributor profiles, deduplicates against the existing store, and enqueues 312 new usernames for scanning. The rate-limit-aware job queue processes them safely under the authenticated API limit.

For each user, it fetches public repos, reads package files and language breakdowns (Layer 1), then queues deeper analysis for repos above a complexity threshold (Layer 2). It generates a structured context profile — commit signals, AI tooling traces, config file presence, repo ownership patterns — and maps detected signals to the taxonomy: known frameworks get tagged, unknown ones get flagged for taxonomy expansion.

When the queue drains, 289 new candidate profiles are in the database. The taxonomy has grown: two previously unseen frameworks detected in the wild have been added as selectable categories. The next time a recruiter searches, those candidates are instantly available and those new categories are selectable.

**Capabilities revealed:** CLI-triggered discovery, GitHub Search API integration, deduplication, rate-limit-aware async queue, Layer 1 + Layer 2 scanning, structured context profile storage, automatic taxonomy expansion from detected signals, async operation that never blocks the UI.

---

### Journey 4: The Edge Case — When The Pool Comes Up Short

**Back to Sarah.** She's searching for a Rust engineer with embedded systems experience. She selects from the categories: **Languages → Rust**, **Tools → embedded, tokio**, **Frameworks → async runtime**. Three results. Two marginal, one already in her pipeline.

The results page shows clearly: *"3 candidates found matching these criteria. Pool coverage for this skill combination is limited."* A suggested CLI command is surfaced: `scan discover --query "rust embedded async tokio" --source github --limit 200`.

She passes it to Gabe. He runs it. 6 hours later she re-runs the same structured search. 11 new candidates. Two strong matches.

**Capabilities revealed:** Graceful thin-results state with pool coverage feedback, CLI command generation surfaced in UI, re-runnable structured searches against an updated pool.

---

### Journey Requirements Summary

| Capability | Revealed By |
|---|---|
| Structured faceted search UI (Languages, Frameworks, Tools, AI Maturity, AI Agent Patterns) | Journeys 1 + 2 |
| Curated seed taxonomy, auto-expanded from scan signals | Journeys 1 + 2 + 3 |
| Ranked results with independent Skill Score + AI Maturity Score | Journeys 1 + 2 |
| Candidate profile: repos, detected skills, evidence basis | Journey 1 |
| Profile: config file evolution, commit depth, origin signals | Journey 2 |
| Minimum AI Maturity Level filter + sort by AI Maturity | Journey 2 |
| CLI-triggered discovery (broad + targeted) | Journeys 3 + 4 |
| Rate-limit-aware async job queue | Journey 3 |
| Layer 1 + Layer 2 scanning pipeline | Journey 3 |
| Structured context profile storage with taxonomy mapping | Journey 3 |
| Graceful thin-results state with CLI command generation | Journey 4 |
| Re-runnable searches against updated pool | Journey 4 |

## Domain-Specific Requirements

### Scan Pipeline Architecture — Repo-First Model

The scan pipeline is **repo-first, not user-first**. This is an architectural decision with ToS, performance, and signal-quality implications:

1. **GitHub API → repo discovery + shallow metadata** (minimal API calls, ToS-safe)
2. **Interesting repos → cloned locally** based on surface signals (language, topic, activity)
3. **All deep analysis runs on local clones** — commit history, code diffs, complexity, AI tooling traces, config file evolution
4. **Candidates/users are derived from repos** — not the starting point for ingestion

The heavy analytical work never burdens the GitHub API. Local compute and storage are required for repo cloning and analysis. The candidate record is an *output* of repo analysis, not an input to it.

### GitHub API Usage — Constraints & Compliance

- GitHub API used only for repo discovery and shallow metadata retrieval
- Authenticated access (PAT) required for 5,000 req/hr limit; unauthenticated limit (60 req/hr) is insufficient for meaningful operation
- Rate-limit-aware job queue required to stay within authenticated limits
- Deep analysis performed locally on cloned repos — no API burden for commit history, diffs, or file content analysis
- This model is ToS-safe: public data accessed via official API at permitted rates; local cloning of public repos is explicitly permitted

### Developer Privacy

- All data analysed is publicly available — no private repos, no authenticated user data beyond public profiles
- Derived candidate profiles are stored internally and surfaced to authenticated search users only
- **MVP position:** No candidate opt-out mechanism. Personal tool; privacy infrastructure deferred to growth stage.
- **Growth stage:** Revisit opt-out, transparency disclosure, and candidate notification model when the product has a public-facing presence or multiple users.

### Data Freshness & Staleness

- Every candidate profile carries a `last_scanned` timestamp, visible on results list and profile view
- Profiles not rescanned in 90+ days are visually flagged as potentially stale
- **MVP:** Manual rescan triggerable via CLI (`scan rescan --user <username>` or `scan rescan --repo <repo>`) or Admin UI
- **Growth:** Scheduled periodic re-scanning with configurable interval per candidate or globally

### Technical Constraints

- Local storage required for cloned repos during analysis (temporary clone → analyse → optionally retain or purge)
- Local compute must support concurrent repo analysis without exhausting disk or memory
- Architect to determine: ephemeral clones (clone → analyse → delete) vs. persistent local repo cache
- Source-agnostic architecture required from day one — GitHub is v1, but GitLab, Bitbucket, and others must be addable without redesigning the core pipeline

## Innovation & Novel Patterns

### Detected Innovation Areas

**1. Developer AI Maturity Model — A New Category of Developer Signal**

A codified, automatically-detectable, time-dimensional framework for classifying how sophisticatedly a developer uses AI tooling. The model has three independent axes:
- **Level** (0–5): from no AI signals through autocomplete, vibe coding, agent coding, multi-agent, to configured/constrained agents
- **Origin**: built from scratch vs. copied from known templates or other repos
- **Evolution**: static since introduction vs. actively iterated and modified over time

The core scoring insight: **use + modification = high maturity signal**. A config copied and never touched signals utility-level awareness. A config copied then modified 23 times over 6 months signals comprehension and architectural ownership. This dimension does not exist as a detectable signal in any known recruiting or developer analytics tool.

**2. Repo-First Talent Discovery**

The ingestion model inverts the traditional recruiting paradigm. Instead of starting with people and checking their work, the system starts with *work* and derives the people. Candidates are an output of repo analysis, not an input. GitHub API is used only for repo discovery and shallow metadata; all deep analysis runs locally on cloned repos. This is both architecturally novel and ToS-safe.

**3. Implementation-First Search via Living Taxonomy**

Search is structured around what candidates have *actually built* — not what they claim. A curated seed taxonomy (Languages, Frameworks, Tools, AI Agent Patterns, AI Maturity) is automatically expanded as new signals are detected during scanning. The search vocabulary evolves with the developer ecosystem without manual curation of every new framework or tooling pattern.

### Competitive Landscape

**No known direct competitors.** Existing tools in adjacent spaces:
- **LinkedIn / traditional ATS**: CV-based, self-reported, keyword-filtered — the exact problem this product solves against
- **GitHub search**: raw keyword/topic search with no skill inference, no scoring, no candidate profiling
- **Sourcegraph / code search tools**: code discovery, not talent discovery
- **HireEZ, SeekOut, similar**: some GitHub profile enrichment, but shallow — language percentages at best, no commit analysis, no AI maturity dimension, no repo-first ingestion

The AI Maturity Model and repo-first ingestion are genuinely uncharted. No tool has automated the translation from public work to verifiable developer signal.

### Validation Approach

**AI Maturity Scoring — checklist-based core logic (MVP):**
- Detect AI tools present in the repo ecosystem (co-authored-by trailers, attribution comments, config files, known tooling patterns)
- For each detected tool: was it modified after initial adoption? Modification requires understanding; copy-paste does not
- Score basis: number of AI tools detected + evidence of modification per tool + evolution over time (commit frequency on AI-related files)
- MVP: not fully formalised — logic emerges from ground-truth generation via the bootstrap approach below

**Ground Truth Bootstrap:**
1. Identify repos with clear AI tooling signals via scan pipeline
2. Clone locally
3. Admin evaluates with Claude Code — reads the repo, assesses AI maturity level interactively
4. Admin assigns score manually via Admin UI
5. Accumulated assessments calibrate and refine the scoring model iteratively

The manual Claude Code evaluation path is both the MVP scoring mechanism *and* the mechanism for making future automated scoring accurate.

**Growth stage:** Automated scoring paths (LLM API + deterministic algorithm) built from accumulated manual ground truth.

### Risk Mitigation

**Risk: AI maturity scoring produces noisy scores in v1**
- Mitigation: AI Maturity Score labeled with bootstrap status in UI; manual evaluation path is the fallback; score improves as ground truth accumulates. Product has full value without AI maturity scoring — Skill Score and repo evidence alone are the core thesis.

**Risk: No known competitors = unvalidated market**
- Mitigation: Built for personal use first — Gabe is the primary validator. Personal utility is the MVP success bar. External validation is a Growth-stage concern.

**Risk: Repo-first model produces noisy candidate derivation**
- Mitigation: Shallow signal filtering before cloning — only repos above a relevance/activity threshold get deep-scanned; candidate quality is bounded by discovery query quality; CLI allows targeted re-discovery with refined queries.

## Project Scoping & Phased Development

### MVP Strategy & Philosophy

Personal utility first — prove the core thesis end-to-end. The minimum viable version lets Gabe find real candidates for open positions by scanning GitHub repos, generating rich candidate profiles, and supporting manual AI maturity evaluation via Claude Code. If this works for Gabe's own hiring needs, the concept is validated.

**Core thesis test:** Scan 200+ GitHub users derived from interesting repos → structured search returns 5+ credible matches for a software engineering skill selection → candidate profiles contain verifiable repo evidence.

**Resource Requirements:** Solo developer (Gabe), no team dependencies, no revenue targets for MVP.

### MVP Feature Set (Phase 1)

**Core User Journeys Supported:**
- Recruiter structured faceted search → ranked results → candidate profile view
- Project lead AI maturity-filtered search → profile deep-dive
- Admin pipeline management via Admin UI + CLI
- Underserved query auto-flagging → admin triggers targeted discovery

**Must-Have Capabilities:**

*Scan Pipeline:*
- GitHub API repo discovery (shallow metadata, ToS-safe)
- Repo relevance filtering before cloning
- Local repo cloning for deep analysis
- Layer 1 scanning: language detection, framework/library identification from package files
- Layer 2 scanning: code pattern analysis — test coverage signals, project structure, complexity, ownership vs. contribution
- AI tooling signal extraction: config file detection, co-authored-by trailers, attribution patterns, config file evolution over time
- Rich candidate context profile generation — structured nodes covering commit signals, AI tooling traces, config evolution, repo complexity — scoring-method-agnostic
- Deduplication against existing candidate store
- Rate-limit-aware async job queue
- `last_scanned` timestamp on every profile

*AI Maturity Scoring (MVP — manual path only):*
- Context profile generated and stored
- Admin reviews profile + clones repo locally → evaluates with Claude Code interactively
- Admin manually assigns AI Maturity Score (Level 0–5) via Admin UI
- No automated LLM API scoring, no deterministic algorithm in MVP — human-in-the-loop only
- Workflow accumulates ground truth for future automated scoring

*Taxonomy:*
- Curated seed taxonomy shipped with product (Languages, Frameworks, Tools, AI Agent Patterns, AI Maturity Level)
- Auto-expansion: new signals detected during scanning flagged for taxonomy addition

*Matching Engine:*
- Structured faceted search against stored candidate profiles
- Skill Score derived from Layer 1 + Layer 2 analysis
- AI Maturity Score displayed (manually assigned by admin)
- Both scores independently sortable/filterable
- Underserved query auto-flagging (< 10 results → stored + flagged)

*Web UI — Search:*
- Structured faceted search with category panels
- Results list: ranked candidates, Skill Score + AI Maturity Score, `last_scanned` visible
- Stale profiles (90+ days) visually flagged
- Thin-results state with underserved query acknowledgment
- Candidate profile view: repos, detected skills, AI tooling signals, config evolution, evidence basis

*Web UI — Admin:*
- Protected `/admin` route, admin-role only
- Scan pipeline management: trigger discovery runs (query/source/limit configurable)
- Job queue monitoring: queued, running, completed, failed
- Flagged/underserved query list: view + trigger targeted discovery runs
- Repos-of-interest queue: flagged repos and candidate profiles with labels and signals for manual Claude Code evaluation
- Candidate pool overview: total count, coverage by skill/taxonomy
- One-by-one rescan trigger per candidate or repo
- Candidate profile edit: manually assign/update AI Maturity Score

*Authentication:*
- Firebase Auth with Google Sign-In
- Admin role via Firebase custom claims, granted via CLI only
- No unauthenticated access

*CLI:*
- `scan discover` — trigger discovery run
- `scan rescan` — rescan specific candidate or repo
- `scan status` — pipeline/queue status
- Firebase admin role grant command

### Post-MVP Features (Phase 2 — Growth)

- **Automated AI Maturity Scoring — LLM API path:** context profile → Claude API → AI Maturity Score returned automatically
- **Automated AI Maturity Scoring — deterministic path:** rules/model derived from accumulated manual assessments
- **Both paths comparable:** outputs logged and diffed against manual ground truth
- **Layer 3 deep scanning:** AI agent fingerprinting, commit attribution analysis from actual code deltas, behavioral signals
- **Progressive scanning:** basic scan for pool presence, deep scan triggered on selected candidates
- **Cross-repo similarity detection:** curated known-template library + cross-repo similarity indexing for copy-paste detection
- **Batch rescan with filters:** e.g. "re-scan all Python candidates last scanned > 30 days ago"
- **Scheduled periodic re-scanning:** configurable interval, global or per-candidate
- **Multiple job description input formats and templates** (CLI/admin only)

### Phase 3 — Vision (Expansion)

- Multi-source ingestion: GitLab, Bitbucket, personal portfolio sites — source-agnostic architecture
- Multi-user / team access with per-search AI maturity weighting configurations saved
- Candidate pipeline management (shortlist, status tracking, notes)
- Public candidate opt-in / profile claiming with transparency disclosure
- AI maturity benchmark comparisons across full candidate pool
- Candidate notification / opt-out model

### Risk Mitigation Strategy

**Technical Risk: Repo-first pipeline complexity**
Local cloning + deep analysis is non-trivial infrastructure. Mitigation: start with a small pool (50 repos), validate the full pipeline end-to-end before scaling to 200+. Complexity threshold for "interesting repo" filtering keeps early scan costs manageable.

**Technical Risk: AI Maturity Score quality in MVP**
Manual scoring is labour-intensive and doesn't scale. Mitigation: intentional — manual ground truth is more valuable than noisy automated scores. MVP is not about scale; it's about getting the signal right. Automation comes when the signal is validated.

**Market Risk: Unvalidated concept**
No known competitors = no proven demand. Mitigation: Gabe is the primary validator. Personal utility is the success bar for MVP. External validation is a Phase 2 concern.

**Resource Risk: Solo developer**
No team dependencies, no external deadlines. Mitigation: strict MVP scope, no scope creep into Phase 2 features during Phase 1 build.

## Web Application Specific Requirements

### Project-Type Overview

candidate-skill-scanner is a **Single Page Application (SPA)** with client-side routing. It is a tool-first, results-focused web app — not a public marketing site. All data displayed is pre-computed and stored; the UI is a query and display layer over the candidate database. The SPA contains two primary sections: the **Search UI** (all authenticated users) and the **Admin UI** (admin-role users only).

### Technical Architecture Considerations

**Rendering & Routing:**
- SPA with client-side routing
- No server-side rendering required — all data served via API from stored candidate profiles
- No SEO requirements — not a public-facing or indexable surface
- Admin section at a protected route within the SPA (`/admin`) — same app, separate route, role-gated

**Browser Support:**
- Chrome only — no cross-browser compatibility requirements for MVP
- No mobile/responsive design requirements for MVP

**Real-Time:**
- No real-time requirements — all search results query the stored candidate database
- Scan pipeline status in Admin UI reads from stored job queue state (polled or on-demand, not live-streamed)
- No WebSockets, SSE, or live polling required for MVP

### Authentication & Authorization

- **Provider:** Firebase Authentication with Google OAuth (Google Sign-In)
- **Scope:** Any user can register via Google Auth; admin role is NOT self-assignable
- **Admin provisioning flow:**
  1. User registers via Google Sign-In (Firebase Auth)
  2. Operator runs CLI command to grant admin role on Firebase (sets a custom claim on the Firebase user record)
  3. User has admin access on next sign-in
  - No self-service admin registration — intentionally gated, no UI-based role elevation
- **Access model:**
  - Authenticated non-admin users: Search UI only
  - Authenticated admin users: Search UI + Admin UI
  - Unauthenticated users: no access

### Search UI Requirements

- Structured faceted search with category panels (Languages, Frameworks, Tools, AI Maturity Level, AI Agent Usage Patterns)
- Taxonomy categories: curated seed list + auto-expanded from scan signals
- Results list: ranked candidates with Skill Score + AI Maturity Score as independent visible columns
- Results sortable/filterable by Skill Score, AI Maturity Score, `last_scanned` date
- Candidate profile view: repos, detected skills, AI tooling signals, config file evolution, evidence basis
- `last_scanned` timestamp visible on results list and candidate profile view
- Stale profiles (not rescanned in 90+ days) visually flagged

### Underserved Query Detection & Flagging

When a search query returns fewer than 10 results:
- Query is **automatically stored and flagged** as underserved
- UI surfaces the thin-results state: result count shown, underserved status acknowledged, suggested CLI discovery command surfaced
- Flagged queries visible in Admin UI for actioning — admin can trigger targeted discovery runs directly from the flagged query list
- Closes the feedback loop between thin search results and targeted pool expansion

### Admin UI Requirements

Protected section of the SPA (`/admin` route), admin-role users only. Provides interactive day-to-day management of the scan pipeline and candidate pool.

**Pipeline & Discovery Management:**
- Trigger discovery runs with configurable parameters (query, source, limit)
- View and action flagged/underserved queries — trigger targeted discovery runs from the flagged query list
- Monitor job queue status: queued, running, completed, failed jobs
- View scan pipeline health and throughput

**Candidate Pool Management:**
- Overview of scanned candidates: total count, coverage by skill/taxonomy category
- Trigger discovery/scanning for additional candidates
- Trigger rescan on a specific candidate or repo (one-by-one; batch rescan is a Growth feature)
- View candidates with stale profiles

**AI Maturity Evaluation Workflow:**
- Repos-of-interest queue: flagged repositories and candidate profiles with labels and signals, for identification of repos to clone locally for manual Claude Code evaluation
- Candidate profile edit: manually assign or update AI Maturity Score (Level 0–5)

**Role Management (CLI only — not in Admin UI):**
- Admin role granted via CLI command against Firebase custom claims
- No UI-based role management in MVP — intentional security gate

### CLI Interface

CLI coexists alongside the Admin UI — different use cases, both retained:
- **CLI use cases:** scripting, automation, batch operations, scheduled tasks, admin role provisioning, CI/CD hooks
- **Admin UI use cases:** interactive day-to-day management, monitoring, ad-hoc discovery triggers
- CLI commands: `scan discover`, `scan rescan`, `scan status`, Firebase admin role grant

### Accessibility

Best-effort for MVP — personal tool, no compliance requirement. Standard semantic HTML and keyboard navigability as baseline.

## Functional Requirements

### Candidate Discovery & Ingestion

- **FR1:** The system discovers GitHub repositories matching a configurable query (language, topic, keyword) via the GitHub Search API
- **FR2:** The system filters discovered repositories by surface-level relevance signals before cloning (activity, star count, language match, recency)
- **FR3:** The system clones qualifying repositories to local storage for deep analysis
- **FR4:** The system deduplicates discovered repositories and candidates against the existing stored pool
- **FR5:** The system derives candidate/user records from repository contributor data — candidates are outputs of repo analysis, not inputs

### Repository Analysis & Skill Extraction

- **FR6:** The system performs Layer 1 analysis on cloned repos: detect programming languages, identify frameworks and libraries from package files and dependency manifests
- **FR7:** The system performs Layer 2 analysis on cloned repos: analyse code structure, test coverage signals, project complexity, commit patterns, and ownership vs. contribution indicators
- **FR8:** The system detects AI tooling signals in cloned repos: presence of known AI config files (CLAUDE.md, .cursor/rules, etc.), co-authored-by commit trailers, AI attribution patterns in commit messages
- **FR9:** The system tracks evolution of AI config files over time: first-introduced date, number of modifications, diff complexity between first and current version
- **FR10:** The system generates a structured candidate context profile containing commit signals, AI tooling traces, config file evolution data, repo complexity indicators, and detected skills — stored in a scoring-method-agnostic format
- **FR11:** The system maps detected signals to taxonomy categories and flags previously-unseen signals for taxonomy expansion

### Candidate Profile Management

- **FR12:** Authenticated users can view a candidate profile showing detected skills, repositories analysed, AI tooling signals, config file evolution, Skill Score, AI Maturity Score, and `last_scanned` timestamp
- **FR13:** Admin users can manually assign or update an AI Maturity Score (Level 0–5) on a candidate profile
- **FR14:** Admin users can trigger a rescan of an individual candidate or repository
- **FR15:** The system visually flags candidate profiles where `last_scanned` exceeds 90 days as potentially stale

### Search & Matching

- **FR16:** Authenticated users can search the candidate pool using structured faceted search with category panels (Languages, Frameworks, Tools, AI Agent Usage Patterns, AI Maturity Level)
- **FR17:** Authenticated users can filter search results by minimum AI Maturity Level
- **FR18:** Authenticated users can sort search results by Skill Score, AI Maturity Score, or `last_scanned` date independently
- **FR19:** The system returns ranked search results with Skill Score and AI Maturity Score displayed as independent visible dimensions per candidate
- **FR20:** The system detects when a search query returns fewer than 10 results and automatically stores and flags that query as underserved
- **FR21:** The system displays a thin-results state when fewer than 10 results are returned, surfacing the underserved query status and a suggested CLI discovery command to the user

### Taxonomy Management

- **FR22:** The system ships with a curated seed taxonomy covering Languages, Frameworks, Tools, AI Agent Usage Patterns, and AI Maturity Levels
- **FR23:** The system automatically expands the taxonomy by adding newly detected signals (frameworks, tools, AI patterns) identified during repository scanning
- **FR24:** Authenticated users can browse and select from the full taxonomy in the search interface

### Authentication & Access Control

- **FR25:** Any user can register and sign in using Google Authentication via Firebase
- **FR26:** The system enforces role-based access: authenticated non-admin users access Search UI only; authenticated admin users access Search UI and Admin UI
- **FR27:** Admin role can only be granted via CLI command acting on Firebase custom claims — not via the web UI
- **FR28:** Unauthenticated users cannot access any part of the application

### Admin Pipeline Management

- **FR29:** Admin users can trigger a discovery run from the Admin UI with configurable parameters (query, source, limit)
- **FR30:** Admin users can view the job queue status (queued, running, completed, failed jobs) in the Admin UI
- **FR31:** Admin users can view and action flagged/underserved queries in the Admin UI, including triggering targeted discovery runs for specific underserved queries
- **FR32:** Admin users can view a candidate pool overview showing total candidate count and coverage distribution by skill/taxonomy category
- **FR33:** Admin users can trigger a rescan of an individual candidate or repository from the Admin UI
- **FR34:** Admin users can view a repos-of-interest queue in the Admin UI showing flagged repositories and candidate profiles with associated labels and signals, for identification of repos to clone locally for manual Claude Code evaluation

### Async Scan Pipeline & Infrastructure

- **FR35:** The system processes discovery and scanning jobs asynchronously via a background job queue, without blocking the web UI
- **FR36:** The system enforces rate-limit-aware pacing on GitHub API calls to stay within the authenticated API limit (5,000 req/hr)
- **FR37:** The system stores enriched candidate profiles persistently — scan once, query many times
- **FR38:** The system records a `last_scanned` timestamp on every candidate profile, updated on each rescan

### CLI Operations

- **FR39:** Operators can trigger a discovery run via CLI with configurable query, source, and limit parameters
- **FR40:** Operators can trigger a rescan of a specific candidate or repository via CLI
- **FR41:** Operators can query scan pipeline and job queue status via CLI
- **FR42:** Operators can grant admin role to a registered user via CLI by setting a Firebase custom claim

## Non-Functional Requirements

### Performance

- **NFR1 — Search Response Time:** Structured faceted search queries against the stored candidate pool return results within 2 seconds for a pool of up to 500 candidates. Search queries pre-computed profiles — no live API calls during query execution.
- **NFR2 — Candidate Profile Load Time:** Individual candidate profile views render within 1.5 seconds. All profile data is pre-stored; no on-demand computation at view time.
- **NFR3 — UI Responsiveness During Pipeline Activity:** The web UI remains fully responsive while background scan jobs are running. Scan pipeline activity must never block or degrade search or profile view interactions.
- **NFR4 — Job Queue Throughput:** The async scan pipeline processes at least 50 candidate profiles per hour under normal operating conditions (bounded by GitHub API rate limits, not system capacity).

### Security

- **NFR5 — Authentication Required:** No application surface is accessible without a valid Firebase Auth session. Unauthenticated requests to any route (including `/admin`) are redirected to login.
- **NFR6 — Admin Role Enforcement:** Admin-only routes and actions are enforced server-side via Firebase custom claims verification — not client-side route guards alone. A non-admin auth token must not access or invoke admin capabilities regardless of client-side state.
- **NFR7 — No Self-Service Role Escalation:** No code path exists through which a user can elevate their own role to admin via the web UI, API, or any application-level mechanism. Role grants are exclusively via CLI acting directly on Firebase.
- **NFR8 — Data Scope:** Only publicly available repository data is ingested and stored. No private repo access, no OAuth scopes beyond public profile and public repo read. GitHub PAT stored securely (environment variable or secret manager — never hardcoded).

### Scalability

- **NFR9 — Local Storage Headroom:** The system supports ephemeral local cloning of up to 50 concurrent repositories without exhausting local disk. Clones are temporary: analyse → extract → delete unless a specific retention policy is configured.
- **NFR10 — Candidate Pool Growth:** The system supports a stored candidate pool of at least 1,000 profiles without query performance degradation beyond the NFR1 threshold.
- **NFR11 — Job Queue Resilience:** Failed scan jobs do not crash the queue or block subsequent jobs. Failed jobs are logged with error context, retained in a failed state visible in the Admin UI, and retriable individually.

### Integration & Infrastructure

- **NFR12 — GitHub API Rate Limit Compliance:** The system never exceeds authenticated GitHub API rate limits (5,000 req/hr). Rate-limit-aware pacing is enforced at the job queue level. If rate limits are approached, jobs are throttled — not dropped or errored.
- **NFR13 — Firebase Auth Dependency:** The application depends on Firebase Authentication as the sole identity provider. Firebase outages or quota exhaustion may render login unavailable. No fallback auth path required for MVP — acceptable risk for a personal tool.
- **NFR14 — GitHub PAT Expiry Detection:** The system surfaces a clear error state in both Admin UI and CLI when a GitHub Personal Access Token expires or is revoked, rather than silently failing or producing empty discovery results.
- **NFR15 — Source-Agnostic Architecture:** GitHub integration is implemented behind a source adapter interface. Adding a second source (GitLab, Bitbucket) in a future phase must not require redesigning the core scan pipeline. No GitHub-specific assumptions embedded in the core domain layer.
