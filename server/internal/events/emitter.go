package events

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/retry"
)

const (
	defaultBufferSize  = 256
	defaultBatchSize   = 50
	defaultFlushEvery  = 5 * time.Second
	flushMaxRetries    = 3
	flushRetryBase     = 500 * time.Millisecond
	flushRetryCap      = 5 * time.Second
)



// AsyncEmitter buffers product events in a channel and flushes them to the
// underlying EventStore in batches. It never blocks the caller — if the
// buffer is full the event is dropped and a warning is logged.
//
// Callers use Emit() which is non-blocking and safe for concurrent use.
// Call Close() during graceful shutdown to drain pending events.
type AsyncEmitter struct {
	store  domain.EventStore
	logger *slog.Logger

	ch     chan domain.ProductEvent
	done   chan struct{}
	once   sync.Once

	bufferSize int
	batchSize  int
	flushEvery time.Duration
}

// EmitterOption configures the AsyncEmitter.
type EmitterOption func(*AsyncEmitter)

func WithBufferSize(n int) EmitterOption {
	return func(e *AsyncEmitter) { e.bufferSize = n }
}

func WithBatchSize(n int) EmitterOption {
	return func(e *AsyncEmitter) { e.batchSize = n }
}

func WithFlushInterval(d time.Duration) EmitterOption {
	return func(e *AsyncEmitter) { e.flushEvery = d }
}

// NewAsyncEmitter creates a buffered, non-blocking event emitter backed by
// the provided EventStore. The emitter starts a background goroutine that
// flushes events on a timer or when the batch is full.
func NewAsyncEmitter(store domain.EventStore, logger *slog.Logger, opts ...EmitterOption) *AsyncEmitter {
	e := &AsyncEmitter{
		store:      store,
		logger:     logger.With("component", "event_emitter"),
		bufferSize: defaultBufferSize,
		batchSize:  defaultBatchSize,
		flushEvery: defaultFlushEvery,
		done:       make(chan struct{}),
	}
	for _, opt := range opts {
		opt(e)
	}
	e.ch = make(chan domain.ProductEvent, e.bufferSize)
	go e.run()
	return e
}

// Emit enqueues a product event for async persistence. It never blocks; if
// the buffer is full the event is dropped.
func (e *AsyncEmitter) Emit(_ context.Context, event domain.ProductEvent) {
	if event.CreatedAt.IsZero() {
		event.CreatedAt = time.Now().UTC()
	}
	select {
	case e.ch <- event:
	default:
		e.logger.Warn("event buffer full, dropping event",
			"event", event.Event,
			"org_id", event.OrgID,
		)
	}
}

// ─── Ruleset emitter ──────────────────────────────────────────────────────────

// RulesetEmitter wraps a RedisPublisher to emit ruleset change events. It
// provides a typed convenience method for broadcasting ruleset updates to
// all relay proxy instances via Redis Pub/Sub.
//
// If the underlying RedisPublisher uses a no-op client, events are logged
// and discarded — the caller does not need to check for Redis availability.
type RulesetEmitter struct {
	publisher *RedisPublisher
	logger    *slog.Logger
}

// NewRulesetEmitter creates a RulesetEmitter backed by the given RedisPublisher.
// If publisher is nil, a no-op publisher is used and all emits are logged.
func NewRulesetEmitter(publisher *RedisPublisher, logger *slog.Logger) *RulesetEmitter {
	return &RulesetEmitter{
		publisher: publisher,
		logger:    logger.With("component", "ruleset_emitter"),
	}
}

// EmitRulesetUpdated publishes a ruleset update event to all relay instances.
func (e *RulesetEmitter) EmitRulesetUpdated(ctx context.Context, orgID, projectID, envID string, updatedAt time.Time, eventType RulesetEventType, flagKey string) error {
	event := RulesetEvent{
		OrgID:     orgID,
		ProjectID: projectID,
		EnvID:     envID,
		UpdatedAt: updatedAt.Unix(),
		Type:      eventType,
		FlagKey:   flagKey,
	}
	return e.publisher.PublishRulesetUpdate(ctx, event)
}

// Close closes the underlying publisher.
func (e *RulesetEmitter) Close() error {
	return e.publisher.Close()
}

// Close drains pending events and stops the background goroutine. It blocks
// until all buffered events have been flushed or the provided context expires.
func (e *AsyncEmitter) Close(ctx context.Context) {
	e.once.Do(func() {
		close(e.ch)
		select {
		case <-e.done:
		case <-ctx.Done():
			e.logger.Warn("event emitter shutdown timed out, some events may be lost")
		}
	})
}

func (e *AsyncEmitter) run() {
	defer close(e.done)
	ticker := time.NewTicker(e.flushEvery)
	defer ticker.Stop()

	batch := make([]domain.ProductEvent, 0, e.batchSize)

	flush := func() {
		if len(batch) == 0 {
			return
		}

		var lastErr error
		for attempt := 1; attempt <= flushMaxRetries; attempt++ {
			ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
			lastErr = e.store.InsertProductEvents(ctx, batch)
			cancel()

			if lastErr == nil {
				batch = batch[:0]
				return
			}

			if attempt < flushMaxRetries {
				backoff := retry.JitteredBackoff(attempt, flushRetryBase, retry.DefaultFactor, flushRetryCap)
				e.logger.Warn("flush retrying",
					"attempt", attempt,
					"count", len(batch),
					"error", lastErr,
					"backoff_ms", backoff.Milliseconds(),
				)
				time.Sleep(backoff)
			}
		}

		e.logger.Error("failed to flush product events after retries",
			"error", lastErr,
			"count", len(batch),
			"attempts", flushMaxRetries,
		)
		batch = batch[:0]
	}

	for {
		select {
		case ev, ok := <-e.ch:
			if !ok {
				flush()
				return
			}
			batch = append(batch, ev)
			if len(batch) >= e.batchSize {
				flush()
			}
		case <-ticker.C:
			flush()
		}
	}
}
