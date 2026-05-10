package main

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"sync"
	"time"
)

type Router struct {
	config                *Config
	metrics               *Metrics
	rateLimiters          map[string]*RateLimiter
	leakyBucketLimiters   map[string]*LeakyBucketLimiter // per domain, nil for sliding window
	defaultRateLimiter    *RateLimiter
	defaultLeakyLimiter   *LeakyBucketLimiter
	connLimiter           *connLimiter
	startTime             time.Time
	allowedDomains        map[string]bool
	proxies               map[string]*httputil.ReverseProxy
	circuitBreakers       map[string]*circuitBreaker // per proxy domain, nil for static
	opsTokenHash          string                    // SHA256 hash of OPS_AUTH_TOKEN env var
	mu                    sync.RWMutex              // protects config reloads
}

func NewRouter(cfg *Config, m *Metrics) *Router {
	connLimit := cfg.Router.ConnLimit
	if connLimit <= 0 {
		connLimit = 100
	}
	maxIPs := cfg.Router.MaxIPs
	if maxIPs <= 0 {
		maxIPs = 100000
	}

	// Compute SHA256 hash of OPS_AUTH_TOKEN for ops domain auth.
	// Only the hash is stored in memory; the raw token is never retained.
	opsTokenHash := ""
	if token := os.Getenv("OPS_AUTH_TOKEN"); token != "" {
		h := sha256.Sum256([]byte(token))
		opsTokenHash = hex.EncodeToString(h[:])
	}

	r := &Router{
		config:              cfg,
		metrics:             m,
		rateLimiters:        make(map[string]*RateLimiter),
		leakyBucketLimiters: make(map[string]*LeakyBucketLimiter),
		connLimiter:         newConnLimiter(connLimit),
		startTime:           time.Now(),
		allowedDomains:      make(map[string]bool),
		proxies:             make(map[string]*httputil.ReverseProxy),
		circuitBreakers:     make(map[string]*circuitBreaker),
		opsTokenHash:        opsTokenHash,
	}

	// Parse default rate limit — check if leaky bucket is configured globally
	if cfg.Router.RateLimit.Algo == "leaky" {
		rate, capacity := parseLeakyRate(cfg.Router.RateLimit.Default)
		r.defaultLeakyLimiter = NewLeakyBucketLimiter(rate, capacity, maxIPs)
	} else {
		limit, window := parseRateLimit(cfg.Router.RateLimit.Default)
		r.defaultRateLimiter = NewRateLimiter(limit, window, maxIPs)
	}

	// Parse per-domain rate limits and populate allowedDomains + proxies
	for _, d := range cfg.Router.Domains {
		r.allowedDomains[d.Name] = true

		if d.RateLimit != "" {
			// Check if this domain wants leaky bucket
			if d.RateLimitAlgo == "leaky" {
				rate, capacity := parseLeakyRate(d.RateLimit)
				r.leakyBucketLimiters[d.Name] = NewLeakyBucketLimiter(rate, capacity, maxIPs)
			} else {
				l, w := parseRateLimit(d.RateLimit)
				r.rateLimiters[d.Name] = NewRateLimiter(l, w, maxIPs)
			}
		}

		if d.Type == "proxy" {
			targetURL, err := url.Parse(d.Target)
			if err != nil {
				slog.Error("invalid proxy target, skipping pre-build", "domain", d.Name, "target", d.Target, "error", err)
				continue
			}
			proxy := httputil.NewSingleHostReverseProxy(targetURL)
			proxy.ErrorHandler = func(w http.ResponseWriter, req *http.Request, err error) {
				slog.Error("proxy error",
					"host", req.Host,
					"target", d.Target,
					"error", err,
				)
				http.Error(w, "502 Bad Gateway", http.StatusBadGateway)
			}
			r.proxies[d.Name] = proxy

			// Create circuit breaker for this upstream
			cbCfg := defaultCircuitConfig()
			if d.CircuitBreaker != nil {
				if d.CircuitBreaker.FailureThreshold > 0 {
					cbCfg.FailureThreshold = d.CircuitBreaker.FailureThreshold
				}
				if d.CircuitBreaker.Cooldown != "" {
					if cd, err := time.ParseDuration(d.CircuitBreaker.Cooldown); err == nil {
						cbCfg.Cooldown = cd
					}
				}
				if d.CircuitBreaker.HalfOpenMaxRequests > 0 {
					cbCfg.HalfOpenMaxRequests = d.CircuitBreaker.HalfOpenMaxRequests
				}
			}
			r.circuitBreakers[d.Name] = newCircuitBreaker(d.Target, cbCfg)
			r.circuitBreakers[d.Name].onTransition = func(target string, from, to circuitState) {
				m.IncCircuitTransition(target, to.String())
				m.SetCircuitOpen(target, to == circuitOpen)
			}
		}
	}

	return r
}

