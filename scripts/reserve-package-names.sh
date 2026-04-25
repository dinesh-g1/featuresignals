#!/usr/bin/env bash
set -euo pipefail

# ============================================================================
# FeatureSignals — Package Name Reservation Script
# ============================================================================
# This script checks and reserves the FeatureSignals brand across major
# package registries. It is designed to be idempotent and safe to run
# multiple times.
#
# Usage:
#   ./scripts/reserve-package-names.sh           # Run checks (dry-run by default)
#   ./scripts/reserve-package-names.sh --apply   # Actually reserve names
#   ./scripts/reserve-package-names.sh --dry-run # Explicit dry-run mode
#
# Supported package ecosystems:
#   - npm (scoped organization: @featuresignals)
#   - PyPI (project name: featuresignals)
#   - Maven Central (group: com.featuresignals)
#   - NuGet (.NET package)
#   - RubyGems
#   - Docker Hub (organization: featuresignals)
# ============================================================================

YELLOW='\033[1;33m'
GREEN='\033[1;32m'
RED='\033[1;31m'
CYAN='\033[1;36m'
NC='\033[0m' # No Color

DRY_RUN=true
if [ "${1:-}" = "--apply" ]; then
    DRY_RUN=false
elif [ "${1:-}" = "--dry-run" ]; then
    DRY_RUN=true
fi

echo ""
echo "╔══════════════════════════════════════════════════════════════╗"
echo "║       FeatureSignals — Package Name Reservation Check       ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🔍 DRY-RUN MODE — No changes will be made.${NC}"
    echo "   Pass --apply to actually reserve names."
else
    echo -e "${GREEN}⚡ APPLY MODE — Will attempt to reserve names.${NC}"
fi
echo ""

