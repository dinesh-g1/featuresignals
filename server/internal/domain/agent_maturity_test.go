// Package domain defines the core business interfaces for FeatureSignals.
//
// Tests for the Agent Maturity Progression State Machine.
// PRS Requirement IDs: FS-AGENT-011, FS-AGENT-013
package domain

import (
	"testing"
)

// ─── Progression Tests ─────────────────────────────────────────────────────

func TestEvaluateProgression_L1ToL2_MeetsAllCriteria(t *testing.T) {
	stats := MaturityStats{
		TotalDecisions:       150,
		Accuracy:             0.90,
		IncidentsCaused:      1,
		HumanOverrideRate:    0.05,
		DaysSinceLastIncident: 10,
		AvgConfidence:        0.75,
	}

	result := EvaluateProgression(stats, MaturityL1Shadow)

	if !result.Changed {
		t.Fatal("expected promotion from L1 to L2")
	}
	if result.NewLevel != MaturityL2Assist {
		t.Errorf("expected L2, got %d", result.NewLevel)
	}
	if result.Direction != "promoted" {
		t.Errorf("expected direction 'promoted', got %q", result.Direction)
	}
	if result.PreviousLevel != MaturityL1Shadow {
		t.Errorf("expected previous level L1, got %d", result.PreviousLevel)
	}
}

func TestEvaluateProgression_L2ToL3_MeetsCriteria(t *testing.T) {
	stats := MaturityStats{
		TotalDecisions:       600,
		Accuracy:             0.92,
		IncidentsCaused:      3,
		HumanOverrideRate:    0.05,
		DaysSinceLastIncident: 20,
		AvgConfidence:        0.85,
	}

	result := EvaluateProgression(stats, MaturityL2Assist)

	if !result.Changed {
		t.Fatal("expected promotion from L2 to L3")
	}
	if result.NewLevel != MaturityL3Supervised {
		t.Errorf("expected L3, got %d", result.NewLevel)
	}
	if result.Direction != "promoted" {
		t.Errorf("expected direction 'promoted', got %q", result.Direction)
	}
}

func TestEvaluateProgression_InsufficientDecisions(t *testing.T) {
	stats := MaturityStats{
		TotalDecisions:       50, // below L1→L2 threshold of 100
		Accuracy:             0.95,
		IncidentsCaused:      0,
		HumanOverrideRate:    0.01,
		DaysSinceLastIncident: 30,
		AvgConfidence:        0.90,
	}

	result := EvaluateProgression(stats, MaturityL1Shadow)

	if result.Changed {
		t.Error("expected no promotion due to insufficient decisions")
	}
	if result.Direction != "unchanged" {
		t.Errorf("expected direction 'unchanged', got %q", result.Direction)
	}
	if result.NewLevel != MaturityL1Shadow {
		t.Errorf("expected to stay at L1, got %d", result.NewLevel)
	}
}

func TestEvaluateProgression_LowAccuracy(t *testing.T) {
	stats := MaturityStats{
		TotalDecisions:       500,
		Accuracy:             0.82, // below L2→L3 threshold of 0.90
		IncidentsCaused:      0,
		HumanOverrideRate:    0.01,
		DaysSinceLastIncident: 30,
		AvgConfidence:        0.90,
	}

	result := EvaluateProgression(stats, MaturityL2Assist)

	if result.Changed {
		t.Error("expected no promotion due to low accuracy")
	}
	if result.Direction != "unchanged" {
		t.Errorf("expected direction 'unchanged', got %q", result.Direction)
	}
}

func TestEvaluateProgression_TooManyIncidents(t *testing.T) {
	stats := MaturityStats{
		TotalDecisions:       200,
		Accuracy:             0.90,
		IncidentsCaused:      4, // above L1→L2 threshold of 3
		HumanOverrideRate:    0.05,
		DaysSinceLastIncident: 10,
		AvgConfidence:        0.80,
	}

	result := EvaluateProgression(stats, MaturityL1Shadow)

	if result.Changed {
		t.Error("expected no promotion due to too many incidents")
	}
}

func TestEvaluateProgression_HighOverrideRate(t *testing.T) {
	stats := MaturityStats{
		TotalDecisions:       2500,
		Accuracy:             0.96,
		IncidentsCaused:      1,
		HumanOverrideRate:    0.08, // above L3→L4 threshold of 0.05
		DaysSinceLastIncident: 40,
		AvgConfidence:        0.90,
	}

	result := EvaluateProgression(stats, MaturityL3Supervised)

	if result.Changed {
		t.Error("expected no promotion due to high override rate")
	}
}

