// Package clickhouse provides a ClickHouse-backed store adapter for
// evaluation event analytics. It implements domain.EvalEventReader and
// domain.EvalEventWriter, enabling FeatureSignals to handle high-volume
// evaluation event storage and querying (>10,000 events/s).
//
// This is a SKELETON implementation. The core interface contracts,
// error handling, structured logging, and context propagation are all
// wired correctly. The actual ClickHouse driver connection is stubbed
// with a commented placeholder — uncomment and import the driver when
// the ClickHouse infrastructure is provisioned.
//
// Schema: server/internal/migrate/clickhouse/001_eval_events.sql
// PRS Requirements: FS-S0-DATA-010 through FS-S0-DATA-015
package clickhouse

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ClickHouseConfig holds the connection parameters for a ClickHouse cluster.
type ClickHouseConfig struct {
	// Addrs is a list of ClickHouse node addresses (host:port).
	Addrs []string

	// Database is the ClickHouse database name.
	Database string

	// Username for authentication.
	Username string

	// Password for authentication.
	Password string

	// MaxOpenConns limits the number of open connections.
	MaxOpenConns int

	// DialTimeout is the connection timeout.
	DialTimeout time.Duration

	// QueryTimeout is the per-query timeout.
	QueryTimeout time.Duration
}

// ClickHouseEvalEventStore implements both domain.EvalEventReader and
// domain.EvalEventWriter for ClickHouse-backed analytics storage.
//
// It is safe for concurrent use. All methods accept context.Context
// and respect cancellation. Errors are wrapped with domain sentinels
// where applicable and logged with structured slog entries.
type ClickHouseEvalEventStore struct {
	cfg    ClickHouseConfig
	logger *slog.Logger
	// conn is the ClickHouse database/sql connection pool.
	// Uncomment and wire when the driver is available:
	// conn *sql.DB
}

// compile-time interface compliance check
var (
	_ domain.EvalEventReader = (*ClickHouseEvalEventStore)(nil)
	_ domain.EvalEventWriter = (*ClickHouseEvalEventStore)(nil)
)

// NewClickHouseEvalEventStore creates a new ClickHouse-backed eval event
// store. It validates the config and returns an error if required fields
// are missing. The actual connection is deferred until Connect() is called.
func NewClickHouseEvalEventStore(cfg ClickHouseConfig, logger *slog.Logger) (*ClickHouseEvalEventStore, error) {
	if len(cfg.Addrs) == 0 {
		return nil, fmt.Errorf("clickhouse: at least one address is required")
	}
	if cfg.Database == "" {
		return nil, fmt.Errorf("clickhouse: database name is required")
	}
	if cfg.DialTimeout == 0 {
		cfg.DialTimeout = 10 * time.Second
	}
	if cfg.QueryTimeout == 0 {
		cfg.QueryTimeout = 30 * time.Second
	}
	if cfg.MaxOpenConns == 0 {
		cfg.MaxOpenConns = 10
	}

	store := &ClickHouseEvalEventStore{
		cfg:    cfg,
		logger: logger.With("component", "clickhouse_eval_events"),
	}

	store.logger.Info("clickhouse eval event store created",
		"addrs", cfg.Addrs,
		"database", cfg.Database,
		"max_open_conns", cfg.MaxOpenConns,
	)

	return store, nil
}

// Connect establishes the ClickHouse connection pool. This is separated
// from construction so the store can be created and passed as a dependency
// before the ClickHouse cluster is reachable (graceful degradation).
//
// Uncomment the driver import and connection code when ready:
//
//	import (
//	    "database/sql"
//	    _ "github.com/ClickHouse/clickhouse-go/v2"
//	)
//
//	func (s *ClickHouseEvalEventStore) Connect(ctx context.Context) error {
//	    conn, err := sql.Open("clickhouse", s.buildDSN())
//	    if err != nil {
//	        return fmt.Errorf("clickhouse connect: %w", err)
//	    }
//	    conn.SetMaxOpenConns(s.cfg.MaxOpenConns)
//	    if err := conn.PingContext(ctx); err != nil {
//	        return fmt.Errorf("clickhouse ping: %w", err)
//	    }
//	    s.conn = conn
//	    s.logger.Info("clickhouse connection established")
//	    return nil
//	}
func (s *ClickHouseEvalEventStore) Connect(ctx context.Context) error {
	s.logger.Warn("clickhouse Connect() is a no-op — driver not yet wired")
	return nil
}

