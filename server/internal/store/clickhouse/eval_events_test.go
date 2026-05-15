package clickhouse

import (
	"context"
	"errors"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Test helpers ──────────────────────────────────────────────────────────

// skipIfNoClickHouse skips the test if CLICKHOUSE_TEST_URL is not set.
func skipIfNoClickHouse(t *testing.T) {
	t.Helper()
	if os.Getenv("CLICKHOUSE_TEST_URL") == "" {
		t.Skip("CLICKHOUSE_TEST_URL not set; skipping ClickHouse integration test")
	}
}

// newTestStore creates a ClickHouseEvalEventStore with test configuration.
// For integration tests, set CLICKHOUSE_TEST_URL to a valid ClickHouse address.
func newTestStore(t *testing.T) *ClickHouseEvalEventStore {
	t.Helper()
	logger := slog.New(slog.DiscardHandler)
	return newTestStoreWithLogger(t, logger)
}

func newTestStoreWithLogger(t *testing.T, logger *slog.Logger) *ClickHouseEvalEventStore {
	t.Helper()

	// Use CLICKHOUSE_TEST_URL from env; if not set, use a dummy address
	// for unit tests that don't actually connect.
	addrs := []string{"localhost:9000"}
	if url := os.Getenv("CLICKHOUSE_TEST_URL"); url != "" {
		addrs = []string{url}
	}

	cfg := ClickHouseConfig{
		Addrs:         addrs,
		Database:      "featuresignals_test",
		Username:      "default",
		Password:      "",
		MaxOpenConns:  5,
		DialTimeout:   5 * time.Second,
		QueryTimeout:  10 * time.Second,
		BatchSize:     100,
		FlushInterval: time.Second,
		MaxRetries:    1,
		RetryBackoff:  50 * time.Millisecond,
	}

	store, err := NewClickHouseEvalEventStore(cfg, logger)
	require.NoError(t, err, "failed to create test store")
	return store
}

// ─── Constructor tests (no ClickHouse required) ────────────────────────────

func TestClickHouseEvalEventStore_New_ValidConfig(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	require.NotNil(t, store)
	assert.NotNil(t, store.cfg)
	assert.Equal(t, "featuresignals_test", store.cfg.Database)
	assert.Len(t, store.cfg.Addrs, 1)
	assert.Greater(t, store.cfg.BatchSize, 0)
}

func TestClickHouseEvalEventStore_New_NoAddrs(t *testing.T) {
	t.Parallel()

	cfg := ClickHouseConfig{
		Database: "featuresignals",
	}
	store, err := NewClickHouseEvalEventStore(cfg, slog.New(slog.DiscardHandler))
	assert.Nil(t, store)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "at least one address is required")
}

func TestClickHouseEvalEventStore_New_NoDatabase(t *testing.T) {
	t.Parallel()

	cfg := ClickHouseConfig{
		Addrs: []string{"localhost:9000"},
	}
	store, err := NewClickHouseEvalEventStore(cfg, slog.New(slog.DiscardHandler))
	assert.Nil(t, store)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "database name is required")
}

func TestClickHouseEvalEventStore_New_DefaultTimeout(t *testing.T) {
	t.Parallel()

	cfg := ClickHouseConfig{
		Addrs:    []string{"localhost:9000"},
		Database: "featuresignals",
		// DialTimeout and QueryTimeout intentionally zero
	}
	store, err := NewClickHouseEvalEventStore(cfg, slog.New(slog.DiscardHandler))
	require.NoError(t, err)
	require.NotNil(t, store)
	assert.Equal(t, 10*time.Second, store.cfg.DialTimeout)
	assert.Equal(t, 30*time.Second, store.cfg.QueryTimeout)
	assert.Equal(t, 10, store.cfg.MaxOpenConns)
	assert.Equal(t, 1000, store.cfg.BatchSize)
	assert.Equal(t, time.Second, store.cfg.FlushInterval)
	assert.Equal(t, 3, store.cfg.MaxRetries)
	assert.Equal(t, 100*time.Millisecond, store.cfg.RetryBackoff)
}