func parseRateLimit(s string) (int, time.Duration) {
	parts := strings.SplitN(s, "/", 2)
	if len(parts) != 2 {
		return 100, time.Minute
	}
	switch parts[1] {
	case "min":
		return atoi(parts[0]), time.Minute
	case "sec", "s":
		return atoi(parts[0]), time.Second
	default:
		return atoi(parts[0]), time.Minute
	}
}

func atoi(s string) int {
	n := 0
	for _, c := range s {
		if c >= '0' && c <= '9' {
			n = n*10 + int(c-'0')
		} else {
			break
		}
	}
	if n == 0 {
		return 100
	}
	return n
}

// ServeHTTP is the final handler in the middleware chain. It routes to
// operational endpoints or domain handlers.
func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	// Operational endpoints — served inline before domain routing.
	// Health and metrics are always accessible without auth.
	switch req.URL.Path {
	case "/ops/health":
		r.HealthHandler(w, req)
		return
	case "/ops/metrics":
		r.metrics.MetricsHandler().ServeHTTP(w, req)
		return
	}

	host := stripPort(req.Host)

	// Find matching domain config
	for _, d := range r.config.Router.Domains {
		if d.Name == host {
			// Build the domain handler based on type
			var handler http.Handler
			switch d.Type {
			case "static":
				handler = http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
					r.serveStatic(w, req, d)
				})
			case "proxy":
					handler = http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
						r.serveProxy(w, req, d)
					})
					// Wrap with circuit breaker if configured for this domain
					if cb, ok := r.circuitBreakers[host]; ok && cb != nil {
						handler = circuitBreakerHandler(cb, handler)
					}
			default:
				http.Error(w, "502 Bad Gateway", http.StatusBadGateway)
				return
			}

			// Apply ops auth middleware for domains that require it
			if d.Auth == "ops" {
				handler = opsAuthMiddleware(r.opsTokenHash)(handler)
			}

			handler.ServeHTTP(w, req)
			return
		}
	}

	http.Error(w, "404 Not Found", http.StatusNotFound)
}

func (r *Router) serveStatic(w http.ResponseWriter, req *http.Request, d Domain) {
	// Security: prevent path traversal in static serving.
	// Only block ".." when it appears as a path segment (e.g., /../ or /..),
	// not when it appears inside a filename (e.g., Next.js chunk 00d..rszoo1gv.js).
	cleanPath := filepath.Clean(req.URL.Path)
	if strings.HasPrefix(cleanPath, "../") || strings.Contains(cleanPath, "/../") || strings.HasSuffix(cleanPath, "/..") {
		http.Error(w, "403 Forbidden", http.StatusForbidden)
		return
	}

	filePath := filepath.Join(d.Root, cleanPath)

	// If root path, serve index.html
	if cleanPath == "." || cleanPath == "/" {
		filePath = filepath.Join(d.Root, "index.html")
	}

	// Next.js static export generates both features.html and features/ directory.
	// When /features is requested, prefer features.html over the features/ directory.
	// Check for {path}.html before {path}/ to handle name collisions.
	var info os.FileInfo
	var err error
	htmlPath := filePath + ".html"
	if htmlInfo, htmlErr := os.Stat(htmlPath); htmlErr == nil {
		filePath = htmlPath
		info = htmlInfo
	} else {
		info, err = os.Stat(filePath)
		if err != nil {
			if os.IsNotExist(err) {
				http.Error(w, "404 Not Found", http.StatusNotFound)
				return
			}
			slog.Error("static file stat error", "path", filePath, "error", err)
			http.Error(w, "500 Internal Server Error", http.StatusInternalServerError)
			return
		}

		// If directory, serve index.html
		if info.IsDir() {
			filePath = filepath.Join(filePath, "index.html")
			if _, err := os.Stat(filePath); err != nil {
				http.Error(w, "404 Not Found", http.StatusNotFound)
				return
			}
		}
	}

	// Set caching headers for static content
	ext := filepath.Ext(filePath)
	switch ext {
	case ".css", ".js", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg", ".webp":
		w.Header().Set("Cache-Control", "public, max-age=86400")
	case ".html":
		w.Header().Set("Cache-Control", "public, max-age=3600")
	default:
		w.Header().Set("Cache-Control", "public, max-age=3600")
	}

	http.ServeFile(w, req, filePath)
}

func (r *Router) serveProxy(w http.ResponseWriter, req *http.Request, d Domain) {
	proxy, ok := r.proxies[d.Name]
	if !ok {
		slog.Error("proxy not found for domain", "domain", d.Name)
		http.Error(w, "502 Bad Gateway", http.StatusBadGateway)
		return
	}

	// Modify the request for the target upstream
	targetURL, _ := url.Parse(d.Target)
	req.Host = targetURL.Host
	req.URL.Host = targetURL.Host
	req.URL.Scheme = targetURL.Scheme

	// Add forwarded headers
	req.Header.Set("X-Forwarded-Host", req.Host)
	req.Header.Set("X-Forwarded-Proto", "https")
	req.Header.Set("X-Real-IP", extractIP(req))

	proxy.ServeHTTP(w, req)
}

// loggingResponseWriter captures the status code for metrics and access logging
type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}

