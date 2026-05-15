// Package events provides event infrastructure for FeatureSignals.
//
// ClickHouseConsumer subscribes to evaluation events via the EventBus (NATS)
// and writes them to ClickHouse through a BatchWriter. It handles
// deserialization, trace context propagation, and graceful shutdown.
package events

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/observability"
	"github.com/featuresignals/server/internal/store/clickhouse"
)

// ClickHouseConsumer subscribes to evaluation events via the EventBus and
// writes them to ClickHouse through a BatchWriter. It handles deserialization
// of EvalEventBatch payloads, trace context propagation, and graceful shutdown.
//
// The BatchWriter MUST be started (via BatchWriter.Start) before calling
// Start on the consumer. The consumer does not own the BatchWriter lifecycle;
// the caller must ensure the writer is started first and closed after the
// consumer is closed.
type ClickHouseConsumer struct {
	bus    domain.EventBus
	writer *clickhouse.BatchWriter
	logger *slog.Logger
	instr  *observability.Instruments
	sub    domain.EventSubscription
	mu     sync.Mutex
	closed bool
}

// NewClickHouseConsumer creates a new consumer. It does NOT start consuming
// until Start() is called.
func NewClickHouseConsumer(
	bus domain.EventBus,
	writer *clickhouse.BatchWriter,
	logger *slog.Logger,
	instr *observability.Instruments,
) *ClickHouseConsumer {
	return &ClickHouseConsumer{
		bus:    bus,
		writer: writer,
		logger: logger.With("component", "clickhouse_consumer"),
		instr:  instr,
	}
}

// Start begins consuming eval events from the EventBus. It subscribes to
// "eval.flag.evaluated" with consumer group "clickhouse-writers" for
// load-balanced delivery across multiple server instances.
//
// The BatchWriter MUST be started before calling Start().
func (c *ClickHouseConsumer) Start(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return domain.ErrEventBusClosed
	}

	sub, err := c.bus.Subscribe(ctx, "eval.flag.evaluated", "clickhouse-writers", c.handleEvent)
	if err != nil {
		return fmt.Errorf("clickhouse consumer subscribe: %w", err)
	}
	c.sub = sub
	c.logger.Info("clickhouse consumer started",
		"subject", "eval.flag.evaluated",
		"consumer_group", "clickhouse-writers",
	)
	return nil
}

// handleEvent is the EventBus message handler. It deserializes the
// EvalEventBatch from the envelope payload and writes each event to the
// BatchWriter. Individual write failures are logged but do not stop
// processing of remaining events in the batch.
func (c *ClickHouseConsumer) handleEvent(ctx context.Context, env *domain.EventEnvelope) error {
	var batch domain.EvalEventBatch
	if err := json.Unmarshal(env.Payload, &batch); err != nil {
		c.logger.Error("failed to unmarshal eval event batch",
			"error", err,
			"env_id", env.ID,
			"payload_len", len(env.Payload),
		)
		return fmt.Errorf("clickhouse consumer unmarshal: %w", err)
	}

	logger := c.logger.With(
		"batch_id", batch.ID,
		"org_id", batch.OrgID,
		"batch_size", batch.BatchSize,
	)

	for _, event := range batch.Events {
		if err := c.writer.Write(ctx, event); err != nil {
			logger.Error("failed to write eval event to batch writer",
				"error", err,
				"event_id", event.ID,
				"flag_key", event.FlagKey,
			)
			// Continue processing remaining events; the BatchWriter handles
			// its own retry logic on flush.
		}
	}

	logger.Debug("eval event batch processed", "event_count", len(batch.Events))
	return nil
}

// Close stops the consumer and drains the writer. It blocks until the
// writer has flushed all pending events or the context expires.
//
// Close is idempotent and safe to call multiple times.
func (c *ClickHouseConsumer) Close(ctx context.Context) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	if c.closed {
		return nil
	}
	c.closed = true

	if c.sub != nil {
		if err := c.sub.Unsubscribe(); err != nil {
			c.logger.Warn("failed to unsubscribe clickhouse consumer", "error", err)
		}
	}

	if err := c.writer.Close(ctx); err != nil {
		return fmt.Errorf("clickhouse consumer close writer: %w", err)
	}

	c.logger.Info("clickhouse consumer stopped")
	return nil
}
