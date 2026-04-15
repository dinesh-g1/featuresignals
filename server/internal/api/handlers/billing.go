package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/payment"
	payupkg "github.com/featuresignals/server/internal/payment/payu"
)

type billingHandlerStore interface {
	domain.OrgReader
	domain.UserReader
	domain.ProjectReader
	domain.EnvironmentReader
	domain.OrgMemberStore
	domain.BillingStore
	domain.OnboardingStore
}

// BillingHandler serves billing and subscription management endpoints.
// It uses the payment.Registry to dispatch to the correct gateway.
type BillingHandler struct {
	store        billingHandlerStore
	registry     *payment.Registry
	dashboardURL string
	appBaseURL   string
	logger       *slog.Logger
	emitter      domain.EventEmitter
	lifecycle    LifecycleSender
}

func NewBillingHandler(
	store billingHandlerStore,
	registry *payment.Registry,
	dashboardURL, appBaseURL string,
	logger *slog.Logger,
	emitter domain.EventEmitter,
	lifecycle LifecycleSender,
) *BillingHandler {
	if emitter == nil {
		emitter = NoopEmitter()
	}
	if lifecycle == nil {
		lifecycle = NoopLifecycle()
	}
	return &BillingHandler{
		store:        store,
		registry:     registry,
		dashboardURL: dashboardURL,
		appBaseURL:   appBaseURL,
		logger:       logger,
		emitter:      emitter,
		lifecycle:    lifecycle,
	}
}

// allowedReturnPaths restricts the return_url parameter to known dashboard routes.
var allowedReturnPaths = map[string]bool{
	"/settings/billing": true,
	"/onboarding":       true,
}

// CreateCheckout initiates a payment session via the org's configured gateway.
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

	returnPath := "/settings/billing"
	if rp := r.URL.Query().Get("return_url"); rp != "" && allowedReturnPaths[rp] {
		returnPath = rp
	}

	gatewayName := org.PaymentGateway
	if gatewayName == "" {
		gatewayName = domain.GatewayPayU
	}

	gw, err := h.registry.Get(gatewayName)
	if err != nil {
		log.Error("payment gateway not found", "gateway", gatewayName, "org_id", orgID)
		httputil.Error(w, http.StatusBadRequest, "payment gateway not configured")
		return
	}

	amount := domain.ProPlanAmount()
	req := payment.CheckoutRequest{
		OrgID:     orgID,
		UserEmail: user.Email,
		UserName:  user.Name,
		Plan:      domain.PlanPro,
		Amount:    amount,
		Metadata: map[string]string{
			"timestamp":   fmt.Sprintf("%d", time.Now().UnixMilli()),
			"productinfo": domain.ProPlanProductInfo(),
			"phone":       "9999999999",
		},
	}

	if gatewayName == domain.GatewayStripe {
		req.SuccessURL = h.dashboardURL + returnPath + "?status=success"
		req.CancelURL = h.dashboardURL + returnPath + "?status=canceled"
	} else {
		req.SuccessURL = h.appBaseURL + "/v1/billing/payu/callback"
		req.CancelURL = h.appBaseURL + "/v1/billing/payu/failure"
	}

	result, err := gw.CreateCheckoutSession(r.Context(), req)
	if err != nil {
		log.Error("failed to create checkout session", "error", err, "gateway", gatewayName, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to create checkout")
		return
	}

	log.Info("checkout session created", "org_id", orgID, "gateway", gatewayName, "session_id", result.SessionID)

	resp := dto.CheckoutResponse{
		Gateway:     gatewayName,
		RedirectURL: result.RedirectURL,
	}
	for k, v := range result.GatewayData {
		switch k {
		case "payu_url":
			resp.PayUURL = v
		case "key":
			resp.Key = v
		case "txnid":
			resp.Txnid = v
		case "amount":
			resp.Amount = v
		case "productinfo":
			resp.Productinfo = v
		case "firstname":
			resp.Firstname = v
		case "email":
			resp.Email = v
		case "surl":
			resp.Surl = v
		case "furl":
			resp.Furl = v
		case "hash":
			resp.Hash = v
		case "phone":
			resp.Phone = v
		}
	}

	httputil.JSON(w, http.StatusOK, resp)
}

