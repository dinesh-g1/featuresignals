package featuresignals

import (
	"sync"
	"time"
)

// WarningLevel indicates the severity of an anomaly warning.
type WarningLevel string

const (
	// WarningInfo is informational — unusual but not harmful.
	WarningInfo WarningLevel = "INFO"

	// WarningWarn indicates a potential problem that should be investigated.
	WarningWarn WarningLevel = "WARN"

	// WarningError indicates a critical anomaly that likely requires
	// immediate action (e.g. configuration drift causing wrong defaults).
	WarningError WarningLevel = "ERROR"
)

// Warning is a structured anomaly warning emitted by the AnomalyDetector.
type Warning struct {
	// Level is the severity of this warning.
	Level WarningLevel `json:"level"`

	// Code is a machine-readable identifier for the warning type.
	Code string `json:"code"`

	// Message is a human-readable description of the anomaly.
	Message string `json:"message"`

	// FlagKey is the flag this warning pertains to (empty if not applicable).
	FlagKey string `json:"flagKey,omitempty"`

	// Timestamp is when the warning was generated.
	Timestamp time.Time `json:"timestamp"`

	// Detail carries additional structured data (rate, window, etc.).
	Detail map[string]interface{} `json:"detail,omitempty"`
}

// WarnHandler is a callback for anomaly warnings. Register with
// WithWarnHandler or on the AnomalyDetector directly.
//
// The handler is called synchronously from the evaluation path, so it
// must return quickly. For expensive operations (HTTP calls, file I/O),
// hand the warning to a goroutine or buffered channel inside the handler.
type WarnHandler func(Warning)

// AnomalyDetectorConfig configures the anomaly detection thresholds.
// All zero / negative values use sensible defaults.
type AnomalyDetectorConfig struct {
	// RateWindow is the sliding window for rate anomaly detection.
	// Default: 1 second.
	RateWindow time.Duration

	// RateThreshold is the number of evaluations of the same flag within
	// RateWindow that triggers a rate-anomaly warning. Default: 1000.
	RateThreshold int

	// ContextWindow is the sliding window for context-anomaly detection.
	// Default: 10 seconds.
	ContextWindow time.Duration

	// ContextThreshold is the number of evaluations with identical
	// context + flag within ContextWindow that triggers a context-anomaly
	// warning. Default: 100.
	ContextThreshold int

	// DriftWindow is the window for remembering previously-found flags.
	// Default: 5 minutes.
	DriftWindow time.Duration
}

// DefaultAnomalyConfig returns a config with sensible defaults.
func DefaultAnomalyConfig() AnomalyDetectorConfig {
	return AnomalyDetectorConfig{
		RateWindow:       1 * time.Second,
		RateThreshold:    1000,
		ContextWindow:    10 * time.Second,
		ContextThreshold: 100,
		DriftWindow:      5 * time.Minute,
	}
}

// AnomalyDetector tracks evaluation patterns and emits warnings on
// suspicious behaviour. It is safe for concurrent use.
//
// Three anomaly types are detected:
//
//  1. Rate anomaly — the same flag is evaluated more than RateThreshold
//     times within RateWindow. This typically signals an unintentional
//     tight loop calling the evaluation API.
//
//  2. Context anomaly — the same flag is evaluated with an identical
//     context more than ContextThreshold times within ContextWindow.
//     This often indicates a bug where a user/entity key is hardcoded
//     rather than dynamically populated.
//
//  3. Drift anomaly — a flag that was previously found in the cache is
//     now missing. This can indicate configuration drift or an
//     out-of-sync cache.
type AnomalyDetector struct {
	cfg     AnomalyDetectorConfig
	handler WarnHandler

	mu sync.Mutex

	// Rate tracking: flag key → sliding window of evaluation timestamps.
	rateBuckets map[string][]time.Time

	// Context tracking: for context anomaly, we track flag+context key
	// pairs. Key format: "flagKey\000contextKey".
	ctxBuckets map[string][]time.Time

	// Drift tracking: flags that have been seen at least once.
	seenFlags map[string]bool

	// Suppression: avoid flooding — emit at most one warning per code per
	// flag per suppressInterval (30s).
	suppressMap map[string]time.Time
}

const suppressInterval = 30 * time.Second

// NewAnomalyDetector creates a new anomaly detector. If cfg is nil,
// DefaultAnomalyConfig is used. If handler is nil, warnings are silently
// discarded (useful for tests that only inspect the detector state).
func NewAnomalyDetector(cfg *AnomalyDetectorConfig, handler WarnHandler) *AnomalyDetector {
	if cfg == nil {
		d := DefaultAnomalyConfig()
		cfg = &d
	}
	return &AnomalyDetector{
		cfg:         *cfg,
		handler:     handler,
		rateBuckets: make(map[string][]time.Time),
		ctxBuckets:  make(map[string][]time.Time),
		seenFlags:   make(map[string]bool),
		suppressMap: make(map[string]time.Time),
	}
}

// SetHandler updates the warning handler. May be nil to silence warnings.
func (d *AnomalyDetector) SetHandler(h WarnHandler) {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.handler = h
}

