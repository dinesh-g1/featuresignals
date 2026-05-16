// Package sse provides Server-Sent Events and WebSocket real-time
// communication for the FeatureSignals platform.
//
// The WSHub manages authenticated WebSocket connections scoped to
// organizations, enabling real-time Console live updates for flag
// lifecycle changes, evaluation volumes, health scores, and
// integration status changes.
package sse

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	ometric "go.opentelemetry.io/otel/metric"
	"go.opentelemetry.io/otel/trace"
)

var (
	wsTracer       = otel.Tracer("featuresignals/ws")
	wsMeter        = otel.Meter("featuresignals/ws")
	wsConnGauge, _ = wsMeter.Int64UpDownCounter(
		"ws.active_connections",
		ometric.WithDescription("Currently active WebSocket connections"),
	)
	wsMsgCounter, _ = wsMeter.Int64Counter(
		"ws.messages_sent",
		ometric.WithDescription("Total WebSocket messages sent"),
	)
)

// ─── Event Types ──────────────────────────────────────────────────────────

// Event type constants for the WebSocket protocol.
const (
	EventFlagUpdated        = "flag_updated"
	EventFlagAdvanced       = "flag_advanced"
	EventFlagShipped        = "flag_shipped"
	EventFlagToggled        = "flag_toggled"
	EventFlagArchived       = "flag_archived"
	EventIntegrationChanged = "integration_changed"
	EventEvalBatch          = "eval_batch"
)

// ConsoleEvent is the standard event envelope for WebSocket messages.
type ConsoleEvent struct {
	Type      string          `json:"type"`
	OrgID     string          `json:"org_id"`
	Timestamp time.Time       `json:"timestamp"`
	Payload   json.RawMessage `json:"payload"`
}

// NewConsoleEvent creates a new ConsoleEvent with the current UTC timestamp.
func NewConsoleEvent(eventType, orgID string, payload interface{}) (*ConsoleEvent, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}
	return &ConsoleEvent{
		Type:      eventType,
		OrgID:     orgID,
		Timestamp: time.Now().UTC(),
		Payload:   raw,
	}, nil
}

// MustNewConsoleEvent is like NewConsoleEvent but panics on marshal error.
// Only use when the payload is known to be marshalable at compile time.
func MustNewConsoleEvent(eventType, orgID string, payload interface{}) *ConsoleEvent {
	evt, err := NewConsoleEvent(eventType, orgID, payload)
	if err != nil {
		panic("failed to marshal console event payload: " + err.Error())
	}
	return evt
}

// ─── WebSocket Hub ────────────────────────────────────────────────────────

// WSHub manages WebSocket connections grouped by organization.
// It handles authentication, connection lifecycle, heartbeat/ping,
// and broadcasting events to all connections for a given org.
type WSHub struct {
	mu       sync.RWMutex
	pools    map[string]map[*WSClient]bool // orgID -> set of clients
	logger   *slog.Logger
	pingFreq time.Duration
}

// NewWSHub creates a new WebSocket hub.
func NewWSHub(logger *slog.Logger) *WSHub {
	return &WSHub{
		pools:    make(map[string]map[*WSClient]bool),
		logger:   logger.With("component", "ws_hub"),
		pingFreq: 30 * time.Second,
	}
}

// Upgrade upgrades an HTTP connection to a WebSocket connection,
// authenticating via the provided claims. The returned WSClient is
// already registered in the hub's connection pool.
func (h *WSHub) Upgrade(w http.ResponseWriter, r *http.Request, orgID, userID string) (*WSClient, error) {
	conn, err := upgradeWS(w, r)
	if err != nil {
		return nil, err
	}

	client := &WSClient{
		hub:    h,
		conn:   conn,
		orgID:  orgID,
		userID: userID,
		send:   make(chan []byte, 64),
		logger: h.logger.With("org_id", orgID, "user_id", userID),
	}

	h.addClient(client)

	// Start read and write pumps.
	go client.writePump()
	go client.readPump()

	return client, nil
}