// PayUCallback handles the success redirect from PayU (form-encoded POST).
func (h *BillingHandler) PayUCallback(w http.ResponseWriter, r *http.Request) {
	if err := r.ParseForm(); err != nil {
		h.logger.Error("failed to parse payu callback form", "error", err)
		http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=failed", http.StatusSeeOther)
		return
	}

	gw, err := h.registry.Get(domain.GatewayPayU)
	if err != nil {
		h.logger.Error("payu gateway not registered", "error", err)
		http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=failed", http.StatusSeeOther)
		return
	}

	payuGW, ok := gw.(*payupkg.Provider)
	if !ok {
		h.logger.Error("payu gateway type assertion failed")
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

	event, err := payuGW.HandleCallbackParams(params)
	if err != nil {
		h.logger.Warn("invalid payu callback", "error", err, "txnid", params["txnid"])
		http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=failed", http.StatusSeeOther)
		return
	}

	if event.Type != payment.EventCheckoutCompleted {
		h.logger.Warn("payu payment not successful", "txnid", params["txnid"], "status", params["status"])
		http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=failed", http.StatusSeeOther)
		return
	}

	txnid := params["txnid"]
	orgIDPrefix := ""
	if parts := splitTxnID(txnid); parts != nil {
		orgIDPrefix = parts.orgPrefix
	}

	ctx := r.Context()
	org, err := h.findOrgByTxnPrefix(ctx, orgIDPrefix)
	if err != nil || org == nil {
		h.logger.Error("failed to find org for payu callback", "error", err, "txnid", txnid, "org_prefix", orgIDPrefix)
		http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=failed", http.StatusSeeOther)
		return
	}

	// Record payment event for idempotency
	_ = h.store.CreatePaymentEvent(ctx, &domain.PaymentEvent{
		OrgID:           org.ID,
		GatewayProvider: domain.GatewayPayU,
		EventType:       string(event.Type),
		EventID:         params["mihpayid"],
		Payload:         mustMarshal(params),
		Processed:       true,
	})

	proLimits := domain.PlanDefaults()[domain.PlanPro]
	if err := h.store.UpdateOrgPlan(ctx, org.ID, domain.PlanPro, proLimits); err != nil {
		h.logger.Error("failed to update org plan after payu payment", "error", err, "org_id", org.ID)
		http.Redirect(w, r, h.dashboardURL+"/settings/billing?status=failed", http.StatusSeeOther)
		return
	}

	now := time.Now()
	sub := &domain.Subscription{
		OrgID:              org.ID,
		GatewayProvider:    domain.GatewayPayU,
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

	h.emitter.Emit(ctx, domain.ProductEvent{
		Event:    domain.EventCheckoutCompleted,
		Category: domain.EventCategoryBilling,
		OrgID:    org.ID,
		Properties: mustMarshal(map[string]string{
			"gateway": domain.GatewayPayU,
			"plan":    string(domain.PlanPro),
			"txnid":   txnid,
		}),
	})

	go func() {
		sendCtx, sendCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer sendCancel()
		_ = h.lifecycle.Send(sendCtx, "", domain.EmailMessage{
			To:       params["email"],
			Template: domain.TemplatePaymentSuccess,
			Subject:  "Payment confirmed — you're on FeatureSignals Pro",
			Data: map[string]string{
				"ToName":       params["firstname"],
				"Plan":         "Pro",
				"Amount":       params["amount"],
				"DashboardURL": h.dashboardURL,
			},
		})
	}()

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

// HandleStripeWebhook processes incoming Stripe webhook events.
func (h *BillingHandler) HandleStripeWebhook(w http.ResponseWriter, r *http.Request) {
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<16))
	if err != nil {
		h.logger.Error("failed to read stripe webhook body", "error", err)
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	gw, err := h.registry.Get(domain.GatewayStripe)
	if err != nil {
		h.logger.Error("stripe gateway not registered", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "stripe not configured")
		return
	}

	signature := r.Header.Get("Stripe-Signature")
	event, err := gw.HandleWebhook(r.Context(), body, signature)
	if err != nil {
		h.logger.Warn("stripe webhook verification failed", "error", err)
		httputil.Error(w, http.StatusBadRequest, "webhook verification failed")
		return
	}

	// Idempotency check
	existing, _ := h.store.GetPaymentEventByExternalID(r.Context(), domain.GatewayStripe, event.GatewayEventID)
	if existing != nil {
		httputil.JSON(w, http.StatusOK, dto.WebhookStatusResponse{Status: "already_processed"})
		return
	}

	ctx := r.Context()

	switch event.Type {
	case payment.EventCheckoutCompleted:
		h.handleStripeCheckoutCompleted(ctx, event)
	case payment.EventSubscriptionUpdated:
		h.handleStripeSubscriptionUpdated(ctx, event)
	case payment.EventSubscriptionCanceled:
		h.handleStripeSubscriptionCanceled(ctx, event)
	case payment.EventPaymentFailed:
		h.handleStripePaymentFailed(ctx, event)
	}

	httputil.JSON(w, http.StatusOK, dto.WebhookStatusResponse{Status: "ok"})
}

func (h *BillingHandler) handleStripeCheckoutCompleted(ctx context.Context, event *payment.WebhookEvent) {
	orgID := event.Metadata["org_id"]
	if orgID == "" {
		h.logger.Error("stripe checkout completed missing org_id in metadata", "event_id", event.GatewayEventID)
		return
	}

	_ = h.store.CreatePaymentEvent(ctx, &domain.PaymentEvent{
		OrgID:           orgID,
		GatewayProvider: domain.GatewayStripe,
		EventType:       string(event.Type),
		EventID:         event.GatewayEventID,
		Payload:         mustMarshal(event),
		Processed:       true,
	})

	proLimits := domain.PlanDefaults()[domain.PlanPro]
	if err := h.store.UpdateOrgPlan(ctx, orgID, domain.PlanPro, proLimits); err != nil {
		h.logger.Error("failed to update org plan after stripe checkout", "error", err, "org_id", orgID)
		return
	}

	now := time.Now()
	sub := &domain.Subscription{
		OrgID:                orgID,
		GatewayProvider:      domain.GatewayStripe,
		StripeCustomerID:     event.CustomerID,
		StripeSubscriptionID: event.SubscriptionID,
		Plan:                 domain.PlanPro,
		Status:               "active",
		CurrentPeriodStart:   event.PeriodStart,
		CurrentPeriodEnd:     event.PeriodEnd,
		CreatedAt:            now,
		UpdatedAt:            now,
	}
	if err := h.store.UpsertSubscription(ctx, sub); err != nil {
		h.logger.Error("failed to upsert subscription after stripe checkout", "error", err, "org_id", orgID)
	}

	state, _ := h.store.GetOnboardingState(ctx, orgID)
	if state == nil {
		state = &domain.OnboardingState{OrgID: orgID}
	}
	state.PlanSelected = true
	state.UpdatedAt = now
	_ = h.store.UpsertOnboardingState(ctx, state)

	h.logger.Info("stripe checkout completed — org upgraded to pro", "org_id", orgID, "customer_id", event.CustomerID)

	h.emitter.Emit(ctx, domain.ProductEvent{
		Event:    domain.EventCheckoutCompleted,
		Category: domain.EventCategoryBilling,
		OrgID:    orgID,
		Properties: mustMarshal(map[string]string{
			"gateway": domain.GatewayStripe,
			"plan":    string(domain.PlanPro),
		}),
	})

	go func() {
		sendCtx, sendCancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer sendCancel()
		email := event.Metadata["email"]
		name := event.Metadata["name"]
		_ = h.lifecycle.Send(sendCtx, "", domain.EmailMessage{
			To:       email,
			ToName:   name,
			Template: domain.TemplatePaymentSuccess,
			Subject:  "Payment confirmed — you're on FeatureSignals Pro",
			Data: map[string]string{
				"ToName":       name,
				"Plan":         "Pro",
				"DashboardURL": h.dashboardURL,
			},
		})
	}()
}

func (h *BillingHandler) handleStripeSubscriptionUpdated(ctx context.Context, event *payment.WebhookEvent) {
	sub, err := h.store.GetSubscriptionByStripeID(ctx, event.SubscriptionID)
	if err != nil {
		h.logger.Warn("stripe subscription update for unknown subscription", "stripe_sub_id", event.SubscriptionID)
		return
	}

	sub.Status = event.Status
	sub.UpdatedAt = time.Now()
	if err := h.store.UpsertSubscription(ctx, sub); err != nil {
		h.logger.Error("failed to update subscription from stripe event", "error", err, "org_id", sub.OrgID)
	}

	_ = h.store.CreatePaymentEvent(ctx, &domain.PaymentEvent{
		OrgID:           sub.OrgID,
		GatewayProvider: domain.GatewayStripe,
		EventType:       string(event.Type),
		EventID:         event.GatewayEventID,
		Payload:         mustMarshal(event),
		Processed:       true,
	})
}

func (h *BillingHandler) handleStripeSubscriptionCanceled(ctx context.Context, event *payment.WebhookEvent) {
	sub, err := h.store.GetSubscriptionByStripeID(ctx, event.SubscriptionID)
	if err != nil {
		h.logger.Warn("stripe subscription cancel for unknown subscription", "stripe_sub_id", event.SubscriptionID)
		return
	}

	sub.Status = "canceled"
	sub.UpdatedAt = time.Now()
	_ = h.store.UpsertSubscription(ctx, sub)

	freeLimits := domain.PlanDefaults()[domain.PlanFree]
	_ = h.store.UpdateOrgPlan(ctx, sub.OrgID, domain.PlanFree, freeLimits)

	_ = h.store.CreatePaymentEvent(ctx, &domain.PaymentEvent{
		OrgID:           sub.OrgID,
		GatewayProvider: domain.GatewayStripe,
		EventType:       string(event.Type),
		EventID:         event.GatewayEventID,
		Payload:         mustMarshal(event),
		Processed:       true,
	})

	h.logger.Info("stripe subscription canceled — org downgraded to free", "org_id", sub.OrgID)
}

func (h *BillingHandler) handleStripePaymentFailed(ctx context.Context, event *payment.WebhookEvent) {
	if event.SubscriptionID == "" {
		return
	}
	sub, err := h.store.GetSubscriptionByStripeID(ctx, event.SubscriptionID)
	if err != nil {
		return
	}

	sub.Status = "past_due"
	sub.UpdatedAt = time.Now()
	_ = h.store.UpsertSubscription(ctx, sub)

	_ = h.store.CreatePaymentEvent(ctx, &domain.PaymentEvent{
		OrgID:           sub.OrgID,
		GatewayProvider: domain.GatewayStripe,
		EventType:       string(event.Type),
		EventID:         event.GatewayEventID,
		Payload:         mustMarshal(event),
		Processed:       true,
	})

	h.logger.Warn("stripe payment failed — subscription past due", "org_id", sub.OrgID)

	h.emitter.Emit(ctx, domain.ProductEvent{
		Event:    domain.EventPaymentFailed,
		Category: domain.EventCategoryBilling,
		OrgID:    sub.OrgID,
		Properties: mustMarshal(map[string]string{
			"gateway": domain.GatewayStripe,
		}),
	})

	org, err := h.store.GetOrganization(ctx, sub.OrgID)
	if err == nil {
		members, _ := h.store.ListOrgMembers(ctx, sub.OrgID)
		for _, m := range members {
			if m.Role == "owner" || m.Role == "admin" {
				user, userErr := h.store.GetUserByID(ctx, m.UserID)
				if userErr != nil {
					continue
				}
				h.lifecycle.Send(ctx, m.UserID, domain.EmailMessage{
					To:       user.Email,
					ToName:   user.Name,
					Template: domain.TemplatePaymentFailed,
					Subject:  "Action required: Your payment failed",
					Data: map[string]string{
						"org_name":    org.Name,
						"plan":        sub.Plan,
						"billing_url": h.dashboardURL + "/settings/billing",
					},
				})
			}
		}
	}
}

// CancelSubscription cancels the org's active subscription.
func (h *BillingHandler) CancelSubscription(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	sub, err := h.store.GetSubscription(r.Context(), orgID)
	if err != nil {
		log.Warn("no active subscription to cancel", "org_id", orgID)
		httputil.Error(w, http.StatusNotFound, "no active subscription")
		return
	}

	var reqBody struct {
		AtPeriodEnd bool `json:"at_period_end"`
	}
	if err := httputil.DecodeJSON(r, &reqBody); err != nil {
		reqBody.AtPeriodEnd = true
	}

	gatewayName := sub.GatewayProvider
	if gatewayName == "" {
		gatewayName = domain.GatewayPayU
	}

	gw, err := h.registry.Get(gatewayName)
	if err != nil {
		log.Error("payment gateway not found for cancel", "gateway", gatewayName)
		httputil.Error(w, http.StatusInternalServerError, "payment gateway not configured")
		return
	}

	subscriptionID := sub.StripeSubscriptionID
	if gatewayName == domain.GatewayPayU {
		httputil.Error(w, http.StatusBadRequest, "cancellation for PayU subscriptions requires contacting support")
		return
	}

	if err := gw.CancelSubscription(r.Context(), subscriptionID, reqBody.AtPeriodEnd); err != nil {
		log.Error("failed to cancel subscription", "error", err, "org_id", orgID, "gateway", gatewayName)
		httputil.Error(w, http.StatusInternalServerError, "failed to cancel subscription")
		return
	}

	if reqBody.AtPeriodEnd {
		sub.CancelAtPeriodEnd = true
	} else {
		sub.Status = "canceled"
		freeLimits := domain.PlanDefaults()[domain.PlanFree]
		_ = h.store.UpdateOrgPlan(r.Context(), orgID, domain.PlanFree, freeLimits)
	}
	sub.UpdatedAt = time.Now()
	_ = h.store.UpsertSubscription(r.Context(), sub)

	log.Info("subscription canceled", "org_id", orgID, "gateway", gatewayName, "at_period_end", reqBody.AtPeriodEnd)

	userID := middleware.GetUserID(r.Context())
	org, orgErr := h.store.GetOrganization(r.Context(), orgID)
	user, userErr := h.store.GetUserByID(r.Context(), userID)
	if orgErr == nil && userErr == nil {
		endDate := ""
		if !sub.CurrentPeriodEnd.IsZero() {
			endDate = sub.CurrentPeriodEnd.Format("January 2, 2006")
		}
		h.lifecycle.Send(r.Context(), userID, domain.EmailMessage{
			To:       user.Email,
			ToName:   user.Name,
			Template: domain.TemplateCancellation,
			Subject:  "Your subscription has been canceled",
			Data: map[string]string{
				"org_name":    org.Name,
				"end_date":    endDate,
				"billing_url": h.dashboardURL + "/settings/billing",
			},
		})
	}

	httputil.JSON(w, http.StatusOK, dto.CancelResponse{Status: "canceled"})
}

// GetBillingPortalURL returns a URL for the customer's billing portal.
func (h *BillingHandler) GetBillingPortalURL(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	sub, err := h.store.GetSubscription(r.Context(), orgID)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "no active subscription")
		return
	}

	if sub.GatewayProvider != domain.GatewayStripe || sub.StripeCustomerID == "" {
		httputil.Error(w, http.StatusBadRequest, "billing portal only available for Stripe subscriptions")
		return
	}

	gw, err := h.registry.Get(domain.GatewayStripe)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "stripe not configured")
		return
	}

	returnURL := h.dashboardURL + "/settings/billing"
	portalURL, err := gw.CreateBillingPortalURL(r.Context(), sub.StripeCustomerID, returnURL)
	if err != nil {
		log.Error("failed to create billing portal", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to create billing portal")
		return
	}

	httputil.JSON(w, http.StatusOK, dto.PortalResponse{URL: portalURL})
}

