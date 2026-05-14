package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
)

// ─── Mock EvalEventReader ──────────────────────────────────────────────────

type mockEvalEventStore struct {
	count        int64
	countErr     error
	byVariant    map[string]int64
	byVariantErr error
	p50          int64
	p95          int64
	p99          int64
	latencyErr   error
	volume       []domain.TimeSeriesPoint
	volumeErr    error
}

func (m *mockEvalEventStore) CountEvaluations(_ context.Context, _, _ string, _ time.Time) (int64, error) {
	return m.count, m.countErr
}

func (m *mockEvalEventStore) CountEvaluationsByVariant(_ context.Context, _, _ string, _ time.Time) (map[string]int64, error) {
	return m.byVariant, m.byVariantErr
}

func (m *mockEvalEventStore) GetEvaluationLatency(_ context.Context, _, _ string, _ time.Time) (int64, int64, int64, error) {
	return m.p50, m.p95, m.p99, m.latencyErr
}

func (m *mockEvalEventStore) GetEvaluationVolume(_ context.Context, _ string, _ time.Time, _ string) ([]domain.TimeSeriesPoint, error) {
	return m.volume, m.volumeErr
}

// ─── Request helper ────────────────────────────────────────────────────────

// evalEventsRequest creates a test request with org_id set in context.
// Pass an empty query string to use the path as-is, or a non-empty query
// (without leading ?) to append it.
func evalEventsRequest(method, path, query string) (*http.Request, *httptest.ResponseRecorder) {
	target := path
	if query != "" {
		target = path + "?" + query
	}
	req := httptest.NewRequest(method, target, nil)
	ctx := context.WithValue(req.Context(), middleware.OrgIDKey, "org_test")
	req = req.WithContext(ctx)
	return req, httptest.NewRecorder()
}

// evalEventsRequestNoOrg creates a test request without org_id in context.
func evalEventsRequestNoOrg(method, path, query string) (*http.Request, *httptest.ResponseRecorder) {
	target := path
	if query != "" {
		target = path + "?" + query
	}
	req := httptest.NewRequest(method, target, nil)
	return req, httptest.NewRecorder()
}

// ─── Query Tests ───────────────────────────────────────────────────────────

