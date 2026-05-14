// Package domain defines the core business interfaces for FeatureSignals.
//
// This file implements the Agent Maturity Progression State Machine.
// It defines when an agent can advance to the next maturity level (L1→L5)
// and when it must be demoted due to degraded performance.
//
// PRS Requirement IDs: FS-AGENT-011, FS-AGENT-013

package domain

import "time"

// ─── Progression Rules ─────────────────────────────────────────────────────

// MaturityProgressionRules defines the thresholds an agent must meet
// to advance from one maturity level to the next.
type MaturityProgressionRules struct {
	MinAccuracy           float64 // Minimum accuracy (0.0–1.0)
	MinDecisions          int     // Minimum total decisions made
	MaxIncidents          int     // Maximum incidents caused
	MaxOverrideRate       float64 // Maximum human override rate (0.0–1.0)
	MinDaysSinceIncident  int     // Minimum days since last incident
	MinAvgConfidence      float64 // Minimum average confidence (0.0–1.0)
}

// ProgressionRules maps each maturity level to the rules required to
// advance to the next level. L5Sentinel has no progression (it is the
// highest level). These thresholds are informed by the Agent Operating
// Model's 5-level maturity framework.
var ProgressionRules = map[MaturityLevel]MaturityProgressionRules{
	MaturityL1Shadow: { // L1 → L2
		MinAccuracy:          0.85,
		MinDecisions:         100,
		MaxIncidents:         3,
		MaxOverrideRate:      0.15,
		MinDaysSinceIncident: 7,
		MinAvgConfidence:     0.70,
	},
	MaturityL2Assist: { // L2 → L3
		MinAccuracy:          0.90,
		MinDecisions:         500,
		MaxIncidents:         5,
		MaxOverrideRate:      0.10,
		MinDaysSinceIncident: 14,
		MinAvgConfidence:     0.80,
	},
	MaturityL3Supervised: { // L3 → L4
		MinAccuracy:          0.95,
		MinDecisions:         2000,
		MaxIncidents:         3,
		MaxOverrideRate:      0.05,
		MinDaysSinceIncident: 30,
		MinAvgConfidence:     0.85,
	},
	MaturityL4Autonomous: { // L4 → L5
		MinAccuracy:          0.98,
		MinDecisions:         10000,
		MaxIncidents:         1,
		MaxOverrideRate:      0.02,
		MinDaysSinceIncident: 90,
		MinAvgConfidence:     0.90,
	},
}

// ─── Demotion Rules ────────────────────────────────────────────────────────

// DemotionRules defines the thresholds at which an agent is automatically
// demoted to the previous maturity level.
type DemotionRules struct {
	MaxAccuracy     float64 // If accuracy drops below this
	MaxIncidents    int     // If incidents exceed this in window
	MaxOverrideRate float64 // If override rate exceeds this
	WindowDays      int     // Evaluation window (informational, enforcement in caller)
}

// DemotionThresholds maps each maturity level to its demotion criteria.
// L1Shadow has no demotion (it is the lowest level).
var DemotionThresholds = map[MaturityLevel]DemotionRules{
	MaturityL2Assist:     {MaxAccuracy: 0.80, MaxIncidents: 5, MaxOverrideRate: 0.25, WindowDays: 30},
	MaturityL3Supervised: {MaxAccuracy: 0.85, MaxIncidents: 5, MaxOverrideRate: 0.20, WindowDays: 30},
	MaturityL4Autonomous: {MaxAccuracy: 0.88, MaxIncidents: 3, MaxOverrideRate: 0.15, WindowDays: 60},
	MaturityL5Sentinel:   {MaxAccuracy: 0.92, MaxIncidents: 2, MaxOverrideRate: 0.10, WindowDays: 90},
}

// ─── Evaluation ────────────────────────────────────────────────────────────

// MaturityEvaluationResult is the outcome of an EvaluateProgression or
// EvaluateDemotion check.
type MaturityEvaluationResult struct {
	// Changed is true when the maturity level should change.
	Changed bool `json:"changed"`

	// NewLevel is the target maturity level after the change.
	NewLevel MaturityLevel `json:"new_level"`

	// PreviousLevel is the level before the change.
	PreviousLevel MaturityLevel `json:"previous_level"`

	// Direction is "promoted", "demoted", or "unchanged".
	Direction string `json:"direction"`

	// Reason explains why the change is occurring (or not occurring).
	Reason string `json:"reason"`

	// EvaluatedAt is when the evaluation was performed.
	EvaluatedAt time.Time `json:"evaluated_at"`
}

