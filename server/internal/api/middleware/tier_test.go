package middleware

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// tierMockStore is a minimal domain.Store implementation for tier tests.
// Only the methods the TierEnforce middleware actually calls are implemented.
type tierMockStore struct {
	org      *domain.Organization
	projects []domain.Project
	envs     map[string][]domain.Environment // projectID -> envs
	members  []domain.OrgMember
}

func (s *tierMockStore) GetOrganization(_ context.Context, id string) (*domain.Organization, error) {
	if s.org != nil && s.org.ID == id {
		return s.org, nil
	}
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) ListProjects(_ context.Context, orgID string) ([]domain.Project, error) {
	return s.projects, nil
}
func (s *tierMockStore) ListEnvironments(_ context.Context, projectID string) ([]domain.Environment, error) {
	return s.envs[projectID], nil
}
func (s *tierMockStore) ListOrgMembers(_ context.Context, orgID string) ([]domain.OrgMember, error) {
	return s.members, nil
}

// Stubs for the rest of the interface (not used by TierEnforce).
func (s *tierMockStore) CreateOrganization(context.Context, *domain.Organization) error { return nil }
func (s *tierMockStore) GetOrganizationByIDPrefix(context.Context, string) (*domain.Organization, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) CreateUser(context.Context, *domain.User) error { return nil }
func (s *tierMockStore) GetUserByEmail(context.Context, string) (*domain.User, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) GetUserByID(context.Context, string) (*domain.User, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) GetUserByEmailVerifyToken(context.Context, string) (*domain.User, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) UpdateUserEmailVerifyToken(context.Context, string, string, time.Time) error {
	return nil
}
func (s *tierMockStore) SetEmailVerified(context.Context, string) error                { return nil }
func (s *tierMockStore) AddOrgMember(context.Context, *domain.OrgMember) error         { return nil }
func (s *tierMockStore) GetOrgMember(context.Context, string, string) (*domain.OrgMember, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) GetOrgMemberByID(context.Context, string) (*domain.OrgMember, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) UpdateOrgMemberRole(context.Context, string, domain.Role) error { return nil }
func (s *tierMockStore) RemoveOrgMember(context.Context, string) error                  { return nil }
func (s *tierMockStore) ListEnvPermissions(context.Context, string) ([]domain.EnvPermission, error) {
	return nil, nil
}
func (s *tierMockStore) UpsertEnvPermission(context.Context, *domain.EnvPermission) error { return nil }
func (s *tierMockStore) DeleteEnvPermission(context.Context, string) error                 { return nil }
func (s *tierMockStore) CreateProject(context.Context, *domain.Project) error              { return nil }
func (s *tierMockStore) GetProject(context.Context, string) (*domain.Project, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) DeleteProject(context.Context, string) error                   { return nil }
func (s *tierMockStore) CreateEnvironment(context.Context, *domain.Environment) error  { return nil }
func (s *tierMockStore) GetEnvironment(context.Context, string) (*domain.Environment, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) DeleteEnvironment(context.Context, string) error           { return nil }
func (s *tierMockStore) CreateFlag(context.Context, *domain.Flag) error            { return nil }
func (s *tierMockStore) GetFlag(context.Context, string, string) (*domain.Flag, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) ListFlags(context.Context, string) ([]domain.Flag, error) { return nil, nil }
func (s *tierMockStore) UpdateFlag(context.Context, *domain.Flag) error            { return nil }
func (s *tierMockStore) DeleteFlag(context.Context, string) error                  { return nil }
func (s *tierMockStore) UpsertFlagState(context.Context, *domain.FlagState) error  { return nil }
func (s *tierMockStore) GetFlagState(context.Context, string, string) (*domain.FlagState, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) ListPendingSchedules(context.Context, time.Time) ([]domain.FlagState, error) {
	return nil, nil
}
func (s *tierMockStore) CreateSegment(context.Context, *domain.Segment) error { return nil }
func (s *tierMockStore) ListSegments(context.Context, string) ([]domain.Segment, error) {
	return nil, nil
}
func (s *tierMockStore) GetSegment(context.Context, string, string) (*domain.Segment, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) UpdateSegment(context.Context, *domain.Segment) error  { return nil }
func (s *tierMockStore) DeleteSegment(context.Context, string) error           { return nil }
func (s *tierMockStore) CreateAPIKey(context.Context, *domain.APIKey) error    { return nil }
func (s *tierMockStore) GetAPIKeyByID(context.Context, string) (*domain.APIKey, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) GetAPIKeyByHash(context.Context, string) (*domain.APIKey, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) ListAPIKeys(context.Context, string) ([]domain.APIKey, error) {
	return nil, nil
}
func (s *tierMockStore) RevokeAPIKey(context.Context, string) error       { return nil }
func (s *tierMockStore) UpdateAPIKeyLastUsed(context.Context, string) error { return nil }
func (s *tierMockStore) RotateAPIKey(context.Context, string, string, string, string, string, time.Duration) (*domain.APIKey, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) CleanExpiredGracePeriodKeys(context.Context) error { return nil }
func (s *tierMockStore) CreateWebhook(context.Context, *domain.Webhook) error {
	return nil
}
func (s *tierMockStore) GetWebhook(context.Context, string) (*domain.Webhook, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) ListWebhooks(context.Context, string) ([]domain.Webhook, error) {
	return nil, nil
}
func (s *tierMockStore) UpdateWebhook(context.Context, *domain.Webhook) error { return nil }
func (s *tierMockStore) DeleteWebhook(context.Context, string) error          { return nil }
func (s *tierMockStore) CreateWebhookDelivery(context.Context, *domain.WebhookDelivery) error {
	return nil
}
func (s *tierMockStore) ListWebhookDeliveries(context.Context, string, int) ([]domain.WebhookDelivery, error) {
	return nil, nil
}
func (s *tierMockStore) CreateApprovalRequest(context.Context, *domain.ApprovalRequest) error {
	return nil
}
func (s *tierMockStore) GetApprovalRequest(context.Context, string) (*domain.ApprovalRequest, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) ListApprovalRequests(context.Context, string, string, int, int) ([]domain.ApprovalRequest, error) {
	return nil, nil
}
func (s *tierMockStore) UpdateApprovalRequest(context.Context, *domain.ApprovalRequest) error {
	return nil
}
func (s *tierMockStore) CreateAuditEntry(context.Context, *domain.AuditEntry) error { return nil }
func (s *tierMockStore) PurgeAuditEntries(context.Context, time.Time) (int, error) { return 0, nil }
func (s *tierMockStore) ListAuditEntries(context.Context, string, int, int) ([]domain.AuditEntry, error) {
	return nil, nil
}
func (s *tierMockStore) ListAuditEntriesForExport(context.Context, string, string, string) ([]domain.AuditEntry, error) {
	return nil, nil
}
func (s *tierMockStore) GetLastAuditHash(context.Context, string) (string, error) { return "", nil }
func (s *tierMockStore) LoadRuleset(context.Context, string, string) ([]domain.Flag, []domain.FlagState, []domain.Segment, error) {
	return nil, nil, nil, nil
}
func (s *tierMockStore) ListenForChanges(context.Context, func(string)) error { return nil }
func (s *tierMockStore) GetEnvironmentByAPIKeyHash(context.Context, string) (*domain.Environment, *domain.APIKey, error) {
	return nil, nil, fmt.Errorf("not found")
}
func (s *tierMockStore) GetSubscription(context.Context, string) (*domain.Subscription, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) UpsertSubscription(context.Context, *domain.Subscription) error { return nil }
func (s *tierMockStore) UpdateOrgPlan(context.Context, string, string, domain.PlanLimits) error {
	return nil
}
func (s *tierMockStore) IncrementUsage(context.Context, string, string, int64) error { return nil }
func (s *tierMockStore) GetUsage(context.Context, string, string) (*domain.UsageMetric, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) GetOnboardingState(context.Context, string) (*domain.OnboardingState, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) UpsertOnboardingState(context.Context, *domain.OnboardingState) error {
	return nil
}
func (s *tierMockStore) UpsertPendingRegistration(context.Context, *domain.PendingRegistration) error {
	return nil
}
func (s *tierMockStore) GetPendingRegistrationByEmail(context.Context, string) (*domain.PendingRegistration, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) IncrementPendingAttempts(context.Context, string) error    { return nil }
func (s *tierMockStore) DeletePendingRegistration(context.Context, string) error   { return nil }
func (s *tierMockStore) DeleteExpiredPendingRegistrations(context.Context, time.Time) (int, error) {
	return 0, nil
}
func (s *tierMockStore) UpdateLastLoginAt(context.Context, string) error           { return nil }
func (s *tierMockStore) SoftDeleteOrganization(context.Context, string) error      { return nil }
func (s *tierMockStore) RestoreOrganization(context.Context, string) error         { return nil }
func (s *tierMockStore) ListSoftDeletedOrgs(context.Context, time.Time) ([]domain.Organization, error) {
	return nil, nil
}
func (s *tierMockStore) HardDeleteOrganization(context.Context, string) error      { return nil }
func (s *tierMockStore) ListInactiveOrgs(context.Context, string, time.Time) ([]domain.Organization, error) {
	return nil, nil
}
func (s *tierMockStore) DowngradeOrgToFree(context.Context, string) error          { return nil }
func (s *tierMockStore) CreateSalesInquiry(context.Context, *domain.SalesInquiry) error { return nil }
func (s *tierMockStore) CreateOneTimeToken(context.Context, string, string, time.Duration) (string, error) {
	return "test-token", nil
}
func (s *tierMockStore) ConsumeOneTimeToken(context.Context, string) (string, string, error) {
	return "user-id", "org-id", nil
}
func (s *tierMockStore) UpsertSSOConfig(context.Context, *domain.SSOConfig) error { return nil }
func (s *tierMockStore) GetSSOConfig(context.Context, string) (*domain.SSOConfig, error) {
	return nil, nil
}
func (s *tierMockStore) GetSSOConfigFull(context.Context, string) (*domain.SSOConfig, error) {
	return nil, nil
}
func (s *tierMockStore) GetSSOConfigByOrgSlug(context.Context, string) (*domain.SSOConfig, error) {
	return nil, nil
}
func (s *tierMockStore) DeleteSSOConfig(context.Context, string) error { return nil }

