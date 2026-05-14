package domain

import (
	"encoding/json"
	"fmt"
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

// ProcessDecision applies a review decision (approve/reject) to the
// approval request. It validates that the action is valid, checks that
// the reviewer is not the requestor, and sets the appropriate status.
// Returns an error if the action is invalid or the reviewer is the requestor.
func (ar *ApprovalRequest) ProcessDecision(action, note, reviewerID string) error {
	if ar.Status != ApprovalPending {
		return fmt.Errorf("approval request is no longer pending")
	}
	if ar.RequestorID == reviewerID {
		return fmt.Errorf("cannot review your own request")
	}
	if action != "approve" && action != "reject" {
		return NewValidationError("action", "must be 'approve' or 'reject'")
	}

	now := time.Now()
	ar.ReviewerID = &reviewerID
	ar.ReviewNote = note
	ar.ReviewedAt = &now

	switch action {
	case "approve":
		ar.Status = ApprovalApproved
	case "reject":
		ar.Status = ApprovalRejected
	}
	return nil
}
