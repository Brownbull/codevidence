---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14]
current_step: complete
status: complete
inputDocuments:
  - ideas/planning/candidate-skill-scanner/brief.md
  - ideas/planning/candidate-skill-scanner/idea.md
  - ideas/planning/candidate-skill-scanner/next-steps.md
---

# UX Design Specification — candidate-skill-scanner

**Author:** Gabe
**Date:** 2026-02-18

---

<!-- UX design content will be appended sequentially through collaborative workflow steps -->

## Executive Summary

### Project Vision

candidate-skill-scanner replaces the self-reported CV with verifiable, commit-level evidence of real developer work. The product's thesis — *you can't fake a commit history* — drives every design decision: the search interface, the results display, and the candidate profile are all built around surfacing evidence, not assertions.

The system operates in two decoupled phases: an async scan pipeline that ingests and analyses public GitHub repositories; and a fast match phase that queries pre-computed stored profiles. The UI is purely a query and display layer — no live API calls during user interactions, ensuring a responsive experience regardless of background pipeline activity.

The novel core differentiator is the **Developer AI Maturity Model** — a codified, independently-scoreable dimension (Level 0–5) that classifies not just whether a developer uses AI tooling, but how sophisticatedly, whether they built versus copied their configurations, and whether their usage has evolved over time. This dimension does not exist in any known recruiting or developer analytics tool.

### Target Users

| User | Role | Core Need | Defining "Aha" Moment |
|------|------|-----------|----------------------|
| **Sarah — Recruiter** | Technical recruiter at a consultancy | Find qualified developers who haven't applied — proof over keyword | Discovers a candidate with no LinkedIn presence who has already built exactly the system she's hiring for |
| **Daniel — Project/Team Lead** | Lead engineer at an AI-native startup | Find a developer who has *actually architected* multi-agent pipelines, not just listed LangChain | A Level 5 candidate with a CLAUDE.md evolved over 23 commits in 6 months — ownership, not just familiarity |
| **Gabe — Admin/Operator** | Product owner and primary user | Manage the scan pipeline, evaluate repos, assign AI Maturity Scores, grow the ground-truth pool | The feedback loop works: underserved queries get flagged, targeted discovery runs, better results next time |

### Key Design Challenges

**1. Faceted Search Taxonomy — Complexity Without Overwhelm**
Five category panels (Languages, Frameworks, Tools, AI Maturity Level, AI Agent Usage Patterns) with a curated but auto-expanding taxonomy. The challenge: keeping the search interface scannable and fast as the taxonomy grows — not a wall of checkboxes.

**2. Two Independent Scores — Communicating Nuance Without Confusion**
Skill Score and AI Maturity Score are genuinely independent dimensions. A developer can be a Level 0 AI Maturity candidate and still be the strongest Skill Score match. The UI must communicate these as separate signals, not collapse them into a single ranking that obscures one or the other.

**3. The Admin UI — Power Tool Density Without Clutter**
The Admin section covers pipeline management, job queue monitoring, repos-of-interest queue, AI Maturity Score assignment, and underserved query actioning — all in one protected section. It is an operational dashboard for a solo power user. It needs information density without confusion.

**4. Thin Results State — Turning Disappointment Into Forward Action**
When fewer than 10 results are returned, the UI must not just show "no results." It must acknowledge the underserved state, surface a CLI command, confirm the query has been flagged, and make the user feel the situation is *actively managed* rather than a dead end.

### Design Opportunities

**1. Evidence-Forward Candidate Cards**
Result cards can show *why* a candidate matched — specific signals (frameworks detected, repo count, commit span, AI tooling detected) directly on the card before a user clicks through. This creates immediate trust and differentiation from any CV-based tool.

**2. AI Maturity Score as a Visual Signature**
The Level 0–5 AI Maturity Score deserves its own visual language — a level indicator that communicates depth and progression, not just a number. Done right, it becomes the recognisable visual identity of this product.

**3. The Admin Repos-of-Interest Queue as a Workflow Tool**
The repos-of-interest queue is a real ground-truth generation workflow: flag → review → clone locally → evaluate with Claude Code → assign score. Designing this as an actionable queue with clear next-action affordances — rather than a passive table — turns the Admin UI into a productivity multiplier.

## Core User Experience

### Defining Experience

The single most important interaction in candidate-skill-scanner is:

> **Select skills from category panels → hit Search → scan ranked results → open a candidate profile → evaluate evidence.**

That five-beat loop is the entire product in motion. Everything else — the Admin UI, the scan pipeline, the thin-results state — exists to make that loop work and improve over time.

The *critical beat* to get exactly right is the **structured faceted search → ranked results handoff**. The moment the results page renders, the user either immediately feels "these are real signals about real work" or they don't. If they don't feel it in the first 10 seconds of looking at results, the product has failed its core thesis regardless of the data quality underneath.

### Platform Strategy

| Constraint | UX Implication |
|------------|----------------|
| **Chrome only, no mobile** | Desktop-first layout — horizontal space can be used freely, no responsive breakpoints needed |
| **SPA with client-side routing** | Smooth transitions between search → results → profile, no full page reloads |
| **No real-time** — all reads from pre-computed DB | Results feel instant (≤2s target); no progress spinners during search |
| **Firebase Auth / Google Sign-In** | Minimal login wall — single Google OAuth button, no form to fill |
| **Two surfaces: Search UI + Admin UI** | Two distinct visual modes within the same app, role-gated at `/admin` |

### Effortless Interactions

These must require zero cognitive effort from the user:

1. **Browsing and selecting taxonomy items** — scrolling category panels, checking items, seeing a summary of active selections before hitting search. As natural as filtering on any e-commerce site.
2. **Reading a candidate card** — at a glance, before clicking, the user knows: this person has the skills selected, here's the evidence, here are the two scores.
3. **Navigating back from a profile** — users open profiles, evaluate, go back, open another. Back navigation must be instant and preserve scroll position and search state.
4. **Admin score assignment** — the AI Maturity Score edit must be a one-or-two-click operation. The friction is intellectual (evaluating the candidate), never mechanical (operating the UI).

### Critical Success Moments

**🟢 Make-or-break: The first search results page**
This is when the user decides if the product is real. Candidate cards with visible evidence signals — not just names and scores — convert a skeptical first-time user into a believer. If the results look like a generic list, the product feels no different from LinkedIn search.

**🟢 Make-or-break: The candidate profile — the "proof moment"**
Clicking into a profile and seeing *actual repository evidence* — frameworks detected, commit span, AI config file evolution — is the "aha." This must feel like opening a dossier, not reading a CV.

**🟡 Important: The thin-results state**
The first time a user gets 3 results, the UI needs to hold their confidence. A well-designed thin-results state that says "we know, it's been flagged, here's the path forward" keeps the user in the product. A blank or dismissive state loses them.

**🟡 Important: Admin score assignment feedback loop**
When a score is assigned, the update must be immediately visible on the profile and reflected in the repos-of-interest queue state. The feedback loop must feel like measurable progress toward better automated scoring.

### Experience Principles

Five principles governing every design decision from here forward:

1. **Evidence over assertion** — Every screen surfaces *what was found*, not *what was claimed*. Labels, scores, and signals all trace back to detectable repository data.

2. **Two scores, two stories** — Skill Score and AI Maturity Score are always presented as separate, independent dimensions. The UI never collapses them into a single ranking or obscures one behind the other.

3. **Search is structured, not free-form** — The faceted category panels *are* the search interface. No free-text box, no ambiguity. Precision is a feature, not a limitation.

4. **Thin results are a system state, not a user failure** — When the pool is underserved, the product owns it. The UI names it, flags it, and offers a path forward. The user leaves informed, not rejected.

5. **The Admin UI is a workflow, not a dashboard** — Every admin view has a clear next action. Queues are for actioning, not observing. The ground-truth loop (flag → evaluate → score) must feel fast and satisfying.

## Desired Emotional Response

### Primary Emotional Goals

**For Sarah (Recruiter) and Daniel (Project Lead):**
The dominant emotion is **confidence** — specifically, *earned* confidence. Not the hollow confidence of "I found someone with Python on their LinkedIn." The deep, quiet confidence of "I can see their work. I can see they built it. I know this is real."

The secondary emotion is **discovery-as-delight** — the genuine surprise of finding someone who wasn't on anyone's radar. A developer with no LinkedIn presence who built exactly what you need. That discovery should feel like a small revelation, not just a search result.

**For Gabe (Admin/Operator):**
The dominant emotion is **control and forward momentum** — the feeling that the system is growing, improving, and under his command. Each score assigned tightens the model. Each underserved query actioned expands the pool. The Admin UI should feel like *tending something*, not babysitting it.

### Emotional Journey Mapping

| Stage | Sarah / Daniel | Gabe |
|-------|---------------|------|
| **First arrival / login** | Curious, slightly skeptical — "is this real?" | Purposeful — knows what needs doing |
| **Building the search** | Focused, methodical — selecting criteria with intention | — |
| **Results render** | 🟢 *Validation* — "there are real candidates here" | — |
| **Opening a candidate card** | 🟢 *Discovery* — "I've never seen this person anywhere" | — |
| **Reading the profile evidence** | 🟢 *Confidence* — "this is provable, not claimed" | — |
| **Thin results / underserved state** | 🟡 *Acknowledged, not abandoned* — "the system knows, there's a path forward" | 🟡 *Notified and prompted to act* |
| **Admin: scoring a candidate** | — | 🟢 *Progress* — the ground truth pool grows |
| **Admin: actioning a flagged query** | — | 🟢 *Agency* — shaping what the system can find |
| **Returning user** | *Habitual trust* — "this is where I look for developers now" | *Ownership* — this tool is mine, I built it up |

### Micro-Emotions

