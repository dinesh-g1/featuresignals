package domain

import "time"

// Resource defines the types of resources in the ops portal.
type Resource string

const (
	ResourceEnvironment Resource = "environment"
	ResourceCustomer    Resource = "customer"
	ResourceLicense     Resource = "license"
	ResourceCost        Resource = "cost"
	ResourceAuditLog    Resource = "audit_log"
	ResourceOpsUser     Resource = "ops_user"
	ResourceSandbox     Resource = "sandbox"
	ResourceDebugMode   Resource = "debug_mode"
	ResourceSSHAccess   Resource = "ssh_access"
	ResourceBilling     Resource = "billing"
)

// Action defines the operations that can be performed on resources.
type Action string

const (
	ActionCreate Action = "create"
	ActionRead   Action = "read"
	ActionUpdate Action = "update"
	ActionDelete Action = "delete"
	ActionExecute Action = "execute" // For actions like deploy, restart, SSH
	ActionExport Action = "export"   // For data exports
)

// PermissionCondition defines optional constraints on permissions.
type PermissionCondition string

const (
	ConditionOwnSandboxOnly      PermissionCondition = "own_sandbox_only"
	ConditionTemporaryDebug      PermissionCondition = "temporary_debug"
	ConditionPerfEnvAutoDelete   PermissionCondition = "perf_env_auto_delete"
	ConditionSandboxAutoExpire   PermissionCondition = "sandbox_auto_expire"
	ConditionCostViewInternalOnly PermissionCondition = "cost_view_internal_only"
)

// Permission represents a single permission grant.
type Permission struct {
	Resource  Resource             `json:"resource"`
	Action    Action               `json:"action"`
	Condition PermissionCondition  `json:"condition,omitempty"` // Empty string means no condition
}

// OpsRole defines the permission levels for the ops portal.
type OpsRole string

const (
	OpsRoleFounder         OpsRole = "founder"
	OpsRoleEngineer        OpsRole = "engineer"
	OpsRoleCustomerSuccess OpsRole = "customer_success"
	OpsRoleDemoTeam        OpsRole = "demo_team"
	OpsRoleFinance         OpsRole = "finance"
	OpsRoleQA              OpsRole = "qa"
	OpsRolePerfTester      OpsRole = "perf_tester"
	OpsRoleSales           OpsRole = "sales"
	OpsRoleSupport         OpsRole = "support"
)

// rolePermissions maps each role to its set of permissions.
// This is the single source of truth for role-based access control.
var rolePermissions = map[OpsRole][]Permission{
	OpsRoleFounder: {
		// Full access to everything
		{Resource: ResourceEnvironment, Action: ActionCreate},
		{Resource: ResourceEnvironment, Action: ActionRead},
		{Resource: ResourceEnvironment, Action: ActionUpdate},
		{Resource: ResourceEnvironment, Action: ActionDelete},
		{Resource: ResourceEnvironment, Action: ActionExecute},
		{Resource: ResourceCustomer, Action: ActionRead},
		{Resource: ResourceCustomer, Action: ActionUpdate},
		{Resource: ResourceCustomer, Action: ActionCreate},
		{Resource: ResourceLicense, Action: ActionCreate},
		{Resource: ResourceLicense, Action: ActionRead},
		{Resource: ResourceLicense, Action: ActionUpdate},
		{Resource: ResourceLicense, Action: ActionDelete},
		{Resource: ResourceCost, Action: ActionRead},
		{Resource: ResourceCost, Action: ActionExport},
		{Resource: ResourceAuditLog, Action: ActionRead},
		{Resource: ResourceAuditLog, Action: ActionExport},
		{Resource: ResourceOpsUser, Action: ActionCreate},
		{Resource: ResourceOpsUser, Action: ActionRead},
		{Resource: ResourceOpsUser, Action: ActionUpdate},
		{Resource: ResourceOpsUser, Action: ActionDelete},
		{Resource: ResourceSandbox, Action: ActionCreate},
		{Resource: ResourceSandbox, Action: ActionRead},
		{Resource: ResourceSandbox, Action: ActionDelete},
		{Resource: ResourceDebugMode, Action: ActionExecute},
		{Resource: ResourceSSHAccess, Action: ActionExecute},
		{Resource: ResourceBilling, Action: ActionRead},
		{Resource: ResourceBilling, Action: ActionUpdate},
	},

	OpsRoleEngineer: {
		// Technical operations, no financial data
		{Resource: ResourceEnvironment, Action: ActionCreate},
		{Resource: ResourceEnvironment, Action: ActionRead},
		{Resource: ResourceEnvironment, Action: ActionUpdate},
		{Resource: ResourceEnvironment, Action: ActionDelete},
		{Resource: ResourceEnvironment, Action: ActionExecute},
		{Resource: ResourceCustomer, Action: ActionRead},
		{Resource: ResourceCustomer, Action: ActionCreate},
		{Resource: ResourceLicense, Action: ActionRead},
		{Resource: ResourceLicense, Action: ActionUpdate},
		{Resource: ResourceCost, Action: ActionRead},
		{Resource: ResourceAuditLog, Action: ActionRead},
		{Resource: ResourceSandbox, Action: ActionCreate},
		{Resource: ResourceSandbox, Action: ActionRead},
		{Resource: ResourceSandbox, Action: ActionDelete},
		{Resource: ResourceDebugMode, Action: ActionExecute},
		{Resource: ResourceSSHAccess, Action: ActionExecute},
	},

	OpsRoleCustomerSuccess: {
		// View customers and environments, temporary debug access
		{Resource: ResourceEnvironment, Action: ActionRead},
		{Resource: ResourceCustomer, Action: ActionRead},
		{Resource: ResourceAuditLog, Action: ActionRead},
		{Resource: ResourceDebugMode, Action: ActionExecute, Condition: ConditionTemporaryDebug},
	},

	OpsRoleDemoTeam: {
		// Sandbox environments only
		{Resource: ResourceSandbox, Action: ActionCreate},
		{Resource: ResourceSandbox, Action: ActionRead},
		{Resource: ResourceSandbox, Action: ActionDelete, Condition: ConditionOwnSandboxOnly},
		{Resource: ResourceEnvironment, Action: ActionRead},
	},

	OpsRoleFinance: {
		// Financial data only
		{Resource: ResourceCost, Action: ActionRead},
		{Resource: ResourceCost, Action: ActionExport},
		{Resource: ResourceCustomer, Action: ActionRead},
		{Resource: ResourceBilling, Action: ActionRead},
	},

	OpsRoleQA: {
		// Testing environments
		{Resource: ResourceEnvironment, Action: ActionRead},
		{Resource: ResourceSandbox, Action: ActionCreate},
		{Resource: ResourceSandbox, Action: ActionRead},
		{Resource: ResourceSandbox, Action: ActionDelete, Condition: ConditionOwnSandboxOnly},
		{Resource: ResourceAuditLog, Action: ActionRead},
	},

	OpsRolePerfTester: {
		// Performance testing environments
		{Resource: ResourceEnvironment, Action: ActionCreate},
		{Resource: ResourceEnvironment, Action: ActionRead},
		{Resource: ResourceEnvironment, Action: ActionDelete, Condition: ConditionOwnSandboxOnly},
		{Resource: ResourceAuditLog, Action: ActionRead},
	},

	OpsRoleSales: {
		// Customer visibility for sales
		{Resource: ResourceEnvironment, Action: ActionRead},
		{Resource: ResourceCustomer, Action: ActionRead},
	},

	OpsRoleSupport: {
		// Support access - view logs, temporary debug
		{Resource: ResourceEnvironment, Action: ActionRead},
		{Resource: ResourceAuditLog, Action: ActionRead},
		{Resource: ResourceDebugMode, Action: ActionExecute, Condition: ConditionTemporaryDebug},
	},
}

