package pricing

import (
	"net/http"

	"github.com/featuresignals/server/internal/httputil"
)

// HandleRegionPricing is deprecated — single-endpoint architecture.
// Returns 410 Gone.
func HandleRegionPricing(w http.ResponseWriter, r *http.Request) {
	httputil.Error(w, http.StatusGone, "region-specific pricing is deprecated")
}
