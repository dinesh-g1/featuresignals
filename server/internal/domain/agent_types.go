// Package domain defines the core business interfaces for FeatureSignals.
//
// This file defines the foundational types for the Agent Runtime:
// Agent identity, Brain abstraction, Task/Decision/Reasoning models,
// and the Agent Protocol message types.
//
// These types are protocol-agnostic: MCP, ACP, or any future agent
// protocol is an adapter, not the foundation.
package domain

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"time"
)

// ─── Brain types ──────────────────────────────────────────────────────────

// BrainType enumerates the kinds of reasoning engines an agent can use.
type BrainType string

const (
	BrainTypeLLM           BrainType = "llm"            // Large language model (OpenAI, Anthropic, local)
	BrainTypeRule          BrainType = "rule"           // Deterministic rule engine
	BrainTypeNeuroSymbolic BrainType = "neuro-symbolic" // Hybrid neural + symbolic reasoning
	BrainTypeHybrid        BrainType = "hybrid"         // Multi-model ensemble
	BrainTypeCustom        BrainType = "custom"         // User-provided implementation
)

// Brain is the reasoning engine behind an agent. It takes a Task and
// AgentContext and produces a Decision with auditable Reasoning.
//
// Implementations must be safe for concurrent use. The Brain is a
// pluggable component — agents can swap brains without changing
// their identity or tool access.
type Brain interface {
	// Reason evaluates a task within the given context and returns a
	// decision with a human-auditable reasoning chain.
	Reason(ctx context.Context, task Task, agentCtx AgentContext) (Decision, Reasoning, error)

	// Learn incorporates an experience (feedback on a past decision)
	// into the brain's knowledge. Learning is async and best-effort.
	Learn(ctx context.Context, experience Experience) error

	// Type returns the brain's reasoning engine category.
	Type() BrainType
}

// ─── Task & Decision ──────────────────────────────────────────────────────

// Priority indicates the urgency of a task.
type Priority int

const (
	PriorityLow      Priority = 0
	PriorityNormal   Priority = 1
	PriorityHigh     Priority = 2
	PriorityCritical Priority = 3
)

// Task represents a unit of work assigned to an agent. It is protocol-
// agnostic — the same Task type is used regardless of whether the agent
// was invoked via MCP, ACP, or an internal trigger.
type Task struct {
	// ID uniquely identifies this task. Used for idempotency and tracing.
	ID string `json:"id"`

	// Type categorizes the task (e.g., "flag.create", "rollout.plan",
	// "incident.correlate"). Handlers are dispatched by type.
	Type string `json:"type"`

	// Input is the task payload. Interpretation depends on Type.
	Input json.RawMessage `json:"input"`

	// Deadline is the latest time the task must be completed.
	// Zero value means no deadline.
	Deadline time.Time `json:"deadline,omitempty"`

	// Priority indicates task urgency for scheduling decisions.
	Priority Priority `json:"priority"`

	// CreatedAt is when the task was submitted.
	CreatedAt time.Time `json:"created_at"`
}

// Decision is the output of a Brain.Reason call. It represents the
// agent's chosen action along with supporting metadata.
type Decision struct {
	// Action is the chosen course (e.g., "approve", "reject", "escalate",
	// "flag.create", "rollout.advance").
	Action string `json:"action"`

	// Parameters are action-specific arguments (e.g., flag key, target %).
	Parameters json.RawMessage `json:"parameters,omitempty"`

	// Confidence is the brain's confidence in this decision, 0.0–1.0.
	Confidence float64 `json:"confidence"`

	// RequiresHuman is true when the brain cannot decide autonomously
	// and needs human input at a decision checkpoint.
	RequiresHuman bool `json:"requires_human"`

	// HumanQuestion is the question presented to the human when
	// RequiresHuman is true.
	HumanQuestion string `json:"human_question,omitempty"`

	// Alternatives are other actions the brain considered, with scores.
	Alternatives []Alternative `json:"alternatives,omitempty"`
}

// Alternative is a decision the brain considered but did not select.
type Alternative struct {
	Action     string  `json:"action"`
	Confidence float64 `json:"confidence"`
	Rationale  string  `json:"rationale,omitempty"`
}

// Reasoning is the human-auditable chain of thought behind a Decision.
// Required for EU AI Act compliance (Art. 14: human oversight) and
// GDPR Art. 22 (automated decision-making explainability).
type Reasoning struct {
	// Summary is a one-paragraph human-readable explanation.
	Summary string `json:"summary"`

	// Steps are the ordered reasoning steps the brain followed.
	Steps []ReasoningStep `json:"steps"`

	// DataUsed lists the data sources consulted (e.g., "flag metadata",
	// "audit log", "PagerDuty incident history").
	DataUsed []string `json:"data_used"`

	// PoliciesApplied lists the governance policies that were checked
	// during this decision (e.g., "require-approval-for-prod",
	// "blast-radius-limit-10percent").
	PoliciesApplied []string `json:"policies_applied"`

	// GeneratedAt is when the reasoning was produced.
	GeneratedAt time.Time `json:"generated_at"`
}

