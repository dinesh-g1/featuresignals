package middleware

import (
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func TestRequireScope_HasScope(t *testing.T) {
	handler := RequireScope(domain.ScopeFlagRead)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	// All roles have ScopeFlagRead per RoleScopes mapping.
	for _, role := range []string{"owner", "admin", "developer", "viewer"} {
		req := httptest.NewRequest("GET", "/v1/flags", nil)
		req = req.WithContext(withRole(req.Context(), role))
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("role %q with ScopeFlagRead: expected 200, got %d", role, rr.Code)
		}
	}
}

func TestRequireScope_MissingScope(t *testing.T) {
	// ScopeFlagWrite is not available to viewers.
	handler := RequireScope(domain.ScopeFlagWrite)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest("POST", "/v1/flags", nil)
	req = req.WithContext(withRole(req.Context(), "viewer"))
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("viewer with ScopeFlagWrite: expected 403, got %d", rr.Code)
	}
}

func TestRequireScope_MultipleScopes(t *testing.T) {
	// A developer has ScopeFlagWrite, so should pass.
	handler := RequireScope(domain.ScopeFlagWrite)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest("POST", "/v1/flags", nil)
	req = req.WithContext(withRole(req.Context(), "developer"))
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("developer with ScopeFlagWrite: expected 200, got %d", rr.Code)
	}
}

func TestRequireScope_NoRole(t *testing.T) {
	handler := RequireScope(domain.ScopeFlagRead)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	// Empty role (no role set in context) should be forbidden.
	req := httptest.NewRequest("GET", "/v1/flags", nil)
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("empty role with ScopeFlagRead: expected 403, got %d", rr.Code)
	}
}

func TestRequireScope_AgentRead(t *testing.T) {
	handler := RequireScope(domain.ScopeAgentRead)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	// All roles have ScopeAgentRead.
	for _, role := range []string{"owner", "admin", "developer", "viewer"} {
		req := httptest.NewRequest("GET", "/v1/agents", nil)
		req = req.WithContext(withRole(req.Context(), role))
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("role %q with ScopeAgentRead: expected 200, got %d", role, rr.Code)
		}
	}
}

func TestRequireScope_AdminScope_OwnerAllowed(t *testing.T) {
	// Add ScopeAdmin to RoleScopes for owner/admin and test.
	handler := RequireScope(domain.ScopeAdmin)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest("DELETE", "/v1/projects/123", nil)
	req = req.WithContext(withRole(req.Context(), "owner"))
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusOK {
		t.Errorf("owner with ScopeAdmin: expected 200, got %d", rr.Code)
	}
}

func TestRequireScope_AdminScope_ViewerForbidden(t *testing.T) {
	handler := RequireScope(domain.ScopeAdmin)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	req := httptest.NewRequest("DELETE", "/v1/projects/123", nil)
	req = req.WithContext(withRole(req.Context(), "viewer"))
	rr := httptest.NewRecorder()
	handler.ServeHTTP(rr, req)

	if rr.Code != http.StatusForbidden {
		t.Errorf("viewer with ScopeAdmin: expected 403, got %d", rr.Code)
	}
}

func TestRequireScope_BillingAdmin(t *testing.T) {
	handler := RequireScope(domain.ScopeBillingAdmin)(
		http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			w.WriteHeader(http.StatusOK)
		}),
	)

	// Only owner and admin have ScopeBillingAdmin.
	for _, role := range []string{"owner", "admin"} {
		req := httptest.NewRequest("POST", "/v1/billing/checkout", nil)
		req = req.WithContext(withRole(req.Context(), role))
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusOK {
			t.Errorf("role %q with ScopeBillingAdmin: expected 200, got %d", role, rr.Code)
		}
	}

	// Viewer and developer should NOT have billing admin.
	for _, role := range []string{"viewer", "developer"} {
		req := httptest.NewRequest("POST", "/v1/billing/checkout", nil)
		req = req.WithContext(withRole(req.Context(), role))
		rr := httptest.NewRecorder()
		handler.ServeHTTP(rr, req)

		if rr.Code != http.StatusForbidden {
			t.Errorf("role %q with ScopeBillingAdmin: expected 403, got %d", role, rr.Code)
		}
	}
}
