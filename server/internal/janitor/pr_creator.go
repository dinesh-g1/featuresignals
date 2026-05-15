// Package janitor implements the AI-driven stale flag detection and cleanup engine.
//
// PRCreator creates pull requests for Code2Flag-generated feature flags. It uses
// the GitProvider interface to create branches, commit implementation code, and
// open pull requests with proper metadata.
//
// Requirements addressed:
//
//	FS-S0-INT-001-RL-01 — Rate limit tracking
//	FS-S0-INT-001-RL-02 — Exponential backoff on rate limit exhaustion (3 retries)
package janitor

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store"
)

// ─── PRCreator ──────────────────────────────────────────────────────────────

// PRCreator creates pull requests for Code2Flag-generated feature flags.
// It uses the GitProvider interface to create branches, commit implementation
// code, and open pull requests.
type PRCreator struct {
	providerFactory func(orgID string) (GitProvider, error)
	janitorStore    store.JanitorStore
	code2flagReader domain.Code2FlagReader
	code2flagWriter domain.Code2FlagWriter
	logger          *slog.Logger
}

// NewPRCreator creates a PRCreator with the required dependencies.
// providerFactory creates a GitProvider from an org's stored token.
func NewPRCreator(
	providerFactory func(orgID string) (GitProvider, error),
	janitorStore store.JanitorStore,
	code2flagReader domain.Code2FlagReader,
	code2flagWriter domain.Code2FlagWriter,
	logger *slog.Logger,
) *PRCreator {
	if logger == nil {
		logger = slog.Default()
	}
	return &PRCreator{
		providerFactory: providerFactory,
		janitorStore:    janitorStore,
		code2flagReader: code2flagReader,
		code2flagWriter: code2flagWriter,
		logger:          logger.With("component", "pr_creator"),
	}
}

// ─── CreateImplementationPR ─────────────────────────────────────────────────

// CreateImplementationPR creates a pull request with the implementation code
// for a generated feature flag. It performs the following steps:
//
//  1. Load the GeneratedFlag and associated repository connection.
//  2. Create a GitProvider from the org's stored token.
//  3. Create a feature branch (fs/flag-{key}).
//  4. Generate implementation code using language templates.
//  5. Commit the changes and open a PR.
//  6. Update the GeneratedFlag with PR URL and status.
//
// Rate limiting is handled with exponential backoff (3 retries: 100ms → 1s → 10s).
func (c *PRCreator) CreateImplementationPR(ctx context.Context, orgID, generatedFlagID string) error {
	logger := c.logger.With("org_id", orgID, "generated_flag_id", generatedFlagID)

	// 1. Load the generated flag.
	gf, err := c.code2flagReader.GetGeneratedFlag(ctx, generatedFlagID)
	if err != nil {
		return fmt.Errorf("getting generated flag %s: %w", generatedFlagID, err)
	}

	logger = logger.With("flag_key", gf.Key)

	// 2. Find the repository connection for this org.
	repos, err := c.janitorStore.ListRepositories(ctx, orgID, 50, 0)
	if err != nil {
		return fmt.Errorf("listing repositories for org %s: %w", orgID, err)
	}

	var targetRepo *store.JanitorRepository
	for i := range repos {
		if repos[i].Connected {
			targetRepo = &repos[i]
			break
		}
	}
	if targetRepo == nil {
		return fmt.Errorf("no connected repository found for org %s", orgID)
	}

	logger = logger.With("repo", targetRepo.FullName, "provider", targetRepo.Provider)

	// 3. Create a GitProvider from the org's stored token.
	provider, err := c.providerFactory(orgID)
	if err != nil {
		return fmt.Errorf("creating git provider for org %s: %w", orgID, err)
	}

	// 4. Create the feature branch.
	branchName := fmt.Sprintf("fs/flag-%s", gf.Key)

	if err := c.createBranchWithRetry(ctx, provider, targetRepo.FullName, branchName, targetRepo.DefaultBranch, logger); err != nil {
		return fmt.Errorf("creating branch %s: %w", branchName, err)
	}

	// 5. Generate implementation code.
	codeSnippet := c.generateImplementationCode(gf.Key, gf.FlagType)

	// Determine the file path based on the source scan result (if available).
	filePath := c.determineFilePath(gf)

	// 6. Prepare file changes.
	changes := []FileChange{
		{
			Path:    filePath,
			Content: []byte(codeSnippet),
			Mode:    "create",
		},
	}

	// 7. Create the PR with retry logic.
	prTitle := fmt.Sprintf("Feature Flag: %s", gf.Key)
	prBody := c.buildPRBody(gf)

	pr, err := c.createPRWithRetry(ctx, provider, targetRepo.FullName, branchName, prTitle, prBody, changes, logger)
	if err != nil {
		return fmt.Errorf("creating PR for flag %s: %w", gf.Key, err)
	}

	logger.Info("PR created",
		"pr_url", pr.URL,
		"pr_number", pr.Number,
		"branch", branchName,
	)

	// 8. Update the GeneratedFlag with PR URL and status.
	updates := map[string]interface{}{
		"pr_url": pr.URL,
		"status": domain.GeneratedFlagStatusPRCreated,
	}
	if err := c.code2flagWriter.UpdateGeneratedFlag(ctx, generatedFlagID, updates); err != nil {
		return fmt.Errorf("updating generated flag %s: %w", generatedFlagID, err)
	}

	// 9. Record the PR in the janitor store for tracking.
	janitorPR := &store.JanitorPR{
		ID:           gf.ID, // reuse generated flag ID
		OrgID:        orgID,
		FlagKey:      gf.Key,
		RepositoryID: targetRepo.ID,
		Provider:     targetRepo.Provider,
		PRNumber:     pr.Number,
		PRURL:        pr.URL,
		BranchName:   branchName,
		Status:       "open",
		CreatedAt:    time.Now().UTC(),
		UpdatedAt:    time.Now().UTC(),
	}
	if err := c.janitorStore.CreateJanitorPR(ctx, janitorPR); err != nil {
		logger.Warn("failed to record janitor PR", "error", err)
	}

	return nil
}

