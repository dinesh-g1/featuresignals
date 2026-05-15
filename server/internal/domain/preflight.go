// Package domain defines core business types for FeatureSignals.
//
// Preflight domain types represent pre-change impact assessments, progressive
// rollout phases, and approval requests. These map to the Stage 3 Preflight
// product (Steps CONFIGURE→APPROVE→EXECUTE of the 14-step lifecycle).
package domain

import (
	"context"
	"encoding/json"
	"time"
)

// PreflightReport represents a pre-change impact assessment.
type PreflightReport struct {
	ID               string          `json:"id"`
	OrgID            string          `json:"org_id"`
	FlagKey          string          `json:"flag_key"`
	FlagID           string          `json:"flag_id,omitempty"`
	ChangeType       string          `json:"change_type"` // rollout, toggle, kill, rollback, archive, update_rules
	EnvID            string          `json:"env_id"`
	Report           json.RawMessage `json:"report"`       // Full JSONB report
	RiskScore        int             `json:"risk_score"`   // 0-100
	AffectedFiles    int             `json:"affected_files"`
	AffectedCodeRefs int             `json:"affected_code_refs"`
	GeneratedAt      time.Time       `json:"generated_at"`
	ViewedAt         *time.Time      `json:"viewed_at,omitempty"`
	CreatedAt        time.Time       `json:"created_at"`
	UpdatedAt        time.Time       `json:"updated_at"`
}

// RolloutPhase represents a single phase in a progressive rollout plan.
type RolloutPhase struct {
	ID            string          `json:"id"`
	OrgID         string          `json:"org_id"`
	FlagID        string          `json:"flag_id"`
	PhaseNumber   int             `json:"phase_number"`
	Percentage    int             `json:"percentage"`      // 0-10000 (basis points)
	DurationHours int             `json:"duration_hours"`  // observation period
	GuardMetrics  json.RawMessage `json:"guard_metrics"`   // JSONB: [{metric, threshold, operator}]
	Status        string          `json:"status"`          // pending, active, completed, paused, failed
	StartedAt     *time.Time      `json:"started_at,omitempty"`
	CompletedAt   *time.Time      `json:"completed_at,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// PreflightApprovalRequest represents a request for change approval based on a Preflight report.
type PreflightApprovalRequest struct {
	ID            string     `json:"id"`
	OrgID         string     `json:"org_id"`
	AssessmentID  string     `json:"assessment_id"` // FK to preflight_reports
	FlagKey       string     `json:"flag_key"`
	RequestedBy   string     `json:"requested_by"`
	Status        string     `json:"status"` // pending, approved, rejected, expired
	ReviewerID    string     `json:"reviewer_id,omitempty"`
	Decision      string     `json:"decision,omitempty"` // approved, rejected
	Comment       string     `json:"comment,omitempty"`
	Justification string     `json:"justification,omitempty"`
	ScheduledAt   *time.Time `json:"scheduled_at,omitempty"`
	DecidedAt     *time.Time `json:"decided_at,omitempty"`
	CreatedAt     time.Time  `json:"created_at"`
	UpdatedAt     time.Time  `json:"updated_at"`
}

// ─── Well-known constants ──────────────────────────────────────────────────

const (
	ChangeTypeRollout     = "rollout"
	ChangeTypeToggle      = "toggle"
	ChangeTypeKill        = "kill"
	ChangeTypeRollback    = "rollback"
	ChangeTypeArchive     = "archive"
	ChangeTypeUpdateRules = "update_rules"

	PhaseStatusPending   = "pending"
	PhaseStatusActive    = "active"
	PhaseStatusCompleted = "completed"
	PhaseStatusPaused    = "paused"
	PhaseStatusFailed    = "failed"

	PreflightApprovalStatusPending  = "pending"
	PreflightApprovalStatusApproved = "approved"
	PreflightApprovalStatusRejected = "rejected"
	PreflightApprovalStatusExpired  = "expired"
)

// ─── Store Interfaces ──────────────────────────────────────────────────────

// PreflightReader provides read access to Preflight entities.
type PreflightReader interface {
	GetPreflightReport(ctx context.Context, id string) (*PreflightReport, error)
	ListPreflightReports(ctx context.Context, orgID string, flagKey string, limit, offset int) ([]PreflightReport, error)
	CountPreflightReports(ctx context.Context, orgID string, flagKey string) (int, error)
	GetLatestReport(ctx context.Context, orgID, flagKey string) (*PreflightReport, error)

	ListRolloutPhases(ctx context.Context, flagID string) ([]RolloutPhase, error)
	GetRolloutPhase(ctx context.Context, id string) (*RolloutPhase, error)
	GetActivePhase(ctx context.Context, flagID string) (*RolloutPhase, error)

	GetApprovalRequest(ctx context.Context, id string) (*PreflightApprovalRequest, error)
	ListApprovalRequests(ctx context.Context, orgID string, status string, limit, offset int) ([]PreflightApprovalRequest, error)
	CountApprovalRequests(ctx context.Context, orgID string, status string) (int, error)
}

// PreflightWriter provides mutating operations for Preflight entities.
type PreflightWriter interface {
	CreatePreflightReport(ctx context.Context, r *PreflightReport) error
	UpdatePreflightReport(ctx context.Context, id string, updates map[string]interface{}) error

	CreateRolloutPhase(ctx context.Context, p *RolloutPhase) error
	UpdateRolloutPhase(ctx context.Context, id string, updates map[string]interface{}) error
	BatchCreateRolloutPhases(ctx context.Context, phases []RolloutPhase) error

	CreateApprovalRequest(ctx context.Context, a *PreflightApprovalRequest) error
	UpdateApprovalRequest(ctx context.Context, id string, updates map[string]interface{}) error
}
