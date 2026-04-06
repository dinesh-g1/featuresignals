package payu

import (
	"context"
	"crypto/sha512"
	"encoding/hex"
	"fmt"

	"github.com/featuresignals/server/internal/payment"
)

const gatewayName = "payu"

// Provider implements payment.Gateway for the PayU payment gateway.
type Provider struct {
	merchantKey string
	salt        string
	mode        string
}

// NewProvider creates a PayU gateway provider with the given merchant credentials.
func NewProvider(merchantKey, salt, mode string) *Provider {
	return &Provider{
		merchantKey: merchantKey,
		salt:        salt,
		mode:        mode,
	}
}

func (p *Provider) Name() string { return gatewayName }

// CreateCheckoutSession returns the PayU form fields the dashboard needs
// to POST to the PayU payment page.
func (p *Provider) CreateCheckoutSession(_ context.Context, req payment.CheckoutRequest) (*payment.CheckoutResult, error) {
	txnid := fmt.Sprintf("FS_%s_%s", req.OrgID[:min(8, len(req.OrgID))], req.Metadata["timestamp"])
	amount := req.Amount
	productinfo := req.Metadata["productinfo"]
	firstname := req.UserName
	email := req.UserEmail

	hash := p.hash(txnid, amount, productinfo, firstname, email)

	return &payment.CheckoutResult{
		Gateway:   gatewayName,
		SessionID: txnid,
		GatewayData: map[string]string{
			"payu_url":    p.endpoint(),
			"key":         p.merchantKey,
			"txnid":       txnid,
			"hash":        hash,
			"amount":      amount,
			"productinfo": productinfo,
			"firstname":   firstname,
			"email":       email,
			"phone":       req.Metadata["phone"],
			"surl":        req.SuccessURL,
			"furl":        req.CancelURL,
		},
	}, nil
}

// HandleWebhook verifies the reverse hash from PayU's callback and returns
// a normalized event. The payload is expected to be the raw form-encoded body.
// The signature parameter carries a pre-parsed map encoded as:
// "txnid|amount|productinfo|firstname|email|status|hash|mihpayid".
func (p *Provider) HandleWebhook(_ context.Context, _ []byte, _ string) (*payment.WebhookEvent, error) {
	return nil, fmt.Errorf("payu: use HandleCallbackParams for PayU webhooks")
}

// HandleCallbackParams verifies and processes the PayU callback form parameters.
// This is PayU-specific since PayU uses form-encoded redirects, not JSON webhooks.
func (p *Provider) HandleCallbackParams(params map[string]string) (*payment.WebhookEvent, error) {
	if !p.verifyReverse(params) {
		return nil, fmt.Errorf("payu: invalid reverse hash for txnid %s", params["txnid"])
	}

	status := params["status"]
	eventType := payment.EventPaymentFailed
	normalizedStatus := "failed"
	if status == "success" {
		eventType = payment.EventCheckoutCompleted
		normalizedStatus = "active"
	}

	return &payment.WebhookEvent{
		Type:           eventType,
		GatewayEventID: params["mihpayid"],
		Status:         normalizedStatus,
		Metadata: map[string]string{
			"txnid":    params["txnid"],
			"mihpayid": params["mihpayid"],
			"amount":   params["amount"],
		},
	}, nil
}

// GetSubscription is not supported by PayU's standard integration.
func (p *Provider) GetSubscription(_ context.Context, _ string) (*payment.SubscriptionDetail, error) {
	return nil, fmt.Errorf("payu: subscription retrieval not supported, contact support")
}

// CancelSubscription is not supported by PayU's standard integration.
func (p *Provider) CancelSubscription(_ context.Context, _ string, _ bool) error {
	return fmt.Errorf("payu: subscription cancellation not supported, contact support")
}

// CreateBillingPortalURL returns empty since PayU has no customer self-service portal.
func (p *Provider) CreateBillingPortalURL(_ context.Context, _, _ string) (string, error) {
	return "", nil
}

func (p *Provider) hash(txnid, amount, productinfo, firstname, email string) string {
	raw := fmt.Sprintf("%s|%s|%s|%s|%s|%s|||||||||||%s",
		p.merchantKey, txnid, amount, productinfo, firstname, email, p.salt)
	sum := sha512.Sum512([]byte(raw))
	return hex.EncodeToString(sum[:])
}

func (p *Provider) verifyReverse(params map[string]string) bool {
	raw := fmt.Sprintf("%s|%s|||||||||||%s|%s|%s|%s|%s|%s",
		p.salt, params["status"], params["email"], params["firstname"],
		params["productinfo"], params["amount"], params["txnid"], p.merchantKey)
	sum := sha512.Sum512([]byte(raw))
	return hex.EncodeToString(sum[:]) == params["hash"]
}

func (p *Provider) endpoint() string {
	if p.mode == "live" {
		return "https://secure.payu.in/_payment"
	}
	return "https://test.payu.in/_payment"
}