// ─── Branch Creation with Retry ─────────────────────────────────────────────

// createBranchWithRetry attempts to create a branch with exponential backoff
// for rate-limited responses.
func (c *PRCreator) createBranchWithRetry(
	ctx context.Context,
	provider GitProvider,
	repo, branch, baseBranch string,
	logger *slog.Logger,
) error {
	backoffs := []time.Duration{100 * time.Millisecond, 1 * time.Second, 10 * time.Second}

	for attempt := 0; attempt <= len(backoffs); attempt++ {
		err := provider.CreateBranch(ctx, repo, branch, baseBranch)
		if err == nil {
			return nil
		}

		// Check if this is a rate limit error or transient failure.
		if isRateLimitError(err) && attempt < len(backoffs) {
			delay := backoffs[attempt]
			logger.Warn("rate limited on branch creation, retrying",
				"attempt", attempt+1,
				"delay_ms", delay.Milliseconds(),
				"repo", repo,
			)
			select {
			case <-ctx.Done():
				return ctx.Err()
			case <-time.After(delay):
			}
			continue
		}

		return fmt.Errorf("creating branch %s in %s (attempt %d): %w", branch, repo, attempt+1, err)
	}

	return fmt.Errorf("creating branch %s in %s: all retries exhausted", branch, repo)
}

// createPRWithRetry attempts to create a PR with exponential backoff
// for rate-limited responses.
func (c *PRCreator) createPRWithRetry(
	ctx context.Context,
	provider GitProvider,
	repo, branch, title, body string,
	changes []FileChange,
	logger *slog.Logger,
) (*PR, error) {
	backoffs := []time.Duration{100 * time.Millisecond, 1 * time.Second, 10 * time.Second}

	for attempt := 0; attempt <= len(backoffs); attempt++ {
		pr, err := provider.CreatePullRequest(ctx, repo, branch, title, body, changes)
		if err == nil {
			return pr, nil
		}

		if isRateLimitError(err) && attempt < len(backoffs) {
			delay := backoffs[attempt]
			logger.Warn("rate limited on PR creation, retrying",
				"attempt", attempt+1,
				"delay_ms", delay.Milliseconds(),
				"repo", repo,
			)
			select {
			case <-ctx.Done():
				return nil, ctx.Err()
			case <-time.After(delay):
			}
			continue
		}

		return nil, fmt.Errorf("creating PR in %s (attempt %d): %w", repo, attempt+1, err)
	}

	return nil, fmt.Errorf("creating PR in %s: all retries exhausted", repo)
}

// ─── Code Generation ────────────────────────────────────────────────────────

