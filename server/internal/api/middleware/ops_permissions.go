package middleware

import (
	"net/http"
	"strings"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/go-chi/chi/v5"
)

// OpsPermissionMiddleware returns middleware that checks if the user has
// permission to access the requested resource and action.
//
// Usage:
//   router.Get("/environments", OpsPermission(domain.ResourceEnvironment, domain.ActionRead), handler)
//   router.Post("/environments", OpsPermission(domain.ResourceEnvironment, domain.ActionCreate), handler)
func OpsPermission(resource domain.Resource, action domain.Action) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			// Get claims from context (set by jwtAuth middleware)
			claims := GetClaims(ctx)
			if claims == nil {
				httputil.Error(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			// Check if user has ops role
			if claims.Role == "" {
				httputil.Error(w, http.StatusForbidden, "access denied: no ops role")
				return
			}

			// Validate the role
			opsRole := domain.OpsRole(claims.Role)
			if !domain.IsValidRole(string(opsRole)) {
				httputil.Error(w, http.StatusForbidden, "access denied: invalid role")
				return
			}

			// Build permission context with basic info
			context := &domain.PermissionContext{
				UserID: claims.UserID,
			}

			// Extract resource ID from URL params if available
			if resourceID := extractResourceID(r, resource); resourceID != "" {
				context.ResourceID = resourceID
			}

			// Check permission
			if !domain.HasPermission(opsRole, resource, action, context) {
				httputil.Error(w, http.StatusForbidden, "insufficient permissions")
				return
			}

			// Permission granted, proceed
			next.ServeHTTP(w, r)
		})
	}
}

// OpsAutoPermission automatically determines the resource and action
// based on the route pattern and HTTP method.
//
// It uses route-to-resource mapping and method-to-action mapping.
// This is useful for protecting entire route groups.
func OpsAutoPermission() func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			ctx := r.Context()

			// Get claims from context
			claims := GetClaims(ctx)
			if claims == nil {
				httputil.Error(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			// Check if user has ops role
			if claims.Role == "" {
				httputil.Error(w, http.StatusForbidden, "access denied: no ops role")
				return
			}

			// Validate the role
			opsRole := domain.OpsRole(claims.Role)
			if !domain.IsValidRole(string(opsRole)) {
				httputil.Error(w, http.StatusForbidden, "access denied: invalid role")
				return
			}

			// Determine resource from route pattern
			resource := determineResourceFromRoute(r)
			if resource == "" {
				// If we can't determine the resource, use generic check
				// This might happen for top-level routes like /api/v1/ops
				next.ServeHTTP(w, r)
				return
			}

			// Determine action from HTTP method
			action := determineActionFromMethod(r.Method)

			// Build permission context
			context := &domain.PermissionContext{
				UserID: claims.UserID,
			}

			// Extract resource ID from URL params if available
			if resourceID := extractResourceID(r, resource); resourceID != "" {
				context.ResourceID = resourceID
			}

			// Check permission
			if !domain.HasPermission(opsRole, resource, action, context) {
				httputil.Error(w, http.StatusForbidden, "insufficient permissions")
				return
			}

			// Permission granted, proceed
			next.ServeHTTP(w, r)
		})
	}
}

// Helper functions

