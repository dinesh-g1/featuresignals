package handlers

import (
	"encoding/hex"
	"fmt"
	"log/slog"
	"math/rand"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/email"
	"github.com/featuresignals/server/internal/features"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/sms"
)

type DemoHandler struct {
	store        domain.Store
	jwtMgr       auth.TokenManager
	logger       *slog.Logger
	smsClient    sms.Sender
	emailSender  email.VerificationSender
	appBaseURL   string
	dashboardURL string
	payu         PayUHasher
	payuMode     string
}

type DemoHandlerConfig struct {
	Store           domain.Store
	JWTMgr          auth.TokenManager
	Logger          *slog.Logger
	SMSClient       sms.Sender
	EmailSender     email.VerificationSender
	AppBaseURL      string
	DashboardURL    string
	PayUMerchantKey string
	PayUSalt        string
	PayUMode        string
}

func NewDemoHandler(cfg DemoHandlerConfig) *DemoHandler {
	return &DemoHandler{
		store:        cfg.Store,
		jwtMgr:       cfg.JWTMgr,
		logger:       cfg.Logger,
		smsClient:    cfg.SMSClient,
		emailSender:  cfg.EmailSender,
		appBaseURL:   cfg.AppBaseURL,
		dashboardURL: cfg.DashboardURL,
		payu:         PayUHasher{MerchantKey: cfg.PayUMerchantKey, Salt: cfg.PayUSalt},
		payuMode:     cfg.PayUMode,
	}
}

// CreateSession is deprecated. Anonymous demo sessions are no longer created;
// users should register with a real email via POST /v1/auth/register?source=demo.
func (h *DemoHandler) CreateSession(w http.ResponseWriter, r *http.Request) {
	httputil.JSON(w, http.StatusGone, map[string]string{
		"error":   "demo_sessions_deprecated",
		"message": "Anonymous demo sessions are no longer available. Please sign up at /register?source=demo to get started with sample data.",
	})
}

