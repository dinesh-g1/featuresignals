// Package dto defines request/response Data Transfer Objects for the FeatureSignals API.
//
// Preflight DTOs cover pre-change impact assessments, progressive rollout
// phases, and approval requests — the Stage 3 Preflight product surface.
package dto

// ─── Assess Types ──────────────────────────────────────────────────────────

// AssessRequest is the request body for POST /v1/preflight/assess.
type AssessRequest struct {
	FlagKey                string `json:"flag_key"`
	EnvID                  string `json:"env_id"`
	ChangeType             string `json:"change_type"`
	TargetPercentage       int    `json:"target_percentage,omitempty"`
	ObservationPeriodHours int    `json:"observation_period_hours,omitempty"`
}

// AssessResponse is returned from preflight assessment operations.
type AssessResponse struct {
	AssessmentID     string             `json:"assessment_id"`
	FlagKey          string             `json:"flag_key"`
	RiskScore        int                `json:"risk_score"`
	ImpactSummary    string             `json:"impact_summary"`
	AffectedFiles    int                `json:"affected_files"`
	AffectedCodeRefs int                `json:"affected_code_refs"`
	ComplianceStatus string             `json:"compliance_status"` // passed, warning, failed
	RolloutPlan      []RolloutPhaseItem `json:"rollout_plan"`
	GeneratedAt      string             `json:"generated_at"`
}

// RolloutPhaseItem represents a single phase in the progressive rollout plan.
type RolloutPhaseItem struct {
	Phase         int               `json:"phase"`
	Percentage    int               `json:"percentage"`
	DurationHours int               `json:"duration_hours"`
	GuardMetrics  []GuardMetricItem `json:"guard_metrics,omitempty"`
}

// GuardMetricItem defines a guardrail metric for a rollout phase.
type GuardMetricItem struct {
	Metric    string  `json:"metric"`    // error_rate, p99_latency, evaluation_volume
	Threshold float64 `json:"threshold"`
	Operator  string  `json:"operator"`  // gt, lt, gte, lte
}

// ─── Approval Types ────────────────────────────────────────────────────────

// CreateApprovalRequest is the request body for POST /v1/preflight/approval.
type CreateApprovalRequest struct {
	AssessmentID string `json:"assessment_id"`
	Justification string `json:"justification,omitempty"`
	ScheduledAt  string `json:"scheduled_at,omitempty"`
}

// PreflightApprovalResponse is returned from preflight approval operations.
type PreflightApprovalResponse struct {
	ApprovalID   string `json:"approval_id"`
	Status       string `json:"status"`
	AssessmentID string `json:"assessment_id"`
	FlagKey      string `json:"flag_key"`
	RequestedBy  string `json:"requested_by"`
	ReviewerID   string `json:"reviewer_id,omitempty"`
	Decision     string `json:"decision,omitempty"`
	Comment      string `json:"comment,omitempty"`
	DecidedAt    string `json:"decided_at,omitempty"`
	CreatedAt    string `json:"created_at"`
}

// ─── List Response Types ───────────────────────────────────────────────────

// ListAssessmentsResponse is the paginated response for listing assessments.
type ListAssessmentsResponse struct {
	Data  []AssessResponse `json:"data"`
	Total int              `json:"total"`
}

// ListPreflightApprovalsResponse is the paginated response for listing approvals.
type ListPreflightApprovalsResponse struct {
	Data  []PreflightApprovalResponse `json:"data"`
	Total int                         `json:"total"`
}
