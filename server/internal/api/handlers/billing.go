package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type BillingHandler struct {
	store               domain.Store
	stripeSecretKey     string
	stripeWebhookSecret string
	stripePriceID       string
	logger              *slog.Logger
}

func NewBillingHandler(store domain.Store, stripeSecretKey, stripeWebhookSecret, stripePriceID string, logger *slog.Logger) *BillingHandler {
	return &BillingHandler{
		store:               store,
		stripeSecretKey:     stripeSecretKey,
		stripeWebhookSecret: stripeWebhookSecret,
		stripePriceID:       stripePriceID,
		logger:              logger,
	}
}

// stripePost sends a form-encoded POST to the Stripe API and returns the
// parsed JSON response. No external Stripe SDK is used.
func (h *BillingHandler) stripePost(endpoint string, data url.Values) (map[string]interface{}, error) {
	req, err := http.NewRequest("POST", "https://api.stripe.com/v1/"+endpoint, strings.NewReader(data.Encode()))
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+h.stripeSecretKey)
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("stripe request failed: %w", err)
	}
	defer resp.Body.Close()

	var result map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decoding stripe response: %w", err)
	}

	if resp.StatusCode >= 400 {
		errMsg := "unknown error"
		if errObj, ok := result["error"].(map[string]interface{}); ok {
			if msg, ok := errObj["message"].(string); ok {
				errMsg = msg
			}
		}
		return nil, fmt.Errorf("stripe API error (%d): %s", resp.StatusCode, errMsg)
	}

	return result, nil
}

