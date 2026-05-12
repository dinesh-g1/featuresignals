package postgres

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/featuresignals/server/internal/domain"
)

// ─── AgentStore ────────────────────────────────────────────────────────────

// CreateAgent inserts a new agent into the registry.
func (s *Store) CreateAgent(ctx context.Context, agent *domain.Agent) error {
	scopesJSON, err := json.Marshal(agent.Scopes)
	if err != nil {
		return err
	}
	rateLimitsJSON, err := json.Marshal(agent.RateLimits)
	if err != nil {
		return err
	}
	costProfileJSON, err := json.Marshal(agent.CostProfile)
	if err != nil {
		return err
	}

	err = s.pool.QueryRow(ctx,
		`INSERT INTO agents (id, org_id, name, agent_type, version, brain_type, status, scopes, rate_limits, cost_profile, registered_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		 RETURNING created_at, updated_at`,
		agent.ID,
		agent.OrgID,
		agent.Name,
		agent.Type,
		agent.Version,
		agent.BrainType,
		agent.Status,
		scopesJSON,
		rateLimitsJSON,
		costProfileJSON,
		agent.RegisteredAt,
	).Scan(&agent.CreatedAt, &agent.UpdatedAt)
	return wrapConflict(err, "agent")
}

// GetAgent retrieves a single agent by org and agent ID.
func (s *Store) GetAgent(ctx context.Context, orgID, agentID string) (*domain.Agent, error) {
	agent := &domain.Agent{}
	var scopesJSON, rateLimitsJSON, costProfileJSON []byte
	var lastHeartbeat *time.Time

	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, name, agent_type, version, brain_type, status,
		        scopes, rate_limits, cost_profile,
		        registered_at, last_heartbeat, created_at, updated_at
		 FROM agents WHERE org_id = $1 AND id = $2`,
		orgID, agentID,
	).Scan(
		&agent.ID, &agent.OrgID, &agent.Name, &agent.Type,
		&agent.Version, &agent.BrainType, &agent.Status,
		&scopesJSON, &rateLimitsJSON, &costProfileJSON,
		&agent.RegisteredAt, &lastHeartbeat, &agent.CreatedAt, &agent.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "agent")
	}

	if err := json.Unmarshal(scopesJSON, &agent.Scopes); err != nil {
		agent.Scopes = []string{}
	}
	if err := json.Unmarshal(rateLimitsJSON, &agent.RateLimits); err != nil {
		agent.RateLimits = domain.AgentRateLimits{}
	}
	if err := json.Unmarshal(costProfileJSON, &agent.CostProfile); err != nil {
		agent.CostProfile = domain.AgentCostProfile{}
	}
	if lastHeartbeat != nil {
		agent.LastHeartbeat = *lastHeartbeat
	}

	return agent, nil
}

// ListAgents returns all agents for an organization.
func (s *Store) ListAgents(ctx context.Context, orgID string) ([]domain.Agent, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, name, agent_type, version, brain_type, status,
		        scopes, rate_limits, cost_profile,
		        registered_at, last_heartbeat, created_at, updated_at
		 FROM agents WHERE org_id = $1
		 ORDER BY created_at DESC`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanAgents(rows)
}

// ListAgentsByType returns agents for an organization filtered by agent type.
func (s *Store) ListAgentsByType(ctx context.Context, orgID, agentType string) ([]domain.Agent, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, name, agent_type, version, brain_type, status,
		        scopes, rate_limits, cost_profile,
		        registered_at, last_heartbeat, created_at, updated_at
		 FROM agents WHERE org_id = $1 AND agent_type = $2
		 ORDER BY created_at DESC`,
		orgID, agentType,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanAgents(rows)
}

// UpdateAgent updates an existing agent's mutable fields.
func (s *Store) UpdateAgent(ctx context.Context, agent *domain.Agent) error {
	scopesJSON, err := json.Marshal(agent.Scopes)
	if err != nil {
		return err
	}
	rateLimitsJSON, err := json.Marshal(agent.RateLimits)
	if err != nil {
		return err
	}
	costProfileJSON, err := json.Marshal(agent.CostProfile)
	if err != nil {
		return err
	}

	tag, err := s.pool.Exec(ctx,
		`UPDATE agents
		 SET name = $1, agent_type = $2, version = $3, brain_type = $4,
		     status = $5, scopes = $6, rate_limits = $7, cost_profile = $8,
		     updated_at = NOW()
		 WHERE id = $9 AND org_id = $10`,
		agent.Name, agent.Type, agent.Version, agent.BrainType,
		agent.Status, scopesJSON, rateLimitsJSON, costProfileJSON,
		agent.ID, agent.OrgID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("agent")
	}
	return nil
}

// UpdateAgentHeartbeat sets the agent's last_heartbeat to the current time.
func (s *Store) UpdateAgentHeartbeat(ctx context.Context, agentID string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE agents SET last_heartbeat = NOW(), updated_at = NOW() WHERE id = $1`,
		agentID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("agent")
	}
	return nil
}

