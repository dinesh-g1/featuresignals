package codeanalysis

import (
	"context"
)

// CodeAnalysisProvider defines the interface for LLM-powered code analysis.
type CodeAnalysisProvider interface {
	// Name returns the provider identifier (e.g., "deepseek", "openai").
	Name() string

	// AnalyzeFlagReferences analyzes all references to a flag key across
	// multiple files and determines safe removal paths.
	AnalyzeFlagReferences(ctx context.Context, request AnalyzeRequest) (*AnalyzeResponse, error)

	// GeneratePRDescription creates a human-readable PR description.
	GeneratePRDescription(ctx context.Context, flagKey, flagName string, changes []FileChange) (string, error)

	// ValidateCleanup validates semantic equivalence of cleaned code.
	ValidateCleanup(ctx context.Context, request ValidateRequest) (*ValidateResponse, error)
}

// AnalyzeRequest contains all context needed for flag analysis.
type AnalyzeRequest struct {
	FlagKey       string
	FlagName      string
	TrueBranch    string            // "true" or "false"
	DaysServed    int
	Files         map[string][]byte // path → content for ALL relevant files
	Language      string
	RepositoryURL string
}

// AnalyzeResponse contains per-file and overall analysis results.
type AnalyzeResponse struct {
	OverallSafe bool
	Confidence  float64
	Files       []FileAnalysisResult
	Summary     string
	TokenUsage  TokenUsage
}

// FileAnalysisResult contains per-file analysis results.
type FileAnalysisResult struct {
	FilePath    string
	Safe        bool
	References  []FlagReferenceAnalysis
	CleanedCode []byte
	Issues      []string
}

// FlagReferenceAnalysis describes a single reference to a flag.
type FlagReferenceAnalysis struct {
	Line          int
	Column        int
	ReferenceType string // "evaluation", "conditional", "logging", "pass_through"
	SafeToRemove  bool
	KeepBranch    string // "true_branch", "false_branch", "both", "neither"
	Reason        string
}

// FileChange represents a file to create or modify.
type FileChange struct {
	Path    string
	Content []byte
	Mode    string // "create", "modify", "delete"
}

// ValidateRequest contains original and cleaned code for validation.
type ValidateRequest struct {
	FlagKey      string
	OriginalCode []byte
	CleanedCode  []byte
	ActiveBranch string // "true" or "false"
}

// ValidateResponse contains validation results.
type ValidateResponse struct {
	Valid      bool
	Confidence float64
	Issues     []string
	TokenUsage TokenUsage
}

// TokenUsage tracks LLM token consumption.
type TokenUsage struct {
	PromptTokens     int
	CompletionTokens int
	TotalTokens      int
	Cost             float64
}