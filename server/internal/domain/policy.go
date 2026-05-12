// Package domain defines the core business interfaces for FeatureSignals.
//
// Policy defines the CEL (Common Expression Language) policy schema for
// agent governance. Policies are organization-specific rules that constrain
// what agents can do, when, and under what conditions.
//
// Policies are evaluated by the governance pipeline's policy step.
// They are defined by organization admins via the dashboard and stored
// in the database. The CEL expression language provides a safe, sandboxed
// way to express complex rules without code changes.
package domain

import (
	"context"
	"time"
)

// ─── Policy Definition ─────────────────────────────────────────────────────

// Policy is a single governance rule that constrains agent behavior.
// It is evaluated against an AgentAction by the governance pipeline.
// Multiple policies can apply to a single action; all must pass.
type Policy struct {
	// ID uniquely identifies this policy.
	ID string `json:"id"`

	// OrgID is the organization this policy belongs to.
	OrgID string `json:"org_id"`

	// Name is a human-readable label (e.g., "Require approval for production").
	Name string `json:"name"`

	// Description explains the policy's intent.
	Description string `json:"description,omitempty"`

	// Enabled controls whether this policy is active.
	Enabled bool `json:"enabled"`

	// Priority determines evaluation order. Lower numbers evaluate first.
	// If two policies conflict, the lower-priority (higher number) policy
	// is ignored. Range: 0 (highest) to 1000 (lowest).
	Priority int `json:"priority"`

	// Scope limits which agents/actions this policy applies to.
	Scope PolicyScope `json:"scope"`

	// Rules are the CEL expressions that must evaluate to true.
	// All rules must pass for the policy to pass.
	Rules []PolicyRule `json:"rules"`

	// Effect determines what happens when the policy fails.
	Effect PolicyEffect `json:"effect"`

	// CreatedAt is when this policy was created.
	CreatedAt time.Time `json:"created_at"`

	// UpdatedAt is when this policy was last modified.
	UpdatedAt time.Time `json:"updated_at"`
}

// PolicyScope limits which agent actions a policy applies to.
type PolicyScope struct {
	// AgentTypes restricts to specific agent categories. Empty = all.
	AgentTypes []string `json:"agent_types,omitempty"`

	// AgentIDs restricts to specific agent instances. Empty = all.
	AgentIDs []string `json:"agent_ids,omitempty"`

	// ToolNames restricts to specific tool invocations. Empty = all tools.
	ToolNames []string `json:"tool_names,omitempty"`

	// Environments restricts to specific environments. Empty = all.
	// Format: environment IDs (e.g., "env_prod_123").
	Environments []string `json:"environments,omitempty"`

	// Projects restricts to specific projects. Empty = all.
	Projects []string `json:"projects,omitempty"`
}

// PolicyRule is a single CEL expression that must evaluate to true.
type PolicyRule struct {
	// Name identifies this rule within the policy.
	Name string `json:"name"`

	// Description explains what this rule checks.
	Description string `json:"description,omitempty"`

	// Expression is the CEL expression to evaluate. The expression has
	// access to the following variables:
	//
	//   action        — the AgentAction being evaluated
	//   action.agent   — the Agent proposing the action
	//   action.context — the AgentContext (org, project, env, user)
	//   action.decision — the Decision being proposed
	//   action.blast_radius — the BlastRadiusEstimate
	//   now            — current time (time.Time)
	//
	// Examples:
	//   action.decision.confidence >= 0.8
	//   action.blast_radius.affected_percentage <= 10.0
	//   action.agent.maturity.current_level >= 3
	//   action.context.environment_id != "env_prod_123" || action.decision.requires_human
	//   now.getDayOfWeek() >= 2 && now.getDayOfWeek() <= 6  // weekdays only
	//   action.decision.action != "flag.toggle" || action.agent.maturity.current_level >= 4
	Expression string `json:"expression"`

	// Message is the human-readable error shown when this rule fails.
	Message string `json:"message"`
}

// PolicyEffect determines what happens when a policy fails.
type PolicyEffect string

const (
	// PolicyEffectDeny blocks the action. The agent receives a rejection.
	PolicyEffectDeny PolicyEffect = "deny"

	// PolicyEffectRequireHuman escalates for human approval. The action
	// is suspended until a human reviews it.
	PolicyEffectRequireHuman PolicyEffect = "require_human"

	// PolicyEffectWarn allows the action but logs a warning. Used for
	// non-critical policies that are being tested or phased in.
	PolicyEffectWarn PolicyEffect = "warn"

	// PolicyEffectAudit allows the action but creates a high-severity
	// audit entry for later review.
	PolicyEffectAudit PolicyEffect = "audit"
)

// ─── Policy Evaluation Context ─────────────────────────────────────────────