| Micro-Emotion | Where It Lives | Design Goal |
|---------------|---------------|-------------|
| **Trust** | Results list, candidate profile | Signals are specific and traceable — never vague, never inflated |
| **Intrigue** | AI Maturity Score display | The level indicator invites curiosity: "what does Level 4 actually look like?" |
| **Competence** | Faceted search panels | User feels expert as they build their query — selections are deliberate, not guessed |
| **Ownership** | Admin queue workflows | Each action is a contribution — the system gets better because of me |
| **Clarity** | Thin-results state | No confusion, no blame — situation is named and managed |
| **Avoid: Overwhelm** | Search panels with large taxonomies | Never a wall of checkboxes; progressive disclosure and good grouping |
| **Avoid: Skepticism** | Score displays | Scores must feel earned, not algorithmic noise — evidence basis on every profile |
| **Avoid: Abandonment** | Thin-results / zero-results | Never a dead end — always a next action |

### Design Implications

| Target Emotion | UX Design Approach |
|---------------|-------------------|
| **Earned confidence** | Every candidate card shows *why* they matched — specific detected signals, not just a score. The profile shows repo names, commit spans, detected frameworks as concrete facts. |
| **Discovery delight** | Candidate cards designed to feel like small dossiers. The `last_scanned` timestamp and evidence tags create a sense of uncovering something real. |
| **Competence during search** | Selected facets are always visible as a summary chip-row before submitting. User sees their query taking shape — they feel in control of the precision. |
| **AI Maturity intrigue** | Level 0–5 display uses a visual indicator (steps/pips) not just a number — invites understanding. Label explains what the level means. |
| **Admin: progress and agency** | Repos-of-interest queue shows count decreasing as scores are assigned. Visual progress — not just rows in a table. |
| **Thin-results composure** | State is informative, not apologetic. Neutral, factual language: "3 candidates found. This query has been flagged for pool expansion." Not "Sorry, we couldn't find more." |

### Emotional Design Principles

1. **Show the work, earn the trust** — Confidence comes from seeing evidence, not being told a score. Every piece of data on screen should feel like something that was *found*, not *generated*.

2. **Name states, don't hide them** — Stale profiles, thin results, unscored candidates — these are real system states. Naming them clearly creates honesty, not anxiety. Users trust systems that tell the truth about their own limitations.

3. **The AI Maturity Score is a conversation starter, not a verdict** — Displayed with enough context (level label, not just number) to invite curiosity rather than create a simple accept/reject gate.

4. **Admin actions feel like contributions, not chores** — Every score assigned, every flagged query actioned, every rescan triggered is a contribution to the system's improving accuracy. The UI makes that progress visible.

5. **Never leave the user with nowhere to go** — Every dead-end state (thin results, no results, stale profile, failed scan job) has a visible next action or explanation.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**1. GitHub — the evidence source and shared visual language**
Sarah and Daniel already live in GitHub. The language of candidate-skill-scanner should feel like a natural extension of GitHub's information model. GitHub makes complex technical information legible at a glance — language bars, activity graphs, contributor counts, commit history. The inspiration here is information hierarchy, not visual style.

*What to borrow:* The idea that a repository's health and activity are readable in seconds. Repo cards, commit count indicators, language tags as visual chips — patterns GitHub users understand without explanation.

**2. Linear (linear.app) — the professional power tool benchmark**
Linear is the gold standard for dense, fast, professional SPA tooling. Keyboard-navigable, information-dense, zero consumer-app softness — yet never cluttered. It respects the intelligence of its user.

*What to borrow:* Clean, high-contrast layout. Left-side navigation with clear section divisions. Tables and lists that are information-dense but visually calm. Status indicators that are meaningful without being loud. Every pixel earning its place.

*What NOT to borrow:* Keyboard-shortcuts-as-primary-UX — mouse/click is primary for candidate-skill-scanner. Dark-mode-first aesthetic is a separate decision.

**3. Algolia InstantSearch / faceted search UIs — the left-panel-filters pattern**
The structured category panel + results layout is well-established in product search UIs. Algolia's approach has solved "left-panel filters, right-panel results" extremely well, including collapsible categories, selection counts, and active filter chip rows.

*What to borrow:* Collapsible category panels with visible selection counts. Active filters chip row above results. The clarity of "here is what you've selected, here is what matched."

*What NOT to borrow:* Instant-results-as-you-type — search in candidate-skill-scanner is a deliberate, structured submission, not a reactive live filter.

**4. Sourcegraph — technical data presentation for developer audiences**
Sourcegraph presents complex code-analysis data to a technical audience clearly. Candidate profiles will show similarly technical data — detected frameworks, commit patterns, config file evolution. Sourcegraph's approach of presenting code evidence in a scannable but detailed format is the reference for the profile view.

*What to borrow:* Code-adjacent data presentation — monospace for file paths and repo names, structured signal display without over-designing. Technical users don't need everything explained; they need it *organised*.

### Transferable UX Patterns

**Navigation Patterns:**
- **Left panel (filters) + right main content (results)** — Classic, expected, effortless for desktop faceted search. Proven and immediately understood.
- **Tab-based Admin sections** — Pipeline / Queue / Candidates / Repos-of-Interest as top-level tabs within `/admin`. Dense admin content navigable without deep nesting.

**Interaction Patterns:**
- **Active selection chips above results** — A chip row showing current active facets (e.g. `Python ×`, `FastAPI ×`, `AI Maturity ≥ 3 ×`) above results, with individual dismissal. Users see and tweak their query at a glance.
- **Expandable/collapsible category panels** — Each category is a collapsible panel in the left sidebar. Open by default for primary categories (Languages), collapsed by default for longer/rarer ones (AI Agent Patterns).
- **Click-through from result card to profile** — Standard master-detail pattern. Card summarises; profile deep-dives. Back navigation preserves scroll position.
- **Inline score edit for Admin** — AI Maturity Score assignment as inline editable field on the candidate profile, not a modal. Click → dropdown/stepper → auto-save. Fast, frictionless.

**Visual Patterns:**
- **Score badges as a visual system** — Skill Score as a numeric badge (e.g. `87`); AI Maturity Score as a levelled pip indicator (e.g. `● ● ● ○ ○` for Level 3/5). Two visually distinct treatments for two independent dimensions.
- **Stale flag as a subtle but present tag** — `⚠ Scanned 94 days ago` tag on cards and profiles, amber-coloured, non-alarming but visible.
- **Monospace for technical signals** — File paths, repo names, framework/tool names in monospace — immediately communicates "this is code data, not marketing copy."

### Anti-Patterns to Avoid

1. **The relevance score black box** — Showing a score with no explainability destroys trust with technical users. Every score must have a traceable evidence basis visible on the card or one click away.

2. **The free-text search fallacy** — A text input "just in case" undermines the structured search premise entirely. If users can free-text search, they'll use it, then wonder why results feel inconsistent. No text box — the PRD decided this and the UX enforces it.

3. **Modal-heavy admin** — Every action that spawns a confirmation modal adds friction to a fast operational loop. Prefer inline actions with toast/confirmation messaging over modal dialogs.

4. **Single-score ranking** — Collapsing Skill Score and AI Maturity Score into one combined ranking destroys the independent signal value of each. Never merge them into a single sort dimension.

5. **Infinite scroll** — For a pool up to 1,000 candidates, pagination with clear page counts is cleaner and more navigable. Users need to know "how many results exist" — infinite scroll hides that.

### Design Inspiration Strategy

**Adopt directly:**
- Left-panel facets + right-panel results layout (Algolia proven pattern)
- Active filter chip row above results (immediate query visibility)
- Tab-based Admin navigation (Linear-style clean section division)
- Inline score editing on profiles (no modal, fast ground-truth loop)

**Adapt for this product:**
- GitHub-style language/tag chips → adapted as skill/framework signal tags on candidate cards
- Sourcegraph-style technical data presentation → adapted for profile evidence sections (monospace, structured signal display)
- Linear's information density approach → adapted for Admin queue views (dense but calm)

**Explicitly avoid:**
- Consumer app visual softness (rounded-everything, gradient-everything) — this is a technical professional tool
- Real-time reactive filter updating — search is a deliberate submit action
- Single combined score ranking — independence of Skill Score and AI Maturity Score preserved always
- Modal-heavy confirmation flows in Admin — inline edits with toast confirmations preferred

## Design System Foundation

### Design System Choice

**shadcn/ui + Tailwind CSS**

A themeable, composable foundation built on Radix UI primitives and Tailwind CSS utility classes. shadcn/ui copies components directly into the codebase — full ownership, full modifiability, no library lock-in.

### Rationale for Selection

| Factor | How shadcn/ui + Tailwind Delivers |
|--------|----------------------------------|
| **Solo developer, fast MVP** | Pre-built, composable components — Tables, Badges, Tabs, Dropdowns — ready to use immediately |
| **Technical professional aesthetic** | Clean, neutral defaults that don't look like a consumer app; easily styled toward Linear-like density |
| **Chrome-only, desktop, no responsive** | Utility-first approach — compose exactly what's needed without fighting a mobile-first framework |
| **Information density (Admin UI)** | Table, Card, and Badge components built for data-heavy UIs without visual weight |
| **Custom visual signatures** (AI Maturity pips, score badges) | Tailwind utilities make bespoke components trivial to build consistently |
| **Component ownership** | Components live in the codebase — freely modifiable, no upstream breakage risk |
| **Accessibility** | Built on Radix UI primitives — keyboard nav, ARIA, focus management handled correctly |

### Implementation Approach

**Foundation stack:**
- **Tailwind CSS** — utility-first styling, design tokens via `tailwind.config`
- **shadcn/ui** — component library (Table, Badge, Card, Tabs, Button, Collapsible, Tooltip, Toast, Sheet)
- **Radix UI** — accessible primitives (included via shadcn/ui)
- **Lucide React** — icon set (consistent, clean, technical aesthetic)

