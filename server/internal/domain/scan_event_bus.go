package domain

import "context"

// ScanEventBus is the narrow interface that janitor handlers need from
// the SSE event bus. It decouples the handler from the concrete
// *sse.ScanEventBus type (DIP).
type ScanEventBus interface {
	// Publish sends a scan event to all subscribers for a scan.
	Publish(ctx context.Context, scanID, eventType string, eventData interface{})

	// Subscribe returns a channel of SSE-formatted byte messages for a
	// scan, and an unsubscribe function.
	Subscribe(scanID string, afterEventID int64) (chan []byte, func())

	// Cleanup removes all stored events and subscribers for a scan.
	Cleanup(scanID string)
}
