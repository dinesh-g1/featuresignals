package main

import (
	"container/list"
	"context"
	"fmt"
	"net"
	"net/http"
	"regexp"
	"strings"
	"sync"
	"time"
)

// RateLimiter implements a per-IP sliding window rate limiter
type RateLimiter struct {
	mu       sync.Mutex
	requests map[string]*list.List // IP -> list of request timestamps
	limit    int
	window   time.Duration
}

func NewRateLimiter(limit int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		requests: make(map[string]*list.List),
		limit:    limit,
		window:   window,
	}
}

func (rl *RateLimiter) Allow(ip string) (bool, time.Duration) {
	rl.mu.Lock()
	defer rl.mu.Unlock()

	now := time.Now()
	windowStart := now.Add(-rl.window)

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
		retryAfter := rl.window - now.Sub(oldest)
		return false, retryAfter
	}

	l.PushBack(now)
	return true, 0
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

// WAF patterns
var (
	sqlInjectionPattern = regexp.MustCompile(`(?i)(\b(select|union|insert|delete|update|drop|alter|create|truncate|exec|execute)\b.*\b(from|into|set|where|table|database|values)\b)|('?\b(or|and)\b\s*[\d='"]+\s*[\-\-])|(\b(1|0)\s*=\s*(1|0)\b)|(\b(admin|root|system)\b.*(--|#|/\*))`)
	pathTraversalPattern = regexp.MustCompile(`(\.\./|\.\.\\|%2e%2e%2f|%2e%2e%5c|\.\.[/\\])`)
	xssPattern          = regexp.MustCompile(`(?i)(<script|javascript:|onerror=|onload=|alert\(|document\.cookie|<iframe|<embed|<object|<svg)`)
	badUserAgents       = []string{"nikto", "nmap", "gobuster", "dirbuster", "wfuzz", "sqlmap", "acunetix", "nessus", "openvas", "burpsuite", "zap"}
)

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
			return true
		}
	}
	return false
}

// securityMiddleware returns a chain of security middleware handlers
func (r *Router) securityMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, req *http.Request) {
		ip := extractIP(req)

		// Connection limiting
		if !r.connLimiter.Acquire(ip) {
			http.Error(w, "429 Too Many Requests - connection limit exceeded", http.StatusTooManyRequests)
			return
		}
		defer r.connLimiter.Release(ip)

		// Method validation
		if !isMethodAllowed(req.Method) {
			http.Error(w, "405 Method Not Allowed", http.StatusMethodNotAllowed)
			return
		}

		// Body size limit (1MB)
		req.Body = http.MaxBytesReader(w, req.Body, 1<<20)

		// User-Agent check
		ua := req.UserAgent()
		if ua != "" && isBadUserAgent(ua) {
			http.Error(w, "403 Forbidden", http.StatusForbidden)
			return
		}

		// URI-based WAF checks
		uri := req.RequestURI
		if sqlInjectionPattern.MatchString(uri) {
			http.Error(w, "403 Forbidden", http.StatusForbidden)
			return
		}
		if pathTraversalPattern.MatchString(uri) {
			http.Error(w, "403 Forbidden", http.StatusForbidden)
			return
		}
		if xssPattern.MatchString(uri) {
			http.Error(w, "403 Forbidden", http.StatusForbidden)
			return
		}

		// Rate limiting
		rl, ok := r.rateLimiters[req.Host]
		if !ok {
			rl = r.defaultRateLimiter
		}
		if allowed, retryAfter := rl.Allow(ip); !allowed {
			w.Header().Set("Retry-After", fmt.Sprintf("%.0f", retryAfter.Seconds()))
			w.Header().Set("X-RateLimit-Remaining", "0")
			http.Error(w, "429 Too Many Requests", http.StatusTooManyRequests)
			return
		}

		// Security headers
		w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")
		w.Header().Set("Permissions-Policy", "camera=(), microphone=(), geolocation=()")
		w.Header().Set("Content-Security-Policy", "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; font-src 'self' data:; connect-src 'self' https://api.featuresignals.com wss://api.featuresignals.com")

		next.ServeHTTP(w, req)
	})
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