func (s *tierMockStore) RevokeToken(context.Context, string, string, string, time.Time) error {
	return nil
}
func (s *tierMockStore) IsTokenRevoked(context.Context, string) (bool, error) { return false, nil }
func (s *tierMockStore) CleanExpiredRevocations(context.Context) error        { return nil }
func (s *tierMockStore) UpsertMFASecret(context.Context, string, string) error {
	return nil
}
func (s *tierMockStore) GetMFASecret(context.Context, string) (*domain.MFASecret, error) {
	return nil, fmt.Errorf("not found")
}
func (s *tierMockStore) EnableMFA(context.Context, string) error                           { return nil }
func (s *tierMockStore) DisableMFA(context.Context, string) error                          { return nil }
func (s *tierMockStore) RecordLoginAttempt(context.Context, string, string, string, bool) error {
	return nil
}
func (s *tierMockStore) CountRecentFailedAttempts(context.Context, string, time.Time) (int, error) {
	return 0, nil
}
func (s *tierMockStore) GetIPAllowlist(context.Context, string) (bool, []string, error) {
	return false, nil, nil
}
func (s *tierMockStore) UpsertIPAllowlist(context.Context, string, bool, []string) error { return nil }

func withOrgID(ctx context.Context, orgID string) context.Context {
	return context.WithValue(ctx, OrgIDKey, orgID)
}

