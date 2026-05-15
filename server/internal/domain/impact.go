// Package domain defines core business types for FeatureSignals.
//
// Impact domain types represent the post-rollout feedback loop — measuring
// the impact of feature flags, attributing costs, and capturing organizational
// learnings. These map to the Stage 3 Impact Analyzer product (Steps
// ANALYZE→LEARN of the 14-step lifecycle).
package domain

import (
	"context"
	"encoding/json"
	"time"
)

// ─── Entity Types ──────────────────────────────────────────────────────────

// ImpactReport measures the post-rollout impact of a feature flag, aggregating
// metrics, business impact, and recommendations into a single report.
type ImpactReport struct {
	ID              string          `json:"id"`
	OrgID           string          `json:"org_id"`
	FlagKey         string          `json:"flag_key"`
	FlagID          string          `json:"flag_id,omitempty"`
	Report          json.RawMessage `json:"report"`                   // JSONB: full impact analysis
	MetricsSnapshot json.RawMessage `json:"metrics_snapshot,omitempty"` // JSONB: raw metric data
	BusinessImpact  string          `json:"business_impact,omitempty"` // positive, neutral, negative
	CostAttribution float64         `json:"cost_attribution"`         // estimated cost
	Recommendations json.RawMessage `json:"recommendations,omitempty"` // JSONB: actionable recommendations
	GeneratedAt     time.Time       `json:"generated_at"`
	CreatedAt       time.Time       `json:"created_at"`
	UpdatedAt       time.Time       `json:"updated_at"`
}

// CostAttribution breaks down the cost of a feature flag by resource type over
// a specific period.
type CostAttribution struct {
	ID           string    `json:"id"`
	OrgID        string    `json:"org_id"`
	FlagKey      string    `json:"flag_key"`
	ResourceType string    `json:"resource_type"` // compute, latency, error_budget, llm_tokens, bandwidth
	CostAmount   float64   `json:"cost_amount"`
	Currency     string    `json:"currency"` // USD
	PeriodStart  time.Time `json:"period_start"`
	PeriodEnd    time.Time `json:"period_end"`
	CreatedAt    time.Time `json:"created_at"`
	UpdatedAt    time.Time `json:"updated_at"`
}

// OrgLearning captures organizational insights aggregated across all flags
// within an organization at a point in time.
type OrgLearning struct {
	ID                      string          `json:"id"`
	OrgID                   string          `json:"org_id"`
	TotalFlagsAnalyzed      int             `json:"total_flags_analyzed"`
	CleanupCandidates       int             `json:"cleanup_candidates"`
	FlagsWithoutOwners      int             `json:"flags_without_owners"`
	StaleFlags              int             `json:"stale_flags"`
	AvgRiskScore            float64         `json:"avg_risk_score"`
	AvgTimeToFullRollout    float64         `json:"avg_time_to_full_rollout_hours"`
	TopInsights             json.RawMessage `json:"top_insights"` // JSONB array
	GeneratedAt             time.Time       `json:"generated_at"`
	CreatedAt               time.Time       `json:"created_at"`
	UpdatedAt               time.Time       `json:"updated_at"`
}

// ─── Well-Known Constants ──────────────────────────────────────────────────

const (
	BusinessImpactPositive = "positive"
	BusinessImpactNeutral  = "neutral"
	BusinessImpactNegative = "negative"

	ResourceTypeCompute     = "compute"
	ResourceTypeLatency     = "latency"
	ResourceTypeErrorBudget = "error_budget"
	ResourceTypeLLMTokens   = "llm_tokens"
	ResourceTypeBandwidth   = "bandwidth"
)

// ─── Store Interfaces ──────────────────────────────────────────────────────

// ImpactReader provides read access to impact entities.
type ImpactReader interface {
	GetImpactReport(ctx context.Context, id string) (*ImpactReport, error)
	ListImpactReports(ctx context.Context, orgID, flagKey string, limit, offset int) ([]ImpactReport, error)
	CountImpactReports(ctx context.Context, orgID, flagKey string) (int, error)
	GetLatestImpactReport(ctx context.Context, orgID, flagKey string) (*ImpactReport, error)

	ListCostAttributions(ctx context.Context, orgID, flagKey string) ([]CostAttribution, error)

	GetOrgLearning(ctx context.Context, orgID string) (*OrgLearning, error)
	ListOrgLearnings(ctx context.Context, orgID string, limit, offset int) ([]OrgLearning, error)
}

// ImpactWriter provides mutating operations for impact entities.
type ImpactWriter interface {
	CreateImpactReport(ctx context.Context, r *ImpactReport) error
	CreateCostAttribution(ctx context.Context, c *CostAttribution) error
	CreateOrgLearning(ctx context.Context, l *OrgLearning) error
}