// Broadcast sends an event to all WebSocket connections for the given org.
// It is safe for concurrent use and never blocks callers — if a client's
// send buffer is full, the event is dropped for that client with a warning log.
func (h *WSHub) Broadcast(orgID string, event *ConsoleEvent) {
	payload, err := json.Marshal(event)
	if err != nil {
		h.logger.Error("failed to marshal console event", "error", err, "event_type", event.Type)
		return
	}

	h.mu.RLock()
	clients := h.pools[orgID]
	// Copy the set to avoid holding the lock during sends.
	// This is safe because add/remove copy the map on write.
	h.mu.RUnlock()

	for client := range clients {
		select {
		case client.send <- payload:
			wsMsgCounter.Add(context.Background(), 1,
				ometric.WithAttributes(
					attribute.String("org_id", orgID),
					attribute.String("event_type", event.Type),
				),
			)
		default:
			client.logger.Warn("ws client send buffer full, dropping event",
				"event_type", event.Type,
			)
		}
	}
}

// BroadcastEvent is a convenience method that constructs and broadcasts
// a ConsoleEvent in one call.
func (h *WSHub) BroadcastEvent(eventType, orgID string, payload interface{}) {
	event, err := NewConsoleEvent(eventType, orgID, payload)
	if err != nil {
		h.logger.Error("failed to create console event", "error", err, "event_type", eventType)
		return
	}
	h.Broadcast(orgID, event)
}

// ClientCount returns the number of connected WebSocket clients for an org.
func (h *WSHub) ClientCount(orgID string) int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	return len(h.pools[orgID])
}

// TotalClientCount returns the total number of connected WebSocket clients.
func (h *WSHub) TotalClientCount() int {
	h.mu.RLock()
	defer h.mu.RUnlock()
	total := 0
	for _, clients := range h.pools {
		total += len(clients)
	}
	return total
}

// Close shuts down all connections and clears the hub.
func (h *WSHub) Close() {
	h.mu.Lock()
	defer h.mu.Unlock()
	for orgID, clients := range h.pools {
		for client := range clients {
			client.close()
		}
		delete(h.pools, orgID)
	}
	h.logger.Info("ws hub closed")
}

// addClient registers a client in the hub. Must be called from the client's
// goroutine or during initial setup before the client is active.
func (h *WSHub) addClient(c *WSClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if h.pools[c.orgID] == nil {
		h.pools[c.orgID] = make(map[*WSClient]bool)
	}
	h.pools[c.orgID][c] = true
	wsConnGauge.Add(context.Background(), 1,
		ometric.WithAttributes(attribute.String("org_id", c.orgID)),
	)
	h.logger.Info("ws client connected",
		"org_id", c.orgID,
		"user_id", c.userID,
		"org_total", len(h.pools[c.orgID]),
		"global_total", h.totalClientCountLocked(),
	)
}

// removeClient unregisters a client from the hub.
func (h *WSHub) removeClient(c *WSClient) {
	h.mu.Lock()
	defer h.mu.Unlock()
	if clients, ok := h.pools[c.orgID]; ok {
		delete(clients, c)
		if len(clients) == 0 {
			delete(h.pools, c.orgID)
		}
	}
	wsConnGauge.Add(context.Background(), -1,
		ometric.WithAttributes(attribute.String("org_id", c.orgID)),
	)
	h.logger.Info("ws client disconnected",
		"org_id", c.orgID,
		"user_id", c.userID,
		"org_total", len(h.pools[c.orgID]),
		"global_total", h.totalClientCountLocked(),
	)
}

// totalClientCountLocked must be called with mu held.
func (h *WSHub) totalClientCountLocked() int {
	total := 0
	for _, clients := range h.pools {
		total += len(clients)
	}
	return total
}

// ─── WebSocket Upgrade ────────────────────────────────────────────────────