func TestClickHouseEvalEventStore_New_DefaultsAllZeroConfig(t *testing.T) {
	t.Parallel()

	// Ensure all zero-value config fields get sensible defaults.
	cfg := ClickHouseConfig{
		Addrs:    []string{"ch1:9000"},
		Database: "testdb",
	}
	store, err := NewClickHouseEvalEventStore(cfg, slog.New(slog.DiscardHandler))
	require.NoError(t, err)
	require.NotNil(t, store)

	assert.Equal(t, 10*time.Second, store.cfg.DialTimeout, "DialTimeout default")
	assert.Equal(t, 30*time.Second, store.cfg.QueryTimeout, "QueryTimeout default")
	assert.Equal(t, 10, store.cfg.MaxOpenConns, "MaxOpenConns default")
	assert.Equal(t, 1000, store.cfg.BatchSize, "BatchSize default")
	assert.Equal(t, time.Second, store.cfg.FlushInterval, "FlushInterval default")
	assert.Equal(t, 3, store.cfg.MaxRetries, "MaxRetries default")
	assert.Equal(t, 100*time.Millisecond, store.cfg.RetryBackoff, "RetryBackoff default")
}

func TestClickHouseEvalEventStore_Connect_InvalidHost(t *testing.T) {
	// This test does NOT require a real ClickHouse instance — it verifies
	// that connecting to a non-existent host returns an error.
	t.Parallel()

	cfg := ClickHouseConfig{
		Addrs:        []string{"192.0.2.1:9000"}, // TEST-NET-1, guaranteed unreachable
		Database:     "featuresignals",
		DialTimeout:  500 * time.Millisecond,
		QueryTimeout: 1 * time.Second,
	}
	store, err := NewClickHouseEvalEventStore(cfg, slog.New(slog.DiscardHandler))
	require.NoError(t, err)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()

	err = store.Connect(ctx)
	require.Error(t, err, "connecting to invalid host should fail")
}

// ─── InsertEvalEvent unit tests (no ClickHouse required) ───────────────────

func TestClickHouseEvalEventStore_InsertEvalEvent_NilEvent(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	err := store.InsertEvalEvent(context.Background(), nil)
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrValidation),
		"expected ErrValidation, got: %v", err)
}

func TestClickHouseEvalEventStore_InsertEvalEvent_NotConnected(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	event := &domain.EvalEvent{
		ID:     "test-1",
		OrgID:  "org-1",
		FlagKey: "test-flag",
		Value:  "true",
		Reason: "default",
	}

	err := store.InsertEvalEvent(context.Background(), event)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not connected")
}

// ─── InsertEvalEventBatch unit tests ──────────────────────────────────────

func TestClickHouseEvalEventStore_InsertEvalEventBatch_NilBatch(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	err := store.InsertEvalEventBatch(context.Background(), nil)
	require.Error(t, err)
	assert.True(t, errors.Is(err, domain.ErrValidation),
		"expected ErrValidation, got: %v", err)
}

func TestClickHouseEvalEventStore_InsertEvalEventBatch_NotConnected(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	batch := &domain.EvalEventBatch{
		ID:     "batch-1",
		OrgID:  "org-1",
		Events: []domain.EvalEvent{
			{ID: "ev-1", OrgID: "org-1", FlagKey: "flag-a", Value: "true", Reason: "default"},
		},
	}

	err := store.InsertEvalEventBatch(context.Background(), batch)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not connected")
}

func TestClickHouseEvalEventStore_InsertEvalEventBatch_EmptyBatch(t *testing.T) {
	// Note: Empty batch is checked AFTER the not-connected guard.
	// When conn is nil, even an empty batch returns "not connected".
	// This is a design decision: the connection health check takes priority.
	// When connected, an empty batch would return nil (no-op).
	t.Parallel()

	store := newTestStore(t)
	batch := &domain.EvalEventBatch{
		ID:     "batch-1",
		OrgID:  "org-1",
		Events: []domain.EvalEvent{},
	}

	err := store.InsertEvalEventBatch(context.Background(), batch)
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not connected")
	// When connected, empty batch would be a no-op (returns nil).
}

