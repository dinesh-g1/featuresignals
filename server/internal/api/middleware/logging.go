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
func Logging(logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			start := time.Now()
			reqID := chimw.GetReqID(r.Context())

			reqLogger := logger.With(
				"request_id", reqID,
				"method", r.Method,
				"path", r.URL.Path,
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

			logAttrs := []any{
				"status", rw.status,
				"duration_ms", duration.Milliseconds(),
				"bytes_out", rw.bytesOut,
				"remote", r.RemoteAddr,
				"user_agent", r.UserAgent(),
			}
			if orgID, _ := r.Context().Value(OrgIDKey).(string); orgID != "" {
				logAttrs = append(logAttrs, "org_id", orgID)
			}

			reqLogger.Log(r.Context(), level, "request completed", logAttrs...)
		})
	}
}
