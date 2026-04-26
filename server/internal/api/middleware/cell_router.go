package middleware

import (
	"net/http"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// CellRouter optionally routes requests to the correct cell's API server.
// For MVP, this is a NOP passthrough. Future: extract tenant from API key,
// find their cell, proxy if remote.
type CellRouter struct {
	store domain.CellStore
	cache sync.Map // tenantID → cached entry
}

type cachedCell struct {
	url       string
	expiresAt time.Time
}

// NewCellRouter creates a new CellRouter middleware.
func NewCellRouter(store domain.CellStore) *CellRouter {
	return &CellRouter{store: store}
}

// Middleware returns an HTTP middleware that optionally routes to the
// correct cell. For MVP, it passes through to the local instance.
func (cr *CellRouter) Middleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// MVP: NOP — all requests handled locally
		// Future: extract API key from header, lookup tenant's cell,
		// proxy the request if the cell is remote
		next.ServeHTTP(w, r)
	})
}