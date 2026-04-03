package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

func verifyProjectOwnership(store domain.Store, r *http.Request, w http.ResponseWriter) (*domain.Project, bool) {
	projectID := chi.URLParam(r, "projectID")
	if projectID == "" {
		httputil.Error(w, http.StatusBadRequest, "project ID is required")
		return nil, false
	}
	project, err := store.GetProject(r.Context(), projectID)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "project not found")
		return nil, false
	}
	orgID := middleware.GetOrgID(r.Context())
	if project.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, "project not found")
		return nil, false
	}
	return project, true
}

func verifyEnvironmentOwnership(store domain.Store, r *http.Request, w http.ResponseWriter) (*domain.Environment, bool) {
	envID := chi.URLParam(r, "envID")
	if envID == "" {
		httputil.Error(w, http.StatusBadRequest, "environment ID is required")
		return nil, false
	}
	env, err := store.GetEnvironment(r.Context(), envID)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "environment not found")
		return nil, false
	}
	project, err := store.GetProject(r.Context(), env.ProjectID)
	if err != nil || project.OrgID != middleware.GetOrgID(r.Context()) {
		httputil.Error(w, http.StatusNotFound, "environment not found")
		return nil, false
	}
	return env, true
}

func verifyWebhookOwnership(store domain.Store, r *http.Request, w http.ResponseWriter) (*domain.Webhook, bool) {
	webhookID := chi.URLParam(r, "webhookID")
	if webhookID == "" {
		httputil.Error(w, http.StatusBadRequest, "webhook ID is required")
		return nil, false
	}
	wh, err := store.GetWebhook(r.Context(), webhookID)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "webhook not found")
		return nil, false
	}
	orgID := middleware.GetOrgID(r.Context())
	if wh.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, "webhook not found")
		return nil, false
	}
	return wh, true
}

func verifyApprovalOwnership(store domain.Store, r *http.Request, w http.ResponseWriter) (*domain.ApprovalRequest, bool) {
	approvalID := chi.URLParam(r, "approvalID")
	if approvalID == "" {
		httputil.Error(w, http.StatusBadRequest, "approval ID is required")
		return nil, false
	}
	ar, err := store.GetApprovalRequest(r.Context(), approvalID)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "approval request not found")
		return nil, false
	}
	orgID := middleware.GetOrgID(r.Context())
	if ar.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, "approval request not found")
		return nil, false
	}
	return ar, true
}
