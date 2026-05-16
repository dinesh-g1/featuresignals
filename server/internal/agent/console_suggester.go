// Package agent provides the Agent Runtime implementation.
//
// ConsoleSuggester is a rule-based implementation of domain.ConsoleSuggester
// that generates AI suggestions for features on the Console. It uses
// deterministic heuristics — no LLM dependency in Phase 3.
package agent

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Rule-Based Console Suggester ──────────────────────────────────────────

// RuleBasedConsoleSuggester implements domain.ConsoleSuggester with
// deterministic heuristics. Each rule examines a ConsoleFlag and returns
// zero or more AISuggestions.
type RuleBasedConsoleSuggester struct {
	logger *slog.Logger
}

// NewRuleBasedConsoleSuggester creates a new rule-based suggester.
func NewRuleBasedConsoleSuggester(logger *slog.Logger) *RuleBasedConsoleSuggester {
	return &RuleBasedConsoleSuggester{logger: logger}
}

// ─── Interface Implementation ──────────────────────────────────────────────

// SuggestForFlag runs each rule against a single flag and returns
// all matching suggestions.
func (s *RuleBasedConsoleSuggester) SuggestForFlag(ctx context.Context, orgID string, flag domain.ConsoleFlag) ([]domain.AISuggestion, error) {
	var suggestions []domain.AISuggestion

	suggestions = appendRule(suggestions, s.ruleCleanupDetection(flag))
	suggestions = appendRule(suggestions, s.ruleRollbackRisk(flag))
	suggestions = appendRule(suggestions, s.ruleAdvanceReady(flag))
	suggestions = appendRule(suggestions, s.ruleStaleEarlyStage(flag))

	return suggestions, nil
}

// SuggestForOrg runs SuggestForFlag for every flag in the org and returns
// all suggestions across all flags, deduplicated by flag key + type.
func (s *RuleBasedConsoleSuggester) SuggestForOrg(ctx context.Context, orgID string, flags []domain.ConsoleFlag) ([]domain.AISuggestion, error) {
	var all []domain.AISuggestion
	seen := make(map[string]bool)

	for _, f := range flags {
		suggestions, err := s.SuggestForFlag(ctx, orgID, f)
		if err != nil {
			s.logger.Warn("skipping flag due to suggestion error",
				"org_id", orgID,
				"flag_key", f.Key,
				"error", err,
			)
			continue
		}
		for _, sug := range suggestions {
			dedupKey := sug.FlagKey + ":" + sug.Type
			if !seen[dedupKey] {
				seen[dedupKey] = true
				all = append(all, sug)
			}
		}
	}

	return all, nil
}

// ─── Rule 1: Cleanup Detection ─────────────────────────────────────────────
//
// A flag is a cleanup candidate when:
//   - Rollout is at 100%
//   - Status is "live"
//   - Stage is "monitor" or "analyze"
//   - Last action was > 30 days ago
//
// Confidence: 0.9 (high — strong signal)

func (s *RuleBasedConsoleSuggester) ruleCleanupDetection(flag domain.ConsoleFlag) *domain.AISuggestion {
	if flag.RolloutPercent != 100 {
		return nil
	}
	if flag.Status != "live" {
		return nil
	}
	if flag.Stage != domain.StageMonitor && flag.Stage != domain.StageAnalyze {
		return nil
	}
	if flag.LastActionAt == nil {
		return nil
	}

	daysSince := daysSince(*flag.LastActionAt)
	if daysSince < 30 {
		return nil
	}

	return &domain.AISuggestion{
		FlagKey:     flag.Key,
		Type:        domain.AITypeCleanup,
		Priority:    domain.AIPriorityInfo,
		Message:     fmt.Sprintf("%s has been at 100%% rollout for %d days — cleanup may be needed", flag.Name, daysSince),
		Action:      "Create cleanup PR",
		AutoFixable: false,
		Confidence:  0.9,
	}
}

// ─── Rule 2: Rollback Risk ─────────────────────────────────────────────────
//
// A flag is at rollback risk when:
//   - Health score is below 40
//   - Environment is "production"
//   - Stage is "monitor"
//
// Confidence: 0.85 (high — but health scores can be noisy)

func (s *RuleBasedConsoleSuggester) ruleRollbackRisk(flag domain.ConsoleFlag) *domain.AISuggestion {
	if flag.HealthScore >= 40 {
		return nil
	}
	if flag.Environment != "production" {
		return nil
	}
	if flag.Stage != domain.StageMonitor {
		return nil
	}

	return &domain.AISuggestion{
		FlagKey:     flag.Key,
		Type:        domain.AITypeRollbackRisk,
		Priority:    domain.AIPriorityCritical,
		Message:     fmt.Sprintf("%s health is critical at %d/100 in production — rollback risk detected", flag.Name, flag.HealthScore),
		Action:      "Check Monitor stage",
		AutoFixable: false,
		Confidence:  0.85,
	}
}

// ─── Rule 3: Advance Ready ─────────────────────────────────────────────────
//
// A flag is ready to advance when:
//   - There is a next stage (not already at "learn")
//   - Last action was > 7 days ago
//
// Confidence: 0.8 (moderate — depends on team process fit)

func (s *RuleBasedConsoleSuggester) ruleAdvanceReady(flag domain.ConsoleFlag) *domain.AISuggestion {
	nextStage := domain.NextStage(flag.Stage)
	if nextStage == "" {
		return nil
	}
	if flag.LastActionAt == nil {
		return nil
	}

	daysSince := daysSince(*flag.LastActionAt)
	if daysSince < 7 {
		return nil
	}

	return &domain.AISuggestion{
		FlagKey:     flag.Key,
		Type:        domain.AITypeAdvanceReady,
		Priority:    domain.AIPriorityInfo,
		Message:     fmt.Sprintf("%s is ready to advance from %s to %s", flag.Name, flag.Stage, nextStage),
		Action:      fmt.Sprintf("Advance to %s", nextStage),
		AutoFixable: true,
		Confidence:  0.8,
	}
}

// ─── Rule 4: Stale in Early Stage ──────────────────────────────────────────
//
// A flag is stale in an early stage when:
//   - Stage is "plan" or "spec"
//   - Last action was > 60 days ago
//
// Confidence: 0.7 (moderate — could be intentional parking)

func (s *RuleBasedConsoleSuggester) ruleStaleEarlyStage(flag domain.ConsoleFlag) *domain.AISuggestion {
	if flag.Stage != domain.StagePlan && flag.Stage != domain.StageSpec {
		return nil
	}
	if flag.LastActionAt == nil {
		return nil
	}

	daysSince := daysSince(*flag.LastActionAt)
	if daysSince < 60 {
		return nil
	}

	return &domain.AISuggestion{
		FlagKey:     flag.Key,
		Type:        domain.AITypeHealthWarning,
		Priority:    domain.AIPriorityWarning,
		Message:     fmt.Sprintf("%s has been in %s for %d days — review or archive", flag.Name, flag.Stage, daysSince),
		Action:      "Review or archive",
		AutoFixable: false,
		Confidence:  0.7,
	}
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// daysSince returns the number of whole days since t, rounded down.
func daysSince(t time.Time) int {
	return int(time.Since(t).Hours() / 24)
}

// appendRule appends a non-nil suggestion to the slice.
func appendRule(suggestions []domain.AISuggestion, sug *domain.AISuggestion) []domain.AISuggestion {
	if sug == nil {
		return suggestions
	}
	return append(suggestions, *sug)
}
