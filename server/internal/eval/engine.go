package eval

import (
	"encoding/json"

	"github.com/featuresignals/server/internal/domain"
)

// Ruleset contains all the data needed to evaluate flags for an environment.
type Ruleset struct {
	Flags    map[string]*domain.Flag      // key -> flag
	States   map[string]*domain.FlagState // flagKey -> state for this env
	Segments map[string]*domain.Segment   // segmentKey -> segment
}

// Engine evaluates feature flags against a context.
type Engine struct{}

// NewEngine creates a new evaluation engine.
func NewEngine() *Engine {
	return &Engine{}
}

// Evaluate evaluates a single flag for the given context.
//
// Algorithm:
//  1. Look up flag by key
//  2. If not found -> NOT_FOUND
//  3. Look up flag state for environment
//  4. If disabled -> return default off value (DISABLED)
//  5. Evaluate targeting rules in priority order
//  6. If a rule matches, apply its rollout percentage
//  7. If no rule matches, apply default rollout
//  8. Return evaluated value
func (e *Engine) Evaluate(flagKey string, ctx domain.EvalContext, ruleset *Ruleset) domain.EvalResult {
	flag, ok := ruleset.Flags[flagKey]
	if !ok {
		return domain.EvalResult{
			FlagKey: flagKey,
			Value:   nil,
			Reason:  domain.ReasonNotFound,
		}
	}

	state, ok := ruleset.States[flagKey]
	if !ok || !state.Enabled {
		return domain.EvalResult{
			FlagKey: flagKey,
			Value:   parseJSONValue(flag.DefaultValue),
			Reason:  domain.ReasonDisabled,
		}
	}

	// Evaluate targeting rules in priority order
	for _, rule := range state.Rules {
		if e.matchRule(rule, ctx, ruleset) {
			// Rule matched — check percentage rollout
			if rule.Percentage >= 10000 {
				return domain.EvalResult{
					FlagKey: flagKey,
					Value:   parseJSONValue(rule.Value),
					Reason:  domain.ReasonTargeted,
				}
			}
			if rule.Percentage > 0 {
				bucket := BucketUser(flagKey, ctx.Key)
				if bucket < rule.Percentage {
					return domain.EvalResult{
						FlagKey: flagKey,
						Value:   parseJSONValue(rule.Value),
						Reason:  domain.ReasonRollout,
					}
				}
			}
			// Percentage is 0 or user not in rollout bucket — continue to next rule
		}
	}

	// No targeting rule matched — apply default rollout
	if state.PercentageRollout > 0 {
		bucket := BucketUser(flagKey, ctx.Key)
		if bucket < state.PercentageRollout {
			defaultVal := state.DefaultValue
			if defaultVal == nil {
				defaultVal = flag.DefaultValue
			}
			return domain.EvalResult{
				FlagKey: flagKey,
				Value:   parseJSONValue(defaultVal),
				Reason:  domain.ReasonRollout,
			}
		}
		// User not in rollout bucket — return flag default (off value)
		return domain.EvalResult{
			FlagKey: flagKey,
			Value:   parseJSONValue(flag.DefaultValue),
			Reason:  domain.ReasonFallthrough,
		}
	}

	// Fallthrough: flag is enabled, no rules, no rollout — return state or flag default
	defaultVal := state.DefaultValue
	if defaultVal == nil {
		defaultVal = flag.DefaultValue
	}
	return domain.EvalResult{
		FlagKey: flagKey,
		Value:   parseJSONValue(defaultVal),
		Reason:  domain.ReasonFallthrough,
	}
}

// EvaluateAll evaluates all flags in the ruleset for the given context.
func (e *Engine) EvaluateAll(ctx domain.EvalContext, ruleset *Ruleset) map[string]domain.EvalResult {
	results := make(map[string]domain.EvalResult, len(ruleset.Flags))
	for key := range ruleset.Flags {
		results[key] = e.Evaluate(key, ctx, ruleset)
	}
	return results
}

// matchRule checks if a targeting rule matches the given context.
func (e *Engine) matchRule(rule domain.TargetingRule, ctx domain.EvalContext, ruleset *Ruleset) bool {
	// Check segment-based targeting
	if len(rule.SegmentKeys) > 0 {
		segmentMatched := false
		for _, segKey := range rule.SegmentKeys {
			seg, ok := ruleset.Segments[segKey]
			if !ok {
				continue
			}
			if MatchConditions(seg.Rules, ctx, seg.MatchType) {
				segmentMatched = true
				break
			}
		}
		if !segmentMatched {
			return false
		}
	}

	// Check direct conditions
	if len(rule.Conditions) > 0 {
		matchType := rule.MatchType
		if matchType == "" {
			matchType = domain.MatchAll
		}
		if !MatchConditions(rule.Conditions, ctx, matchType) {
			return false
		}
	}

	return true
}

func parseJSONValue(raw json.RawMessage) interface{} {
	if raw == nil {
		return nil
	}
	var v interface{}
	if err := json.Unmarshal(raw, &v); err != nil {
		return nil
	}
	return v
}
