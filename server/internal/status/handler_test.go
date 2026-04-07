package status

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

type mockHealthChecker struct {
	err error
}

func (m *mockHealthChecker) Ping(ctx context.Context) error { return m.err }

type mockPoolStats struct {
	acquired int32
	max      int32
}

func (m *mockPoolStats) AcquiredConns() int32 { return m.acquired }
func (m *mockPoolStats) MaxConns() int32      { return m.max }

type mockStatusRecorder struct {
	history []domain.DailyComponentStatus
	err     error
}

func (m *mockStatusRecorder) InsertStatusChecks(context.Context, []domain.StatusCheck) error {
	return nil
}

func (m *mockStatusRecorder) GetComponentHistory(_ context.Context, _ int) ([]domain.DailyComponentStatus, error) {
	return m.history, m.err
}

func newTestHandler(hc HealthChecker, ps PoolStats, sr *mockStatusRecorder) *Handler {
	if sr == nil {
		sr = &mockStatusRecorder{}
	}
	return NewHandler(hc, ps, "us", sr)
}

func TestHandler_HandleLocalStatus_Operational(t *testing.T) {
	h := newTestHandler(&mockHealthChecker{}, &mockPoolStats{acquired: 5, max: 20}, nil)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/v1/status", nil)

	h.HandleLocalStatus(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var rs RegionStatus
	if err := json.NewDecoder(w.Body).Decode(&rs); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if rs.Status != "operational" {
		t.Errorf("expected operational, got %s", rs.Status)
	}
	if rs.Region != "us" {
		t.Errorf("expected us, got %s", rs.Region)
	}
	if len(rs.Services) < 2 {
		t.Fatalf("expected at least 2 services, got %d", len(rs.Services))
	}
}

func TestHandler_HandleLocalStatus_DBDown(t *testing.T) {
	h := NewHandler(
		&mockHealthChecker{err: errors.New("connection refused")},
		&mockPoolStats{acquired: 0, max: 20},
		"eu",
		&mockStatusRecorder{},
	)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/v1/status", nil)

	h.HandleLocalStatus(w, r)

	var rs RegionStatus
	if err := json.NewDecoder(w.Body).Decode(&rs); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if rs.Status != "down" {
		t.Errorf("expected down, got %s", rs.Status)
	}
	dbSvc := rs.Services[1]
	if dbSvc.Status != "down" {
		t.Errorf("expected DB down, got %s", dbSvc.Status)
	}
}

func TestHandler_HandleLocalStatus_PoolDegraded(t *testing.T) {
	h := NewHandler(
		&mockHealthChecker{},
		&mockPoolStats{acquired: 19, max: 20},
		"in",
		&mockStatusRecorder{},
	)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/v1/status", nil)

	h.HandleLocalStatus(w, r)

	var rs RegionStatus
	if err := json.NewDecoder(w.Body).Decode(&rs); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if rs.Status != "degraded" {
		t.Errorf("expected degraded, got %s", rs.Status)
	}
}

func TestHandler_HandleGlobalStatus(t *testing.T) {
	h := newTestHandler(&mockHealthChecker{}, &mockPoolStats{acquired: 2, max: 20}, nil)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/v1/status/global", nil)

	h.HandleGlobalStatus(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var gs GlobalStatus
	if err := json.NewDecoder(w.Body).Decode(&gs); err != nil {
		t.Fatalf("decode: %v", err)
	}

	if len(gs.Regions) == 0 {
		t.Error("expected at least one region")
	}

	hasLocal := false
	for _, r := range gs.Regions {
		if r.Region == "us" {
			hasLocal = true
			if r.Status != "operational" {
				t.Errorf("local region should be operational, got %s", r.Status)
			}
		}
	}
	if !hasLocal {
		t.Error("local region not found in global status")
	}
}

// --- HandleStatusHistory Tests ---

func TestHandler_HandleStatusHistory(t *testing.T) {
	tests := []struct {
		name       string
		query      string
		history    []domain.DailyComponentStatus
		storeErr   error
		wantStatus int
		wantLen    int
	}{
		{
			name:  "default 90 days",
			query: "",
			history: []domain.DailyComponentStatus{
				{Date: "2026-04-07", Region: "us", Component: "API Server", UptimePct: 100, TotalChecks: 288, OperationalChecks: 288},
			},
			wantStatus: http.StatusOK,
			wantLen:    1,
		},
		{
			name:       "custom days param",
			query:      "?days=30",
			history:    []domain.DailyComponentStatus{},
			wantStatus: http.StatusOK,
			wantLen:    0,
		},
		{
			name:       "empty history returns empty array",
			query:      "",
			history:    nil,
			wantStatus: http.StatusOK,
			wantLen:    0,
		},
		{
			name:       "invalid days - negative",
			query:      "?days=-1",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid days - over 90",
			query:      "?days=200",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "invalid days - non-numeric",
			query:      "?days=abc",
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "store error",
			query:      "",
			storeErr:   errors.New("db connection failed"),
			wantStatus: http.StatusInternalServerError,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			sr := &mockStatusRecorder{history: tc.history, err: tc.storeErr}
			h := newTestHandler(&mockHealthChecker{}, &mockPoolStats{acquired: 2, max: 20}, sr)

			w := httptest.NewRecorder()
			r := httptest.NewRequest(http.MethodGet, "/v1/status/history"+tc.query, nil)

			h.HandleStatusHistory(w, r)

			if w.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d", tc.wantStatus, w.Code)
			}

			if tc.wantStatus == http.StatusOK {
				var resp struct {
					Components []domain.DailyComponentStatus `json:"components"`
					Regions    []string                      `json:"regions"`
				}
				if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
					t.Fatalf("decode: %v", err)
				}
				if len(resp.Components) != tc.wantLen {
					t.Errorf("expected %d components, got %d", tc.wantLen, len(resp.Components))
				}
				if len(resp.Regions) == 0 {
					t.Error("expected regions list to be non-empty")
				}
			}
		})
	}
}

func TestHandler_CheckAllRegions(t *testing.T) {
	h := newTestHandler(&mockHealthChecker{}, &mockPoolStats{acquired: 2, max: 20}, nil)

	gs := h.CheckAllRegions(context.Background())

	if len(gs.Regions) == 0 {
		t.Fatal("expected at least one region")
	}

	hasLocal := false
	for _, r := range gs.Regions {
		if r.Region == "us" {
			hasLocal = true
			if r.Status != "operational" {
				t.Errorf("local region should be operational, got %s", r.Status)
			}
		}
	}
	if !hasLocal {
		t.Error("local region 'us' not found")
	}

	if gs.CheckedAt.IsZero() {
		t.Error("checked_at should not be zero")
	}
}

func TestIsUnreachableError(t *testing.T) {
	tests := []struct {
		name string
		err  error
		want bool
	}{
		{
			name: "nil error",
			err:  nil,
			want: false,
		},
		{
			name: "generic error",
			err:  errors.New("timeout"),
			want: false,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			if got := isUnreachableError(tc.err); got != tc.want {
				t.Errorf("isUnreachableError() = %v, want %v", got, tc.want)
			}
		})
	}
}
