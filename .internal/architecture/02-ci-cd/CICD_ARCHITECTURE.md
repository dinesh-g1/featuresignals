# FeatureSignals — CI/CD Pipeline Architecture

> **Version:** 1.1.0  
> **Status:** Design Document — Pending Review  
> **Author:** Engineering  
> **Last Updated:** 2026-01-15  
> **Audience:** Engineering, DevOps, QA

---

## Table of Contents

1. [Core Principles](#1-core-principles)
2. [Branch Protection & Workflow Rules](#2-branch-protection--workflow-rules)
3. [CI System Toggle Architecture](#3-ci-system-toggle-architecture)
4. [Pipeline Directory Structure](#4-pipeline-directory-structure)
5. [PR Pipeline (Pull Request)](#5-pr-pipeline-pull-request)
6. [Post-Merge Pipeline](#6-post-merge-pipeline)
7. [On-Demand Image Build](#7-on-demand-image-build)
8. [Environment Deployment Pipeline](#8-environment-deployment-pipeline)
9. [Shared Pipeline Scripts](#9-shared-pipeline-scripts)
10. [GitHub Actions Workflows](#10-github-actions-workflows)
11. [Jenkins Pipeline (Future)](#11-jenkins-pipeline-future)
12. [Security & Compliance](#12-security--compliance)
13. [Performance Optimization](#13-performance-optimization)
14. [Migration Guide: GitHub Actions → Jenkins](#14-migration-guide-github-actions--jenkins)
15. [Troubleshooting & Runbooks](#15-troubleshooting--runbooks)

---

## 1. Core Principles

### 1.1 Non-Negotiable Rules

1. **No direct commits to `main`** — Branch protection applies to everyone, including founders. All changes require a PR with at least 1 approval.
2. **CI runs on every PR** — Tests, lint, security scan, and build verification must pass before merge.
3. **Images are built on-demand** — Not pre-emptively on every PR. Images are built when:
   - A PR is merged to `main` (auto-publish `latest` + git SHA tag)
   - A tag is pushed (auto-publish version tag)
   - Ops Portal requests a specific commit (on-demand via `workflow_dispatch`)
4. **CI systems are fully independent** — GitHub Actions and Jenkins have **zero inter-dependency**. Each has its own complete, self-contained pipeline definition. No shared scripts. No cross-references. Delete `.github/workflows/` → Jenkins unaffected. Delete `ci/jenkins/` → GitHub Actions unaffected.
5. **Fast feedback** — PR CI should complete in < 5 minutes. Change detection skips unaffected jobs.
6. **Reproducible builds** — Same commit always produces the same image. No floating dependencies in build steps.

### 1.2 What CI Does NOT Do

| Action | Why Not |
|--------|---------|
| Build Docker images on PR | Wastes compute, registry space, and time. PRs often get abandoned. |
| Deploy on PR | Deployments happen post-merge or on-demand via Ops Portal. |
| Run integration tests on PR | Integration tests require real infrastructure. Run in post-merge or staging. |
| Push to production automatically | Production deploys are manual via Ops Portal with approval. |
| Share scripts between CI systems | Creates hidden dependencies. Each CI system must be independently deletable. |

---

## 2. Branch Protection & Workflow Rules

### 2.1 Branch Protection Configuration

```yaml
# GitHub Repository Settings → Branches → main branch protection
branch_protection:
  main:
    require_pull_request_reviews:
      required_approving_review_count: 1
      dismiss_stale_reviews: true
      require_code_owner_reviews: true
    required_status_checks:
      strict: true  # Require branch to be up-to-date
      contexts:
        - "ci-gate"  # Final gate job from CI pipeline
    restrictions: null  # No specific user restrictions (applies to all)
    enforce_admins: true  # Applies to founders too
    allow_force_pushes: false
    allow_deletions: false
    required_linear_history: false  # Merge commits allowed
    required_conversation_resolution: true
```

### 2.2 Branch Naming Convention

```
feature/short-description      # New features
fix/short-description          # Bug fixes
refactor/short-description     # Code refactoring
docs/short-description         # Documentation updates
chore/short-description        # Maintenance tasks
hotfix/short-description       # Urgent production fixes
release/v1.2.3                 # Release branches
```

### 2.3 PR Workflow

```
Developer creates feature branch from main
       │
       ▼
Developer pushes branch to GitHub
       │
       ▼
Developer opens PR → CI pipeline triggers automatically
       │
       ▼
CI runs: change detection → tests → security → gate
       │
       ▼
If CI passes: PR is mergeable
If CI fails: Developer fixes, pushes new commit, CI re-runs
       │
       ▼
Reviewer reviews code → Approves or requests changes
       │
       ▼
PR merged to main → Post-merge pipeline triggers
```

---

## 3. CI System Independence (Zero Inter-Dependency)

### 3.1 Design Philosophy

GitHub Actions and Jenkins are **completely independent**. Each has its own complete, self-contained pipeline definition. No shared scripts. No cross-references. No toggle. This means:

- Delete `.github/workflows/` → Jenkins continues working unaffected.
- Delete `ci/jenkins/` → GitHub Actions continues working unaffected.
- Switching CI systems requires no code changes — just enable one, disable the other.

```
┌─────────────────────────────────────────────────────────────┐
│              CI System Independence                          │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ci/github-actions/              # COMPLETE pipeline         │
│  ├── workflows/                                                │
│  │   ├── ci.yml              # PR pipeline (self-contained)  │
│  │   ├── post-merge.yml      # Post-merge (self-contained)   │
│  │   └── build-images.yml    # On-demand (self-contained)    │
│  └── README.md               # GitHub Actions documentation  │
│                                                              │
│  ci/jenkins/                     # COMPLETE pipeline         │
│  ├── Jenkinsfile.ci            # PR pipeline (self-contained)│
│  ├── Jenkinsfile.post-merge    # Post-merge (self-contained) │
│  └── Jenkinsfile.build-images  # On-demand (self-contained)  │
│  └── README.md                 # Jenkins documentation       │
│                                                              │
│  NO shared scripts. NO toggle. NO inter-dependency.          │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 3.2 Why No Shared Scripts?

The previous architecture proposed shared scripts under `ci/scripts/` called by both CI systems. This creates a hidden dependency: if you delete GitHub Actions, the shared scripts might still be referenced or assumed to exist.

**The corrected approach:** Each CI system contains its own complete pipeline logic. Yes, there is duplication — but it's intentional and acceptable because:

1. **Zero inter-dependency** — Deleting one system doesn't break the other.
2. **CI systems are stable** — Pipeline logic doesn't change frequently.
3. **Duplication is isolated** — Only CI definition files are duplicated. Application code, tests, and infrastructure are shared.
4. **Migration is one-way** — Once you migrate to Jenkins, you won't migrate back.

### 3.3 Switching CI Systems

To switch from GitHub Actions to Jenkins:
```bash
# Step 1: Set up Jenkins server (once)
# Step 2: Configure Jenkins to use ci/jenkins/Jenkinsfile.*
# Step 3: Disable GitHub Actions workflows (via GitHub UI or rm .github/workflows/*.yml)
# Step 4: Jenkins runs independently. No code changes needed.
```

To switch back:
```bash
# Step 1: Re-enable GitHub Actions workflows (git checkout main -- .github/workflows/*.yml)
# Step 2: Disable Jenkins jobs (via Jenkins UI)
# Step 3: GitHub Actions runs independently. No code changes needed.
```

---

## 4. Pipeline Directory Structure

```
ci/
├── README.md                      # CI/CD documentation
├── github-actions/                # COMPLETE GitHub Actions pipeline
│   ├── workflows/
│   │   ├── ci.yml                 # PR pipeline (self-contained)
│   │   ├── post-merge.yml         # Post-merge pipeline (self-contained)
│   │   ├── build-images.yml       # On-demand image build (self-contained)
│   │   └── deploy.yml             # Environment deployment (self-contained)
│   └── README.md                  # GitHub Actions documentation
├── jenkins/                       # COMPLETE Jenkins pipeline
│   ├── Jenkinsfile.ci             # PR pipeline (self-contained)
│   ├── Jenkinsfile.post-merge     # Post-merge pipeline (self-contained)
│   ├── Jenkinsfile.build-images   # On-demand build (self-contained)
│   └── Jenkinsfile.deploy         # Environment deployment (self-contained)
└── README.md                      # CI system overview
```

---

## 4. PR Pipeline (Pull Request)

### 4.1 Pipeline Stages

```
┌─────────────────────────────────────────────────────────────┐
│                     PR CI Pipeline                           │
│  Trigger: pull_request to main                               │
│  Target Duration: < 5 minutes                                │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Stage 1: Change Detection (parallel, ~30s)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ detect-changes.sh                                       │ │
│  │ ├── Compares PR diff against base branch                │ │
│  │ ├── Outputs: server, dashboard, ops, sdk-*, deploy      │ │
│  │ └── Conditional: which jobs need to run                 │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Stage 2: Tests (parallel, conditional, ~3-4 min)            │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ server-tests:                                           │ │
│  │   ├── go test ./... -race -cover -timeout 120s          │ │
│  │   ├── go vet ./...                                      │ │
│  │   └── Coverage: 80%+ (95%+ for eval, auth, billing)     │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ dashboard-tests:                                        │ │
│  │   ├── npm ci                                            │ │
│  │   ├── npx vitest run --coverage                         │ │
│  │   ├── tsc --noEmit                                      │ │
│  │   └── next build                                        │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ ops-tests:                                              │ │
│  │   ├── npm ci                                            │ │
│  │   ├── tsc --noEmit                                      │ │
│  │   └── next build                                        │ │
│  ├────────────────────────────────────────────────────────┤ │
│  │ sdk-tests (parallel per SDK):                           │ │
│  │   ├── Go SDK: go test ./... -race                       │ │
│  │   ├── Node SDK: npm test                                │ │
│  │   ├── Python SDK: pytest                                │ │
│  │   ├── Java SDK: mvn test                                │ │
│  │   └── ... (other SDKs)                                  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Stage 3: Security (parallel, ~1-2 min)                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ security-scan:                                          │ │
│  │   ├── govulncheck ./... (server + Go SDK)               │ │
│  │   ├── npm audit --audit-level=high (all Node projects)  │ │
│  │   └── trivy image scan (Dockerfile.server, .dashboard)  │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Stage 4: Gate (always runs)                                 │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ ci-gate:                                                │ │
│  │   ├── Collects results from all stages                  │ │
│  │   ├── Fails if any stage failed or was cancelled        │ │
│  │   └── Posts summary to PR                               │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 4.2 Change Detection

Change detection is implemented **inline** within each CI system's pipeline definition. GitHub Actions uses `git diff` in a workflow step. Jenkins uses `git diff` in a Jenkinsfile stage. The logic is duplicated but self-contained in each system.

**GitHub Actions example:**
```yaml
- name: Detect changed paths
  id: filter
  run: |
    BASE_SHA="${{ github.event.pull_request.base.sha }}"
    HEAD_SHA="${{ github.event.pull_request.head.sha }}"
    CHANGED_FILES=$(git diff --name-only "$BASE_SHA" "$HEAD_SHA")
    has_changed() { echo "$CHANGED_FILES" | grep -qE "$1" && echo "true" || echo "false"; }
    echo "server=$(has_changed '^server/')" >> "$GITHUB_OUTPUT"
    echo "dashboard=$(has_changed '^dashboard/')" >> "$GITHUB_OUTPUT"
```

**Jenkins example:**
```groovy
def changedFiles = sh(script: "git diff --name-only ${baseSha} ${headSha}", returnStdout: true).trim()
env.SERVER_CHANGED = changedFiles.contains('server/') ? 'true' : 'false'
env.DASHBOARD_CHANGED = changedFiles.contains('dashboard/') ? 'true' : 'false'
```

### 4.3 Conditional Job Execution

Jobs only run if their paths changed OR if the `deploy/` or `ci/` paths changed (infrastructure changes affect everything):

```yaml
# Example: server-tests job condition
if: >-
  needs.detect-changes.outputs.server == 'true'
  || needs.detect-changes.outputs.deploy == 'true'
  || needs.detect-changes.outputs.ci == 'true'
```

### 4.4 PR Pipeline Output

The `ci-gate` job posts a summary to the PR:

```markdown
### CI Gate Results

| Job | Result | Duration |
|-----|--------|----------|
| Server: Test & Coverage | ✅ success | 2m 14s |
| Server: Lint & Vet | ✅ success | 0m 45s |
| Dashboard: Test & Build | ✅ success | 1m 52s |
| Ops Portal: Build | ✅ success | 1m 10s |
| SDK: Go | ✅ success | 0m 38s |
| SDK: Node.js | ✅ success | 0m 22s |
| SDK: Python | ✅ success | 0m 45s |
| SDK: Java | ✅ success | 1m 05s |
| Security Scan | ✅ success | 0m 55s |

**All checks passed.** PR is mergeable.
```

---

## 5. Post-Merge Pipeline

### 5.1 Pipeline Stages

```
┌─────────────────────────────────────────────────────────────┐
│                   Post-Merge Pipeline                        │
│  Trigger: push to main                                       │
│  Target Duration: < 10 minutes                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  Stage 1: Full CI Suite (same as PR, but all jobs run)       │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ Runs all tests, lint, security scans (no change detection│ │
│  │ skip — everything runs on main)                         │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Stage 2: Build Docker Images (parallel, ~5-7 min)           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ build-images.sh                                         │ │
│  │ ├── Build server image (linux/amd64, linux/arm64)       │ │
│  │ ├── Build dashboard image (linux/amd64, linux/arm64)    │ │
│  │ ├── Build ops portal image (linux/amd64, linux/arm64)   │ │
│  │ ├── Build relay proxy image (linux/amd64, linux/arm64)  │ │
│  │ └── Tag images: latest + sha-xxxxxxx                    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Stage 3: Push to GHCR (parallel, ~2-3 min)                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ docker push to ghcr.io/featuresignals/*                 │ │
│  │ ├── server:latest, server:sha-xxxxxxx                   │ │
│  │ ├── dashboard:latest, dashboard:sha-xxxxxxx             │ │
│  │ ├── ops:latest, ops:sha-xxxxxxx                         │ │
│  │ └── relay:latest, relay:sha-xxxxxxx                     │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Stage 4: Notify Ops Portal                                  │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ POST /api/v1/ops/images/new                             │ │
│  │ {                                                       │ │
│  │   "image": "server",                                    │ │
│  │   "tag": "sha-xxxxxxx",                                 │ │
│  │   "commit": "full-sha",                                 │ │
│  │   "commit_message": "fix: resolve race condition"       │ │
│  │ }                                                       │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
│  Stage 5: (Optional) Auto-Deploy to Dev                      │
│  ┌────────────────────────────────────────────────────────┐ │
│  │ If AUTO_DEPLOY_DEV=true in config:                      │ │
│  │   ├── deploy-to-env.sh dev sha-xxxxxxx                  │ │
│  │   ├── smoke-test.sh dev                                 │ │
│  │   └── Notify Slack: "Dev env updated to sha-xxxxxxx"    │ │
│  └────────────────────────────────────────────────────────┘ │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 5.2 Image Tagging Strategy

```
Tag Format:
  latest          — Always points to the most recent main commit
  sha-xxxxxxx     — Short SHA (7 chars) for specific commits
  v1.2.3          — Semantic version (on tag push only)
  v1.2.3-rc.1     — Pre-release version

Examples:
  ghcr.io/featuresignals/server:latest
  ghcr.io/featuresignals/server:sha-a1b2c3d
  ghcr.io/featuresignals/server:v1.2.3
  ghcr.io/featuresignals/dashboard:sha-a1b2c3d
```

### 5.3 Image Retention Policy

```
GHCR Image Retention:
  ├── latest tag: Always kept
  ├── Version tags (v*): Always kept
  ├── SHA tags: Kept for 30 days, then auto-deleted
  └── Untagged images: Deleted immediately

Cleanup Schedule:
  └── Weekly cron job (Sunday 02:00 UTC)
      └── ci/scripts/cleanup-images.sh
          ├── Delete SHA tags older than 30 days
          ├── Delete untagged images
          └── Report storage usage
```

---

## 6. On-Demand Image Build

### 6.1 Trigger Mechanism

```yaml
# ci/github-actions/build-images.yml
on:
  workflow_dispatch:
    inputs:
      git_ref:
        description: "Git ref to build from (branch, tag, or SHA)"
        required: true
        type: string
      push_images:
        description: "Push built images to GHCR"
        type: boolean
        default: true
      skip_tests:
        description: "Skip CI tests (build only)"
        type: boolean
        default: false
      images:
        description: "Images to build (comma-separated: server,dashboard,ops,relay)"
        type: string
        default: "server,dashboard,ops,relay"
```

### 6.2 Use Cases

| Use Case | git_ref | push_images | skip_tests |
|----------|---------|-------------|------------|
| Test feature branch in sandbox | `feature/my-branch` | `true` | `true` |
| Build release candidate | `v1.2.3-rc.1` | `true` | `false` |
| Hotfix build | `hotfix/critical-bug` | `true` | `true` |
| Local testing only | `main` | `false` | `false` |

### 6.3 Build Implementation

Build logic is defined **inline** within each CI system's pipeline. GitHub Actions uses `docker/build-push-action`. Jenkins uses `sh` steps with `docker buildx`. The logic is duplicated but self-contained.

**GitHub Actions:**
```yaml
- name: Build server image
  uses: docker/build-push-action@v6
  with:
    context: ./server
    file: deploy/docker/Dockerfile.server
    platforms: linux/amd64,linux/arm64
    push: ${{ inputs.push_images }}
    tags: ghcr.io/featuresignals/server:sha-${{ steps.tags.outputs.sha_short }}
```

**Jenkins:**
```groovy
sh '''
  docker buildx build \
    --platform linux/amd64,linux/arm64 \
    --file deploy/docker/Dockerfile.server \
    --tag ghcr.io/featuresignals/server:sha-${GIT_COMMIT:0:7} \
    --push \
    ./server
'''
```

---

## 7. Environment Deployment Pipeline

### 7.1 Deployment Flow

```
┌─────────────────────────────────────────────────────────────┐
│                Environment Deployment                        │
│  Trigger: Ops Portal API or workflow_dispatch                │
│  Target Duration: < 10 minutes                               │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  1. Validate inputs                                          │
│     ├── Environment exists and is active                     │
│     ├── Image tag exists in GHCR                             │
│     ├── VPS host is reachable                                │
│     └── Secrets are configured                               │
│                                                              │
│  2. Prepare deployment                                       │
│     ├── SSH to VPS                                           │
│     ├── Write .env from secrets                              │
│     ├── Set IMAGE_TAG to target                              │
│     └── Pull new image                                       │
│                                                              │
│  3. Deploy                                                   │
│     ├── docker compose down (graceful)                       │
│     ├── docker compose up -d                                 │
│     ├── Wait for health checks                               │
│     └── Run migrations if needed                             │
│                                                              │
│  4. Verify                                                   │
│     ├── Smoke test: GET /health                              │
│     ├── Smoke test: GET /v1/client/{env}/flags               │
│     └── Verify image tag matches expected                    │
│                                                              │
│  5. Notify                                                   │
│     ├── Update Ops Portal: env status = active               │
│     ├── Slack notification                                   │
│     └── Audit log entry                                      │
│                                                              │
└─────────────────────────────────────────────────────────────┘
```

### 7.2 Deploy Implementation

Deploy logic is defined **inline** within each CI system's pipeline.

**GitHub Actions:**
```yaml
- name: Deploy to environment
  uses: appleboy/ssh-action@v1
  with:
    host: ${{ secrets.VPS_HOST }}
    username: deploy
    key: ${{ secrets.VPS_SSH_KEY }}
    script: |
      cd /opt/featuresignals
      sed -i "s/^IMAGE_TAG=.*/IMAGE_TAG=${{ inputs.image_tag }}/" .env
      docker compose pull
      docker compose down --timeout 30
      docker compose up -d
```

**Jenkins:**
```groovy
sh '''
  ssh -o StrictHostKeyChecking=no deploy@$VPS_HOST "
    cd /opt/featuresignals
    sed -i 's/^IMAGE_TAG=.*/IMAGE_TAG=$IMAGE_TAG/' .env
    docker compose pull
    docker compose down --timeout 30
    docker compose up -d
  "
'''
```

---

## 8. Pipeline Standards

### 8.1 Script Standards (Inline)

Since each CI system has its own complete pipeline, scripts are defined inline within the pipeline definition. However, common patterns should be consistent:

- **Shell scripts** use `set -euo pipefail` for strict error handling.
- **Argument validation** uses `${VAR:?required}` syntax.
- **Logging** uses timestamped output: `[$(date -u '+%Y-%m-%dT%H:%M:%SZ')] message`.
- **Retries** use exponential backoff with jitter.

### 8.2 Common Patterns

**Retry with exponential backoff (GitHub Actions):**
```yaml
- name: Retry command
  run: |
    for i in 1 2 4 8 16; do
      if my_command; then break; fi
      echo "Retrying in ${i}s..."
      sleep $i
    done
```

**Retry with exponential backoff (Jenkins):**
```groovy
retry(count: 5) {
  sh 'my_command || sleep $((RANDOM % 16 + 1))'
}
```

---

## 9. GitHub Actions Workflows

### 9.1 CI Workflow (PR)

```yaml
# ci/github-actions/workflows/ci.yml
#
# COMPLETE GitHub Actions PR pipeline.
# No dependencies on Jenkins or shared scripts.
# Can be deleted without affecting Jenkins.
name: "CI"

on:
  pull_request:
    branches: [main]
  workflow_dispatch:
    inputs:
      skip_sdk_tests:
        description: "Skip SDK tests"
        type: boolean
        default: false

permissions:
  contents: read
  pull-requests: read

jobs:
  detect-changes:
    name: "Detect Changes"
    runs-on: ubuntu-latest
    outputs:
      server: ${{ steps.filter.outputs.server }}
      dashboard: ${{ steps.filter.outputs.dashboard }}
      ops: ${{ steps.filter.outputs.ops }}
      sdk-go: ${{ steps.filter.outputs.sdk-go }}
      sdk-node: ${{ steps.filter.outputs.sdk-node }}
      deploy: ${{ steps.filter.outputs.deploy }}
      ci: ${{ steps.filter.outputs.ci }}
    steps:
      - uses: actions/checkout@v5
        with:
          fetch-depth: 0
      - name: Detect changed paths
        id: filter
        run: |
          BASE_SHA="${{ github.event.pull_request.base.sha }}"
          HEAD_SHA="${{ github.event.pull_request.head.sha }}"
          bash ci/scripts/detect-changes.sh "$BASE_SHA" "$HEAD_SHA" >> "$GITHUB_OUTPUT"

  server-tests:
    name: "Server: Test & Coverage"
    needs: detect-changes
    if: >-
      needs.detect-changes.outputs.server == 'true'
      || needs.detect-changes.outputs.deploy == 'true'
      || needs.detect-changes.outputs.ci == 'true'
    runs-on: ubuntu-latest
    services:
      postgres:
        image: postgres:16-alpine
        env:
          POSTGRES_USER: fs
          POSTGRES_PASSWORD: fsdev
          POSTGRES_DB: featuresignals
        ports: ["5432:5432"]
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-go@v6
        with:
          go-version: "1.25.9"
          cache-dependency-path: server/go.sum
      - name: Run tests
        run: bash ci/scripts/run-server-tests.sh
        env:
          TEST_DATABASE_URL: postgres://fs:fsdev@localhost:5432/featuresignals?sslmode=disable

  # ... (dashboard-tests, ops-tests, sdk-tests follow same pattern)
  # Each job is self-contained with its own setup, test, and coverage steps.

  security-scan:
    name: "Security: Dependency Scan"
    needs: detect-changes
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Run security scan
        run: bash ci/scripts/run-security-scan.sh

  ci-gate:
    name: "CI Gate"
    if: always()
    needs: [server-tests, dashboard-tests, ops-tests, sdk-tests, security-scan]
    runs-on: ubuntu-latest
    steps:
      - name: Evaluate results
        run: |
          if [[ "${{ needs.server-tests.result }}" == "failure" || 
                "${{ needs.dashboard-tests.result }}" == "failure" ||
                "${{ needs.security-scan.result }}" == "failure" ]]; then
            echo "::error::One or more CI jobs failed"
            exit 1
          fi
          echo "All CI checks passed"
```

### 10.2 Post-Merge Workflow

```yaml
# ci/github-actions/post-merge.yml
name: "Post-Merge Pipeline"

on:
  push:
    branches: [main]

permissions:
  contents: read
  packages: write

jobs:
  full-ci:
    name: "Full CI Suite"
    uses: ./.github/workflows/ci.yml
    with:
      skip_sdk_tests: false

  build-and-push:
    name: "Build & Push Images"
    needs: full-ci
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Build and push
        run: |
          bash ci/scripts/build-images.sh \
            "${{ github.sha }}" \
            "true" \
            "false" \
            "server,dashboard,ops,relay"
        env:
          GHCR_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          GHCR_USERNAME: ${{ github.actor }}

  notify-ops:
    name: "Notify Ops Portal"
    needs: build-and-push
    runs-on: ubuntu-latest
    steps:
      - name: Notify Ops Portal
        run: |
          curl -sf -X POST "https://ops.featuresignals.com/api/v1/ops/images/new" \
            -H "Authorization: Bearer $OPS_API_TOKEN" \
            -H "Content-Type: application/json" \
            -d "{
              \"image\": \"server\",
              \"tag\": \"sha-$(git rev-parse --short=7 $GITHUB_SHA)\",
              \"commit\": \"$GITHUB_SHA\",
              \"commit_message\": \"$(git log -1 --pretty=%B | head -1)\"
            }"
        env:
          OPS_API_TOKEN: ${{ secrets.OPS_API_TOKEN }}

  auto-deploy-dev:
    name: "Auto-Deploy to Dev"
    needs: build-and-push
    if: vars.AUTO_DEPLOY_DEV == 'true'
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - name: Deploy to dev
        run: |
          bash ci/scripts/deploy-to-env.sh \
            "dev" \
            "sha-$(git rev-parse --short=7 $GITHUB_SHA)"
        env:
          OPS_API_TOKEN: ${{ secrets.OPS_API_TOKEN }}
```

---

## 10. Jenkins Pipeline (Future)

### 10.1 Jenkinsfile.ci (PR Pipeline)

```groovy
// ci/jenkins/Jenkinsfile.ci
//
// COMPLETE Jenkins PR pipeline.
// No dependencies on GitHub Actions or shared scripts.
// Can be deleted without affecting GitHub Actions.
pipeline {
    agent {
        docker {
            image 'ubuntu:24.04'
            args '-v /var/run/docker.sock:/var/run/docker.sock'
        }
    }
    
    environment {
        CI_SYSTEM = 'jenkins'
        GHCR_TOKEN = credentials('ghcr-token')
        GHCR_USERNAME = credentials('ghcr-username')
    }
    
    stages {
        stage('Checkout') {
            steps {
                checkout scm
                sh 'git fetch origin ${env.CHANGE_TARGET}:refs/remotes/origin/${env.CHANGE_TARGET}'
            }
        }
        
        stage('Detect Changes') {
            steps {
                script {
                    def changes = sh(
                        script: "bash ci/scripts/detect-changes.sh origin/${env.CHANGE_TARGET} HEAD",
                        returnStdout: true
                    ).trim()
                    env.CHANGES = changes
                }
            }
        }
        
        stage('Server Tests') {
            when {
                expression { env.CHANGES.contains('server=true') || 
                             env.CHANGES.contains('deploy=true') ||
                             env.CHANGES.contains('ci=true') }
            }
            steps {
                sh 'bash ci/scripts/run-server-tests.sh'
            }
        }
        
        stage('Dashboard Tests') {
            when {
                expression { env.CHANGES.contains('dashboard=true') || 
                             env.CHANGES.contains('deploy=true') ||
                             env.CHANGES.contains('ci=true') }
            }
            steps {
                sh 'bash ci/scripts/run-dashboard-tests.sh'
            }
        }
        
        stage('Security Scan') {
            steps {
                sh 'bash ci/scripts/run-security-scan.sh'
            }
        }
    }
    
    post {
        always {
            junit allowEmptyResults: true, testResults: '**/test-results/*.xml'
        }
        failure {
            slackSend color: 'danger', message: "CI failed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
        success {
            slackSend color: 'good', message: "CI passed: ${env.JOB_NAME} #${env.BUILD_NUMBER}"
        }
    }
}
```

### 10.2 Jenkinsfile.post-merge

```groovy
// ci/jenkins/Jenkinsfile.post-merge
//
// COMPLETE Jenkins post-merge pipeline.
// No dependencies on GitHub Actions or shared scripts.
pipeline {
    agent any
    
    environment {
        CI_SYSTEM = 'jenkins'
        GHCR_TOKEN = credentials('ghcr-token')
        GHCR_USERNAME = credentials('ghcr-username')
        OPS_API_TOKEN = credentials('ops-api-token')
    }
    
    stages {
        stage('Full CI') {
            steps {
                build job: 'featuresignals-ci', wait: true
            }
        }
        
        stage('Build & Push Images') {
            steps {
                sh '''
                    bash ci/scripts/build-images.sh \
                        "${GIT_COMMIT}" \
                        "true" \
                        "false" \
                        "server,dashboard,ops,relay"
                '''
            }
        }
        
        stage('Notify Ops Portal') {
            steps {
                sh '''
                    curl -sf -X POST "https://ops.featuresignals.com/api/v1/ops/images/new" \\
                        -H "Authorization: Bearer $OPS_API_TOKEN" \\
                        -H "Content-Type: application/json" \\
                        -d "{
                            \\"image\\": \\"server\\",
                            \\"tag\\": \\"sha-$(git rev-parse --short=7 $GIT_COMMIT)\\",
                            \\"commit\\": \\"$GIT_COMMIT\\"
                        }"
                '''
            }
        }
    }
}
```

### 10.3 Jenkins Setup Requirements

```
Jenkins Server Requirements:
  ├── Ubuntu 24.04 LTS
  ├── Docker + Docker Compose
  ├── Jenkins LTS (latest)
  ├── Plugins:
  │   ├── Docker Pipeline
  │   ├── GitHub Integration
  │   ├── Slack Notification
  │   ├── Credentials Binding
  │   └── Pipeline: Stage View
  └── Agents:
      ├── 1 controller (4 vCPU, 8GB RAM)
      └── 2 Docker agents (dynamic, scale as needed)

Jenkins Credentials:
  ├── ghcr-token (GitHub Container Registry)
  ├── ghcr-username (GitHub username)
  ├── ops-api-token (Ops Portal API token)
  ├── vps-ssh-key (SSH key for VPS deployment)
  └── slack-token (Slack notification token)
```

---

## 11. Security & Compliance

### 11.1 Secrets Management

```
Secrets Storage:
  ├── GitHub Actions: Repository secrets + environment secrets
  ├── Jenkins: Jenkins Credentials Store
  └── Never in code, config files, or logs

Required Secrets:
  ├── GHCR_TOKEN / GHCR_USERNAME — Container registry auth
  ├── OPS_API_TOKEN — Ops Portal API auth
  ├── VPS_SSH_KEY — SSH key for VPS deployment
  ├── SLACK_TOKEN — Slack notifications
  └── SOPS_AGE_KEY — Secrets decryption (for env configs)
```

### 11.2 Pipeline Security Rules

| Rule | Implementation |
|------|----------------|
| No secrets in logs | Scripts redact secrets before logging |
| PRs from forks run in restricted mode | No access to secrets, read-only |
| Image signing | Cosign signing for production images |
| SBOM generation | Syft SBOM generation on image build |
| Dependency scanning | govulncheck, npm audit, trivy |
| Branch protection | Enforced at GitHub/org level |
| Audit trail | All pipeline runs logged to Ops Portal |

### 11.3 Image Security

Image scanning is defined inline within each CI system's pipeline.

**GitHub Actions:**
```yaml
- name: Scan image
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: ghcr.io/featuresignals/server:sha-${{ github.sha }}
    severity: HIGH,CRITICAL
    exit-code: 1
```

**Jenkins:**
```groovy
sh 'trivy image --severity HIGH,CRITICAL --exit-code 1 ghcr.io/featuresignals/server:sha-${GIT_COMMIT:0:7}'
```

---

## 12. Performance Optimization

### 12.1 CI Performance Targets

| Stage | Target Duration | Current |
|-------|-----------------|---------|
| Change Detection | < 30s | ~15s |
| Server Tests | < 3 min | ~2m 14s |
| Dashboard Tests | < 2 min | ~1m 52s |
| SDK Tests (all) | < 2 min | ~1m 45s |
| Security Scan | < 1 min | ~55s |
| **Total PR CI** | **< 5 min** | **~4m 30s** |

### 12.2 Optimization Techniques

```
1. Change Detection
   └── Skip unaffected jobs (saves 60-70% on small PRs)

2. Parallel Execution
   └── All test jobs run in parallel (not sequential)

3. Caching
   ├── Go: go mod download cache
   ├── Node: npm ci cache (node_modules)
   ├── Python: pip cache
   └── Docker: buildx layer cache

4. Resource Allocation
   ├── Server tests: 4 vCPU, 8GB RAM (PostgreSQL service)
   ├── Dashboard tests: 2 vCPU, 4GB RAM
   └── SDK tests: 1 vCPU, 2GB RAM each

5. Timeout Configuration
   ├── Server tests: 120s
   ├── Dashboard tests: 180s
   └── Security scan: 60s
```

### 12.3 Cache Configuration

```yaml
# Example: Go cache in GitHub Actions
- uses: actions/setup-go@v6
  with:
    go-version: "1.25.9"
    cache-dependency-path: server/go.sum

# Example: Node cache
- uses: actions/setup-node@v5
  with:
    node-version: "22"
    cache: 'npm'
    cache-dependency-path: dashboard/package-lock.json
```

---

## 13. Migration Guide: GitHub Actions → Jenkins

### 13.1 Pre-Migration Checklist

- [ ] Jenkins server provisioned and accessible
- [ ] Docker agents configured
- [ ] All secrets migrated to Jenkins Credentials Store
- [ ] Jenkinsfiles tested in dry-run mode
- [ ] Team trained on Jenkins UI
- [ ] Rollback plan documented

### 13.2 Migration Steps

```
Step 1: Parallel Run (Week 1-2)
  ├── Keep GitHub Actions active
  ├── Set up Jenkins to run same pipelines
  ├── Compare results (should be identical)
  └── Fix any discrepancies

Step 2: Toggle Switch (Week 3)
  ├── Set CI_SYSTEM=jenkins in Ops Portal config
  ├── Disable GitHub Actions workflows (don't delete)
  ├── Monitor Jenkins for 48 hours
  └── Verify all pipelines run correctly

Step 3: Cleanup (Week 4)
  ├── Archive GitHub Actions workflows
  ├── Remove GitHub secrets (keep as backup for 30 days)
  ├── Update documentation
  └── Notify team of completion
```

### 13.3 Rollback Procedure

```bash
# If Jenkins fails, rollback to GitHub Actions:
# 1. Re-enable GitHub Actions workflows (git checkout main -- .github/workflows/*.yml)
# 2. Disable Jenkins jobs (via Jenkins UI)
# 3. Monitor for 24 hours
# 4. Investigate Jenkins issues
```

### 13.4 Differences Between CI Systems

| Aspect | GitHub Actions | Jenkins |
|--------|---------------|---------|
| Trigger | Native GitHub events | Webhook from GitHub |
| Secrets | Repository/Environment secrets | Jenkins Credentials Store |
| Runners | GitHub-hosted or self-hosted | Docker agents |
| UI | GitHub PR checks | Jenkins dashboard |
| Cost | Free for public, paid for private | Self-hosted (VPS cost) |
| Scalability | Auto-scales | Manual agent scaling |

---

## 14. Troubleshooting & Runbooks

### 14.1 Common Issues

| Issue | Cause | Resolution |
|-------|-------|------------|
| CI stuck on "Detect Changes" | Git fetch-depth too shallow | Increase fetch-depth to 0 |
| Server tests fail with "connection refused" | PostgreSQL not ready | Add health check wait |
| Image build fails on arm64 | QEMU not set up | Add `docker/setup-qemu-action` |
| Deploy fails with "permission denied" | SSH key not configured | Add VPS_SSH_KEY to secrets |
| Security scan fails with false positive | Outdated Trivy database | Update Trivy before scan |

### 14.2 Debug Mode

Enable debug logging within each CI system:

**GitHub Actions:**
```yaml
- name: Debug
  run: echo "::debug::Detailed information here"
  env:
    ACTIONS_RUNNER_DEBUG: true
```

**Jenkins:**
```groovy
sh 'set -x; my_command'  // Enable shell debug mode
```

### 14.3 Manual Intervention

**Re-build an image manually (GitHub Actions):**
- Navigate to Actions → Build & Publish Images → Run workflow
- Select git_ref, push_images, skip_tests

**Re-build an image manually (Jenkins):**
- Navigate to Jenkins → Build Images → Build with Parameters
- Fill in git_ref, push_images, skip_tests

**Re-deploy to an environment manually:**
- Both systems: Use Ops Portal → Environments → Select env → Deploy

---

## Document History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0.0 | 2026-01-15 | Engineering | Initial CI/CD architecture document |
| 1.1.0 | 2026-01-15 | Engineering | Removed shared scripts, zero inter-dependency between GitHub Actions and Jenkins, inline pipeline definitions |

---

## Next Steps

1. **Review** this document with engineering team
2. **Create** GitHub Actions workflows (self-contained, no shared scripts)
3. **Create** Jenkinsfiles (self-contained, no shared scripts)
4. **Test** both CI systems independently
5. **Disable** one system when ready to switch (no code changes needed)