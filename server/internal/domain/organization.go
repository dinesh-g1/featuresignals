package domain

import "time"

// Organization is the top-level tenant. All projects, users, and billing
// are scoped to an organization.
type Organization struct {
	ID        string    `json:"id" db:"id"`
	Name      string    `json:"name" db:"name"`
	Slug      string    `json:"slug" db:"slug"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
	UpdatedAt time.Time `json:"updated_at" db:"updated_at"`

	// Multi-region data residency
	DataRegion string `json:"data_region" db:"data_region"`

	// Billing / plan fields
	Plan                  string `json:"plan" db:"plan"`
	PayUCustomerRef       string `json:"payu_customer_ref,omitempty" db:"payu_customer_ref"`
	PaymentGateway        string `json:"payment_gateway" db:"payment_gateway"`
	PlanSeatsLimit        int    `json:"plan_seats_limit" db:"plan_seats_limit"`
	PlanProjectsLimit     int    `json:"plan_projects_limit" db:"plan_projects_limit"`
	PlanEnvironmentsLimit int    `json:"plan_environments_limit" db:"plan_environments_limit"`

	// Trial lifecycle
	TrialExpiresAt *time.Time `json:"trial_expires_at,omitempty" db:"trial_expires_at"`

	// Soft-delete support
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

// OrgResourceCounts holds the count of every resource type owned by an
// organization. Used for pre-deletion audit so users understand exactly
// what will be permanently destroyed.
type OrgResourceCounts struct {
	Projects       int `json:"projects"`
	Environments   int `json:"environments"`
	Flags          int `json:"flags"`
	Segments       int `json:"segments"`
	APIKeys        int `json:"api_keys"`
	Webhooks       int `json:"webhooks"`
	Members        int `json:"members"`
	AuditEntries   int `json:"audit_entries"`
	Integrations   int `json:"integrations"`
	Agents         int `json:"agents"`
	Policies       int `json:"policies"`
	SSOConfigs     int `json:"sso_configs"`
	TotalResources int `json:"total_resources"`
}

const (
	TrialDurationDays      = 14
	SoftDeleteInactiveDays = 90
	HardDeleteGraceDays    = 90
)
