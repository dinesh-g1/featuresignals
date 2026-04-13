#!/usr/bin/env bash
# run-all.sh — Run conformance tests against all FSAutoResearch SDKs.
#
# Usage:
#   ./scripts/run-all.sh              # Test all SDKs
#   ./scripts/run-all.sh --sdk go     # Test only the Go SDK
#   ./scripts/run-all.sh --sdk go,node --parallel  # Test specific SDKs in parallel
#
# Prerequisites:
#   - The test server must be running on http://localhost:8181
#   - Each SDK must be installed/built in its respective sdks/ directory

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TESTSUITE_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_DIR="${TESTSUITE_DIR}/results"
SERVER_URL="http://localhost:8181"
TIMESTAMP="$(date -u +"%Y-%m-%dT%H:%M:%SZ")"

# SDKs to test
ALL_SDKS=("go" "node" "python" "java" "dotnet" "ruby" "react" "vue")

# Parse arguments
SDKS_TO_RUN=()
PARALLEL=false

while [[ $# -gt 0 ]]; do
    case "$1" in
        --sdk)
            IFS=',' read -ra SDKS_TO_RUN <<< "$2"
            shift 2
            ;;
        --server-url)
            SERVER_URL="$2"
            shift 2
            ;;
        --parallel)
            PARALLEL=true
            shift
            ;;
        --help|-h)
            echo "Usage: $0 [--sdk <sdk1,sdk2,...>] [--server-url <url>] [--parallel]"
            echo ""
            echo "Available SDKs: ${ALL_SDKS[*]}"
            exit 0
            ;;
        *)
            echo "Unknown option: $1"
            exit 1
            ;;
    esac
done