// generateImplementationCode produces a language-specific code snippet for
// implementing a feature flag. It mirrors the handler logic in code2flag.go
// so generated PRs are consistent with the API snippets.
func (c *PRCreator) generateImplementationCode(flagKey, flagType string) string {
	// Default to TypeScript (most common for web applications).
	language := "typescript"
	_ = flagType // future: adjust snippet based on flag type

	switch strings.ToLower(language) {
	case "typescript", "ts":
		return fmt.Sprintf(`import { isEnabled } from '@featuresignals/sdk';

if (isEnabled('%s')) {
  // New feature code here
} else {
  // Existing behavior
}
`, flagKey)
	case "javascript", "js":
		return fmt.Sprintf(`const { isEnabled } = require('@featuresignals/sdk');

if (isEnabled('%s')) {
  // New feature code here
} else {
  // Existing behavior
}
`, flagKey)
	case "python", "py":
		return fmt.Sprintf(`from featuresignals import is_enabled

if is_enabled('%s'):
    # New feature code here
    pass
else:
    # Existing behavior
    pass
`, flagKey)
	case "go", "golang":
		return fmt.Sprintf(`import "github.com/featuresignals/sdk-go"

if featuresignals.IsEnabled(ctx, "%s") {
    // New feature code here
} else {
    // Existing behavior
}
`, flagKey)
	case "java":
		return fmt.Sprintf(`import com.featuresignals.sdk.FeatureSignals;

if (FeatureSignals.isEnabled("%s")) {
    // New feature code here
} else {
    // Existing behavior
}
`, flagKey)
	case "ruby", "rb":
		return fmt.Sprintf(`require 'featuresignals'

if FeatureSignals.is_enabled？('%s')
  # New feature code here
else
  # Existing behavior
end
`, flagKey)
	default:
		return fmt.Sprintf(`// Feature flag: %s
// Replace with your SDK's evaluation call
if (evaluateFlag("%s")) {
  // New feature code
} else {
  // Existing behavior
}
`, flagKey, flagKey)
	}
}

// ─── Helpers ────────────────────────────────────────────────────────────────

// determineFilePath returns the best file path for the implementation code.
func (c *PRCreator) determineFilePath(gf *domain.GeneratedFlag) string {
	// If we have a source scan result, we can infer the file path from that.
	// For now, place the flag in a standard feature flags directory.
	return fmt.Sprintf("src/features/%s.ts", strings.ReplaceAll(gf.Key, "-", "_"))
}

// buildPRBody creates a well-formatted PR body with Code2Flag metadata.
func (c *PRCreator) buildPRBody(gf *domain.GeneratedFlag) string {
	var b strings.Builder

	b.WriteString("## Feature Flag Implementation\n\n")
	b.WriteString("This PR implements the feature flag generated by **Code2Flag**.\n\n")

	b.WriteString("### Flag Details\n\n")
	b.WriteString("| Field | Value |\n")
	b.WriteString("|-------|-------|\n")
	fmt.Fprintf(&b, "| **Key** | `%s` |\n", gf.Key)
	fmt.Fprintf(&b, "| **Name** | %s |\n", gf.Name)
	fmt.Fprintf(&b, "| **Type** | `%s` |\n", gf.FlagType)
	fmt.Fprintf(&b, "| **Generated Flag ID** | `%s` |\n", gf.ID)

	b.WriteString("\n### Description\n\n")
	if gf.Description != "" {
		b.WriteString(gf.Description)
	} else {
		b.WriteString("Auto-generated feature flag for conditional logic discovered in the codebase.")
	}

	b.WriteString("\n\n### Next Steps\n\n")
	b.WriteString("1. Review the implementation code and adjust as needed.\n")
	b.WriteString("2. Merge this PR to create the feature flag in your codebase.\n")
	b.WriteString("3. Configure targeting rules in the [FeatureSignals Dashboard](")
	b.WriteString("https://app.featuresignals.com")
	b.WriteString(").\n")
	b.WriteString("4. Monitor flag evaluation metrics before rolling out.\n")

	b.WriteString("\n---\n")
	b.WriteString("*Generated by FeatureSignals Code2Flag — automated feature flag lifecycle management.*\n")

	return b.String()
}

// isRateLimitError checks whether an error is related to rate limiting.
// This inspects the error string for common rate limit indicators.
func isRateLimitError(err error) bool {
	if err == nil {
		return false
	}
	msg := strings.ToLower(err.Error())
	return strings.Contains(msg, "rate limit") ||
		strings.Contains(msg, "429") ||
		strings.Contains(msg, "too many requests") ||
		strings.Contains(msg, "secondary rate limit")
}
