package events

import (
	"log/slog"
	"os"
	"testing"

	"github.com/featuresignals/server/internal/config"
	"github.com/featuresignals/server/internal/domain"
)

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
}

func TestNewEventBus_Noop(t *testing.T) {
	cfg := &config.Config{EventBusProvider: "noop"}
	bus, cleanup, err := NewEventBus(cfg, testLogger())
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
	_, _, err := NewEventBus(cfg, testLogger())
	if err == nil {
		t.Fatal("expected error for unknown provider, got nil")
	}
}

func TestNewEventBus_NoopClose(t *testing.T) {
	cfg := &config.Config{EventBusProvider: "noop"}
	bus, cleanup, err := NewEventBus(cfg, testLogger())
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
