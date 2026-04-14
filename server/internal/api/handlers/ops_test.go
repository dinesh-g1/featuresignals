package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/go-chi/chi/v5"
)

// ─── Test Helpers ─────────────────────────────────────────────────────

type opsMockStore struct {
	envs      map[string]*domain.CustomerEnvironment
	licenses  map[string]*domain.License
	opsUsers  map[string]*domain.OpsUser
	sandboxes map[string]*domain.SandboxEnvironment
	orgs      map[string]*domain.Organization
	users     map[string]*domain.User
	costs     []domain.OrgCostDaily
	auditLogs []domain.OpsAuditLog
}

func newOpsMockStore() *opsMockStore {
	return &opsMockStore{
		envs:      make(map[string]*domain.CustomerEnvironment),
		licenses:  make(map[string]*domain.License),
		opsUsers:  make(map[string]*domain.OpsUser),
		sandboxes: make(map[string]*domain.SandboxEnvironment),
		orgs:      make(map[string]*domain.Organization),
		users:     make(map[string]*domain.User),
	}
}

func (m *opsMockStore) ListCustomerEnvironments(_ context.Context, status, deploymentModel, region, search string, limit, offset int) ([]domain.CustomerEnvironment, int, error) {
	var result []domain.CustomerEnvironment
	for _, e := range m.envs {
		if status != "" && e.Status != status {
			continue
		}
		if deploymentModel != "" && e.DeploymentModel != deploymentModel {
			continue
		}
		result = append(result, *e)
	}
	if offset >= len(result) {
		return nil, len(result), nil
	}
	end := offset + limit
	if end > len(result) {
		end = len(result)
	}
	return result[offset:end], len(result), nil
}

