package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type ProjectHandler struct {
	store domain.Store
}

func NewProjectHandler(store domain.Store) *ProjectHandler {
	return &ProjectHandler{store: store}
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	if orgID == "" {
		httputil.Error(w, http.StatusForbidden, "no organization associated with your account")
		return
	}

	var req struct {
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	if !validateStringLength(req.Name, 255) {
		httputil.Error(w, http.StatusBadRequest, "name must be at most 255 characters")
		return
	}
	if req.Slug == "" {
		req.Slug = slugify(req.Name)
	}

	project := &domain.Project{OrgID: orgID, Name: req.Name, Slug: req.Slug}
	if err := h.store.CreateProject(r.Context(), project); err != nil {
		log.Warn("project create failed", "org_id", orgID, "slug", req.Slug, "err", err)
		httputil.Error(w, http.StatusConflict, "project slug already exists")
		return
	}

	httputil.JSON(w, http.StatusCreated, project)
}

func (h *ProjectHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	projects, err := h.store.ListProjects(r.Context(), orgID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list projects")
		return
	}
	if projects == nil {
		projects = []domain.Project{}
	}
	httputil.JSON(w, http.StatusOK, projects)
}

func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	project, ok := verifyProjectOwnership(h.store, r, w)
	if !ok {
		return
	}
	httputil.JSON(w, http.StatusOK, project)
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	project, ok := verifyProjectOwnership(h.store, r, w)
	if !ok {
		return
	}
	if err := h.store.DeleteProject(r.Context(), project.ID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to delete project")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Environments ---

type EnvironmentHandler struct {
	store domain.Store
}

func NewEnvironmentHandler(store domain.Store) *EnvironmentHandler {
	return &EnvironmentHandler{store: store}
}

func (h *EnvironmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")

	var req struct {
		Name  string `json:"name"`
		Slug  string `json:"slug"`
		Color string `json:"color"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	if req.Slug == "" {
		req.Slug = slugify(req.Name)
	}
	if req.Color == "" {
		req.Color = "#6B7280"
	}

	env := &domain.Environment{ProjectID: projectID, Name: req.Name, Slug: req.Slug, Color: req.Color}
	if err := h.store.CreateEnvironment(r.Context(), env); err != nil {
		httputil.Error(w, http.StatusConflict, "environment slug already exists in this project")
		return
	}

	httputil.JSON(w, http.StatusCreated, env)
}

func (h *EnvironmentHandler) List(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	envs, err := h.store.ListEnvironments(r.Context(), projectID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list environments")
		return
	}
	if envs == nil {
		envs = []domain.Environment{}
	}
	httputil.JSON(w, http.StatusOK, envs)
}

func (h *EnvironmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	id := chi.URLParam(r, "envID")
	if err := h.store.DeleteEnvironment(r.Context(), id); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to delete environment")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
