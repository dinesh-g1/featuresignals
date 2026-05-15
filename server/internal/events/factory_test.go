// Package events provides event bus implementations for FeatureSignals.
//
// Tests for the event bus factory and the NATS event bus adapter.
package events

import (
	"context"
	"log/slog"
	"os"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/domain"
)

// ─── Factory Tests ──────────────────────────────────────────────────────────

func TestNewEventBus_Noop(t *testing.T) {
	cfg := &config.Config{EventBusProvider: "noop"}
	bus, cleanup, err := NewEventBus(cfg, testLogger(), nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if cleanup == nil {
		t.Fatal("expected cleanup function, got nil")
	}
	if bus == nil {
		t.Fatal("expected non-nil bus")
	}

	// Verify it behaves correctly
	if err := bus.Publish(nil, &domain.EventEnvelope{Subject: "test", ID: "1"}); err != nil {
		t.Errorf("expected no error from Publish, got %v", err)
	}

	cleanup()
}

func TestNewEventBus_UnknownProvider(t *testing.T) {
	cfg := &config.Config{EventBusProvider: "kafka"}
	_, _, err := NewEventBus(cfg, testLogger(), nil)
	if err == nil {
		t.Fatal("expected error for unknown provider, got nil")
	}
	if !strings.Contains(err.Error(), "unknown EVENT_BUS_PROVIDER") {
		t.Errorf("expected 'unknown EVENT_BUS_PROVIDER' in error, got: %v", err)
	}
}

func TestNewEventBus_NoopClose(t *testing.T) {
	cfg := &config.Config{EventBusProvider: "noop"}
	bus, cleanup, err := NewEventBus(cfg, testLogger(), nil)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}

	// Close should be idempotent
	if err := bus.Close(); err != nil {
		t.Errorf("expected no error on first Close, got %v", err)
	}
	if err := bus.Close(); err != nil {
		t.Errorf("expected no error on second Close, got %v", err)
	}

	// After close, publish should return ErrEventBusClosed
	if err := bus.Publish(nil, &domain.EventEnvelope{Subject: "test"}); err != domain.ErrEventBusClosed {
		t.Errorf("expected ErrEventBusClosed, got %v", err)
	}

	_ = cleanup
}

func TestNewEventBus_NATS_WithInvalidURL(t *testing.T) {
	// NATS client retries connections, so an invalid URL won't error
	// immediately. Instead test that the factory returns a bus (it will
	// attempt to connect in the background via NATS reconnect logic).
	cfg := &config.Config{
		EventBusProvider: "nats",
		NATSURL:          "nats://invalid-host:99999",
	}
	bus, cleanup, err := NewEventBus(cfg, testLogger(), nil)
	if err != nil {
		t.Fatalf("factory should not error on invalid URL (NATS retries): %v", err)
	}
	if bus == nil {
		t.Fatal("expected non-nil bus even with invalid URL")
	}
	cleanup()
}

