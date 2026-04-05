package middleware

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/auth"
)

func newTestJWTManager() *auth.JWTManager {
	return auth.NewJWTManager("test-secret-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
}

func TestJWTAuth_ValidToken(t *testing.T) {
	mgr := newTestJWTManager()
	pair, _ := mgr.GenerateTokenPair("user-123", "org-456", "admin")

	handler := JWTAuth(mgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		userID := GetUserID(r.Context())
		orgID := GetOrgID(r.Context())
		role := GetRole(r.Context())

		if userID != "user-123" {
			t.Errorf("expected user-123, got %s", userID)
		}
		if orgID != "org-456" {
			t.Errorf("expected org-456, got %s", orgID)
		}
		if role != "admin" {
			t.Errorf("expected admin, got %s", role)
		}

		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("GET", "/test", nil)
	r.Header.Set("Authorization", "Bearer "+pair.AccessToken)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

func TestJWTAuth_MissingHeader(t *testing.T) {
	mgr := newTestJWTManager()

	handler := JWTAuth(mgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	}))

	r := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}

	var body map[string]string
	json.NewDecoder(w.Body).Decode(&body)
	if body["error"] != "missing authorization header" {
		t.Errorf("expected error 'missing authorization header', got %q", body["error"])
	}
}

func TestJWTAuth_InvalidFormat(t *testing.T) {
	mgr := newTestJWTManager()

	handler := JWTAuth(mgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	}))

	tests := []struct {
		name          string
		value         string
		expectedError string
	}{
		{"no space", "BearerSomeToken", "invalid authorization format"},
		{"wrong scheme", "Basic abc123", "invalid authorization format"},
		{"empty bearer", "Bearer ", "invalid or expired token"},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest("GET", "/test", nil)
			r.Header.Set("Authorization", tt.value)
			w := httptest.NewRecorder()

			handler.ServeHTTP(w, r)

			if w.Code != http.StatusUnauthorized {
				t.Errorf("expected 401, got %d", w.Code)
			}

			var body map[string]string
			json.NewDecoder(w.Body).Decode(&body)
			if body["error"] != tt.expectedError {
				t.Errorf("expected error %q, got %q", tt.expectedError, body["error"])
			}
		})
	}
}

func TestJWTAuth_WrongSecretReturnsInvalidNotExpired(t *testing.T) {
	mgr1 := auth.NewJWTManager("secret-one-32-chars-long-enough", 15*time.Minute, 24*time.Hour)
	pair, _ := mgr1.GenerateTokenPair("user-123", "org-456", "admin")

	mgr2 := auth.NewJWTManager("secret-two-32-chars-long-enough", 15*time.Minute, 24*time.Hour)

	handler := JWTAuth(mgr2)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	}))

	r := httptest.NewRequest("GET", "/test", nil)
	r.Header.Set("Authorization", "Bearer "+pair.AccessToken)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}

	var body map[string]string
	json.NewDecoder(w.Body).Decode(&body)
	if body["error"] != "invalid or expired token" {
		t.Errorf("expected 'invalid or expired token' for wrong secret, got %q", body["error"])
	}
	if body["error"] == "token_expired" {
		t.Error("wrong secret should NOT return 'token_expired'")
	}
}

func TestJWTAuth_ExpiredToken(t *testing.T) {
	mgr := auth.NewJWTManager("test-secret-32-chars-long-enough", -1*time.Minute, -1*time.Minute)
	pair, _ := mgr.GenerateTokenPair("user-123", "org-456", "admin")

	validMgr := newTestJWTManager()
	handler := JWTAuth(validMgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	}))

	r := httptest.NewRequest("GET", "/test", nil)
	r.Header.Set("Authorization", "Bearer "+pair.AccessToken)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}

	var body map[string]string
	json.NewDecoder(w.Body).Decode(&body)
	if body["error"] != "token_expired" {
		t.Errorf("expected error 'token_expired', got %q", body["error"])
	}
}

func TestJWTAuth_TamperedToken(t *testing.T) {
	mgr := newTestJWTManager()

	handler := JWTAuth(mgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	}))

	r := httptest.NewRequest("GET", "/test", nil)
	r.Header.Set("Authorization", "Bearer invalid.token.here")
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}

	var body map[string]string
	json.NewDecoder(w.Body).Decode(&body)
	if body["error"] != "invalid or expired token" {
		t.Errorf("expected error 'invalid or expired token', got %q", body["error"])
	}
}

func TestGetUserID_NoContext(t *testing.T) {
	ctx := context.Background()
	if userID := GetUserID(ctx); userID != "" {
		t.Errorf("expected empty string, got %s", userID)
	}
}

func TestGetOrgID_NoContext(t *testing.T) {
	ctx := context.Background()
	if orgID := GetOrgID(ctx); orgID != "" {
		t.Errorf("expected empty string, got %s", orgID)
	}
}

func TestGetRole_NoContext(t *testing.T) {
	ctx := context.Background()
	if role := GetRole(ctx); role != "" {
		t.Errorf("expected empty string, got %s", role)
	}
}

func TestGetClaims_NoContext(t *testing.T) {
	ctx := context.Background()
	claims := GetClaims(ctx)
	if claims != nil {
		t.Errorf("expected nil claims, got %+v", claims)
	}
}

func TestGetClaims_WithContext(t *testing.T) {
	mgr := newTestJWTManager()
	pair, _ := mgr.GenerateTokenPair("user-1", "org-1", "admin")

	handler := JWTAuth(mgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		claims := GetClaims(r.Context())
		if claims == nil {
			t.Error("expected claims in context")
			return
		}
		if claims.UserID != "user-1" {
			t.Errorf("expected user-1, got %s", claims.UserID)
		}
		w.WriteHeader(http.StatusOK)
	}))

	r := httptest.NewRequest("GET", "/", nil)
	r.Header.Set("Authorization", "Bearer "+pair.AccessToken)
	w := httptest.NewRecorder()
	handler.ServeHTTP(w, r)
	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
}

// --- JWT Token Confusion Security Test ---

func TestJWTAuth_RejectsRefreshToken(t *testing.T) {
	mgr := newTestJWTManager()
	pair, _ := mgr.GenerateTokenPair("user-123", "org-456", "admin")

	handler := JWTAuth(mgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called with refresh token")
	}))

	r := httptest.NewRequest("GET", "/test", nil)
	r.Header.Set("Authorization", "Bearer "+pair.RefreshToken)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 when using refresh token as access token, got %d", w.Code)
	}
}

