package handlers

import (
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type BillingHandler struct {
	store        domain.Store
	payu         PayUHasher
	payuMode     string
	dashboardURL string
	appBaseURL   string
	logger       *slog.Logger
}

func NewBillingHandler(store domain.Store, payuKey, payuSalt, payuMode, dashboardURL, appBaseURL string, logger *slog.Logger) *BillingHandler {
	return &BillingHandler{
		store:        store,
		payu:         PayUHasher{MerchantKey: payuKey, Salt: payuSalt},
		payuMode:     payuMode,
		dashboardURL: dashboardURL,
		appBaseURL:   appBaseURL,
		logger:       logger,
	}
}

// CreateCheckout returns the PayU form fields the dashboard needs to POST.
func (h *BillingHandler) CreateCheckout(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	org, err := h.store.GetOrganization(r.Context(), orgID)
	if err != nil {
		log.Error("failed to get organization", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to load organization")
		return
	}

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		log.Error("failed to get user", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "failed to load user")
		return
	}

	txnid := fmt.Sprintf("FS_%s_%d", orgID[:8], time.Now().UnixMilli())
	amount := domain.ProPlanAmount()
	productinfo := domain.ProPlanProductInfo()
	firstname := user.Name
	email := user.Email
	phone := user.Phone
	if phone == "" {
		phone = "9999999999"
	}

	hash := h.payu.Hash(txnid, amount, productinfo, firstname, email)

	surl := h.appBaseURL + "/v1/billing/payu/callback"
	furl := h.appBaseURL + "/v1/billing/payu/failure"

	_ = org // used for context logging
	log.Info("payu checkout initiated", "org_id", orgID, "txnid", txnid)

	httputil.JSON(w, http.StatusOK, map[string]string{
		"payu_url":    h.payu.Endpoint(h.payuMode),
		"key":         h.payu.MerchantKey,
		"txnid":       txnid,
		"hash":        hash,
		"amount":      amount,
		"productinfo": productinfo,
		"firstname":   firstname,
		"email":       email,
		"phone":       phone,
		"surl":        surl,
		"furl":        furl,
	})
}

// PayUCallback handles the success redirect from PayU (form-encoded POST).
func (h *BillingHandler) PayUCallback(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		h.logger.Error("failed to parse payu callback form", "error", err)
		http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=failed", http.StatusSeeOther)
		return
	}

	params := map[string]string{
		"txnid":       r.FormValue("txnid"),
		"amount":      r.FormValue("amount"),
		"productinfo": r.FormValue("productinfo"),
		"firstname":   r.FormValue("firstname"),
		"email":       r.FormValue("email"),
		"status":      r.FormValue("status"),
		"hash":        r.FormValue("hash"),
		"mihpayid":    r.FormValue("mihpayid"),
	}

	if !h.payu.VerifyReverse(params) {
		h.logger.Warn("invalid payu reverse hash", "txnid", params["txnid"])
		http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=failed", http.StatusSeeOther)
		return
	}

	if params["status"] != "success" {
		h.logger.Warn("payu payment not successful", "txnid", params["txnid"], "status", params["status"])
		http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=failed", http.StatusSeeOther)
		return
	}

	// Extract orgID from txnid (format: FS_<orgID[:8]>_<timestamp>)
	txnid := params["txnid"]
	orgIDPrefix := ""
	if len(txnid) > 3 {
		// Parse FS_<8chars>_<timestamp>
		parts := splitTxnID(txnid)
		if parts != nil {
			orgIDPrefix = parts.orgPrefix
		}
	}

	// Look up org by prefix match
	ctx := r.Context()
	org, err := h.findOrgByTxnPrefix(ctx, orgIDPrefix)
	if err != nil || org == nil {
		h.logger.Error("failed to find org for payu callback", "error", err, "txnid", txnid, "org_prefix", orgIDPrefix)
		http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=failed", http.StatusSeeOther)
		return
	}

	proLimits := domain.PlanDefaults[domain.PlanPro]
	if err := h.store.UpdateOrgPlan(ctx, org.ID, domain.PlanPro, proLimits); err != nil {
		h.logger.Error("failed to update org plan after payu payment", "error", err, "org_id", org.ID)
		http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=failed", http.StatusSeeOther)
		return
	}

	now := time.Now()
	sub := &domain.Subscription{
		OrgID:              org.ID,
		PayUTxnID:          params["txnid"],
		PayUMihpayID:       params["mihpayid"],
		Plan:               domain.PlanPro,
		Status:             "active",
		CurrentPeriodStart: now,
		CurrentPeriodEnd:   now.AddDate(0, 1, 0),
		CreatedAt:          now,
		UpdatedAt:          now,
	}
	if err := h.store.UpsertSubscription(ctx, sub); err != nil {
		h.logger.Error("failed to upsert subscription", "error", err, "org_id", org.ID)
	}

	state, _ := h.store.GetOnboardingState(ctx, org.ID)
	if state == nil {
		state = &domain.OnboardingState{OrgID: org.ID}
	}
	state.PlanSelected = true
	state.UpdatedAt = now
	_ = h.store.UpsertOnboardingState(ctx, state)

	h.logger.Info("payu payment successful — org upgraded to pro", "org_id", org.ID, "txnid", txnid, "mihpayid", params["mihpayid"])
	http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=success", http.StatusSeeOther)
}

