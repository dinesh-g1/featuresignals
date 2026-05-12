package postgres

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/featuresignals/server/internal/domain"
)

// ─── ABMBehaviorStore ──────────────────────────────────────────────────────

// CreateBehavior inserts a new ABM behavior.
func (s *Store) CreateBehavior(ctx context.Context, behavior *domain.ABMBehavior) error {
	variantsJSON, err := json.Marshal(behavior.Variants)
	if err != nil {
		return err
	}
	targetingJSON, err := json.Marshal(behavior.TargetingRules)
	if err != nil {
		return err
	}

	err = s.pool.QueryRow(ctx,
		`INSERT INTO abm_behaviors (key, org_id, name, description, agent_type, variants,
		 default_variant, targeting_rules, rollout_percentage, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING created_at, updated_at`,
		behavior.Key,
		behavior.OrgID,
		behavior.Name,
		behavior.Description,
		behavior.AgentType,
		variantsJSON,
		behavior.DefaultVariant,
		targetingJSON,
		behavior.RolloutPercentage,
		behavior.Status,
	).Scan(&behavior.CreatedAt, &behavior.UpdatedAt)
	return wrapConflict(err, "abm_behavior")
}

// GetBehavior retrieves a single ABM behavior by org and key.
func (s *Store) GetBehavior(ctx context.Context, orgID, behaviorKey string) (*domain.ABMBehavior, error) {
	behavior := &domain.ABMBehavior{OrgID: orgID}
	var variantsJSON, targetingJSON []byte

	err := s.pool.QueryRow(ctx,
		`SELECT key, name, description, agent_type, variants, default_variant,
		        targeting_rules, rollout_percentage, status, created_at, updated_at
		 FROM abm_behaviors WHERE org_id = $1 AND key = $2`,
		orgID, behaviorKey,
	).Scan(
		&behavior.Key, &behavior.Name, &behavior.Description,
		&behavior.AgentType, &variantsJSON, &behavior.DefaultVariant,
		&targetingJSON, &behavior.RolloutPercentage, &behavior.Status,
		&behavior.CreatedAt, &behavior.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "abm_behavior")
	}

	if err := json.Unmarshal(variantsJSON, &behavior.Variants); err != nil {
		behavior.Variants = []domain.ABMVariant{}
	}
	if err := json.Unmarshal(targetingJSON, &behavior.TargetingRules); err != nil {
		behavior.TargetingRules = []domain.ABMTargetingRule{}
	}

	return behavior, nil
}

// ListBehaviors returns all ABM behaviors for an organization.
func (s *Store) ListBehaviors(ctx context.Context, orgID string) ([]domain.ABMBehavior, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT key, name, description, agent_type, variants, default_variant,
		        targeting_rules, rollout_percentage, status, created_at, updated_at
		 FROM abm_behaviors WHERE org_id = $1
		 ORDER BY created_at DESC`,
		orgID,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanBehaviors(rows)
}

// ListBehaviorsByAgentType returns ABM behaviors filtered by agent type.
func (s *Store) ListBehaviorsByAgentType(ctx context.Context, orgID, agentType string) ([]domain.ABMBehavior, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT key, name, description, agent_type, variants, default_variant,
		        targeting_rules, rollout_percentage, status, created_at, updated_at
		 FROM abm_behaviors WHERE org_id = $1 AND agent_type = $2
		 ORDER BY created_at DESC`,
		orgID, agentType,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	return scanBehaviors(rows)
}

// UpdateBehavior updates an existing ABM behavior's mutable fields.
func (s *Store) UpdateBehavior(ctx context.Context, behavior *domain.ABMBehavior) error {
	variantsJSON, err := json.Marshal(behavior.Variants)
	if err != nil {
		return err
	}
	targetingJSON, err := json.Marshal(behavior.TargetingRules)
	if err != nil {
		return err
	}

	tag, err := s.pool.Exec(ctx,
		`UPDATE abm_behaviors
		 SET name = $1, description = $2, agent_type = $3, variants = $4,
		     default_variant = $5, targeting_rules = $6, rollout_percentage = $7,
		     status = $8, updated_at = NOW()
		 WHERE org_id = $9 AND key = $10`,
		behavior.Name, behavior.Description, behavior.AgentType,
		variantsJSON, behavior.DefaultVariant, targetingJSON,
		behavior.RolloutPercentage, behavior.Status,
		behavior.OrgID, behavior.Key,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("abm_behavior")
	}
	return nil
}

