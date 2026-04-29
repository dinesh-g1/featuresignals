package handlers

import (
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/ops-portal/internal/config"
	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/featuresignals/ops-portal/internal/httputil"
	"github.com/featuresignals/ops-portal/internal/api/middleware"
	"github.com/golang-jwt/jwt/v5"
	"github.com/google/uuid"
	"golang.org/x/crypto/bcrypt"
)

// AuthHandler handles authentication (login, refresh, logout, me).
type AuthHandler struct {
	users   domain.OpsUserStore
	audit   domain.AuditStore
	config  *config.Config
	logger  *slog.Logger
	secrets map[string]string // token hash → user ID for refresh token tracking (in-memory)
}

// NewAuthHandler creates a new AuthHandler.
func NewAuthHandler(users domain.OpsUserStore, audit domain.AuditStore, cfg *config.Config, logger *slog.Logger) *AuthHandler {
	return &AuthHandler{
		users:   users,
		audit:   audit,
		config:  cfg,
		logger:  logger.With("handler", "auth"),
		secrets: make(map[string]string),
	}
}

// loginRequest is the expected JSON body for login.
type loginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// Login authenticates a user and returns JWT tokens via httpOnly cookie.
func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" {
		httputil.Error(w, http.StatusBadRequest, "email and password are required")
		return
	}

	user, err := h.users.GetByEmail(r.Context(), req.Email)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			// Use a generic message to avoid user enumeration
			httputil.Error(w, http.StatusUnauthorized, "invalid email or password")
			return
		}
		h.logger.Error("failed to lookup user", "error", err, "email", req.Email)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if err := bcrypt.CompareHashAndPassword([]byte(user.PasswordHash), []byte(req.Password)); err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid email or password")
		return
	}

	// Update last login time
	now := time.Now().UTC()
	user.LastLoginAt = &now
	if err := h.users.Update(r.Context(), user); err != nil {
		h.logger.Error("failed to update last login", "error", err, "user_id", user.ID)
		// Non-fatal — continue with login
	}

	// Generate tokens
	accessToken, err := h.generateToken(user, h.config.TokenTTL)
	if err != nil {
		h.logger.Error("failed to generate access token", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	refreshToken, err := h.generateToken(user, h.config.RefreshTTL)
	if err != nil {
		h.logger.Error("failed to generate refresh token", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Store refresh token hash for revocation tracking
	refreshHash := sha256Hex(refreshToken)
	h.secrets[refreshHash] = user.ID

	// Set httpOnly cookies
	setCookie(w, "jwt", accessToken, h.config.TokenTTL, h.config.IsProduction())
	setCookie(w, "refresh_token", refreshToken, h.config.RefreshTTL, h.config.IsProduction())

	// Log audit
	if h.audit != nil {
		entry := &domain.AuditEntry{
			UserID: user.ID,
			Action: "auth.login",
			Details: `{"email":"` + user.Email + `"}`,
			IP:     r.RemoteAddr,
		}
		_ = h.audit.Append(r.Context(), entry)
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"user": map[string]string{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}

// Refresh generates new access and refresh tokens from a valid refresh token.
func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	c, err := r.Cookie("refresh_token")
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "refresh token required")
		return
	}

	claims, err := h.validateToken(c.Value)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "invalid or expired refresh token")
		return
	}

	// Verify refresh token hasn't been used (rotation)
	hash := sha256Hex(c.Value)
	if _, exists := h.secrets[hash]; !exists {
		httputil.Error(w, http.StatusUnauthorized, "refresh token has been revoked")
		return
	}
	// Remove old hash (rotation)
	delete(h.secrets, hash)

	user, err := h.users.GetByID(r.Context(), claims.UserID)
	if err != nil {
		httputil.Error(w, http.StatusUnauthorized, "user not found")
		return
	}

	// Generate new tokens
	accessToken, err := h.generateToken(user, h.config.TokenTTL)
	if err != nil {
		h.logger.Error("failed to generate access token", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	refreshToken, err := h.generateToken(user, h.config.RefreshTTL)
	if err != nil {
		h.logger.Error("failed to generate refresh token", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Store new refresh token hash
	refreshHash := sha256Hex(refreshToken)
	h.secrets[refreshHash] = user.ID

	setCookie(w, "jwt", accessToken, h.config.TokenTTL, h.config.IsProduction())
	setCookie(w, "refresh_token", refreshToken, h.config.RefreshTTL, h.config.IsProduction())

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"user": map[string]string{
			"id":    user.ID,
			"email": user.Email,
			"name":  user.Name,
			"role":  user.Role,
		},
	})
}

// Logout clears the JWT cookie.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	// Get user info before clearing cookies
	userID := middleware.GetUserID(r.Context())

	// Clear cookies by setting MaxAge to -1
	setCookie(w, "jwt", "", -1, h.config.IsProduction())
	setCookie(w, "refresh_token", "", -1, h.config.IsProduction())

	// Also try to get and revoke the refresh token
	if c, err := r.Cookie("refresh_token"); err == nil {
		hash := sha256Hex(c.Value)
		delete(h.secrets, hash)
	}

	if userID != "" && h.audit != nil {
		entry := &domain.AuditEntry{
			UserID: userID,
			Action: "auth.logout",
			IP:     r.RemoteAddr,
		}
		_ = h.audit.Append(r.Context(), entry)
	}

	httputil.JSON(w, http.StatusOK, map[string]string{"message": "logged out"})
}

// Me returns the current authenticated user's information.
func (h *AuthHandler) Me(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	if userID == "" {
		httputil.Error(w, http.StatusUnauthorized, "authentication required")
		return
	}

	user, err := h.users.GetByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusUnauthorized, "user not found")
			return
		}
		h.logger.Error("failed to get user", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]string{
		"id":    user.ID,
		"email": user.Email,
		"name":  user.Name,
		"role":  user.Role,
	})
}

