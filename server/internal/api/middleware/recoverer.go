package middleware

import (
	"net/http"
	"runtime/debug"

	"github.com/featuresignals/server/internal/httputil"
)

// SafeRecoverer catches panics and returns a generic 500 JSON error.
// The stack trace is logged server-side but never exposed to the client.
func SafeRecoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rvr := recover(); rvr != nil {
				log := httputil.LoggerFromContext(r.Context())
				log.Error("panic recovered",
					"panic", rvr,
					"stack", string(debug.Stack()),
					"method", r.Method,
					"path", r.URL.Path,
				)
				httputil.Error(w, http.StatusInternalServerError, "internal server error")
			}
		}()
		next.ServeHTTP(w, r)
	})
}
