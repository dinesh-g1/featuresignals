package handlers

import (
	"net/http"
	"regexp"
	"strings"

	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)


type AuthHandler struct {
	store  domain.Store
	jwtMgr auth.TokenManager
}

func NewAuthHandler(store domain.Store, jwtMgr auth.TokenManager) *AuthHandler {
	return &AuthHandler{store: store, jwtMgr: jwtMgr}
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	OrgName  string `json:"org_name"`
}

type LoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	return strings.Trim(slugRe.ReplaceAllString(strings.ToLower(s), "-"), "-")
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())

	var req RegisterRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" || req.OrgName == "" {
		httputil.Error(w, http.StatusBadRequest, "email, password, name, and org_name are required")
		return
	}
	if len(req.Password) < 8 {
		httputil.Error(w, http.StatusBadRequest, "password must be at least 8 characters")
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		log.Error("password hashing failed", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to hash password")
		return
	}

	user := &domain.User{
		Email:        req.Email,
		PasswordHash: hash,
		Name:         req.Name,
	}
	if err := h.store.CreateUser(r.Context(), user); err != nil {
		log.Warn("registration failed: duplicate email", "email", req.Email)
		httputil.Error(w, http.StatusConflict, "email already registered")
		return
	}

	org := &domain.Organization{
		Name: req.OrgName,
		Slug: slugify(req.OrgName),
	}
	if err := h.store.CreateOrganization(r.Context(), org); err != nil {
		log.Error("failed to create organization", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create organization")
		return
	}

	member := &domain.OrgMember{
		OrgID:  org.ID,
		UserID: user.ID,
		Role:   domain.RoleOwner,
	}
	if err := h.store.AddOrgMember(r.Context(), member); err != nil {
		log.Error("failed to add org member", "error", err, "org_id", org.ID, "user_id", user.ID)
		httputil.Error(w, http.StatusInternalServerError, "failed to add member")
		return
	}

	project := &domain.Project{
		OrgID: org.ID,
		Name:  "Default Project",
		Slug:  "default",
	}
	if err := h.store.CreateProject(r.Context(), project); err != nil {
		log.Error("failed to create default project", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create default project")
		return
	}

	envs := []struct {
		name, slug, color string
	}{
		{"Development", "development", "#22C55E"},
		{"Staging", "staging", "#EAB308"},
		{"Production", "production", "#EF4444"},
	}
	for _, e := range envs {
		env := &domain.Environment{
			ProjectID: project.ID,
			Name:      e.name,
			Slug:      e.slug,
			Color:     e.color,
		}
		h.store.CreateEnvironment(r.Context(), env)
	}

	tokens, err := h.jwtMgr.GenerateTokenPair(user.ID, org.ID, string(domain.RoleOwner))
	if err != nil {
		log.Error("token generation failed", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}

	log.Info("user registered", "user_id", user.ID, "org_id", org.ID, "email", req.Email)

	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"user":         user,
		"organization": org,
		"tokens":       tokens,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())

	var req LoginRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.store.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		log.Warn("login failed: unknown email", "email", req.Email)
		httputil.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		log.Warn("login failed: bad password", "email", req.Email, "user_id", user.ID)
		httputil.Error(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	member, err := h.store.GetOrgMember(r.Context(), "", user.ID)
	orgID := ""
	role := string(domain.RoleDeveloper)
	if err == nil {
		orgID = member.OrgID
		role = string(member.Role)
	}

	if orgID == "" {
		members, _ := h.store.ListOrgMembers(r.Context(), "")
		for _, m := range members {
			if m.UserID == user.ID {
				orgID = m.OrgID
				role = string(m.Role)
				break
			}
		}
	}

	tokens, err := h.jwtMgr.GenerateTokenPair(user.ID, orgID, role)
	if err != nil {
		log.Error("token generation failed on login", "error", err, "user_id", user.ID)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}

	log.Info("user logged in", "user_id", user.ID, "org_id", orgID, "role", role)

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"user":   user,
		"tokens": tokens,
	})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())

	var req RefreshRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	claims, err := h.jwtMgr.ValidateToken(req.RefreshToken)
	if err != nil {
		log.Warn("invalid refresh token")
		httputil.Error(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}

	tokens, err := h.jwtMgr.GenerateTokenPair(claims.UserID, claims.OrgID, claims.Role)
	if err != nil {
		log.Error("token refresh failed", "error", err, "user_id", claims.UserID)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}

	log.Info("token refreshed", "user_id", claims.UserID)

	httputil.JSON(w, http.StatusOK, tokens)
}