// ValidateToken validates a JWT token string and returns the claims.
func (h *AuthHandler) ValidateToken(tokenString string) (*middleware.Claims, error) {
	return h.validateToken(tokenString)
}

func (h *AuthHandler) generateToken(user *domain.OpsUser, ttl time.Duration) (string, error) {
	now := time.Now().UTC()
	claims := middleware.Claims{
		UserID: user.ID,
		Email:  user.Email,
		Name:   user.Name,
		Role:   user.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			ID:        uuid.New().String(),
			Subject:   user.ID,
			IssuedAt:  jwt.NewNumericDate(now),
			ExpiresAt: jwt.NewNumericDate(now.Add(ttl)),
			Issuer:    "ops-portal",
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString([]byte(h.config.JWTSecret))
}

func (h *AuthHandler) validateToken(tokenString string) (*middleware.Claims, error) {
	token, err := jwt.ParseWithClaims(tokenString, &middleware.Claims{}, func(token *jwt.Token) (interface{}, error) {
		if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(h.config.JWTSecret), nil
	})
	if err != nil {
		return nil, err
	}

	claims, ok := token.Claims.(*middleware.Claims)
	if !ok || !token.Valid {
		return nil, errors.New("invalid token")
	}

	return claims, nil
}

// setCookie sets an httpOnly cookie with the given parameters.
func setCookie(w http.ResponseWriter, name, value string, maxAge time.Duration, secure bool) {
	maxAgeSeconds := int(maxAge.Seconds())
	if maxAge < 0 {
		maxAgeSeconds = -1
	}

	http.SetCookie(w, &http.Cookie{
		Name:     name,
		Value:    value,
		Path:     "/",
		HttpOnly: true,
		Secure:   secure,
		SameSite: http.SameSiteLaxMode,
		MaxAge:   maxAgeSeconds,
	})
}

// sha256Hex returns the SHA-256 hex digest of a string.
func sha256Hex(s string) string {
	hash := sha256.Sum256([]byte(s))
	return hex.EncodeToString(hash[:])
}

// compile-time interface check
var _ middleware.TokenValidator = (*AuthHandler)(nil)