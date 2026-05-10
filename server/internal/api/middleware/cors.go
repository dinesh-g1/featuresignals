package middleware

import (
	"net/http"
)

// allowedOrigins is the strict allowlist for CORS.
// No wildcards. Each origin must be explicitly listed.
// docs are now served at featuresignals.com/docs, so no separate origin needed.
var allowedOrigins = map[string]bool{
	"https://app.featuresignals.com": true,
	"https://featuresignals.com":     true,
	"http://localhost:3000":          true, // dev dashboard
	"http://localhost:3001":          true, // dev ops-portal
	"http://127.0.0.1:3000":          true,
}

// CORS returns middleware that validates Origin headers against a strict
// allowlist and sets secure headers on every response.
// Origins not in the allowlist receive no CORS headers — browsers will
// block the cross-origin request.
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		origin := r.Header.Get("Origin")

		// Validate origin against allowlist.
		// docs are now at featuresignals.com/docs (same origin), so no
		// separate docs origin is needed for CORS.
		// If the origin is not allowed, we simply set no CORS headers,
		// and the browser will block the cross-origin request.
		if allowedOrigins[origin] {
			w.Header().Set("Access-Control-Allow-Origin", origin)
			w.Header().Set("Vary", "Origin")
			w.Header().Set("Access-Control-Allow-Credentials", "true")
		}

		// Handle preflight requests
		if r.Method == http.MethodOptions {
			if allowedOrigins[origin] {
				w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, PATCH, OPTIONS")
				w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, X-API-Key, Idempotency-Key")
				w.Header().Set("Access-Control-Max-Age", "86400")
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Security headers on every response
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		next.ServeHTTP(w, r)
	})
}