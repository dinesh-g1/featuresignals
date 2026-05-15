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

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/domain"
)

// ── Mock Store ─────────────────────────────────────────────────────────────

// mockPreflightStore implements all required interfaces for PreflightHandler tests.
type mockPreflightStore struct {
	reports   map[string]*domain.PreflightReport
	approvals map[string]*domain.PreflightApprovalRequest
	flags     map[string]*domain.Flag          // keyed by "projectID/key"
	envs      map[string]*domain.Environment
	scanResults map[string][]domain.ScanResult // keyed by "orgID/projectID"
}

func newMockPreflightStore() *mockPreflightStore {
	return &mockPreflightStore{
		reports:     make(map[string]*domain.PreflightReport),
		approvals:   make(map[string]*domain.PreflightApprovalRequest),
		flags:       make(map[string]*domain.Flag),
		envs:        make(map[string]*domain.Environment),
		scanResults: make(map[string][]domain.ScanResult),
	}
}

var errNotImplemented = errors.New("not implemented")

// ─── PreflightReader ───────────────────────────────────────────────────────

func (m *mockPreflightStore) GetPreflightReport(_ context.Context, id string) (*domain.PreflightReport, error) {
	r, ok := m.reports[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return r, nil
}

func (m *mockPreflightStore) ListPreflightReports(_ context.Context, orgID, flagKey string, limit, offset int) ([]domain.PreflightReport, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) CountPreflightReports(_ context.Context, orgID, flagKey string) (int, error) {
	return 0, errNotImplemented
}

func (m *mockPreflightStore) GetLatestReport(_ context.Context, orgID, flagKey string) (*domain.PreflightReport, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) ListRolloutPhases(_ context.Context, flagID string) ([]domain.RolloutPhase, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) GetRolloutPhase(_ context.Context, id string) (*domain.RolloutPhase, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) GetActivePhase(_ context.Context, flagID string) (*domain.RolloutPhase, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) GetApprovalRequest(_ context.Context, id string) (*domain.PreflightApprovalRequest, error) {
	a, ok := m.approvals[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return a, nil
}

func (m *mockPreflightStore) ListApprovalRequests(_ context.Context, orgID, status string, limit, offset int) ([]domain.PreflightApprovalRequest, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) CountApprovalRequests(_ context.Context, orgID, status string) (int, error) {
	return 0, errNotImplemented
}

// ─── PreflightWriter ───────────────────────────────────────────────────────

func (m *mockPreflightStore) CreatePreflightReport(_ context.Context, r *domain.PreflightReport) error {
	m.reports[r.ID] = r
	return nil
}

func (m *mockPreflightStore) UpdatePreflightReport(_ context.Context, id string, updates map[string]interface{}) error {
	return errNotImplemented
}

func (m *mockPreflightStore) CreateRolloutPhase(_ context.Context, p *domain.RolloutPhase) error {
	return errNotImplemented
}

func (m *mockPreflightStore) UpdateRolloutPhase(_ context.Context, id string, updates map[string]interface{}) error {
	return errNotImplemented
}

func (m *mockPreflightStore) BatchCreateRolloutPhases(_ context.Context, phases []domain.RolloutPhase) error {
	return errNotImplemented
}

func (m *mockPreflightStore) CreateApprovalRequest(_ context.Context, a *domain.PreflightApprovalRequest) error {
	m.approvals[a.ID] = a
	return nil
}

func (m *mockPreflightStore) UpdateApprovalRequest(_ context.Context, id string, updates map[string]interface{}) error {
	return errNotImplemented
}

// ─── FlagReader ────────────────────────────────────────────────────────────

func (m *mockPreflightStore) GetFlag(_ context.Context, projectID, key string) (*domain.Flag, error) {
	f, ok := m.flags[projectID+"/"+key]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return f, nil
}

func (m *mockPreflightStore) ListFlags(_ context.Context, projectID string, limit, offset int) ([]domain.Flag, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) ListFlagsWithFilter(_ context.Context, orgID, projectID, labelSelector string, limit, offset int) ([]domain.Flag, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) CountFlagsWithFilter(_ context.Context, orgID, projectID, labelSelector string) (int, error) {
	return 0, errNotImplemented
}

func (m *mockPreflightStore) ListFlagsSorted(_ context.Context, projectID, sortField, sortDir string, limit, offset int) ([]domain.Flag, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) CountFlagsByProject(_ context.Context, projectID string) (int, error) {
	return 0, errNotImplemented
}

func (m *mockPreflightStore) GetFlagState(_ context.Context, flagID, envID string) (*domain.FlagState, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) ListFlagStatesByEnv(_ context.Context, envID string, limit, offset int) ([]domain.FlagState, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) CountFlagStatesByEnv(_ context.Context, envID string) (int, error) {
	return 0, errNotImplemented
}

// ─── EnvironmentReader ─────────────────────────────────────────────────────

func (m *mockPreflightStore) GetEnvironment(_ context.Context, id string) (*domain.Environment, error) {
	e, ok := m.envs[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return e, nil
}

func (m *mockPreflightStore) ListEnvironments(_ context.Context, projectID string, limit, offset int) ([]domain.Environment, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) CountEnvironmentsByProject(_ context.Context, projectID string) (int, error) {
	return 0, errNotImplemented
}

// ─── Code2FlagReader ──────────────────────────────────────────────────────

func (m *mockPreflightStore) ListScanResults(_ context.Context, orgID, projectID string, filter domain.ScanResultFilter, limit, offset int) ([]domain.ScanResult, error) {
	key := orgID + "/" + projectID
	return m.scanResults[key], nil
}

func (m *mockPreflightStore) CountScanResults(_ context.Context, orgID, projectID string, filter domain.ScanResultFilter) (int, error) {
	return 0, errNotImplemented
}

func (m *mockPreflightStore) GetScanResult(_ context.Context, id string) (*domain.ScanResult, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) ListGeneratedFlags(_ context.Context, orgID, projectID string, limit, offset int) ([]domain.GeneratedFlag, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) CountGeneratedFlags(_ context.Context, orgID, projectID string) (int, error) {
	return 0, errNotImplemented
}

func (m *mockPreflightStore) GetGeneratedFlag(_ context.Context, id string) (*domain.GeneratedFlag, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) ListCleanupEntries(_ context.Context, orgID string, filter domain.CleanupFilter, limit, offset int) ([]domain.CleanupEntry, error) {
	return nil, errNotImplemented
}

func (m *mockPreflightStore) CountCleanupEntries(_ context.Context, orgID string, filter domain.CleanupFilter) (int, error) {
	return 0, errNotImplemented
}

func (m *mockPreflightStore) GetCleanupEntry(_ context.Context, id string) (*domain.CleanupEntry, error) {
	return nil, errNotImplemented
}

// ── Helpers ────────────────────────────────────────────────────────────────

func setupTestPreflightEnv(m *mockPreflightStore) {
	m.envs["env-1"] = &domain.Environment{ID: "env-1", OrgID: testOrgID, ProjectID: "proj-1"}
	m.flags["proj-1/test-flag"] = &domain.Flag{ID: "flag-1", OrgID: testOrgID, ProjectID: "proj-1", Key: "test-flag"}
	m.scanResults[testOrgID+"/proj-1"] = []domain.ScanResult{
		{ID: "sr-1", OrgID: testOrgID, ProjectID: "proj-1", FilePath: "src/app.ts", SuggestedFlagKey: "test-flag"},
		{ID: "sr-2", OrgID: testOrgID, ProjectID: "proj-1", FilePath: "src/utils.ts", SuggestedFlagKey: "test-flag"},
		{ID: "sr-3", OrgID: testOrgID, ProjectID: "proj-1", FilePath: "src/app.ts", SuggestedFlagKey: "other-flag"},
	}
}

func newTestPreflightHandler(store *mockPreflightStore) *PreflightHandler {
	logger := slog.New(slog.NewTextHandler(httptest.NewRecorder(), &slog.HandlerOptions{Level: slog.LevelError}))
	return NewPreflightHandler(store, store, store, store, store, logger)
}

// ── Tests ──────────────────────────────────────────────────────────────────

func TestPreflightHandler_Assess_Success(t *testing.T) {
	store := newMockPreflightStore()
	setupTestPreflightEnv(store)
	h := newTestPreflightHandler(store)

	body := `{"flag_key":"test-flag","env_id":"env-1","change_type":"rollout"}`
	r := httptest.NewRequest("POST", "/v1/preflight/assess", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Assess(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.AssessResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.AssessmentID == "" {
		t.Error("expected non-empty assessment_id")
	}
	if resp.FlagKey != "test-flag" {
		t.Errorf("expected flag_key 'test-flag', got %q", resp.FlagKey)
	}
	if resp.RiskScore < 0 || resp.RiskScore > 100 {
		t.Errorf("risk_score out of range: %d", resp.RiskScore)
	}
	if resp.ComplianceStatus == "" {
		t.Error("expected non-empty compliance_status")
	}
	if len(resp.RolloutPlan) != 3 {
		t.Errorf("expected 3 rollout phases, got %d", len(resp.RolloutPlan))
	}
}

func TestPreflightHandler_Assess_MissingFlagKey(t *testing.T) {
	store := newMockPreflightStore()
	h := newTestPreflightHandler(store)

	body := `{"env_id":"env-1","change_type":"toggle"}`
	r := httptest.NewRequest("POST", "/v1/preflight/assess", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Assess(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestPreflightHandler_Assess_InvalidChangeType(t *testing.T) {
	store := newMockPreflightStore()
	h := newTestPreflightHandler(store)

	body := `{"flag_key":"test-flag","env_id":"env-1","change_type":"invalid"}`
	r := httptest.NewRequest("POST", "/v1/preflight/assess", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Assess(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestPreflightHandler_Assess_InvalidJSON(t *testing.T) {
	store := newMockPreflightStore()
	h := newTestPreflightHandler(store)

	body := `{broken`
	r := httptest.NewRequest("POST", "/v1/preflight/assess", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Assess(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestPreflightHandler_Assess_EnvNotFound(t *testing.T) {
	store := newMockPreflightStore()
	h := newTestPreflightHandler(store)

	body := `{"flag_key":"test-flag","env_id":"nonexistent","change_type":"toggle"}`
	r := httptest.NewRequest("POST", "/v1/preflight/assess", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Assess(w, r)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestPreflightHandler_GetAssessment_Success(t *testing.T) {
	store := newMockPreflightStore()
	setupTestPreflightEnv(store)
	h := newTestPreflightHandler(store)

	// First create an assessment via Assess.
	body := `{"flag_key":"test-flag","env_id":"env-1","change_type":"toggle"}`
	r := httptest.NewRequest("POST", "/v1/preflight/assess", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()
	h.Assess(w, r)

	var created dto.AssessResponse
	json.Unmarshal(w.Body.Bytes(), &created)

	// Now retrieve it.
	r2 := httptest.NewRequest("GET", "/v1/preflight/assess/"+created.AssessmentID, nil)
	r2 = requestWithChi(r2, map[string]string{"assessmentID": created.AssessmentID})
	r2 = requestWithAuth(r2, "user-1", testOrgID, "developer")
	w2 := httptest.NewRecorder()

	h.GetAssessment(w2, r2)

	if w2.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w2.Code, w2.Body.String())
	}

	var resp dto.AssessResponse
	if err := json.Unmarshal(w2.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}
	if resp.AssessmentID != created.AssessmentID {
		t.Errorf("expected assessment_id %q, got %q", created.AssessmentID, resp.AssessmentID)
	}
}

func TestPreflightHandler_GetAssessment_NotFound(t *testing.T) {
	store := newMockPreflightStore()
	h := newTestPreflightHandler(store)

	r := httptest.NewRequest("GET", "/v1/preflight/assess/nonexistent", nil)
	r = requestWithChi(r, map[string]string{"assessmentID": "nonexistent"})
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetAssessment(w, r)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestPreflightHandler_GetAssessment_WrongOrg(t *testing.T) {
	store := newMockPreflightStore()
	setupTestPreflightEnv(store)
	h := newTestPreflightHandler(store)

	// Create an assessment.
	body := `{"flag_key":"test-flag","env_id":"env-1","change_type":"toggle"}`
	r := httptest.NewRequest("POST", "/v1/preflight/assess", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()
	h.Assess(w, r)

	var created dto.AssessResponse
	json.Unmarshal(w.Body.Bytes(), &created)

	// Try to retrieve it from a different org.
	r2 := httptest.NewRequest("GET", "/v1/preflight/assess/"+created.AssessmentID, nil)
	r2 = requestWithChi(r2, map[string]string{"assessmentID": created.AssessmentID})
	r2 = requestWithAuth(r2, "user-2", "org-other", "developer")
	w2 := httptest.NewRecorder()

	h.GetAssessment(w2, r2)

	if w2.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for cross-org access, got %d", w2.Code)
	}
}

func TestPreflightHandler_RequestApproval_Success(t *testing.T) {
	store := newMockPreflightStore()
	setupTestPreflightEnv(store)
	h := newTestPreflightHandler(store)

	// First create an assessment.
	body := `{"flag_key":"test-flag","env_id":"env-1","change_type":"rollout"}`
	r := httptest.NewRequest("POST", "/v1/preflight/assess", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()
	h.Assess(w, r)

	var created dto.AssessResponse
	json.Unmarshal(w.Body.Bytes(), &created)

	// Now request approval.
	approvalBody := `{"assessment_id":"` + created.AssessmentID + `","justification":"Ready for release"}`
	r2 := httptest.NewRequest("POST", "/v1/preflight/approval", strings.NewReader(approvalBody))
	r2 = requestWithAuth(r2, "user-1", testOrgID, "developer")
	w2 := httptest.NewRecorder()

	h.RequestApproval(w2, r2)

	if w2.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w2.Code, w2.Body.String())
	}

	var resp dto.PreflightApprovalResponse
	if err := json.Unmarshal(w2.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal: %v", err)
	}
	if resp.ApprovalID == "" {
		t.Error("expected non-empty approval_id")
	}
	if resp.Status != domain.PreflightApprovalStatusPending {
		t.Errorf("expected status 'pending', got %q", resp.Status)
	}
	if resp.FlagKey != "test-flag" {
		t.Errorf("expected flag_key 'test-flag', got %q", resp.FlagKey)
	}
}

func TestPreflightHandler_RequestApproval_MissingAssessmentID(t *testing.T) {
	store := newMockPreflightStore()
	h := newTestPreflightHandler(store)

	body := `{"justification":"test"}`
	r := httptest.NewRequest("POST", "/v1/preflight/approval", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.RequestApproval(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d", w.Code)
	}
}

func TestPreflightHandler_RequestApproval_AssessmentNotFound(t *testing.T) {
	store := newMockPreflightStore()
	h := newTestPreflightHandler(store)

	body := `{"assessment_id":"nonexistent","justification":"test"}`
	r := httptest.NewRequest("POST", "/v1/preflight/approval", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.RequestApproval(w, r)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestPreflightHandler_GetApproval_Success(t *testing.T) {
	store := newMockPreflightStore()
	setupTestPreflightEnv(store)
	h := newTestPreflightHandler(store)

	// Create assessment then approval.
	body := `{"flag_key":"test-flag","env_id":"env-1","change_type":"rollout"}`
	r := httptest.NewRequest("POST", "/v1/preflight/assess", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()
	h.Assess(w, r)

	var created dto.AssessResponse
	json.Unmarshal(w.Body.Bytes(), &created)

	approvalBody := `{"assessment_id":"` + created.AssessmentID + `"}`
	r2 := httptest.NewRequest("POST", "/v1/preflight/approval", strings.NewReader(approvalBody))
	r2 = requestWithAuth(r2, "user-1", testOrgID, "developer")
	w2 := httptest.NewRecorder()
	h.RequestApproval(w2, r2)

	var approvalResp dto.PreflightApprovalResponse
	json.Unmarshal(w2.Body.Bytes(), &approvalResp)

	// Now retrieve the approval.
	r3 := httptest.NewRequest("GET", "/v1/preflight/approval/"+approvalResp.ApprovalID, nil)
	r3 = requestWithChi(r3, map[string]string{"approvalID": approvalResp.ApprovalID})
	r3 = requestWithAuth(r3, "user-1", testOrgID, "developer")
	w3 := httptest.NewRecorder()

	h.GetApproval(w3, r3)

	if w3.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w3.Code, w3.Body.String())
	}
}

func TestPreflightHandler_GetApproval_NotFound(t *testing.T) {
	store := newMockPreflightStore()
	h := newTestPreflightHandler(store)

	r := httptest.NewRequest("GET", "/v1/preflight/approval/nonexistent", nil)
	r = requestWithChi(r, map[string]string{"approvalID": "nonexistent"})
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.GetApproval(w, r)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d", w.Code)
	}
}

func TestPreflightHandler_RiskScoreByChangeType(t *testing.T) {
	tests := []struct {
		name       string
		changeType string
		files      int
		refs       int
		minScore   int
		maxScore   int
	}{
		{name: "toggle is low risk", changeType: "toggle", files: 0, refs: 0, minScore: 0, maxScore: 29},
		{name: "rollout is medium risk", changeType: "rollout", files: 5, refs: 10, minScore: 30, maxScore: 70},
		{name: "kill is high risk", changeType: "kill", files: 10, refs: 20, minScore: 90, maxScore: 100},
		{name: "archive is higher risk", changeType: "archive", files: 3, refs: 5, minScore: 60, maxScore: 100},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			score := calculateRiskScore(tc.changeType, tc.files, tc.refs)
			if score < tc.minScore {
				t.Errorf("expected risk_score >= %d, got %d for %s", tc.minScore, score, tc.changeType)
			}
			if score > tc.maxScore {
				t.Errorf("expected risk_score <= %d, got %d for %s", tc.maxScore, score, tc.changeType)
			}
		})
	}
}
