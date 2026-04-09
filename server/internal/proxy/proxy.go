package proxy

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/http/httputil"
	"net/url"
	"strings"

	"github.com/featuresignals/server/internal/api/middleware"
	fshttp "github.com/featuresignals/server/internal/httputil"
)

// newRegionProxy creates a reverse proxy to the target URL that correctly
// rewrites the Host header. httputil.NewSingleHostReverseProxy only sets
// req.URL.Host, leaving req.Host (and therefore the outgoing Host header)
// set to the original request's host. Remote Caddy instances reject
// requests whose Host doesn't match their configured server block.
func newRegionProxy(target *url.URL) *httputil.ReverseProxy {
	rp := httputil.NewSingleHostReverseProxy(target)
	base := rp.Director
	rp.Director = func(req *http.Request) {
		base(req)
		req.Host = target.Host
	}
	return rp
}

// RegionRouter is middleware that proxies authenticated requests to the
// correct regional API server when the JWT's data_region claim doesn't
// match the local region. Unauthenticated routes pass through unchanged.
func RegionRouter(localRegion string, endpoints map[string]string, logger *slog.Logger) func(http.Handler) http.Handler {
	proxies := make(map[string]*httputil.ReverseProxy, len(endpoints))
	for region, endpoint := range endpoints {
		target, err := url.Parse(endpoint)
		if err != nil {
			logger.Error("invalid region endpoint URL", "region", region, "url", endpoint, "error", err)
			continue
		}
		rp := newRegionProxy(target)
		rp.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
			log := fshttp.LoggerFromContext(r.Context())
			log.Error("region proxy failed", "error", err, "target_region", region)
			fshttp.Error(w, http.StatusBadGateway, "regional service unavailable")
		}
		proxies[region] = rp
		logger.Info("region proxy configured", "region", region, "endpoint", endpoint)
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			dataRegion := middleware.GetDataRegion(r.Context())

			if dataRegion == "" || dataRegion == localRegion {
				next.ServeHTTP(w, r)
				return
			}

			rp, ok := proxies[dataRegion]
			if !ok {
				next.ServeHTTP(w, r)
				return
			}

			rp.ServeHTTP(w, r)
		})
	}
}

// MultiRegionLogin attempts login against the local server first, buffering
// the response. If the local result is 401/403, the request is proxied to
// each remote region until one succeeds. The request body is buffered so it
// can be replayed for remote attempts.
func MultiRegionLogin(localHandler http.Handler, localRegion string, endpoints map[string]string, logger *slog.Logger) http.Handler {
	type regionProxy struct {
		region string
		proxy  *httputil.ReverseProxy
	}

	var remoteRegions []regionProxy
	for region, endpoint := range endpoints {
		if region == localRegion {
			continue
		}
		target, err := url.Parse(endpoint)
		if err != nil {
			continue
		}
		rp := newRegionProxy(target)
		rp.ErrorHandler = func(w http.ResponseWriter, r *http.Request, err error) {
			log := fshttp.LoggerFromContext(r.Context())
			log.Error("region login proxy failed", "error", err, "target_region", region)
			fshttp.Error(w, http.StatusBadGateway, "regional service unavailable")
		}
		remoteRegions = append(remoteRegions, regionProxy{region: region, proxy: rp})
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			fshttp.Error(w, http.StatusBadRequest, "failed to read request body")
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(body))

		rec := httptest.NewRecorder()
		localHandler.ServeHTTP(rec, r)

		if rec.Code > 0 && rec.Code < 400 {
			copyRecorderToResponse(w, rec)
			return
		}

		if rec.Code == 401 || rec.Code == 403 {
			for _, rr := range remoteRegions {
				logger.Info("trying regional login", "region", rr.region)
				r.Body = io.NopCloser(bytes.NewReader(body))
				rr.proxy.ServeHTTP(w, r)
				return
			}
		}

		copyRecorderToResponse(w, rec)
	})
}

func copyRecorderToResponse(w http.ResponseWriter, rec *httptest.ResponseRecorder) {
	for k, vs := range rec.Header() {
		for _, v := range vs {
			w.Header().Add(k, v)
		}
	}
	w.WriteHeader(rec.Code)
	w.Write(rec.Body.Bytes()) //nolint:errcheck
}

// TargetRegionProxy routes requests to a specific region based on the
// X-Target-Region request header. If the header is absent or matches the
// local region, the request is handled locally. Used for all signup
// endpoints so that pending registrations, OTP verification, and account
// creation all happen in the same regional database.
func TargetRegionProxy(localHandler http.Handler, localRegion string, endpoints map[string]string, logger *slog.Logger) http.Handler {
	proxies := make(map[string]*httputil.ReverseProxy, len(endpoints))
	for region, endpoint := range endpoints {
		if region == localRegion {
			continue
		}
		target, err := url.Parse(endpoint)
		if err != nil {
			continue
		}
		rp := newRegionProxy(target)
		rp.ErrorHandler = func(w http.ResponseWriter, r *http.Request, proxyErr error) {
			log := fshttp.LoggerFromContext(r.Context())
			log.Error("region signup proxy failed", "error", proxyErr, "target_region", region)
			fshttp.Error(w, http.StatusBadGateway, "regional service unavailable")
		}
		proxies[region] = rp
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		targetRegion := r.Header.Get("X-Target-Region")
		if targetRegion == "" || targetRegion == localRegion {
			localHandler.ServeHTTP(w, r)
			return
		}

		rp, ok := proxies[targetRegion]
		if !ok {
			localHandler.ServeHTTP(w, r)
			return
		}

		logger.Info("proxying signup request to region", "region", targetRegion, "path", r.URL.Path)
		rp.ServeHTTP(w, r)
	})
}

