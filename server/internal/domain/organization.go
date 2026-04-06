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
	PlanSeatsLimit        int    `json:"plan_seats_limit" db:"plan_seats_limit"`
	PlanProjectsLimit     int    `json:"plan_projects_limit" db:"plan_projects_limit"`
	PlanEnvironmentsLimit int    `json:"plan_environments_limit" db:"plan_environments_limit"`

	// Trial lifecycle
	TrialExpiresAt *time.Time `json:"trial_expires_at,omitempty" db:"trial_expires_at"`

	// Soft-delete support
	DeletedAt *time.Time `json:"deleted_at,omitempty" db:"deleted_at"`
}

const (
	TrialDurationDays      = 14
	SoftDeleteInactiveDays = 90
	HardDeleteGraceDays    = 90
)
