// Package domain defines the core business interfaces for FeatureSignals.
//
// EvalEvent defines the rich evaluation event schema for the evaluation
// hot path. Every flag evaluation produces an EvalEvent that flows through
// the EventBus to the billing meter, analytics pipeline, and audit log.
//
// EvalEvents are batched and sampled to avoid overwhelming the event
// pipeline while preserving statistical accuracy.
package domain

import (
	"encoding/json"
	"context"
	"time"
)

// ─── Evaluation Event ──────────────────────────────────────────────────────

// EvalEvent represents a single flag evaluation. It captures the full
// context of the evaluation: who requested it, what flag was evaluated,
// what variant was returned, and why.
type EvalEvent struct {
	// ID uniquely identifies this event for deduplication.
	ID string `json:"id"`

	// OrgID is the tenant.
	OrgID string `json:"org_id"`

	// ProjectID is the project scope.
	ProjectID string `json:"project_id"`

	// EnvironmentID is the environment (e.g., "production", "staging").
	EnvironmentID string `json:"environment_id"`

	// FlagKey is the feature flag being evaluated.
	FlagKey string `json:"flag_key"`

	// FlagID is the flag's internal ID.
	FlagID string `json:"flag_id,omitempty"`

	// Variant is the resolved variant (for multi-variant flags).
	Variant string `json:"variant,omitempty"`

	// Value is the resolved flag value (boolean flags: "true"/"false",
	// string flags: the string value, number flags: stringified number).
	Value string `json:"value"`

	// Reason is the evaluation reason code:
	//   "targeting_match" — user matched a targeting rule
	//   "percentage_rollout" — user fell within rollout %
	//   "default" — no rules matched, default value used
	//   "flag_disabled" — flag is PAUSED or RETIRED
	//   "error" — evaluation error, default used
	//   "segment_match" — user matched a segment rule
	Reason string `json:"reason"`

	// RuleID is the specific targeting rule that matched, if any.
	RuleID string `json:"rule_id,omitempty"`

	// SegmentKeys are the segments the user matched, if any.
	SegmentKeys []string `json:"segment_keys,omitempty"`

	// SDK identifies the client SDK making the request
	// (e.g., "go/1.2.3", "node/2.0.0", "react/1.5.0").
	SDK string `json:"sdk,omitempty"`

	// SDKMode is the evaluation mode: "server", "client", "local".
	SDKMode string `json:"sdk_mode,omitempty"`

	// UserKey is the end-user identifier (hashed for privacy).
	UserKeyHash string `json:"user_key_hash,omitempty"`

	// Attributes is a snapshot of the evaluation context attributes
	// (subset used for analytics; exclude PII).
	Attributes json.RawMessage `json:"attributes,omitempty"`

	// LatencyUs is the evaluation latency in microseconds.
	LatencyUs int64 `json:"latency_us"`

	// CacheHit is true if the evaluation was served from the SDK's
	// local cache (no server round-trip).
	CacheHit bool `json:"cache_hit"`

	// EvaluatedAt is when the evaluation occurred.
	EvaluatedAt time.Time `json:"evaluated_at"`
}

// ─── Evaluation Batch ──────────────────────────────────────────────────────

// EvalEventBatch is a collection of evaluation events emitted together.
// Batching reduces the number of EventBus messages while preserving
// per-event granularity for analytics.
type EvalEventBatch struct {
	// ID uniquely identifies this batch.
	ID string `json:"id"`

	// OrgID is the tenant.
	OrgID string `json:"org_id"`

	// EnvironmentID is the environment.
	EnvironmentID string `json:"environment_id"`

	// Events are the individual evaluation events in this batch.
	Events []EvalEvent `json:"events"`

	// BatchSize is the number of events in this batch.
	BatchSize int `json:"batch_size"`

	// SampledRate is the fraction of total evaluations this batch
	// represents (1.0 = 100% sampling, 0.01 = 1% sampling).
	SampledRate float64 `json:"sampled_rate"`

	// WindowStart is the start of the time window this batch covers.
	WindowStart time.Time `json:"window_start"`

	// WindowEnd is the end of the time window.
	WindowEnd time.Time `json:"window_end"`

	// EmittedAt is when this batch was emitted.
	EmittedAt time.Time `json:"emitted_at"`
}

// ─── Emission Configuration ─────────────────────────────────────────────────

// EvalEmissionConfig controls how evaluation events are emitted from the
// SDK or server. It is part of the environment configuration and can be
// tuned per environment.
type EvalEmissionConfig struct {
	// Mode controls the emission strategy:
	//   "none"    — events are not emitted (default)
	//   "batch"   — events are batched and emitted periodically
	//   "sample"  — events are sampled at the configured rate
	//   "stream"  — events are emitted individually in real-time
	Mode string `json:"mode"` // "none", "batch", "sample", "stream"

	// BatchSize is the maximum number of events per batch.
	BatchSize int `json:"batch_size"`

	// BatchIntervalMs is the maximum time between batch emissions.
	BatchIntervalMs int `json:"batch_interval_ms"`

	// SampleRate is the fraction of events to emit (0.0–1.0).
	// Only applicable when mode is "sample".
	SampleRate float64 `json:"sample_rate"`

	// ExcludeAttributes is a list of attribute keys to strip from
	// evaluation events for privacy (e.g., "email", "ip_address").
	ExcludeAttributes []string `json:"exclude_attributes,omitempty"`

	// HashUserKey controls whether the user key is hashed (SHA-256)
	// before inclusion. Default: true for production environments.
	HashUserKey bool `json:"hash_user_key"`
}

// ─── Eval Event Store interfaces ───────────────────────────────────────────

// EvalEventWriter persists evaluation events for analytics.
// EvalEventWriter persists evaluation events for analytics.
type EvalEventWriter interface {
	InsertEvalEvent(ctx context.Context, event *EvalEvent) error
	InsertEvalEventBatch(ctx context.Context, batch *EvalEventBatch) error
}

// EvalEventReader provides analytics queries over evaluation events.
type EvalEventReader interface {
	CountEvaluations(ctx context.Context, orgID, flagKey string, since time.Time) (int64, error)
	CountEvaluationsByVariant(ctx context.Context, orgID, flagKey string, since time.Time) (map[string]int64, error)
	GetEvaluationLatency(ctx context.Context, orgID, flagKey string, since time.Time) (p50, p95, p99 int64, err error)
	GetEvaluationVolume(ctx context.Context, orgID string, since time.Time, interval string) ([]TimeSeriesPoint, error)
}
// TimeSeriesPoint is a single data point in a time series query.
type TimeSeriesPoint struct {
	Timestamp time.Time `json:"timestamp"`
	Value     int64     `json:"value"`
}

// ─── Well-known evaluation reasons ─────────────────────────────────────────

const (
	EvalReasonTargetingMatch    = "targeting_match"
	EvalReasonPercentageRollout = "percentage_rollout"
	EvalReasonDefault           = "default"
	EvalReasonFlagDisabled      = "flag_disabled"
	EvalReasonError             = "error"
	EvalReasonSegmentMatch      = "segment_match"
)
