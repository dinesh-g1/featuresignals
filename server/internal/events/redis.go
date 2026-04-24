// Package events provides Redis Pub/Sub for cross-instance communication.
//
// The package defines a RedisClient interface that can be satisfied by any
// Redis driver (go-redis, redigo, etc.) or a no-op implementation for
// environments where Redis is not available. This keeps the package
// dependency-free — the actual Redis driver is wired in main.go.
package events

import (
	"context"
	"encoding/json"
	"log/slog"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/retry"
)

// ─── Channel name ───────────────────────────────────────────────────────────

// RulesetChannel is the Redis Pub/Sub channel for ruleset update notifications.
const RulesetChannel = "ruleset:updates"

// ─── Event types ─────────────────────────────────────────────────────────────

// RulesetEventType enumerates the kinds of ruleset changes.
type RulesetEventType string

const (
	RulesetUpdated RulesetEventType = "ruleset_updated"
	FlagToggled    RulesetEventType = "flag_toggled"
	FlagDeleted    RulesetEventType = "flag_deleted"
)

// RulesetEvent is the event payload published when a ruleset is updated.
type RulesetEvent struct {
	OrgID     string           `json:"org_id"`
	ProjectID string           `json:"project_id"`
	EnvID     string           `json:"env_id"`
	UpdatedAt int64            `json:"updated_at"` // Unix timestamp
	Type      RulesetEventType `json:"type"`       // "ruleset_updated" | "flag_toggled" | "flag_deleted"
	FlagKey   string           `json:"flag_key,omitempty"`
}

// ─── Pluggable Redis interfaces ──────────────────────────────────────────────

// RedisClient defines the Redis operations needed by the events package.
// Implementations must be safe for concurrent use.
type RedisClient interface {
	// Publish publishes a message to a channel. message is marshalled as JSON.
	Publish(ctx context.Context, channel string, message any) error

	// Subscribe subscribes to one or more channels. Returns a subscription
	// from which messages can be received.
	Subscribe(ctx context.Context, channels ...string) (RedisSubscription, error)

	// Close closes the client and releases any resources.
	Close() error
}

// RedisSubscription represents an active subscription to Redis channels.
type RedisSubscription interface {
	// Channel returns a read-only channel of incoming messages. The channel
	// is closed when the subscription is closed or the underlying connection
	// is lost.
	Channel() <-chan *RedisMessage

	// Close unsubscribes and releases the subscription.
	Close() error
}

// RedisMessage represents a single Pub/Sub message received from Redis.
type RedisMessage struct {
	Channel string
	Pattern string
	Payload []byte
}

// ─── No-op implementation (for builds without a Redis driver) ────────────────

// NoopRedisClient implements RedisClient with logging only. It satisfies the
// interface so the package compiles without a Redis driver. All publish
// operations are logged at debug level and discarded; subscribe returns an
// empty subscription that never delivers messages.
type NoopRedisClient struct {
	logger *slog.Logger
}

// NewNoopRedisClient returns a NoopRedisClient that logs all operations.
func NewNoopRedisClient(logger *slog.Logger) *NoopRedisClient {
	return &NoopRedisClient{logger: logger.With("component", "noop_redis")}
}

func (c *NoopRedisClient) Publish(_ context.Context, channel string, message any) error {
	c.logger.Debug("noop publish", "channel", channel, "message", message)
	return nil
}

func (c *NoopRedisClient) Subscribe(_ context.Context, channels ...string) (RedisSubscription, error) {
	c.logger.Debug("noop subscribe", "channels", channels)
	return &noopSubscription{}, nil
}

func (c *NoopRedisClient) Close() error {
	c.logger.Debug("noop close")
	return nil
}

type noopSubscription struct {
	ch chan *RedisMessage
}

func (s *noopSubscription) Channel() <-chan *RedisMessage {
	if s.ch == nil {
		s.ch = make(chan *RedisMessage)
		close(s.ch) // immediately closed — never delivers
	}
	return s.ch
}

func (s *noopSubscription) Close() error { return nil }

// ─── RedisPublisher ──────────────────────────────────────────────────────────

// RedisPublisher publishes RulesetEvents to Redis Pub/Sub for cross-instance
// flag cache invalidation. It wraps a RedisClient and provides typed publish
// methods.
type RedisPublisher struct {
	client RedisClient
	channel string
	logger  *slog.Logger
}

// NewRedisPublisher creates a RedisPublisher. If client is nil, a no-op
// client is used and all publishes are logged but discarded.
func NewRedisPublisher(client RedisClient, channel string, logger *slog.Logger) *RedisPublisher {
	if client == nil {
		client = NewNoopRedisClient(logger)
	}
	if channel == "" {
		channel = RulesetChannel
	}
	return &RedisPublisher{
		client:  client,
		channel: channel,
		logger:  logger.With("component", "redis_publisher"),
	}
}