// buildDSN constructs a ClickHouse DSN from the config.
// Uncomment when the driver is available.
//
//	func (s *ClickHouseEvalEventStore) buildDSN() string {
//	    return fmt.Sprintf("clickhouse://%s:%s@%s/%s?dial_timeout=%s",
//	        s.cfg.Username, s.cfg.Password,
//	        strings.Join(s.cfg.Addrs, ","),
//	        s.cfg.Database,
//	        s.cfg.DialTimeout.String(),
//	    )
//	}

// ─── EvalEventWriter ───────────────────────────────────────────────────────

// InsertEvalEvent persists a single evaluation event to ClickHouse.
// The event is written to the eval_events table (see migration
// 001_eval_events.sql). This is a SKELETON — the actual INSERT
// is commented out until the ClickHouse driver is wired.
//
// Performance target: < 10ms per insert (async batching preferred).
func (s *ClickHouseEvalEventStore) InsertEvalEvent(ctx context.Context, event *domain.EvalEvent) error {
	if event == nil {
		return fmt.Errorf("clickhouse InsertEvalEvent: %w", domain.ErrValidation)
	}

	logger := s.logger.With("method", "InsertEvalEvent",
		"org_id", event.OrgID,
		"flag_key", event.FlagKey,
		"eval_id", event.ID,
	)

	// TODO: Wire ClickHouse INSERT when driver is available.
	//
	// query := `
	//     INSERT INTO eval_events (
	//         org_id, project_id, environment_id, flag_key, flag_id,
	//         variant, value, reason, rule_id,
	//         user_key_hash, sdk_name, sdk_version, sdk_mode,
	//         latency_us, cache_hit,
	//         attributes, segment_keys,
	//         evaluated_at, ingested_at
	//     ) VALUES (
	//         $1, $2, $3, $4, $5,
	//         $6, $7, $8, $9,
	//         $10, $11, $12, $13,
	//         $14, $15,
	//         $16, $17,
	//         $18, $19
	//     )
	// `
	// _, err := s.conn.ExecContext(ctx, query,
	//     event.OrgID, event.ProjectID, event.EnvironmentID,
	//     event.FlagKey, event.FlagID,
	//     event.Variant, event.Value, event.Reason, event.RuleID,
	//     event.UserKeyHash, extractSDKName(event.SDK), extractSDKVersion(event.SDK), event.SDKMode,
	//     event.LatencyUs, boolToUint8(event.CacheHit),
	//     string(event.Attributes), event.SegmentKeys,
	//     event.EvaluatedAt, time.Now(),
	// )
	// if err != nil {
	//     logger.Error("failed to insert eval event", "error", err)
	//     return fmt.Errorf("clickhouse InsertEvalEvent: %w", err)
	// }

	logger.Debug("eval event insert (no-op — clickhouse driver not wired)")
	return nil
}

