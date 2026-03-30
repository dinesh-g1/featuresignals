package domain

import "time"

type Role string

const (
	RoleOwner     Role = "owner"
	RoleAdmin     Role = "admin"
	RoleDeveloper Role = "developer"
	RoleViewer    Role = "viewer"
)

type User struct {
	ID           string    `json:"id" db:"id"`
	Email        string    `json:"email" db:"email"`
	PasswordHash string    `json:"-" db:"password_hash"`
	Name         string    `json:"name" db:"name"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time `json:"updated_at" db:"updated_at"`
}

type OrgMember struct {
	ID        string    `json:"id" db:"id"`
	OrgID     string    `json:"org_id" db:"org_id"`
	UserID    string    `json:"user_id" db:"user_id"`
	Role      Role      `json:"role" db:"role"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}

type EnvPermission struct {
	ID           string `json:"id" db:"id"`
	MemberID     string `json:"member_id" db:"member_id"`
	EnvID        string `json:"env_id" db:"env_id"`
	CanToggle    bool   `json:"can_toggle" db:"can_toggle"`
	CanEditRules bool   `json:"can_edit_rules" db:"can_edit_rules"`
}
