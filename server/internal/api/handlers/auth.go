package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"math/big"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type authStore interface {
	domain.UserReader
	domain.UserWriter
	domain.OrgReader
	domain.OrgWriter
	domain.OrgMemberStore
	domain.ProjectWriter
	domain.EnvironmentWriter
	domain.OneTimeTokenStore
	domain.SSOStore
	domain.TokenRevocationStore
	domain.MFAStore
	domain.LoginAttemptStore
	domain.AuditWriter
	domain.OnboardingStore
	RestoreOrganization(ctx context.Context, orgID string) error
}

type AuthHandler struct {
	store           authStore
	jwtMgr          auth.TokenManager
	otpSender       domain.OTPSender
	internalChecker dto.InternalChecker
	appBaseURL      string
	dashboardURL    string
}

func NewAuthHandler(store authStore, jwtMgr auth.TokenManager, otpSender domain.OTPSender, appBaseURL, dashboardURL string, internalChecker dto.InternalChecker) *AuthHandler {
	return &AuthHandler{
		store:           store,
		jwtMgr:          jwtMgr,
		otpSender:       otpSender,
		internalChecker: internalChecker,
		appBaseURL:      appBaseURL,
		dashboardURL:    dashboardURL,
	}
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
	MFACode  string `json:"mfa_code,omitempty"`
}

const maxFailedLoginAttempts = 10

type RefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

var slugRe = regexp.MustCompile(`[^a-z0-9]+`)

func slugify(s string) string {
	return strings.Trim(slugRe.ReplaceAllString(strings.ToLower(s), "-"), "-")
}

func validatePassword(pw string) bool {
	if len(pw) < 8 {
		return false
	}
	var hasUpper, hasLower, hasDigit, hasSpecial bool
	for _, c := range pw {
		switch {
		case unicode.IsUpper(c):
			hasUpper = true
		case unicode.IsLower(c):
			hasLower = true
		case unicode.IsDigit(c):
			hasDigit = true
		case unicode.IsPunct(c) || unicode.IsSymbol(c):
			hasSpecial = true
		}
	}
	return hasUpper && hasLower && hasDigit && hasSpecial
}

func generateOTP() (string, error) {
	otp := ""
	for i := 0; i < 6; i++ {
		n, err := rand.Int(rand.Reader, big.NewInt(10))
		if err != nil {
			return "", fmt.Errorf("generating OTP digit: %w", err)
		}
		otp += fmt.Sprintf("%d", n.Int64())
	}
	return otp, nil
}

func (h *AuthHandler) sanitizeUser(u *domain.User) *dto.SafeUserResponse {
	return dto.SafeUserFromDomain(u, h.internalChecker)
}

func generateEmailToken() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generating email token: %w", err)
	}
	return hex.EncodeToString(b), nil
}

