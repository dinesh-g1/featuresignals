package events

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store/clickhouse"
)

// ─── Pipeline Integration Test ─────────────────────────────────────────────
//
// This test verifies the full pipeline:
//   EventBus.Publish → Consumer.handleEvent → BatchWriter.Write → buffer
//
// Since the actual ClickHouse connection is not available in unit tests,
// the BatchWriter is configured with a high batch size to prevent automatic
// flushes. The test verifies that events flow through all the deserialization
// and buffering stages correctly.

func TestEvalEventPipeline_FullFlow(t *testing.T) {
	t.Parallel()

	bus := newMockEventBus()
	logger := slog.New(slog.DiscardHandler)
	ctx := context.Background()

	// Create a ClickHouse store WITHOUT connecting (no real CH needed).
	// The BatchWriter buffers events; we won't trigger a flush.
	store, err := clickhouse.NewClickHouseEvalEventStore(clickhouse.ClickHouseConfig{
		Addrs:         []string{"localhost:9000"},
		Database:      "test_pipeline",
		BatchSize:     10000, // Very high, won't auto-flush
		FlushInterval: 10 * time.Minute,
		MaxRetries:    1,
		RetryBackoff:  10 * time.Millisecond,
	}, logger)
	require.NoError(t, err)

	writer := clickhouse.NewBatchWriter(store,
		clickhouse.WithBatchSize(10000),
		clickhouse.WithFlushInterval(10*time.Minute),
	)

	consumer := NewClickHouseConsumer(bus, writer, logger, nil)

	// Start the consumer — this subscribes to the EventBus
	err = consumer.Start(ctx)
	require.NoError(t, err)
	assert.True(t, bus.HadSubject("eval.flag.evaluated"),
		"consumer should subscribe to eval.flag.evaluated")

	// Simulate publishing an EvalEventBatch to the subject.
	// In production, this comes from the eval engine via NATS.
	events := []domain.EvalEvent{
		{ID: "pipeline-ev-1", OrgID: "org-pipeline", FlagKey: "flag-1", Value: "true", Reason: domain.EvalReasonDefault, SDK: "go/1.2.3"},
		{ID: "pipeline-ev-2", OrgID: "org-pipeline", FlagKey: "flag-1", Value: "false", Reason: domain.EvalReasonTargetingMatch, SDK: "node/2.0.0"},
		{ID: "pipeline-ev-3", OrgID: "org-pipeline", FlagKey: "flag-2", Value: "true", Reason: domain.EvalReasonDefault, SDK: "python/0.5.1"},
	}
	batch := domain.EvalEventBatch{
		ID:          "pipeline-batch-1",
		OrgID:       "org-pipeline",
		Events:      events,
		BatchSize:   len(events),
		SampledRate: 1.0,
	}
	payload, err := json.Marshal(batch)
	require.NoError(t, err)

	// Get the handler registered by the consumer
	handler := bus.handlers["eval.flag.evaluated"]
	require.NotNil(t, handler, "handler should be registered for eval.flag.evaluated")

	// Invoke the handler directly (simulating what the real EventBus would do)
	env := &domain.EventEnvelope{
		ID:      "env-pipeline-1",
		Subject: "eval.flag.evaluated",
		Payload: payload,
	}
	err = handler(ctx, env)
	require.NoError(t, err, "handler should process the batch without error")

	// Verify events are buffered in the BatchWriter
	assert.Equal(t, 3, writer.Len(), "all 3 events should be buffered in the writer")

	// Clean up
	err = consumer.Close(ctx)
	require.NoError(t, err)
}