func TestEvalEventsHandler_Query(t *testing.T) {
	t.Parallel()

	baseSince := time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC)

	tests := []struct {
		name       string
		query      string // ?flag_key=X&since=Y (without leading ?)
		mock       func() *mockEvalEventStore
		wantStatus int
		wantBody   string // JSON key or substring to check
	}{
		{
			name:  "success with data",
			query: "flag_key=test-flag&since=2026-01-15T00:00:00Z",
			mock: func() *mockEvalEventStore {
				return &mockEvalEventStore{
					count:     42,
					byVariant: map[string]int64{"control": 30, "treatment": 12},
					p50:       100,
					p95:       500,
					p99:       1000,
				}
			},
			wantStatus: http.StatusOK,
			wantBody:   "test-flag",
		},
		{
			name:       "missing flag_key",
			query:      "",
			mock:       func() *mockEvalEventStore { return &mockEvalEventStore{} },
			wantStatus: http.StatusBadRequest,
			wantBody:   "flag_key",
		},
		{
			name:  "store error on count",
			query: "flag_key=test-flag",
			mock: func() *mockEvalEventStore {
				return &mockEvalEventStore{
					countErr: errors.New("db down"),
				}
			},
			wantStatus: http.StatusInternalServerError,
			wantBody:   "Internal operation failed",
		},
		{
			name:  "by_variant error (partial success)",
			query: "flag_key=test-flag&since=2026-01-15T00:00:00Z",
			mock: func() *mockEvalEventStore {
				return &mockEvalEventStore{
					count:        42,
					byVariantErr: errors.New("query timeout"),
					p50:          100,
					p95:          500,
					p99:          1000,
				}
			},
			wantStatus: http.StatusOK,
			wantBody:   "temporary_unavailable",
		},
		{
			name:  "latency error (partial success)",
			query: "flag_key=test-flag&since=2026-01-15T00:00:00Z",
			mock: func() *mockEvalEventStore {
				return &mockEvalEventStore{
					count:     42,
					byVariant: map[string]int64{"control": 42},
					latencyErr: errors.New("query timeout"),
				}
			},
			wantStatus: http.StatusOK,
			wantBody:   `"latency_us":null`,
		},
		{
			name:  "empty results (zero counts)",
			query: "flag_key=new-flag&since=2026-01-15T00:00:00Z",
			mock: func() *mockEvalEventStore {
				return &mockEvalEventStore{
					count:     0,
					byVariant: map[string]int64{},
				}
			},
			wantStatus: http.StatusOK,
			wantBody:   `"total_evaluations":0`,
		},
		{
			name:  "default since (not provided)",
			query: "flag_key=test-flag",
			mock: func() *mockEvalEventStore {
				return &mockEvalEventStore{
					count:     7,
					byVariant: map[string]int64{"a": 7},
					p50:       50,
					p95:       200,
					p99:       400,
				}
			},
			wantStatus: http.StatusOK,
			wantBody:   `"flag_key":"test-flag"`,
		},
		{
			name:  "both subsidiary queries fail",
			query: "flag_key=test-flag&since=2026-01-15T00:00:00Z",
			mock: func() *mockEvalEventStore {
				return &mockEvalEventStore{
					count:        10,
					byVariantErr: errors.New("timeout"),
					latencyErr:   errors.New("timeout"),
				}
			},
			wantStatus: http.StatusOK,
			wantBody:   "temporary_unavailable",
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			store := tc.mock()
			h := NewEvalEventsHandler(store, testLogger())

			req, rec := evalEventsRequest(http.MethodGet, "/v1/eval-events", tc.query)
			h.Query(rec, req)

			if rec.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d: %s", tc.wantStatus, rec.Code, rec.Body.String())
			}
			if tc.wantBody != "" {
				bodyStr := rec.Body.String()
				if !contains(bodyStr, tc.wantBody) {
					t.Errorf("expected body to contain %q, got: %s", tc.wantBody, bodyStr)
				}
			}

			// For success responses, verify JSON structure
			if tc.wantStatus == http.StatusOK {
				var resp map[string]interface{}
				if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
					t.Fatalf("failed to decode JSON: %v", err)
				}
				// flag_key must always be present
				if _, ok := resp["flag_key"]; !ok {
					t.Error("response missing flag_key")
				}
				// total_evaluations must always be present
				if _, ok := resp["total_evaluations"]; !ok {
					t.Error("response missing total_evaluations")
				}
				// since must always be present
				if _, ok := resp["since"]; !ok {
					t.Error("response missing since")
				}
			}

			_ = baseSince // used for time comparison in extended tests
		})
	}
}

// ─── Query Unauthorized Test ───────────────────────────────────────────────