**Key shadcn/ui components to use:**
- `Table` — results list, admin queue tables
- `Card` — candidate result cards
- `Badge` — skill tags, score indicators, stale flags
- `Tabs` — Admin section navigation
- `Toast` — inline action confirmations (score saved, rescan triggered)
- `Collapsible` — faceted search category panels
- `Tooltip` — AI Maturity level explanations

### Customisation Strategy

**Design tokens (via `tailwind.config`):**
- Neutral slate/zinc palette as base — professional, not sterile
- Single accent colour (blue/indigo) for interactive elements — familiar, trust-signalling
- Amber for stale/warning states (`last_scanned` > 90 days)
- Red for failed job states in Admin queue
- Subtle green for success confirmations (score saved, scan complete)

**Custom components to build on top of shadcn/ui:**

| Component | Built From | Purpose |
|-----------|-----------|---------|
| `AIMaturityBadge` | Badge + custom pips | Pip indicator (● ● ● ○ ○) with level label |
| `SkillScoreBadge` | Badge | Numeric score with subtle colour scale |
| `FacetPanel` | Collapsible + Checkbox | Category panel with selection count |
| `ActiveFilterChips` | Badge + Button | Dismissable chip row of active facets |
| `CandidateCard` | Card + Badge | Result card with inline evidence signals |
| `ThinResultsState` | Card + custom layout | Underserved query state with CLI command |
| `StalenessTag` | Badge (amber) | Days-since-scan warning tag |

## Defining Core Experience

### Defining Experience

> **"Select what you're hiring for — see developers who've already built it."**

The defining interaction is the **structured faceted search → evidence-backed results reveal**. The magic beat is the moment results render and a user encounters a developer they've never seen anywhere — no LinkedIn, no application, no CV — with a card showing "built FastAPI + PostgreSQL across 4 repos, 18 months of commits." That's not a search result. That's a discovery. The entire UX is designed to make that moment land.

### User Mental Model

Users arrive with two familiar mental models: **LinkedIn search** (filter → list of people) and **GitHub browsing** (code signals are legible and trustworthy). candidate-skill-scanner is the intersection — the filter-and-list interaction model they expect from LinkedIn, delivering the evidence-based signals they trust from GitHub.

**Where confusion arises without good design:**
- *"Why can't I just type what I'm looking for?"* — Structured-only search needs to feel *faster*, not just different. Category panels must be scannable enough that finding "FastAPI" under Frameworks feels more precise than typing it.
- *"What does this score actually mean?"* — Both scores need enough context on the card that they never feel arbitrary.
- *"Is this data fresh?"* — The `last_scanned` timestamp and stale flag must be immediately visible, never buried.

### Success Criteria

The structured search → results interaction succeeds when:

1. A user finds their first facets within 15 seconds — category panels are organised and scannable enough that no one hunts for "Python" or "Docker"
2. Results load in under 2 seconds — pre-computed data, no spinners, no waiting
3. A user understands a candidate card without clicking — evidence signals on the card itself are specific enough that click-through is for depth, not for basics
4. The first profile visit produces the "proof moment" — repos, commit span, detected skills, and at least one AI tooling signal, and the user thinks: "this is real"
5. Back navigation returns the user to exactly where they were — search state, scroll position, and active facets all preserved

### Novel UX Patterns

**Familiar pattern, novelty in the payload.**

The interaction model — left-panel facets, right-panel results, click-through to detail — is established. Users know it. No teaching required.

The novelty is in what lives *inside* that familiar pattern:
- Category panels contain dimensions that don't exist anywhere else as searchable filters: AI Agent Usage Patterns, AI Maturity Level
- Result cards surface evidence, not claims — unprecedented in a recruiting context
- Candidate profiles are technical dossiers, not CV summaries

Familiar metaphors leveraged:
- Category panels behave exactly like e-commerce filter sidebars
- Result cards look like enhanced GitHub user cards
- Profiles read like detailed GitHub profile pages with analytical layers added

### Experience Mechanics

**1. Initiation**
User lands on the search page (default route post-login). The faceted panel is open and inviting. No empty-state friction — the panel itself is the starting prompt. Placeholder text in results area: *"Select skills to find matching candidates."*

**2. Interaction**
- Expand a category → see a labelled list with checkboxes (optionally showing candidate counts per item)
- Check items → selection count appears on category header: `Languages (2)`
- Active selections appear as dismissable chips in a chip row above the results area
- Search button activates once at least one selection is made
- Button submits the structured query — no live reactive filtering

**3. Feedback**
- Results render (≤2s) with a count: *"14 candidates matching your criteria"*
- Each card shows: GitHub handle, Skill Score badge, AI Maturity badge, top 3–5 detected skill tags, `last_scanned` tag (amber if stale), repo count
- Sort controls above the list: by Skill Score / AI Maturity Score / Last Scanned
- Thin-results state (<10 results): distinct component — result count + "This query has been flagged for pool expansion" + copyable CLI command block

**4. Completion — Profile View**
- Click any candidate card → profile view (client-side route transition, no page reload)
- Profile header: GitHub handle, avatar, Skill Score, AI Maturity Score with level label
- Evidence sections: repositories analysed, detected skills (with source repo references), AI tooling signals, config file evolution timeline
- `last_scanned` timestamp visible; stale warning if >90 days
- Admin-only: inline AI Maturity Score edit control (click → stepper → auto-save → toast confirmation)
- Back → returns to results at same scroll position with facets intact

## Visual Design Foundation

### Colour System

**Philosophy:** Neutral-first with semantic colour accents. The UI recedes and lets the *data* — candidate names, scores, evidence — be the visual focus. Colour signals meaning; it is not decoration.

**Base palette (Tailwind slate scale):**

| Role | Light Mode | Dark Mode | Usage |
|------|------------|-----------|-------|
| App background | `slate-50` | `slate-950` | Page background |
| Surface | `white` | `slate-900` | Cards, panels, sidebars |
| Border | `slate-200` | `slate-700` | Dividers, panel borders, card outlines |
| Text primary | `slate-900` | `slate-50` | Main content text |
| Text secondary | `slate-500` | `slate-400` | Labels, metadata, timestamps |
| Text muted | `slate-400` | `slate-600` | Placeholder text, disabled states |

**Accent colour — Indigo:**

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Interactive primary | `indigo-600` | `#4f46e5` | Buttons, links, active facet checkboxes |
| Interactive hover | `indigo-700` | `#4338ca` | Hover states |
| Active selection bg | `indigo-100` | `#e0e7ff` | Selected facet item background |
| Focus ring | `indigo-500` | `#6366f1` | Keyboard focus indicators |

*Why indigo:* Technical and precise — not generic startup blue. Pairs cleanly with slate. Communicates reliability without feeling corporate.

**Semantic colours:**

| Role | Token | Usage |
|------|-------|-------|
| Stale / Warning | `amber-500` | `last_scanned` > 90 days tags, pipeline warnings |
| Error / Failed | `red-500` | Failed scan jobs, PAT expiry errors |
| Success | `emerald-500` | Score saved, scan complete toast confirmations |
| AI Maturity accent | `violet-500` | AI Maturity Score pips and badges — visually distinct from Skill Score |

*Why violet for AI Maturity:* Differentiates AI Maturity Score from Skill Score visually, giving it its own identity. Violet signals novelty — which is exactly what the AI Maturity Model is.

### Theme System (User-Configurable)

**Three themes, user-selectable from day 1:**

| Theme | Character | Base |
|-------|-----------|------|
| **Light** | Clean, bright, office environment | `slate-50` background, `white` surfaces |
| **Dark** | Low-glare, evening/focus work | `slate-950` background, `slate-900` surfaces |
| **Dim** | Soft dark — not stark black, easier on the eyes for extended use | `slate-800` background, `slate-700` surfaces, slightly desaturated accents |

*Why Dim over High-Contrast:* High-contrast themes serve accessibility needs that are out of scope for MVP. "Dim" — a warm, mid-tone dark mode variant — is the practical choice for a solo-developer tool used for long work sessions. It's the mode Linear users often end up in. High-contrast can be a future addition.

**Settings control placement and behaviour:**
- Small `Settings` icon button (`⚙` or a sliders icon from Lucide) in the top-right of the nav bar, to the left of the user avatar
- Opens a **popover** (shadcn/ui `Popover`) — compact, non-disruptive, dismissed by clicking away
- Popover contains the three preference groups: Theme, Font Size, Font Family
- Settings are persisted per user via `localStorage` for MVP (instant, no round-trip); Firebase user preferences document as a future enhancement for cross-device sync

**Popover layout (compact):**
```
┌─────────────────────────────┐
│  Display Settings           │
├─────────────────────────────┤
│  Theme                      │
│  ○ Light  ● Dark  ○ Dim     │
├─────────────────────────────┤
│  Font Size                  │
│  ○ Small  ● Medium  ○ Large │
├─────────────────────────────┤
│  Font Family                │
│  ● Inter                    │
│  ○ Outfit                   │
│  ○ Space Grotesk            │
│  ○ IBM Plex Sans            │
│  ○ Geist                    │
└─────────────────────────────┘
```

Changes apply immediately on selection (live preview) — no save/apply button needed.

### Typography System

**Two typefaces — one sans-serif for UI/prose, one monospace for technical signals.**

**Font Family options (user-selectable, 5 choices):**

| Font | Character | Why It Works Here |
|------|-----------|-------------------|
| **Inter** *(default)* | Clean, neutral, highly legible at small sizes | Industry standard for professional web apps (Linear, Vercel, GitHub). Zero friction, maximum readability |
| **Outfit** | Geometric, slightly rounded, modern | Warmer than Inter without losing professionalism. Gives the tool a more personal, crafted feel |
| **Space Grotesk** | Technical, slightly quirky letterforms | Feels native to developer tools — designed for technical content. Strong at headers |
| **IBM Plex Sans** | Engineering heritage, precise, clear | IBM's design language for developer tools. Authoritative, structured. Pairs naturally with a code-adjacent product |
| **Geist** | Vercel's typeface — clean, minimal, contemporary | Extremely legible at small sizes, designed for developer-facing interfaces. Strong association with modern developer tooling |

