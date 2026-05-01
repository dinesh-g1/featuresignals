package middleware

import (
	"fmt"
	"log/slog"
	"net/http"
	"runtime/debug"
	"time"
)

// responseWriter wraps http.ResponseWriter to capture the status code.
type responseWriter struct {
	http.ResponseWriter
	statusCode int
	written    bool
}

func (rw *responseWriter) WriteHeader(code int) {
	if !rw.written {
		rw.statusCode = code
		rw.written = true
		rw.ResponseWriter.WriteHeader(code)
	}
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	if !rw.written {
		rw.WriteHeader(http.StatusOK)
	}
	return rw.ResponseWriter.Write(b)
}

// Logging returns middleware that logs every request with slog.
// User-controlled values are truncated to 2KB and passed through slog.String
// which applies JSON escaping, preventing injection (CodeQL go/reflected-xss).
func Logging(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			rw := &responseWriter{ResponseWriter: w, statusCode: http.StatusOK}

			next.ServeHTTP(rw, r)

			duration := time.Since(start)
			level := slog.LevelInfo
			if rw.statusCode >= 500 {
				level = slog.LevelError
			} else if rw.statusCode >= 400 {
				level = slog.LevelWarn
			}

			logger.LogAttrs(r.Context(), level, "request",
				slog.String("method", r.Method),
				slog.String("path", truncateForLog(r.URL.Path)),
				slog.String("query", truncateForLog(r.URL.RawQuery)),
				slog.Int("status", rw.statusCode),
				slog.Duration("duration", duration),
				slog.String("remote", truncateForLog(r.RemoteAddr)),
				slog.String("user_agent", truncateForLog(r.UserAgent())),
			)
		})
	}
}

// truncateForLog limits a string to 2KB for use in structured log entries.
// slog.String applies JSON escaping to the value, preventing injection in logs.
func truncateForLog(s string) string {
	if len(s) > 2048 {
		return s[:2048]
	}
	return s
}

// SecureHeaders returns middleware that sets security-related HTTP headers.
func SecureHeaders(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("X-Content-Type-Options", "nosniff")
		w.Header().Set("X-Frame-Options", "DENY")
		w.Header().Set("X-XSS-Protection", "1; mode=block")
		w.Header().Set("Referrer-Policy", "strict-origin-when-cross-origin")

		if r.TLS != nil {
			w.Header().Set("Strict-Transport-Security", "max-age=63072000; includeSubDomains")
		}

		next.ServeHTTP(w, r)
	})
}

// SafeRecoverer recovers from panics, logs the stack trace, and returns 500.
func SafeRecoverer(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		defer func() {
			if rec := recover(); rec != nil {
				err, ok := rec.(error)
				if !ok {
					err = fmt.Errorf("panic: %v", rec)
				}

				slog.Error("panic recovered",
					"error", err,
					"method", truncateForLog(r.Method),
					"path", truncateForLog(r.URL.Path),
					"stack", string(debug.Stack()),
				)

				http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
			}
		}()

		next.ServeHTTP(w, r)
	})
}