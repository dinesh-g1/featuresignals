// Package postgres provides PostgreSQL-backed store implementations.
//
// WorkflowStore implements domain.WorkflowStore for workflow definitions,
// runs, and node state persistence.
package postgres

import (
	"context"
	"encoding/json"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ── Workflow Definitions ────────────────────────────────────────────────────

func (s *Store) CreateWorkflow(ctx context.Context, wf *domain.Workflow) error {
	if wf.ID == "" {
		return domain.NewValidationError("id", "is required")
	}
	if wf.CreatedAt.IsZero() {
		wf.CreatedAt = time.Now().UTC()
	}

	nodesJSON, err := json.Marshal(wf.Nodes)
	if err != nil {
		return err
	}
	edgesJSON, err := json.Marshal(wf.Edges)
	if err != nil {
		return err
	}
	endNodesJSON, err := json.Marshal(wf.EndNodes)
	if err != nil {
		return err
	}
	retryJSON, err := json.Marshal(wf.RetryPolicy)
	if err != nil {
		return err
	}

	_, err = s.pool.Exec(ctx,
		`INSERT INTO workflow_definitions (id, name, description, version,
			nodes, edges, start_node, end_nodes, timeout_sec, retry_policy, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)`,
		wf.ID, wf.Name, wf.Description, wf.Version,
		nodesJSON, edgesJSON, wf.StartNode, endNodesJSON,
		wf.TimeoutSec, retryJSON, wf.CreatedAt,
	)
	return err
}

func (s *Store) GetWorkflow(ctx context.Context, orgID, workflowID string) (*domain.Workflow, error) {
	var wf domain.Workflow
	var nodesJSON, edgesJSON, endNodesJSON, retryJSON []byte

	err := s.pool.QueryRow(ctx,
		`SELECT id, name, description, version,
		        nodes, edges, start_node, end_nodes,
		        timeout_sec, retry_policy, created_at
		 FROM workflow_definitions WHERE id = $1`,
		workflowID,
	).Scan(&wf.ID, &wf.Name, &wf.Description, &wf.Version,
		&nodesJSON, &edgesJSON, &wf.StartNode, &endNodesJSON,
		&wf.TimeoutSec, &retryJSON, &wf.CreatedAt,
	)
	if err != nil {
		return nil, err
	}

	_ = json.Unmarshal(nodesJSON, &wf.Nodes)
	_ = json.Unmarshal(edgesJSON, &wf.Edges)
	_ = json.Unmarshal(endNodesJSON, &wf.EndNodes)
	if len(retryJSON) > 0 {
		_ = json.Unmarshal(retryJSON, &wf.RetryPolicy)
	}

	return &wf, nil
}

func (s *Store) ListWorkflows(ctx context.Context, orgID string, limit, offset int) ([]domain.Workflow, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, name, description, version,
		        nodes, edges, start_node, end_nodes,
		        timeout_sec, retry_policy, created_at
		 FROM workflow_definitions
		 ORDER BY created_at DESC LIMIT $1 OFFSET $2`,
		limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var workflows []domain.Workflow
	for rows.Next() {
		var wf domain.Workflow
		var nodesJSON, edgesJSON, endNodesJSON, retryJSON []byte
		if err := rows.Scan(&wf.ID, &wf.Name, &wf.Description, &wf.Version,
			&nodesJSON, &edgesJSON, &wf.StartNode, &endNodesJSON,
			&wf.TimeoutSec, &retryJSON, &wf.CreatedAt,
		); err != nil {
			return nil, err
		}
		_ = json.Unmarshal(nodesJSON, &wf.Nodes)
		_ = json.Unmarshal(edgesJSON, &wf.Edges)
		_ = json.Unmarshal(endNodesJSON, &wf.EndNodes)
		if len(retryJSON) > 0 {
			_ = json.Unmarshal(retryJSON, &wf.RetryPolicy)
		}
		workflows = append(workflows, wf)
	}
	return workflows, rows.Err()
}

func (s *Store) CountWorkflows(ctx context.Context, orgID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM workflow_definitions`).Scan(&count)
	return count, err
}

func (s *Store) DeleteWorkflow(ctx context.Context, orgID, workflowID string) error {
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM workflow_definitions WHERE id = $1`, workflowID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.ErrNotFound
	}
	return nil
}

// ── Workflow Runs ────────────────────────────────────────────────────────────

func (s *Store) CreateWorkflowRun(ctx context.Context, run *domain.WorkflowRun) error {
	if run.ID == "" {
		return domain.NewValidationError("id", "is required")
	}

	contextJSON, err := json.Marshal(run.Context)
	if err != nil {
		return err
	}
	nodeStatesJSON, err := json.Marshal(run.NodeStates)
	if err != nil {
		return err
	}

	_, err = s.pool.Exec(ctx,
		`INSERT INTO workflow_runs (id, workflow_id, workflow_version, status,
			trigger, org_id, context, node_states, started_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
		run.ID, run.WorkflowID, run.WorkflowVersion, string(run.Status),
		run.Trigger, run.OrgID, contextJSON, nodeStatesJSON, run.StartedAt,
	)
	return err
}

