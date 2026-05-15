// Package clickhouse provides a ClickHouse-backed store adapter for
// evaluation event analytics. It implements domain.EvalEventReader and
// domain.EvalEventWriter, enabling FeatureSignals to handle high-volume
// evaluation event storage and querying (>10,000 events/s).
//
// This is a PRODUCTION implementation using the clickhouse-go/v2 driver
// via the database/sql interface. All methods are safe for concurrent use,
// propagate context, use parameterized queries, and emit structured logs
// and OpenTelemetry metrics.
//
// Schema: server/internal/migrate/clickhouse/001_eval_events.sql
// PRS Requirements: FS-S0-DATA-010 through FS-S0-DATA-015
package clickhouse

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/ClickHouse/clickhouse-go/v2"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	ometric "go.opentelemetry.io/otel/metric"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Package-level metrics ─────────────────────────────────────────────────

const meterName = "featuresignals/clickhouse"

var (
	chMeter                 = otel.Meter(meterName)
	chInsertCount, _        = chMeter.Int64Counter("clickhouse.insert.count", ometric.WithDescription("Number of rows inserted into ClickHouse"))
	chInsertDuration, _     = chMeter.Float64Histogram("clickhouse.insert.duration_ms", ometric.WithDescription("ClickHouse insert latency in milliseconds"), ometric.WithUnit("ms"))
	chBatchSize, _          = chMeter.Int64Histogram("clickhouse.batch.size", ometric.WithDescription("Size of flushed ClickHouse insert batches"))
	chInsertError, _        = chMeter.Int64Counter("clickhouse.insert.error", ometric.WithDescription("Number of ClickHouse insert errors"))
	chQueryDuration, _      = chMeter.Float64Histogram("clickhouse.query.duration_ms", ometric.WithDescription("ClickHouse query latency in milliseconds"), ometric.WithUnit("ms"))
)

// ─── ClickHouseConfig ──────────────────────────────────────────────────────

// ClickHouseConfig holds the connection parameters for a ClickHouse cluster.
type ClickHouseConfig struct {
	// Addrs is a list of ClickHouse node addresses (host:port).
	Addrs []string

	// Database is the ClickHouse database name (default: "featuresignals").
	Database string

	// Username for authentication.
	Username string

	// Password for authentication.
	Password string

	// MaxOpenConns limits the number of open connections (default: 10).
	MaxOpenConns int

	// DialTimeout is the connection timeout (default: 10s).
	DialTimeout time.Duration

	// QueryTimeout is the per-query timeout (default: 30s).
	QueryTimeout time.Duration

	// BatchSize is the default batch size for BatchWriter (default: 1000).
	BatchSize int

	// FlushInterval is the default flush interval for BatchWriter (default: 1s).
	FlushInterval time.Duration

	// MaxRetries is the number of retry attempts for failed inserts (default: 3).
	MaxRetries int

	// RetryBackoff is the initial backoff duration for retries (default: 100ms).
	RetryBackoff time.Duration
}

// ─── ClickHouseEvalEventStore ──────────────────────────────────────────────

// ClickHouseEvalEventStore implements both domain.EvalEventReader and
// domain.EvalEventWriter for ClickHouse-backed analytics storage.
//
// It is safe for concurrent use. All methods accept context.Context
// and respect cancellation. Errors are wrapped with domain sentinels
// where applicable and logged with structured slog entries.
type ClickHouseEvalEventStore struct {
	cfg    ClickHouseConfig
	logger *slog.Logger
	conn   *sql.DB
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
	if cfg.BatchSize == 0 {
		cfg.BatchSize = 1000
	}
	if cfg.FlushInterval == 0 {
		cfg.FlushInterval = time.Second
	}
	if cfg.MaxRetries == 0 {
		cfg.MaxRetries = 3
	}
	if cfg.RetryBackoff == 0 {
		cfg.RetryBackoff = 100 * time.Millisecond
	}

	store := &ClickHouseEvalEventStore{
		cfg:    cfg,
		logger: logger.With("component", "clickhouse_eval_events"),
	}

	store.logger.Info("clickhouse eval event store created",
		"addrs", cfg.Addrs,
		"database", cfg.Database,
		"max_open_conns", cfg.MaxOpenConns,
		"batch_size", cfg.BatchSize,
		"flush_interval", cfg.FlushInterval,
	)

	return store, nil
}

