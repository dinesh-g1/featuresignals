package featuresignals

import "time"

// EvaluationReason describes why a flag evaluated to a particular value.
// Standardised across all FeatureSignals SDKs — see sdks/INTELLIGENCE.md.
type EvaluationReason string

const (
	// ReasonCached indicates the flag was served from the local cache.
	ReasonCached EvaluationReason = "CACHED"

	// ReasonDefault indicates the flag was not found in cache and the
	// fallback / default value was returned.
	ReasonDefault EvaluationReason = "DEFAULT"

	// ReasonError indicates the flag was found but the type did not match
	// the requested type (e.g. asking for a bool on a string flag).
	ReasonError EvaluationReason = "ERROR"

	// ReasonDisabled indicates the flag is disabled in the management
	// interface and its default-off / default-on value was returned.
	ReasonDisabled EvaluationReason = "DISABLED"

	// ReasonStatic indicates the flag is a static / kill-switch flag
	// that always returns the same value regardless of context.
	ReasonStatic EvaluationReason = "STATIC"

	// ReasonTargetMatch indicates a targeting rule matched for this
	// evaluation context.
	ReasonTargetMatch EvaluationReason = "TARGET_MATCH"

	// ReasonSplit indicates a percentage rollout / split evaluation
	// determined the value.
	ReasonSplit EvaluationReason = "SPLIT"
)

// EvaluationDetail is the rich return type for flag evaluations. It carries
// both the resolved value and metadata about how the evaluation decision was
// reached.
//
// Use BoolDetail / StringDetail / NumberDetail / JSONDetail on the client
// when you need evaluation metadata. The simpler BoolVariation / … methods
// remain for lightweight call sites.
type EvaluationDetail struct {
	// FlagKey is the key that was evaluated.
	FlagKey string `json:"flagKey"`

	// Value is the resolved value (or the fallback).
	Value interface{} `json:"value"`

	// Reason describes how the value was determined.
	Reason EvaluationReason `json:"reason"`

	// RuleID identifies the rule that matched (empty string if no rule).
	RuleID string `json:"ruleId,omitempty"`

	// RuleIndex is the 0-based index of the matching rule (-1 if none).
	RuleIndex int `json:"ruleIndex"`

	// EvaluationTimeMs is the wall-clock time this evaluation took in
	// milliseconds. Useful for performance monitoring on the caller side.
	EvaluationTimeMs float64 `json:"evaluationTimeMs"`

	// Error is set when Reason == ReasonError, nil otherwise.
	Error error `json:"-"`
}

// BoolDetail evaluates a boolean flag and returns full detail.
func (c *Client) BoolDetail(key string, ctx EvalContext, fallback bool) EvaluationDetail {
	start := time.Now()
	v, ok := c.getFlag(key)
	elapsed := float64(time.Since(start).Microseconds()) / 1000.0

	if !ok {
		c.recordNotFound(key)
		return EvaluationDetail{
			FlagKey:          key,
			Value:            fallback,
			Reason:           ReasonDefault,
			RuleIndex:        -1,
			EvaluationTimeMs: elapsed,
		}
	}

	b, ok := v.(bool)
	if !ok {
		c.recordEval(key)
		return EvaluationDetail{
			FlagKey:          key,
			Value:            fallback,
			Reason:           ReasonError,
			RuleIndex:        -1,
			EvaluationTimeMs: elapsed,
			Error:            &typeMismatchError{flag: key, expected: "bool"},
		}
	}

	c.recordEval(key)
	return EvaluationDetail{
		FlagKey:          key,
		Value:            b,
		Reason:           ReasonCached,
		RuleIndex:        -1,
		EvaluationTimeMs: elapsed,
	}
}

// StringDetail evaluates a string flag and returns full detail.
func (c *Client) StringDetail(key string, ctx EvalContext, fallback string) EvaluationDetail {
	start := time.Now()
	v, ok := c.getFlag(key)
	elapsed := float64(time.Since(start).Microseconds()) / 1000.0

	if !ok {
		c.recordNotFound(key)
		return EvaluationDetail{
			FlagKey:          key,
			Value:            fallback,
			Reason:           ReasonDefault,
			RuleIndex:        -1,
			EvaluationTimeMs: elapsed,
		}
	}

	s, ok := v.(string)
	if !ok {
		c.recordEval(key)
		return EvaluationDetail{
			FlagKey:          key,
			Value:            fallback,
			Reason:           ReasonError,
			RuleIndex:        -1,
			EvaluationTimeMs: elapsed,
			Error:            &typeMismatchError{flag: key, expected: "string"},
		}
	}

	c.recordEval(key)
	return EvaluationDetail{
		FlagKey:          key,
		Value:            s,
		Reason:           ReasonCached,
		RuleIndex:        -1,
		EvaluationTimeMs: elapsed,
	}
}

// NumberDetail evaluates a numeric flag and returns full detail.
func (c *Client) NumberDetail(key string, ctx EvalContext, fallback float64) EvaluationDetail {
	start := time.Now()
	v, ok := c.getFlag(key)
	elapsed := float64(time.Since(start).Microseconds()) / 1000.0

	if !ok {
		c.recordNotFound(key)
		return EvaluationDetail{
			FlagKey:          key,
			Value:            fallback,
			Reason:           ReasonDefault,
			RuleIndex:        -1,
			EvaluationTimeMs: elapsed,
		}
	}

	n, ok := v.(float64)
	if !ok {
		c.recordEval(key)
		return EvaluationDetail{
			FlagKey:          key,
			Value:            fallback,
			Reason:           ReasonError,
			RuleIndex:        -1,
			EvaluationTimeMs: elapsed,
			Error:            &typeMismatchError{flag: key, expected: "float64"},
		}
	}

	c.recordEval(key)
	return EvaluationDetail{
		FlagKey:          key,
		Value:            n,
		Reason:           ReasonCached,
		RuleIndex:        -1,
		EvaluationTimeMs: elapsed,
	}
}

// JSONDetail evaluates a JSON flag and returns full detail.
func (c *Client) JSONDetail(key string, ctx EvalContext, fallback interface{}) EvaluationDetail {
	start := time.Now()
	v, ok := c.getFlag(key)
	elapsed := float64(time.Since(start).Microseconds()) / 1000.0

	if !ok {
		c.recordNotFound(key)
		return EvaluationDetail{
			FlagKey:          key,
			Value:            fallback,
			Reason:           ReasonDefault,
			RuleIndex:        -1,
			EvaluationTimeMs: elapsed,
		}
	}

	c.recordEval(key)
	return EvaluationDetail{
		FlagKey:          key,
		Value:            v,
		Reason:           ReasonCached,
		RuleIndex:        -1,
		EvaluationTimeMs: elapsed,
	}
}

// typeMismatchError is a lightweight error for type mismatch reporting.
type typeMismatchError struct {
	flag     string
	expected string
}

func (e *typeMismatchError) Error() string {
	return "featuresignals: flag '" + e.flag + "' is not a " + e.expected
}

// recordEval tracks an evaluation for the anomaly detector.
func (c *Client) recordEval(key string) {
	if c.anomaly != nil {
		c.anomaly.RecordEvaluation(key)
	}
}

// recordNotFound tracks a not-found flag access for the anomaly detector.
func (c *Client) recordNotFound(key string) {
	if c.anomaly != nil {
		c.anomaly.RecordMissing(key)
	}
}
