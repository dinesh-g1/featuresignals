package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/httputil"
)

type contextKey string

const (
	UserIDKey contextKey = "user_id"
	OrgIDKey  contextKey = "org_id"
	RoleKey   contextKey = "role"
	ClaimsKey contextKey = "claims"
)

// RevocationChecker checks whether a JWT has been revoked. Implementations
// should be fast (in-memory cache backed by DB) since this runs on every request.
type RevocationChecker interface {
	IsTokenRevoked(ctx context.Context, jti string) (bool, error)
}

func JWTAuth(jwtMgr auth.TokenManager, revoker ...RevocationChecker) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" {
				httputil.Error(w, http.StatusUnauthorized, "missing authorization header")
				return
			}

			parts := strings.SplitN(header, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				httputil.Error(w, http.StatusUnauthorized, "invalid authorization format")
				return
			}

			claims, err := jwtMgr.ValidateToken(parts[1])
			if err != nil {
				if errors.Is(err, auth.ErrTokenExpired) {
					httputil.Error(w, http.StatusUnauthorized, "token_expired")
				} else {
					httputil.Error(w, http.StatusUnauthorized, "invalid or expired token")
				}
				return
			}

			if claims.ID != "" && len(revoker) > 0 && revoker[0] != nil {
				if revoked, rErr := revoker[0].IsTokenRevoked(r.Context(), claims.ID); rErr == nil && revoked {
					httputil.Error(w, http.StatusUnauthorized, "token has been revoked")
					return
				}
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, OrgIDKey, claims.OrgID)
			ctx = context.WithValue(ctx, RoleKey, claims.Role)
			ctx = context.WithValue(ctx, ClaimsKey, claims)
			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

func GetUserID(ctx context.Context) string {
	v, _ := ctx.Value(UserIDKey).(string)
	return v
}

func GetOrgID(ctx context.Context) string {
	v, _ := ctx.Value(OrgIDKey).(string)
	return v
}

func GetRole(ctx context.Context) string {
	v, _ := ctx.Value(RoleKey).(string)
	return v
}

func GetClaims(ctx context.Context) *auth.Claims {
	v, _ := ctx.Value(ClaimsKey).(*auth.Claims)
	return v
}
