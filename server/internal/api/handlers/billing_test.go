package handlers

import (
	"context"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/payment"
)

func _testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(io.Discard, nil))
}

func billingCtx(r *http.Request, orgID, userID string) context.Context {
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, userID)
	return context.WithValue(ctx, middleware.OrgIDKey, orgID)
}

type mockGateway struct {
	name              string
	checkoutResult    *payment.CheckoutResult
	checkoutErr       error
	webhookEvent      *payment.WebhookEvent
	webhookErr        error
	subscriptionDetail *payment.SubscriptionDetail
	subscriptionErr   error
	cancelErr         error
	portalURL         string
	portalErr         error
}

func (g *mockGateway) Name() string { return g.name }
func (g *mockGateway) CreateCheckoutSession(_ context.Context, _ payment.CheckoutRequest) (*payment.CheckoutResult, error) {
	return g.checkoutResult, g.checkoutErr
}
func (g *mockGateway) HandleWebhook(_ context.Context, _ []byte, _ string) (*payment.WebhookEvent, error) {
	return g.webhookEvent, g.webhookErr
}
func (g *mockGateway) GetSubscription(_ context.Context, _ string) (*payment.SubscriptionDetail, error) {
	return g.subscriptionDetail, g.subscriptionErr
}
func (g *mockGateway) CancelSubscription(_ context.Context, _ string, _ bool) error {
	return g.cancelErr
}
func (g *mockGateway) CreateBillingPortalURL(_ context.Context, _, _ string) (string, error) {
	return g.portalURL, g.portalErr
}

