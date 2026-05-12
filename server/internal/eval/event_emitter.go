// Package eval provides the feature flag evaluation engine and its
// instrumentation. The EvalEventEmitter wraps an eval.Engine to emit
// EvalEvents after each evaluation with zero overhead on the hot path.
//
// Event emission is non-blocking: events are pushed to a buffered channel
// and flushed to the EventBus asynchronously. If the buffer is full,
// events are dropped and a counter is incremented.
package eval

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/observability"
)

// EvalEventEmitter wraps an evaluation Engine and publishes EvalEvents
// to the EventBus after each evaluation. It is safe for concurrent use
// and adds negligible overhead to the evaluation hot path.
//
// Emission is controlled by EvalEmissionConfig:
//   - "none": no events are emitted (zero overhead)
//   - "batch": events are buffered and flushed in batches
//   - "sample": events are sampled at the configured rate
//   - "stream": events are published individually in real-time
type EvalEventEmitter struct {
	engine Evaluator
	bus    domain.EventBus
	instr  *observability.Instruments
	config domain.EvalEmissionConfig
	logger *slog.Logger

	// Buffered channel for async emission
	ch      chan domain.EvalEvent
	done    chan struct{}
	once    sync.Once

	// Metrics
	emittedTotal  int64
	droppedTotal  int64
	mu            sync.Mutex
}

// EvalEventEmitterOption configures the emitter.
type EvalEventEmitterOption func(*EvalEventEmitter)

// WithEvalBufferSize sets the buffer channel capacity. Default: 1024.
func WithEvalBufferSize(n int) EvalEventEmitterOption {
	return func(e *EvalEventEmitter) { e.ch = make(chan domain.EvalEvent, n) }
}

// NewEvalEventEmitter creates an EvalEventEmitter wrapping the given engine.
// If config.Mode is "none", the emitter is a no-op and no events are emitted.
func NewEvalEventEmitter(engine Evaluator, bus domain.EventBus, config domain.EvalEmissionConfig, logger *slog.Logger, instr *observability.Instruments, opts ...EvalEventEmitterOption) *EvalEventEmitter {
	e := &EvalEventEmitter{
		engine: engine,
		bus:    bus,
		instr:  instr,
		config: config,
		logger: logger.With("component", "eval_event_emitter"),
	}

	for _, opt := range opts {
		opt(e)
	}

	if e.ch == nil {
		e.ch = make(chan domain.EvalEvent, 1024)
	}

	if config.Mode != "none" {
		e.done = make(chan struct{})
		go e.run()
	}

	return e
}

// Evaluate evaluates a flag and optionally emits an EvalEvent.
// Implements the domain.Evaluator interface so it can be used as a
// drop-in replacement for eval.Engine in the handler chain.
func (e *EvalEventEmitter) Evaluate(flagKey string, ctx domain.EvalContext, ruleset *domain.Ruleset) domain.EvalResult {
	start := time.Now()
	result := e.engine.Evaluate(flagKey, ctx, ruleset)
	latencyUs := time.Since(start).Microseconds()

	e.maybeEmit(flagKey, ctx, ruleset, result, latencyUs)
	return result
}

// EvaluateAll evaluates all flags and optionally emits EvalEvents.
func (e *EvalEventEmitter) EvaluateAll(ctx domain.EvalContext, ruleset *domain.Ruleset) map[string]domain.EvalResult {
	start := time.Now()
	results := e.engine.EvaluateAll(ctx, ruleset)
	baseLatency := time.Since(start).Microseconds()

	for key, result := range results {
		e.maybeEmit(key, ctx, ruleset, result, baseLatency)
	}
	return results
}

// maybeEmit decides whether to emit an EvalEvent based on the configured
// emission mode, then enqueues it on the non-blocking channel.
func (e *EvalEventEmitter) maybeEmit(flagKey string, ctx domain.EvalContext, ruleset *domain.Ruleset, result domain.EvalResult, latencyUs int64) {
	if e.config.Mode == "none" {
		return
	}

	// Create the event
	event := domain.EvalEvent{
		ID:        uuid.NewString(),
		OrgID:     ruleset.OrgID,
		ProjectID: ruleset.ProjectID,
		EnvironmentID: ruleset.EnvID,
		FlagKey:   flagKey,
		Value:     valueToString(result.Value),
		Reason:    result.Reason,
		Variant:   result.VariantKey,
		LatencyUs: latencyUs,
		EvaluatedAt: time.Now().UTC(),
	}

	// Apply attribute filtering for privacy
	if len(e.config.ExcludeAttributes) > 0 {
		attrs := make(map[string]interface{})
		for k, v := range ctx.Attributes {
			skip := false
			for _, excl := range e.config.ExcludeAttributes {
				if k == excl {
					skip = true
					break
				}
			}
			if !skip {
				attrs[k] = v
			}
		}
		event.Attributes, _ = json.Marshal(attrs)
	} else if len(ctx.Attributes) > 0 {
		event.Attributes, _ = json.Marshal(ctx.Attributes)
	}

	// Sampling
	if e.config.Mode == "sample" && e.config.SampleRate < 1.0 {
		// Simple hash-based sampling using the event ID
		if hashSample(event.ID, e.config.SampleRate) {
			e.enqueue(event)
		}
		return
	}

	e.enqueue(event)
}