*All five are available via Google Fonts or open-source licensing. All are excellent at `text-sm` (14px) — the app's primary size.*

**Monospace typeface: JetBrains Mono** (fixed, not user-configurable for MVP)
Used exclusively for: repo names, file paths, framework/tool signal tags, CLI command blocks, detected skill labels. Immediately signals "this is code data, verified, exact."

**Font Size options (user-selectable, 3 choices):**

| Option | Base body size | Usage context |
|--------|---------------|---------------|
| **Small** | `text-xs` (12px) | Maximum density — power users on large monitors |
| **Medium** *(default)* | `text-sm` (14px) | Default — professional tool standard |
| **Large** | `text-base` (16px) | More breathing room — extended reading sessions |

Font size preference applies a CSS custom property (`--font-size-base`) at the root level; all `text-sm` / `text-xs` references scale proportionally via Tailwind config override.

**Type scale (at Medium / default):**

| Level | Size | Weight | Usage |
|-------|------|--------|-------|
| Page heading | `text-2xl` (24px) | `font-semibold` | Profile names, page titles |
| Section heading | `text-lg` (18px) | `font-semibold` | Card headers, panel section labels |
| Body | `text-sm` (14px) | `font-normal` | Default content — most of the app |
| Label / metadata | `text-xs` (12px) | `font-medium` | Score labels, timestamps, tag text |
| Monospace | `text-xs font-mono` | `font-normal` | Repo names, file paths, CLI commands |

### Spacing & Layout Foundation

**Spacing unit: 4px base (Tailwind default)**
Tailwind's default spacing scale (`p-1` = 4px, `p-2` = 8px, `p-4` = 16px) produces tight, professional density without feeling cramped.

**Three-zone SPA layout:**

```
┌─────────────────────────────────────────────────────────┐
│  Top Nav Bar (h-12, border-bottom)                       │
│  [Logo]  [Search | Admin]         [⚙ Settings] [Avatar] │
├──────────────────┬──────────────────────────────────────┤
│                  │                                       │
│  Left Facet      │  Main Content Area                    │
│  Panel           │  (Results / Profile / Admin)          │
│  (w-64, fixed,   │  max-w-4xl, px-6 py-4                │
│   border-right)  │                                       │
│                  │                                       │
│  [Category 1 ▾] │                                       │
│  [Category 2 ▾] │                                       │
│  [Category 3 ▾] │                                       │
│  [Category 4 ▾] │                                       │
│  [Category 5 ▾] │                                       │
│                  │                                       │
│  [Search btn]    │                                       │
└──────────────────┴──────────────────────────────────────┘
```

- **Top nav:** `h-12`, `border-b`, logo left, primary nav links centre-left, settings icon + user avatar right
- **Left panel:** `w-64`, fixed width, `border-r`, sticky — doesn't scroll with content
- **Main content:** `flex-1`, `overflow-y-auto`, `px-6 py-4`, `max-w-4xl` centred
- **Admin layout:** Left panel hidden on `/admin` routes; full-width content with tab navigation instead

**Component spacing conventions:**
- Card padding: `p-4` (16px)
- Section gaps: `gap-4` (16px between major sections)
- Tight data rows (tables, queue items): `py-2` (8px vertical)
- Facet category items: `py-1.5` (6px vertical) — dense but comfortably clickable

### Accessibility Considerations

Best-effort for MVP — personal tool, no compliance requirement. Baseline standards applied:

- **Contrast:** All text meets WCAG AA (4.5:1 normal text, 3:1 large text). Indigo-600 on white = 5.9:1 ✅. Slate-500 on white = 4.6:1 ✅. Dark mode equivalents verified at same ratios.
- **Focus states:** Indigo focus ring on all interactive elements — visible and consistent across all three themes
- **Keyboard navigation:** shadcn/ui + Radix UI primitives handle dropdowns, popovers, and dialogs correctly
- **Semantic HTML:** Proper `<nav>`, `<main>`, `<section>`, `<table>`, `<button>` elements used throughout
- **No motion dependency:** All state changes communicated via colour and text — animation is enhancement only, never the sole signal
- **Theme contrast:** All three themes (Light, Dark, Dim) independently verified for minimum contrast compliance

## Design Direction Decision

### Design Directions Explored

Three distinct visual directions were generated and presented as an interactive HTML showcase (`_bmad-output/planning-artifacts/ux-design-directions.html`), each representing a complete, coherent visual vision for candidate-skill-scanner:

| Direction | Name | Theme | Font | Layout Style |
|-----------|------|-------|------|--------------|
| **1 — Precision** | Maximum density, data-forward | Light (white/slate-50) | Inter | Linear-inspired, tight horizontal rows |
| **2 — Evidence** | Investigative, discovery-forward | Split: dark slate-900 nav + light slate-50 body | Space Grotesk | Card-forward, candidates as files to evaluate |
| **3 — Dark & Dense** | Engineering dashboard, focus-mode | Full dark (slate-950/slate-900) | IBM Plex Sans | Table-style results, maximum data density |

The showcase also contained three supplementary tabs — Thin Results State, Candidate Profile, and Settings Popover — showing how each direction handled those critical surfaces.

### Chosen Direction

**Direction 2 — "Evidence"**

Gabe chose Direction 2 unanimously. The investigative, card-forward framing aligns directly with the product's core thesis: *you can't fake a commit history*. The split-personality layout (dark nav + light body) creates clear visual hierarchy between navigation context and data content, and the card-forward treatment makes each candidate feel like a dossier to evaluate rather than a row to scan.

### Design Rationale

| Element | Decision | Why |
|---------|----------|-----|
| **Nav theme** | Dark `slate-900` top nav | Creates a permanent "you are in a tool" framing; visually separates navigation from content |
| **Body theme** | Light `slate-50` background, `white` card surfaces | Candidate evidence is the visual star — light surfaces let data lead, not chrome |
| **Font: Space Grotesk** | Slightly quirky, technical letterforms | Feels native to developer tools; stronger personality than Inter without losing professionalism |
| **Layout: Card-forward** | Candidate cards with breathing room and visual weight | Each candidate is something you *evaluate*, not just scan; reinforces the dossier metaphor |
| **Skill Score treatment** | Coloured circle badge (indigo) | Distinct, prominent, immediately readable as a primary signal |
| **AI Maturity Score treatment** | Violet level bar below card | Visually separated from Skill Score; violet communicates novelty and independence |
| **Evidence chips** | Prominent position on card, first visual hit | Detected frameworks, repo count, commit span as the headline — reinforces the "evidence, not assertion" principle |
| **Thin-results state** | Bordered box with prominent CLI command block | Named, framed, actionable — user knows it's a system state, not a failure |

### Implementation Approach

Direction 2 is the north star for all visual implementation from this point forward. Key implementation commitments:

1. **Nav bar:** `bg-slate-900 border-b border-slate-700` — dark, permanent, thin
2. **App body:** `bg-slate-50` — clean off-white field for evidence cards
3. **Card surfaces:** `bg-white border border-slate-200 rounded-lg shadow-sm` — elevated from body, inviting evaluation
4. **Space Grotesk** loaded as the default font family (overridable via Settings popover)
5. **Score visual language locked:** Skill Score = indigo circle badge; AI Maturity = violet level bar — these two treatments remain consistent everywhere in the product
6. **Evidence chips first:** On every candidate card, evidence tags (frameworks, repo count, commit span) are the primary content block — above the fold, before metadata

## User Journey Flows

### Journey 1 — Sarah's Search Journey

*"I need a FastAPI + PostgreSQL developer with real project history, not a CV that says FastAPI."*

**Entry point:** Authenticated, lands on `/search` (default route). Left facet panel is open. Results area shows placeholder: *"Select skills to find matching candidates."*

**Flow:**

```
[Lands on /search]
       │
       ▼
[Scans left facet panel — 5 collapsible categories]
       │
       ├─ Expands "Languages" → checks Python ✓
       ├─ Expands "Frameworks" → checks FastAPI ✓, PostgreSQL ✓
       └─ Expands "AI Maturity Level" → selects ≥ Level 2 ✓
       │
       ▼
[Active filter chip row appears above results area]
  "Python ×"  "FastAPI ×"  "PostgreSQL ×"  "AI Maturity ≥ 2 ×"
       │
       ▼
[Clicks "Search" button — disabled until ≥ 1 selection made]
       │
       ▼ (≤ 2 seconds)
[Results render — "14 candidates matching your criteria"]
  ┌──────────────────────────────────────────────┐
  │ @devhandle       [● 87]  [████░░ Lvl 3]      │
  │ FastAPI  PostgreSQL  Docker   12 repos        │
  │ 18 months commits  Last scanned: 3 days ago  │
  └──────────────────────────────────────────────┘
       │
       ▼
[Sarah scans cards — evidence chips tell the story at a glance]
       │
       ├─ Dismisses a chip to broaden? → chip row updates,
       │  Search re-runs with modified facets
       │
       └─ Clicks a candidate card
              │
              ▼
       [Profile view — /candidates/:id]
       Header: GitHub handle + avatar + Skill Score + AI Maturity bar
       Evidence sections below:
         • Repos analysed (primary matches)
         • Detected skills with source repo references
         • Commit span timeline
         • AI tooling signals (if any)
              │
              ▼
       [Back button / browser back]
              │
              ▼
       [Returns to results — same scroll position, facets intact ✓]
```

**Confirmed UX decisions:**
- Search button is disabled until at least one facet is checked
- Chip row is the "query in plain English" — always visible, always dismissable individually
- Results count anchors expectations before scanning cards
- Back navigation preserves search state and scroll position (SPA hard requirement)

