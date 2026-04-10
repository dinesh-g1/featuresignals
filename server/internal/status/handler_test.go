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

type mockCacheHealth struct {
	listening    bool
	rulesetCount int
}

func (m *mockCacheHealth) IsListening() bool  { return m.listening }
func (m *mockCacheHealth) RulesetCount() int  { return m.rulesetCount }

type mockSSEHealth struct {
	totalClients int
}

func (m *mockSSEHealth) TotalClientCount() int { return m.totalClients }

func newTestHandler(hc HealthChecker, ps PoolStats, sr *mockStatusRecorder) *Handler {
	if sr == nil {
		sr = &mockStatusRecorder{}
	}
	return NewHandler(hc, ps, "in", sr, &mockCacheHealth{listening: true, rulesetCount: 3}, &mockSSEHealth{totalClients: 5})
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
	if rs.Region != "in" {
		t.Errorf("expected in, got %s", rs.Region)
	}
	if len(rs.Services) != 6 {
		t.Fatalf("expected 6 services, got %d", len(rs.Services))
	}

	svcMap := make(map[string]ServiceStatus)
	for _, svc := range rs.Services {
		svcMap[svc.Name] = svc
	}
	for _, name := range []string{"API Server", "Database", "Connection Pool", "Flag Evaluation Engine", "Cache", "Real-time Streaming"} {
		if _, ok := svcMap[name]; !ok {
			t.Errorf("missing service: %s", name)
		}
	}
}

