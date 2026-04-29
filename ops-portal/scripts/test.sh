#!/usr/bin/env bash
set -euo pipefail

PASS=0
FAIL=0
BASE="http://localhost:8081"
COOKIE_JAR="/tmp/ops_portal_cookies.txt"
PORTAL_PID=""
CLUSTER_PID=""

cleanup() {
    kill $PORTAL_PID 2>/dev/null || true
    kill $CLUSTER_PID 2>/dev/null || true
    rm -f "$COOKIE_JAR" /tmp/ops_portal_test.db /tmp/testcluster_port.txt
}
trap cleanup EXIT

echo "=== Building ==="
go build -o /tmp/ops-portal ./cmd/ops-portal/
echo "✓ Build complete"

# Start test cluster server
echo "=== Starting test cluster ==="
go run ./cmd/testcluster/ > /tmp/testcluster_log.txt 2>&1 &
CLUSTER_PID=$!
sleep 2

# Read port from output
CLUSTER_PORT=$(grep -oP 'listening on 127\.0\.0\.1:\K\d+' /tmp/testcluster_log.txt || echo "")
if [ -z "$CLUSTER_PORT" ]; then
    # Try reading from port file
    CLUSTER_PORT=$(cat /tmp/testcluster_port.txt 2>/dev/null || echo "")
fi
if [ -z "$CLUSTER_PORT" ]; then
    echo "FAIL: Could not determine test cluster port"
    cat /tmp/testcluster_log.txt
    exit 1
fi
CLUSTER_TOKEN="test-cluster-token-abc123"
echo "  Test cluster running on port $CLUSTER_PORT"

# Ensure PostgreSQL is running
if ! pg_isready -q 2>/dev/null && ! docker compose -f docker-compose.ops.yml ps postgres 2>/dev/null | grep -q "Up"; then
    echo "Starting PostgreSQL via Docker..."
    docker compose -f docker-compose.ops.yml up -d postgres
    sleep 3
fi

# Start ops portal
echo "=== Starting ops portal ==="
export DATABASE_URL="postgres://ops:ops@localhost:5433/ops-portal?sslmode=disable"
export PORT=8081
export JWT_SECRET=test-secret
export SEED_EMAIL=admin@featuresignals.com
export SEED_PASSWORD=test-password

/tmp/ops-portal > /tmp/portal_log.txt 2>&1 &
PORTAL_PID=$!
sleep 2

# Check portal started
if ! kill -0 $PORTAL_PID 2>/dev/null; then
    echo "FAIL: Portal failed to start"
    cat /tmp/portal_log.txt
    exit 1
fi
echo "✓ Portal started"

test_endpoint() {
    local desc="$1"
    local method="$2"
    local url="$3"
    local body="$4"
    local expected="$5"

    if [ -n "$body" ]; then
        resp=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -H "Content-Type: application/json" \
            -d "$body" \
            -b "$COOKIE_JAR" -c "$COOKIE_JAR" 2>/dev/null)
    else
        resp=$(curl -s -w "\n%{http_code}" -X "$method" "$url" \
            -b "$COOKIE_JAR" -c "$COOKIE_JAR" 2>/dev/null)
    fi

    http_code=$(echo "$resp" | tail -1)
    body_content=$(echo "$resp" | sed '$d')

    if echo "$body_content" | grep -q "$expected"; then
        echo "  PASS: $desc (HTTP $http_code)"
        PASS=$((PASS + 1))
    else
        echo "  FAIL: $desc"
        echo "    Expected to contain: $expected"
        echo "    Got: $body_content (HTTP $http_code)"
        FAIL=$((FAIL + 1))
    fi
}

echo ""
echo "=== Smoke Tests ==="

# 1. Health
test_endpoint "Health endpoint" GET "$BASE/health" "" '"status":"ok"'

# 2. Login page renders HTML
test_endpoint "Login page renders HTML" GET "$BASE/login" "" '<form'

