package domain

import (
	"context"
	"time"
)

// AuditEntry represents a single audited action in the ops portal.
// The audit log is append-only — entries must never be modified or deleted.
type AuditEntry struct {
	ID         string    `json:"id"`
	UserID     string    `json:"user_id"`
	Action     string    `json:"action"`      // "cluster.create", "deploy.trigger", "config.update"
	TargetType string    `json:"target_type"` // "cluster", "deployment", "config"
	TargetID   string    `json:"target_id"`
	Details    string    `json:"details"`     // JSON blob with request details
	IP         string    `json:"ip"`
	CreatedAt  time.Time `json:"created_at"`
}

// AuditStore defines the interface for audit log persistence.
// The audit log is append-only — no delete or update operations.
type AuditStore interface {
	// Append records a new audit entry.
	Append(ctx context.Context, entry *AuditEntry) error

	// List returns audit entries ordered by created_at descending, with pagination.
	List(ctx context.Context, limit, offset int) ([]AuditEntry, error)

	// Count returns the total number of audit entries.
	Count(ctx context.Context) (int, error)

	// ListByUser returns audit entries for a specific user.
	ListByUser(ctx context.Context, userID string, limit, offset int) ([]AuditEntry, error)

	// ListByAction returns audit entries for a specific action type.
	ListByAction(ctx context.Context, action string, limit, offset int) ([]AuditEntry, error)
}