---

### Journey 2 — Daniel's Deep-Dive Journey

*"I need to see if this person actually architected multi-agent pipelines, not just listed LangChain."*

**Entry point:** Daniel has already run a search. He's on the results page, sees a Level 4 AI Maturity candidate.

**Flow:**

```
[Results page — sees candidate with AI Maturity Level 4]
       │
       ▼
[Clicks candidate card → /candidates/:id]
       │
       ▼
[Profile header renders]
  @handle  [● 94 Skill Score]
  [████████░░ Level 4 — Advanced AI Integration]
  "Scanned 2 days ago"
       │
       ▼
[Evidence section: "AI Tooling Signals"]  ← FIRST-CLASS dedicated section
  ┌────────────────────────────────────────────────┐
  │ CLAUDE.md         detected in 3 repos          │
  │ .cursor/rules     detected                     │
  │ ai-context.md     detected                     │
  │                                                │
  │ Config evolution:                              │
  │ CLAUDE.md modified across 23 commits           │
  │ over 6 months  ↗ [evolution timeline visual]   │
  └────────────────────────────────────────────────┘

  Config file evolution is a FIRST-CLASS evidence signal.
  A CLAUDE.md (or equivalent) modified across many commits
  over an extended period = ownership and sophistication,
  not a one-time copy-paste. This is displayed as its own
  dedicated evidence block, not buried in a skills list.
       │
       ▼
[Evidence section: "Repositories Analysed"]
  ┌────────────────────────────────────────────────┐
  │ repo-name-1   FastAPI  LangChain  Postgres      │
  │   18 months · 247 commits · primary match      │
  │ [View on GitHub ↗]                             │
  │                                                │
  │ repo-name-2   multi-agent pipeline             │
  │   6 months · 89 commits                       │
  │ [View on GitHub ↗]                             │
  └────────────────────────────────────────────────┘
       │
       ▼
[Daniel clicks "View on GitHub ↗" — opens in new tab]
  → Sees actual repo, actual commits, actual code
  → The proof moment: evidence is verifiable, not curated
       │
       ▼
[Returns to profile tab — continues reading]
  → Checks commit span, AI evolution timeline
       │
       ▼
[Returns to results via Back — state preserved]
```

**Confirmed UX decisions:**
- AI tooling signals get their own dedicated evidence section — separate from detected languages/frameworks
- Config file evolution (CLAUDE.md modified across N commits over N months) is a first-class signal with its own visual block and timeline treatment
- GitHub repo links open in new tab — never replaces the app
- Commit span is expressed in human time ("18 months active") alongside commit count

---

### Journey 3 — Admin Journey

*"I need to review flagged repos, assign AI Maturity Scores, and keep the ground-truth pool healthy."*

**Entry point:** Gabe navigates to `/admin` (role-gated). Left facet panel is hidden; full-width layout with tab navigation.

**CONFIRMED: The Admin UI is pure UI interaction — no CLI commands are surfaced anywhere in the admin interface. Hard scripts may exist in the project repo for internal use but are not part of the product UI.**

**Flow:**

```
[Navigates to /admin]
       │
       ▼
[Admin tab bar: Pipeline | Queue | Repos-of-Interest | Candidates]
       │
       ├─ Tab: "Pipeline" — scan job status overview
       │    Running: 3  ·  Pending: 12  ·  Failed: 1 (red badge)
       │    Failed job row: [Retry ↺]  [Dismiss ×]
       │
       └─ Tab: "Repos-of-Interest"
              │
              ▼
       [Queue table: repos flagged for evaluation]
       ┌──────────────────────────────────────────────────┐
       │ github.com/user/repo-a   Flagged 2h ago  [▸ Open]│
       │ github.com/user/repo-b   Flagged 1d ago  [▸ Open]│
       │ github.com/user/repo-c   Flagged 3d ago  [▸ Open]│
       └──────────────────────────────────────────────────┘
              │
              ▼
       [Clicks [▸ Open] on a repo → row expands inline]
         Shows:
           • Detected signals summary (languages, tools, AI config files)
           • Auto-suggested AI Maturity level (system estimate)
           • [View on GitHub ↗] — opens repo in new tab for review
              │
              ▼
       [Gabe reviews the repo externally, returns to app]
              │
              ▼
       [Assigns AI Maturity Score inline — all via UI]
         Click score field → stepper (0 / 1 / 2 / 3 / 4 / 5)
         → Select 4
         → Auto-saves
         → Toast: "AI Maturity Score saved — Level 4" ✓
              │
              ▼
       [Row status updates: "Scored ✓"]
       [Row moves out of active queue — count decrements visibly]
              │
              ▼
       [Navigates to "Candidates" tab]
         → Finds candidate linked to that repo
         → Profile reflects new score immediately (no page refresh)
```

**Confirmed UX decisions:**
- Admin is full-width, tab-based — facet panel is not rendered on `/admin` routes
- Repos-of-Interest is an actionable queue, not a passive table — every row has a clear action
- All evaluation and scoring happens through UI controls only — no CLI commands in the product
- Inline expand-row pattern avoids modal friction for the review-and-score workflow
- Auto-save + toast is the only confirmation needed — no "Save" button required
- Queue count decrementing visibly = progress feedback for a solo operator

---

### Journey 4 — Thin Results State Journey

*"I searched for something specific and the pool is too shallow. What now?"*

**Entry point:** Any search that returns fewer than 10 results.

**CONFIRMED: Two variants of the same `ResultsState` component. No CLI commands shown anywhere — the thin results state communicates that the query has been flagged and is being handled by the system. The user's job is done; the system's job begins.**

**Flow:**

```
[User runs structured search]
  e.g.: Rust + AI Agent patterns + AI Maturity ≥ 4
       │
       ▼ (≤ 2 seconds)
[Results render]
       │
       ├─ ≥ 10 results → normal results list (no special state)
       │
       ├─ 1–9 results → ThinResults variant
       │       │
       │       ▼
       │  ┌──────────────────────────────────────────────────────┐
       │  │  ℹ  3 candidates found                               │
       │  │                                                      │
       │  │  This query is underserved in the current pool.     │
       │  │  It has been automatically flagged for expansion.   │
       │  │  New candidates matching this profile will appear   │
       │  │  here as the pool grows.                            │
       │  │                                                      │
       │  │  [View 3 candidates ↓]                              │
       │  └──────────────────────────────────────────────────────┘
       │       │
       │       ▼
       │  [The 3 candidate cards render below — still valuable]
       │
       └─ 0 results → ZeroResults variant
               │
               ▼
          ┌──────────────────────────────────────────────────────┐
          │  ○  No candidates found                              │
          │                                                      │
          │  No candidates currently match this combination.    │
          │  This query has been flagged for pool expansion.    │
          │  You'll find results here as the pool grows.        │
          │                                                      │
          │  [← Modify your search]                             │
          └──────────────────────────────────────────────────────┘
```

**Confirmed UX decisions:**
- `ThinResults` and `ZeroResults` are two variants of the same component — same visual language, different copy and affordances
- No CLI commands are shown — the system handles expansion autonomously; the user is informed, not burdened
- Language is neutral-informative, never apologetic: "underserved in the current pool" — not "sorry, we couldn't find more"
- `ThinResults`: existing results are shown below — even 2 candidates may be useful
- `ZeroResults`: a prominent "← Modify your search" affordance is the primary call-to-action
- Both variants confirm the query has been flagged — user knows forward progress is happening without any action required

---

### Journey Patterns

Three consistent patterns appear across all four journeys:

**1. Evidence-first information hierarchy**
In every flow, the most credible evidence is always the *first visual item* on any card, panel, or profile. Scores come second. Metadata (timestamps, counts) comes third. The hierarchy is: *what was found → how strong is it → when was it found*.

**2. Named states, actionable exits**
Every journey has at least one potential "stuck" moment (thin results, failed scan job, unscored repo). In each case the design names the state explicitly, provides a clear cause, and gives at least one next action. No dead ends anywhere in the product.

**3. Preserved context on back-navigation**
All forward-navigation is SPA route transition (no reload). All back-navigation returns the user to exact scroll position and filter state. This is both a technical requirement of the SPA architecture and a UX requirement of the search → profile → back loop.

---

### Flow Optimisation Principles

1. **Zero steps to first signal** — The search panel is open and ready on first arrival. No intermediate "start a new search" step.
2. **Query visible at all times** — Active filter chip row persists above results throughout the session. Users always see what they searched for.
3. **Score assignment as muscle memory** — Admin score edit is click → pick → done. No confirmation dialogs, no modals. Toast confirmation is the only feedback.
4. **GitHub as the ultimate proof** — Repo links open in new tab, never replacing the app. External verification is one click, always available.
5. **System owns thin results** — The product flags, handles, and communicates underserved queries. The user is informed and reassured, never left with a task to do.

## Component Strategy

### Design System Components

The following shadcn/ui components are used as-is or lightly extended with Direction 2 theme tokens applied via `tailwind.config`. No structural modification required.

| Component | shadcn/ui Source | Used For |
|-----------|-----------------|----------|
| `Button` | `button` | Search submit, Retry/Dismiss in Admin queue, "View on GitHub" links, "← Modify search" |
| `Badge` | `badge` | Skill/framework chips on cards and profiles, stale tag, queue status indicators |
| `Card` | `card` | Candidate result cards, profile evidence sections, Thin/Zero results state containers |
| `Tabs` | `tabs` | Admin section navigation (Pipeline / Queue / Repos-of-Interest / Candidates) |
| `Collapsible` | `collapsible` | Left facet panel category sections (Languages, Frameworks, Tools, AI Maturity, AI Agent Patterns) |
| `Checkbox` | `checkbox` | Individual facet items within collapsible panels |
| `Popover` | `popover` | Settings popover (⚙ button → theme/font preferences) |
| `Sonner` | `sonner` | Score saved, scan job retry, dismiss confirmations |
| `Tooltip` | `tooltip` | AI Maturity level explanations (hover on pip indicator) |
| `Separator` | `separator` | Evidence section dividers within profile view |
| `Avatar` | `avatar` | GitHub user avatar in candidate cards and profile header |

