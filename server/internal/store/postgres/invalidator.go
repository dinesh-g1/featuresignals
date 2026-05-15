// Package postgres provides PostgreSQL-backed implementations of domain
// interfaces. This file implements the CacheInvalidator port using PostgreSQL
// LISTEN/NOTIFY for cross-instance cache invalidation.
package postgres

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/retry"
)

// Well-known NOTIFY channels for cache invalidation.
const (
	// ChannelFlagChanges is the PG NOTIFY channel for flag/segment changes.
	// Payload is JSON: {"flag_id":"...", "env_id":"...", "action":"..."}
	ChannelFlagChanges = "flag_changes"
)

// reconnect config for LISTEN connections.
const (
	listenReconnectBase  = 500 * time.Millisecond
	listenReconnectCap   = 30 * time.Second
	listenReconnectRetry = -1 // retry indefinitely
)

// PGInvalidator implements domain.CacheInvalidator using PostgreSQL
// LISTEN/NOTIFY. It uses a dedicated connection from the pool for LISTEN
// and reconnects transparently on connection loss.
//
// PGInvalidator is safe for concurrent use. Invalidate publishes NOTIFY
// on a random pool connection; Subscribe blocks on a dedicated LISTEN
// connection.
type PGInvalidator struct {
	pool   *pgxpool.Pool
	logger *slog.Logger

	mu      sync.Mutex
	subs    map[string]domain.InvalidationHandler // channel → handler
	closed  bool
	closeCh chan struct{}

	// handlerWg tracks in-flight handler goroutines so Close() can wait
	// for them to complete before returning (CLAUDE.md §2.1: no fire-and-forget).
	handlerWg sync.WaitGroup
}

// NewPGInvalidator creates a new PGInvalidator backed by the given pool.
func NewPGInvalidator(pool *pgxpool.Pool, logger *slog.Logger) *PGInvalidator {
	return &PGInvalidator{
		pool:    pool,
		logger:  logger.With("component", "pg_invalidator"),
		subs:    make(map[string]domain.InvalidationHandler),
		closeCh: make(chan struct{}),
	}
}

// Invalidate sends a NOTIFY on the given channel with the given payload.
// It acquires a connection from the pool, executes NOTIFY, and releases it.
func (p *PGInvalidator) Invalidate(ctx context.Context, channel string, payload []byte) error {
	p.mu.Lock()
	if p.closed {
		p.mu.Unlock()
		return errors.New("pg_invalidator: closed")
	}
	p.mu.Unlock()

	conn, err := p.pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("pg_invalidator: acquire conn for NOTIFY: %w", err)
	}
	defer conn.Release()

	_, err = conn.Exec(ctx, fmt.Sprintf("NOTIFY %s, $1", safeChannel(channel)), string(payload))
	if err != nil {
		return fmt.Errorf("pg_invalidator: NOTIFY %s: %w", channel, err)
	}

	p.logger.Debug("published invalidation",
		"channel", channel,
		"payload_len", len(payload),
	)
	return nil
}

// Subscribe registers a handler for invalidation messages on the given
// channel. It blocks until ctx is cancelled or Close is called. Subscribe
// handles reconnection internally with exponential backoff.
//
// Only one handler per channel is supported. Calling Subscribe again for
// the same channel replaces the handler.
func (p *PGInvalidator) Subscribe(ctx context.Context, channel string, handler domain.InvalidationHandler) error {
	p.mu.Lock()
	if p.closed {
		p.mu.Unlock()
		return errors.New("pg_invalidator: closed")
	}
	p.subs[channel] = handler
	p.mu.Unlock()

	return p.listenLoop(ctx, channel, handler)
}

// Close shuts down the invalidator. Active Subscribe calls will return
// when their context is cancelled. Close waits for in-flight handler
// goroutines to complete (per CLAUDE.md §2.1). Close is idempotent.
func (p *PGInvalidator) Close() error {
	p.mu.Lock()
	if p.closed {
		p.mu.Unlock()
		return nil
	}
	p.closed = true
	close(p.closeCh)
	p.mu.Unlock()

	// Wait for in-flight handler goroutines to drain.
	// We release the lock first so concurrent Invalidate/Subscribe
	// calls can fail fast on p.closed rather than blocking.
	p.handlerWg.Wait()
	return nil
}

// ─── Backward compatibility: domain.EvalStore.ListenForChanges ───────────

// ListenForChanges implements domain.EvalStore.ListenForChanges.
// It subscribes to the flag_changes channel and invokes the callback
// for each received payload. This exists for backward compatibility
// with the existing cache.StartListening method.
func (p *PGInvalidator) ListenForChanges(ctx context.Context, callback func(payload string)) error {
	handler := func(ctx context.Context, channel string, payload []byte) {
		callback(string(payload))
	}
	return p.Subscribe(ctx, ChannelFlagChanges, handler)
}

// ─── Internal listen loop ─────────────────────────────────────────────────

func (p *PGInvalidator) listenLoop(ctx context.Context, channel string, handler domain.InvalidationHandler) error {
	ch := safeChannel(channel)

	for attempt := 1; ; attempt++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case <-p.closeCh:
			return nil
		default:
		}

		if err := p.listenOnce(ctx, ch, handler); err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			select {
			case <-p.closeCh:
				return nil
			default:
			}

			p.logger.Error("LISTEN connection lost, reconnecting",
				"channel", channel,
				"error", err,
				"attempt", attempt,
			)

			if listenReconnectRetry > 0 && attempt >= listenReconnectRetry {
				return fmt.Errorf("pg_invalidator: max reconnect attempts reached for %s: %w", channel, err)
			}

			backoff := retry.JitteredBackoff(attempt, listenReconnectBase, retry.DefaultFactor, listenReconnectCap)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-p.closeCh:
				return nil
			case <-time.After(backoff):
			}
		}
	}
}

func (p *PGInvalidator) listenOnce(ctx context.Context, channel string, handler domain.InvalidationHandler) error {
	conn, err := p.pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("acquire LISTEN conn: %w", err)
	}
	defer conn.Release()

	_, err = conn.Exec(ctx, fmt.Sprintf("LISTEN %s", channel))
	if err != nil {
		return fmt.Errorf("LISTEN %s: %w", channel, err)
	}

	p.logger.Info("LISTEN started", "channel", channel)

	for {
		notification, err := conn.Conn().WaitForNotification(ctx)
		if err != nil {
			return fmt.Errorf("WaitForNotification on %s: %w", channel, err)
		}

		p.logger.Debug("received notification",
			"channel", notification.Channel,
			"payload_len", len(notification.Payload),
		)

		// Invoke handler in a goroutine to avoid blocking the LISTEN loop.
		// The handler receives a context derived from the listen loop's ctx
		// with a timeout. The goroutine lifecycle is tracked via handlerWg
		// so Close() can wait for completion (CLAUDE.md §2.1).
		handlerCtx, handlerCancel := context.WithTimeout(ctx, 5*time.Second)
		p.handlerWg.Add(1)
		go func() {
			defer handlerCancel()
			defer p.handlerWg.Done()
			handler(handlerCtx, notification.Channel, []byte(notification.Payload))
		}()
	}
}

// safeChannel returns a safe channel name, defaulting to ChannelFlagChanges
// if the provided channel is empty.
func safeChannel(channel string) string {
	if channel == "" {
		return ChannelFlagChanges
	}
	return channel
}