func TestEvalEventPipeline_MultipleBatches(t *testing.T) {
	t.Parallel()

	bus := newMockEventBus()
	logger := slog.New(slog.DiscardHandler)
	ctx := context.Background()

	store, err := clickhouse.NewClickHouseEvalEventStore(clickhouse.ClickHouseConfig{
		Addrs:         []string{"localhost:9000"},
		Database:      "test_pipeline_multi",
		BatchSize:     10000,
		FlushInterval: 10 * time.Minute,
		MaxRetries:    1,
		RetryBackoff:  10 * time.Millisecond,
	}, logger)
	require.NoError(t, err)

	writer := clickhouse.NewBatchWriter(store,
		clickhouse.WithBatchSize(10000),
		clickhouse.WithFlushInterval(10*time.Minute),
	)

	consumer := NewClickHouseConsumer(bus, writer, logger, nil)
	err = consumer.Start(ctx)
	require.NoError(t, err)

	handler := bus.handlers["eval.flag.evaluated"]
	require.NotNil(t, handler)

	// Publish 5 batches of 2 events each
	for batchIdx := 0; batchIdx < 5; batchIdx++ {
		events := []domain.EvalEvent{
			{ID: "batch-" + string(rune('0'+batchIdx)) + "-ev-1", OrgID: "org-multi", FlagKey: "flag-multi", Value: "true", Reason: domain.EvalReasonDefault},
			{ID: "batch-" + string(rune('0'+batchIdx)) + "-ev-2", OrgID: "org-multi", FlagKey: "flag-multi", Value: "false", Reason: domain.EvalReasonTargetingMatch},
		}
		batch := domain.EvalEventBatch{
			ID:          "pipeline-batch-" + string(rune('0'+batchIdx)),
			OrgID:       "org-multi",
			Events:      events,
			BatchSize:   2,
			SampledRate: 1.0,
		}
		payload, err := json.Marshal(batch)
		require.NoError(t, err)

		env := &domain.EventEnvelope{
			ID:      "env-batch-" + string(rune('0'+batchIdx)),
			Subject: "eval.flag.evaluated",
			Payload: payload,
		}
		err = handler(ctx, env)
		require.NoError(t, err)
	}

	// All 10 events should be buffered
	assert.Equal(t, 10, writer.Len(), "all 10 events across 5 batches should be buffered")

	err = consumer.Close(ctx)
	require.NoError(t, err)
}

func TestEvalEventPipeline_HandleEvent_InvalidBatch(t *testing.T) {
	t.Parallel()

	bus := newMockEventBus()
	logger := slog.New(slog.DiscardHandler)
	ctx := context.Background()

	store, err := clickhouse.NewClickHouseEvalEventStore(clickhouse.ClickHouseConfig{
		Addrs:         []string{"localhost:9000"},
		Database:      "test_pipeline_err",
		BatchSize:     10000,
		FlushInterval: 10 * time.Minute,
	}, logger)
	require.NoError(t, err)

	writer := clickhouse.NewBatchWriter(store)
	consumer := NewClickHouseConsumer(bus, writer, logger, nil)
	err = consumer.Start(ctx)
	require.NoError(t, err)

	handler := bus.handlers["eval.flag.evaluated"]
	require.NotNil(t, handler)

	// Send an invalid batch
	env := &domain.EventEnvelope{
		ID:      "env-invalid",
		Subject: "eval.flag.evaluated",
		Payload: []byte("invalid json {{{"),
	}
	err = handler(ctx, env)
	require.Error(t, err, "handler should return error for invalid JSON")
	assert.Contains(t, err.Error(), "unmarshal")

	// Buffer should NOT have been modified
	assert.Equal(t, 0, writer.Len(), "buffer should be empty after invalid batch")

	err = consumer.Close(ctx)
	require.NoError(t, err)
}

func TestEvalEventPipeline_Consumer_CloseIdempotent(t *testing.T) {
	t.Parallel()

	bus := newMockEventBus()
	logger := slog.New(slog.DiscardHandler)
	ctx := context.Background()

	store, err := clickhouse.NewClickHouseEvalEventStore(clickhouse.ClickHouseConfig{
		Addrs:         []string{"localhost:9000"},
		Database:      "test_pipeline_close",
		BatchSize:     10000,
		FlushInterval: 10 * time.Minute,
	}, logger)
	require.NoError(t, err)

	writer := clickhouse.NewBatchWriter(store)
	consumer := NewClickHouseConsumer(bus, writer, logger, nil)
	err = consumer.Start(ctx)
	require.NoError(t, err)

	// First close
	err = consumer.Close(ctx)
	require.NoError(t, err)

	// Second close should succeed (idempotent)
	err = consumer.Close(ctx)
	assert.NoError(t, err, "second Close should be idempotent")
}

