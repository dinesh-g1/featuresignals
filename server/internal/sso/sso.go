package sso

import (
	"errors"

	"github.com/featuresignals/server/internal/domain"
)

var (
	ErrSSONotConfigured = errors.New("SSO not configured for this organization")
	ErrSSODisabled      = errors.New("SSO is disabled for this organization")
	ErrInvalidAssertion = errors.New("invalid SSO assertion or token")
	ErrMissingEmail     = errors.New("SSO provider did not return an email address")
)

// Identity represents the user information extracted from an SSO assertion or
// OIDC token. Handlers use this to perform JIT provisioning.
type Identity struct {
	Email     string
	Name      string
	FirstName string
	LastName  string
	Groups    []string
}

// MapRole maps IdP groups to a FeatureSignals role, falling back to the
// configured default role if no groups match.
func MapRole(groups []string, defaultRole string) domain.Role {
	for _, g := range groups {
		switch g {
		case "admin", "admins", "FeatureSignals-Admin":
			return domain.RoleAdmin
		case "developer", "developers", "engineering", "FeatureSignals-Developer":
			return domain.RoleDeveloper
		case "viewer", "viewers", "readonly", "FeatureSignals-Viewer":
			return domain.RoleViewer
		}
	}
	switch defaultRole {
	case string(domain.RoleAdmin):
		return domain.RoleAdmin
	case string(domain.RoleViewer):
		return domain.RoleViewer
	default:
		return domain.RoleDeveloper
	}
}
