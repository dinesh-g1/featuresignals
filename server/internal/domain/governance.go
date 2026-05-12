// Package domain defines the core business interfaces for FeatureSignals.
//
// Governance is the 7-step pipeline that every agent action passes through
// before execution. It is pluggable middleware — not hardcoded into the
// agent runtime. Steps can be added, removed, or reordered per organization
// via the Process Alignment Architecture.
package domain

import (
	"context"
	"time"
)

// ─── Agent Action ─────────────────────────────────────────────────────────

// AgentAction represents an action an agent intends to take. It flows
// through the governance pipeline from proposal to execution (or rejection).
type AgentAction struct {
	// ID uniquely identifies this action for audit trail correlation.
	ID string `json:"id"`

	// AgentID identifies the agent proposing the action.
	AgentID string `json:"agent_id"`

	// AgentType is the agent's functional category.
	AgentType string `json:"agent_type"`

	// TaskID is the task that triggered this action.
	TaskID string `json:"task_id"`

	// Decision is the agent's proposed action.
	Decision Decision `json:"decision"`

	// Reasoning is the agent's auditable reasoning chain.
	Reasoning Reasoning `json:"reasoning"`

	// Context carries the operational context (org, project, env, user).
	Context AgentContext `json:"context"`

	// ToolName is the tool this action will invoke, if applicable.
	ToolName string `json:"tool_name,omitempty"`

	// ToolParams are the parameters for the tool invocation.
	ToolParams []byte `json:"tool_params,omitempty"`

	// BlastRadius is the estimated number of affected entities.
	// Used by the BlastRadius governance step.
	BlastRadius BlastRadiusEstimate `json:"blast_radius"`

	// ProposedAt is when the action was submitted to the pipeline.
	ProposedAt time.Time `json:"proposed_at"`

	// PipelineStage tracks which step the action is currently at.
	PipelineStage string `json:"pipeline_stage"`
}

// BlastRadiusEstimate is the estimated impact scope of an agent action.
type BlastRadiusEstimate struct {
	// AffectedEntities is the estimated number of entities impacted
	// (users, requests, flags, services).
	AffectedEntities int64 `json:"affected_entities"`

	// AffectedPercentage is the estimated percentage of total traffic/users.
	AffectedPercentage float64 `json:"affected_percentage"`

	// RiskLevel is a human-readable risk category.
	RiskLevel string `json:"risk_level"` // "low", "medium", "high", "critical"

	// Rationale explains how the estimate was computed.
	Rationale string `json:"rationale"`
}

// ─── GovernanceStep (single middleware) ────────────────────────────────────

// GovernanceStep is a single stage in the governance pipeline. Each step
// examines an AgentAction and either passes it through (possibly enriched),
// rejects it with a reason, or escalates it for human review.
//
// Steps are composable middleware. They must be safe for concurrent use
// and must not retain references to the action after returning.
type GovernanceStep interface {
	// Name returns the step's identifier for logging and audit
	// (e.g., "auth", "authz", "policy", "maturity", "rate_limit",
	// "blast_radius", "audit").
	Name() string

	// Execute evaluates the action against this step's rules. Returns
	// the action (possibly modified/enriched) on pass, or an error on
	// rejection. The error should wrap a GovernanceError to carry
	// structured rejection metadata.
	//
	// Steps may set action.PipelineStage to their own name for
	// observability of pipeline progress.
	Execute(ctx context.Context, action AgentAction) (AgentAction, error)
}

// ─── Governance Pipeline ──────────────────────────────────────────────────

// GovernancePipeline is an ordered chain of GovernanceSteps. Agent actions
// flow through each step sequentially. If any step rejects, the pipeline
// short-circuits and returns the rejection.
//
// Pipelines are configurable per organization via the Process Alignment
// Architecture. A startup might use a 3-step pipeline (policy → maturity →
// audit); a bank might use all 7 steps with additional custom steps.
type GovernancePipeline interface {
	// Execute runs the action through every step in order. Returns the
	// final action (with all enrichments applied) on success, or the
	// first rejection error.
	//
	// The pipeline is bound by a latency budget (default 10ms per step,
	// total < 70ms for the full 7-step pipeline). Steps exceeding their
	// budget are logged as warnings but the action continues.
	Execute(ctx context.Context, action AgentAction) (AgentAction, error)

	// Steps returns the ordered list of step names for observability.
	Steps() []string

	// AddStep appends a step to the pipeline. Used during configuration
	// to build organization-specific pipelines.
	AddStep(step GovernanceStep)

	// InsertStep inserts a step at the given index. Returns error if
	// index is out of bounds.
	InsertStep(index int, step GovernanceStep) error

	// RemoveStep removes the step with the given name. Returns error
	// if no such step exists.
	RemoveStep(name string) error
}

// ─── Governance Error ─────────────────────────────────────────────────────

// GovernanceError is a structured rejection from a governance step.
// It carries machine-readable rejection metadata for audit and UI display.
type GovernanceError struct {
	// Step is the name of the step that rejected the action.
	Step string `json:"step"`

	// Reason is a machine-readable rejection code
	// (e.g., "insufficient_maturity", "blast_radius_exceeded",
	// "rate_limit_exceeded", "policy_violation", "unauthorized").
	Reason string `json:"reason"`

	// Message is a human-readable explanation.
	Message string `json:"message"`

	// RequiresHuman indicates whether a human can override this rejection.
	RequiresHuman bool `json:"requires_human"`

	// OverrideInstructions explain how a human can override, if applicable.
	OverrideInstructions string `json:"override_instructions,omitempty"`

	// RetryAfter suggests when the action can be retried (for rate limits).
	RetryAfter time.Duration `json:"retry_after,omitempty"`
}

// Error implements the error interface.
func (e *GovernanceError) Error() string {
	return "governance/" + e.Step + ": " + e.Reason + " — " + e.Message
}

// ─── Well-known governance step names ──────────────────────────────────────

const (
	GovStepAuth        = "auth"         // Authenticate the agent
	GovStepAuthZ       = "authz"        // Authorize: does the agent have the required scopes?
	GovStepPolicy      = "policy"       // Evaluate CEL policies (org-specific rules)
	GovStepMaturity    = "maturity"     // Is the agent mature enough for this action?
	GovStepRateLimit   = "rate_limit"   // Has the agent exceeded its rate limits?
	GovStepBlastRadius = "blast_radius" // Is the blast radius within acceptable bounds?
	GovStepAudit       = "audit"        // Record the action in the audit log
)

// DefaultGovernancePipeline returns the standard 7-step pipeline names in order.
func DefaultGovernancePipeline() []string {
	return []string{
		GovStepAuth,
		GovStepAuthZ,
		GovStepPolicy,
		GovStepMaturity,
		GovStepRateLimit,
		GovStepBlastRadius,
		GovStepAudit,
	}
}
