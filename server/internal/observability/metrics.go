package observability

import (
	"context"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"go.opentelemetry.io/otel"
	"go.opentelemetry.io/otel/attribute"
	ometric "go.opentelemetry.io/otel/metric"
)

const meterName = "featuresignals"

// Instruments holds all application-level OTEL metric instruments.
type Instruments struct {
	EvalCount       ometric.Int64Counter
	EvalDuration    ometric.Float64Histogram
	CacheHit        ometric.Int64Counter
	CacheMiss       ometric.Int64Counter
	WebhookCount    ometric.Int64Counter
	WebhookDuration ometric.Float64Histogram
	AuthLogin       ometric.Int64Counter
	AuthSignup      ometric.Int64Counter
	SSEConnections  ometric.Int64UpDownCounter
}

// NewInstruments registers all metric instruments. Safe to call even if OTEL is
// disabled -- the global no-op MeterProvider handles it gracefully.
func NewInstruments() *Instruments {
	meter := otel.Meter(meterName)

	evalCount, _ := meter.Int64Counter("eval.count",
		ometric.WithDescription("Total flag evaluations"),
	)
	evalDuration, _ := meter.Float64Histogram("eval.duration_ms",
		ometric.WithDescription("Flag evaluation latency in milliseconds"),
		ometric.WithUnit("ms"),
	)
	cacheHit, _ := meter.Int64Counter("cache.hit",
		ometric.WithDescription("Cache hits"),
	)
	cacheMiss, _ := meter.Int64Counter("cache.miss",
		ometric.WithDescription("Cache misses"),
	)
	webhookCount, _ := meter.Int64Counter("webhook.delivery.count",
		ometric.WithDescription("Webhook delivery attempts"),
	)
	webhookDuration, _ := meter.Float64Histogram("webhook.delivery.duration_ms",
		ometric.WithDescription("Webhook delivery latency"),
		ometric.WithUnit("ms"),
	)
	authLogin, _ := meter.Int64Counter("auth.login.count",
		ometric.WithDescription("Login attempts"),
	)
	authSignup, _ := meter.Int64Counter("auth.signup.count",
		ometric.WithDescription("Signup completions"),
	)
	sseConns, _ := meter.Int64UpDownCounter("sse.active_connections",
		ometric.WithDescription("Currently active SSE connections"),
	)

	return &Instruments{
		EvalCount:       evalCount,
		EvalDuration:    evalDuration,
		CacheHit:        cacheHit,
		CacheMiss:       cacheMiss,
		WebhookCount:    webhookCount,
		WebhookDuration: webhookDuration,
		AuthLogin:       authLogin,
		AuthSignup:      authSignup,
		SSEConnections:  sseConns,
	}
}

// RecordEval records a flag evaluation metric.
func (i *Instruments) RecordEval(ctx context.Context, flagKey, reason string, durationMs float64) {
	attrs := ometric.WithAttributes(
		attribute.String("flag_key", flagKey),
		attribute.String("reason", reason),
	)
	i.EvalCount.Add(ctx, 1, attrs)
	i.EvalDuration.Record(ctx, durationMs, attrs)
}

// RecordWebhookDelivery records a webhook delivery metric.
func (i *Instruments) RecordWebhookDelivery(ctx context.Context, success bool, durationMs float64) {
	status := "success"
	if !success {
		status = "failure"
	}
	attrs := ometric.WithAttributes(attribute.String("status", status))
	i.WebhookCount.Add(ctx, 1, attrs)
	i.WebhookDuration.Record(ctx, durationMs, attrs)
}

// StartDBPoolMetrics starts a background goroutine that reports pgxpool stats
// as OTEL gauge observations every 30 seconds.
func StartDBPoolMetrics(ctx context.Context, pool *pgxpool.Pool, region string) {
	meter := otel.Meter(meterName)
	regionAttr := attribute.String("region", region)

	activeConns, _ := meter.Int64ObservableGauge("db.pool.active_connections",
		ometric.WithDescription("Active database connections"),
	)
	idleConns, _ := meter.Int64ObservableGauge("db.pool.idle_connections",
		ometric.WithDescription("Idle database connections"),
	)
	totalConns, _ := meter.Int64ObservableGauge("db.pool.total_connections",
		ometric.WithDescription("Total database connections"),
	)
	waitCount, _ := meter.Int64ObservableCounter("db.pool.wait_count",
		ometric.WithDescription("Cumulative count of connection wait events"),
	)

	_, _ = meter.RegisterCallback(
		func(_ context.Context, o ometric.Observer) error {
			stat := pool.Stat()
			o.ObserveInt64(activeConns, int64(stat.AcquiredConns()), ometric.WithAttributes(regionAttr))
			o.ObserveInt64(idleConns, int64(stat.IdleConns()), ometric.WithAttributes(regionAttr))
			o.ObserveInt64(totalConns, int64(stat.TotalConns()), ometric.WithAttributes(regionAttr))
			o.ObserveInt64(waitCount, stat.EmptyAcquireCount(), ometric.WithAttributes(regionAttr))
			return nil
		},
		activeConns, idleConns, totalConns, waitCount,
	)

	_ = ctx
	_ = time.Now()
}
