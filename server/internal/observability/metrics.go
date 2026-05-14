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

	// ── Agent Registry ────────────────────────────────────
	AgentRegistryCreated ometric.Int64Counter

	// ── Governance Policies ───────────────────────────────
	PolicyCreated      ometric.Int64Counter
	PolicyEvaluated    ometric.Int64Counter
	PolicyEvalDuration ometric.Float64Histogram

	// ── ABM (Agent Behavior Mesh) ─────────────────────────
	ABMResolve              ometric.Int64Counter
	ABMResolveDuration      ometric.Float64Histogram
	ABMTrack                ometric.Int64Counter
	ABMTrackAsyncWriteFailed ometric.Int64Counter

	// ── Eval Events ───────────────────────────────────────
	EvalEventsEmitted ometric.Int64Counter
	EvalEventsDropped ometric.Int64Counter

	// ── EventBus ──────────────────────────────────────────
	EventBusPublished        ometric.Int64Counter
	EventBusPublishDuration  ometric.Float64Histogram
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

	// ── Agent Registry ────────────────────────────────────
	agentRegistryCreated, _ := meter.Int64Counter("agent.registry.created",
		ometric.WithDescription("Number of agents registered via the registry API"),
	)

	// ── Governance Policies ───────────────────────────────
	policyCreated, _ := meter.Int64Counter("policy.created",
		ometric.WithDescription("Number of governance policies created"),
	)
	policyEvaluated, _ := meter.Int64Counter("policy.evaluated",
		ometric.WithDescription("Number of policy evaluations performed"),
	)
	policyEvalDuration, _ := meter.Float64Histogram("policy.eval.duration_ms",
		ometric.WithDescription("Policy evaluation latency in milliseconds"),
		ometric.WithUnit("ms"),
	)

	// ── ABM (Agent Behavior Mesh) ─────────────────────────
	abmResolve, _ := meter.Int64Counter("abm.resolve.count",
		ometric.WithDescription("Number of ABM behavior resolutions"),
	)
	abmResolveDuration, _ := meter.Float64Histogram("abm.resolve.duration_ms",
		ometric.WithDescription("ABM resolution latency in milliseconds"),
		ometric.WithUnit("ms"),
	)
	abmTrack, _ := meter.Int64Counter("abm.track.count",
		ometric.WithDescription("Number of ABM track events received"),
	)
	abmTrackAsyncWriteFailed, _ := meter.Int64Counter("abm.track.async_write.failed",
		ometric.WithDescription("Number of ABM track events that failed async background write"),
	)

	// ── Eval Events ───────────────────────────────────────
	evalEventsEmitted, _ := meter.Int64Counter("eval_events.emitted",
		ometric.WithDescription("Number of evaluation events emitted to the EventBus"),
	)
	evalEventsDropped, _ := meter.Int64Counter("eval_events.dropped",
		ometric.WithDescription("Number of evaluation events dropped due to buffer full"),
	)

	// ── EventBus ──────────────────────────────────────────
	eventBusPublished, _ := meter.Int64Counter("eventbus.published",
		ometric.WithDescription("Number of messages published to the EventBus"),
	)
	eventBusPublishDuration, _ := meter.Float64Histogram("eventbus.publish.duration_ms",
		ometric.WithDescription("EventBus publish latency in milliseconds"),
		ometric.WithUnit("ms"),
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

		AgentRegistryCreated: agentRegistryCreated,

		PolicyCreated:      policyCreated,
		PolicyEvaluated:    policyEvaluated,
		PolicyEvalDuration: policyEvalDuration,

		ABMResolve:              abmResolve,
		ABMResolveDuration:      abmResolveDuration,
		ABMTrack:                abmTrack,
		ABMTrackAsyncWriteFailed: abmTrackAsyncWriteFailed,

		EvalEventsEmitted: evalEventsEmitted,
		EvalEventsDropped: evalEventsDropped,

		EventBusPublished:       eventBusPublished,
		EventBusPublishDuration: eventBusPublishDuration,
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

// RecordAgentRegistryCreated records an agent registration.
func (i *Instruments) RecordAgentRegistryCreated(ctx context.Context, agentType string) {
	i.AgentRegistryCreated.Add(ctx, 1, ometric.WithAttributes(
		attribute.String("agent_type", agentType),
	))
}

// RecordPolicyCreated records a policy creation.
func (i *Instruments) RecordPolicyCreated(ctx context.Context, effect string) {
	i.PolicyCreated.Add(ctx, 1, ometric.WithAttributes(
		attribute.String("effect", effect),
	))
}

// RecordPolicyEvaluation records a policy evaluation with its outcome and duration.
func (i *Instruments) RecordPolicyEvaluation(ctx context.Context, passed bool, durationMs float64) {
	outcome := "pass"
	if !passed {
		outcome = "fail"
	}
	i.PolicyEvaluated.Add(ctx, 1, ometric.WithAttributes(
		attribute.String("outcome", outcome),
	))
	i.PolicyEvalDuration.Record(ctx, durationMs, ometric.WithAttributes(
		attribute.String("outcome", outcome),
	))
}

// RecordABMResolve records an ABM behavior resolution.
func (i *Instruments) RecordABMResolve(ctx context.Context, reason string, durationMs float64) {
	i.ABMResolve.Add(ctx, 1, ometric.WithAttributes(
		attribute.String("reason", reason),
	))
	i.ABMResolveDuration.Record(ctx, durationMs, ometric.WithAttributes(
		attribute.String("reason", reason),
	))
}

// RecordABMTrack records an ABM track event.
func (i *Instruments) RecordABMTrack(ctx context.Context, behaviorKey string) {
	i.ABMTrack.Add(ctx, 1, ometric.WithAttributes(
		attribute.String("behavior_key", behaviorKey),
	))
}

// RecordABMTrackAsyncWriteFailed records a failed async ABM track event write.
func (i *Instruments) RecordABMTrackAsyncWriteFailed(ctx context.Context, behaviorKey string) {
	i.ABMTrackAsyncWriteFailed.Add(ctx, 1, ometric.WithAttributes(
		attribute.String("behavior_key", behaviorKey),
	))
}

// RecordEvalEventsEmitted records evaluation events successfully enqueued.
func (i *Instruments) RecordEvalEventsEmitted(ctx context.Context, count int64) {
	i.EvalEventsEmitted.Add(ctx, count)
}

// RecordEvalEventsDropped records evaluation events dropped due to buffer full.
func (i *Instruments) RecordEvalEventsDropped(ctx context.Context, count int64) {
	i.EvalEventsDropped.Add(ctx, count)
}

// RecordEventBusPublish records an EventBus publish operation.
func (i *Instruments) RecordEventBusPublish(ctx context.Context, topic string, success bool, durationMs float64) {
	status := "success"
	if !success {
		status = "failure"
	}
	i.EventBusPublished.Add(ctx, 1, ometric.WithAttributes(
		attribute.String("topic", topic),
		attribute.String("status", status),
	))
	i.EventBusPublishDuration.Record(ctx, durationMs, ometric.WithAttributes(
		attribute.String("topic", topic),
		attribute.String("status", status),
	))
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
