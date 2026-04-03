package domain

import (
	_ "embed"
	"encoding/json"
	"fmt"
)

//go:embed pricing.json
var pricingJSON []byte

type PricingConfig struct {
	Currency       string                  `json:"currency"`
	CurrencySymbol string                  `json:"currency_symbol"`
	Plans          map[string]PricingPlan  `json:"plans"`
	CommonFeatures []string                `json:"common_features"`
	SelfHosting    []SelfHostingEstimate   `json:"self_hosting"`
}

type PricingPlan struct {
	Name          string        `json:"name"`
	Tagline       string        `json:"tagline"`
	Price         *float64      `json:"price"`
	DisplayPrice  string        `json:"display_price"`
	BillingPeriod *string       `json:"billing_period"`
	Limits        PricingLimits `json:"limits"`
	Features      []string      `json:"features"`
	CTALabel      string        `json:"cta_label"`
	CTAURL        string        `json:"cta_url"`
}

type PricingLimits struct {
	Projects     int `json:"projects"`
	Environments int `json:"environments"`
	Seats        int `json:"seats"`
}

type SelfHostingEstimate struct {
	Tier        string `json:"tier"`
	Estimate    string `json:"estimate"`
	Description string `json:"description"`
}

var Pricing PricingConfig

func init() {
	if err := json.Unmarshal(pricingJSON, &Pricing); err != nil {
		panic("failed to parse embedded pricing.json: " + err.Error())
	}
}

func ProPlanAmount() string {
	if p, ok := Pricing.Plans[PlanPro]; ok && p.Price != nil {
		return fmt.Sprintf("%.2f", *p.Price)
	}
	return "999.00"
}

func ProPlanProductInfo() string {
	return "FeatureSignals Pro Plan"
}
