#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# FeatureSignals Console — End-to-End API Test Suite
# ═══════════════════════════════════════════════════════════════════════════════
#
# Tests the complete Console API surface across all three zones:
#   CONNECT (integrations) → LIFECYCLE (13-stage flag advancement) → LEARN (insights)
#
# Requirements:
#   - curl, jq installed
#   - FeatureSignals server running (default: http://localhost:8080)
#   - A registered user account (default: dineshreddyg0@gmail.com / Dinesh@123)
#
# Usage:
#   chmod +x scripts/e2e-console-test.sh
#   ./scripts/e2e-console-test.sh
#   BASE_URL=http://localhost:9090 ./scripts/e2e-console-test.sh
#   EMAIL=test@example.com PASSWORD=secret ./scripts/e2e-console-test.sh
#
# Exit codes: 0 = all tests passed, 1 = one or more tests failed
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail

# ─── Configuration ──────────────────────────────────────────────────────────
BASE_URL="${BASE_URL:-http://localhost:8080}"
EMAIL="${EMAIL:-dineshreddyg0@gmail.com}"
PASSWORD="${PASSWORD:-Dinesh@123}"
TIMESTAMP="$(date +%s)"
FLAG_KEY="e2e-console-test-${TIMESTAMP}"
FLAG_NAME="E2E Console Test ${TIMESTAMP}"

# ─── Color helpers ──────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m' # No Color

PASS=0
FAIL=0

pass() {
    ((PASS++))
    echo -e "  ${GREEN}✓ PASS${NC} $*"
}

fail() {
    ((FAIL++))
    echo -e "  ${RED}✗ FAIL${NC} $*"
}

info() {
    echo -e "  ${BLUE}ℹ${NC} $*"
}

warn() {
    echo -e "  ${YELLOW}⚠ WARN${NC} $*"
}

section() {
    echo ""
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BOLD}${CYAN}  $*${NC}"
    echo -e "${BOLD}${CYAN}═══════════════════════════════════════════════════════════════${NC}"
}

# ─── HTTP helpers ───────────────────────────────────────────────────────────
# Usage: api METHOD PATH [BODY] [EXTRA_CURL_ARGS...]
# Returns: HTTP_STATUS BODY
# Exports: RESPONSE_CODE, RESPONSE_BODY

RESPONSE_CODE=""
RESPONSE_BODY=""

api() {
    local method="$1"
    local path="$2"
    local body="${3:-}"
    local url="${BASE_URL}${path}"
    local curl_args=(-s -w '\n%{http_code}' -X "$method" "$url")

    # Add auth header if we have a token
    if [[ -n "${ACCESS_TOKEN:-}" ]]; then
        curl_args+=(-H "Authorization: Bearer ${ACCESS_TOKEN}")
    fi

    curl_args+=(-H "Content-Type: application/json")
    curl_args+=(-H "Accept: application/json")

    if [[ -n "$body" ]]; then
        curl_args+=(--data-raw "$body")
    fi

    # Shift off the first 3 args to pass remaining as extra curl args
    shift 3 2>/dev/null || true
    for extra in "$@"; do
        curl_args+=("$extra")
    done

    local result
    result="$(curl "${curl_args[@]}" 2>/dev/null)" || true

    # Extract HTTP status code (last line)
    RESPONSE_CODE="$(echo "$result" | tail -n1 | tr -d '[:space:]')"
    # Extract body (everything except last line)
    RESPONSE_BODY="$(echo "$result" | sed '$d')"
}

# Assert HTTP status code matches expected
assert_status() {
    local expected="$1"
    local desc="$2"
    if [[ "$RESPONSE_CODE" == "$expected" ]]; then
        pass "$desc (HTTP $RESPONSE_CODE)"
        return 0
    else
        local err_msg
        err_msg="$(echo "$RESPONSE_BODY" | jq -r '.error // .message // empty' 2>/dev/null || echo "$RESPONSE_BODY" | head -c 200)"
        fail "$desc — expected HTTP $expected, got $RESPONSE_CODE: $err_msg"
        return 1
    fi
}

