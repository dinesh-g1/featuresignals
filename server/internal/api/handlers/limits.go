package handlers

import (
	"net/http"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type LimitsHandler struct {
	limitsStore domain.LimitsReader
	orgStore    domain.OrgReader
}

func NewLimitsHandler(limitsStore domain.LimitsReader, orgStore domain.OrgReader) *LimitsHandler {
	return &LimitsHandler{limitsStore: limitsStore, orgStore: orgStore}
}

func (h *LimitsHandler) Get(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	org, err := h.orgStore.GetOrganization(r.Context(), orgID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to load organization")
		return
	}

	plan := "free"
	if org.Plan != "" {
		plan = org.Plan
	}

	cfg, err := h.limitsStore.GetLimitsConfig(r.Context(), plan)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to load limits config")
		return
	}

	flags, _ := h.limitsStore.CountFlags(r.Context(), orgID)
	segs, _ := h.limitsStore.CountSegments(r.Context(), orgID)
	envs, _ := h.limitsStore.CountEnvironments(r.Context(), orgID)
	members, _ := h.limitsStore.CountMembers(r.Context(), orgID)
	webhooks, _ := h.limitsStore.CountWebhooks(r.Context(), orgID)
	apiKeys, _ := h.limitsStore.CountAPIKeys(r.Context(), orgID)
	projects, _ := h.limitsStore.CountProjects(r.Context(), orgID)

	limits := []domain.ResourceLimit{
		{Resource: "flags", Used: flags, Max: cfg.MaxFlags},
		{Resource: "segments", Used: segs, Max: cfg.MaxSegments},
		{Resource: "environments", Used: envs, Max: cfg.MaxEnvs},
		{Resource: "members", Used: members, Max: cfg.MaxMembers},
		{Resource: "webhooks", Used: webhooks, Max: cfg.MaxWebhooks},
		{Resource: "api_keys", Used: apiKeys, Max: cfg.MaxAPIKeys},
		{Resource: "projects", Used: projects, Max: cfg.MaxProjects},
	}

	httputil.JSON(w, http.StatusOK, dto.LimitsResponseFromDomain(plan, limits))
}
