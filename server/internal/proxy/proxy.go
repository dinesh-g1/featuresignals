package proxy

import (
	"bytes"
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
		rp := httputil.NewSingleHostReverseProxy(target)
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
		rp := httputil.NewSingleHostReverseProxy(target)
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

// CompleteSignupProxy routes complete-signup requests to the target region
// specified in the request body's data_region field (extracted from the
// pending registration stored during initiate-signup).
func CompleteSignupProxy(localHandler http.Handler, localRegion string, endpoints map[string]string, logger *slog.Logger) http.Handler {
	proxies := make(map[string]*httputil.ReverseProxy, len(endpoints))
	for region, endpoint := range endpoints {
		if region == localRegion {
			continue
		}
		target, err := url.Parse(endpoint)
		if err != nil {
			continue
		}
		proxies[region] = httputil.NewSingleHostReverseProxy(target)
	}

	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		pendingRegion := r.Header.Get("X-Target-Region")
		if pendingRegion == "" || pendingRegion == localRegion {
			localHandler.ServeHTTP(w, r)
			return
		}

		rp, ok := proxies[pendingRegion]
		if !ok {
			localHandler.ServeHTTP(w, r)
			return
		}

		logger.Info("proxying complete-signup to region", "region", pendingRegion)
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
