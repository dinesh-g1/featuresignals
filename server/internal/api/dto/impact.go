// Package dto defines request/response Data Transfer Objects for the FeatureSignals API.
//
// Impact DTOs cover impact reports, cost attributions, and organizational
// learnings — the Stage 3 Impact Analyzer product surface (Steps
// ANALYZE→LEARN of the 14-step lifecycle).
package dto

import "encoding/json"

// ─── Impact Report Types ───────────────────────────────────────────────────

// ImpactReportResponse is returned from GET /v1/impact/report/{flagKey}.
type ImpactReportResponse struct {
	FlagKey          string                `json:"flag_key"`
	Report           json.RawMessage       `json:"report"`
	MetricsSnapshot  json.RawMessage       `json:"metrics_snapshot,omitempty"`
	BusinessImpact   string                `json:"business_impact"` // positive, neutral, negative
	CostAttribution  float64               `json:"cost_attribution"`
	Recommendations  json.RawMessage       `json:"recommendations,omitempty"`
	GeneratedAt      string                `json:"generated_at"`
	CostBreakdown    []CostAttributionItem `json:"cost_breakdown,omitempty"`
}

// CostAttributionItem is a single cost line item in an impact report.
type CostAttributionItem struct {
	ResourceType string  `json:"resource_type"`
	CostAmount   float64 `json:"cost_amount"`
	Currency     string  `json:"currency"`
	PeriodStart  string  `json:"period_start"`
	PeriodEnd    string  `json:"period_end"`
}

// ─── Org Learning Types ────────────────────────────────────────────────────

// OrgLearningsResponse is returned from GET /v1/impact/learnings.
type OrgLearningsResponse struct {
	TotalFlagsAnalyzed      int               `json:"total_flags_analyzed"`
	CleanupCandidates       int               `json:"cleanup_candidates"`
	FlagsWithoutOwners      int               `json:"flags_without_owners"`
	StaleFlags              int               `json:"stale_flags"`
	AvgRiskScore            float64           `json:"avg_risk_score"`
	AvgTimeToFullRolloutHours float64          `json:"avg_time_to_full_rollout_hours"`
	TopInsights             json.RawMessage   `json:"top_insights"`
	GeneratedAt             string            `json:"generated_at"`
}
