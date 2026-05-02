package domain

import "time"

// ResourceLimit holds the current usage and maximum allowed for a resource type.
type ResourceLimit struct {
	Resource string `json:"resource"`
	Used     int    `json:"used"`
	Max      int    `json:"max"` // -1 = unlimited
}

// ResourceLimits contains the limits config for a plan plus current usage stats.
type ResourceLimits struct {
	Plan   string          `json:"plan"`
	Limits []ResourceLimit `json:"limits"`
}

// LimitsConfigRow mirrors the limits_config table row.
type LimitsConfigRow struct {
	Plan          string    `db:"plan"`
	MaxFlags      int       `db:"max_flags"`
	MaxSegments   int       `db:"max_segments"`
	MaxEnvs       int       `db:"max_environments"`
	MaxMembers    int       `db:"max_members"`
	MaxWebhooks   int       `db:"max_webhooks"`
	MaxAPIKeys    int       `db:"max_api_keys"`
	MaxProjects   int       `db:"max_projects"`
	UpdatedAt     time.Time `db:"updated_at"`
}

// PinnedItem represents a user-pinned resource bookmark.
type PinnedItem struct {
	ID           string    `json:"id" db:"id"`
	OrgID        string    `json:"org_id" db:"org_id"`
	ProjectID    string    `json:"project_id" db:"project_id"`
	UserID       string    `json:"user_id" db:"user_id"`
	ResourceType string    `json:"resource_type" db:"resource_type"`
	ResourceID   string    `json:"resource_id" db:"resource_id"`
	CreatedAt    time.Time `json:"created_at" db:"created_at"`
}
