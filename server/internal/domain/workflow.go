// Package domain defines the core business interfaces for FeatureSignals.
//
// Workflow is the orchestration layer for multi-step agent tasks.
// A Workflow is a directed acyclic graph (DAG) of nodes connected by edges.
// Each node represents a task to be executed by an agent; edges define
// dependencies and transitions.
//
// Workflows are defined declaratively (YAML/JSON) and executed by the
// Agent Runtime's workflow engine. They support suspension, resumption,
// parallel fan-out, and conditional branching.
package domain

import (
	"encoding/json"
	"time"
)

// ─── Workflow Definition ──────────────────────────────────────────────────

// Workflow is a declarative DAG of tasks that an agent (or multiple agents)
// must execute. It is the unit of orchestration in the Agent Runtime.
type Workflow struct {
	// ID uniquely identifies this workflow instance.
	ID string `json:"id"`

	// Name is a human-readable label (e.g., "Flag Cleanup Workflow").
	Name string `json:"name"`

	// Description explains what the workflow accomplishes.
	Description string `json:"description,omitempty"`

	// Version is the workflow definition version (schema versioning).
	Version string `json:"version"`

	// Nodes are the tasks in the DAG.
	Nodes []WorkflowNode `json:"nodes"`

	// Edges define dependencies between nodes.
	Edges []WorkflowEdge `json:"edges"`

	// StartNode is the ID of the entry node (exactly one).
	StartNode string `json:"start_node"`

	// EndNodes are the IDs of terminal nodes (one or more).
	EndNodes []string `json:"end_nodes"`

	// TimeoutSec is the maximum wall-clock time for the entire workflow.
	// Zero means no timeout.
	TimeoutSec int `json:"timeout_sec,omitempty"`

	// RetryPolicy defines how failed nodes are retried.
	RetryPolicy WorkflowRetryPolicy `json:"retry_policy,omitempty"`

	// CreatedAt is when this workflow definition was created.
	CreatedAt time.Time `json:"created_at"`
}

// WorkflowNode is a single task in the workflow DAG.
type WorkflowNode struct {
	// ID uniquely identifies this node within the workflow.
	ID string `json:"id"`

	// Name is a human-readable label (e.g., "Scan Repository").
	Name string `json:"name"`

	// TaskType maps to Task.Type for dispatch (e.g., "janitor.scan",
	// "preflight.analyze", "incident.correlate").
	TaskType string `json:"task_type"`

	// AgentType specifies which agent category should execute this node.
	// Empty means any available agent of the correct type.
	AgentType string `json:"agent_type,omitempty"`

	// Input is the static input for this node's task.
	Input json.RawMessage `json:"input,omitempty"`

	// InputFrom maps input parameter names to output fields from
	// predecessor nodes. Format: {"param_name": "node_id.output_field"}
	InputFrom map[string]string `json:"input_from,omitempty"`

	// Condition is a CEL expression that must evaluate to true for this
	// node to execute. If false, the node is skipped (and downstream
	// nodes with no other dependencies are also skipped).
	Condition string `json:"condition,omitempty"`

	// TimeoutSec is the maximum execution time for this node.
	// Overrides the per-node default.
	TimeoutSec int `json:"timeout_sec,omitempty"`

	// RetryPolicy overrides the workflow-level retry policy for this node.
	RetryPolicy *WorkflowRetryPolicy `json:"retry_policy,omitempty"`

	// IsParallel indicates this node can execute concurrently with siblings
	// that have no data dependencies on it.
	IsParallel bool `json:"is_parallel"`

	// RequiresHuman indicates this node requires human approval before
	// execution (governance checkpoint).
	RequiresHuman bool `json:"requires_human"`

	// HumanPrompt is the question to present when RequiresHuman is true.
	HumanPrompt string `json:"human_prompt,omitempty"`
}

// WorkflowEdge is a directed edge between two nodes. The workflow engine
// ensures the DAG has no cycles at definition time.
type WorkflowEdge struct {
	// From is the source node ID.
	From string `json:"from"`

	// To is the target node ID.
	To string `json:"to"`

	// Condition is an optional CEL expression. If present and evaluates
	// to false, this edge is not traversed (conditional branching).
	Condition string `json:"condition,omitempty"`

	// Label is a human-readable description of this transition.
	Label string `json:"label,omitempty"`
}

// WorkflowRetryPolicy defines how failed nodes are retried.
type WorkflowRetryPolicy struct {
	// MaxRetries is the maximum number of retry attempts. 0 means no retries.
	MaxRetries int `json:"max_retries"`

	// BackoffBaseMs is the initial backoff in milliseconds.
	BackoffBaseMs int `json:"backoff_base_ms"`

	// BackoffCapMs is the maximum backoff in milliseconds.
	BackoffCapMs int `json:"backoff_cap_ms"`

	// RetryableErrors is a list of error codes that trigger retry.
	// Empty means all errors are retryable.
	RetryableErrors []string `json:"retryable_errors,omitempty"`
}

// ─── Workflow Execution State ──────────────────────────────────────────────

