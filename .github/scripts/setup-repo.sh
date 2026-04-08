#!/usr/bin/env bash
#
# One-time GitHub repository configuration for FeatureSignals.
#
# Configures: labels, branch protection, repo settings, and project board.
#
# Prerequisites:
#   gh auth login
#
# Usage:
#   bash .github/scripts/setup-repo.sh
#
set -euo pipefail

REPO="dinesh-g1/featuresignals"

echo "==> Verifying gh auth..."
gh auth status || { echo "ERROR: Run 'gh auth login' first."; exit 1; }

# ── Repo settings ────────────────────────────────────────────────────────────
echo ""
echo "==> Configuring repository settings..."
gh api -X PATCH "repos/$REPO" \
  --field allow_squash_merge=true \
  --field allow_merge_commit=false \
  --field allow_rebase_merge=false \
  --field delete_branch_on_merge=true \
  --field has_issues=true \
  --field has_projects=true \
  --field has_wiki=false \
  --field allow_auto_merge=true \
  > /dev/null
echo "  Squash merge only, auto-delete branches, auto-merge enabled"

# ── Labels ───────────────────────────────────────────────────────────────────
echo ""
echo "==> Setting up labels..."

delete_label() {
  gh label delete "$1" --repo "$REPO" --yes 2>/dev/null || true
}

create_label() {
  local name=$1 color=$2 desc=$3
  gh label create "$name" --repo "$REPO" --color "$color" --description "$desc" --force 2>/dev/null || true
}

# Remove GitHub defaults that conflict with our scheme
for default_label in "bug" "enhancement" "documentation" "duplicate" "good first issue" "help wanted" "invalid" "question" "wontfix"; do
  delete_label "$default_label"
done

# Type labels (PM hierarchy)
create_label "type: epic"    "6A0DAD" "Large initiative spanning multiple stories"
create_label "type: story"   "0075CA" "User-facing feature or improvement"
create_label "type: bug"     "D73A4A" "Defect or unexpected behavior"
create_label "type: task"    "5319E7" "Engineering work (refactoring, infra, deps)"
create_label "type: docs"    "0E8A16" "Documentation only"
create_label "type: security" "B60205" "Security fix or improvement"

# Area labels (codebase areas)
create_label "area: server"    "1D76DB" "Go backend (server/)"
create_label "area: dashboard" "F9D0C4" "Next.js frontend (dashboard/)"
create_label "area: sdks"      "C2E0C6" "Client SDKs (sdks/)"
create_label "area: infra"     "BFD4F2" "Deploy, CI/CD, Terraform"
create_label "area: website"   "D4C5F9" "Marketing site (website/)"
create_label "area: docs"      "FEF2C0" "Documentation site (docs/)"

# Priority labels
create_label "priority: critical" "B60205" "Production broken, drop everything"
create_label "priority: high"     "D93F0B" "Must address this sprint"
create_label "priority: medium"   "FBCA04" "Should address soon"
create_label "priority: low"      "0E8A16" "Nice to have"

# Status labels
create_label "status: needs-triage"  "EDEDED" "Newly filed, needs prioritization"
create_label "status: blocked"       "B60205" "Waiting on external dependency"
create_label "status: ready"         "0E8A16" "Groomed and ready to pick up"
create_label "status: in-progress"   "0075CA" "Currently being worked on"

echo "  Labels configured"

# ── Branch protection ────────────────────────────────────────────────────────
echo ""
echo "==> Configuring branch protection for main..."

gh api -X PUT "repos/$REPO/branches/main/protection" \
  --input - << 'PROTECTION_JSON'
{
  "required_status_checks": {
    "strict": true,
    "contexts": [
      "Server: Test & Coverage",
      "Server: Lint & Vet",
      "Dashboard: Test, Build & Coverage"
    ]
  },
  "enforce_admins": false,
  "required_pull_request_reviews": {
    "dismiss_stale_reviews": true,
    "require_code_owner_reviews": true,
    "required_approving_review_count": 1
  },
  "restrictions": null,
  "required_linear_history": true,
  "allow_force_pushes": false,
  "allow_deletions": false,
  "required_conversation_resolution": true
}
PROTECTION_JSON

echo "  Branch protection enabled on main"

# ── GitHub Project ───────────────────────────────────────────────────────────
echo ""
echo "==> Creating GitHub Project board..."

OWNER="dinesh-g1"
EXISTING_PROJECT=$(gh project list --owner "$OWNER" --format json 2>/dev/null | \
  python3 -c "import sys,json; projects=json.load(sys.stdin).get('projects',[]); matches=[p for p in projects if p.get('title')=='FeatureSignals Roadmap']; print(matches[0]['number'] if matches else '')" 2>/dev/null || echo "")

if [ -n "$EXISTING_PROJECT" ]; then
  echo "  Project 'FeatureSignals Roadmap' already exists (#$EXISTING_PROJECT)"
else
  gh project create --owner "$OWNER" --title "FeatureSignals Roadmap" 2>/dev/null && \
    echo "  Project 'FeatureSignals Roadmap' created" || \
    echo "  Note: Create the project manually at https://github.com/users/$OWNER/projects"
fi

# ── Summary ──────────────────────────────────────────────────────────────────
echo ""
echo "==> Setup complete!"
echo ""
echo "  Repository settings:"
echo "    - Squash merge only (clean linear history)"
echo "    - Auto-delete branches after merge"
echo "    - Auto-merge enabled"
echo ""
echo "  Branch protection (main):"
echo "    - Require PR with 1 approval"
echo "    - Require status checks: Server Tests, Server Lint, Dashboard Tests"
echo "    - Require up-to-date branches"
echo "    - Require conversation resolution"
echo "    - Dismiss stale reviews"
echo "    - No force push, no deletion"
echo ""
echo "  Labels: type (epic/story/bug/task/docs/security), area (6), priority (4), status (4)"
echo ""
echo "  Next steps:"
echo "    1. Create project views at: https://github.com/users/$OWNER/projects"
echo "       - Board view (Kanban): Backlog | Sprint | In Progress | In Review | Done"
echo "       - Table view: for sprint planning, sortable by priority/area"
echo "       - Roadmap view: timeline grouped by milestone"
echo "    2. Create your first milestone: gh api repos/$REPO/milestones --field title='v1.0.0'"
echo "    3. Start using branches: story/123-feature-name, bug/456-fix-name, task/789-chore-name"
echo ""
