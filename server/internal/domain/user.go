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
	Phone              string     `json:"phone" db:"phone"`
	PhoneVerified      bool       `json:"phone_verified" db:"phone_verified"`
	EmailVerified      bool       `json:"email_verified" db:"email_verified"`
	EmailVerifyToken   string     `json:"-" db:"email_verify_token"`
	EmailVerifyExpires *time.Time `json:"-" db:"email_verify_expires_at"`
	PhoneOTP           string     `json:"-" db:"phone_otp"`
	PhoneOTPExpires    *time.Time `json:"-" db:"phone_otp_expires_at"`
	IsDemo             bool       `json:"is_demo" db:"is_demo"`
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

// EnvPermission controls fine-grained access to a specific environment.
type EnvPermission struct {
	ID           string `json:"id" db:"id"`
	MemberID     string `json:"member_id" db:"member_id"`
	EnvID        string `json:"env_id" db:"env_id"`
	CanToggle    bool   `json:"can_toggle" db:"can_toggle"`
	CanEditRules bool   `json:"can_edit_rules" db:"can_edit_rules"`
}
