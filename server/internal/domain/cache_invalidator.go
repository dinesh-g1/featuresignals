// Package domain defines the core business interfaces for FeatureSignals.
//
// CacheInvalidator is the port for cross-instance cache invalidation.
// It abstracts the mechanism (PG LISTEN/NOTIFY, Redis Pub/Sub, NATS, etc.)
// so that cache consumers never depend on a specific invalidation transport.
package domain

import "context"

// InvalidationHandler is called when a cache key should be invalidated.
// The handler receives the raw payload and the channel/topic it arrived on.
// Implementations must be safe for concurrent use and must not block
// the invalidation loop — offload heavy work to a goroutine.
type InvalidationHandler func(ctx context.Context, channel string, payload []byte)

// CacheInvalidator provides cross-instance cache invalidation.
// A nil implementation (no-op) is valid for single-instance deployments
// where cross-instance invalidation is unnecessary.
type CacheInvalidator interface {
	// Invalidate publishes an invalidation message for the given key.
	// The key format is implementation-defined; for flag caches it is
	// typically the environment ID whose ruleset has changed.
	Invalidate(ctx context.Context, channel string, payload []byte) error

	// Subscribe registers a handler for invalidation messages on the given
	// channel. It blocks until ctx is cancelled or an unrecoverable error
	// occurs. The implementation handles reconnection internally.
	Subscribe(ctx context.Context, channel string, handler InvalidationHandler) error

	// Close releases resources held by the invalidator. After Close,
	// Invalidate and Subscribe return errors. Close is idempotent.
	Close() error
}
