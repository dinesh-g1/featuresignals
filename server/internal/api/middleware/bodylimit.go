package middleware

import (
	"net/http"
)

const (
	// DefaultMaxBodySize is the default maximum request body size (10MB)
	DefaultMaxBodySize = 10 * 1024 * 1024 // 10MB

	// AgentMaxBodySize is the stricter limit for AI agent endpoints (1MB)
	AgentMaxBodySize = 1 * 1024 * 1024 // 1MB
)

// MaxBodySize limits the size of incoming request bodies to prevent
// denial-of-service via oversized payloads. Requests that exceed the
// limit will receive a 413 status from http.MaxBytesReader.
func MaxBodySize(bytes int64) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			r.Body = http.MaxBytesReader(w, r.Body, bytes)
			next.ServeHTTP(w, r)
		})
	}
}

// AgentBodyLimit applies a stricter body limit for AI agent endpoints.
// This prevents runaway AI agents from sending excessively large payloads.
func AgentBodyLimit(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		r.Body = http.MaxBytesReader(w, r.Body, AgentMaxBodySize)
		next.ServeHTTP(w, r)
	})
}
