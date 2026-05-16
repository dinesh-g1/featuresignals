package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strconv"
	"strings"
	"testing"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/domain"
)

// ─── Mock Console Store ────────────────────────────────────────────────────

type mockConsoleStore struct {
	flags         map[string]*domain.ConsoleFlag
	advanceErrors map[string]error
	shipErrors    map[string]error
}

func newMockConsoleStore() *mockConsoleStore {
	return &mockConsoleStore{
		flags:         make(map[string]*domain.ConsoleFlag),
		advanceErrors: make(map[string]error),
		shipErrors:    make(map[string]error),
	}
}

func (m *mockConsoleStore) ListFlags(ctx context.Context, orgID string, params domain.ConsoleListParams) ([]domain.ConsoleFlag, int, error) {
	var result []domain.ConsoleFlag
	for _, f := range m.flags {
		if params.Stage != "" && f.Stage != params.Stage {
			continue
		}
		if params.Search != "" && !strings.Contains(strings.ToLower(f.Name), strings.ToLower(params.Search)) {
			continue
		}
		result = append(result, *f)
	}
	total := len(result)
	// Apply pagination.
	if params.Offset >= total {
		return []domain.ConsoleFlag{}, total, nil
	}
	end := params.Offset + params.Limit
	if end > total {
		end = total
	}
	return result[params.Offset:end], total, nil
}

func (m *mockConsoleStore) GetFlag(ctx context.Context, orgID, key string) (*domain.ConsoleFlag, error) {
	f, ok := m.flags[key]
	if !ok {
		return nil, domain.WrapNotFound("flag")
	}
	return f, nil
}

func (m *mockConsoleStore) GetInsights(ctx context.Context, orgID string) (*domain.ConsoleInsights, error) {
	return &domain.ConsoleInsights{
		ImpactReports:  []domain.ImpactReport{},
		OrgLearnings:   []domain.OrgLearning{},
		RecentActivity: []domain.ActivityEntry{},
	}, nil
}

func (m *mockConsoleStore) GetIntegrations(ctx context.Context, orgID string) (*domain.ConsoleIntegrations, error) {
	return &domain.ConsoleIntegrations{
		Repositories: []domain.RepoStatus{},
		SDKs:         []domain.SdkStatus{},
		Agents:       []domain.ConsoleAgentStatus{},
		APIKeys:      []domain.ConsoleApiKeyStatus{},
	}, nil
}

func (m *mockConsoleStore) GetHelpContext(ctx context.Context, orgID, userID string) (*domain.HelpContext, error) {
	return &domain.HelpContext{
		OrgID:         orgID,
		OrgName:       "Test Org",
		UserName:      "test-user",
		UserRole:      "admin",
		Plan:          "pro",
		RecentActions: []domain.ActivityEntry{},
	}, nil
}

func (m *mockConsoleStore) AdvanceStage(ctx context.Context, orgID, key, environment string) (*domain.AdvanceResult, error) {
	if err, ok := m.advanceErrors[key]; ok {
		return nil, err
	}
	f, ok := m.flags[key]
	if !ok {
		return nil, domain.WrapNotFound("flag")
	}
	next := domain.NextStage(f.Stage)
	if next == "" {
		return nil, domain.NewValidationError("stage", "already at final stage")
	}
	f.Stage = next
	return &domain.AdvanceResult{Flag: *f, NewStage: next}, nil
}

func (m *mockConsoleStore) Ship(ctx context.Context, orgID, key string, params domain.ShipParams) (*domain.ShipResult, error) {
	if err, ok := m.shipErrors[key]; ok {
		return nil, err
	}
	f, ok := m.flags[key]
	if !ok {
		return nil, domain.WrapNotFound("flag")
	}
	f.RolloutPercent = params.TargetPercent
	f.Stage = "ship"
	return &domain.ShipResult{
		Flag:        *f,
		LiveEvalURL: "/v1/client/" + params.Environment + "/flags",
	}, nil
}

func (m *mockConsoleStore) ToggleFlag(ctx context.Context, orgID, key, action string) (*domain.ConsoleFlag, error) {
	f, ok := m.flags[key]
	if !ok {
		return nil, domain.WrapNotFound("flag")
	}
	switch action {
	case "pause":
		f.Status = string(domain.StatusPaused)
	case "resume":
		f.Status = string(domain.StatusActive)
	default:
		return nil, domain.NewValidationError("action", "must be 'pause' or 'resume'")
	}
	return f, nil
}

func (m *mockConsoleStore) ArchiveFlag(ctx context.Context, orgID, key string) (*domain.ConsoleFlag, error) {
	f, ok := m.flags[key]
	if !ok {
		return nil, domain.WrapNotFound("flag")
	}
	f.Status = string(domain.StatusArchived)
	return f, nil
}

// ─── Test helpers ──────────────────────────────────────────────────────────

func makeConsoleFlag(key, name, stage string) *domain.ConsoleFlag {
	return &domain.ConsoleFlag{
		Key:   key,
		Name:  name,
		Stage: stage,
		Status: "active",
		Type:  "boolean",
		DependsOn:    []string{},
		DependedOnBy: []string{},
	}
}

