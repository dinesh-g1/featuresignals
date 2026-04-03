package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
)

func newTestDemoHandler() (*DemoHandler, *mockStore) {
	store := newMockStore()
	jwtMgr := auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	return NewDemoHandler(DemoHandlerConfig{
		Store:  store,
		JWTMgr: jwtMgr,
		Logger: nil,
	}), store
}

func TestDemoHandler_CreateSession_ReturnsGone(t *testing.T) {
	h, _ := newTestDemoHandler()

	r := httptest.NewRequest("POST", "/v1/demo/session", nil)
	w := httptest.NewRecorder()
	h.CreateSession(w, r)

	if w.Code != http.StatusGone {
		t.Fatalf("expected 410 Gone, got %d: %s", w.Code, w.Body.String())
	}

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)
	if result["error"] != "demo_sessions_deprecated" {
		t.Errorf("expected demo_sessions_deprecated error, got %v", result["error"])
	}
}

// setupDemoUser creates a demo user and org directly in the store for testing
// Convert, SelectPlan, and other demo endpoints that still need an existing demo user.
func setupDemoUser(t *testing.T, store *mockStore) (userID, orgID string) {
	t.Helper()
	ctx := context.Background()

	user := &domain.User{
		Email:        "demo-test@demo.featuresignals.com",
		PasswordHash: "$2a$10$dummyhash",
		Name:         "Demo User",
		IsDemo:       true,
	}
	if err := store.CreateUser(ctx, user); err != nil {
		t.Fatalf("failed to create demo user: %v", err)
	}

	demoExpires := time.Now().Add(7 * 24 * time.Hour)
	org := &domain.Organization{
		Name:          "Demo Organization",
		Slug:          "demo-test",
		IsDemo:        true,
		DemoExpiresAt: &demoExpires,
	}
	if err := store.CreateOrganization(ctx, org); err != nil {
		t.Fatalf("failed to create demo org: %v", err)
	}

	member := &domain.OrgMember{OrgID: org.ID, UserID: user.ID, Role: domain.RoleOwner}
	if err := store.AddOrgMember(ctx, member); err != nil {
		t.Fatalf("failed to add demo org member: %v", err)
	}

	return user.ID, org.ID
}

func TestDemoHandler_Convert(t *testing.T) {
	h, store := newTestDemoHandler()
	userID, orgID := setupDemoUser(t, store)

	body := `{"email":"real@company.com","password":"Secure@123","name":"Real User","org_name":"Real Company"}`
	r := httptest.NewRequest("POST", "/v1/demo/convert", strings.NewReader(body))
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.OrgIDKey, orgID)
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()
	h.Convert(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)
	if result["tokens"] == nil {
		t.Error("expected tokens in response")
	}

	store.mu.RLock()
	u := store.users[userID]
	o := store.orgs[orgID]
	store.mu.RUnlock()

	if u.IsDemo {
		t.Error("user should no longer be demo after conversion")
	}
	if u.Email != "real@company.com" {
		t.Errorf("email should be updated, got %s", u.Email)
	}
	if o.IsDemo {
		t.Error("org should no longer be demo after conversion")
	}
	if o.Name != "Real Company" {
		t.Errorf("org name should be updated, got %s", o.Name)
	}
	if o.DemoExpiresAt != nil {
		t.Error("demo_expires_at should be cleared")
	}
}

