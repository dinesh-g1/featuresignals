package clickhouse

import (
	"context"
	"log/slog"
	"sync"
	"testing"
	"time"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Mock EvalEventWriter ──────────────────────────────────────────────────

// mockEvalEventStore implements domain.EvalEventWriter for BatchWriter tests.
// It records all calls without needing a real ClickHouse connection.
type mockEvalEventStore struct {
	mu           sync.Mutex
	inserts      []*domain.EvalEvent
	batchInserts []*domain.EvalEventBatch
	insertErr    error
}

func (m *mockEvalEventStore) InsertEvalEvent(_ context.Context, event *domain.EvalEvent) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.insertErr != nil {
		return m.insertErr
	}
	m.inserts = append(m.inserts, event)
	return nil
}

func (m *mockEvalEventStore) InsertEvalEventBatch(_ context.Context, batch *domain.EvalEventBatch) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.insertErr != nil {
		return m.insertErr
	}
	m.batchInserts = append(m.batchInserts, batch)
	return nil
}

func (m *mockEvalEventStore) InsertedCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.inserts)
}

func (m *mockEvalEventStore) BatchInsertedCount() int {
	m.mu.Lock()
	defer m.mu.Unlock()
	return len(m.batchInserts)
}

// ─── BatchWriter test helpers ──────────────────────────────────────────────

// newTestBatchWriter creates a BatchWriter with a valid store config but
// NO ClickHouse connection. Tests that trigger flush (Write at batchSize,
// Flush, Start) will panic because the store has a nil conn.
// Use newTestBatchWriterSafe for tests that need to avoid flush panics.
func newTestBatchWriter(t *testing.T) (*BatchWriter, *mockEvalEventStore) {
	t.Helper()

	mock := &mockEvalEventStore{}
	_ = mock // reserved for future mock-based tests
	logger := slog.New(slog.DiscardHandler)

	cfg := ClickHouseConfig{
		Addrs:         []string{"localhost:9000"},
		Database:      "test",
		BatchSize:     10,
		FlushInterval: 100 * time.Millisecond,
		MaxRetries:    1,
		RetryBackoff:  10 * time.Millisecond,
	}

	store := &ClickHouseEvalEventStore{
		cfg:    cfg,
		logger: logger,
		conn:   nil,
	}

	bw := NewBatchWriter(store,
		WithBatchSize(10),
		WithFlushInterval(100*time.Millisecond),
		WithMaxRetries(1),
		WithRetryBackoff(10*time.Millisecond),
	)

	return bw, mock
}

// testEvent is a helper to create simple domain.EvalEvent values.
func testEvent(id string) domain.EvalEvent {
	return domain.EvalEvent{
		ID:     id,
		OrgID:  "test-org",
		FlagKey: "test-flag",
		Value:  "true",
		Reason: domain.EvalReasonDefault,
	}
}

// ─── BatchWriter Constructor ───────────────────────────────────────────────

func TestBatchWriter_New(t *testing.T) {
	t.Parallel()

	bw, _ := newTestBatchWriter(t)
	require.NotNil(t, bw)
	assert.Equal(t, 10, bw.batchSize)
	assert.Equal(t, 100*time.Millisecond, bw.flushEvery)
	assert.False(t, bw.closed, "should not be closed initially")
	assert.Equal(t, 0, bw.Len(), "buffer should be empty initially")
}

// ─── BatchWriter Write (below batch size — safe, no flush) ─────────────────

func TestBatchWriter_Write_BelowBatchSize(t *testing.T) {
	t.Parallel()

	bw, _ := newTestBatchWriter(t)
	ctx := context.Background()

	for i := 0; i < 5; i++ {
		err := bw.Write(ctx, testEvent("ev-"+string(rune('0'+i))))
		require.NoError(t, err)
	}

	assert.Equal(t, 5, bw.Len(), "buffer should have 5 events")
}

// ─── BatchWriter Write (at batch size — triggers flush; integration only) ──

