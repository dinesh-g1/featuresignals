package domain

import "context"

// ConsoleSuggester generates AI suggestions for features on the Console.
//
// Implementation uses rules/heuristics in Phase 3 (no LLM dependency yet).
// LLM integration is added in Phase 4+.
//
// Each method returns a slice of AISuggestion — the caller picks the
// highest-priority one (or all) based on the use case.
type ConsoleSuggester interface {
	// SuggestForFlag returns suggestions for a single feature.
	SuggestForFlag(ctx context.Context, orgID string, flag ConsoleFlag) ([]AISuggestion, error)

	// SuggestForOrg returns suggestions across all features in an org.
	SuggestForOrg(ctx context.Context, orgID string, flags []ConsoleFlag) ([]AISuggestion, error)
}
