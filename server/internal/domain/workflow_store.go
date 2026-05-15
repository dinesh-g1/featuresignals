// Package domain defines the core business interfaces for FeatureSignals.
//
// WorkflowStore provides persistence for workflow definitions, runs,
// and node states. It is the data layer for the Agent Runtime's
// workflow orchestration engine.
package domain

import "context"

// WorkflowStore is the persistence interface for workflow definitions
// and execution state. All methods are org-scoped: they operate within
// the caller's organization context.
type WorkflowStore interface {
	// ── Workflow Definitions ──────────────────────────────────────

	// CreateWorkflow persists a new workflow definition.
	CreateWorkflow(ctx context.Context, wf *Workflow) error

	// GetWorkflow retrieves a workflow definition by ID.
	GetWorkflow(ctx context.Context, orgID, workflowID string) (*Workflow, error)

	// ListWorkflows returns workflow definitions for an organization.
	ListWorkflows(ctx context.Context, orgID string, limit, offset int) ([]Workflow, error)

	// CountWorkflows returns the total number of workflow definitions.
	CountWorkflows(ctx context.Context, orgID string) (int, error)

	// DeleteWorkflow removes a workflow definition. Fails if any
	// active runs reference this workflow.
	DeleteWorkflow(ctx context.Context, orgID, workflowID string) error

	// ── Workflow Runs ─────────────────────────────────────────────

	// CreateWorkflowRun persists a new workflow execution run.
	CreateWorkflowRun(ctx context.Context, run *WorkflowRun) error

	// GetWorkflowRun retrieves a workflow run by ID.
	GetWorkflowRun(ctx context.Context, orgID, runID string) (*WorkflowRun, error)

	// ListWorkflowRuns returns runs for an organization, optionally
	// filtered by workflow ID and/or status.
	ListWorkflowRuns(ctx context.Context, orgID, workflowID string, status WorkflowStatus, limit, offset int) ([]WorkflowRun, error)

	// CountWorkflowRuns returns the total number of runs matching filters.
	CountWorkflowRuns(ctx context.Context, orgID, workflowID string, status WorkflowStatus) (int, error)

	// UpdateWorkflowRunStatus transitions a run to a new status.
	UpdateWorkflowRunStatus(ctx context.Context, orgID, runID string, status WorkflowStatus, errorMsg string) error

	// ── Node States ───────────────────────────────────────────────

	// UpdateNodeState persists or updates a node's execution state
	// within a workflow run.
	UpdateNodeState(ctx context.Context, runID string, state *WorkflowNodeState) error

	// GetNodeStates retrieves all node states for a workflow run.
	GetNodeStates(ctx context.Context, runID string) (map[string]WorkflowNodeState, error)
}
