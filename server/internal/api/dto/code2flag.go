package dto

import "encoding/json"

// ─── Reference Types ──────────────────────────────────────────────────────

// Code2FlagReferenceItem represents a single scan result (discovered conditional
// in code) returned in the references list endpoint.
type Code2FlagReferenceItem struct {
	ID              string  `json:"id"`
	Repository      string  `json:"repository"`
	FilePath        string  `json:"file_path"`
	LineNumber      int     `json:"line_number"`
	ConditionalType string  `json:"conditional_type"`
	ConditionalText string  `json:"conditional_text"`
	Confidence      float64 `json:"confidence"`
	Status          string  `json:"status"`
	ReferenceType   string  `json:"reference_type"` // usage, definition, cleanup_candidate
}

// ListReferencesResponse is the paginated response for GET /v1/code2flag/references.
type ListReferencesResponse struct {
	Data  []Code2FlagReferenceItem `json:"data"`
	Total int                      `json:"total"`
}

// ─── Spec Types ───────────────────────────────────────────────────────────

// CreateSpecRequest is the request body for POST /v1/code2flag/spec.
type CreateSpecRequest struct {
	FlagKey    string   `json:"flag_key"`
	RepoName   string   `json:"repo_name"`
	ProjectID  string   `json:"project_id"`
	References []string `json:"references,omitempty"`
}

// CreateSpecResponse is returned after generating a feature flag specification.
type CreateSpecResponse struct {
	FlagKey           string          `json:"flag_key"`
	FlagName          string          `json:"flag_name"`
	FlagType          string          `json:"flag_type"`
	SuggestedVariants json.RawMessage `json:"suggested_variants,omitempty"`
	Confidence        float64         `json:"confidence"`
	CreatedAt         string          `json:"created_at"`
}

// ─── Implement Types ──────────────────────────────────────────────────────

// CreateImplementRequest is the request body for POST /v1/code2flag/implement.
type CreateImplementRequest struct {
	FlagKey    string `json:"flag_key"`
	RepoName   string `json:"repo_name"`
	ProjectID  string `json:"project_id"`
	Language   string `json:"language"`
	FilePath   string `json:"file_path"`
	LineNumber int    `json:"line_number"`
}

// CreateImplementResponse is returned after generating implementation code.
type CreateImplementResponse struct {
	CodeSnippet string `json:"code_snippet"`
	Language    string `json:"language"`
	FilePath    string `json:"file_path"`
	PRURL       string `json:"pr_url,omitempty"`
	CreatedAt   string `json:"created_at"`
}

// ─── Cleanup Types ────────────────────────────────────────────────────────

// CleanupCandidateItem represents a flag that is safe to remove from the codebase.
type CleanupCandidateItem struct {
	ID                  string `json:"id"`
	FlagKey             string `json:"flag_key"`
	Reason              string `json:"reason"`
	DaysSince100Percent int    `json:"days_since_100_percent"`
	PRURL               string `json:"pr_url,omitempty"`
	Status              string `json:"status"`
	CreatedAt           string `json:"created_at"`
}

// ListCleanupResponse is the paginated response for GET /v1/code2flag/cleanup.
type ListCleanupResponse struct {
	Data  []CleanupCandidateItem `json:"data"`
	Total int                    `json:"total"`
}