// UpdateGateway allows an org admin to change the configured payment gateway.
func (h *BillingHandler) UpdateGateway(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	var req struct {
		Gateway string `json:"gateway"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if !h.registry.Has(req.Gateway) {
		httputil.Error(w, http.StatusBadRequest, fmt.Sprintf("unsupported payment gateway: %s", req.Gateway))
		return
	}

	if err := h.store.UpdateOrgPaymentGateway(r.Context(), orgID, req.Gateway); err != nil {
		log.Error("failed to update payment gateway", "error", err, "org_id", orgID, "gateway", req.Gateway)
		httputil.Error(w, http.StatusInternalServerError, "failed to update payment gateway")
		return
	}

	log.Info("payment gateway updated", "org_id", orgID, "gateway", req.Gateway)
	httputil.JSON(w, http.StatusOK, dto.GatewayResponse{Gateway: req.Gateway})
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

	resp := dto.SubscriptionResponse{
		Plan:              org.Plan,
		SeatsLimit:        org.PlanSeatsLimit,
		ProjectsLimit:     org.PlanProjectsLimit,
		EnvironmentsLimit: org.PlanEnvironmentsLimit,
		Gateway:           org.PaymentGateway,
	}

	if sub != nil {
		resp.Status = sub.Status
		resp.CurrentPeriodStart = &sub.CurrentPeriodStart
		resp.CurrentPeriodEnd = &sub.CurrentPeriodEnd
		resp.CancelAtPeriodEnd = sub.CancelAtPeriodEnd
		resp.CanManage = sub.GatewayProvider == domain.GatewayStripe
	} else {
		resp.Status = "none"
	}

	members, _ := h.store.ListOrgMembers(r.Context(), orgID)
	projects, _ := h.store.ListProjects(r.Context(), orgID)
	resp.SeatsUsed = len(members)
	resp.ProjectsUsed = len(projects)

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

	httputil.JSON(w, http.StatusOK, dto.UsageResponse{
		SeatsUsed:         len(members),
		SeatsLimit:        org.PlanSeatsLimit,
		ProjectsUsed:      len(projects),
		ProjectsLimit:     org.PlanProjectsLimit,
		EnvironmentsUsed:  totalEnvs,
		EnvironmentsLimit: org.PlanEnvironmentsLimit,
		Plan:              org.Plan,
	})
}

type txnParts struct {
	orgPrefix string
}

func splitTxnID(txnid string) *txnParts {
	if len(txnid) < 4 || txnid[:3] != "FS_" {
		return nil
	}
	rest := txnid[3:]
	for i := 0; i < len(rest); i++ {
		if rest[i] == '_' {
			return &txnParts{orgPrefix: rest[:i]}
		}
	}
	return nil
}

func (h *BillingHandler) findOrgByTxnPrefix(ctx context.Context, prefix string) (*domain.Organization, error) {
	if prefix == "" {
		return nil, fmt.Errorf("empty org prefix")
	}
	return h.store.GetOrganizationByIDPrefix(ctx, prefix)
}

func mustMarshal(v interface{}) json.RawMessage {
	b, err := json.Marshal(v)
	if err != nil {
		return json.RawMessage(`{}`)
	}
	return json.RawMessage(b)
}
