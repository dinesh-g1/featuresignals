// Package billing implements the usage metering and cost calculation engine
// for FeatureSignals. This file provides the metering middleware that records
// API usage metrics — CPU time, memory allocation, API call counts — in a
// non-blocking, batched manner so the request path is never slowed down.
package billing

import (
	"context"
	"log/slog"
	"net/http"
	"runtime"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Defaults ─────────────────────────────────────────────────────────────

const (
	// DefaultFlushInterval is how often the background flusher writes buffered
	// usage records to the database (every 60 seconds).
	DefaultFlushInterval = 60 * time.Second

	// DefaultBatchSize is the maximum number of records to hold in memory
	// before forcing a flush (1000 records).
	DefaultBatchSize = 1000

	// DefaultBufferCapacity is the initial capacity of the ring buffer.
	DefaultBufferCapacity = 512

	// maxRetryAttempts is the number of times we retry a failed batch write.
	maxRetryAttempts = 3

	// retryBackoff is the initial backoff between retries (doubles each attempt).
	retryBackoff = 100 * time.Millisecond

	// maxShutdownWait is the maximum time we wait for a final flush during
	// graceful shutdown.
	maxShutdownWait = 10 * time.Second
)

// ─── MeteringMiddleware ───────────────────────────────────────────────────

// MeteringMiddleware implements domain.MeteringMiddleware. It records usage
// metrics for every API request asynchronously — writes are buffered in an
// internal ring buffer and flushed to the database on a background goroutine.
//
// The middleware is designed to be entirely non-blocking on the request path:
//   - RecordRequest enqueues a record in O(1) amortized time
//   - If the buffer is full, the oldest record is dropped (not the request)
//   - Writes to the database happen on a separate goroutine
//   - A failure to record usage never causes a request to fail
type MeteringMiddleware struct {
	flushInterval time.Duration
	batchSize     int

	store   domain.BillingProvider
	logger  *slog.Logger

	// buffered records — protected by mu
	mu      sync.Mutex
	buffer  []domain.UsageRecord
	dropCount int64 // number of records dropped due to full buffer

	// lifecycle
	done     chan struct{}
	shutdown chan struct{}
	wg       sync.WaitGroup
}

// NewMeteringMiddleware creates a new metering middleware. It starts the
// background flush goroutine. Call Close() to stop the goroutine and flush
// any remaining records.
//
// Parameters:
//   - store: the BillingProvider to persist usage records (required)
//   - logger: structured logger (if nil, uses DiscardHandler)
//   - flushInterval: how often to flush (if zero, DefaultFlushInterval)
//   - batchSize: max records before forced flush (if zero, DefaultBatchSize)
func NewMeteringMiddleware(
	store domain.BillingProvider,
	logger *slog.Logger,
	flushInterval time.Duration,
	batchSize int,
) *MeteringMiddleware {
	if logger == nil {
		logger = slog.New(slog.DiscardHandler)
	}
	if flushInterval <= 0 {
		flushInterval = DefaultFlushInterval
	}
	if batchSize <= 0 {
		batchSize = DefaultBatchSize
	}

	m := &MeteringMiddleware{
		flushInterval: flushInterval,
		batchSize:     batchSize,
		store:         store,
		logger:        logger.With("component", "metering"),
		buffer:        make([]domain.UsageRecord, 0, DefaultBufferCapacity),
		done:          make(chan struct{}),
		shutdown:      make(chan struct{}),
	}

	m.wg.Add(1)
	go m.flushLoop()

	m.logger.Info("metering middleware started",
		"flush_interval", flushInterval,
		"batch_size", batchSize,
	)

	return m
}

// ─── Public API ───────────────────────────────────────────────────────────

// RecordRequest implements domain.MeteringMiddleware. It records a single
// API request's metering data for the given tenant. This method is designed
// to be called on the request path and never blocks or returns errors.
//
// Data recorded per request:
//   - 1 API call count
//   - CPU seconds (approximated from request duration — 1 vCPU = 1s of wall time per second)
//   - Memory allocation delta (from runtime.ReadMemStats sampling)
//
// The actual metering is best-effort. If the buffer is full, the record is
// dropped and a counter is incremented. Callers should never check the error.
func (m *MeteringMiddleware) RecordRequest(
	ctx context.Context,
	tenantID, endpoint string,
	statusCode int,
	duration time.Duration,
) error {
	// cpuSeconds approximates CPU usage from wall clock duration. In production,
	// real CPU metering comes from k8s/container metrics via the agent. This is
	// a reasonable approximation for the control plane.
	cpuSeconds := duration.Seconds()

	// Collect a memory delta by comparing with the previous sample.
	memDelta := sampleMemoryDelta()

	// Build usage records.
	now := time.Now().UTC()
	metadata := map[string]any{
		"endpoint":    endpoint,
		"status_code": statusCode,
	}

	records := []domain.UsageRecord{
		{
			TenantID:   tenantID,
			Metric:     domain.MetricAPICalls,
			Value:      1,
			Metadata:   metadata,
			RecordedAt: now,
		},
		{
			TenantID:   tenantID,
			Metric:     domain.MetricCPUSeconds,
			Value:      cpuSeconds,
			Metadata:   metadata,
			RecordedAt: now,
		},
	}

	// Only record memory if we got a meaningful delta.
	if memDelta > 0 {
		memGBHours := float64(memDelta) / (1024 * 1024 * 1024) * duration.Hours()
		if memGBHours > 0 {
			records = append(records, domain.UsageRecord{
				TenantID:   tenantID,
				Metric:     domain.MetricMemoryGBHours,
				Value:      memGBHours,
				Metadata:   metadata,
				RecordedAt: now,
			})
		}
	}

	// Enqueue — non-blocking, best-effort.
	m.enqueue(records)
	return nil
}

// Close flushes any remaining buffered records and stops the background
// goroutine. It blocks until the final flush completes or the timeout
// elapses. After Close, the middleware must not be used.
func (m *MeteringMiddleware) Close() error {
	close(m.shutdown)

	// Wait for flush loop to finish (with timeout).
	done := make(chan struct{})
	go func() {
		m.wg.Wait()
		close(done)
	}()

	select {
	case <-done:
		m.logger.Info("metering middleware shut down cleanly",
			"dropped_records", m.dropCount,
		)
	case <-time.After(maxShutdownWait):
		m.logger.Warn("metering middleware shutdown timed out",
				"dropped_records", m.dropCount,
			)
	}

	return nil
}

// Stats returns current metering middleware statistics for observability.
type MeteringStats struct {
	BufferedRecords int   `json:"buffered_records"`
	DroppedRecords  int64 `json:"dropped_records"`
}

// Stats returns the current buffer and drop statistics.
func (m *MeteringMiddleware) Stats() MeteringStats {
	m.mu.Lock()
	defer m.mu.Unlock()
	return MeteringStats{
		BufferedRecords: len(m.buffer),
		DroppedRecords:  m.dropCount,
	}
}

// ─── Internal: buffer management ──────────────────────────────────────────

// enqueue adds records to the buffer. If adding the records would exceed the
// batch size, the entire buffer is flushed synchronously in a goroutine (so
// the caller is never blocked). If the buffer is full, the oldest records are
// dropped to make room.
func (m *MeteringMiddleware) enqueue(records []domain.UsageRecord) {
	m.mu.Lock()

	// If adding these records would exceed the batch, flush first.
	if len(m.buffer)+len(records) > m.batchSize {
		// Take a snapshot of the buffer and reset it.
		snapshot := make([]domain.UsageRecord, len(m.buffer))
		copy(snapshot, m.buffer)
		m.buffer = m.buffer[:0]

		// Unlock before flushing to avoid blocking RecordRequest callers.
		m.mu.Unlock()

		// Flush in background — never on the caller's goroutine.
		go m.flushBatch(snapshot)

		// Re-acquire lock for the new records.
		m.mu.Lock()
	}

	// Check if we have room. If not, drop oldest records.
	space := cap(m.buffer) - len(m.buffer)
	if space < len(records) {
		// Not enough space — grow or drop. We grow up to batchSize, then drop.
		if cap(m.buffer) < m.batchSize {
			// Grow the buffer: double capacity up to batch size.
			newCap := cap(m.buffer) * 2
			if newCap > m.batchSize {
				newCap = m.batchSize
			}
			newBuf := make([]domain.UsageRecord, len(m.buffer), newCap)
			copy(newBuf, m.buffer)
			m.buffer = newBuf
		} else {
			// Buffer is at max capacity — drop oldest records to make room.
			overflow := len(records) - space
			if overflow > 0 {
				m.dropCount += int64(overflow)
				// Shift buffer to drop oldest.
				if overflow < len(m.buffer) {
					m.buffer = m.buffer[overflow:]
				} else {
					m.buffer = m.buffer[:0]
				}
			}
		}
	}

	m.buffer = append(m.buffer, records...)
	m.mu.Unlock()
}

// ─── Internal: flush loop ─────────────────────────────────────────────────

// flushLoop runs on a background goroutine. It flushes the buffer at regular
// intervals and on shutdown.
func (m *MeteringMiddleware) flushLoop() {
	defer m.wg.Done()

	ticker := time.NewTicker(m.flushInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			m.flush()

		case <-m.shutdown:
			// Final flush before shutdown.
			m.flush()
			close(m.done)
			return
		}
	}
}

