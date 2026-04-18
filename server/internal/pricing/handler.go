package pricing

import (
	"net/http"
	"strconv"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// RegionPricingResponse is the public API response for per-region pricing.
type RegionPricingResponse struct {
	Regions    map[string]RegionCosts      `json:"region_costs"`
	Breakdowns map[string]PricingBreakdown `json:"breakdowns"`
}

// HandleRegionPricing returns per-region infrastructure costs and pricing breakdowns.
// Query params: ?customers=100 (default 100)
func HandleRegionPricing(w http.ResponseWriter, r *http.Request) {
	customerCount := 100
	if q := r.URL.Query().Get("customers"); q != "" {
		if n, err := strconv.Atoi(q); err == nil && n > 0 {
			customerCount = n
		}
	}

	pricingCfg, err := domain.Pricing()
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "pricing config unavailable")
		return
	}

	proPlan, ok := pricingCfg.Plans[domain.PlanPro]
	actualPrice := 999.0
	if ok && proPlan.Price != nil {
		actualPrice = *proPlan.Price
	}

	breakdowns := make(map[string]PricingBreakdown, len(DefaultRegionCosts))
	for region := range DefaultRegionCosts {
		breakdowns[region] = CalculateBreakdown(region, customerCount, actualPrice)
	}

	httputil.JSON(w, http.StatusOK, RegionPricingResponse{
		Regions:    DefaultRegionCosts,
		Breakdowns: breakdowns,
	})
}
