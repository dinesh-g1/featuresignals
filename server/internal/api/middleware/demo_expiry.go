package middleware

import (
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/httputil"
)

// DemoExpiry blocks API requests from demo users whose demo period has expired.
// JWT claims carry demo=true and demo_expires_at; this middleware checks them
// and returns 403 with a convert URL so the client can redirect.
func DemoExpiry(demoConvertURL string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			if claims == nil || !claims.Demo {
				next.ServeHTTP(w, r)
				return
			}

			if claims.DemoExpiresAt > 0 && time.Now().Unix() > claims.DemoExpiresAt {
				httputil.JSON(w, http.StatusForbidden, map[string]string{
					"error":       "demo_expired",
					"message":     "Your demo session has expired. Register to continue using FeatureSignals.",
					"convert_url": demoConvertURL,
				})
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
