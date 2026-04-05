package handlers

import (
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type OnboardingHandler struct {
	store  domain.OnboardingStore
	logger *slog.Logger
}

func NewOnboardingHandler(store domain.OnboardingStore, logger *slog.Logger) *OnboardingHandler {
	return &OnboardingHandler{store: store, logger: logger}
}

// GetState returns the current onboarding state for the authenticated org.
func (h *OnboardingHandler) GetState(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	state, err := h.store.GetOnboardingState(r.Context(), orgID)
	if err != nil {
		log.Debug("no onboarding state found, returning defaults", "org_id", orgID)
		state = &domain.OnboardingState{OrgID: orgID}
	}

	httputil.JSON(w, http.StatusOK, state)
}

type UpdateOnboardingRequest struct {
	PlanSelected      *bool `json:"plan_selected"`
	FirstFlagCreated  *bool `json:"first_flag_created"`
	FirstSDKConnected *bool `json:"first_sdk_connected"`
	FirstEvaluation   *bool `json:"first_evaluation"`
}

// UpdateState patches the onboarding state for the authenticated org.
func (h *OnboardingHandler) UpdateState(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	var req UpdateOnboardingRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	state, _ := h.store.GetOnboardingState(r.Context(), orgID)
	if state == nil {
		state = &domain.OnboardingState{OrgID: orgID}
	}

	if req.PlanSelected != nil {
		state.PlanSelected = *req.PlanSelected
	}
	if req.FirstFlagCreated != nil {
		state.FirstFlagCreated = *req.FirstFlagCreated
	}
	if req.FirstSDKConnected != nil {
		state.FirstSDKConnected = *req.FirstSDKConnected
	}
	if req.FirstEvaluation != nil {
		state.FirstEvaluation = *req.FirstEvaluation
	}

	if state.PlanSelected && state.FirstFlagCreated && state.FirstSDKConnected && state.FirstEvaluation {
		if !state.Completed {
			state.Completed = true
			now := time.Now()
			state.CompletedAt = &now
		}
	}

	state.UpdatedAt = time.Now()

	if err := h.store.UpsertOnboardingState(r.Context(), state); err != nil {
		log.Error("failed to update onboarding state", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to update onboarding state")
		return
	}

	httputil.JSON(w, http.StatusOK, state)
}
