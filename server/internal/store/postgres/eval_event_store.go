package postgres

import (
	"context"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── EvalEventWriter (no-op — ClickHouse handles analytics) ────────────────

// InsertEvalEvent is a no-op. Evaluation events are written directly to
// ClickHouse when configured. See CLICKHOUSE_SCHEMA.md §7 for deployment.
func (s *Store) InsertEvalEvent(ctx context.Context, event *domain.EvalEvent) error {
	// ClickHouse not yet connected — event silently dropped.
	// TODO: Wire ClickHouse writer when CLICKHOUSE_ENABLED=true.
	return nil
}

// InsertEvalEventBatch is a no-op. See InsertEvalEvent for rationale.
func (s *Store) InsertEvalEventBatch(ctx context.Context, batch *domain.EvalEventBatch) error {
	// ClickHouse not yet connected — batch silently dropped.
	return nil
}

// ─── EvalEventReader (no-op — ClickHouse handles analytics) ────────────────

// CountEvaluations returns 0. Analytics are provided by ClickHouse
// materialized views when configured. See CLICKHOUSE_SCHEMA.md §3.
func (s *Store) CountEvaluations(ctx context.Context, orgID, flagKey string, since time.Time) (int64, error) {
	return 0, nil
}

// CountEvaluationsByVariant returns an empty map. See CountEvaluations.
func (s *Store) CountEvaluationsByVariant(ctx context.Context, orgID, flagKey string, since time.Time) (map[string]int64, error) {
	return map[string]int64{}, nil
}

// GetEvaluationLatency returns zeros. See CountEvaluations.
func (s *Store) GetEvaluationLatency(ctx context.Context, orgID, flagKey string, since time.Time) (p50, p95, p99 int64, err error) {
	return 0, 0, 0, nil
}

// GetEvaluationVolume returns an empty slice. See CountEvaluations.
func (s *Store) GetEvaluationVolume(ctx context.Context, orgID string, since time.Time, interval string) ([]domain.TimeSeriesPoint, error) {
	return []domain.TimeSeriesPoint{}, nil
}