// PayUFailure handles the failure redirect from PayU.
func (h *BillingHandler) PayUFailure(w http.ResponseWriter, r *http.Request) {
	_ = r.ParseForm()
	txnid := r.FormValue("txnid")
	status := r.FormValue("status")
	h.logger.Warn("payu payment failed", "txnid", txnid, "status", status)

	http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=failed", http.StatusSeeOther)
}

// GetSubscription returns the current subscription and plan info for the org.
func (h *BillingHandler) GetSubscription(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	org, err := h.store.GetOrganization(r.Context(), orgID)
	if err != nil {
		log.Error("failed to get organization", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to load organization")
		return
	}

	sub, _ := h.store.GetSubscription(r.Context(), orgID)

	resp := map[string]interface{}{
		"plan":               org.Plan,
		"seats_limit":        org.PlanSeatsLimit,
		"projects_limit":     org.PlanProjectsLimit,
		"environments_limit": org.PlanEnvironmentsLimit,
	}

	if sub != nil {
		resp["status"] = sub.Status
		resp["current_period_start"] = sub.CurrentPeriodStart
		resp["current_period_end"] = sub.CurrentPeriodEnd
		resp["cancel_at_period_end"] = sub.CancelAtPeriodEnd
	} else {
		resp["status"] = "none"
	}

	members, _ := h.store.ListOrgMembers(r.Context(), orgID)
	projects, _ := h.store.ListProjects(r.Context(), orgID)
	resp["seats_used"] = len(members)
	resp["projects_used"] = len(projects)

	httputil.JSON(w, http.StatusOK, resp)
}

// GetUsage returns resource usage metrics for the current org.
func (h *BillingHandler) GetUsage(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	org, err := h.store.GetOrganization(r.Context(), orgID)
	if err != nil {
		log.Error("failed to get organization", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to load organization")
		return
	}

	members, _ := h.store.ListOrgMembers(r.Context(), orgID)
	projects, _ := h.store.ListProjects(r.Context(), orgID)

	totalEnvs := 0
	for _, p := range projects {
		envs, _ := h.store.ListEnvironments(r.Context(), p.ID)
		totalEnvs += len(envs)
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"seats_used":         len(members),
		"seats_limit":        org.PlanSeatsLimit,
		"projects_used":      len(projects),
		"projects_limit":     org.PlanProjectsLimit,
		"environments_used":  totalEnvs,
		"environments_limit": org.PlanEnvironmentsLimit,
		"plan":               org.Plan,
	})
}

type txnParts struct {
	orgPrefix string
}

func splitTxnID(txnid string) *txnParts {
	// Format: FS_<orgID[:8]>_<timestamp>
	if len(txnid) < 4 || txnid[:3] != "FS_" {
		return nil
	}
	rest := txnid[3:]
	// Find the second underscore
	for i := 0; i < len(rest); i++ {
		if rest[i] == '_' {
			return &txnParts{orgPrefix: rest[:i]}
		}
	}
	return nil
}

// findOrgByTxnPrefix searches for an organization whose ID starts with the
// given prefix. This is used to resolve the org from the PayU txnid.
func (h *BillingHandler) findOrgByTxnPrefix(ctx context.Context, prefix string) (*domain.Organization, error) {
	if prefix == "" {
		return nil, fmt.Errorf("empty org prefix")
	}
	return h.store.GetOrganizationByIDPrefix(ctx, prefix)
}