func TestTierEnforce_ProjectCreate_AtLimit(t *testing.T) {
	store := &tierMockStore{
		org: &domain.Organization{ID: "org-1", PlanProjectsLimit: 2},
		projects: []domain.Project{
			{ID: "p1", OrgID: "org-1"},
			{ID: "p2", OrgID: "org-1"},
		},
	}
	logger := slog.Default()
	handler := TierEnforce(store, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	r := httptest.NewRequest("POST", "/v1/projects", nil)
	r = r.WithContext(withOrgID(r.Context(), "org-1"))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusPaymentRequired {
		t.Errorf("expected 402, got %d", w.Code)
	}
}

func TestTierEnforce_ProjectCreate_UnderLimit(t *testing.T) {
	store := &tierMockStore{
		org: &domain.Organization{ID: "org-1", PlanProjectsLimit: 5},
		projects: []domain.Project{
			{ID: "p1", OrgID: "org-1"},
		},
	}
	logger := slog.Default()
	handler := TierEnforce(store, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	r := httptest.NewRequest("POST", "/v1/projects", nil)
	r = r.WithContext(withOrgID(r.Context(), "org-1"))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201, got %d", w.Code)
	}
}

func TestTierEnforce_ProPlan_Unlimited(t *testing.T) {
	store := &tierMockStore{
		org: &domain.Organization{ID: "org-1", PlanProjectsLimit: -1},
		projects: []domain.Project{
			{ID: "p1"}, {ID: "p2"}, {ID: "p3"}, {ID: "p4"}, {ID: "p5"},
		},
	}
	logger := slog.Default()
	handler := TierEnforce(store, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	r := httptest.NewRequest("POST", "/v1/projects", nil)
	r = r.WithContext(withOrgID(r.Context(), "org-1"))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusCreated {
		t.Errorf("expected 201 for unlimited plan, got %d", w.Code)
	}
}

func TestTierEnforce_NonPostPassesThrough(t *testing.T) {
	store := &tierMockStore{
		org: &domain.Organization{ID: "org-1", PlanProjectsLimit: 0},
	}
	logger := slog.Default()
	handler := TierEnforce(store, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("GET", "/v1/projects", nil)
	r = r.WithContext(withOrgID(r.Context(), "org-1"))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for GET, got %d", w.Code)
	}
}

func TestTierEnforce_EnvironmentCreate_AtLimit(t *testing.T) {
	store := &tierMockStore{
		org: &domain.Organization{ID: "org-1", PlanEnvironmentsLimit: 2},
		envs: map[string][]domain.Environment{
			"proj-1": {{ID: "e1"}, {ID: "e2"}},
		},
	}
	logger := slog.Default()
	handler := TierEnforce(store, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	r := httptest.NewRequest("POST", "/v1/projects/proj-1/environments", nil)
	r = r.WithContext(withOrgID(r.Context(), "org-1"))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusPaymentRequired {
		t.Errorf("expected 402, got %d", w.Code)
	}
}

func TestTierEnforce_SeatInvite_AtLimit(t *testing.T) {
	store := &tierMockStore{
		org: &domain.Organization{ID: "org-1", PlanSeatsLimit: 1},
		members: []domain.OrgMember{
			{ID: "m1", OrgID: "org-1", UserID: "u1"},
		},
	}
	logger := slog.Default()
	handler := TierEnforce(store, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusCreated)
	}))

	r := httptest.NewRequest("POST", "/v1/members/invite", nil)
	r = r.WithContext(withOrgID(r.Context(), "org-1"))
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusPaymentRequired {
		t.Errorf("expected 402, got %d", w.Code)
	}
}

