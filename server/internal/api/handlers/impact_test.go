package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/domain"
)

// ── Mock Impact Store ──────────────────────────────────────────────────────

type mockImpactStore struct {
	reports       map[string]*domain.ImpactReport // keyed by "orgID/flagKey"
	learnings     map[string]*domain.OrgLearning  // keyed by orgID
	costs         map[string][]domain.CostAttribution // keyed by "orgID/flagKey"
	flags         map[string]*domain.Flag           // keyed by "projectID/key"
	scanResults   map[string][]domain.ScanResult    // keyed by "orgID/projectID"
}

func newMockImpactStore() *mockImpactStore {
	return &mockImpactStore{
		reports:     make(map[string]*domain.ImpactReport),
		learnings:   make(map[string]*domain.OrgLearning),
		costs:       make(map[string][]domain.CostAttribution),
		flags:       make(map[string]*domain.Flag),
		scanResults: make(map[string][]domain.ScanResult),
	}
}

// ─── ImpactReader ─────────────────────────────────────────────────────────

func (m *mockImpactStore) GetImpactReport(_ context.Context, id string) (*domain.ImpactReport, error) {
	for _, r := range m.reports {
		if r.ID == id {
			return r, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockImpactStore) ListImpactReports(_ context.Context, orgID, flagKey string, limit, offset int) ([]domain.ImpactReport, error) {
	return nil, errors.New("not implemented")
}

func (m *mockImpactStore) CountImpactReports(_ context.Context, orgID, flagKey string) (int, error) {
	return 0, errors.New("not implemented")
}

func (m *mockImpactStore) GetLatestImpactReport(_ context.Context, orgID, flagKey string) (*domain.ImpactReport, error) {
	r, ok := m.reports[orgID+"/"+flagKey]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return r, nil
}

func (m *mockImpactStore) ListCostAttributions(_ context.Context, orgID, flagKey string) ([]domain.CostAttribution, error) {
	return m.costs[orgID+"/"+flagKey], nil
}

func (m *mockImpactStore) GetOrgLearning(_ context.Context, orgID string) (*domain.OrgLearning, error) {
	l, ok := m.learnings[orgID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return l, nil
}

func (m *mockImpactStore) ListOrgLearnings(_ context.Context, orgID string, limit, offset int) ([]domain.OrgLearning, error) {
	return nil, errors.New("not implemented")
}

// ─── ImpactWriter ─────────────────────────────────────────────────────────

func (m *mockImpactStore) CreateImpactReport(_ context.Context, r *domain.ImpactReport) error {
	m.reports[r.OrgID+"/"+r.FlagKey] = r
	return nil
}

func (m *mockImpactStore) CreateCostAttribution(_ context.Context, c *domain.CostAttribution) error {
	key := c.OrgID + "/" + c.FlagKey
	m.costs[key] = append(m.costs[key], *c)
	return nil
}

func (m *mockImpactStore) CreateOrgLearning(_ context.Context, l *domain.OrgLearning) error {
	m.learnings[l.OrgID] = l
	return nil
}

// ─── FlagReader ───────────────────────────────────────────────────────────

func (m *mockImpactStore) GetFlag(_ context.Context, projectID, key string) (*domain.Flag, error) {
	f, ok := m.flags[projectID+"/"+key]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return f, nil
}

func (m *mockImpactStore) ListFlags(_ context.Context, projectID string, limit, offset int) ([]domain.Flag, error) {
	return nil, errors.New("not implemented")
}

func (m *mockImpactStore) ListFlagsWithFilter(_ context.Context, orgID, projectID, labelSelector string, limit, offset int) ([]domain.Flag, error) {
	var result []domain.Flag
	for _, f := range m.flags {
		if f.OrgID == orgID {
			result = append(result, *f)
		}
	}
	return result, nil
}

func (m *mockImpactStore) CountFlagsWithFilter(_ context.Context, orgID, projectID, labelSelector string) (int, error) {
	count := 0
	for _, f := range m.flags {
		if f.OrgID == orgID {
			count++
		}
	}
	return count, nil
}

func (m *mockImpactStore) ListFlagsSorted(_ context.Context, projectID, sortField, sortDir string, limit, offset int) ([]domain.Flag, error) {
	return nil, errors.New("not implemented")
}

func (m *mockImpactStore) CountFlagsByProject(_ context.Context, projectID string) (int, error) {
	return 0, errors.New("not implemented")
}

func (m *mockImpactStore) GetFlagState(_ context.Context, flagID, envID string) (*domain.FlagState, error) {
	return nil, errors.New("not implemented")
}

func (m *mockImpactStore) ListFlagStatesByEnv(_ context.Context, envID string, limit, offset int) ([]domain.FlagState, error) {
	return nil, errors.New("not implemented")
}

func (m *mockImpactStore) CountFlagStatesByEnv(_ context.Context, envID string) (int, error) {
	return 0, errors.New("not implemented")
}

// ─── Code2FlagReader ─────────────────────────────────────────────────────

func (m *mockImpactStore) ListScanResults(_ context.Context, orgID, projectID string, filter domain.ScanResultFilter, limit, offset int) ([]domain.ScanResult, error) {
	key := orgID + "/" + projectID
	return m.scanResults[key], nil
}

func (m *mockImpactStore) CountScanResults(_ context.Context, orgID, projectID string, filter domain.ScanResultFilter) (int, error) {
	return 0, errors.New("not implemented")
}

func (m *mockImpactStore) GetScanResult(_ context.Context, id string) (*domain.ScanResult, error) {
	return nil, errors.New("not implemented")
}

func (m *mockImpactStore) ListGeneratedFlags(_ context.Context, orgID, projectID string, limit, offset int) ([]domain.GeneratedFlag, error) {
	return nil, errors.New("not implemented")
}

func (m *mockImpactStore) CountGeneratedFlags(_ context.Context, orgID, projectID string) (int, error) {
	return 0, errors.New("not implemented")
}

func (m *mockImpactStore) GetGeneratedFlag(_ context.Context, id string) (*domain.GeneratedFlag, error) {
	return nil, errors.New("not implemented")
}

func (m *mockImpactStore) ListCleanupEntries(_ context.Context, orgID string, filter domain.CleanupFilter, limit, offset int) ([]domain.CleanupEntry, error) {
	return nil, errors.New("not implemented")
}

func (m *mockImpactStore) CountCleanupEntries(_ context.Context, orgID string, filter domain.CleanupFilter) (int, error) {
	return 0, errors.New("not implemented")
}

func (m *mockImpactStore) GetCleanupEntry(_ context.Context, id string) (*domain.CleanupEntry, error) {
	return nil, errors.New("not implemented")
}

// ── Helpers ────────────────────────────────────────────────────────────────

func setupTestImpactEnv(m *mockImpactStore) {
	m.flags["proj-1/test-flag"] = &domain.Flag{
		ID: "flag-1", OrgID: testOrgID, ProjectID: "proj-1", Key: "test-flag",
		FlagType: domain.FlagTypeBoolean, Status: domain.StatusActive,
	}
	m.flags["proj-1/dark-mode"] = &domain.Flag{
		ID: "flag-2", OrgID: testOrgID, ProjectID: "proj-1", Key: "dark-mode",
		FlagType: domain.FlagTypeBoolean, Status: domain.StatusRolledOut,
	}
}

func newTestImpactHandler(store *mockImpactStore) *ImpactHandler {
	logger := slog.New(slog.NewTextHandler(httptest.NewRecorder(), &slog.HandlerOptions{Level: slog.LevelError}))
	return NewImpactHandler(store, store, store, store, logger)
}

// ── Tests ──────────────────────────────────────────────────────────────────

func TestImpactHandler_GetReport_Success(t *testing.T) {
	store := newMockImpactStore()
	setupTestImpactEnv(store)

	// Seed an impact report
	now := time.Now().UTC()
	store.reports[testOrgID+"/test-flag"] = &domain.ImpactReport{
		ID: "report-1", OrgID: testOrgID, FlagKey: "test-flag",
		Report:          json.RawMessage(`{"summary":"All clear"}`),
		BusinessImpact:  domain.BusinessImpactPositive,
		CostAttribution: 0.15,
		Recommendations: json.RawMessage(`[]`),
		GeneratedAt:     now,
	}

	h := newTestImpactHandler(store)

	r := httptest.NewRequest("GET", "/v1/impact/report/test-flag", nil)
	r = requestWithChi(r, map[string]string{"flagKey": "test-flag"})
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetImpactReport(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ImpactReportResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.FlagKey != "test-flag" {
		t.Errorf("expected flag_key 'test-flag', got %q", resp.FlagKey)
	}
	if resp.BusinessImpact != domain.BusinessImpactPositive {
		t.Errorf("expected business_impact 'positive', got %q", resp.BusinessImpact)
	}
}

func TestImpactHandler_GetReport_FlagNotFound(t *testing.T) {
	store := newMockImpactStore()
	h := newTestImpactHandler(store)

	r := httptest.NewRequest("GET", "/v1/impact/report/nonexistent", nil)
	r = requestWithChi(r, map[string]string{"flagKey": "nonexistent"})
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetImpactReport(w, r)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestImpactHandler_GetReport_NoReport(t *testing.T) {
	store := newMockImpactStore()
	setupTestImpactEnv(store)
	h := newTestImpactHandler(store)

	r := httptest.NewRequest("GET", "/v1/impact/report/test-flag", nil)
	r = requestWithChi(r, map[string]string{"flagKey": "test-flag"})
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetImpactReport(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ImpactReportResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	// Should have generated a basic report
	if resp.BusinessImpact != "neutral" {
		t.Errorf("expected business_impact 'neutral', got %q", resp.BusinessImpact)
	}
	// Should have persisted the generated report
	if _, ok := store.reports[testOrgID+"/test-flag"]; !ok {
		t.Error("expected generated report to be persisted")
	}
}

func TestImpactHandler_GetReport_WithCostBreakdown(t *testing.T) {
	store := newMockImpactStore()
	setupTestImpactEnv(store)

	now := time.Now().UTC()
	store.reports[testOrgID+"/dark-mode"] = &domain.ImpactReport{
		ID: "report-2", OrgID: testOrgID, FlagKey: "dark-mode",
		Report:          json.RawMessage(`{"summary":"Dark mode impact"}`),
		BusinessImpact:  domain.BusinessImpactNeutral,
		CostAttribution: 0.05,
		GeneratedAt:     now,
	}
	store.costs[testOrgID+"/dark-mode"] = []domain.CostAttribution{
		{ID: "cost-1", OrgID: testOrgID, FlagKey: "dark-mode", ResourceType: "compute",
			CostAmount: 0.03, Currency: "USD", PeriodStart: now.Add(-24 * time.Hour), PeriodEnd: now},
		{ID: "cost-2", OrgID: testOrgID, FlagKey: "dark-mode", ResourceType: "latency",
			CostAmount: 0.02, Currency: "USD", PeriodStart: now.Add(-24 * time.Hour), PeriodEnd: now},
	}

	h := newTestImpactHandler(store)

	r := httptest.NewRequest("GET", "/v1/impact/report/dark-mode", nil)
	r = requestWithChi(r, map[string]string{"flagKey": "dark-mode"})
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetImpactReport(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ImpactReportResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.CostBreakdown) != 2 {
		t.Errorf("expected 2 cost breakdown items, got %d", len(resp.CostBreakdown))
	}
}

func TestImpactHandler_GetLearnings_Success(t *testing.T) {
	store := newMockImpactStore()
	setupTestImpactEnv(store)

	now := time.Now().UTC()
	store.learnings[testOrgID] = &domain.OrgLearning{
		ID:                   "learn-1",
		OrgID:                testOrgID,
		TotalFlagsAnalyzed:   42,
		CleanupCandidates:    5,
		FlagsWithoutOwners:   3,
		StaleFlags:           7,
		AvgRiskScore:         0.35,
		AvgTimeToFullRollout: 48.5,
		TopInsights:          json.RawMessage(`[{"insight":"Clean up stale flags"}]`),
		GeneratedAt:          now,
	}

	h := newTestImpactHandler(store)

	r := httptest.NewRequest("GET", "/v1/impact/learnings", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetOrgLearnings(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.OrgLearningsResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.TotalFlagsAnalyzed != 42 {
		t.Errorf("expected 42 total flags, got %d", resp.TotalFlagsAnalyzed)
	}
	if resp.CleanupCandidates != 5 {
		t.Errorf("expected 5 cleanup candidates, got %d", resp.CleanupCandidates)
	}
	if resp.StaleFlags != 7 {
		t.Errorf("expected 7 stale flags, got %d", resp.StaleFlags)
	}
}

func TestImpactHandler_GetLearnings_Empty(t *testing.T) {
	store := newMockImpactStore()
	setupTestImpactEnv(store)
	h := newTestImpactHandler(store)

	r := httptest.NewRequest("GET", "/v1/impact/learnings", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetOrgLearnings(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.OrgLearningsResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	// Should have TotalFlagsAnalyzed from basic generation (at least 2 from setup)
	if resp.TotalFlagsAnalyzed < 2 {
		t.Errorf("expected at least 2 flags analyzed, got %d", resp.TotalFlagsAnalyzed)
	}
}

func TestImpactHandler_GetLearnings_NoFlags(t *testing.T) {
	store := newMockImpactStore()
	h := newTestImpactHandler(store)

	r := httptest.NewRequest("GET", "/v1/impact/learnings", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetOrgLearnings(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.OrgLearningsResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.TotalFlagsAnalyzed != 0 {
		t.Errorf("expected 0 flags analyzed, got %d", resp.TotalFlagsAnalyzed)
	}
}

func TestImpactHandler_GetReport_LongFlagName(t *testing.T) {
	store := newMockImpactStore()
	// Flag with a long key
	store.flags["proj-1/my-very-long-feature-flag-key-with-special-chars"] = &domain.Flag{
		ID: "flag-long", OrgID: testOrgID, ProjectID: "proj-1",
		Key: "my-very-long-feature-flag-key-with-special-chars",
		FlagType: domain.FlagTypeBoolean, Status: domain.StatusActive,
	}
	h := newTestImpactHandler(store)

	r := httptest.NewRequest("GET", "/v1/impact/report/my-very-long-feature-flag-key-with-special-chars", nil)
	r = requestWithChi(r, map[string]string{"flagKey": "my-very-long-feature-flag-key-with-special-chars"})
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetImpactReport(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}


