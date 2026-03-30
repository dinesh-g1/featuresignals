package domain

import "time"

type APIKeyType string

const (
	APIKeyServer APIKeyType = "server"
	APIKeyClient APIKeyType = "client"
)

type APIKey struct {
	ID         string     `json:"id" db:"id"`
	EnvID      string     `json:"env_id" db:"env_id"`
	KeyHash    string     `json:"-" db:"key_hash"`
	KeyPrefix  string     `json:"key_prefix" db:"key_prefix"`
	Name       string     `json:"name" db:"name"`
	Type       APIKeyType `json:"type" db:"type"`
	CreatedAt  time.Time  `json:"created_at" db:"created_at"`
	LastUsedAt *time.Time `json:"last_used_at,omitempty" db:"last_used_at"`
	RevokedAt  *time.Time `json:"revoked_at,omitempty" db:"revoked_at"`
}
