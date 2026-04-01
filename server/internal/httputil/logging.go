package httputil

import (
	"context"
	"log/slog"
)

type ctxKey string

const loggerKey ctxKey = "logger"

// ContextWithLogger returns a new context carrying the given logger.
func ContextWithLogger(ctx context.Context, l *slog.Logger) context.Context {
	return context.WithValue(ctx, loggerKey, l)
}

// LoggerFromContext extracts the request-scoped logger. Falls back to
// slog.Default() so callers never receive nil.
func LoggerFromContext(ctx context.Context) *slog.Logger {
	if l, ok := ctx.Value(loggerKey).(*slog.Logger); ok && l != nil {
		return l
	}
	return slog.Default()
}
