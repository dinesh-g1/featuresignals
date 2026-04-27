package api_test

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"runtime"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/metrics"
	"github.com/featuresignals/server/internal/observability"
	"github.com/featuresignals/server/internal/payment"
	"github.com/featuresignals/server/internal/sse"
	"github.com/featuresignals/server/internal/status"
	"github.com/featuresignals/server/internal/store/cache"
)

// ── noopStore ───────────────────────────────────────────────────────────────

var errNoop = errors.New("noop store: not implemented")

type noopStore struct{}

func (noopStore) CreateOrganization(context.Context, *domain.Organization) error { return errNoop }
func (noopStore) GetOrganization(context.Context, string) (*domain.Organization, error) {
	return nil, errNoop
}
func (noopStore) GetOrganizationByIDPrefix(context.Context, string) (*domain.Organization, error) {
	return nil, errNoop
}

func (noopStore) CreateUser(context.Context, *domain.User) error { return errNoop }
func (noopStore) GetUserByEmail(context.Context, string) (*domain.User, error) {
	return nil, errNoop
}
func (noopStore) GetUserByID(context.Context, string) (*domain.User, error) { return nil, errNoop }
func (noopStore) GetUserByEmailVerifyToken(context.Context, string) (*domain.User, error) {
	return nil, errNoop
}
func (noopStore) UpdateUserEmailVerifyToken(context.Context, string, string, time.Time) error {
	return errNoop
}
func (noopStore) SetEmailVerified(context.Context, string) error { return errNoop }

func (noopStore) AddOrgMember(context.Context, *domain.OrgMember) error { return errNoop }
func (noopStore) GetOrgMember(context.Context, string, string) (*domain.OrgMember, error) {
	return nil, errNoop
}
func (noopStore) GetOrgMemberByID(context.Context, string) (*domain.OrgMember, error) {
	return nil, errNoop
}
func (noopStore) ListOrgMembers(context.Context, string) ([]domain.OrgMember, error) {
	return nil, errNoop
}
func (noopStore) UpdateOrgMemberRole(context.Context, string, domain.Role) error { return errNoop }
func (noopStore) RemoveOrgMember(context.Context, string) error                  { return errNoop }

func (noopStore) ListEnvPermissions(context.Context, string) ([]domain.EnvPermission, error) {
	return nil, errNoop
}
func (noopStore) UpsertEnvPermission(context.Context, *domain.EnvPermission) error { return errNoop }
func (noopStore) DeleteEnvPermission(context.Context, string) error                { return errNoop }

func (noopStore) CreateProject(context.Context, *domain.Project) error { return errNoop }
func (noopStore) GetProject(context.Context, string) (*domain.Project, error) {
	return nil, errNoop
}
func (noopStore) ListProjects(context.Context, string) ([]domain.Project, error) {
	return nil, errNoop
}
func (noopStore) DeleteProject(context.Context, string) error          { return errNoop }
func (noopStore) UpdateProject(context.Context, *domain.Project) error { return errNoop }

func (noopStore) CreateEnvironment(context.Context, *domain.Environment) error { return errNoop }
func (noopStore) ListEnvironments(context.Context, string) ([]domain.Environment, error) {
	return nil, errNoop
}
func (noopStore) GetEnvironment(context.Context, string) (*domain.Environment, error) {
	return nil, errNoop
}
func (noopStore) DeleteEnvironment(context.Context, string) error              { return errNoop }
func (noopStore) UpdateEnvironment(context.Context, *domain.Environment) error { return errNoop }

func (noopStore) CreateFlag(context.Context, *domain.Flag) error { return errNoop }
func (noopStore) GetFlag(context.Context, string, string) (*domain.Flag, error) {
	return nil, errNoop
}
func (noopStore) ListFlags(context.Context, string) ([]domain.Flag, error) { return nil, errNoop }
func (noopStore) UpdateFlag(context.Context, *domain.Flag) error           { return errNoop }
func (noopStore) DeleteFlag(context.Context, string) error                 { return errNoop }

func (noopStore) UpsertFlagState(context.Context, *domain.FlagState) error { return errNoop }
func (noopStore) GetFlagState(context.Context, string, string) (*domain.FlagState, error) {
	return nil, errNoop
}
func (noopStore) ListFlagStatesByEnv(context.Context, string) ([]domain.FlagState, error) {
	return nil, errNoop
}
func (noopStore) ListPendingSchedules(context.Context, time.Time) ([]domain.FlagState, error) {
	return nil, errNoop
}

