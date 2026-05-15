// Package workflow implements the Workflow DAG Engine for feature lifecycle
// workflow execution.
//
// Tests for the DAGEngine covering: validation (valid DAGs, cycles, diamond DAGs),
// node readiness, node execution state transitions, advancement checks,
// next node determination, edge condition evaluation, and topological sorting.
package workflow

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

// testLogger returns a logger that discards output.
func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(&discardWriter{}, &slog.HandlerOptions{Level: slog.LevelError}))
}

type discardWriter struct{}

func (w *discardWriter) Write(p []byte) (int, error) { return len(p), nil }

// ─── Test Helpers ────────────────────────────────────────────────────────────

// mockConditionEvaluator is a test double for ConditionEvaluator.
type mockConditionEvaluator struct {
	expressions map[string]mockEvalResult
}

type mockEvalResult struct {
	ok  bool
	err error
}

func newMockConditionEvaluator() *mockConditionEvaluator {
	return &mockConditionEvaluator{
		expressions: make(map[string]mockEvalResult),
	}
}

func (m *mockConditionEvaluator) EvaluateExpression(ctx context.Context, expression string, ctxMap map[string]interface{}) (bool, error) {
	if r, ok := m.expressions[expression]; ok {
		return r.ok, r.err
	}
	return true, nil
}

func (m *mockConditionEvaluator) set(expression string, ok bool, err error) {
	m.expressions[expression] = mockEvalResult{ok: ok, err: err}
}

// makeLinearDAG creates a 3-node linear DAG: A → B → C
func makeLinearDAG() *domain.WorkflowDAG {
	return &domain.WorkflowDAG{
		ID:      "dag_linear_001",
		OrgID:   "org_001",
		Name:    "Linear Workflow",
		Version: 1,
		Status:  domain.WorkflowDAGStatusActive,
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Label: "Feature Forge", Type: domain.NodeTypeHumanAction, PositionX: 100, PositionY: 100},
			{ID: "B", Label: "Preflight Check", Type: domain.NodeTypeAutomatedCheck, PositionX: 300, PositionY: 100},
			{ID: "C", Label: "Approval", Type: domain.NodeTypeApproval, PositionX: 500, PositionY: 100},
		},
		Edges: []domain.WorkflowDAGEdge{
			{ID: "e1", SourceNodeID: "A", TargetNodeID: "B", Label: "forge complete"},
			{ID: "e2", SourceNodeID: "B", TargetNodeID: "C", Label: "check passed"},
		},
	}
}

// makeDiamondDAG creates a diamond DAG: A → B, A → C, B → D, C → D
func makeDiamondDAG() *domain.WorkflowDAG {
	return &domain.WorkflowDAG{
		ID:      "dag_diamond_001",
		OrgID:   "org_001",
		Name:    "Diamond Workflow",
		Version: 1,
		Status:  domain.WorkflowDAGStatusActive,
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Label: "Start", Type: domain.NodeTypeHumanAction, PositionX: 200, PositionY: 40},
			{ID: "B", Label: "Left Path", Type: domain.NodeTypeAutomatedCheck, PositionX: 100, PositionY: 160},
			{ID: "C", Label: "Right Path", Type: domain.NodeTypeAutomatedCheck, PositionX: 300, PositionY: 160},
			{ID: "D", Label: "Merge", Type: domain.NodeTypeApproval, PositionX: 200, PositionY: 280},
		},
		Edges: []domain.WorkflowDAGEdge{
			{ID: "e1", SourceNodeID: "A", TargetNodeID: "B", Label: "left"},
			{ID: "e2", SourceNodeID: "A", TargetNodeID: "C", Label: "right"},
			{ID: "e3", SourceNodeID: "B", TargetNodeID: "D", Label: "left done"},
			{ID: "e4", SourceNodeID: "C", TargetNodeID: "D", Label: "right done"},
		},
	}
}

// makeCyclicDAG creates a DAG with a cycle: A → B → C → A
func makeCyclicDAG() *domain.WorkflowDAG {
	return &domain.WorkflowDAG{
		ID:      "dag_cycle_001",
		OrgID:   "org_001",
		Name:    "Cyclic Workflow",
		Version: 1,
		Status:  domain.WorkflowDAGStatusDraft,
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Label: "Node A", Type: domain.NodeTypeHumanAction},
			{ID: "B", Label: "Node B", Type: domain.NodeTypeAutomatedCheck},
			{ID: "C", Label: "Node C", Type: domain.NodeTypeApproval},
		},
		Edges: []domain.WorkflowDAGEdge{
			{ID: "e1", SourceNodeID: "A", TargetNodeID: "B"},
			{ID: "e2", SourceNodeID: "B", TargetNodeID: "C"},
			{ID: "e3", SourceNodeID: "C", TargetNodeID: "A"}, // cycle!
		},
	}
}

