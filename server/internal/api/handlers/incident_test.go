package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/domain"
)

// ── Mock Incident Store ────────────────────────────────────────────────────

type mockIncidentStore struct {
	correlations  map[string]*domain.IncidentCorrelation
	remediations  map[string]*domain.AutoRemediation
	flags         map[string]*domain.Flag          // keyed by "projectID/key"
	flagStates    map[string]*domain.FlagState     // keyed by "flagID/envID"
	envs          map[string]*domain.Environment
	auditEntries  []*domain.AuditEntry
}

func newMockIncidentStore() *mockIncidentStore {
	return &mockIncidentStore{
		correlations: make(map[string]*domain.IncidentCorrelation),
		remediations: make(map[string]*domain.AutoRemediation),
		flags:        make(map[string]*domain.Flag),
		flagStates:   make(map[string]*domain.FlagState),
		envs:         make(map[string]*domain.Environment),
	}
}

// ─── IncidentReader ───────────────────────────────────────────────────────

func (m *mockIncidentStore) GetIncidentCorrelation(_ context.Context, id string) (*domain.IncidentCorrelation, error) {
	c, ok := m.correlations[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return c, nil
}

func (m *mockIncidentStore) ListIncidentCorrelations(_ context.Context, orgID string, limit, offset int) ([]domain.IncidentCorrelation, error) {
	var result []domain.IncidentCorrelation
	for _, c := range m.correlations {
		if c.OrgID == orgID {
			result = append(result, *c)
		}
	}
	// Simple limit/offset pagination
	if offset >= len(result) {
		return nil, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], nil
}

func (m *mockIncidentStore) CountIncidentCorrelations(_ context.Context, orgID string) (int, error) {
	count := 0
	for _, c := range m.correlations {
		if c.OrgID == orgID {
			count++
		}
	}
	return count, nil
}

func (m *mockIncidentStore) GetAutoRemediation(_ context.Context, id string) (*domain.AutoRemediation, error) {
	r, ok := m.remediations[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return r, nil
}

func (m *mockIncidentStore) ListAutoRemediations(_ context.Context, orgID, flagKey string, limit, offset int) ([]domain.AutoRemediation, error) {
	var result []domain.AutoRemediation
	for _, r := range m.remediations {
		if r.OrgID == orgID && (flagKey == "" || r.FlagKey == flagKey) {
			result = append(result, *r)
		}
	}
	if offset >= len(result) {
		return nil, nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], nil
}

func (m *mockIncidentStore) CountAutoRemediations(_ context.Context, orgID, flagKey string) (int, error) {
	count := 0
	for _, r := range m.remediations {
		if r.OrgID == orgID && (flagKey == "" || r.FlagKey == flagKey) {
			count++
		}
	}
	return count, nil
}

// ─── IncidentWriter ───────────────────────────────────────────────────────

func (m *mockIncidentStore) CreateIncidentCorrelation(_ context.Context, c *domain.IncidentCorrelation) error {
	m.correlations[c.ID] = c
	return nil
}

func (m *mockIncidentStore) CreateAutoRemediation(_ context.Context, r *domain.AutoRemediation) error {
	m.remediations[r.ID] = r
	return nil
}

func (m *mockIncidentStore) UpdateAutoRemediation(_ context.Context, id string, updates map[string]interface{}) error {
	r, ok := m.remediations[id]
	if !ok {
		return domain.ErrNotFound
	}
	if status, ok := updates["status"].(string); ok {
		r.Status = status
	}
	return nil
}

// ─── FlagReader ───────────────────────────────────────────────────────────

func (m *mockIncidentStore) GetFlag(_ context.Context, projectID, key string) (*domain.Flag, error) {
	f, ok := m.flags[projectID+"/"+key]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return f, nil
}

func (m *mockIncidentStore) ListFlags(_ context.Context, projectID string, limit, offset int) ([]domain.Flag, error) {
	return nil, errors.New("not implemented")
}

func (m *mockIncidentStore) ListFlagsWithFilter(_ context.Context, orgID, projectID, labelSelector string, limit, offset int) ([]domain.Flag, error) {
	return nil, errors.New("not implemented")
}

func (m *mockIncidentStore) CountFlagsWithFilter(_ context.Context, orgID, projectID, labelSelector string) (int, error) {
	return 0, errors.New("not implemented")
}

func (m *mockIncidentStore) ListFlagsSorted(_ context.Context, projectID, sortField, sortDir string, limit, offset int) ([]domain.Flag, error) {
	return nil, errors.New("not implemented")
}

func (m *mockIncidentStore) CountFlagsByProject(_ context.Context, projectID string) (int, error) {
	return 0, errors.New("not implemented")
}

func (m *mockIncidentStore) GetFlagState(_ context.Context, flagID, envID string) (*domain.FlagState, error) {
	fs, ok := m.flagStates[flagID+"/"+envID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return fs, nil
}

func (m *mockIncidentStore) ListFlagStatesByEnv(_ context.Context, envID string, limit, offset int) ([]domain.FlagState, error) {
	return nil, errors.New("not implemented")
}

func (m *mockIncidentStore) CountFlagStatesByEnv(_ context.Context, envID string) (int, error) {
	return 0, errors.New("not implemented")
}

// ─── EnvironmentReader ────────────────────────────────────────────────────

func (m *mockIncidentStore) GetEnvironment(_ context.Context, id string) (*domain.Environment, error) {
	e, ok := m.envs[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return e, nil
}

func (m *mockIncidentStore) ListEnvironments(_ context.Context, projectID string, limit, offset int) ([]domain.Environment, error) {
	return nil, errors.New("not implemented")
}

func (m *mockIncidentStore) CountEnvironmentsByProject(_ context.Context, projectID string) (int, error) {
	return 0, errors.New("not implemented")
}

// ─── AuditWriter ──────────────────────────────────────────────────────────

func (m *mockIncidentStore) CreateAuditEntry(_ context.Context, entry *domain.AuditEntry) error {
	m.auditEntries = append(m.auditEntries, entry)
	return nil
}

func (m *mockIncidentStore) PurgeAuditEntries(_ context.Context, olderThan time.Time) (int, error) {
	return 0, nil
}

// ── Helpers ────────────────────────────────────────────────────────────────

func setupTestIncidentEnv(m *mockIncidentStore) {
	m.envs["env-1"] = &domain.Environment{
		ID: "env-1", OrgID: testOrgID, ProjectID: "proj-1",
	}
	m.flags["proj-1/test-flag"] = &domain.Flag{
		ID: "flag-1", OrgID: testOrgID, ProjectID: "proj-1", Key: "test-flag",
		FlagType: domain.FlagTypeBoolean,
	}
	m.flagStates["flag-1/env-1"] = &domain.FlagState{
		ID: "fs-1", FlagID: "flag-1", EnvID: "env-1", OrgID: testOrgID,
		Enabled: true, PercentageRollout: 5000,
	}
}

func newTestIncidentHandler(store *mockIncidentStore) *IncidentHandler {
	logger := slog.New(slog.NewTextHandler(httptest.NewRecorder(), &slog.HandlerOptions{Level: slog.LevelError}))
	return NewIncidentHandler(store, store, store, store, store, logger)
}

// ── Tests ──────────────────────────────────────────────────────────────────

func TestIncidentHandler_GetMonitor_Success(t *testing.T) {
	store := newMockIncidentStore()
	h := newTestIncidentHandler(store)

	// Seed a correlation and remediation
	now := time.Now().UTC()
	store.correlations["corr-1"] = &domain.IncidentCorrelation{
		ID: "corr-1", OrgID: testOrgID, IncidentStartedAt: now.Add(-1 * time.Hour),
		TotalFlagsChanged: 3, HighestCorrelation: 0.85, CreatedAt: now,
	}
	store.remediations["rem-1"] = &domain.AutoRemediation{
		ID: "rem-1", OrgID: testOrgID, FlagKey: "test-flag", EnvID: "env-1",
		Action: "pause", Status: domain.RemediationStatusApplied, CreatedAt: now,
	}

	r := httptest.NewRequest("GET", "/v1/incidentflag/monitor", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetMonitor(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.MonitorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.ActiveAlerts != 1 {
		t.Errorf("expected 1 active alert, got %d", resp.ActiveAlerts)
	}
	if resp.FlagsUnderMonitoring != 1 {
		t.Errorf("expected 1 flag under monitoring, got %d", resp.FlagsUnderMonitoring)
	}
	if resp.OverallHealth != "warning" {
		t.Errorf("expected 'warning' health, got %q", resp.OverallHealth)
	}
}

func TestIncidentHandler_GetMonitor_Empty(t *testing.T) {
	store := newMockIncidentStore()
	h := newTestIncidentHandler(store)

	r := httptest.NewRequest("GET", "/v1/incidentflag/monitor", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetMonitor(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.MonitorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.OverallHealth != "healthy" {
		t.Errorf("expected 'healthy' health, got %q", resp.OverallHealth)
	}
	if len(resp.RecentCorrelations) != 0 {
		t.Errorf("expected 0 recent correlations, got %d", len(resp.RecentCorrelations))
	}
}

func TestIncidentHandler_GetMonitor_CriticalHealth(t *testing.T) {
	store := newMockIncidentStore()
	h := newTestIncidentHandler(store)

	now := time.Now().UTC()
	for i := 0; i < 5; i++ {
		id := "corr-" + string(rune('0'+i))
		store.correlations[id] = &domain.IncidentCorrelation{
			ID: id, OrgID: testOrgID, IncidentStartedAt: now,
			CreatedAt: now, IncidentEndedAt: nil, // still open
		}
	}

	r := httptest.NewRequest("GET", "/v1/incidentflag/monitor", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetMonitor(w, r)

	var resp dto.MonitorResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp.OverallHealth != "critical" {
		t.Errorf("expected 'critical' health with 5 open alerts, got %q", resp.OverallHealth)
	}
}

func TestIncidentHandler_Correlate_Success(t *testing.T) {
	store := newMockIncidentStore()
	h := newTestIncidentHandler(store)

	body := `{"incident_started_at":"2026-05-24T10:00:00Z","services_affected":["api","web"]}`
	r := httptest.NewRequest("POST", "/v1/incidentflag/correlate", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Correlate(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.CorrelateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.CorrelationID == "" {
		t.Error("expected non-empty correlation_id")
	}
	if len(store.correlations) != 1 {
		t.Errorf("expected 1 correlation stored, got %d", len(store.correlations))
	}
}

func TestIncidentHandler_Correlate_MissingTime(t *testing.T) {
	store := newMockIncidentStore()
	h := newTestIncidentHandler(store)

	body := `{"services_affected":["api"]}`
	r := httptest.NewRequest("POST", "/v1/incidentflag/correlate", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Correlate(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestIncidentHandler_Correlate_InvalidJSON(t *testing.T) {
	store := newMockIncidentStore()
	h := newTestIncidentHandler(store)

	body := `{broken`
	r := httptest.NewRequest("POST", "/v1/incidentflag/correlate", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Correlate(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestIncidentHandler_Correlate_InvalidDateFormat(t *testing.T) {
	store := newMockIncidentStore()
	h := newTestIncidentHandler(store)

	body := `{"incident_started_at":"not-a-date"}`
	r := httptest.NewRequest("POST", "/v1/incidentflag/correlate", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Correlate(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestIncidentHandler_Remediate_Success(t *testing.T) {
	store := newMockIncidentStore()
	setupTestIncidentEnv(store)
	h := newTestIncidentHandler(store)

	body := `{"flag_key":"test-flag","env_id":"env-1","action":"pause","reason":"Incident #42"}`
	r := httptest.NewRequest("POST", "/v1/incidentflag/remediate", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Remediate(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.RemediateResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.RemediationID == "" {
		t.Error("expected non-empty remediation_id")
	}
	if resp.Status != domain.RemediationStatusApplied {
		t.Errorf("expected status 'applied', got %q", resp.Status)
	}
	if resp.FlagKey != "test-flag" {
		t.Errorf("expected flag_key 'test-flag', got %q", resp.FlagKey)
	}
	if len(store.remediations) != 1 {
		t.Errorf("expected 1 remediation stored, got %d", len(store.remediations))
	}
	if len(store.auditEntries) != 1 {
		t.Errorf("expected 1 audit entry, got %d", len(store.auditEntries))
	}
}

func TestIncidentHandler_Remediate_InvalidAction(t *testing.T) {
	store := newMockIncidentStore()
	setupTestIncidentEnv(store)
	h := newTestIncidentHandler(store)

	body := `{"flag_key":"test-flag","env_id":"env-1","action":"destroy"}`
	r := httptest.NewRequest("POST", "/v1/incidentflag/remediate", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Remediate(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestIncidentHandler_Remediate_FlagNotFound(t *testing.T) {
	store := newMockIncidentStore()
	setupTestIncidentEnv(store)
	h := newTestIncidentHandler(store)

	body := `{"flag_key":"nonexistent","env_id":"env-1","action":"pause"}`
	r := httptest.NewRequest("POST", "/v1/incidentflag/remediate", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Remediate(w, r)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestIncidentHandler_Remediate_EnvNotFound(t *testing.T) {
	store := newMockIncidentStore()
	setupTestIncidentEnv(store)
	h := newTestIncidentHandler(store)

	body := `{"flag_key":"test-flag","env_id":"nonexistent","action":"pause"}`
	r := httptest.NewRequest("POST", "/v1/incidentflag/remediate", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Remediate(w, r)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestIncidentHandler_Remediate_MissingRequiredFields(t *testing.T) {
	store := newMockIncidentStore()
	setupTestIncidentEnv(store)
	h := newTestIncidentHandler(store)

	tests := []struct {
		name string
		body string
	}{
		{"missing flag_key", `{"env_id":"env-1","action":"pause"}`},
		{"missing env_id", `{"flag_key":"test-flag","action":"pause"}`},
		{"missing action", `{"flag_key":"test-flag","env_id":"env-1"}`},
		{"invalid json", `{broken`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/v1/incidentflag/remediate", strings.NewReader(tt.body))
			r = requestWithAuth(r, "user-1", testOrgID, "developer")
			w := httptest.NewRecorder()

			h.Remediate(w, r)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d: %s", w.Code, w.Body.String())
			}
		})
	}
}

func TestIncidentHandler_Remediate_Rollback(t *testing.T) {
	store := newMockIncidentStore()
	setupTestIncidentEnv(store)
	h := newTestIncidentHandler(store)

	body := `{"flag_key":"test-flag","env_id":"env-1","action":"rollback"}`
	r := httptest.NewRequest("POST", "/v1/incidentflag/remediate", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Remediate(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestIncidentHandler_Remediate_Kill(t *testing.T) {
	store := newMockIncidentStore()
	setupTestIncidentEnv(store)
	h := newTestIncidentHandler(store)

	body := `{"flag_key":"test-flag","env_id":"env-1","action":"kill"}`
	r := httptest.NewRequest("POST", "/v1/incidentflag/remediate", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Remediate(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}
