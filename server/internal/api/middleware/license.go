package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"os"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/license"
)

// LicenseClaimsKey is a private type for context keys to avoid collisions.
type licenseClaimsKey struct{}

// LicenseClaimsFromContext returns the license claims stored in the request context.
// Returns nil if no claims are present.
func LicenseClaimsFromContext(ctx context.Context) *license.Claims {
	claims, _ := ctx.Value(licenseClaimsKey{}).(*license.Claims)
	return claims
}

// LicenseValidation returns middleware that validates the license for on-prem deployments.
// For on-prem deployments:
//   - Reads license key from environment variable LICENSE_KEY
//   - Reads public key from LICENSE_PUBLIC_KEY_PATH or embedded default
//   - Validates signature and expiration
//   - Stores validated claims in context for downstream use
//
// For cloud deployments:
//   - Community edition features bypass license check
//   - Enterprise features still require organization plan checks via FeatureGate
//
// On validation failure returns 402 Payment Required with upgrade hint.
// If license cannot be loaded (e.g., missing public key), allows request through
// to avoid blocking paying customers due to configuration errors.
func LicenseValidation(cfg *config.Config, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// For cloud deployments, license validation is handled by organization plan
			// and FeatureGate middleware. Community edition features bypass license check.
			if !cfg.IsOnPrem() {
				next.ServeHTTP(w, r)
				return
			}

			// For on-prem deployments, validate the license key
			claims, err := validateOnPremLicense(cfg, logger)
			if err != nil {
				logger.Warn("on-prem license validation failed",
					"error", err,
					"deployment_mode", cfg.DeploymentMode,
				)

				// Determine if this is a community edition route that should be allowed
				if isCommunityEditionRoute(r.URL.Path) {
					// Community edition features allowed without license
					next.ServeHTTP(w, r)
					return
				}

				// Enterprise feature requires valid license
				httputil.Error(w, http.StatusPaymentRequired,
					"License validation failed. Please contact support to renew your on-prem license.")
				return
			}

			// License is valid, store claims in context for downstream middleware/handlers
			ctx := context.WithValue(r.Context(), licenseClaimsKey{}, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// validateOnPremLicense validates the license for on-prem deployments.
// Returns validated claims or error.
func validateOnPremLicense(cfg *config.Config, logger *slog.Logger) (*license.Claims, error) {
	// Check if license key is configured
	if cfg.LicenseKey == "" {
		return nil, domain.ErrNotFound // Treat missing license as "not found"
	}

	// Load public key
	publicKeyPEM, err := loadLicensePublicKey(cfg.LicensePublicKey)
	if err != nil {
		logger.Error("failed to load license public key", "error", err)
		// Don't fail validation if public key can't be loaded - allow through
		// to avoid blocking due to configuration errors
		return nil, nil
	}

	// Decode and verify license
	key, err := license.Decode(cfg.LicenseKey)
	if err != nil {
		return nil, err
	}

	claims, err := license.Verify(key, publicKeyPEM)
	if err != nil {
		return nil, err
	}

	// Additional validation: ensure license hasn't expired
	if claims.ExpiresAt.Before(time.Now().UTC()) {
		return nil, license.ErrExpiredLicense
	}

	logger.Debug("license validated",
		"license_id", claims.LicenseID,
		"customer", claims.CustomerName,
		"plan", claims.Plan,
		"expires_at", claims.ExpiresAt.Format(time.RFC3339),
	)

	return claims, nil
}

// loadLicensePublicKey loads the public key from file or embedded default.
func loadLicensePublicKey(publicKeyPath string) ([]byte, error) {
	// First try to load from configured path
	if publicKeyPath != "" {
		data, err := os.ReadFile(publicKeyPath)
		if err != nil {
			return nil, err
		}
		return data, nil
	}

	// If no path configured, check for embedded default
	// This would typically be loaded from an embedded filesystem or constant
	// For now, return error - production deployments should provide a path
	return nil, domain.ErrNotFound
}

// isCommunityEditionRoute returns true if the route should be accessible
// without a license (Community Edition features).
func isCommunityEditionRoute(path string) bool {
	// Core feature flag management endpoints (Community Edition)
	communityPaths := []string{
		"/v1/client/",       // Evaluation API
		"/v1/evaluate",      // Evaluation endpoint
		"/v1/projects/",     // Project management
		"/v1/flags/",        // Flag CRUD
		"/v1/environments/", // Environment management
		"/v1/segments/",     // Segment management
		"/v1/apikeys/",      // API key management
		"/health",           // Health check
		"/v1/status",        // Status endpoint
	}

	// Authentication and user management endpoints (always available)
	authPaths := []string{
		"/v1/auth/",
		"/v1/signup",
		"/v1/members/",
		"/v1/onboarding",
	}

	// Check if path matches any community or auth endpoint
	for _, prefix := range append(communityPaths, authPaths...) {
		if strings.HasPrefix(path, prefix) {
			return true
		}
	}

	// Enterprise features that require license validation
	enterprisePaths := []string{
		"/v1/webhooks",     // Webhooks
		"/v1/integrations", // Third-party integrations
		"/v1/approvals",    // Approval workflows
		"/v1/scheduling",   // Scheduled changes
		"/v1/audit/export", // Audit export
		"/v1/data/export",  // Data export
		"/v1/sso",          // Single sign-on
		"/v1/scim",         // SCIM provisioning
		"/v1/ipallowlist",  // IP allowlist
		"/v1/custom-roles", // Custom roles
	}

	// Check if path matches any enterprise endpoint
	for _, prefix := range enterprisePaths {
		if strings.HasPrefix(path, prefix) {
			return false
		}
	}

	// Default to allowing access (conservative approach)
	return true
}

// RequireLicenseFeature returns middleware that checks if the license includes
// a specific feature. Must be placed after LicenseValidation middleware.
func RequireLicenseFeature(feature string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := LicenseClaimsFromContext(r.Context())
			if claims == nil || !claims.HasFeature(feature) {
				httputil.Error(w, http.StatusPaymentRequired,
					"License does not include feature: "+feature)
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