func (m *opsMockStore) GetCustomerEnvironment(_ context.Context, id string) (*domain.CustomerEnvironment, error) {
	if e, ok := m.envs[id]; ok {
		return e, nil
	}
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) GetCustomerEnvironmentByVPSID(_ context.Context, vpsID string) (*domain.CustomerEnvironment, error) {
	for _, e := range m.envs {
		if e.VPSID == vpsID {
			return e, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) CreateCustomerEnvironment(_ context.Context, env *domain.CustomerEnvironment) error {
	m.envs[env.ID] = env
	return nil
}

func (m *opsMockStore) UpdateCustomerEnvironment(_ context.Context, id string, updates map[string]any) error {
	if e, ok := m.envs[id]; ok {
		for k, v := range updates {
			switch k {
			case "status":
				e.Status = v.(string)
			case "maintenance_mode":
				e.MaintenanceMode = v.(bool)
			case "maintenance_reason":
				e.MaintenanceReason = v.(string)
			case "debug_mode":
				e.DebugMode = v.(bool)
			}
		}
		return nil
	}
	return domain.ErrNotFound
}

func (m *opsMockStore) DeleteCustomerEnvironment(_ context.Context, id string) error {
	delete(m.envs, id)
	return nil
}

func (m *opsMockStore) ListLicenses(_ context.Context, plan, deploymentModel, search string) ([]domain.License, int, error) {
	var result []domain.License
	for _, l := range m.licenses {
		if plan != "" && l.Plan != plan {
			continue
		}
		result = append(result, *l)
	}
	return result, len(result), nil
}

func (m *opsMockStore) GetLicense(_ context.Context, id string) (*domain.License, error) {
	if l, ok := m.licenses[id]; ok {
		return l, nil
	}
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) GetLicenseByOrg(_ context.Context, orgID string) (*domain.License, error) {
	for _, l := range m.licenses {
		if l.OrgID == orgID && l.RevokedAt == nil {
			return l, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) CreateLicense(_ context.Context, lic *domain.License) error {
	m.licenses[lic.ID] = lic
	return nil
}

func (m *opsMockStore) UpdateLicense(_ context.Context, id string, updates map[string]any) error {
	if l, ok := m.licenses[id]; ok {
		for k, v := range updates {
			switch k {
			case "revoked_at":
				l.RevokedAt = v.(*time.Time)
			case "max_seats":
				l.MaxSeats = v.(int)
			}
		}
		return nil
	}
	return domain.ErrNotFound
}

func (m *opsMockStore) RevokeLicense(_ context.Context, id, reason string) error {
	if l, ok := m.licenses[id]; ok {
		now := time.Now()
		l.RevokedAt = &now
		l.RevokedReason = reason
		return nil
	}
	return domain.ErrNotFound
}

func (m *opsMockStore) OverrideLicenseQuota(_ context.Context, id string, updates map[string]any) error {
	return m.UpdateLicense(context.Background(), id, updates)
}

func (m *opsMockStore) ResetLicenseUsage(_ context.Context, id string) error {
	if _, ok := m.licenses[id]; ok {
		return nil
	}
	return domain.ErrNotFound
}

func (m *opsMockStore) ListOpsUsers(_ context.Context) ([]domain.OpsUser, error) {
	var result []domain.OpsUser
	for _, u := range m.opsUsers {
		if u.IsActive {
			result = append(result, *u)
		}
	}
	return result, nil
}

func (m *opsMockStore) GetOpsUser(_ context.Context, id string) (*domain.OpsUser, error) {
	if u, ok := m.opsUsers[id]; ok {
		return u, nil
	}
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) GetOpsUserByUserID(_ context.Context, userID string) (*domain.OpsUser, error) {
	for _, u := range m.opsUsers {
		if u.UserID == userID {
			return u, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) CreateOpsUser(_ context.Context, u *domain.OpsUser) error {
	m.opsUsers[u.ID] = u
	return nil
}

func (m *opsMockStore) UpdateOpsUser(_ context.Context, id string, updates map[string]any) error {
	if u, ok := m.opsUsers[id]; ok {
		for k, v := range updates {
			switch k {
			case "is_active":
				u.IsActive = v.(bool)
			case "ops_role":
				u.OpsRole = v.(string)
			}
		}
		return nil
	}
	return domain.ErrNotFound
}

func (m *opsMockStore) DeleteOpsUser(_ context.Context, id string) error {
	delete(m.opsUsers, id)
	return nil
}

func (m *opsMockStore) ListSandboxes(_ context.Context, status, ownerID string) ([]domain.SandboxEnvironment, int, error) {
	var result []domain.SandboxEnvironment
	for _, s := range m.sandboxes {
		if status != "" && s.Status != status {
			continue
		}
		if ownerID != "" && s.OwnerUserID != ownerID {
			continue
		}
		result = append(result, *s)
	}
	return result, len(result), nil
}

func (m *opsMockStore) CreateSandbox(_ context.Context, s *domain.SandboxEnvironment) error {
	m.sandboxes[s.ID] = s
	return nil
}

func (m *opsMockStore) RenewSandbox(_ context.Context, id string) (*domain.SandboxEnvironment, error) {
	if s, ok := m.sandboxes[id]; ok {
		if s.RenewalCount >= s.MaxRenewals {
			return nil, domain.ErrNotFound
		}
		s.ExpiresAt = s.ExpiresAt.Add(30 * 24 * time.Hour)
		s.RenewalCount++
		return s, nil
	}
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) DecommissionSandbox(_ context.Context, id string) error {
	if s, ok := m.sandboxes[id]; ok {
		s.Status = "decommissioned"
		s.DecommissionedAt = timePtr(time.Now())
		return nil
	}
	return domain.ErrNotFound
}

func (m *opsMockStore) GetExpiringSandboxes(_ context.Context, days int) ([]domain.SandboxEnvironment, error) {
	return nil, nil
}

func (m *opsMockStore) ListOrgCostDaily(_ context.Context, orgID, startDate, endDate string) ([]domain.OrgCostDaily, error) {
	return m.costs, nil
}

func (m *opsMockStore) ListOrgCostMonthly(_ context.Context, month string) ([]domain.OrgCostMonthlySummary, error) {
	return nil, nil
}

func (m *opsMockStore) GetFinancialSummary(_ context.Context) (*domain.FinancialSummary, error) {
	return &domain.FinancialSummary{
		TotalMRR:       500000,
		TotalCost:      50000,
		TotalMargin:    90,
		MarginByTier:   map[string]*domain.TierFinancials{},
		TopCustomers:   []domain.CustomerSummary{},
		NegativeMargin: []domain.CustomerSummary{},
	}, nil
}

func (m *opsMockStore) ListOpsAuditLogs(_ context.Context, action, targetType, userID, startDate, endDate string, limit, offset int) ([]domain.OpsAuditLog, int, error) {
	return m.auditLogs, len(m.auditLogs), nil
}

func (m *opsMockStore) CreateOpsAuditLog(_ context.Context, log *domain.OpsAuditLog) error {
	m.auditLogs = append(m.auditLogs, *log)
	return nil
}

func (m *opsMockStore) ListCustomers(_ context.Context, plan, deploymentModel, search string) ([]domain.CustomerSummary, int, error) {
	return nil, 0, nil
}

func (m *opsMockStore) GetCustomerDetail(_ context.Context, orgID string) (*domain.CustomerDetail, error) {
	if org, ok := m.orgs[orgID]; ok {
		return &domain.CustomerDetail{Org: *org}, nil
	}
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) GetOrganization(_ context.Context, id string) (*domain.Organization, error) {
	if org, ok := m.orgs[id]; ok {
		return org, nil
	}
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) GetOrganizationByIDPrefix(_ context.Context, prefix string) (*domain.Organization, error) {
	for _, org := range m.orgs {
		if org.ID == prefix || org.Slug == prefix {
			return org, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) GetUserByID(_ context.Context, id string) (*domain.User, error) {
	if u, ok := m.users[id]; ok {
		return u, nil
	}
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) GetUserByEmail(_ context.Context, email string) (*domain.User, error) {
	for _, u := range m.users {
		if u.Email == email {
			return u, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) GetUserByEmailVerifyToken(_ context.Context, token string) (*domain.User, error) {
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) UpdateUserEmailVerifyToken(_ context.Context, userID, tokenHash string, expires time.Time, orgID, ip string) error {
	return nil
}

func (m *opsMockStore) SetEmailVerified(_ context.Context, userID string) error {
	return nil
}

func (m *opsMockStore) UpdateUserPassword(_ context.Context, userID, hash string) error {
	return nil
}

func (m *opsMockStore) ListOrgMembers(_ context.Context, orgID string) ([]domain.OrgMember, error) {
	return nil, nil
}

func (m *opsMockStore) AddOrgMember(_ context.Context, member *domain.OrgMember) error {
	return nil
}

func (m *opsMockStore) GetOrgMember(_ context.Context, orgID, userID string) (*domain.OrgMember, error) {
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) GetOrgMemberByID(_ context.Context, id string) (*domain.OrgMember, error) {
	return nil, domain.ErrNotFound
}

func (m *opsMockStore) UpdateOrgMemberRole(_ context.Context, memberID string, role domain.Role) error {
	return nil
}

func (m *opsMockStore) RemoveOrgMember(_ context.Context, memberID string) error {
	return nil
}

func (m *opsMockStore) ListEnvPermissions(_ context.Context, memberID string) ([]domain.EnvPermission, error) {
	return nil, nil
}

func (m *opsMockStore) UpsertEnvPermission(_ context.Context, p *domain.EnvPermission) error {
	return nil
}

func (m *opsMockStore) DeleteEnvPermission(_ context.Context, id string) error {
	return nil
}

func timePtr(t time.Time) *time.Time { return &t }

// ─── Tests ────────────────────────────────────────────────────────────

func TestOpsHandler_ListEnvironments(t *testing.T) {
	store := newOpsMockStore()
	store.envs["env-1"] = &domain.CustomerEnvironment{
		ID: "env-1", OrgID: "org-1", DeploymentModel: "isolated",
		Status: "active", Subdomain: "acme.featuresignals.com",
	}
	handler := NewOpsHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/ops/environments", nil)
	w := httptest.NewRecorder()
	handler.ListEnvironments(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Environments []domain.CustomerEnvironment `json:"environments"`
		Total        int                          `json:"total"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Total != 1 {
		t.Errorf("expected total 1, got %d", resp.Total)
	}
	if len(resp.Environments) != 1 {
		t.Errorf("expected 1 environment, got %d", len(resp.Environments))
	}
}

func TestOpsHandler_GetEnvironment_NotFound(t *testing.T) {
	store := newOpsMockStore()
	handler := NewOpsHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/ops/environments/nonexistent", nil)
	w := httptest.NewRecorder()

	// Simulate chi URL param
	ctx := setChiRouteParam(req.Context(), "id", "nonexistent")
	handler.GetEnvironment(w, req.WithContext(ctx))

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}

func TestOpsHandler_ProvisionEnvironment_Validation(t *testing.T) {
	store := newOpsMockStore()
	handler := NewOpsHandler(store)

	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "empty body",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing org_id",
			body:       `{"customer_name":"test"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing customer_name",
			body:       `{"org_id":"org-1"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid request",
			body:       `{"customer_name":"acme","org_id":"org-1","vps_type":"cx32","region":"fsn1","plan":"enterprise"}`,
			wantStatus: http.StatusAccepted,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/ops/environments/provision", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.ProvisionEnvironment(w, req)

			if w.Code != tc.wantStatus {
				t.Errorf("expected %d, got %d: %s", tc.wantStatus, w.Code, w.Body.String())
			}
		})
	}
}

func TestOpsHandler_ToggleMaintenance(t *testing.T) {
	store := newOpsMockStore()
	store.envs["env-1"] = &domain.CustomerEnvironment{
		ID: "env-1", OrgID: "org-1", Status: "active",
	}
	handler := NewOpsHandler(store)

	body := `{"enabled": true, "reason": "Database migration"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/ops/environments/env-1/maintenance", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := setChiRouteParam(req.Context(), "id", "env-1")
	w := httptest.NewRecorder()
	handler.ToggleMaintenance(w, req.WithContext(ctx))

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var env domain.CustomerEnvironment
	if err := json.Unmarshal(w.Body.Bytes(), &env); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if !env.MaintenanceMode {
		t.Error("expected maintenance mode to be enabled")
	}
}

func TestOpsHandler_CreateLicense_Validation(t *testing.T) {
	store := newOpsMockStore()
	store.orgs["org-1"] = &domain.Organization{ID: "org-1", Name: "Test Org"}
	handler := NewOpsHandler(store)

	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "missing required fields",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing plan",
			body:       `{"org_id":"org-1","customer_name":"Test"}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "valid request",
			body:       `{"org_id":"org-1","customer_name":"Test","plan":"enterprise"}`,
			wantStatus: http.StatusCreated,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/ops/licenses", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateLicense(w, req)

			if w.Code != tc.wantStatus {
				t.Errorf("expected %d, got %d: %s", tc.wantStatus, w.Code, w.Body.String())
			}
		})
	}
}

func TestOpsHandler_RevokeLicense(t *testing.T) {
	store := newOpsMockStore()
	store.licenses["lic-1"] = &domain.License{
		ID: "lic-1", OrgID: "org-1", CustomerName: "Test",
	}
	handler := NewOpsHandler(store)

	body := `{"reason": "Contract ended"}`
	req := httptest.NewRequest(http.MethodPost, "/api/v1/ops/licenses/lic-1/revoke", bytes.NewBufferString(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := setChiRouteParam(req.Context(), "id", "lic-1")
	w := httptest.NewRecorder()
	handler.RevokeLicense(w, req.WithContext(ctx))

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]any
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp["success"] != true {
		t.Error("expected success=true")
	}
}

func TestOpsHandler_GetFinancialSummary(t *testing.T) {
	store := newOpsMockStore()
	handler := NewOpsHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/ops/financial/summary", nil)
	w := httptest.NewRecorder()
	handler.GetFinancialSummary(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var summary domain.FinancialSummary
	if err := json.Unmarshal(w.Body.Bytes(), &summary); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if summary.TotalMRR != 500000 {
		t.Errorf("expected MRR 500000, got %d", summary.TotalMRR)
	}
	if summary.TotalMargin != 90 {
		t.Errorf("expected margin 90, got %.0f", summary.TotalMargin)
	}
}

func TestOpsHandler_CreateSandbox_Validation(t *testing.T) {
	store := newOpsMockStore()
	store.users["user-1"] = &domain.User{
		ID: "user-1", Email: "test@featuresignals.com", Name: "Test User",
	}
	store.opsUsers["ops-1"] = &domain.OpsUser{
		ID: "ops-1", UserID: "user-1", OpsRole: "engineer",
		IsActive: true, MaxSandboxEnvs: 2,
	}
	handler := NewOpsHandler(store)

	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "empty body",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "missing purpose",
			body:       `{}`,
			wantStatus: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/api/v1/ops/sandboxes", bytes.NewBufferString(tc.body))
			req.Header.Set("Content-Type", "application/json")
			w := httptest.NewRecorder()
			handler.CreateSandbox(w, req)

			// Should be 400 for empty body (no purpose)
			if w.Code != http.StatusBadRequest {
				t.Errorf("expected %d, got %d: %s", http.StatusBadRequest, w.Code, w.Body.String())
			}
		})
	}
}

func TestOpsHandler_ListOpsAuditLogs(t *testing.T) {
	store := newOpsMockStore()
	store.auditLogs = []domain.OpsAuditLog{
		{ID: "1", OpsUserID: "user-1", Action: "provision_env", TargetType: "environment", CreatedAt: time.Now()},
		{ID: "2", OpsUserID: "user-1", Action: "toggle_maintenance", TargetType: "environment", CreatedAt: time.Now()},
	}
	handler := NewOpsHandler(store)

	req := httptest.NewRequest(http.MethodGet, "/api/v1/ops/audit", nil)
	w := httptest.NewRecorder()
	handler.ListOpsAuditLogs(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp struct {
		Logs  []domain.OpsAuditLog `json:"logs"`
		Total int                  `json:"total"`
	}
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp.Total != 2 {
		t.Errorf("expected 2 audit logs, got %d", resp.Total)
	}
}

// setChiRouteParam sets a chi URL parameter in the context for testing.
func setChiRouteParam(ctx context.Context, key, value string) context.Context {
	rctx := &chi.Context{
		URLParams: chi.RouteParams{
			Keys:   []string{key},
			Values: []string{value},
		},
	}
	return context.WithValue(ctx, chi.RouteCtxKey, rctx)
}
