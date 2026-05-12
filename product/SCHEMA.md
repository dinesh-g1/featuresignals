# FeatureSignals Product Wiki — Schema v1.1.0

> **Purpose:** This document is the operating system for the FeatureSignals LLM Wiki. It tells every LLM agent how to maintain, query, and evolve the wiki. Read this first in every session.
> **Status:** Living document — evolves as the wiki grows.
> **Last Updated:** 2026-05-17

---

## 0. Core Principles

1. **The wiki is immortal.** Every session builds on the last. If knowledge is missing, add it. If it's stale, update it. If it's contradictory, flag it and investigate. Never let knowledge disappear into chat history.
2. **The index is mandatory.** Before answering any query, read `product/wiki/index.md` to find relevant pages. Update it whenever pages are added or modified.
3. **The log is append-only.** Every operation gets a timestamped entry in `product/wiki/log.md`. This creates an auditable history of the wiki's evolution.
4. **Sources are immutable.** Files in `product/raw/` are never modified. Only read from them. The raw layer is the source of truth — the wiki is the compiled knowledge.
5. **Cross-reference aggressively.** Every wiki page uses `[[wikilinks]]` to link to related pages. Pages without inbound links are orphans. Orphans represent knowledge that isn't integrated.
6. **Cite everything.** Every factual claim in the wiki links back to its source (a raw file, a PR, a conversation, a benchmark). "Trust me, I'm an LLM" is not a citation.
7. **Archive yearly.** Each January, condense the previous year's log into `product/wiki/archive/YEAR-YYYY.md`. Start a fresh log for the new year. The active wiki stays lean; the archives preserve history.
8. **Private stays private.** `product/wiki/private/` is gitignored — never reference it in public contexts. `product/wiki/internal/` is git-crypt encrypted. Keep the boundaries clear.
9. **The PRS is the contract.** `product/wiki/private/FEATURESIGNALS_PRODUCT_REQUIREMENTS_SPECIFICATION.docx` is the canonical product specification. Every feature change MUST update the PRS. The PRS leads; code follows. It is the single source of truth that all departments (Engineering, Design, QA, Sales) align on.

---

## 1. Three-Layer Architecture

```
┌──────────────────────────────────────────────────────┐
│  RAW SOURCES  (product/raw/)                         │
│  ───────────                                          │
│  docs/  prs/  meetings/  calls/  research/  benchmarks │
│                                                       │
│  Immutable. The LLM reads from here but never writes. │
│  This is the source of truth for all claims.          │
├──────────────────────────────────────────────────────┤
│  THE WIKI      (product/wiki/)                        │
│  ───────────                                           │
│  public/   — Committed to git. Visible to all.        │
│  private/  — Gitignored. Strategic business knowledge. │
│  internal/ — Git-crypt encrypted. Ops & infra secrets.│
│  archive/  — Yearly condensations of log.md.          │
│                                                       │
│  The LLM owns this layer entirely. Creates pages,     │
│  updates them, maintains cross-references.            │
├──────────────────────────────────────────────────────┤
│  THE SCHEMA   (product/SCHEMA.md)                     │
│  ───────────                                           │
│  THIS FILE. The rules, conventions, and workflows.    │
│  Co-evolves with the wiki as patterns emerge.         │
└──────────────────────────────────────────────────────┘
```

---

## 2. Page Format

Every wiki page follows this exact structure:

```markdown
---
title: Short, Descriptive Title
tags: [tag1, tag2, tag3]
domain: architecture | development | testing | infrastructure | sales | planning | compliance | sdk | operations | business
sources:
  - path/to/raw/source1.md (description of what was used)
  - path/to/raw/source2.go (description)
related:
  - [[Related Page]] (relationship: e.g., "depends on", "extends", "contradicts")
  - [[Another Page]] (relationship)
last_updated: 2026-05-17
maintainer: llm
review_status: current | needs_review | stale
confidence: high | medium | low
---

## Overview

Brief summary of what this page covers — 2-3 sentences maximum.

## Content

(Structured content with sections as appropriate)

## Cross-References

- [[Page A]] — how this relates
- [[Page B]] — how this differs

## Sources

- [Source Name](path/to/source) — specific claim this supports
```

