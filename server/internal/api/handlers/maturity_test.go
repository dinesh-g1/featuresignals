package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/domain"
)

// ─── Mock Maturity Store ───────────────────────────────────────────────────

type mockMaturityStore struct {
	config    *domain.MaturityConfig
	setLevel  func(ctx context.Context, orgID string, level domain.ConsoleMaturityLevel, updatedBy string) (*domain.MaturityConfig, error)
	getConfig func(ctx context.Context, orgID string) (*domain.MaturityConfig, error)
}

func (m *mockMaturityStore) GetConfig(ctx context.Context, orgID string) (*domain.MaturityConfig, error) {
	if m.getConfig != nil {
		return m.getConfig(ctx, orgID)
	}
	if m.config != nil {
		return m.config, nil
	}
	cfg := domain.DefaultConfig(domain.MaturitySolo)
	return &cfg, nil
}

func (m *mockMaturityStore) SetLevel(ctx context.Context, orgID string, level domain.ConsoleMaturityLevel, updatedBy string) (*domain.MaturityConfig, error) {
	if m.setLevel != nil {
		return m.setLevel(ctx, orgID, level, updatedBy)
	}
	cfg := domain.DefaultConfig(level)
	return &cfg, nil
}

// ─── Helpers ───────────────────────────────────────────────────────────────

func newMaturityTestHandler(store *mockMaturityStore) *MaturityHandler {
	return NewMaturityHandler(store, testLogger())
}

func doMaturityRequest(h *MaturityHandler, method, path, body string) *httptest.ResponseRecorder {
	var req *http.Request
	if body != "" {
		req = httptest.NewRequest(method, path, strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
	} else {
		req = httptest.NewRequest(method, path, nil)
	}
	req = requestWithAuth(req, "user_test_1", testOrgID, "admin")

	w := httptest.NewRecorder()
	if strings.HasPrefix(path, "/v1/console/maturity") && method == http.MethodGet {
		h.GetConfig(w, req)
	} else if strings.HasPrefix(path, "/v1/console/maturity") && method == http.MethodPut {
		h.SetLevel(w, req)
	}
	return w
}

// ─── GetConfig Tests ───────────────────────────────────────────────────────

func TestMaturityHandler_GetConfig_ReturnsLevel(t *testing.T) {
	cfg := domain.DefaultConfig(domain.MaturityTeam)
	store := &mockMaturityStore{config: &cfg}
	h := newMaturityTestHandler(store)

	w := doMaturityRequest(h, http.MethodGet, "/v1/console/maturity", "")

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.MaturityConfigResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Level != 2 {
		t.Errorf("expected level 2 (Team), got %d", resp.Level)
	}
	if resp.EnableApprovals != true {
		t.Error("expected EnableApprovals to be true for Team level")
	}
	if len(resp.VisibleStages) != 13 {
		t.Errorf("expected 13 visible stages for Team level, got %d", len(resp.VisibleStages))
	}
}

func TestMaturityHandler_GetConfig_DefaultsToSolo(t *testing.T) {
	store := &mockMaturityStore{} // no config set — defaults to L1
	h := newMaturityTestHandler(store)

	w := doMaturityRequest(h, http.MethodGet, "/v1/console/maturity", "")

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.MaturityConfigResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Level != 1 {
		t.Errorf("expected default level 1 (Solo), got %d", resp.Level)
	}
	if len(resp.VisibleStages) != 4 {
		t.Errorf("expected 4 visible stages for Solo, got %d", len(resp.VisibleStages))
	}
	if resp.AutoAdvance != true {
		t.Error("expected AutoAdvance to be true for Solo level")
	}
}

func TestMaturityHandler_GetConfig_EnterpriseLevel(t *testing.T) {
	cfg := domain.DefaultConfig(domain.MaturityEnterprise)
	store := &mockMaturityStore{config: &cfg}
	h := newMaturityTestHandler(store)

	w := doMaturityRequest(h, http.MethodGet, "/v1/console/maturity", "")

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.MaturityConfigResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Level != 4 {
		t.Errorf("expected level 4 (Enterprise), got %d", resp.Level)
	}
	if resp.RequireDualControl != true {
		t.Error("expected RequireDualControl to be true for Enterprise")
	}
	if resp.EnableCompliance != true {
		t.Error("expected EnableCompliance to be true for Enterprise")
	}
}

// ─── SetLevel Tests ────────────────────────────────────────────────────────

func TestMaturityHandler_SetLevel_ValidLevel(t *testing.T) {
	store := &mockMaturityStore{}
	h := newMaturityTestHandler(store)

	w := doMaturityRequest(h, http.MethodPut, "/v1/console/maturity", `{"level": 3}`)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.MaturityConfigResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp.Level != 3 {
		t.Errorf("expected level 3 (Growing), got %d", resp.Level)
	}
	if resp.EnableWorkflows != true {
		t.Error("expected EnableWorkflows to be true for Growing")
	}
}

func TestMaturityHandler_SetLevel_TooLow(t *testing.T) {
	store := &mockMaturityStore{}
	h := newMaturityTestHandler(store)

	w := doMaturityRequest(h, http.MethodPut, "/v1/console/maturity", `{"level": 0}`)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %s", w.Code, w.Body.String())
	}
}

