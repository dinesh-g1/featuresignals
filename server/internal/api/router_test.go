package api_test

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/api"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/metrics"
	"github.com/featuresignals/server/internal/payment"
	"github.com/featuresignals/server/internal/sse"
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
func (noopStore) DeleteProject(context.Context, string) error { return errNoop }

func (noopStore) CreateEnvironment(context.Context, *domain.Environment) error { return errNoop }
func (noopStore) ListEnvironments(context.Context, string) ([]domain.Environment, error) {
	return nil, errNoop
}
func (noopStore) GetEnvironment(context.Context, string) (*domain.Environment, error) {
	return nil, errNoop
}
func (noopStore) DeleteEnvironment(context.Context, string) error { return errNoop }

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
func (noopStore) RevokeAPIKey(context.Context, string) error        { return errNoop }
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
func (noopStore) PurgeAuditEntries(context.Context, time.Time) (int, error) { return 0, errNoop }
func (noopStore) ListAuditEntries(context.Context, string, int, int) ([]domain.AuditEntry, error) {
	return nil, errNoop
}
func (noopStore) ListAuditEntriesForExport(context.Context, string, string, string) ([]domain.AuditEntry, error) {
	return nil, errNoop
}
func (noopStore) GetLastAuditHash(context.Context, string) (string, error) { return "", errNoop }

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
func (noopStore) IncrementPendingAttempts(context.Context, string) error { return errNoop }
func (noopStore) DeletePendingRegistration(context.Context, string) error { return errNoop }
func (noopStore) DeleteExpiredPendingRegistrations(context.Context, time.Time) (int, error) {
	return 0, errNoop
}
func (noopStore) UpdateLastLoginAt(context.Context, string) error         { return errNoop }
func (noopStore) SoftDeleteOrganization(context.Context, string) error    { return errNoop }
func (noopStore) RestoreOrganization(context.Context, string) error       { return errNoop }
func (noopStore) ListSoftDeletedOrgs(context.Context, time.Time) ([]domain.Organization, error) {
	return nil, errNoop
}
func (noopStore) HardDeleteOrganization(context.Context, string) error { return errNoop }
func (noopStore) ListInactiveOrgs(context.Context, string, time.Time) ([]domain.Organization, error) {
	return nil, errNoop
}
func (noopStore) DowngradeOrgToFree(context.Context, string) error        { return errNoop }
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
func (noopStore) CleanExpiredRevocations(context.Context) error                         { return nil }
func (noopStore) UpsertMFASecret(context.Context, string, string) error                { return nil }
func (noopStore) GetMFASecret(context.Context, string) (*domain.MFASecret, error) {
	return nil, errNoop
}
func (noopStore) EnableMFA(context.Context, string) error                                  { return nil }
func (noopStore) DisableMFA(context.Context, string) error                                 { return nil }
func (noopStore) RecordLoginAttempt(context.Context, string, string, string, bool) error    { return nil }
func (noopStore) CountRecentFailedAttempts(context.Context, string, time.Time) (int, error) { return 0, nil }
func (noopStore) GetIPAllowlist(context.Context, string) (bool, []string, error)            { return false, nil, nil }
func (noopStore) UpsertIPAllowlist(context.Context, string, bool, []string) error           { return nil }
func (noopStore) CreateCustomRole(context.Context, *domain.CustomRole) error                { return errNoop }
func (noopStore) GetCustomRole(context.Context, string) (*domain.CustomRole, error)         { return nil, errNoop }
func (noopStore) ListCustomRoles(context.Context, string) ([]domain.CustomRole, error)      { return nil, errNoop }
func (noopStore) UpdateCustomRole(context.Context, *domain.CustomRole) error                { return errNoop }
func (noopStore) DeleteCustomRole(context.Context, string) error                            { return errNoop }
func (noopStore) SoftDeleteUser(context.Context, string) error                              { return errNoop }

type noopOTPEmail struct{}

func (noopOTPEmail) SendOTP(context.Context, string, string, string) error { return nil }

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

	return api.NewRouter(
		store,
		jwtMgr,
		evalCache,
		engine,
		sseServer,
		logger,
		[]string{"*"},
		metricsCollector,
		api.BillingConfig{Registry: payment.NewRegistry()},
		noopOTPEmail{},
		"http://localhost:8080",
		"http://localhost:3000",
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

func TestSecurityHeaders(t *testing.T) {
	router := newTestRouter(t)

	req := httptest.NewRequest(http.MethodGet, "/health", nil)
	w := httptest.NewRecorder()
	router.ServeHTTP(w, req)

	expectedHeaders := map[string]string{
		"X-Content-Type-Options":       "nosniff",
		"X-Frame-Options":              "DENY",
		"Cross-Origin-Opener-Policy":   "same-origin",
		"Cross-Origin-Resource-Policy": "same-origin",
		"Cross-Origin-Embedder-Policy": "require-corp",
		"Content-Security-Policy":      "default-src 'none'; frame-ancestors 'none'",
	}

	for header, want := range expectedHeaders {
		got := w.Header().Get(header)
		if got != want {
			t.Errorf("header %s: expected %q, got %q", header, want, got)
		}
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