func TestEvaluateProgression_InsufficientDaysSinceIncident(t *testing.T) {
	stats := MaturityStats{
		TotalDecisions:       150,
		Accuracy:             0.90,
		IncidentsCaused:      0,
		HumanOverrideRate:    0.05,
		DaysSinceLastIncident: 3, // below L1→L2 threshold of 7
		AvgConfidence:        0.80,
	}

	result := EvaluateProgression(stats, MaturityL1Shadow)

	if result.Changed {
		t.Error("expected no promotion due to insufficient days since incident")
	}
}

func TestEvaluateProgression_LowAvgConfidence(t *testing.T) {
	stats := MaturityStats{
		TotalDecisions:       150,
		Accuracy:             0.90,
		IncidentsCaused:      0,
		HumanOverrideRate:    0.05,
		DaysSinceLastIncident: 10,
		AvgConfidence:        0.65, // below L1→L2 threshold of 0.70
	}

	result := EvaluateProgression(stats, MaturityL1Shadow)

	if result.Changed {
		t.Error("expected no promotion due to low avg confidence")
	}
}

func TestEvaluateProgression_AlreadyMaxLevel(t *testing.T) {
	stats := MaturityStats{
		TotalDecisions:       50000,
		Accuracy:             0.99,
		IncidentsCaused:      0,
		HumanOverrideRate:    0.001,
		DaysSinceLastIncident: 365,
		AvgConfidence:        0.99,
	}

	result := EvaluateProgression(stats, MaturityL5Sentinel)

	if result.Changed {
		t.Error("expected no promotion from max level L5")
	}
	if result.NewLevel != MaturityL5Sentinel {
		t.Errorf("expected to stay at L5, got %d", result.NewLevel)
	}
	if result.Direction != "unchanged" {
		t.Errorf("expected direction 'unchanged', got %q", result.Direction)
	}
}

func TestEvaluateProgression_L3ToL4_MeetsCriteria(t *testing.T) {
	stats := MaturityStats{
		TotalDecisions:       2500,
		Accuracy:             0.96,
		IncidentsCaused:      1,
		HumanOverrideRate:    0.02,
		DaysSinceLastIncident: 45,
		AvgConfidence:        0.88,
	}

	result := EvaluateProgression(stats, MaturityL3Supervised)

	if !result.Changed {
		t.Fatal("expected promotion from L3 to L4")
	}
	if result.NewLevel != MaturityL4Autonomous {
		t.Errorf("expected L4, got %d", result.NewLevel)
	}
}

func TestEvaluateProgression_L4ToL5_MeetsCriteria(t *testing.T) {
	stats := MaturityStats{
		TotalDecisions:       15000,
		Accuracy:             0.99,
		IncidentsCaused:      0,
		HumanOverrideRate:    0.01,
		DaysSinceLastIncident: 100,
		AvgConfidence:        0.92,
	}

	result := EvaluateProgression(stats, MaturityL4Autonomous)

	if !result.Changed {
		t.Fatal("expected promotion from L4 to L5")
	}
	if result.NewLevel != MaturityL5Sentinel {
		t.Errorf("expected L5, got %d", result.NewLevel)
	}
}

// ─── Demotion Tests ────────────────────────────────────────────────────────

func TestEvaluateDemotion_L3ToL2_AccuracyBelowThreshold(t *testing.T) {
	stats := MaturityStats{
		Accuracy:             0.80, // below L3 demotion threshold of 0.85
		IncidentsCaused:      2,
		HumanOverrideRate:    0.10,
		DaysSinceLastIncident: 10,
	}

	result := EvaluateDemotion(stats, MaturityL3Supervised)

	if !result.Changed {
		t.Fatal("expected demotion from L3 to L2 due to low accuracy")
	}
	if result.NewLevel != MaturityL2Assist {
		t.Errorf("expected L2, got %d", result.NewLevel)
	}
	if result.Direction != "demoted" {
		t.Errorf("expected direction 'demoted', got %q", result.Direction)
	}
	if result.PreviousLevel != MaturityL3Supervised {
		t.Errorf("expected previous level L3, got %d", result.PreviousLevel)
	}
}

