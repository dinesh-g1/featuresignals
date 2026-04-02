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
	Plan            string `json:"plan" db:"plan"`
	PayUCustomerRef string `json:"payu_customer_ref,omitempty" db:"payu_customer_ref"`
	PlanSeatsLimit       int    `json:"plan_seats_limit" db:"plan_seats_limit"`
	PlanProjectsLimit    int    `json:"plan_projects_limit" db:"plan_projects_limit"`
	PlanEnvironmentsLimit int   `json:"plan_environments_limit" db:"plan_environments_limit"`

	// Demo fields
	IsDemo       bool       `json:"is_demo" db:"is_demo"`
	DemoExpiresAt *time.Time `json:"demo_expires_at,omitempty" db:"demo_expires_at"`
}

// DemoFeedback stores feedback from demo users.
type DemoFeedback struct {
	ID        string    `json:"id" db:"id"`
	OrgID     string    `json:"org_id" db:"org_id"`
	Message   string    `json:"message" db:"message"`
	Email     string    `json:"email,omitempty" db:"email"`
	Rating    int       `json:"rating,omitempty" db:"rating"`
	CreatedAt time.Time `json:"created_at" db:"created_at"`
}
