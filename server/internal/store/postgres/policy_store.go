// Package postgres implements PolicyStore for PostgreSQL using pgx.
//
// The governance_policies table stores CEL-based policies as JSONB. The
// ListApplicablePolicies method uses JSONB containment operators to filter
// policies by scope (agent_types, tool_names, environments) before they
// reach the CEL evaluator — avoiding evaluation of irrelevant policies.
package postgres

import (
	"context"
	"encoding/json"
	"fmt"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Policy Store ──────────────────────────────────────────────────────────

// CreatePolicy inserts a new governance policy.
func (s *Store) CreatePolicy(ctx context.Context, p *domain.Policy) error {
	const query = `
		INSERT INTO governance_policies (id, org_id, name, description, enabled, priority, scope, rules, effect)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`

	scopeJSON, err := json.Marshal(p.Scope)
	if err != nil {
		return fmt.Errorf("marshal scope: %w", err)
	}
	rulesJSON, err := json.Marshal(p.Rules)
	if err != nil {
		return fmt.Errorf("marshal rules: %w", err)
	}

	_, err = s.pool.Exec(ctx, query,
		p.ID, p.OrgID, p.Name, p.Description, p.Enabled, p.Priority,
		scopeJSON, rulesJSON, string(p.Effect),
	)
	if err != nil {
		return wrapConflict(err, "policy")
	}
	return nil
}

// GetPolicy retrieves a single policy by ID.
func (s *Store) GetPolicy(ctx context.Context, orgID, policyID string) (*domain.Policy, error) {
	const query = `
		SELECT id, org_id, name, description, enabled, priority, scope, rules, effect,
		       created_at, updated_at
		FROM governance_policies
		WHERE id = $1 AND org_id = $2`

	row := s.pool.QueryRow(ctx, query, policyID, orgID)
	p, err := scanPolicy(row)
	if err != nil {
		return nil, wrapNotFound(err, "policy")
	}
	return p, nil
}

// ListPolicies returns all policies for an organization, ordered by priority.
func (s *Store) ListPolicies(ctx context.Context, orgID string) ([]domain.Policy, error) {
	const query = `
		SELECT id, org_id, name, description, enabled, priority, scope, rules, effect,
		       created_at, updated_at
		FROM governance_policies
		WHERE org_id = $1
		ORDER BY priority ASC, name ASC`

	rows, err := s.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("list policies: %w", err)
	}
	defer rows.Close()

	var policies []domain.Policy
	for rows.Next() {
		p, err := scanPolicy(rows)
		if err != nil {
			return nil, err
		}
		policies = append(policies, *p)
	}
	if policies == nil {
		policies = []domain.Policy{}
	}
	return policies, rows.Err()
}

// ListApplicablePolicies returns policies whose scope matches the given
// action context. Uses JSONB containment (@>) to push filtering to the
// database, avoiding loading irrelevant policies into memory.
// Policies with an empty scope (no restrictions) match any filter.
func (s *Store) ListApplicablePolicies(ctx context.Context, orgID string, scope domain.PolicyScope) ([]domain.Policy, error) {
	const baseQuery = `
		SELECT id, org_id, name, description, enabled, priority, scope, rules, effect,
		       created_at, updated_at
		FROM governance_policies
		WHERE org_id = $1 AND enabled = true`

	var clauses []string
	args := []any{orgID}
	argIdx := 2

	// For each non-empty scope field, add a JSONB containment clause.
	// The filter matches policies where the policy's scope CONTAINS the
	// specified values, OR the policy's scope doesn't restrict that field.
	if len(scope.AgentTypes) > 0 {
		filter, _ := json.Marshal(map[string]any{"agent_types": scope.AgentTypes})
		clauses = append(clauses, fmt.Sprintf("(scope @> $%d OR NOT scope ? 'agent_types')", argIdx))
		args = append(args, string(filter))
		argIdx++
	}
	if len(scope.ToolNames) > 0 {
		filter, _ := json.Marshal(map[string]any{"tool_names": scope.ToolNames})
		clauses = append(clauses, fmt.Sprintf("(scope @> $%d OR NOT scope ? 'tool_names')", argIdx))
		args = append(args, string(filter))
		argIdx++
	}
	if len(scope.Environments) > 0 {
		filter, _ := json.Marshal(map[string]any{"environments": scope.Environments})
		clauses = append(clauses, fmt.Sprintf("(scope @> $%d OR NOT scope ? 'environments')", argIdx))
		args = append(args, string(filter))
		argIdx++
	}
	if len(scope.Projects) > 0 {
		filter, _ := json.Marshal(map[string]any{"projects": scope.Projects})
		clauses = append(clauses, fmt.Sprintf("(scope @> $%d OR NOT scope ? 'projects')", argIdx))
		args = append(args, string(filter))
		argIdx++
	}

	query := baseQuery
	for _, clause := range clauses {
		query += " AND " + clause
	}
	query += " ORDER BY priority ASC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list applicable policies: %w", err)
	}
	defer rows.Close()

	var policies []domain.Policy
	for rows.Next() {
		p, err := scanPolicy(rows)
		if err != nil {
			return nil, err
		}
		policies = append(policies, *p)
	}
	if policies == nil {
		policies = []domain.Policy{}
	}
	return policies, rows.Err()
}