func TestEvalEventsHandler_Query_Unauthorized(t *testing.T) {
	t.Parallel()

	store := &mockEvalEventStore{}
	h := NewEvalEventsHandler(store, testLogger())

	req, rec := evalEventsRequestNoOrg(http.MethodGet, "/v1/eval-events", "flag_key=test")
	h.Query(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

// ─── Volume Tests ──────────────────────────────────────────────────────────

func TestEvalEventsHandler_Volume(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		query      string
		mock       func() *mockEvalEventStore
		wantStatus int
		wantBody   string
	}{
		{
			name:  "success with points",
			query: "since=2026-01-15T00:00:00Z&interval=1h",
			mock: func() *mockEvalEventStore {
				return &mockEvalEventStore{
					volume: []domain.TimeSeriesPoint{
						{Timestamp: time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC), Value: 100},
						{Timestamp: time.Date(2026, 1, 15, 1, 0, 0, 0, time.UTC), Value: 200},
						{Timestamp: time.Date(2026, 1, 15, 2, 0, 0, 0, time.UTC), Value: 150},
					},
				}
			},
			wantStatus: http.StatusOK,
			wantBody:   `"data":[{`,
		},
		{
			name:  "nil points (returns empty array)",
			query: "since=2026-01-15T00:00:00Z&interval=1h",
			mock: func() *mockEvalEventStore {
				return &mockEvalEventStore{
					volume: nil,
				}
			},
			wantStatus: http.StatusOK,
			wantBody:   `"data":[]`,
		},
		{
			name:  "store error",
			query: "since=2026-01-15T00:00:00Z&interval=1h",
			mock: func() *mockEvalEventStore {
				return &mockEvalEventStore{
					volumeErr: errors.New("db down"),
				}
			},
			wantStatus: http.StatusInternalServerError,
			wantBody:   "Internal operation failed",
		},
		{
			name:  "default interval (not provided)",
			query: "since=2026-01-15T00:00:00Z",
			mock: func() *mockEvalEventStore {
				return &mockEvalEventStore{
					volume: []domain.TimeSeriesPoint{
						{Timestamp: time.Date(2026, 1, 15, 0, 0, 0, 0, time.UTC), Value: 50},
					},
				}
			},
			wantStatus: http.StatusOK,
			wantBody:   `"interval":"1 hour"`,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()

			store := tc.mock()
			h := NewEvalEventsHandler(store, testLogger())

			req, rec := evalEventsRequest(http.MethodGet, "/v1/eval-events/volume", tc.query)
			h.Volume(rec, req)

			if rec.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d: %s", tc.wantStatus, rec.Code, rec.Body.String())
			}
			if tc.wantBody != "" {
				bodyStr := rec.Body.String()
				if !contains(bodyStr, tc.wantBody) {
					t.Errorf("expected body to contain %q, got: %s", tc.wantBody, bodyStr)
				}
			}

			// For success responses, verify JSON structure
			if tc.wantStatus == http.StatusOK {
				var resp map[string]interface{}
				if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
					t.Fatalf("failed to decode JSON: %v", err)
				}
				if _, ok := resp["interval"]; !ok {
					t.Error("response missing interval")
				}
				if _, ok := resp["since"]; !ok {
					t.Error("response missing since")
				}
				if _, ok := resp["data"]; !ok {
					t.Error("response missing data")
				}
			}
		})
	}
}

// ─── Volume Unauthorized Test ──────────────────────────────────────────────

func TestEvalEventsHandler_Volume_Unauthorized(t *testing.T) {
	t.Parallel()

	store := &mockEvalEventStore{}
	h := NewEvalEventsHandler(store, testLogger())

	req, rec := evalEventsRequestNoOrg(http.MethodGet, "/v1/eval-events/volume", "")
	h.Volume(rec, req)

	if rec.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", rec.Code)
	}
}

// ─── Volume Zero Points (Empty Store) ──────────────────────────────────────

func TestEvalEventsHandler_Volume_EmptySlice(t *testing.T) {
	t.Parallel()

	store := &mockEvalEventStore{
		volume: []domain.TimeSeriesPoint{}, // non-nil empty slice
	}
	h := NewEvalEventsHandler(store, testLogger())

	req, rec := evalEventsRequest(http.MethodGet, "/v1/eval-events/volume", "since=2026-01-15T00:00:00Z")
	h.Volume(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode JSON: %v", err)
	}

	data, ok := resp["data"]
	if !ok {
		t.Fatal("response missing data")
	}
	arr, ok := data.([]interface{})
	if !ok {
		t.Fatalf("expected data to be array, got %T", data)
	}
	if len(arr) != 0 {
		t.Errorf("expected empty array, got %d elements", len(arr))
	}
}

