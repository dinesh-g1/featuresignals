package handlers

import (
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/email"
	"github.com/featuresignals/server/internal/httputil"
)

// SignupHandler implements the verify-first 2-step signup flow:
//   1. InitiateSignup: validate input, hash password + OTP, store in pending_registrations, send OTP email
//   2. CompleteSignup: verify OTP, create user + org + project + envs atomically
type SignupHandler struct {
	store     domain.Store
	jwtMgr    auth.TokenManager
	otpSender email.OTPSender
}

func NewSignupHandler(store domain.Store, jwtMgr auth.TokenManager, otpSender email.OTPSender) *SignupHandler {
	return &SignupHandler{store: store, jwtMgr: jwtMgr, otpSender: otpSender}
}

type initiateSignupRequest struct {
	Email   string `json:"email"`
	Name    string `json:"name"`
	OrgName string `json:"org_name"`
	Password string `json:"password"`
}

// InitiateSignup validates input, stores a pending registration, and sends the OTP email.
func (h *SignupHandler) InitiateSignup(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	ctx := r.Context()

	var req initiateSignupRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
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

	if _, err := h.store.GetUserByEmail(ctx, req.Email); err == nil {
		httputil.Error(w, http.StatusConflict, "email already registered")
		return
	}

	passwordHash, err := auth.HashPassword(req.Password)
	if err != nil {
		log.Error("password hashing failed", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	otp, err := generateOTP()
	if err != nil {
		log.Error("OTP generation failed", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	otpHash, err := auth.HashPassword(otp)
	if err != nil {
		log.Error("OTP hashing failed", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	pr := &domain.PendingRegistration{
		Email:        req.Email,
		Name:         req.Name,
		OrgName:      req.OrgName,
		PasswordHash: passwordHash,
		OTPHash:      otpHash,
		ExpiresAt:    time.Now().Add(time.Duration(domain.OTPExpiryMinutes) * time.Minute),
	}

	if err := h.store.UpsertPendingRegistration(ctx, pr); err != nil {
		log.Error("failed to store pending registration", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to initiate signup")
		return
	}

	if h.otpSender != nil {
		if err := h.otpSender.SendOTP(ctx, req.Email, req.Name, otp); err != nil {
			log.Error("failed to send OTP email", "error", err, "email", req.Email)
			httputil.Error(w, http.StatusInternalServerError, "failed to send verification email")
			return
		}
	}

	log.Info("signup initiated", "email", req.Email)
	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"message":    "Verification code sent to your email",
		"expires_in": domain.OTPExpiryMinutes * 60,
	})
}

type completeSignupRequest struct {
	Email string `json:"email"`
	OTP   string `json:"otp"`
}

// CompleteSignup verifies the OTP, creates the user/org/project/envs, and returns JWT tokens.
func (h *SignupHandler) CompleteSignup(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	ctx := r.Context()

	var req completeSignupRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.OTP == "" {
		httputil.Error(w, http.StatusBadRequest, "email and otp are required")
		return
	}

	pr, err := h.store.GetPendingRegistrationByEmail(ctx, req.Email)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "no pending signup found for this email")
		return
	}

	if time.Now().After(pr.ExpiresAt) {
		httputil.Error(w, http.StatusBadRequest, "verification code expired, please request a new one")
		return
	}

	if pr.Attempts >= domain.OTPMaxAttempts {
		httputil.Error(w, http.StatusTooManyRequests, "too many failed attempts, please request a new code")
		return
	}

	if !auth.CheckPassword(req.OTP, pr.OTPHash) {
		_ = h.store.IncrementPendingAttempts(ctx, pr.ID)
		httputil.Error(w, http.StatusBadRequest, "invalid verification code")
		return
	}

	// OTP verified — create user, org, project, environments
	user := &domain.User{
		Email:         pr.Email,
		PasswordHash:  pr.PasswordHash,
		Name:          pr.Name,
		EmailVerified: true,
	}
	if err := h.store.CreateUser(ctx, user); err != nil {
		log.Error("failed to create user", "error", err)
		httputil.Error(w, http.StatusConflict, "email already registered")
		return
	}

	trialExpiry := time.Now().AddDate(0, 0, domain.TrialDurationDays)
	org := &domain.Organization{
		Name:           pr.OrgName,
		Slug:           slugify(pr.OrgName),
		Plan:           domain.PlanTrial,
		TrialExpiresAt: &trialExpiry,
	}
	if err := h.store.CreateOrganization(ctx, org); err != nil {
		log.Error("failed to create organization", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create organization")
		return
	}

	member := &domain.OrgMember{
		OrgID:  org.ID,
		UserID: user.ID,
		Role:   domain.RoleOwner,
	}
	if err := h.store.AddOrgMember(ctx, member); err != nil {
		log.Error("failed to add org member", "error", err, "org_id", org.ID, "user_id", user.ID)
		httputil.Error(w, http.StatusInternalServerError, "failed to set up account")
		return
	}

	project := &domain.Project{
		OrgID: org.ID,
		Name:  "Default Project",
		Slug:  "default",
	}
	if err := h.store.CreateProject(ctx, project); err != nil {
		log.Error("failed to create default project", "error", err)
	}

	BootstrapEnvironments(ctx, h.store, project.ID)

	// Update last login
	_ = h.store.UpdateLastLoginAt(ctx, user.ID)

	// Clean up pending registration
	_ = h.store.DeletePendingRegistration(ctx, pr.ID)

	tokens, err := h.jwtMgr.GenerateTokenPair(user.ID, org.ID, string(domain.RoleOwner))
	if err != nil {
		log.Error("token generation failed", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}

	log.Info("signup completed", "user_id", user.ID, "org_id", org.ID, "plan", org.Plan)

	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"user":         sanitizeUser(user),
		"organization": org,
		"tokens":       tokens,
	})
}

// ResendSignupOTP regenerates and resends the OTP for a pending signup.
func (h *SignupHandler) ResendSignupOTP(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	ctx := r.Context()

	var req struct {
		Email string `json:"email"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" {
		httputil.Error(w, http.StatusBadRequest, "email is required")
		return
	}

	pr, err := h.store.GetPendingRegistrationByEmail(ctx, req.Email)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "no pending signup found for this email")
		return
	}

	if time.Since(pr.CreatedAt).Seconds() < float64(domain.OTPResendCooldown) {
		httputil.Error(w, http.StatusTooManyRequests, "please wait before requesting another code")
		return
	}

	otp, err := generateOTP()
	if err != nil {
		log.Error("OTP generation failed", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	otpHash, err := auth.HashPassword(otp)
	if err != nil {
		log.Error("OTP hashing failed", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	pr.OTPHash = otpHash
	pr.ExpiresAt = time.Now().Add(time.Duration(domain.OTPExpiryMinutes) * time.Minute)
	pr.Attempts = 0
	if err := h.store.UpsertPendingRegistration(ctx, pr); err != nil {
		log.Error("failed to update pending registration", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to resend code")
		return
	}

	if h.otpSender != nil {
		if err := h.otpSender.SendOTP(ctx, req.Email, pr.Name, otp); err != nil {
			log.Error("failed to resend OTP email", "error", err, "email", req.Email)
			httputil.Error(w, http.StatusInternalServerError, "failed to send verification email")
			return
		}
	}

	log.Info("signup OTP resent", "email", req.Email)
	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"message":    "New verification code sent to your email",
		"expires_in": domain.OTPExpiryMinutes * 60,
	})
}
