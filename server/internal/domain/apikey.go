package domain

import "time"

// APIKeyType distinguishes between server-side and client-side keys.
// Server keys have full evaluation access; client keys are limited to
// public-safe flags.
type APIKeyType string

const (
	APIKeyServer APIKeyType = "server"
	APIKeyClient APIKeyType = "client"
)

// APIKey authenticates SDK and API requests to the evaluation endpoints.
// The raw key is only shown once (at creation); after that only the
// KeyPrefix and salted KeyHash are stored.
type APIKey struct {
	ID         string     `json:"id" db:"id"`
	EnvID      string     `json:"env_id" db:"env_id"`
	OrgID      string     `json:"org_id" db:"org_id"`
	KeyHash    string     `json:"-" db:"key_hash"`
	KeyPrefix  string     `json:"key_prefix" db:"key_prefix"`
	Name       string     `json:"name" db:"name"`
	Type       APIKeyType `json:"type" db:"type"`
	CreatedAt      time.Time  `json:"created_at" db:"created_at"`
	LastUsedAt     *time.Time `json:"last_used_at,omitempty" db:"last_used_at"`
	RevokedAt      *time.Time `json:"revoked_at,omitempty" db:"revoked_at"`
	ExpiresAt      *time.Time `json:"expires_at,omitempty" db:"expires_at"`
	GraceExpiresAt *time.Time `json:"grace_expires_at,omitempty" db:"grace_expires_at"`
	RotatedFromID  *string    `json:"rotated_from_id,omitempty" db:"rotated_from_id"`
}
