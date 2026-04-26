package domain

import "errors"

// Compliance-related sentinel errors for the LLM provider layer.
var (
	// ErrLLMDisabled is returned when the org's compliance policy forbids LLM processing.
	ErrLLMDisabled = errors.New("llm processing disabled by org policy")

	// ErrNoApprovedProvider is returned when no provider satisfies the org's compliance policy.
	ErrNoApprovedProvider = errors.New("no approved llm provider for org")

	// ErrDataRegionMismatch is returned when the provider's data region doesn't match the org's.
	ErrDataRegionMismatch = errors.New("provider data region does not match org policy")

	// ErrBudgetExceeded is returned when the org's monthly LLM budget is exhausted.
	ErrBudgetExceeded = errors.New("monthly llm budget exceeded")

	// ErrContentTooLarge is returned when the code content exceeds the provider's context window.
	ErrContentTooLarge = errors.New("code content exceeds maximum tokens for provider")

	// ErrProviderUnreachable is returned when the LLM provider is unreachable after retries.
	ErrProviderUnreachable = errors.New("llm provider unreachable")
)