package domain

import (
	"encoding/json"
	"time"
)

// ApprovalStatus tracks the lifecycle of a change request.
type ApprovalStatus string

const (
	ApprovalPending  ApprovalStatus = "pending"
	ApprovalApproved ApprovalStatus = "approved"
	ApprovalRejected ApprovalStatus = "rejected"
	ApprovalApplied  ApprovalStatus = "applied"
)

// ApprovalRequest represents a pending change that requires approval before
// being applied. Typically used for production environment flag changes.
type ApprovalRequest struct {
	ID          string          `json:"id" db:"id"`
	OrgID       string          `json:"org_id" db:"org_id"`
	RequestorID string          `json:"requestor_id" db:"requestor_id"`
	FlagID      string          `json:"flag_id" db:"flag_id"`
	EnvID       string          `json:"env_id" db:"env_id"`
	ChangeType  string          `json:"change_type" db:"change_type"`
	Payload     json.RawMessage `json:"payload" db:"payload"`
	Status      ApprovalStatus  `json:"status" db:"status"`
	ReviewerID  *string         `json:"reviewer_id,omitempty" db:"reviewer_id"`
	ReviewNote  string          `json:"review_note,omitempty" db:"review_note"`
	ReviewedAt  *time.Time      `json:"reviewed_at,omitempty" db:"reviewed_at"`
	CreatedAt   time.Time       `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time       `json:"updated_at" db:"updated_at"`
}
