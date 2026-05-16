package handlers

import (
	"errors"
	"log/slog"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/sse"
)

// ─── ConsoleHandler ────────────────────────────────────────────────────────

// consoleStore is the composite interface needed by ConsoleHandler. It accepts
// both reading and writing capabilities, following ISP — each method only uses
// what it needs.
type consoleStore interface {
	domain.ConsoleReader
	domain.ConsoleWriter
}

// ConsoleHandler serves the three-zone Console surface: CONNECT, LIFECYCLE, LEARN.
type ConsoleHandler struct {
	store       consoleStore
	suggester   domain.ConsoleSuggester
	broadcaster ConsoleWSBroadcaster
	logger      *slog.Logger
}

// NewConsoleHandler constructs a ConsoleHandler with the required dependencies.
// broadcaster may be nil (or a NoopWSBroadcaster) if WebSocket is disabled.
func NewConsoleHandler(store consoleStore, suggester domain.ConsoleSuggester, broadcaster ConsoleWSBroadcaster, logger *slog.Logger) *ConsoleHandler {
	if broadcaster == nil {
		broadcaster = NoopWSBroadcaster{}
	}
	return &ConsoleHandler{store: store, suggester: suggester, broadcaster: broadcaster, logger: logger}
}

func (h *ConsoleHandler) l(r *http.Request) *slog.Logger {
	return httputil.LoggerFromContext(r.Context()).With("handler", "console")
}

// ─── GET /v1/console/flags ─────────────────────────────────────────────────

// ListFlags returns a paginated, filterable list of console flags for the
// authenticated organisation.
func (h *ConsoleHandler) ListFlags(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	params := dto.ParseConsoleListParams(r)
	params.OrgID = orgID

	flags, total, err := h.store.ListFlags(r.Context(), orgID, params)
	if err != nil {
		h.l(r).Error("failed to list console flags", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "Feature listing failed — an unexpected error occurred. Try again or contact support.")
		return
	}

	resp := dto.ConsoleFlagListResponse{
		Data:    flags,
		Total:   total,
		Limit:   params.Limit,
		Offset:  params.Offset,
		HasMore: params.Offset+len(flags) < total,
		Links:   domain.LinksForConsoleFlags(),
	}
	httputil.JSON(w, http.StatusOK, resp)
}

// ─── GET /v1/console/flags/{key} ───────────────────────────────────────────

// GetFlag returns a single console flag by key, org-scoped.
func (h *ConsoleHandler) GetFlag(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	key := chi.URLParam(r, "key")

	flag, err := h.store.GetFlag(r.Context(), orgID, key)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "flag not found")
			return
		}
		h.l(r).Error("failed to get console flag", "error", err, "org_id", orgID, "key", key)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Run AI suggester to attach predictive/autonomous suggestions.
	if h.suggester != nil {
		suggestions, sugErr := h.suggester.SuggestForFlag(r.Context(), orgID, *flag)
		if sugErr != nil {
			h.l(r).Warn("ai suggestion generation failed", "error", sugErr, "flag_key", key)
		} else if best := domain.HighestPriority(suggestions); best != nil {
			msg := best.Message
			priority := best.Priority // info | warning | critical — used by frontend for visual category
			conf := best.Confidence
			flag.AISuggestion = &msg
			flag.AISuggestionType = &priority
			flag.AIConfidence = &conf
			h.l(r).Debug("ai suggestion generated", "flag_key", key, "suggestion_type", best.Type, "priority", priority)
		}
	}

	resp := dto.ConsoleFlagResponse{
		ConsoleFlag: *flag,
		Links:       domain.LinksForConsoleFlag(key),
	}
	httputil.JSON(w, http.StatusOK, resp)
}

// ─── GET /v1/console/insights ──────────────────────────────────────────────

// GetInsights returns aggregated post-rollout learning data for the LEARN zone.
func (h *ConsoleHandler) GetInsights(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	insights, err := h.store.GetInsights(r.Context(), orgID)
	if err != nil {
		h.l(r).Error("failed to get console insights", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "Insights unavailable — an unexpected error occurred. Try again or contact support.")
		return
	}

	httputil.JSON(w, http.StatusOK, insights)
}

// ─── GET /v1/console/integrations ──────────────────────────────────────────

// GetIntegrations returns integration statuses for the CONNECT zone.
func (h *ConsoleHandler) GetIntegrations(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	integrations, err := h.store.GetIntegrations(r.Context(), orgID)
	if err != nil {
		h.l(r).Error("failed to get console integrations", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "Integrations unavailable — an unexpected error occurred. Try again or contact support.")
		return
	}

	httputil.JSON(w, http.StatusOK, integrations)
}

