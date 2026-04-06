package stripe

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	stripe "github.com/stripe/stripe-go/v82"
	"github.com/stripe/stripe-go/v82/webhook"

	"github.com/featuresignals/server/internal/payment"
)

const gatewayName = "stripe"

// Provider implements payment.Gateway for the Stripe payment gateway.
type Provider struct {
	client        *stripe.Client
	webhookSecret string
	priceID       string
}

// NewProvider creates a Stripe gateway provider.
// secretKey is the Stripe API secret key (sk_test_... or sk_live_...).
// webhookSecret is the webhook endpoint signing secret (whsec_...).
// priceID is the Stripe Price ID for the subscription plan.
func NewProvider(secretKey, webhookSecret, priceID string) *Provider {
	return &Provider{
		client:        stripe.NewClient(secretKey),
		webhookSecret: webhookSecret,
		priceID:       priceID,
	}
}

func (p *Provider) Name() string { return gatewayName }

// CreateCheckoutSession creates a Stripe Checkout Session in subscription mode
// and returns the redirect URL for the customer.
func (p *Provider) CreateCheckoutSession(ctx context.Context, req payment.CheckoutRequest) (*payment.CheckoutResult, error) {
	params := &stripe.CheckoutSessionCreateParams{
		Mode:            stripe.String(string(stripe.CheckoutSessionModeSubscription)),
		CustomerEmail:   stripe.String(req.UserEmail),
		SuccessURL:      stripe.String(req.SuccessURL),
		CancelURL:       stripe.String(req.CancelURL),
		ClientReferenceID: stripe.String(req.OrgID),
		LineItems: []*stripe.CheckoutSessionCreateLineItemParams{
			{
				Price:    stripe.String(p.priceID),
				Quantity: stripe.Int64(1),
			},
		},
		Metadata: map[string]string{
			"org_id":    req.OrgID,
			"plan":      req.Plan,
			"user_name": req.UserName,
		},
	}

	session, err := p.client.V1CheckoutSessions.Create(ctx, params)
	if err != nil {
		return nil, fmt.Errorf("stripe checkout session create: %w", err)
	}

	return &payment.CheckoutResult{
		Gateway:     gatewayName,
		SessionID:   session.ID,
		RedirectURL: session.URL,
	}, nil
}

// HandleWebhook verifies the Stripe webhook signature and returns a normalized event.
func (p *Provider) HandleWebhook(_ context.Context, payload []byte, signature string) (*payment.WebhookEvent, error) {
	event, err := webhook.ConstructEvent(payload, signature, p.webhookSecret)
	if err != nil {
		return nil, fmt.Errorf("stripe webhook signature verification: %w", err)
	}

	switch event.Type {
	case "checkout.session.completed":
		return p.handleCheckoutCompleted(event)
	case "customer.subscription.updated":
		return p.handleSubscriptionUpdated(event)
	case "customer.subscription.deleted":
		return p.handleSubscriptionDeleted(event)
	case "invoice.payment_failed":
		return p.handlePaymentFailed(event)
	default:
		return nil, fmt.Errorf("stripe: unhandled event type %s", event.Type)
	}
}

// GetSubscription retrieves subscription details from Stripe.
func (p *Provider) GetSubscription(ctx context.Context, subscriptionID string) (*payment.SubscriptionDetail, error) {
	sub, err := p.client.V1Subscriptions.Retrieve(ctx, subscriptionID, nil)
	if err != nil {
		return nil, fmt.Errorf("stripe subscription retrieve: %w", err)
	}

	customerID := ""
	if sub.Customer != nil {
		customerID = sub.Customer.ID
	}

	return &payment.SubscriptionDetail{
		ID:                sub.ID,
		CustomerID:        customerID,
		Status:            string(sub.Status),
		CancelAtPeriodEnd: sub.CancelAtPeriodEnd,
	}, nil
}