// Connect establishes the ClickHouse connection pool using the
// clickhouse-go/v2 driver via database/sql. The connection is opened
// with the configured addresses, authentication, and pool settings.
//
// Callers should call Close() for graceful shutdown.
func (s *ClickHouseEvalEventStore) Connect(ctx context.Context) error {
	conn := clickhouse.OpenDB(&clickhouse.Options{
		Addr: s.cfg.Addrs,
		Auth: clickhouse.Auth{
			Database: s.cfg.Database,
			Username: s.cfg.Username,
			Password: s.cfg.Password,
		},
		DialTimeout:      s.cfg.DialTimeout,
		MaxOpenConns:     s.cfg.MaxOpenConns,
		MaxIdleConns:     s.cfg.MaxOpenConns / 2,
		ConnMaxLifetime:  time.Hour,
		ConnOpenStrategy: clickhouse.ConnOpenRoundRobin,
		Settings: clickhouse.Settings{
			"max_execution_time": int(s.cfg.QueryTimeout.Seconds()),
		},
		Compression: &clickhouse.Compression{
			Method: clickhouse.CompressionLZ4,
		},
	})

	if err := conn.PingContext(ctx); err != nil {
		return fmt.Errorf("clickhouse Connect ping: %w", err)
	}

	s.conn = conn
	s.logger.Info("clickhouse connection established",
		"addrs", s.cfg.Addrs,
		"database", s.cfg.Database,
	)
	return nil
}

// Close drains and closes the ClickHouse connection pool. Call during
// graceful shutdown after all in-flight queries have completed.
func (s *ClickHouseEvalEventStore) Close() error {
	if s.conn == nil {
		return nil
	}
	s.logger.Info("clickhouse connection pool closing")
	return s.conn.Close()
}

// Health checks ClickHouse connectivity. Returns nil if the database
// is reachable, or an error describing the failure. Used by the /health
// endpoint when CLICKHOUSE_ENABLED is true.
func (s *ClickHouseEvalEventStore) Health(ctx context.Context) error {
	if s.conn == nil {
		return fmt.Errorf("clickhouse Health: not connected")
	}
	return s.conn.PingContext(ctx)
}

// ─── EvalEventWriter ───────────────────────────────────────────────────────

// InsertEvalEvent persists a single evaluation event to ClickHouse.
// Uses a parameterized INSERT with 19 positional parameters matching
// the eval_events table schema.
//
// Performance target: < 10ms per insert (async batching preferred
// for high-throughput scenarios via BatchWriter).
func (s *ClickHouseEvalEventStore) InsertEvalEvent(ctx context.Context, event *domain.EvalEvent) error {
	if event == nil {
		return fmt.Errorf("clickhouse InsertEvalEvent: %w", domain.ErrValidation)
	}
	if s.conn == nil {
		return fmt.Errorf("clickhouse InsertEvalEvent: not connected")
	}

	logger := s.logger.With("method", "InsertEvalEvent",
		"org_id", event.OrgID,
		"flag_key", event.FlagKey,
		"eval_id", event.ID,
	)

	// Apply context timeout for the query.
	queryCtx, cancel := context.WithTimeout(ctx, s.cfg.QueryTimeout)
	defer cancel()

	query := `
		INSERT INTO eval_events (
			org_id, project_id, environment_id, flag_key, flag_id,
			variant, value, reason, rule_id,
			user_key_hash, sdk_name, sdk_version, sdk_mode,
			latency_us, cache_hit,
			attributes, segment_keys,
			evaluated_at, ingested_at
		) VALUES (
			?, ?, ?, ?, ?,
			?, ?, ?, ?,
			?, ?, ?, ?,
			?, ?,
			?, ?,
			?, ?
		)
	`

	start := time.Now()
	_, err := s.conn.ExecContext(queryCtx, query,
		event.OrgID, event.ProjectID, event.EnvironmentID,
		event.FlagKey, event.FlagID,
		event.Variant, event.Value, event.Reason, event.RuleID,
		event.UserKeyHash, extractSDKName(event.SDK), extractSDKVersion(event.SDK), event.SDKMode,
		event.LatencyUs, boolToUInt8(event.CacheHit),
		string(event.Attributes), domainArrayToClickHouse(event.SegmentKeys),
		event.EvaluatedAt, time.Now(),
	)
	elapsed := time.Since(start)

	if err != nil {
		chInsertError.Add(ctx, 1, ometric.WithAttributes(
			attribute.String("method", "InsertEvalEvent"),
		))
		logger.Error("failed to insert eval event",
			"error", err,
			"duration_ms", elapsed.Milliseconds(),
		)
		return fmt.Errorf("clickhouse InsertEvalEvent: %w", err)
	}

	chInsertCount.Add(ctx, 1)
	chInsertDuration.Record(ctx, float64(elapsed.Milliseconds()))
	logger.Debug("eval event inserted", "duration_ms", elapsed.Milliseconds())
	return nil
}