// ─── POST /v1/console/flags/{key}/advance ──────────────────────────────────

// AdvanceStage advances a flag to the next lifecycle stage.
func (h *ConsoleHandler) AdvanceStage(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	key := chi.URLParam(r, "key")

	var req dto.AdvanceRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields.")
		return
	}
	if req.Environment == "" {
		httputil.Error(w, http.StatusBadRequest, "environment is required")
		return
	}

	result, err := h.store.AdvanceStage(r.Context(), orgID, key, req.Environment)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "flag not found")
			return
		}
		if errors.Is(err, domain.ErrValidation) {
			httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		h.l(r).Error("failed to advance stage", "error", err, "org_id", orgID, "key", key)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Broadcast lifecycle advance to WebSocket clients in this org.
	// The previous stage is inferred by clients from their local state.
	h.broadcaster.BroadcastEvent(sse.EventFlagAdvanced, orgID, sse.FlagAdvancedPayload{
		Key:      key,
		NewStage: result.NewStage,
	})

	httputil.JSON(w, http.StatusOK, result)
}

// ─── POST /v1/console/flags/{key}/ship ─────────────────────────────────────

// Ship rolls out a flag by updating its rollout percentage.
func (h *ConsoleHandler) Ship(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	key := chi.URLParam(r, "key")

	var req dto.ShipRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields.")
		return
	}
	if err := req.Validate(); err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	params := domain.ShipParams{
		TargetPercent: req.TargetPercent,
		GuardMetrics:  req.GuardMetrics,
		Environment:   req.Environment,
	}

	result, err := h.store.Ship(r.Context(), orgID, key, params)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "flag not found")
			return
		}
		if errors.Is(err, domain.ErrValidation) {
			httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		h.l(r).Error("failed to ship flag", "error", err, "org_id", orgID, "key", key)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Broadcast shipment to WebSocket clients in this org.
	h.broadcaster.BroadcastEvent(sse.EventFlagShipped, orgID, sse.FlagShippedPayload{
		Key:           key,
		TargetPercent: params.TargetPercent,
		Environment:   params.Environment,
	})

	httputil.JSON(w, http.StatusOK, result)
}

// ─── POST /v1/console/flags/{key}/toggle ───────────────────────────────────

// ToggleFlag pauses or resumes a feature flag.
func (h *ConsoleHandler) ToggleFlag(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	key := chi.URLParam(r, "key")

	var req dto.ToggleRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields.")
		return
	}
	if err := req.Validate(); err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	flag, err := h.store.ToggleFlag(r.Context(), orgID, key, req.Action)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "flag not found")
			return
		}
		if errors.Is(err, domain.ErrValidation) {
			httputil.Error(w, http.StatusUnprocessableEntity, err.Error())
			return
		}
		h.l(r).Error("failed to toggle flag", "error", err, "org_id", orgID, "key", key, "action", req.Action)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Broadcast toggle event to WebSocket clients in this org.
	h.broadcaster.BroadcastEvent(sse.EventFlagToggled, orgID, sse.FlagToggledPayload{
		Key:    key,
		Action: req.Action,
		Status: flag.Status,
	})

	httputil.JSON(w, http.StatusOK, flag)
}

// ─── DELETE /v1/console/flags/{key} ────────────────────────────────────────

// ArchiveFlag archives (soft-deletes) a feature flag.
func (h *ConsoleHandler) ArchiveFlag(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	key := chi.URLParam(r, "key")

	flag, err := h.store.ArchiveFlag(r.Context(), orgID, key)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "flag not found")
			return
		}
		h.l(r).Error("failed to archive flag", "error", err, "org_id", orgID, "key", key)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Broadcast archive event to WebSocket clients in this org.
	h.broadcaster.BroadcastEvent(sse.EventFlagArchived, orgID, sse.FlagArchivedPayload{
		Key: key,
	})

	httputil.JSON(w, http.StatusOK, flag)
}

// ─── GET /v1/console/help/context ──────────────────────────────────────────

// GetHelpContext returns contextual information for the AI assistant.
func (h *ConsoleHandler) GetHelpContext(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	ctx, err := h.store.GetHelpContext(r.Context(), orgID, userID)
	if err != nil {
		h.l(r).Error("failed to get help context", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "Help context unavailable — an unexpected error occurred. Try again or contact support.")
		return
	}

	resp := dto.HelpContextResponse{
		HelpContext: *ctx,
		Links:       domain.LinksForHelpContext(),
	}
	httputil.JSON(w, http.StatusOK, resp)
}
