package domain

// UserLifecycleEvent represents a significant event in a user's lifecycle
// This is used for audit trails, compliance, and debugging user issues.
type UserLifecycleEvent struct {
	ID            string                 `json:"id"`
	UserID        string                 `json:"user_id"`
	OrgID         string                 `json:"org_id"`
	EventType     UserLifecycleEventType `json:"event_type"`
	ActorID       *string                `json:"actor_id,omitempty"` // nil for system events
	PreviousState map[string]any         `json:"previous_state,omitempty"`
	NewState      map[string]any         `json:"new_state,omitempty"`
	Reason        string                 `json:"reason,omitempty"`
	IPAddress     string                 `json:"ip_address,omitempty"`
	UserAgent     string                 `json:"user_agent,omitempty"`
	CreatedAt     string                 `json:"created_at"`
}

type UserLifecycleEventType string

const (
	EventUserCreated        UserLifecycleEventType = "user_created"
	EventUserInvited        UserLifecycleEventType = "user_invited"
	EventUserActivated      UserLifecycleEventType = "user_activated"
	EventRoleChanged        UserLifecycleEventType = "role_changed"
	EventGroupChanged       UserLifecycleEventType = "group_changed"
	EventMFAEnabled         UserLifecycleEventType = "mfa_enabled"
	EventMFADisabled        UserLifecycleEventType = "mfa_disabled"
	EventSSOEnforced        UserLifecycleEventType = "sso_enforced"
	EventSSODisabled        UserLifecycleEventType = "sso_disabled"
	EventAccountSuspended   UserLifecycleEventType = "account_suspended"
	EventAccountReactivated UserLifecycleEventType = "account_reactivated"
	EventAccountDeactivated UserLifecycleEventType = "account_deactivated"
	EventAccountDeleted     UserLifecycleEventType = "account_deleted"
	EventPasswordReset      UserLifecycleEventType = "password_reset"
	EventEmailVerified      UserLifecycleEventType = "email_verified"
	EventLoginAttemptFailed UserLifecycleEventType = "login_attempt_failed"
	EventAccountLocked      UserLifecycleEventType = "account_locked"
	EventTokenRevoked       UserLifecycleEventType = "token_revoked"
)

// PermissionAuditLog records every permission change for compliance
type PermissionAuditLog struct {
	ID             string         `json:"id"`
	OrgID          string         `json:"org_id"`
	UserID         string         `json:"user_id"`
	PermissionType string         `json:"permission_type"` // role, env_permission, custom_role, sso_config
	Action         string         `json:"action"`          // granted, revoked, modified
	ResourceID     string         `json:"resource_id,omitempty"`
	ResourceName   string         `json:"resource_name,omitempty"`
	PreviousValue  map[string]any `json:"previous_value,omitempty"`
	NewValue       map[string]any `json:"new_value,omitempty"`
	ActorID        string         `json:"actor_id"`
	Reason         string         `json:"reason,omitempty"`
	IPAddress      string         `json:"ip_address,omitempty"`
	CreatedAt      string         `json:"created_at"`
}

// AccessReview tracks quarterly access reviews for compliance
type AccessReview struct {
	ID                 string         `json:"id"`
	OrgID              string         `json:"org_id"`
	ReviewerID         string         `json:"reviewer_id"`
	ReviewType         ReviewType     `json:"review_type"`
	Status             ReviewStatus   `json:"status"`
	Scope              map[string]any `json:"scope"`
	Findings           map[string]any `json:"findings,omitempty"`
	RemediationActions map[string]any `json:"remediation_actions,omitempty"`
	StartedAt          string         `json:"started_at"`
	CompletedAt        string         `json:"completed_at,omitempty"`
	NextReviewDue      string         `json:"next_review_due,omitempty"`
}

type ReviewType string

const (
	ReviewTypeQuarterly ReviewType = "quarterly"
	ReviewTypeAdHoc     ReviewType = "ad_hoc"
	ReviewTypeIncident  ReviewType = "incident_driven"
)

type ReviewStatus string

const (
	ReviewStatusPending    ReviewStatus = "pending"
	ReviewStatusInProgress ReviewStatus = "in_progress"
	ReviewStatusCompleted  ReviewStatus = "completed"
	ReviewStatusFailed     ReviewStatus = "failed"
)

// ServiceAccount represents a machine-readable API key with lifecycle management
type ServiceAccount struct {
	ID            string         `json:"id"`
	OrgID         string         `json:"org_id"`
	Name          string         `json:"name"`
	Description   string         `json:"description,omitempty"`
	KeyPrefix     string         `json:"key_prefix"` // First 8 chars (e.g., "ff_svc_")
	Permissions   map[string]any `json:"permissions"`
	ExpiresAt     string         `json:"expires_at,omitempty"`
	LastUsedAt    string         `json:"last_used_at,omitempty"`
	LastUsedIP    string         `json:"last_used_ip,omitempty"`
	CreatedBy     string         `json:"created_by"`
	RevokedBy     string         `json:"revoked_by,omitempty"`
	RevokedAt     string         `json:"revoked_at,omitempty"`
	RevokedReason string         `json:"revoked_reason,omitempty"`
	CreatedAt     string         `json:"created_at"`
	UpdatedAt     string         `json:"updated_at"`
}

// CreateServiceAccountRequest is the DTO for creating a service account
type CreateServiceAccountRequest struct {
	Name        string         `json:"name" validate:"required,min=3,max=100"`
	Description string         `json:"description,omitempty" validate:"max=500"`
	Permissions map[string]any `json:"permissions" validate:"required"`
	ExpiresAt   string         `json:"expires_at,omitempty"` // ISO 8601 format
}

// RevokeServiceAccountRequest is the DTO for revoking a service account
type RevokeServiceAccountRequest struct {
	Reason string `json:"reason,omitempty" validate:"max=500"`
}

// UserLifecycleEventQuery is used to filter lifecycle events
type UserLifecycleEventQuery struct {
	UserID    string `json:"user_id,omitempty"`
	OrgID     string `json:"org_id,omitempty"`
	EventType string `json:"event_type,omitempty"`
	StartDate string `json:"start_date,omitempty"` // ISO 8601
	EndDate   string `json:"end_date,omitempty"`   // ISO 8601
	Limit     int    `json:"limit,omitempty"`
	Offset    int    `json:"offset,omitempty"`
}
