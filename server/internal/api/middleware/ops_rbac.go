package middleware

import (
	"log/slog"
	"net/http"
	"slices"
)

// OpsRole defines the permission levels for the ops portal.
type OpsRole string

const (
	OpsRoleFounder         OpsRole = "founder"
	OpsRoleEngineer        OpsRole = "engineer"
	OpsRoleCustomerSuccess OpsRole = "customer_success"
	OpsRoleDemoTeam        OpsRole = "demo_team"
	OpsRoleFinance         OpsRole = "finance"
)

// RequireOpsRoles returns middleware that requires one of the specified ops roles.
func RequireOpsRoles(roles ...OpsRole) func(http.Handler) http.Handler {
	roleStrings := make([]string, len(roles))
	for i, r := range roles {
		roleStrings[i] = string(r)
	}
	return RequireOpsRole(roleStrings[0], nil)
}

// OpsAuditMiddleware logs all ops portal actions for audit trail.
func OpsAuditMiddleware(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			role := ""
			if claims != nil {
				role = claims.Role
			}
			logger.Info("ops portal request",
				"method", r.Method,
				"path", r.URL.Path,
				"ops_role", role,
			)
			next.ServeHTTP(w, r)
		})
	}
}

// HasOpsRole checks if the given role has permission for the action.
func HasOpsRole(role OpsRole, allowed []OpsRole) bool {
	return slices.Contains(allowed, role)
}
