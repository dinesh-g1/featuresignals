package main

import (
	"bytes"
	"container/list"
	"context"
	"crypto/rand"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"io"
	"log/slog"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
)

// ── Context key for request ID ──────────────────────────────────────

type contextKey string

const requestIDKey contextKey = "request_id"

// RequestIDFromContext extracts the request ID from the context.
func RequestIDFromContext(ctx context.Context) string {
	id, _ := ctx.Value(requestIDKey).(string)
	return id
}

// generateRequestID creates a version-4 UUID using crypto/rand.
func generateRequestID() string {
	b := make([]byte, 16)
	if _, err := rand.Read(b); err != nil {
		// Fallback to timestamp-based ID if crypto/rand fails (extremely unlikely)
		return fmt.Sprintf("fallback-%d", time.Now().UnixNano())
	}
	b[6] = (b[6] & 0x0f) | 0x40 // Version 4
	b[8] = (b[8] & 0x3f) | 0x80 // Variant 10
	return fmt.Sprintf("%08x-%04x-%04x-%04x-%012x",
		b[0:4], b[4:6], b[6:8], b[8:10], b[10:16])
}

// ── Middleware chain ─────────────────────────────────────────────────

// requestIDMiddleware generates a UUID for each request, sets the
// X-Request-Id header on the response, and stores the ID in the context.
func (r *Router) requestIDMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		requestID := generateRequestID()
		w.Header().Set("X-Request-Id", requestID)
		ctx := context.WithValue(req.Context(), requestIDKey, requestID)
		next.ServeHTTP(w, req.WithContext(ctx))
	})
}

// metricsMiddleware records request counts, latency, and active connections.
func (r *Router) metricsMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		r.metrics.IncActiveConnections()
		defer r.metrics.DecActiveConnections()

		start := time.Now()
		lrw := &loggingResponseWriter{ResponseWriter: w, statusCode: http.StatusOK}

		next.ServeHTTP(lrw, req)

		host := stripPort(req.Host)
		r.metrics.ObserveRequest(req.Method, host, lrw.statusCode, time.Since(start))
	})
}

// securityHeadersMiddleware sets hardened security headers on every response.
func (r *Router) securityHeadersMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		w.Header().Set("Cross-Origin-Resource-Policy", "same-origin")
		w.Header().Set("Cross-Origin-Opener-Policy", "same-origin")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; img-src 'self' data:; font-src 'self' data: https://fonts.gstatic.com; connect-src 'self' https://api.featuresignals.com wss://api.featuresignals.com; style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com; script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net")
		next.ServeHTTP(w, req)
	})
}

// wafMiddleware blocks malicious requests based on WAF rules including
// SQL injection, path traversal, XSS patterns, and bad user agents.
// Also enforces method validation and body size limits.
func (r *Router) wafMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		// Method validation
		if !isMethodAllowed(req.Method) {
			r.metrics.IncWAFBlocked("method")
			http.Error(w, "405 Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}

		// Body size limit (1MB)
		req.Body = http.MaxBytesReader(w, req.Body, 1<<20)

		// User-Agent check
		ua := req.UserAgent()
		if ua != "" && isBadUserAgent(ua) {
			r.metrics.IncWAFBlocked("user_agent")
			http.Error(w, "403 Forbidden", http.StatusForbidden)
			return
		}

		// Body inspection for SQLi/XSS in payloads
		if !inspectBody(req) {
			r.metrics.IncWAFBlocked("body")
			http.Error(w, "403 Forbidden", http.StatusForbidden)
			return
		}

		// URI-based WAF checks
		uri := req.RequestURI
		if sqlInjectionPattern.MatchString(uri) {
			r.metrics.IncWAFBlocked("sql_injection")
			http.Error(w, "403 Forbidden", http.StatusForbidden)
			return
		}
		if pathTraversalPattern.MatchString(uri) {
			r.metrics.IncWAFBlocked("path_traversal")
			http.Error(w, "403 Forbidden", http.StatusForbidden)
			return
		}
		if xssPattern.MatchString(uri) {
			r.metrics.IncWAFBlocked("xss")
			http.Error(w, "403 Forbidden", http.StatusForbidden)
			return
		}

		next.ServeHTTP(w, req)
	})
}

// rateLimitMiddleware applies per-IP rate limiting, skipping static assets.
func (r *Router) rateLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		// Skip rate limiting for static assets
		if isStaticAsset(req.URL.Path) {
			next.ServeHTTP(w, req)
			return
		}

		ip := extractIP(req)
		host := stripPort(req.Host)

		rl, ok := r.rateLimiters[host]
		if !ok {
			rl = r.defaultRateLimiter
		}

		allowed, remaining, reset, retryAfter := rl.Allow(ip)

		// Set rate limit headers on every response
		w.Header().Set("X-RateLimit-Limit", fmt.Sprintf("%d", rl.limit))
		w.Header().Set("X-RateLimit-Remaining", fmt.Sprintf("%d", remaining))
		w.Header().Set("X-RateLimit-Reset", fmt.Sprintf("%d", reset.Unix()))

		if !allowed {
			r.metrics.IncRateLimited(host)
			w.Header().Set("Retry-After", fmt.Sprintf("%.0f", retryAfter.Seconds()))
			http.Error(w, "429 Too Many Requests", http.StatusTooManyRequests)
			return
		}

		next.ServeHTTP(w, req)
	})
}