// ─── Tests ─────────────────────────────────────────────────────────────────

func TestConsoleHandler_ListFlags_HappyPath(t *testing.T) {
	store := newMockConsoleStore()
	store.flags["dark-mode"] = makeConsoleFlag("dark-mode", "Dark Mode", "plan")
	store.flags["new-checkout"] = makeConsoleFlag("new-checkout", "New Checkout", "implement")

	h := NewConsoleHandler(store, nil, nil, nil)
	r := httptest.NewRequest("GET", "/v1/console/flags?limit=50&offset=0", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.ListFlags(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ConsoleFlagListResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Total != 2 {
		t.Errorf("expected total 2, got %d", resp.Total)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 flags, got %d", len(resp.Data))
	}
}

func TestConsoleHandler_ListFlags_Empty(t *testing.T) {
	store := newMockConsoleStore()
	h := NewConsoleHandler(store, nil, nil, nil)
	r := httptest.NewRequest("GET", "/v1/console/flags", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.ListFlags(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ConsoleFlagListResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Total != 0 {
		t.Errorf("expected total 0, got %d", resp.Total)
	}
	if len(resp.Data) != 0 {
		t.Errorf("expected empty data, got %d items", len(resp.Data))
	}
}

func TestConsoleHandler_ListFlags_Pagination(t *testing.T) {
	store := newMockConsoleStore()
	for i := 0; i < 10; i++ {
		key := fmt.Sprintf("flag-%d", i)
		store.flags[key] = makeConsoleFlag(key, "Flag "+strconv.Itoa(i), "plan")
	}

	h := NewConsoleHandler(store, nil, nil, nil)
	r := httptest.NewRequest("GET", "/v1/console/flags?limit=3&offset=0", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.ListFlags(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ConsoleFlagListResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Total != 10 {
		t.Errorf("expected total 10, got %d", resp.Total)
	}
	if len(resp.Data) != 3 {
		t.Errorf("expected 3 items on page, got %d", len(resp.Data))
	}
	if !resp.HasMore {
		t.Error("expected HasMore to be true")
	}
	if resp.Limit != 3 {
		t.Errorf("expected limit 3, got %d", resp.Limit)
	}
}

func TestConsoleHandler_GetFlag_Found(t *testing.T) {
	store := newMockConsoleStore()
	store.flags["dark-mode"] = makeConsoleFlag("dark-mode", "Dark Mode", "plan")

	h := NewConsoleHandler(store, nil, nil, nil)
	r := httptest.NewRequest("GET", "/v1/console/flags/dark-mode", nil)
	r = requestWithChi(r, map[string]string{"key": "dark-mode"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.GetFlag(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ConsoleFlagResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Key != "dark-mode" {
		t.Errorf("expected key 'dark-mode', got '%s'", resp.Key)
	}
	if resp.Name != "Dark Mode" {
		t.Errorf("expected name 'Dark Mode', got '%s'", resp.Name)
	}
}

func TestConsoleHandler_GetFlag_NotFound(t *testing.T) {
	store := newMockConsoleStore()
	h := NewConsoleHandler(store, nil, nil, nil)
	r := httptest.NewRequest("GET", "/v1/console/flags/nonexistent", nil)
	r = requestWithChi(r, map[string]string{"key": "nonexistent"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.GetFlag(w, r)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestConsoleHandler_AdvanceStage_Valid(t *testing.T) {
	store := newMockConsoleStore()
	store.flags["dark-mode"] = makeConsoleFlag("dark-mode", "Dark Mode", "plan")

	h := NewConsoleHandler(store, nil, nil, nil)
	body := `{"environment":"env-dev"}`
	r := httptest.NewRequest("POST", "/v1/console/flags/dark-mode/advance", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"key": "dark-mode"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.AdvanceStage(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var result domain.AdvanceResult
	json.Unmarshal(w.Body.Bytes(), &result)

	if result.NewStage != "spec" {
		t.Errorf("expected new stage 'spec', got '%s'", result.NewStage)
	}
}

func TestConsoleHandler_AdvanceStage_InvalidStage(t *testing.T) {
	store := newMockConsoleStore()
	store.flags["learned-flag"] = makeConsoleFlag("learned-flag", "Learned Flag", "learn")
	store.advanceErrors["learned-flag"] = domain.NewValidationError("stage", "already at final stage")

	h := NewConsoleHandler(store, nil, nil, nil)
	body := `{"environment":"env-dev"}`
	r := httptest.NewRequest("POST", "/v1/console/flags/learned-flag/advance", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"key": "learned-flag"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.AdvanceStage(w, r)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %s", w.Code, w.Body.String())
	}
}

func TestConsoleHandler_AdvanceStage_NotFound(t *testing.T) {
	store := newMockConsoleStore()
	h := NewConsoleHandler(store, nil, nil, nil)
	body := `{"environment":"env-dev"}`
	r := httptest.NewRequest("POST", "/v1/console/flags/nonexistent/advance", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"key": "nonexistent"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.AdvanceStage(w, r)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestConsoleHandler_Ship_Valid(t *testing.T) {
	store := newMockConsoleStore()
	store.flags["dark-mode"] = makeConsoleFlag("dark-mode", "Dark Mode", "approve")

	h := NewConsoleHandler(store, nil, nil, nil)
	body := `{"target_percent":50,"guard_metrics":["latency","error_rate"],"environment":"env-prod"}`
	r := httptest.NewRequest("POST", "/v1/console/flags/dark-mode/ship", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"key": "dark-mode"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Ship(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var result domain.ShipResult
	json.Unmarshal(w.Body.Bytes(), &result)

	if result.Flag.RolloutPercent != 50 {
		t.Errorf("expected rollout 50%%, got %d", result.Flag.RolloutPercent)
	}
	if result.Flag.Stage != "ship" {
		t.Errorf("expected stage 'ship', got '%s'", result.Flag.Stage)
	}
}

func TestConsoleHandler_Ship_InvalidPercent(t *testing.T) {
	store := newMockConsoleStore()
	store.flags["dark-mode"] = makeConsoleFlag("dark-mode", "Dark Mode", "approve")

	h := NewConsoleHandler(store, nil, nil, nil)
	body := `{"target_percent":150,"guard_metrics":[],"environment":"env-prod"}`
	r := httptest.NewRequest("POST", "/v1/console/flags/dark-mode/ship", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"key": "dark-mode"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Ship(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestConsoleHandler_GetInsights(t *testing.T) {
	store := newMockConsoleStore()
	h := NewConsoleHandler(store, nil, nil, nil)
	r := httptest.NewRequest("GET", "/v1/console/insights", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.GetInsights(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestConsoleHandler_GetIntegrations(t *testing.T) {
	store := newMockConsoleStore()
	h := NewConsoleHandler(store, nil, nil, nil)
	r := httptest.NewRequest("GET", "/v1/console/integrations", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.GetIntegrations(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestConsoleHandler_GetHelpContext(t *testing.T) {
	store := newMockConsoleStore()
	h := NewConsoleHandler(store, nil, nil, nil)
	r := httptest.NewRequest("GET", "/v1/console/help/context", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.GetHelpContext(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.HelpContextResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.OrgName != "Test Org" {
		t.Errorf("expected org name 'Test Org', got '%s'", resp.OrgName)
	}
	if resp.UserRole != "admin" {
		t.Errorf("expected role 'admin', got '%s'", resp.UserRole)
	}
}

// ─── Table-driven tests ────────────────────────────────────────────────────

func TestConsoleHandler_GetFlag_TableDriven(t *testing.T) {
	store := newMockConsoleStore()
	store.flags["dark-mode"] = makeConsoleFlag("dark-mode", "Dark Mode", "plan")

	h := NewConsoleHandler(store, nil, nil, nil)

	tests := []struct {
		name       string
		key        string
		wantStatus int
	}{
		{name: "found", key: "dark-mode", wantStatus: http.StatusOK},
		{name: "not found", key: "nonexistent", wantStatus: http.StatusNotFound},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest("GET", "/v1/console/flags/"+tc.key, nil)
			r = requestWithChi(r, map[string]string{"key": tc.key})
			r = requestWithAuth(r, "user-1", testOrgID, "admin")
			w := httptest.NewRecorder()

			h.GetFlag(w, r)

			if w.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d", tc.wantStatus, w.Code)
			}
		})
	}
}

func TestConsoleHandler_AdvanceStage_TableDriven(t *testing.T) {
	store := newMockConsoleStore()
	store.flags["plan-flag"] = makeConsoleFlag("plan-flag", "Plan Flag", "plan")
	store.flags["learn-flag"] = makeConsoleFlag("learn-flag", "Learn Flag", "learn")
	store.advanceErrors["learn-flag"] = domain.NewValidationError("stage", "already at final stage")

	h := NewConsoleHandler(store, nil, nil, nil)

	tests := []struct {
		name       string
		key        string
		body       string
		wantStatus int
	}{
		{name: "valid advance", key: "plan-flag", body: `{"environment":"env-dev"}`, wantStatus: http.StatusOK},
		{name: "final stage", key: "learn-flag", body: `{"environment":"env-dev"}`, wantStatus: http.StatusUnprocessableEntity},
		{name: "missing env", key: "plan-flag", body: `{}`, wantStatus: http.StatusBadRequest},
		{name: "not found", key: "no-such-flag", body: `{"environment":"env-dev"}`, wantStatus: http.StatusNotFound},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/v1/console/flags/"+tc.key+"/advance", strings.NewReader(tc.body))
			r = requestWithChi(r, map[string]string{"key": tc.key})
			r = requestWithAuth(r, "user-1", testOrgID, "admin")
			w := httptest.NewRecorder()

			h.AdvanceStage(w, r)

			if w.Code != tc.wantStatus {
				t.Errorf("expected status %d, got %d: %s", tc.wantStatus, w.Code, w.Body.String())
			}
		})
	}
}
