package eval

import (
	"context"
	"time"

	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	"go.opentelemetry.io/otel/trace"

	"github.com/featuresignals/server/internal/domain"
)

var tracer = otel.Tracer("featuresignals/eval")

// OTELRecorder records evaluation metrics via an OTEL-compatible interface.
type OTELRecorder interface {
	RecordEval(ctx context.Context, flagKey, reason string, durationMs float64)
}

// WithTracing returns a middleware that creates a span for each evaluation.
// It is non-blocking: spans are queued via the global BatchSpanProcessor.
func WithTracing() Middleware {
	return func(next Evaluator) Evaluator {
		return &tracingEval{next: next}
	}
}

type tracingEval struct {
	next Evaluator
}

func (t *tracingEval) Evaluate(flagKey string, ctx domain.EvalContext, rs *domain.Ruleset) domain.EvalResult {
	spanCtx, span := tracer.Start(context.Background(), "eval.Evaluate",
		trace.WithAttributes(
			attribute.String("flag_key", flagKey),
			attribute.String("user_key", ctx.Key),
		),
	)
	defer span.End()

	start := time.Now()
	res := t.next.Evaluate(flagKey, ctx, rs)

	span.SetAttributes(
		attribute.String("reason", res.Reason),
		attribute.Float64("duration_us", float64(time.Since(start).Microseconds())),
	)

	_ = spanCtx
	return res
}

func (t *tracingEval) EvaluateAll(ctx domain.EvalContext, rs *domain.Ruleset) map[string]domain.EvalResult {
	_, span := tracer.Start(context.Background(), "eval.EvaluateAll",
		trace.WithAttributes(
			attribute.String("user_key", ctx.Key),
		),
	)
	defer span.End()

	results := t.next.EvaluateAll(ctx, rs)
	span.SetAttributes(attribute.Int("flags_count", len(results)))
	return results
}
