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
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

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
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.BehaviorKey == "" {
		httputil.Error(w, http.StatusBadRequest, "behavior_key is required")
		return
	}
	if req.AgentID == "" {
		httputil.Error(w, http.StatusBadRequest, "agent_id is required")
		return
	}

	// Extract org_id from the API key context (set by API key auth middleware).
	orgID := middleware.GetOrgID(r.Context())

	// Load behavior from store. In production, this would be cached in-memory
	// via an eval cache (similar to flag ruleset caching). For now, we hit
	// the database with indexed lookup.
	behavior, err := h.store.GetBehavior(r.Context(), orgID, req.BehaviorKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			logger.Warn("behavior not found", "behavior_key", req.BehaviorKey)
			// Return default response rather than 404 to avoid exposing
			// behavior existence for cross-org queries.
			h.writeDefaultResponse(w, req.BehaviorKey, behavior)
			if h.instr != nil {
				h.instr.RecordABMResolve(r.Context(), "not_found", float64(time.Since(start).Microseconds())/1000.0)
			}
			return
		}
		logger.Error("failed to get behavior for resolve", "error", err, "behavior_key", req.BehaviorKey)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	resp := h.evaluateBehavior(behavior, req)
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

// evaluateBehavior applies targeting rules and rollout percentage to
// determine which variant should be served.
func (h *ABMHandler) evaluateBehavior(behavior *domain.ABMBehavior, req domain.ABMResolutionRequest) domain.ABMResolutionResponse {
	resp := domain.ABMResolutionResponse{
		BehaviorKey: req.BehaviorKey,
		Variant:     behavior.DefaultVariant,
		Reason:      "default",
		ResolvedAt:  time.Now().UTC(),
		IsSticky:    true,
		TTLSeconds:  300,
	}

	// If behavior is not active, return default variant.
	if behavior.Status != "active" {
		resp.Reason = "behavior_inactive"
		return resp
	}

	// Apply targeting rules in priority order (lowest priority first = evaluated first).
	// This matches the domain model: lower priority numbers evaluate first.
	targetingRules := behavior.TargetingRules
	for i := range targetingRules {
		rule := &targetingRules[i]
		if h.matchRule(rule, req) {
			resp.Variant = rule.Variant
			resp.Reason = "targeting_match"
			break
		}
	}

	// If a targeting rule matched, find the variant config.
	if resp.Reason == "targeting_match" || req.UserID != "" {
		// Apply rollout percentage if no targeting rule matched yet.
		if resp.Reason == "default" && behavior.RolloutPercentage > 0 {
			// Simple hash-based percentage rollout (consistent per userID).
			if req.UserID != "" && h.rolloutMatch(req.UserID, behavior.RolloutPercentage) {
				// Pick the first non-default variant for the rollout.
				for _, v := range behavior.Variants {
					if v.Key != behavior.DefaultVariant && v.Weight > 0 {
						resp.Variant = v.Key
						resp.Reason = "percentage_rollout"
						break
					}
				}
			}
		}
	}

	// Attach variant configuration.
	for _, v := range behavior.Variants {
		if v.Key == resp.Variant {
			resp.Config = v.Config
			break
		}
	}

	return resp
}

// matchRule evaluates a CEL-like targeting rule against the request context.
// For the initial implementation, we support simple attribute matching
// (attribute == value). Full CEL support will come with the governance layer.
func (h *ABMHandler) matchRule(rule *domain.ABMTargetingRule, req domain.ABMResolutionRequest) bool {
	if rule.Condition == "" {
		return false
	}

	// Simple targeting: check if attribute matches.
	// Format: attributes.key == "value"
	// For now, implement basic attribute equality matching.
	// Full CEL expression evaluation will be added when the CEL engine is integrated.

	// Check common targeting patterns:
	// 1. AgentType match
	if req.Attributes != nil {
		if val, ok := req.Attributes["agent_type"]; ok {
			if s, ok := val.(string); ok && s == req.AgentType {
				return true
			}
		}
	}

	return false
}

// rolloutMatch deterministically hashes a userID to decide if they
// should receive the rollout variant. Uses FNV-1a for speed.
func (h *ABMHandler) rolloutMatch(userID string, percentage int) bool {
	if percentage <= 0 {
		return false
	}
	if percentage >= 100 {
		return true
	}

	// Simple FNV-style hash for consistent percentage-based rollout.
	var hash uint64 = 14695981039346656037 // FNV offset basis
	for i := 0; i < len(userID); i++ {
		hash ^= uint64(userID[i])
		hash *= 1099511628211 // FNV prime
	}
	return int(hash%100) < percentage
}