// ─── Reader unit tests (not connected — graceful degradation) ──────────────

func TestClickHouseEvalEventStore_CountEvaluations_NotConnected(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	count, err := store.CountEvaluations(context.Background(), "org-1", "flag-1", time.Now().Add(-1*time.Hour))
	assert.NoError(t, err)
	assert.Equal(t, int64(0), count)
}

func TestClickHouseEvalEventStore_CountEvaluationsByVariant_NotConnected(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	variants, err := store.CountEvaluationsByVariant(context.Background(), "org-1", "flag-1", time.Now().Add(-1*time.Hour))
	assert.NoError(t, err)
	assert.NotNil(t, variants)
	assert.Empty(t, variants)
}

func TestClickHouseEvalEventStore_GetEvaluationLatency_NotConnected(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	p50, p95, p99, err := store.GetEvaluationLatency(context.Background(), "org-1", "flag-1", time.Now().Add(-1*time.Hour))
	assert.NoError(t, err)
	assert.Equal(t, int64(0), p50)
	assert.Equal(t, int64(0), p95)
	assert.Equal(t, int64(0), p99)
}

func TestClickHouseEvalEventStore_GetEvaluationVolume_NotConnected(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	points, err := store.GetEvaluationVolume(context.Background(), "org-1", time.Now().Add(-1*time.Hour), "hour")
	assert.NoError(t, err)
	assert.NotNil(t, points)
	assert.Empty(t, points)
}

// ─── Health tests ──────────────────────────────────────────────────────────

func TestClickHouseEvalEventStore_Health_NotConnected(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	err := store.Health(context.Background())
	require.Error(t, err)
	assert.Contains(t, err.Error(), "not connected")
}

// ─── Close tests ───────────────────────────────────────────────────────────

func TestClickHouseEvalEventStore_Close_NoConnection(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	// Close should succeed (no-op) when there's no connection.
	err := store.Close()
	assert.NoError(t, err)
}

func TestClickHouseEvalEventStore_Close_DoubleClose(t *testing.T) {
	t.Parallel()

	store := newTestStore(t)
	err := store.Close()
	assert.NoError(t, err)
	// Second close should also succeed (no-op).
	err = store.Close()
	assert.NoError(t, err)
}

// ─── Interface compliance check ────────────────────────────────────────────

func TestClickHouseEvalEventStore_ImplementsInterfaces(t *testing.T) {
	t.Parallel()
	// Compile-time checks already done in eval_events.go via var _ pattern.
	// This runtime check confirms the assignment works.
	store := newTestStore(t)
	var _ domain.EvalEventReader = store
	var _ domain.EvalEventWriter = store
}

// ─── Integration tests (require ClickHouse) ────────────────────────────────

func TestClickHouseEvalEventStore_Integration_ConnectAndHealth(t *testing.T) {
	skipIfNoClickHouse(t)
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()

	err := store.Connect(ctx)
	require.NoError(t, err)
	defer store.Close()

	err = store.Health(ctx)
	assert.NoError(t, err, "health check should pass after connect")
}