func TestEvaluateDemotion_TooManyIncidents(t *testing.T) {
	stats := MaturityStats{
		Accuracy:             0.90,
		IncidentsCaused:      6, // above L2 demotion threshold of 5
		HumanOverrideRate:    0.10,
		DaysSinceLastIncident: 5,
	}

	result := EvaluateDemotion(stats, MaturityL2Assist)

	if !result.Changed {
		t.Fatal("expected demotion from L2 to L1 due to incidents")
	}
	if result.NewLevel != MaturityL1Shadow {
		t.Errorf("expected L1, got %d", result.NewLevel)
	}
}

func TestEvaluateDemotion_HighOverrideRate(t *testing.T) {
	stats := MaturityStats{
		Accuracy:             0.95,
		IncidentsCaused:      0,
		HumanOverrideRate:    0.30, // above L2 demotion threshold of 0.25
		DaysSinceLastIncident: 10,
	}

	result := EvaluateDemotion(stats, MaturityL2Assist)

	if !result.Changed {
		t.Fatal("expected demotion from L2 to L1 due to high override rate")
	}
	if result.NewLevel != MaturityL1Shadow {
		t.Errorf("expected L1, got %d", result.NewLevel)
	}
}

func TestEvaluateDemotion_AtMinLevel(t *testing.T) {
	stats := MaturityStats{
		Accuracy:             0.50, // terrible
		IncidentsCaused:      100,
		HumanOverrideRate:    0.90,
		DaysSinceLastIncident: 0,
	}

	result := EvaluateDemotion(stats, MaturityL1Shadow)

	if result.Changed {
		t.Error("expected no demotion from L1 (minimum level)")
	}
	if result.NewLevel != MaturityL1Shadow {
		t.Errorf("expected to stay at L1, got %d", result.NewLevel)
	}
	if result.Direction != "unchanged" {
		t.Errorf("expected direction 'unchanged', got %q", result.Direction)
	}
}

func TestEvaluateDemotion_HealthyNoChange(t *testing.T) {
	stats := MaturityStats{
		Accuracy:             0.95,
		IncidentsCaused:      0,
		HumanOverrideRate:    0.02,
		DaysSinceLastIncident: 60,
	}

	result := EvaluateDemotion(stats, MaturityL3Supervised)

	if result.Changed {
		t.Error("expected no demotion for healthy agent")
	}
	if result.Direction != "unchanged" {
		t.Errorf("expected direction 'unchanged', got %q", result.Direction)
	}
}

func TestEvaluateDemotion_L5ToL4_AccuracyDrop(t *testing.T) {
	stats := MaturityStats{
		Accuracy:             0.90, // below L5 demotion threshold of 0.92
		IncidentsCaused:      0,
		HumanOverrideRate:    0.05,
		DaysSinceLastIncident: 30,
	}

	result := EvaluateDemotion(stats, MaturityL5Sentinel)

	if !result.Changed {
		t.Fatal("expected demotion from L5 to L4 due to accuracy drop")
	}
	if result.NewLevel != MaturityL4Autonomous {
		t.Errorf("expected L4, got %d", result.NewLevel)
	}
}

func TestEvaluateDemotion_L4ToL3_IncidentSpike(t *testing.T) {
	stats := MaturityStats{
		Accuracy:             0.95,
		IncidentsCaused:      4, // above L4 demotion threshold of 3
		HumanOverrideRate:    0.05,
		DaysSinceLastIncident: 10,
	}

	result := EvaluateDemotion(stats, MaturityL4Autonomous)

	if !result.Changed {
		t.Fatal("expected demotion from L4 to L3 due to incidents")
	}
	if result.NewLevel != MaturityL3Supervised {
		t.Errorf("expected L3, got %d", result.NewLevel)
	}
}

// ─── Edge Case: Progression + Demotion Oscillation Protection ──────────────

func TestProgressionDemotion_OscillationProtection(t *testing.T) {
	// Simulate a scenario where an agent could oscillate between levels.
	// The progression and demotion thresholds have a gap (hysteresis) —
	// an agent that was just promoted shouldn't immediately qualify for demotion.

	// Agent at L2 with stats that barely meet L2→L3 progression
	progressionStats := MaturityStats{
		TotalDecisions:       600,
		Accuracy:             0.91, // just above 0.90 threshold
		IncidentsCaused:      3,
		HumanOverrideRate:    0.09, // just under 0.10 threshold
		DaysSinceLastIncident: 15,
		AvgConfidence:        0.81, // just above 0.80 threshold
	}

	// Should promote
	progResult := EvaluateProgression(progressionStats, MaturityL2Assist)
	if !progResult.Changed {
		t.Fatal("expected promotion from L2 to L3")
	}
	if progResult.NewLevel != MaturityL3Supervised {
		t.Errorf("expected L3, got %d", progResult.NewLevel)
	}

	// Now at L3, check if same stats would trigger demotion
	// L3 demotion thresholds: accuracy < 0.85, incidents > 5, override > 0.20
	demResult := EvaluateDemotion(progressionStats, MaturityL3Supervised)
	if demResult.Changed {
		t.Errorf("unexpected demotion right after promotion (oscillation): %s", demResult.Reason)
	}

	// Verify the hysteresis gap: progression requires 0.90 accuracy, demotion triggers at 0.85
	// This 0.05 gap prevents oscillation
}

