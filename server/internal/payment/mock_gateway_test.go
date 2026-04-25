package payment

import (
	"context"
	"log/slog"
	"sync"
	"testing"
	"time"
)

func TestMockGateway_SuccessfulCharge(t *testing.T) {
	g := NewMockGateway(slog.Default())
	g.SetFailRate(0.0) // never fail
	g.SetDelay(1 * time.Millisecond)

	charge, err := g.Charge(context.Background(), "cus_123", 29.99, "EUR", "Monthly subscription")
	if err != nil {
		t.Fatalf("expected no error, got: %v", err)
	}

	if charge.Status != "succeeded" {
		t.Errorf("charge.Status = %q, want %q", charge.Status, "succeeded")
	}
	if charge.Amount != 29.99 {
		t.Errorf("charge.Amount = %f, want %f", charge.Amount, 29.99)
	}
	if charge.Currency != "EUR" {
		t.Errorf("charge.Currency = %q, want %q", charge.Currency, "EUR")
	}
	if charge.Description != "Monthly subscription" {
		t.Errorf("charge.Description = %q, want %q", charge.Description, "Monthly subscription")
	}
	if charge.Metadata["customer_id"] != "cus_123" {
		t.Errorf("charge.Metadata[customer_id] = %q, want %q", charge.Metadata["customer_id"], "cus_123")
	}
	if charge.ID == "" {
		t.Error("charge.ID must not be empty")
	}
	if charge.CreatedAt.IsZero() {
		t.Error("charge.CreatedAt must not be zero")
	}
}

func TestMockGateway_FailedCharge(t *testing.T) {
	g := NewMockGateway(slog.Default())
	g.SetFailRate(1.0) // always fail
	g.SetDelay(1 * time.Millisecond)

	charge, err := g.Charge(context.Background(), "cus_456", 99.99, "USD", "Enterprise plan")
	if err == nil {
		t.Fatal("expected error for failed charge, got nil")
	}

	if charge == nil {
		t.Fatal("expected non-nil charge even on failure")
	}
	if charge.Status != "failed" {
		t.Errorf("charge.Status = %q, want %q", charge.Status, "failed")
	}
	if charge.Metadata["reason"] != "simulated_failure" {
		t.Errorf("charge.Metadata[reason] = %q, want %q", charge.Metadata["reason"], "simulated_failure")
	}
}

func TestMockGateway_ListChargesByCustomer(t *testing.T) {
	g := NewMockGateway(slog.Default())
	g.SetFailRate(0.0)
	g.SetDelay(1 * time.Millisecond)

	// Create charges for two different customers.
	_, err := g.Charge(context.Background(), "cus_a", 10.00, "EUR", "Charge A1")
	if err != nil {
		t.Fatalf("Charge A1 failed: %v", err)
	}
	_, err = g.Charge(context.Background(), "cus_a", 20.00, "EUR", "Charge A2")
	if err != nil {
		t.Fatalf("Charge A2 failed: %v", err)
	}
	_, err = g.Charge(context.Background(), "cus_b", 30.00, "EUR", "Charge B1")
	if err != nil {
		t.Fatalf("Charge B1 failed: %v", err)
	}

	// List charges for customer A.
	chargesA, err := g.ListCharges(context.Background(), "cus_a")
	if err != nil {
		t.Fatalf("ListCharges failed: %v", err)
	}
	if len(chargesA) != 2 {
		t.Errorf("len(chargesA) = %d, want 2", len(chargesA))
	}

	// List all charges.
	allCharges, err := g.ListCharges(context.Background(), "")
	if err != nil {
		t.Fatalf("ListCharges (all) failed: %v", err)
	}
	if len(allCharges) != 3 {
		t.Errorf("len(allCharges) = %d, want 3", len(allCharges))
	}

	// List charges for customer with no charges.
	chargesC, err := g.ListCharges(context.Background(), "cus_c")
	if err != nil {
		t.Fatalf("ListCharges (empty) failed: %v", err)
	}
	if len(chargesC) != 0 {
		t.Errorf("len(chargesC) = %d, want 0", len(chargesC))
	}
}

func TestMockGateway_ContextCancellation(t *testing.T) {
	g := NewMockGateway(slog.Default())
	g.SetFailRate(0.0)
	g.SetDelay(500 * time.Millisecond) // long delay

	ctx, cancel := context.WithTimeout(context.Background(), 50*time.Millisecond)
	defer cancel()

	_, err := g.Charge(ctx, "cus_cancel", 50.00, "EUR", "Cancelled charge")
	if err == nil {
		t.Fatal("expected context cancellation error, got nil")
	}
	if err != context.DeadlineExceeded && err != context.Canceled {
		t.Errorf("expected context error, got: %v", err)
	}
}