func TestClickHouseEvalEventStore_Integration_InsertAndQuery(t *testing.T) {
	skipIfNoClickHouse(t)
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()
	require.NoError(t, store.Connect(ctx))
	defer store.Close()

	// Insert a single event
	now := time.Now()
	event := &domain.EvalEvent{
		ID:            "test-integration-1",
		OrgID:         "test-org",
		ProjectID:     "test-proj",
		EnvironmentID: "test-env",
		FlagKey:       "test-flag",
		FlagID:        "flag-id-1",
		Value:         "true",
		Reason:        domain.EvalReasonDefault,
		SDK:           "go/1.2.3",
		SDKMode:       "server",
		LatencyUs:     150,
		CacheHit:      false,
		EvaluatedAt:   now,
	}
	err := store.InsertEvalEvent(ctx, event)
	require.NoError(t, err)

	// Query counts (may be zero if MV hasn't caught up; ClickHouse MVs are async)
	count, err := store.CountEvaluations(ctx, "test-org", "test-flag", now.Add(-1*time.Hour))
	require.NoError(t, err)
	// Count may be 0 if materialized view hasn't processed yet.
	// At minimum, the query succeeded.
	t.Logf("CountEvaluations returned: %d (may be 0 if MV hasn't caught up)", count)

	// Volume query
	points, err := store.GetEvaluationVolume(ctx, "test-org", now.Add(-1*time.Hour), "hour")
	require.NoError(t, err)
	assert.NotNil(t, points)
	t.Logf("GetEvaluationVolume returned %d points", len(points))
}

func TestClickHouseEvalEventStore_Integration_BatchInsert(t *testing.T) {
	skipIfNoClickHouse(t)
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()
	require.NoError(t, store.Connect(ctx))
	defer store.Close()

	now := time.Now()
	events := make([]domain.EvalEvent, 50)
	for i := 0; i < 50; i++ {
		events[i] = domain.EvalEvent{
			ID:            "test-batch-" + string(rune('A'+i%26)) + string(rune('0'+i/26)),
			OrgID:         "test-org-batch",
			ProjectID:     "test-proj",
			EnvironmentID: "test-env",
			FlagKey:       "batch-flag",
			Value:         "true",
			Reason:        domain.EvalReasonDefault,
			SDK:           "go/1.0.0",
			SDKMode:       "server",
			LatencyUs:     int64(i * 10),
			CacheHit:      i%2 == 0,
			EvaluatedAt:   now,
		}
	}
	batch := &domain.EvalEventBatch{
		ID:          "batch-integration-1",
		OrgID:       "test-org-batch",
		Events:      events,
		BatchSize:   len(events),
		SampledRate: 1.0,
	}

	err := store.InsertEvalEventBatch(ctx, batch)
	require.NoError(t, err)

	// Query variants
	variants, err := store.CountEvaluationsByVariant(ctx, "test-org-batch", "batch-flag", now.Add(-1*time.Hour))
	require.NoError(t, err)
	assert.NotNil(t, variants)
	t.Logf("CountEvaluationsByVariant returned %d variants", len(variants))

	// Query latency
	p50, p95, p99, err := store.GetEvaluationLatency(ctx, "test-org-batch", "batch-flag", now.Add(-1*time.Hour))
	require.NoError(t, err)
	t.Logf("Latency p50=%d p95=%d p99=%d", p50, p95, p99)
}

func TestClickHouseEvalEventStore_Integration_GetEvaluationVolume_DayInterval(t *testing.T) {
	skipIfNoClickHouse(t)
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()
	require.NoError(t, store.Connect(ctx))
	defer store.Close()

	points, err := store.GetEvaluationVolume(ctx, "non-existent-org", time.Now().Add(-30*24*time.Hour), "day")
	require.NoError(t, err)
	assert.NotNil(t, points)
	// Should return empty results for non-existent org, but query succeeds.
}

func TestClickHouseEvalEventStore_Integration_GetEvaluationVolume_InvalidInterval(t *testing.T) {
	skipIfNoClickHouse(t)
	t.Parallel()

	store := newTestStore(t)
	ctx := context.Background()
	require.NoError(t, store.Connect(ctx))
	defer store.Close()

	// "minute" is not a recognized interval — but the code treats it as "hour" fallback.
	// The SQL is constructed via allowlist, so unknown intervals default to the hourly table.
	points, err := store.GetEvaluationVolume(ctx, "non-existent-org", time.Now().Add(-1*time.Hour), "minute")
	require.NoError(t, err)
	assert.NotNil(t, points)
	// Doesn't crash, uses eval_counts_hourly as fallback.
}
