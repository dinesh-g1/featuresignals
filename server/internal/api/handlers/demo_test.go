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

func TestDemoHandler_CreateSession(t *testing.T) {
	h, store := newTestDemoHandler()

	r := httptest.NewRequest("POST", "/v1/demo/session", nil)
	w := httptest.NewRecorder()
	h.CreateSession(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)

	if result["user"] == nil {
		t.Error("expected user in response")
	}
	if result["tokens"] == nil {
		t.Error("expected tokens in response")
	}
	if result["organization"] == nil {
		t.Error("expected organization in response")
	}
	if result["demo_expires_at"] == nil {
		t.Error("expected demo_expires_at in response")
	}

	expiresAt := result["demo_expires_at"].(float64)
	if expiresAt < float64(time.Now().Add(6*24*time.Hour).Unix()) {
		t.Error("demo_expires_at should be ~7 days in the future")
	}

	user := result["user"].(map[string]interface{})
	if !user["is_demo"].(bool) {
		t.Error("user should be marked as demo")
	}

	org := result["organization"].(map[string]interface{})
	if !org["is_demo"].(bool) {
		t.Error("organization should be marked as demo")
	}

	store.mu.RLock()
	flagCount := len(store.flags)
	segCount := len(store.segments)
	envCount := 0
	for range store.envs {
		envCount++
	}
	store.mu.RUnlock()

	if flagCount < 5 {
		t.Errorf("expected at least 5 sample flags, got %d", flagCount)
	}
	if segCount < 1 {
		t.Errorf("expected at least 1 sample segment, got %d", segCount)
	}
	if envCount < 3 {
		t.Errorf("expected at least 3 environments, got %d", envCount)
	}
}

func TestDemoHandler_CreateSession_GeneratesDemoJWT(t *testing.T) {
	h, _ := newTestDemoHandler()
	jwtMgr := auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	r := httptest.NewRequest("POST", "/v1/demo/session", nil)
	w := httptest.NewRecorder()
	h.CreateSession(w, r)

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)
	tokens := result["tokens"].(map[string]interface{})
	accessToken := tokens["access_token"].(string)

	claims, err := jwtMgr.ValidateToken(accessToken)
	if err != nil {
		t.Fatalf("failed to validate demo token: %v", err)
	}
	if !claims.Demo {
		t.Error("demo claim should be true")
	}
	if claims.DemoExpiresAt == 0 {
		t.Error("demo_expires_at claim should be set")
	}
}

