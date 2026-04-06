package middleware

import (
	"context"

	"github.com/featuresignals/server/internal/domain"
)

// EnvPermChecker verifies per-environment permissions for the current user.
type EnvPermChecker interface {
	GetOrgMember(ctx context.Context, orgID, userID string) (*domain.OrgMember, error)
	ListEnvPermissions(ctx context.Context, memberID string) ([]domain.EnvPermission, error)
}

// CheckEnvPermission returns true if the user has the specified permission
// for the given environment. Owner and Admin roles always pass. For Developer
// and Viewer roles, explicit per-environment permissions must grant access
// (deny-by-default). Returns false on lookup errors to prevent unauthorized
// access during transient failures.
func CheckEnvPermission(ctx context.Context, checker EnvPermChecker, orgID, userID, envID, permission string) bool {
	role := GetRole(ctx)
	if role == string(domain.RoleOwner) || role == string(domain.RoleAdmin) {
		return true
	}

	member, err := checker.GetOrgMember(ctx, orgID, userID)
	if err != nil {
		return false
	}

	perms, err := checker.ListEnvPermissions(ctx, member.ID)
	if err != nil {
		return false
	}

	for _, p := range perms {
		if p.EnvID == envID {
			switch permission {
			case "can_toggle":
				return p.CanToggle
			case "can_edit_rules":
				return p.CanEditRules
			}
		}
	}

	// No explicit permission row for this environment — deny by default.
	// Admins must grant per-environment permissions to developers/viewers.
	return false
}
