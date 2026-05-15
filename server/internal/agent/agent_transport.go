// Package agent provides the Agent Runtime implementation.
//
// InMemoryAgentTransport implements a simple in-memory transport for
// IAP messages using Go channels. It is suitable for testing and
// single-instance development where NATS is not available.
package agent

import (
	"context"
	"fmt"
	"log/slog"
	"sync"

	"github.com/featuresignals/server/internal/domain"
)

// InMemoryAgentTransport implements a channel-based agent message transport.
// Messages are delivered to all registered handlers. It is safe for
// concurrent use (multiple senders, single receiver pattern).
type InMemoryAgentTransport struct {
	mu       sync.RWMutex
	handlers map[domain.AgentMessageType][]AgentMessageHandler
	buffer   int
	closed   bool
	logger   *slog.Logger
}

// AgentMessageHandler is a callback for received agent messages.
type AgentMessageHandler func(ctx context.Context, msg *domain.AgentMessage) error

// NewInMemoryAgentTransport creates a new in-memory transport with the given
// buffer size for the message channel.
func NewInMemoryAgentTransport(logger *slog.Logger, buffer int) *InMemoryAgentTransport {
	if buffer <= 0 {
		buffer = 256
	}
	return &InMemoryAgentTransport{
		handlers: make(map[domain.AgentMessageType][]AgentMessageHandler),
		buffer:   buffer,
		logger:   logger.With("component", "inmemory_agent_transport"),
	}
}

// Send delivers a message to all handlers registered for the message type.
// It is non-blocking — if a handler's buffer is full, the message is dropped
// and logged at WARN level.
func (t *InMemoryAgentTransport) Send(ctx context.Context, msg *domain.AgentMessage) error {
	t.mu.RLock()
	defer t.mu.RUnlock()

	if t.closed {
		return fmt.Errorf("transport closed")
	}

	handlers, ok := t.handlers[msg.Type]
	if !ok || len(handlers) == 0 {
		t.logger.Debug("no handlers for message type",
			"type", string(msg.Type),
			"id", msg.ID,
		)
		return nil
	}

	for _, h := range handlers {
		if err := h(ctx, msg); err != nil {
			t.logger.Warn("handler returned error",
				"type", string(msg.Type),
				"id", msg.ID,
				"error", err,
			)
		}
	}

	return nil
}

// RegisterHandler registers a handler for a specific message type.
// Multiple handlers can be registered for the same type; all are called.
func (t *InMemoryAgentTransport) RegisterHandler(msgType domain.AgentMessageType, handler AgentMessageHandler) {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.handlers[msgType] = append(t.handlers[msgType], handler)
	t.logger.Debug("handler registered", "type", string(msgType))
}

// Close marks the transport as closed and clears all handlers.
func (t *InMemoryAgentTransport) Close() error {
	t.mu.Lock()
	defer t.mu.Unlock()
	t.closed = true
	t.handlers = nil
	t.logger.Debug("transport closed")
	return nil
}