// StripPrefix is a helper for proxy targets that don't expect a prefix.
func StripPrefix(prefix string, h http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.URL.Path = strings.TrimPrefix(r.URL.Path, prefix)
		h.ServeHTTP(w, r)
	})
}

// peekJWTRegion extracts the data_region claim from a JWT by base64-decoding
// the payload section without cryptographic validation. This is intentionally
// lightweight: the regional server performs full validation when the request
// arrives. Returns "" if the token cannot be decoded or has no region claim.
func peekJWTRegion(tokenStr string) string {
	parts := strings.SplitN(tokenStr, ".", 3)
	if len(parts) < 2 {
		return ""
	}

	payload, err := base64.RawURLEncoding.DecodeString(parts[1])
	if err != nil {
		return ""
	}

	var claims struct {
		DataRegion string `json:"data_region"`
	}
	if err := json.Unmarshal(payload, &claims); err != nil {
		return ""
	}
	return claims.DataRegion
}

// AuthRegionRouter is middleware for the global router that intercepts
// authenticated requests and proxies them to the correct regional server
// BEFORE local JWT validation runs. This is critical because tokens issued
// by a regional server may be signed with that region's secret — only the
// issuing region can validate them.
//
// Placement: AuthRegionRouter must be applied BEFORE JWTAuth middleware.
// For requests targeting the local region (or with no/unparseable token),
// it falls through to the next handler which performs normal JWT validation.
func AuthRegionRouter(localRegion string, endpoints map[string]string, logger *slog.Logger) func(http.Handler) http.Handler {
	proxies := make(map[string]*httputil.ReverseProxy, len(endpoints))
	for region, endpoint := range endpoints {
		if region == localRegion {
			continue
		}
		target, err := url.Parse(endpoint)
		if err != nil {
			logger.Error("invalid region endpoint URL", "region", region, "url", endpoint, "error", err)
			continue
		}
		rp := newRegionProxy(target)
		rp.ErrorHandler = func(w http.ResponseWriter, r *http.Request, proxyErr error) {
			log := fshttp.LoggerFromContext(r.Context())
			log.Error("auth region proxy failed", "error", proxyErr, "target_region", region)
			fshttp.Error(w, http.StatusBadGateway, "regional service unavailable")
		}
		proxies[region] = rp
		logger.Info("auth region proxy configured", "region", region, "endpoint", endpoint)
	}

	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			header := r.Header.Get("Authorization")
			if header == "" {
				next.ServeHTTP(w, r)
				return
			}

			parts := strings.SplitN(header, " ", 2)
			if len(parts) != 2 || parts[0] != "Bearer" {
				next.ServeHTTP(w, r)
				return
			}

			dataRegion := peekJWTRegion(parts[1])
			if dataRegion == "" || dataRegion == localRegion {
				next.ServeHTTP(w, r)
				return
			}

			rp, ok := proxies[dataRegion]
			if !ok {
				next.ServeHTTP(w, r)
				return
			}

			rp.ServeHTTP(w, r)
		})
	}
}

// RefreshRegionProxy wraps the /auth/refresh endpoint for the global router.
// It reads the refresh_token from the request body, peeks at the data_region
// claim, and proxies to the correct regional server if the region is remote.
// This ensures the refresh handler runs against the correct regional DB and
// validates the token with the correct signing secret.
func RefreshRegionProxy(localHandler http.Handler, localRegion string, endpoints map[string]string, logger *slog.Logger) http.Handler {
	proxies := make(map[string]*httputil.ReverseProxy, len(endpoints))
	for region, endpoint := range endpoints {
		if region == localRegion {
			continue
		}
		target, err := url.Parse(endpoint)
		if err != nil {
			continue
		}
		rp := newRegionProxy(target)
		rp.ErrorHandler = func(w http.ResponseWriter, r *http.Request, proxyErr error) {
			log := fshttp.LoggerFromContext(r.Context())
			log.Error("refresh region proxy failed", "error", proxyErr, "target_region", region)
			fshttp.Error(w, http.StatusBadGateway, "regional service unavailable")
		}
		proxies[region] = rp
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		body, err := io.ReadAll(r.Body)
		if err != nil {
			fshttp.Error(w, http.StatusBadRequest, "failed to read request body")
			return
		}
		r.Body = io.NopCloser(bytes.NewReader(body))

		var payload struct {
			RefreshToken string `json:"refresh_token"`
		}
		if err := json.Unmarshal(body, &payload); err != nil || payload.RefreshToken == "" {
			localHandler.ServeHTTP(w, r)
			return
		}

		dataRegion := peekJWTRegion(payload.RefreshToken)
		if dataRegion == "" || dataRegion == localRegion {
			localHandler.ServeHTTP(w, r)
			return
		}

		rp, ok := proxies[dataRegion]
		if !ok {
			localHandler.ServeHTTP(w, r)
			return
		}

		r.Body = io.NopCloser(bytes.NewReader(body))
		logger.Info("proxying refresh to region", "region", dataRegion)
		rp.ServeHTTP(w, r)
	})
}