// Reload atomically replaces the router's configuration without restarting.
// Safe to call while serving requests — the old config remains active until
// the swap is complete. New leaky bucket limiters get cleanup goroutines.
func (r *Router) Reload(newCfg *Config) error {
	maxIPs := newCfg.Router.MaxIPs
	if maxIPs <= 0 {
		maxIPs = 100000
	}

	newAllowedDomains := make(map[string]bool)
	newProxies := make(map[string]*httputil.ReverseProxy)
	newRateLimiters := make(map[string]*RateLimiter)
	newLeakyLimiters := make(map[string]*LeakyBucketLimiter)
	newCircuitBreakers := make(map[string]*circuitBreaker)

	var newDefaultRateLimiter *RateLimiter
	var newDefaultLeakyLimiter *LeakyBucketLimiter

	if newCfg.Router.RateLimit.Algo == "leaky" {
		rate, capacity := parseLeakyRate(newCfg.Router.RateLimit.Default)
		newDefaultLeakyLimiter = NewLeakyBucketLimiter(rate, capacity, maxIPs)
	} else {
		limit, window := parseRateLimit(newCfg.Router.RateLimit.Default)
		newDefaultRateLimiter = NewRateLimiter(limit, window, maxIPs)
	}

	for _, d := range newCfg.Router.Domains {
		newAllowedDomains[d.Name] = true

		if d.RateLimit != "" {
			if d.RateLimitAlgo == "leaky" {
				rate, capacity := parseLeakyRate(d.RateLimit)
				newLeakyLimiters[d.Name] = NewLeakyBucketLimiter(rate, capacity, maxIPs)
			} else {
				l, w := parseRateLimit(d.RateLimit)
				newRateLimiters[d.Name] = NewRateLimiter(l, w, maxIPs)
			}
		}

		if d.Type == "proxy" {
			targetURL, err := url.Parse(d.Target)
			if err != nil {
				return fmt.Errorf("invalid proxy target for %s: %w", d.Name, err)
			}
			proxy := httputil.NewSingleHostReverseProxy(targetURL)
			proxy.ErrorHandler = func(w http.ResponseWriter, req *http.Request, err error) {
				slog.Error("proxy error", "host", req.Host, "target", d.Target, "error", err)
				http.Error(w, "502 Bad Gateway", http.StatusBadGateway)
			}
			newProxies[d.Name] = proxy

			// Reuse existing circuit breaker if present, otherwise create new
			r.mu.RLock()
			existingCB, exists := r.circuitBreakers[d.Name]
			r.mu.RUnlock()
			if exists && existingCB != nil {
				newCircuitBreakers[d.Name] = existingCB
			} else {
				cbCfg := defaultCircuitConfig()
				if d.CircuitBreaker != nil {
					if d.CircuitBreaker.FailureThreshold > 0 {
						cbCfg.FailureThreshold = d.CircuitBreaker.FailureThreshold
					}
					if d.CircuitBreaker.Cooldown != "" {
						if cd, err := time.ParseDuration(d.CircuitBreaker.Cooldown); err == nil {
							cbCfg.Cooldown = cd
						}
					}
					if d.CircuitBreaker.HalfOpenMaxRequests > 0 {
						cbCfg.HalfOpenMaxRequests = d.CircuitBreaker.HalfOpenMaxRequests
					}
				}
				cb := newCircuitBreaker(d.Target, cbCfg)
				cb.onTransition = func(target string, from, to circuitState) {
					r.metrics.IncCircuitTransition(target, to.String())
					r.metrics.SetCircuitOpen(target, to == circuitOpen)
				}
				newCircuitBreakers[d.Name] = cb
			}
		}
	}

	newOpsTokenHash := ""
	if token := os.Getenv("OPS_AUTH_TOKEN"); token != "" {
		h := sha256.Sum256([]byte(token))
		newOpsTokenHash = hex.EncodeToString(h[:])
	}

	// Atomically swap all state under write lock
	r.mu.Lock()
	defer r.mu.Unlock()

	r.config = newCfg
	r.allowedDomains = newAllowedDomains
	r.proxies = newProxies
	r.rateLimiters = newRateLimiters
	r.leakyBucketLimiters = newLeakyLimiters
	r.circuitBreakers = newCircuitBreakers
	r.defaultRateLimiter = newDefaultRateLimiter
	r.defaultLeakyLimiter = newDefaultLeakyLimiter
	r.opsTokenHash = newOpsTokenHash

	// Start cleanup loops for new leaky bucket limiters
	ctx := context.Background()
	if newDefaultLeakyLimiter != nil {
		go newDefaultLeakyLimiter.CleanupLoop(ctx)
	}
	for _, lb := range newLeakyLimiters {
		if lb != nil {
			go lb.CleanupLoop(ctx)
		}
	}

	slog.Info("router config reloaded",
		"domain_count", len(newAllowedDomains),
		"proxy_count", len(newProxies),
		"circuit_breaker_count", len(newCircuitBreakers),
	)
	return nil
}