// makeSingleNodeDAG creates a DAG with a single node and no edges.
func makeSingleNodeDAG() *domain.WorkflowDAG {
	return &domain.WorkflowDAG{
		ID:      "dag_single_001",
		OrgID:   "org_001",
		Name:    "Single Node Workflow",
		Version: 1,
		Status:  domain.WorkflowDAGStatusActive,
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Label: "Only Step", Type: domain.NodeTypeWebhook},
		},
		Edges: nil,
	}
}

// newExecution creates a fresh execution for a given DAG.
func newExecution(dagID, orgID, flagID string) *domain.WorkflowDAGExecution {
	return &domain.WorkflowDAGExecution{
		ID:         "exec_001",
		DAGID:      dagID,
		OrgID:      orgID,
		FlagID:     flagID,
		Status:     domain.ExecutionStatusRunning,
		NodeStates: nil,
	}
}

// ─── Validate Tests ──────────────────────────────────────────────────────────

func TestDAGEngine_Validate_ValidLinearDAG(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeLinearDAG()

	err := engine.Validate(dag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDAGEngine_Validate_ValidDiamondDAG(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeDiamondDAG()

	err := engine.Validate(dag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDAGEngine_Validate_ValidSingleNodeDAG(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeSingleNodeDAG()

	err := engine.Validate(dag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestDAGEngine_Validate_CycleDetection(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeCyclicDAG()

	err := engine.Validate(dag)
	if err == nil {
		t.Fatal("expected error for cyclic DAG, got nil")
	}
	if !errors.Is(err, domain.ErrValidation) {
		t.Errorf("expected ErrValidation, got %v", err)
	}
}

func TestDAGEngine_Validate_NilDAG(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())

	err := engine.Validate(nil)
	if err == nil {
		t.Fatal("expected error for nil DAG")
	}
}

func TestDAGEngine_Validate_EmptyName(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := &domain.WorkflowDAG{
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Type: domain.NodeTypeHumanAction},
		},
	}

	err := engine.Validate(dag)
	if err == nil {
		t.Fatal("expected error for empty name")
	}
	if !errors.Is(err, domain.ErrValidation) {
		t.Errorf("expected ErrValidation, got %v", err)
	}
}

func TestDAGEngine_Validate_NoNodes(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := &domain.WorkflowDAG{Name: "Empty"}

	err := engine.Validate(dag)
	if err == nil {
		t.Fatal("expected error for DAG with no nodes")
	}
}

func TestDAGEngine_Validate_DuplicateNodeIDs(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := &domain.WorkflowDAG{
		Name: "Duplicate Nodes",
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Type: domain.NodeTypeHumanAction},
			{ID: "A", Type: domain.NodeTypeApproval},
		},
	}

	err := engine.Validate(dag)
	if err == nil {
		t.Fatal("expected error for duplicate node IDs")
	}
}

func TestDAGEngine_Validate_InvalidNodeType(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := &domain.WorkflowDAG{
		Name: "Invalid Type",
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Type: domain.WorkflowNodeType("bogus_type")},
		},
	}

	err := engine.Validate(dag)
	if err == nil {
		t.Fatal("expected error for invalid node type")
	}
}

func TestDAGEngine_Validate_EdgeReferencesUnknownSource(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := &domain.WorkflowDAG{
		Name: "Bad Edge Source",
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Type: domain.NodeTypeHumanAction},
		},
		Edges: []domain.WorkflowDAGEdge{
			{ID: "e1", SourceNodeID: "Z", TargetNodeID: "A"},
		},
	}

	err := engine.Validate(dag)
	if err == nil {
		t.Fatal("expected error for edge referencing unknown source node")
	}
}

func TestDAGEngine_Validate_EdgeReferencesUnknownTarget(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := &domain.WorkflowDAG{
		Name: "Bad Edge Target",
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Type: domain.NodeTypeHumanAction},
		},
		Edges: []domain.WorkflowDAGEdge{
			{ID: "e1", SourceNodeID: "A", TargetNodeID: "Z"},
		},
	}

	err := engine.Validate(dag)
	if err == nil {
		t.Fatal("expected error for edge referencing unknown target node")
	}
}