func TestEvalEventPipeline_Consumer_StartAfterClose(t *testing.T) {
	t.Parallel()

	bus := newMockEventBus()
	logger := slog.New(slog.DiscardHandler)
	ctx := context.Background()

	store, err := clickhouse.NewClickHouseEvalEventStore(clickhouse.ClickHouseConfig{
		Addrs:         []string{"localhost:9000"},
		Database:      "test_pipeline_reclose",
		BatchSize:     10000,
		FlushInterval: 10 * time.Minute,
	}, logger)
	require.NoError(t, err)

	writer := clickhouse.NewBatchWriter(store)
	consumer := NewClickHouseConsumer(bus, writer, logger, nil)

	// First start
	err = consumer.Start(ctx)
	require.NoError(t, err)

	// Close
	err = consumer.Close(ctx)
	require.NoError(t, err)

	// Start after close should return ErrEventBusClosed
	err = consumer.Start(ctx)
	require.Error(t, err)
	assert.ErrorIs(t, err, domain.ErrEventBusClosed)
}

func TestEvalEventPipeline_ConcurrentPublishes(t *testing.T) {
	t.Parallel()

	bus := newMockEventBus()
	logger := slog.New(slog.DiscardHandler)
	ctx := context.Background()

	store, err := clickhouse.NewClickHouseEvalEventStore(clickhouse.ClickHouseConfig{
		Addrs:         []string{"localhost:9000"},
		Database:      "test_pipeline_concurrent",
		BatchSize:     10000,
		FlushInterval: 10 * time.Minute,
		MaxRetries:    1,
		RetryBackoff:  10 * time.Millisecond,
	}, logger)
	require.NoError(t, err)

	writer := clickhouse.NewBatchWriter(store,
		clickhouse.WithBatchSize(10000),
		clickhouse.WithFlushInterval(10*time.Minute),
	)

	consumer := NewClickHouseConsumer(bus, writer, logger, nil)
	err = consumer.Start(ctx)
	require.NoError(t, err)

	handler := bus.handlers["eval.flag.evaluated"]
	require.NotNil(t, handler)

	// Concurrently publish batches from multiple goroutines
	const goroutines = 8
	const batchesPerGoroutine = 3
	const eventsPerBatch = 2

	var wg sync.WaitGroup
	wg.Add(goroutines)

	for g := 0; g < goroutines; g++ {
		go func(goroutineID int) {
			defer wg.Done()
			for b := 0; b < batchesPerGoroutine; b++ {
				events := make([]domain.EvalEvent, eventsPerBatch)
				for e := 0; e < eventsPerBatch; e++ {
					events[e] = domain.EvalEvent{
						ID:     "concurrent-g" + string(rune('0'+goroutineID)) + "-b" + string(rune('0'+b)) + "-e" + string(rune('0'+e)),
						OrgID:  "org-concurrent",
						FlagKey: "flag-concurrent",
						Value:  "true",
						Reason: domain.EvalReasonDefault,
					}
				}
				batch := domain.EvalEventBatch{
					ID:          "batch-concurrent-g" + string(rune('0'+goroutineID)) + "-b" + string(rune('0'+b)),
					OrgID:       "org-concurrent",
					Events:      events,
					BatchSize:   len(events),
					SampledRate: 1.0,
				}
				payload, _ := json.Marshal(batch)
				env := &domain.EventEnvelope{
					ID:      "env-concurrent-g" + string(rune('0'+goroutineID)) + "-b" + string(rune('0'+b)),
					Subject: "eval.flag.evaluated",
					Payload: payload,
				}
				_ = handler(context.Background(), env)
			}
		}(g)
	}
	wg.Wait()

	// Total events = goroutines * batchesPerGoroutine * eventsPerBatch
	expectedEvents := goroutines * batchesPerGoroutine * eventsPerBatch
	assert.Equal(t, expectedEvents, writer.Len(),
		"all %d events should be buffered after concurrent publishes", expectedEvents)

	err = consumer.Close(ctx)
	require.NoError(t, err)
}