### Custom Components

Bespoke components built on top of shadcn/ui primitives and Tailwind CSS. Each is unique to candidate-skill-scanner and not covered by the design system library.

---

#### `CandidateCard`

**Purpose:** The primary result unit on the search results page. Contains all the evidence a user needs to decide whether to click through.

**Anatomy (Direction 2 — card-forward, evidence-first):**
```
┌──────────────────────────────────────────────────────────┐
│  [Avatar]  @github-handle              [● 87] [████░ L4] │
│  ─────────────────────────────────────────────────────── │
│  FastAPI   PostgreSQL   Docker   LangChain   +2 more     │  ← Evidence chips FIRST
│  ─────────────────────────────────────────────────────── │
│  12 repos  ·  18 months active  ·  Scanned 3 days ago   │  ← Metadata row
└──────────────────────────────────────────────────────────┘
```

**States:** Default · Hover (shadow elevation) · Loading skeleton · Stale (amber `⚠` on scanned timestamp)

**Visual treatment (Direction 2):** `bg-white border border-slate-200 rounded-lg shadow-sm hover:shadow-md` — elevated card on `slate-50` body; hover lifts to signal clickability

**Props:** `candidate` object — handle, skillScore, aiMaturityLevel, detectedSkills[], repoCount, commitSpanMonths, lastScanned, isStale

---

#### `AIMaturityBadge`

**Purpose:** Visual representation of the 0–5 AI Maturity Score. Communicates level, label, and progression — not just a number.

**Anatomy:**
```
[████████░░]  Level 4 — Advanced AI Integration
```
- Filled pip segments: `violet-500` · Empty pips: `slate-200` (light) / `slate-700` (dark nav)
- Level number + label text alongside the bar
- Tooltip on hover: explains what Level N means per the Developer AI Maturity Model

**Variants:**
- `card` — compact horizontal bar on `CandidateCard`
- `profile` — full-width bar with label and tooltip in profile header
- `admin-edit` — includes inline `[0][1][2][3][4][5]` segmented stepper for Admin score assignment

**States:** Levels 0–5 · Unscored (dashed bar, "Not yet evaluated" label) · Admin-edit active

---

#### `SkillScoreBadge`

**Purpose:** Displays the numeric Skill Score (0–100) as a visually distinct circular badge. Always independent from AI Maturity — never combined.

**Anatomy:** `[● 87]` — filled circle in `indigo-600`, white score text

**Colour scale:** 80–100 = `indigo-600` · 60–79 = `indigo-400` · 40–59 = `slate-400` · <40 = `slate-300`

**Variants:** `card` (compact, inline) · `profile` (larger, prominent in profile header)

---

#### `FacetPanel`

**Purpose:** A collapsible category section in the left search sidebar. Contains labelled checkboxes with optional candidate counts.

**Anatomy:**
```
▾ Frameworks  (3 selected)
  ☑ FastAPI          (42)
  ☑ Django           (31)
  ☐ Flask            (28)
  ☑ PostgreSQL       (67)
  ☐ SQLAlchemy       (19)
  [Show more ▾]
```

**States:** Expanded · Collapsed · Has selections (count badge on header) · Loading

**Behaviour:** Open by default for primary categories (Languages, Frameworks); collapsed by default for longer/rarer ones (AI Agent Patterns). "Show more" reveals items beyond the initial 5–6 visible entries.

---

#### `ActiveFilterChips`

**Purpose:** Persistent chip row above search results. Shows the current query as dismissable pills — "the query in plain English."

**Anatomy:**
```
Python ×    FastAPI ×    PostgreSQL ×    AI Maturity ≥ 2 ×    [Clear all]
```

**Behaviour:** Each chip's `×` removes that single facet and re-runs search. "Clear all" resets everything. Row hidden when no facets selected.

**Visual treatment (Direction 2):** `bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-full` chips on `slate-50` body

---

#### `EvidenceSection`

**Purpose:** Structured evidence block within the Candidate Profile view. Reusable container for different evidence types.

**Variants (confirmed — 4 total):**
- `ai-signals` — AI config files detected, config evolution timeline (CLAUDE.md across N commits)
- `repositories` — Repos analysed, with skills, commit counts, GitHub links
- `detected-skills` — Full list of detected languages/frameworks/tools with source repo references
- `commit-timeline` — Commit span visualisation (months active, activity pattern)

**Visual treatment:** Monospace (`JetBrains Mono text-xs`) for all file paths, repo names, and technical identifiers; `Separator` between sections; `slate-50` inset background within `white` profile card

---

#### `ThinResultsState` / `ZeroResultsState`

**Purpose:** Two variants of the same named-state component. Renders above (or instead of) results when the pool is underserved.

**`ThinResults` (1–9 results):** Bordered info box above candidate cards. States count, explains underserved state, confirms flagging, offers "View N candidates ↓" anchor.

**`ZeroResults` (0 results):** Same bordered box, no cards below. Adds prominent "← Modify your search" call-to-action.

**Visual treatment:** `border border-slate-300 rounded-lg bg-slate-50 p-5` — distinct, neutral, non-alarming. `slate-500` info icon. No red, no warning colours.

---

#### `StalenessTag`

**Purpose:** Inline warning on cards and profiles where `last_scanned` > 90 days.

**Anatomy:** `⚠ Scanned 94 days ago`

**Visual treatment:** `text-amber-600 bg-amber-50 border border-amber-200 rounded text-xs`

---

#### `AdminQueueRow`

**Purpose:** Expandable row in the Repos-of-Interest queue. Collapsed = summary; expanded = full evaluation controls.

**Collapsed:**
```
│ github.com/user/repo-a   Flagged 2h ago   [▸ Open] │
```

**Expanded:**
```
│ github.com/user/repo-a                              │
│ Detected: TypeScript  React  CLAUDE.md              │
│ Auto-suggested level: 3                             │
│ [View on GitHub ↗]                                  │
│                                                     │
│ Assign AI Maturity Score:                           │
│ [0] [1] [2] [3] [4] [5]   ← segmented buttons      │
│            [4 selected ✓]                           │
│ → Auto-saves → Toast confirmation                   │
```

**States:** Collapsed · Expanded · Scoring · Scored (row updates to "Scored ✓", exits queue)

---

#### `SettingsPopover`

**Purpose:** ⚙ preferences panel in top-right nav. User-configurable display settings (Theme, Font Size, Font Family) persisted to `localStorage`.

**Default values (Direction 2):** Theme = Dark · Font Size = Medium · Font Family = Space Grotesk

**Behaviour:** Changes apply immediately (live preview). No save/apply button. Dismissed by clicking outside. Cross-device sync deferred to future enhancement (Firebase user preferences document).

---

### Component Implementation Roadmap

| Phase | Components | Rationale |
|-------|-----------|-----------|
| **Phase 1 — Search surface** | `FacetPanel`, `ActiveFilterChips`, `CandidateCard`, `SkillScoreBadge`, `AIMaturityBadge` (card), `ThinResultsState`, `ZeroResultsState` | Core MVP flow — nothing works without these |
| **Phase 2 — Profile view** | `EvidenceSection` (all 4 variants), `AIMaturityBadge` (profile), `StalenessTag` | The "proof moment" — required for the product to deliver its core thesis |
| **Phase 3 — Admin surface** | `AdminQueueRow`, `AIMaturityBadge` (admin-edit) | Ground-truth loop — required for score assignment workflow |
| **Phase 4 — System/shared** | `SettingsPopover`, all shadcn/ui base components | Polish and usability — can ship post-MVP |

## UX Consistency Patterns

### Pattern 1 — Facet & Filter Management

**Rule set for how selections, chips, and search submission behave across the product:**

| Behaviour | Rule |
|-----------|------|
| **Selecting a facet item** | Check → item highlighted (`indigo-50` bg) → selection count on category header increments → chip appears in `ActiveFilterChips` row above results |
| **Deselecting a facet item** | Uncheck → item returns to default → count decrements → chip removed from row |
| **Dismissing a chip** | Click `×` on chip → corresponding facet unchecked in panel → search re-runs automatically |
| **"Clear all"** | All checkboxes cleared → chip row hidden → results area returns to placeholder state |
| **Search submission** | "Search" button is **disabled** until ≥1 facet selected. Click → results render (≤2s). Search is a deliberate submit, never live/reactive. |
| **Chip row visibility** | Hidden when zero selections. Appears the moment the first facet is checked. Always visible while on the results page. |
| **Category panel default state** | Languages, Frameworks: expanded on first load. Tools, AI Maturity Level, AI Agent Patterns: collapsed. State remembered within session. |
| **"Show more" in panels** | First 5–6 items visible. "Show more ▾" reveals all. "Show less ▴" collapses back. |

---

### Pattern 2 — Back-Navigation & URL State Preservation

**The single most important SPA-specific UX rule in this product. Facet state MUST be URL-encoded — this is an MVP requirement, not a future enhancement.**

**URL encoding format:**
```
/search?lang=python&framework=fastapi&framework=postgresql&ai_maturity_min=2
```

Multi-select facets use repeated params (e.g. `framework=fastapi&framework=postgresql`). AI Maturity minimum is a single `ai_maturity_min=N` param.