// DeleteAgent removes an agent from the registry.
func (s *Store) DeleteAgent(ctx context.Context, orgID, agentID string) error {
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM agents WHERE org_id = $1 AND id = $2`,
		orgID, agentID,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("agent")
	}
	return nil
}

// scanAgents reads agent rows from a pgx.Rows iterator.
func scanAgents(rows pgx.Rows) ([]domain.Agent, error) {
	var agents []domain.Agent
	for rows.Next() {
		var a domain.Agent
		var scopesJSON, rateLimitsJSON, costProfileJSON []byte
		var lastHeartbeat *time.Time

		if err := rows.Scan(
			&a.ID, &a.OrgID, &a.Name, &a.Type,
			&a.Version, &a.BrainType, &a.Status,
			&scopesJSON, &rateLimitsJSON, &costProfileJSON,
			&a.RegisteredAt, &lastHeartbeat, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, err
		}

		if err := json.Unmarshal(scopesJSON, &a.Scopes); err != nil {
			a.Scopes = []string{}
		}
		if err := json.Unmarshal(rateLimitsJSON, &a.RateLimits); err != nil {
			a.RateLimits = domain.AgentRateLimits{}
		}
		if err := json.Unmarshal(costProfileJSON, &a.CostProfile); err != nil {
			a.CostProfile = domain.AgentCostProfile{}
		}
		if lastHeartbeat != nil {
			a.LastHeartbeat = *lastHeartbeat
		}

		agents = append(agents, a)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if agents == nil {
		agents = []domain.Agent{}
	}
	return agents, nil
}

// ─── AgentMaturityStore ────────────────────────────────────────────────────

// UpsertMaturity inserts or updates a per-context maturity entry for an agent.
func (s *Store) UpsertMaturity(ctx context.Context, agentID string, m *domain.AgentMaturity) error {
	// Extract the first (and typically only) context key from PerContext.
	// The domain type has map[string]MaturityLevel; we store one context per row.
	contextKey := ""
	level := m.CurrentLevel
	for k, v := range m.PerContext {
		contextKey = k
		level = v
		break
	}
	// If PerContext is empty, use CurrentLevel with an empty context key.
	if contextKey == "" && level == 0 {
		level = m.CurrentLevel
	}

	err := s.pool.QueryRow(ctx,
		`INSERT INTO agent_maturity (id, agent_id, context_key, maturity_level,
		     total_decisions, successful_decisions, accuracy,
		     incidents_caused, human_override_rate, avg_confidence,
		     days_since_last_incident, last_evaluated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, NOW())
		 ON CONFLICT (agent_id, context_key) DO UPDATE SET
		     maturity_level = EXCLUDED.maturity_level,
		     total_decisions = EXCLUDED.total_decisions,
		     successful_decisions = EXCLUDED.successful_decisions,
		     accuracy = EXCLUDED.accuracy,
		     incidents_caused = EXCLUDED.incidents_caused,
		     human_override_rate = EXCLUDED.human_override_rate,
		     avg_confidence = EXCLUDED.avg_confidence,
		     days_since_last_incident = EXCLUDED.days_since_last_incident,
		     last_evaluated_at = NOW(),
		     updated_at = NOW()
		 RETURNING id`,
		m.ID, agentID, contextKey, int(level),
		m.Stats.TotalDecisions, m.Stats.SuccessfulDecisions, m.Stats.Accuracy,
		m.Stats.IncidentsCaused, m.Stats.HumanOverrideRate, m.Stats.AvgConfidence,
		m.Stats.DaysSinceLastIncident,
	).Scan(&m.ID)
	return wrapConflict(err, "agent maturity")
}

// GetMaturity retrieves a single per-context maturity entry.
func (s *Store) GetMaturity(ctx context.Context, agentID, contextKey string) (*domain.AgentMaturity, error) {
	m := &domain.AgentMaturity{}
	var level int
	var lastEvaluatedAt *time.Time

	err := s.pool.QueryRow(ctx,
		`SELECT id, maturity_level, total_decisions, successful_decisions,
		        accuracy, incidents_caused, human_override_rate,
		        avg_confidence, days_since_last_incident, last_evaluated_at
		 FROM agent_maturity
		 WHERE agent_id = $1 AND context_key = $2`,
		agentID, contextKey,
	).Scan(
		&m.ID, &level, &m.Stats.TotalDecisions, &m.Stats.SuccessfulDecisions,
		&m.Stats.Accuracy, &m.Stats.IncidentsCaused, &m.Stats.HumanOverrideRate,
		&m.Stats.AvgConfidence, &m.Stats.DaysSinceLastIncident, &lastEvaluatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "agent maturity")
	}

	m.CurrentLevel = domain.MaturityLevel(level)
	m.PerContext = map[string]domain.MaturityLevel{contextKey: domain.MaturityLevel(level)}
	return m, nil
}

// ListMaturities returns all per-context maturity entries for an agent.
func (s *Store) ListMaturities(ctx context.Context, agentID string) ([]domain.AgentMaturity, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, context_key, maturity_level, total_decisions,
		        successful_decisions, accuracy, incidents_caused,
		        human_override_rate, avg_confidence,
		        days_since_last_incident, last_evaluated_at
		 FROM agent_maturity
		 WHERE agent_id = $1
		 ORDER BY context_key`,
		agentID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var maturities []domain.AgentMaturity
	for rows.Next() {
		var m domain.AgentMaturity
		var level int
		var contextKey string
		var lastEvaluatedAt *time.Time

		if err := rows.Scan(
			&m.ID, &contextKey, &level, &m.Stats.TotalDecisions,
			&m.Stats.SuccessfulDecisions, &m.Stats.Accuracy,
			&m.Stats.IncidentsCaused, &m.Stats.HumanOverrideRate,
			&m.Stats.AvgConfidence, &m.Stats.DaysSinceLastIncident,
			&lastEvaluatedAt,
		); err != nil {
			return nil, err
		}

		m.CurrentLevel = domain.MaturityLevel(level)
		m.PerContext = map[string]domain.MaturityLevel{contextKey: domain.MaturityLevel(level)}
		maturities = append(maturities, m)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if maturities == nil {
		maturities = []domain.AgentMaturity{}
	}
	return maturities, nil
}
