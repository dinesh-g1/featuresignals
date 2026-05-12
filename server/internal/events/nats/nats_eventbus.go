// Package nats provides a NATS-backed implementation of domain.EventBus.
//
// The NATSEventBus wraps a NATS connection and implements the full
// EventBus interface: Publish (pub), Subscribe (sub with consumer groups
// via queue subscriptions), and Request (request/reply).
//
// Usage:
//
//	nc, _ := nats.Connect("nats://localhost:4222")
//	bus := nats.NewNATSEventBus(nc, logger)
//	defer bus.Close()
//
//	sub, _ := bus.Subscribe(ctx, "eval.flag.toggled", "billing-consumer", handler)
//	bus.Publish(ctx, &domain.EventEnvelope{Subject: "eval.flag.toggled", Payload: data})
package nats

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/nats-io/nats.go"

	"github.com/featuresignals/server/internal/domain"
)

// NATSEventBus implements domain.EventBus using NATS as the message broker.
// It is safe for concurrent use. A single NATSEventBus manages a single
// NATS connection; for clustered deployments, each instance creates its
// own NATSEventBus connected to the NATS cluster.
type NATSEventBus struct {
	conn   *nats.Conn
	logger *slog.Logger

	mu     sync.Mutex
	subs   map[string]*nats.Subscription // subject:consumerGroup → subscription
	closed bool
}

// NewNATSEventBus creates a NATS-backed EventBus. The connection must be
// already established; the bus does not manage connection lifecycle beyond
// closing it on Shutdown. Pass nil logger for silent operation.
func NewNATSEventBus(conn *nats.Conn, logger *slog.Logger) *NATSEventBus {
	if logger == nil {
		logger = slog.New(slog.NewTextHandler(nil, nil)) // discard
	}
	return &NATSEventBus{
		conn:   conn,
		logger: logger.With("component", "nats_eventbus"),
		subs:   make(map[string]*nats.Subscription),
	}
}

// Publish sends a message to the given subject. It marshals the envelope
// to JSON and publishes it on the NATS subject.
func (b *NATSEventBus) Publish(ctx context.Context, env *domain.EventEnvelope) error {
	b.mu.Lock()
	if b.closed {
		b.mu.Unlock()
		return domain.ErrEventBusClosed
	}
	b.mu.Unlock()

	if env.ID == "" {
		env.ID = uuid.NewString()
	}
	if env.Timestamp.IsZero() {
		env.Timestamp = time.Now().UTC()
	}
	subject := env.Subject
	env.Subject = "" // subject is carried by NATS, not the envelope

	data, err := json.Marshal(env)
	if err != nil {
		return fmt.Errorf("nats publish: marshal envelope: %w", err)
	}

	if err := b.conn.Publish(subject, data); err != nil {
		return fmt.Errorf("nats publish: %w", err)
	}

	b.logger.Debug("published",
		"subject", subject,
		"id", env.ID,
		"payload_len", len(env.Payload),
	)
	return nil
}

// Subscribe registers a handler for messages on the given subject.
// If consumerGroup is non-empty, NATS queue subscriptions are used for
// load-balanced delivery (competing consumers). If empty, every subscriber
// receives every message (fan-out).
func (b *NATSEventBus) Subscribe(ctx context.Context, subject string, consumerGroup string, handler domain.EventHandler) (domain.EventSubscription, error) {
	b.mu.Lock()
	if b.closed {
		b.mu.Unlock()
		return nil, domain.ErrEventBusClosed
	}
	b.mu.Unlock()

	key := subKey(subject, consumerGroup)

	natsHandler := func(msg *nats.Msg) {
		var env domain.EventEnvelope
		if err := json.Unmarshal(msg.Data, &env); err != nil {
			b.logger.Error("failed to unmarshal event envelope",
				"subject", msg.Subject,
				"error", err,
			)
			return
		}
		// Carry the NATS subject into the envelope for handlers that need it
		if env.Subject == "" {
			env.Subject = msg.Subject
		}

		handlerCtx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
		defer cancel()

		if err := handler(handlerCtx, &env); err != nil {
			b.logger.Warn("event handler returned error",
				"subject", msg.Subject,
				"id", env.ID,
				"error", err,
			)
		}
	}

	var sub *nats.Subscription
	var err error

	if consumerGroup != "" {
		// Queue subscription: load-balanced across consumers in the group
		sub, err = b.conn.QueueSubscribe(subject, consumerGroup, natsHandler)
	} else {
		// Regular subscription: every subscriber gets every message
		sub, err = b.conn.Subscribe(subject, natsHandler)
	}

	if err != nil {
		return nil, fmt.Errorf("nats subscribe %s: %w", key, err)
	}

	b.mu.Lock()
	b.subs[key] = sub
	b.mu.Unlock()

	b.logger.Info("subscribed",
		"subject", subject,
		"consumer_group", consumerGroup,
	)

	return &natsEventSubscription{
		sub:    sub,
		key:    key,
		bus:    b,
		logger: b.logger,
	}, nil
}

// Request publishes a message and waits for a single response using NATS
// request/reply. The timeout bounds the wait.
func (b *NATSEventBus) Request(ctx context.Context, env *domain.EventEnvelope, timeout time.Duration) (*domain.EventEnvelope, error) {
	b.mu.Lock()
	if b.closed {
		b.mu.Unlock()
		return nil, domain.ErrEventBusClosed
	}
	b.mu.Unlock()

	if env.ID == "" {
		env.ID = uuid.NewString()
	}
	if env.Timestamp.IsZero() {
		env.Timestamp = time.Now().UTC()
	}

	data, err := json.Marshal(env)
	if err != nil {
		return nil, fmt.Errorf("nats request: marshal envelope: %w", err)
	}

	msg, err := b.conn.Request(env.Subject, data, timeout)
	if err != nil {
		return nil, fmt.Errorf("nats request %s: %w", env.Subject, err)
	}

	var resp domain.EventEnvelope
	if err := json.Unmarshal(msg.Data, &resp); err != nil {
		return nil, fmt.Errorf("nats request: unmarshal response: %w", err)
	}

	return &resp, nil
}

// Close drains subscriptions and closes the NATS connection. It is idempotent.
func (b *NATSEventBus) Close() error {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.closed {
		return nil
	}
	b.closed = true

	var errs []error
	for key, sub := range b.subs {
		if err := sub.Unsubscribe(); err != nil {
			errs = append(errs, fmt.Errorf("unsubscribe %s: %w", key, err))
		}
	}
	b.subs = nil

	b.conn.Close()

	b.logger.Info("nats event bus closed")
	if len(errs) > 0 {
		return fmt.Errorf("nats close errors: %v", errs)
	}
	return nil
}

// ─── Subscription handle ───────────────────────────────────────────────────

type natsEventSubscription struct {
	sub    *nats.Subscription
	key    string
	bus    *NATSEventBus
	logger *slog.Logger
}

func (s *natsEventSubscription) Unsubscribe() error {
	if err := s.sub.Unsubscribe(); err != nil {
		return fmt.Errorf("nats unsubscribe %s: %w", s.key, err)
	}

	s.bus.mu.Lock()
	delete(s.bus.subs, s.key)
	s.bus.mu.Unlock()

	s.logger.Debug("unsubscribed", "key", s.key)
	return nil
}

// ─── Helpers ────────────────────────────────────────────────────────────────

func subKey(subject, consumerGroup string) string {
	if consumerGroup == "" {
		return subject
	}
	return subject + ":" + consumerGroup
}
