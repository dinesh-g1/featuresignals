package domain

import (
	_ "embed"
	"encoding/json"
	"fmt"
	"sync"
)

//go:embed pricing.json
var pricingJSON []byte

type PricingConfig struct {
	Currency       string                 `json:"currency"`
	CurrencySymbol string                 `json:"currency_symbol"`
	Plans          map[string]PricingPlan `json:"plans"`
	CommonFeatures []string               `json:"common_features"`
	SelfHosting    []SelfHostingEstimate  `json:"self_hosting"`
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

// pricingOnce ensures Pricing config is loaded exactly once (singleton).
var pricingOnce sync.Once
var pricingConfig PricingConfig
var pricingErr error

// LoadPricing loads the embedded pricing.json exactly once and returns the
// singleton PricingConfig. Subsequent calls return the cached instance.
func LoadPricing() (PricingConfig, error) {
	pricingOnce.Do(func() {
		pricingErr = json.Unmarshal(pricingJSON, &pricingConfig)
	})
	if pricingErr != nil {
		return PricingConfig{}, fmt.Errorf("failed to parse embedded pricing.json: %w", pricingErr)
	}
	return pricingConfig, nil
}

// MustLoadPricing loads the embedded pricing.json exactly once and panics on
// failure. Use during application initialization.
func MustLoadPricing() PricingConfig {
	cfg, err := LoadPricing()
	if err != nil {
		panic(err)
	}
	return cfg
}

// Pricing returns the singleton PricingConfig. Panics if not yet loaded.
// Prefer LoadPricing() or MustLoadPricing() during initialization.
func Pricing() PricingConfig {
	if pricingErr != nil {
		panic("pricing config not loaded or failed to parse: " + pricingErr.Error())
	}
	return pricingConfig
}

func ProPlanAmount() string {
	if p, ok := Pricing().Plans[PlanPro]; ok && p.Price != nil {
		return fmt.Sprintf("%.2f", *p.Price)
	}
	return "999.00"
}

func ProPlanProductInfo() string {
	return "FeatureSignals Pro Plan"
}
