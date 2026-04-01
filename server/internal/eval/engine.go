// Package eval implements the core feature flag evaluation engine.
//
// The engine is stateless and goroutine-safe: it takes a Ruleset (snapshot of
// all flags, states, and segments for an environment) and an EvalContext (the
// user being evaluated) and returns a deterministic result. The hot path
// performs zero allocations beyond the result struct.
//
// Evaluation algorithm:
//  1. Look up the flag by key → NOT_FOUND if missing
//  2. Look up the per-environment FlagState → DISABLED if missing or off
//  3. Walk targeting rules in priority order; first match wins
//  4. For matched rules, apply the rule's percentage rollout
//  5. If no rule matches, apply the default rollout on the FlagState
//  6. Fallthrough: return the flag/state default value
package eval

import (
	"encoding/json"
	"sort"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// Ruleset is an immutable snapshot of all data needed to evaluate flags
// for a single environment. It is built by the cache layer and passed to
// Engine.Evaluate.
type Ruleset struct {
	Flags    map[string]*domain.Flag      // flagKey → definition
	States   map[string]*domain.FlagState // flagKey → per-environment state
	Segments map[string]*domain.Segment   // segmentKey → segment definition
}

// Engine evaluates feature flags against a user context and a ruleset.
// It is stateless and safe for concurrent use.
type Engine struct{}

// NewEngine creates a new evaluation engine instance.
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

	if flag.ExpiresAt != nil && !flag.ExpiresAt.IsZero() && flag.ExpiresAt.Before(time.Now()) {
		return domain.EvalResult{
			FlagKey: flagKey,
			Value:   parseJSONValue(flag.DefaultValue),
			Reason:  domain.ReasonDisabled,
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

	if flag.MutualExclusionGroup != "" {
		if !e.winsMutexGroup(flagKey, flag.MutualExclusionGroup, ctx, ruleset) {
			return domain.EvalResult{
				FlagKey: flagKey,
				Value:   parseJSONValue(flag.DefaultValue),
				Reason:  domain.ReasonMutuallyExcluded,
			}
		}
	}

	if len(flag.Prerequisites) > 0 {
		for _, prereqKey := range flag.Prerequisites {
			prereqResult := e.Evaluate(prereqKey, ctx, ruleset)
			prereqOn, _ := prereqResult.Value.(bool)
			if prereqResult.Reason == domain.ReasonNotFound || prereqResult.Reason == domain.ReasonDisabled || !prereqOn {
				return domain.EvalResult{
					FlagKey: flagKey,
					Value:   parseJSONValue(flag.DefaultValue),
					Reason:  domain.ReasonPrerequisiteFailed,
				}
			}
		}
	}

	rules := make([]domain.TargetingRule, len(state.Rules))
	copy(rules, state.Rules)
	sort.Slice(rules, func(i, j int) bool { return rules[i].Priority < rules[j].Priority })

	for _, rule := range rules {
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

	// A/B experiment: if variants defined, assign user to a variant bucket
	if flag.FlagType == domain.FlagTypeAB && len(state.Variants) > 0 {
		return e.evaluateVariant(flagKey, ctx, state.Variants)
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

// evaluateVariant assigns a user to one variant based on consistent hashing.
// Variant weights are expressed in basis points (0–10000). The user's bucket
// determines which variant they land in.
func (e *Engine) evaluateVariant(flagKey string, ctx domain.EvalContext, variants []domain.Variant) domain.EvalResult {
	bucket := BucketUser(flagKey, ctx.Key)
	cumulative := 0
	for _, v := range variants {
		cumulative += v.Weight
		if bucket < cumulative {
			return domain.EvalResult{
				FlagKey:    flagKey,
				Value:      parseJSONValue(v.Value),
				Reason:     domain.ReasonVariant,
				VariantKey: v.Key,
			}
		}
	}
	// Fallback to last variant if weights don't sum to 10000
	last := variants[len(variants)-1]
	return domain.EvalResult{
		FlagKey:    flagKey,
		Value:      parseJSONValue(last.Value),
		Reason:     domain.ReasonVariant,
		VariantKey: last.Key,
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

// winsMutexGroup determines whether flagKey is the "winner" within its mutual
// exclusion group for this user. Among all enabled flags in the same group,
// the one whose BucketUser value is lowest wins. If two flags produce the
// same bucket, the lexicographically smaller key wins (deterministic tiebreak).
func (e *Engine) winsMutexGroup(flagKey, group string, ctx domain.EvalContext, ruleset *Ruleset) bool {
	winnerKey := flagKey
	winnerBucket := BucketUser(flagKey, ctx.Key)

	for key, f := range ruleset.Flags {
		if key == flagKey || f.MutualExclusionGroup != group {
			continue
		}
		state, ok := ruleset.States[key]
		if !ok || !state.Enabled {
			continue
		}
		bucket := BucketUser(key, ctx.Key)
		if bucket < winnerBucket || (bucket == winnerBucket && key < winnerKey) {
			winnerKey = key
			winnerBucket = bucket
		}
	}

	return winnerKey == flagKey
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