func TestDAGEngine_Validate_SelfLoop(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := &domain.WorkflowDAG{
		Name: "Self Loop",
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Type: domain.NodeTypeHumanAction},
		},
		Edges: []domain.WorkflowDAGEdge{
			{ID: "e1", SourceNodeID: "A", TargetNodeID: "A"},
		},
	}

	err := engine.Validate(dag)
	if err == nil {
		t.Fatal("expected error for self-loop edge")
	}
}

func TestDAGEngine_Validate_LargeAcyclicDAG(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())

	nodes := make([]domain.WorkflowDAGNode, 10)
	for i := 0; i < 10; i++ {
		nodes[i] = domain.WorkflowDAGNode{
			ID:    string(rune('A' + i)),
			Type:  domain.NodeTypeAutomatedCheck,
			Label: "Node " + string(rune('A'+i)),
		}
	}

	edges := []domain.WorkflowDAGEdge{
		{ID: "e1", SourceNodeID: "A", TargetNodeID: "B"},
		{ID: "e2", SourceNodeID: "B", TargetNodeID: "C"},
		{ID: "e3", SourceNodeID: "C", TargetNodeID: "D"},
		{ID: "e4", SourceNodeID: "D", TargetNodeID: "E"},
		{ID: "e5", SourceNodeID: "E", TargetNodeID: "F"},
		{ID: "e6", SourceNodeID: "F", TargetNodeID: "G"},
		{ID: "e7", SourceNodeID: "G", TargetNodeID: "H"},
		{ID: "e8", SourceNodeID: "H", TargetNodeID: "I"},
		{ID: "e9", SourceNodeID: "I", TargetNodeID: "J"},
		{ID: "e10", SourceNodeID: "A", TargetNodeID: "E"},
		{ID: "e11", SourceNodeID: "C", TargetNodeID: "F"},
	}

	dag := &domain.WorkflowDAG{
		Name:  "Large DAG",
		Nodes: nodes,
		Edges: edges,
	}

	err := engine.Validate(dag)
	if err != nil {
		t.Fatalf("unexpected error for large acyclic DAG: %v", err)
	}
}

// ─── GetReadyNodes Tests ─────────────────────────────────────────────────────

func TestDAGEngine_GetReadyNodes_AllNodesFresh(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeLinearDAG()
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")

	ready := engine.GetReadyNodes(dag, exec)
	if len(ready) != 1 {
		t.Fatalf("expected 1 ready node (entry node), got %d", len(ready))
	}
	if ready[0].ID != "A" {
		t.Errorf("expected node A to be ready, got %s", ready[0].ID)
	}
}

func TestDAGEngine_GetReadyNodes_AfterFirstComplete(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeLinearDAG()
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")

	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
	}

	ready := engine.GetReadyNodes(dag, exec)
	if len(ready) != 1 {
		t.Fatalf("expected 1 ready node after A complete, got %d", len(ready))
	}
	if ready[0].ID != "B" {
		t.Errorf("expected node B to be ready, got %s", ready[0].ID)
	}
}

func TestDAGEngine_GetReadyNodes_DiamondMidExecution(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeDiamondDAG()
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")

	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
	}

	ready := engine.GetReadyNodes(dag, exec)
	if len(ready) != 2 {
		t.Fatalf("expected 2 ready nodes (B, C) after A, got %d", len(ready))
	}
	readyIDs := make([]string, len(ready))
	for i, n := range ready {
		readyIDs[i] = n.ID
	}
	if !contains(readyIDs, "B") || !contains(readyIDs, "C") {
		t.Errorf("expected B and C to be ready, got %v", readyIDs)
	}
}

func TestDAGEngine_GetReadyNodes_DiamondMergeNotReady(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeDiamondDAG()
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")

	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
		{NodeID: "B", Status: domain.DAGNodeStatusCompleted},
	}

	ready := engine.GetReadyNodes(dag, exec)
	for _, n := range ready {
		if n.ID == "D" {
			t.Error("node D should not be ready when C is not complete")
		}
	}
}

func TestDAGEngine_GetReadyNodes_DiamondMergeReady(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeDiamondDAG()
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")

	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
		{NodeID: "B", Status: domain.DAGNodeStatusCompleted},
		{NodeID: "C", Status: domain.DAGNodeStatusCompleted},
	}

	ready := engine.GetReadyNodes(dag, exec)
	if len(ready) != 1 {
		t.Fatalf("expected 1 ready node (D), got %d", len(ready))
	}
	if ready[0].ID != "D" {
		t.Errorf("expected node D to be ready, got %s", ready[0].ID)
	}
}

