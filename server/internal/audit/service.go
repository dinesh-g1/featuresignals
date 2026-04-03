package audit

import (
	"context"
	"encoding/json"
	"log/slog"

	"github.com/featuresignals/server/internal/domain"
)

// Writer is the narrow interface this service needs (ISP / DIP).
type Writer interface {
	CreateAuditEntry(ctx context.Context, entry *domain.AuditEntry) error
}

// Service centralises audit-log recording so handlers don't
// duplicate the marshal-and-create pattern (SRP).
type Service struct {
	w      Writer
	logger *slog.Logger
}

// NewService creates an audit service.
func NewService(w Writer, logger *slog.Logger) *Service {
	return &Service{w: w, logger: logger}
}

// RecordParams carries the data for an audit entry.
type RecordParams struct {
	OrgID        string
	ActorID      string
	Action       string
	ResourceType string
	ResourceID   string
	Before       interface{}
	After        interface{}
}

// Record serialises before/after states and writes an audit entry.
// Errors are logged but not propagated because audit failures should not
// block the primary operation.
func (s *Service) Record(ctx context.Context, p RecordParams) {
	entry := &domain.AuditEntry{
		OrgID:        p.OrgID,
		ActorType:    "user",
		Action:       p.Action,
		ResourceType: p.ResourceType,
	}
	if p.ActorID != "" {
		entry.ActorID = &p.ActorID
	}
	if p.ResourceID != "" {
		entry.ResourceID = &p.ResourceID
	}
	if p.Before != nil {
		if b, err := json.Marshal(p.Before); err == nil {
			entry.BeforeState = b
		}
	}
	if p.After != nil {
		if a, err := json.Marshal(p.After); err == nil {
			entry.AfterState = a
		}
	}

	if err := s.w.CreateAuditEntry(ctx, entry); err != nil {
		s.logger.Warn("audit record failed",
			"action", p.Action,
			"resource", p.ResourceType,
			"err", err,
		)
	}
}
