#!/bin/bash
# generate-docs-content.sh
# Runs after `next build` to generate static JSON files for the Docs Content API.
# Each doc page becomes out/docs/api/content/{slug}.json
# FlagEngine's DocsPanel fetches these instead of a runtime API.

set -eo pipefail

OUTDIR="${1:-out}"
CONTENT_DIR="$OUTDIR/docs/api/content"

mkdir -p "$CONTENT_DIR"

# List of all doc slugs (mirrors DOC_SLUGS in website/src/lib/docs.ts)
SLUGS=(
  "intro"
  "GLOSSARY"
  "core-concepts/feature-flags"
  "core-concepts/toggle-categories"
  "core-concepts/projects-and-environments"
  "core-concepts/targeting-and-segments"
  "core-concepts/implementation-patterns"
  "core-concepts/percentage-rollouts"
  "core-concepts/ab-experimentation"
  "core-concepts/mutual-exclusion"
  "core-concepts/prerequisites"
  "core-concepts/flag-lifecycle"
  "architecture/overview"
  "architecture/evaluation-engine"
  "architecture/real-time-updates"
  "getting-started/quickstart"
  "getting-started/installation"
  "getting-started/create-your-first-flag"
  "getting-started/migration-overview"
  "getting-started/migrate-from-launchdarkly"
  "getting-started/migrate-from-flagsmith"
  "getting-started/migrate-from-unleash"
  "getting-started/migration-iac-export"
  "getting-started/migration-troubleshooting"
  "tutorials/feature-flag-checkout"
  "tutorials/ab-testing-react"
  "tutorials/progressive-rollout"
  "tutorials/kill-switch"
  "advanced/ai-janitor"
  "advanced/ai-janitor-quickstart"
  "advanced/ai-janitor-git-providers"
  "advanced/ai-janitor-configuration"
  "advanced/ai-janitor-pr-workflow"
  "advanced/ai-janitor-llm-integration"
  "advanced/ai-janitor-troubleshooting"
  "advanced/relay-proxy"
  "advanced/scheduling"
  "advanced/kill-switch"
  "advanced/approval-workflows"
  "advanced/webhooks"
  "advanced/audit-logging"
  "advanced/rbac"
  "advanced/migration"
  "dashboard/overview"
  "dashboard/managing-flags"
  "dashboard/env-comparison"
  "dashboard/target-inspector"
  "dashboard/target-comparison"
  "dashboard/evaluation-metrics"
  "dashboard/flag-health"
  "dashboard/usage-insights"
  "iac/overview"
  "iac/terraform"
  "iac/pulumi"
  "iac/ansible"
  "deployment/docker-compose"
  "deployment/self-hosting"
  "deployment/on-premises"
  "deployment/configuration"
  "self-hosting/onboarding-guide"
  "sdks/overview"
  "sdks/go"
  "sdks/nodejs"
  "sdks/python"
  "sdks/java"
  "sdks/dotnet"
  "sdks/ruby"
  "sdks/react"
  "sdks/vue"
  "sdks/openfeature"
  "compliance/security-overview"
  "compliance/privacy-policy"
  "compliance/data-retention"
  "compliance/dpa-template"
  "compliance/subprocessors"
  "compliance/gdpr-rights"
  "compliance/soc2/controls-matrix"
  "compliance/soc2/evidence-collection"
  "compliance/soc2/incident-response"
  "compliance/ccpa-cpra"
  "compliance/hipaa"
  "compliance/dora"
  "compliance/csa-star"
  "compliance/data-privacy-framework"
  "compliance/iso27001/isms-overview"
  "compliance/iso27701/pims-overview"
  "enterprise/overview"
  "enterprise/onboarding"
  "operations/incident-runbook"
  "operations/disaster-recovery"
)

GENERATED=0
SKIPPED=0

for slug in "${SLUGS[@]}"; do
  HTML_FILE="$OUTDIR/docs/$slug.html"
  JSON_FILE="$CONTENT_DIR/$slug.json"

  # Ensure parent directory exists
  mkdir -p "$(dirname "$JSON_FILE")"

  if [ -f "$HTML_FILE" ]; then
    # Extract title from <title> tag (macOS-compatible)
    TITLE=$(sed -n 's/.*<title>\([^<]*\)<\/title>.*/\1/p' "$HTML_FILE" | head -1 | sed 's/ | Documentation//' | sed 's/ | FeatureSignals//')

    # Extract description from meta tag (macOS-compatible)
    DESCRIPTION=$(sed -n 's/.*<meta[^>]*name="description"[^>]*content="\([^"]*\)".*/\1/p' "$HTML_FILE" | head -1)

    # Extract main content area
    CONTENT=$(sed -n '/<main[^>]*aria-labelledby="docs-main-heading"[^>]*>/,/<\/main>/p' "$HTML_FILE" | sed '1s/<main[^>]*>//' | sed '$s/<\/main>//')

    if [ -z "$CONTENT" ]; then
      # Fallback: extract body content between header and footer
      CONTENT=$(sed -n '/<main[^>]*>/,/<\/main>/p' "$HTML_FILE" | sed '1s/<main[^>]*>//' | sed '$s/<\/main>//')
    fi

    # Build JSON response
    cat > "$JSON_FILE" << JSONEOF
{
  "title": "${TITLE//\"/\\\"}",
  "description": "${DESCRIPTION//\"/\\\"}",
  "content": $(echo "$CONTENT" | python3 -c "import sys,json; print(json.dumps(sys.stdin.read()))" 2>/dev/null || echo "\"\""),
  "toc": [],
  "contentHash": "$(echo -n "$slug$CONTENT" | md5 -q 2>/dev/null || echo -n "$slug$CONTENT" | md5)"
}
JSONEOF

    GENERATED=$((GENERATED + 1))
    echo "  ✅ $slug → $JSON_FILE"
  else
    SKIPPED=$((SKIPPED + 1))
    echo "  ⚠️  Skipped: $HTML_FILE not found"
  fi
done

echo ""
echo "📄 Docs Content API: $GENERATED generated, $SKIPPED skipped"
echo "📍 Output: $CONTENT_DIR/"