func (noopStore) CreateSegment(context.Context, *domain.Segment) error { return errNoop }
func (noopStore) ListSegments(context.Context, string) ([]domain.Segment, error) {
	return nil, errNoop
}
func (noopStore) GetSegment(context.Context, string, string) (*domain.Segment, error) {
	return nil, errNoop
}
func (noopStore) UpdateSegment(context.Context, *domain.Segment) error { return errNoop }
func (noopStore) DeleteSegment(context.Context, string) error          { return errNoop }

func (noopStore) CreateAPIKey(context.Context, *domain.APIKey) error { return errNoop }
func (noopStore) GetAPIKeyByID(context.Context, string) (*domain.APIKey, error) {
	return nil, errNoop
}
func (noopStore) GetAPIKeyByHash(context.Context, string) (*domain.APIKey, error) {
	return nil, errNoop
}
func (noopStore) ListAPIKeys(context.Context, string) ([]domain.APIKey, error) {
	return nil, errNoop
}
func (noopStore) RevokeAPIKey(context.Context, string) error { return errNoop }
func (noopStore) RotateAPIKey(context.Context, string, string, string, string, string, time.Duration) (*domain.APIKey, error) {
	return nil, errNoop
}
func (noopStore) CleanExpiredGracePeriodKeys(context.Context) error  { return errNoop }
func (noopStore) UpdateAPIKeyLastUsed(context.Context, string) error { return errNoop }

func (noopStore) CreateWebhook(context.Context, *domain.Webhook) error { return errNoop }
func (noopStore) GetWebhook(context.Context, string) (*domain.Webhook, error) {
	return nil, errNoop
}
func (noopStore) ListWebhooks(context.Context, string) ([]domain.Webhook, error) {
	return nil, errNoop
}
func (noopStore) UpdateWebhook(context.Context, *domain.Webhook) error { return errNoop }
func (noopStore) DeleteWebhook(context.Context, string) error          { return errNoop }
func (noopStore) CreateWebhookDelivery(context.Context, *domain.WebhookDelivery) error {
	return errNoop
}
func (noopStore) ListWebhookDeliveries(context.Context, string, int) ([]domain.WebhookDelivery, error) {
	return nil, errNoop
}

func (noopStore) CreateApprovalRequest(context.Context, *domain.ApprovalRequest) error {
	return errNoop
}
func (noopStore) GetApprovalRequest(context.Context, string) (*domain.ApprovalRequest, error) {
	return nil, errNoop
}
func (noopStore) ListApprovalRequests(context.Context, string, string, int, int) ([]domain.ApprovalRequest, error) {
	return nil, errNoop
}
func (noopStore) UpdateApprovalRequest(context.Context, *domain.ApprovalRequest) error {
	return errNoop
}

func (noopStore) CreateAuditEntry(context.Context, *domain.AuditEntry) error { return errNoop }
func (noopStore) PurgeAuditEntries(context.Context, time.Time) (int, error)  { return 0, errNoop }
func (noopStore) ListAuditEntries(context.Context, string, int, int) ([]domain.AuditEntry, error) {
	return nil, errNoop
}
func (noopStore) ListAuditEntriesByProject(context.Context, string, string, int, int) ([]domain.AuditEntry, error) {
	return nil, errNoop
}
func (noopStore) ListAuditEntriesForExport(context.Context, string, string, string) ([]domain.AuditEntry, error) {
	return nil, errNoop
}
func (noopStore) GetLastAuditHash(context.Context, string) (string, error) { return "", errNoop }
func (noopStore) CountAuditEntries(context.Context, string) (int, error)   { return 0, errNoop }
func (noopStore) CountApprovalRequests(context.Context, string, string) (int, error) {
	return 0, errNoop
}

func (noopStore) LoadRuleset(context.Context, string, string) ([]domain.Flag, []domain.FlagState, []domain.Segment, error) {
	return nil, nil, nil, errNoop
}
func (noopStore) ListenForChanges(context.Context, func(string)) error { return errNoop }
func (noopStore) GetEnvironmentByAPIKeyHash(context.Context, string) (*domain.Environment, *domain.APIKey, error) {
	return nil, nil, errNoop
}

func (noopStore) GetSubscription(context.Context, string) (*domain.Subscription, error) {
	return nil, errNoop
}
func (noopStore) UpsertSubscription(context.Context, *domain.Subscription) error { return errNoop }
func (noopStore) UpdateOrgPlan(context.Context, string, string, domain.PlanLimits) error {
	return errNoop
}

