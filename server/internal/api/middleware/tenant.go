package middleware

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"strings"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// contextKey is an unexported type for context value keys to prevent collisions.
type tenantContextKey string

const (
	tenantCtxKey tenantContextKey = "tenant_info"
)

// poolExecer is the narrowest interface the tenant middleware needs from the
// database pool. It avoids importing any concrete pgx types.
type poolExecer interface {
	Exec(ctx context.Context, sql string, arguments ...interface{}) (interface{}, error)
}

// TenantMiddleware extracts the API key from the request, resolves it to a
// tenant via TenantRegistry, sets the PostgreSQL search_path to the tenant's
// schema, and injects the tenant into the request context.
//
// Expected header order:
//  1. Authorization: Bearer <key>
//  2. X-API-Key: <key>
//
// Returns:
//   - 401 if the API key is missing or invalid
//   - 403 if the tenant is suspended
//   - 500 if schema switching fails (DB error)
func TenantMiddleware(registry domain.TenantRegistry, pool poolExecer) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Extract the raw API key from the request headers.
			apiKey := extractAPIKey(r)
			if apiKey == "" {
				httputil.Error(w, http.StatusUnauthorized, "missing API key")
				return
			}

			// SHA-256 hash the key and look up the tenant.
			hash := sha256Hex(apiKey)
			tenant, err := registry.LookupByKey(r.Context(), hash)
			if err != nil {
				if errors.Is(err, domain.ErrNotFound) {
					httputil.Error(w, http.StatusUnauthorized, "invalid API key")
					return
				}
				slog.Error("tenant lookup failed",
					"error", err,
					"key_prefix", safeKeyPrefix(apiKey),
				)
				httputil.Error(w, http.StatusInternalServerError, "internal error")
				return
			}

			// Reject suspended tenants.
			if tenant.Status == domain.TenantStatusSuspended {
				slog.Warn("request from suspended tenant",
					"tenant_id", tenant.ID,
					"tenant_slug", tenant.Slug,
				)
				httputil.Error(w, http.StatusForbidden, "tenant suspended")
				return
			}

			// Set the PostgreSQL search_path to the tenant's schema.
			// The "public" fallback ensures cross-schema references still work.
			setSchema := fmt.Sprintf("SET search_path TO %s, public", pqQuoteIdent(tenant.Schema))
			_, err = pool.Exec(r.Context(), setSchema)
			if err != nil {
				slog.Error("failed to set tenant schema",
					"error", err,
					"tenant_id", tenant.ID,
					"schema", tenant.Schema,
				)
				httputil.Error(w, http.StatusInternalServerError, "internal error")
				return
			}

			// Inject the tenant into the request context.
			ctx := context.WithValue(r.Context(), tenantCtxKey, tenant)

			// Add the request-scoped logger with tenant dimensions.
			logger := httputil.LoggerFromContext(ctx)
			ctx = httputil.ContextWithLogger(ctx, logger.With(
				"tenant_id", tenant.ID,
				"tenant_slug", tenant.Slug,
				"tenant_tier", tenant.Tier,
			))

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// TenantFromContext extracts the Tenant from the request context.
// Returns nil if the context does not carry a tenant (e.g. on public routes).
func TenantFromContext(ctx context.Context) *domain.Tenant {
	t, _ := ctx.Value(tenantCtxKey).(*domain.Tenant)
	return t
}

// extractAPIKey attempts to extract a bearer token from the Authorization
// header, falling back to the X-API-Key header. Returns empty string if
// neither header is present.
func extractAPIKey(r *http.Request) string {
	// Try Authorization: Bearer <key> first.
	auth := r.Header.Get("Authorization")
	if auth != "" {
		parts := strings.SplitN(auth, " ", 2)
		if len(parts) == 2 && strings.EqualFold(parts[0], "Bearer") {
			return strings.TrimSpace(parts[1])
		}
	}

	// Fallback to X-API-Key header.
	return strings.TrimSpace(r.Header.Get("X-API-Key"))
}

// sha256Hex returns the lowercase hex-encoded SHA-256 digest of the input.
func sha256Hex(data string) string {
	h := sha256.Sum256([]byte(data))
	return hex.EncodeToString(h[:])
}

// safeKeyPrefix returns the first 8 characters of a key for logging purposes.
// If the key is shorter than 8 characters, it returns the whole key.
// Never log full API keys.
func safeKeyPrefix(key string) string {
	if len(key) > 8 {
		return key[:8]
	}
	return key
}

// pqQuoteIdent safely quotes a PostgreSQL identifier to prevent SQL injection
// in schema names. Uses the same double-quote escaping as PostgreSQL's
// quote_ident() built-in.
func pqQuoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}