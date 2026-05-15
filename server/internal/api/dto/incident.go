// Package dto defines request/response Data Transfer Objects for the FeatureSignals API.
//
// Incident DTOs cover incident correlation and auto-remediation — the Stage 3
// IncidentFlag product surface (Steps OBSERVE→DECIDE of the 14-step lifecycle).
package dto

import "encoding/json"

// ─── Monitor Types ─────────────────────────────────────────────────────────

// MonitorResponse is the monitoring status returned by GET /v1/incidentflag/monitor.
type MonitorResponse struct {
	ActiveAlerts        int                   `json:"active_alerts"`
	RecentCorrelations  []CorrelationSummary  `json:"recent_correlations"`
	FlagsUnderMonitoring int                  `json:"flags_under_monitoring"`
	OverallHealth       string                `json:"overall_health"` // healthy, warning, critical
}

// CorrelationSummary is a compact representation of a recent incident correlation.
type CorrelationSummary struct {
	ID                 string  `json:"id"`
	IncidentStartedAt  string  `json:"incident_started_at"`
	TotalFlagsChanged  int     `json:"total_flags_changed"`
	HighestCorrelation float64 `json:"highest_correlation"`
	CreatedAt          string  `json:"created_at"`
}

// ─── Correlate Types ───────────────────────────────────────────────────────

// CorrelateRequest is the request body for POST /v1/incidentflag/correlate.
type CorrelateRequest struct {
	IncidentStartedAt string   `json:"incident_started_at"`           // required, RFC 3339
	IncidentEndedAt   string   `json:"incident_ended_at,omitempty"`   // optional
	ServicesAffected  []string `json:"services_affected,omitempty"`   // optional
	EnvID             string   `json:"env_id,omitempty"`              // optional
}

// CorrelatedChangeItem represents a single flag change correlated to an incident.
type CorrelatedChangeItem struct {
	FlagKey          string  `json:"flag_key"`
	CorrelationScore float64 `json:"correlation_score"` // 0.0–1.0
	ChangeType       string  `json:"change_type"`       // toggle, rollout, kill
	ChangedAt        string  `json:"changed_at"`
	WasReverted      bool    `json:"was_reverted"`
	RiskLevel        string  `json:"risk_level"`        // low, medium, high, critical
}

// CorrelateResponse is returned from POST /v1/incidentflag/correlate.
type CorrelateResponse struct {
	CorrelationID    string                 `json:"correlation_id"`
	CorrelatedChanges []CorrelatedChangeItem `json:"correlated_changes"`
	TotalFlagsChanged int                    `json:"total_flags_changed"`
	HighestCorrelation float64               `json:"highest_correlation"`
	CreatedAt         string                 `json:"created_at"`
}

// ─── Remediate Types ───────────────────────────────────────────────────────

// RemediateRequest is the request body for POST /v1/incidentflag/remediate.
type RemediateRequest struct {
	FlagKey       string `json:"flag_key"`                 // required
	EnvID         string `json:"env_id"`                   // required
	Action        string `json:"action"`                   // required: pause, rollback, kill
	CorrelationID string `json:"correlation_id,omitempty"` // optional
	Reason        string `json:"reason,omitempty"`         // optional
}

// RemediateResponse is returned from POST /v1/incidentflag/remediate.
type RemediateResponse struct {
	RemediationID  string          `json:"remediation_id"`
	FlagKey        string          `json:"flag_key"`
	Action         string          `json:"action"`
	Status         string          `json:"status"`
	PreviousState  json.RawMessage `json:"previous_state,omitempty"`
	AppliedAt      string          `json:"applied_at,omitempty"`
	Message        string          `json:"message,omitempty"`
}
