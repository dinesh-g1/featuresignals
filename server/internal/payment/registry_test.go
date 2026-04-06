package payment

import (
	"context"
	"testing"
)

type stubGateway struct {
	name string
}

func (s *stubGateway) Name() string { return s.name }
func (s *stubGateway) CreateCheckoutSession(context.Context, CheckoutRequest) (*CheckoutResult, error) {
	return nil, nil
}
func (s *stubGateway) HandleWebhook(context.Context, []byte, string) (*WebhookEvent, error) {
	return nil, nil
}
func (s *stubGateway) GetSubscription(context.Context, string) (*SubscriptionDetail, error) {
	return nil, nil
}
func (s *stubGateway) CancelSubscription(context.Context, string, bool) error { return nil }
func (s *stubGateway) CreateBillingPortalURL(context.Context, string, string) (string, error) {
	return "", nil
}

func TestRegistry_RegisterAndGet(t *testing.T) {
	r := NewRegistry()
	gw := &stubGateway{name: "test"}
	r.Register(gw)

	got, err := r.Get("test")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if got.Name() != "test" {
		t.Errorf("Name() = %q, want %q", got.Name(), "test")
	}
}

func TestRegistry_Get_NotFound(t *testing.T) {
	r := NewRegistry()
	_, err := r.Get("missing")
	if err == nil {
		t.Fatal("expected error for missing gateway")
	}
}

func TestRegistry_Has(t *testing.T) {
	r := NewRegistry()
	r.Register(&stubGateway{name: "stripe"})

	if !r.Has("stripe") {
		t.Error("Has(stripe) = false, want true")
	}
	if r.Has("payu") {
		t.Error("Has(payu) = true, want false")
	}
}

func TestRegistry_Names(t *testing.T) {
	r := NewRegistry()
	r.Register(&stubGateway{name: "payu"})
	r.Register(&stubGateway{name: "stripe"})

	names := r.Names()
	if len(names) != 2 {
		t.Fatalf("len(Names()) = %d, want 2", len(names))
	}

	nameSet := map[string]bool{}
	for _, n := range names {
		nameSet[n] = true
	}
	if !nameSet["payu"] || !nameSet["stripe"] {
		t.Errorf("Names() = %v, want [payu, stripe]", names)
	}
}

func TestRegistry_Register_EmptyName_Panics(t *testing.T) {
	defer func() {
		if r := recover(); r == nil {
			t.Error("expected panic for empty gateway name")
		}
	}()

	r := NewRegistry()
	r.Register(&stubGateway{name: ""})
}

func TestRegistry_MultipleGateways(t *testing.T) {
	r := NewRegistry()
	r.Register(&stubGateway{name: "payu"})
	r.Register(&stubGateway{name: "stripe"})

	tests := []struct {
		name    string
		wantErr bool
	}{
		{"payu", false},
		{"stripe", false},
		{"razorpay", true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			gw, err := r.Get(tc.name)
			if tc.wantErr {
				if err == nil {
					t.Error("expected error")
				}
			} else {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				if gw.Name() != tc.name {
					t.Errorf("Name() = %q, want %q", gw.Name(), tc.name)
				}
			}
		})
	}
}
