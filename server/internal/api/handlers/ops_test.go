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
	licenses  map[string]*domain.License
	opsUsers  map[string]*domain.OpsUser
	orgs      map[string]*domain.Organization
	users     map[string]*domain.User
	costs     []domain.OrgCostDaily
	auditLogs []domain.OpsAuditLog
}

func newOpsMockStore() *opsMockStore {
	return &opsMockStore{
		licenses:  make(map[string]*domain.License),
		opsUsers:  make(map[string]*domain.OpsUser),
		orgs:      make(map[string]*domain.Organization),
		users:     make(map[string]*domain.User),
	}
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

func (m *opsMockStore) ListOrgCostDaily(_ context.Context, orgID, startDate, endDate string) ([]domain.OrgCostDaily, error) {
	return m.costs, nil
}

func (m *opsMockStore) ListOpsAuditLogs(_ context.Context, action, targetType, userID, startDate, endDate string, limit, offset int) ([]domain.OpsAuditLog, int, error) {
	return m.auditLogs, len(m.auditLogs), nil
}

func (m *opsMockStore) CreateOpsAuditLog(_ context.Context, log *domain.OpsAuditLog) error {
	m.auditLogs = append(m.auditLogs, *log)
	return nil
}

func (m *opsMockStore) CreateOrganization(_ context.Context, org *domain.Organization) error {
	m.orgs[org.ID] = org
	return nil
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









func TestOpsHandler_CreateLicense_Validation(t *testing.T) {
	store := newOpsMockStore()
	store.orgs["org-1"] = &domain.Organization{ID: "org-1", Name: "Test Org"}
	handler := NewOpsHandler(store, NoopLifecycle())

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
	handler := NewOpsHandler(store, NoopLifecycle())

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





func TestOpsHandler_ListOpsAuditLogs(t *testing.T) {
	store := newOpsMockStore()
	store.auditLogs = []domain.OpsAuditLog{
		{ID: "1", OpsUserID: "user-1", Action: "provision_env", TargetType: "environment", CreatedAt: time.Now()},
		{ID: "2", OpsUserID: "user-1", Action: "toggle_maintenance", TargetType: "environment", CreatedAt: time.Now()},
	}
	handler := NewOpsHandler(store, NoopLifecycle())

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
