package middleware

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func withRole(ctx context.Context, role string) context.Context {
	return context.WithValue(ctx, RoleKey, role)
}

func TestRequireRole_Allowed(t *testing.T) {
	handler := RequireRole(domain.RoleOwner, domain.RoleAdmin)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	for _, role := range []string{"owner", "admin"} {
		req := httptest.NewRequest("GET", "/", nil)
		req = req.WithContext(withRole(req.Context(), role))
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusOK {
			t.Errorf("role %q: expected 200, got %d", role, rr.Code)
		}
	}
}

func TestRequireRole_Forbidden(t *testing.T) {
	handler := RequireRole(domain.RoleOwner, domain.RoleAdmin)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	for _, role := range []string{"developer", "viewer", ""} {
		req := httptest.NewRequest("GET", "/", nil)
		req = req.WithContext(withRole(req.Context(), role))
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)
		if rr.Code != http.StatusForbidden {
			t.Errorf("role %q: expected 403, got %d", role, rr.Code)
		}
	}
}

func TestRequireRole_DeveloperAllowed(t *testing.T) {
	handler := RequireRole(domain.RoleOwner, domain.RoleAdmin, domain.RoleDeveloper)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest("GET", "/", nil)
	req = req.WithContext(withRole(req.Context(), "developer"))
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rr.Code)
	}
}

func TestRequireRole_ViewerForbiddenFromWrite(t *testing.T) {
	handler := RequireRole(domain.RoleOwner, domain.RoleAdmin, domain.RoleDeveloper)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest("POST", "/", nil)
	req = req.WithContext(withRole(req.Context(), "viewer"))
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)
	if rr.Code != http.StatusForbidden {
		t.Errorf("expected 403, got %d", rr.Code)
	}
}
