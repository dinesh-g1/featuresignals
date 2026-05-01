package middleware

import (
	"log/slog"
	"net/http"
	"time"

	chimw "github.com/go-chi/chi/v5/middleware"

	"github.com/featuresignals/server/internal/httputil"
)

type responseWriter struct {
	http.ResponseWriter
	status      int
	wroteHeader bool
	bytesOut    int
}

func (rw *responseWriter) WriteHeader(code int) {
	if rw.wroteHeader {
		return
	}
	rw.status = code
	rw.wroteHeader = true
	rw.ResponseWriter.WriteHeader(code)
}

func (rw *responseWriter) Write(b []byte) (int, error) {
	n, err := rw.ResponseWriter.Write(b)
	rw.bytesOut += n
	return n, err
}

// Logging returns middleware that logs every request with structured fields.
// It also injects a request-scoped logger into the context so downstream
// handlers can call httputil.LoggerFromContext(r.Context()) without needing
// a logger field in their struct.
//
// All user-controlled values (path, remote addr, user agent) are truncated to
// 2KB and passed through slog.String which JSON-escapes them in structured
// output, preventing log injection and reflected XSS (CodeQL go/reflected-xss).
func Logging(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			reqID := chimw.GetReqID(r.Context())

			// Truncate user-controlled values to prevent log flooding.
			safePath := truncateForLog(r.URL.Path)
			safeRemote := truncateForLog(r.RemoteAddr)
			safeUA := truncateForLog(r.UserAgent())

			reqLogger := logger.With(
				"request_id", reqID,
				"method", slog.StringValue(r.Method),
				"path", slog.StringValue(safePath),
			)

			ctx := httputil.ContextWithLogger(r.Context(), reqLogger)
			rw := &responseWriter{ResponseWriter: w, status: http.StatusOK}

			next.ServeHTTP(rw, r.WithContext(ctx))

			duration := time.Since(start)
			level := slog.LevelInfo
			if rw.status >= 500 {
				level = slog.LevelError
			} else if rw.status >= 400 {
				level = slog.LevelWarn
			}

			attrs := []slog.Attr{
				slog.Int("status", rw.status),
				slog.Int64("duration_ms", duration.Milliseconds()),
				slog.Int("bytes_out", rw.bytesOut),
				slog.String("remote", safeRemote),
				slog.String("user_agent", safeUA),
			}
			if orgID, _ := r.Context().Value(OrgIDKey).(string); orgID != "" {
				attrs = append(attrs, slog.String("org_id", truncateForLog(orgID)))
			}

			reqLogger.LogAttrs(r.Context(), level, "request completed", attrs...)
		})
	}
}

// truncateForLog limits a string to 2KB for use in structured log entries.
// slog.String (used by all callers) applies JSON escaping to the value,
// which prevents injection attacks in structured log output.
func truncateForLog(s string) string {
	if len(s) > 2048 {
		return s[:2048]
	}
	return s
}