func TestDemoHandler_Convert_MissingFields(t *testing.T) {
	h, _ := newTestDemoHandler()

	// Phone is optional when EnablePhoneVerification is false
	tests := []struct {
		name string
		body string
	}{
		{"missing email", `{"password":"Secure@123","name":"Test","org_name":"Org"}`},
		{"missing password", `{"email":"t@t.com","name":"Test","org_name":"Org"}`},
		{"missing name", `{"email":"t@t.com","password":"Secure@123","org_name":"Org"}`},
		{"missing org_name", `{"email":"t@t.com","password":"Secure@123","name":"Test"}`},
		{"weak password", `{"email":"t@t.com","password":"weak","name":"Test","org_name":"Org"}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/v1/demo/convert", strings.NewReader(tt.body))
			ctx := context.WithValue(r.Context(), middleware.UserIDKey, "u1")
			ctx = context.WithValue(ctx, middleware.OrgIDKey, "o1")
			r = r.WithContext(ctx)
			w := httptest.NewRecorder()
			h.Convert(w, r)
			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", w.Code)
			}
		})
	}
}

func TestDemoHandler_Convert_DuplicateEmail(t *testing.T) {
	h, store := newTestDemoHandler()
	userID1, orgID1 := setupDemoUser(t, store)

	body1 := `{"email":"taken@company.com","password":"Secure@123","name":"User 1","org_name":"Org 1"}`
	req1 := httptest.NewRequest("POST", "/v1/demo/convert", strings.NewReader(body1))
	ctx1 := context.WithValue(req1.Context(), middleware.UserIDKey, userID1)
	ctx1 = context.WithValue(ctx1, middleware.OrgIDKey, orgID1)
	req1 = req1.WithContext(ctx1)
	w1 := httptest.NewRecorder()
	h.Convert(w1, req1)
	if w1.Code != http.StatusOK {
		t.Fatalf("first convert failed: %d: %s", w1.Code, w1.Body.String())
	}

	// Create a second demo user to try same email
	user2 := &domain.User{Email: "demo2@demo.featuresignals.com", PasswordHash: "$2a$10$dummyhash", Name: "Demo 2", IsDemo: true}
	store.CreateUser(context.Background(), user2)
	demoExpires := time.Now().Add(7 * 24 * time.Hour)
	org2 := &domain.Organization{Name: "Demo 2", Slug: "demo-2", IsDemo: true, DemoExpiresAt: &demoExpires}
	store.CreateOrganization(context.Background(), org2)
	store.AddOrgMember(context.Background(), &domain.OrgMember{OrgID: org2.ID, UserID: user2.ID, Role: domain.RoleOwner})

	body2 := `{"email":"taken@company.com","password":"Secure@123","name":"User 2","org_name":"Org 2"}`
	req2 := httptest.NewRequest("POST", "/v1/demo/convert", strings.NewReader(body2))
	ctx2 := context.WithValue(req2.Context(), middleware.UserIDKey, user2.ID)
	ctx2 = context.WithValue(ctx2, middleware.OrgIDKey, org2.ID)
	req2 = req2.WithContext(ctx2)
	w2 := httptest.NewRecorder()
	h.Convert(w2, req2)
	if w2.Code != http.StatusConflict {
		t.Errorf("expected 409 for duplicate email, got %d", w2.Code)
	}
}

func TestDemoHandler_Feedback(t *testing.T) {
	h, _ := newTestDemoHandler()

	body := `{"message":"Great product!","rating":5,"email":"user@test.com"}`
	r := httptest.NewRequest("POST", "/v1/demo/feedback", strings.NewReader(body))
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, "u1")
	ctx = context.WithValue(ctx, middleware.OrgIDKey, "o1")
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()
	h.Feedback(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
}

func TestDemoHandler_Feedback_MissingMessage(t *testing.T) {
	h, _ := newTestDemoHandler()

	body := `{"rating":3}`
	r := httptest.NewRequest("POST", "/v1/demo/feedback", strings.NewReader(body))
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, "u1")
	ctx = context.WithValue(ctx, middleware.OrgIDKey, "o1")
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()
	h.Feedback(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestSampleDataContents_ViaRegister(t *testing.T) {
	store := newMockStore()
	jwtMgr := auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	h := NewAuthHandler(store, jwtMgr, nil, nil, "http://localhost:8080", "http://localhost:3000")

	body := `{"email":"sampledata@test.com","password":"Secure@123","name":"Test","org_name":"Org","source":"demo"}`
	r := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(body))
	w := httptest.NewRecorder()
	h.Register(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	store.mu.RLock()
	defer store.mu.RUnlock()

	expectedFlags := map[string]bool{
		"dark-mode": false, "new-checkout-flow": false, "pricing-experiment": false,
		"api-rate-limit": false, "maintenance-mode": false, "beta-features": false,
	}
	for key := range store.flags {
		parts := strings.SplitN(key, ":", 2)
		if len(parts) == 2 {
			expectedFlags[parts[1]] = true
		}
	}
	for key, found := range expectedFlags {
		if !found {
			t.Errorf("expected sample flag %q not found", key)
		}
	}

	foundBetaSegment := false
	for key := range store.segments {
		if strings.HasSuffix(key, ":beta-users") {
			foundBetaSegment = true
		}
	}
	if !foundBetaSegment {
		t.Error("expected 'beta-users' segment")
	}
}

func TestDemoHandler_SelectPlan_Free(t *testing.T) {
	h, store := newTestDemoHandler()
	h.dashboardURL = "https://app.featuresignals.com"
	userID, orgID := setupDemoUser(t, store)

	// First convert the demo
	convBody := `{"email":"test@company.com","password":"Secure@123","name":"Test","org_name":"Test Org"}`
	convReq := httptest.NewRequest("POST", "/v1/demo/convert", strings.NewReader(convBody))
	ctx := context.WithValue(convReq.Context(), middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.OrgIDKey, orgID)
	convReq = convReq.WithContext(ctx)
	convW := httptest.NewRecorder()
	h.Convert(convW, convReq)
	if convW.Code != http.StatusOK {
		t.Fatalf("convert failed: %d %s", convW.Code, convW.Body.String())
	}

	// Select free plan with data retention
	planBody := `{"plan":"free","retain_data":true}`
	planReq := httptest.NewRequest("POST", "/v1/demo/select-plan", strings.NewReader(planBody))
	ctx = context.WithValue(planReq.Context(), middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.OrgIDKey, orgID)
	planReq = planReq.WithContext(ctx)
	planW := httptest.NewRecorder()
	h.SelectPlan(planW, planReq)

	if planW.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", planW.Code, planW.Body.String())
	}

	var planResult map[string]interface{}
	json.Unmarshal(planW.Body.Bytes(), &planResult)
	if planResult["plan"] != "free" {
		t.Errorf("expected free plan, got %v", planResult["plan"])
	}
	redirectURL, ok := planResult["redirect_url"].(string)
	if !ok || redirectURL == "" {
		t.Error("expected redirect_url for free plan")
	}
	if !strings.Contains(redirectURL, "/auth/exchange?token=") {
		t.Errorf("redirect should contain /auth/exchange?token=, got %s", redirectURL)
	}

	store.mu.RLock()
	o := store.orgs[orgID]
	store.mu.RUnlock()
	if o.Plan != "free" {
		t.Errorf("org plan should be free, got %s", o.Plan)
	}
}

func TestDemoHandler_SelectPlan_Pro(t *testing.T) {
	h, store := newTestDemoHandler()
	h.payu = PayUHasher{MerchantKey: "test_key", Salt: "test_salt"}
	h.payuMode = "test"
	h.appBaseURL = "https://api.featuresignals.com"
	userID, orgID := setupDemoUser(t, store)

	// Convert first
	convBody := `{"email":"pro@company.com","password":"Secure@123","name":"Pro User","org_name":"Pro Org"}`
	convReq := httptest.NewRequest("POST", "/v1/demo/convert", strings.NewReader(convBody))
	ctx := context.WithValue(convReq.Context(), middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.OrgIDKey, orgID)
	convReq = convReq.WithContext(ctx)
	convW := httptest.NewRecorder()
	h.Convert(convW, convReq)

	// Select pro plan
	planBody := `{"plan":"pro","retain_data":false}`
	planReq := httptest.NewRequest("POST", "/v1/demo/select-plan", strings.NewReader(planBody))
	ctx = context.WithValue(planReq.Context(), middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.OrgIDKey, orgID)
	planReq = planReq.WithContext(ctx)
	planW := httptest.NewRecorder()
	h.SelectPlan(planW, planReq)

	if planW.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", planW.Code, planW.Body.String())
	}

	var planResult map[string]string
	json.Unmarshal(planW.Body.Bytes(), &planResult)
	if planResult["plan"] != "pro" {
		t.Errorf("expected pro plan, got %s", planResult["plan"])
	}
	if planResult["payu_url"] == "" {
		t.Error("expected payu_url for pro plan")
	}
	if planResult["key"] != "test_key" {
		t.Errorf("expected test_key, got %s", planResult["key"])
	}
	if !strings.HasPrefix(planResult["txnid"], "DEMO_") {
		t.Errorf("demo checkout txnid should start with DEMO_, got %s", planResult["txnid"])
	}
	if planResult["hash"] == "" {
		t.Error("expected non-empty hash")
	}
}

func TestDemoHandler_SelectPlan_InvalidPlan(t *testing.T) {
	h, _ := newTestDemoHandler()

	body := `{"plan":"enterprise","retain_data":true}`
	r := httptest.NewRequest("POST", "/v1/demo/select-plan", strings.NewReader(body))
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, "u1")
	ctx = context.WithValue(ctx, middleware.OrgIDKey, "o1")
	r = r.WithContext(ctx)
	w := httptest.NewRecorder()
	h.SelectPlan(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestDemoHandler_Cleanup(t *testing.T) {
	_, store := newTestDemoHandler()
	_, orgID := setupDemoUser(t, store)

	store.mu.Lock()
	expired := time.Now().Add(-1 * time.Hour)
	store.orgs[orgID].DemoExpiresAt = &expired
	store.mu.Unlock()

	count, err := store.DeleteExpiredDemoOrgs(context.Background(), time.Now())
	if err != nil {
		t.Fatalf("cleanup failed: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 deleted org, got %d", count)
	}

	store.mu.RLock()
	_, exists := store.orgs[orgID]
	store.mu.RUnlock()
	if exists {
		t.Error("expired demo org should be deleted")
	}
}
