package domain

import "time"

type Subscription struct {
	ID                 string    `json:"id"`
	OrgID              string    `json:"org_id"`
	PayUTxnID          string    `json:"payu_txnid" db:"payu_txnid"`
	PayUMihpayID       string    `json:"payu_mihpayid" db:"payu_mihpayid"`
	Plan               string    `json:"plan"`
	Status             string    `json:"status"`
	CurrentPeriodStart time.Time `json:"current_period_start"`
	CurrentPeriodEnd   time.Time `json:"current_period_end"`
	CancelAtPeriodEnd  bool      `json:"cancel_at_period_end"`
	CreatedAt          time.Time `json:"created_at"`
	UpdatedAt          time.Time `json:"updated_at"`
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
	if p, ok := Pricing.Plans[PlanFree]; ok {
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

var PlanDefaults = GetPlanDefaults()