func TestDAGEngine_GetReadyNodes_NilInputs(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())

	ready := engine.GetReadyNodes(nil, nil)
	if ready != nil {
		t.Error("expected nil for nil inputs")
	}
}

func TestDAGEngine_GetReadyNodes_SkippedPredecessor(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeLinearDAG()
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")

	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusSkipped},
	}

	ready := engine.GetReadyNodes(dag, exec)
	if len(ready) != 1 {
		t.Fatalf("expected 1 ready node after A skipped, got %d", len(ready))
	}
	if ready[0].ID != "B" {
		t.Errorf("expected node B to be ready after A skipped, got %s", ready[0].ID)
	}
}

func TestDAGEngine_GetReadyNodes_FailedPredecessor(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeLinearDAG()
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")

	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusFailed},
	}

	ready := engine.GetReadyNodes(dag, exec)
	for _, n := range ready {
		if n.ID == "B" {
			t.Error("node B should not be ready when predecessor A failed")
		}
	}
}

// ─── ExecuteNode Tests ───────────────────────────────────────────────────────

func TestDAGEngine_ExecuteNode_ActivateNewNode(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	exec := newExecution("dag_001", "org_001", "flag_001")

	err := engine.ExecuteNode(context.Background(), exec, "A", nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(exec.NodeStates) != 1 {
		t.Fatalf("expected 1 node state, got %d", len(exec.NodeStates))
	}
	ns := exec.NodeStates[0]
	if ns.NodeID != "A" {
		t.Errorf("expected node A, got %s", ns.NodeID)
	}
	if ns.Status != domain.DAGNodeStatusActive {
		t.Errorf("expected active status, got %s", ns.Status)
	}
	if ns.StartedAt == nil {
		t.Error("expected StartedAt to be set")
	}
	if !contains(exec.CurrentNodes, "A") {
		t.Error("expected A in current nodes")
	}
}

func TestDAGEngine_ExecuteNode_CompleteNode(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	exec := newExecution("dag_001", "org_001", "flag_001")

	if err := engine.ExecuteNode(context.Background(), exec, "A", nil); err != nil {
		t.Fatalf("unexpected error on activate: %v", err)
	}

	result := json.RawMessage(`{"status": "ok", "message": "done"}`)
	if err := engine.ExecuteNode(context.Background(), exec, "A", result); err != nil {
		t.Fatalf("unexpected error on complete: %v", err)
	}

	ns := exec.NodeStates[0]
	if ns.Status != domain.DAGNodeStatusCompleted {
		t.Errorf("expected completed status, got %s", ns.Status)
	}
	if ns.CompletedAt == nil {
		t.Error("expected CompletedAt to be set")
	}
	if string(ns.Output) != string(result) {
		t.Errorf("expected output %s, got %s", string(result), string(ns.Output))
	}
	if contains(exec.CurrentNodes, "A") {
		t.Error("expected A to be removed from current nodes")
	}
}

func TestDAGEngine_ExecuteNode_FailNode(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	exec := newExecution("dag_001", "org_001", "flag_001")

	if err := engine.ExecuteNode(context.Background(), exec, "A", nil); err != nil {
		t.Fatalf("unexpected error on activate: %v", err)
	}

	result := json.RawMessage(`{"error": "something went wrong"}`)
	if err := engine.ExecuteNode(context.Background(), exec, "A", result); err != nil {
		t.Fatalf("unexpected error on fail: %v", err)
	}

	ns := exec.NodeStates[0]
	if ns.Status != domain.DAGNodeStatusFailed {
		t.Errorf("expected failed status, got %s", ns.Status)
	}
	if ns.Error == "" {
		t.Error("expected error message to be set")
	}
}

func TestDAGEngine_ExecuteNode_DoubleComplete(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	exec := newExecution("dag_001", "org_001", "flag_001")

	if err := engine.ExecuteNode(context.Background(), exec, "A", nil); err != nil {
		t.Fatalf("unexpected error on activate: %v", err)
	}
	if err := engine.ExecuteNode(context.Background(), exec, "A", json.RawMessage(`{"ok": true}`)); err != nil {
		t.Fatalf("unexpected error on complete: %v", err)
	}

	err := engine.ExecuteNode(context.Background(), exec, "A", json.RawMessage(`{"ok": true}`))
	if err == nil {
		t.Fatal("expected error for double completion")
	}
}

func TestDAGEngine_ExecuteNode_NilExecution(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())

	err := engine.ExecuteNode(context.Background(), nil, "A", nil)
	if err == nil {
		t.Fatal("expected error for nil execution")
	}
}

