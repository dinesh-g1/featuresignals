package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type feedbackStore interface {
	domain.FeedbackWriter
}

type FeedbackHandler struct {
	store   feedbackStore
	emitter domain.EventEmitter
}

func NewFeedbackHandler(store feedbackStore, emitter domain.EventEmitter) *FeedbackHandler {
	return &FeedbackHandler{store: store, emitter: emitter}
}

func (h *FeedbackHandler) Submit(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "feedback.submit")

	claims := middleware.GetClaims(r.Context())
	if claims == nil {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req struct {
		Type      string `json:"type"`
		Sentiment string `json:"sentiment"`
		Message   string `json:"message"`
		Page      string `json:"page"`
	}

	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	if err := dec.Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Message == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "message is required")
		return
	}

	fb := &domain.Feedback{
		UserID:    claims.UserID,
		OrgID:     claims.OrgID,
		Type:      req.Type,
		Sentiment: req.Sentiment,
		Message:   req.Message,
		Page:      req.Page,
	}

	if err := h.store.InsertFeedback(r.Context(), fb); err != nil {
		logger.Error("failed to insert feedback", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if h.emitter != nil {
		h.emitter.Emit(r.Context(), domain.ProductEvent{
			Event:    "feedback.submitted",
			UserID:   claims.UserID,
			OrgID:    claims.OrgID,
			Category: "engagement",
			Properties: eventProps(map[string]string{
				"type":      req.Type,
				"sentiment": req.Sentiment,
				"page":      req.Page,
			}),
		})
	}

	httputil.JSON(w, http.StatusCreated, map[string]string{"status": "received"})
}