// Convert upgrades a demo account to a permanent one. All fields are mandatory.
// After conversion the handler sends a phone OTP and email verification link
// so the next step in the wizard can verify them.
func (h *DemoHandler) Convert(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	orgID := middleware.GetOrgID(ctx)

	var req struct {
		Email   string `json:"email"`
		Password string `json:"password"`
		Name    string `json:"name"`
		OrgName string `json:"org_name"`
		Phone   string `json:"phone"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Email == "" || req.Password == "" || req.Name == "" || req.OrgName == "" {
		httputil.Error(w, http.StatusBadRequest, "email, password, name, and org_name are required")
		return
	}
	if features.EnablePhoneVerification && req.Phone == "" {
		httputil.Error(w, http.StatusBadRequest, "phone is required")
		return
	}
	if !validateEmail(req.Email) {
		httputil.Error(w, http.StatusBadRequest, "invalid email format")
		return
	}
	if req.Phone != "" && !validatePhone(req.Phone) {
		httputil.Error(w, http.StatusBadRequest, "invalid phone format (use E.164 or 7-15 digits)")
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

	passHash, err := auth.HashPassword(req.Password)
	if err != nil {
		log.Error("failed to hash password", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if err := h.store.ConvertDemoUser(ctx, userID, req.Email, passHash, req.Name); err != nil {
		log.Error("failed to convert demo user", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to convert account")
		return
	}

	slug := slugify(req.OrgName)
	if err := h.store.ConvertDemoOrg(ctx, orgID, req.OrgName, slug); err != nil {
		log.Error("failed to convert demo org", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to convert organization")
		return
	}

	if req.Phone != "" {
		_ = h.store.UpdateUserPhone(ctx, userID, req.Phone)
	}

	// Send phone OTP (best-effort, only when phone verification is enabled)
	if features.EnablePhoneVerification && req.Phone != "" && h.smsClient != nil {
		otp, otpErr := generateOTP()
		if otpErr == nil {
			otpHash, hashErr := auth.HashPassword(otp)
			if hashErr == nil {
				expires := time.Now().Add(5 * time.Minute)
				if storeErr := h.store.UpdateUserPhoneOTP(ctx, userID, otpHash, expires); storeErr == nil {
					go func() {
						if sendErr := h.smsClient.SendOTP(req.Phone, otp); sendErr != nil {
							log.Error("failed to send OTP during demo convert", "error", sendErr, "user_id", userID)
						}
					}()
				}
			}
		}
	}

	// Send email verification (best-effort)
	if h.emailSender != nil {
		token, tokenErr := generateEmailToken()
		if tokenErr == nil {
			expires := time.Now().Add(24 * time.Hour)
			if storeErr := h.store.UpdateUserEmailVerifyToken(ctx, userID, token, expires); storeErr == nil {
				go func() {
					if sendErr := h.emailSender.SendVerificationEmail(req.Email, token, h.appBaseURL); sendErr != nil {
						log.Error("failed to send verification email during demo convert", "error", sendErr, "user_id", userID)
					}
				}()
			}
		}
	}

	// Generate non-demo tokens for the converted user
	tokens, err := h.jwtMgr.GenerateTokenPair(userID, orgID, string(domain.RoleOwner))
	if err != nil {
		log.Error("failed to generate tokens after conversion", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate tokens")
		return
	}

	log.Info("demo account converted", "user_id", userID, "org_id", orgID, "email", req.Email)
	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"tokens":  tokens,
		"message": "Account converted successfully. Verify your phone and email, then choose a plan.",
	})
}

// SelectPlan lets a recently-converted demo user choose Free or Pro and decide
// whether to keep their demo data. For Free it generates a one-time token for
// cross-domain redirect. For Pro it returns PayU checkout form fields.
func (h *DemoHandler) SelectPlan(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	ctx := r.Context()
	userID := middleware.GetUserID(ctx)
	orgID := middleware.GetOrgID(ctx)

	var req struct {
		Plan       string `json:"plan"`
		RetainData bool   `json:"retain_data"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Plan != domain.PlanFree && req.Plan != domain.PlanPro {
		httputil.Error(w, http.StatusBadRequest, "plan must be 'free' or 'pro'")
		return
	}

	// Handle data retention preference
	if !req.RetainData {
		if err := h.store.DeleteDemoData(ctx, orgID); err != nil {
			log.Error("failed to delete demo data", "error", err, "org_id", orgID)
		}
		project := &domain.Project{OrgID: orgID, Name: "Default Project", Slug: "default"}
		if err := h.store.CreateProject(ctx, project); err != nil {
			log.Error("failed to create default project after demo data cleanup", "error", err)
		} else {
			BootstrapEnvironments(ctx, h.store, project.ID)
		}
	}

	if req.Plan == domain.PlanFree {
		limits := domain.PlanDefaults[domain.PlanFree]
		if err := h.store.UpdateOrgPlan(ctx, orgID, domain.PlanFree, limits); err != nil {
			log.Error("failed to set free plan", "error", err, "org_id", orgID)
			httputil.Error(w, http.StatusInternalServerError, "failed to set plan")
			return
		}

		token, err := h.store.CreateOneTimeToken(ctx, userID, orgID, 5*time.Minute)
		if err != nil {
			log.Error("failed to create one-time token", "error", err)
			httputil.Error(w, http.StatusInternalServerError, "failed to generate redirect token")
			return
		}

		redirectURL := h.dashboardURL + "/auth/exchange?token=" + token
		log.Info("demo user selected free plan", "user_id", userID, "org_id", orgID)
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"plan":         "free",
			"redirect_url": redirectURL,
		})
		return
	}

	// Pro plan → return PayU checkout form data
	user, err := h.store.GetUserByID(ctx, userID)
	if err != nil {
		log.Error("failed to get user for checkout", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to load user")
		return
	}

	orgPrefix := orgID
	if len(orgPrefix) > 8 {
		orgPrefix = orgPrefix[:8]
	}
	txnid := fmt.Sprintf("DEMO_%s_%d", orgPrefix, time.Now().UnixMilli())
	amount := domain.ProPlanAmount()
	productinfo := domain.ProPlanProductInfo()
	firstname := user.Name
	userEmail := user.Email
	phone := user.Phone
	if phone == "" {
		phone = "9999999999"
	}

	hash := h.payu.Hash(txnid, amount, productinfo, firstname, userEmail)
	surl := h.appBaseURL + "/v1/billing/payu/callback"
	furl := h.appBaseURL + "/v1/billing/payu/failure"

	payuURL := h.payu.Endpoint(h.payuMode)

	// Store retain_data preference so the PayU callback can use it
	state, _ := h.store.GetOnboardingState(ctx, orgID)
	if state == nil {
		state = &domain.OnboardingState{OrgID: orgID}
	}
	state.PlanSelected = true
	state.UpdatedAt = time.Now()
	_ = h.store.UpsertOnboardingState(ctx, state)

	log.Info("demo user initiating pro checkout", "user_id", userID, "org_id", orgID, "txnid", txnid)
	httputil.JSON(w, http.StatusOK, map[string]string{
		"plan":        "pro",
		"payu_url":    payuURL,
		"key":         h.payu.MerchantKey,
		"txnid":       txnid,
		"hash":        hash,
		"amount":      amount,
		"productinfo": productinfo,
		"firstname":   firstname,
		"email":       userEmail,
		"phone":       phone,
		"surl":        surl,
		"furl":        furl,
	})
}

func (h *DemoHandler) Feedback(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	ctx := r.Context()
	orgID := middleware.GetOrgID(ctx)

	var req struct {
		Message string `json:"message"`
		Email   string `json:"email,omitempty"`
		Rating  int    `json:"rating,omitempty"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Message == "" {
		httputil.Error(w, http.StatusBadRequest, "message is required")
		return
	}
	if !validateStringLength(req.Message, 2000) {
		httputil.Error(w, http.StatusBadRequest, "message must be at most 2000 characters")
		return
	}

	fb := &domain.DemoFeedback{
		OrgID:   orgID,
		Message: req.Message,
		Email:   req.Email,
		Rating:  req.Rating,
	}
	if err := h.store.CreateDemoFeedback(ctx, fb); err != nil {
		log.Error("failed to store demo feedback", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to store feedback")
		return
	}

	log.Info("demo feedback received", "org_id", orgID, "rating", req.Rating)
	httputil.JSON(w, http.StatusCreated, map[string]string{"message": "Thank you for your feedback!"})
}

// Seed helpers are now in shared.go (SeedSampleFlags, SeedSampleSegment, SeedSampleAPIKeys).

func randomHex(n int) string {
	b := make([]byte, n)
	rand.Read(b)
	return hex.EncodeToString(b)
}