// PublishRulesetUpdate marshals the event to JSON and publishes it to the
// configured Redis channel.
func (p *RedisPublisher) PublishRulesetUpdate(ctx context.Context, event RulesetEvent) error {
	data, err := json.Marshal(event)
	if err != nil {
		return err
	}
	if err := p.client.Publish(ctx, p.channel, string(data)); err != nil {
		return err
	}
	p.logger.Debug("published ruleset update",
		"org_id", event.OrgID,
		"project_id", event.ProjectID,
		"env_id", event.EnvID,
		"type", event.Type,
		"flag_key", event.FlagKey,
	)
	return nil
}

// Close releases the underlying Redis client.
func (p *RedisPublisher) Close() error {
	return p.client.Close()
}

// ─── RedisSubscriber ─────────────────────────────────────────────────────────

const (
	subscribeRetryBase = 1 * time.Second
	subscribeRetryCap  = 30 * time.Second
	subscribeMaxRetry  = -1 // retry indefinitely
)

// RedisSubscriber subscribes to Redis Pub/Sub for ruleset updates and invokes
// a callback for each received event. It handles reconnection with exponential
// backoff.
type RedisSubscriber struct {
	clientFn func() (RedisClient, error)
	channel  string
	logger   *slog.Logger

	mu     sync.Mutex
	sub    RedisSubscription
	closed bool
}

// NewRedisSubscriber creates a RedisSubscriber. The clientFn is called to
// obtain a fresh RedisClient on initial connect and on reconnection.
func NewRedisSubscriber(clientFn func() (RedisClient, error), channel string, logger *slog.Logger) *RedisSubscriber {
	if channel == "" {
		channel = RulesetChannel
	}
	return &RedisSubscriber{
		clientFn: clientFn,
		channel:  channel,
		logger:   logger.With("component", "redis_subscriber"),
	}
}

// Listen subscribes to the configured channel and calls callback for every
// received RulesetEvent. It blocks until ctx is cancelled or an unrecoverable
// error occurs. On connection loss, it retries with exponential backoff.
func (s *RedisSubscriber) Listen(ctx context.Context, callback func(RulesetEvent)) error {
	for attempt := 1; ; attempt++ {
		select {
		case <-ctx.Done():
			return ctx.Err()
		default:
		}

		if err := s.connectAndListen(ctx, callback); err != nil {
			if ctx.Err() != nil {
				return ctx.Err()
			}
			s.logger.Error("subscription error, reconnecting",
				"error", err,
				"attempt", attempt,
			)
			if subscribeMaxRetry > 0 && attempt >= subscribeMaxRetry {
				return err
			}
			backoff := retry.JitteredBackoff(attempt, subscribeRetryBase, retry.DefaultFactor, subscribeRetryCap)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(backoff):
			}
		}
	}
}

func (s *RedisSubscriber) connectAndListen(ctx context.Context, callback func(RulesetEvent)) error {
	client, err := s.clientFn()
	if err != nil {
		return err
	}
	defer client.Close()

	sub, err := client.Subscribe(ctx, s.channel)
	if err != nil {
		return err
	}

	s.mu.Lock()
	if s.closed {
		s.mu.Unlock()
		sub.Close()
		return nil
	}
	s.sub = sub
	s.mu.Unlock()

	s.logger.Info("subscribed to ruleset updates", "channel", s.channel)

	ch := sub.Channel()
	for {
		select {
		case <-ctx.Done():
			return ctx.Err()
		case msg, ok := <-ch:
			if !ok {
				// Channel closed — connection lost
				return nil
			}
			if msg == nil {
				continue
			}
			s.handleMessage(msg.Payload, callback)
		}
	}
}

func (s *RedisSubscriber) handleMessage(payload []byte, callback func(RulesetEvent)) {
	var event RulesetEvent
	if err := json.Unmarshal(payload, &event); err != nil {
		s.logger.Error("failed to unmarshal ruleset event",
			"error", err,
			"payload", string(payload),
		)
		return
	}
	if event.Type == "" || event.OrgID == "" {
		s.logger.Warn("received malformed ruleset event (missing type or org_id)",
			"payload", string(payload),
		)
		return
	}
	s.logger.Debug("received ruleset update",
		"org_id", event.OrgID,
		"project_id", event.ProjectID,
		"env_id", event.EnvID,
		"type", event.Type,
		"flag_key", event.FlagKey,
	)
	callback(event)
}

// Close terminates the active subscription. It does not close the underlying
// client — that is owned by the caller who created the clientFn.
func (s *RedisSubscriber) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.closed = true
	if s.sub != nil {
		return s.sub.Close()
	}
	return nil
}