package handlers

import (
	"crypto/rand"
	"encoding/hex"
	"fmt"
	"math/big"
	"net/http"
	"regexp"
	"strings"
	"time"
	"unicode"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/email"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/sms"
)

type AuthHandler struct {
	store        domain.Store
	jwtMgr       auth.TokenManager
	smsClient    *sms.Client
	emailSender  *email.Sender
	appBaseURL   string
	dashboardURL string
}

func NewAuthHandler(store domain.Store, jwtMgr auth.TokenManager, smsClient *sms.Client, emailSender *email.Sender, appBaseURL, dashboardURL string) *AuthHandler {
	return &AuthHandler{
		store:        store,
		jwtMgr:       jwtMgr,
		smsClient:    smsClient,
		emailSender:  emailSender,
		appBaseURL:   appBaseURL,
		dashboardURL: dashboardURL,
	}
}

type RegisterRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
	Name     string `json:"name"`
	OrgName  string `json:"org_name"`
	Phone    string `json:"phone"`
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
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Email == "" || req.Password == "" || req.Name == "" || req.OrgName == "" {
		httputil.Error(w, http.StatusBadRequest, "email, password, name, and org_name are required")
		return
	}
	if !validatePassword(req.Password) {
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
		Phone:        req.Phone,
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

	// Send verification email in background (best-effort)
	if h.emailSender != nil {
		token, err := generateEmailToken()
		if err == nil {
			expires := time.Now().Add(24 * time.Hour)
			if storeErr := h.store.UpdateUserEmailVerifyToken(r.Context(), user.ID, token, expires); storeErr == nil {
				go func() {
					if sendErr := h.emailSender.SendVerificationEmail(user.Email, token, h.appBaseURL); sendErr != nil {
						log.Error("failed to send verification email", "error", sendErr, "user_id", user.ID)
					}
				}()
			}
		}
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

// SendOTP generates a 6-digit OTP, hashes it, stores it with a 5-minute expiry,
// and sends the plaintext OTP to the user's phone via SMS.
func (h *AuthHandler) SendOTP(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	userID := middleware.GetUserID(r.Context())

	var req struct {
		Phone string `json:"phone"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Phone == "" {
		httputil.Error(w, http.StatusBadRequest, "phone is required")
		return
	}

	if err := h.store.UpdateUserPhone(r.Context(), userID, req.Phone); err != nil {
		log.Error("failed to update phone", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to update phone")
		return
	}

	otp, err := generateOTP()
	if err != nil {
		log.Error("failed to generate OTP", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate OTP")
		return
	}

	otpHash, err := auth.HashPassword(otp)
	if err != nil {
		log.Error("failed to hash OTP", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to hash OTP")
		return
	}

	expires := time.Now().Add(5 * time.Minute)
	if err := h.store.UpdateUserPhoneOTP(r.Context(), userID, otpHash, expires); err != nil {
		log.Error("failed to store OTP", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to store OTP")
		return
	}

	if h.smsClient != nil {
		if err := h.smsClient.SendOTP(req.Phone, otp); err != nil {
			log.Error("failed to send OTP via SMS", "error", err, "user_id", userID)
			httputil.Error(w, http.StatusInternalServerError, "failed to send OTP")
			return
		}
	}

	log.Info("OTP sent", "user_id", userID, "phone", req.Phone)
	httputil.JSON(w, http.StatusOK, map[string]string{"message": "OTP sent"})
}

// VerifyOTP validates the user-provided OTP against the stored hash.
func (h *AuthHandler) VerifyOTP(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	userID := middleware.GetUserID(r.Context())

	var req struct {
		OTP string `json:"otp"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.OTP == "" {
		httputil.Error(w, http.StatusBadRequest, "otp is required")
		return
	}

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		log.Error("failed to get user", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to get user")
		return
	}

	if user.PhoneOTP == "" || user.PhoneOTPExpires == nil {
		httputil.Error(w, http.StatusBadRequest, "no OTP pending")
		return
	}

	if time.Now().After(*user.PhoneOTPExpires) {
		httputil.Error(w, http.StatusBadRequest, "OTP expired")
		return
	}

	if !auth.CheckPassword(req.OTP, user.PhoneOTP) {
		httputil.Error(w, http.StatusBadRequest, "invalid OTP")
		return
	}

	if err := h.store.SetPhoneVerified(r.Context(), userID); err != nil {
		log.Error("failed to set phone verified", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to verify phone")
		return
	}

	log.Info("phone verified", "user_id", userID)
	httputil.JSON(w, http.StatusOK, map[string]bool{"verified": true})
}

// SendVerificationEmail generates a verification token and sends a verification email.
func (h *AuthHandler) SendVerificationEmail(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	userID := middleware.GetUserID(r.Context())

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		log.Error("failed to get user", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to get user")
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

	if h.emailSender != nil {
		if err := h.emailSender.SendVerificationEmail(user.Email, token, h.appBaseURL); err != nil {
			log.Error("failed to send verification email", "error", err, "user_id", userID)
			httputil.Error(w, http.StatusInternalServerError, "failed to send verification email")
			return
		}
	}

	log.Info("verification email sent", "user_id", userID)
	httputil.JSON(w, http.StatusOK, map[string]string{"message": "Verification email sent"})
}

// VerifyEmail handles the public email verification link (GET /v1/auth/verify-email?token=xxx).
func (h *AuthHandler) VerifyEmail(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	token := r.URL.Query().Get("token")
	if token == "" {
		httputil.Error(w, http.StatusBadRequest, "token is required")
		return
	}

	user, err := h.store.GetUserByEmailVerifyToken(r.Context(), token)
	if err != nil {
		log.Warn("invalid email verification token", "token", token)
		httputil.Error(w, http.StatusBadRequest, "invalid or expired token")
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