func TestMaturityHandler_SetLevel_TooHigh(t *testing.T) {
	store := &mockMaturityStore{}
	h := newMaturityTestHandler(store)

	w := doMaturityRequest(h, http.MethodPut, "/v1/console/maturity", `{"level": 6}`)

	if w.Code != http.StatusUnprocessableEntity {
		t.Fatalf("expected 422, got %d: %s", w.Code, w.Body.String())
	}
}

func TestMaturityHandler_SetLevel_InvalidJSON(t *testing.T) {
	store := &mockMaturityStore{}
	h := newMaturityTestHandler(store)

	w := doMaturityRequest(h, http.MethodPut, "/v1/console/maturity", `{broken`)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestMaturityHandler_SetLevel_NotFound(t *testing.T) {
	store := &mockMaturityStore{
		setLevel: func(ctx context.Context, orgID string, level domain.ConsoleMaturityLevel, updatedBy string) (*domain.MaturityConfig, error) {
			return nil, domain.WrapNotFound("organisation")
		},
	}
	h := newMaturityTestHandler(store)

	w := doMaturityRequest(h, http.MethodPut, "/v1/console/maturity", `{"level": 3}`)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

// ─── Domain: DefaultConfig ─────────────────────────────────────────────────

func TestDefaultConfig_Solo(t *testing.T) {
	cfg := domain.DefaultConfig(domain.MaturitySolo)
	if cfg.Level != domain.MaturitySolo {
		t.Errorf("expected Solo level")
	}
	if len(cfg.VisibleStages) != 4 {
		t.Errorf("Solo should have 4 visible stages, got %d", len(cfg.VisibleStages))
	}
	if !cfg.AutoAdvance {
		t.Error("Solo should have AutoAdvance enabled")
	}
	if cfg.EnableApprovals {
		t.Error("Solo should not have approvals")
	}
	if cfg.EnableCompliance {
		t.Error("Solo should not have compliance")
	}
	if cfg.RetentionDays != 90 {
		t.Errorf("Solo retention should be 90, got %d", cfg.RetentionDays)
	}
}

func TestDefaultConfig_Team(t *testing.T) {
	cfg := domain.DefaultConfig(domain.MaturityTeam)
	if cfg.Level != domain.MaturityTeam {
		t.Errorf("expected Team level")
	}
	if len(cfg.VisibleStages) != 13 {
		t.Errorf("Team should have 13 visible stages, got %d", len(cfg.VisibleStages))
	}
	if !cfg.EnableApprovals {
		t.Error("Team should have approvals enabled")
	}
	if cfg.EnablePolicies {
		t.Error("Team should not have policies")
	}
}

func TestDefaultConfig_Regulated(t *testing.T) {
	cfg := domain.DefaultConfig(domain.MaturityRegulated)
	if cfg.Level != domain.MaturityRegulated {
		t.Errorf("expected Regulated level")
	}
	if cfg.RetentionDays != 2555 {
		t.Errorf("Regulated retention should be 2555, got %d", cfg.RetentionDays)
	}
	if !cfg.RequireDualControl {
		t.Error("Regulated should require dual control")
	}
	if !cfg.EnableCompliance {
		t.Error("Regulated should have compliance enabled")
	}
}

func TestDefaultConfig_AllLevelsNonZero(t *testing.T) {
	for _, lvl := range []domain.ConsoleMaturityLevel{
		domain.MaturitySolo,
		domain.MaturityTeam,
		domain.MaturityGrowing,
		domain.MaturityEnterprise,
		domain.MaturityRegulated,
	} {
		cfg := domain.DefaultConfig(lvl)
		if cfg.Level != lvl {
			t.Errorf("level mismatch for %d", lvl)
		}
		if len(cfg.VisibleStages) == 0 {
			t.Errorf("no visible stages for level %d", lvl)
		}
		if cfg.RetentionDays == 0 {
			t.Errorf("zero retention for level %d", lvl)
		}
	}
}

func TestValidConsoleMaturityLevel(t *testing.T) {
	tests := []struct {
		level int
		valid bool
	}{
		{0, false},
		{1, true},
		{2, true},
		{3, true},
		{4, true},
		{5, true},
		{6, false},
		{-1, false},
		{100, false},
	}
	for _, tc := range tests {
		got := domain.ValidConsoleMaturityLevel(tc.level)
		if got != tc.valid {
			t.Errorf("ValidConsoleMaturityLevel(%d) = %v, want %v", tc.level, got, tc.valid)
		}
	}
}

func TestConsoleMaturityLevel_String(t *testing.T) {
	tests := []struct {
		level domain.ConsoleMaturityLevel
		want  string
	}{
		{domain.MaturitySolo, "Solo"},
		{domain.MaturityTeam, "Team"},
		{domain.MaturityGrowing, "Growing"},
		{domain.MaturityEnterprise, "Enterprise"},
		{domain.MaturityRegulated, "Regulated"},
		{domain.ConsoleMaturityLevel(99), "Unknown"},
	}
	for _, tc := range tests {
		got := tc.level.String()
		if got != tc.want {
			t.Errorf("ConsoleMaturityLevel(%d).String() = %q, want %q", tc.level, got, tc.want)
		}
	}
}
