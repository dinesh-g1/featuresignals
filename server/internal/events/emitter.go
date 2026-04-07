package events

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

const (
	defaultBufferSize = 256
	defaultBatchSize  = 50
	defaultFlushEvery = 5 * time.Second
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
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		if err := e.store.InsertProductEvents(ctx, batch); err != nil {
			e.logger.Error("failed to flush product events",
				"error", err,
				"count", len(batch),
			)
		}
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