// flush takes a snapshot of the current buffer and sends it to the store.
// Non-blocking from the caller's perspective — actual I/O happens in a
// goroutine.
func (m *MeteringMiddleware) flush() {
	m.mu.Lock()
	if len(m.buffer) == 0 {
		m.mu.Unlock()
		return
	}

	// Take a snapshot and reset the buffer.
	snapshot := make([]domain.UsageRecord, len(m.buffer))
	copy(snapshot, m.buffer)
	m.buffer = m.buffer[:0]
	m.mu.Unlock()

	m.flushBatch(snapshot)
}

// flushBatch writes a batch of usage records to the store with retries.
// This is called from a background goroutine — never from the request path.
func (m *MeteringMiddleware) flushBatch(records []domain.UsageRecord) {
	if len(records) == 0 {
		return
	}

	log := m.logger.With("batch_size", len(records))
	log.Debug("flushing usage records")

	// Retry loop with exponential backoff.
	var err error
	for attempt := 0; attempt < maxRetryAttempts; attempt++ {
		if attempt > 0 {
			backoff := retryBackoff * (1 << (attempt - 1))
			time.Sleep(backoff)
		}

		// Use a context with timeout for each attempt.
		ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		err = m.store.RecordUsage(ctx, records)
		cancel()

		if err == nil {
			log.Debug("flushed usage records successfully")
			return
		}

		log.Warn("failed to flush usage records, retrying",
			"attempt", attempt+1,
			"max_attempts", maxRetryAttempts,
			"error", err,
		)
	}

	// All retries exhausted — log and drop.
	log.Error("dropped usage records after exhausting retries",
		"error", err,
		"records_dropped", len(records),
	)
}

