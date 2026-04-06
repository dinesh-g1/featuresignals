package payment

import (
	"context"
	"time"
)

// Gateway defines the strategy interface for payment gateway operations.
// Each payment provider (PayU, Stripe, etc.) implements this interface.
// Implementations must be safe for concurrent use.
type Gateway interface {
	// Name returns the unique identifier for this gateway (e.g. "payu", "stripe").
	Name() string

	// CreateCheckoutSession initiates a payment session and returns either
	// a redirect URL (Stripe) or form fields (PayU) needed by the client.
	CreateCheckoutSession(ctx context.Context, req CheckoutRequest) (*CheckoutResult, error)

	// HandleWebhook verifies and parses an incoming webhook payload from the
	// payment provider. Returns a normalized event or an error if verification fails.
	HandleWebhook(ctx context.Context, payload []byte, signature string) (*WebhookEvent, error)

	// GetSubscription retrieves subscription details from the payment provider.
	GetSubscription(ctx context.Context, subscriptionID string) (*SubscriptionDetail, error)

	// CancelSubscription cancels a subscription. If atPeriodEnd is true, the
	// subscription remains active until the current billing period ends.
	CancelSubscription(ctx context.Context, subscriptionID string, atPeriodEnd bool) error

	// CreateBillingPortalURL generates a URL where the customer can manage
	// their payment method and billing details. Returns empty string if the
	// gateway does not support self-service portals.
	CreateBillingPortalURL(ctx context.Context, customerID, returnURL string) (string, error)
}

// CheckoutRequest contains the information needed to initiate a payment session.
type CheckoutRequest struct {
	OrgID      string
	UserEmail  string
	UserName   string
	Plan       string
	Amount     string
	SuccessURL string
	CancelURL  string
	Metadata   map[string]string
}

// CheckoutResult contains the response from a checkout session creation.
// For redirect-based flows (Stripe), RedirectURL is populated.
// For form-post flows (PayU), GatewayData contains the form fields.
type CheckoutResult struct {
	Gateway     string
	SessionID   string
	RedirectURL string
	GatewayData map[string]string
}

// WebhookEvent is the normalized representation of a payment provider event.
type WebhookEvent struct {
	Type           string
	GatewayEventID string
	CustomerID     string
	SubscriptionID string
	Status         string
	Plan           string
	PeriodStart    time.Time
	PeriodEnd      time.Time
	Metadata       map[string]string
}

// SubscriptionDetail holds provider-side subscription information.
type SubscriptionDetail struct {
	ID                 string
	CustomerID         string
	Status             string
	Plan               string
	CurrentPeriodStart time.Time
	CurrentPeriodEnd   time.Time
	CancelAtPeriodEnd  bool
}

// Webhook event type constants used across providers.
const (
	EventCheckoutCompleted     = "checkout.completed"
	EventSubscriptionUpdated   = "subscription.updated"
	EventSubscriptionCanceled  = "subscription.canceled"
	EventPaymentFailed         = "payment.failed"
)
