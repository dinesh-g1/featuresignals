package httputil

import (
	"context"
	"log/slog"
	"testing"
)

func TestContextWithLogger_Roundtrip(t *testing.T) {
	logger := slog.Default().With("custom", "field")
	ctx := ContextWithLogger(context.Background(), logger)

	got := LoggerFromContext(ctx)
	if got != logger {
		t.Error("expected same logger back from context")
	}
}

func TestLoggerFromContext_NoLogger(t *testing.T) {
	got := LoggerFromContext(context.Background())
	if got == nil {
		t.Error("expected non-nil fallback logger")
	}
}

func TestLoggerFromContext_NilValue(t *testing.T) {
	ctx := context.WithValue(context.Background(), loggerKey, (*slog.Logger)(nil))
	got := LoggerFromContext(ctx)
	if got == nil {
		t.Error("expected non-nil fallback logger for nil value")
	}
}
