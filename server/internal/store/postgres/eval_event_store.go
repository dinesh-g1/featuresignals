package postgres

import (
	"context"
	"encoding/json"
	"time"

	"github.com/jackc/pgx/v5"

	"github.com/featuresignals/server/internal/domain"
)

// ─── EvalEventWriter ───────────────────────────────────────────────────────

// InsertEvalEvent inserts a single evaluation event into the eval_events table.
func (s *Store) InsertEvalEvent(ctx context.Context, event *domain.EvalEvent) error {
	segmentKeysJSON, _ := json.Marshal(event.SegmentKeys)

	_, err := s.pool.Exec(ctx,
		`INSERT INTO eval_events (id, org_id, project_id, environment_id, flag_key, flag_id,
			variant, value, reason, rule_id, segment_keys, sdk, sdk_mode,
			user_key_hash, attributes, latency_us, cache_hit, evaluated_at)
		 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
		event.ID, event.OrgID, event.ProjectID, event.EnvironmentID,
		event.FlagKey, nilIfEmpty(event.FlagID),
		nilIfEmpty(event.Variant), event.Value, event.Reason,
		nilIfEmpty(event.RuleID), segmentKeysJSON,
		nilIfEmpty(event.SDK), nilIfEmpty(event.SDKMode),
		nilIfEmpty(event.UserKeyHash), event.Attributes,
		event.LatencyUs, event.CacheHit, event.EvaluatedAt,
	)
	return err
}

// InsertEvalEventBatch inserts a batch of evaluation events efficiently
// using pgx batch operations.
func (s *Store) InsertEvalEventBatch(ctx context.Context, batch *domain.EvalEventBatch) error {
	if len(batch.Events) == 0 {
		return nil
	}

	pgxBatch := &pgx.Batch{}
	for i := range batch.Events {
		ev := &batch.Events[i]
		segmentKeysJSON, _ := json.Marshal(ev.SegmentKeys)

		pgxBatch.Queue(
			`INSERT INTO eval_events (id, org_id, project_id, environment_id, flag_key, flag_id,
				variant, value, reason, rule_id, segment_keys, sdk, sdk_mode,
				user_key_hash, attributes, latency_us, cache_hit, evaluated_at)
			 VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
			ev.ID, ev.OrgID, ev.ProjectID, ev.EnvironmentID,
			ev.FlagKey, nilIfEmpty(ev.FlagID),
			nilIfEmpty(ev.Variant), ev.Value, ev.Reason,
			nilIfEmpty(ev.RuleID), segmentKeysJSON,
			nilIfEmpty(ev.SDK), nilIfEmpty(ev.SDKMode),
			nilIfEmpty(ev.UserKeyHash), ev.Attributes,
			ev.LatencyUs, ev.CacheHit, ev.EvaluatedAt,
		)
	}

	br := s.pool.SendBatch(ctx, pgxBatch)
	defer br.Close()

	for range batch.Events {
		if _, err := br.Exec(); err != nil {
			return err
		}
	}
	return nil
}

// ─── EvalEventReader ───────────────────────────────────────────────────────

// CountEvaluations returns the total number of evaluations for a flag
// within the specified time window.
func (s *Store) CountEvaluations(ctx context.Context, orgID, flagKey string, since time.Time) (int64, error) {
	var count int64
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM eval_events
		 WHERE org_id = $1 AND flag_key = $2 AND evaluated_at >= $3`,
		orgID, flagKey, since,
	).Scan(&count)
	return count, err
}

// CountEvaluationsByVariant returns evaluation counts grouped by variant
// for a flag within the specified time window.
func (s *Store) CountEvaluationsByVariant(ctx context.Context, orgID, flagKey string, since time.Time) (map[string]int64, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT variant, COUNT(*) FROM eval_events
		 WHERE org_id = $1 AND flag_key = $2 AND evaluated_at >= $3 AND variant != ''
		 GROUP BY variant`,
		orgID, flagKey, since,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	result := make(map[string]int64)
	for rows.Next() {
		var variant string
		var count int64
		if err := rows.Scan(&variant, &count); err != nil {
			return nil, err
		}
		result[variant] = count
	}
	return result, rows.Err()
}

// GetEvaluationLatency returns p50, p95, and p99 latency percentiles
// (in microseconds) for a flag within the specified time window.
func (s *Store) GetEvaluationLatency(ctx context.Context, orgID, flagKey string, since time.Time) (p50, p95, p99 int64, err error) {
	err = s.pool.QueryRow(ctx,
		`SELECT
			COALESCE(percentile_disc(0.50) WITHIN GROUP (ORDER BY latency_us), 0),
			COALESCE(percentile_disc(0.95) WITHIN GROUP (ORDER BY latency_us), 0),
			COALESCE(percentile_disc(0.99) WITHIN GROUP (ORDER BY latency_us), 0)
		 FROM eval_events
		 WHERE org_id = $1 AND flag_key = $2 AND evaluated_at >= $3`,
		orgID, flagKey, since,
	).Scan(&p50, &p95, &p99)
	return p50, p95, p99, err
}

// GetEvaluationVolume returns time series data of evaluation counts
// bucketed by the specified interval. interval is a PostgreSQL interval
// string (e.g., "1 hour", "15 minutes").
func (s *Store) GetEvaluationVolume(ctx context.Context, orgID string, since time.Time, interval string) ([]domain.TimeSeriesPoint, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT
			date_trunc($3, evaluated_at) AS bucket,
			COUNT(*) AS eval_count
		 FROM eval_events
		 WHERE org_id = $1 AND evaluated_at >= $2
		 GROUP BY bucket
		 ORDER BY bucket ASC`,
		orgID, since, interval,
	)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var points []domain.TimeSeriesPoint
	for rows.Next() {
		var pt domain.TimeSeriesPoint
		if err := rows.Scan(&pt.Timestamp, &pt.Value); err != nil {
			return nil, err
		}
		points = append(points, pt)
	}
	return points, rows.Err()
}