// DeleteBehavior removes an ABM behavior.
func (s *Store) DeleteBehavior(ctx context.Context, orgID, behaviorKey string) error {
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM abm_behaviors WHERE org_id = $1 AND key = $2`,
		orgID, behaviorKey,
	)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("abm_behavior")
	}
	return nil
}

// scanBehaviors reads ABM behavior rows from a pgx.Rows iterator.
func scanBehaviors(rows pgx.Rows) ([]domain.ABMBehavior, error) {
	var behaviors []domain.ABMBehavior
	for rows.Next() {
		var b domain.ABMBehavior
		var variantsJSON, targetingJSON []byte

		if err := rows.Scan(
			&b.Key, &b.Name, &b.Description, &b.AgentType,
			&variantsJSON, &b.DefaultVariant, &targetingJSON,
			&b.RolloutPercentage, &b.Status, &b.CreatedAt, &b.UpdatedAt,
		); err != nil {
			return nil, err
		}

		if err := json.Unmarshal(variantsJSON, &b.Variants); err != nil {
			b.Variants = []domain.ABMVariant{}
		}
		if err := json.Unmarshal(targetingJSON, &b.TargetingRules); err != nil {
			b.TargetingRules = []domain.ABMTargetingRule{}
		}

		behaviors = append(behaviors, b)
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	if behaviors == nil {
		behaviors = []domain.ABMBehavior{}
	}
	return behaviors, nil
}

// ─── ABMEventStore ─────────────────────────────────────────────────────────

// InsertTrackEvent records a single ABM track event.
func (s *Store) InsertTrackEvent(ctx context.Context, event *domain.ABMTrackEvent) error {
	metadataJSON, err := json.Marshal(event.Metadata)
	if err != nil {
		return err
	}

	_, err = s.pool.Exec(ctx,
		`INSERT INTO abm_track_events (org_id, behavior_key, variant, agent_id, agent_type,
		 user_id, action, outcome, value, metadata, session_id, recorded_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
		event.OrgID,
		event.BehaviorKey,
		event.Variant,
		event.AgentID,
		event.AgentType,
		event.UserID,
		event.Action,
		event.Outcome,
		event.Value,
		metadataJSON,
		event.SessionID,
		event.RecordedAt,
	)
	return err
}

// InsertTrackEvents batch-inserts multiple ABM track events in a single
// database round-trip. This is the preferred method for bulk event ingestion.
func (s *Store) InsertTrackEvents(ctx context.Context, events []domain.ABMTrackEvent) error {
	if len(events) == 0 {
		return nil
	}

	// Use pgx Batch for efficient multi-row inserts.
	batch := &pgx.Batch{}
	for i := range events {
		ev := &events[i]
		metadataJSON, err := json.Marshal(ev.Metadata)
		if err != nil {
			return err
		}
		batch.Queue(
			`INSERT INTO abm_track_events (org_id, behavior_key, variant, agent_id, agent_type,
			 user_id, action, outcome, value, metadata, session_id, recorded_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
			ev.OrgID, ev.BehaviorKey, ev.Variant, ev.AgentID, ev.AgentType,
			ev.UserID, ev.Action, ev.Outcome, ev.Value, metadataJSON,
			ev.SessionID, ev.RecordedAt,
		)
	}

	br := s.pool.SendBatch(ctx, batch)
	defer br.Close()

	for i := 0; i < len(events); i++ {
		if _, err := br.Exec(); err != nil {
			return err
		}
	}
	return nil
}

// CountEventsByBehavior returns the count of track events for a specific
// behavior within a time window.
func (s *Store) CountEventsByBehavior(ctx context.Context, orgID, behaviorKey string, since time.Time) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM abm_track_events
		 WHERE org_id = $1 AND behavior_key = $2 AND recorded_at >= $3`,
		orgID, behaviorKey, since,
	).Scan(&count)
	return count, err
}

// CountEventsByAgent returns the count of track events for a specific
// agent within a time window.
func (s *Store) CountEventsByAgent(ctx context.Context, orgID, agentID string, since time.Time) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM abm_track_events
		 WHERE org_id = $1 AND agent_id = $2 AND recorded_at >= $3`,
		orgID, agentID, since,
	).Scan(&count)
	return count, err
}

// GetVariantDistribution returns a map of variant → count for a behavior
// within a time window. Used for A/B test analysis and rollout monitoring.
func (s *Store) GetVariantDistribution(ctx context.Context, orgID, behaviorKey string, since time.Time) (map[string]int, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT variant, COUNT(*) as cnt
		 FROM abm_track_events
		 WHERE org_id = $1 AND behavior_key = $2 AND recorded_at >= $3
		 GROUP BY variant`,
		orgID, behaviorKey, since,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	dist := make(map[string]int)
	for rows.Next() {
		var variant string
		var cnt int
		if err := rows.Scan(&variant, &cnt); err != nil {
			return nil, err
		}
		dist[variant] = cnt
	}
	if err := rows.Err(); err != nil {
		return nil, err
	}
	return dist, nil
}