// ReasoningStep is one link in the reasoning chain.
type ReasoningStep struct {
	// Thought is the natural language description of this step.
	Thought string `json:"thought"`

	// Evidence is the data or rule that supports this step.
	Evidence string `json:"evidence,omitempty"`

	// Confidence is the step-level confidence, 0.0–1.0.
	Confidence float64 `json:"confidence"`
}

// ─── Experience (Learning) ────────────────────────────────────────────────

// Experience represents feedback on a past decision, used by Brain.Learn
// to improve future reasoning. Experiences are collected automatically
// from outcomes and human overrides.
type Experience struct {
	// DecisionID is the ID of the decision this experience relates to.
	DecisionID string `json:"decision_id"`

	// TaskID is the ID of the task that prompted the decision.
	TaskID string `json:"task_id"`

	// Outcome is what actually happened (e.g., "rollout succeeded",
	// "incident resolved", "rollback required").
	Outcome string `json:"outcome"`

	// WasSuccessful is true if the decision led to a positive outcome.
	WasSuccessful bool `json:"was_successful"`

	// HumanOverride is non-empty if a human changed the decision.
	HumanOverride string `json:"human_override,omitempty"`

	// LatencyMs is how long the decision took to execute.
	LatencyMs int64 `json:"latency_ms"`

	// RecordedAt is when this experience was captured.
	RecordedAt time.Time `json:"recorded_at"`
}

// ─── Agent Identity ───────────────────────────────────────────────────────

// AgentStatus indicates whether an agent is available for work.
type AgentStatus string

const (
	AgentStatusActive   AgentStatus = "active"
	AgentStatusDegraded AgentStatus = "degraded" // partial functionality
	AgentStatusOffline  AgentStatus = "offline"
)

// Agent represents a registered agent in the Internal Agent Registry.
type Agent struct {
	// ID uniquely identifies this agent instance.
	ID string `json:"id"`

	// OrgID is the tenant that owns this agent.
	OrgID string `json:"org_id"`

	// Name is a human-readable label (e.g., "Flag Janitor v2").
	Name string `json:"name"`

	// Type categorizes the agent by function (e.g., "janitor",
	// "preflight", "incident-responder").
	Type string `json:"type"`

	// Version is the agent software version.
	Version string `json:"version"`

	// BrainType is the reasoning engine this agent uses.
	BrainType BrainType `json:"brain_type"`

	// Status indicates current availability.
	Status AgentStatus `json:"status"`

	// Scopes are the tools and resources this agent is authorized to access.
	// Format: "tool:resource:action" (e.g., "flag:production:toggle").
	Scopes []string `json:"scopes"`

	// RateLimits control how frequently the agent can act.
	RateLimits AgentRateLimits `json:"rate_limits"`

	// CostProfile tracks the cost of running this agent.
	CostProfile AgentCostProfile `json:"cost_profile"`

	// Maturity tracks the agent's capability level per context.
	Maturity AgentMaturity `json:"maturity"`

	// RegisteredAt is when the agent was first registered.
	RegisteredAt time.Time `json:"registered_at"`

	// LastHeartbeat is the last time the agent reported healthy.
	LastHeartbeat time.Time `json:"last_heartbeat"`

	// CreatedAt is when the agent record was created.
	CreatedAt time.Time `json:"created_at"`

	// UpdatedAt is when the agent record was last updated.
	UpdatedAt time.Time `json:"updated_at"`
}

// Validate checks required fields for agent registration/creation.
func (a *Agent) Validate() error {
	if a.Name == "" {
		return NewValidationError("name", "is required")
	}
	if a.Type == "" {
		return NewValidationError("type", "is required")
	}
	return nil
}

// GenerateID ensures the agent has a non-empty ID, generating one if needed.
// The caller should set a.ID before calling if they want a specific ID.
func (a *Agent) GenerateID() {
	if a.ID == "" {
		a.ID = "agt_" + newShortID()
	}
}

// AgentUpdate holds partial update fields for an agent. Only non-nil
// fields are applied; nil means "leave unchanged". String-based fields
// (BrainType, Status) are converted to domain types internally.
type AgentUpdate struct {
	Name        *string           `json:"name,omitempty"`
	Type        *string           `json:"type,omitempty"`
	Version     *string           `json:"version,omitempty"`
	BrainType   *string           `json:"brain_type,omitempty"`
	Status      *string           `json:"status,omitempty"`
	Scopes      *[]string         `json:"scopes,omitempty"`
	RateLimits  *AgentRateLimits  `json:"rate_limits,omitempty"`
	CostProfile *AgentCostProfile `json:"cost_profile,omitempty"`
}

// MergeUpdate applies a partial update from an AgentUpdate onto the
// existing agent. Only non-nil pointer fields are applied.
func (a *Agent) MergeUpdate(upd *AgentUpdate) {
	if upd.Name != nil {
		a.Name = *upd.Name
	}
	if upd.Type != nil {
		a.Type = *upd.Type
	}
	if upd.Version != nil {
		a.Version = *upd.Version
	}
	if upd.BrainType != nil {
		a.BrainType = BrainType(*upd.BrainType)
	}
	if upd.Status != nil {
		a.Status = AgentStatus(*upd.Status)
	}
	if upd.Scopes != nil {
		a.Scopes = *upd.Scopes
	}
	if upd.RateLimits != nil {
		a.RateLimits = *upd.RateLimits
	}
	if upd.CostProfile != nil {
		a.CostProfile = *upd.CostProfile
	}
}

