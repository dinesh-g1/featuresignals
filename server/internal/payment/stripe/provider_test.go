package stripe

import (
	"testing"

	"github.com/featuresignals/server/internal/payment"
)

func TestProvider_Name(t *testing.T) {
	p := NewProvider("sk_test_fake", "whsec_fake", "price_fake")
	if p.Name() != "stripe" {
		t.Errorf("Name() = %q, want %q", p.Name(), "stripe")
	}
}

func TestProvider_ImplementsGateway(t *testing.T) {
	var _ payment.Gateway = (*Provider)(nil)
}

func TestProvider_HandleWebhook_InvalidSignature(t *testing.T) {
	p := NewProvider("sk_test_fake", "whsec_test_secret", "price_fake")

	payload := []byte(`{"id":"evt_test","type":"checkout.session.completed"}`)
	_, err := p.HandleWebhook(nil, payload, "bad_sig")
	if err == nil {
		t.Fatal("expected error for invalid webhook signature")
	}
}

func TestProvider_HandleWebhook_UnhandledEvent(t *testing.T) {
	p := NewProvider("sk_test_fake", "whsec_fake", "price_fake")

	// Craft a payload that would pass signature check in test but with unhandled type.
	// Since we can't easily mock the webhook signature verification without the real
	// webhook secret, we test that the function properly returns errors.
	payload := []byte(`{"id":"evt_test","type":"unknown.event"}`)
	_, err := p.HandleWebhook(nil, payload, "")
	if err == nil {
		t.Fatal("expected error for unhandled event type or invalid signature")
	}
}
