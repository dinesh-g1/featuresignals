package dto

import "time"

type CheckoutResponse struct {
	Gateway     string `json:"gateway"`
	RedirectURL string `json:"redirect_url,omitempty"`

	// PayU-specific fields (populated from GatewayData)
	PayUURL     string `json:"payu_url,omitempty"`
	Key         string `json:"key,omitempty"`
	Txnid       string `json:"txnid,omitempty"`
	Amount      string `json:"amount,omitempty"`
	Productinfo string `json:"productinfo,omitempty"`
	Firstname   string `json:"firstname,omitempty"`
	Email       string `json:"email,omitempty"`
	Surl        string `json:"surl,omitempty"`
	Furl        string `json:"furl,omitempty"`
	Hash        string `json:"hash,omitempty"`
	Phone       string `json:"phone,omitempty"`
}

// CreditBalanceInfo holds a single cost bearer's balance for an org.
type CreditBalanceInfo struct {
	BearerID         string `json:"bearer_id"`
	BearerName       string `json:"bearer_name,omitempty"`
	Balance          int    `json:"balance"`
	IncludedPerMonth int    `json:"included_per_month"`
	LifetimeUsed     int    `json:"lifetime_used"`
}

// CreditUsageInfo holds usage data for a cost bearer in the usage endpoint.
type CreditUsageInfo struct {
	BearerID          string `json:"bearer_id"`
	BearerName        string `json:"bearer_name"`
	IncludedPerMonth  int    `json:"included_per_month"`
	UsedThisMonth     int    `json:"used_this_month"`
	PurchasedBalance  int    `json:"purchased_balance"`
}

type SubscriptionResponse struct {
	Plan               string              `json:"plan"`
	SeatsLimit         int                 `json:"seats_limit"`
	ProjectsLimit      int                 `json:"projects_limit"`
	EnvironmentsLimit  int                 `json:"environments_limit"`
	Gateway            string              `json:"gateway"`
	Status             string              `json:"status"`
	CurrentPeriodStart *time.Time          `json:"current_period_start,omitempty"`
	CurrentPeriodEnd   *time.Time          `json:"current_period_end,omitempty"`
	CancelAtPeriodEnd  bool                `json:"cancel_at_period_end"`
	CanManage          bool                `json:"can_manage"`
	SeatsUsed          int                 `json:"seats_used"`
	ProjectsUsed       int                 `json:"projects_used"`
	PlatformFeeMonthly int64               `json:"platform_fee_monthly,omitempty"` // paise
	PlatformFeeCurrency string             `json:"platform_fee_currency,omitempty"`
	CreditBalances     []CreditBalanceInfo `json:"credit_balances,omitempty"`
}

type UsageResponse struct {
	SeatsUsed         int               `json:"seats_used"`
	SeatsLimit        int               `json:"seats_limit"`
	ProjectsUsed      int               `json:"projects_used"`
	ProjectsLimit     int               `json:"projects_limit"`
	EnvironmentsUsed  int               `json:"environments_used"`
	EnvironmentsLimit int               `json:"environments_limit"`
	Plan               string            `json:"plan"`
	PlatformFeeMonthly int64             `json:"platform_fee_monthly,omitempty"`
	CreditUsage        []CreditUsageInfo `json:"credit_usage,omitempty"`
}

type CancelResponse struct {
	Status string `json:"status"`
}

type PortalResponse struct {
	URL string `json:"url"`
}

type GatewayResponse struct {
	Gateway string `json:"gateway"`
}

type WebhookStatusResponse struct {
	Status string `json:"status"`
}
