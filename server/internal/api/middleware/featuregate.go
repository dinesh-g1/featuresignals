package middleware

import (
	"net/http"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// FeatureGate returns middleware that blocks requests when the caller's
// organization plan does not include the specified feature. It must be placed
// after JWTAuth so the org_id claim is available in context.
//
// On rejection it returns 402 Payment Required with an upgrade hint. If the
// org cannot be loaded (e.g. transient DB error) the request is allowed
// through so that a backing-service hiccup does not lock out paying customers.
func FeatureGate(feature domain.Feature, orgReader domain.OrgReader) func(http.Handler) http.Handler {
	minPlan := domain.FeatureMinPlanName(feature)
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			orgID := GetOrgID(r.Context())
			if orgID == "" {
				next.ServeHTTP(w, r)
				return
			}

			org, err := orgReader.GetOrganization(r.Context(), orgID)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			if !domain.IsFeatureEnabled(org.Plan, feature) {
				httputil.Error(w, http.StatusPaymentRequired,
					"This feature requires the "+minPlan+" plan. Upgrade to unlock "+string(feature)+".")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
