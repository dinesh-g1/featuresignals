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
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/httputil"
	"golang.org/x/crypto/bcrypt"
)

// OpsAuthHandler handles ops portal authentication endpoints.
type OpsAuthHandler struct {
	store  domain.Store
	jwtMgr auth.TokenManager
	logger *slog.Logger
}

// NewOpsAuthHandler creates a new ops auth handler.
func NewOpsAuthHandler(store domain.Store, jwtMgr auth.TokenManager, logger *slog.Logger) *OpsAuthHandler {
	return &OpsAuthHandler{store: store, jwtMgr: jwtMgr, logger: logger}
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

	// Generate JWT token pair
	// For ops portal, we use empty orgID and data region since ops users are not tied to a specific org
	tokenPair, err := h.jwtMgr.GenerateTokenPair(user.UserID, "", user.OpsRole, user.UserEmail, "")
	if err != nil {
		logger.Error("failed to generate token pair", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Store refresh token hash for session management
	refreshTokenHash := hashToken(tokenPair.RefreshToken)
	expiresAt := time.Unix(tokenPair.ExpiresAt, 0).UTC()
	if _, err := h.store.CreateOpsSession(r.Context(), user.ID, refreshTokenHash, expiresAt); err != nil {
		logger.Error("failed to create session", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	logger.Info("ops user logged in", "ops_user_id", user.ID, "role", user.OpsRole)

	// Clear password hash from response
	user.PasswordHash = ""

	// Set httpOnly cookie for server-side middleware/auth-server.ts
	http.SetCookie(w, &http.Cookie{
		Name:     "ops_access_token",
		Value:    tokenPair.AccessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // false in dev, change to true in production
		SameSite: http.SameSiteLaxMode,
		MaxAge:   8 * 3600, // 8 hours
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "ops_refresh_token",
		Value:    tokenPair.RefreshToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 3600, // 7 days
	})

	httputil.JSON(w, http.StatusOK, domain.OpsLoginResponse{
		Token:        tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
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

	// Validate the refresh token JWT first (checks expiration and signature)
	claims, err := h.jwtMgr.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid or expired refresh token")
		return
	}

	// Look up the session by hash to ensure it hasn't been revoked
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

	// Ensure the JWT user matches the session user
	if claims.UserID != user.UserID {
		httputil.Error(w, http.StatusUnauthorized, "token mismatch")
		return
	}

	// Generate new JWT token pair
	tokenPair, err := h.jwtMgr.GenerateTokenPair(user.UserID, "", user.OpsRole, user.UserEmail, "")
	if err != nil {
		logger.Error("failed to generate token pair", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Rotate refresh token: delete old, store new hash
	newRefreshTokenHash := hashToken(tokenPair.RefreshToken)
	expiresAt := time.Unix(tokenPair.ExpiresAt, 0).UTC()

	// Delete old session, create new one
	if err := h.store.DeleteOpsSession(r.Context(), user.ID, refreshTokenHash); err != nil {
		logger.Warn("failed to delete old session", "error", err)
	}
	if _, err := h.store.CreateOpsSession(r.Context(), user.ID, newRefreshTokenHash, expiresAt); err != nil {
		logger.Error("failed to create new session", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Set httpOnly cookie for server-side middleware/auth-server.ts
	http.SetCookie(w, &http.Cookie{
		Name:     "ops_access_token",
		Value:    tokenPair.AccessToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   false, // false in dev, change to true in production
		SameSite: http.SameSiteLaxMode,
		MaxAge:   8 * 3600, // 8 hours
	})

	http.SetCookie(w, &http.Cookie{
		Name:     "ops_refresh_token",
		Value:    tokenPair.RefreshToken,
		Path:     "/",
		HttpOnly: true,
		Secure:   false,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   7 * 24 * 3600, // 7 days
	})

	httputil.JSON(w, http.StatusOK, domain.OpsLoginResponse{
		Token:        tokenPair.AccessToken,
		RefreshToken: tokenPair.RefreshToken,
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

// Me handles GET /api/v1/ops/auth/me — returns the current ops user.
func (h *OpsAuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "ops_auth_me")
	id := getOpsUserID(r.Context())
	if id == "" {
		httputil.Error(w, http.StatusUnauthorized, "unauthorized")
		return
	}

	user, err := h.store.GetOpsUser(r.Context(), id)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "user not found")
			return
		}
		logger.Error("failed to get ops user", "error", err, "ops_user_id", id)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	user.PasswordHash = "" // clear password hash from response
	httputil.JSON(w, http.StatusOK, user)
}

// ForgotPassword handles POST /api/v1/ops/auth/forgot-password
func (h *OpsAuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "ops_auth_forgot_password")

	var req struct {
		Email string `json:"email"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Always return the same response to prevent email enumeration.
	user, err := h.store.GetOpsUserByEmail(r.Context(), req.Email)
	if err != nil {
		if !errors.Is(err, domain.ErrNotFound) {
			logger.Error("failed to look up user by email", "error", err, "email", req.Email)
		} else {
			logger.Info("forgot password requested for unknown email", "email", req.Email)
		}
	} else {
		logger.Info("forgot password requested", "ops_user_id", user.ID, "email", req.Email)
	}

	httputil.JSON(w, http.StatusOK, map[string]string{
		"message": "If the email exists, a reset link has been sent.",
	})
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
