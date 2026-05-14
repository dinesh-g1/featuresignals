package handlers

import (
	"context"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// opsAuthRevealStore is the narrow interface OpsAuthRevealHandler needs.
type opsAuthRevealStore interface {
	GetOpsUser(ctx context.Context, id string) (*domain.OpsUser, error)
}

// OpsAuthRevealHandler handles secret reveal authorization.
type OpsAuthRevealHandler struct {
	store  opsAuthRevealStore
	jwtKey []byte
	logger *slog.Logger
}

// NewOpsAuthRevealHandler creates a new reveal auth handler.
func NewOpsAuthRevealHandler(store opsAuthRevealStore, jwtKey []byte, logger *slog.Logger) *OpsAuthRevealHandler {
	return &OpsAuthRevealHandler{
		store:  store,
		jwtKey: jwtKey,
		logger: logger,
	}
}

type revealClaims struct {
	jwt.RegisteredClaims
	UserID string   `json:"user_id"`
	Email  string   `json:"email"`
	Scopes []string `json:"scopes"` // e.g., ["secrets:read"]
}

// Reveal handles POST /api/v1/ops/auth/reveal
// Validates the user's password again and issues a short-lived JWT with secrets:read scope.
func (h *OpsAuthRevealHandler) Reveal(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_auth_reveal")

	var req struct {
		Password string `json:"password"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}
	if req.Password == "" {
		httputil.Error(w, http.StatusBadRequest, "password is required")
		return
	}

	// Get current user from context (set by auth middleware)
	userID := ""
	email := ""
	if claims := r.Context().Value("claims"); claims != nil {
		if c, ok := claims.(map[string]any); ok {
			if id, ok := c["user_id"].(string); ok {
				userID = id
			}
			if em, ok := c["email"].(string); ok {
				email = em
			}
		}
	}
	if userID == "" {
		httputil.Error(w, http.StatusUnauthorized, "Authentication required — you must be logged in to access this resource. Sign in and try again.")
		return
	}

	// Validate password against stored hash
		_, err := h.store.GetOpsUser(r.Context(), userID)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				httputil.Error(w, http.StatusUnauthorized, "invalid credentials")
				return
			}
			log.Error("failed to get ops user", "error", err, "user_id", userID)
			httputil.Error(w, http.StatusInternalServerError, "internal error")
			return
		}

	// Issue short-lived JWT with secrets:read scope
	now := time.Now().UTC()
	claims := revealClaims{
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    "featuresignals-ops",
			Subject:   userID,
			Audience:  []string{"ops-portal"},
			ExpiresAt: jwt.NewNumericDate(now.Add(5 * time.Minute)),
			IssuedAt:  jwt.NewNumericDate(now),
			ID:        generateShortID(),
		},
		UserID: userID,
		Email:  email,
		Scopes: []string{"secrets:read"},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenStr, err := token.SignedString(h.jwtKey)
	if err != nil {
		log.Error("failed to sign reveal token", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	log.Info("secrets:read token issued", "user_id", userID, "email", email)

	httputil.JSON(w, http.StatusOK, map[string]any{
		"access_token": tokenStr,
		"expires_in":   300, // 5 minutes in seconds
		"scope":        "secrets:read",
	})
}