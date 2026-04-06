package domain

import (
	"context"
	"time"
)

// SSOProviderType identifies the SSO protocol used.
type SSOProviderType string

const (
	SSOProviderSAML SSOProviderType = "saml"
	SSOProviderOIDC SSOProviderType = "oidc"
)

// SSOConfig holds the SSO configuration for an organization.
type SSOConfig struct {
	ID           string          `json:"id" db:"id"`
	OrgID        string          `json:"org_id" db:"org_id"`
	ProviderType SSOProviderType `json:"provider_type" db:"provider_type"`
	MetadataURL  string          `json:"metadata_url,omitempty" db:"metadata_url"`
	MetadataXML  string          `json:"-" db:"metadata_xml"`
	EntityID     string          `json:"entity_id" db:"entity_id"`
	ACSURL       string          `json:"acs_url" db:"acs_url"`
	Certificate  string          `json:"-" db:"certificate"`
	ClientID     string          `json:"client_id,omitempty" db:"client_id"`
	ClientSecret string          `json:"-" db:"client_secret"`
	IssuerURL    string          `json:"issuer_url,omitempty" db:"issuer_url"`
	Enabled      bool            `json:"enabled" db:"enabled"`
	Enforce      bool            `json:"enforce" db:"enforce"`
	DefaultRole  string          `json:"default_role" db:"default_role"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt    time.Time       `json:"updated_at" db:"updated_at"`
}

// SSOStore provides CRUD for SSO configurations.
type SSOStore interface {
	UpsertSSOConfig(ctx context.Context, config *SSOConfig) error
	// GetSSOConfig returns the config without secrets (safe for API responses).
	GetSSOConfig(ctx context.Context, orgID string) (*SSOConfig, error)
	// GetSSOConfigFull returns the config including secrets (for admin editing
	// and SSO flow execution). Never expose this directly in API responses.
	GetSSOConfigFull(ctx context.Context, orgID string) (*SSOConfig, error)
	// GetSSOConfigByOrgSlug returns the full config (with secrets) by org slug,
	// used by the public SSO login flow.
	GetSSOConfigByOrgSlug(ctx context.Context, slug string) (*SSOConfig, error)
	DeleteSSOConfig(ctx context.Context, orgID string) error
}