func (noopStore) IncrementUsage(context.Context, string, string, int64) error { return errNoop }
func (noopStore) GetUsage(context.Context, string, string) (*domain.UsageMetric, error) {
	return nil, errNoop
}
func (noopStore) GetSubscriptionByStripeID(context.Context, string) (*domain.Subscription, error) {
	return nil, errNoop
}
func (noopStore) CreatePaymentEvent(context.Context, *domain.PaymentEvent) error { return errNoop }
func (noopStore) GetPaymentEventByExternalID(context.Context, string, string) (*domain.PaymentEvent, error) {
	return nil, errNoop
}
func (noopStore) UpdateOrgPaymentGateway(context.Context, string, string) error { return errNoop }
func (noopStore) ListPastDueSubscriptions(context.Context, time.Time) ([]domain.Subscription, error) {
	return nil, errNoop
}

func (noopStore) GetOnboardingState(context.Context, string) (*domain.OnboardingState, error) {
	return nil, errNoop
}
func (noopStore) UpsertOnboardingState(context.Context, *domain.OnboardingState) error {
	return errNoop
}

func (noopStore) UpsertPendingRegistration(context.Context, *domain.PendingRegistration) error {
	return errNoop
}
func (noopStore) GetPendingRegistrationByEmail(context.Context, string) (*domain.PendingRegistration, error) {
	return nil, errNoop
}
func (noopStore) IncrementPendingAttempts(context.Context, string) error  { return errNoop }
func (noopStore) DeletePendingRegistration(context.Context, string) error { return errNoop }
func (noopStore) DeleteExpiredPendingRegistrations(context.Context, time.Time) (int, error) {
	return 0, errNoop
}
func (noopStore) UpdateLastLoginAt(context.Context, string) error      { return errNoop }
func (noopStore) SoftDeleteOrganization(context.Context, string) error { return errNoop }
func (noopStore) RestoreOrganization(context.Context, string) error    { return errNoop }
func (noopStore) ListSoftDeletedOrgs(context.Context, time.Time) ([]domain.Organization, error) {
	return nil, errNoop
}
func (noopStore) HardDeleteOrganization(context.Context, string) error { return errNoop }
func (noopStore) ListInactiveOrgs(context.Context, string, time.Time) ([]domain.Organization, error) {
	return nil, errNoop
}
func (noopStore) DowngradeOrgToFree(context.Context, string) error { return errNoop }
func (noopStore) CreateSalesInquiry(context.Context, *domain.SalesInquiry) error {
	return errNoop
}

func (noopStore) CreateOneTimeToken(context.Context, string, string, time.Duration) (string, error) {
	return "", errNoop
}
func (noopStore) ConsumeOneTimeToken(context.Context, string) (string, string, error) {
	return "", "", errNoop
}
func (noopStore) UpsertSSOConfig(context.Context, *domain.SSOConfig) error { return errNoop }
func (noopStore) GetSSOConfig(context.Context, string) (*domain.SSOConfig, error) {
	return nil, errNoop
}
func (noopStore) GetSSOConfigFull(context.Context, string) (*domain.SSOConfig, error) {
	return nil, errNoop
}
func (noopStore) GetSSOConfigByOrgSlug(context.Context, string) (*domain.SSOConfig, error) {
	return nil, errNoop
}
func (noopStore) DeleteSSOConfig(context.Context, string) error { return errNoop }