func (h *AuthHandler) Register(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())

	var req RegisterRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" || req.OrgName == "" {
		httputil.Error(w, http.StatusBadRequest, "email, password, name, and org_name are required")
		return
	}
	if !validateEmail(req.Email) {
		httputil.Error(w, http.StatusBadRequest, "invalid email format")
		return
	}
	if !validateStringLength(req.Name, 255) || !validateStringLength(req.OrgName, 255) {
		httputil.Error(w, http.StatusBadRequest, "name and org_name must be at most 255 characters")
		return
	}
	if !ValidatePasswordStrength(req.Password) {
		httputil.Error(w, http.StatusBadRequest, "password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 digit, and 1 special character")
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
		log.Warn("registration failed: duplicate email")
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

	tokens, err := h.jwtMgr.GenerateTokenPair(user.ID, org.ID, string(domain.RoleOwner), user.Email, org.DataRegion)
	if err != nil {
		log.Error("token generation failed", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}

	log.Info("user registered", "user_id", user.ID, "org_id", org.ID)

	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: org.ID, ActorID: &user.ID, ActorType: "user",
		Action: "auth.register", ResourceType: "user", ResourceID: &user.ID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	httputil.JSON(w, http.StatusCreated, dto.LoginResponse{
		User:                h.sanitizeUser(user),
		Organization:        dto.OrganizationFromDomain(org),
		Tokens:              dto.AuthTokensFromPair(tokens),
		OnboardingCompleted: false,
	})
}

func (h *AuthHandler) Login(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())

	var req LoginRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	// Brute-force lockout: check recent failed attempts before processing.
	failedCount, _ := h.store.CountRecentFailedAttempts(r.Context(), req.Email, time.Now().Add(-15*time.Minute))
	if failedCount >= maxFailedLoginAttempts {
		log.Warn("login blocked: too many failed attempts", "email", req.Email, "count", failedCount)
		retryAt := time.Now().Add(15 * time.Minute)
		httputil.JSON(w, http.StatusTooManyRequests, dto.RateLimitError{
			Error:           "Account temporarily locked due to too many failed login attempts.",
			AttemptsUsed:    failedCount,
			AttemptsAllowed: maxFailedLoginAttempts,
			RetryAfter:      retryAt.Format(time.RFC3339),
			RetryAfterUnix:  retryAt.Unix(),
		})
		return
	}

	user, err := h.store.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		_ = h.store.RecordLoginAttempt(r.Context(), req.Email, r.RemoteAddr, r.UserAgent(), false)
		newCount, _ := h.store.CountRecentFailedAttempts(r.Context(), req.Email, time.Now().Add(-15*time.Minute))
		log.Warn("login failed: unknown email")
		httputil.JSON(w, http.StatusUnauthorized, dto.LoginErrorResponse{
			Error:           "Authentication failed — the provided credentials are incorrect. Verify your email and password and try again.",
			AttemptsUsed:    newCount,
			AttemptsAllowed: maxFailedLoginAttempts,
			Remaining:       max(0, maxFailedLoginAttempts-newCount),
		})
		return
	}

	if !auth.CheckPassword(req.Password, user.PasswordHash) {
		_ = h.store.RecordLoginAttempt(r.Context(), req.Email, r.RemoteAddr, r.UserAgent(), false)
		newCount, _ := h.store.CountRecentFailedAttempts(r.Context(), req.Email, time.Now().Add(-15*time.Minute))
		log.Warn("login failed: bad password", "user_id", user.ID)
		httputil.JSON(w, http.StatusUnauthorized, dto.LoginErrorResponse{
			Error:           "Authentication failed — the provided credentials are incorrect. Verify your email and password and try again.",
			AttemptsUsed:    newCount,
			AttemptsAllowed: maxFailedLoginAttempts,
			Remaining:       max(0, maxFailedLoginAttempts-newCount),
		})
		return
	}

	member, err := h.store.GetOrgMember(r.Context(), "", user.ID)
	if err != nil {
		log.Warn("login failed: no org membership", "user_id", user.ID)
		httputil.Error(w, http.StatusUnauthorized, "Authentication failed — the provided credentials are incorrect. Verify your email and password and try again.")
		return
	}
	orgID := member.OrgID
	role := string(member.Role)

	// SSO enforcement: if the org has SSO with enforce=true, block password
	// login for all roles except owner (break-glass).
	ssoConfig, ssoErr := h.store.GetSSOConfig(r.Context(), orgID)
	if ssoErr == nil && ssoConfig.Enabled && ssoConfig.Enforce && member.Role != domain.RoleOwner {
		log.Warn("login blocked: SSO enforced", "user_id", user.ID, "org_id", orgID)
		httputil.Error(w, http.StatusForbidden, "This organization requires SSO login. Please use your identity provider to sign in.")
		return
	}

	// MFA verification: if user has MFA enabled, require a valid TOTP code.
	if mfaErr := VerifyMFAForLogin(r.Context(), h.store, user.ID, req.MFACode); mfaErr != nil {
		if errors.Is(mfaErr, domain.ErrMFARequired) {
			httputil.Error(w, http.StatusForbidden, "mfa_required")
		} else {
			_ = h.store.RecordLoginAttempt(r.Context(), req.Email, r.RemoteAddr, r.UserAgent(), false)
			httputil.Error(w, http.StatusUnauthorized, "MFA verification failed — the provided code is incorrect. Check your authenticator app and try again.")
		}
		return
	}

	// Restore soft-deleted org on login (within grace period)
	org, orgErr := h.store.GetOrganization(r.Context(), orgID)
	if orgErr == nil && org.DeletedAt != nil {
		_ = h.store.RestoreOrganization(r.Context(), orgID)
		log.Info("soft-deleted org restored on login", "org_id", orgID, "user_id", user.ID)
	}

	_ = h.store.UpdateLastLoginAt(r.Context(), user.ID)
	_ = h.store.RecordLoginAttempt(r.Context(), req.Email, r.RemoteAddr, r.UserAgent(), true)

	dataRegion := ""
	if orgErr == nil && org != nil {
		dataRegion = org.DataRegion
	}
	tokens, err := h.jwtMgr.GenerateTokenPair(user.ID, orgID, role, user.Email, dataRegion)
	if err != nil {
		log.Error("token generation failed on login", "error", err, "user_id", user.ID)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}

	log.Info("user logged in", "user_id", user.ID, "org_id", orgID, "role", role)

	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &user.ID, ActorType: "user",
		Action: "auth.login", ResourceType: "session", ResourceID: &user.ID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	onboardingState, _ := h.store.GetOnboardingState(r.Context(), orgID)
	onboardingCompleted := onboardingState != nil && onboardingState.Completed

	httputil.JSON(w, http.StatusOK, dto.LoginResponse{
		User:                h.sanitizeUser(user),
		Organization:        dto.OrganizationFromDomain(org),
		Tokens:              dto.AuthTokensFromPair(tokens),
		OnboardingCompleted: onboardingCompleted,
	})
}