// determineResourceFromRoute maps URL paths to domain resources
func determineResourceFromRoute(r *http.Request) domain.Resource {
	path := r.URL.Path

	// Map route patterns to resources
	switch {
	// Specific sub-resources first (most specific to least specific)
	case strings.HasSuffix(path, "/debug") || strings.Contains(path, "/environments/") && strings.Contains(path, "/debug"):
		return domain.ResourceDebugMode
	case strings.HasSuffix(path, "/restart") || strings.Contains(path, "/environments/") && strings.Contains(path, "/restart"):
		return domain.ResourceSSHAccess
	case strings.HasSuffix(path, "/maintenance") || strings.Contains(path, "/environments/") && strings.Contains(path, "/maintenance"):
		return domain.ResourceEnvironment // Maintenance is an update to environment
	case strings.Contains(path, "/environments/provision"):
		return domain.ResourceEnvironment // Provision creates environment
	case strings.Contains(path, "/environments/decommission"):
		return domain.ResourceEnvironment // Decommission deletes environment
	case strings.Contains(path, "/environments"):
		return domain.ResourceEnvironment
	
	// Financial routes
	case strings.Contains(path, "/financial/costs") || strings.Contains(path, "/financial/summary"):
		return domain.ResourceCost
	
	// Customer routes  
	case strings.HasPrefix(path, "/api/v1/ops/customers"):
		return domain.ResourceCustomer
	
	// License routes
	case strings.Contains(path, "/licenses"):
		return domain.ResourceLicense
	
	// Audit routes
	case strings.Contains(path, "/audit"):
		return domain.ResourceAuditLog
	
	// Ops user management (not customer users)
	case strings.HasPrefix(path, "/api/v1/ops/users"):
		return domain.ResourceOpsUser
	
	// Sandbox routes
	case strings.Contains(path, "/sandboxes"):
		return domain.ResourceSandbox
	
	// Billing routes (not in current API but future)
	case strings.Contains(path, "/billing"):
		return domain.ResourceBilling
	
	default:
		return ""
	}
}

// determineActionFromMethod maps HTTP methods to domain actions
func determineActionFromMethod(method string) domain.Action {
	switch method {
	case http.MethodGet, http.MethodHead:
		return domain.ActionRead
	case http.MethodPost:
		return domain.ActionCreate
	case http.MethodPut, http.MethodPatch:
		return domain.ActionUpdate
	case http.MethodDelete:
		return domain.ActionDelete
	default:
		return domain.ActionRead // Default to read for safety
	}
}

// extractResourceID tries to extract a resource ID from URL parameters
func extractResourceID(r *http.Request, resource domain.Resource) string {
	// Try to get ID from common parameter names
	rctx := chi.RouteContext(r.Context())
	if rctx == nil {
		return ""
	}

	// Look for ID parameter in URL pattern
	// Common patterns: /resource/{id}, /resource/{resource_id}, etc.
	for i, key := range rctx.URLParams.Keys {
		if key == "id" || key == "resource_id" || strings.HasSuffix(key, "_id") {
			if i < len(rctx.URLParams.Values) {
				return rctx.URLParams.Values[i]
			}
		}
	}

	// Check for specific resource ID patterns
	switch resource {
	case domain.ResourceEnvironment:
		if envID := chi.URLParam(r, "id"); envID != "" {
			return envID
		}
		if vpsID := chi.URLParam(r, "vps_id"); vpsID != "" {
			return vpsID
		}
	case domain.ResourceCustomer:
		if orgID := chi.URLParam(r, "org_id"); orgID != "" {
			return orgID
		}
	case domain.ResourceLicense:
		if licenseID := chi.URLParam(r, "id"); licenseID != "" {
			return licenseID
		}
		if orgID := chi.URLParam(r, "org_id"); orgID != "" {
			return orgID
		}
	case domain.ResourceSandbox:
		if sandboxID := chi.URLParam(r, "id"); sandboxID != "" {
			return sandboxID
		}
	case domain.ResourceOpsUser:
		if userID := chi.URLParam(r, "id"); userID != "" {
			return userID
		}
	}

	return ""
}

// Convenience functions for common permission checks

func RequireOpsRead(resource domain.Resource) func(http.Handler) http.Handler {
	return OpsPermission(resource, domain.ActionRead)
}

func RequireOpsCreate(resource domain.Resource) func(http.Handler) http.Handler {
	return OpsPermission(resource, domain.ActionCreate)
}

func RequireOpsUpdate(resource domain.Resource) func(http.Handler) http.Handler {
	return OpsPermission(resource, domain.ActionUpdate)
}

func RequireOpsDelete(resource domain.Resource) func(http.Handler) http.Handler {
	return OpsPermission(resource, domain.ActionDelete)
}

func RequireOpsExecute(resource domain.Resource) func(http.Handler) http.Handler {
	return OpsPermission(resource, domain.ActionExecute)
}

func RequireOpsExport(resource domain.Resource) func(http.Handler) http.Handler {
	return OpsPermission(resource, domain.ActionExport)
}