func TestMockGateway_ConcurrentCharges(t *testing.T) {
	g := NewMockGateway(slog.Default())
	g.SetFailRate(0.2) // 20% failure rate
	g.SetDelay(5 * time.Millisecond)

	var wg sync.WaitGroup
	numCharges := 20

	// Track results.
	results := make([]struct {
		success bool
		err     error
	}, numCharges)

	for i := 0; i < numCharges; i++ {
		wg.Add(1)
		go func(idx int) {
			defer wg.Done()
			_, err := g.Charge(context.Background(), "cus_concurrent", 15.00, "EUR", "Concurrent charge")
			results[idx].success = err == nil
			results[idx].err = err
		}(i)
	}

	wg.Wait()

	// Count successes and failures.
	successes := 0
	failures := 0
	for _, r := range results {
		if r.success {
			successes++
		} else {
			failures++
		}
	}

	if successes+failures != numCharges {
		t.Errorf("total charges = %d, want %d", successes+failures, numCharges)
	}

	// With 20% failure rate and 20 charges, we expect 1-7 failures
	// (statistically unlikely to be outside this range, but not impossible).
	if failures == 0 {
		t.Log("warning: no failures with 20% fail rate — possible but unlikely")
	}
	if successes == 0 {
		t.Log("warning: no successes with 80% success rate — possible but unlikely")
	}

	// Verify all charges are stored.
	charges, err := g.ListCharges(context.Background(), "cus_concurrent")
	if err != nil {
		t.Fatalf("ListCharges failed: %v", err)
	}
	if len(charges) != numCharges {
		t.Errorf("len(charges) = %d, want %d", len(charges), numCharges)
	}

	// Verify no race conditions in charge IDs.
	idSet := make(map[string]bool)
	for _, c := range charges {
		if idSet[c.ID] {
			t.Errorf("duplicate charge ID: %s", c.ID)
		}
		idSet[c.ID] = true
	}
}

func TestMockGateway_GatewayInterface(t *testing.T) {
	// Verify MockGateway satisfies the Gateway interface at compile time.
	var _ Gateway = (*MockGateway)(nil)

	g := NewMockGateway(slog.Default())

	// Test Name.
	if g.Name() != "mock" {
		t.Errorf("Name() = %q, want %q", g.Name(), "mock")
	}

	// Test CreateCheckoutSession.
	result, err := g.CreateCheckoutSession(context.Background(), CheckoutRequest{
		SuccessURL: "https://example.com/success",
	})
	if err != nil {
		t.Fatalf("CreateCheckoutSession failed: %v", err)
	}
	if result.Gateway != "mock" {
		t.Errorf("result.Gateway = %q, want %q", result.Gateway, "mock")
	}
	if result.SessionID == "" {
		t.Error("result.SessionID must not be empty")
	}

	// Test GetSubscription.
	sub, err := g.GetSubscription(context.Background(), "sub_mock")
	if err != nil {
		t.Fatalf("GetSubscription failed: %v", err)
	}
	if sub.Status != "active" {
		t.Errorf("sub.Status = %q, want %q", sub.Status, "active")
	}

	// Test CancelSubscription.
	if err := g.CancelSubscription(context.Background(), "sub_mock", false); err != nil {
		t.Fatalf("CancelSubscription failed: %v", err)
	}

	// Test CreateBillingPortalURL.
	portalURL, err := g.CreateBillingPortalURL(context.Background(), "cus_mock", "https://example.com/return")
	if err != nil {
		t.Fatalf("CreateBillingPortalURL failed: %v", err)
	}
	if portalURL != "https://example.com/return" {
		t.Errorf("portalURL = %q, want %q", portalURL, "https://example.com/return")
	}

	// Test HandleWebhook.
	event, err := g.HandleWebhook(context.Background(), []byte(`{}`), "sig")
	if err != nil {
		t.Fatalf("HandleWebhook failed: %v", err)
	}
	if event.Type != EventCheckoutCompleted {
		t.Errorf("event.Type = %q, want %q", event.Type, EventCheckoutCompleted)
	}
}

func TestMockGateway_FailRateBounds(t *testing.T) {
	g := NewMockGateway(slog.Default())

	// Set below 0 should clamp to 0.
	g.SetFailRate(-0.5)
	g.mu.RLock()
	if g.failRate != 0 {
		t.Errorf("failRate = %f, want 0.0", g.failRate)
	}
	g.mu.RUnlock()

	// Set above 1 should clamp to 1.
	g.SetFailRate(2.0)
	g.mu.RLock()
	if g.failRate != 1.0 {
		t.Errorf("failRate = %f, want 1.0", g.failRate)
	}
	g.mu.RUnlock()
}

func TestMockGateway_ListChargesContextCancel(t *testing.T) {
	g := NewMockGateway(slog.Default())

	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	_, err := g.ListCharges(ctx, "cus_123")
	if err == nil {
		t.Fatal("expected error from cancelled context")
	}
}

func TestMockGateway_EmptyLogger(t *testing.T) {
	// Should not panic with nil logger.
	g := NewMockGateway(nil)
	g.SetFailRate(0.0)
	g.SetDelay(1 * time.Millisecond)

	_, err := g.Charge(context.Background(), "cus_no_logger", 5.00, "EUR", "Test with nil logger")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
}