// InsertEvalEventBatch persists a batch of evaluation events using a
// single ClickHouse INSERT. Batching reduces round-trips and improves
// throughput for high-volume ingestion.
//
// Performance target: < 50ms per batch of 100 events.
func (s *ClickHouseEvalEventStore) InsertEvalEventBatch(ctx context.Context, batch *domain.EvalEventBatch) error {
	if batch == nil {
		return fmt.Errorf("clickhouse InsertEvalEventBatch: %w", domain.ErrValidation)
	}

	logger := s.logger.With("method", "InsertEvalEventBatch",
		"org_id", batch.OrgID,
		"batch_id", batch.ID,
		"batch_size", batch.BatchSize,
		"sampled_rate", batch.SampledRate,
	)

	// TODO: Wire ClickHouse batch INSERT when driver is available.
	// Use a prepared statement with a transaction for batch inserts:
	//
	// tx, err := s.conn.BeginTx(ctx, nil)
	// if err != nil {
	//     return fmt.Errorf("clickhouse InsertEvalEventBatch begin: %w", err)
	// }
	// defer tx.Rollback()
	//
	// stmt, err := tx.PrepareContext(ctx, `
	//     INSERT INTO eval_events (...) VALUES ($1, $2, ...)
	// `)
	// if err != nil {
	//     return fmt.Errorf("clickhouse InsertEvalEventBatch prepare: %w", err)
	// }
	// defer stmt.Close()
	//
	// for _, event := range batch.Events {
	//     _, err := stmt.ExecContext(ctx, ...)
	//     if err != nil {
	//         return fmt.Errorf("clickhouse InsertEvalEventBatch exec: %w", err)
	//     }
	// }
	//
	// if err := tx.Commit(); err != nil {
	//     return fmt.Errorf("clickhouse InsertEvalEventBatch commit: %w", err)
	// }

	logger.Debug("eval event batch insert (no-op — clickhouse driver not wired)")
	return nil
}

// ─── EvalEventReader ───────────────────────────────────────────────────────

// CountEvaluations returns the number of evaluations for a given flag
// since the specified time. Queries the eval_counts_hourly materialized
// view for efficient aggregation.
func (s *ClickHouseEvalEventStore) CountEvaluations(ctx context.Context, orgID, flagKey string, since time.Time) (int64, error) {
	logger := s.logger.With("method", "CountEvaluations",
		"org_id", orgID,
		"flag_key", flagKey,
		"since", since,
	)

	// TODO: Wire ClickHouse SELECT when driver is available.
	//
	// query := `
	//     SELECT COALESCE(sum(eval_count), 0)
	//     FROM eval_counts_hourly
	//     WHERE org_id = $1
	//       AND flag_key = $2
	//       AND hour >= $3
	// `
	// var count int64
	// err := s.conn.QueryRowContext(ctx, query, orgID, flagKey, since).Scan(&count)
	// if err != nil {
	//     logger.Error("failed to count evaluations", "error", err)
	//     return 0, fmt.Errorf("clickhouse CountEvaluations: %w", err)
	// }

	logger.Debug("count evaluations (no-op — clickhouse driver not wired)")
	return 0, nil
}

// CountEvaluationsByVariant returns evaluation counts grouped by variant
// for a given flag since the specified time. Queries the eval_variants_hourly
// materialized view.
func (s *ClickHouseEvalEventStore) CountEvaluationsByVariant(ctx context.Context, orgID, flagKey string, since time.Time) (map[string]int64, error) {
	logger := s.logger.With("method", "CountEvaluationsByVariant",
		"org_id", orgID,
		"flag_key", flagKey,
		"since", since,
	)

	// TODO: Wire ClickHouse SELECT when driver is available.
	//
	// query := `
	//     SELECT variant, sum(variant_count) AS total
	//     FROM eval_variants_hourly
	//     WHERE org_id = $1
	//       AND flag_key = $2
	//       AND hour >= $3
	//     GROUP BY variant
	// `
	// rows, err := s.conn.QueryContext(ctx, query, orgID, flagKey, since)
	// if err != nil {
	//     logger.Error("failed to count evaluations by variant", "error", err)
	//     return nil, fmt.Errorf("clickhouse CountEvaluationsByVariant: %w", err)
	// }
	// defer rows.Close()
	//
	// result := make(map[string]int64)
	// for rows.Next() {
	//     var variant string
	//     var count int64
	//     if err := rows.Scan(&variant, &count); err != nil {
	//         return nil, fmt.Errorf("clickhouse CountEvaluationsByVariant scan: %w", err)
	//     }
	//     result[variant] = count
	// }
	// if err := rows.Err(); err != nil {
	//     return nil, fmt.Errorf("clickhouse CountEvaluationsByVariant rows: %w", err)
	// }

	logger.Debug("count evaluations by variant (no-op — clickhouse driver not wired)")
	return map[string]int64{}, nil
}

