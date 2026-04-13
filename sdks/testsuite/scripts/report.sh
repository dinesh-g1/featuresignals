#!/usr/bin/env bash
# report.sh — Generate a combined conformance test report for all SDKs.
#
# Usage:
#   ./scripts/report.sh                # Generate report from latest results
#   ./scripts/report.sh --output file  # Output to specific file
#   ./scripts/report.sh --format table # Output as formatted table
#
# Reads individual SDK results from results/ directory and produces
# a combined conformance-report.json.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTSUITE_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="${TESTSUITE_DIR}/results"
OUTPUT_FILE="${RESULTS_DIR}/conformance-report.json"
FORMAT="json"

# Parse arguments
while [[ $# -gt 0 ]]; do
    case "$1" in
        --output)
            OUTPUT_FILE="$2"
            shift 2
            ;;
        --format)
            FORMAT="$2"
            shift 2
            ;;
        --help|-h)
            echo "Usage: $0 [--output <file>] [--format json|table]"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Collect all SDK results
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"
SDK_RESULTS="[]"
TOTAL_PASSED=0
TOTAL_FAILED=0
TOTAL_TESTS=0
SDKS_TESTED=0
SDKS_PASSED=0
SCORES_JSON="{"

# Check if results directory exists
if [[ ! -d "${RESULTS_DIR}" ]]; then
    echo "Error: Results directory not found: ${RESULTS_DIR}"
    echo "Please run tests first: ./scripts/run-all.sh"
    exit 1
fi

# Collect individual SDK results
declare -a sdk_names=()
declare -a sdk_statuses=()
declare -a sdk_scores=()
declare -a sdk_passed=()
declare -a sdk_totals=()

for result_file in "${RESULTS_DIR}"/*-results.json; do
    if [[ ! -f "${result_file}" ]]; then
        continue
    fi

    sdk=$(grep -o '"sdk": *"[^"]*"' "${result_file}" | head -1 | cut -d'"' -f4)
    status=$(grep -o '"status": *"[^"]*"' "${result_file}" | head -1 | cut -d'"' -f4)
    score=$(grep -o '"score": *"[^"]*"' "${result_file}" | head -1 | cut -d'"' -f4)
    passed=$(grep -o '"passed": *[0-9]*' "${result_file}" | head -1 | grep -o '[0-9]*')
    total=$(grep -o '"total": *[0-9]*' "${result_file}" | head -1 | grep -o '[0-9]*')

    if [[ -z "${sdk}" ]]; then
        continue
    fi

    sdk_names+=("${sdk}")
    sdk_statuses+=("${status}")
    sdk_scores+=("${score}")
    sdk_passed+=("${passed:-0}")
    sdk_totals+=("${total:-0}")

    TOTAL_PASSED=$((TOTAL_PASSED + ${passed:-0}))
    TOTAL_TESTS=$((TOTAL_TESTS + ${total:-0}))
    SDKS_TESTED=$((SDKS_TESTED + 1))

    if [[ "${status}" == "passed" ]]; then
        SDKS_PASSED=$((SDKS_PASSED + 1))
    fi

    SCORES_JSON="${SCORES_JSON}\"${sdk}\": \"${score}\","
done

SCORES_JSON="${SCORES_JSON%?}}"  # Remove trailing comma and close
TOTAL_FAILED=$((TOTAL_TESTS - TOTAL_PASSED))

# Calculate overall score
OVERALL_SCORE="failing"
if [[ ${SDKS_TESTED} -gt 0 ]]; then
    if [[ ${SDKS_PASSED} -eq ${SDKS_TESTED} ]]; then
        OVERALL_SCORE="gold"
    elif [[ ${SDKS_PASSED} -ge $((SDKS_TESTED * 75 / 100)) ]]; then
        OVERALL_SCORE="silver"
    elif [[ ${SDKS_PASSED} -ge $((SDKS_TESTED * 50 / 100)) ]]; then
        OVERALL_SCORE="bronze"
    fi
fi

# Generate JSON report
cat > "${OUTPUT_FILE}" <<EOF
{
  "report_version": "1.0.0",
  "generated_at": "${TIMESTAMP}",
  "test_server": "http://localhost:8181",
  "summary": {
    "sdks_tested": ${SDKS_TESTED},
    "sdks_passed": ${SDKS_PASSED},
    "total_tests": ${TOTAL_TESTS},
    "tests_passed": ${TOTAL_PASSED},
    "tests_failed": ${TOTAL_FAILED},
    "overall_score": "${OVERALL_SCORE}"
  },
  "scores": ${SCORES_JSON},
  "sdks": [
EOF

# Add individual SDK results
first=true
for i in "${!sdk_names[@]}"; do
    if [[ "${first}" == "true" ]]; then
        first=false
    else
        echo "," >> "${OUTPUT_FILE}"
    fi

    result_file="${RESULTS_DIR}/${sdk_names[$i]}-results.json"
    if [[ -f "${result_file}" ]]; then
        cat "${result_file}" >> "${OUTPUT_FILE}"
    else
        cat >> "${OUTPUT_FILE}" <<ENTRY
    {
      "sdk": "${sdk_names[$i]}",
      "status": "${sdk_statuses[$i]}",
      "score": "${sdk_scores[$i]}"
    }
ENTRY
    fi
done

cat >> "${OUTPUT_FILE}" <<'EOF'

  ],
  "test_categories": [
    "initialization",
    "boolean_evaluation",
    "string_evaluation",
    "number_evaluation",
    "json_evaluation",
    "ab_evaluation",
    "default_value",
    "targeting",
    "percentage_rollout",
    "real_time_updates",
    "polling_fallback",
    "offline_mode",
    "error_handling_invalid_key",
    "error_handling_invalid_url",
    "concurrent_access",
    "memory_usage",
    "openfeature_provider"
  ]
}
EOF

echo "Conformance report generated: ${OUTPUT_FILE}"

# Print summary table
if [[ "${FORMAT}" == "table" ]]; then
    echo ""
    printf "%-12s %-10s %-10s %-8s %-8s\n" "SDK" "Status" "Score" "Passed" "Total"
    printf "%-12s %-10s %-10s %-8s %-8s\n" "-----------" "----------" "----------" "--------" "--------"
    for i in "${!sdk_names[@]}"; do
        printf "%-12s %-10s %-10s %-8s %-8s\n" \
            "${sdk_names[$i]}" \
            "${sdk_statuses[$i]}" \
            "${sdk_scores[$i]}" \
            "${sdk_passed[$i]}" \
            "${sdk_totals[$i]}"
    done
    printf "%-12s %-10s %-10s %-8s %-8s\n" "-----------" "----------" "----------" "--------" "--------"
    printf "%-12s %-10s %-10s %-8s %-8s\n" "OVERALL" "${OVERALL_SCORE}" "" "${TOTAL_PASSED}" "${TOTAL_TESTS}"
    echo ""
fi

echo "Summary:"
echo "  SDKs tested:    ${SDKS_TESTED}"
echo "  SDKs passed:    ${SDKS_PASSED}"
echo "  Tests passed:   ${TOTAL_PASSED}/${TOTAL_TESTS}"
echo "  Overall score:  ${OVERALL_SCORE}"