// Logout revokes the current access token so it cannot be reused.
func (h *AuthHandler) Logout(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	claims := middleware.GetClaims(r.Context())
	if claims == nil || claims.ID == "" {
		httputil.Error(w, http.StatusBadRequest, "no token to revoke")
		return
	}

	expiresAt := time.Now().Add(1 * time.Hour)
	if claims.ExpiresAt != nil {
		expiresAt = claims.ExpiresAt.Time
	}

	if err := h.store.RevokeToken(r.Context(), claims.ID, claims.UserID, claims.OrgID, expiresAt); err != nil {
		log.Error("failed to revoke token", "error", err, "user_id", claims.UserID)
		httputil.Error(w, http.StatusInternalServerError, "failed to logout")
		return
	}

	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: claims.OrgID, ActorID: &claims.UserID, ActorType: "user",
		Action: "auth.logout", ResourceType: "session", ResourceID: &claims.UserID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	log.Info("user logged out", "user_id", claims.UserID, "jti", claims.ID)
	httputil.JSON(w, http.StatusOK, dto.MessageResponse{Message: "logged out"})
}

func (h *AuthHandler) Refresh(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())

	var req RefreshRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	claims, err := h.jwtMgr.ValidateRefreshToken(req.RefreshToken)
	if err != nil {
		log.Warn("invalid refresh token")
		httputil.Error(w, http.StatusUnauthorized, "invalid refresh token")
		return
	}

	tokens, err := h.jwtMgr.GenerateTokenPair(claims.UserID, claims.OrgID, claims.Role, "", claims.DataRegion)
	if err != nil {
		log.Error("token refresh failed", "error", err, "user_id", claims.UserID)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}

	log.Info("token refreshed", "user_id", claims.UserID)

	resp := dto.RefreshResponse{
		AccessToken:  tokens.AccessToken,
		RefreshToken: tokens.RefreshToken,
		ExpiresAt:    tokens.ExpiresAt,
	}

	if org, orgErr := h.store.GetOrganization(r.Context(), claims.OrgID); orgErr == nil && org != nil {
		resp.Organization = dto.OrganizationFromDomain(org)
	}
	if user, userErr := h.store.GetUserByID(r.Context(), claims.UserID); userErr == nil && user != nil {
		resp.User = h.sanitizeUser(user)
	}
	onboardingState, _ := h.store.GetOnboardingState(r.Context(), claims.OrgID)
	resp.OnboardingCompleted = onboardingState != nil && onboardingState.Completed

	httputil.JSON(w, http.StatusOK, resp)
}

