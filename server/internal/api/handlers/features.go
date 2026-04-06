package handlers

import (
	"net/http"

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

type featureItem struct {
	Feature string `json:"feature"`
	Enabled bool   `json:"enabled"`
	MinPlan string `json:"min_plan"`
}

// List returns all gated features with their enabled status for the org.
func (h *FeaturesHandler) List(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "features")
	orgID := middleware.GetOrgID(r.Context())

	org, err := h.orgReader.GetOrganization(r.Context(), orgID)
	if err != nil {
		logger.Error("failed to get organization", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	allFeatures := domain.AllFeatures()
	items := make([]featureItem, 0, len(allFeatures))
	for feat, minPlan := range allFeatures {
		items = append(items, featureItem{
			Feature: feat,
			Enabled: domain.IsFeatureEnabled(org.Plan, domain.Feature(feat)),
			MinPlan: minPlan,
		})
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"plan":     org.Plan,
		"features": items,
	})
}
