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

	// Billing / plan fields
	Plan                 string `json:"plan" db:"plan"`
	StripeCustomerID     string `json:"stripe_customer_id,omitempty" db:"stripe_customer_id"`
	StripeSubscriptionID string `json:"stripe_subscription_id,omitempty" db:"stripe_subscription_id"`
	PlanSeatsLimit       int    `json:"plan_seats_limit" db:"plan_seats_limit"`
	PlanProjectsLimit    int    `json:"plan_projects_limit" db:"plan_projects_limit"`
	PlanEnvironmentsLimit int   `json:"plan_environments_limit" db:"plan_environments_limit"`
}