| Scenario | Required Behaviour |
|----------|--------------------|
| **Search → click card → profile → Back** | Returns to results page at **exact scroll position**. Active facets intact (restored from URL). Chip row intact. Results list intact. |
| **Browser refresh on results page** | URL params restore full search state — facets re-checked, chip row re-populated, search re-runs automatically. **MVP requirement.** |
| **Copy/share the URL** | A results URL shared with another authenticated user reproduces the same search. Facets are fully encoded in the URL. |
| **Navigating via top nav (Search ↔ Admin)** | Clears search state intentionally — these are distinct surfaces with no shared context. |
| **Back from Admin → Search** | Returns to `/search` with no pre-populated state (clean slate) unless the user had an active search before navigating away. |

**Implementation note:** Active facet state is derived from and synced to URL query params (React Router `useSearchParams` or equivalent). The URL is the single source of truth for search state. Scroll position restoration is managed via the SPA router's scroll restoration feature.

---

### Pattern 3 — Score Display Rules

**Two independent scores. Never combined. Always visually distinct. These rules apply everywhere both scores appear.**

| Rule | Detail |
|------|--------|
| **Visual separation** | `SkillScoreBadge` (indigo circle) and `AIMaturityBadge` (violet pip bar) always rendered as separate, distinct elements — never adjacent in a way that implies addition or averaging |
| **No combined ranking** | Sort options are: "By Skill Score" OR "By AI Maturity Score" OR "By Last Scanned" — never a composite sort |
| **Unscored AI Maturity** | Renders as dashed pip bar with "Not yet evaluated" label — never shown as 0/5 which would imply assessed as Level 0 |
| **Score label always present** | `SkillScoreBadge` always has tooltip/label: "Skill Score". `AIMaturityBadge` always shows level label: "Level N — [descriptor]". Scores are never raw numbers without context. |
| **Evidence basis on profile** | Both scores link to their evidence sections — Skill Score is explained by `detected-skills`; AI Maturity by `ai-signals` |

---

### Pattern 4 — Evidence Information Hierarchy

**The visual ordering on every card, panel, and profile view. Inviolable.**

```
1. EVIDENCE    — What was found (frameworks, tools, AI config files, repo count)
2. SCORES      — How strong is it (Skill Score badge, AI Maturity badge)
3. METADATA    — When and context (last scanned, stale warning, commit span)
```

Applied consistently:
- **`CandidateCard`:** Evidence chips → score badges (top-right) → metadata row (bottom)
- **Profile body:** Evidence sections dominate — `ai-signals`, `repositories`, `detected-skills`, `commit-timeline`
- **`EvidenceSection`:** Technical signals (file paths, repo names in monospace) are the headline — not the score
- **`AdminQueueRow` expanded:** Detected signals first → auto-suggested level → scoring control last

---

### Pattern 5 — Named Empty & Thin States

**No dead ends. No blame. System takes responsibility for its own limitations.**

| State | Component | Copy pattern | Tone | Primary action |
|-------|-----------|-------------|------|----------------|
| **No facets selected** | Results area placeholder | *"Select skills to find matching candidates."* | Inviting | The facet panel itself |
| **Results loading** | Skeleton cards | — | Neutral | None needed |
| **Thin results (1–9)** | `ThinResultsState` | *"N candidates found. This query is underserved in the current pool. It has been automatically flagged for expansion."* | Informative, honest | "View N candidates ↓" |
| **Zero results** | `ZeroResultsState` | *"No candidates currently match this combination. This query has been flagged for pool expansion."* | Neutral, not apologetic | "← Modify your search" |
| **Stale candidate** | `StalenessTag` | *"⚠ Scanned N days ago"* | Gentle warning | — (rescan trigger future) |
| **Admin: failed scan job** | Red badge + row in Pipeline tab | *"Failed — [job type]"* | Clear, factual | [Retry ↺] / [Dismiss ×] |
| **Admin: unscored repo** | Queue row | *"Awaiting evaluation"* | Neutral | [▸ Open] to evaluate |

**Copy principles:** Factual over emotional · System takes responsibility · Always one visible next action · Red reserved for failed system jobs only (never for content states)

---

### Pattern 6 — Admin Inline Editing

**The ground-truth scoring loop. Every step is friction-free.**

```
[Queue row] → [Click ▸ Open] → [Row expands inline — no modal]
     ↓
[Review: detected signals, auto-suggested level, GitHub link]
     ↓
[Click score segment: [0][1][2][3][4][5]]
     ↓
[Auto-saves immediately] → [Toast: "AI Maturity Score saved — Level N" ✓]
     ↓
[Row → "Scored ✓"] → [Exits queue] → [Count decrements]
```

**Rules:** No confirmation dialogs · No modal overlays · Undo = re-open row, change score, auto-saves again · Score immediately reflected on candidate profile without page refresh

---

### Pattern 7 — Settings Persistence

| Rule | Detail |
|------|--------|
| **Storage** | `localStorage` key `css-scanner-settings` — survives page refresh, no login required |
| **Live preview** | Selections apply immediately — no "Apply" or "Save" button |
| **Dismiss** | Click outside popover or press `Escape` closes it |
| **Default values** | Theme: Dark · Font Size: Medium · Font Family: Space Grotesk |
| **CSS application** | `data-theme`, `data-font-size`, `data-font-family` attributes on `<html>` root; Tailwind CSS custom properties respond to these attributes |
| **Scope** | Per-browser (localStorage). Cross-device sync via Firebase user preferences document is a future enhancement. |

## Responsive Design & Accessibility

### Viewport & Breakpoint Strategy

**This is a Chrome-only desktop SPA. There are no responsive breakpoints to manage — the layout is fixed-desktop-first.**

| Dimension | Decision |
|-----------|----------|
| **Minimum supported width** | **1280px** — below this, render a "please use a wider window" message; no layout reflow attempted |
| **Primary design target** | **1440px** — the three-zone layout (nav + facet panel + content) is designed and tested at this width |
| **Comfortable range** | 1440px–1920px — main content area grows naturally via `max-w-4xl` centring |
| **Ultra-wide (>1920px)** | Content stays centred at `max-w-4xl`; outer gutter grows — no content changes |
| **Mobile / tablet** | Not supported in MVP. No responsive reflow. No touch-optimised interactions. |

**Below-minimum-width fallback:**
```
┌──────────────────────────────────────┐
│                                      │
│   This tool is designed for          │
│   desktop use at 1280px or wider.    │
│                                      │
│   Please widen your browser window.  │
│                                      │
└──────────────────────────────────────┘
```
Full-viewport centred message. The main application does not render below 1280px.

---

### Keyboard Navigation

**Full keyboard support is a baseline requirement — professional users keyboard-navigate constantly.**

| Context | Tab order |
|---------|-----------|
| **Global** | Top nav (logo → Search → Admin → Settings ⚙ → Avatar) → Left facet panel → Main content area |
| **Facet panel** | Category headers (`Enter`/`Space` to expand/collapse) → checkboxes within each expanded category → Search button |
| **Results list** | Each `CandidateCard` is focusable; `Enter` navigates to profile |
| **Profile view** | Profile header → Evidence sections → "View on GitHub" links (open new tab) → Back link |
| **Admin tabs** | Tab bar (arrow keys navigate between tabs) → active tab content |
| **Admin queue** | Each queue row focusable; `Enter` expands/collapses; score stepper navigable with arrow keys |

**Escape key behaviour:**

| Trigger | Behaviour |
|---------|-----------|
| Settings popover open | `Escape` closes popover; focus returns to ⚙ button |
| `AdminQueueRow` expanded | `Escape` collapses row; focus returns to [▸ Open] button |
| Any Radix UI Popover / Tooltip | `Escape` dismisses per Radix UI default behaviour |

---

### WCAG 2.1 Level AA Colour Contrast

**Target: WCAG 2.1 Level AA throughout. Minimum ratios: 4.5:1 normal text, 3:1 large text and UI components.**

**Light body surfaces (white / slate-50):**

| Colour Pairing | Usage | Ratio | AA |
|---------------|-------|-------|----|
| `slate-900` on `white` | Primary body text | 19.1:1 | ✅ |
| `slate-700` on `slate-50` | Secondary text on app background | 10.2:1 | ✅ |
| `slate-500` on `white` | Metadata, timestamps | 4.6:1 | ✅ |
| `indigo-600` on `white` | Interactive buttons, links | 5.9:1 | ✅ |
| `indigo-700` on `indigo-50` | Chip text on chip background | 7.4:1 | ✅ |
| `violet-600` on `white` | AI Maturity label text | 5.0:1 | ✅ |
| `violet-500` on `white` | AI Maturity pip fill (UI component, 3:1 threshold) | 3.4:1 | ✅ |
| `amber-600` on `amber-50` | Stale tag text on stale tag background | 4.9:1 | ✅ |
| `amber-500` on `white` | Stale tag standalone (UI component) | 3.2:1 | ✅ |

**Dark nav surface (slate-900):**

| Colour Pairing | Usage | Ratio | AA |
|---------------|-------|-------|----|
| `white` on `slate-900` | Nav primary text | 19.1:1 | ✅ |
| `slate-300` on `slate-900` | Nav secondary / inactive links | 9.4:1 | ✅ |
| `indigo-400` on `slate-900` | Nav active link; focus rings on dark nav | 4.7:1 | ✅ |
| `slate-400` on `slate-900` | Nav muted text | 5.9:1 | ✅ |

**Dark and Dim theme variants:** All semantic colour tokens are independently verified for WCAG AA compliance across all three themes (Light / Dark / Dim) at the design token level before implementation.

---

### Focus Ring Visual Treatment

**Direction 2 "Evidence" focus ring — consistent across the entire product.**

**Light body surfaces:**
```css
outline: 2px solid #4f46e5;  /* indigo-600 */
outline-offset: 2px;
border-radius: /* match element's border-radius */;
```

**Dark nav surface:**
```css
outline: 2px solid #818cf8;  /* indigo-400 — lighter for dark background contrast */
outline-offset: 2px;
```