// UpdatePolicy modifies an existing policy.
func (s *Store) UpdatePolicy(ctx context.Context, p *domain.Policy) error {
	const query = `
		UPDATE governance_policies
		SET name = $3, description = $4, enabled = $5, priority = $6,
		    scope = $7, rules = $8, effect = $9, updated_at = NOW()
		WHERE id = $1 AND org_id = $2`

	scopeJSON, err := json.Marshal(p.Scope)
	if err != nil {
		return fmt.Errorf("marshal scope: %w", err)
	}
	rulesJSON, err := json.Marshal(p.Rules)
	if err != nil {
		return fmt.Errorf("marshal rules: %w", err)
	}

	tag, err := s.pool.Exec(ctx, query,
		p.ID, p.OrgID, p.Name, p.Description, p.Enabled, p.Priority,
		scopeJSON, rulesJSON, string(p.Effect),
	)
	if err != nil {
		return fmt.Errorf("update policy: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("policy")
	}
	return nil
}

// DeletePolicy removes a policy.
func (s *Store) DeletePolicy(ctx context.Context, orgID, policyID string) error {
	const query = `DELETE FROM governance_policies WHERE id = $1 AND org_id = $2`
	tag, err := s.pool.Exec(ctx, query, policyID, orgID)
	if err != nil {
		return fmt.Errorf("delete policy: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("policy")
	}
	return nil
}

// SetPolicyEnabled enables or disables a policy.
func (s *Store) SetPolicyEnabled(ctx context.Context, orgID, policyID string, enabled bool) error {
	const query = `UPDATE governance_policies SET enabled = $3, updated_at = NOW() WHERE id = $1 AND org_id = $2`
	tag, err := s.pool.Exec(ctx, query, policyID, orgID, enabled)
	if err != nil {
		return fmt.Errorf("set policy enabled: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("policy")
	}
	return nil
}

// ─── Scanner ───────────────────────────────────────────────────────────────

// scanPolicy scans a single policy row from either pgx.Row or pgx.Rows.
type policyScanner interface {
	Scan(dest ...any) error
}

func scanPolicy(row policyScanner) (*domain.Policy, error) {
	var p domain.Policy
	var scopeJSON, rulesJSON []byte
	var effectStr string

	err := row.Scan(&p.ID, &p.OrgID, &p.Name, &p.Description,
		&p.Enabled, &p.Priority, &scopeJSON, &rulesJSON, &effectStr,
		&p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, err
	}

	if err := json.Unmarshal(scopeJSON, &p.Scope); err != nil {
		return nil, fmt.Errorf("unmarshal scope: %w", err)
	}
	if err := json.Unmarshal(rulesJSON, &p.Rules); err != nil {
		return nil, fmt.Errorf("unmarshal rules: %w", err)
	}
	p.Effect = domain.PolicyEffect(effectStr)

	if p.Rules == nil {
		p.Rules = []domain.PolicyRule{}
	}

	return &p, nil
}