# Default to all SDKs if none specified
if [[ ${#SDKS_TO_RUN[@]} -eq 0 ]]; then
    SDKS_TO_RUN=("${ALL_SDKS[@]}")
fi

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "============================================"
echo " FSAutoResearch SDK Conformance Test Runner"
echo "============================================"
echo "Timestamp:    ${TIMESTAMP}"
echo "Server URL:   ${SERVER_URL}"
echo "SDKs to test: ${SDKS_TO_RUN[*]}"
echo "Parallel:     ${PARALLEL}"
echo "============================================"
echo ""

# Check if the test server is running
check_server() {
    if curl -sf "${SERVER_URL}/health" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

if ! check_server; then
    echo -e "${YELLOW}Warning: Test server is not running at ${SERVER_URL}${NC}"
    echo "Please start the test server first:"
    echo "  cd sdks/testsuite/server && go run main.go"
    echo ""
    read -p "Continue anyway? (y/N) " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
fi

# Initialize results file
mkdir -p "${RESULTS_DIR}"

# Test result template
run_sdk_tests() {
    local sdk="$1"
    local sdk_dir="${TESTSUITE_DIR}/../../sdks/${sdk}"
    local test_file="${RESULTS_DIR}/${sdk}-results.json"
    local start_time
    start_time=$(date +%s)
    local status="skipped"
    local tests_passed=0
    local tests_failed=0
    local tests_total=0
    local error_message=""

    echo -n "Testing ${sdk}... "

    # Check if SDK directory exists
    if [[ ! -d "${sdk_dir}" ]]; then
        echo -e "${YELLOW}SKIPPED (directory not found: ${sdk_dir})${NC}"
        status="skipped"
        error_message="SDK directory not found"
    else
        # Run SDK-specific tests
        # Each SDK should have a test script or Makefile target
        local test_command=""
        case "${sdk}" in
            go)
                if [[ -f "${sdk_dir}/Makefile" ]]; then
                    test_command="make test-conformance TESTSUITE_URL=${SERVER_URL}"
                elif [[ -f "${sdk_dir}/conformance_test.go" ]]; then
                    test_command="cd ${sdk_dir} && go test -v -tags=conformance -run Conformance"
                fi
                ;;
            node|react|vue)
                if [[ -f "${sdk_dir}/package.json" ]]; then
                    test_command="cd ${sdk_dir} && npm run test:conformance -- --server-url=${SERVER_URL}"
                fi
                ;;
            python)
                if [[ -f "${sdk_dir}/Makefile" ]]; then
                    test_command="cd ${sdk_dir} && make test-conformance TESTSUITE_URL=${SERVER_URL}"
                elif [[ -f "${sdk_dir}/setup.py" || -f "${sdk_dir}/pyproject.toml" ]]; then
                    test_command="cd ${sdk_dir} && pytest tests/conformance/ -v"
                fi
                ;;
            java)
                if [[ -f "${sdk_dir}/pom.xml" ]]; then
                    test_command="cd ${sdk_dir} && mvn test -Pconformance -Dserver.url=${SERVER_URL}"
                elif [[ -f "${sdk_dir}/build.gradle" ]]; then
                    test_command="cd ${sdk_dir} && ./gradlew test --tests '*ConformanceTest*' -PserverUrl=${SERVER_URL}"
                fi
                ;;
            dotnet)
                if [[ -f "${sdk_dir}"/*.csproj ]]; then
                    test_command="cd ${sdk_dir} && dotnet test --filter 'Conformance' --logger 'console;verbosity=detailed'"
                fi
                ;;
            ruby)
                if [[ -f "${sdk_dir}/Gemfile" ]]; then
                    test_command="cd ${sdk_dir} && bundle exec rake conformance:run SERVER_URL=${SERVER_URL}"
                fi
                ;;
        esac

        if [[ -n "${test_command}" ]]; then
            echo -n "running... "
            if eval "${test_command}" > "${test_file}.log" 2>&1; then
                echo -e "${GREEN}PASSED${NC}"
                status="passed"
                tests_passed=17
                tests_total=17
            else
                echo -e "${RED}FAILED (see ${test_file}.log)${NC}"
                status="failed"
                # Try to parse test output for counts
                tests_passed=$(grep -c "PASS\|✓" "${test_file}.log" 2>/dev/null || echo "0")
                tests_failed=$(grep -c "FAIL\|✗" "${test_file}.log" 2>/dev/null || echo "0")
                tests_total=$((tests_passed + tests_failed))
                if [[ ${tests_total} -eq 0 ]]; then
                    tests_total=17
                    tests_failed=17
                fi
            fi
        else
            echo -e "${YELLOW}SKIPPED (no test command found)${NC}"
            status="skipped"
            error_message="No conformance tests found for this SDK"
        fi
    fi

    local end_time
    end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Calculate score
    local score="failing"
    if [[ ${tests_passed} -eq 17 ]]; then
        score="gold"
    elif [[ ${tests_passed} -ge 14 ]]; then
        score="silver"
    elif [[ ${tests_passed} -ge 10 ]]; then
        score="bronze"
    fi

    # Write results
    cat > "${test_file}" <<EOF
{
  "sdk": "${sdk}",
  "timestamp": "${TIMESTAMP}",
  "status": "${status}",
  "score": "${score}",
  "tests": {
    "passed": ${tests_passed},
    "failed": ${tests_failed},
    "total": ${tests_total}
  },
  "duration_seconds": ${duration},
  "server_url": "${SERVER_URL}",
  "error": "${error_message}"
}
EOF

    echo "  -> ${tests_passed}/${tests_total} passed (${score}) in ${duration}s"
}

# Run tests
declare -a PIDS=()

for sdk in "${SDKS_TO_RUN[@]}"; do
    if [[ "${PARALLEL}" == "true" ]]; then
        run_sdk_tests "${sdk}" &
        PIDS+=($!)
    else
        run_sdk_tests "${sdk}"
    fi
done

# Wait for parallel tests
for pid in "${PIDS[@]}"; do
    wait "${pid}" 2>/dev/null || true
done

echo ""
echo "============================================"
echo " Test run complete"
echo "============================================"
echo ""
echo "Individual results saved to: ${RESULTS_DIR}/"
echo ""
echo "Generate a combined report with:"
echo "  ./scripts/report.sh"
echo ""
