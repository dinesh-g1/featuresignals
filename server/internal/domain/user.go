package domain

import "time"

// Role defines the permission level of a user within an organization.
type Role string

const (
	RoleOwner     Role = "owner"
	RoleAdmin     Role = "admin"
	RoleDeveloper Role = "developer"
	RoleViewer    Role = "viewer"
)

// User represents a human operator of the management dashboard.
// PasswordHash is never serialised to JSON.
type User struct {
	ID                 string     `json:"id" db:"id"`
	Email              string     `json:"email" db:"email"`
	PasswordHash       string     `json:"-" db:"password_hash"`
	Name               string     `json:"name" db:"name"`
	EmailVerified      bool       `json:"email_verified" db:"email_verified"`
	EmailVerifyToken   string     `json:"-" db:"email_verify_token"`
	EmailVerifyExpires *time.Time `json:"-" db:"email_verify_expires_at"`
	LastLoginAt        *time.Time `json:"last_login_at,omitempty" db:"last_login_at"`
	CreatedAt          time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at" db:"updated_at"`

	// Lifecycle communication preferences
	EmailConsent   bool       `json:"email_consent" db:"email_consent"`
	EmailConsentAt *time.Time `json:"-" db:"email_consent_at"`
	EmailPref      string     `json:"email_preference" db:"email_preference"`
	DismissedHints []string   `json:"-" db:"dismissed_hints"`
	TourCompleted  bool       `json:"tour_completed" db:"tour_completed"`
	TourCompletedAt *time.Time `json:"-" db:"tour_completed_at"`
}

// EmailPreference constants control which lifecycle emails a user receives.
const (
	EmailPrefAll           = "all"           // All lifecycle + marketing emails
	EmailPrefImportant     = "important"     // Trial, payment, security only
	EmailPrefTransactional = "transactional" // OTP and receipts only
)

// OrgMember links a User to an Organization with a specific Role.
type OrgMember struct {
	ID        string    `json:"id" db:"id"`
	OrgID     string    `json:"org_id" db:"org_id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Role      Role      `json:"role" db:"role"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

// MFASecret stores the TOTP secret for multi-factor authentication.
type MFASecret struct {
	ID         string     `json:"id" db:"id"`
	UserID     string     `json:"user_id" db:"user_id"`
	Secret     string     `json:"-" db:"secret"`
	Enabled    bool       `json:"enabled" db:"enabled"`
	VerifiedAt *time.Time `json:"verified_at,omitempty" db:"verified_at"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	UpdatedAt  time.Time  `json:"updated_at" db:"updated_at"`
}

// EnvPermission controls fine-grained access to a specific environment.
type EnvPermission struct {
	ID           string `json:"id" db:"id"`
	MemberID     string `json:"member_id" db:"member_id"`
	EnvID        string `json:"env_id" db:"env_id"`
	CanToggle    bool   `json:"can_toggle" db:"can_toggle"`
	CanEditRules bool   `json:"can_edit_rules" db:"can_edit_rules"`
}

// IPAllowlist stores org-scoped IP allowlist configuration.
type IPAllowlist struct {
	ID         string    `json:"id"`
	OrgID      string    `json:"org_id"`
	CIDRRanges []string  `json:"cidr_ranges"`
	Enabled    bool      `json:"enabled"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
}

// CustomRole is a named permission template scoped to an organization.
// It maps to a base built-in role (the access level for route-level RBAC)
// plus a set of default environment permissions to apply on assignment.
type CustomRole struct {
	ID          string              `json:"id" db:"id"`
	OrgID       string              `json:"org_id" db:"org_id"`
	Name        string              `json:"name" db:"name"`
	Description string              `json:"description" db:"description"`
	BaseRole    Role                `json:"base_role" db:"base_role"`
	Permissions CustomRolePermissions `json:"permissions" db:"permissions"`
	CreatedAt   time.Time           `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time           `json:"updated_at" db:"updated_at"`
}

// CustomRolePermissions defines the default permission set for a custom role.
type CustomRolePermissions struct {
	CanToggle    bool `json:"can_toggle"`
	CanEditRules bool `json:"can_edit_rules"`
}

// PasswordPolicy stores org-configurable password requirements.
type PasswordPolicy struct {
	ID               string    `json:"id"`
	OrgID            string    `json:"org_id"`
	MinLength        int       `json:"min_length"`
	RequireUppercase bool      `json:"require_uppercase"`
	RequireLowercase bool      `json:"require_lowercase"`
	RequireNumber    bool      `json:"require_number"`
	RequireSpecial   bool      `json:"require_special"`
	MaxAgeDays       int       `json:"max_age_days"`
	HistoryDepth     int       `json:"history_depth"`
	CreatedAt        time.Time `json:"created_at"`
	UpdatedAt        time.Time `json:"updated_at"`
}