func TestBatchWriter_Write_AtBatchSize_Integration(t *testing.T) {
	skipIfNoClickHouse(t)
	t.Parallel()

	bw, _ := newTestBatchWriter(t)
	ctx := context.Background()

	// Write up to batchSize - 1
	for i := 0; i < 9; i++ {
		err := bw.Write(ctx, testEvent("ev-"+string(rune('0'+i))))
		require.NoError(t, err)
	}
	assert.Equal(t, 9, bw.Len())

	// Writing the 10th event triggers a flush
	err := bw.Write(ctx, testEvent("ev-9"))
	require.NoError(t, err)

	// After flush, buffer should be empty (or 0 if flush succeeded)
	assert.Equal(t, 0, bw.Len(), "buffer should be empty after automatic flush")
}

// ─── BatchWriter Write Concurrency ─────────────────────────────────────────

func TestBatchWriter_Write_Concurrent_BelowBatchSize(t *testing.T) {
	t.Parallel()

	// Use a very large batch size so concurrent writes never trigger flush.
	cfg := ClickHouseConfig{
		Addrs:    []string{"localhost:9000"},
		Database: "test",
	}
	store := &ClickHouseEvalEventStore{
		cfg:    cfg,
		logger: slog.New(slog.DiscardHandler),
		conn:   nil,
	}
	bw := NewBatchWriter(store,
		WithBatchSize(1000000), // effectively infinite
	)

	ctx := context.Background()
	var wg sync.WaitGroup
	const writers = 10
	const eventsPerWriter = 50

	for w := 0; w < writers; w++ {
		wg.Add(1)
		go func(workerID int) {
			defer wg.Done()
			for i := 0; i < eventsPerWriter; i++ {
				_ = bw.Write(ctx, testEvent("ev-"+string(rune('A'+workerID))+"-"+string(rune('0'+i%10))))
			}
		}(w)
	}
	wg.Wait()

	expectedTotal := writers * eventsPerWriter
	assert.Equal(t, expectedTotal, bw.Len(),
		"all %d events should be buffered (no flushes)", expectedTotal)
}

// ─── BatchWriter Flush ─────────────────────────────────────────────────────

func TestBatchWriter_Flush_EmptyBuffer(t *testing.T) {
	t.Parallel()

	bw, _ := newTestBatchWriter(t)
	ctx := context.Background()

	// Flushing empty buffer is a no-op (flushInternal returns early on len==0)
	err := bw.Flush(ctx)
	assert.NoError(t, err, "flushing empty buffer should not error")
	assert.Equal(t, 0, bw.Len())
}

func TestBatchWriter_Flush_WithEvents_Integration(t *testing.T) {
	skipIfNoClickHouse(t)
	t.Parallel()

	bw, _ := newTestBatchWriter(t)
	ctx := context.Background()

	for i := 0; i < 5; i++ {
		err := bw.Write(ctx, testEvent("ev-"+string(rune('0'+i))))
		require.NoError(t, err)
	}
	assert.Equal(t, 5, bw.Len())

	// Manual flush requires ClickHouse connection
	err := bw.Flush(ctx)
	require.NoError(t, err)
	assert.Equal(t, 0, bw.Len())
}

// ─── BatchWriter Close ─────────────────────────────────────────────────────

func TestBatchWriter_Close_WithoutStart(t *testing.T) {
	t.Parallel()

	bw, _ := newTestBatchWriter(t)
	ctx := context.Background()

	// Close works even if Start was never called (no background goroutine)
	err := bw.Close(ctx)
	require.NoError(t, err)
}

func TestBatchWriter_Close_Idempotent(t *testing.T) {
	t.Parallel()

	bw, _ := newTestBatchWriter(t)
	ctx := context.Background()

	// First close (Start was never called, so no background goroutine)
	err := bw.Close(ctx)
	require.NoError(t, err)

	// Second close should not panic and return nil
	err = bw.Close(ctx)
	assert.NoError(t, err, "second close should be a no-op")
}

