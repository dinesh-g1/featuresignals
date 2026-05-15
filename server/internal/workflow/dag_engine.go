// Package workflow implements the Workflow DAG Engine for feature lifecycle
// workflow execution. It provides cycle detection (Kahn's algorithm),
// topological sorting, node readiness evaluation, CEL condition evaluation
// for edge transitions, and execution state management.
//
// The engine is stateless — it operates on domain types passed in as
// parameters and does not maintain any package-level mutable state.
package workflow

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ConditionEvaluator evaluates a CEL expression against a context map.
// This interface is the narrow contract the DAG engine needs for edge
// condition evaluation. The concrete implementation lives in the agent
// package (CELEvaluator).
type ConditionEvaluator interface {
	EvaluateExpression(ctx context.Context, expression string, ctxMap map[string]interface{}) (bool, error)
}

// DAGEngine implements domain.WorkflowDAGEngine.
// It is stateless and safe for concurrent use.
type DAGEngine struct {
	cel      ConditionEvaluator
	logger   *slog.Logger
}

// NewDAGEngine creates a new DAGEngine with the given condition evaluator.
// If cel is nil, edge conditions always evaluate to true (unconditional
// transitions only).
func NewDAGEngine(cel ConditionEvaluator, logger *slog.Logger) *DAGEngine {
	if logger == nil {
		logger = slog.Default()
	}
	return &DAGEngine{
		cel:    cel,
		logger: logger,
	}
}

// Validate checks a DAG for structural correctness:
//   - DAG name is present
//   - At least one node exists
//   - All node IDs are unique and non-empty
//   - All node types are valid
//   - All edge source/target nodes reference existing nodes
//   - No self-loops
//   - No cycles (Kahn's algorithm)
func (e *DAGEngine) Validate(dag *domain.WorkflowDAG) error {
	if dag == nil {
		return fmt.Errorf("validate dag: %w", domain.ErrValidation)
	}

	// Use the shared structural validation
	if err := domain.ValidateDAG(dag); err != nil {
		return fmt.Errorf("validate dag: %w", err)
	}

	// Check for cycles
	if domain.HasCycle(dag.Nodes, dag.Edges) {
		return fmt.Errorf("validate dag: %w", domain.NewValidationError("dag", "cycle detected: the DAG must be acyclic"))
	}

	return nil
}

// GetReadyNodes returns nodes whose all incoming dependencies are satisfied.
// A node is ready when all its predecessor nodes have completed or been skipped.
// Nodes with no incoming edges are always ready.
func (e *DAGEngine) GetReadyNodes(dag *domain.WorkflowDAG, exec *domain.WorkflowDAGExecution) []domain.WorkflowDAGNode {
	if dag == nil || exec == nil {
		return nil
	}

	// Build a quick lookup: nodeID → node
	nodeByID := make(map[string]domain.WorkflowDAGNode, len(dag.Nodes))
	for _, n := range dag.Nodes {
		nodeByID[n.ID] = n
	}

	// Build completed/skipped set from execution state
	terminalNodes := make(map[string]bool, len(exec.NodeStates))
	for _, ns := range exec.NodeStates {
		if ns.Status.IsTerminal() && ns.Status != domain.DAGNodeStatusFailed {
			terminalNodes[ns.NodeID] = true
		}
	}

	// Build predecessor map: targetNodeID → []sourceNodeIDs
	predecessors := make(map[string][]string, len(dag.Nodes))
	for _, edge := range dag.Edges {
		predecessors[edge.TargetNodeID] = append(predecessors[edge.TargetNodeID], edge.SourceNodeID)
	}

	// Build set of nodes already in some state (to avoid re-returning)
	activeOrDone := make(map[string]bool, len(exec.NodeStates))
	for _, ns := range exec.NodeStates {
		activeOrDone[ns.NodeID] = true
	}

	ready := make([]domain.WorkflowDAGNode, 0)
	for _, node := range dag.Nodes {
		// Skip nodes already being processed
		if activeOrDone[node.ID] {
			continue
		}

		// Check if all predecessors are terminal (completed/skipped)
		preds := predecessors[node.ID]
		allReady := true
		for _, predID := range preds {
			if !terminalNodes[predID] {
				allReady = false
				break
			}
		}

		if allReady {
			ready = append(ready, node)
		}
	}

	return ready
}

