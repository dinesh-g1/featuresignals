package provision

import (
	"sync"

	"github.com/featuresignals/server/internal/domain"
)

// EventBus provides a simple in-memory pub/sub mechanism for provisioning events.
// For multi-instance production deployments, replace with Redis pub/sub.
type EventBus struct {
	mu          sync.RWMutex
	subscribers map[string]map[chan *domain.ProvisionEvent]struct{}
}

// NewEventBus creates a new EventBus.
func NewEventBus() *EventBus {
	return &EventBus{
		subscribers: make(map[string]map[chan *domain.ProvisionEvent]struct{}),
	}
}

// Subscribe registers a channel to receive events for the given cell ID.
// Returns an unsubscribe function. The caller must call the returned
// function when done to prevent goroutine/channel leaks.
func (eb *EventBus) Subscribe(cellID string, ch chan *domain.ProvisionEvent) func() {
	eb.mu.Lock()
	defer eb.mu.Unlock()
	if eb.subscribers[cellID] == nil {
		eb.subscribers[cellID] = make(map[chan *domain.ProvisionEvent]struct{})
	}
	eb.subscribers[cellID][ch] = struct{}{}
	return func() {
		eb.mu.Lock()
		defer eb.mu.Unlock()
		delete(eb.subscribers[cellID], ch)
		if len(eb.subscribers[cellID]) == 0 {
			delete(eb.subscribers, cellID)
		}
	}
}

// Publish sends an event to all subscribers of the given cell.
// Non-blocking: if a subscriber's channel is full, the event is dropped
// for that subscriber to prevent slow consumers from blocking publishers.
func (eb *EventBus) Publish(evt *domain.ProvisionEvent) {
	eb.mu.RLock()
	defer eb.mu.RUnlock()
	subs, ok := eb.subscribers[evt.CellID]
	if !ok {
		return
	}
	for ch := range subs {
		select {
		case ch <- evt:
		default:
			// Drop event if subscriber is too slow
		}
	}
}