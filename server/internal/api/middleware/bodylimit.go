package middleware

import "net/http"

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
