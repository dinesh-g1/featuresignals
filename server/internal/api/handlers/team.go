package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type TeamHandler struct {
	store  domain.Store
	jwtMgr auth.TokenManager
}

func NewTeamHandler(store domain.Store, jwtMgr auth.TokenManager) *TeamHandler {
	return &TeamHandler{store: store, jwtMgr: jwtMgr}
}

type MemberResponse struct {
	ID    string      `json:"id"`
	OrgID string      `json:"org_id"`
	Role  domain.Role `json:"role"`
	Email string      `json:"email"`
	Name  string      `json:"name"`
}

// List returns all org members with user details.
func (h *TeamHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	members, err := h.store.ListOrgMembers(r.Context(), orgID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list members")
		return
	}

	resp := make([]MemberResponse, 0, len(members))
	for _, m := range members {
		user, err := h.store.GetUserByID(r.Context(), m.UserID)
		if err != nil {
			continue
		}
		resp = append(resp, MemberResponse{
			ID:    m.ID,
			OrgID: m.OrgID,
			Role:  m.Role,
			Email: user.Email,
			Name:  user.Name,
		})
	}

	httputil.JSON(w, http.StatusOK, resp)
}

type InviteRequest struct {
	Email string      `json:"email"`
	Role  domain.Role `json:"role"`
}

// Invite adds a user to the organization. If the user doesn't exist yet,
// a stub account is created with a random password (they must reset it).
func (h *TeamHandler) Invite(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	var req InviteRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" {
		httputil.Error(w, http.StatusBadRequest, "email is required")
		return
	}
	if !validateEmail(req.Email) {
		httputil.Error(w, http.StatusBadRequest, "invalid email format")
		return
	}
	if req.Role == "" {
		req.Role = domain.RoleDeveloper
	}
	if req.Role != domain.RoleOwner && req.Role != domain.RoleAdmin &&
		req.Role != domain.RoleDeveloper && req.Role != domain.RoleViewer {
		httputil.Error(w, http.StatusBadRequest, "invalid role")
		return
	}

	user, err := h.store.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		hash, _ := auth.HashPassword("changeme-invited")
		user = &domain.User{
			Email:        req.Email,
			Name:         req.Email,
			PasswordHash: hash,
		}
		if err := h.store.CreateUser(r.Context(), user); err != nil {
			httputil.Error(w, http.StatusConflict, "failed to create user")
			return
		}
	}

	existing, _ := h.store.GetOrgMember(r.Context(), orgID, user.ID)
	if existing != nil {
		httputil.Error(w, http.StatusConflict, "user is already a member of this organization")
		return
	}

	member := &domain.OrgMember{
		OrgID:  orgID,
		UserID: user.ID,
		Role:   req.Role,
	}
	if err := h.store.AddOrgMember(r.Context(), member); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to add member")
		return
	}

	httputil.JSON(w, http.StatusCreated, MemberResponse{
		ID:    member.ID,
		OrgID: orgID,
		Role:  req.Role,
		Email: user.Email,
		Name:  user.Name,
	})
}

type UpdateRoleRequest struct {
	Role domain.Role `json:"role"`
}

// UpdateRole changes a member's role within the organization.
func (h *TeamHandler) UpdateRole(w http.ResponseWriter, r *http.Request) {
	memberID := chi.URLParam(r, "memberID")

	var req UpdateRoleRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Role != domain.RoleOwner && req.Role != domain.RoleAdmin &&
		req.Role != domain.RoleDeveloper && req.Role != domain.RoleViewer {
		httputil.Error(w, http.StatusBadRequest, "invalid role")
		return
	}

	if err := h.store.UpdateOrgMemberRole(r.Context(), memberID, req.Role); err != nil {
		httputil.Error(w, http.StatusNotFound, "member not found")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// Remove deletes a member from the organization.
func (h *TeamHandler) Remove(w http.ResponseWriter, r *http.Request) {
	memberID := chi.URLParam(r, "memberID")
	callerID := middleware.GetUserID(r.Context())

	member, err := h.store.GetOrgMemberByID(r.Context(), memberID)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "member not found")
		return
	}

	if member.UserID == callerID {
		httputil.Error(w, http.StatusBadRequest, "cannot remove yourself")
		return
	}

	if err := h.store.RemoveOrgMember(r.Context(), memberID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to remove member")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}

// ListPermissions returns the per-environment permissions for a member.
func (h *TeamHandler) ListPermissions(w http.ResponseWriter, r *http.Request) {
	memberID := chi.URLParam(r, "memberID")

	perms, err := h.store.ListEnvPermissions(r.Context(), memberID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list permissions")
		return
	}

	httputil.JSON(w, http.StatusOK, perms)
}

type UpdatePermissionsRequest struct {
	Permissions []domain.EnvPermission `json:"permissions"`
}

// UpdatePermissions replaces the per-environment permissions for a member.
func (h *TeamHandler) UpdatePermissions(w http.ResponseWriter, r *http.Request) {
	memberID := chi.URLParam(r, "memberID")

	var req UpdatePermissionsRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	for i := range req.Permissions {
		req.Permissions[i].MemberID = memberID
		if err := h.store.UpsertEnvPermission(r.Context(), &req.Permissions[i]); err != nil {
			httputil.Error(w, http.StatusInternalServerError, "failed to update permissions")
			return
		}
	}

	perms, _ := h.store.ListEnvPermissions(r.Context(), memberID)
	httputil.JSON(w, http.StatusOK, perms)
}
