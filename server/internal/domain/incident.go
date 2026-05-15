// Package domain defines core business types for FeatureSignals.
//
// Incident domain types represent post-change safety net entities — incident
// correlation (linking production incidents to recent flag changes) and auto-
// remediation (automated pause/rollback/kill actions). These map to the Stage 3
// IncidentFlag product (Steps OBSERVE→DECIDE of the 14-step lifecycle).
package domain

import (
	"context"
	"encoding/json"
	"time"
)

// ─── Entity Types ──────────────────────────────────────────────────────────

// IncidentCorrelation links a production incident to potentially-causal flag
// changes that occurred within a configurable window before the incident.
type IncidentCorrelation struct {
	ID                string          `json:"id"`
	OrgID             string          `json:"org_id"`
	IncidentStartedAt time.Time       `json:"incident_started_at"`
	IncidentEndedAt   *time.Time      `json:"incident_ended_at,omitempty"`
	ServicesAffected  []string        `json:"services_affected,omitempty"`
	EnvID             string          `json:"env_id,omitempty"`
	TotalFlagsChanged int             `json:"total_flags_changed"`
	CorrelatedChanges json.RawMessage `json:"correlated_changes"`  // JSONB array of CorrelatedChange
	HighestCorrelation float64        `json:"highest_correlation"` // 0.0-1.0
	CreatedAt         time.Time       `json:"created_at"`
	UpdatedAt         time.Time       `json:"updated_at"`
}

// AutoRemediation records an automated remediation action taken on a flag in
// response to a detected incident or anomaly.
type AutoRemediation struct {
	ID            string          `json:"id"`
	OrgID         string          `json:"org_id"`
	FlagKey       string          `json:"flag_key"`
	EnvID         string          `json:"env_id"`
	Action        string          `json:"action"` // pause, rollback, kill
	CorrelationID string          `json:"correlation_id,omitempty"`
	Reason        string          `json:"reason,omitempty"`
	Status        string          `json:"status"` // applied, failed, confirmation_needed
	PreviousState json.RawMessage `json:"previous_state,omitempty"`
	AppliedAt     *time.Time      `json:"applied_at,omitempty"`
	CreatedAt     time.Time       `json:"created_at"`
	UpdatedAt     time.Time       `json:"updated_at"`
}

// ─── Well-Known Constants ──────────────────────────────────────────────────

const (
	RemediationActionPause    = "pause"
	RemediationActionRollback = "rollback"
	RemediationActionKill     = "kill"

	RemediationStatusApplied            = "applied"
	RemediationStatusFailed             = "failed"
	RemediationStatusConfirmationNeeded = "confirmation_needed"
)

// ─── Store Interfaces ──────────────────────────────────────────────────────

// IncidentReader provides read access to incident entities.
type IncidentReader interface {
	GetIncidentCorrelation(ctx context.Context, id string) (*IncidentCorrelation, error)
	ListIncidentCorrelations(ctx context.Context, orgID string, limit, offset int) ([]IncidentCorrelation, error)
	CountIncidentCorrelations(ctx context.Context, orgID string) (int, error)

	GetAutoRemediation(ctx context.Context, id string) (*AutoRemediation, error)
	ListAutoRemediations(ctx context.Context, orgID, flagKey string, limit, offset int) ([]AutoRemediation, error)
	CountAutoRemediations(ctx context.Context, orgID, flagKey string) (int, error)
}

// IncidentWriter provides mutating operations for incident entities.
type IncidentWriter interface {
	CreateIncidentCorrelation(ctx context.Context, c *IncidentCorrelation) error
	CreateAutoRemediation(ctx context.Context, r *AutoRemediation) error
	UpdateAutoRemediation(ctx context.Context, id string, updates map[string]interface{}) error
}
