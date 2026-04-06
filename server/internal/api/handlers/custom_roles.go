package handlers

import (
	"errors"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type customRoleStore interface {
	domain.CustomRoleStore
	domain.AuditWriter
}

type CustomRoleHandler struct {
	store customRoleStore
}

func NewCustomRoleHandler(store customRoleStore) *CustomRoleHandler {
	return &CustomRoleHandler{store: store}
}

func (h *CustomRoleHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	roles, err := h.store.ListCustomRoles(r.Context(), orgID)
	if err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to list custom roles", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(roles, len(roles), len(roles), 0))
}

func (h *CustomRoleHandler) Get(w http.ResponseWriter, r *http.Request) {
	roleID := chi.URLParam(r, "roleID")
	orgID := middleware.GetOrgID(r.Context())

	role, err := h.store.GetCustomRole(r.Context(), roleID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "role not found")
		} else {
			httputil.Error(w, http.StatusInternalServerError, "internal error")
		}
		return
	}
	if role.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, "role not found")
		return
	}
	httputil.JSON(w, http.StatusOK, role)
}

type createCustomRoleRequest struct {
	Name        string                       `json:"name"`
	Description string                       `json:"description"`
	BaseRole    string                       `json:"base_role"`
	Permissions domain.CustomRolePermissions `json:"permissions"`
}

func (h *CustomRoleHandler) Create(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "custom_roles")
	orgID := middleware.GetOrgID(r.Context())

	var req createCustomRoleRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "name is required")
		return
	}

	baseRole := domain.Role(req.BaseRole)
	if baseRole != domain.RoleAdmin && baseRole != domain.RoleDeveloper && baseRole != domain.RoleViewer {
		httputil.Error(w, http.StatusUnprocessableEntity, "base_role must be admin, developer, or viewer")
		return
	}

	role := &domain.CustomRole{
		OrgID:       orgID,
		Name:        req.Name,
		Description: req.Description,
		BaseRole:    baseRole,
		Permissions: req.Permissions,
	}

	if err := h.store.CreateCustomRole(r.Context(), role); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "role with this name already exists")
			return
		}
		logger.Error("failed to create custom role", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	actorID := middleware.GetUserID(r.Context())
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &actorID, ActorType: "user",
		Action: "custom_role.created", ResourceType: "custom_role", ResourceID: &role.ID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	httputil.JSON(w, http.StatusCreated, role)
}

func (h *CustomRoleHandler) Update(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "custom_roles")
	roleID := chi.URLParam(r, "roleID")
	orgID := middleware.GetOrgID(r.Context())

	existing, err := h.store.GetCustomRole(r.Context(), roleID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "role not found")
		} else {
			httputil.Error(w, http.StatusInternalServerError, "internal error")
		}
		return
	}
	if existing.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, "role not found")
		return
	}

	var req createCustomRoleRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name != "" {
		existing.Name = req.Name
	}
	if req.Description != "" {
		existing.Description = req.Description
	}
	if req.BaseRole != "" {
		baseRole := domain.Role(req.BaseRole)
		if baseRole != domain.RoleAdmin && baseRole != domain.RoleDeveloper && baseRole != domain.RoleViewer {
			httputil.Error(w, http.StatusUnprocessableEntity, "base_role must be admin, developer, or viewer")
			return
		}
		existing.BaseRole = baseRole
	}
	existing.Permissions = req.Permissions

	if err := h.store.UpdateCustomRole(r.Context(), existing); err != nil {
		logger.Error("failed to update custom role", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	actorID := middleware.GetUserID(r.Context())
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &actorID, ActorType: "user",
		Action: "custom_role.updated", ResourceType: "custom_role", ResourceID: &roleID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	httputil.JSON(w, http.StatusOK, existing)
}

func (h *CustomRoleHandler) Delete(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "custom_roles")
	roleID := chi.URLParam(r, "roleID")
	orgID := middleware.GetOrgID(r.Context())

	existing, err := h.store.GetCustomRole(r.Context(), roleID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "role not found")
		} else {
			httputil.Error(w, http.StatusInternalServerError, "internal error")
		}
		return
	}
	if existing.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, "role not found")
		return
	}

	if err := h.store.DeleteCustomRole(r.Context(), roleID); err != nil {
		logger.Error("failed to delete custom role", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	actorID := middleware.GetUserID(r.Context())
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &actorID, ActorType: "user",
		Action: "custom_role.deleted", ResourceType: "custom_role", ResourceID: &roleID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	w.WriteHeader(http.StatusNoContent)
}
