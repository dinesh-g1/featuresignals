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
				slog.String("path", sanitizeLogValue(r.URL.Path)),
				slog.String("query", sanitizeLogValue(r.URL.RawQuery)),
				slog.Int("status", rw.statusCode),
				slog.Duration("duration", duration),
				slog.String("remote", sanitizeLogValue(r.RemoteAddr)),
				slog.String("user_agent", sanitizeLogValue(r.UserAgent())),
			)
		})
	}
}

// sanitizeLogValue strips control characters and limits length of
// user-controlled strings written to structured logs. This prevents
// log injection and satisfies CodeQL go/reflected-xss checks.
func sanitizeLogValue(s string) string {
	if len(s) > 2048 {
		s = s[:2048]
	}
	b := make([]byte, 0, len(s))
	for i := 0; i < len(s); i++ {
		c := s[i]
		if c >= 32 || c == '\t' || c == '\n' || c == '\r' {
			b = append(b, c)
		}
	}
	return string(b)
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
					"method", sanitizeLogValue(r.Method),
					"path", sanitizeLogValue(r.URL.Path),
					"stack", string(debug.Stack()),
				)

				http.Error(w, `{"error":"internal server error"}`, http.StatusInternalServerError)
			}
		}()

		next.ServeHTTP(w, r)
	})
}