// ─── BatchWriter Len ───────────────────────────────────────────────────────

func TestBatchWriter_Len(t *testing.T) {
	t.Parallel()

	bw, _ := newTestBatchWriter(t)
	ctx := context.Background()

	assert.Equal(t, 0, bw.Len())

	_ = bw.Write(ctx, testEvent("ev-1"))
	assert.Equal(t, 1, bw.Len())

	_ = bw.Write(ctx, testEvent("ev-2"))
	assert.Equal(t, 2, bw.Len())
}

// ─── BatchWriter Start / Stop (integration only — requires ClickHouse) ─────

func TestBatchWriter_Start_Stop_Integration(t *testing.T) {
	skipIfNoClickHouse(t)
	t.Parallel()

	bw, _ := newTestBatchWriter(t)
	ctx, cancel := context.WithCancel(context.Background())

	// Start the background goroutine
	bw.Start(ctx)
	assert.False(t, bw.closed)

	// Write some events
	for i := 0; i < 3; i++ {
		err := bw.Write(context.Background(), testEvent("ev-"+string(rune('0'+i))))
		require.NoError(t, err)
	}

	// Cancel the context to trigger graceful shutdown (which does a final flush)
	cancel()
	time.Sleep(50 * time.Millisecond)

	err := bw.Close(context.Background())
	require.NoError(t, err)
	assert.True(t, bw.closed)
}

func TestBatchWriter_Start_TimerFlush_Integration(t *testing.T) {
	skipIfNoClickHouse(t)
	t.Parallel()

	bw, _ := newTestBatchWriter(t)
	bw.flushEvery = 50 * time.Millisecond

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	bw.Start(ctx)

	for i := 0; i < 4; i++ {
		err := bw.Write(context.Background(), testEvent("ev-"+string(rune('0'+i))))
		require.NoError(t, err)
	}

	// Wait for timer to flush
	time.Sleep(150 * time.Millisecond)

	remaining := bw.Len()
	t.Logf("remaining buffer after timer: %d (expected 0 if flush succeeded)", remaining)

	cancel()
	_ = bw.Close(context.Background())
}

// ─── BatchWriter Option functions ──────────────────────────────────────────

func TestWithBatchSize(t *testing.T) {
	t.Parallel()

	cfg := ClickHouseConfig{Addrs: []string{"localhost:9000"}, Database: "test"}
	store := &ClickHouseEvalEventStore{cfg: cfg, logger: slog.New(slog.DiscardHandler)}
	bw := NewBatchWriter(store, WithBatchSize(500))
	assert.Equal(t, 500, bw.batchSize)
}

func TestWithFlushInterval(t *testing.T) {
	t.Parallel()

	cfg := ClickHouseConfig{Addrs: []string{"localhost:9000"}, Database: "test"}
	store := &ClickHouseEvalEventStore{cfg: cfg, logger: slog.New(slog.DiscardHandler)}
	bw := NewBatchWriter(store, WithFlushInterval(5*time.Second))
	assert.Equal(t, 5*time.Second, bw.flushEvery)
}

func TestWithMaxRetries(t *testing.T) {
	t.Parallel()

	cfg := ClickHouseConfig{Addrs: []string{"localhost:9000"}, Database: "test"}
	store := &ClickHouseEvalEventStore{cfg: cfg, logger: slog.New(slog.DiscardHandler)}
	bw := NewBatchWriter(store, WithMaxRetries(5))
	assert.Equal(t, 5, bw.maxRetries)
}

func TestWithRetryBackoff(t *testing.T) {
	t.Parallel()

	cfg := ClickHouseConfig{Addrs: []string{"localhost:9000"}, Database: "test"}
	store := &ClickHouseEvalEventStore{cfg: cfg, logger: slog.New(slog.DiscardHandler)}
	bw := NewBatchWriter(store, WithRetryBackoff(500*time.Millisecond))
	assert.Equal(t, 500*time.Millisecond, bw.retryBackoff)
}