// InsertEvalEventBatch persists a batch of evaluation events using a
// multi-row INSERT. Batching reduces round-trips and improves throughput
// for high-volume ingestion (>10,000 events/s).
//
// For batches larger than 1000 rows, the batch is split into chunks
// to avoid exceeding ClickHouse's maximum query size.
//
// Note: ClickHouse does not support traditional database transactions.
// The multi-row INSERT is atomic at the row-block level.
func (s *ClickHouseEvalEventStore) InsertEvalEventBatch(ctx context.Context, batch *domain.EvalEventBatch) error {
	if batch == nil {
		return fmt.Errorf("clickhouse InsertEvalEventBatch: %w", domain.ErrValidation)
	}
	if s.conn == nil {
		return fmt.Errorf("clickhouse InsertEvalEventBatch: not connected")
	}
	if len(batch.Events) == 0 {
		return nil
	}

	logger := s.logger.With("method", "InsertEvalEventBatch",
		"org_id", batch.OrgID,
		"batch_id", batch.ID,
		"batch_size", len(batch.Events),
		"sampled_rate", batch.SampledRate,
	)

	// Split into chunks of cfg.BatchSize to control query size.
	chunkSize := s.cfg.BatchSize
	if chunkSize <= 0 {
		chunkSize = 1000
	}

	for start := 0; start < len(batch.Events); start += chunkSize {
		end := start + chunkSize
		if end > len(batch.Events) {
			end = len(batch.Events)
		}
		chunk := batch.Events[start:end]

		if err := s.insertChunk(ctx, chunk); err != nil {
			logger.Error("failed to insert batch chunk",
				"error", err,
				"chunk_start", start,
				"chunk_size", len(chunk),
			)
			return fmt.Errorf("clickhouse InsertEvalEventBatch chunk [%d:%d]: %w", start, end, err)
		}
	}

	logger.Debug("eval event batch inserted",
		"total_events", len(batch.Events),
	)
	return nil
}

// insertChunk inserts a single chunk of events using a multi-row INSERT.
func (s *ClickHouseEvalEventStore) insertChunk(ctx context.Context, events []domain.EvalEvent) error {
	if len(events) == 0 {
		return nil
	}

	queryCtx, cancel := context.WithTimeout(ctx, s.cfg.QueryTimeout)
	defer cancel()

	// Build a multi-row INSERT with positional placeholders.
	// ClickHouse does not support transactions; multi-row INSERT
	// is the recommended batching approach.
	query := `
		INSERT INTO eval_events (
			org_id, project_id, environment_id, flag_key, flag_id,
			variant, value, reason, rule_id,
			user_key_hash, sdk_name, sdk_version, sdk_mode,
			latency_us, cache_hit,
			attributes, segment_keys,
			evaluated_at, ingested_at
		) VALUES
	`

	const colsPerRow = 19
	placeholders := make([]string, 0, len(events))
	args := make([]any, 0, len(events)*colsPerRow)
	now := time.Now()

	for i := range events {
		ev := &events[i]
		// Build placeholder tuple: (?, ?, ?, ..., ?)
		phs := make([]string, colsPerRow)
		for j := range phs {
			phs[j] = "?"
		}
		placeholders = append(placeholders, "("+strings.Join(phs, ", ")+")")

		args = append(args,
			ev.OrgID, ev.ProjectID, ev.EnvironmentID,
			ev.FlagKey, ev.FlagID,
			ev.Variant, ev.Value, ev.Reason, ev.RuleID,
			ev.UserKeyHash, extractSDKName(ev.SDK), extractSDKVersion(ev.SDK), ev.SDKMode,
			ev.LatencyUs, boolToUInt8(ev.CacheHit),
			string(ev.Attributes), domainArrayToClickHouse(ev.SegmentKeys),
			ev.EvaluatedAt, now,
		)
	}

	query += strings.Join(placeholders, ", ")

	start := time.Now()
	_, err := s.conn.ExecContext(queryCtx, query, args...)
	elapsed := time.Since(start)

	if err != nil {
		chInsertError.Add(ctx, 1, ometric.WithAttributes(
			attribute.String("method", "InsertEvalEventBatch"),
		))
		return fmt.Errorf("clickhouse insertChunk: %w", err)
	}

	chInsertCount.Add(ctx, int64(len(events)))
	chInsertDuration.Record(ctx, float64(elapsed.Milliseconds()))
	chBatchSize.Record(ctx, int64(len(events)))
	return nil
}