// AgentRateLimits constrains agent throughput.
type AgentRateLimits struct {
	// PerMinute is the maximum actions per minute.
	PerMinute int `json:"per_minute"`

	// PerHour is the maximum actions per hour.
	PerHour int `json:"per_hour"`

	// ConcurrentActions is the maximum simultaneous actions.
	ConcurrentActions int `json:"concurrent_actions"`
}

// AgentCostProfile tracks the operational cost of an agent.
type AgentCostProfile struct {
	// LLMTokensPerAction is the average token consumption.
	LLMTokensPerAction int `json:"llm_tokens_per_action"`

	// AvgLatencyMs is the average decision latency.
	AvgLatencyMs int64 `json:"avg_latency_ms"`

	// CostPerActionMicros is the estimated cost per action in micro-dollars
	// (1/1,000,000 of a cent). Used by the billing system.
	CostPerActionMicros int64 `json:"cost_per_action_micros"`
}

// ─── Agent Maturity ───────────────────────────────────────────────────────

// MaturityLevel tracks an agent's capability progression (L1–L5 from
// PROCESS_ALIGNMENT_ARCHITECTURE.md).
type MaturityLevel int

const (
	MaturityL1Shadow   MaturityLevel = 1 // Shadow mode: observes, recommends, no action
	MaturityL2Assist   MaturityLevel = 2 // Assist mode: acts with human approval
	MaturityL3Supervised MaturityLevel = 3 // Supervised: acts autonomously, human reviews
	MaturityL4Autonomous MaturityLevel = 4 // Autonomous: acts, human override available
	MaturityL5Sentinel  MaturityLevel = 5 // Sentinel: full autonomy, self-healing, teaches others
)

// AgentMaturity tracks capability per operational context. An agent may
// be L4 for flag cleanup but L2 for production rollout decisions.
type AgentMaturity struct {
	// ID uniquely identifies this maturity record.
	ID string `json:"id"`

	// CurrentLevel is the agent's global maturity level.
	CurrentLevel MaturityLevel `json:"current_level"`

	// PerContext maps context keys (e.g., "flag.cleanup.staging",
	// "flag.rollout.production") to maturity levels.
	PerContext map[string]MaturityLevel `json:"per_context"`

	// Stats summarize the agent's performance metrics used to determine
	// maturity progression or regression.
	Stats MaturityStats `json:"stats"`
}

// MaturityStats tracks the metrics used for maturity decisions.
type MaturityStats struct {
	// TotalDecisions is the total number of decisions made.
	TotalDecisions int64 `json:"total_decisions"`

	// SuccessfulDecisions is the number of decisions with positive outcomes.
	SuccessfulDecisions int64 `json:"successful_decisions"`

	// Accuracy is the ratio of successful decisions (0.0–1.0).
	Accuracy float64 `json:"accuracy"`

	// IncidentsCaused is the number of incidents attributed to this agent.
	IncidentsCaused int `json:"incidents_caused"`

	// HumanOverrideRate is the ratio of decisions overridden by humans.
	HumanOverrideRate float64 `json:"human_override_rate"`

	// AvgConfidence is the mean confidence score across all decisions.
	AvgConfidence float64 `json:"avg_confidence"`

	// DaysSinceLastIncident is days since the agent's last incident.
	DaysSinceLastIncident int `json:"days_since_last_incident"`
}

// ─── Agent Context ────────────────────────────────────────────────────────

// AgentContext carries the operational context for a Brain.Reason call.
// It is passed through the governance pipeline and must be immutable
// after creation.
type AgentContext struct {
	// OrgID is the tenant making the request.
	OrgID string `json:"org_id"`

	// ProjectID is the project scope, if applicable.
	ProjectID string `json:"project_id,omitempty"`

	// EnvironmentID is the environment scope (e.g., "production").
	EnvironmentID string `json:"environment_id,omitempty"`

	// UserID is the human who initiated or will approve the action.
	UserID string `json:"user_id,omitempty"`

	// TraceID carries the OpenTelemetry trace context.
	TraceID string `json:"trace_id,omitempty"`

	// SpanID carries the OpenTelemetry span context.
	SpanID string `json:"span_id,omitempty"`

	// MaturityLevel is the agent's current maturity for this context.
	MaturityLevel MaturityLevel `json:"maturity_level"`

	// Metadata carries arbitrary key-value pairs for protocol adapters.
	Metadata map[string]any `json:"metadata,omitempty"`
}

// newShortID generates a short random hex identifier for agent IDs.
func newShortID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		// crypto/rand.Read failing is catastrophic; use a fallback that
		// still produces unique-enough IDs for the agent registry.
		return hex.EncodeToString([]byte(time.Now().UTC().Format(time.RFC3339Nano)))
	}
	return hex.EncodeToString(b)
}