### Frontmatter Rules

| Field | Required | Description |
|---|---|---|
| `title` | Yes | Human-readable title |
| `tags` | Yes | At least 2 tags. Use existing tags when possible. |
| `domain` | Yes | One of the listed domains. Determines which index section the page appears under. |
| `sources` | Yes | At least 1 source. Paths relative to repo root. |
| `related` | Yes | At least 1 related page using `[[wikilink]]`. Use "orphan" if truly no relation. |
| `last_updated` | Yes | ISO date. Updated every time the page is modified. |
| `maintainer` | Yes | Always `llm` for wiki pages. |
| `review_status` | Yes | `current` = up to date. `needs_review` = sources updated since last edit. `stale` = hasn't been reviewed in 6+ months. |
| `confidence` | No | `high` = well-sourced, cross-referenced. `medium` = some sources, could be deeper. `low` = speculative, needs more data. |

---

## 3. Wiki Structure

### Directory Layout

```
product/wiki/
├── index.md                  ← Master catalog of ALL pages
├── log.md                    ← Append-only chronological record
├── public/                   ← Committed to git, visible to all
│   ├── ARCHITECTURE.md       ← System architecture, evolution, ADRs
│   ├── DEVELOPMENT.md        ← Dev patterns, conventions, package map
│   ├── TESTING.md            ← Test patterns, coverage map, flaky tests
│   ├── SDK.md                ← Cross-SDK knowledge, OpenFeature contract
│   ├── PERFORMANCE.md        ← Benchmarks, eval latency history
│   ├── PUBLIC_ROADMAP.md     ← What's coming, what's being considered
│   ├── DEPLOYMENT.md         ← Deployment topologies, infrastructure
│   └── COMPLIANCE.md         ← Public compliance status, certifications
├── private/                  ← Gitignored - strategic business knowledge
│   ├── BUSINESS.md           ← Business model, pricing strategy, margins
│   ├── COMPETITIVE.md        ← Deep competitive analysis, weaknesses, plays
│   ├── CUSTOMERS.md          ← Customer profiles, feedback, pain points
│   ├── SALES.md              ← Objection handling, sales playbook, lead insights
│   ├── ROADMAP.md            ← Full internal roadmap with priorities
│   ├── PEOPLE.md             ← Team, hiring plan, skill gaps
│   └── FINANCIALS.md         ← Actual costs, revenue, burn rate
├── internal/                 ← Git-crypt encrypted - ops & infra secrets
│   ├── INFRASTRUCTURE.md     ← Actual cell topology, secrets, provider configs
│   ├── RUNBOOKS.md           ← Incident response, disaster recovery, ops procedures
│   ├── INCIDENTS.md          ← All post-mortems, timelines, remediation
│   └── COMPLIANCE_GAPS.md    ← Actual compliance gaps, remediation plans
└── archive/                  ← Yearly condensations
    └── (created annually in January)
```

### Tag Taxonomy

Use these tags consistently across all pages:

| Tag | Used For |
|---|---|
| `architecture` | System design, ADRs, component relationships |
| `development` | Code patterns, conventions, toolchain |
| `testing` | Test strategy, coverage, patterns |
| `sdk` | SDK design, OpenFeature, cross-language patterns |
| `performance` | Benchmarks, latency, optimization |
| `deployment` | Infrastructure, CI/CD, Docker, k3s |
| `compliance` | SOC2, ISO, GDPR, security |
| `business` | Pricing, margins, business model |
| `competitive` | Competitor analysis, positioning |
| `customer` | Customer feedback, use cases, personas |
| `sales` | Objections, playbook, lead insights |
| `roadmap` | Future plans, priorities, trade-offs |
| `operations` | Runbooks, incidents, SRE |
| `infrastructure` | Cells, networking, DNS, secrets |
| `people` | Team, hiring, skills |
| `financial` | Costs, revenue, burn rate |
| `decision` | Architecture Decision Record |
| `incident` | Post-mortem, root cause analysis |
| `reference` | Quick reference, cheat sheet |

---

## 4. Workflows

### 4.1 Ingest

When new material arrives in `product/raw/`:

```
1. RECEIVE notification or detect new file in product/raw/
2. READ the source document completely
3. IDENTIFY which wiki pages it affects (read index.md)
4. For EACH affected page:
   a. Read the current page
   b. Determine what changed, what's new, what's contradicted
   c. Update the page with new information
   d. Tag contradictions explicitly: "⚠️ 2026-05-17: Source X claims Y, but Source Z claims ¬Y"
5. UPDATE product/wiki/index.md with any new or modified pages
6. APPEND to product/wiki/log.md with a complete entry
```

**Ingest entry format:**
```
## [2026-05-17 14:30] ingest | Source Title
- Source: product/raw/docs/path/to/source.md
- Pages affected: [[ARCHITECTURE.md]], [[DEVELOPMENT.md]]
- Summary: Updated architecture with new cell routing design. Resolved contradiction in DB connection pool tuning.
- Tokens used: ~4,500
```

### 4.2 Query

When asked a question:

```
1. READ product/wiki/index.md — identify relevant pages
2. SELECT the 3-5 most relevant pages
3. For EACH selected page:
   a. READ the page's ## headers (use grep "^## " or scan the page)
   b. IDENTIFY which 1-2 sections are relevant to the query
   c. READ only those sections — skip Overview if context already known
   d. If no section seems relevant, read the first 20 lines only
4. (Optional) SEARCH narrowly — if index.md alone doesn't pinpoint the right page:
   a. Run: grep -ril "keyword1\|keyword2" product/wiki/public/ | head -3
   b. Read matching pages using section-level reading (step 3)
5. CHECK product/wiki/log.md for recent context (last 5 entries)
6. SYNTHESIZE an answer with citations to wiki pages and raw sources
7. If the answer is valuable enough to persist:
   a. Create a new wiki page or extend an existing one
   b. Update index.md
   c. Append to log.md
```

**Query entry format:**
```
## [2026-05-17 16:45] query | "SSO implementation cost estimate"
- Pages consulted: [[DEVELOPMENT.md]], [[ARCHITECTURE.md]], [[COMPETITIVE.md]], [[ROADMAP.md]]
- Answer: Estimated 3-4 weeks, 2 engineers. All competitors include SSO in Pro tier.
- Filed as: product/wiki/public/ARCHITECTURE.md (new ADR section)
```

### 4.3 Lint

Run periodically (at session start if not run in 7+ days, or on request):

```
1. ORPHAN CHECK: For each page, count inbound [[wikilinks]] from other pages
   - 0 inbound links → flag as orphan. Either link it or archive it.
2. STALE CHECK: For each page with review_status != current:
   - Compare last_updated against source files' modification dates
   - If source is newer, mark as needs_review
   - If last_updated > 6 months ago, mark as stale
3. CONTRADICTION CHECK: Find pages that make opposing claims
   - Flag both pages with a contradiction warning
4. GAP CHECK: Identify topics mentioned across pages that lack their own page
   - Suggest new pages to create
5. REPORT: Summarize findings in log.md
```

**Lint entry format:**
```
## [2026-05-17 18:00] lint | Weekly health check
- ✅ 0 orphans found
- ⚠️ 2 stale pages: [[COMPLIANCE.md]] (last updated 2025-11), [[PERFORMANCE.md]] (last updated 2025-12)
- ✅ 0 contradictions detected
- 💡 Suggested new pages: "Edge Worker Architecture", "Hetzner Provisioning Adapter"
```

### 4.4 Archive (Annual)

Run each January:

```
1. READ the entire current year's log.md
2. CONDENSE into product/wiki/archive/YEAR-YYYY.md
   - One section per month
   - Key decisions, milestones, pattern changes
3. RESET log.md with the first entry being "Annual archive created"
4. UPDATE index.md to reference the archive
```

---

## 5. Page Lifecycle

```
CREATED → CURRENT (up to date) → NEEDS_REVIEW (sources updated) → STALE (>6mo) → ARCHIVED (moved to archive/)
                                                                      ↓
                                                              RE-READ + REVALIDATE → CURRENT
```