func TestNewEventBus_NATS_Integration(t *testing.T) {
	// Only run integration test if NATS_URL is explicitly set
	natsURL := os.Getenv("TEST_NATS_URL")
	if natsURL == "" {
		t.Skip("TEST_NATS_URL not set — skipping NATS integration test")
	}

	cfg := &config.Config{
		EventBusProvider: "nats",
		NATSURL:          natsURL,
	}

	bus, cleanup, err := NewEventBus(cfg, testLogger(), nil)
	if err != nil {
		t.Fatalf("failed to create NATS event bus: %v", err)
	}
	defer cleanup()

	// Test Publish
	env := &domain.EventEnvelope{
		Subject: "test.ping",
		Payload: []byte(`{"msg":"hello"}`),
	}
	if err := bus.Publish(context.Background(), env); err != nil {
		t.Errorf("publish failed: %v", err)
	}
	if env.ID == "" {
		t.Error("expected event ID to be set")
	}
	if env.Timestamp.IsZero() {
		t.Error("expected timestamp to be set")
	}

	// Test Subscribe + Publish (end-to-end)
	received := make(chan *domain.EventEnvelope, 1)
	sub, err := bus.Subscribe(context.Background(), "test.e2e", "test-group",
		func(ctx context.Context, e *domain.EventEnvelope) error {
			received <- e
			return nil
		},
	)
	if err != nil {
		t.Fatalf("subscribe failed: %v", err)
	}
	defer sub.Unsubscribe()

	// Publish a message
	e2eEnv := &domain.EventEnvelope{
		Subject: "test.e2e",
		Payload: []byte(`{"data":"e2e-test"}`),
	}
	if err := bus.Publish(context.Background(), e2eEnv); err != nil {
		t.Fatalf("publish failed: %v", err)
	}

	// Wait for delivery
	select {
	case receivedEnv := <-received:
		if receivedEnv.Subject == "" {
			t.Error("expected subject to be set on received envelope")
		}
		if string(receivedEnv.Payload) != `{"data":"e2e-test"}` {
			t.Errorf("unexpected payload: %s", string(receivedEnv.Payload))
		}
	case <-time.After(5 * time.Second):
		t.Fatal("timed out waiting for message delivery")
	}

	// Test Close
	if err := bus.Close(); err != nil {
		t.Errorf("close failed: %v", err)
	}

	// After close, publish should error
	if err := bus.Publish(context.Background(), &domain.EventEnvelope{Subject: "test.afterclose"}); err == nil {
		t.Error("expected error after close, got nil")
	}
}

// ─── NoopEventBus Tests ─────────────────────────────────────────────────────

func TestNoopEventBus_SubscribeReturnsNoopSubscription(t *testing.T) {
	bus := NewNoopEventBus(testLogger())

	sub, err := bus.Subscribe(context.Background(), "test.subject", "group", func(ctx context.Context, env *domain.EventEnvelope) error {
		return nil
	})
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	if sub == nil {
		t.Fatal("expected non-nil subscription")
	}

	// Unsubscribe should not error
	if err := sub.Unsubscribe(); err != nil {
		t.Errorf("unsubscribe failed: %v", err)
	}
}

func TestNoopEventBus_RequestSucceeds(t *testing.T) {
	bus := NewNoopEventBus(testLogger())

	env := &domain.EventEnvelope{Subject: "test.request"}
	resp, err := bus.Request(context.Background(), env, time.Second)
	if err != nil {
		t.Fatalf("expected no error, got %v", err)
	}
	// NoopEventBus returns nil response (no handler to reply)
	_ = resp
}

func TestNoopEventBus_ConcurrentAccess(t *testing.T) {
	bus := NewNoopEventBus(testLogger())

	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func(n int) {
			defer wg.Done()
			_ = bus.Publish(context.Background(), &domain.EventEnvelope{Subject: "test.concurrent"})
		}(i)
	}
	wg.Wait()
	// No race = pass
}

// ─── LoggingEventBus Tests ──────────────────────────────────────────────────

func TestLoggingEventBus_WrapsDelegate(t *testing.T) {
	noop := NewNoopEventBus(testLogger())
	logged := NewLoggingEventBus(noop, testLogger())

	// Publish should delegate and not error
	if err := logged.Publish(context.Background(), &domain.EventEnvelope{Subject: "test.logged"}); err != nil {
		t.Errorf("expected no error, got %v", err)
	}

	// Subscribe should delegate
	sub, err := logged.Subscribe(context.Background(), "test.logged.sub", "", func(ctx context.Context, env *domain.EventEnvelope) error {
		return nil
	})
	if err != nil {
		t.Errorf("subscribe failed: %v", err)
	}
	_ = sub.Unsubscribe()

	// Request should delegate
	resp, err := logged.Request(context.Background(), &domain.EventEnvelope{Subject: "test.logged.req"}, time.Millisecond)
	if err != nil {
		t.Errorf("request failed: %v", err)
	}
	// NoopEventBus returns nil response (no handler to reply)
	_ = resp

	// Close should delegate
	if err := logged.Close(); err != nil {
		t.Errorf("close failed: %v", err)
	}
}

// ─── Helpers ────────────────────────────────────────────────────────────────

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
}
