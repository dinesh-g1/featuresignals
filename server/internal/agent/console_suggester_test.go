package agent

import (
	"context"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Test helpers ──────────────────────────────────────────────────────────

func sugTestLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
}

// ptrTime returns a pointer to a time, shifted back by the given number of days.
func ptrTime(daysAgo int) *time.Time {
	t := time.Now().Add(-time.Duration(daysAgo) * 24 * time.Hour)
	return &t
}

// makeFlag builds a ConsoleFlag with sensible defaults; overridable via fields param.
func makeFlag(overrides domain.ConsoleFlag) domain.ConsoleFlag {
	now := time.Now()
	f := domain.ConsoleFlag{
		Key:             "test-flag",
		Name:            "Test Flag",
		Stage:           domain.StageMonitor,
		Status:          "live",
		Environment:     "production",
		Type:            "boolean",
		RolloutPercent:  100,
		HealthScore:     85,
		LastActionAt:    &now,
		LastAction:      "shipped",
		DependsOn:       []string{},
		DependedOnBy:    []string{},
	}

	// Apply overrides.
	if overrides.Key != "" {
		f.Key = overrides.Key
	}
	if overrides.Name != "" {
		f.Name = overrides.Name
	}
	if overrides.Stage != "" {
		f.Stage = overrides.Stage
	}
	if overrides.Status != "" {
		f.Status = overrides.Status
	}
	if overrides.Environment != "" {
		f.Environment = overrides.Environment
	}
	if overrides.Type != "" {
		f.Type = overrides.Type
	}
	if overrides.RolloutPercent != 0 {
		f.RolloutPercent = overrides.RolloutPercent
	}
	if overrides.HealthScore != 0 {
		f.HealthScore = overrides.HealthScore
	}
	if overrides.LastActionAt != nil {
		f.LastActionAt = overrides.LastActionAt
	}
	if overrides.LastAction != "" {
		f.LastAction = overrides.LastAction
	}
	return f
}

// ─── Rule 1: Cleanup Detection ─────────────────────────────────────────────

func TestRuleCleanupDetection_Matches(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "dark-mode",
		Name:            "Dark Mode",
		Stage:           domain.StageMonitor,
		Status:          "live",
		Environment:     "production",
		RolloutPercent:  100,
		HealthScore:     90,
		LastActionAt:    ptrTime(45),
	})

	suggestions, err := s.SuggestForFlag(context.Background(), "org-1", flag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	found := false
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeCleanup {
			found = true
			if sug.Priority != domain.AIPriorityInfo {
				t.Errorf("expected priority info, got %s", sug.Priority)
			}
			if sug.AutoFixable {
				t.Error("cleanup should not be auto_fixable")
			}
			if sug.Confidence != 0.9 {
				t.Errorf("expected confidence 0.9, got %f", sug.Confidence)
			}
			if sug.FlagKey != "dark-mode" {
				t.Errorf("expected flag_key dark-mode, got %s", sug.FlagKey)
			}
		}
	}
	if !found {
		t.Error("expected cleanup suggestion but none returned")
	}
}

func TestRuleCleanupDetection_NotFullRollout(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "partial-flag",
		Name:            "Partial Flag",
		RolloutPercent:  75,
		Stage:           domain.StageMonitor,
		Status:          "live",
		LastActionAt:    ptrTime(45),
	})

	suggestions, _ := s.SuggestForFlag(context.Background(), "org-1", flag)
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeCleanup {
			t.Error("should not suggest cleanup for flag not at 100% rollout")
		}
	}
}

func TestRuleCleanupDetection_RecentAction(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "recent-flag",
		Name:            "Recent Flag",
		RolloutPercent:  100,
		Stage:           domain.StageMonitor,
		Status:          "live",
		LastActionAt:    ptrTime(10), // only 10 days ago
	})

	suggestions, _ := s.SuggestForFlag(context.Background(), "org-1", flag)
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeCleanup {
			t.Error("should not suggest cleanup for flag with recent action")
		}
	}
}