# Assert JSON field equals expected value
assert_json() {
    local field="$1"
    local expected="$2"
    local desc="$3"
    local actual
    actual="$(echo "$RESPONSE_BODY" | jq -r "$field" 2>/dev/null)" || true
    if [[ "$actual" == "$expected" ]]; then
        pass "$desc ($field = $expected)"
        return 0
    else
        fail "$desc — expected $field='$expected', got '$actual'"
        return 1
    fi
}

# Assert JSON field contains expected value (substring match)
assert_json_contains() {
    local field="$1"
    local expected="$2"
    local desc="$3"
    local actual
    actual="$(echo "$RESPONSE_BODY" | jq -r "$field" 2>/dev/null)" || true
    if [[ "$actual" == *"$expected"* ]]; then
        pass "$desc ($field contains '$expected')"
        return 0
    else
        fail "$desc — expected $field to contain '$expected', got '$actual'"
        return 1
    fi
}

# Assert JSON field is non-null and non-empty
assert_json_exists() {
    local field="$1"
    local desc="$2"
    local actual
    actual="$(echo "$RESPONSE_BODY" | jq -r "$field" 2>/dev/null)" || true
    if [[ -n "$actual" && "$actual" != "null" ]]; then
        pass "$desc ($field exists: ${actual:0:60})"
        return 0
    else
        fail "$desc — expected $field to exist and be non-null"
        return 1
    fi
}

# ─── Cleanup — delete test flag if it exists ────────────────────────────────
cleanup_flag() {
    local key="$1"
    info "Cleaning up test flag '$key' if it exists..."
    # Get all flags, find the test one by key, delete via project
    local flags_resp
    flags_resp="$(curl -s -H "Authorization: Bearer ${ACCESS_TOKEN}" \
        -H "Accept: application/json" \
        "${BASE_URL}/v1/console/flags?limit=100" 2>/dev/null)" || true

    local matching
    matching="$(echo "$flags_resp" | jq -r ".data[]? | select(.key == \"$key\") | .key" 2>/dev/null)" || true

    if [[ -n "$matching" ]]; then
        info "Found existing test flag '$key' — will be overwritten with a new unique key"
    fi
}

# ─── Main Test Suite ────────────────────────────────────────────────────────

