// Package middleware provides HTTP middleware for the FeatureSignals API.
//
// This file implements fine-grained scope enforcement. The RequireScope
// middleware checks that the authenticated user's role includes the
// required operation-level scope (e.g., "flag:write", "preflight:execute").
//
// Usage:
//
//	r.Group(func(r chi.Router) {
//	    r.Use(middleware.RequireScope(domain.ScopeFlagWrite))
//	    r.Post("/", h.Create)
//	})
//
// Scope middleware is additive — it layers on top of existing role-based
// access control. Both must pass for a request to succeed.

package middleware

import (
	"net/http"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// RequireScope returns middleware that enforces the caller's role has the
// specified scope. It must be placed after JWTAuth (which sets the role
// in context). If the role does not possess the required scope, a 403
// Forbidden response is returned.
//
// This middleware is intended as a gradual replacement for coarse
// RequireRole checks. Routes can adopt scope-based enforcement
// incrementally without breaking existing role-based authorization.
func RequireScope(scope domain.Scope) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := GetRole(r.Context())
			if !domain.HasScope(role, scope) {
				httputil.Error(w, http.StatusForbidden,
					"Permission denied — your role does not have the required scope.")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