func TestDemoHandler_Convert(t *testing.T) {
	h, store := newTestDemoHandler()

	createReq := httptest.NewRequest("POST", "/v1/demo/session", nil)
	createW := httptest.NewRecorder()
	h.CreateSession(createW, createReq)

	var createResult map[string]interface{}
	json.Unmarshal(createW.Body.Bytes(), &createResult)
	user := createResult["user"].(map[string]interface{})
	org := createResult["organization"].(map[string]interface{})
	userID := user["id"].(string)
	orgID := org["id"].(string)

	body := `{"email":"real@company.com","password":"Secure@123","name":"Real User","org_name":"Real Company","phone":"+15551234567"}`
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

	tests := []struct {
		name string
		body string
	}{
		{"missing email", `{"password":"Secure@123","name":"Test","org_name":"Org","phone":"+15551234567"}`},
		{"missing password", `{"email":"t@t.com","name":"Test","org_name":"Org","phone":"+15551234567"}`},
		{"missing name", `{"email":"t@t.com","password":"Secure@123","org_name":"Org","phone":"+15551234567"}`},
		{"missing org_name", `{"email":"t@t.com","password":"Secure@123","name":"Test","phone":"+15551234567"}`},
		{"missing phone", `{"email":"t@t.com","password":"Secure@123","name":"Test","org_name":"Org"}`},
		{"weak password", `{"email":"t@t.com","password":"weak","name":"Test","org_name":"Org","phone":"+15551234567"}`},
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
	h, _ := newTestDemoHandler()

	createReq := httptest.NewRequest("POST", "/v1/demo/session", nil)
	createW := httptest.NewRecorder()
	h.CreateSession(createW, createReq)
	var r1 map[string]interface{}
	json.Unmarshal(createW.Body.Bytes(), &r1)
	u1 := r1["user"].(map[string]interface{})
	o1 := r1["organization"].(map[string]interface{})

	body1 := `{"email":"taken@company.com","password":"Secure@123","name":"User 1","org_name":"Org 1","phone":"+15551111111"}`
	req1 := httptest.NewRequest("POST", "/v1/demo/convert", strings.NewReader(body1))
	ctx1 := context.WithValue(req1.Context(), middleware.UserIDKey, u1["id"].(string))
	ctx1 = context.WithValue(ctx1, middleware.OrgIDKey, o1["id"].(string))
	req1 = req1.WithContext(ctx1)
	w1 := httptest.NewRecorder()
	h.Convert(w1, req1)
	if w1.Code != http.StatusOK {
		t.Fatalf("first convert failed: %d", w1.Code)
	}

	createReq2 := httptest.NewRequest("POST", "/v1/demo/session", nil)
	createW2 := httptest.NewRecorder()
	h.CreateSession(createW2, createReq2)
	var r2 map[string]interface{}
	json.Unmarshal(createW2.Body.Bytes(), &r2)
	u2 := r2["user"].(map[string]interface{})
	o2 := r2["organization"].(map[string]interface{})

	body2 := `{"email":"taken@company.com","password":"Secure@123","name":"User 2","org_name":"Org 2","phone":"+15552222222"}`
	req2 := httptest.NewRequest("POST", "/v1/demo/convert", strings.NewReader(body2))
	ctx2 := context.WithValue(req2.Context(), middleware.UserIDKey, u2["id"].(string))
	ctx2 = context.WithValue(ctx2, middleware.OrgIDKey, o2["id"].(string))
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

func TestDemoHandler_SampleDataContents(t *testing.T) {
	h, store := newTestDemoHandler()

	r := httptest.NewRequest("POST", "/v1/demo/session", nil)
	w := httptest.NewRecorder()
	h.CreateSession(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
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

	createReq := httptest.NewRequest("POST", "/v1/demo/session", nil)
	createW := httptest.NewRecorder()
	h.CreateSession(createW, createReq)

	var createResult map[string]interface{}
	json.Unmarshal(createW.Body.Bytes(), &createResult)
	user := createResult["user"].(map[string]interface{})
	org := createResult["organization"].(map[string]interface{})
	userID := user["id"].(string)
	orgID := org["id"].(string)

	// First convert the demo
	convBody := `{"email":"test@company.com","password":"Secure@123","name":"Test","org_name":"Test Org","phone":"+15551234567"}`
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
	h, _ := newTestDemoHandler()
	h.payuMerchantKey = "test_key"
	h.payuSalt = "test_salt"
	h.payuMode = "test"
	h.appBaseURL = "https://api.featuresignals.com"

	createReq := httptest.NewRequest("POST", "/v1/demo/session", nil)
	createW := httptest.NewRecorder()
	h.CreateSession(createW, createReq)

	var createResult map[string]interface{}
	json.Unmarshal(createW.Body.Bytes(), &createResult)
	user := createResult["user"].(map[string]interface{})
	org := createResult["organization"].(map[string]interface{})
	userID := user["id"].(string)
	orgID := org["id"].(string)

	// Convert first
	convBody := `{"email":"pro@company.com","password":"Secure@123","name":"Pro User","org_name":"Pro Org","phone":"+15551234567"}`
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
	h, store := newTestDemoHandler()

	r := httptest.NewRequest("POST", "/v1/demo/session", nil)
	w := httptest.NewRecorder()
	h.CreateSession(w, r)

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)
	org := result["organization"].(map[string]interface{})
	orgID := org["id"].(string)

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
