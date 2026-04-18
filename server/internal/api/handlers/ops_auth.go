package handlers

import (
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"golang.org/x/crypto/bcrypt"
)

// OpsAuthHandler handles ops portal authentication endpoints.
type OpsAuthHandler struct {
	store  domain.OpsPortalStore
	logger *slog.Logger
}

// NewOpsAuthHandler creates a new ops auth handler.
func NewOpsAuthHandler(store domain.OpsPortalStore, logger *slog.Logger) *OpsAuthHandler {
	return &OpsAuthHandler{store: store, logger: logger}
}

// Login handles POST /api/v1/ops/auth/login
func (h *OpsAuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "ops_auth_login")

	var req domain.OpsLoginRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	user, err := h.store.GetOpsUserByEmail(r.Context(), req.Email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			// Use same error message to prevent email enumeration
			httputil.Error(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		logger.Error("failed to get ops user", "error", err, "email", req.Email)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	// Generate tokens
	accessToken, err := generateToken(user.ID, user.OpsRole, 8*time.Hour)
	if err != nil {
		logger.Error("failed to generate access token", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	refreshTokenRaw := generateRefreshToken()
	refreshTokenHash := hashToken(refreshTokenRaw)

	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)
	if _, err := h.store.CreateOpsSession(r.Context(), user.ID, refreshTokenHash, expiresAt); err != nil {
		logger.Error("failed to create session", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	logger.Info("ops user logged in", "ops_user_id", user.ID, "role", user.OpsRole)

	// Clear password hash from response
	user.PasswordHash = ""

	httputil.JSON(w, http.StatusOK, domain.OpsLoginResponse{
		Token:        accessToken,
		RefreshToken: refreshTokenRaw,
		ExpiresAt:    expiresAt,
		User:         *user,
	})
}

// Refresh handles POST /api/v1/ops/auth/refresh
func (h *OpsAuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "ops_auth_refresh")

	var req domain.OpsRefreshRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	refreshTokenHash := hashToken(req.RefreshToken)
	user, err := h.store.GetOpsSessionByRefreshToken(r.Context(), refreshTokenHash)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusUnauthorized, "invalid or expired refresh token")
			return
		}
		logger.Error("failed to get session", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Rotate refresh token
	newRefreshTokenRaw := generateRefreshToken()
	newRefreshTokenHash := hashToken(newRefreshTokenRaw)
	expiresAt := time.Now().UTC().Add(7 * 24 * time.Hour)

	// Delete old session, create new one
	if err := h.store.DeleteOpsSession(r.Context(), user.ID, refreshTokenHash); err != nil {
		logger.Warn("failed to delete old session", "error", err)
	}
	if _, err := h.store.CreateOpsSession(r.Context(), user.ID, newRefreshTokenHash, expiresAt); err != nil {
		logger.Error("failed to create new session", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	accessToken, err := generateToken(user.ID, user.OpsRole, 8*time.Hour)
	if err != nil {
		logger.Error("failed to generate access token", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	httputil.JSON(w, http.StatusOK, domain.OpsLoginResponse{
		Token:        accessToken,
		RefreshToken: newRefreshTokenRaw,
		ExpiresAt:    expiresAt,
		User:         *user,
	})
}

// Logout handles POST /api/v1/ops/auth/logout
func (h *OpsAuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "ops_auth_logout")

	opsUserID := getOpsUserID(r.Context())
	if opsUserID == "" {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	var req domain.OpsRefreshRequest
	_ = json.NewDecoder(r.Body).Decode(&req)

	if req.RefreshToken != "" {
		refreshTokenHash := hashToken(req.RefreshToken)
		if err := h.store.DeleteOpsSession(r.Context(), opsUserID, refreshTokenHash); err != nil {
			logger.Warn("failed to delete session", "error", err)
		}
	}

	logger.Info("ops user logged out", "ops_user_id", opsUserID)
	w.WriteHeader(http.StatusNoContent)
}

// ─── Token helpers ────────────────────────────────────────────────────

func generateToken(opsUserID, role string, ttl time.Duration) (string, error) {
	// Simple JWT-like token: base64(payload).signature
	// In production, use a proper JWT library
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}

func generateRefreshToken() string {
	b := make([]byte, 48)
	_, _ = rand.Read(b)
	return hex.EncodeToString(b)
}

func hashToken(token string) string {
	h := sha256.Sum256([]byte(token))
	return hex.EncodeToString(h[:])
}

func getOpsUserID(ctx context.Context) string {
	v := ctx.Value(opsUserIDKey{})
	if s, ok := v.(string); ok {
		return s
	}
	return ""
}

type opsUserIDKey struct{}
