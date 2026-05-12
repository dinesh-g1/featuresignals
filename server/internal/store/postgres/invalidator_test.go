package postgres

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
)

// pgTestPool returns a connection pool for integration tests. If
// TEST_DATABASE_URL is not set, the test is skipped.
func pgTestPool(t *testing.T) *pgxpool.Pool {
	t.Helper()
	dsn := os.Getenv("TEST_DATABASE_URL")
	if dsn == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping integration test")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, dsn)
	if err != nil {
		t.Fatalf("failed to connect to test database: %v", err)
	}
	t.Cleanup(pool.Close)
	return pool
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelWarn}))
}

func TestPGInvalidator_InvalidateAndReceive(t *testing.T) {
	pool := pgTestPool(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	inv := NewPGInvalidator(pool, testLogger())
	defer inv.Close()

	var mu sync.Mutex
	var received []string

	// Subscribe in a goroutine
	subErr := make(chan error, 1)
	go func() {
		subErr <- inv.Subscribe(ctx, ChannelFlagChanges, func(_ context.Context, channel string, payload []byte) {
			mu.Lock()
			received = append(received, string(payload))
			mu.Unlock()
		})
	}()

	// Give the subscriber time to establish LISTEN
	time.Sleep(100 * time.Millisecond)

	// Publish a notification
	payload := map[string]string{
		"flag_id": "f1",
		"env_id":  "env-1",
		"action":  "UPDATE",
	}
	data, _ := json.Marshal(payload)
	if err := inv.Invalidate(ctx, ChannelFlagChanges, data); err != nil {
		t.Fatalf("Invalidate failed: %v", err)
	}

	// Give the notification time to propagate
	time.Sleep(100 * time.Millisecond)

	mu.Lock()
	count := len(received)
	mu.Unlock()

	if count != 1 {
		t.Fatalf("expected 1 notification, got %d", count)
	}

	mu.Lock()
	got := received[0]
	mu.Unlock()

	var decoded map[string]string
	if err := json.Unmarshal([]byte(got), &decoded); err != nil {
		t.Fatalf("failed to unmarshal received payload: %v", err)
	}
	if decoded["flag_id"] != "f1" || decoded["env_id"] != "env-1" || decoded["action"] != "UPDATE" {
		t.Errorf("unexpected payload: %v", decoded)
	}

	// Cancel context to stop subscriber
	cancel()
	if err := <-subErr; err != nil && err != context.Canceled {
		t.Errorf("unexpected subscribe error: %v", err)
	}
}

func TestPGInvalidator_CloseIsIdempotent(t *testing.T) {
	pool := pgTestPool(t)
	inv := NewPGInvalidator(pool, testLogger())

	// First close should succeed
	if err := inv.Close(); err != nil {
		t.Fatalf("first Close failed: %v", err)
	}

	// Second close should be a no-op
	if err := inv.Close(); err != nil {
		t.Fatalf("second Close failed: %v", err)
	}
}

func TestPGInvalidator_InvalidateAfterClose(t *testing.T) {
	pool := pgTestPool(t)
	inv := NewPGInvalidator(pool, testLogger())
	inv.Close()

	err := inv.Invalidate(context.Background(), ChannelFlagChanges, []byte("test"))
	if err == nil {
		t.Error("expected error when invalidating after close")
	}
}

func TestPGInvalidator_SubscribeAfterClose(t *testing.T) {
	pool := pgTestPool(t)
	inv := NewPGInvalidator(pool, testLogger())
	inv.Close()

	err := inv.Subscribe(context.Background(), ChannelFlagChanges, func(_ context.Context, _ string, _ []byte) {})
	if err == nil {
		t.Error("expected error when subscribing after close")
	}
}

func TestPGInvalidator_ListenForChanges_Bridge(t *testing.T) {
	pool := pgTestPool(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	inv := NewPGInvalidator(pool, testLogger())
	defer inv.Close()

	var mu sync.Mutex
	var received string

	go func() {
		_ = inv.ListenForChanges(ctx, func(payload string) {
			mu.Lock()
			received = payload
			mu.Unlock()
		})
	}()

	time.Sleep(100 * time.Millisecond)

	payload := map[string]string{
		"flag_id": "f1",
		"env_id":  "env-1",
		"action":  "UPDATE",
	}
	data, _ := json.Marshal(payload)
	if err := inv.Invalidate(ctx, ChannelFlagChanges, data); err != nil {
		t.Fatalf("Invalidate failed: %v", err)
	}

	time.Sleep(100 * time.Millisecond)

	mu.Lock()
	got := received
	mu.Unlock()

	if got == "" {
		t.Fatal("expected payload via ListenForChanges bridge")
	}
}

func TestPGInvalidator_MultipleChannels(t *testing.T) {
	pool := pgTestPool(t)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	inv := NewPGInvalidator(pool, testLogger())
	defer inv.Close()

	var mu sync.Mutex
	received := make(map[string][]string)

	// Subscribe to two channels
	go func() {
		_ = inv.Subscribe(ctx, "flag_changes", func(_ context.Context, channel string, payload []byte) {
			mu.Lock()
			received[channel] = append(received[channel], string(payload))
			mu.Unlock()
		})
	}()

	go func() {
		_ = inv.Subscribe(ctx, "segment_changes", func(_ context.Context, channel string, payload []byte) {
			mu.Lock()
			received[channel] = append(received[channel], string(payload))
			mu.Unlock()
		})
	}()

	time.Sleep(100 * time.Millisecond)

	// Publish to first channel
	inv.Invalidate(ctx, "flag_changes", []byte(`{"type":"flag"}`))
	time.Sleep(50 * time.Millisecond)

	// Publish to second channel
	inv.Invalidate(ctx, "segment_changes", []byte(`{"type":"segment"}`))
	time.Sleep(50 * time.Millisecond)

	mu.Lock()
	flagCount := len(received["flag_changes"])
	segCount := len(received["segment_changes"])
	mu.Unlock()

	if flagCount != 1 {
		t.Errorf("expected 1 flag_changes message, got %d", flagCount)
	}
	if segCount != 1 {
		t.Errorf("expected 1 segment_changes message, got %d", segCount)
	}
}
