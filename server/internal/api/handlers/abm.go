// Package handlers provides HTTP handlers for the FeatureSignals API.
//
// ABMHandler serves the Agent Behavior Mesh (ABM) SDK — the agent
// equivalent of feature flags. It provides behavior resolution (hot path),
// event tracking (fire-and-forget), and behavior CRUD.
//
// ─── Endpoints ────────────────────────────────────────────────────────────
//
//   POST   /v1/abm/resolve                     — Resolve a behavior variant (hot path)
//   POST   /v1/abm/track                        — Record a track event (fire-and-forget)
//   POST   /v1/abm/track/batch                  — Batch record track events
//   GET    /v1/abm/behaviors                    — List all behaviors (query: ?agent_type=recommender)
//   POST   /v1/abm/behaviors                    — Create a behavior
//   GET    /v1/abm/behaviors/{key}              — Get a behavior
//   PATCH  /v1/abm/behaviors/{key}              — Update a behavior
//   DELETE /v1/abm/behaviors/{key}              — Delete a behavior
//   GET    /v1/abm/behaviors/{key}/analytics    — Get variant distribution
//
// ─── Curl Examples ─────────────────────────────────────────────────────────
//
// Resolve a behavior for an agent:
//   curl -X POST http://localhost:8080/v1/abm/resolve \
//     -H "Authorization: Bearer $TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{"behavior_key":"search-ranking","agent_id":"agent-1","agent_type":"recommender","user_id":"user-42"}'
//
// Create a behavior with variants:
//   curl -X POST http://localhost:8080/v1/abm/behaviors \
//     -H "Authorization: Bearer $TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{"key":"checkout-recommendation","name":"Checkout Recommendation","agent_type":"recommender","variants":[{"key":"control","name":"Control","config":{"mode":"off"},"weight":50},{"key":"treatment-v2","name":"ML Model v2","config":{"mode":"ml","model":"v2"},"weight":50}],"default_variant":"control"}'
//
// Track an event:
//   curl -X POST http://localhost:8080/v1/abm/track \
//     -H "Authorization: Bearer $TOKEN" \
//     -H "Content-Type: application/json" \
//     -d '{"behavior_key":"search-ranking","variant":"treatment","agent_id":"agent-1","agent_type":"recommender","action":"search.ranked","outcome":"clicked"}'

package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"golang.org/x/sync/errgroup"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/observability"
)

// ─── ABM Handler ───────────────────────────────────────────────────────────

// abmStore is the narrowest interface the ABM handler needs.
type abmStore interface {
	domain.ABMBehaviorStore
	domain.ABMEventStore
	domain.AuditWriter
}

// ABMHandler serves ABM (Agent Behavior Mesh) endpoints. ABM is the SDK
// that customer applications use to manage AI agent behaviors — it's the
// agent equivalent of feature flags.
type ABMHandler struct {
	store  abmStore
	instr  *observability.Instruments
	logger *slog.Logger
}

// NewABMHandler creates an ABM handler with the required dependencies.
func NewABMHandler(store abmStore, logger *slog.Logger, instr *observability.Instruments) *ABMHandler {
	return &ABMHandler{store: store, logger: logger, instr: instr}
}

// l returns a request-scoped logger for the ABM handler.
func (h *ABMHandler) l(r *http.Request) *slog.Logger {
	return httputil.LoggerFromContext(r.Context()).With("handler", "abm")
}

// ─── Resolution (Hot Path) ─────────────────────────────────────────────────

// Resolve evaluates a behavior for the given agent context and returns
// the matching variant with configuration. This is the ABM hot path,
// equivalent to flag evaluation. Target: <5ms p99.
//
// POST /v1/abm/resolve
func (h *ABMHandler) Resolve(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	start := time.Now()

	var req domain.ABMResolutionRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.BehaviorKey == "" {
		httputil.Error(w, http.StatusBadRequest, "Behavior resolution blocked — the behavior_key field is missing. Include the required behavior_key in your request body.")
		return
	}
	if req.AgentID == "" {
		httputil.Error(w, http.StatusBadRequest, "Agent resolution blocked — the agent_id field is missing. Include the required agent_id in your request body.")
		return
	}

	orgID := middleware.GetOrgID(r.Context())

	behavior, err := h.store.GetBehavior(r.Context(), orgID, req.BehaviorKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			logger.Warn("Behavior lookup failed — no behavior matches the provided key. Verify the behavior key is correct or create a new behavior.", "behavior_key", req.BehaviorKey)
			h.writeDefaultResponse(w, req.BehaviorKey)
			if h.instr != nil {
				h.instr.RecordABMResolve(r.Context(), "not_found", float64(time.Since(start).Microseconds())/1000.0)
			}
			return
		}
		logger.Error("failed to get behavior for resolve", "error", err, "behavior_key", req.BehaviorKey)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	resp := behavior.EvaluateBehavior(req)
	durationMs := float64(time.Since(start).Microseconds()) / 1000.0
	logger.Info("abm resolved",
		"behavior_key", req.BehaviorKey,
		"agent_id", req.AgentID,
		"variant", resp.Variant,
		"reason", resp.Reason,
	)
	if h.instr != nil {
		h.instr.RecordABMResolve(r.Context(), resp.Reason, durationMs)
	}

	httputil.JSON(w, http.StatusOK, resp)
}