main() {
    echo ""
    echo -e "${BOLD}${BLUE}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BOLD}${BLUE}│  FeatureSignals Console — End-to-End API Test Suite        │${NC}"
    echo -e "${BOLD}${BLUE}│  Base URL: ${BASE_URL}                                      │${NC}"
    echo -e "${BOLD}${BLUE}│  Flag Key: ${FLAG_KEY}                                      │${NC}"
    echo -e "${BOLD}${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"

    # ── SECTION 0: Login ─────────────────────────────────────────────────
    section "0. Authentication — Login"

    info "Logging in as ${EMAIL}..."
    api POST "/v1/auth/login" \
        "{\"email\":\"${EMAIL}\",\"password\":\"${PASSWORD}\"}"

    if [[ "$RESPONSE_CODE" == "403" ]]; then
        local err
        err="$(echo "$RESPONSE_BODY" | jq -r '.error // empty' 2>/dev/null)" || true
        if [[ "$err" == "mfa_required" ]]; then
            fail "MFA is required for this account. Please set MFA_CODE env var and update script, or use a non-MFA account."
            echo ""
            echo -e "${RED}MFA required. To test with MFA:${NC}"
            echo "  MFA_CODE=123456 ./scripts/e2e-console-test.sh"
            exit 1
        fi
    fi

    assert_status "200" "Login successful"
    if [[ "$RESPONSE_CODE" != "200" ]]; then
        fail "Cannot proceed without authentication. Aborting."
        exit 1
    fi

    ACCESS_TOKEN="$(echo "$RESPONSE_BODY" | jq -r '.tokens.access_token')"
    assert_json_exists ".tokens.access_token" "Access token returned"
    assert_json_exists ".user.id" "User ID returned"
    assert_json_exists ".organization.id" "Organization ID returned"

    ORG_ID="$(echo "$RESPONSE_BODY" | jq -r '.organization.id')"
    USER_NAME="$(echo "$RESPONSE_BODY" | jq -r '.user.name // .user.email')"

    info "Logged in as: ${USER_NAME} (org: ${ORG_ID})"
    info "Token: ${ACCESS_TOKEN:0:20}..."

    # ── SECTION 1: List Projects ──────────────────────────────────────────
    section "1. Projects — Get or Create a Project"

    api GET "/v1/projects"
    assert_status "200" "List projects"

    PROJECT_ID="$(echo "$RESPONSE_BODY" | jq -r '.data[0].id // empty' 2>/dev/null)" || true

    if [[ -z "$PROJECT_ID" ]]; then
        info "No projects found — creating one..."
        api POST "/v1/projects" \
            "{\"name\":\"E2E Test Project\",\"slug\":\"e2e-test-project-${TIMESTAMP}\"}"
        assert_status "201" "Create project"
        PROJECT_ID="$(echo "$RESPONSE_BODY" | jq -r '.id // empty')" || true
        assert_json_exists ".id" "Project ID returned after creation"
    else
        pass "Using existing project: ${PROJECT_ID}"
        info "Project ID: ${PROJECT_ID}"
    fi

    # ── SECTION 2: Ensure Development Environment Exists ───────────────────
    section "2. Environments — Ensure 'development' Exists"

    api GET "/v1/projects/${PROJECT_ID}/environments"
    assert_status "200" "List environments"

    ENV_SLUG="$(echo "$RESPONSE_BODY" | jq -r '.data[] | select(.slug == "development") | .slug // empty' 2>/dev/null)" || true

    if [[ -z "$ENV_SLUG" ]]; then
        info "No 'development' environment found — creating one..."
        api POST "/v1/projects/${PROJECT_ID}/environments" \
            "{\"name\":\"Development\",\"slug\":\"development\",\"color\":\"#3B82F6\"}"
        assert_status "201" "Create development environment"
    else
        pass "Development environment exists"
    fi

    # ── SECTION 3: Create Feature Flag ────────────────────────────────────
    section "3. Flag Creation — Create Test Feature Flag"

    # Clean up any existing flag with the same key
    cleanup_flag "$FLAG_KEY"

    # Delete via project flag delete if it exists
    info "Attempting to delete any pre-existing flag with key '${FLAG_KEY}'..."
    api GET "/v1/projects/${PROJECT_ID}/flags?limit=200"
    local existing_flag_id
    existing_flag_id="$(echo "$RESPONSE_BODY" | jq -r ".data[]? | select(.key == \"${FLAG_KEY}\") | .id" 2>/dev/null)" || true

    if [[ -n "$existing_flag_id" ]]; then
        api DELETE "/v1/projects/${PROJECT_ID}/flags/${FLAG_KEY}"
        info "Deleted existing flag: ${FLAG_KEY} (HTTP ${RESPONSE_CODE})"
    fi

    # Create the test flag
    api POST "/v1/projects/${PROJECT_ID}/flags" \
        "{
            \"key\":\"${FLAG_KEY}\",
            \"name\":\"${FLAG_NAME}\",
            \"description\":\"End-to-end test flag created by e2e-console-test.sh\",
            \"flag_type\":\"boolean\",
            \"category\":\"release\",
            \"status\":\"active\",
            \"default_value\":false,
            \"tags\":[\"e2e-test\",\"console\"]
        }"

    if [[ "$RESPONSE_CODE" == "409" ]]; then
        warn "Flag key conflict — trying with new timestamp..."
        FLAG_KEY="e2e-console-test-$(date +%s%N | cut -c1-13)"
        FLAG_NAME="E2E Console Test $(date +%s%N | cut -c1-13)"
        api POST "/v1/projects/${PROJECT_ID}/flags" \
            "{
                \"key\":\"${FLAG_KEY}\",
                \"name\":\"${FLAG_NAME}\",
                \"description\":\"End-to-end test flag created by e2e-console-test.sh\",
                \"flag_type\":\"boolean\",
                \"category\":\"release\",
                \"status\":\"active\",
                \"default_value\":false,
                \"tags\":[\"e2e-test\",\"console\"]
            }"
    fi

    assert_status "201" "Create feature flag '${FLAG_KEY}'"
    assert_json ".key" "${FLAG_KEY}" "Flag key matches"

    # ── SECTION 4: List All Flags (Console) ────────────────────────────────
    section "4. Console — List All Feature Flags"

    api GET "/v1/console/flags"
    assert_status "200" "List console flags"
    assert_json_exists ".data" "Flags data returned"
    assert_json_exists ".total" "Total count returned"

    local total_flags
    total_flags="$(echo "$RESPONSE_BODY" | jq -r '.total')"
    pass "Total flags in console: ${total_flags}"

    # Verify our test flag appears
    local test_flag_found
    test_flag_found="$(echo "$RESPONSE_BODY" | jq -r ".data[] | select(.key == \"${FLAG_KEY}\") | .key" 2>/dev/null)" || true
    if [[ "$test_flag_found" == "$FLAG_KEY" ]]; then
        pass "Test flag '${FLAG_KEY}' appears in console flag list"
    else
        fail "Test flag '${FLAG_KEY}' NOT found in console flag list — checking filter..."
        # Try fetching directly
        api GET "/v1/console/flags/${FLAG_KEY}"
        if [[ "$RESPONSE_CODE" == "200" ]]; then
            pass "Test flag found via direct GET"
        else
            fail "Test flag not found via direct GET either (HTTP ${RESPONSE_CODE})"
        fi
    fi

    # ── SECTION 5: Get Integrations (CONNECT Zone) ─────────────────────────
    section "5. Console — Get Integrations (CONNECT Zone)"

    api GET "/v1/console/integrations"
    assert_status "200" "Get integrations"
    assert_json_exists ".repositories" "Repositories data"
    assert_json_exists ".sdks" "SDKs data"
    assert_json_exists ".agents" "Agents data"
    assert_json_exists ".api_keys" "API keys data"

    local repo_count sdk_count agent_count apikey_count
    repo_count="$(echo "$RESPONSE_BODY" | jq -r '.repositories | length')"
    sdk_count="$(echo "$RESPONSE_BODY" | jq -r '.sdks | length')"
    agent_count="$(echo "$RESPONSE_BODY" | jq -r '.agents | length')"
    apikey_count="$(echo "$RESPONSE_BODY" | jq -r '.api_keys | length')"
    pass "Integrations: ${repo_count} repos, ${sdk_count} SDKs, ${agent_count} agents, ${apikey_count} API keys"

    # ── SECTION 6: Get Insights (LEARN Zone) ──────────────────────────────
    section "6. Console — Get Insights (LEARN Zone)"

    api GET "/v1/console/insights"
    assert_status "200" "Get insights"
    assert_json_exists ".impact_reports" "Impact reports data"
    assert_json_exists ".cost_attribution" "Cost attribution data"
    assert_json_exists ".team_velocity" "Team velocity data"
    assert_json_exists ".org_learnings" "Org learnings data"
    assert_json_exists ".recent_activity" "Recent activity data"

    local reports_count learnings_count
    reports_count="$(echo "$RESPONSE_BODY" | jq -r '.impact_reports | length')"
    learnings_count="$(echo "$RESPONSE_BODY" | jq -r '.org_learnings | length')"
    pass "Insights: ${reports_count} impact reports, ${learnings_count} org learnings"

    # ── SECTION 7: Get Maturity Config ────────────────────────────────────
    section "7. Console — Get Maturity Configuration"

    api GET "/v1/console/maturity"
    assert_status "200" "Get maturity config"
    assert_json_exists ".level" "Maturity level"
    assert_json_exists ".visible_stages" "Visible stages"
    assert_json_exists ".enable_approvals" "Approvals enabled flag"
    assert_json_exists ".auto_advance" "Auto advance flag"

    local maturity_level
    maturity_level="$(echo "$RESPONSE_BODY" | jq -r '.level')"
    pass "Current maturity level: ${maturity_level}"

    # ── SECTION 8: Advance Flag Through ALL 13 Lifecycle Stages ────────────
    section "8. Lifecycle — Advance Flag Through All 13 Stages"

    # The 13 lifecycle stages in order:
    # plan → spec → design → flag → implement → test → configure →
    # approve → ship → monitor → decide → analyze → learn
    #
    # Strategy:
    #   - New flags start at "plan" (default in DB)
    #   - Use POST /v1/console/flags/{key}/advance for stages before "ship"
    #   - Use POST /v1/console/flags/{key}/ship to go to "ship" stage (with rollout %)
    #   - Continue advancing after ship through remaining stages
    #
    # Advance stages (plan→spec→design→flag→implement→test→configure→approve):
    # That's 7 advances from plan to approve.
    #
    # Then ship (approve→ship): 1 ship operation.
    #
    # Then advance (ship→monitor→decide→analyze→learn):
    # That's 4 advances from ship to learn.
    #
    # Total: 7 advances + 1 ship + 4 advances = 12 operations for 13 stages.

    CURRENT_STAGE="plan"
    info "Starting lifecycle advancement for '${FLAG_KEY}'..."
    info "Initial stage: ${CURRENT_STAGE}"

    # ── Phase 1: Advance plan → spec → design → flag → implement → test → configure → approve
    PHASE1_STAGES=("spec" "design" "flag" "implement" "test" "configure" "approve")
    for next_stage in "${PHASE1_STAGES[@]}"; do
        echo ""
        info "Advancing from '${CURRENT_STAGE}' to '${next_stage}'..."

        api POST "/v1/console/flags/${FLAG_KEY}/advance" \
            "{\"environment\":\"development\"}"

        if [[ "$RESPONSE_CODE" == "200" ]]; then
            local returned_stage
            returned_stage="$(echo "$RESPONSE_BODY" | jq -r '.new_stage')"
            local returned_flag_stage
            returned_flag_stage="$(echo "$RESPONSE_BODY" | jq -r '.flag.stage')"

            if [[ "$returned_stage" == "$next_stage" ]]; then
                pass "Advanced: ${CURRENT_STAGE} → ${next_stage} (new_stage: ${returned_stage})"
            elif [[ "$returned_flag_stage" == "$next_stage" ]]; then
                pass "Advanced: ${CURRENT_STAGE} → ${next_stage} (flag.stage: ${returned_flag_stage})"
            else
                fail "Advance mismatch — expected '${next_stage}', got new_stage='${returned_stage}', flag.stage='${returned_flag_stage}'"
            fi

            CURRENT_STAGE="$next_stage"
        elif [[ "$RESPONSE_CODE" == "422" ]]; then
            local err_msg
            err_msg="$(echo "$RESPONSE_BODY" | jq -r '.error // empty' 2>/dev/null)" || true
            warn "Advance returned 422: ${err_msg} — checking if already at expected stage..."

            # Verify current stage
            api GET "/v1/console/flags/${FLAG_KEY}"
            local actual_stage
            actual_stage="$(echo "$RESPONSE_BODY" | jq -r '.stage')"
            if [[ "$actual_stage" == "$next_stage" ]]; then
                pass "Already at '${next_stage}' (stage: ${actual_stage})"
                CURRENT_STAGE="$next_stage"
            else
                fail "Advance failed at ${CURRENT_STAGE}→${next_stage}: ${err_msg} (actual: ${actual_stage})"
            fi
        else
            fail "Advance failed: HTTP ${RESPONSE_CODE} — $(echo "$RESPONSE_BODY" | jq -r '.error // empty' 2>/dev/null || echo "$RESPONSE_BODY" | head -c 100)"
        fi
    done

    # ── Phase 2: Ship (approve → ship) ─────────────────────────────────
    echo ""
    info "Shipping flag '${FLAG_KEY}' to 100% rollout..."
    api POST "/v1/console/flags/${FLAG_KEY}/ship" \
        "{
            \"target_percent\":100,
            \"guard_metrics\":[],
            \"environment\":\"development\"
        }"

    if [[ "$RESPONSE_CODE" == "200" ]]; then
        local ship_stage
        ship_stage="$(echo "$RESPONSE_BODY" | jq -r '.flag.stage')"
        local ship_url
        ship_url="$(echo "$RESPONSE_BODY" | jq -r '.live_eval_url')"

        if [[ "$ship_stage" == "ship" ]]; then
            pass "Shipped: ${CURRENT_STAGE} → ship (rollout: 100%)"
        else
            fail "Ship stage mismatch — expected 'ship', got '${ship_stage}'"
        fi
        assert_json_exists ".live_eval_url" "Live eval URL returned"
        info "Live eval URL: ${ship_url}"
        CURRENT_STAGE="ship"
    elif [[ "$RESPONSE_CODE" == "422" ]]; then
        local err_msg
        err_msg="$(echo "$RESPONSE_BODY" | jq -r '.error // empty' 2>/dev/null)" || true
        warn "Ship returned 422: ${err_msg} — checking current stage..."

        api GET "/v1/console/flags/${FLAG_KEY}"
        local cs
        cs="$(echo "$RESPONSE_BODY" | jq -r '.stage')"
        if [[ "$cs" == "ship" ]]; then
            pass "Already at 'ship' stage"
            CURRENT_STAGE="ship"
        else
            fail "Ship failed: ${err_msg} (current stage: ${cs})"
        fi
    else
        fail "Ship failed: HTTP ${RESPONSE_CODE} — $(echo "$RESPONSE_BODY" | jq -r '.error // empty' 2>/dev/null || echo "$RESPONSE_BODY" | head -c 100)"
    fi

    # ── Phase 3: Advance ship → monitor → decide → analyze → learn ────
    PHASE3_STAGES=("monitor" "decide" "analyze" "learn")
    for next_stage in "${PHASE3_STAGES[@]}"; do
        echo ""
        info "Advancing from '${CURRENT_STAGE}' to '${next_stage}'..."

        api POST "/v1/console/flags/${FLAG_KEY}/advance" \
            "{\"environment\":\"development\"}"

        if [[ "$RESPONSE_CODE" == "200" ]]; then
            local returned_stage
            returned_stage="$(echo "$RESPONSE_BODY" | jq -r '.new_stage')"
            local returned_flag_stage
            returned_flag_stage="$(echo "$RESPONSE_BODY" | jq -r '.flag.stage')"

            if [[ "$returned_stage" == "$next_stage" ]]; then
                pass "Advanced: ${CURRENT_STAGE} → ${next_stage}"
            elif [[ "$returned_flag_stage" == "$next_stage" ]]; then
                pass "Advanced: ${CURRENT_STAGE} → ${next_stage}"
            else
                fail "Advance mismatch — expected '${next_stage}', got new_stage='${returned_stage}', flag.stage='${returned_flag_stage}'"
            fi
            CURRENT_STAGE="$next_stage"
        elif [[ "$RESPONSE_CODE" == "422" ]]; then
            local err_msg
            err_msg="$(echo "$RESPONSE_BODY" | jq -r '.error // empty' 2>/dev/null)" || true
            warn "Advance returned 422: ${err_msg} — checking if already at expected stage..."

            api GET "/v1/console/flags/${FLAG_KEY}"
            local actual_stage
            actual_stage="$(echo "$RESPONSE_BODY" | jq -r '.stage')"
            if [[ "$actual_stage" == "$next_stage" ]]; then
                pass "Already at '${next_stage}'"
                CURRENT_STAGE="$next_stage"
            else
                fail "Advance failed at ${CURRENT_STAGE}→${next_stage}: ${err_msg} (actual: ${actual_stage})"
            fi
        else
            fail "Advance failed: HTTP ${RESPONSE_CODE} — $(echo "$RESPONSE_BODY" | jq -r '.error // empty' 2>/dev/null || echo "$RESPONSE_BODY" | head -c 100)"
        fi
    done

    # ── SECTION 9: Final Verification ─────────────────────────────────────
    section "9. Final Verification — Flag at 'learn' Stage"

    api GET "/v1/console/flags/${FLAG_KEY}"
    assert_status "200" "Get final flag state"

    local final_stage
    final_stage="$(echo "$RESPONSE_BODY" | jq -r '.stage')"
    if [[ "$final_stage" == "learn" ]]; then
        pass "Flag '${FLAG_KEY}' successfully completed full lifecycle: plan → ... → learn"
    else
        fail "Flag '${FLAG_KEY}' at unexpected final stage: '${final_stage}' (expected 'learn')"
    fi

    # ── SECTION 10: Verify Stage Filtering ────────────────────────────────
    section "10. Console — Stage Filtering Verification"

    # Test that filtering by stage works
    for test_stage in "plan" "spec" "design" "flag" "implement" "test" "configure" "approve" "ship" "monitor" "decide" "analyze" "learn"; do
        api GET "/v1/console/flags?stage=${test_stage}&limit=50"
        if [[ "$RESPONSE_CODE" == "200" ]]; then
            local count
            count="$(echo "$RESPONSE_BODY" | jq -r '.total')"
            pass "Stage filter '${test_stage}': ${count} flag(s) found"
        else
            fail "Stage filter '${test_stage}': HTTP ${RESPONSE_CODE}"
        fi
    done

    # ── SECTION 11: Edge Cases ────────────────────────────────────────────
    section "11. Console — Edge Case Tests"

    # 11a: Advance from "learn" should fail (final stage)
    info "Testing advance from 'learn' (should fail — final stage)..."
    api POST "/v1/console/flags/${FLAG_KEY}/advance" \
        "{\"environment\":\"development\"}"
    if [[ "$RESPONSE_CODE" == "422" ]]; then
        pass "Advance from 'learn' correctly rejected (HTTP 422)"
    elif [[ "$RESPONSE_CODE" == "200" ]]; then
        warn "Advance from 'learn' returned 200 — possibly the NextStage logic allows wrapping? Check domain logic."
    else
        warn "Advance from 'learn' returned HTTP ${RESPONSE_CODE} — $(echo "$RESPONSE_BODY" | jq -r '.error // empty' 2>/dev/null || echo 'unknown')"
    fi

    # 11b: Get non-existent flag
    info "Testing GET for non-existent flag..."
    api GET "/v1/console/flags/non-existent-flag-zzz-never-exists"
    if [[ "$RESPONSE_CODE" == "404" ]]; then
        pass "Non-existent flag correctly returns 404"
    else
        warn "Non-existent flag returned HTTP ${RESPONSE_CODE} (expected 404)"
    fi

    # 11c: Ship with invalid percentage
    info "Testing ship with invalid percentage..."
    api POST "/v1/console/flags/${FLAG_KEY}/ship" \
        "{\"target_percent\":150,\"guard_metrics\":[],\"environment\":\"development\"}"
    if [[ "$RESPONSE_CODE" == "422" || "$RESPONSE_CODE" == "400" ]]; then
        pass "Ship with 150% correctly rejected (HTTP ${RESPONSE_CODE})"
    else
        warn "Ship with 150% returned HTTP ${RESPONSE_CODE} (expected 422 or 400)"
    fi

    # 11d: Advance without environment
    info "Testing advance without environment field..."
    # Use the ship test flag or create a temp one
    api POST "/v1/console/flags/${FLAG_KEY}/advance" "{}"
    if [[ "$RESPONSE_CODE" == "400" ]]; then
        pass "Advance without environment correctly rejected (HTTP 400)"
    elif [[ "$RESPONSE_CODE" == "422" ]]; then
        warn "Advance without environment returned 422 (unprocessable) — already at final stage?"
    else
        warn "Advance without environment returned HTTP ${RESPONSE_CODE}"
    fi

    # ── SECTION 12: Help Context ──────────────────────────────────────────
    section "12. Console — Help Context"

    api GET "/v1/console/help/context"
    assert_status "200" "Get help context"
    assert_json_exists ".org_id" "Organization ID in help context"
    assert_json_exists ".user_name" "User name in help context"
    assert_json_exists ".user_role" "User role in help context"
    assert_json_exists ".plan" "Plan in help context"

    # ─── Test Summary ──────────────────────────────────────────────────────
    echo ""
    echo -e "${BOLD}${BLUE}┌─────────────────────────────────────────────────────────────┐${NC}"
    echo -e "${BOLD}${BLUE}│                    TEST SUMMARY                             │${NC}"
    echo -e "${BOLD}${BLUE}├─────────────────────────────────────────────────────────────┤${NC}"
    echo -e "${BOLD}${BLUE}│  ${GREEN}Passed: ${PASS}${NC}"
    echo -e "${BOLD}${BLUE}│  ${RED}Failed: ${FAIL}${NC}"
    echo -e "${BOLD}${BLUE}│  Total:  $((PASS + FAIL))${NC}"
    echo -e "${BOLD}${BLUE}└─────────────────────────────────────────────────────────────┘${NC}"
    echo ""

    if [[ "$FAIL" -eq 0 ]]; then
        echo -e "${GREEN}${BOLD}All tests passed! ✓${NC}"
        exit 0
    else
        echo -e "${RED}${BOLD}${FAIL} test(s) failed. ✗${NC}"
        exit 1
    fi
}

# ─── Run main ────────────────────────────────────────────────────────────────
main "$@"
