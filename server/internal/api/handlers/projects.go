package handlers

import (
	"encoding/json"
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type projectStore interface {
	domain.ProjectReader
	domain.ProjectWriter
	domain.EnvironmentWriter
	domain.AuditWriter
}

type ProjectHandler struct {
	store projectStore
}

func NewProjectHandler(store projectStore) *ProjectHandler {
	return &ProjectHandler{store: store}
}

type CreateProjectRequest struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

func (h *ProjectHandler) Create(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	if orgID == "" {
		httputil.Error(w, http.StatusForbidden, "no organization associated with your account")
		return
	}

	var req CreateProjectRequest
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

	userID := middleware.GetUserID(r.Context())
	afterState, _ := json.Marshal(project)
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ProjectID: &project.ID, ActorID: &userID, ActorType: "user",
		Action: "project.created", ResourceType: "project", ResourceID: &project.ID,
		AfterState: afterState, IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	httputil.JSON(w, http.StatusCreated, dto.ProjectFromDomain(project))
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
	all := dto.ProjectSliceFromDomain(projects)
	p := dto.ParsePagination(r)
	page, total := dto.Paginate(all, p)
	links := domain.LinksForProjectsCollection()
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(page, total, p.Limit, p.Offset, links...))
}

func (h *ProjectHandler) Get(w http.ResponseWriter, r *http.Request) {
	project, ok := verifyProjectOwnership(h.store, r, w)
	if !ok {
		return
	}
	resp := dto.ProjectFromDomain(project)
	respWithLinks := map[string]interface{}{
		"project": resp,
		"_links":  domain.LinksForProject(project.ID),
	}
	httputil.JSON(w, http.StatusOK, respWithLinks)
}

func (h *ProjectHandler) Delete(w http.ResponseWriter, r *http.Request) {
	project, ok := verifyProjectOwnership(h.store, r, w)
	if !ok {
		return
	}
	beforeState, _ := json.Marshal(project)
	if err := h.store.DeleteProject(r.Context(), project.ID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to delete project")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ProjectID: &project.ID, ActorID: &userID, ActorType: "user",
		Action: "project.deleted", ResourceType: "project", ResourceID: &project.ID,
		BeforeState: beforeState, IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	w.WriteHeader(http.StatusNoContent)
}

type UpdateProjectRequest struct {
	Name string `json:"name"`
	Slug string `json:"slug"`
}

func (h *ProjectHandler) Update(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	project, ok := verifyProjectOwnership(h.store, r, w)
	if !ok {
		return
	}

	var req UpdateProjectRequest
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

	beforeState, _ := json.Marshal(project)
	project.Name = req.Name
	if req.Slug != "" {
		project.Slug = req.Slug
	}

	if err := h.store.UpdateProject(r.Context(), project); err != nil {
		log.Warn("project update failed", "project_id", project.ID, "err", err)
		httputil.Error(w, http.StatusConflict, "project slug already exists")
		return
	}

	afterState, _ := json.Marshal(project)
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ProjectID: &project.ID, ActorID: &userID, ActorType: "user",
		Action: "project.updated", ResourceType: "project", ResourceID: &project.ID,
		BeforeState: beforeState, AfterState: afterState, IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	httputil.JSON(w, http.StatusOK, dto.ProjectFromDomain(project))
}

// --- Environments ---

type envHandlerStore interface {
	domain.EnvironmentReader
	domain.EnvironmentWriter
	domain.AuditWriter
	projectGetter
}

type EnvironmentHandler struct {
	store envHandlerStore
}

func NewEnvironmentHandler(store envHandlerStore) *EnvironmentHandler {
	return &EnvironmentHandler{store: store}
}

type CreateEnvironmentRequest struct {
	Name  string `json:"name"`
	Slug  string `json:"slug"`
	Color string `json:"color"`
}

func (h *EnvironmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")

	var req CreateEnvironmentRequest
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

	orgID := middleware.GetOrgID(r.Context())
	env := &domain.Environment{ProjectID: projectID, OrgID: orgID, Name: req.Name, Slug: req.Slug, Color: req.Color}
	if err := h.store.CreateEnvironment(r.Context(), env); err != nil {
		httputil.Error(w, http.StatusConflict, "environment slug already exists in this project")
		return
	}

	userID := middleware.GetUserID(r.Context())
	afterState, _ := json.Marshal(env)
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ProjectID: &projectID, ActorID: &userID, ActorType: "user",
		Action: "environment.created", ResourceType: "environment", ResourceID: &env.ID,
		AfterState: afterState, IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	httputil.JSON(w, http.StatusCreated, dto.EnvironmentFromDomain(env))
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
	all := dto.EnvironmentSliceFromDomain(envs)
	p := dto.ParsePagination(r)
	page, total := dto.Paginate(all, p)
	links := domain.LinksForEnvironmentsCollection(projectID)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(page, total, p.Limit, p.Offset, links...))
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

	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	projectID := chi.URLParam(r, "projectID")
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ProjectID: &projectID, ActorID: &userID, ActorType: "user",
		Action: "environment.deleted", ResourceType: "environment", ResourceID: &id,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	w.WriteHeader(http.StatusNoContent)
}

type UpdateEnvironmentRequest struct {
	Name  string `json:"name"`
	Slug  string `json:"slug"`
	Color string `json:"color"`
}

func (h *EnvironmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	project, ok := verifyProjectOwnership(h.store, r, w)
	if !ok {
		return
	}
	envID := chi.URLParam(r, "envID")

	env, err := h.store.GetEnvironment(r.Context(), envID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "environment not found")
			return
		}
		log.Error("failed to get environment", "env_id", envID, "err", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to get environment")
		return
	}

	// Verify environment belongs to the project
	if env.ProjectID != project.ID {
		httputil.Error(w, http.StatusNotFound, "environment not found")
		return
	}

	var req UpdateEnvironmentRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "name is required")
		return
	}
	if !validateStringLength(req.Name, 100) {
		httputil.Error(w, http.StatusBadRequest, "name must be at most 100 characters")
		return
	}

	beforeState, _ := json.Marshal(env)
	env.Name = req.Name
	if req.Slug != "" {
		env.Slug = req.Slug
	}
	if req.Color != "" {
		env.Color = req.Color
	}

	if err := h.store.UpdateEnvironment(r.Context(), env); err != nil {
		log.Warn("environment update failed", "env_id", env.ID, "err", err)
		httputil.Error(w, http.StatusConflict, "environment slug already exists in this project")
		return
	}

	afterState, _ := json.Marshal(env)
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ProjectID: &env.ProjectID, ActorID: &userID, ActorType: "user",
		Action: "environment.updated", ResourceType: "environment", ResourceID: &env.ID,
		BeforeState: beforeState, AfterState: afterState, IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	httputil.JSON(w, http.StatusOK, dto.EnvironmentFromDomain(env))
}