- **Creation**: During ingest, query, or lint — when a topic is identified as needing its own page.
- **Current**: Page is up to date with all sources. Confidence is high.
- **Needs Review**: A source has been updated since the page was last edited. The LLM should read the new source and update.
- **Stale**: No updates in 6+ months. Flagged by lint. May contain outdated information.
- **Archived**: No longer relevant. Moved to archive. Linked from index with "archived" tag.

---

## 6. Writing Style & Conventions

- **Tone**: Technical, precise, clear. No fluff. Every sentence carries information.
- **Structure**: Sections with `##` headers. Subsections with `###`. Lists for multiple items.
- **Contradictions**: Explicitly tag them. Never silently resolve conflicts — flag them for human review.
  ```
  ⚠️ **Contradiction detected 2026-05-17:**
  - Source A claims connection pool should be 50 max
  - Source B claims connection pool should be 20 max
  - Resolution: The difference is due to instance type. Source A assumes 8 vCPU, Source B assumes 4 vCPU.
  ```
- **Uncertainty**: Use `confidence` frontmatter. `low` confidence means "this is a hypothesis, needs validation."
- **Sources**: Always include a brief note on what from the source informed the claim.
  ```
  - `server/README.md` — evaluation hot path description
  - `docs/docs/architecture/evaluation-engine.md` — MurmurHash3 implementation details
  ```
- **Terms**: Use FeatureSignals terminology consistently. Check against `docs/docs/GLOSSARY.md`.

---

## 7. What NOT To Do

- ❌ Do not modify files in `product/raw/`. They are immutable source documents.
- ❌ Do not delete wiki pages. Archive them instead. Even outdated knowledge has value.
- ❌ Do not silently merge contradictions. Flag them with ⚠️ and let a human resolve.
- ❌ Do not remove source citations when updating a page. Add new ones; keep old ones.
- ❌ Do not let sessions end without filing valuable knowledge into the wiki.
- Do not let the PRS become stale. If you change a feature, update the PRS .docx specification. The PRS leads; code follows.
- ❌ Do not put secrets, API keys, or credentials in `public/` or `private/`. They belong in `internal/` (git-crypt encrypted) or in environment variables.
- ❌ Do not copy-paste large sections from sources. Synthesize in your own words, with citations.
- ❌ Do not let the active wiki grow unbounded. Archive yearly. Split large pages. Keep each page focused.

---

## 8. Integration Points

| FeatureSignals Component | How It Integrates with the Wiki |
|---|---|
| **`CLAUDE.md`** | Section 0A mandates wiki consultation on every prompt |
| **`CLAUDE.md`** | Section 0.6 mandates PRS consultation before feature work and PRS updates after changes |
| **`FEATURESIGNALS_PRODUCT_REQUIREMENTS_SPECIFICATION.docx`** | Canonical product specification, the contract between departments, single source of truth |
| **Makefile** | `make wiki-ingest`, `make wiki-lint`, `make wiki-index` targets |
| **CI/CD (Dagger)** | `WikiLint` step runs on PRs touching `product/wiki/` |
| **GitHub PR Templates** | "Does this change require a wiki update?" checkbox |
| **Issue Templates** | "Wiki Knowledge Base" section in story/task templates |
| **`CONTRIBUTING.md`** | "Every merge to main should consider wiki ingestion" rule |

---

## 9. Quick Reference

| Action | Command / Trigger |
|---|---|
| Bootstrap wiki | First ingest pass reading all existing docs |
| Ingest new source | Move file to `product/raw/`, run ingest workflow |
| Query wiki | Read index, read sections, synthesize, file result |
| Quick search | `grep -ril "keyword1\|keyword2" product/wiki/public/ \| head -3` |
| Lint wiki | Run on session start if >7 days since last lint |
| Archive yearly | January 1st each year |
| Check orphans | `grep -r "\[\[" product/wiki/ \| cut -d'[' -f3 \| sort -u` |
| Find stale pages | Search frontmatter for `review_status: stale` |
| List sections in a page | `grep "^## " product/wiki/public/PAGE.md` |
| Extract one section | `awk "/^## Section Title/{found=1;next} found{print} /^## / && !found" page.md` (or ask the LLM to find it) |
| Update PRS after feature change | Regenerate .docx to reflect new requirements, update log.md with timestamped entry |
