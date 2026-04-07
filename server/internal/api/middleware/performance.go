package middleware

import (
	"net/http"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/httputil"
)

// PerformanceBudget returns middleware that logs a warning when a request
// exceeds the configured duration budget. The evaluation hot path (/v1/evaluate,
// /v1/client/) uses a tighter budget than management endpoints.
func PerformanceBudget(evalBudget, mgmtBudget time.Duration) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			next.ServeHTTP(w, r)
			elapsed := time.Since(start)

			budget := mgmtBudget
			path := r.URL.Path
			if strings.HasPrefix(path, "/v1/evaluate") || strings.HasPrefix(path, "/v1/client/") {
				budget = evalBudget
			}

			if elapsed > budget {
				logger := httputil.LoggerFromContext(r.Context())
				logger.Warn("request exceeded performance budget",
					"path", path,
					"method", r.Method,
					"duration_ms", elapsed.Milliseconds(),
					"budget_ms", budget.Milliseconds(),
					"exceeded_by_ms", (elapsed - budget).Milliseconds(),
				)
			}
		})
	}
}