// writeDefaultResponse returns a default variant response when a behavior
// is not found. This avoids leaking behavior existence information.
func (h *ABMHandler) writeDefaultResponse(w http.ResponseWriter, behaviorKey string) {
	httputil.JSON(w, http.StatusOK, domain.ABMResolutionResponse{
		BehaviorKey: behaviorKey,
		Variant:     "default",
		Reason:      "behavior_not_found",
		ResolvedAt:  time.Now().UTC(),
		IsSticky:    false,
		TTLSeconds:  60,
	})
}

// ─── Tracking ──────────────────────────────────────────────────────────────

// Track records an ABM track event for analytics. The write is performed
// asynchronously with a background context to avoid blocking the client.
//
// POST /v1/abm/track
func (h *ABMHandler) Track(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)

	var req domain.ABMTrackEvent
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.BehaviorKey == "" {
		httputil.Error(w, http.StatusBadRequest, "Behavior resolution blocked — the behavior_key field is missing. Include the required behavior_key in your request body.")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	req.OrgID = orgID
	if req.RecordedAt.IsZero() {
		req.RecordedAt = time.Now().UTC()
	}

	// Copy event data for the background write to avoid capturing
	// request-scoped context or mutable request state.
	event := req

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()

		if err := h.store.InsertTrackEvent(ctx, &event); err != nil {
			logger.Error("async track event write failed", "error", err,
				"behavior_key", event.BehaviorKey, "agent_id", event.AgentID)
			if h.instr != nil {
				h.instr.RecordABMTrackAsyncWriteFailed(ctx, event.BehaviorKey)
			}
			return
		}
		logger.Debug("async track event persisted", "behavior_key", event.BehaviorKey)
	}()

	if h.instr != nil {
		h.instr.RecordABMTrack(r.Context(), req.BehaviorKey)
	}
	httputil.JSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
}

// TrackBatch records multiple ABM track events in a single request.
// Each event is written asynchronously via errgroup for proper
// goroutine lifecycle management.
//
// POST /v1/abm/track/batch
func (h *ABMHandler) TrackBatch(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)

	var events []domain.ABMTrackEvent
	if err := httputil.DecodeJSON(r, &events); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if len(events) == 0 {
		httputil.Error(w, http.StatusBadRequest, "Batch tracking blocked — at least one event is required. Provide one or more events in the request.")
		return
	}
	if len(events) > 1000 {
		httputil.Error(w, http.StatusBadRequest, "Batch tracking blocked — maximum batch size is 1000 events. Reduce the number of events.")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	now := time.Now().UTC()
	for i := range events {
		events[i].OrgID = orgID
		if events[i].RecordedAt.IsZero() {
			events[i].RecordedAt = now
		}
	}

	// Copy the event slice for the background write so it doesn't
	// capture request-scoped context. The errgroup ensures proper
	// goroutine lifecycle management with a background context.
	batch := make([]domain.ABMTrackEvent, len(events))
	copy(batch, events)

	go func() {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()

		var g errgroup.Group
		g.Go(func() error {
			return h.store.InsertTrackEvents(ctx, batch)
		})

		if err := g.Wait(); err != nil {
			logger.Error("async track events batch write failed", "error", err, "count", len(batch))
			if h.instr != nil && len(batch) > 0 {
				h.instr.RecordABMTrackAsyncWriteFailed(ctx, batch[0].BehaviorKey)
			}
			return
		}
		logger.Debug("async track events batch persisted", "count", len(batch))
	}()

	httputil.JSON(w, http.StatusAccepted, map[string]interface{}{
		"status": "accepted",
		"count":  len(events),
	})
}

// ─── Behavior CRUD ─────────────────────────────────────────────────────────