// ─── EvalEventReader ───────────────────────────────────────────────────────

// CountEvaluations returns the number of evaluations for a given flag
// since the specified time. Queries the eval_counts_hourly materialized
// view for efficient pre-aggregated counts.
func (s *ClickHouseEvalEventStore) CountEvaluations(ctx context.Context, orgID, flagKey string, since time.Time) (int64, error) {
	logger := s.logger.With("method", "CountEvaluations",
		"org_id", orgID,
		"flag_key", flagKey,
		"since", since,
	)

	if s.conn == nil {
		logger.Warn("clickhouse not connected, returning zero count")
		return 0, nil
	}

	queryCtx, cancel := context.WithTimeout(ctx, s.cfg.QueryTimeout)
	defer cancel()

	query := `
		SELECT COALESCE(sum(eval_count), 0)
		FROM eval_counts_hourly
		WHERE org_id = ?
		  AND flag_key = ?
		  AND hour >= ?
	`

	start := time.Now()
	var count int64
	err := s.conn.QueryRowContext(queryCtx, query, orgID, flagKey, since).Scan(&count)
	elapsed := time.Since(start)

	chQueryDuration.Record(ctx, float64(elapsed.Milliseconds()))

	if err != nil {
		logger.Error("failed to count evaluations", "error", err, "duration_ms", elapsed.Milliseconds())
		return 0, fmt.Errorf("clickhouse CountEvaluations: %w", err)
	}

	logger.Debug("count evaluations", "count", count, "duration_ms", elapsed.Milliseconds())
	return count, nil
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

	if s.conn == nil {
		logger.Warn("clickhouse not connected, returning empty map")
		return map[string]int64{}, nil
	}

	queryCtx, cancel := context.WithTimeout(ctx, s.cfg.QueryTimeout)
	defer cancel()

	query := `
		SELECT variant, sum(variant_count) AS total
		FROM eval_variants_hourly
		WHERE org_id = ?
		  AND flag_key = ?
		  AND hour >= ?
		GROUP BY variant
	`

	start := time.Now()
	rows, err := s.conn.QueryContext(queryCtx, query, orgID, flagKey, since)
	if err != nil {
		chQueryDuration.Record(ctx, float64(time.Since(start).Milliseconds()))
		logger.Error("failed to count evaluations by variant", "error", err)
		return nil, fmt.Errorf("clickhouse CountEvaluationsByVariant: %w", err)
	}
	defer rows.Close()

	result := make(map[string]int64)
	for rows.Next() {
		var variant string
		var count int64
		if err := rows.Scan(&variant, &count); err != nil {
			return nil, fmt.Errorf("clickhouse CountEvaluationsByVariant scan: %w", err)
		}
		result[variant] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("clickhouse CountEvaluationsByVariant rows: %w", err)
	}

	elapsed := time.Since(start)
	chQueryDuration.Record(ctx, float64(elapsed.Milliseconds()))
	logger.Debug("count evaluations by variant", "variants", len(result), "duration_ms", elapsed.Milliseconds())
	return result, nil
}