// RecordEvaluation records a successful flag evaluation for anomaly
// detection. Call this on every flag read.
func (d *AnomalyDetector) RecordEvaluation(flagKey string) {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now()

	// Mark as seen for drift detection.
	d.seenFlags[flagKey] = true

	// Rate anomaly.
	d.rateBuckets[flagKey] = append(d.rateBuckets[flagKey], now)
	d.pruneBucket(&d.rateBuckets, flagKey, now, d.cfg.RateWindow)
	if len(d.rateBuckets[flagKey]) >= d.cfg.RateThreshold {
		d.emitLocked(Warning{
			Level:     WarningWarn,
			Code:      "RATE_ANOMALY",
			Message:   "Flag '" + flagKey + "' is being evaluated at an unusually high rate (" + itoa(len(d.rateBuckets[flagKey])) + " times in the last " + d.cfg.RateWindow.String() + "). This may indicate a tight loop or missing memoisation.",
			FlagKey:   flagKey,
			Timestamp: now,
			Detail: map[string]interface{}{
				"rate":    len(d.rateBuckets[flagKey]),
				"window":  d.cfg.RateWindow.String(),
				"threshold": d.cfg.RateThreshold,
			},
		})
	}
}

// RecordEvaluationWithContext records an evaluation with its context for
// context-anomaly detection. Call this when you have the EvalContext.Key
// available.
func (d *AnomalyDetector) RecordEvaluationWithContext(flagKey, contextKey string) {
	d.mu.Lock()
	defer d.mu.Unlock()

	now := time.Now()
	composite := flagKey + "\x00" + contextKey

	d.ctxBuckets[composite] = append(d.ctxBuckets[composite], now)
	d.pruneBucket(&d.ctxBuckets, composite, now, d.cfg.ContextWindow)
	if len(d.ctxBuckets[composite]) >= d.cfg.ContextThreshold {
		d.emitLocked(Warning{
			Level:     WarningInfo,
			Code:      "CONTEXT_ANOMALY",
			Message:   "Flag '" + flagKey + "' is being evaluated with identical context '" + contextKey + "' repeatedly (" + itoa(len(d.ctxBuckets[composite])) + " times). This may indicate a hardcoded context key — ensure the context key is dynamically set per user/request.",
			FlagKey:   flagKey,
			Timestamp: now,
			Detail: map[string]interface{}{
				"count":     len(d.ctxBuckets[composite]),
				"window":    d.cfg.ContextWindow.String(),
				"threshold": d.cfg.ContextThreshold,
				"contextKey": contextKey,
			},
		})
	}
}

// RecordMissing records that a flag was not found in the cache. If the
// flag was previously seen (found), emits a drift warning.
func (d *AnomalyDetector) RecordMissing(flagKey string) {
	d.mu.Lock()
	defer d.mu.Unlock()

	if d.seenFlags[flagKey] {
		d.emitLocked(Warning{
			Level:     WarningError,
			Code:      "DRIFT_ANOMALY",
			Message:   "Flag '" + flagKey + "' was previously available but is now missing. This indicates configuration drift — the flag may have been deleted or renamed on the server.",
			FlagKey:   flagKey,
			Timestamp: time.Now(),
			Detail: map[string]interface{}{
				"driftWindow": d.cfg.DriftWindow.String(),
			},
		})
		// Remove from seen so we don't spam on every subsequent miss.
		// It will be re-added if the flag reappears.
		delete(d.seenFlags, flagKey)
	}
}

// Reset clears all internal state. Useful for testing.
func (d *AnomalyDetector) Reset() {
	d.mu.Lock()
	defer d.mu.Unlock()
	d.rateBuckets = make(map[string][]time.Time)
	d.ctxBuckets = make(map[string][]time.Time)
	d.seenFlags = make(map[string]bool)
	d.suppressMap = make(map[string]time.Time)
}

// pruneBucket removes timestamps older than window from the given bucket.
// Must be called under mu.
func (d *AnomalyDetector) pruneBucket(buckets *map[string][]time.Time, key string, now time.Time, window time.Duration) {
	times := (*buckets)[key]
	cutoff := now.Add(-window)
	i := 0
	for i < len(times) && times[i].Before(cutoff) {
		i++
	}
	if i > 0 {
		(*buckets)[key] = times[i:]
	}
}

// emitLocked sends a warning through the handler, respecting the
// per-code-per-flag suppression interval. Must be called under mu.
func (d *AnomalyDetector) emitLocked(w Warning) {
	if d.handler == nil {
		return
	}
	suppressKey := w.Code + "\x00" + w.FlagKey
	if last, ok := d.suppressMap[suppressKey]; ok && time.Since(last) < suppressInterval {
		return
	}
	d.suppressMap[suppressKey] = w.Timestamp
	d.handler(w)
}

// itoa is a simple int→string helper to avoid importing strconv.
func itoa(n int) string {
	if n == 0 {
		return "0"
	}
	s := ""
	for n > 0 {
		s = string(rune('0'+n%10)) + s
		n /= 10
	}
	return s
}
