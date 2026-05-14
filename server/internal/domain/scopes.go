// Package domain defines the core business types for FeatureSignals.
//
// This file defines fine-grained API scopes and their mapping from coarse
// RBAC roles. Scopes enable operation-level access control beyond the
// 4 built-in roles (Viewer, Developer, Admin, Owner).
//
// Scope taxonomy follows the product architecture:
//
//	flag:*          Feature management (Stage 1 / Code2Flag)
//	preflight:*     Pre-change command center (Preflight)
//	incident:*      Post-change safety net (IncidentFlag)
//	agent:*         Agent behavior mesh (ABM)
//	process:*       Process management (Process Alignment)
//	billing:*       Subscription & billing
//	org:*, team:*   Organization & team management
//	apikey:*        API key management
//	audit:*         Audit log access

package domain

// Scope defines a fine-grained permission for API operations.
// Scopes follow the resource:action pattern (e.g., "flag:write").
type Scope string

const (
	// Feature management
	ScopeFlagRead   Scope = "flag:read"
	ScopeFlagWrite  Scope = "flag:write"
	ScopeFlagToggle Scope = "flag:toggle"

	// Preflight
	ScopePreflightRead    Scope = "preflight:read"
	ScopePreflightExecute Scope = "preflight:execute"

	// Incident
	ScopeIncidentRead   Scope = "incident:read"
	ScopeIncidentRevert Scope = "incident:revert"

	// Agent management
	ScopeAgentRead      Scope = "agent:read"
	ScopeAgentConfigure Scope = "agent:configure"

	// Process management
	ScopeProcessRead  Scope = "process:read"
	ScopeProcessAdmin Scope = "process:admin"

	// Billing
	ScopeBillingRead  Scope = "billing:read"
	ScopeBillingAdmin Scope = "billing:admin"

	// Organization
	ScopeOrgRead   Scope = "org:read"
	ScopeOrgAdmin  Scope = "org:admin"
	ScopeTeamRead  Scope = "team:read"
	ScopeTeamWrite Scope = "team:write"

	// API Keys
	ScopeAPIKeyRead  Scope = "apikey:read"
	ScopeAPIKeyWrite Scope = "apikey:write"

	// Audit
	ScopeAuditRead Scope = "audit:read"
)

// RoleScopes maps coarse roles to their default fine-grained scopes.
// These replace coarse role checks with operation-level granularity while
// maintaining backward compatibility — existing role-based middleware
// continues to work; scope middleware adds an additional enforcement layer.
var RoleScopes = map[string][]Scope{
	"viewer": {
		ScopeFlagRead, ScopePreflightRead, ScopeIncidentRead,
		ScopeAgentRead, ScopeProcessRead, ScopeBillingRead,
		ScopeOrgRead, ScopeAPIKeyRead, ScopeAuditRead, ScopeTeamRead,
	},
	"developer": {
		ScopeFlagRead, ScopeFlagWrite, ScopeFlagToggle,
		ScopePreflightRead, ScopePreflightExecute,
		ScopeIncidentRead, ScopeIncidentRevert,
		ScopeAgentRead, ScopeProcessRead,
		ScopeBillingRead, ScopeOrgRead, ScopeAPIKeyRead, ScopeAuditRead, ScopeTeamRead,
	},
	"admin": {
		ScopeFlagRead, ScopeFlagWrite, ScopeFlagToggle,
		ScopePreflightRead, ScopePreflightExecute,
		ScopeIncidentRead, ScopeIncidentRevert,
		ScopeAgentRead, ScopeAgentConfigure,
		ScopeProcessRead, ScopeProcessAdmin,
		ScopeBillingRead, ScopeBillingAdmin,
		ScopeOrgRead, ScopeOrgAdmin,
		ScopeAPIKeyRead, ScopeAPIKeyWrite,
		ScopeAuditRead, ScopeTeamRead, ScopeTeamWrite,
	},
	"owner": {
		// All scopes
		ScopeFlagRead, ScopeFlagWrite, ScopeFlagToggle,
		ScopePreflightRead, ScopePreflightExecute,
		ScopeIncidentRead, ScopeIncidentRevert,
		ScopeAgentRead, ScopeAgentConfigure,
		ScopeProcessRead, ScopeProcessAdmin,
		ScopeBillingRead, ScopeBillingAdmin,
		ScopeOrgRead, ScopeOrgAdmin,
		ScopeAPIKeyRead, ScopeAPIKeyWrite,
		ScopeAuditRead, ScopeTeamRead, ScopeTeamWrite,
	},
}

// HasScope checks whether a role has a specific scope.
// Returns false for unknown roles.
func HasScope(role string, scope Scope) bool {
	scopes, ok := RoleScopes[role]
	if !ok {
		return false
	}
	for _, s := range scopes {
		if s == scope {
			return true
		}
	}
	return false
}