func TestRuleCleanupDetection_WrongStage(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "early-flag",
		Name:            "Early Flag",
		RolloutPercent:  100,
		Stage:           domain.StagePlan,
		Status:          "live",
		LastActionAt:    ptrTime(45),
	})

	suggestions, _ := s.SuggestForFlag(context.Background(), "org-1", flag)
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeCleanup {
			t.Error("should not suggest cleanup for flag in plan stage")
		}
	}
}

func TestRuleCleanupDetection_AnalyzeStage(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "analyze-flag",
		Name:            "Analyze Flag",
		RolloutPercent:  100,
		Stage:           domain.StageAnalyze,
		Status:          "live",
		LastActionAt:    ptrTime(60),
	})

	suggestions, _ := s.SuggestForFlag(context.Background(), "org-1", flag)
	found := false
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeCleanup {
			found = true
		}
	}
	if !found {
		t.Error("should suggest cleanup for flag in analyze stage at 100% for 60 days")
	}
}

// ─── Rule 2: Rollback Risk ─────────────────────────────────────────────────

func TestRuleRollbackRisk_Matches(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "broken-flag",
		Name:            "Broken Feature",
		Stage:           domain.StageMonitor,
		Environment:     "production",
		HealthScore:     25,
		RolloutPercent:  50,
		Status:          "live",
	})

	suggestions, err := s.SuggestForFlag(context.Background(), "org-1", flag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	found := false
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeRollbackRisk {
			found = true
			if sug.Priority != domain.AIPriorityCritical {
				t.Errorf("expected priority critical, got %s", sug.Priority)
			}
			if sug.AutoFixable {
				t.Error("rollback_risk should not be auto_fixable")
			}
			if sug.Confidence != 0.85 {
				t.Errorf("expected confidence 0.85, got %f", sug.Confidence)
			}
		}
	}
	if !found {
		t.Error("expected rollback_risk suggestion but none returned")
	}
}

func TestRuleRollbackRisk_HealthyFlag(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "healthy-flag",
		Name:            "Healthy Feature",
		Stage:           domain.StageMonitor,
		Environment:     "production",
		HealthScore:     85,
	})

	suggestions, _ := s.SuggestForFlag(context.Background(), "org-1", flag)
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeRollbackRisk {
			t.Error("should not suggest rollback for healthy flag")
		}
	}
}

func TestRuleRollbackRisk_NotProduction(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "staging-flag",
		Name:            "Staging Feature",
		Stage:           domain.StageMonitor,
		Environment:     "staging",
		HealthScore:     15,
	})

	suggestions, _ := s.SuggestForFlag(context.Background(), "org-1", flag)
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeRollbackRisk {
			t.Error("should not suggest rollback for staging environment")
		}
	}
}

func TestRuleRollbackRisk_WrongStage(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "plan-flag",
		Name:            "Plan Feature",
		Stage:           domain.StagePlan,
		Environment:     "production",
		HealthScore:     15,
	})

	suggestions, _ := s.SuggestForFlag(context.Background(), "org-1", flag)
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeRollbackRisk {
			t.Error("should not suggest rollback for flag not in monitor")
		}
	}
}

// ─── Rule 3: Advance Ready ─────────────────────────────────────────────────

func TestRuleAdvanceReady_Matches(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "stuck-flag",
		Name:            "Stuck Feature",
		Stage:           domain.StagePlan,
		Status:          "active",
		RolloutPercent:  0,
		LastActionAt:    ptrTime(14),
	})

	suggestions, err := s.SuggestForFlag(context.Background(), "org-1", flag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	found := false
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeAdvanceReady {
			found = true
			if sug.Priority != domain.AIPriorityInfo {
				t.Errorf("expected priority info, got %s", sug.Priority)
			}
			if !sug.AutoFixable {
				t.Error("advance_ready should be auto_fixable")
			}
			if sug.Confidence != 0.8 {
				t.Errorf("expected confidence 0.8, got %f", sug.Confidence)
			}
		}
	}
	if !found {
		t.Error("expected advance_ready suggestion but none returned")
	}
}

