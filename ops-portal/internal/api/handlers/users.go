package handlers

import (
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/featuresignals/ops-portal/internal/httputil"
	"github.com/featuresignals/ops-portal/internal/api/middleware"
	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// UserHandler manages ops portal users.
type UserHandler struct {
	store  domain.OpsUserStore
	audit  domain.AuditStore
	logger *slog.Logger
}

// NewUserHandler creates a new UserHandler.
func NewUserHandler(store domain.OpsUserStore, audit domain.AuditStore, logger *slog.Logger) *UserHandler {
	return &UserHandler{
		store:  store,
		audit:  audit,
		logger: logger.With("handler", "users"),
	}
}

// List returns all ops users.
func (h *UserHandler) List(w http.ResponseWriter, r *http.Request) {
	users, err := h.store.List(r.Context())
	if err != nil {
		h.logger.Error("failed to list users", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list users")
		return
	}

	type userResponse struct {
		ID          string     `json:"id"`
		Email       string     `json:"email"`
		Name        string     `json:"name"`
		Role        string     `json:"role"`
		CreatedAt   time.Time  `json:"created_at"`
		LastLoginAt *time.Time `json:"last_login_at,omitempty"`
	}

	resp := make([]userResponse, 0, len(users))
	for _, u := range users {
		resp = append(resp, userResponse{
			ID:          u.ID,
			Email:       u.Email,
			Name:        u.Name,
			Role:        u.Role,
			CreatedAt:   u.CreatedAt,
			LastLoginAt: u.LastLoginAt,
		})
	}

	httputil.JSON(w, http.StatusOK, resp)
}

// Get returns a single user.
func (h *UserHandler) Get(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		httputil.Error(w, http.StatusBadRequest, "user id is required")
		return
	}

	user, err := h.store.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "user not found")
			return
		}
		h.logger.Error("failed to get user", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to get user")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"id":           user.ID,
		"email":        user.Email,
		"name":         user.Name,
		"role":         user.Role,
		"created_at":   user.CreatedAt,
		"last_login_at": user.LastLoginAt,
	})
}

// createUserRequest is the expected JSON body for creating a user.
type createUserRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	Role     string `json:"role"`
}

// Create adds a new ops user.
func (h *UserHandler) Create(w http.ResponseWriter, r *http.Request) {
	var req createUserRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validation
	if req.Email == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "email is required")
		return
	}
	if req.Password == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "password is required")
		return
	}
	if len(req.Password) < 8 {
		httputil.Error(w, http.StatusUnprocessableEntity, "password must be at least 8 characters")
		return
	}
	if req.Name == "" {
		req.Name = req.Email
	}
	if req.Role == "" {
		req.Role = "viewer"
	}
	if req.Role != "admin" && req.Role != "engineer" && req.Role != "viewer" {
		httputil.Error(w, http.StatusUnprocessableEntity, "role must be admin, engineer, or viewer")
		return
	}

	// Hash password
	hash, err := bcrypt.GenerateFromPassword([]byte(req.Password), bcrypt.DefaultCost)
	if err != nil {
		h.logger.Error("failed to hash password", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	user := &domain.OpsUser{
		ID:           uuid.New().String(),
		Email:        req.Email,
		PasswordHash: string(hash),
		Name:         req.Name,
		Role:         req.Role,
		CreatedAt:    time.Now().UTC(),
	}

	if err := h.store.Create(r.Context(), user); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "a user with this email already exists")
			return
		}
		h.logger.Error("failed to create user", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create user")
		return
	}

	// Audit
	_ = h.audit.Append(r.Context(), &domain.AuditEntry{
		UserID:     middleware.GetUserID(r.Context()),
		Action:     "user.create",
		TargetType: "user",
		TargetID:   user.ID,
		Details:    `{"email":"` + user.Email + `","role":"` + user.Role + `"}`,
		IP:         r.RemoteAddr,
	})

	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"id":    user.ID,
		"email": user.Email,
		"name":  user.Name,
		"role":  user.Role,
	})
}

// Update modifies a user's editable fields.
func (h *UserHandler) Update(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		httputil.Error(w, http.StatusBadRequest, "user id is required")
		return
	}

	var req struct {
		Email string `json:"email"`
		Name  string `json:"name"`
		Role  string `json:"role"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.store.GetByID(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "user not found")
			return
		}
		h.logger.Error("failed to get user for update", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to update user")
		return
	}

	if req.Email != "" {
		user.Email = req.Email
	}
	if req.Name != "" {
		user.Name = req.Name
	}
	if req.Role != "" {
		user.Role = req.Role
	}

	if err := h.store.Update(r.Context(), user); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "user not found")
			return
		}
		h.logger.Error("failed to update user", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to update user")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"id":    user.ID,
		"email": user.Email,
		"name":  user.Name,
		"role":  user.Role,
	})
}

// Delete removes a user.
func (h *UserHandler) Delete(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if id == "" {
		httputil.Error(w, http.StatusBadRequest, "user id is required")
		return
	}

	// Prevent deleting yourself
	currentUserID := middleware.GetUserID(r.Context())
	if id == currentUserID {
		httputil.Error(w, http.StatusUnprocessableEntity, "cannot delete your own account")
		return
	}

	if err := h.store.Delete(r.Context(), id); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "user not found")
			return
		}
		h.logger.Error("failed to delete user", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to delete user")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"status": "deleted"})
}