func (noopStore) RevokeToken(context.Context, string, string, string, time.Time) error { return nil }
func (noopStore) IsTokenRevoked(context.Context, string) (bool, error)                 { return false, nil }
func (noopStore) CleanExpiredRevocations(context.Context) error                        { return nil }
func (noopStore) UpsertMFASecret(context.Context, string, string) error                { return nil }
func (noopStore) GetMFASecret(context.Context, string) (*domain.MFASecret, error) {
	return nil, errNoop
}
func (noopStore) EnableMFA(context.Context, string) error                                { return nil }
func (noopStore) DisableMFA(context.Context, string) error                               { return nil }
func (noopStore) RecordLoginAttempt(context.Context, string, string, string, bool) error { return nil }
func (noopStore) CountRecentFailedAttempts(context.Context, string, time.Time) (int, error) {
	return 0, nil
}
func (noopStore) GetIPAllowlist(context.Context, string) (bool, []string, error) {
	return false, nil, nil
}
func (noopStore) UpsertIPAllowlist(context.Context, string, bool, []string) error { return nil }
func (noopStore) CreateCustomRole(context.Context, *domain.CustomRole) error      { return errNoop }
func (noopStore) GetCustomRole(context.Context, string) (*domain.CustomRole, error) {
	return nil, errNoop
}
func (noopStore) ListCustomRoles(context.Context, string) ([]domain.CustomRole, error) {
	return nil, errNoop
}
func (noopStore) UpdateCustomRole(context.Context, *domain.CustomRole) error { return errNoop }
func (noopStore) DeleteCustomRole(context.Context, string) error             { return errNoop }
func (noopStore) SoftDeleteUser(context.Context, string) error               { return errNoop }
func (noopStore) SetPasswordResetToken(context.Context, string, string, time.Time, string, string) error {
	return errNoop
}
func (noopStore) ConsumePasswordResetToken(context.Context, string) (string, error) {
	return "", errNoop
}
func (noopStore) UpdatePassword(context.Context, string, string) error { return errNoop }

func (noopStore) InsertProductEvent(context.Context, *domain.ProductEvent) error { return nil }
func (noopStore) InsertProductEvents(context.Context, []domain.ProductEvent) error {
	return nil
}
func (noopStore) CountEventsByOrg(context.Context, string, string, time.Time) (int, error) {
	return 0, nil
}
func (noopStore) CountEventsByUser(context.Context, string, string, time.Time) (int, error) {
	return 0, nil
}
func (noopStore) CountEventsByCategory(context.Context, string, time.Time) (int, error) {
	return 0, nil
}
func (noopStore) CountDistinctOrgs(context.Context, string, time.Time) (int, error) {
	return 0, nil
}
func (noopStore) CountDistinctUsers(context.Context, time.Time) (int, error) { return 0, nil }
func (noopStore) EventFunnel(context.Context, []string, time.Time) (map[string]int, error) {
	return nil, nil
}
func (noopStore) PlanDistribution(context.Context) (map[string]int, error) { return nil, nil }
func (noopStore) UpdateUserEmailPreferences(context.Context, string, bool, string) error {
	return nil
}
func (noopStore) GetUserEmailPreferences(context.Context, string) (bool, string, error) {
	return false, "", nil
}
func (noopStore) DismissHint(context.Context, string, string) error { return nil }
func (noopStore) GetDismissedHints(context.Context, string) ([]string, error) {
	return nil, nil
}
func (noopStore) SetTourCompleted(context.Context, string) error { return nil }

func (noopStore) InsertFeedback(context.Context, *domain.Feedback) error { return nil }
func (noopStore) ListFlagVersions(context.Context, string, int, int) ([]domain.FlagVersion, error) {
	return nil, nil
}
func (noopStore) GetFlagVersion(context.Context, string, int) (*domain.FlagVersion, error) {
	return nil, nil
}
func (noopStore) RollbackFlagToVersion(context.Context, string, int, string, string) error {
	return nil
}
func (noopStore) InsertStatusChecks(context.Context, []domain.StatusCheck) error { return nil }
func (noopStore) GetComponentHistory(context.Context, int) ([]domain.DailyComponentStatus, error) {
	return nil, nil
}
func (noopStore) GetCell(_ context.Context, _ string) (*domain.Cell, error) { return nil, nil }
func (noopStore) ListCells(_ context.Context, _ domain.CellFilter) ([]*domain.Cell, error) { return nil, nil }
func (noopStore) CreateCell(_ context.Context, _ *domain.Cell) error { return nil }
func (noopStore) UpdateCell(_ context.Context, _ *domain.Cell) error { return nil }
func (noopStore) DeleteCell(_ context.Context, _ string) error { return nil }
func (noopStore) CreateProvisionEvent(_ context.Context, _ *domain.ProvisionEvent) error { return nil }
func (noopStore) ListProvisionEvents(_ context.Context, _ string, _ time.Time) ([]*domain.ProvisionEvent, error) { return nil, nil }

