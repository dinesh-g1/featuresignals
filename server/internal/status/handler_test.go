package status

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"net/http/httptest"
	"testing"
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

func TestHandler_HandleLocalStatus_Operational(t *testing.T) {
	h := NewHandler(&mockHealthChecker{}, &mockPoolStats{acquired: 5, max: 20}, "us")
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
	h := NewHandler(&mockHealthChecker{}, &mockPoolStats{acquired: 2, max: 20}, "us")
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
