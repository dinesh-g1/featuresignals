# FeatureSignals — Developer Workflow & Contribution Guide

This document defines how every developer (including founders) ships code at FeatureSignals. **No exceptions.** Nobody pushes directly to `main`. Everything goes through branches, pull requests, code review, CI, and merge.

---

## 1. Golden Rule

```
main is always deployable. Never commit directly to main.
```

Branch protection is enforced for **all users including admins**. Every change requires:
- A pull request
- At least 1 approving review (code owner review required)
- All CI checks passing (Server tests, Server lint, Dashboard tests)
- All review conversations resolved
- Linear commit history (no merge commits — squash or rebase only)

---

## 2. Branch Naming Convention

Every branch name follows the pattern:

```
<type>/<ticket-or-short-id>-<kebab-case-description>
```

### Branch Types

| Type | When to Use | Example |
|------|-------------|---------|
| `feature/` | New functionality | `feature/FS-42-saml-sso-login` |
| `fix/` | Bug fix | `fix/FS-108-session-expired-cross-region` |
| `hotfix/` | Urgent production fix | `hotfix/FS-200-eval-cache-nil-panic` |
| `chore/` | Maintenance, deps, CI, docs | `chore/upgrade-go-1-25` |
| `refactor/` | Code restructuring (no behavior change) | `refactor/extract-eval-middleware` |
| `perf/` | Performance improvement | `perf/FS-77-ruleset-cache-preload` |
| `docs/` | Documentation only | `docs/sdk-quickstart-guide` |
| `test/` | Adding/improving tests only | `test/billing-handler-edge-cases` |
| `infra/` | Infrastructure, Terraform, Docker, Helm | `infra/helm-chart-resource-limits` |
| `release/` | Release preparation | `release/v1.4.0` |
| `experiment/` | Throwaway spikes or PoCs (never merge directly) | `experiment/grpc-eval-api` |

### Rules

- Use lowercase, kebab-case only: `fix/my-bug` not `fix/My_Bug`
- Include the ticket ID when one exists: `feature/FS-42-thing` not `feature/thing`
- Keep it under 50 characters after the type prefix
- Branch off `main` unless you're building on top of another feature branch

---

## 3. Commit Message Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

```
<type>(<scope>): <description>

[optional body]

[optional footer]
```

### Types

| Type | Meaning |
|------|---------|
| `feat` | New feature |
| `fix` | Bug fix |
| `perf` | Performance improvement |
| `refactor` | Code restructuring (no behavior change) |
| `test` | Adding or updating tests |
| `docs` | Documentation changes |
| `chore` | Maintenance, deps, CI config |
| `ci` | CI/CD changes only |
| `style` | Formatting (no code change) |
| `revert` | Revert a previous commit |

### Scopes (optional but encouraged)

| Scope | What it covers |
|-------|---------------|
| `server` | Go API server |
| `dashboard` | Next.js dashboard |
| `sdk-go` | Go SDK |
| `sdk-node` | Node SDK |
| `sdk-python` | Python SDK |
| `sdk-java` | Java SDK |
| `sdk-react` | React SDK |
| `eval` | Evaluation engine |
| `auth` | Authentication/authorization |
| `billing` | Payment/subscription |
| `proxy` | Multi-region proxy |
| `infra` | Docker, Helm, Terraform |
| `docs` | Documentation site |
| `ci` | GitHub Actions, CI/CD |

### Examples

```
feat(auth): add SAML SSO login flow

fix(proxy): route refresh tokens to correct regional server

Tokens issued by a regional server were validated against the global
router's JWT secret, causing immediate session expiry for cross-region
signups. AuthRegionRouter now proxies requests to the issuing region
before JWT validation.

Fixes FS-108

perf(eval): preload rulesets on cache miss

chore(deps): upgrade Go to 1.25.9

test(billing): add Stripe webhook edge case coverage
```

### Rules

- Imperative mood: "add feature" not "added feature" or "adding feature"
- First line under 72 characters
- Reference ticket IDs in the footer when applicable: `Fixes FS-42` or `Refs FS-42`
- Breaking changes: add `BREAKING CHANGE:` footer or `!` after type: `feat(auth)!: require MFA for admin roles`

---

## 4. Development Workflow

### Starting New Work

```bash
# Always start from latest main
git checkout main
git pull origin main

# Create your branch
git checkout -b feature/FS-42-saml-sso-login
```

### During Development

```bash
# Make small, focused commits
git add -p                    # Stage specific hunks, not everything
git commit -m "feat(auth): add SAML metadata endpoint"

# Keep your branch up to date with main
git fetch origin
git rebase origin/main        # Rebase, never merge main into your branch

# Push your branch
git push -u origin HEAD
```

### Creating a Pull Request

```bash
gh pr create --title "feat(auth): add SAML SSO login flow" --body "$(cat <<'EOF'
## Summary
- Added SAML metadata endpoint and ACS callback
- Integrated with existing JWT auth flow
- Added SSO configuration management UI

## Test Plan
- [ ] Unit tests for SAML parsing
- [ ] Integration test with test IdP
- [ ] Manual test: SAML login → dashboard access
- [ ] Verify non-SSO login still works

Fixes FS-42
EOF
)"
```

### PR Requirements

| Requirement | Details |
|-------------|---------|
| **Title** | Follows commit convention: `type(scope): description` |
| **Body** | Summary (what + why), test plan, ticket reference |
| **Size** | Aim for < 400 lines changed. Split large features into stacked PRs |
| **Tests** | All new code has tests. Coverage must not decrease |
| **CI** | All 3 checks must pass: Server tests, Server lint, Dashboard tests |
| **Review** | At least 1 approval from a code owner |
| **Conversations** | All review threads must be resolved |
| **Rebase** | Branch must be up to date with main (strict mode enabled) |