// connLimitMiddleware enforces per-IP connection limits.
func (r *Router) connLimitMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		ip := extractIP(req)
		if !r.connLimiter.Acquire(ip) {
			http.Error(w, "429 Too Many Requests - connection limit exceeded", http.StatusTooManyRequests)
			return
		}
		defer r.connLimiter.Release(ip)
		next.ServeHTTP(w, req)
	})
}

// ── RateLimiter ─────────────────────────────────────────────────────

// RateLimiter implements a per-IP sliding window rate limiter
type RateLimiter struct {
	mu       sync.Mutex
	requests map[string]*list.List // IP -> list of request timestamps
	limit    int
	window   time.Duration
	maxIPs   int
}

func NewRateLimiter(limit int, window time.Duration, maxIPs int) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string]*list.List),
		limit:    limit,
		window:   window,
		maxIPs:   maxIPs,
	}
}

// Allow checks whether a request from ip is allowed under the rate limit.
// Returns: allowed, remaining count, reset time, retry-after (when denied).
func (rl *RateLimiter) Allow(ip string) (allowed bool, remaining int, reset time.Time, retryAfter time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)
	reset = now.Add(rl.window)

	if _, ok := rl.requests[ip]; !ok {
		rl.requests[ip] = list.New()
	}

	l := rl.requests[ip]

	// Remove old entries
	for e := l.Front(); e != nil; {
		if e.Value.(time.Time).Before(windowStart) {
			next := e.Next()
			l.Remove(e)
			e = next
		} else {
			break
		}
	}

	if l.Len() >= rl.limit {
		oldest := l.Front().Value.(time.Time)
		retryAfter = rl.window - now.Sub(oldest)
		remaining = 0
		return
	}

	l.PushBack(now)
	allowed = true
	remaining = rl.limit - l.Len()

	// Evict oldest IPs when the map exceeds maxIPs
	if rl.maxIPs > 0 && len(rl.requests) > rl.maxIPs {
		var oldestIP string
		var oldestTime time.Time
		first := true
		for ipKey, ipList := range rl.requests {
			if ipList.Len() == 0 {
				delete(rl.requests, ipKey)
				continue
			}
			t := ipList.Front().Value.(time.Time)
			if first || t.Before(oldestTime) {
				oldestTime = t
				oldestIP = ipKey
				first = false
			}
		}
		if oldestIP != "" {
			delete(rl.requests, oldestIP)
		}
	}

	return
}

// CleanupLoop periodically removes stale entries
func (rl *RateLimiter) CleanupLoop(ctx context.Context) {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()
	for {
		select {
		case <-ticker.C:
			rl.mu.Lock()
			now := time.Now()
			cutoff := now.Add(-2 * rl.window)
			for ip, l := range rl.requests {
				if l.Len() == 0 {
					delete(rl.requests, ip)
					continue
				}
				// Remove if oldest entry is older than 2 windows
				oldest := l.Front().Value.(time.Time)
				if oldest.Before(cutoff) {
					delete(rl.requests, ip)
				}
			}
			rl.mu.Unlock()
		case <-ctx.Done():
			return
		}
	}
}

// ── Ops Auth Middleware ────────────────────────────────────────────

// opsAuthMiddleware returns middleware that validates a Bearer token
// against the pre-computed SHA256 hash of OPS_AUTH_TOKEN. If the
// tokenHash is empty (no OPS_AUTH_TOKEN configured), all requests are
// rejected with 401 to fail closed.
func opsAuthMiddleware(tokenHash string) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
			// If no token is configured, fail closed
			if tokenHash == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"error":"ops authentication not configured"}`))
				return
			}

			authHeader := req.Header.Get("Authorization")
			if authHeader == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"error":"missing Authorization header"}`))
				return
			}

			// Extract Bearer token
			if !strings.HasPrefix(authHeader, "Bearer ") {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"error":"invalid Authorization header format, expected Bearer token"}`))
				return
			}

			token := strings.TrimPrefix(authHeader, "Bearer ")
			if token == "" {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"error":"empty bearer token"}`))
				return
			}

			// SHA256 comparison
			h := sha256.Sum256([]byte(token))
			suppliedHash := hex.EncodeToString(h[:])

			if !strings.EqualFold(suppliedHash, tokenHash) {
				w.Header().Set("Content-Type", "application/json")
				w.WriteHeader(http.StatusUnauthorized)
				w.Write([]byte(`{"error":"unauthorized"}`))
				return
			}

			next.ServeHTTP(w, req)
		})
	}
}

// ── connLimiter ─────────────────────────────────────────────────────

// connLimiter limits concurrent connections per IP
type connLimiter struct {
	mu    sync.Mutex
	conns map[string]int
	max   int
}

func newConnLimiter(max int) *connLimiter {
	return &connLimiter{
		conns: make(map[string]int),
		max:   max,
	}
}