func TestDAGEngine_ExecuteNode_EmptyNodeID(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	exec := newExecution("dag_001", "org_001", "flag_001")

	err := engine.ExecuteNode(context.Background(), exec, "", nil)
	if err == nil {
		t.Fatal("expected error for empty node ID")
	}
}

func TestDAGEngine_ExecuteNode_MultipleNodes(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	exec := newExecution("dag_001", "org_001", "flag_001")

	if err := engine.ExecuteNode(context.Background(), exec, "A", nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if err := engine.ExecuteNode(context.Background(), exec, "B", nil); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(exec.NodeStates) != 2 {
		t.Fatalf("expected 2 node states, got %d", len(exec.NodeStates))
	}
	if len(exec.CurrentNodes) != 2 {
		t.Fatalf("expected 2 current nodes, got %d", len(exec.CurrentNodes))
	}

	if err := engine.ExecuteNode(context.Background(), exec, "A", json.RawMessage(`{"ok": true}`)); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(exec.CurrentNodes) != 1 {
		t.Fatalf("expected 1 current node after completing A, got %d", len(exec.CurrentNodes))
	}
	if exec.CurrentNodes[0] != "B" {
		t.Errorf("expected B in current nodes, got %s", exec.CurrentNodes[0])
	}
}

// ─── CanAdvance Tests ────────────────────────────────────────────────────────

func TestDAGEngine_CanAdvance_NoActiveNodes(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	exec := newExecution("dag_001", "org_001", "flag_001")

	if !engine.CanAdvance(exec) {
		t.Error("expected CanAdvance=true when no nodes are active")
	}
}

func TestDAGEngine_CanAdvance_ActiveNodeNotTerminal(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	exec := newExecution("dag_001", "org_001", "flag_001")
	exec.CurrentNodes = []string{"A"}
	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusActive},
	}

	if engine.CanAdvance(exec) {
		t.Error("expected CanAdvance=false when active node is not terminal")
	}
}

func TestDAGEngine_CanAdvance_AllActiveNodesTerminal(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	exec := newExecution("dag_001", "org_001", "flag_001")
	exec.CurrentNodes = []string{"A", "B"}
	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
		{NodeID: "B", Status: domain.DAGNodeStatusFailed},
	}

	if !engine.CanAdvance(exec) {
		t.Error("expected CanAdvance=true when all active nodes are terminal")
	}
}

func TestDAGEngine_CanAdvance_TerminalExecution(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	exec := newExecution("dag_001", "org_001", "flag_001")
	exec.Status = domain.ExecutionStatusCompleted

	if engine.CanAdvance(exec) {
		t.Error("expected CanAdvance=false for completed execution")
	}
}

func TestDAGEngine_CanAdvance_NilExecution(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())

	if engine.CanAdvance(nil) {
		t.Error("expected CanAdvance=false for nil execution")
	}
}

// ─── NextNodes Tests ─────────────────────────────────────────────────────────