### After Approval

- **Squash and merge** for feature/fix/chore branches (keeps main history clean)
- Delete the branch after merge (GitHub does this automatically)

---

## 5. Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/): `vMAJOR.MINOR.PATCH`

| Increment | When | Example |
|-----------|------|---------|
| **MAJOR** | Breaking API changes | `v1.0.0` → `v2.0.0` |
| **MINOR** | New features, backward compatible | `v1.3.0` → `v1.4.0` |
| **PATCH** | Bug fixes, backward compatible | `v1.4.0` → `v1.4.1` |

Pre-release tags for testing: `v1.4.0-rc.1`, `v1.4.0-beta.1`

### Release Workflow

```
main ──────●──────●──────●──────●──────● (always deployable)
            \    /        \    /
  feature/x  ●──●   fix/y  ●──●
```

1. **Feature development** happens on feature branches, merged to `main` via PR
2. **Release tagging** happens on `main` after sufficient features accumulate:
   ```bash
   git checkout main
   git pull origin main
   git tag -a v1.4.0 -m "Release v1.4.0: SAML SSO, approval workflows, kill switch"
   git push origin v1.4.0
   ```
3. **CI/CD** builds and deploys the tagged version to production

### Hotfix Workflow

For urgent production issues that can't wait for the normal PR cycle:

```bash
git checkout main
git pull origin main
git checkout -b hotfix/FS-200-eval-cache-nil-panic

# Fix the issue, commit, push
git commit -m "fix(eval): guard against nil ruleset in cache lookup"
git push -u origin HEAD

# Create PR — still requires review, but expedited
gh pr create --title "fix(eval): guard against nil ruleset in cache lookup" --body "..."
```

Hotfixes still go through PR and review. The review is expedited (reviewer drops other work), but never skipped.

---

## 6. Code Review Guidelines

### For Authors

- **Self-review first**: Read your own diff before requesting review
- **Small PRs**: Easier to review, faster to merge, fewer conflicts
- **Describe the "why"**: The diff shows "what" changed — your PR description explains "why"
- **Link context**: Reference the ticket, link to relevant docs or design discussions
- **Respond promptly**: Unblock the reviewer by responding to feedback within a few hours

### For Reviewers

- **Review within 4 hours** during business hours (unblock your teammates)
- **Be specific**: "This could panic if `org` is nil — add a nil check" not "looks wrong"
- **Distinguish severity**: Use prefixes:
  - `blocker:` — Must fix before merge
  - `nit:` — Style preference, take it or leave it
  - `question:` — Seeking understanding, not requesting a change
  - `suggestion:` — Optional improvement idea
- **Approve when ready**: Don't hold PRs hostage for nits. Approve with suggestions if the code is correct

---

## 7. Environment & Local Development

### Prerequisites

| Tool | Version |
|------|---------|
| Go | 1.25+ |
| Node.js | 22+ |
| PostgreSQL | 16 |
| Docker & Docker Compose | Latest stable |

### Quick Start

```bash
# Start infrastructure
docker compose up -d postgres

# Run migrations
cd server && go run cmd/migrate/main.go up

# Start API server
cd server && go run cmd/server/main.go

# Start dashboard (in another terminal)
cd dashboard && npm install && npm run dev
```

### Running Tests

```bash
# Server
cd server && go test ./... -count=1 -timeout 120s -race
cd server && go vet ./...

# Dashboard
cd dashboard && npx vitest run --coverage
cd dashboard && npm run build
```

---

## 8. CI/CD Pipeline

Every push to any branch triggers:

| Check | What it does | Must pass for merge? |
|-------|-------------|---------------------|
| **Server: Test & Coverage** | `go test ./... -race -coverprofile=...` | Yes |
| **Server: Lint & Vet** | `go vet ./...`, `govulncheck ./...` | Yes |
| **Dashboard: Test, Build & Coverage** | `vitest run --coverage`, `npm run build` | Yes |

CI must be green before merge. No exceptions.

---

## 9. Common Scenarios

### "I need to work on top of someone else's unmerged branch"

```bash
git checkout feature/FS-42-saml-sso-login
git checkout -b feature/FS-43-sso-dashboard-ui

# When FS-42 merges to main, rebase onto main
git rebase origin/main
```

### "My branch has conflicts with main"

```bash
git fetch origin
git rebase origin/main
# Resolve conflicts, then:
git rebase --continue
git push --force-with-lease    # Safe force push (only your branch)
```

### "I need to revert a merged PR"

```bash
# Use GitHub's "Revert" button on the merged PR, or:
git revert <merge-commit-sha>
# This creates a new commit — push to a branch and open a PR
```

### "CI is failing on a flaky test"

- **Never** skip CI to merge. Fix the flaky test or mark it as `t.Skip("flaky: #issue-link")` with a linked issue.
- Re-run the failed check once. If it fails again, the test is broken, not flaky.

---

## 10. Branch Cleanup

- Merged branches are auto-deleted by GitHub
- Stale branches (no activity > 30 days) should be cleaned up periodically:
  ```bash
  git fetch --prune
  git branch -vv | grep ': gone]' | awk '{print $1}' | xargs git branch -d
  ```

---

## Summary Cheat Sheet

```
Branch:   feature/FS-42-short-description
Commit:   feat(scope): imperative description under 72 chars
PR title: feat(scope): same as the squash commit message
Version:  v1.4.0 (semver)
Hotfix:   hotfix/FS-200-short-description → PR → expedited review → merge
Release:  Tag main with vX.Y.Z → CI deploys
Rule #1:  Never push to main. Ever.
```