// TenantRegionStore stubs
func (noopStore) Get(_ context.Context, _ string) (*domain.TenantRegion, error) { return nil, domain.ErrNotFound }
func (noopStore) Upsert(_ context.Context, _ *domain.TenantRegion) error { return nil }
func (noopStore) GetByRoutingKey(_ context.Context, _ string) (*domain.TenantRegion, error) { return nil, domain.ErrNotFound }
func (noopStore) ListByRegion(_ context.Context, _ string) ([]*domain.TenantRegion, error) { return nil, nil }
func (noopStore) Delete(_ context.Context, _ string) error { return nil }
func (noopStore) GetCellWithFewestTenantsInRegion(_ context.Context, _ string) (*domain.Cell, error) { return nil, nil }
func (noopStore) GetCellLoad(_ context.Context) ([]domain.CellLoadInfo, error) { return nil, nil }

// TenantResourceOverrideStore stubs
func (noopStore) GetOverride(_ context.Context, _ string) (*domain.TenantResourceOverride, error) { return nil, domain.ErrNotFound }
func (noopStore) UpsertOverride(_ context.Context, _ *domain.TenantResourceOverride) error { return nil }
func (noopStore) DeleteOverride(_ context.Context, _ string) error { return nil }

type noopOTPEmail struct{}

func (noopOTPEmail) SendOTP(context.Context, string, string, string) error              { return nil }
func (noopOTPEmail) SendPasswordResetOTP(context.Context, string, string, string) error { return nil }

type noopHealthChecker struct{}

func (noopHealthChecker) Ping(context.Context) error { return nil }

type noopPoolStats struct{}

func (noopPoolStats) AcquiredConns() int32 { return 0 }
func (noopPoolStats) MaxConns() int32      { return 10 }

// ── test helpers ────────────────────────────────────────────────────────────

func newTestRouter(t *testing.T) http.Handler {
	t.Helper()

	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	store := noopStore{}
	jwtMgr := auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	engine := eval.NewEngine()
	evalCache := cache.NewCache(store, logger, nil)
	sseServer := sse.NewServer(logger)
	metricsCollector := metrics.NewCollector()
	otelInstruments := observability.NewInstruments()

	statusH := status.NewHandler(noopHealthChecker{}, noopPoolStats{}, "us", store, evalCache, sseServer)

	// Create context for rate limiter cleanup
	ctx, cancel := context.WithCancel(context.Background())
	t.Cleanup(cancel)

	return api.NewRouter(
		ctx,
		store,
		jwtMgr,
		evalCache,
		engine,
		sseServer,
		logger,
		metricsCollector,
		otelInstruments,
		api.BillingConfig{Registry: payment.NewRegistry()},
		noopOTPEmail{},
		"http://localhost:8080",
		"http://localhost:3000",
		statusH,
		"cloud",
		false,
		true,
		nil,
		nil,
		nil,
		nil,
		"",
		nil,
		nil,
		nil,
	)
}

// ── Tests ───────────────────────────────────────────────────────────────────

func TestHealthEndpoint(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Fatalf("GET /health: expected 200, got %d", w.Code)
	}

	var body map[string]string
	if err := json.NewDecoder(w.Body).Decode(&body); err != nil {
		t.Fatalf("GET /health: could not decode JSON: %v", err)
	}
	if body["status"] != "ok" {
		t.Errorf("GET /health: expected status=ok, got %q", body["status"])
	}
	if body["service"] != "featuresignals" {
		t.Errorf("GET /health: expected service=featuresignals, got %q", body["service"])
	}
}

func TestPublicAuthRoutes_NotFound(t *testing.T) {
	router := newTestRouter(t)

	tests := []struct {
		method string
		path   string
		want   int
	}{
		{http.MethodPost, "/v1/auth/login", http.StatusBadRequest},
		{http.MethodPost, "/v1/auth/refresh", http.StatusBadRequest},
		{http.MethodGet, "/v1/auth/verify-email", http.StatusBadRequest},
		{http.MethodPost, "/v1/auth/initiate-signup", http.StatusBadRequest},
		{http.MethodPost, "/v1/auth/complete-signup", http.StatusBadRequest},
		{http.MethodPost, "/v1/auth/resend-signup-otp", http.StatusBadRequest},
	}

	for _, tt := range tests {
		t.Run(tt.method+" "+tt.path, func(t *testing.T) {
			var req *http.Request
			if tt.method == http.MethodPost {
				req = httptest.NewRequest(tt.method, tt.path, strings.NewReader("{}"))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(tt.method, tt.path, nil)
			}
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code == http.StatusNotFound || w.Code == http.StatusMethodNotAllowed {
				t.Errorf("%s %s: route should exist, got %d", tt.method, tt.path, w.Code)
			}
		})
	}
}

