package eval

import (
	"log/slog"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// Evaluator abstracts the flag evaluation engine.
// Engine satisfies this interface, as does any middleware wrapper.
type Evaluator interface {
	Evaluate(flagKey string, ctx domain.EvalContext, ruleset *domain.Ruleset) domain.EvalResult
	EvaluateAll(ctx domain.EvalContext, ruleset *domain.Ruleset) map[string]domain.EvalResult
}

// compile-time check
var _ Evaluator = (*Engine)(nil)

// Middleware wraps an Evaluator and returns a decorated Evaluator.
type Middleware func(Evaluator) Evaluator

// Chain applies middlewares in order: the first middleware is the outermost layer.
func Chain(base Evaluator, mws ...Middleware) Evaluator {
	e := base
	for i := len(mws) - 1; i >= 0; i-- {
		e = mws[i](e)
	}
	return e
}

// ─── Built-in middlewares ───────────────────────────────────────────────────

// MetricsRecorder is satisfied by metrics.Collector.
type MetricsRecorder interface {
	Record(flagKey, envID, reason string)
}

// WithMetrics returns a middleware that records each evaluation.
// envID is captured at middleware-creation time (one chain per environment).
func WithMetrics(mr MetricsRecorder, envID string) Middleware {
	return func(next Evaluator) Evaluator {
		return &metricsEval{next: next, mr: mr, envID: envID}
	}
}

type metricsEval struct {
	next  Evaluator
	mr    MetricsRecorder
	envID string
}

func (m *metricsEval) Evaluate(flagKey string, ctx domain.EvalContext, rs *domain.Ruleset) domain.EvalResult {
	res := m.next.Evaluate(flagKey, ctx, rs)
	m.mr.Record(flagKey, m.envID, res.Reason)
	return res
}

func (m *metricsEval) EvaluateAll(ctx domain.EvalContext, rs *domain.Ruleset) map[string]domain.EvalResult {
	results := m.next.EvaluateAll(ctx, rs)
	for k, v := range results {
		m.mr.Record(k, m.envID, v.Reason)
	}
	return results
}

// WithLogging returns a middleware that logs each evaluation at debug level.
func WithLogging(logger *slog.Logger) Middleware {
	return func(next Evaluator) Evaluator {
		return &loggingEval{next: next, logger: logger}
	}
}

type loggingEval struct {
	next   Evaluator
	logger *slog.Logger
}

func (l *loggingEval) Evaluate(flagKey string, ctx domain.EvalContext, rs *domain.Ruleset) domain.EvalResult {
	start := time.Now()
	res := l.next.Evaluate(flagKey, ctx, rs)
	l.logger.Debug("flag evaluated",
		"flag_key", flagKey,
		"user_key", ctx.Key,
		"value", res.Value,
		"reason", res.Reason,
		"duration_us", time.Since(start).Microseconds(),
	)
	return res
}

func (l *loggingEval) EvaluateAll(ctx domain.EvalContext, rs *domain.Ruleset) map[string]domain.EvalResult {
	start := time.Now()
	results := l.next.EvaluateAll(ctx, rs)
	l.logger.Debug("bulk evaluation",
		"user_key", ctx.Key,
		"flags", len(results),
		"duration_us", time.Since(start).Microseconds(),
	)
	return results
}