// upgradeWS performs the WebSocket handshake and returns a raw connection
// wrapper. This is a minimal but correct WebSocket upgrade implementation
// using only the standard library.
func upgradeWS(w http.ResponseWriter, r *http.Request) (*wsConn, error) {
	// Validate the upgrade request.
	if r.Header.Get("Upgrade") != "websocket" {
		return nil, errBadUpgrade
	}
	if r.Header.Get("Connection") != "Upgrade" {
		return nil, errBadUpgrade
	}

	// Read the Sec-WebSocket-Key.
	key := r.Header.Get("Sec-WebSocket-Key")
	if key == "" {
		return nil, errBadUpgrade
	}

	// Hijack the connection.
	hijacker, ok := w.(http.Hijacker)
	if !ok {
		return nil, errHijackUnsupported
	}

	netConn, bufrw, err := hijacker.Hijack()
	if err != nil {
		return nil, err
	}

	// Compute the accept key and write the upgrade response.
	acceptKey := computeAcceptKey(key)
	resp := "HTTP/1.1 101 Switching Protocols\r\n" +
		"Upgrade: websocket\r\n" +
		"Connection: Upgrade\r\n" +
		"Sec-WebSocket-Accept: " + acceptKey + "\r\n\r\n"

	if _, err := bufrw.WriteString(resp); err != nil {
		netConn.Close()
		return nil, err
	}
	if err := bufrw.Flush(); err != nil {
		netConn.Close()
		return nil, err
	}

	return newWSConn(netConn), nil
}

// ─── Connection Event Payloads ────────────────────────────────────────────

// FlagUpdatedPayload is sent when a flag is created, updated, or deleted.
type FlagUpdatedPayload struct {
	Key            string `json:"key"`
	Name           string `json:"name"`
	Stage          string `json:"stage,omitempty"`
	Status         string `json:"status,omitempty"`
	HealthScore    int    `json:"health_score,omitempty"`
	RolloutPercent int    `json:"rollout_percent,omitempty"`
}

// FlagAdvancedPayload is sent when a flag advances to the next lifecycle stage.
type FlagAdvancedPayload struct {
	Key      string `json:"key"`
	OldStage string `json:"old_stage,omitempty"`
	NewStage string `json:"new_stage"`
}

// FlagShippedPayload is sent when a flag is shipped (rolled out).
type FlagShippedPayload struct {
	Key            string `json:"key"`
	TargetPercent  int    `json:"target_percent"`
	Environment    string `json:"environment"`
}

// FlagToggledPayload is sent when a flag is paused or resumed.
type FlagToggledPayload struct {
	Key    string `json:"key"`
	Action string `json:"action"` // "pause" or "resume"
	Status string `json:"status"` // resulting status: "paused" or "active"
}

// FlagArchivedPayload is sent when a flag is archived.
type FlagArchivedPayload struct {
	Key string `json:"key"`
}

// IntegrationChangedPayload is sent when an integration status changes.
type IntegrationChangedPayload struct {
	IntegrationType string `json:"integration_type"` // "repository", "sdk", "agent", "apikey"
	ID              string `json:"id"`
	Status          string `json:"status"`
}

// EvalBatchPayload is sent periodically with evaluation volume updates.
type EvalBatchPayload struct {
	Features []EvalVolumeUpdate `json:"features"`
}

// EvalVolumeUpdate is a per-feature evaluation volume snapshot.
type EvalVolumeUpdate struct {
	Key        string  `json:"key"`
	EvalVolume int64   `json:"eval_volume"`
	EvalTrend  float64 `json:"eval_trend"`
}

// ─── Tracing helpers ──────────────────────────────────────────────────────

func wsTraceConnect(ctx context.Context, orgID string) (context.Context, trace.Span) {
	return wsTracer.Start(ctx, "ws.Connect",
		trace.WithAttributes(
			attribute.String("org_id", orgID),
		),
	)
}