// enqueue pushes the event onto the buffered channel. Never blocks:
// if the buffer is full, the event is dropped.
func (e *EvalEventEmitter) enqueue(event domain.EvalEvent) {
	select {
	case e.ch <- event:
		e.mu.Lock()
		e.emittedTotal++
		e.mu.Unlock()
	default:
		e.mu.Lock()
		e.droppedTotal++
		e.mu.Unlock()
		e.logger.Warn("eval event buffer full, dropping event",
			"flag_key", event.FlagKey,
			"org_id", event.OrgID,
		)
	}
}

// EmittedTotal returns the number of events successfully enqueued.
func (e *EvalEventEmitter) EmittedTotal() int64 {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.emittedTotal
}

// DroppedTotal returns the number of events dropped due to buffer full.
func (e *EvalEventEmitter) DroppedTotal() int64 {
	e.mu.Lock()
	defer e.mu.Unlock()
	return e.droppedTotal
}

// Close drains pending events and stops the background goroutine.
func (e *EvalEventEmitter) Close(ctx context.Context) {
	e.once.Do(func() {
		if e.done == nil {
			return
		}
		close(e.ch)
	})
}

// run is the background goroutine that flushes events to the EventBus.
func (e *EvalEventEmitter) run() {
	defer close(e.done)

	batchInterval := time.Duration(e.config.BatchIntervalMs) * time.Millisecond
	if batchInterval <= 0 {
		batchInterval = 5 * time.Second
	}

	batchSize := e.config.BatchSize
	if batchSize <= 0 {
		batchSize = 50
	}

	ticker := time.NewTicker(batchInterval)
	defer ticker.Stop()

	// Periodic OTEL metrics reporting (every 30 seconds).
	metricsTicker := time.NewTicker(30 * time.Second)
	defer metricsTicker.Stop()
	var lastEmitted, lastDropped int64

	batch := make([]domain.EvalEvent, 0, batchSize)

	flush := func() {
		if len(batch) == 0 {
			return
		}

		// Build the batch envelope
		batchID := uuid.NewString()
		now := time.Now().UTC()

		env := &domain.EventEnvelope{
			ID:          batchID,
			Subject:     "eval.flag.evaluated",
			Timestamp:   now,
			ContentType: "application/json",
			TenantID:    batch[0].OrgID,
		}

		evalBatch := domain.EvalEventBatch{
			ID:             batchID,
			OrgID:          batch[0].OrgID,
			EnvironmentID:  batch[0].EnvironmentID,
			Events:         batch,
			BatchSize:      len(batch),
			WindowStart:    batch[0].EvaluatedAt,
			WindowEnd:      batch[len(batch)-1].EvaluatedAt,
			EmittedAt:      now,
		}

		data, err := json.Marshal(evalBatch)
		if err != nil {
			e.logger.Error("failed to marshal eval event batch", "error", err)
			batch = batch[:0]
			return
		}
		env.Payload = data

		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := e.bus.Publish(ctx, env); err != nil {
			e.logger.Error("failed to publish eval event batch",
				"error", err,
				"batch_size", len(batch),
			)
		}

		batch = batch[:0]
	}

	for {
		select {
		case ev, ok := <-e.ch:
			if !ok {
				flush()
				// Final metrics report.
				e.reportMetrics(&lastEmitted, &lastDropped)
				return
			}
			batch = append(batch, ev)
			if len(batch) >= batchSize {
				flush()
			}
		case <-ticker.C:
			flush()
		case <-metricsTicker.C:
			e.reportMetrics(&lastEmitted, &lastDropped)
		}
	}
}

// reportMetrics periodically pushes cumulative emit/drop counters to OTEL.
func (e *EvalEventEmitter) reportMetrics(lastEmitted, lastDropped *int64) {
	if e.instr == nil {
		return
	}
	e.mu.Lock()
	emitted := e.emittedTotal
	dropped := e.droppedTotal
	e.mu.Unlock()

	deltaEmitted := emitted - *lastEmitted
	deltaDropped := dropped - *lastDropped
	*lastEmitted = emitted
	*lastDropped = dropped

	if deltaEmitted > 0 {
		e.instr.RecordEvalEventsEmitted(context.Background(), deltaEmitted)
	}
	if deltaDropped > 0 {
		e.instr.RecordEvalEventsDropped(context.Background(), deltaDropped)
	}
}

// hashSample deterministically samples events based on their ID hash.
func hashSample(id string, rate float64) bool {
	if rate >= 1.0 {
		return true
	}
	if rate <= 0.0 {
		return false
	}
	// Simple hash: sum of first 8 bytes modulo 10000
	var sum int
	for i := 0; i < min(8, len(id)); i++ {
		sum += int(id[i])
	}
	return float64(sum%10000)/10000.0 < rate
}

// valueToString converts an eval result value to a string representation.
func valueToString(v interface{}) string {
	if v == nil {
		return ""
	}
	switch val := v.(type) {
	case bool:
		if val {
			return "true"
		}
		return "false"
	case string:
		return val
	case float64:
		return fmt.Sprintf("%v", val)
	}
	b, err := json.Marshal(v)
	if err != nil {
		return ""
	}
	return string(b)
}
