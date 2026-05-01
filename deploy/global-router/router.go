package main

import (
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"net/http"
	"net/http/httputil"
	"net/url"
	"os"
	"path/filepath"
	"strings"
	"time"
)

type Router struct {
	config             *Config
	metrics            *Metrics
	rateLimiters       map[string]*RateLimiter
	defaultRateLimiter *RateLimiter
	connLimiter        *connLimiter
	startTime          time.Time
	allowedDomains     map[string]bool
	proxies            map[string]*httputil.ReverseProxy
	opsTokenHash       string // SHA256 hash of OPS_AUTH_TOKEN env var
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
		config:         cfg,
		metrics:        m,
		rateLimiters:   make(map[string]*RateLimiter),
		connLimiter:    newConnLimiter(connLimit),
		startTime:      time.Now(),
		allowedDomains: make(map[string]bool),
		proxies:        make(map[string]*httputil.ReverseProxy),
		opsTokenHash:   opsTokenHash,
	}

	// Parse default rate limit
	limit, window := parseRateLimit(cfg.Router.RateLimit.Default)
	r.defaultRateLimiter = NewRateLimiter(limit, window, maxIPs)

	// Parse per-domain rate limits and populate allowedDomains + proxies
	for _, d := range cfg.Router.Domains {
		r.allowedDomains[d.Name] = true

		if d.RateLimit != "" {
			l, w := parseRateLimit(d.RateLimit)
			r.rateLimiters[d.Name] = NewRateLimiter(l, w, maxIPs)
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
	// Security: prevent path traversal in static serving
	cleanPath := filepath.Clean(req.URL.Path)
	if strings.Contains(cleanPath, "..") {
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
