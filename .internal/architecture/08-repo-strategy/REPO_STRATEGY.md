# FeatureSignals — Repository Strategy & Monorepo Architecture

> **Version:** 1.0.0  
> **Status:** Design Document — Pending Review  
> **Author:** Engineering  
> **Last Updated:** 2026-01-15  
> **Audience:** Engineering, DevOps, Architecture Review Board, Founders

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Core Principles](#2-core-principles)
3. [Monorepo vs Multi-Repo Analysis](#3-monorepo-vs-multi-repo-analysis)
4. [Recommended Strategy: Monorepo](#4-recommended-strategy-monorepo)
5. [Proposed Monorepo Structure](#5-proposed-monorepo-structure)
6. [Access Control & CODEOWNERS](#6-access-control--codeowners)
7. [Build & CI Strategy in Monorepo](#7-build--ci-strategy-in-monorepo)
8. [SDK Versioning & Release Strategy](#8-sdk-versioning--release-strategy)
9. [Migration & Refactoring Plan](#9-migration--refactoring-plan)
10. [Future Considerations](#10-future-considerations)
11. [Implementation Checklist](#11-implementation-checklist)

---

## 1. Executive Summary

FeatureSignals currently operates as a de facto monorepo containing the Go API server, Next.js dashboard, Next.js ops portal, multiple SDKs (Go, Node, Python, Java, .NET, Ruby, React, Vue), documentation, website, and deployment artifacts. This document formally evaluates the monorepo vs multi-repo approach and establishes a **monorepo-first strategy** with strict package boundaries, path-based CI optimization, and CODEOWNERS-driven access control.

**Key Outcomes:**
- Single source of truth for all code, documentation, and infrastructure.
- Atomic commits across server, dashboard, and SDKs.
- Guaranteed SDK-to-server API compatibility through co-versioning.
- Efficient CI via change detection (only affected packages are tested/built).
- Clear access control boundaries without repository fragmentation.

---

## 2. Core Principles

### 2.1 Non-Negotiable Rules

1. **One repository, many deploys** — All code lives in `featuresignals/`. Different services deploy independently from the same codebase.
2. **Atomic changes** — A single PR can modify server, dashboard, SDKs, and infra simultaneously. No cross-PR coordination required.
3. **Strict package boundaries** — Internal packages (`server/internal/`) are never imported across package boundaries. Only `domain` interfaces cross boundaries.
4. **Change detection is mandatory** — CI must skip unaffected packages. Full CI runs only on `main` or when explicitly requested.
5. **SDKs are versioned with the server** — SDK releases are tied to server releases. Breaking API changes require coordinated version bumps.
6. **Access control via CODEOWNERS** — Team ownership is defined at the directory level, not repository level.

### 2.2 What This Architecture Prevents

| Problem | Prevention Mechanism |
|---------|---------------------|
| SDK drift from server API | Co-versioned releases, shared OpenAPI/protobuf specs |
| Cross-repo dependency hell | Single `go.mod` per package, clear import paths |
| CI waste on unchanged packages | Path-based change detection, conditional job execution |
| Fragmented documentation | Docs live alongside code, generated from source |
| Inconsistent tooling | Root `Makefile`, shared lint configs, unified CI scripts |

---

## 3. Monorepo vs Multi-Repo Analysis

### 3.1 Evaluation Matrix

| Factor | Monorepo | Multi-Repo | Winner |
|--------|----------|------------|--------|
| **Atomic commits** | ✅ One commit spans server + dashboard + SDKs | ❌ Requires multiple PRs across repos | Monorepo |
| **Shared types** | ✅ TypeScript/Go types shared across packages | ❌ Must publish type packages, version sync required | Monorepo |
| **CI efficiency** | ✅ Change detection runs only affected jobs | ❌ Each repo has independent CI overhead | Monorepo |
| **SDK versioning** | ✅ SDKs versioned with server, guaranteed compatible | ❌ SDKs can drift from server API | Monorepo |
| **Onboarding** | ✅ One `git clone`, one dev setup | ❌ Multiple repos, multiple setups | Monorepo |
| **Access control** | ⚠️ Requires CODEOWNERS + branch rules | ✅ Per-repo access control | Multi-Repo |
| **Build time** | ⚠️ Can be slower without change detection | ✅ Smaller repos = faster CI | Tie |
| **Open source** | ✅ Single repo for community contributions | ❌ Fragmented community | Monorepo |
| **Deployment independence** | ✅ Docker images built per package | ✅ Independent pipelines | Tie |
| **Dependency management** | ✅ Clear internal import paths | ❌ External package publishing required | Monorepo |

### 3.2 Industry Precedents

| Company | Strategy | Reason |
|---------|----------|--------|
| Google | Monorepo (Piper) | Atomic changes, unified tooling, massive scale |
| Meta | Monorepo | Cross-product consistency, shared infra |
| Uber | Monorepo (with Bazel) | Service coordination, dependency management |
| Netflix | Multi-repo | Independent team autonomy, polyglot |
| LaunchDarkly | Monorepo | SDK-server sync, unified CI/CD |
| Vercel | Monorepo (Turborepo) | Next.js ecosystem, shared tooling |

**Conclusion:** For a feature flag platform where SDK-server compatibility is critical, and the team is < 50 engineers, **monorepo is the optimal choice**. Multi-repo complexity outweighs benefits until team size exceeds ~100 engineers or strict regulatory isolation is required.

---

## 4. Recommended Strategy: Monorepo

### 4.1 Why Monorepo for FeatureSignals

1. **SDK-Server Coupling** — Feature flag evaluation relies on exact protocol compatibility between SDKs and server API. Monorepo guarantees they are always in sync.
2. **Unified CI/CD** — Change detection ensures only affected packages are tested. PRs touching only `dashboard/` don't trigger Go SDK tests.
3. **Simplified Onboarding** — New engineers run `make dev` once and have server, dashboard, and ops portal running locally.
4. **Atomic Feature Releases** — A new flag type requires server schema changes, dashboard UI updates, and SDK type updates. One PR handles all.
5. **Shared Infrastructure** — Terraform, Ansible, Dockerfiles, and CI scripts are centralized. No duplication across repos.

### 4.2 When to Consider Splitting

| Trigger | Action |
|---------|--------|
| Team size > 100 engineers | Evaluate splitting SDKs into separate repos |
| Regulatory requirement (e.g., air-gapped compliance) | Isolate on-prem agent into separate repo |
| Open-source community contribution volume > 50% of commits | Consider splitting dashboard/website for external contributors |
| CI build time consistently > 15 minutes | Implement Bazel/Turborepo for caching, not repo splitting |

**Rule:** Do not split repositories prematurely. Optimize CI, caching, and change detection first.

---

## 5. Proposed Monorepo Structure

```
featuresignals/
├── server/                    # Go API server, relay proxy, stalescan
│   ├── cmd/
│   │   ├── server/            # Main API server binary
│   │   ├── relay/             # Relay proxy binary
│   │   └── stalescan/         # Stale flag scanner
│   ├── internal/              # Core packages (hexagonal architecture)
│   │   ├── api/               # HTTP handlers, middleware, routing
│   │   ├── domain/            # Entities, interfaces, business logic
│   │   ├── store/             # PostgreSQL repository implementations
│   │   ├── eval/              # Flag evaluation engine
│   │   ├── auth/              # JWT, RBAC, session management
│   │   ├── license/           # License enforcement, phone-home
│   │   ├── cost/              # Cost attribution, financial engine
│   │   └── ...                # Other domain packages
│   ├── migrations/            # PostgreSQL migrations (golang-migrate)
│   ├── scripts/               # Seed data, dev scripts
│   ├── go.mod                 # Server dependencies
│   └── go.sum
├── dashboard/                 # Next.js customer dashboard
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── ops/                       # Next.js operations portal
│   ├── src/
│   ├── public/
│   ├── package.json
│   └── tsconfig.json
├── website/                   # Astro marketing site
├── docs/                      # Docusaurus documentation
├── sdks/                      # All SDKs (versioned with server)
│   ├── go/
│   ├── node/
│   ├── python/
│   ├── java/
│   ├── dotnet/
│   ├── ruby/
│   ├── react/
│   └── vue/
├── ci/                        # CI/CD scripts (CI-system-agnostic)
│   ├── scripts/               # Shared shell scripts
│   ├── github-actions/        # GitHub Actions workflows
│   ├── jenkins/               # Jenkinsfiles (future migration)
│   └── config/                # Pipeline configuration
├── infra/                     # Infrastructure as Code
│   ├── terraform/             # Terraform modules (VPS, networking, DNS)
│   ├── ansible/               # Ansible playbooks (OS config, Docker)
│   ├── scripts/               # Provisioning helper scripts
│   └── config/                # Region configs, rate cards, alerts
├── deploy/                    # Deployment artifacts
│   ├── docker/                # Dockerfiles
│   ├── helm/                  # Kubernetes Helm chart
│   └── compose/               # Docker Compose templates
├── .github/                   # GitHub-specific config
│   ├── workflows/             # CI/CD workflows
│   ├── CODEOWNERS             # Directory ownership
│   └── ISSUE_TEMPLATE/
├── CLAUDE.md                  # AI coding standards
├── Makefile                   # Root-level dev commands
├── .env.example               # Environment variable documentation
└── .gitignore
```

### 5.1 Directory Ownership Rules

| Directory | Owner | Review Required |
|-----------|-------|-----------------|
| `/server/` | Backend Team | Backend CODEOWNER |
| `/dashboard/` | Frontend Team | Frontend CODEOWNER |
| `/ops/` | Ops/Platform Team | Ops CODEOWNER |
| `/sdks/` | SDK Team | SDK CODEOWNER |
| `/infra/` | Infrastructure Team | Infra CODEOWNER |
| `/deploy/` | Infrastructure Team | Infra CODEOWNER |
| `/docs/` | Docs/DevRel Team | Docs CODEOWNER |
| `/website/` | Marketing Team | Marketing CODEOWNER |
| `/ci/` | DevOps/Platform Team | DevOps CODEOWNER |

---

## 6. Access Control & CODEOWNERS

### 6.1 CODEOWNERS Configuration

```yaml
# .github/CODEOWNERS

# Backend
/server/ @featuresignals/backend-team
/server/internal/domain/ @featuresignals/backend-team @featuresignals/architecture-review

# Frontend
/dashboard/ @featuresignals/frontend-team
/ops/ @featuresignals/ops-team

# SDKs
/sdks/go/ @featuresignals/sdk-team
/sdks/node/ @featuresignals/sdk-team
/sdks/python/ @featuresignals/sdk-team
/sdks/java/ @featuresignals/sdk-team
/sdks/dotnet/ @featuresignals/sdk-team
/sdks/ruby/ @featuresignals/sdk-team
/sdks/react/ @featuresignals/sdk-team
/sdks/vue/ @featuresignals/sdk-team

# Infrastructure
/infra/ @featuresignals/infra-team
/deploy/ @featuresignals/infra-team
/ci/ @featuresignals/devops-team

# Documentation & Marketing
/docs/ @featuresignals/docs-team
/website/ @featuresignals/marketing-team

# Root configuration
/Makefile @featuresignals/devops-team
/.github/ @featuresignals/devops-team
/CLAUDE.md @featuresignals/architecture-review
```

### 6.2 Branch Protection Rules

```yaml
# GitHub Repository Settings → Branches → main
branch_protection:
  main:
    require_pull_request_reviews:
      required_approving_review_count: 1
      dismiss_stale_reviews: true
      require_code_owner_reviews: true  # Requires CODEOWNER approval
    required_status_checks:
      strict: true
      contexts:
        - "ci-gate"
    enforce_admins: true  # Applies to founders too
    allow_force_pushes: false
    allow_deletions: false
    required_conversation_resolution: true
```

### 6.3 Permission Model

| Role | Repository Access | PR Approval Rights |
|------|-------------------|-------------------|
| **Founder** | Admin (all directories) | All directories |
| **Engineer** | Read/Write (all directories) | Own team directories |
| **Contractor** | Read/Write (assigned directories only) | Assigned directories only |
| **Auditor** | Read-only (all directories) | None |
| **CI Bot** | Write (automated PRs only) | None |

---

## 7. Build & CI Strategy in Monorepo

### 7.1 Change Detection Pipeline

```
PR Opened
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Change Detection (ci/scripts/detect-changes.sh)             │
│ 1. git diff --name-only base_sha head_sha                   │
│ 2. Match against path patterns:                             │
│    - ^server/ → server=true                                 │
│    - ^dashboard/ → dashboard=true                           │
│    - ^sdks/go/ → sdk-go=true                                │
│    - ^infra/ or ^deploy/ or ^ci/ → all=true                 │
│ 3. Output GitHub Actions environment variables              │
└─────────────────────────────────────────────────────────────┘
   │
   ▼
┌─────────────────────────────────────────────────────────────┐
│ Conditional Job Execution                                   │
│ if server=true or all=true → run server tests               │
│ if dashboard=true or all=true → run dashboard tests         │
│ if sdk-go=true or all=true → run Go SDK tests               │
│ ...                                                         │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 CI Performance Targets

| Metric | Target | Current | Optimization |
|--------|--------|---------|--------------|
| Change Detection | < 30s | ~15s | `git diff` with shallow fetch |
| Server Tests | < 3 min | ~2m 14s | PostgreSQL service container, parallel tests |
| Dashboard Tests | < 2 min | ~1m 52s | npm cache, Vitest parallelism |
| SDK Tests (all) | < 2 min | ~1m 45s | Run only changed SDKs |
| Security Scan | < 1 min | ~55s | govulncheck + npm audit parallel |
| **Total PR CI** | **< 5 min** | **~4m 30s** | Conditional execution + caching |

### 7.3 Caching Strategy

```yaml
# GitHub Actions caching example
- uses: actions/setup-go@v6
  with:
    go-version: "1.25.9"
    cache-dependency-path: server/go.sum

- uses: actions/setup-node@v5
  with:
    node-version: "22"
    cache: 'npm'
    cache-dependency-path: dashboard/package-lock.json

# Docker layer caching
- uses: docker/setup-buildx-action@v3
- uses: actions/cache@v4
  with:
    path: /tmp/.buildx-cache
    key: ${{ runner.os }}-buildx-${{ github.sha }}
    restore-keys: |
      ${{ runner.os }}-buildx-
```

---

## 8. SDK Versioning & Release Strategy

### 8.1 Co-Versioning Model

All SDKs are versioned in lockstep with the server. This guarantees protocol compatibility.

```
Server Version: v1.2.3
SDK Versions:   v1.2.3 (all SDKs)

Breaking Change:
  Server: v2.0.0
  SDKs:   v2.0.0 (all SDKs)

Patch Fix:
  Server: v1.2.4
  SDKs:   v1.2.4 (only affected SDKs, others stay at v1.2.3)
```

### 8.2 Release Process

```
1. Bump version in server/internal/version/version.go
2. Run make release (generates changelog, tags commit)
3. CI builds and publishes Docker images + SDK packages
4. GitHub Release created with auto-generated notes
5. SDK packages published to respective registries:
   - Go: pkg.go.dev
   - Node: npmjs.com
   - Python: pypi.org
   - Java: Maven Central
   - .NET: NuGet
   - Ruby: RubyGems
```

### 8.3 SDK Compatibility Matrix

| Server Version | SDK Version | Compatible? | Notes |
|----------------|-------------|-------------|-------|
| v1.x.x | v1.x.x | ✅ Yes | Same major version |
| v1.x.x | v2.x.x | ❌ No | Major version mismatch |
| v1.2.3 | v1.2.4 | ✅ Yes | Patch-level compatible |
| v1.2.3 | v1.3.0 | ⚠️ Check | Minor version may add features |

**Rule:** SDKs must always support the current and previous major server version for 6 months after a major release.

---

## 9. Migration & Refactoring Plan

### 9.1 Current State Assessment

The repository is already structured as a monorepo. No major restructuring is required. Minor improvements:

| Current | Proposed | Impact |
|---------|----------|--------|
| CI workflows in `.github/workflows/` | Move to `ci/github-actions/` | Cleaner separation, easier Jenkins migration |
| Terraform in `deploy/terraform/` | Move to `infra/terraform/` | Logical grouping with Ansible |
| Docker Compose files in root | Move to `deploy/compose/` | Cleaner root directory |
| No CODEOWNERS file | Create `.github/CODEOWNERS` | Enforce review boundaries |

### 9.2 Migration Steps

```
Week 1: Directory Restructuring
  ├── Move deploy/terraform/ → infra/terraform/
  ├── Move docker-compose.*.yml → deploy/compose/
  ├── Create ci/ directory structure
  └── Update import paths, Makefile targets, CI references

Week 2: CODEOWNERS & Branch Protection
  ├── Create .github/CODEOWNERS
  ├── Configure branch protection rules
  ├── Test PR review requirements
  └── Document team ownership matrix

Week 3: CI Optimization
  ├── Implement change detection script
  ├── Refactor workflows to use conditional execution
  ├── Add caching for Go, Node, Docker
  └── Benchmark CI performance improvements

Week 4: Validation & Documentation
  ├── Run full CI suite, verify all tests pass
  ├── Test SDK publishing pipeline
  ├── Update CLAUDE.md with new structure
  └── Conduct team training session
```

### 9.3 Rollback Plan

If restructuring causes issues:
1. Revert directory moves via `git revert`
2. Restore original CI workflows
3. Disable CODEOWNERS temporarily
4. Investigate and fix issues before retrying

---

## 10. Future Considerations

### 10.1 When to Introduce Build Tools

| Tool | When to Adopt | Benefit |
|------|---------------|---------|
| **Turborepo** | When Node.js packages > 5, build time > 5 min | Shared caching, task orchestration |
| **Bazel** | When polyglot builds become complex, CI > 15 min | Hermetic builds, remote caching |
| **Nx** | When workspace management becomes unwieldy | Dependency graph, affected commands |
| **Go Workspaces** | When Go modules > 10, cross-module imports frequent | Unified `go.mod` resolution |

**Current Recommendation:** Stick with `Makefile` + CI change detection. Introduce Turborepo only if dashboard/ops/docs build times exceed 5 minutes.

### 10.2 Open Source Strategy

If FeatureSignals goes fully open source:
- Keep core server + SDKs in public monorepo
- Move ops portal, billing, and internal infra to private repo
- Use GitHub's public/private repo visibility per directory (not supported natively, requires separate repos)
- **Alternative:** Keep monorepo public, use CODEOWNERS + branch protection for internal code review

### 10.3 Dependency Management

| Dependency | Management Strategy |
|------------|---------------------|
| Go modules | `go.mod` per package (`server/`, `sdks/go/`) |
| Node packages | `package.json` per package (`dashboard/`, `ops/`, `sdks/node/`, etc.) |
| Python packages | `pyproject.toml` per SDK |
| Java/Maven | `pom.xml` per SDK |
| Shared types | Generate from OpenAPI spec, commit to `server/internal/domain/types/` |

---

## 11. Implementation Checklist

### Phase 1: Restructuring (Week 1)
- [ ] Move `deploy/terraform/` → `infra/terraform/`
- [ ] Move `docker-compose.*.yml` → `deploy/compose/`
- [ ] Create `ci/` directory structure
- [ ] Update `Makefile` targets
- [ ] Update CI workflow paths
- [ ] Verify all tests pass after restructuring

### Phase 2: Access Control (Week 2)
- [ ] Create `.github/CODEOWNERS`
- [ ] Configure branch protection rules
- [ ] Set up team GitHub groups (`@featuresignals/backend-team`, etc.)
- [ ] Test PR review requirements
- [ ] Document ownership matrix in `docs/TEAM.md`

### Phase 3: CI Optimization (Week 3)
- [ ] Implement `ci/scripts/detect-changes.sh`
- [ ] Refactor workflows to use conditional execution
- [ ] Add Go, Node, Docker caching
- [ ] Benchmark CI performance (target: < 5 min)
- [ ] Document CI troubleshooting runbook

### Phase 4: SDK Release Pipeline (Week 4)
- [ ] Implement co-versioning script (`make release`)
- [ ] Configure SDK publishing to registries
- [ ] Test end-to-end release process
- [ ] Document SDK compatibility matrix
- [ ] Update `CLAUDE.md` with new structure

### Phase 5: Validation & Handoff (Week 5)
- [ ] Run full CI suite, verify zero failures
- [ ] Conduct team training on new workflow
- [ ] Update onboarding documentation
- [ ] Archive old directory structure references
- [ ] Final architecture review sign-off

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | Engineering | Initial repository strategy and monorepo architecture |

---

## Next Steps

1. **Review** this document with engineering leads and founders
2. **Approve** monorepo strategy and directory structure
3. **Execute** Phase 1 restructuring (low risk, high reward)
4. **Configure** CODEOWNERS and branch protection
5. **Optimize** CI with change detection and caching
6. **Document** team ownership and release processes
7. **Monitor** CI performance and adjust as team scales