// WorkflowStatus tracks the execution state of a workflow instance.
type WorkflowStatus string

const (
	WorkflowStatusPending   WorkflowStatus = "pending"
	WorkflowStatusRunning   WorkflowStatus = "running"
	WorkflowStatusSuspended WorkflowStatus = "suspended" // waiting for human input
	WorkflowStatusCompleted WorkflowStatus = "completed"
	WorkflowStatusFailed    WorkflowStatus = "failed"
	WorkflowStatusCancelled WorkflowStatus = "cancelled"
)

// WorkflowRun represents a single execution of a workflow. It tracks
// the state of each node, overall progress, and results.
type WorkflowRun struct {
	// ID uniquely identifies this run.
	ID string `json:"id"`

	// WorkflowID references the workflow definition.
	WorkflowID string `json:"workflow_id"`

	// WorkflowVersion is the version of the definition used.
	WorkflowVersion string `json:"workflow_version"`

	// Status is the current execution status.
	Status WorkflowStatus `json:"status"`

	// Trigger is what started this run ("manual", "schedule", "webhook",
	// "agent.delegate", "incident").
	Trigger string `json:"trigger"`

	// OrgID is the tenant scope.
	OrgID string `json:"org_id"`

	// Context carries the agent context for all nodes.
	Context AgentContext `json:"context"`

	// NodeStates tracks each node's execution state.
	NodeStates map[string]WorkflowNodeState `json:"node_states"`

	// StartedAt is when execution began.
	StartedAt time.Time `json:"started_at,omitempty"`

	// CompletedAt is when execution finished (any terminal status).
	CompletedAt time.Time `json:"completed_at,omitempty"`

	// Error holds the reason for failure, if status is failed.
	Error string `json:"error,omitempty"`
}

// WorkflowNodeState tracks the execution state of a single node within
// a workflow run.
type WorkflowNodeState struct {
	// NodeID identifies the node in the workflow definition.
	NodeID string `json:"node_id"`

	// Status is the node's current execution status.
	Status WorkflowNodeStatus `json:"status"`

	// TaskID is the ID of the task assigned to an agent, if any.
	TaskID string `json:"task_id,omitempty"`

	// AgentID is the agent executing this node, if assigned.
	AgentID string `json:"agent_id,omitempty"`

	// Input is the resolved input for this node's task.
	Input json.RawMessage `json:"input,omitempty"`

	// Output is the result from the agent, if completed.
	Output json.RawMessage `json:"output,omitempty"`

	// Error holds the error message, if failed.
	Error string `json:"error,omitempty"`

	// RetryCount is the number of retries attempted.
	RetryCount int `json:"retry_count"`

	// StartedAt is when this node began executing.
	StartedAt time.Time `json:"started_at,omitempty"`

	// CompletedAt is when this node finished.
	CompletedAt time.Time `json:"completed_at,omitempty"`
}

// WorkflowNodeStatus tracks the execution state of a single node.
type WorkflowNodeStatus string

const (
	NodeStatusPending   WorkflowNodeStatus = "pending"   // waiting for dependencies
	NodeStatusReady     WorkflowNodeStatus = "ready"     // dependencies satisfied, queued
	NodeStatusRunning   WorkflowNodeStatus = "running"   // agent is executing
	NodeStatusSuspended WorkflowNodeStatus = "suspended" // waiting for human
	NodeStatusSkipped   WorkflowNodeStatus = "skipped"   // condition evaluated to false
	NodeStatusCompleted WorkflowNodeStatus = "completed"
	NodeStatusFailed    WorkflowNodeStatus = "failed"
)

// ─── Well-known workflow names ────────────────────────────────────────────

const (
	// Code2Flag workflows
	WorkflowFlagDiscovery  = "code2flag.discover"  // Scan repo, identify flag candidates
	WorkflowFlagCreation   = "code2flag.create"    // Create flag, generate SDK code, create PR
	WorkflowFlagCleanup    = "code2flag.cleanup"   // Scan flags, identify stale, propose removal, create PR

	// Preflight workflows
	WorkflowRolloutPlan    = "preflight.plan"      // Analyze impact, generate rollout plan
	WorkflowRolloutExecute = "preflight.execute"   // Execute staged rollout with monitoring
	WorkflowComplianceCheck = "preflight.compliance" // Run compliance checks, route for approval

	// IncidentFlag workflows
	WorkflowIncidentCorrelate = "incident.correlate" // Correlate flag changes with incidents
	WorkflowIncidentRespond   = "incident.respond"   // Auto-remediate or escalate
	WorkflowIncidentPostmortem = "incident.postmortem" // Generate postmortem from incident data

	// Impact Analyzer workflows
	WorkflowImpactMeasure = "impact.measure" // Measure feature impact on metrics
	WorkflowCostAttribute = "impact.cost"    // Attribute infrastructure cost to features

	// ABM workflows
	WorkflowAgentPromotion  = "abm.promote"  // Evaluate agent maturity, promote if ready
	WorkflowAgentDegradation = "abm.degrade" // Detect regression, degrade maturity
)