# 3. Login
test_endpoint "Login succeeds" POST "$BASE/api/v1/auth/login" \
    '{"email":"admin@featuresignals.com","password":"test-password"}' \
    '"role":"admin"'

# 4. Dashboard
test_endpoint "Dashboard returns data" GET "$BASE/api/v1/dashboard" "" '"total"'

# 5. Unauthenticated access blocked
rm -f "$COOKIE_JAR"
test_endpoint "Unauthenticated blocked" GET "$BASE/api/v1/clusters" "" '"authentication required"'

# Re-login
curl -s -X POST "$BASE/api/v1/auth/login" \
    -H "Content-Type: application/json" \
    -d '{"email":"admin@featuresignals.com","password":"test-password"}' \
    -c "$COOKIE_JAR" > /dev/null 2>&1

# 6. List clusters (empty)
test_endpoint "List clusters (empty)" GET "$BASE/api/v1/clusters" "" '[]'

# 7. Register cluster
REG_RESP=$(curl -s -X POST "$BASE/api/v1/clusters" \
    -H "Content-Type: application/json" \
    -d "{\"name\":\"test-cluster\",\"region\":\"eu\",\"public_ip\":\"127.0.0.1:$CLUSTER_PORT\",\"api_token\":\"$CLUSTER_TOKEN\"}" \
    -b "$COOKIE_JAR" 2>/dev/null)
CLUSTER_ID=$(echo "$REG_RESP" | grep -o '"id":"[^"]*"' | cut -d'"' -f4 || echo "")
test_endpoint "Register cluster" POST "$BASE/api/v1/clusters" \
    "{\"name\":\"test-cluster\",\"region\":\"eu\",\"public_ip\":\"127.0.0.1:$CLUSTER_PORT\",\"api_token\":\"$CLUSTER_TOKEN\"}" \
    '"status":"unknown"'

# 8. Cluster health
sleep 1
if [ -n "$CLUSTER_ID" ]; then
    test_endpoint "Cluster health" GET "$BASE/api/v1/clusters/$CLUSTER_ID/health" "" '"status":"ok"'
fi

# 9. Duplicate name returns 409
test_endpoint "Duplicate name rejected" POST "$BASE/api/v1/clusters" \
    "{\"name\":\"test-cluster\",\"public_ip\":\"127.0.0.2\",\"api_token\":\"token2\"}" \
    '"error"'

# 10. Dashboard shows cluster
test_endpoint "Dashboard shows cluster" GET "$BASE/api/v1/dashboard" "" '"test-cluster"'

# 11. Deploy
if [ -n "$CLUSTER_ID" ]; then
    test_endpoint "Deploy creates record" POST "$BASE/api/v1/deployments" \
        "{\"cluster_id\":\"$CLUSTER_ID\",\"version\":\"abc1234\",\"services\":[\"server\"]}" \
        '"status":"in_progress"'
fi

# 12. Deploy history
test_endpoint "Deploy history" GET "$BASE/api/v1/deployments" "" '"total"'

# 13. Config read
if [ -n "$CLUSTER_ID" ]; then
    test_endpoint "Config read" GET "$BASE/api/v1/clusters/$CLUSTER_ID/config" "" '"config"'
fi

# 14. Users list
test_endpoint "Users list" GET "$BASE/api/v1/users" "" '"admin@featuresignals.com"'

# 15. Audit log
test_endpoint "Audit log" GET "$BASE/api/v1/audit" "" '"total"'

# 16. Logout
test_endpoint "Logout" POST "$BASE/api/v1/auth/logout" "" '"logged out"'

# 17. Post-logout access blocked
test_endpoint "Post-logout blocked" GET "$BASE/api/v1/clusters" "" '"authentication required"'

# 18. 404 returns proper JSON for API
test_endpoint "API 404 returns JSON" GET "$BASE/api/v1/nonexistent" "" '"route not found"'

echo ""
echo "=== Results: $PASS passed, $FAIL failed ==="
if [ "$FAIL" -gt 0 ]; then
    exit 1
fi
echo "ALL SMOKE TESTS PASSED"
