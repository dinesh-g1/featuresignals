package pricing

import "math"

// RegionCosts represents per-region infrastructure costs in USD/month.
type RegionCosts struct {
	Region           string  `json:"region"`
	Provider         string  `json:"provider"`
	ComputeMonthly   float64 `json:"compute_monthly_usd"`
	DatabaseMonthly  float64 `json:"database_monthly_usd"`
	BackupsMonthly   float64 `json:"backups_monthly_usd"`
	BandwidthMonthly float64 `json:"bandwidth_monthly_usd"`
	TotalMonthly     float64 `json:"total_monthly_usd"`
}

// OperationalCosts represents fixed monthly operational costs in INR.
type OperationalCosts struct {
	ObservabilityINR    float64 `json:"observability_inr"`
	SoftwareLicensesINR float64 `json:"software_licenses_inr"`
	DeveloperSalaryINR  float64 `json:"developer_salary_inr"`
	OfficeINR           float64 `json:"office_inr"`
	MiscINR             float64 `json:"misc_inr"`
	TotalFixedINR       float64 `json:"total_fixed_inr"`
}

// PricingBreakdown provides a full cost breakdown for a pricing tier.
type PricingBreakdown struct {
	Region              string  `json:"region"`
	InfraCostINR        float64 `json:"infra_cost_inr"`
	PerCustomerCostINR  float64 `json:"per_customer_cost_inr"`
	OperationalShareINR float64 `json:"operational_share_inr"`
	PaymentGatewayINR   float64 `json:"payment_gateway_pct"`
	TaxPct              float64 `json:"tax_pct"`
	TargetMarginPct     float64 `json:"target_margin_pct"`
	SuggestedPriceINR   float64 `json:"suggested_price_inr"`
	ActualPriceINR      float64 `json:"actual_price_inr"`
	ActualMarginPct     float64 `json:"actual_margin_pct"`
}

// DefaultRegionCosts are pre-configured per the plan analysis.
var DefaultRegionCosts = map[string]RegionCosts{
	"us": {Region: "us", Provider: "Hetzner (Ashburn)", ComputeMonthly: 27.70, DatabaseMonthly: 15.22, BackupsMonthly: 8.60, BandwidthMonthly: 0, TotalMonthly: 51.52},
	"eu": {Region: "eu", Provider: "Hetzner (Falkenstein)", ComputeMonthly: 27.70, DatabaseMonthly: 15.22, BackupsMonthly: 8.60, BandwidthMonthly: 0, TotalMonthly: 51.52},
	"in": {Region: "in", Provider: "Utho (Mumbai)", ComputeMonthly: 22.00, DatabaseMonthly: 12.00, BackupsMonthly: 5.00, BandwidthMonthly: 3.00, TotalMonthly: 42.00},
}

// DefaultOperationalCosts are estimated fixed monthly costs.
var DefaultOperationalCosts = OperationalCosts{
	ObservabilityINR:    1750,  // SigNoz cloud base plan
	SoftwareLicensesINR: 2500,  // GitHub, misc tools
	DeveloperSalaryINR:  80000, // Allocated share for infra/SRE
	OfficeINR:           5000,  // Co-working / remote allowance
	MiscINR:             2000,  // Domain, email, misc
	TotalFixedINR:       91250,
}

// CalculateBreakdown computes a full cost breakdown for a given region and customer count.
func CalculateBreakdown(region string, customerCount int, actualPriceINR float64) PricingBreakdown {
	usdToINR := 84.0

	rc, ok := DefaultRegionCosts[region]
	if !ok {
		rc = DefaultRegionCosts["us"]
	}

	infraCostINR := rc.TotalMonthly * usdToINR
	perCustomerInfra := infraCostINR / math.Max(float64(customerCount), 1)

	opCosts := DefaultOperationalCosts
	operationalShare := opCosts.TotalFixedINR / math.Max(float64(customerCount), 1)

	// Payment gateway: ~2.5% (PayU India), ~3% (Stripe Global)
	gatewayPct := 0.025
	if region != "in" {
		gatewayPct = 0.03
	}

	taxPct := 0.18 // GST India / VAT EU
	targetMargin := 0.65

	totalCostPerCustomer := perCustomerInfra + operationalShare
	gatewayFee := actualPriceINR * gatewayPct
	netRevenue := actualPriceINR - gatewayFee
	taxAmount := netRevenue * taxPct
	netAfterTax := netRevenue - taxAmount
	actualMargin := 0.0
	if actualPriceINR > 0 {
		actualMargin = (netAfterTax - totalCostPerCustomer) / actualPriceINR
	}

	suggestedPrice := totalCostPerCustomer / (1 - targetMargin - gatewayPct - (1-gatewayPct)*taxPct)
	suggestedPrice = math.Ceil(suggestedPrice/10) * 10

	return PricingBreakdown{
		Region:              region,
		InfraCostINR:        math.Round(infraCostINR*100) / 100,
		PerCustomerCostINR:  math.Round(perCustomerInfra*100) / 100,
		OperationalShareINR: math.Round(operationalShare*100) / 100,
		PaymentGatewayINR:   gatewayPct,
		TaxPct:              taxPct,
		TargetMarginPct:     targetMargin,
		SuggestedPriceINR:   suggestedPrice,
		ActualPriceINR:      actualPriceINR,
		ActualMarginPct:     math.Round(actualMargin*1000) / 1000,
	}
}
