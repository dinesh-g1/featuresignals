package middleware

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/base64"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
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
	Region    string    `json:"rgn"`
	ExpiresAt time.Time `json:"exp"`
}

type tenantKey struct{}

// GetTenantInfo extracts the validated tenant info from the request context.
func GetTenantInfo(ctx context.Context) *TenantInfo {
	info, _ := ctx.Value(tenantKey{}).(*TenantInfo)
	return info
}

// CellRouter routes evaluation requests to the correct cell based on tenant
// API key. It validates the key, looks up the target cell, and reverse-proxies
// the request if the cell is remote (not the current instance).
type CellRouter struct {
	store       domain.CellStore
	tenantReg   domain.TenantRegionStore
	cache       sync.Map // cellID → cachedCell
	secretKey   []byte   // HMAC key for API key signature validation
	logger      *slog.Logger
}

type cachedCell struct {
	url       string
	expiresAt time.Time
}

// NewCellRouter creates a new CellRouter.
// If tenantReg is nil, the router will pass all traffic through locally (single-cell mode).
func NewCellRouter(store domain.CellStore, tenantReg domain.TenantRegionStore, secretKey string, logger *slog.Logger) *CellRouter {
	return &CellRouter{
		store:     store,
		tenantReg: tenantReg,
		secretKey: []byte(secretKey),
		logger:    logger.With("middleware", "cell_router"),
	}
}

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

// getCellURL returns the URL for a cell, using cache if available.
func (cr *CellRouter) getCellURL(ctx context.Context, cellID string) (string, error) {
	// Check cache first
	if cached, ok := cr.cache.Load(cellID); ok {
		cell := cached.(cachedCell)
		if time.Now().Before(cell.expiresAt) {
			return cell.url, nil
		}
	}

	// Look up from store
	cell, err := cr.store.GetCell(ctx, cellID)
	if err != nil {
		return "", err
	}

	cellURL := ""
	if cell.PublicIP != "" {
		cellURL = "http://" + cell.PublicIP + ":8080"
	}

	// Cache for 30 seconds
	cr.cache.Store(cellID, cachedCell{
		url:       cellURL,
		expiresAt: time.Now().Add(30 * time.Second),
	})

	return cellURL, nil
}

// isLocalRequest checks if the request is destined for the current instance.
func (cr *CellRouter) isLocalRequest(cellURL string) bool {
	return cellURL == "" || strings.Contains(cellURL, "localhost") || strings.Contains(cellURL, "127.0.0.1")
}

// Middleware returns an HTTP handler that validates API keys on evaluation
// endpoints and routes to the correct cell. Cross-cell/region access returns 404.
func (cr *CellRouter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if !isEvalPath(r.URL.Path) {
			next.ServeHTTP(w, r)
			return
		}

		apiKey := extractAPIKey(r)
		if apiKey == "" {
			w.Header().Set("WWW-Authenticate", `Bearer realm=api.featuresignals.com`)
			http.Error(w, `{"error":"missing API key"}`, http.StatusUnauthorized)
			return
		}

		info, err := cr.validateAPIKey(apiKey)
		if err != nil {
			cr.logger.Warn("API key validation failed", "error", err)
			w.Header().Set("WWW-Authenticate", `Bearer realm=api.featuresignals.com`)
			http.Error(w, `{"error":"invalid API key"}`, http.StatusUnauthorized)
			return
		}

		// Set X-Cell-Region response headers for debugging
		w.Header().Set("X-Cell-ID", info.CellID)
		w.Header().Set("X-Cell-Region", info.Region)
		w.Header().Set("X-Tenant-ID", info.TenantID)

		// Look up cell URL
		cellURL, err := cr.getCellURL(r.Context(), info.CellID)
		if err != nil {
			cr.logger.Error("failed to look up cell", "error", err, "cell_id", info.CellID)
			// Fail closed: return 404 to prevent enumeration
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}

		// If this is a local cell, pass through with tenant context
		if cr.isLocalRequest(cellURL) {
			ctx := context.WithValue(r.Context(), tenantKey{}, info)
			next.ServeHTTP(w, r.WithContext(ctx))
			return
		}

		// Proxy to the remote cell
		targetURL, err := url.Parse(cellURL)
		if err != nil {
			cr.logger.Error("invalid cell URL", "error", err, "cell_id", info.CellID, "url", cellURL)
			http.Error(w, `{"error":"not found"}`, http.StatusNotFound)
			return
		}

		proxy := httputil.NewSingleHostReverseProxy(targetURL)
		cr.logger.Info("proxying to cell",
			"tenant_id", info.TenantID,
			"cell_id", info.CellID,
			"region", info.Region,
			"target", cellURL,
		)

		// Add tenant info to proxied request headers
		r.Header.Set("X-Tenant-ID", info.TenantID)
		r.Header.Set("X-Cell-ID", info.CellID)

		proxy.ServeHTTP(w, r)
	})
}

func isEvalPath(path string) bool {
	return strings.HasPrefix(path, "/v1/evaluate") ||
		strings.HasPrefix(path, "/v1/client/") ||
		strings.HasPrefix(path, "/v1/stream/")
}

