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
}

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