// CancelSubscription cancels a Stripe subscription. If atPeriodEnd is true,
// the subscription stays active until the current period ends.
func (p *Provider) CancelSubscription(ctx context.Context, subscriptionID string, atPeriodEnd bool) error {
	if atPeriodEnd {
		_, err := p.client.V1Subscriptions.Update(ctx, subscriptionID, &stripe.SubscriptionUpdateParams{
			CancelAtPeriodEnd: stripe.Bool(true),
		})
		if err != nil {
			return fmt.Errorf("stripe subscription cancel at period end: %w", err)
		}
		return nil
	}

	_, err := p.client.V1Subscriptions.Cancel(ctx, subscriptionID, nil)
	if err != nil {
		return fmt.Errorf("stripe subscription cancel: %w", err)
	}
	return nil
}

// CreateBillingPortalURL creates a Stripe Billing Portal session URL
// where the customer can manage payment methods and billing.
func (p *Provider) CreateBillingPortalURL(ctx context.Context, customerID, returnURL string) (string, error) {
	params := &stripe.BillingPortalSessionCreateParams{
		Customer:  stripe.String(customerID),
		ReturnURL: stripe.String(returnURL),
	}

	session, err := p.client.V1BillingPortalSessions.Create(ctx, params)
	if err != nil {
		return "", fmt.Errorf("stripe billing portal session: %w", err)
	}

	return session.URL, nil
}

func (p *Provider) handleCheckoutCompleted(event stripe.Event) (*payment.WebhookEvent, error) {
	var session stripe.CheckoutSession
	if err := json.Unmarshal(event.Data.Raw, &session); err != nil {
		return nil, fmt.Errorf("stripe: unmarshal checkout session: %w", err)
	}

	customerID := ""
	if session.Customer != nil {
		customerID = session.Customer.ID
	}
	subscriptionID := ""
	if session.Subscription != nil {
		subscriptionID = session.Subscription.ID
	}

	metadata := session.Metadata
	if metadata == nil {
		metadata = make(map[string]string)
	}

	now := time.Now()
	return &payment.WebhookEvent{
		Type:           payment.EventCheckoutCompleted,
		GatewayEventID: event.ID,
		CustomerID:     customerID,
		SubscriptionID: subscriptionID,
		Status:         "active",
		Plan:           metadata["plan"],
		PeriodStart:    now,
		PeriodEnd:      now.AddDate(0, 1, 0),
		Metadata:       metadata,
	}, nil
}

func (p *Provider) handleSubscriptionUpdated(event stripe.Event) (*payment.WebhookEvent, error) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		return nil, fmt.Errorf("stripe: unmarshal subscription: %w", err)
	}

	customerID := ""
	if sub.Customer != nil {
		customerID = sub.Customer.ID
	}

	return &payment.WebhookEvent{
		Type:           payment.EventSubscriptionUpdated,
		GatewayEventID: event.ID,
		CustomerID:     customerID,
		SubscriptionID: sub.ID,
		Status:         string(sub.Status),
		Metadata:       sub.Metadata,
	}, nil
}

func (p *Provider) handleSubscriptionDeleted(event stripe.Event) (*payment.WebhookEvent, error) {
	var sub stripe.Subscription
	if err := json.Unmarshal(event.Data.Raw, &sub); err != nil {
		return nil, fmt.Errorf("stripe: unmarshal subscription: %w", err)
	}

	customerID := ""
	if sub.Customer != nil {
		customerID = sub.Customer.ID
	}

	return &payment.WebhookEvent{
		Type:           payment.EventSubscriptionCanceled,
		GatewayEventID: event.ID,
		CustomerID:     customerID,
		SubscriptionID: sub.ID,
		Status:         "canceled",
		Metadata:       sub.Metadata,
	}, nil
}

func (p *Provider) handlePaymentFailed(event stripe.Event) (*payment.WebhookEvent, error) {
	subscriptionID := event.GetObjectValue("subscription")
	customerID := event.GetObjectValue("customer")

	return &payment.WebhookEvent{
		Type:           payment.EventPaymentFailed,
		GatewayEventID: event.ID,
		CustomerID:     customerID,
		SubscriptionID: subscriptionID,
		Status:         "past_due",
	}, nil
}