// CreateCheckout creates a Stripe Checkout Session for the Pro plan.
func (h *BillingHandler) CreateCheckout(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	org, err := h.store.GetOrganization(r.Context(), orgID)
	if err != nil {
		log.Error("failed to get organization", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to load organization")
		return
	}

	data := url.Values{}
	data.Set("mode", "subscription")
	data.Set("line_items[0][price]", h.stripePriceID)
	data.Set("line_items[0][quantity]", "1")
	data.Set("success_url", "https://app.featuresignals.com/settings/billing?session_id={CHECKOUT_SESSION_ID}")
	data.Set("cancel_url", "https://app.featuresignals.com/settings/billing")
	data.Set("metadata[org_id]", orgID)
	data.Set("subscription_data[metadata][org_id]", orgID)

	if org.StripeCustomerID != "" {
		data.Set("customer", org.StripeCustomerID)
	} else {
		data.Set("customer_creation", "always")
	}

	result, err := h.stripePost("checkout/sessions", data)
	if err != nil {
		log.Error("stripe checkout session creation failed", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusBadGateway, "failed to create checkout session")
		return
	}

	checkoutURL, _ := result["url"].(string)
	log.Info("checkout session created", "org_id", orgID)

	httputil.JSON(w, http.StatusOK, map[string]string{"url": checkoutURL})
}

// CreatePortal creates a Stripe Customer Portal session for subscription management.
func (h *BillingHandler) CreatePortal(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	org, err := h.store.GetOrganization(r.Context(), orgID)
	if err != nil {
		log.Error("failed to get organization", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to load organization")
		return
	}

	if org.StripeCustomerID == "" {
		httputil.Error(w, http.StatusBadRequest, "no billing account found — please subscribe first")
		return
	}

	data := url.Values{}
	data.Set("customer", org.StripeCustomerID)
	data.Set("return_url", "https://app.featuresignals.com/settings/billing")

	result, err := h.stripePost("billing_portal/sessions", data)
	if err != nil {
		log.Error("stripe portal session creation failed", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusBadGateway, "failed to create portal session")
		return
	}

	portalURL, _ := result["url"].(string)
	log.Info("portal session created", "org_id", orgID)

	httputil.JSON(w, http.StatusOK, map[string]string{"url": portalURL})
}

// Webhook handles incoming Stripe webhook events. No JWT auth — Stripe
// signs the payload and we verify the signature with HMAC-SHA256.
func (h *BillingHandler) Webhook(w http.ResponseWriter, r *http.Request) {
	const maxBodySize = 65536
	body, err := io.ReadAll(io.LimitReader(r.Body, maxBodySize))
	if err != nil {
		h.logger.Error("failed to read webhook body", "error", err)
		httputil.Error(w, http.StatusBadRequest, "failed to read body")
		return
	}

	sigHeader := r.Header.Get("Stripe-Signature")
	if !h.verifySignature(body, sigHeader) {
		h.logger.Warn("invalid stripe webhook signature")
		httputil.Error(w, http.StatusBadRequest, "invalid signature")
		return
	}

	var event struct {
		Type string          `json:"type"`
		Data json.RawMessage `json:"data"`
	}
	if err := json.Unmarshal(body, &event); err != nil {
		h.logger.Error("failed to parse webhook event", "error", err)
		httputil.Error(w, http.StatusBadRequest, "invalid payload")
		return
	}

	// data.object is nested inside event.Data
	var wrapper struct {
		Object json.RawMessage `json:"object"`
	}
	if err := json.Unmarshal(event.Data, &wrapper); err != nil {
		h.logger.Error("failed to parse event data", "error", err)
		w.WriteHeader(http.StatusOK)
		return
	}

	var obj map[string]interface{}
	if err := json.Unmarshal(wrapper.Object, &obj); err != nil {
		h.logger.Error("failed to parse event object", "error", err)
		w.WriteHeader(http.StatusOK)
		return
	}

	h.logger.Info("stripe webhook received", "type", event.Type)

	switch event.Type {
	case "checkout.session.completed":
		h.handleCheckoutCompleted(r.Context(), obj)
	case "invoice.paid":
		h.handleInvoicePaid(r.Context(), obj)
	case "invoice.payment_failed":
		h.handleInvoicePaymentFailed(r.Context(), obj)
	case "customer.subscription.deleted":
		h.handleSubscriptionDeleted(r.Context(), obj)
	default:
		h.logger.Debug("unhandled stripe event", "type", event.Type)
	}

	w.WriteHeader(http.StatusOK)
}

func (h *BillingHandler) handleCheckoutCompleted(ctx context.Context, obj map[string]interface{}) {
	customerID, _ := obj["customer"].(string)
	subscriptionID, _ := obj["subscription"].(string)

	metadata, _ := obj["metadata"].(map[string]interface{})
	orgID, _ := metadata["org_id"].(string)
	if orgID == "" {
		h.logger.Warn("checkout.session.completed missing org_id in metadata")
		return
	}

	proLimits := domain.PlanDefaults[domain.PlanPro]
	if err := h.store.UpdateOrgPlan(ctx, orgID, domain.PlanPro, proLimits); err != nil {
		h.logger.Error("failed to update org plan after checkout", "error", err, "org_id", orgID)
		return
	}

	sub := &domain.Subscription{
		OrgID:                orgID,
		StripeSubscriptionID: subscriptionID,
		StripeCustomerID:     customerID,
		Plan:                 domain.PlanPro,
		Status:               "active",
		CreatedAt:            time.Now(),
		UpdatedAt:            time.Now(),
	}
	if err := h.store.UpsertSubscription(ctx, sub); err != nil {
		h.logger.Error("failed to upsert subscription", "error", err, "org_id", orgID)
		return
	}

	// Mark onboarding plan_selected step
	state, _ := h.store.GetOnboardingState(ctx, orgID)
	if state == nil {
		state = &domain.OnboardingState{OrgID: orgID}
	}
	state.PlanSelected = true
	state.UpdatedAt = time.Now()
	_ = h.store.UpsertOnboardingState(ctx, state)

	h.logger.Info("checkout completed — org upgraded to pro", "org_id", orgID, "customer_id", customerID)
}

func (h *BillingHandler) handleInvoicePaid(ctx context.Context, obj map[string]interface{}) {
	subscriptionID, _ := obj["subscription"].(string)
	if subscriptionID == "" {
		return
	}

	// Extract org_id from subscription metadata
	subMetadata, _ := obj["subscription_details"].(map[string]interface{})
	metadata, _ := subMetadata["metadata"].(map[string]interface{})
	orgID, _ := metadata["org_id"].(string)

	// Fallback: look up subscription from lines
	if orgID == "" {
		lines, _ := obj["lines"].(map[string]interface{})
		data, _ := lines["data"].([]interface{})
		if len(data) > 0 {
			line, _ := data[0].(map[string]interface{})
			lineMeta, _ := line["metadata"].(map[string]interface{})
			orgID, _ = lineMeta["org_id"].(string)
		}
	}
	if orgID == "" {
		h.logger.Warn("invoice.paid: could not determine org_id", "subscription_id", subscriptionID)
		return
	}

	periodEnd, _ := obj["period_end"].(float64)
	periodStart, _ := obj["period_start"].(float64)

	sub := &domain.Subscription{
		OrgID:                orgID,
		StripeSubscriptionID: subscriptionID,
		Status:               "active",
		CurrentPeriodStart:   time.Unix(int64(periodStart), 0),
		CurrentPeriodEnd:     time.Unix(int64(periodEnd), 0),
		UpdatedAt:            time.Now(),
	}
	if err := h.store.UpsertSubscription(ctx, sub); err != nil {
		h.logger.Error("failed to update subscription on invoice.paid", "error", err, "org_id", orgID)
		return
	}

	h.logger.Info("invoice paid", "org_id", orgID, "subscription_id", subscriptionID)
}

func (h *BillingHandler) handleInvoicePaymentFailed(ctx context.Context, obj map[string]interface{}) {
	subscriptionID, _ := obj["subscription"].(string)
	if subscriptionID == "" {
		return
	}

	subMetadata, _ := obj["subscription_details"].(map[string]interface{})
	metadata, _ := subMetadata["metadata"].(map[string]interface{})
	orgID, _ := metadata["org_id"].(string)
	if orgID == "" {
		h.logger.Warn("invoice.payment_failed: could not determine org_id", "subscription_id", subscriptionID)
		return
	}

	sub := &domain.Subscription{
		OrgID:                orgID,
		StripeSubscriptionID: subscriptionID,
		Status:               "past_due",
		UpdatedAt:            time.Now(),
	}
	if err := h.store.UpsertSubscription(ctx, sub); err != nil {
		h.logger.Error("failed to update subscription on payment failure", "error", err, "org_id", orgID)
		return
	}

	h.logger.Warn("invoice payment failed", "org_id", orgID, "subscription_id", subscriptionID)
}

func (h *BillingHandler) handleSubscriptionDeleted(ctx context.Context, obj map[string]interface{}) {
	metadata, _ := obj["metadata"].(map[string]interface{})
	orgID, _ := metadata["org_id"].(string)
	subscriptionID, _ := obj["id"].(string)

	if orgID == "" {
		h.logger.Warn("customer.subscription.deleted: missing org_id in metadata", "subscription_id", subscriptionID)
		return
	}

	freeLimits := domain.PlanDefaults[domain.PlanFree]
	if err := h.store.UpdateOrgPlan(ctx, orgID, domain.PlanFree, freeLimits); err != nil {
		h.logger.Error("failed to downgrade org to free", "error", err, "org_id", orgID)
		return
	}

	sub := &domain.Subscription{
		OrgID:                orgID,
		StripeSubscriptionID: subscriptionID,
		Status:               "canceled",
		UpdatedAt:            time.Now(),
	}
	if err := h.store.UpsertSubscription(ctx, sub); err != nil {
		h.logger.Error("failed to update subscription on deletion", "error", err, "org_id", orgID)
	}

	h.logger.Info("subscription deleted — org downgraded to free", "org_id", orgID)
}

// verifySignature validates the Stripe-Signature header using HMAC-SHA256.
// Stripe sends: t=<timestamp>,v1=<signature>
func (h *BillingHandler) verifySignature(payload []byte, sigHeader string) bool {
	if h.stripeWebhookSecret == "" || sigHeader == "" {
		return false
	}

	var timestamp, signature string
	for _, part := range strings.Split(sigHeader, ",") {
		kv := strings.SplitN(part, "=", 2)
		if len(kv) != 2 {
			continue
		}
		switch kv[0] {
		case "t":
			timestamp = kv[1]
		case "v1":
			signature = kv[1]
		}
	}

	if timestamp == "" || signature == "" {
		return false
	}

	// Reject timestamps older than 5 minutes to prevent replay attacks
	ts, err := strconv.ParseInt(timestamp, 10, 64)
	if err != nil {
		return false
	}
	if time.Since(time.Unix(ts, 0)) > 5*time.Minute {
		return false
	}

	signedPayload := timestamp + "." + string(payload)
	mac := hmac.New(sha256.New, []byte(h.stripeWebhookSecret))
	mac.Write([]byte(signedPayload))
	expectedSig := hex.EncodeToString(mac.Sum(nil))

	return hmac.Equal([]byte(expectedSig), []byte(signature))
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

	// Include live usage counts
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

	// Count total environments across all projects
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
