package payu

import (
	"context"
	"crypto/sha512"
	"encoding/hex"
	"fmt"
	"testing"

	"github.com/featuresignals/server/internal/payment"
)

func TestProvider_Name(t *testing.T) {
	p := NewProvider("key", "salt", "test")
	if p.Name() != "payu" {
		t.Errorf("Name() = %q, want %q", p.Name(), "payu")
	}
}

func TestProvider_CreateCheckoutSession(t *testing.T) {
	p := NewProvider("merchant_key", "merchant_salt", "test")

	req := payment.CheckoutRequest{
		OrgID:      "org-12345678-abcd",
		UserEmail:  "user@example.com",
		UserName:   "Test User",
		Plan:       "pro",
		Amount:     "1999.00",
		SuccessURL: "https://app.example.com/v1/billing/payu/callback",
		CancelURL:  "https://app.example.com/v1/billing/payu/failure",
		Metadata: map[string]string{
			"timestamp":   "1700000000000",
			"productinfo": "FeatureSignals Pro Plan",
			"phone":       "9999999999",
		},
	}

	result, err := p.CreateCheckoutSession(context.Background(), req)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if result.Gateway != "payu" {
		t.Errorf("Gateway = %q, want %q", result.Gateway, "payu")
	}
	if result.GatewayData["payu_url"] != "https://test.payu.in/_payment" {
		t.Errorf("payu_url = %q, want test endpoint", result.GatewayData["payu_url"])
	}
	if result.GatewayData["key"] != "merchant_key" {
		t.Errorf("key = %q, want %q", result.GatewayData["key"], "merchant_key")
	}
	if result.GatewayData["email"] != "user@example.com" {
		t.Errorf("email = %q, want %q", result.GatewayData["email"], "user@example.com")
	}
	if result.GatewayData["hash"] == "" {
		t.Error("hash should not be empty")
	}
	if result.GatewayData["surl"] != req.SuccessURL {
		t.Errorf("surl = %q, want %q", result.GatewayData["surl"], req.SuccessURL)
	}
}

func TestProvider_Hash_Deterministic(t *testing.T) {
	p := NewProvider("testkey", "testsalt", "test")
	h1 := p.hash("TXN001", "1999.00", "Pro Plan", "John", "john@test.com")
	h2 := p.hash("TXN001", "1999.00", "Pro Plan", "John", "john@test.com")
	if h1 != h2 {
		t.Error("hash should be deterministic")
	}
	if len(h1) != 128 {
		t.Errorf("expected 128-char SHA-512 hash, got %d", len(h1))
	}
}

func TestProvider_Hash_DifferentInputs(t *testing.T) {
	p := NewProvider("testkey", "testsalt", "test")
	h1 := p.hash("TXN001", "1999.00", "Pro Plan", "John", "john@test.com")
	h2 := p.hash("TXN002", "1999.00", "Pro Plan", "John", "john@test.com")
	if h1 == h2 {
		t.Error("different txnid should produce different hash")
	}
}

func TestProvider_Hash_FormatConsistency(t *testing.T) {
	p := NewProvider("merchant", "salt", "test")

	txnid := "FS_test1234_1700000000"
	amount := "1999.00"
	productinfo := "FeatureSignals Pro Plan"
	firstname := "Test"
	email := "test@example.com"

	expected := fmt.Sprintf("%s|%s|%s|%s|%s|%s|||||||||||%s",
		"merchant", txnid, amount, productinfo, firstname, email, "salt")
	expectedHash := sha512.Sum512([]byte(expected))
	want := hex.EncodeToString(expectedHash[:])

	got := p.hash(txnid, amount, productinfo, firstname, email)
	if got != want {
		t.Errorf("hash does not match manual computation")
	}
}

func TestProvider_HandleCallbackParams_Success(t *testing.T) {
	p := NewProvider("testkey", "testsalt", "test")

	reverseStr := fmt.Sprintf("%s|%s|||||||||||%s|%s|%s|%s|%s|%s",
		p.salt, "success", "john@test.com", "John", "Pro Plan", "1999.00", "TXN001", p.merchantKey)
	reverseHash := sha512.Sum512([]byte(reverseStr))

	params := map[string]string{
		"txnid":       "TXN001",
		"amount":      "1999.00",
		"productinfo": "Pro Plan",
		"firstname":   "John",
		"email":       "john@test.com",
		"status":      "success",
		"hash":        hex.EncodeToString(reverseHash[:]),
		"mihpayid":    "PAY123",
	}

	event, err := p.HandleCallbackParams(params)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if event.Type != payment.EventCheckoutCompleted {
		t.Errorf("Type = %q, want %q", event.Type, payment.EventCheckoutCompleted)
	}
	if event.Status != "active" {
		t.Errorf("Status = %q, want %q", event.Status, "active")
	}
	if event.GatewayEventID != "PAY123" {
		t.Errorf("GatewayEventID = %q, want %q", event.GatewayEventID, "PAY123")
	}
}