func TestProgressionDemotion_RapidCyclePrevented(t *testing.T) {
	// An agent at L3 with stats that would demote to L2
	demotionStats := MaturityStats{
		Accuracy:             0.82, // below L3 demotion threshold of 0.85
		IncidentsCaused:      4,
		HumanOverrideRate:    0.18,
		DaysSinceLastIncident: 5,
	}

	// Should demote
	demResult := EvaluateDemotion(demotionStats, MaturityL3Supervised)
	if !demResult.Changed {
		t.Fatal("expected demotion from L3 to L2")
	}
	if demResult.NewLevel != MaturityL2Assist {
		t.Errorf("expected L2, got %d", demResult.NewLevel)
	}

	// Now at L2, check if same stats would immediately re-promote
	// L2→L3 requires accuracy >= 0.90 — but we're at 0.82
	progResult := EvaluateProgression(demotionStats, MaturityL2Assist)
	if progResult.Changed {
		t.Errorf("unexpected re-promotion right after demotion: %s", progResult.Reason)
	}
}

// ─── Metadata Tests ────────────────────────────────────────────────────────

func TestMaturityLevelName(t *testing.T) {
	tests := []struct {
		level MaturityLevel
		want  string
	}{
		{MaturityL1Shadow, "Shadow"},
		{MaturityL2Assist, "Assist"},
		{MaturityL3Supervised, "Supervised"},
		{MaturityL4Autonomous, "Autonomous"},
		{MaturityL5Sentinel, "Sentinel"},
		{MaturityLevel(99), "Unknown"},
	}

	for _, tc := range tests {
		got := MaturityLevelName(tc.level)
		if got != tc.want {
			t.Errorf("MaturityLevelName(%d) = %q, want %q", tc.level, got, tc.want)
		}
	}
}

func TestNextMaturityLevel(t *testing.T) {
	tests := []struct {
		current MaturityLevel
		want    MaturityLevel
	}{
		{MaturityL1Shadow, MaturityL2Assist},
		{MaturityL2Assist, MaturityL3Supervised},
		{MaturityL3Supervised, MaturityL4Autonomous},
		{MaturityL4Autonomous, MaturityL5Sentinel},
		{MaturityL5Sentinel, MaturityL5Sentinel}, // stays at max
	}

	for _, tc := range tests {
		got := NextMaturityLevel(tc.current)
		if got != tc.want {
			t.Errorf("NextMaturityLevel(%d) = %d, want %d", tc.current, got, tc.want)
		}
	}
}

func TestGetProgressionRules(t *testing.T) {
	// L1 should have progression rules
	rules := GetProgressionRules(MaturityL1Shadow)
	if rules == nil {
		t.Fatal("expected progression rules for L1")
	}
	if rules.MinDecisions != 100 {
		t.Errorf("expected MinDecisions 100, got %d", rules.MinDecisions)
	}

	// L5 should not have progression rules (max level)
	rules = GetProgressionRules(MaturityL5Sentinel)
	if rules != nil {
		t.Error("expected nil progression rules for L5 (max level)")
	}
}

func TestMaturityLevelDescription(t *testing.T) {
	// All defined levels should have descriptions
	for _, level := range []MaturityLevel{
		MaturityL1Shadow,
		MaturityL2Assist,
		MaturityL3Supervised,
		MaturityL4Autonomous,
		MaturityL5Sentinel,
	} {
		desc := MaturityLevelDescription(level)
		if desc == "" {
			t.Errorf("expected non-empty description for level %d", level)
		}
	}

	// Unknown level should return empty string
	desc := MaturityLevelDescription(MaturityLevel(99))
	if desc != "" {
		t.Errorf("expected empty description for unknown level, got %q", desc)
	}
}