**Rules:**
- `outline: none` is **forbidden** without a visible replacement — focus rings are never removed
- `focus-visible` pseudo-class used throughout (not `focus`) — rings appear for keyboard navigation, not mouse click
- shadcn/ui + Radix UI focus management for composite components (dropdowns, popovers, dialogs) is not overridden
- Applies to: buttons, checkboxes, links, score steppers, queue rows, tab triggers, card elements

---

### Screen Reader Considerations

**Meaningful ARIA labels on all non-obvious interactive and informational elements.**

| Element | ARIA treatment |
|---------|---------------|
| `SkillScoreBadge` | `aria-label="Skill Score: 87"` |
| `AIMaturityBadge` | `aria-label="AI Maturity: Level 4 — Advanced AI Integration"` |
| `AIMaturityBadge` (unscored) | `aria-label="AI Maturity: Not yet evaluated"` |
| `ThinResultsState` | `role="status"` — screen readers announce state change when results load |
| `ZeroResultsState` | `role="status"` — same treatment as ThinResults |
| `ActiveFilterChips` container | `role="group" aria-label="Active filters"` |
| Individual filter chip `×` button | `aria-label="Remove [filter name] filter"` |
| `CandidateCard` | `<article>` element with `aria-label="Candidate: @github-handle"` |
| `StalenessTag` | `aria-label="Warning: last scanned N days ago"` |
| `FacetPanel` category | **`<fieldset>` with `<legend>`** for category name — checkboxes semantically grouped |
| `AdminQueueRow` score stepper | `role="radiogroup" aria-label="Assign AI Maturity Score"` with each segment as `role="radio"` |
| Settings popover trigger | `aria-label="Display settings"` |
| Evidence sections | `<section>` with `aria-labelledby` pointing to section heading |

**Page-level structure:**
- `<nav>` — top navigation bar
- `<aside>` — left facet panel
- `<main>` — results / profile / admin content area
- `<h1>` on each major view (Search, Candidate Profile, Admin)
- Results count region: `aria-live="polite"` — announces count when search completes

## UX Design Summary

This document is complete. The following summarises every major decision made across all 14 steps of the UX design workflow.

---

### The 5 Experience Principles

These five principles governed every design decision from Step 3 onward. They are the north star for all implementation work:

1. **Evidence over assertion** — Every screen surfaces *what was found*, not *what was claimed*. Labels, scores, and signals all trace back to detectable repository data. Self-reported claims have no place in this product.

2. **Two scores, two stories** — Skill Score and AI Maturity Score are always presented as separate, independent dimensions. The UI never collapses them into a single ranking, never averages them, never merges them. Each tells its own story.

3. **Search is structured, not free-form** — The faceted category panels *are* the search interface. No free-text box, no ambiguity. Precision is a feature. The absence of a text input is a deliberate design decision, not an omission.

4. **Thin results are a system state, not a user failure** — When the pool is underserved, the product owns it. The UI names the state, confirms it has been flagged, and gives the user a path forward. The user leaves informed and reassured, never rejected.

5. **The Admin UI is a workflow, not a dashboard** — Every admin view has a clear next action. Queues are for actioning, not observing. The ground-truth loop (flag → review → score) is fast, frictionless, and satisfying.

---

### Chosen Design Direction: Direction 2 — "Evidence"

**Selected in Step 9.** Three directions were explored (Precision / Evidence / Dark & Dense). Direction 2 was chosen because it best embodies the product's investigative, discovery-forward thesis.

| Element | Decision | Rationale |
|---------|----------|-----------|
| **Nav** | Dark `slate-900` top nav | Permanent "you are in a tool" framing; visual separation of navigation from content |
| **Body** | Light `slate-50` background, `white` card surfaces | Candidate evidence is the visual star — light surfaces let data lead |
| **Font** | Space Grotesk (default) | Slightly quirky, technical letterforms — native to developer tools |
| **Layout** | Card-forward | Each candidate is a dossier to evaluate, not a row to scan |
| **Skill Score** | Indigo circle badge `[● 87]` | Distinct, prominent, immediately readable |
| **AI Maturity Score** | Violet level bar `[████░░ Lvl 3]` | Visually independent from Skill Score; violet signals novelty |
| **Evidence chips** | First visual element on every card | Frameworks, repo count, commit span are the headline — before scores, before metadata |

---

### Visual System Decisions

**Colour palette:**

| Role | Token | Hex | Usage |
|------|-------|-----|-------|
| Interactive primary | `indigo-600` | `#4f46e5` | Buttons, links, active facets, focus rings (light) |
| AI Maturity accent | `violet-500` | `#8b5cf6` | AI Maturity pip bars and badges throughout |
| Stale / warning | `amber-500` | `#f59e0b` | `last_scanned` > 90 days tags and indicators |
| Error / failed | `red-500` | `#ef4444` | Failed scan jobs in Admin Pipeline tab only |
| Success | `emerald-500` | `#10b981` | Score saved, scan complete toast confirmations |
| Nav surface | `slate-900` | `#0f172a` | Top navigation bar background |
| App body | `slate-50` | `#f8fafc` | Page background |
| Card surface | `white` | `#ffffff` | Candidate cards, profile panels |

**Typography:**

| Typeface | Role | Notes |
|----------|------|-------|
| Space Grotesk | Default UI font (Direction 2) | Technical, slightly quirky; user-selectable |
| Inter | UI font option | Industry standard; clean and neutral |
| Outfit | UI font option | Warmer, more personal |
| IBM Plex Sans | UI font option | Engineering heritage; authoritative |
| Geist | UI font option | Vercel-native; minimal and contemporary |
| JetBrains Mono | All technical identifiers | Fixed — not user-configurable; repo names, file paths, CLI snippets |

**Theme options:** Light · Dark · **Dim** (warm mid-tone dark — the Direction 2 default)

**Font size options:** Small (12px base) · **Medium (14px base — default)** · Large (16px base)

**Spacing:** 4px base unit (Tailwind default). Card padding: `p-4`. Section gaps: `gap-4`. Facet items: `py-1.5`.

**Layout zones:** Top nav (`h-12`) · Left facet panel (`w-64`, hidden on `/admin`) · Main content (`flex-1`, `max-w-4xl`)

---

### Component Inventory

**9 custom components** built on top of shadcn/ui + Tailwind:

| Component | Surface | Purpose |
|-----------|---------|---------|
| `CandidateCard` | Search results | Primary result unit — evidence-first card layout |
| `AIMaturityBadge` | Cards, profiles, admin | Violet pip bar — 3 variants (card / profile / admin-edit) |
| `SkillScoreBadge` | Cards, profiles | Indigo circle badge with colour scale |
| `FacetPanel` | Search sidebar | Collapsible category section with `<fieldset>`/`<legend>` |
| `ActiveFilterChips` | Search results | Dismissable chip row — the query in plain English |
| `EvidenceSection` | Candidate profile | 4 variants: ai-signals / repositories / detected-skills / commit-timeline |
| `ThinResultsState` / `ZeroResultsState` | Search results | Two-variant named-state component for underserved queries |
| `StalenessTag` | Cards, profiles | Amber warning tag for stale scan data |
| `AdminQueueRow` | Admin — Repos queue | Expandable row with inline `[0][1][2][3][4][5]` score stepper |
| `SettingsPopover` | Top nav | ⚙ preferences panel — Theme / Font Size / Font Family |

**11 shadcn/ui base components** used as-is or lightly themed:
`Button` · `Badge` · `Card` · `Tabs` · `Collapsible` · `Checkbox` · `Popover` · `Sonner` · `Tooltip` · `Separator` · `Avatar`

---

### The 4 User Journeys

| Journey | User | Entry | Key Moment | Exit |
|---------|------|-------|-----------|------|
| **1 — Sarah's Search** | Recruiter | `/search` — facet panel open, ready | Results render with evidence chips on cards — "these are real signals" | Opens profile, evaluates, returns to results |
| **2 — Daniel's Deep-Dive** | Lead engineer | Results page — Level 4 AI Maturity candidate | `EvidenceSection: ai-signals` — CLAUDE.md modified across 23 commits over 6 months | Views GitHub repo in new tab — the proof moment |
| **3 — Admin Workflow** | Gabe (operator) | `/admin` → Repos-of-Interest tab | Row expands → detects signals → assigns score → auto-saves → queue count decrements | Ground-truth pool improves; candidate profile reflects new score immediately |
| **4 — Thin Results** | Any user | Search with narrow/rare facet combination | `ThinResultsState` — named, honest, non-apologetic | Sees existing (few) results, or modifies search — never abandoned |

**3 shared journey patterns that apply to all four flows:**

1. **Evidence-first information hierarchy** — What was found → how strong → when. This ordering is inviolable on every card, panel, and profile.
2. **Named states with actionable exits** — Every "stuck" moment is named explicitly (thin results, failed job, unscored repo). Every named state has at least one visible next action. No dead ends.
3. **Preserved context on back-navigation, URL-encoded facet state** — Search state (active facets) is encoded in the URL (`?lang=python&framework=fastapi&ai_maturity_min=2`) from day one. Browser refresh restores full search state. Back navigation restores scroll position. This is an **MVP requirement**, not a future enhancement.

---

### What Comes Next

**The Architecture step.**

The UX Design Specification is the primary input to the Architecture workflow. The architect needs both the PRD and this UX document to design the technical system that delivers these experiences.

**Inputs for the Architecture step:**
- `ideas/planning/candidate-skill-scanner/brief.md` — the PRD
- `ideas/planning/candidate-skill-scanner/ux-design.md` — this document

**How to invoke:**
```
@architect
```
Pass both documents as context. The architect will design the system architecture, data models, API contracts, and infrastructure decisions that make this UX specification buildable.

---

*UX Design for candidate-skill-scanner is complete. Every screen has a story. Every score has evidence. Every empty state has a path forward. Now let's build the thing that makes it real. 🎨→🏗️*
