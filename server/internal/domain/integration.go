package domain

import (
	"context"
	"errors"
	"time"
)

// Integration provider constants.
const (
	ProviderSlack     = "slack"
	ProviderGitHub    = "github"
	ProviderPagerDuty = "pagerduty"
	ProviderJira      = "jira"
	ProviderDatadog   = "datadog"
	ProviderGrafana   = "grafana"
)

// Integration represents a third-party integration configuration.
type Integration struct {
	ID            string    `json:"id"`
	OrgID         string    `json:"org_id"`
	Provider      string    `json:"provider"`
	Config        []byte    `json:"config"`
	EnabledEvents []string  `json:"enabled_events"`
	Enabled       bool      `json:"enabled"`
	CreatedAt     time.Time `json:"created_at"`
	UpdatedAt     time.Time `json:"updated_at"`
}

// IntegrationDelivery tracks the result of sending an event to an integration.
type IntegrationDelivery struct {
	ID             string    `json:"id"`
	IntegrationID  string    `json:"integration_id"`
	EventType      string    `json:"event_type"`
	Payload        []byte    `json:"payload"`
	ResponseStatus *int      `json:"response_status,omitempty"`
	ResponseBody   *string   `json:"response_body,omitempty"`
	Success        bool      `json:"success"`
	DeliveredAt    time.Time `json:"delivered_at"`
}

// CreateIntegrationRequest contains the fields needed to create an integration.
type CreateIntegrationRequest struct {
	OrgID         string   `json:"org_id"`
	Provider      string   `json:"provider"`
	Config        []byte   `json:"config"`
	EnabledEvents []string `json:"enabled_events"`
}

// UpdateIntegrationRequest contains the fields needed to update an integration.
type UpdateIntegrationRequest struct {
	Config        *[]byte  `json:"config,omitempty"`
	EnabledEvents *[]string `json:"enabled_events,omitempty"`
	Enabled       *bool    `json:"enabled,omitempty"`
}

// IntegrationStore defines the persistence interface for integrations.
type IntegrationStore interface {
	CreateIntegration(ctx context.Context, req CreateIntegrationRequest) (*Integration, error)
	GetIntegration(ctx context.Context, orgID, id string) (*Integration, error)
	ListIntegrations(ctx context.Context, orgID string, limit, offset int) ([]Integration, error)
	CountIntegrations(ctx context.Context, orgID string) (int, error)
	UpdateIntegration(ctx context.Context, orgID, id string, req UpdateIntegrationRequest) (*Integration, error)
	DeleteIntegration(ctx context.Context, orgID, id string) error
	TestIntegration(ctx context.Context, id string) (*IntegrationDelivery, error)
	ListDeliveries(ctx context.Context, integrationID string, limit int) ([]IntegrationDelivery, error)
}

// Sentinel errors for integrations.
var (
	ErrInvalidProvider = errors.New("invalid integration provider")
	ErrInvalidConfig   = errors.New("invalid integration config")
)