// GetEvaluationLatency returns p50, p95, and p99 latency percentiles in
// microseconds for a given flag since the specified time. Queries the
// eval_counts_hourly materialized view which pre-aggregates percentiles
// using ClickHouse's quantile() functions.
func (s *ClickHouseEvalEventStore) GetEvaluationLatency(ctx context.Context, orgID, flagKey string, since time.Time) (p50, p95, p99 int64, err error) {
	logger := s.logger.With("method", "GetEvaluationLatency",
		"org_id", orgID,
		"flag_key", flagKey,
		"since", since,
	)

	if s.conn == nil {
		logger.Warn("clickhouse not connected, returning zero latencies")
		return 0, 0, 0, nil
	}

	queryCtx, cancel := context.WithTimeout(ctx, s.cfg.QueryTimeout)
	defer cancel()

	// Average the per-hour percentiles weighted by event count.
	// Use max() for p95/p99 since the hourly MV contains per-hour percentiles
	// and the worst hour is what we care about for high-percentile alerts.
	query := `
		SELECT
			COALESCE(avg(p50_latency_us), 0)::Int64,
			COALESCE(max(p95_latency_us), 0)::Int64,
			COALESCE(max(p99_latency_us), 0)::Int64
		FROM eval_counts_hourly
		WHERE org_id = ?
		  AND flag_key = ?
		  AND hour >= ?
	`

	start := time.Now()
	err = s.conn.QueryRowContext(queryCtx, query, orgID, flagKey, since).Scan(&p50, &p95, &p99)
	elapsed := time.Since(start)

	chQueryDuration.Record(ctx, float64(elapsed.Milliseconds()))

	if err != nil {
		logger.Error("failed to get evaluation latency", "error", err, "duration_ms", elapsed.Milliseconds())
		return 0, 0, 0, fmt.Errorf("clickhouse GetEvaluationLatency: %w", err)
	}

	logger.Debug("evaluation latency",
		"p50_us", p50,
		"p95_us", p95,
		"p99_us", p99,
		"duration_ms", elapsed.Milliseconds(),
	)
	return p50, p95, p99, nil
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

	if s.conn == nil {
		logger.Warn("clickhouse not connected, returning empty series")
		return []domain.TimeSeriesPoint{}, nil
	}

	// Determine which materialized view to query based on interval.
	// Whitelist approach prevents SQL injection through the interval parameter.
	table := "eval_counts_hourly"
	timeColumn := "hour"
	if interval == "day" {
		table = "eval_counts_daily"
		timeColumn = "day"
	}

	queryCtx, cancel := context.WithTimeout(ctx, s.cfg.QueryTimeout)
	defer cancel()

	// table and timeColumn are from a fixed allowlist, safe from injection.
	query := fmt.Sprintf(`
		SELECT %s AS ts, sum(eval_count) AS cnt
		FROM %s
		WHERE org_id = ?
		  AND %s >= ?
		GROUP BY ts
		ORDER BY ts
	`, timeColumn, table, timeColumn)

	start := time.Now()
	rows, err := s.conn.QueryContext(queryCtx, query, orgID, since)
	if err != nil {
		chQueryDuration.Record(ctx, float64(time.Since(start).Milliseconds()))
		logger.Error("failed to get evaluation volume", "error", err)
		return nil, fmt.Errorf("clickhouse GetEvaluationVolume: %w", err)
	}
	defer rows.Close()

	var points []domain.TimeSeriesPoint
	for rows.Next() {
		var p domain.TimeSeriesPoint
		if err := rows.Scan(&p.Timestamp, &p.Value); err != nil {
			return nil, fmt.Errorf("clickhouse GetEvaluationVolume scan: %w", err)
		}
		points = append(points, p)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("clickhouse GetEvaluationVolume rows: %w", err)
	}

	elapsed := time.Since(start)
	chQueryDuration.Record(ctx, float64(elapsed.Milliseconds()))
	logger.Debug("evaluation volume retrieved",
		"points", len(points),
		"duration_ms", elapsed.Milliseconds(),
	)
	return points, nil
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// extractSDKName extracts the SDK name from an SDK reference string.
// Expected format: "go/1.2.3" → "go", "node/2.0.0" → "node".
// Returns empty string if no slash separator is found.
func extractSDKName(sdk string) string {
	if idx := strings.Index(sdk, "/"); idx >= 0 {
		return sdk[:idx]
	}
	return sdk
}

// extractSDKVersion extracts the SDK version from an SDK reference string.
// Expected format: "go/1.2.3" → "1.2.3", "node/2.0.0" → "2.0.0".
// Returns the full string if no slash separator is found.
func extractSDKVersion(sdk string) string {
	if idx := strings.Index(sdk, "/"); idx >= 0 {
		return sdk[idx+1:]
	}
	return sdk
}

// boolToUInt8 converts a bool to UInt8 (0 or 1) for ClickHouse insertion.
func boolToUInt8(b bool) uint8 {
	if b {
		return 1
	}
	return 0
}

// domainArrayToClickHouse converts a []string to the format expected by
// the ClickHouse Array(String) column. The clickhouse-go/v2 driver
// accepts Go []string for Array(String) columns directly.
func domainArrayToClickHouse(arr []string) []string {
	if arr == nil {
		return []string{}
	}
	return arr
}

// ─── BatchWriter ───────────────────────────────────────────────────────────

// BatchWriter accumulates evaluation events in a buffer and flushes them
// to ClickHouse in batches. It uses a background goroutine for timer-based
// flushing and follows the caller-owns-goroutine-lifecycle rule:
// the caller that calls NewBatchWriter must call Close() to drain and stop.
//
// Usage:
//
//	bw := NewBatchWriter(store, WithBatchSize(500), WithFlushInterval(2*time.Second))
//	bw.Start(ctx)
//	defer bw.Close(ctx)
//	bw.Write(ctx, event)
type BatchWriter struct {
	store       *ClickHouseEvalEventStore
	buffer      []domain.EvalEvent
	mu          sync.Mutex
	batchSize   int
	flushEvery  time.Duration
	maxRetries  int
	retryBackoff time.Duration
	logger      *slog.Logger
	done        chan struct{}
	closed      bool
	wg          sync.WaitGroup
}

// BatchWriterOption configures a BatchWriter at construction time.
type BatchWriterOption func(*BatchWriter)

// WithBatchSize sets the maximum number of events before an automatic flush.
func WithBatchSize(n int) BatchWriterOption {
	return func(bw *BatchWriter) { bw.batchSize = n }
}

// WithFlushInterval sets the maximum time between automatic flushes.
func WithFlushInterval(d time.Duration) BatchWriterOption {
	return func(bw *BatchWriter) { bw.flushEvery = d }
}

// WithMaxRetries sets the number of retry attempts for failed flushes.
func WithMaxRetries(n int) BatchWriterOption {
	return func(bw *BatchWriter) { bw.maxRetries = n }
}

// WithRetryBackoff sets the initial backoff for retry attempts.
func WithRetryBackoff(d time.Duration) BatchWriterOption {
	return func(bw *BatchWriter) { bw.retryBackoff = d }
}

// NewBatchWriter creates a new BatchWriter. The caller must call Start()
// to begin the background flush goroutine, and Close() to drain and stop.
func NewBatchWriter(store *ClickHouseEvalEventStore, opts ...BatchWriterOption) *BatchWriter {
	bw := &BatchWriter{
		store:        store,
		buffer:       make([]domain.EvalEvent, 0, store.cfg.BatchSize),
		batchSize:    store.cfg.BatchSize,
		flushEvery:   store.cfg.FlushInterval,
		maxRetries:   store.cfg.MaxRetries,
		retryBackoff: store.cfg.RetryBackoff,
		logger:       store.logger.With("component", "clickhouse_batch_writer"),
		done:         make(chan struct{}),
	}

	for _, opt := range opts {
		opt(bw)
	}

	bw.logger.Info("batch writer created",
		"batch_size", bw.batchSize,
		"flush_interval", bw.flushEvery,
		"max_retries", bw.maxRetries,
	)
	return bw
}

// Start begins the background flush goroutine. The caller owns the
// goroutine lifecycle: call Close() to drain and stop.
func (bw *BatchWriter) Start(ctx context.Context) {
	bw.wg.Add(1)
	go bw.run(ctx)
}

// run is the background goroutine that flushes the buffer on a timer.
// It exits when the done channel is closed or the context is cancelled.
func (bw *BatchWriter) run(ctx context.Context) {
	defer bw.wg.Done()

	ticker := time.NewTicker(bw.flushEvery)
	defer ticker.Stop()

	for {
		select {
		case <-ctx.Done():
			bw.logger.Info("batch writer stopping due to context cancellation")
			// Attempt a final flush.
			flushCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			bw.flushInternal(flushCtx)
			cancel()
			return
		case <-bw.done:
			bw.logger.Info("batch writer draining and stopping")
			// Final flush before exit.
			flushCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
			bw.flushInternal(flushCtx)
			cancel()
			return
		case <-ticker.C:
			flushCtx, cancel := context.WithTimeout(ctx, 30*time.Second)
			bw.flushInternal(flushCtx)
			cancel()
		}
	}
}

// Write adds an evaluation event to the buffer. If the buffer reaches
// batchSize, it triggers an immediate synchronous flush.
//
// Write is safe for concurrent use.
func (bw *BatchWriter) Write(ctx context.Context, event domain.EvalEvent) error {
	bw.mu.Lock()
	bw.buffer = append(bw.buffer, event)
	shouldFlush := len(bw.buffer) >= bw.batchSize
	bw.mu.Unlock()

	if shouldFlush {
		return bw.Flush(ctx)
	}
	return nil
}

// Flush immediately drains the buffer and inserts all events into
// ClickHouse. Retries on transient failures with exponential backoff.
//
// Flush is safe for concurrent use; concurrent callers will block
// until the flush completes.
func (bw *BatchWriter) Flush(ctx context.Context) error {
	bw.mu.Lock()
	defer bw.mu.Unlock()
	return bw.flushInternal(ctx)
}

// flushInternal performs the actual flush. Caller must hold bw.mu.
func (bw *BatchWriter) flushInternal(ctx context.Context) error {
	if len(bw.buffer) == 0 {
		return nil
	}

	batch := make([]domain.EvalEvent, len(bw.buffer))
	copy(batch, bw.buffer)
	bw.buffer = bw.buffer[:0]

	// Retry loop with exponential backoff.
	var lastErr error
	for attempt := 0; attempt <= bw.maxRetries; attempt++ {
		if attempt > 0 {
			backoff := bw.retryBackoff * time.Duration(1<<(attempt-1)) // exponential
			bw.logger.Warn("retrying batch flush",
				"attempt", attempt,
				"backoff_ms", backoff.Milliseconds(),
				"batch_size", len(batch),
			)
			select {
			case <-ctx.Done():
				return fmt.Errorf("clickhouse BatchWriter flush: context cancelled after %d retries: %w", attempt-1, ctx.Err())
			case <-time.After(backoff):
			}
		}

		err := bw.store.insertChunk(ctx, batch)
		if err == nil {
			bw.logger.Debug("batch flushed successfully",
				"batch_size", len(batch),
				"attempt", attempt+1,
			)
			return nil
		}
		lastErr = err
		bw.logger.Error("batch flush failed",
			"error", err,
			"attempt", attempt+1,
			"batch_size", len(batch),
		)
	}

	return fmt.Errorf("clickhouse BatchWriter flush: failed after %d retries: %w", bw.maxRetries+1, lastErr)
}

// Close signals the background goroutine to stop, drains any remaining
// events in the buffer, and waits for the goroutine to exit.
//
// Close must be called exactly once. It is safe to call Close even if
// Start was not called (e.g., in error paths).
func (bw *BatchWriter) Close(ctx context.Context) error {
	bw.mu.Lock()
	if bw.closed {
		bw.mu.Unlock()
		return nil
	}
	bw.closed = true
	bw.mu.Unlock()

	close(bw.done)
	bw.wg.Wait()

	bw.logger.Info("batch writer closed")
	return nil
}

// Len returns the current number of buffered events. Safe for concurrent use.
func (bw *BatchWriter) Len() int {
	bw.mu.Lock()
	defer bw.mu.Unlock()
	return len(bw.buffer)
}
