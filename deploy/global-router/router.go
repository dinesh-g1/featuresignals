package main

import (
	"log"
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
	rateLimiters       map[string]*RateLimiter
	defaultRateLimiter *RateLimiter
	connLimiter        *connLimiter
	startTime          time.Time
}

func NewRouter(cfg *Config) *Router {
	r := &Router{
		config:       cfg,
		rateLimiters: make(map[string]*RateLimiter),
		connLimiter:  newConnLimiter(100),
		startTime:    time.Now(),
	}

	// Parse default rate limit
	limit, window := parseRateLimit(cfg.Router.RateLimit.Default)
	r.defaultRateLimiter = NewRateLimiter(limit, window)

	// Parse per-domain rate limits
	for _, d := range cfg.Router.Domains {
		if d.RateLimit != "" {
			l, w := parseRateLimit(d.RateLimit)
			r.rateLimiters[d.Name] = NewRateLimiter(l, w)
		}
	}

	return r
}

func parseRateLimit(s string) (int, time.Duration) {
	parts := strings.Split(s, "/")
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

func (r *Router) ServeHTTP(w http.ResponseWriter, req *http.Request) {
	// Health endpoint — served inline before domain routing
	if req.URL.Path == "/ops/health" {
		r.HealthHandler(w, req)
		return
	}

	host := req.Host
	// Strip port
	if idx := strings.Index(host, ":"); idx >= 0 {
		host = host[:idx]
	}

	// Find matching domain config
	for _, d := range r.config.Router.Domains {
		if d.Name == host {
			// Access logging
			start := time.Now()
			lrw := &loggingResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}

			switch d.Type {
			case "static":
				r.serveStatic(lrw, req, d)
			case "proxy":
				r.serveProxy(lrw, req, d)
			default:
				http.Error(lrw, "502 Bad Gateway", http.StatusBadGateway)
			}

			log.Printf("%s %s %s %d %s", req.Method, host, req.URL.Path, lrw.statusCode, time.Since(start))
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

	info, err := os.Stat(filePath)
	if err != nil {
		if os.IsNotExist(err) {
			http.Error(w, "404 Not Found", http.StatusNotFound)
			return
		}
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
	targetURL, err := url.Parse(d.Target)
	if err != nil {
		http.Error(w, "502 Bad Gateway", http.StatusBadGateway)
		return
	}

	proxy := httputil.NewSingleHostReverseProxy(targetURL)
	proxy.ErrorHandler = func(w http.ResponseWriter, req *http.Request, err error) {
		log.Printf("proxy error: %s -> %s: %v", req.Host, d.Target, err)
		http.Error(w, "502 Bad Gateway", http.StatusBadGateway)
	}

	// Modify the request
	req.Host = targetURL.Host
	req.URL.Host = targetURL.Host
	req.URL.Scheme = targetURL.Scheme

	// Add forwarded headers
	req.Header.Set("X-Forwarded-Host", req.Host)
	req.Header.Set("X-Forwarded-Proto", "https")
	req.Header.Set("X-Real-IP", extractIP(req))

	proxy.ServeHTTP(w, req)
}

// loggingResponseWriter captures the status code for access logging
type loggingResponseWriter struct {
	http.ResponseWriter
	statusCode int
}

func (lrw *loggingResponseWriter) WriteHeader(code int) {
	lrw.statusCode = code
	lrw.ResponseWriter.WriteHeader(code)
}