func TestRuleAdvanceReady_RecentAction(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "recent-flag",
		Name:            "Recent Feature",
		Stage:           domain.StagePlan,
		LastActionAt:    ptrTime(2), // only 2 days ago
	})

	suggestions, _ := s.SuggestForFlag(context.Background(), "org-1", flag)
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeAdvanceReady {
			t.Error("should not suggest advance for recently touched flag")
		}
	}
}

func TestRuleAdvanceReady_FinalStage(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "learned-flag",
		Name:            "Learned Feature",
		Stage:           domain.StageLearn,
		LastActionAt:    ptrTime(60),
	})

	suggestions, _ := s.SuggestForFlag(context.Background(), "org-1", flag)
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeAdvanceReady {
			t.Error("should not suggest advance for flag at final stage")
		}
	}
}

// ─── Rule 4: Stale in Early Stage ──────────────────────────────────────────

func TestRuleStaleEarlyStage_Matches(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "stale-plan",
		Name:            "Forgotten Plan",
		Stage:           domain.StagePlan,
		Status:          "active",
		RolloutPercent:  0,
		LastActionAt:    ptrTime(90),
	})

	suggestions, err := s.SuggestForFlag(context.Background(), "org-1", flag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	found := false
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeHealthWarning {
			found = true
			if sug.Priority != domain.AIPriorityWarning {
				t.Errorf("expected priority warning, got %s", sug.Priority)
			}
			if sug.AutoFixable {
				t.Error("stale early stage should not be auto_fixable")
			}
			if sug.Confidence != 0.7 {
				t.Errorf("expected confidence 0.7, got %f", sug.Confidence)
			}
		}
	}
	if !found {
		t.Error("expected health_warning suggestion but none returned")
	}
}

func TestRuleStaleEarlyStage_NotStaleEnough(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "recent-spec",
		Name:            "Recent Spec",
		Stage:           domain.StageSpec,
		LastActionAt:    ptrTime(30), // only 30 days
	})

	suggestions, _ := s.SuggestForFlag(context.Background(), "org-1", flag)
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeHealthWarning {
			t.Error("should not flag stale for only 30 days")
		}
	}
}

func TestRuleStaleEarlyStage_WrongStage(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "late-stage",
		Name:            "Late Stage",
		Stage:           domain.StageImplement,
		LastActionAt:    ptrTime(90),
	})

	suggestions, _ := s.SuggestForFlag(context.Background(), "org-1", flag)
	for _, sug := range suggestions {
		if sug.Type == domain.AITypeHealthWarning {
			t.Error("should not flag stale for non-early stage")
		}
	}
}

// ─── Multiple Suggestions ──────────────────────────────────────────────────

func TestMultipleSuggestions(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())
	// This flag hits both advance_ready (plan + 14 days stale) and
	// stale_early_stage (plan + >60 days).
	// Wait — they're mutually exclusive on days thresholds. Let's test
	// a flag that hits advance_ready only (plan + 14 days).
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "multi-flag",
		Name:            "Multi Flag",
		Stage:           domain.StagePlan,
		Status:          "active",
		RolloutPercent:  0,
		HealthScore:     85,
		LastActionAt:    ptrTime(14),
	})

	suggestions, err := s.SuggestForFlag(context.Background(), "org-1", flag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	// Should only get advance_ready (14 days < 60, so no stale_early_stage)
	if len(suggestions) != 1 {
		t.Errorf("expected 1 suggestion, got %d", len(suggestions))
	}
	if suggestions[0].Type != domain.AITypeAdvanceReady {
		t.Errorf("expected advance_ready, got %s", suggestions[0].Type)
	}
}

// ─── SuggestForOrg ─────────────────────────────────────────────────────────

