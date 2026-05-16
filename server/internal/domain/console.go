// Package domain defines core business types for FeatureSignals.
//
// Console domain types power the three-zone Console surface: CONNECT (integrations),
// LIFECYCLE (14-stage feature lifecycle with flag cards), and LEARN (impact reports,
// cost tracking, team velocity, org learnings). All queries are org-scoped;
// cross-org access returns 404.
package domain

import (
	"context"
	"time"
)

// ─── Well-Known Stage Constants ────────────────────────────────────────────
//
// The 14 lifecycle stages map to the 14-step human feature lifecycle:
//
//	Plan → Spec → Design → Flag → Implement → Test → Configure →
//	Approve → Ship → Monitor → Decide → Analyze → Learn

const (
	StagePlan      = "plan"
	StageSpec      = "spec"
	StageDesign    = "design"
	StageFlag      = "flag"
	StageImplement = "implement"
	StageTest      = "test"
	StageConfigure = "configure"
	StageApprove   = "approve"
	StageShip      = "ship"
	StageMonitor   = "monitor"
	StageDecide    = "decide"
	StageAnalyze   = "analyze"
	StageLearn     = "learn"
)

// StageOrder maps each stage to its ordinal position (0-indexed) for
// advance/transition validation.
var StageOrder = map[string]int{
	StagePlan:      0,
	StageSpec:      1,
	StageDesign:    2,
	StageFlag:      3,
	StageImplement: 4,
	StageTest:      5,
	StageConfigure: 6,
	StageApprove:   7,
	StageShip:      8,
	StageMonitor:   9,
	StageDecide:    10,
	StageAnalyze:   11,
	StageLearn:     12,
}

// NextStage returns the stage that follows the given stage, or empty string
// if already at the last stage.
func NextStage(current string) string {
	ord, ok := StageOrder[current]
	if !ok || ord >= len(stageSequence)-1 {
		return ""
	}
	return stageSequence[ord+1]
}

// stageSequence is the ordered list of stages for efficient lookup.
var stageSequence = []string{
	StagePlan, StageSpec, StageDesign, StageFlag,
	StageImplement, StageTest, StageConfigure, StageApprove,
	StageShip, StageMonitor, StageDecide, StageAnalyze, StageLearn,
}

// ValidStage returns true if the given string is a recognised lifecycle stage.
func ValidStage(s string) bool {
	_, ok := StageOrder[s]
	return ok
}

// ─── Console Flag ──────────────────────────────────────────────────────────

// ConsoleFlag is the console-oriented view of a feature flag, enriched with
// lifecycle stage, evaluation volume, health metrics, AI suggestions, and
// dependency graph information.
type ConsoleFlag struct {
	Key                string    `json:"key"`
	Name               string    `json:"name"`
	Description        string    `json:"description"`
	Stage              string    `json:"stage"`
	Status             string    `json:"status"`
	Environment        string    `json:"environment"`
	EnvironmentName    string    `json:"environment_name"`
	Type               string    `json:"type"`
	EvalVolume         int64     `json:"eval_volume"`
	EvalTrend          float64   `json:"eval_trend"`
	RolloutPercent     int       `json:"rollout_percent"`
	HealthScore        int       `json:"health_score"`
	LastAction         string    `json:"last_action"`
	LastActionAt       *time.Time `json:"last_action_at"`
	LastActionBy       string    `json:"last_action_by"`
	AISuggestion       *string   `json:"ai_suggestion,omitempty"`
	AISuggestionType   *string   `json:"ai_suggestion_type,omitempty"`
	AIConfidence       *float64  `json:"ai_confidence,omitempty"`
	AIExecuted         bool      `json:"ai_executed"`
	CodeReferenceCount int       `json:"code_reference_count"`
	DependsOn          []string  `json:"depends_on,omitempty"`
	DependedOnBy       []string  `json:"depended_on_by,omitempty"`
}

// ─── Console Insights (LEARN Zone) ─────────────────────────────────────────

// ConsoleInsights aggregates all post-rollout learning data for the LEARN zone.
type ConsoleInsights struct {
	ImpactReports  []ImpactReport  `json:"impact_reports"`
	CostAttribution CostAttribution `json:"cost_attribution"`
	TeamVelocity   TeamVelocity    `json:"team_velocity"`
	OrgLearnings   []OrgLearning   `json:"org_learnings"`
	RecentActivity []ActivityEntry `json:"recent_activity"`
}

// TeamVelocity tracks how quickly the team moves through the lifecycle.
type TeamVelocity struct {
	AvgDaysPlanToFlag    float64 `json:"avg_days_plan_to_flag"`
	AvgDaysFlagToShip    float64 `json:"avg_days_flag_to_ship"`
	AvgDaysShipToLearn   float64 `json:"avg_days_ship_to_learn"`
	TotalFlagsShipped    int     `json:"total_flags_shipped"`
	TotalFlagsInProgress int     `json:"total_flags_in_progress"`
}

// ActivityEntry is a single timeline entry for the LEARN recent activity feed.
type ActivityEntry struct {
	ID        string    `json:"id"`
	Action    string    `json:"action"`
	FlagKey   string    `json:"flag_key,omitempty"`
	FlagName  string    `json:"flag_name,omitempty"`
	ActorName string    `json:"actor_name,omitempty"`
	Timestamp time.Time `json:"timestamp"`
}