func (s *Store) GetWorkflowRun(ctx context.Context, orgID, runID string) (*domain.WorkflowRun, error) {
	var run domain.WorkflowRun
	var contextJSON, nodeStatesJSON []byte
	var status string

	err := s.pool.QueryRow(ctx,
		`SELECT id, workflow_id, workflow_version, status,
		        trigger, org_id, context, node_states,
		        started_at, completed_at, error
		 FROM workflow_runs WHERE org_id = $1 AND id = $2`,
		orgID, runID,
	).Scan(&run.ID, &run.WorkflowID, &run.WorkflowVersion, &status,
		&run.Trigger, &run.OrgID, &contextJSON, &nodeStatesJSON,
		&run.StartedAt, &run.CompletedAt, &run.Error,
	)
	if err != nil {
		return nil, err
	}
	run.Status = domain.WorkflowStatus(status)
	_ = json.Unmarshal(contextJSON, &run.Context)
	_ = json.Unmarshal(nodeStatesJSON, &run.NodeStates)
	if run.NodeStates == nil {
		run.NodeStates = make(map[string]domain.WorkflowNodeState)
	}
	return &run, nil
}

func (s *Store) ListWorkflowRuns(ctx context.Context, orgID, workflowID string, status domain.WorkflowStatus, limit, offset int) ([]domain.WorkflowRun, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, workflow_id, workflow_version, status,
		        trigger, org_id, context, node_states,
		        started_at, completed_at, error
		 FROM workflow_runs WHERE org_id = $1
		 ORDER BY started_at DESC NULLS LAST LIMIT $2 OFFSET $3`,
		orgID, limit, offset,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var runs []domain.WorkflowRun
	for rows.Next() {
		var run domain.WorkflowRun
		var contextJSON, nodeStatesJSON []byte
		var statusStr string
		if err := rows.Scan(&run.ID, &run.WorkflowID, &run.WorkflowVersion, &statusStr,
			&run.Trigger, &run.OrgID, &contextJSON, &nodeStatesJSON,
			&run.StartedAt, &run.CompletedAt, &run.Error,
		); err != nil {
			return nil, err
		}
		run.Status = domain.WorkflowStatus(statusStr)
		_ = json.Unmarshal(contextJSON, &run.Context)
		_ = json.Unmarshal(nodeStatesJSON, &run.NodeStates)
		runs = append(runs, run)
	}
	return runs, rows.Err()
}

func (s *Store) CountWorkflowRuns(ctx context.Context, orgID, workflowID string, status domain.WorkflowStatus) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM workflow_runs WHERE org_id = $1`,
		orgID,
	).Scan(&count)
	return count, err
}

func (s *Store) UpdateWorkflowRunStatus(ctx context.Context, orgID, runID string, status domain.WorkflowStatus, errorMsg string) error {
	var completedAt *time.Time
	if status == domain.WorkflowStatusCompleted || status == domain.WorkflowStatusFailed || status == domain.WorkflowStatusCancelled {
		now := time.Now().UTC()
		completedAt = &now
	}

	_, err := s.pool.Exec(ctx,
		`UPDATE workflow_runs SET status = $1, error = $2, completed_at = $3, updated_at = NOW()
		 WHERE org_id = $4 AND id = $5`,
		string(status), errorMsg, completedAt, orgID, runID,
	)
	return err
}

// ── Node States ──────────────────────────────────────────────────────────────

func (s *Store) UpdateNodeState(ctx context.Context, runID string, state *domain.WorkflowNodeState) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO workflow_node_states (run_id, node_id, status, task_id, agent_id,
			input, output, error, retry_count, started_at, completed_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		 ON CONFLICT (run_id, node_id) DO UPDATE SET
		   status = EXCLUDED.status, task_id = EXCLUDED.task_id,
		   agent_id = EXCLUDED.agent_id, input = EXCLUDED.input,
		   output = EXCLUDED.output, error = EXCLUDED.error,
		   retry_count = EXCLUDED.retry_count, completed_at = EXCLUDED.completed_at`,
		runID, state.NodeID, string(state.Status), state.TaskID, state.AgentID,
		state.Input, state.Output, state.Error, state.RetryCount,
		state.StartedAt, state.CompletedAt,
	)
	return err
}

func (s *Store) GetNodeStates(ctx context.Context, runID string) (map[string]domain.WorkflowNodeState, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT node_id, status, task_id, agent_id,
		        input, output, error, retry_count,
		        started_at, completed_at
		 FROM workflow_node_states WHERE run_id = $1`, runID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	states := make(map[string]domain.WorkflowNodeState)
	for rows.Next() {
		var ns domain.WorkflowNodeState
		var statusStr string
		if err := rows.Scan(&ns.NodeID, &statusStr, &ns.TaskID, &ns.AgentID,
			&ns.Input, &ns.Output, &ns.Error, &ns.RetryCount,
			&ns.StartedAt, &ns.CompletedAt,
		); err != nil {
			return nil, err
		}
		ns.Status = domain.WorkflowNodeStatus(statusStr)
		states[ns.NodeID] = ns
	}
	return states, rows.Err()
}
