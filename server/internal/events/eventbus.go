// Package events provides event infrastructure for FeatureSignals.
// This file implements no-op and logging variants of the domain.EventBus
// interface for single-instance deployments and development.
package events

import (
	"context"
	"log/slog"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── No-op EventBus ────────────────────────────────────────────────────────

// NoopEventBus implements domain.EventBus with no external dependencies.
// Publish and Request are no-ops (they succeed silently). Subscribe
// returns a subscription that never delivers messages. Close is a no-op.
//
// Use NoopEventBus for single-instance deployments where cross-service
// messaging is unnecessary, or in tests.
type NoopEventBus struct {
	logger *slog.Logger
	mu     sync.Mutex
	closed bool
}

// NewNoopEventBus creates a no-op EventBus that logs all operations at
// debug level.
func NewNoopEventBus(logger *slog.Logger) *NoopEventBus {
	return &NoopEventBus{
		logger: logger.With("component", "noop_eventbus"),
	}
}

func (b *NoopEventBus) Publish(_ context.Context, env *domain.EventEnvelope) error {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed {
		return domain.ErrEventBusClosed
	}
	b.logger.Debug("noop publish", "subject", env.Subject, "id", env.ID)
	return nil
}

func (b *NoopEventBus) Subscribe(_ context.Context, subject string, consumerGroup string, _ domain.EventHandler) (domain.EventSubscription, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed {
		return nil, domain.ErrEventBusClosed
	}
	b.logger.Debug("noop subscribe", "subject", subject, "consumer_group", consumerGroup)
	return &noopEventSubscription{}, nil
}

func (b *NoopEventBus) Request(ctx context.Context, env *domain.EventEnvelope, timeout time.Duration) (*domain.EventEnvelope, error) {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed {
		return nil, domain.ErrEventBusClosed
	}
	b.logger.Debug("noop request", "subject", env.Subject, "id", env.ID, "timeout", timeout)
	return nil, nil
}

func (b *NoopEventBus) Close() error {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.closed = true
	b.logger.Debug("noop close")
	return nil
}

type noopEventSubscription struct{}

func (s *noopEventSubscription) Unsubscribe() error { return nil }

// ─── Logging EventBus (decorator) ──────────────────────────────────────────

// LoggingEventBus wraps a domain.EventBus and logs every Publish, Subscribe,
// and Request at debug level. Useful for development and debugging.
type LoggingEventBus struct {
	inner  domain.EventBus
	logger *slog.Logger
}

// NewLoggingEventBus wraps inner with logging. Pass a NoopEventBus as inner
// for development environments where no real broker is available.
func NewLoggingEventBus(inner domain.EventBus, logger *slog.Logger) *LoggingEventBus {
	return &LoggingEventBus{
		inner:  inner,
		logger: logger.With("component", "logging_eventbus"),
	}
}

func (b *LoggingEventBus) Publish(ctx context.Context, env *domain.EventEnvelope) error {
	b.logger.Debug("publish",
		"subject", env.Subject,
		"id", env.ID,
		"tenant_id", env.TenantID,
		"payload_len", len(env.Payload),
	)
	return b.inner.Publish(ctx, env)
}

func (b *LoggingEventBus) Subscribe(ctx context.Context, subject string, consumerGroup string, handler domain.EventHandler) (domain.EventSubscription, error) {
	b.logger.Debug("subscribe",
		"subject", subject,
		"consumer_group", consumerGroup,
	)
	return b.inner.Subscribe(ctx, subject, consumerGroup, handler)
}

func (b *LoggingEventBus) Request(ctx context.Context, env *domain.EventEnvelope, timeout time.Duration) (*domain.EventEnvelope, error) {
	b.logger.Debug("request",
		"subject", env.Subject,
		"id", env.ID,
		"timeout", timeout,
	)
	return b.inner.Request(ctx, env, timeout)
}

func (b *LoggingEventBus) Close() error {
	b.logger.Debug("close")
	return b.inner.Close()
}
