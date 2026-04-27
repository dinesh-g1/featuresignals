package domain

import (
	"context"
	"time"
)

// EnvVarScope defines the scope of an environment variable.
type EnvVarScope string

const (
	EnvVarScopeGlobal EnvVarScope = "global"
	EnvVarScopeRegion EnvVarScope = "region"
	EnvVarScopeCell   EnvVarScope = "cell"
	EnvVarScopeTenant EnvVarScope = "tenant"
)

// EnvVar represents an encrypted environment variable stored in the database.
type EnvVar struct {
	ID              string     `json:"id"`
	Scope           string     `json:"scope"`
	ScopeID         string     `json:"scope_id"`
	Key             string     `json:"key"`
	EncryptedValue  []byte     `json:"-"`           // never serialized
	EncryptionNonce []byte     `json:"-"`           // never serialized
	ValueHash       string     `json:"value_hash"`
	IsSecret        bool       `json:"is_secret"`
	Value           string     `json:"value,omitempty"`   // plaintext for API responses (masked if secret)
	Source          string     `json:"source,omitempty"`  // "from global", "overridden by cell", etc.
	CreatedAt       time.Time  `json:"created_at"`
	UpdatedAt       time.Time  `json:"updated_at"`
	UpdatedBy       string     `json:"updated_by"`
}

// EnvVarFilter specifies filtering criteria for listing env vars.
type EnvVarFilter struct {
	Scope   string `json:"scope,omitempty"`
	ScopeID string `json:"scope_id,omitempty"`
	Search  string `json:"search,omitempty"`
	Secret  *bool  `json:"secret,omitempty"`
}

// EnvVarStore provides CRUD operations for environment variables with encryption.
// All values are encrypted at rest using AES-256-GCM.
type EnvVarStore interface {
	// List returns env vars matching the given filter.
	List(ctx context.Context, filter EnvVarFilter) ([]*EnvVar, error)

	// Upsert creates or updates env vars at the given scope.
	// This is idempotent — safe to retry.
	Upsert(ctx context.Context, scope EnvVarScope, scopeID string, vars []EnvVarInput, updatedBy string) error

	// Delete removes an env var by ID.
	Delete(ctx context.Context, id string) error

	// GetEffective returns the resolved env vars for a given tenant,
	// following the resolution chain: global → region → cell → tenant.
	// Returns the effective value and which scope it came from.
	GetEffective(ctx context.Context, tenantID string) ([]*EnvVar, error)

	// GetScopes returns all available scopes (for the ops portal UI).
	GetScopes(ctx context.Context) ([]string, error)
}

// EnvVarInput is the input for creating/updating env vars.
type EnvVarInput struct {
	Key   string `json:"key"`
	Value string `json:"value"`
}