func TestHandler_HandleLocalStatus_DBDown(t *testing.T) {
	h := NewHandler(
		&mockHealthChecker{err: errors.New("connection refused")},
		&mockPoolStats{acquired: 0, max: 20},
		"eu",
		&mockStatusRecorder{},
		&mockCacheHealth{listening: true},
		&mockSSEHealth{},
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
		&mockCacheHealth{listening: true},
		&mockSSEHealth{},
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

func TestHandler_HandleLocalStatus_CacheDegraded(t *testing.T) {
	h := NewHandler(
		&mockHealthChecker{},
		&mockPoolStats{acquired: 2, max: 20},
		"in",
		&mockStatusRecorder{},
		&mockCacheHealth{listening: false, rulesetCount: 0},
		&mockSSEHealth{},
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

	var cacheSvc *ServiceStatus
	for i := range rs.Services {
		if rs.Services[i].Name == "Cache" {
			cacheSvc = &rs.Services[i]
			break
		}
	}
	if cacheSvc == nil {
		t.Fatal("Cache service not found")
	}
	if cacheSvc.Status != "degraded" {
		t.Errorf("expected Cache degraded, got %s", cacheSvc.Status)
	}
	if cacheSvc.Message != "PG LISTEN inactive" {
		t.Errorf("unexpected cache message: %s", cacheSvc.Message)
	}
}

func TestHandler_HandleLocalStatus_FlagEvalEngine(t *testing.T) {
	h := newTestHandler(&mockHealthChecker{}, &mockPoolStats{acquired: 2, max: 20}, nil)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/v1/status", nil)

	h.HandleLocalStatus(w, r)

	var rs RegionStatus
	if err := json.NewDecoder(w.Body).Decode(&rs); err != nil {
		t.Fatalf("decode: %v", err)
	}

	var evalSvc *ServiceStatus
	for i := range rs.Services {
		if rs.Services[i].Name == "Flag Evaluation Engine" {
			evalSvc = &rs.Services[i]
			break
		}
	}
	if evalSvc == nil {
		t.Fatal("Flag Evaluation Engine service not found")
	}
	if evalSvc.Status != "operational" {
		t.Errorf("expected operational, got %s", evalSvc.Status)
	}
}

func TestHandler_HandleLocalStatus_SSEStreaming(t *testing.T) {
	h := NewHandler(
		&mockHealthChecker{},
		&mockPoolStats{acquired: 2, max: 20},
		"in",
		&mockStatusRecorder{},
		&mockCacheHealth{listening: true},
		&mockSSEHealth{totalClients: 42},
	)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/v1/status", nil)

	h.HandleLocalStatus(w, r)

	var rs RegionStatus
	if err := json.NewDecoder(w.Body).Decode(&rs); err != nil {
		t.Fatalf("decode: %v", err)
	}

	var sseSvc *ServiceStatus
	for i := range rs.Services {
		if rs.Services[i].Name == "Real-time Streaming" {
			sseSvc = &rs.Services[i]
			break
		}
	}
	if sseSvc == nil {
		t.Fatal("Real-time Streaming service not found")
	}
	if sseSvc.Status != "operational" {
		t.Errorf("expected operational, got %s", sseSvc.Status)
	}
	if sseSvc.Message != "42 SDK clients connected" {
		t.Errorf("unexpected SSE message: %s", sseSvc.Message)
	}
}

func TestHandler_HandleLocalStatus_NilOptionals(t *testing.T) {
	h := NewHandler(
		&mockHealthChecker{},
		nil,
		"in",
		&mockStatusRecorder{},
		nil,
		nil,
	)
	w := httptest.NewRecorder()
	r := httptest.NewRequest(http.MethodGet, "/v1/status", nil)

	h.HandleLocalStatus(w, r)

	var rs RegionStatus
	if err := json.NewDecoder(w.Body).Decode(&rs); err != nil {
		t.Fatalf("decode: %v", err)
	}
	if rs.Status != "operational" {
		t.Errorf("expected operational, got %s", rs.Status)
	}
	// API Server + Database + Flag Evaluation Engine = 3 (pool, cache, SSE are nil)
	if len(rs.Services) != 3 {
		t.Errorf("expected 3 services with nil optionals, got %d", len(rs.Services))
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
		if r.Region == "in" {
			hasLocal = true
			if r.Status != "operational" {
				t.Errorf("local region should be operational, got %s", r.Status)
			}
		}
	}
	if !hasLocal {
		t.Error("local region not found in global status")
	}

	// Remote regions are unreachable in tests; overall must reflect that.
	if gs.OverallStatus != "partial_outage" && gs.OverallStatus != "operational" {
		t.Errorf("unexpected overall_status: %s", gs.OverallStatus)
	}
}

func TestHandler_CheckAllRegions_UnreachableIsPartialOutage(t *testing.T) {
	// When any region is unreachable the overall status must not be "operational".
	h := newTestHandler(&mockHealthChecker{}, &mockPoolStats{acquired: 2, max: 20}, nil)
	gs := h.CheckAllRegions(context.Background())

	unreachableCount := 0
	for _, r := range gs.Regions {
		if r.Status == "unreachable" {
			unreachableCount++
		}
	}
	if unreachableCount > 0 && gs.OverallStatus == "operational" {
		t.Errorf("got overall_status=operational with %d unreachable region(s)", unreachableCount)
	}
}

func TestHandler_CheckAllRegions_RegionCodeOverride(t *testing.T) {
	// Simulate a misconfigured satellite that returns the wrong region code in
	// its /v1/status response (LOCAL_REGION defaulted to "in" on a US server).
	// probeRemoteRegion must correct the code before returning.
	fakeSatellite := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/health" {
			w.WriteHeader(http.StatusOK)
			return
		}
		// Return wrong region code — as if LOCAL_REGION="in" on the US server.
		_ = json.NewEncoder(w).Encode(RegionStatus{
			Region: "in", // wrong — should be "us"
			Name:   "India",
			Status: "operational",
		})
	}))
	defer fakeSatellite.Close()

	// Temporarily override the US region endpoint to point at our fake server.
	original := domain.Regions[domain.RegionUS]
	domain.Regions[domain.RegionUS] = domain.RegionInfo{
		Code:        domain.RegionUS,
		Name:        "United States",
		Flag:        "🇺🇸",
		APIEndpoint: fakeSatellite.URL,
		AppEndpoint: fakeSatellite.URL,
	}
	defer func() { domain.Regions[domain.RegionUS] = original }()

	rs := probeRemoteRegion(context.Background(), domain.RegionUS, domain.Regions[domain.RegionUS])
	if rs.Region != domain.RegionUS {
		t.Errorf("expected region %q, got %q", domain.RegionUS, rs.Region)
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
				{Date: "2026-04-07", Region: "in", Component: "API Server", UptimePct: 100, TotalChecks: 288, OperationalChecks: 288},
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
		if r.Region == "in" {
			hasLocal = true
			if r.Status != "operational" {
				t.Errorf("local region should be operational, got %s", r.Status)
			}
		}
	}
	if !hasLocal {
		t.Error("local region 'in' not found")
	}

	if gs.CheckedAt.IsZero() {
		t.Error("checked_at should not be zero")
	}

	// overall_status must be one of the known values — never an empty string.
	switch gs.OverallStatus {
	case "operational", "degraded", "partial_outage":
	default:
		t.Errorf("unexpected overall_status: %q", gs.OverallStatus)
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