// ─── Memory Sampling ─────────────────────────────────────────────────────

// memSample holds a point-in-time memory stats snapshot for delta computation.
var (
	lastMemSample   runtime.MemStats
	lastMemSampleMu sync.Mutex
)

// sampleMemoryDelta returns the difference in allocated heap memory since the
// last call. This provides a rough approximation of per-request memory usage
// for metering purposes.
func sampleMemoryDelta() uint64 {
	var current runtime.MemStats
	runtime.ReadMemStats(&current)

	lastMemSampleMu.Lock()
	defer lastMemSampleMu.Unlock()

	delta := current.TotalAlloc - lastMemSample.TotalAlloc
	lastMemSample = current

	return delta
}

// ─── HTTP Handler Middleware ──────────────────────────────────────────────

// responseWriter wraps http.ResponseWriter to capture the status code
// for metering. This pattern matches the one used in api/middleware/logging.go.
type responseWriter struct {
	http.ResponseWriter
	status int
}

func (rw *responseWriter) WriteHeader(code int) {
	rw.status = code
	rw.ResponseWriter.WriteHeader(code)
}

// MeteringHTTPMiddleware returns an HTTP middleware that records usage for
// every authenticated request. It extracts the tenant ID from the request
// context (set by the tenant middleware) and records the request duration,
// endpoint, and status code.
//
// This middleware should be placed after the tenant/auth middleware so that
// the tenant ID is available in the context.
func MeteringHTTPMiddleware(meter *MeteringMiddleware) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()

			// Wrap the response writer to capture the status code.
			rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}
			next.ServeHTTP(rw, r)

			// Extract tenant ID from context — set by TenantMiddleware.
			tenantID := TenantIDFromContext(r.Context())
			if tenantID == "" {
				return // not an authenticated/tenant request
			}

			duration := time.Since(start)
			_ = meter.RecordRequest(
				r.Context(),
				tenantID,
				r.URL.Path,
				rw.status,
				duration,
			)
		})
	}
}

// ─── Context Helpers ──────────────────────────────────────────────────────

// contextKey is an unexported type for context value keys to prevent collisions.
type contextKey string

const tenantIDCtxKey contextKey = "metering_tenant_id"

// TenantIDFromContext extracts a tenant ID from the context that was set by
// the tenant middleware. Returns empty string if not found.
func TenantIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(tenantIDCtxKey).(string)
	return id
}

// WithTenantID injects a tenant ID into the context for the metering middleware.
func WithTenantID(ctx context.Context, tenantID string) context.Context {
	return context.WithValue(ctx, tenantIDCtxKey, tenantID)
}