package middleware

import (
	"net/http"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// RequireRole returns middleware that enforces the caller has one of the
// specified roles. It must be placed after JWTAuth so the role claim is
// available in context.
func RequireRole(allowed ...domain.Role) func(http.Handler) http.Handler {
	set := make(map[domain.Role]struct{}, len(allowed))
	for _, r := range allowed {
		set[r] = struct{}{}
	}
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			role := domain.Role(GetRole(r.Context()))
			if _, ok := set[role]; !ok {
				httputil.Error(w, http.StatusForbidden, "insufficient permissions")
				return
			}
			next.ServeHTTP(w, r)
		})
	}
}
