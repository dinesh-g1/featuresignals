package middleware

import (
	"log/slog"
	"net/http"
	"strings"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// TierEnforce checks plan limits before allowing resource creation. It
// intercepts POST requests to creation endpoints and returns 402 when the
// organization has reached its plan cap. Non-creation requests pass through.
func TierEnforce(store domain.Store, logger *slog.Logger) func(next http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			if r.Method != http.MethodPost {
				next.ServeHTTP(w, r)
				return
			}

			orgID := GetOrgID(r.Context())
			if orgID == "" {
				next.ServeHTTP(w, r)
				return
			}

			path := r.URL.Path

			switch {
			case isExactProjectCreate(path):
				org, err := store.GetOrganization(r.Context(), orgID)
				if err != nil {
					logger.Error("tier check: failed to get org", "error", err, "org_id", orgID)
					next.ServeHTTP(w, r)
					return
				}
				if org.PlanProjectsLimit >= 0 {
					projects, _ := store.ListProjects(r.Context(), orgID)
					if len(projects) >= org.PlanProjectsLimit {
						tierError(w, "projects")
						return
					}
				}

			case matchRoutePattern(path, "/v1/projects/*/environments"):
				org, err := store.GetOrganization(r.Context(), orgID)
				if err != nil {
					logger.Error("tier check: failed to get org", "error", err, "org_id", orgID)
					next.ServeHTTP(w, r)
					return
				}
				if org.PlanEnvironmentsLimit >= 0 {
					projectID := extractSegment(path, 2) // /v1/projects/{id}/environments
					envs, _ := store.ListEnvironments(r.Context(), projectID)
					if len(envs) >= org.PlanEnvironmentsLimit {
						tierError(w, "environments")
						return
					}
				}

			case matchRoute(path, "/v1/members/invite") || matchRoutePattern(path, "/v1/organizations/*/members"):
				org, err := store.GetOrganization(r.Context(), orgID)
				if err != nil {
					logger.Error("tier check: failed to get org", "error", err, "org_id", orgID)
					next.ServeHTTP(w, r)
					return
				}
				if org.PlanSeatsLimit >= 0 {
					members, _ := store.ListOrgMembers(r.Context(), orgID)
					if len(members) >= org.PlanSeatsLimit {
						tierError(w, "seats")
						return
					}
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}

// tierError sends a 402 Payment Required with an upgrade hint.
func tierError(w http.ResponseWriter, resource string) {
	httputil.JSON(w, http.StatusPaymentRequired, map[string]string{
		"error":       "Plan limit reached. Upgrade to Pro for unlimited " + resource + ".",
		"upgrade_url": "/settings/billing",
	})
}

// isExactProjectCreate returns true for POST /v1/projects (not sub-resources).
func isExactProjectCreate(path string) bool {
	return strings.TrimRight(path, "/") == "/v1/projects"
}

// matchRoute returns true when path exactly equals the route.
func matchRoute(path, route string) bool {
	return strings.TrimRight(path, "/") == route
}

// matchRoutePattern matches simple wildcard patterns like /v1/projects/*/environments.
// Each * matches exactly one path segment.
func matchRoutePattern(path, pattern string) bool {
	pathParts := strings.Split(strings.Trim(path, "/"), "/")
	patParts := strings.Split(strings.Trim(pattern, "/"), "/")

	if len(pathParts) != len(patParts) {
		return false
	}
	for i, p := range patParts {
		if p == "*" {
			continue
		}
		if pathParts[i] != p {
			return false
		}
	}
	return true
}

// extractSegment returns the path segment at the given 0-based index.
// e.g. extractSegment("/v1/projects/abc123/environments", 2) → "abc123"
func extractSegment(path string, index int) string {
	parts := strings.Split(strings.Trim(path, "/"), "/")
	if index < len(parts) {
		return parts[index]
	}
	return ""
}