// PermissionContext provides additional context for condition evaluation.
type PermissionContext struct {
	// For ConditionOwnSandboxOnly
	IsOwner bool `json:"is_owner,omitempty"`
	
	// For ConditionTemporaryDebug
	DebugEnabledUntil string `json:"debug_enabled_until,omitempty"` // RFC3339 timestamp
	
	// For sandbox/perf environment limits
	SandboxCount int `json:"sandbox_count,omitempty"`
	MaxSandboxes int `json:"max_sandboxes,omitempty"`
	
	// Additional context fields as needed
	UserID   string `json:"user_id,omitempty"`
	ResourceID string `json:"resource_id,omitempty"`
}

// HasPermission checks if a role has permission to perform an action on a resource.
// If context is provided, it evaluates any conditions on the permission.
func HasPermission(role OpsRole, resource Resource, action Action, context *PermissionContext) bool {
	permissions, ok := rolePermissions[role]
	if !ok {
		return false
	}

	for _, perm := range permissions {
		if perm.Resource == resource && perm.Action == action {
			if perm.Condition != "" {
				return evaluateCondition(perm.Condition, context)
			}
			return true
		}
	}
	return false
}

// evaluateCondition checks if a condition is satisfied given the context.
func evaluateCondition(condition PermissionCondition, context *PermissionContext) bool {
	if context == nil {
		return false
	}

	switch condition {
	case ConditionOwnSandboxOnly:
		return context.IsOwner
	case ConditionTemporaryDebug:
		if context.DebugEnabledUntil == "" {
			return false
		}
		// Check if debug is still enabled
		enabledUntil, err := time.Parse(time.RFC3339, context.DebugEnabledUntil)
		if err != nil {
			return false
		}
		return !enabledUntil.IsZero() && enabledUntil.After(time.Now())
	case ConditionSandboxAutoExpire:
		// Auto-expiry is handled by the scheduler, not a runtime check
		return true
	default:
		// Unknown condition - fail safe
		return false
	}
}

// CanCreate checks if a role can create a resource.
func CanCreate(role OpsRole, resource Resource, context *PermissionContext) bool {
	return HasPermission(role, resource, ActionCreate, context)
}

// CanRead checks if a role can read a resource.
func CanRead(role OpsRole, resource Resource, context *PermissionContext) bool {
	return HasPermission(role, resource, ActionRead, context)
}

// CanUpdate checks if a role can update a resource.
func CanUpdate(role OpsRole, resource Resource, context *PermissionContext) bool {
	return HasPermission(role, resource, ActionUpdate, context)
}

// CanDelete checks if a role can delete a resource.
func CanDelete(role OpsRole, resource Resource, context *PermissionContext) bool {
	return HasPermission(role, resource, ActionDelete, context)
}

// CanExecute checks if a role can execute an action on a resource.
func CanExecute(role OpsRole, resource Resource, context *PermissionContext) bool {
	return HasPermission(role, resource, ActionExecute, context)
}

// CanExport checks if a role can export data from a resource.
func CanExport(role OpsRole, resource Resource, context *PermissionContext) bool {
	return HasPermission(role, resource, ActionExport, context)
}

// GetPermissionsForRole returns all permissions granted to a role.
func GetPermissionsForRole(role OpsRole) []Permission {
	return rolePermissions[role]
}

// IsValidRole checks if a string represents a valid ops role.
func IsValidRole(role string) bool {
	_, ok := rolePermissions[OpsRole(role)]
	return ok
}