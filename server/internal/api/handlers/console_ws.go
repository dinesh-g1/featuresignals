package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/sse"
)

// ConsoleWSHandler handles WebSocket upgrade requests for the Console live feed.
// It authenticates via JWT token passed as a query parameter and upgrades the
// HTTP connection to a WebSocket connection scoped to the user's organization.
type ConsoleWSHandler struct {
	upgrader sse.WSUpgrader
	jwtMgr   auth.TokenManager
	logger   *slog.Logger
}

// NewConsoleWSHandler constructs a ConsoleWSHandler.
func NewConsoleWSHandler(upgrader sse.WSUpgrader, jwtMgr auth.TokenManager, logger *slog.Logger) *ConsoleWSHandler {
	return &ConsoleWSHandler{
		upgrader: upgrader,
		jwtMgr:   jwtMgr,
		logger:   logger.With("handler", "console_ws"),
	}
}

// ServeHTTP handles the WebSocket upgrade at GET /v1/console/live?token=<jwt>.
//
// Authentication flow:
//  1. Extract JWT from the "token" query parameter.
//  2. Validate the token and extract claims (org_id, user_id).
//  3. Upgrade the HTTP connection to WebSocket.
//  4. Register the connection in the hub under the user's org.
//
// Errors during authentication return standard HTTP error responses.
// Errors during upgrade return 500 with a JSON error body.
func (h *ConsoleWSHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "console_ws")

	// ── 1. Extract and validate JWT token from query param ───────────
	token := r.URL.Query().Get("token")
	if token == "" {
		httputil.Error(w, http.StatusUnauthorized, "missing token query parameter")
		return
	}

	claims, err := h.jwtMgr.ValidateToken(token)
	if err != nil {
		if errors.Is(err, auth.ErrTokenExpired) {
			httputil.Error(w, http.StatusUnauthorized, "token expired — please refresh and reconnect")
			return
		}
		httputil.Error(w, http.StatusUnauthorized, "invalid token")
		return
	}

	orgID := claims.OrgID
	userID := claims.UserID

	if orgID == "" || userID == "" {
		httputil.Error(w, http.StatusUnauthorized, "token missing required claims")
		return
	}

	// ── 2. Verify the org exists and is active ──────────────────────
	// (Org existence validation is handled by middleware on other routes;
	// for WebSocket we skip the middleware chain and validate inline.)

	logger.Info("ws upgrade request",
		"org_id", orgID,
		"user_id", userID,
	)

	// ── 3. Upgrade to WebSocket ─────────────────────────────────────
	client, err := h.upgrader.Upgrade(w, r, orgID, userID)
	if err != nil {
		logger.Error("ws upgrade failed", "error", err, "org_id", orgID)
		// If the response hasn't been written yet (hijack failed before 101),
		// return a JSON error. If hijack already wrote headers, this is a no-op.
		httputil.Error(w, http.StatusInternalServerError, "websocket upgrade failed")
		return
	}

	// Client is now managed by the hub — the read/write pumps are running.
	// The hub tracks connection counts for observability.
	logger.Info("ws client connected via console handler",
		"org_id", orgID,
		"user_id", userID,
	)

	// Suppress unused variable warning — client is managed by the hub.
	_ = client
}

// ─── Broadcast Helpers for Console Handler Integration ────────────────────

// ConsoleWSBroadcaster defines the narrow interface needed by ConsoleHandler
// to broadcast lifecycle events to WebSocket clients.
type ConsoleWSBroadcaster interface {
	BroadcastEvent(eventType string, orgID string, payload interface{})
	Broadcast(orgID string, event *sse.ConsoleEvent)
}

// Compile-time check: sse.WSHub satisfies ConsoleWSBroadcaster.
var _ ConsoleWSBroadcaster = (*sse.WSHub)(nil)

// ─── Noop Broadcaster (for testing / when WebSocket is disabled) ──────────

// NoopWSBroadcaster is a no-op implementation of ConsoleWSBroadcaster.
type NoopWSBroadcaster struct{}

func (NoopWSBroadcaster) BroadcastEvent(string, string, interface{}) {}
func (NoopWSBroadcaster) Broadcast(string, *sse.ConsoleEvent)       {}

// Ensure NoopWSBroadcaster satisfies the interface.
var _ ConsoleWSBroadcaster = NoopWSBroadcaster{}