// GetEvaluationLatency returns p50, p95, and p99 latency percentiles in
// microseconds for a given flag since the specified time. Queries the
// eval_counts_hourly materialized view for pre-aggregated percentiles.
func (s *ClickHouseEvalEventStore) GetEvaluationLatency(ctx context.Context, orgID, flagKey string, since time.Time) (p50, p95, p99 int64, err error) {
	logger := s.logger.With("method", "GetEvaluationLatency",
		"org_id", orgID,
		"flag_key", flagKey,
		"since", since,
	)

	// TODO: Wire ClickHouse SELECT when driver is available.
	//
	// query := `
	//     SELECT
	//         COALESCE(avg(p50_latency_us), 0)::Int64,
	//         COALESCE(max(p95_latency_us), 0)::Int64,
	//         COALESCE(max(p99_latency_us), 0)::Int64
	//     FROM eval_counts_hourly
	//     WHERE org_id = $1
	//       AND flag_key = $2
	//       AND hour >= $3
	// `
	// err := s.conn.QueryRowContext(ctx, query, orgID, flagKey, since).Scan(&p50, &p95, &p99)
	// if err != nil {
	//     logger.Error("failed to get evaluation latency", "error", err)
	//     return 0, 0, 0, fmt.Errorf("clickhouse GetEvaluationLatency: %w", err)
	// }

	logger.Debug("get evaluation latency (no-op — clickhouse driver not wired)")
	return 0, 0, 0, nil
}

// GetEvaluationVolume returns a time series of evaluation counts for an
// organization. The interval parameter controls bucketing: "hour" queries
// eval_counts_hourly, "day" queries eval_counts_daily.
func (s *ClickHouseEvalEventStore) GetEvaluationVolume(ctx context.Context, orgID string, since time.Time, interval string) ([]domain.TimeSeriesPoint, error) {
	logger := s.logger.With("method", "GetEvaluationVolume",
		"org_id", orgID,
		"since", since,
		"interval", interval,
	)

	// Determine which materialized view to query based on interval.
	table := "eval_counts_hourly"
	timeColumn := "hour"
	if interval == "day" {
		table = "eval_counts_daily"
		timeColumn = "day"
	}

	_ = table
	_ = timeColumn

	// TODO: Wire ClickHouse SELECT when driver is available.
	//
	// query := fmt.Sprintf(`
	//     SELECT %s AS ts, sum(eval_count) AS cnt
	//     FROM %s
	//     WHERE org_id = $1
	//       AND %s >= $2
	//     GROUP BY ts
	//     ORDER BY ts
	// `, timeColumn, table, timeColumn)
	//
	// rows, err := s.conn.QueryContext(ctx, query, orgID, since)
	// if err != nil {
	//     logger.Error("failed to get evaluation volume", "error", err)
	//     return nil, fmt.Errorf("clickhouse GetEvaluationVolume: %w", err)
	// }
	// defer rows.Close()
	//
	// var points []domain.TimeSeriesPoint
	// for rows.Next() {
	//     var p domain.TimeSeriesPoint
	//     if err := rows.Scan(&p.Timestamp, &p.Value); err != nil {
	//         return nil, fmt.Errorf("clickhouse GetEvaluationVolume scan: %w", err)
	//     }
	//     points = append(points, p)
	// }
	// if err := rows.Err(); err != nil {
	//     return nil, fmt.Errorf("clickhouse GetEvaluationVolume rows: %w", err)
	// }

	logger.Debug("get evaluation volume (no-op — clickhouse driver not wired)")
	return []domain.TimeSeriesPoint{}, nil
}
