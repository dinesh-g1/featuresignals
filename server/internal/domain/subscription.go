package domain

import (
	"encoding/json"
	"sync"
	"time"
)

// Payment gateway constants.
const (
	GatewayPayU   = "payu"
	GatewayStripe = "stripe"
)

type Subscription struct {
	ID                 string    `json:"id"`
	OrgID              string    `json:"org_id"`
	GatewayProvider    string    `json:"gateway_provider"`
	Plan               string    `json:"plan"`
	Status             string    `json:"status"`
	CurrentPeriodStart time.Time `json:"current_period_start"`
	CurrentPeriodEnd   time.Time `json:"current_period_end"`
	CancelAtPeriodEnd  bool      `json:"cancel_at_period_end"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`

	// PayU-specific fields
	PayUTxnID    string `json:"payu_txnid,omitempty" db:"payu_txnid"`
	PayUMihpayID string `json:"payu_mihpayid,omitempty" db:"payu_mihpayid"`

	// Stripe-specific fields
	StripeCustomerID      string `json:"stripe_customer_id,omitempty" db:"stripe_customer_id"`
	StripeSubscriptionID  string `json:"stripe_subscription_id,omitempty" db:"stripe_subscription_id"`
	StripePaymentIntentID string `json:"stripe_payment_intent_id,omitempty" db:"stripe_payment_intent_id"`
}

// PaymentEvent records a payment provider webhook or callback for idempotency and audit.
type PaymentEvent struct {
	ID              string          `json:"id"`
	OrgID           string          `json:"org_id"`
	GatewayProvider string          `json:"gateway_provider"`
	EventType       string          `json:"event_type"`
	EventID         string          `json:"event_id"`
	Payload         json.RawMessage `json:"payload"`
	Processed       bool            `json:"processed"`
	CreatedAt       time.Time       `json:"created_at"`
}

type UsageMetric struct {
	ID          string    `json:"id"`
	OrgID       string    `json:"org_id"`
	MetricName  string    `json:"metric_name"`
	Value       int64     `json:"value"`
	PeriodStart time.Time `json:"period_start"`
	PeriodEnd   time.Time `json:"period_end"`
	CreatedAt   time.Time `json:"created_at"`
}

type OnboardingState struct {
	OrgID             string     `json:"org_id"`
	PlanSelected      bool       `json:"plan_selected"`
	FirstFlagCreated  bool       `json:"first_flag_created"`
	FirstSDKConnected bool       `json:"first_sdk_connected"`
	FirstEvaluation   bool       `json:"first_evaluation"`
	TourCompleted     bool       `json:"tour_completed"`
	Completed         bool       `json:"completed"`
	CompletedAt       *time.Time `json:"completed_at,omitempty"`
	UpdatedAt         time.Time  `json:"updated_at"`
}

// Plan tier constants
const (
	PlanTrial      = "trial"
	PlanFree       = "free"
	PlanPro        = "pro"
	PlanEnterprise = "enterprise"
)

// PlanLimits holds the resource caps for a given plan tier.
// A value of -1 means unlimited.
type PlanLimits struct {
	Seats        int
	Projects     int
	Environments int
}

func GetPlanDefaults() map[string]PlanLimits {
	defaults := map[string]PlanLimits{
		PlanTrial:      {Seats: -1, Projects: -1, Environments: -1}, // same as Pro during trial
		PlanPro:        {Seats: -1, Projects: -1, Environments: -1},
		PlanEnterprise: {Seats: -1, Projects: -1, Environments: -1},
	}
	if p, ok := Pricing().Plans[PlanFree]; ok {
		defaults[PlanFree] = PlanLimits{
			Seats:        p.Limits.Seats,
			Projects:     p.Limits.Projects,
			Environments: p.Limits.Environments,
		}
	} else {
		defaults[PlanFree] = PlanLimits{Seats: 3, Projects: 1, Environments: 3}
	}
	return defaults
}

// planDefaults caches the plan defaults singleton. Loaded on first access.
var planDefaults map[string]PlanLimits
var planDefaultsOnce sync.Once

// PlanDefaults returns the singleton plan defaults. Computed once on first access.
func PlanDefaults() map[string]PlanLimits {
	planDefaultsOnce.Do(func() {
		planDefaults = GetPlanDefaults()
	})
	return planDefaults
}

// DunningGraceDays is how long a subscription can remain past_due before
// the system automatically downgrades the org to the Free plan. Stripe
// handles its own retry schedule; this is a safety net.
const DunningGraceDays = 14