func (cl *connLimiter) Acquire(ip string) bool {
	cl.mu.Lock()
	defer cl.mu.Unlock()
	if cl.conns[ip] >= cl.max {
		return false
	}
	cl.conns[ip]++
	return true
}

func (cl *connLimiter) Release(ip string) {
	cl.mu.Lock()
	defer cl.mu.Unlock()
	cl.conns[ip]--
	if cl.conns[ip] <= 0 {
		delete(cl.conns, ip)
	}
}

// ── WAF patterns & helpers ──────────────────────────────────────────

// Static asset extensions that should not count toward rate limits
var staticAssetExtensions = []string{
	".js", ".css", ".png", ".jpg", ".jpeg", ".gif", ".ico", ".svg",
	".woff", ".woff2", ".ttf", ".eot", ".webp", ".avif",
	".json", ".txt", ".xml", ".map", ".pdf",
}

// WAF patterns
var (
	sqlInjectionPattern = regexp.MustCompile(`(?i)(\b(select|union|insert|delete|update|drop|alter|create|truncate|exec|execute)\b.*\b(from|into|set|where|table|database|values)\b)|('?\b(or|and)\b\s*[\d='"]+\s*[\-\-])|(\b(1|0)\s*=\s*(1|0)\b)|(\b(admin|root|system)\b.*(--|#|/\*))`)
	pathTraversalPattern = regexp.MustCompile(`(\.\./|\.\.\\|%2e%2e%2f|%2e%2e%5c|\.\.[/\\])`)
	xssPattern          = regexp.MustCompile(`(?i)(<script|javascript:|onerror=|onload=|alert\(|document\.cookie|<iframe|<embed|<object|<svg)`)
	badUserAgents       = []string{"nikto", "nmap", "gobuster", "dirbuster", "wfuzz", "sqlmap", "acunetix", "nessus", "openvas", "burpsuite", "zap"}
)

// inspectBody reads the request body and runs WAF regexes against it for
// SQLi/XSS patterns. Only inspects bodies that are under 64KB and have
// an inspectable Content-Type. Replaces the body so downstream handlers
// can still read it. Returns false if the body should be blocked.
func inspectBody(req *http.Request) bool {
	if !isInspectableContentType(req.Header.Get("Content-Type")) {
		return true
	}
	if req.ContentLength > 65536 {
		return true
	}
	body, err := io.ReadAll(req.Body)
	if err != nil {
		return false
	}
	bodyStr := string(body)
	if sqlInjectionPattern.MatchString(bodyStr) || xssPattern.MatchString(bodyStr) || pathTraversalPattern.MatchString(bodyStr) {
		return false
	}
	req.Body = io.NopCloser(bytes.NewReader(body))
	return true
}

// isInspectableContentType returns true if the Content-Type is one that
// should be inspected for attack patterns (JSON, form-encoded, plain text).
func isInspectableContentType(ct string) bool {
	// Strip charset and other params
	if idx := strings.Index(ct, ";"); idx >= 0 {
		ct = strings.TrimSpace(ct[:idx])
	}
	switch ct {
	case "application/json", "application/x-www-form-urlencoded", "text/plain":
		return true
	}
	return false
}

// isStaticAsset returns true if the request path is a static file that should
// bypass rate limiting. Static assets like CSS, JS, images, and fonts are
// requested by the browser as part of rendering a page — rate-limiting them
// produces false 429 errors that degrade the user experience without any
// security benefit.
func isStaticAsset(path string) bool {
	lower := strings.ToLower(path)
	for _, ext := range staticAssetExtensions {
		if strings.HasSuffix(lower, ext) {
			return true
		}
	}
	// Next.js data routes (_next/data) and static chunks
	if strings.Contains(lower, "/_next/") {
		return true
	}
	// Docusaurus/Next.js hashed asset paths
	if strings.Contains(lower, "/assets/") || strings.Contains(lower, "/static/") {
		return true
	}
	return false
}

func isMethodAllowed(method string) bool {
	switch method {
	case http.MethodGet, http.MethodHead, http.MethodPost, http.MethodPut, http.MethodPatch, http.MethodDelete, http.MethodOptions:
		return true
	}
	return false
}

func isBadUserAgent(ua string) bool {
	uaLower := strings.ToLower(ua)
	for _, bad := range badUserAgents {
		if strings.Contains(uaLower, bad) {
			slog.Warn("bad user agent blocked", "user_agent", ua)
			return true
		}
	}
	return false
}

func extractIP(r *http.Request) string {
	if xff := r.Header.Get("X-Forwarded-For"); xff != "" {
		parts := strings.Split(xff, ",")
		return strings.TrimSpace(parts[0])
	}
	if xri := r.Header.Get("X-Real-IP"); xri != "" {
		return xri
	}
	ip, _, _ := net.SplitHostPort(r.RemoteAddr)
	return ip
}

// stripPort removes the port from a host string (e.g. "example.com:443" → "example.com").
func stripPort(host string) string {
	if idx := strings.Index(host, ":"); idx >= 0 {
		return host[:idx]
	}
	return host
}
