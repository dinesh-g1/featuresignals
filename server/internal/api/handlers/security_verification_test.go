package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

func TestRegister_ResponseExcludesSensitiveFields(t *testing.T) {
	store := newMockStore()
	h := NewAuthHandler(store, &stubTokenManager{}, nil, nil, "", "")

	body := `{"email":"test@example.com","password":"StrongP@ss1","name":"Test User","org_name":"TestOrg"}`
	r := httptest.NewRequest("POST", "/v1/auth/register", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.Register(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var result map[string]json.RawMessage
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	var user map[string]interface{}
	if err := json.Unmarshal(result["user"], &user); err != nil {
		t.Fatalf("failed to decode user: %v", err)
	}

	sensitiveFields := []string{"password_hash", "phone_otp", "phone_otp_expires", "email_verify_token", "email_verify_expires", "is_demo", "updated_at"}
	for _, field := range sensitiveFields {
		if _, exists := user[field]; exists {
			t.Errorf("response should not contain sensitive field '%s'", field)
		}
	}

	requiredFields := []string{"id", "email", "name", "email_verified", "created_at"}
	for _, field := range requiredFields {
		if _, exists := user[field]; !exists {
			t.Errorf("response should contain field '%s'", field)
		}
	}
}

func TestLogin_ResponseExcludesSensitiveFields(t *testing.T) {
	store := newMockStore()
	h := NewAuthHandler(store, &stubTokenManager{}, nil, nil, "", "")

	hash, _ := auth.HashPassword("StrongP@ss1")
	store.CreateUser(nil, &domain.User{
		Email: "test@example.com", PasswordHash: hash, Name: "Test",
	})
	var userID string
	for id := range store.users {
		userID = id
		break
	}
	store.AddOrgMember(nil, &domain.OrgMember{
		OrgID: testOrgID, UserID: userID, Role: domain.RoleAdmin,
	})

	body := `{"email":"test@example.com","password":"StrongP@ss1"}`
	r := httptest.NewRequest("POST", "/v1/auth/login", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.Login(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var result map[string]json.RawMessage
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	var user map[string]interface{}
	if err := json.Unmarshal(result["user"], &user); err != nil {
		t.Fatalf("failed to decode user: %v", err)
	}

	sensitiveFields := []string{"password_hash", "phone_otp", "phone_otp_expires", "email_verify_token", "email_verify_expires", "is_demo", "updated_at"}
	for _, field := range sensitiveFields {
		if _, exists := user[field]; exists {
			t.Errorf("login response should not contain sensitive field '%s'", field)
		}
	}
}

func TestErrorResponse_IncludesRequestID(t *testing.T) {
	w := httptest.NewRecorder()
	w.Header().Set("X-Request-Id", "req-abc-123")
	httputil.Error(w, http.StatusBadRequest, "test error")

	var resp httputil.ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	if resp.Error != "test error" {
		t.Errorf("expected error 'test error', got '%s'", resp.Error)
	}
	if resp.RequestID != "req-abc-123" {
		t.Errorf("expected request_id 'req-abc-123', got '%s'", resp.RequestID)
	}
}

func TestErrorResponse_EmptyWhenNoRequestID(t *testing.T) {
	w := httptest.NewRecorder()
	httputil.Error(w, http.StatusNotFound, "not found")

	var resp httputil.ErrorResponse
	if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode: %v", err)
	}

	if resp.RequestID != "" {
		t.Errorf("expected empty request_id, got '%s'", resp.RequestID)
	}
}

func TestErrorResponse_StandardFormat(t *testing.T) {
	codes := []struct {
		status int
		msg    string
	}{
		{http.StatusBadRequest, "bad request"},
		{http.StatusUnauthorized, "unauthorized"},
		{http.StatusForbidden, "forbidden"},
		{http.StatusNotFound, "not found"},
		{http.StatusConflict, "conflict"},
		{http.StatusTooManyRequests, "rate limit exceeded"},
		{http.StatusInternalServerError, "internal error"},
		{http.StatusUnsupportedMediaType, "unsupported media type"},
	}

	for _, tc := range codes {
		t.Run(http.StatusText(tc.status), func(t *testing.T) {
			w := httptest.NewRecorder()
			w.Header().Set("X-Request-Id", "req-format-test")
			httputil.Error(w, tc.status, tc.msg)

			if w.Code != tc.status {
				t.Errorf("expected %d, got %d", tc.status, w.Code)
			}

			var resp httputil.ErrorResponse
			if err := json.Unmarshal(w.Body.Bytes(), &resp); err != nil {
				t.Fatalf("failed to decode error response as JSON: %v", err)
			}
			if resp.Error == "" {
				t.Error("error field should not be empty")
			}
			if resp.RequestID != "req-format-test" {
				t.Errorf("expected request_id 'req-format-test', got '%s'", resp.RequestID)
			}
		})
	}
}

func TestAPIKey_ExpiresInDays_IncludedInResponse(t *testing.T) {
	store := newMockStore()
	h := NewAPIKeyHandler(store)
	_, envID := setupTestEnv(store, testOrgID)

	body := `{"name":"Expiring Key","type":"server","expires_in_days":30}`
	r := httptest.NewRequest("POST", "/v1/environments/"+envID+"/api-keys", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)

	if result["expires_at"] == nil {
		t.Fatal("expected expires_at in response when expires_in_days is set")
	}

	expiresStr, ok := result["expires_at"].(string)
	if !ok {
		t.Fatal("expires_at should be a string")
	}
	expiresAt, err := time.Parse(time.RFC3339Nano, expiresStr)
	if err != nil {
		t.Fatalf("failed to parse expires_at: %v", err)
	}

	expectedMin := time.Now().Add(29 * 24 * time.Hour)
	expectedMax := time.Now().Add(31 * 24 * time.Hour)
	if expiresAt.Before(expectedMin) || expiresAt.After(expectedMax) {
		t.Errorf("expires_at should be ~30 days from now, got %v", expiresAt)
	}
}

func TestAPIKey_NoExpiration_ExcludesField(t *testing.T) {
	store := newMockStore()
	h := NewAPIKeyHandler(store)
	_, envID := setupTestEnv(store, testOrgID)

	body := `{"name":"Permanent Key","type":"server"}`
	r := httptest.NewRequest("POST", "/v1/environments/"+envID+"/api-keys", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)

	if result["expires_at"] != nil {
		t.Error("expected no expires_at when expires_in_days is not set")
	}
}