func TestProtectedRoutes_RequireAuth(t *testing.T) {
	router := newTestRouter(t)

	protectedRoutes := []struct {
		method string
		path   string
	}{
		{http.MethodGet, "/v1/projects"},
		{http.MethodPost, "/v1/projects"},
		{http.MethodGet, "/v1/members"},
		{http.MethodGet, "/v1/audit"},
		{http.MethodGet, "/v1/approvals"},
		{http.MethodGet, "/v1/billing/subscription"},
		{http.MethodGet, "/v1/onboarding"},
		{http.MethodPost, "/v1/webhooks"},
	}

	for _, rt := range protectedRoutes {
		t.Run(rt.method+" "+rt.path, func(t *testing.T) {
			var req *http.Request
			if rt.method == http.MethodPost {
				req = httptest.NewRequest(rt.method, rt.path, strings.NewReader("{}"))
				req.Header.Set("Content-Type", "application/json")
			} else {
				req = httptest.NewRequest(rt.method, rt.path, nil)
			}
			w := httptest.NewRecorder()
			router.ServeHTTP(w, req)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("%s %s: expected 401 without auth, got %d", rt.method, rt.path, w.Code)
			}
		})
	}
}

func TestRequireJSON_BlocksWrongContentType(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader("name=test"))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusUnsupportedMediaType {
		t.Errorf("POST with wrong Content-Type: expected 415, got %d", w.Code)
	}
}

func TestRequireJSON_AllowsGETWithoutContentType(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GET without Content-Type: expected 200, got %d", w.Code)
	}
}

func TestBodySizeLimit(t *testing.T) {
	router := newTestRouter(t)

	// Router uses 1 MB limit; send >1 MB.
	oversized := strings.Repeat("a", (1<<20)+1024)
	body := `{"email":"` + oversized + `"}`
	req := httptest.NewRequest(http.MethodPost, "/v1/auth/login", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	// The handler will fail when reading the body; MaxBytesReader triggers 413
	// or the handler returns an error. Either way, it must not be 200.
	if w.Code == http.StatusOK {
		t.Error("oversized body should not succeed with 200")
	}
}

func TestNonexistentRoute_Returns404(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/this/does/not/exist", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("nonexistent route: expected 404, got %d", w.Code)
	}

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("404 Content-Type: expected application/json, got %q", ct)
	}

	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("404 response is not valid JSON: %v", err)
	}
	if body["error"] != "route not found" {
		t.Errorf("404 error field: expected %q, got %q", "route not found", body["error"])
	}
}

func TestMethodNotAllowed_Returns405(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodPost, "/health", nil)
	req.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusMethodNotAllowed {
		t.Errorf("POST /health: expected 405, got %d", w.Code)
	}

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("405 Content-Type: expected application/json, got %q", ct)
	}

	var body map[string]string
	if err := json.Unmarshal(w.Body.Bytes(), &body); err != nil {
		t.Fatalf("405 response is not valid JSON: %v", err)
	}
	if body["error"] != "method not allowed" {
		t.Errorf("405 error field: expected %q, got %q", "method not allowed", body["error"])
	}
}

func TestPricingEndpoint_IsPublic(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/pricing", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GET /v1/pricing: expected 200, got %d", w.Code)
	}
}

func TestStatusHistoryEndpoint_IsPublic(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/v1/status/history", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("GET /v1/status/history: expected 200, got %d", w.Code)
	}

	ct := w.Header().Get("Content-Type")
	if ct != "application/json" {
		t.Errorf("Content-Type: expected application/json, got %q", ct)
	}

	cc := w.Header().Get("Cache-Control")
	if cc != "public, max-age=300" {
		t.Errorf("Cache-Control: expected %q, got %q", "public, max-age=300", cc)
	}
}