// PolicyEvalContext is the runtime context passed to CEL expression
// evaluation. It wraps the action with additional runtime data.
type PolicyEvalContext struct {
	// Action is the agent action being evaluated.
	Action AgentAction `json:"action"`

	// Now is the current time (for time-based rules).
	Now time.Time `json:"now"`

	// OrgPlan is the organization's current billing plan (for plan-gated rules).
	OrgPlan string `json:"org_plan,omitempty"`

	// OrgMaturity is the organization's process maturity level (L1-L5).
	OrgMaturity MaturityLevel `json:"org_maturity"`

	// Metadata carries additional runtime context from protocol adapters.
	Metadata map[string]any `json:"metadata,omitempty"`
}

// PolicyEvalResult is the output of evaluating a policy against an action.
type PolicyEvalResult struct {
	// PolicyID identifies the policy that was evaluated.
	PolicyID string `json:"policy_id"`

	// PolicyName is the human-readable policy name.
	PolicyName string `json:"policy_name"`

	// Passed is true if all rules passed.
	Passed bool `json:"passed"`

	// Failures lists the rules that failed (empty if Passed is true).
	Failures []PolicyRuleFailure `json:"failures,omitempty"`

	// Effect is the policy's effect (relevant when Passed is false).
	Effect PolicyEffect `json:"effect"`

	// EvaluatedAt is when evaluation occurred.
	EvaluatedAt time.Time `json:"evaluated_at"`

	// EvalDurationMs is how long evaluation took.
	EvalDurationMs int64 `json:"eval_duration_ms"`
}

// PolicyRuleFailure describes a single rule that failed.
type PolicyRuleFailure struct {
	// RuleName identifies the rule.
	RuleName string `json:"rule_name"`

	// Expression is the CEL expression that failed.
	Expression string `json:"expression"`

	// Message is the human-readable error.
	Message string `json:"message"`

	// ActualValue is a string representation of the value that caused
	// the failure (for debugging).
	ActualValue string `json:"actual_value,omitempty"`
}

// ─── Policy Store interfaces ───────────────────────────────────────────────

// PolicyReader provides read access to governance policies.
type PolicyReader interface {
	// GetPolicy retrieves a single policy by ID.
	GetPolicy(ctx context.Context, orgID, policyID string) (*Policy, error)

	// ListPolicies returns all policies for an organization, ordered by priority.
	ListPolicies(ctx context.Context, orgID string) ([]Policy, error)

	// ListApplicablePolicies returns policies that match the given scope.
	// Used by the governance pipeline to select relevant policies for an action.
	ListApplicablePolicies(ctx context.Context, orgID string, scope PolicyScope) ([]Policy, error)
}

// PolicyWriter provides write access to governance policies.
type PolicyWriter interface {
	// CreatePolicy creates a new policy.
	CreatePolicy(ctx context.Context, policy *Policy) error

	// UpdatePolicy modifies an existing policy.
	UpdatePolicy(ctx context.Context, policy *Policy) error

	// DeletePolicy removes a policy.
	DeletePolicy(ctx context.Context, orgID, policyID string) error

	// SetPolicyEnabled enables or disables a policy.
	SetPolicyEnabled(ctx context.Context, orgID, policyID string, enabled bool) error
}

// PolicyStore combines read and write access to governance policies.
type PolicyStore interface {
	PolicyReader
	PolicyWriter
}

// ─── Well-known policy names ──────────────────────────────────────────────

const (
	// Production protection policies
	PolicyRequireApprovalForProd = "require-approval-for-production"
	PolicyBlastRadiusLimit       = "blast-radius-limit"
	PolicyBusinessHoursOnly      = "business-hours-only"
	PolicyWeekdayOnly            = "weekday-only"
	PolicyMaintenanceWindowOnly  = "maintenance-window-only"

	// Agent maturity policies
	PolicyMinimumMaturityForProd    = "minimum-maturity-for-production"
	PolicyMinimumConfidenceThreshold = "minimum-confidence-threshold"
	PolicyRequireHumanForLowConfidence = "require-human-for-low-confidence"

	// Rate limiting policies
	PolicyMaxActionsPerHour = "max-actions-per-hour"
	PolicyMaxConcurrent     = "max-concurrent-actions"

	// Compliance policies
	PolicySOC2ChangeManagement  = "soc2-change-management"
	PolicyGDPRAutomatedDecision = "gdpr-automated-decision"
	PolicyDualControl           = "dual-control-approval"

	// Scope policies
	PolicyDenyProductionToggle = "deny-production-toggle"
	PolicyDenyFlagDeletion     = "deny-flag-deletion"
	PolicyDenySegmentDeletion  = "deny-segment-deletion"
)