func TestTierEnforce_NoOrgID_PassesThrough(t *testing.T) {
	store := &tierMockStore{}
	logger := slog.Default()
	handler := TierEnforce(store, logger)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("POST", "/v1/projects", nil)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 (no orgID), got %d", w.Code)
	}
}

func TestMatchRoutePattern(t *testing.T) {
	tests := []struct {
		path    string
		pattern string
		want    bool
	}{
		{"/v1/projects/abc/environments", "/v1/projects/*/environments", true},
		{"/v1/projects/abc", "/v1/projects/*/environments", false},
		{"/v1/projects/abc/environments/extra", "/v1/projects/*/environments", false},
	}
	for _, tt := range tests {
		if got := matchRoutePattern(tt.path, tt.pattern); got != tt.want {
			t.Errorf("matchRoutePattern(%q, %q) = %v, want %v", tt.path, tt.pattern, got, tt.want)
		}
	}
}

func TestExtractSegment(t *testing.T) {
	if got := extractSegment("/v1/projects/abc123/environments", 2); got != "abc123" {
		t.Errorf("expected abc123, got %s", got)
	}
	if got := extractSegment("/v1/projects", 5); got != "" {
		t.Errorf("expected empty, got %s", got)
	}
}

func TestIsExactProjectCreate(t *testing.T) {
	if !isExactProjectCreate("/v1/projects") {
		t.Error("expected true for /v1/projects")
	}
	if !isExactProjectCreate("/v1/projects/") {
		t.Error("expected true for /v1/projects/")
	}
	if isExactProjectCreate("/v1/projects/abc") {
		t.Error("expected false for /v1/projects/abc")
	}
	if isExactProjectCreate("/v1/projects/abc/flags") {
		t.Error("expected false for /v1/projects/abc/flags")
	}
}
