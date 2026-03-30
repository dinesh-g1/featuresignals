package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store/postgres"
)

type ProjectHandler struct {
	store *postgres.Store
}

func NewProjectHandler(store *postgres.Store) *ProjectHandler {
	return &ProjectHandler{store: store}
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

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
	if req.Slug == "" {
		req.Slug = slugify(req.Name)
	}

	project := &domain.Project{OrgID: orgID, Name: req.Name, Slug: req.Slug}
	if err := h.store.CreateProject(r.Context(), project); err != nil {
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
	id := chi.URLParam(r, "projectID")
	project, err := h.store.GetProject(r.Context(), id)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "project not found")
		return
	}
	httputil.JSON(w, http.StatusOK, project)
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "projectID")
	if err := h.store.DeleteProject(r.Context(), id); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to delete project")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}

// --- Environments ---

type EnvironmentHandler struct {
	store *postgres.Store
}

func NewEnvironmentHandler(store *postgres.Store) *EnvironmentHandler {
	return &EnvironmentHandler{store: store}
}

func (h *EnvironmentHandler) Create(w http.ResponseWriter, r *http.Request) {
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
	id := chi.URLParam(r, "envID")
	if err := h.store.DeleteEnvironment(r.Context(), id); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to delete environment")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