// ─── Console Integrations (CONNECT Zone) ───────────────────────────────────

// ConsoleIntegrations aggregates all integration statuses for the CONNECT zone.
type ConsoleIntegrations struct {
	Repositories []RepoStatus         `json:"repositories"`
	SDKs         []SdkStatus          `json:"sdks"`
	Agents       []ConsoleAgentStatus `json:"agents"`
	APIKeys      []ConsoleApiKeyStatus `json:"api_keys"`
}

// RepoStatus represents the connection state of a linked repository.
type RepoStatus struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Provider      string    `json:"provider"`
	DefaultBranch string    `json:"default_branch"`
	LastSyncedAt  *time.Time `json:"last_synced_at"`
	Status        string    `json:"status"`
	TotalPRs      int       `json:"total_prs"`
	OpenPRs       int       `json:"open_prs"`
}

// SdkStatus represents an SDK integration in the customer's stack.
type SdkStatus struct {
	Language   string    `json:"language"`
	Version    string    `json:"version"`
	Environments []string `json:"environments"`
	LastSeenAt *time.Time `json:"last_seen_at"`
	Status     string    `json:"status"`
}

// AgentStatus is the console-oriented view of a registered agent.
// Distinct from domain.AgentStatus (the enum) — this is a display type.
type ConsoleAgentStatus struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	Type          string    `json:"type"`
	Status        string    `json:"status"`
	LastHeartbeat *time.Time `json:"last_heartbeat"`
	TasksCompleted int64    `json:"tasks_completed"`
}

// ApiKeyStatus is the console-oriented view of an API key.
type ConsoleApiKeyStatus struct {
	ID         string    `json:"id"`
	Name       string    `json:"name"`
	Type       string    `json:"type"`
	KeyPrefix  string    `json:"key_prefix"`
	LastUsedAt *time.Time `json:"last_used_at"`
	Status     string    `json:"status"`
	Environment string   `json:"environment"`
}

// ─── Mutating Operation Types ──────────────────────────────────────────────

// AdvanceResult is returned after advancing a flag to the next lifecycle stage.
type AdvanceResult struct {
	Flag     ConsoleFlag `json:"flag"`
	NewStage string      `json:"new_stage"`
}

// ShipParams contains the parameters for shipping (rolling out) a flag.
type ShipParams struct {
	TargetPercent int      `json:"target_percent"`
	GuardMetrics  []string `json:"guard_metrics"`
	Environment   string   `json:"environment"`
}

// ShipResult is returned after a successful ship operation.
type ShipResult struct {
	Flag        ConsoleFlag `json:"flag"`
	LiveEvalURL string      `json:"live_eval_url"`
}

// ─── Help Context ──────────────────────────────────────────────────────────

// HelpContext provides the AI assistant with the current state of the user's
// console session for contextual suggestions.
type HelpContext struct {
	CurrentStage       *string        `json:"current_stage,omitempty"`
	CurrentFeature     *string        `json:"current_feature,omitempty"`
	CurrentEnvironment *string        `json:"current_environment,omitempty"`
	RecentActions      []ActivityEntry `json:"recent_actions"`
	LastError          *LastError     `json:"last_error,omitempty"`
	OrgID              string         `json:"org_id"`
	OrgName            string         `json:"org_name"`
	UserName           string         `json:"user_name"`
	UserRole           string         `json:"user_role"`
	Plan               string         `json:"plan"`
}

// LastError captures the most recent API error for contextual debugging.
type LastError struct {
	Endpoint   string `json:"endpoint"`
	StatusCode int    `json:"status_code"`
	RequestID  string `json:"request_id"`
	Message    string `json:"message"`
	Timestamp  string `json:"timestamp"`
}

// ─── Store Interfaces (ISP — narrowest possible) ───────────────────────────

// ConsoleReader provides read access for the Console surface.
type ConsoleReader interface {
	ListFlags(ctx context.Context, orgID string, params ConsoleListParams) ([]ConsoleFlag, int, error)
	GetFlag(ctx context.Context, orgID, key string) (*ConsoleFlag, error)
	GetInsights(ctx context.Context, orgID string) (*ConsoleInsights, error)
	GetIntegrations(ctx context.Context, orgID string) (*ConsoleIntegrations, error)
	GetHelpContext(ctx context.Context, orgID, userID string) (*HelpContext, error)
}

// ConsoleWriter provides mutating operations for the Console surface.
type ConsoleWriter interface {
	AdvanceStage(ctx context.Context, orgID, key, environment string) (*AdvanceResult, error)
	Ship(ctx context.Context, orgID, key string, params ShipParams) (*ShipResult, error)
	ToggleFlag(ctx context.Context, orgID, key, action string) (*ConsoleFlag, error)
	ArchiveFlag(ctx context.Context, orgID, key string) (*ConsoleFlag, error)
}

// ConsoleListParams captures the full set of filtering, sorting, and
// pagination parameters for the console flag list endpoint.
type ConsoleListParams struct {
	OrgID       string
	ProjectID   string
	Environment string
	Stage       string
	Search      string
	Sort        string
	Limit       int
	Offset      int
}
