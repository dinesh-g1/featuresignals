package middleware

import (
	"context"
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
}

func TestJWTAuth_InvalidFormat(t *testing.T) {
	mgr := newTestJWTManager()

	handler := JWTAuth(mgr)(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		t.Error("handler should not be called")
	}))

	tests := []struct {
		name  string
		value string
	}{
		{"no space", "BearerSomeToken"},
		{"wrong scheme", "Basic abc123"},
		{"empty bearer", "Bearer "},
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
		})
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