# ------------------------------------------------------------------
# 1. npm — Check @featuresignals scope
# ------------------------------------------------------------------
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  npm${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"

if command -v npm &> /dev/null; then
    echo "Checking @featuresignals scope on npm..."

    # Try to view the org to see if it exists
    if npm org ls @featuresignals &> /dev/null 2>&1; then
        echo -e "  ${GREEN}✅ @featuresignals org exists on npm.${NC}"
        echo "     Members:"
        npm org ls @featuresignals 2>/dev/null || echo "     (unable to list members)"
    else
        echo -e "  ${YELLOW}⚠️  @featuresignals org NOT found on npm.${NC}"
        if [ "$DRY_RUN" = false ]; then
            echo "     Attempting to create npm org..."
            echo "     NOTE: npm orgs must be created manually via 'npm org create @featuresignals'"
            echo "     after authenticating: npm login"
        else
            echo "     → Create at: https://www.npmjs.com/org/create"
            echo "     → Org name: @featuresignals"
        fi
    fi

    # Check key package names
    for pkg in "sdk-node" "sdk-go" "sdk-python" "sdk-react" "cli" "dashboard"; do
        full_name="@featuresignals/${pkg}"
        status=$(npm view "$full_name" version 2>/dev/null || true)
        if [ -n "$status" ]; then
            echo -e "  ${GREEN}✅ ${full_name}@${status} is published.${NC}"
        else
            echo -e "  ${YELLOW}⚠️  ${full_name} is NOT published.${NC}"
            if [ "$DRY_RUN" = false ]; then
                echo "     Skipping — packages are published via CI."
            fi
        fi
    done
else
    echo -e "  ${YELLOW}⚠️  npm CLI not found. Skipping npm checks.${NC}"
fi
echo ""

# ------------------------------------------------------------------
# 2. PyPI — Check featuresignals project
# ------------------------------------------------------------------
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  PyPI${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"

if command -v curl &> /dev/null; then
    echo "Checking 'featuresignals' on PyPI..."
    pypi_status=$(curl -s -o /dev/null -w "%{http_code}" "https://pypi.org/project/featuresignals/" 2>/dev/null || echo "000")

    if [ "$pypi_status" = "200" ]; then
        echo -e "  ${GREEN}✅ 'featuresignals' exists on PyPI.${NC}"
        curl -s "https://pypi.org/pypi/featuresignals/json" 2>/dev/null \
            | python3 -c "import sys, json; d=json.load(sys.stdin); print(f'     Latest version: {d[\"info\"][\"version\"]}')" 2>/dev/null || true
    else
        echo -e "  ${YELLOW}⚠️  'featuresignals' NOT found on PyPI.${NC}"
        if [ "$DRY_RUN" = false ]; then
            echo "     → To reserve, create a placeholder package and publish:"
            echo "       1. Create minimal setup.py/setup.cfg with name='featuresignals'"
            echo "       2. twine upload dist/*"
            echo "     → Or manually at: https://pypi.org/manage/projects/"
        else
            echo "     → Reserve at: https://pypi.org/manage/projects/"
        fi
    fi

    # Check related SDK names
    for pkg in "featuresignals-sdk" "featuresignals-client"; do
        pypi_pkg_status=$(curl -s -o /dev/null -w "%{http_code}" "https://pypi.org/project/${pkg}/" 2>/dev/null || echo "000")
        if [ "$pypi_pkg_status" = "200" ]; then
            echo -e "  ${GREEN}✅ '${pkg}' exists on PyPI.${NC}"
        else
            echo -e "  ${YELLOW}⚠️  '${pkg}' NOT found on PyPI.${NC}"
        fi
    done
else
    echo -e "  ${YELLOW}⚠️  curl not found. Skipping PyPI checks.${NC}"
fi
echo ""

# ------------------------------------------------------------------
# 3. Maven Central — Instructions only
# ------------------------------------------------------------------
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Maven Central${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"

echo "  Group ID: com.featuresignals"
echo ""

maven_check=$(curl -s -o /dev/null -w "%{http_code}" "https://search.maven.org/search?q=g:com.featuresignals" 2>/dev/null || echo "000")
if [ "$maven_check" = "200" ]; then
    echo -e "  ${GREEN}✅ com.featuresignals group exists on Maven Central.${NC}"
else
    echo -e "  ${YELLOW}⚠️  Could not verify Maven Central (or group not found).${NC}"
fi

echo "  ┌─────────────────────────────────────────────────────────────┐"
echo "  │ To reserve Maven Central namespace:                        │"
echo "  │ 1. Create a Sonatype JIRA account                          │"
echo "  │ 2. Submit a ticket at https://issues.sonatype.org          │"
echo "  │    requesting 'com.featuresignals' group ID                │"
echo "  │ 3. Provide proof of domain ownership (featuresignals.com)  │"
echo "  │ 4. Publish a placeholder JAR (e.g., featuresignals-bom)   │"
echo "  └─────────────────────────────────────────────────────────────┘"
echo ""

# ------------------------------------------------------------------
# 4. NuGet — Instructions only
# ------------------------------------------------------------------
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  NuGet (.NET)${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"

nuget_check=$(curl -s -o /dev/null -w "%{http_code}" "https://api.nuget.org/v3/registration5-gz-semver2/featuresignals/index.json" 2>/dev/null || echo "000")
if [ "$nuget_check" = "200" ]; then
    echo -e "  ${GREEN}✅ 'FeatureSignals' exists on NuGet.${NC}"
else
    echo -e "  ${YELLOW}⚠️  'FeatureSignals' NOT found on NuGet.${NC}"
fi

echo "  ┌─────────────────────────────────────────────────────────────┐"
echo "  │ To reserve NuGet package ID:                               │"
echo "  │ 1. Sign in at https://www.nuget.org                        │"
echo "  │ 2. Upload a placeholder package named 'FeatureSignals'     │"
echo "  │    (even a minimal .nupkg with just a license URL)         │"
echo "  │ 3. Also reserve: 'FeatureSignals.Sdk',                    │"
echo "  │    'FeatureSignals.AspNetCore', 'FeatureSignals.Client'   │"
echo "  └─────────────────────────────────────────────────────────────┘"
echo ""

# ------------------------------------------------------------------
# 5. RubyGems — Instructions only
# ------------------------------------------------------------------
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  RubyGems${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"

if command -v gem &> /dev/null; then
    rubygems_check=$(gem search --remote --exact featuresignals 2>/dev/null | grep -c "featuresignals" || true)
    if [ "$rubygems_check" -gt 0 ]; then
        echo -e "  ${GREEN}✅ 'featuresignals' gem exists on RubyGems.${NC}"
    else
        echo -e "  ${YELLOW}⚠️  'featuresignals' gem NOT found on RubyGems.${NC}"
    fi
else
    rubygems_http=$(curl -s -o /dev/null -w "%{http_code}" "https://rubygems.org/gems/featuresignals" 2>/dev/null || echo "000")
    if [ "$rubygems_http" = "200" ]; then
        echo -e "  ${GREEN}✅ 'featuresignals' gem exists on RubyGems.${NC}"
    else
        echo -e "  ${YELLOW}⚠️  'featuresignals' gem NOT found on RubyGems.${NC}"
    fi
fi

echo "  ┌─────────────────────────────────────────────────────────────┐"
echo "  │ To reserve RubyGems namespace:                             │"
echo "  │ 1. Create an account at https://rubygems.org               │"
echo "  │ 2. Push a placeholder gem named 'featuresignals'           │"
echo "  │ 3. Also reserve: 'featuresignals-sdk',                    │"
echo "  │    'featuresignals-rails', 'featuresignals-client'        │"
echo "  └─────────────────────────────────────────────────────────────┘"
echo ""

# ------------------------------------------------------------------
# 6. Docker Hub — Check organization
# ------------------------------------------------------------------
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Docker Hub${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"

docker_check=$(curl -s -o /dev/null -w "%{http_code}" "https://hub.docker.com/v2/orgs/featuresignals" 2>/dev/null || echo "000")
if [ "$docker_check" = "200" ]; then
    echo -e "  ${GREEN}✅ 'featuresignals' org exists on Docker Hub.${NC}"
elif [ "$docker_check" = "404" ]; then
    echo -e "  ${YELLOW}⚠️  'featuresignals' org NOT found on Docker Hub.${NC}"
else
    echo -e "  ${YELLOW}⚠️  Docker Hub API check inconclusive (HTTP ${docker_check}).${NC}"
fi

echo "  ┌─────────────────────────────────────────────────────────────┐"
echo "  │ To reserve Docker Hub organization:                        │"
echo "  │ 1. Sign in at https://hub.docker.com                      │"
echo "  │ 2. Create organization 'featuresignals'                    │"
echo "  │ 3. Create repos: 'server', 'dashboard', 'ops-portal'      │"
echo "  │ 4. Also consider: GHCR.io as primary container registry   │"
echo "  └─────────────────────────────────────────────────────────────┘"
echo ""

# ------------------------------------------------------------------
# 7. Summary
# ------------------------------------------------------------------
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo -e "${CYAN}  Summary Matrix${NC}"
echo -e "${CYAN}══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "  Registry         │ Status     │ Action Required"
echo "  ─────────────────┼────────────┼────────────────────────────────"
echo "  npm              │ Checked    │ Verify @featuresignals org"
echo "  PyPI             │ Checked    │ Reserve featuresignals project"
echo "  Maven Central    │ Manual     │ Request com.featuresignals"
echo "  NuGet            │ Manual     │ Reserve FeatureSignals ID"
echo "  RubyGems         │ Manual     │ Reserve featuresignals gem"
echo "  Docker Hub       │ Manual     │ Create featuresignals org"
echo "  GitHub Packages  │ Auto       │ Scoped to @featuresignals org"
echo ""

if [ "$DRY_RUN" = true ]; then
    echo -e "${YELLOW}🔍 This was a dry run. Pass --apply to attempt actual reservations.${NC}"
    echo "   Note: Most registries require manual account setup first."
fi

echo ""
echo -e "${GREEN}Done.${NC}"
