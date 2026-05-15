// Package domain defines the core business interfaces for FeatureSignals.
//
// WorkflowDAG represents a visual workflow for the feature lifecycle.
// Unlike the agent task orchestration Workflow (workflow.go), WorkflowDAG
// is a customer-facing visual DAG editor for defining feature lifecycle
// processes (e.g., "Feature Forge → Preflight Check → Approval → Ship →
// Observe → Sweep").
//
// Nodes represent human actions, approvals, automated checks, notifications,
// webhooks, and agent tasks. Edges define transitions with optional CEL
// conditions. The DAG engine validates structural correctness (no cycles)
// and drives execution of workflow instances.
package domain

import (
	"context"
	"encoding/json"
	"time"
)

// ─── Workflow DAG Definition ──────────────────────────────────────────────

// WorkflowDAG represents a directed acyclic graph of workflow nodes.
// It is the customer-facing workflow definition for the feature lifecycle.
type WorkflowDAG struct {
	ID          string           `json:"id"`
	OrgID       string           `json:"org_id"`
	Name        string           `json:"name"`
	Description string           `json:"description,omitempty"`
	Nodes       []WorkflowDAGNode `json:"nodes"`
	Edges       []WorkflowDAGEdge `json:"edges"`
	Version     int              `json:"version"`
	Status      WorkflowDAGStatus `json:"status"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

// WorkflowDAGNode is a single node in the feature lifecycle DAG.
// Each node represents an action or checkpoint in the lifecycle.
type WorkflowDAGNode struct {
	ID        string            `json:"id"`
	DAGID     string            `json:"dag_id"`
	Type      WorkflowNodeType  `json:"type"`
	Label     string            `json:"label"`
	Config    json.RawMessage   `json:"config,omitempty"`    // Type-specific configuration
	PositionX float64           `json:"position_x"`          // For UI layout
	PositionY float64           `json:"position_y"`          // For UI layout
}

// WorkflowDAGEdge is a directed edge between two nodes in the DAG.
type WorkflowDAGEdge struct {
	ID           string `json:"id"`
	DAGID        string `json:"dag_id"`
	SourceNodeID string `json:"source_node_id"`
	TargetNodeID string `json:"target_node_id"`
	Condition    string `json:"condition,omitempty"` // CEL expression for conditional transitions
	Label        string `json:"label,omitempty"`
}

// WorkflowDAGStatus represents the lifecycle status of a DAG definition.
type WorkflowDAGStatus string

const (
	WorkflowDAGStatusDraft    WorkflowDAGStatus = "draft"
	WorkflowDAGStatusActive   WorkflowDAGStatus = "active"
	WorkflowDAGStatusArchived WorkflowDAGStatus = "archived"
)

// WorkflowNodeType categorizes the kind of node in a DAG.
type WorkflowNodeType string

const (
	NodeTypeHumanAction    WorkflowNodeType = "human_action"
	NodeTypeApproval       WorkflowNodeType = "approval"
	NodeTypeAutomatedCheck WorkflowNodeType = "automated_check"
	NodeTypeNotification   WorkflowNodeType = "notification"
	NodeTypeWebhook        WorkflowNodeType = "webhook"
	NodeTypeAgentTask      WorkflowNodeType = "agent_task"
)

// Validate checks that a WorkflowNodeType is a known value.
func (t WorkflowNodeType) Validate() error {
	switch t {
	case NodeTypeHumanAction, NodeTypeApproval, NodeTypeAutomatedCheck,
		NodeTypeNotification, NodeTypeWebhook, NodeTypeAgentTask:
		return nil
	default:
		return NewValidationError("node_type", "unknown type: "+string(t))
	}
}

// ─── Workflow Execution ───────────────────────────────────────────────────

// WorkflowDAGExecution represents a running instance of a DAG.
type WorkflowDAGExecution struct {
	ID           string                     `json:"id"`
	DAGID        string                     `json:"dag_id"`
	OrgID        string                     `json:"org_id"`
	FlagID       string                     `json:"flag_id"` // The flag this execution is for
	Status       ExecutionStatus            `json:"status"`
	CurrentNodes []string                   `json:"current_nodes"` // Node IDs currently active
	NodeStates   []WorkflowDAGNodeState      `json:"node_states"`
	StartedAt    time.Time                  `json:"started_at"`
	CompletedAt  *time.Time                 `json:"completed_at,omitempty"`
}

// WorkflowDAGNodeState tracks the execution state of a single node
// within a DAG execution.
type WorkflowDAGNodeState struct {
	ID          string               `json:"id"`
	ExecutionID string               `json:"execution_id"`
	NodeID      string               `json:"node_id"`
	Status      NodeExecutionStatus  `json:"status"`
	Input       json.RawMessage      `json:"input,omitempty"`
	Output      json.RawMessage      `json:"output,omitempty"`
	StartedAt   *time.Time           `json:"started_at,omitempty"`
	CompletedAt *time.Time           `json:"completed_at,omitempty"`
	Error       string               `json:"error,omitempty"`
}

// ExecutionStatus tracks the overall state of a DAG execution.
type ExecutionStatus string

const (
	ExecutionStatusRunning   ExecutionStatus = "running"
	ExecutionStatusCompleted ExecutionStatus = "completed"
	ExecutionStatusFailed    ExecutionStatus = "failed"
	ExecutionStatusCancelled ExecutionStatus = "cancelled"
)

// NodeExecutionStatus tracks the state of a single node within an execution.
type NodeExecutionStatus string

const (
	DAGNodeStatusPending   NodeExecutionStatus = "pending"
	DAGNodeStatusActive    NodeExecutionStatus = "active"
	DAGNodeStatusCompleted NodeExecutionStatus = "completed"
	DAGNodeStatusFailed    NodeExecutionStatus = "failed"
	DAGNodeStatusSkipped   NodeExecutionStatus = "skipped"
)

// IsTerminal returns true if the node status is a terminal state.
func (s NodeExecutionStatus) IsTerminal() bool {
	return s == DAGNodeStatusCompleted || s == DAGNodeStatusFailed || s == DAGNodeStatusSkipped
}

// IsTerminal returns true if the execution status is a terminal state.
func (s ExecutionStatus) IsTerminal() bool {
	return s == ExecutionStatusCompleted || s == ExecutionStatusFailed || s == ExecutionStatusCancelled
}

// ─── DAG Engine Interface ─────────────────────────────────────────────────

// WorkflowDAGEngine validates and executes workflow DAGs.
// It is the core engine that drives feature lifecycle workflows through
// their defined nodes and transitions.
type WorkflowDAGEngine interface {
	// Validate checks a DAG for structural correctness:
	//   - No cycles (uses Kahn's algorithm)
	//   - All edge source/target nodes exist in the DAG
	//   - All node types are valid
	//   - At least one node exists
	Validate(dag *WorkflowDAG) error

	// GetReadyNodes returns nodes whose all incoming dependencies are satisfied.
	// A node is ready when all its predecessor nodes have completed.
	GetReadyNodes(dag *WorkflowDAG, exec *WorkflowDAGExecution) []WorkflowDAGNode

	// ExecuteNode transitions a node through its lifecycle:
	//   pending → active → completed (or failed)
	// The result parameter is the output of the node's execution.
	ExecuteNode(ctx context.Context, exec *WorkflowDAGExecution, nodeID string, result json.RawMessage) error

	// CanAdvance checks if all current nodes are complete and the DAG
	// can proceed to the next set of nodes.
	CanAdvance(exec *WorkflowDAGExecution) bool

	// NextNodes determines which nodes should be activated next based
	// on edge conditions and completion of predecessor nodes.
	// Edge conditions are evaluated as CEL expressions against the
	// execution context.
	NextNodes(ctx context.Context, dag *WorkflowDAG, exec *WorkflowDAGExecution) ([]WorkflowDAGNode, error)
}

// ─── Validation Helpers ───────────────────────────────────────────────────

// ValidateDAG performs a standalone structural validation of a DAG
// without requiring a full engine. Useful for pre-save validation
// in handlers or store layers.
func ValidateDAG(dag *WorkflowDAG) error {
	if dag.Name == "" {
		return NewValidationError("name", "is required")
	}
	if len(dag.Nodes) == 0 {
		return NewValidationError("nodes", "at least one node is required")
	}

	nodeIDs := make(map[string]bool, len(dag.Nodes))
	for _, n := range dag.Nodes {
		if n.ID == "" {
			return NewValidationError("node.id", "is required")
		}
		if nodeIDs[n.ID] {
			return NewValidationError("node.id", "duplicate node id: "+n.ID)
		}
		nodeIDs[n.ID] = true
		if err := n.Type.Validate(); err != nil {
			return err
		}
	}

	for _, e := range dag.Edges {
		if !nodeIDs[e.SourceNodeID] {
			return NewValidationError("edge.source_node_id", "references unknown node: "+e.SourceNodeID)
		}
		if !nodeIDs[e.TargetNodeID] {
			return NewValidationError("edge.target_node_id", "references unknown node: "+e.TargetNodeID)
		}
		if e.SourceNodeID == e.TargetNodeID {
			return NewValidationError("edge", "self-loop not allowed: "+e.SourceNodeID)
		}
	}

	return nil
}

// HasCycle detects whether the DAG contains a cycle using Kahn's algorithm.
// Returns true if a cycle exists.
func HasCycle(nodes []WorkflowDAGNode, edges []WorkflowDAGEdge) bool {
	if len(nodes) == 0 {
		return false
	}

	// Build adjacency list and in-degree map
	nodeIDs := make(map[string]bool, len(nodes))
	for _, n := range nodes {
		nodeIDs[n.ID] = true
	}

	inDegree := make(map[string]int, len(nodes))
	adj := make(map[string][]string, len(nodes))
	for _, n := range nodes {
		inDegree[n.ID] = 0
	}

	for _, e := range edges {
		// Only count edges where both nodes exist
		if nodeIDs[e.SourceNodeID] && nodeIDs[e.TargetNodeID] {
			adj[e.SourceNodeID] = append(adj[e.SourceNodeID], e.TargetNodeID)
			inDegree[e.TargetNodeID]++
		}
	}

	// Kahn's algorithm: queue nodes with in-degree 0
	queue := make([]string, 0, len(nodes))
	for _, n := range nodes {
		if inDegree[n.ID] == 0 {
			queue = append(queue, n.ID)
		}
	}

	processed := 0
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		processed++

		for _, neighbor := range adj[current] {
			inDegree[neighbor]--
			if inDegree[neighbor] == 0 {
				queue = append(queue, neighbor)
			}
		}
	}

	// If not all nodes were processed, a cycle exists
	return processed != len(nodes)
}

// TopologicalSort returns a topologically sorted list of node IDs.
// Returns an error if the DAG has a cycle.
func TopologicalSort(nodes []WorkflowDAGNode, edges []WorkflowDAGEdge) ([]string, error) {
	nodeIDs := make(map[string]bool, len(nodes))
	for _, n := range nodes {
		nodeIDs[n.ID] = true
	}

	inDegree := make(map[string]int, len(nodes))
	adj := make(map[string][]string, len(nodes))
	for _, n := range nodes {
		inDegree[n.ID] = 0
	}

	for _, e := range edges {
		if nodeIDs[e.SourceNodeID] && nodeIDs[e.TargetNodeID] {
			adj[e.SourceNodeID] = append(adj[e.SourceNodeID], e.TargetNodeID)
			inDegree[e.TargetNodeID]++
		}
	}

	queue := make([]string, 0, len(nodes))
	for _, n := range nodes {
		if inDegree[n.ID] == 0 {
			queue = append(queue, n.ID)
		}
	}

	result := make([]string, 0, len(nodes))
	for len(queue) > 0 {
		current := queue[0]
		queue = queue[1:]
		result = append(result, current)

		for _, neighbor := range adj[current] {
			inDegree[neighbor]--
			if inDegree[neighbor] == 0 {
				queue = append(queue, neighbor)
			}
		}
	}

	if len(result) != len(nodes) {
		return nil, NewValidationError("dag", "cycle detected: cannot topologically sort")
	}

	return result, nil
}