// internalRoutes lists routes that are intentionally excluded from the public
// OpenAPI spec (health checks, internal status, payment gateway callbacks that
// are server-to-server only).
var internalRoutes = map[string]bool{
	"GET /health":                     true,
	"GET /v1/status":                  true,
	"GET /v1/status/global":           true,
	"GET /v1/status/history":          true,
	"GET /v1/status/sla":              true,
	"POST /v1/billing/payu/callback":  true,
	"POST /v1/billing/payu/failure":   true,
	"POST /v1/billing/stripe/webhook": true,
	// New auth endpoints — documented separately in OpenAPI spec update.
	"POST /v1/auth/forgot-password": true,
	"POST /v1/auth/reset-password":  true,
	"GET /v1/auth/magic-link":       true,
	// Operations Portal routes — internal only, not part of public API.
	"GET /api/v1/ops/environments":                    true,
	"GET /api/v1/ops/environments/{id}":               true,
	"GET /api/v1/ops/environments/vps/{vps_id}":       true,
	"PATCH /api/v1/ops/environments/{id}":             true,
	"POST /api/v1/ops/environments/provision":         true,
	"POST /api/v1/ops/environments/{id}/decommission": true,
	"POST /api/v1/ops/environments/{id}/maintenance":  true,
	"POST /api/v1/ops/environments/{id}/debug":        true,
	"POST /api/v1/ops/environments/{id}/restart":      true,
	"GET /api/v1/ops/licenses":                        true,
	"GET /api/v1/ops/licenses/{id}":                   true,
	"GET /api/v1/ops/licenses/org/{org_id}":           true,
	"POST /api/v1/ops/licenses":                       true,
	"POST /api/v1/ops/licenses/{id}/revoke":           true,
	"POST /api/v1/ops/licenses/{id}/quota-override":   true,
	"POST /api/v1/ops/licenses/{id}/reset-usage":      true,
	"GET /api/v1/ops/sandboxes":                       true,
	"POST /api/v1/ops/sandboxes":                      true,
	"POST /api/v1/ops/sandboxes/{id}/renew":           true,
	"POST /api/v1/ops/sandboxes/{id}/decommission":    true,
	"GET /api/v1/ops/financial/costs/daily":           true,
	"GET /api/v1/ops/financial/costs/monthly":         true,
	"GET /api/v1/ops/financial/summary":               true,
	"GET /api/v1/ops/customers":                       true,
	"GET /api/v1/ops/customers/{org_id}":              true,
	"GET /api/v1/ops/users":                           true,
	"GET /api/v1/ops/users/{id}":                      true,
	"GET /api/v1/ops/users/me":                        true,
	"POST /api/v1/ops/users":                          true,
	"PATCH /api/v1/ops/users/{id}":                    true,
	"GET /api/v1/ops/audit":                           true,
}

// TestAllRoutesDocumented ensures every route registered in the chi router has
// a corresponding entry in the OpenAPI spec, and vice versa. This prevents the
// API documentation from drifting out of sync with the implementation.
func TestAllRoutesDocumented(t *testing.T) {
	router := newTestRouter(t)

	chiRouter, ok := router.(chi.Routes)
	if !ok {
		t.Fatal("router does not implement chi.Routes")
	}

	codeRoutes := map[string]bool{}
	err := chi.Walk(chiRouter, func(method, route string, _ http.Handler, _ ...func(http.Handler) http.Handler) error {
		route = strings.TrimRight(route, "/")
		if route == "" {
			route = "/"
		}
		key := method + " " + route
		if !internalRoutes[key] {
			codeRoutes[key] = true
		}
		return nil
	})
	if err != nil {
		t.Fatalf("chi.Walk failed: %v", err)
	}

	_, thisFile, _, _ := runtime.Caller(0)
	// thisFile is .../server/internal/api/router_test.go
	// Walk up: api -> internal -> server -> repo root
	repoRoot := filepath.Join(filepath.Dir(thisFile), "..", "..", "..")
	specPath := filepath.Join(repoRoot, "docs", "static", "openapi", "featuresignals.json")

	specData, err := os.ReadFile(specPath)
	if err != nil {
		t.Fatalf("failed to read OpenAPI spec at %s: %v", specPath, err)
	}

	var spec struct {
		Paths map[string]map[string]json.RawMessage `json:"paths"`
	}
	if err := json.Unmarshal(specData, &spec); err != nil {
		t.Fatalf("failed to parse OpenAPI spec: %v", err)
	}

	specRoutes := map[string]bool{}
	for path, methods := range spec.Paths {
		for method := range methods {
			upper := strings.ToUpper(method)
			if upper == "PARAMETERS" || upper == "SERVERS" || upper == "SUMMARY" || upper == "DESCRIPTION" {
				continue
			}
			key := upper + " " + path
			specRoutes[key] = true
		}
	}

	var missing []string
	for route := range codeRoutes {
		if !specRoutes[route] {
			missing = append(missing, route)
		}
	}
	sort.Strings(missing)

	var phantom []string
	for route := range specRoutes {
		if !codeRoutes[route] && !internalRoutes[route] {
			phantom = append(phantom, route)
		}
	}
	sort.Strings(phantom)

	if len(missing) > 0 {
		t.Errorf("routes in code but NOT in OpenAPI spec (add to docs/static/openapi/featuresignals.json):\n")
		for _, r := range missing {
			fmt.Fprintf(os.Stderr, "  - %s\n", r)
		}
	}

	if len(phantom) > 0 {
		t.Errorf("routes in OpenAPI spec but NOT in code (remove from docs/static/openapi/featuresignals.json):\n")
		for _, r := range phantom {
			fmt.Fprintf(os.Stderr, "  - %s\n", r)
		}
	}
}
func (noopStore) CreateMagicLinkToken(context.Context, string, string, string, time.Time) error {
	return errNoop
}
func (noopStore) ConsumeMagicLinkToken(context.Context, string) (string, string, error) {
	return "", "", errNoop
}

