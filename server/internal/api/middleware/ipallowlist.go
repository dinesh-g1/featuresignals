package middleware

import (
	"context"
	"net"
	"net/http"

	"github.com/featuresignals/server/internal/httputil"
)

// IPAllowlistReader loads CIDR ranges for an organization.
type IPAllowlistReader interface {
	GetIPAllowlist(ctx context.Context, orgID string) (enabled bool, cidrs []string, err error)
}

// IPAllowlist returns middleware that blocks requests from IP addresses not in
// the org's allowlist. Only applied to the management API; the evaluation API
// is excluded since it uses API key auth, not JWT.
//
// If the allowlist is disabled or cannot be loaded the request passes through.
func IPAllowlist(reader IPAllowlistReader) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			orgID := GetOrgID(r.Context())
			if orgID == "" {
				next.ServeHTTP(w, r)
				return
			}

			enabled, cidrs, err := reader.GetIPAllowlist(r.Context(), orgID)
			if err != nil || !enabled || len(cidrs) == 0 {
				next.ServeHTTP(w, r)
				return
			}

			clientIP := extractIP(r.RemoteAddr)
			ip := net.ParseIP(clientIP)
			if ip == nil {
				next.ServeHTTP(w, r)
				return
			}

			for _, cidr := range cidrs {
				_, network, err := net.ParseCIDR(cidr)
				if err != nil {
					continue
				}
				if network.Contains(ip) {
					next.ServeHTTP(w, r)
					return
				}
			}

			httputil.Error(w, http.StatusForbidden, "IP address not in allowlist")
		})
	}
}

func extractIP(addr string) string {
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		return addr
	}
	return host
}