// SendVerificationEmail generates a verification token for link-based
// verification. Legacy endpoint kept for backward compatibility -- the
// primary signup flow now uses OTP via /v1/auth/signup.
func (h *AuthHandler) SendVerificationEmail(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	userID := middleware.GetUserID(r.Context())

	if _, err := h.store.GetUserByID(r.Context(), userID); err != nil {
		log.Error("User retrieval failed — an unexpected error occurred on the server. Try again or contact support.", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "User retrieval failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	token, err := generateEmailToken()
	if err != nil {
		log.Error("failed to generate email token", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate verification token")
		return
	}

	expires := time.Now().Add(24 * time.Hour)
	if err := h.store.UpdateUserEmailVerifyToken(r.Context(), userID, token, expires); err != nil {
		log.Error("failed to store email verify token", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to store verification token")
		return
	}

	log.Info("verification token generated", "user_id", userID)
	httputil.JSON(w, http.StatusOK, dto.MessageResponse{Message: "Verification email sent"})
}

// VerifyEmail handles the public email verification link (GET /v1/auth/verify-email?token=xxx).
func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	token := r.URL.Query().Get("token")
	if token == "" {
		httputil.Error(w, http.StatusBadRequest, "Connection blocked — the token field is missing. Provide an access token for the repository provider.")
		return
	}

	user, err := h.store.GetUserByEmailVerifyToken(r.Context(), token)
	if err != nil {
		log.Warn("invalid email verification token")
		httputil.Error(w, http.StatusBadRequest, "Session expired — your access token is invalid or has expired. Refresh your session or sign in again.")
		return
	}

	if user.EmailVerifyExpires == nil || time.Now().After(*user.EmailVerifyExpires) {
		httputil.Error(w, http.StatusBadRequest, "verification link expired")
		return
	}

	if err := h.store.SetEmailVerified(r.Context(), user.ID); err != nil {
		log.Error("failed to set email verified", "error", err, "user_id", user.ID)
		httputil.Error(w, http.StatusInternalServerError, "failed to verify email")
		return
	}

	log.Info("email verified", "user_id", user.ID)
	http.Redirect(w, r, h.dashboardURL+"/login?email_verified=true", http.StatusFound)
}

type tokenExchangeRequest struct {
	Token string `json:"token"`
}

// TokenExchange swaps a short-lived, single-use one-time token for a standard
// JWT pair. Used for cross-domain redirects (demo -> main dashboard).
func (h *AuthHandler) TokenExchange(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())

	var req tokenExchangeRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}
	if req.Token == "" {
		httputil.Error(w, http.StatusBadRequest, "Connection blocked — the token field is missing. Provide an access token for the repository provider.")
		return
	}

	userID, orgID, err := h.store.ConsumeOneTimeToken(r.Context(), req.Token)
	if err != nil {
		log.Warn("invalid one-time token exchange attempt", "error", err)
		httputil.Error(w, http.StatusUnauthorized, "Session expired — your access token is invalid or has expired. Refresh your session or sign in again.")
		return
	}

	member, err := h.store.GetOrgMember(r.Context(), orgID, userID)
	role := string(domain.RoleDeveloper)
	if err == nil {
		role = string(member.Role)
	}

	tokens, err := h.jwtMgr.GenerateTokenPair(userID, orgID, role, "", "")
	if err != nil {
		log.Error("failed to generate tokens for token exchange", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}

	user, _ := h.store.GetUserByID(r.Context(), userID)

	log.Info("one-time token exchanged", "user_id", userID, "org_id", orgID)
	resp := dto.TokenExchangeResponse{
		Tokens: dto.AuthTokensFromPair(tokens),
	}
	if user != nil {
		resp.User = h.sanitizeUser(user)
	}
	httputil.JSON(w, http.StatusOK, resp)
}

// ForgotPasswordRequest represents the request to initiate password reset.
type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

// ResetPasswordRequest represents the request to complete password reset.
type ResetPasswordRequest struct {
	OTP         string `json:"otp"`
	NewPassword string `json:"new_password"`
}

// ForgotPassword initiates the password reset flow by sending an OTP to the
// user's email. ALWAYS returns 200 with a generic message — regardless of
// whether the email exists or any internal error occurs — to prevent email
// enumeration attacks. Internal errors are logged but never exposed to the client.
func (h *AuthHandler) ForgotPassword(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())

	var req ForgotPasswordRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
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

	// ALWAYS return the same response regardless of outcome to prevent enumeration.
	const genericMsg = "If an account exists with this email, a password reset code has been sent."

	// Look up user — if not found, apply a constant delay to prevent timing
	// enumeration, then return success anyway.
	user, err := h.store.GetUserByEmail(r.Context(), req.Email)
	if err != nil {
		log.Info("password reset requested for unknown email", "email", req.Email)
		// Constant-time delay to match the happy path (OTP gen + hash + email send)
		time.Sleep(200 * time.Millisecond)
		httputil.JSON(w, http.StatusOK, dto.MessageResponse{Message: genericMsg})
		return
	}

	// Generate OTP
	otp, err := generateOTP()
	if err != nil {
		log.Error("failed to generate password reset OTP", "error", err, "email", req.Email)
		// Still return generic message — never leak internal errors
		httputil.JSON(w, http.StatusOK, dto.MessageResponse{Message: genericMsg})
		return
	}

	// Hash the OTP before storing (same pattern as signup OTP).
	otpHash, err := auth.HashPassword(otp)
	if err != nil {
		log.Error("failed to hash password reset OTP", "error", err, "user_id", user.ID)
		httputil.JSON(w, http.StatusOK, dto.MessageResponse{Message: genericMsg})
		return
	}

	expires := time.Now().Add(15 * time.Minute)
	if err := h.store.SetPasswordResetToken(r.Context(), user.ID, otpHash, expires, r.RemoteAddr, r.UserAgent()); err != nil {
		log.Error("failed to store password reset token", "error", err, "user_id", user.ID)
		// Still return generic message — never leak internal errors
		httputil.JSON(w, http.StatusOK, dto.MessageResponse{Message: genericMsg})
		return
	}

	// Send OTP email
	if h.otpSender == nil {
		log.Error("OTP sender not configured", "user_id", user.ID)
		httputil.JSON(w, http.StatusOK, dto.MessageResponse{Message: genericMsg})
		return
	}
	if err := h.otpSender.SendPasswordResetOTP(r.Context(), req.Email, user.Name, otp); err != nil {
		log.Error("failed to send password reset OTP", "error", err, "user_id", user.ID)
		// Still return generic message — never leak internal errors
		httputil.JSON(w, http.StatusOK, dto.MessageResponse{Message: genericMsg})
		return
	}

	log.Info("password reset OTP sent", "user_id", user.ID)

	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: "", ActorID: &user.ID, ActorType: "user",
		Action: "auth.forgot_password", ResourceType: "session", ResourceID: &user.ID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	httputil.JSON(w, http.StatusOK, dto.MessageResponse{Message: genericMsg})
}

// ResetPassword completes the password reset flow by validating the OTP and
// setting a new password.
func (h *AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())

	var req ResetPasswordRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.OTP == "" {
		httputil.Error(w, http.StatusBadRequest, "reset code is required")
		return
	}
	if req.NewPassword == "" {
		httputil.Error(w, http.StatusBadRequest, "new password is required")
		return
	}
	if !ValidatePasswordStrength(req.NewPassword) {
		httputil.Error(w, http.StatusBadRequest, "password must be at least 8 characters with 1 uppercase, 1 lowercase, 1 digit, and 1 special character")
		return
	}

	// Validate and consume the OTP token
	userID, err := h.store.ConsumePasswordResetToken(r.Context(), req.OTP)
	if err != nil {
		log.Warn("invalid password reset token", "error", err)
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusBadRequest, "invalid or expired reset code")
			return
		}
		httputil.Error(w, http.StatusBadRequest, "invalid or expired reset code")
		return
	}

	// Hash the new password
	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		log.Error("password hashing failed", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to reset password")
		return
	}

	// Update the password
	if err := h.store.UpdatePassword(r.Context(), userID, hash); err != nil {
		log.Error("failed to update password", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to reset password")
		return
	}

	log.Info("password reset successful", "user_id", userID)

	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: "", ActorID: &userID, ActorType: "user",
		Action: "auth.reset_password", ResourceType: "session", ResourceID: &userID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	httputil.JSON(w, http.StatusOK, dto.MessageResponse{Message: "Password reset successful. You can now sign in with your new password."})
}