func TestBillingHandler_CreateCheckout_StripeRedirect(t *testing.T) {
	store := newMockStore()
	orgID := store.nextID()
	userID := store.nextID()
	store.orgs[orgID] = &domain.Organization{
		ID: orgID, Name: "Test Org", Plan: domain.PlanFree, PaymentGateway: domain.GatewayStripe,
	}
	store.users[userID] = &domain.User{ID: userID, Email: "user@test.com", Name: "Test User"}

	stripeGW := &mockGateway{
		name: "stripe",
		checkoutResult: &payment.CheckoutResult{
			Gateway:     "stripe",
			SessionID:   "cs_test_123",
			RedirectURL: "https://checkout.stripe.com/pay/cs_test_123",
		},
	}

	registry := payment.NewRegistry()
	registry.Register(stripeGW)

	h := NewBillingHandler(store, registry, "https://app.example.com", "https://api.example.com", testLogger(), nil, nil)

	req := httptest.NewRequest(http.MethodPost, "/v1/billing/checkout", nil)
	ctx := billingCtx(req, orgID, userID)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	h.CreateCheckout(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp["gateway"] != "stripe" {
		t.Errorf("gateway = %v, want stripe", resp["gateway"])
	}
	if resp["redirect_url"] != "https://checkout.stripe.com/pay/cs_test_123" {
		t.Errorf("redirect_url = %v, want checkout URL", resp["redirect_url"])
	}
}

func TestBillingHandler_CreateCheckout_PayUFormFields(t *testing.T) {
	store := newMockStore()
	orgID := store.nextID()
	userID := store.nextID()
	store.orgs[orgID] = &domain.Organization{
		ID: orgID, Name: "Test Org", Plan: domain.PlanFree, PaymentGateway: domain.GatewayPayU,
	}
	store.users[userID] = &domain.User{ID: userID, Email: "user@test.com", Name: "Test User"}

	payuGW := &mockGateway{
		name: "payu",
		checkoutResult: &payment.CheckoutResult{
			Gateway:   "payu",
			SessionID: "FS_test_123",
			GatewayData: map[string]string{
				"payu_url": "https://test.payu.in/_payment",
				"key":      "merchant_key",
				"txnid":    "FS_test_123",
				"hash":     "abc123hash",
				"amount":   "1999.00",
			},
		},
	}

	registry := payment.NewRegistry()
	registry.Register(payuGW)

	h := NewBillingHandler(store, registry, "https://app.example.com", "https://api.example.com", testLogger(), nil, nil)

	req := httptest.NewRequest(http.MethodPost, "/v1/billing/checkout", nil)
	ctx := billingCtx(req, orgID, userID)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	h.CreateCheckout(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var resp map[string]interface{}
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to unmarshal response: %v", err)
	}
	if resp["gateway"] != "payu" {
		t.Errorf("gateway = %v, want payu", resp["gateway"])
	}
	if resp["payu_url"] != "https://test.payu.in/_payment" {
		t.Errorf("payu_url = %v, want test endpoint", resp["payu_url"])
	}
}

func TestBillingHandler_CreateCheckout_GatewayNotFound(t *testing.T) {
	store := newMockStore()
	orgID := store.nextID()
	userID := store.nextID()
	store.orgs[orgID] = &domain.Organization{
		ID: orgID, Name: "Test Org", Plan: domain.PlanFree, PaymentGateway: "razorpay",
	}
	store.users[userID] = &domain.User{ID: userID, Email: "user@test.com", Name: "Test User"}

	registry := payment.NewRegistry()

	h := NewBillingHandler(store, registry, "https://app.example.com", "https://api.example.com", testLogger(), nil, nil)

	req := httptest.NewRequest(http.MethodPost, "/v1/billing/checkout", nil)
	ctx := billingCtx(req, orgID, userID)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	h.CreateCheckout(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestBillingHandler_GetSubscription_WithActiveSubscription(t *testing.T) {
	store := newMockStore()
	orgID := store.nextID()
	userID := store.nextID()
	store.orgs[orgID] = &domain.Organization{
		ID: orgID, Name: "Test Org", Plan: domain.PlanPro,
		PlanSeatsLimit: 100, PlanProjectsLimit: 50, PlanEnvironmentsLimit: 200,
		PaymentGateway: domain.GatewayStripe,
	}
	store.users[userID] = &domain.User{ID: userID, Email: "user@test.com", Name: "Test"}

	registry := payment.NewRegistry()
	h := NewBillingHandler(store, registry, "https://app.example.com", "https://api.example.com", testLogger(), nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/v1/billing/subscription", nil)
	ctx := billingCtx(req, orgID, userID)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	h.GetSubscription(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &resp)

	if resp["plan"] != "pro" {
		t.Errorf("plan = %v, want pro", resp["plan"])
	}
	if resp["gateway"] != "stripe" {
		t.Errorf("gateway = %v, want stripe", resp["gateway"])
	}
}

func TestBillingHandler_GetUsage(t *testing.T) {
	store := newMockStore()
	orgID := store.nextID()
	userID := store.nextID()
	store.orgs[orgID] = &domain.Organization{
		ID: orgID, Name: "Test Org", Plan: domain.PlanFree,
		PlanSeatsLimit: 3, PlanProjectsLimit: 1, PlanEnvironmentsLimit: 2,
	}
	store.users[userID] = &domain.User{ID: userID, Email: "user@test.com"}

	registry := payment.NewRegistry()
	h := NewBillingHandler(store, registry, "https://app.example.com", "https://api.example.com", testLogger(), nil, nil)

	req := httptest.NewRequest(http.MethodGet, "/v1/billing/usage", nil)
	ctx := billingCtx(req, orgID, userID)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	h.GetUsage(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d", rec.Code, http.StatusOK)
	}
}

func TestBillingHandler_UpdateGateway_Valid(t *testing.T) {
	store := newMockStore()
	orgID := store.nextID()
	userID := store.nextID()
	store.orgs[orgID] = &domain.Organization{
		ID: orgID, Name: "Test Org", PaymentGateway: domain.GatewayPayU,
	}

	stripeGW := &mockGateway{name: "stripe"}
	payuGW := &mockGateway{name: "payu"}

	registry := payment.NewRegistry()
	registry.Register(stripeGW)
	registry.Register(payuGW)

	h := NewBillingHandler(store, registry, "https://app.example.com", "https://api.example.com", testLogger(), nil, nil)

	body := `{"gateway":"stripe"}`
	req := httptest.NewRequest(http.MethodPut, "/v1/billing/gateway", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := billingCtx(req, orgID, userID)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	h.UpdateGateway(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want %d, body: %s", rec.Code, http.StatusOK, rec.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp["gateway"] != "stripe" {
		t.Errorf("gateway = %v, want stripe", resp["gateway"])
	}
}

func TestBillingHandler_UpdateGateway_InvalidGateway(t *testing.T) {
	store := newMockStore()
	orgID := store.nextID()
	userID := store.nextID()
	store.orgs[orgID] = &domain.Organization{
		ID: orgID, Name: "Test Org", PaymentGateway: domain.GatewayPayU,
	}

	registry := payment.NewRegistry()
	registry.Register(&mockGateway{name: "payu"})

	h := NewBillingHandler(store, registry, "https://app.example.com", "https://api.example.com", testLogger(), nil, nil)

	body := `{"gateway":"razorpay"}`
	req := httptest.NewRequest(http.MethodPut, "/v1/billing/gateway", strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	ctx := billingCtx(req, orgID, userID)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	h.UpdateGateway(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusBadRequest)
	}
}

func TestBillingHandler_CancelSubscription_PayUReturnsError(t *testing.T) {
	store := newMockStore()
	orgID := store.nextID()
	userID := store.nextID()
	store.orgs[orgID] = &domain.Organization{
		ID: orgID, Name: "Test Org", Plan: domain.PlanPro, PaymentGateway: domain.GatewayPayU,
	}

	// Override GetSubscription to return a PayU subscription
	origGetSub := store.GetSubscription
	_ = origGetSub

	registry := payment.NewRegistry()
	registry.Register(&mockGateway{name: "payu"})

	h := NewBillingHandler(store, registry, "https://app.example.com", "https://api.example.com", testLogger(), nil, nil)

	req := httptest.NewRequest(http.MethodPost, "/v1/billing/cancel", strings.NewReader(`{}`))
	req.Header.Set("Content-Type", "application/json")
	ctx := billingCtx(req, orgID, userID)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	h.CancelSubscription(rec, req)

	// Should return not found since default mockStore returns ErrNotFound
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestBillingHandler_GetBillingPortalURL_NotStripe(t *testing.T) {
	store := newMockStore()
	orgID := store.nextID()
	userID := store.nextID()
	store.orgs[orgID] = &domain.Organization{
		ID: orgID, Name: "Test Org", Plan: domain.PlanPro, PaymentGateway: domain.GatewayPayU,
	}

	registry := payment.NewRegistry()
	registry.Register(&mockGateway{name: "payu"})

	h := NewBillingHandler(store, registry, "https://app.example.com", "https://api.example.com", testLogger(), nil, nil)

	req := httptest.NewRequest(http.MethodPost, "/v1/billing/portal", nil)
	ctx := billingCtx(req, orgID, userID)
	req = req.WithContext(ctx)
	rec := httptest.NewRecorder()

	h.GetBillingPortalURL(rec, req)

	// Should return not found since default mockStore returns ErrNotFound for subscription
	if rec.Code != http.StatusNotFound {
		t.Errorf("status = %d, want %d", rec.Code, http.StatusNotFound)
	}
}

func TestSplitTxnID(t *testing.T) {
	tests := []struct {
		name    string
		txnid   string
		wantNil bool
		wantOrg string
	}{
		{"valid", "FS_abc12345_1700000000", false, "abc12345"},
		{"short_prefix", "FS_ab_1700000000", false, "ab"},
		{"no_prefix", "RANDOM_123", true, ""},
		{"empty", "", true, ""},
		{"too_short", "FS", true, ""},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			parts := splitTxnID(tc.txnid)
			if tc.wantNil {
				if parts != nil {
					t.Errorf("expected nil for %q", tc.txnid)
				}
				return
			}
			if parts == nil {
				t.Fatalf("expected non-nil for %q", tc.txnid)
			}
			if parts.orgPrefix != tc.wantOrg {
				t.Errorf("orgPrefix = %q, want %q", parts.orgPrefix, tc.wantOrg)
			}
		})
	}
}