// ExecuteNode transitions a node through its lifecycle.
//   - If the node is pending, it transitions to active.
//   - If the node is active, it transitions to completed or failed
//     based on the result parameter.
//
// Returns an error if the node is not found in the execution or if
// the state transition is invalid.
func (e *DAGEngine) ExecuteNode(ctx context.Context, exec *domain.WorkflowDAGExecution, nodeID string, result json.RawMessage) error {
	if exec == nil {
		return fmt.Errorf("execute node: execution is nil")
	}
	if nodeID == "" {
		return fmt.Errorf("execute node: node id is empty")
	}

	// Find or create the node state
	var state *domain.WorkflowDAGNodeState
	for i := range exec.NodeStates {
		if exec.NodeStates[i].NodeID == nodeID {
			state = &exec.NodeStates[i]
			break
		}
	}

	if state == nil {
		// Initialize a new node state as pending → transition to active
		now := time.Now().UTC()
		newState := domain.WorkflowDAGNodeState{
			ID:          "ns_" + nodeID + "_" + exec.ID,
			ExecutionID: exec.ID,
			NodeID:      nodeID,
			Status:      domain.DAGNodeStatusActive,
			StartedAt:   &now,
		}
		exec.NodeStates = append(exec.NodeStates, newState)
		exec.CurrentNodes = appendIfMissing(exec.CurrentNodes, nodeID)
		e.logger.InfoContext(ctx, "node activated",
			"execution_id", exec.ID,
			"node_id", nodeID,
			"status", "active",
		)
		return nil
	}

	// Transition from active → completed or failed
	switch state.Status {
	case domain.DAGNodeStatusPending:
		now := time.Now().UTC()
		state.Status = domain.DAGNodeStatusActive
		state.StartedAt = &now
		exec.CurrentNodes = appendIfMissing(exec.CurrentNodes, nodeID)
		e.logger.InfoContext(ctx, "node activated",
			"execution_id", exec.ID,
			"node_id", nodeID,
		)

	case domain.DAGNodeStatusActive:
		now := time.Now().UTC()
		state.CompletedAt = &now
		state.Output = result

		// Determine if result indicates failure
		if isFailureResult(result) {
			state.Status = domain.DAGNodeStatusFailed
			state.Error = string(result)
			e.logger.WarnContext(ctx, "node failed",
				"execution_id", exec.ID,
				"node_id", nodeID,
				"error", state.Error,
			)
		} else {
			state.Status = domain.DAGNodeStatusCompleted
			e.logger.InfoContext(ctx, "node completed",
				"execution_id", exec.ID,
				"node_id", nodeID,
			)
		}

		// Remove from current nodes
		exec.CurrentNodes = removeFromSlice(exec.CurrentNodes, nodeID)

	case domain.DAGNodeStatusCompleted, domain.DAGNodeStatusFailed, domain.DAGNodeStatusSkipped:
		return fmt.Errorf("execute node: node %s is already in terminal state %s", nodeID, state.Status)

	default:
		return fmt.Errorf("execute node: unknown node status %s for node %s", state.Status, nodeID)
	}

	return nil
}

// isFailureResult checks if a JSON result indicates a failure.
// Failure is indicated by a JSON object with {"error": "..."} or a non-empty
// error string.
func isFailureResult(result json.RawMessage) bool {
	if len(result) == 0 {
		return false
	}
	var m map[string]interface{}
	if err := json.Unmarshal(result, &m); err != nil {
		return false
	}
	if errVal, ok := m["error"]; ok && errVal != nil && errVal != "" {
		return true
	}
	if statusVal, ok := m["status"]; ok {
		if s, ok := statusVal.(string); ok && (s == "failed" || s == "error") {
			return true
		}
	}
	return false
}

// CanAdvance checks if all current nodes are complete and the DAG
// can proceed to the next set of nodes.
func (e *DAGEngine) CanAdvance(exec *domain.WorkflowDAGExecution) bool {
	if exec == nil {
		return false
	}
	if exec.Status.IsTerminal() {
		return false
	}

	// Can advance if there are no nodes currently active
	if len(exec.CurrentNodes) == 0 {
		return true
	}

	// Check if all current nodes have reached a terminal state
	currentSet := make(map[string]bool, len(exec.CurrentNodes))
	for _, id := range exec.CurrentNodes {
		currentSet[id] = true
	}

	allTerminal := true
	for _, ns := range exec.NodeStates {
		if currentSet[ns.NodeID] && !ns.Status.IsTerminal() {
			allTerminal = false
			break
		}
	}

	return allTerminal
}

