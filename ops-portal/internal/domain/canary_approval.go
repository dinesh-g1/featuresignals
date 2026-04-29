package domain

import "time"

type CanaryApproval struct {
	ID           string     `json:"id"`
	DeploymentID string     `json:"deployment_id"`
	ApprovedBy   string     `json:"approved_by"`
	Status       string     `json:"status"` // "pending", "approved", "rejected"
	CreatedAt    time.Time  `json:"created_at"`
	ApprovedAt   *time.Time `json:"approved_at,omitempty"`
}