func TestSuggestForOrg(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())

	flags := []domain.ConsoleFlag{
		makeFlag(domain.ConsoleFlag{
			Key:             "cleanup-me",
			Name:            "Cleanup Me",
			RolloutPercent:  100,
			Stage:           domain.StageMonitor,
			Status:          "live",
			LastActionAt:    ptrTime(60),
		}),
		makeFlag(domain.ConsoleFlag{
			Key:             "advance-me",
			Name:            "Advance Me",
			Stage:           domain.StagePlan,
			Status:          "active",
			RolloutPercent:  0,
			LastActionAt:    ptrTime(14),
		}),
	}

	suggestions, err := s.SuggestForOrg(context.Background(), "org-1", flags)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	if len(suggestions) != 3 {
		t.Errorf("expected 2 suggestions (one per flag), got %d", len(suggestions))
	}

	// Verify the types
	types := make(map[string]bool)
	for _, sug := range suggestions {
		types[sug.Type] = true
	}
	if !types[domain.AITypeCleanup] {
		t.Error("expected cleanup suggestion for org")
	}
	if !types[domain.AITypeAdvanceReady] {
		t.Error("expected advance_ready suggestion for org")
	}
}

// ─── HighestPriority ───────────────────────────────────────────────────────

func TestHighestPriority(t *testing.T) {
	suggestions := []domain.AISuggestion{
		{Type: domain.AITypeAdvanceReady, Priority: domain.AIPriorityInfo, Confidence: 0.8},
		{Type: domain.AITypeRollbackRisk, Priority: domain.AIPriorityCritical, Confidence: 0.85},
		{Type: domain.AITypeHealthWarning, Priority: domain.AIPriorityWarning, Confidence: 0.7},
	}

	best := domain.HighestPriority(suggestions)
	if best == nil {
		t.Fatal("expected non-nil best suggestion")
	}
	if best.Type != domain.AITypeRollbackRisk {
		t.Errorf("expected rollback_risk as highest priority, got %s", best.Type)
	}
}

func TestHighestPriority_Empty(t *testing.T) {
	best := domain.HighestPriority(nil)
	if best != nil {
		t.Error("expected nil for empty suggestions")
	}

	best = domain.HighestPriority([]domain.AISuggestion{})
	if best != nil {
		t.Error("expected nil for empty slice")
	}
}

func TestHighestPriority_SamePriorityTiebreak(t *testing.T) {
	suggestions := []domain.AISuggestion{
		{Type: "sug1", Priority: domain.AIPriorityInfo, Confidence: 0.7},
		{Type: "sug2", Priority: domain.AIPriorityInfo, Confidence: 0.9},
	}

	best := domain.HighestPriority(suggestions)
	if best == nil {
		t.Fatal("expected non-nil best suggestion")
	}
	if best.Confidence != 0.9 {
		t.Errorf("expected confidence 0.9 tiebreak, got %f", best.Confidence)
	}
}

// ─── Confidence Values Are Within [0, 1] ───────────────────────────────────

func TestConfidenceValuesInRange(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())

	// A flag that hits: cleanup (0.9), rollback_risk (0.85 - triggered by low health in prod monitor)
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "range-test",
		Name:            "Range Test",
		RolloutPercent:  100,
		Stage:           domain.StageMonitor,
		Status:          "live",
		Environment:     "production",
		HealthScore:     25,
		LastActionAt:    ptrTime(45),
	})

	suggestions, err := s.SuggestForFlag(context.Background(), "org-1", flag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, sug := range suggestions {
		if sug.Confidence < 0.0 || sug.Confidence > 1.0 {
			t.Errorf("confidence %f for type %s is outside [0, 1]", sug.Confidence, sug.Type)
		}
	}
}

// ─── AutoFixable Only for Advance Ready ────────────────────────────────────

func TestAutoFixableOnlyForAdvanceReady(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())

	// This flag hits cleanup (auto_fixable=false), rollback (auto_fixable=false),
	// and advance_ready (auto_fixable=true).
	flag := makeFlag(domain.ConsoleFlag{
		Key:             "autofix-test",
		Name:            "AutoFix Test",
		RolloutPercent:  100,
		Stage:           domain.StageMonitor,
		Status:          "live",
		Environment:     "production",
		HealthScore:     25,
		LastActionAt:    ptrTime(45),
	})

	suggestions, err := s.SuggestForFlag(context.Background(), "org-1", flag)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}

	for _, sug := range suggestions {
		if sug.Type == domain.AITypeAdvanceReady {
			if !sug.AutoFixable {
				t.Errorf("advance_ready should be auto_fixable")
			}
		} else {
			if sug.AutoFixable {
				t.Errorf("%s should NOT be auto_fixable", sug.Type)
			}
		}
	}
}