func TestProvider_HandleCallbackParams_Failure(t *testing.T) {
	p := NewProvider("testkey", "testsalt", "test")

	reverseStr := fmt.Sprintf("%s|%s|||||||||||%s|%s|%s|%s|%s|%s",
		p.salt, "failure", "john@test.com", "John", "Pro Plan", "1999.00", "TXN001", p.merchantKey)
	reverseHash := sha512.Sum512([]byte(reverseStr))

	params := map[string]string{
		"txnid":       "TXN001",
		"amount":      "1999.00",
		"productinfo": "Pro Plan",
		"firstname":   "John",
		"email":       "john@test.com",
		"status":      "failure",
		"hash":        hex.EncodeToString(reverseHash[:]),
		"mihpayid":    "PAY456",
	}

	event, err := p.HandleCallbackParams(params)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if event.Type != payment.EventPaymentFailed {
		t.Errorf("Type = %q, want %q", event.Type, payment.EventPaymentFailed)
	}
	if event.Status != "failed" {
		t.Errorf("Status = %q, want %q", event.Status, "failed")
	}
}

func TestProvider_HandleCallbackParams_InvalidHash(t *testing.T) {
	p := NewProvider("testkey", "testsalt", "test")

	params := map[string]string{
		"txnid":       "TXN001",
		"amount":      "1999.00",
		"productinfo": "Pro Plan",
		"firstname":   "John",
		"email":       "john@test.com",
		"status":      "success",
		"hash":        "badhash",
		"mihpayid":    "PAY789",
	}

	_, err := p.HandleCallbackParams(params)
	if err == nil {
		t.Fatal("expected error for invalid hash")
	}
}

func TestProvider_HandleCallbackParams_TamperedAmount(t *testing.T) {
	p := NewProvider("testkey", "testsalt", "test")

	reverseStr := fmt.Sprintf("%s|%s|||||||||||%s|%s|%s|%s|%s|%s",
		p.salt, "success", "john@test.com", "John", "Pro Plan", "1999.00", "TXN001", p.merchantKey)
	reverseHash := sha512.Sum512([]byte(reverseStr))

	params := map[string]string{
		"txnid":       "TXN001",
		"amount":      "1.00", // tampered
		"productinfo": "Pro Plan",
		"firstname":   "John",
		"email":       "john@test.com",
		"status":      "success",
		"hash":        hex.EncodeToString(reverseHash[:]),
		"mihpayid":    "PAY789",
	}

	_, err := p.HandleCallbackParams(params)
	if err == nil {
		t.Fatal("expected error for tampered amount")
	}
}

func TestProvider_Endpoint(t *testing.T) {
	tests := []struct {
		mode string
		want string
	}{
		{"test", "https://test.payu.in/_payment"},
		{"live", "https://secure.payu.in/_payment"},
		{"", "https://test.payu.in/_payment"},
	}
	for _, tc := range tests {
		t.Run(tc.mode, func(t *testing.T) {
			p := NewProvider("k", "s", tc.mode)
			if got := p.endpoint(); got != tc.want {
				t.Errorf("endpoint() = %q, want %q", got, tc.want)
			}
		})
	}
}

func TestProvider_GetSubscription_Unsupported(t *testing.T) {
	p := NewProvider("k", "s", "test")
	_, err := p.GetSubscription(context.Background(), "sub_123")
	if err == nil {
		t.Error("expected error for unsupported operation")
	}
}

func TestProvider_CancelSubscription_Unsupported(t *testing.T) {
	p := NewProvider("k", "s", "test")
	err := p.CancelSubscription(context.Background(), "sub_123", true)
	if err == nil {
		t.Error("expected error for unsupported operation")
	}
}

func TestProvider_CreateBillingPortalURL_Empty(t *testing.T) {
	p := NewProvider("k", "s", "test")
	url, err := p.CreateBillingPortalURL(context.Background(), "cust_123", "https://app.example.com")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if url != "" {
		t.Errorf("expected empty URL, got %q", url)
	}
}
