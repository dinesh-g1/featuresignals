package handlers

import (
	"context"
	"net/http"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type mfaStore interface {
	domain.MFAStore
	domain.UserReader
	domain.AuditWriter
}

type MFAHandler struct {
	store mfaStore
}

func NewMFAHandler(store mfaStore) *MFAHandler {
	return &MFAHandler{store: store}
}

type mfaEnableResponse struct {
	Secret string `json:"secret"`
	QRURI  string `json:"qr_uri"`
}

// Enable generates a new TOTP secret and returns it with a QR URI.
// MFA is not active until Verify is called.
func (h *MFAHandler) Enable(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "mfa")

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		logger.Error("failed to get user", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to get user")
		return
	}

	secret, err := auth.GenerateTOTPSecret()
	if err != nil {
		logger.Error("failed to generate TOTP secret", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate MFA secret")
		return
	}

	if err := h.store.UpsertMFASecret(r.Context(), userID, secret); err != nil {
		logger.Error("failed to store MFA secret", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to store MFA secret")
		return
	}

	uri := auth.TOTPKeyURI(secret, user.Email, "FeatureSignals")
	httputil.JSON(w, http.StatusOK, mfaEnableResponse{
		Secret: secret,
		QRURI:  uri,
	})
}

type mfaVerifyRequest struct {
	Code string `json:"code"`
}

// Verify validates a TOTP code and activates MFA for the user.
func (h *MFAHandler) Verify(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "mfa")

	var req mfaVerifyRequest
	if err := httputil.DecodeJSON(r, &req); err != nil || req.Code == "" {
		httputil.Error(w, http.StatusBadRequest, "code is required")
		return
	}

	mfaSecret, err := h.store.GetMFASecret(r.Context(), userID)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "MFA not initiated — call enable first")
		return
	}

	if !auth.ValidateTOTP(mfaSecret.Secret, req.Code) {
		httputil.Error(w, http.StatusUnauthorized, "invalid TOTP code")
		return
	}

	if err := h.store.EnableMFA(r.Context(), userID); err != nil {
		logger.Error("failed to enable MFA", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to enable MFA")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &userID, ActorType: "user",
		Action: "mfa.enabled", ResourceType: "user", ResourceID: &userID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	logger.Info("MFA enabled", "user_id", userID)
	httputil.JSON(w, http.StatusOK, map[string]string{"message": "MFA enabled successfully"})
}

type mfaDisableRequest struct {
	Password string `json:"password"`
}

// Disable removes MFA for the user after verifying their password.
func (h *MFAHandler) Disable(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "mfa")

	var req mfaDisableRequest
	if err := httputil.DecodeJSON(r, &req); err != nil || req.Password == "" {
		httputil.Error(w, http.StatusBadRequest, "password is required to disable MFA")
		return
	}

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to get user")
		return
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		httputil.Error(w, http.StatusUnauthorized, "invalid password")
		return
	}

	if err := h.store.DisableMFA(r.Context(), userID); err != nil {
		logger.Error("failed to disable MFA", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to disable MFA")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &userID, ActorType: "user",
		Action: "mfa.disabled", ResourceType: "user", ResourceID: &userID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	logger.Info("MFA disabled", "user_id", userID)
	httputil.JSON(w, http.StatusOK, map[string]string{"message": "MFA disabled"})
}

// Status returns the current MFA status for the authenticated user.
func (h *MFAHandler) Status(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())

	mfaSecret, err := h.store.GetMFASecret(r.Context(), userID)
	if err != nil {
		httputil.JSON(w, http.StatusOK, map[string]bool{"enabled": false})
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"enabled":     mfaSecret.Enabled,
		"verified_at": mfaSecret.VerifiedAt,
	})
}

// VerifyMFAForLogin is a helper called during the login flow to validate
// the TOTP code when MFA is enabled for a user.
func VerifyMFAForLogin(ctx context.Context, store domain.MFAStore, userID, code string) error {
	mfaSecret, err := store.GetMFASecret(ctx, userID)
	if err != nil {
		return nil
	}
	if !mfaSecret.Enabled {
		return nil
	}
	if code == "" {
		return domain.ErrMFARequired
	}
	if !auth.ValidateTOTP(mfaSecret.Secret, code) {
		return domain.ErrMFAInvalid
	}
	return nil
}