// ─── OpsStore stubs (required by domain.Store) ────────────────────────

func (noopStore) ListLicenses(context.Context, string, string, string) ([]domain.License, int, error) {
	return nil, 0, nil
}
func (noopStore) GetLicense(context.Context, string) (*domain.License, error) {
	return nil, errNoop
}
func (noopStore) GetLicenseByOrg(context.Context, string) (*domain.License, error) {
	return nil, errNoop
}
func (noopStore) CreateLicense(context.Context, *domain.License) error        { return errNoop }
func (noopStore) UpdateLicense(context.Context, string, map[string]any) error { return errNoop }
func (noopStore) RevokeLicense(context.Context, string, string) error         { return errNoop }
func (noopStore) OverrideLicenseQuota(context.Context, string, map[string]any) error {
	return errNoop
}
func (noopStore) ResetLicenseUsage(context.Context, string) error { return errNoop }
func (noopStore) ListOpsUsers(context.Context) ([]domain.OpsUser, error) {
	return nil, nil
}
func (noopStore) GetOpsUser(context.Context, string) (*domain.OpsUser, error) {
	return nil, errNoop
}
func (noopStore) GetOpsUserByUserID(context.Context, string) (*domain.OpsUser, error) {
	return nil, errNoop
}
func (noopStore) CreateOpsUser(context.Context, *domain.OpsUser) error { return errNoop }
func (noopStore) UpdateOpsUser(context.Context, string, map[string]any) error {
	return errNoop
}
func (noopStore) DeleteOpsUser(context.Context, string) error { return errNoop }

func (noopStore) ListOrgCostDaily(context.Context, string, string, string) ([]domain.OrgCostDaily, error) {
	return nil, nil
}

func (noopStore) ListOpsAuditLogs(context.Context, string, string, string, string, string, int, int) ([]domain.OpsAuditLog, int, error) {
	return nil, 0, nil
}
func (noopStore) CreateOpsAuditLog(context.Context, *domain.OpsAuditLog) error { return errNoop }

func (noopStore) CreateIntegration(context.Context, domain.CreateIntegrationRequest) (*domain.Integration, error) {
	return nil, nil
}
func (noopStore) GetIntegration(context.Context, string, string) (*domain.Integration, error) {
	return nil, nil
}
func (noopStore) ListIntegrations(context.Context, string) ([]domain.Integration, error) {
	return nil, nil
}
func (noopStore) UpdateIntegration(context.Context, string, string, domain.UpdateIntegrationRequest) (*domain.Integration, error) {
	return nil, nil
}
func (noopStore) DeleteIntegration(context.Context, string, string) error {
	return nil
}
func (noopStore) TestIntegration(context.Context, string) (*domain.IntegrationDelivery, error) {
	return nil, nil
}
func (noopStore) ListDeliveries(context.Context, string, int) ([]domain.IntegrationDelivery, error) {
	return nil, nil
}

func (noopStore) CreateOpsCredentials(context.Context, string, string, string) error { return nil }
func (noopStore) GetOpsUserByEmail(context.Context, string) (*domain.OpsUser, error) { return nil, nil }
func (noopStore) CreateOpsSession(context.Context, string, string, time.Time) (string, error) {
	return "", nil
}
func (noopStore) GetOpsSessionByRefreshToken(context.Context, string) (*domain.OpsUser, error) {
	return nil, nil
}
func (noopStore) DeleteOpsSession(context.Context, string, string) error { return nil }
func (noopStore) DeleteAllOpsSessions(context.Context, string) error     { return nil }
