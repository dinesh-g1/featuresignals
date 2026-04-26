package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

var (
	ErrInvalidKeyFormat = &AuthError{"invalid API key format"}
	ErrInvalidSignature = &AuthError{"invalid API key signature"}
	ErrKeyExpired       = &AuthError{"API key expired"}
)

// AuthError represents an authentication error with a descriptive message.
type AuthError struct{ msg string }

func (e *AuthError) Error() string { return e.msg }

// TenantInfo contains the decoded tenant information from an API key.
type TenantInfo struct {
	TenantID  string    `json:"tid"`
	CellID    string    `json:"cid"`
	ExpiresAt time.Time `json:"exp"`
}

type tenantKey struct{}

// GetTenantInfo extracts the validated tenant info from the request context.
// Returns nil if the request is unauthenticated or not an eval endpoint.
func GetTenantInfo(ctx context.Context) *TenantInfo {
	info, _ := ctx.Value(tenantKey{}).(*TenantInfo)
	return info
}

// CellRouter routes evaluation requests to the correct cell based on tenant
// API key. For MVP (single cell), all traffic is handled locally. The API key
// is still validated to provide a consistent auth boundary.
type CellRouter struct {
	store     domain.CellStore
	cache     sync.Map // tenantID → cachedCell
	secretKey []byte   // HMAC key for API key signature validation
	logger    *slog.Logger
}

type cachedCell struct {
	url       string
	expiresAt time.Time
}

// NewCellRouter creates a new CellRouter with the given store and HMAC secret.
func NewCellRouter(store domain.CellStore, secretKey string, logger *slog.Logger) *CellRouter {
	return &CellRouter{
		store:     store,
		secretKey: []byte(secretKey),
		logger:    logger.With("middleware", "cell_router"),
	}
}

// validateAPIKey parses and validates a signed API key (format: fs_sk_{payload}.{signature}).
func (cr *CellRouter) validateAPIKey(key string) (*TenantInfo, error) {
	if !strings.HasPrefix(key, "fs_sk_") {
		return nil, ErrInvalidKeyFormat
	}
	parts := strings.SplitN(strings.TrimPrefix(key, "fs_sk_"), ".", 2)
	if len(parts) != 2 {
		return nil, ErrInvalidKeyFormat
	}
	payload, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return nil, ErrInvalidKeyFormat
	}
	// Verify HMAC-SHA256 signature
	mac := hmac.New(sha256.New, cr.secretKey)
	mac.Write(payload)
	expected := base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
	if !hmac.Equal([]byte(parts[1]), []byte(expected)) {
		return nil, ErrInvalidSignature
	}
	var info TenantInfo
	if err := json.Unmarshal(payload, &info); err != nil {
		return nil, ErrInvalidKeyFormat
	}
	if info.ExpiresAt.Before(time.Now()) {
		return nil, ErrKeyExpired
	}
	return &info, nil
}

// Middleware returns an HTTP handler that validates API keys on evaluation
// endpoints and routes to the correct cell. For single-cell MVP, all traffic
// passes through to the local instance after key validation.
func (cr *CellRouter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Only validate on evaluation paths
		if !isEvalPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		// Extract API key from request
		apiKey := extractAPIKey(r)
		if apiKey == "" {
			w.Header().Set("WWW-Authenticate", `Bearer realm=api.featuresignals.com`)
			http.Error(w, `{"error":"missing API key"}`, http.StatusUnauthorized)
			return
		}

		// Validate the API key
		info, err := cr.validateAPIKey(apiKey)
		if err != nil {
			cr.logger.Warn("API key validation failed", "error", err)
			w.Header().Set("WWW-Authenticate", `Bearer realm=api.featuresignals.com`)
			http.Error(w, `{"error":"invalid API key"}`, http.StatusUnauthorized)
			return
		}

		// For MVP, all tenants are local. Pass tenant info in context.
		// Future: look up cell from TenantInfo, proxy if remote:
		//
		// cached, ok := cr.cache.Load(info.TenantID)
		// if ok {
		//     cell := cached.(cachedCell)
		//     if time.Now().Before(cell.expiresAt) && cell.url != "" {
		//         remoteURL, _ := url.Parse("http://" + cell.url + ":8081")
		//         proxy := httputil.NewSingleHostReverseProxy(remoteURL)
		//         proxy.ServeHTTP(w, r)
		//         return
		//     }
		// }

		ctx := context.WithValue(r.Context(), tenantKey{}, info)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

func isEvalPath(path string) bool {
	return strings.HasPrefix(path, "/v1/evaluate") ||
		strings.HasPrefix(path, "/v1/client/")
}

