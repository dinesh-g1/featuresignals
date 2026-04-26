package sse

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"
)

// ─── Event Types ──────────────────────────────────────────────────────────

// ScanEvent represents a single event in a scan's event stream.
type ScanEvent struct {
	ID        int64           `json:"id"`
	ScanID    string          `json:"scan_id"`
	EventType string          `json:"event_type"`
	EventData json.RawMessage `json:"event_data"`
	CreatedAt time.Time       `json:"created_at"`
}

// Event type constants
const (
	EventScanStarted     = "scan.started"
	EventRepoProgress    = "scan.repo.progress"
	EventRepoComplete    = "scan.repo.complete"
	EventFlagAnalyzed    = "scan.flag.analyzed"
	EventLLMAnalysis     = "scan.llm.analysis"
	EventScanComplete    = "scan.complete"
	EventScanError       = "scan.error"
)

// ─── Event Bus ────────────────────────────────────────────────────────────

// ScanEventBus manages event publishing and subscription for scan progress.
type ScanEventBus struct {
	mu          sync.RWMutex
	subscribers map[string][]chan []byte
	events      map[string][]ScanEvent // stored for late-connecting clients
	maxEvents   int
	logger      *slog.Logger
}

// NewScanEventBus creates a new scan event bus.
func NewScanEventBus(logger *slog.Logger) *ScanEventBus {
	return &ScanEventBus{
		subscribers: make(map[string][]chan []byte),
		events:      make(map[string][]ScanEvent),
		maxEvents:   1000,
		logger:      logger.With("component", "scan_event_bus"),
	}
}

// Publish sends an event to all subscribers for a scan.
func (b *ScanEventBus) Publish(ctx context.Context, scanID, eventType string, eventData interface{}) {
	b.mu.Lock()
	defer b.mu.Unlock()

	// Serialize event data
	dataBytes, err := json.Marshal(eventData)
	if err != nil {
		b.logger.Error("failed to marshal event data", "scan_id", scanID, "event_type", eventType, "error", err)
		return
	}

	// Create the event record
	event := ScanEvent{
		ScanID:    scanID,
		EventType: eventType,
		EventData: dataBytes,
		CreatedAt: time.Now().UTC(),
	}

	// Store for late-connecting clients
	b.events[scanID] = append(b.events[scanID], event)
	if len(b.events[scanID]) > b.maxEvents {
		// Keep only the most recent events
		b.events[scanID] = b.events[scanID][len(b.events[scanID])-b.maxEvents:]
	}

	// Serialize full SSE message
	eventJSON, err := json.Marshal(event)
	if err != nil {
		b.logger.Error("failed to marshal sse event", "error", err)
		return
	}
	msg := fmt.Sprintf("event: %s\ndata: %s\n\n", eventType, string(eventJSON))

	// Notify all subscribers
	subs := b.subscribers[scanID]
	for _, ch := range subs {
		select {
		case ch <- []byte(msg):
		default:
			// Channel full, skip slow consumer
		}
	}
}

// Subscribe returns a channel that receives SSE messages for a scan.
// The channel has a buffer of 100 messages.
func (b *ScanEventBus) Subscribe(scanID string, afterEventID int64) (chan []byte, func()) {
	ch := make(chan []byte, 100)

	b.mu.Lock()

	// Send past events for late-connecting clients
	if stored, ok := b.events[scanID]; ok {
		for _, event := range stored {
			if event.ID > afterEventID {
				eventJSON, _ := json.Marshal(event)
				msg := fmt.Sprintf("event: %s\ndata: %s\n\n", event.EventType, string(eventJSON))
				select {
				case ch <- []byte(msg):
				default:
				}
			}
		}
	}

	b.subscribers[scanID] = append(b.subscribers[scanID], ch)
	b.mu.Unlock()

	// Return unsubscribe function
	cancel := func() {
		b.mu.Lock()
		defer b.mu.Unlock()
		subs := b.subscribers[scanID]
		for i, sub := range subs {
			if sub == ch {
				b.subscribers[scanID] = append(subs[:i], subs[i+1:]...)
				break
			}
		}
		close(ch)
	}

	return ch, cancel
}

// Cleanup removes all stored events for a scan (called after scan completion + grace period).
func (b *ScanEventBus) Cleanup(scanID string) {
	b.mu.Lock()
	defer b.mu.Unlock()
	delete(b.events, scanID)
	for _, ch := range b.subscribers[scanID] {
		close(ch)
	}
	delete(b.subscribers, scanID)
}

// ─── SSE HTTP Handler ─────────────────────────────────────────────────────

// ScanEventsHandler handles SSE connections for scan progress.
type ScanEventsHandler struct {
	bus    *ScanEventBus
	logger *slog.Logger
}

// NewScanEventsHandler creates a new SSE handler.
func NewScanEventsHandler(bus *ScanEventBus, logger *slog.Logger) *ScanEventsHandler {
	return &ScanEventsHandler{
		bus:    bus,
		logger: logger.With("handler", "sse_scan_events"),
	}
}

// ServeHTTP handles the SSE connection for a specific scan.
// GET /v1/janitor/scans/{scanId}/events?after={eventID}
func (h *ScanEventsHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	scanID := r.Context().Value("scanID").(string)
	if scanID == "" {
		http.Error(w, "scan_id is required", http.StatusBadRequest)
		return
	}

	logger := h.logger.With("scan_id", scanID)

	// Get afterEventID from query param for reconnection
	var afterEventID int64
	if after := r.URL.Query().Get("after"); after != "" {
		fmt.Sscanf(after, "%d", &afterEventID)
	}

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		http.Error(w, "streaming not supported", http.StatusInternalServerError)
		return
	}

	// Subscribe to events
	ch, cancel := h.bus.Subscribe(scanID, afterEventID)
	defer cancel()

	logger.Info("SSE client connected")

	// Send initial connection event
	fmt.Fprintf(w, "event: connected\ndata: {\"scan_id\":\"%s\"}\n\n", scanID)
	flusher.Flush()

	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				// Channel closed, connection ended
				fmt.Fprintf(w, "event: closed\ndata: {}\n\n")
				flusher.Flush()
				return
			}
			if _, err := w.Write(msg); err != nil {
				logger.Warn("SSE write error", "error", err)
				return
			}
			flusher.Flush()

		case <-r.Context().Done():
			logger.Info("SSE client disconnected")
			return
		}
	}
}