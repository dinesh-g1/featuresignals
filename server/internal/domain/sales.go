package domain

import "time"

// SalesInquiry captures inbound Enterprise plan inquiries ("Contact Sales").
type SalesInquiry struct {
	ID          string    `json:"id" db:"id"`
	OrgID       *string   `json:"org_id,omitempty" db:"org_id"`
	ContactName string    `json:"contact_name" db:"contact_name"`
	Email       string    `json:"email" db:"email"`
	Company     string    `json:"company" db:"company"`
	TeamSize    string    `json:"team_size,omitempty" db:"team_size"`
	Message     string    `json:"message,omitempty" db:"message"`
	Status      string    `json:"status" db:"status"`
	CreatedAt   time.Time `json:"created_at" db:"created_at"`
}

const (
	SalesStatusNew      = "new"
	SalesStatusContacted = "contacted"
	SalesStatusClosed    = "closed"
)