func TestDAGEngine_NextNodes_EntryNodes(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeLinearDAG()
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")

	next, err := engine.NextNodes(context.Background(), dag, exec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(next) != 1 {
		t.Fatalf("expected 1 next node, got %d", len(next))
	}
	if next[0].ID != "A" {
		t.Errorf("expected node A, got %s", next[0].ID)
	}
}

func TestDAGEngine_NextNodes_AfterFirstComplete(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeLinearDAG()
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")
	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
	}

	next, err := engine.NextNodes(context.Background(), dag, exec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(next) != 1 {
		t.Fatalf("expected 1 next node, got %d", len(next))
	}
	if next[0].ID != "B" {
		t.Errorf("expected node B, got %s", next[0].ID)
	}
}

func TestDAGEngine_NextNodes_AllComplete(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeLinearDAG()
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")
	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
		{NodeID: "B", Status: domain.DAGNodeStatusCompleted},
		{NodeID: "C", Status: domain.DAGNodeStatusCompleted},
	}

	next, err := engine.NextNodes(context.Background(), dag, exec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(next) != 0 {
		t.Fatalf("expected 0 next nodes when all done, got %d", len(next))
	}
}

func TestDAGEngine_NextNodes_DiamondParallelBranch(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeDiamondDAG()
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")
	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
	}

	next, err := engine.NextNodes(context.Background(), dag, exec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(next) != 2 {
		t.Fatalf("expected 2 next nodes (B, C), got %d", len(next))
	}
	ids := make([]string, len(next))
	for i, n := range next {
		ids[i] = n.ID
	}
	if !contains(ids, "B") || !contains(ids, "C") {
		t.Errorf("expected B and C, got %v", ids)
	}
}

func TestDAGEngine_NextNodes_DiamondMerge(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())
	dag := makeDiamondDAG()
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")
	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
		{NodeID: "B", Status: domain.DAGNodeStatusCompleted},
		{NodeID: "C", Status: domain.DAGNodeStatusCompleted},
	}

	next, err := engine.NextNodes(context.Background(), dag, exec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(next) != 1 {
		t.Fatalf("expected 1 next node (D), got %d", len(next))
	}
	if next[0].ID != "D" {
		t.Errorf("expected node D, got %s", next[0].ID)
	}
}

func TestDAGEngine_NextNodes_ConditionalEdgePasses(t *testing.T) {
	cel := newMockConditionEvaluator()
	cel.set("confidence > 0.8", true, nil)

	engine := NewDAGEngine(cel, testLogger())
	dag := &domain.WorkflowDAG{
		ID:   "dag_cond_001",
		Name: "Conditional Workflow",
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Type: domain.NodeTypeHumanAction},
			{ID: "B", Type: domain.NodeTypeApproval},
		},
		Edges: []domain.WorkflowDAGEdge{
			{ID: "e1", SourceNodeID: "A", TargetNodeID: "B", Condition: "confidence > 0.8"},
		},
	}
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")
	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
	}

	next, err := engine.NextNodes(context.Background(), dag, exec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(next) != 1 {
		t.Fatalf("expected 1 next node, got %d", len(next))
	}
	if next[0].ID != "B" {
		t.Errorf("expected node B, got %s", next[0].ID)
	}
}

func TestDAGEngine_NextNodes_ConditionalEdgeFails(t *testing.T) {
	cel := newMockConditionEvaluator()
	cel.set("confidence > 0.8", false, nil)

	engine := NewDAGEngine(cel, testLogger())
	dag := &domain.WorkflowDAG{
		ID:   "dag_cond_002",
		Name: "Conditional Fails",
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Type: domain.NodeTypeHumanAction},
			{ID: "B", Type: domain.NodeTypeApproval},
		},
		Edges: []domain.WorkflowDAGEdge{
			{ID: "e1", SourceNodeID: "A", TargetNodeID: "B", Condition: "confidence > 0.8"},
		},
	}
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")
	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
	}

	next, err := engine.NextNodes(context.Background(), dag, exec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(next) != 0 {
		t.Fatalf("expected 0 next nodes when condition fails, got %d", len(next))
	}

	found := false
	for _, ns := range exec.NodeStates {
		if ns.NodeID == "B" && ns.Status == domain.DAGNodeStatusSkipped {
			found = true
		}
	}
	if !found {
		t.Error("expected node B to be skipped")
	}
}

func TestDAGEngine_NextNodes_MixedConditionalAndUnconditional(t *testing.T) {
	cel := newMockConditionEvaluator()
	cel.set("is_urgent", true, nil)

	engine := NewDAGEngine(cel, testLogger())
	dag := &domain.WorkflowDAG{
		ID:   "dag_mixed_001",
		Name: "Mixed Edges",
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Type: domain.NodeTypeHumanAction},
			{ID: "X", Type: domain.NodeTypeAutomatedCheck},
			{ID: "B", Type: domain.NodeTypeApproval},
		},
		Edges: []domain.WorkflowDAGEdge{
			{ID: "e1", SourceNodeID: "A", TargetNodeID: "B"},
			{ID: "e2", SourceNodeID: "X", TargetNodeID: "B", Condition: "is_urgent"},
		},
	}
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")
	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
		{NodeID: "X", Status: domain.DAGNodeStatusCompleted},
	}

	next, err := engine.NextNodes(context.Background(), dag, exec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(next) != 1 {
		t.Fatalf("expected B when unconditional edge exists, got %d nodes", len(next))
	}
}