// ListBehaviors returns all ABM behaviors for the authenticated organization.
//
// GET /v1/abm/behaviors
func (h *ABMHandler) ListBehaviors(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())
	p := dto.ParsePagination(r)

	agentType := r.URL.Query().Get("agent_type")

	var behaviors []domain.ABMBehavior
	var total int
	var err error
	if agentType != "" {
		behaviors, err = h.store.ListBehaviorsByAgentType(r.Context(), orgID, agentType, p.Limit, p.Offset)
		total, _ = h.store.CountBehaviorsByAgentType(r.Context(), orgID, agentType)
	} else {
		behaviors, err = h.store.ListBehaviors(r.Context(), orgID, p.Limit, p.Offset)
		total, _ = h.store.CountBehaviors(r.Context(), orgID)
	}
	if err != nil {
		logger.Error("Behavior listing failed — an unexpected error occurred on the server. Try again or contact support.", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Behavior listing failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(behaviors, total, p.Limit, p.Offset))
}

// CreateBehavior creates a new ABM behavior.
//
// POST /v1/abm/behaviors
func (h *ABMHandler) CreateBehavior(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())

	var req domain.ABMBehavior
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.Key == "" {
		httputil.Error(w, http.StatusBadRequest, "Behavior creation blocked — the key field is missing. Include the required key in your request body.")
		return
	}
	if req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "Creation blocked — the name field is missing. Include the required name in your request body.")
		return
	}

	req.OrgID = orgID
	req.SetDefaults()

	if err := h.store.CreateBehavior(r.Context(), &req); err != nil {
		logger.Warn("behavior create failed", "key", req.Key, "err", err)
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "Creation blocked — a behavior with this key already exists. Use a unique key or update the existing behavior.")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "Behavior creation failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	logger.Info("behavior created", "key", req.Key, "name", req.Name)
	httputil.JSON(w, http.StatusCreated, req)
}

// GetBehavior returns a single ABM behavior by key.
//
// GET /v1/abm/behaviors/{key}
func (h *ABMHandler) GetBehavior(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())
	behaviorKey := chi.URLParam(r, "key")

	behavior, err := h.store.GetBehavior(r.Context(), orgID, behaviorKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Behavior lookup failed — no behavior matches the provided key. Verify the behavior key is correct or create a new behavior.")
			return
		}
		logger.Error("failed to get behavior", "error", err, "key", behaviorKey)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	httputil.JSON(w, http.StatusOK, behavior)
}

// UpdateBehavior updates an existing ABM behavior.
//
// PATCH /v1/abm/behaviors/{key}
func (h *ABMHandler) UpdateBehavior(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())
	behaviorKey := chi.URLParam(r, "key")

	existing, err := h.store.GetBehavior(r.Context(), orgID, behaviorKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Behavior lookup failed — no behavior matches the provided key. Verify the behavior key is correct or create a new behavior.")
			return
		}
		logger.Error("failed to get behavior for update", "error", err, "key", behaviorKey)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	var req domain.ABMBehavior
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	existing.MergeUpdate(&req)

	if err := h.store.UpdateBehavior(r.Context(), existing); err != nil {
		logger.Warn("behavior update failed", "key", behaviorKey, "err", err)
		httputil.Error(w, http.StatusInternalServerError, "Behavior update failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	logger.Info("behavior updated", "key", behaviorKey, "status", existing.Status)
	httputil.JSON(w, http.StatusOK, existing)
}

// DeleteBehavior removes an ABM behavior.
//
// DELETE /v1/abm/behaviors/{key}
func (h *ABMHandler) DeleteBehavior(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())
	behaviorKey := chi.URLParam(r, "key")

	if err := h.store.DeleteBehavior(r.Context(), orgID, behaviorKey); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Behavior lookup failed — no behavior matches the provided key. Verify the behavior key is correct or create a new behavior.")
			return
		}
		logger.Error("failed to delete behavior", "error", err, "key", behaviorKey)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	logger.Info("behavior deleted", "key", behaviorKey)
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "deleted", "key": behaviorKey})
}

// ─── Analytics ─────────────────────────────────────────────────────────────

// GetBehaviorAnalytics returns variant distribution and event counts
// for a behavior.
//
// GET /v1/abm/behaviors/{key}/analytics
func (h *ABMHandler) GetBehaviorAnalytics(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())
	behaviorKey := chi.URLParam(r, "key")

	since := time.Now().Add(-24 * time.Hour) // Default: last 24 hours
	if s := r.URL.Query().Get("since"); s != "" {
		if parsed, err := time.Parse(time.RFC3339, s); err == nil {
			since = parsed
		}
	}

	distribution, err := h.store.GetVariantDistribution(r.Context(), orgID, behaviorKey, since)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Behavior lookup failed — no behavior matches the provided key. Verify the behavior key is correct or create a new behavior.")
			return
		}
		logger.Error("failed to get variant distribution", "error", err, "key", behaviorKey)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	if distribution == nil {
		distribution = map[string]int{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"behavior_key": behaviorKey,
		"since":        since.Format(time.RFC3339),
		"distribution": distribution,
	})
}
