package middleware

import (
	"net/http"
	"strings"

	"github.com/featuresignals/server/internal/httputil"
)

// RequireJSON rejects POST/PUT/PATCH requests that do not declare
// Content-Type: application/json. GET, DELETE, OPTIONS, and HEAD are
// passed through without inspection.
func RequireJSON(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch r.Method {
		case http.MethodPost, http.MethodPut, http.MethodPatch:
			ct := r.Header.Get("Content-Type")
			if ct == "" || !strings.HasPrefix(ct, "application/json") {
				httputil.Error(w, http.StatusUnsupportedMediaType, "Content-Type must be application/json")
				return
			}
		}
		next.ServeHTTP(w, r)
	})
}