func TestDAGEngine_NextNodes_ConditionEvaluationError(t *testing.T) {
	cel := newMockConditionEvaluator()
	cel.set("broken_expr", false, errors.New("parse error"))

	engine := NewDAGEngine(cel, testLogger())
	dag := &domain.WorkflowDAG{
		ID:   "dag_err_001",
		Name: "Error Workflow",
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Type: domain.NodeTypeHumanAction},
			{ID: "B", Type: domain.NodeTypeApproval},
		},
		Edges: []domain.WorkflowDAGEdge{
			{ID: "e1", SourceNodeID: "A", TargetNodeID: "B", Condition: "broken_expr"},
		},
	}
	exec := newExecution(dag.ID, dag.OrgID, "flag_001")
	exec.NodeStates = []domain.WorkflowDAGNodeState{
		{NodeID: "A", Status: domain.DAGNodeStatusCompleted},
	}

	next, err := engine.NextNodes(context.Background(), dag, exec)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(next) != 0 {
		t.Fatalf("expected 0 next nodes on eval error, got %d", len(next))
	}
}

func TestDAGEngine_NextNodes_NilInputs(t *testing.T) {
	engine := NewDAGEngine(nil, testLogger())

	_, err := engine.NextNodes(context.Background(), nil, nil)
	if err == nil {
		t.Fatal("expected error for nil inputs")
	}
}

// ─── TopologicalSort Tests ───────────────────────────────────────────────────

func TestTopologicalSort_LinearDAG(t *testing.T) {
	dag := makeLinearDAG()
	sorted, err := domain.TopologicalSort(dag.Nodes, dag.Edges)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(sorted) != 3 {
		t.Fatalf("expected 3 nodes, got %d", len(sorted))
	}
	if sorted[0] != "A" {
		t.Errorf("expected A first, got %s", sorted[0])
	}
	if sorted[1] != "B" {
		t.Errorf("expected B second, got %s", sorted[1])
	}
	if sorted[2] != "C" {
		t.Errorf("expected C third, got %s", sorted[2])
	}
}

func TestTopologicalSort_DiamondDAG(t *testing.T) {
	dag := makeDiamondDAG()
	sorted, err := domain.TopologicalSort(dag.Nodes, dag.Edges)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(sorted) != 4 {
		t.Fatalf("expected 4 nodes, got %d", len(sorted))
	}
	if sorted[0] != "A" {
		t.Errorf("expected A first, got %s", sorted[0])
	}
	if sorted[3] != "D" {
		t.Errorf("expected D last, got %s", sorted[3])
	}
}

func TestTopologicalSort_CyclicDAG(t *testing.T) {
	dag := makeCyclicDAG()
	_, err := domain.TopologicalSort(dag.Nodes, dag.Edges)
	if err == nil {
		t.Fatal("expected error for cyclic DAG")
	}
}

func TestTopologicalSort_SingleNode(t *testing.T) {
	dag := makeSingleNodeDAG()
	sorted, err := domain.TopologicalSort(dag.Nodes, dag.Edges)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(sorted) != 1 {
		t.Fatalf("expected 1 node, got %d", len(sorted))
	}
	if sorted[0] != "A" {
		t.Errorf("expected A, got %s", sorted[0])
	}
}

// ─── HasCycle Tests ──────────────────────────────────────────────────────────

func TestHasCycle_Acyclic(t *testing.T) {
	dag := makeLinearDAG()
	if domain.HasCycle(dag.Nodes, dag.Edges) {
		t.Error("expected no cycle in linear DAG")
	}
}

func TestHasCycle_Cyclic(t *testing.T) {
	dag := makeCyclicDAG()
	if !domain.HasCycle(dag.Nodes, dag.Edges) {
		t.Error("expected cycle in cyclic DAG")
	}
}

func TestHasCycle_EmptyNodes(t *testing.T) {
	if domain.HasCycle(nil, nil) {
		t.Error("expected no cycle for empty DAG")
	}
}

func TestHasCycle_DisconnectedNodes(t *testing.T) {
	nodes := []domain.WorkflowDAGNode{
		{ID: "A", Type: domain.NodeTypeHumanAction},
		{ID: "B", Type: domain.NodeTypeApproval},
	}
	if domain.HasCycle(nodes, nil) {
		t.Error("expected no cycle for disconnected nodes")
	}
}

// ─── ValidateDAG Tests ───────────────────────────────────────────────────────

