package store

import (
	"context"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// LLMInteractionFilter for querying the audit log.
type LLMInteractionFilter struct {
	Operation  string
	Provider   string
	FlagKey    string
	ScanID     string
	FromDate   *time.Time
	ToDate     *time.Time
	Status     int // 0 = all, 200 = success, 500 = error
	Limit      int
	Offset     int
}

// ComplianceStore defines the interface for compliance-related data persistence.
type ComplianceStore interface {
	// Provider management
	ListApprovedProviders(ctx context.Context, orgID string) ([]domain.ApprovedLLMProvider, error)
	GetApprovedProvider(ctx context.Context, id string) (*domain.ApprovedLLMProvider, error)
	UpsertApprovedProvider(ctx context.Context, p *domain.ApprovedLLMProvider) error
	DeleteApprovedProvider(ctx context.Context, orgID, id string) error

	// Redaction rules
	ListRedactionRules(ctx context.Context, orgID string) ([]domain.RedactionRule, error)
	UpsertRedactionRule(ctx context.Context, r *domain.RedactionRule) error
	DeleteRedactionRule(ctx context.Context, orgID, id string) error

	// Compliance policy
	GetCompliancePolicy(ctx context.Context, orgID string) (*domain.LLMCompliancePolicy, error)
	UpsertCompliancePolicy(ctx context.Context, p *domain.LLMCompliancePolicy) error

	// Audit log
	RecordLLMInteraction(ctx context.Context, r *domain.LLMInteractionRecord) error
	QueryLLMInteractions(ctx context.Context, orgID string, filter LLMInteractionFilter) ([]domain.LLMInteractionRecord, error)
	CountLLMInteractions(ctx context.Context, orgID string, filter LLMInteractionFilter) (int, error)
	GetLLMBudgetUsage(ctx context.Context, orgID string, since time.Time) (int, error) // Total cost in cents
}