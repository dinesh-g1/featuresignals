package middleware

import (
	"context"
	"errors"
	"net/http"
	"strings"

	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/golang-jwt/jwt/v5"
)

// contextKey is an unexported type used for context keys to avoid collisions.
type contextKey string

const (
	// UserIDKey is the context key for the authenticated user's ID.
	UserIDKey contextKey = "user_id"
	// UserRoleKey is the context key for the authenticated user's role.
	UserRoleKey contextKey = "user_role"
	// UserEmailKey is the context key for the authenticated user's email.
	UserEmailKey contextKey = "user_email"
	// UserNameKey is the context key for the authenticated user's name.
	UserNameKey contextKey = "user_name"
)

// Claims represents the JWT claims for the ops portal.
type Claims struct {
	UserID string `json:"user_id"`
	Email  string `json:"email"`
	Name   string `json:"name"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

// TokenValidator validates JWT tokens and returns claims.
type TokenValidator interface {
	ValidateToken(tokenString string) (*Claims, error)
}

// JWTAuth returns middleware that validates JWT tokens from httpOnly cookies.
// The token is expected in a cookie named "jwt".
func JWTAuth(validator TokenValidator) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			// Allow OPTIONS preflight
			if r.Method == http.MethodOptions {
				next.ServeHTTP(w, r)
				return
			}

			// Try cookie first, then Authorization header as fallback
			tokenString := ""
			if c, err := r.Cookie("jwt"); err == nil {
				tokenString = c.Value
			}

			if tokenString == "" {
				header := r.Header.Get("Authorization")
				if header != "" {
					parts := strings.SplitN(header, " ", 2)
					if len(parts) == 2 && parts[0] == "Bearer" {
						tokenString = parts[1]
					}
				}
			}

			if tokenString == "" {
				http.Error(w, `{"error":"authentication required"}`, http.StatusUnauthorized)
				return
			}

			claims, err := validator.ValidateToken(tokenString)
			if err != nil {
				if errors.Is(err, jwt.ErrTokenExpired) {
					http.Error(w, `{"error":"token_expired"}`, http.StatusUnauthorized)
				} else {
					http.Error(w, `{"error":"invalid or expired token"}`, http.StatusUnauthorized)
				}
				return
			}

			ctx := context.WithValue(r.Context(), UserIDKey, claims.UserID)
			ctx = context.WithValue(ctx, UserRoleKey, claims.Role)
			ctx = context.WithValue(ctx, RoleKey, claims.Role)
			ctx = context.WithValue(ctx, UserEmailKey, claims.Email)
			ctx = context.WithValue(ctx, UserNameKey, claims.Name)

			next.ServeHTTP(w, r.WithContext(ctx))
		})
	}
}

// GetUserID extracts the authenticated user's ID from the request context.
func GetUserID(ctx context.Context) string {
	v, _ := ctx.Value(UserIDKey).(string)
	return v
}

// GetUserRole extracts the authenticated user's role from the request context.
func GetUserRole(ctx context.Context) string {
	v, _ := ctx.Value(UserRoleKey).(string)
	return v
}

// GetUserEmail extracts the authenticated user's email from the request context.
func GetUserEmail(ctx context.Context) string {
	v, _ := ctx.Value(UserEmailKey).(string)
	return v
}

// GetUserName extracts the authenticated user's name from the request context.
func GetUserName(ctx context.Context) string {
	v, _ := ctx.Value(UserNameKey).(string)
	return v
}

// AuditMiddleware logs every request to the audit store.
// This wraps the auth middleware and records the action.
func AuditMiddleware(auditStore domain.AuditStore) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			wrapped := &auditResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}
			next.ServeHTTP(wrapped, r)

			// Only log mutating methods
			if r.Method == http.MethodGet || r.Method == http.MethodHead || r.Method == http.MethodOptions {
				return
			}

			userID := GetUserID(r.Context())
			if userID == "" {
				return
			}

			action := strings.TrimPrefix(r.URL.Path, "/api/v1/")
			action = strings.ToLower(r.Method) + "." + strings.ReplaceAll(action, "/", ".")

			entry := &domain.AuditEntry{
				UserID: userID,
				Action: action,
				IP:     r.RemoteAddr,
			}

			if err := auditStore.Append(r.Context(), entry); err != nil {
				_ = err
			}
		})
	}
}

type auditResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (w *auditResponseWriter) WriteHeader(code int) {
	w.statusCode = code
	w.ResponseWriter.WriteHeader(code)
}
