package payment

import (
	"context"
	"fmt"
	"log/slog"
	"math/rand"
	"sync"
	"time"
)

// MockGateway implements a fake payment gateway for development/testing.
// It stores charges in memory and can simulate failures for testing.
type MockGateway struct {
	mu       sync.RWMutex
	charges  []*MockCharge
	failRate float64 // 0.0 = never fail, 1.0 = always fail
	delay    time.Duration // simulated processing delay
	logger   *slog.Logger
}

// MockCharge represents a simulated payment charge.
type MockCharge struct {
	ID          string            `json:"id"`
	Amount      float64           `json:"amount"`
	Currency    string            `json:"currency"`
	Description string            `json:"description"`
	Status      string            `json:"status"` // "succeeded", "failed", "pending"
	CreatedAt   time.Time         `json:"created_at"`
	Metadata    map[string]string `json:"metadata,omitempty"`
}

// NewMockGateway creates a new MockGateway with sensible development defaults:
//   - 10% simulated failure rate
//   - 100ms simulated processing delay
//   - No stored charges
func NewMockGateway(logger *slog.Logger) *MockGateway {
	if logger == nil {
		logger = slog.New(slog.DiscardHandler)
	}
	return &MockGateway{
		charges:  []*MockCharge{},
		failRate: 0.1, // 10% failure rate by default
		delay:    100 * time.Millisecond,
		logger:   logger,
	}
}

// Name returns the gateway identifier.
func (g *MockGateway) Name() string {
	return "mock"
}

// SetFailRate configures the simulated failure rate (0.0 to 1.0).
// A rate of 0.0 means no failures, 1.0 means every charge fails.
func (g *MockGateway) SetFailRate(rate float64) {
	g.mu.Lock()
	defer g.mu.Unlock()
	if rate < 0 {
		rate = 0
	}
	if rate > 1 {
		rate = 1
	}
	g.failRate = rate
}

// SetDelay configures the simulated processing delay.
func (g *MockGateway) SetDelay(d time.Duration) {
	g.mu.Lock()
	defer g.mu.Unlock()
	g.delay = d
}

// Charge simulates charging a customer. It waits for the configured delay,
// then either succeeds or fails based on the failRate.
func (g *MockGateway) Charge(ctx context.Context, customerID string, amount float64, currency string, desc string) (*MockCharge, error) {
	// Simulate processing delay with context cancellation support.
	g.mu.RLock()
	delay := g.delay
	failRate := g.failRate
	g.mu.RUnlock()

	select {
	case <-time.After(delay):
	case <-ctx.Done():
		return nil, ctx.Err()
	}

	g.mu.Lock()
	defer g.mu.Unlock()

	// Randomly fail based on failRate.
	if rand.Float64() < failRate {
		charge := &MockCharge{
			ID:        fmt.Sprintf("ch_failed_%d", time.Now().UnixNano()),
			Amount:    amount,
			Currency:  currency,
			Status:    "failed",
			CreatedAt: time.Now(),
			Metadata:  map[string]string{"customer_id": customerID, "reason": "simulated_failure"},
		}
		g.charges = append(g.charges, charge)
		return charge, fmt.Errorf("payment declined (simulated)")
	}

	charge := &MockCharge{
		ID:          fmt.Sprintf("ch_succeeded_%d", time.Now().UnixNano()),
		Amount:      amount,
		Currency:    currency,
		Description: desc,
		Status:      "succeeded",
		CreatedAt:   time.Now(),
		Metadata:    map[string]string{"customer_id": customerID},
	}
	g.charges = append(g.charges, charge)
	g.logger.Info("mock payment succeeded", "customer_id", customerID, "amount", amount, "currency", currency)
	return charge, nil
}

// ListCharges returns all mock charges. If customerID is non-empty, only
// charges for that customer are returned.
func (g *MockGateway) ListCharges(ctx context.Context, customerID string) ([]*MockCharge, error) {
	if ctx.Err() != nil {
		return nil, ctx.Err()
	}

	g.mu.RLock()
	defer g.mu.RUnlock()

	if customerID == "" {
		result := make([]*MockCharge, len(g.charges))
		copy(result, g.charges)
		return result, nil
	}

	var result []*MockCharge
	for _, c := range g.charges {
		if c.Metadata["customer_id"] == customerID {
			result = append(result, c)
		}
	}
	return result, nil
}

// CreateCheckoutSession implements the Gateway interface.
func (g *MockGateway) CreateCheckoutSession(ctx context.Context, req CheckoutRequest) (*CheckoutResult, error) {
	select {
	case <-time.After(g.delay):
	case <-ctx.Done():
		return nil, ctx.Err()
	}

	return &CheckoutResult{
		Gateway:     "mock",
		SessionID:   fmt.Sprintf("cs_mock_%d", time.Now().UnixNano()),
		RedirectURL: req.SuccessURL, // "redirect" immediately to success
	}, nil
}

// HandleWebhook implements the Gateway interface.
func (g *MockGateway) HandleWebhook(ctx context.Context, payload []byte, signature string) (*WebhookEvent, error) {
	return &WebhookEvent{
		Type:       EventCheckoutCompleted,
		Status:     "completed",
		GatewayEventID: fmt.Sprintf("evt_mock_%d", time.Now().UnixNano()),
	}, nil
}

// GetSubscription implements the Gateway interface.
func (g *MockGateway) GetSubscription(ctx context.Context, subscriptionID string) (*SubscriptionDetail, error) {
	return &SubscriptionDetail{
		ID:                 subscriptionID,
		CustomerID:         "cus_mock",
		Status:             "active",
		Plan:               "pro",
		CurrentPeriodStart: time.Now().AddDate(0, -1, 0),
		CurrentPeriodEnd:   time.Now(),
		CancelAtPeriodEnd:  false,
	}, nil
}

// CancelSubscription implements the Gateway interface.
func (g *MockGateway) CancelSubscription(ctx context.Context, subscriptionID string, atPeriodEnd bool) error {
	g.logger.Info("mock subscription cancelled",
		"subscription_id", subscriptionID,
		"at_period_end", atPeriodEnd,
	)
	return nil
}

// CreateBillingPortalURL implements the Gateway interface.
func (g *MockGateway) CreateBillingPortalURL(ctx context.Context, customerID, returnURL string) (string, error) {
	return returnURL, nil
}