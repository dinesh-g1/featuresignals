// Package domain defines core business types for FeatureSignals.
//
// Code2Flag domain types represent discovered conditionals in code, auto-generated
// feature flags, and cleanup queue entries. These map to the Stage 3 Code2Flag
// product (Steps CONCEIVE->SPECIFY->DESIGN->FLAGIFY of the 14-step lifecycle).
package domain

import (
	"context"
	"encoding/json"
	"time"
)

// ─── ScanResult ────────────────────────────────────────────────────────────

// ScanResult represents a discovered conditional in code that may need a feature flag.
// Maps to the scan_results table (migration 000108).
type ScanResult struct {
	ID                string    `json:"id"`
	OrgID             string    `json:"org_id"`
	ProjectID         string    `json:"project_id"`
	Repository        string    `json:"repository"`
	FilePath          string    `json:"file_path"`
	LineNumber        int       `json:"line_number"`
	ConditionalType   string    `json:"conditional_type"` // if-statement, ternary, switch-case, config-check
	ConditionalText   string    `json:"conditional_text"`
	Confidence        float64   `json:"confidence"`
	Status            string    `json:"status"` // unreviewed, accepted, rejected, modified
	SuggestedFlagKey  string    `json:"suggested_flag_key,omitempty"`
	SuggestedFlagName string    `json:"suggested_flag_name,omitempty"`
	ScanJobID         string    `json:"scan_job_id,omitempty"`
	CreatedAt         time.Time `json:"created_at"`
	UpdatedAt         time.Time `json:"updated_at"`
}

// ─── GeneratedFlag ─────────────────────────────────────────────────────────

// GeneratedFlag is a feature flag auto-generated from a scan result.
// Maps to the generated_flags table (migration 000108).
type GeneratedFlag struct {
	ID                 string          `json:"id"`
	OrgID              string          `json:"org_id"`
	ProjectID          string          `json:"project_id"`
	Key                string          `json:"key"`
	Name               string          `json:"name"`
	Description        string          `json:"description,omitempty"`
	FlagType           string          `json:"flag_type"`                      // boolean, multi_variant, number, json
	ProposedVariants   json.RawMessage `json:"proposed_variants,omitempty"`    // JSONB array of variant configs
	SourceScanResultID string          `json:"source_scan_result_id,omitempty"` // FK to scan_results
	PRURL              string          `json:"pr_url,omitempty"`
	Status             string          `json:"status"` // proposed, pr_created, flag_created, rejected
	CreatedAt          time.Time       `json:"created_at"`
	UpdatedAt          time.Time       `json:"updated_at"`
}

// ─── CleanupEntry ──────────────────────────────────────────────────────────

// CleanupEntry is a flag that is safe to remove from the codebase.
// Maps to the cleanup_queue table (migration 000108).
type CleanupEntry struct {
	ID                  string    `json:"id"`
	OrgID               string    `json:"org_id"`
	FlagID              string    `json:"flag_id"`            // FK to flags table
	FlagKey             string    `json:"flag_key"`
	Reason              string    `json:"reason"`             // stale, 100_percent_rolled_out, deprecated, manual
	DaysSince100Percent int       `json:"days_since_100_percent"`
	PRURL               string    `json:"pr_url,omitempty"`
	Status              string    `json:"status"`             // pending, pr_created, pr_merged, flag_retired, dismissed
	CreatedAt           time.Time `json:"created_at"`
	UpdatedAt           time.Time `json:"updated_at"`
}

// ─── Filter Types ──────────────────────────────────────────────────────────

// ScanResultFilter filters scan results by status, repository, confidence, or scan job.
type ScanResultFilter struct {
	Status        string  // unreviewed, accepted, rejected, modified (empty = all)
	Repository    string  // filter by repo name (empty = all)
	MinConfidence float64 // minimum confidence threshold (0 = no filter)
	ScanJobID     string  // filter by scan job (empty = all)
}

// CleanupFilter filters cleanup entries by status and reason.
type CleanupFilter struct {
	Status string // pending, pr_created, pr_merged, flag_retired, dismissed (empty = all)
	Reason string // stale, 100_percent_rolled_out, deprecated, manual (empty = all)
}

// ─── Well-Known Constants ──────────────────────────────────────────────────

const (
	// Scan result review statuses
	ScanResultStatusUnreviewed = "unreviewed"
	ScanResultStatusAccepted   = "accepted"
	ScanResultStatusRejected   = "rejected"
	ScanResultStatusModified   = "modified"

	// Cleanup entry statuses
	CleanupStatusPending      = "pending"
	CleanupStatusPRCreated    = "pr_created"
	CleanupStatusPRMerged     = "pr_merged"
	CleanupStatusFlagRetired  = "flag_retired"
	CleanupStatusDismissed    = "dismissed"

	// Generated flag statuses
	GeneratedFlagStatusProposed    = "proposed"
	GeneratedFlagStatusPRCreated   = "pr_created"
	GeneratedFlagStatusFlagCreated = "flag_created"
	GeneratedFlagStatusRejected    = "rejected"

	// Conditional types discovered during scanning
	ConditionalTypeIfStatement = "if-statement"
	ConditionalTypeTernary     = "ternary"
	ConditionalTypeSwitchCase  = "switch-case"
	ConditionalTypeConfigCheck = "config-check"

	// Cleanup reasons
	CleanupReasonStale              = "stale"
	CleanupReason100PercentRolledOut = "100_percent_rolled_out"
	CleanupReasonDeprecated         = "deprecated"
	CleanupReasonManual             = "manual"
)

// ─── Store Interfaces ──────────────────────────────────────────────────────

// Code2FlagReader provides read access to Code2Flag entities.
type Code2FlagReader interface {
	// ScanResults
	ListScanResults(ctx context.Context, orgID, projectID string, filter ScanResultFilter, limit, offset int) ([]ScanResult, error)
	CountScanResults(ctx context.Context, orgID, projectID string, filter ScanResultFilter) (int, error)
	GetScanResult(ctx context.Context, id string) (*ScanResult, error)

	// GeneratedFlags
	ListGeneratedFlags(ctx context.Context, orgID, projectID string, limit, offset int) ([]GeneratedFlag, error)
	CountGeneratedFlags(ctx context.Context, orgID, projectID string) (int, error)
	GetGeneratedFlag(ctx context.Context, id string) (*GeneratedFlag, error)

	// CleanupEntries
	ListCleanupEntries(ctx context.Context, orgID string, filter CleanupFilter, limit, offset int) ([]CleanupEntry, error)
	CountCleanupEntries(ctx context.Context, orgID string, filter CleanupFilter) (int, error)
	GetCleanupEntry(ctx context.Context, id string) (*CleanupEntry, error)
}

// Code2FlagWriter provides mutating operations for Code2Flag entities.
type Code2FlagWriter interface {
	// ScanResults
	CreateScanResult(ctx context.Context, sr *ScanResult) error
	BatchCreateScanResults(ctx context.Context, results []ScanResult) error
	UpdateScanResult(ctx context.Context, id string, updates map[string]interface{}) error

	// GeneratedFlags
	CreateGeneratedFlag(ctx context.Context, gf *GeneratedFlag) error
	UpdateGeneratedFlag(ctx context.Context, id string, updates map[string]interface{}) error

	// CleanupEntries
	CreateCleanupEntry(ctx context.Context, ce *CleanupEntry) error
	UpdateCleanupEntry(ctx context.Context, id string, updates map[string]interface{}) error
	DeleteCleanupEntry(ctx context.Context, id string) error
}
