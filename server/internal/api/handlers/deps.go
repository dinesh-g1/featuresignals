package handlers

import (
	"context"
	"encoding/json"

	"github.com/featuresignals/server/internal/domain"
)

// LifecycleSender delivers lifecycle emails while respecting user preferences.
// Defined here so handlers don't import the lifecycle package directly.
type LifecycleSender interface {
	Send(ctx context.Context, userID string, msg domain.EmailMessage) error
}

// noopLifecycle is used when no lifecycle sender is configured.
type noopLifecycle struct{}

func (noopLifecycle) Send(context.Context, string, domain.EmailMessage) error { return nil }

// NoopLifecycle returns a lifecycle sender that silently discards all messages.
func NoopLifecycle() LifecycleSender { return noopLifecycle{} }

// noopEmitter is used when no event emitter is configured.
type noopEmitter struct{}

func (noopEmitter) Emit(context.Context, domain.ProductEvent) {}

// NoopEmitter returns an event emitter that silently discards all events.
func NoopEmitter() domain.EventEmitter { return noopEmitter{} }

func eventProps(kv map[string]string) json.RawMessage {
	b, err := json.Marshal(kv)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return b
}