// NextNodes determines which nodes should be activated next based on
// edge conditions and completion of predecessor nodes.
//
// For each candidate node (all predecessors complete):
//  1. Collect all incoming edges to the candidate
//  2. For edges with conditions, evaluate the CEL expression
//  3. If any unconditional edge exists and all conditional edges pass,
//     the candidate is included in the result
//
// If a condition evaluates to false, that edge is treated as blocked
// and the target node is skipped (marked as status=skipped).
func (e *DAGEngine) NextNodes(ctx context.Context, dag *domain.WorkflowDAG, exec *domain.WorkflowDAGExecution) ([]domain.WorkflowDAGNode, error) {
	if dag == nil || exec == nil {
		return nil, fmt.Errorf("next nodes: dag and execution are required")
	}

	nodeByID := make(map[string]domain.WorkflowDAGNode, len(dag.Nodes))
	for _, n := range dag.Nodes {
		nodeByID[n.ID] = n
	}

	// Build predecessor map and collect incoming edges per node
	predecessors := make(map[string][]string, len(dag.Nodes))
	incomingEdges := make(map[string][]domain.WorkflowDAGEdge, len(dag.Nodes))
	for _, edge := range dag.Edges {
		predecessors[edge.TargetNodeID] = append(predecessors[edge.TargetNodeID], edge.SourceNodeID)
		incomingEdges[edge.TargetNodeID] = append(incomingEdges[edge.TargetNodeID], edge)
	}

	// Terminal nodes from execution state
	terminalNodes := make(map[string]domain.NodeExecutionStatus, len(exec.NodeStates))
	for _, ns := range exec.NodeStates {
		if ns.Status.IsTerminal() {
			terminalNodes[ns.NodeID] = ns.Status
		}
	}

	// Already processed nodes
	processed := make(map[string]bool, len(exec.NodeStates))
	for _, ns := range exec.NodeStates {
		processed[ns.NodeID] = true
	}

	// Build evaluation context for CEL expressions
	evalCtx := buildEdgeEvalContext(exec)

	next := make([]domain.WorkflowDAGNode, 0)
	for _, node := range dag.Nodes {
		if processed[node.ID] {
			continue
		}

		preds := predecessors[node.ID]
		if len(preds) == 0 {
			// No predecessors — this is an entry node
			// Only include if we haven't processed it yet
			next = append(next, node)
			continue
		}

		// Check if all predecessors are terminal
		allTerminal := true
		for _, predID := range preds {
			if _, ok := terminalNodes[predID]; !ok {
				allTerminal = false
				break
			}
		}

		if !allTerminal {
			continue
		}

		// All predecessors terminal — evaluate edge conditions
		shouldActivate := true
		hasUnconditional := false

		for _, edge := range incomingEdges[node.ID] {
			if edge.Condition == "" {
				hasUnconditional = true
				continue
			}

			// Evaluate CEL condition
			if e.cel != nil {
				ok, err := e.cel.EvaluateExpression(ctx, edge.Condition, evalCtx)
				if err != nil {
					e.logger.WarnContext(ctx, "edge condition evaluation error",
						"edge_id", edge.ID,
						"condition", edge.Condition,
						"error", err,
					)
					// Treat evaluation errors as condition false
					shouldActivate = false
					break
				}
				if !ok {
					// This edge condition failed — if all incoming edges
					// are conditional and at least one fails, skip the node
					shouldActivate = false
					break
				}
			}
		}

		// If we have no unconditional edge and all conditional edges
		// either failed or are absent, skip the node
		if !hasUnconditional && !shouldActivate {
			// Mark node as skipped
			skippedState := domain.WorkflowDAGNodeState{
				ID:          "ns_" + node.ID + "_" + exec.ID,
				ExecutionID: exec.ID,
				NodeID:      node.ID,
				Status:      domain.DAGNodeStatusSkipped,
			}
			exec.NodeStates = append(exec.NodeStates, skippedState)
			e.logger.InfoContext(ctx, "node skipped due to edge conditions",
				"execution_id", exec.ID,
				"node_id", node.ID,
			)
			continue
		}

		// Node should activate only if there's at least one incoming
		// edge that passes (unconditional or conditional-true)
		if hasUnconditional || shouldActivate {
			next = append(next, node)
		}
	}

	return next, nil
}

// buildEdgeEvalContext creates a context map for CEL edge condition evaluation.
// The context provides access to execution metadata, node states, and flag info.
func buildEdgeEvalContext(exec *domain.WorkflowDAGExecution) map[string]interface{} {
	evalCtx := make(map[string]interface{})

	// Execution-level information
	evalCtx["execution"] = map[string]interface{}{
		"id":      exec.ID,
		"dag_id":  exec.DAGID,
		"org_id":  exec.OrgID,
		"flag_id": exec.FlagID,
		"status":  string(exec.Status),
	}

	// Node states as a map for condition expressions like:
	//   node_states["approval"].status == "completed"
	nodeStatesMap := make(map[string]interface{}, len(exec.NodeStates))
	for _, ns := range exec.NodeStates {
		nodeStatesMap[ns.NodeID] = map[string]interface{}{
			"status": string(ns.Status),
		}
	}
	evalCtx["node_states"] = nodeStatesMap

	return evalCtx
}

// ─── Helpers ────────────────────────────────────────────────────────────────

func appendIfMissing(slice []string, val string) []string {
	for _, v := range slice {
		if v == val {
			return slice
		}
	}
	return append(slice, val)
}

func removeFromSlice(slice []string, val string) []string {
	for i, v := range slice {
		if v == val {
			return append(slice[:i], slice[i+1:]...)
		}
	}
	return slice
}