// EvaluateProgression checks if an agent qualifies for level advancement.
// Returns the result with Changed=true and Direction="promoted" if all
// progression rules are met.
func EvaluateProgression(stats MaturityStats, currentLevel MaturityLevel) MaturityEvaluationResult {
	result := MaturityEvaluationResult{
		PreviousLevel: currentLevel,
		NewLevel:      currentLevel,
		Direction:     "unchanged",
		EvaluatedAt:   time.Now().UTC(),
	}

	if currentLevel >= MaturityL5Sentinel {
		result.Reason = "Agent is already at the highest maturity level (L5 Sentinel). No further progression is possible."
		return result
	}

	nextLevel := MaturityLevel(int(currentLevel) + 1)
	rules, ok := ProgressionRules[currentLevel]
	if !ok {
		result.Reason = "No progression rules defined for the current maturity level."
		return result
	}

	// Check each rule in order, failing fast with a specific reason.
	if stats.Accuracy < rules.MinAccuracy {
		result.Reason = "Accuracy is below the required threshold for progression."
		return result
	}
	if stats.TotalDecisions < int64(rules.MinDecisions) {
		result.Reason = "Not enough decisions made to qualify for progression."
		return result
	}
	if stats.IncidentsCaused > rules.MaxIncidents {
		result.Reason = "Too many incidents caused to qualify for progression."
		return result
	}
	if stats.HumanOverrideRate > rules.MaxOverrideRate {
		result.Reason = "Human override rate is too high for progression."
		return result
	}
	if stats.DaysSinceLastIncident < rules.MinDaysSinceIncident {
		result.Reason = "Not enough days since the last incident to qualify for progression."
		return result
	}
	if stats.AvgConfidence < rules.MinAvgConfidence {
		result.Reason = "Average confidence is below the required threshold for progression."
		return result
	}

	result.Changed = true
	result.NewLevel = nextLevel
	result.Direction = "promoted"
	result.Reason = "All progression criteria met. Agent qualifies for advancement."
	return result
}

// EvaluateDemotion checks if an agent should be demoted due to degraded
// performance. Returns the result with Changed=true and Direction="demoted"
// if any demotion threshold is breached.
func EvaluateDemotion(stats MaturityStats, currentLevel MaturityLevel) MaturityEvaluationResult {
	result := MaturityEvaluationResult{
		PreviousLevel: currentLevel,
		NewLevel:      currentLevel,
		Direction:     "unchanged",
		EvaluatedAt:   time.Now().UTC(),
	}

	if currentLevel <= MaturityL1Shadow {
		result.Reason = "Agent is already at the lowest maturity level (L1 Shadow). No further demotion is possible."
		return result
	}

	rules, ok := DemotionThresholds[currentLevel]
	if !ok {
		result.Reason = "No demotion rules defined for the current maturity level."
		return result
	}

	if stats.Accuracy < rules.MaxAccuracy {
		prevLevel := MaturityLevel(int(currentLevel) - 1)
		result.Changed = true
		result.NewLevel = prevLevel
		result.Direction = "demoted"
		result.Reason = "Accuracy has fallen below the demotion threshold."
		return result
	}
	if stats.IncidentsCaused > rules.MaxIncidents {
		prevLevel := MaturityLevel(int(currentLevel) - 1)
		result.Changed = true
		result.NewLevel = prevLevel
		result.Direction = "demoted"
		result.Reason = "Incidents caused exceed the demotion threshold."
		return result
	}
	if stats.HumanOverrideRate > rules.MaxOverrideRate {
		prevLevel := MaturityLevel(int(currentLevel) - 1)
		result.Changed = true
		result.NewLevel = prevLevel
		result.Direction = "demoted"
		result.Reason = "Human override rate exceeds the demotion threshold."
		return result
	}

	result.Reason = "All demotion criteria are within acceptable limits."
	return result
}

// ─── Level Metadata ────────────────────────────────────────────────────────

// MaturityLevelName returns the human-readable name for a maturity level.
func MaturityLevelName(level MaturityLevel) string {
	switch level {
	case MaturityL1Shadow:
		return "Shadow"
	case MaturityL2Assist:
		return "Assist"
	case MaturityL3Supervised:
		return "Supervised"
	case MaturityL4Autonomous:
		return "Autonomous"
	case MaturityL5Sentinel:
		return "Sentinel"
	default:
		return "Unknown"
	}
}

// MaturityLevelDescription returns a brief description of what each
// maturity level means for agent behavior.
func MaturityLevelDescription(level MaturityLevel) string {
	switch level {
	case MaturityL1Shadow:
		return "Shadow mode: observes and recommends, but takes no action. All decisions require human execution."
	case MaturityL2Assist:
		return "Assist mode: acts with human approval required. Every action is gated by a human checkpoint."
	case MaturityL3Supervised:
		return "Supervised mode: acts autonomously with human review. Override is available but not required for routine actions."
	case MaturityL4Autonomous:
		return "Autonomous mode: acts independently. Human override is available but rarely needed. Self-healing for common issues."
	case MaturityL5Sentinel:
		return "Sentinel mode: full autonomy with self-healing. Teaches other agents. Trusted for production-critical decisions."
	default:
		return ""
	}
}

// NextMaturityLevel returns the next level or the current level if at max.
func NextMaturityLevel(current MaturityLevel) MaturityLevel {
	if current >= MaturityL5Sentinel {
		return MaturityL5Sentinel
	}
	return MaturityLevel(int(current) + 1)
}

// GetProgressionRules returns the progression rules for advancing from
// the given level, or nil if at max level.
func GetProgressionRules(current MaturityLevel) *MaturityProgressionRules {
	if rules, ok := ProgressionRules[current]; ok {
		return &rules
	}
	return nil
}