func TestValidateDAG_Valid(t *testing.T) {
	dag := makeLinearDAG()
	if err := domain.ValidateDAG(dag); err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestValidateDAG_EmptyName(t *testing.T) {
	dag := &domain.WorkflowDAG{
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Type: domain.NodeTypeHumanAction},
		},
	}
	err := domain.ValidateDAG(dag)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestValidateDAG_NoNodes(t *testing.T) {
	dag := &domain.WorkflowDAG{Name: "Empty"}
	err := domain.ValidateDAG(dag)
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestValidateDAG_EmptyNodeID(t *testing.T) {
	dag := &domain.WorkflowDAG{
		Name: "Empty ID",
		Nodes: []domain.WorkflowDAGNode{
			{ID: "", Type: domain.NodeTypeHumanAction},
		},
	}
	err := domain.ValidateDAG(dag)
	if err == nil {
		t.Fatal("expected error for empty node ID")
	}
}

func TestValidateDAG_SelfLoopEdge(t *testing.T) {
	dag := &domain.WorkflowDAG{
		Name: "Self Loop",
		Nodes: []domain.WorkflowDAGNode{
			{ID: "A", Type: domain.NodeTypeHumanAction},
		},
		Edges: []domain.WorkflowDAGEdge{
			{ID: "e1", SourceNodeID: "A", TargetNodeID: "A"},
		},
	}
	err := domain.ValidateDAG(dag)
	if err == nil {
		t.Fatal("expected error for self-loop")
	}
}

// ─── NodeExecutionStatus Tests ───────────────────────────────────────────────

func TestNodeExecutionStatus_IsTerminal(t *testing.T) {
	tests := []struct {
		status   domain.NodeExecutionStatus
		terminal bool
	}{
		{domain.DAGNodeStatusPending, false},
		{domain.DAGNodeStatusActive, false},
		{domain.DAGNodeStatusCompleted, true},
		{domain.DAGNodeStatusFailed, true},
		{domain.DAGNodeStatusSkipped, true},
	}
	for _, tc := range tests {
		if tc.status.IsTerminal() != tc.terminal {
			t.Errorf("IsTerminal(%s) = %v, want %v", tc.status, tc.status.IsTerminal(), tc.terminal)
		}
	}
}

// ─── ExecutionStatus Tests ───────────────────────────────────────────────────

func TestExecutionStatus_IsTerminal(t *testing.T) {
	tests := []struct {
		status   domain.ExecutionStatus
		terminal bool
	}{
		{domain.ExecutionStatusRunning, false},
		{domain.ExecutionStatusCompleted, true},
		{domain.ExecutionStatusFailed, true},
		{domain.ExecutionStatusCancelled, true},
	}
	for _, tc := range tests {
		if tc.status.IsTerminal() != tc.terminal {
			t.Errorf("IsTerminal(%s) = %v, want %v", tc.status, tc.status.IsTerminal(), tc.terminal)
		}
	}
}

// ─── WorkflowNodeType Tests ──────────────────────────────────────────────────

func TestWorkflowNodeType_Validate(t *testing.T) {
	tests := []struct {
		nodeType domain.WorkflowNodeType
		wantErr  bool
	}{
		{domain.NodeTypeHumanAction, false},
		{domain.NodeTypeApproval, false},
		{domain.NodeTypeAutomatedCheck, false},
		{domain.NodeTypeNotification, false},
		{domain.NodeTypeWebhook, false},
		{domain.NodeTypeAgentTask, false},
		{domain.WorkflowNodeType("bogus"), true},
		{domain.WorkflowNodeType(""), true},
	}
	for _, tc := range tests {
		err := tc.nodeType.Validate()
		if (err != nil) != tc.wantErr {
			t.Errorf("Validate(%s) error=%v, wantErr=%v", tc.nodeType, err, tc.wantErr)
		}
	}
}

// ─── NewDAGEngine Tests ──────────────────────────────────────────────────────

func TestNewDAGEngine_NilLogger(t *testing.T) {
	engine := NewDAGEngine(nil, nil)
	if engine == nil {
		t.Fatal("expected non-nil engine")
	}
	if engine.logger == nil {
		t.Error("expected logger to be set when nil is passed")
	}
}

func TestNewDAGEngine_WithCEL(t *testing.T) {
	cel := newMockConditionEvaluator()
	engine := NewDAGEngine(cel, testLogger())
	if engine.cel == nil {
		t.Error("expected CEL evaluator to be set")
	}
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

func contains(slice []string, val string) bool {
	for _, v := range slice {
		if v == val {
			return true
		}
	}
	return false
}
