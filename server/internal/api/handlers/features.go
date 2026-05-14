package handlers

import (
	"net/http"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// FeaturesHandler returns the set of gated features available to the
// caller's organization based on its subscription plan.
type FeaturesHandler struct {
	orgReader domain.OrgReader
}

func NewFeaturesHandler(orgReader domain.OrgReader) *FeaturesHandler {
	return &FeaturesHandler{orgReader: orgReader}
}

// List returns all gated features with their enabled status for the org.
func (h *FeaturesHandler) List(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "features")
	orgID := middleware.GetOrgID(r.Context())

	org, err := h.orgReader.GetOrganization(r.Context(), orgID)
	if err != nil {
		logger.Error("failed to get organization", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	allFeatures := domain.AllFeatures()
	items := make([]dto.FeatureItemResponse, 0, len(allFeatures))
	for feat, minPlan := range allFeatures {
		items = append(items, dto.FeatureItemResponse{
			Feature: feat,
			Enabled: domain.IsFeatureEnabled(org.Plan, domain.Feature(feat)),
			MinPlan: minPlan,
		})
	}

	httputil.JSON(w, http.StatusOK, dto.FeaturesListResponse{
		Plan:     org.Plan,
		Features: items,
	})
}
