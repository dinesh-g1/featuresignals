package middleware

import (
	"net/http"
	"strings"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// userEmailCtxKey is an unexported key type for context values per CLAUDE.md.
type userEmailCtxKey struct{}

var userEmailContextKey = userEmailCtxKey{}

// RequireDomain restricts access to users whose email ends with the given domain.
func RequireDomain(allowedDomain string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			claims := GetClaims(r.Context())
			if claims == nil {
				httputil.Error(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			email := claims.Email
			if email == "" {
				if e, ok := r.Context().Value(userEmailContextKey).(string); ok {
					email = e
				}
			}

			if email == "" {
				httputil.Error(w, http.StatusForbidden, "access restricted to authorized domain")
				return
			}

			lowerEmail := strings.ToLower(email)
			lowerDomain := "@" + strings.ToLower(allowedDomain)
			if !strings.HasSuffix(lowerEmail, lowerDomain) {
				httputil.Error(w, http.StatusForbidden, "access restricted to authorized domain")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}

// RequireOpsRole checks that the user has an ops_user entry with sufficient privilege.
func RequireOpsRole(minRole string, store domain.OpsStore) func(http.Handler) http.Handler {
	roleLevel := map[string]int{
		"finance":          1,
		"customer_success": 2,
		"demo_team":        3,
		"engineer":         4,
		"founder":          5,
	}

	minLevel := roleLevel[minRole]
	if minLevel == 0 {
		minLevel = 1
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			userID := GetUserID(r.Context())
			if userID == "" {
				httputil.Error(w, http.StatusUnauthorized, "unauthorized")
				return
			}

			opsUser, err := store.GetOpsUserByUserID(r.Context(), userID)
			if err != nil || opsUser == nil || !opsUser.IsActive {
				httputil.Error(w, http.StatusForbidden, "access denied")
				return
			}

			userLevel := roleLevel[opsUser.OpsRole]
			if userLevel < minLevel {
				httputil.Error(w, http.StatusForbidden, "insufficient permissions")
				return
			}

			next.ServeHTTP(w, r)
		})
	}
}
