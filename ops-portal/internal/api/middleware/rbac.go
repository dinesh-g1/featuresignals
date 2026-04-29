package middleware

import (
	"context"
	"net/http"

	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/featuresignals/ops-portal/internal/httputil"
)

type roleContextKey string

const (
	// RoleKey is the context key for the user's role.
	RoleKey roleContextKey = "role"

	// RoleAdmin has full access: manage clusters, users, deployments, config, DNS.
	RoleAdmin = "admin"

	// RoleEngineer can deploy, view/edit config, view clusters, view audit.
	RoleEngineer = "engineer"

	// RoleViewer has read-only access: dashboard, cluster health, deployment history.
	RoleViewer = "viewer"
)

// GetRole retrieves the authenticated user's role from the request context.
func GetRole(ctx context.Context) string {
	role, _ := ctx.Value(RoleKey).(string)
	return role
}

// RequireRole returns middleware that only allows requests from users
// with at least one of the specified roles. This is used for RBAC.
//
// Usage:
//
//	r.With(middleware.RequireRole(middleware.RoleAdmin)).Post(...)
func RequireRole(roles ...string) func(http.Handler) http.Handler {
	allowed := make(map[string]bool, len(roles))
	for _, r := range roles {
		allowed[r] = true
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := GetRole(r.Context())
			if role == "" {
				httputil.Error(w, http.StatusUnauthorized, "authentication required")
				return
			}

			if !allowed[role] {
				httputil.Error(w, http.StatusForbidden, "insufficient permissions")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireRoleOrAbove returns middleware that only allows requests from users
// whose role is at or above the specified minimum role. The role hierarchy is:
// viewer (lowest) < engineer < admin (highest).
//
// Usage:
//
//	r.With(middleware.RequireRoleOrAbove(middleware.RoleEngineer)).Post(...)
func RequireRoleOrAbove(minRole string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := GetRole(r.Context())
			if role == "" {
				httputil.Error(w, http.StatusUnauthorized, "authentication required")
				return
			}

			if !roleSatisfies(role, minRole) {
				httputil.Error(w, http.StatusForbidden, "insufficient permissions")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// roleWeight maps roles to numeric weights for hierarchy comparison.
var roleWeight = map[string]int{
	RoleViewer:   0,
	RoleEngineer: 1,
	RoleAdmin:    2,
}

// roleSatisfies returns true if the user's role is at least the required role.
func roleSatisfies(userRole, requiredRole string) bool {
	userWeight, ok := roleWeight[userRole]
	if !ok {
		return false
	}
	reqWeight, ok := roleWeight[requiredRole]
	if !ok {
		return false
	}
	return userWeight >= reqWeight
}

// SetRoleOnContext sets the user's role in the request context.
// This should be called by the auth middleware after JWT validation.
func SetRoleOnContext(ctx context.Context, role string) context.Context {
	if role == "" {
		role = RoleViewer
	}
	return context.WithValue(ctx, RoleKey, role)
}

// EnsureRole ensures the user has at least one of the specified roles.
// Returns domain.ErrForbidden if the user's role is insufficient.
// This is intended for use inside handler functions (not as middleware).
func EnsureRole(ctx context.Context, roles ...string) error {
	role := GetRole(ctx)
	if role == "" {
		return domain.ErrForbidden
	}

	for _, allowed := range roles {
		if role == allowed {
			return nil
		}
	}

	return domain.ErrForbidden
}