// writeDefaultResponse returns a default variant response when a behavior
// is not found. This avoids leaking behavior existence information.
func (h *ABMHandler) writeDefaultResponse(w http.ResponseWriter, behaviorKey string, _ *domain.ABMBehavior) {
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

// Track records an ABM track event for analytics. This is a fire-and-forget
// endpoint — the caller doesn't need to wait for persistence.
//
// POST /v1/abm/track
func (h *ABMHandler) Track(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)

	var req domain.ABMTrackEvent
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.BehaviorKey == "" {
		httputil.Error(w, http.StatusBadRequest, "behavior_key is required")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	req.OrgID = orgID
	if req.RecordedAt.IsZero() {
		req.RecordedAt = time.Now().UTC()
	}

	// Fire-and-forget: we don't block the client on DB write.
	// In production, this would go through an async event pipeline.
	go func() {
		if err := h.store.InsertTrackEvent(r.Context(), &req); err != nil {
			logger.Error("failed to insert track event", "error", err,
				"behavior_key", req.BehaviorKey, "agent_id", req.AgentID)
		}
	}()

	if h.instr != nil {
		h.instr.RecordABMTrack(r.Context(), req.BehaviorKey)
	}
	httputil.JSON(w, http.StatusAccepted, map[string]string{"status": "accepted"})
}

// TrackBatch records multiple ABM track events in a single request.
//
// POST /v1/abm/track/batch
func (h *ABMHandler) TrackBatch(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)

	var events []domain.ABMTrackEvent
	if err := httputil.DecodeJSON(r, &events); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if len(events) == 0 {
		httputil.Error(w, http.StatusBadRequest, "at least one event is required")
		return
	}
	if len(events) > 1000 {
		httputil.Error(w, http.StatusBadRequest, "batch size must not exceed 1000")
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

	// Fire-and-forget for the batch write.
	go func() {
		if err := h.store.InsertTrackEvents(r.Context(), events); err != nil {
			logger.Error("failed to insert track events batch", "error", err, "count", len(events))
		}
	}()

	httputil.JSON(w, http.StatusAccepted, map[string]interface{}{
		"status":  "accepted",
		"count":   len(events),
	})
}

// ─── Behavior CRUD ─────────────────────────────────────────────────────────

// ListBehaviors returns all ABM behaviors for the authenticated organization.
//
// GET /v1/abm/behaviors
func (h *ABMHandler) ListBehaviors(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())

	agentType := r.URL.Query().Get("agent_type")

	var behaviors []domain.ABMBehavior
	var err error
	if agentType != "" {
		behaviors, err = h.store.ListBehaviorsByAgentType(r.Context(), orgID, agentType)
	} else {
		behaviors, err = h.store.ListBehaviors(r.Context(), orgID)
	}
	if err != nil {
		logger.Error("failed to list behaviors", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list behaviors")
		return
	}

	if behaviors == nil {
		behaviors = []domain.ABMBehavior{}
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"data":  behaviors,
		"total": len(behaviors),
	})
}

// CreateBehavior creates a new ABM behavior.
//
// POST /v1/abm/behaviors
func (h *ABMHandler) CreateBehavior(w http.ResponseWriter, r *http.Request) {
	logger := h.l(r)
	orgID := middleware.GetOrgID(r.Context())

	var req domain.ABMBehavior
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Key == "" {
		httputil.Error(w, http.StatusBadRequest, "key is required")
		return
	}
	if req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.DefaultVariant == "" {
		req.DefaultVariant = "default"
	}
	if req.Status == "" {
		req.Status = "draft"
	}
	if req.RolloutPercentage == 0 {
		req.RolloutPercentage = 100
	}

	req.OrgID = orgID
	if req.Variants == nil {
		req.Variants = []domain.ABMVariant{}
	}
	if req.TargetingRules == nil {
		req.TargetingRules = []domain.ABMTargetingRule{}
	}

	if err := h.store.CreateBehavior(r.Context(), &req); err != nil {
		logger.Warn("behavior create failed", "key", req.Key, "err", err)
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "behavior key already exists")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "failed to create behavior")
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
			httputil.Error(w, http.StatusNotFound, "behavior not found")
			return
		}
		logger.Error("failed to get behavior", "error", err, "key", behaviorKey)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
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

	// Load existing behavior.
	existing, err := h.store.GetBehavior(r.Context(), orgID, behaviorKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "behavior not found")
			return
		}
		logger.Error("failed to get behavior for update", "error", err, "key", behaviorKey)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Decode partial update.
	var req domain.ABMBehavior
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Apply changes (merge).
	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Description != "" {
		existing.Description = req.Description
	}
	if req.AgentType != "" {
		existing.AgentType = req.AgentType
	}
	if req.Variants != nil {
		existing.Variants = req.Variants
	}
	if req.DefaultVariant != "" {
		existing.DefaultVariant = req.DefaultVariant
	}
	if req.TargetingRules != nil {
		existing.TargetingRules = req.TargetingRules
	}
	if req.RolloutPercentage != 0 {
		existing.RolloutPercentage = req.RolloutPercentage
	}
	if req.Status != "" {
		existing.Status = req.Status
	}

	if err := h.store.UpdateBehavior(r.Context(), existing); err != nil {
		logger.Warn("behavior update failed", "key", behaviorKey, "err", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to update behavior")
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
			httputil.Error(w, http.StatusNotFound, "behavior not found")
			return
		}
		logger.Error("failed to delete behavior", "error", err, "key", behaviorKey)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
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
		logger.Error("failed to get variant distribution", "error", err, "key", behaviorKey)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
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