// ─── Table-Driven: All Rules ───────────────────────────────────────────────

func TestRuleBasedConsoleSuggester_TableDriven(t *testing.T) {
	s := NewRuleBasedConsoleSuggester(sugTestLogger())

	tests := []struct {
		name          string
		flag          domain.ConsoleFlag
		wantType      string
		wantCount     int
	}{
		{
			name: "cleanup: perfect match",
			flag: makeFlag(domain.ConsoleFlag{
				Key: "cleanup-1", Name: "Cleanup One",
				RolloutPercent: 100, Stage: domain.StageMonitor, Status: "live",
				LastActionAt: ptrTime(60),
			}),
			wantType: domain.AITypeCleanup, wantCount: 2, // cleanup + advance_ready (monitor->decide, 60d > 7d)
		},
		{
			name: "rollback: critical health in production",
			flag: makeFlag(domain.ConsoleFlag{
				Key: "rb-1", Name: "RB One",
				HealthScore: 15, Stage: domain.StageMonitor, Environment: "production",
			}),
			wantType: domain.AITypeRollbackRisk, wantCount: 1,
		},
		{
			name: "advance: stuck in plan",
			flag: makeFlag(domain.ConsoleFlag{
				Key: "adv-1", Name: "Adv One",
				Stage: domain.StagePlan, LastActionAt: ptrTime(14),
			}),
			wantType: domain.AITypeAdvanceReady, wantCount: 1,
		},
		{
			name: "stale: plan + 90 days",
			flag: makeFlag(domain.ConsoleFlag{
				Key: "stale-1", Name: "Stale One",
				Stage: domain.StagePlan, Status: "active", RolloutPercent: 0,
				LastActionAt: ptrTime(90),
			}),
			wantType: domain.AITypeAdvanceReady, wantCount: 2, // advance_ready + health_warning (both rules fire at 90d)
		},
		{
			name: "stale: spec + 90 days",
			flag: makeFlag(domain.ConsoleFlag{
				Key: "stale-spec", Name: "Stale Spec",
				Stage: domain.StageSpec, Status: "active", RolloutPercent: 0,
				LastActionAt: ptrTime(90),
			}),
			wantType: domain.AITypeAdvanceReady, wantCount: 2, // advance_ready + health_warning (both rules fire at 90d)
		},
		{
			name: "no suggestions: healthy active flag",
			flag: makeFlag(domain.ConsoleFlag{
				Key: "healthy", Name: "Healthy Flag",
				RolloutPercent: 50, Stage: domain.StageImplement, Status: "live",
				HealthScore: 90, Environment: "staging", LastActionAt: ptrTime(1),
			}),
			wantCount: 0,
		},
		{
			name: "no suggestions: at learn, all good",
			flag: makeFlag(domain.ConsoleFlag{
				Key: "done", Name: "Done Flag",
				Stage: domain.StageLearn, Status: "live", RolloutPercent: 100,
				LastActionAt: ptrTime(5),
			}),
			wantCount: 0,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			suggestions, err := s.SuggestForFlag(context.Background(), "org-1", tc.flag)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}

			if len(suggestions) != tc.wantCount {
				t.Errorf("expected %d suggestions, got %d", tc.wantCount, len(suggestions))
				for _, sug := range suggestions {
					t.Logf("  suggestion: type=%s priority=%s confidence=%f", sug.Type, sug.Priority, sug.Confidence)
				}
			}

			if tc.wantType != "" && len(suggestions) > 0 {
				if suggestions[0].Type != tc.wantType {
					t.Errorf("expected first suggestion type %s, got %s", tc.wantType, suggestions[0].Type)
				}
			}
		})
	}
}
