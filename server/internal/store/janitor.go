package store

import (
	"context"
	"time"
)

// JanitorStore defines the interface for janitor data persistence.
type JanitorStore interface {
	// Config
	GetJanitorConfig(ctx context.Context, orgID string) (*JanitorConfig, error)
	UpsertJanitorConfig(ctx context.Context, config *JanitorConfig) error

	// Repositories
	ListRepositories(ctx context.Context, orgID string) ([]JanitorRepository, error)
	GetRepository(ctx context.Context, id string) (*JanitorRepository, error)
	ConnectRepository(ctx context.Context, repo *JanitorRepository) error
	DisconnectRepository(ctx context.Context, orgID, id string) error
	UpdateRepositoryLastScanned(ctx context.Context, id string, t time.Time) error

	// Scans
	CreateScan(ctx context.Context, scan *JanitorScan) error
	UpdateScan(ctx context.Context, id string, updates map[string]interface{}) error
	GetScan(ctx context.Context, id string) (*JanitorScan, error)
	ListScans(ctx context.Context, orgID string, limit int) ([]JanitorScan, error)

	// Scan Events
	AppendScanEvent(ctx context.Context, event *ScanEventRecord) error
	GetScanEventsSince(ctx context.Context, scanID string, afterID int64) ([]ScanEventRecord, error)

	// Stale Flags
	ListStaleFlags(ctx context.Context, orgID string, dismissed *bool, limit int) ([]StaleFlag, error)
	GetStaleFlag(ctx context.Context, id string) (*StaleFlag, error)
	UpsertStaleFlag(ctx context.Context, flag *StaleFlag) error
	DismissStaleFlag(ctx context.Context, orgID, flagKey, reason string) error

	// PRs
	CreateJanitorPR(ctx context.Context, pr *JanitorPR) error
	UpdateJanitorPR(ctx context.Context, id string, updates map[string]interface{}) error
	ListJanitorPRs(ctx context.Context, orgID string, status string) ([]JanitorPR, error)
}

// ─── Data Types ──────────────────────────────────────────────────────────

type JanitorConfig struct {
	OrgID             string    `json:"org_id"`
	ScanSchedule      string    `json:"scan_schedule"`
	StaleThreshold    int       `json:"stale_threshold_days"`
	AutoGeneratePR    bool      `json:"auto_generate_pr"`
	BranchPrefix      string    `json:"branch_prefix"`
	Notifications     bool      `json:"notifications_enabled"`
	LLMProvider       string    `json:"llm_provider"`
	LLMModel          string    `json:"llm_model"`
	LLMTemperature    float64   `json:"llm_temperature"`
	LLMMinConfidence  float64   `json:"llm_min_confidence"`
	UpdatedAt         time.Time `json:"updated_at"`
}

type JanitorRepository struct {
	ID              string     `json:"id"`
	OrgID           string     `json:"org_id"`
	Provider        string     `json:"provider"`
	ProviderRepoID  string     `json:"provider_repo_id"`
	Name            string     `json:"name"`
	FullName        string     `json:"full_name"`
	DefaultBranch   string     `json:"default_branch"`
	Private         bool       `json:"private"`
	Connected       bool       `json:"connected"`
	LastScanned     *time.Time `json:"last_scanned,omitempty"`
	EncryptedToken  string     `json:"-"` // Never serialized
	CreatedAt       time.Time  `json:"created_at"`
}

type JanitorScan struct {
	ID              string     `json:"id"`
	OrgID           string     `json:"org_id"`
	Status          string     `json:"status"`
	Progress        int        `json:"progress"`
	TotalRepos      int        `json:"total_repos"`
	CompletedRepos  int        `json:"completed_repos"`
	TotalFlags      int        `json:"total_flags"`
	StaleFlagsFound int        `json:"stale_flags_found"`
	StartedAt       *time.Time `json:"started_at,omitempty"`
	CompletedAt     *time.Time `json:"completed_at,omitempty"`
	ErrorMessage    string     `json:"error_message,omitempty"`
	CreatedAt       time.Time  `json:"created_at"`
}

type ScanEventRecord struct {
	ID        int64     `json:"id"`
	ScanID    string    `json:"scan_id"`
	EventType string    `json:"event_type"`
	EventData string    `json:"event_data"`
	CreatedAt time.Time `json:"created_at"`
}

type StaleFlag struct {
	ID                 string     `json:"id"`
	OrgID              string     `json:"org_id"`
	ScanID             string     `json:"scan_id"`
	FlagKey            string     `json:"flag_key"`
	FlagName           string     `json:"flag_name"`
	Environment        string     `json:"environment"`
	DaysServed         int        `json:"days_served"`
	PercentageTrue     float64    `json:"percentage_true"`
	SafeToRemove       bool       `json:"safe_to_remove"`
	AnalysisConfidence *float64   `json:"analysis_confidence,omitempty"`
	LLMProvider        string     `json:"llm_provider,omitempty"`
	LLMModel           string     `json:"llm_model,omitempty"`
	TokensUsed         int        `json:"tokens_used,omitempty"`
	Dismissed          bool       `json:"dismissed"`
	DismissReason      string     `json:"dismiss_reason,omitempty"`
	LastEvaluated      time.Time  `json:"last_evaluated"`
	DetectedAt         time.Time  `json:"detected_at"`
}

type JanitorPR struct {
	ID                 string     `json:"id"`
	OrgID              string     `json:"org_id"`
	FlagKey            string     `json:"flag_key"`
	StaleFlagID        string     `json:"stale_flag_id"`
	RepositoryID       string     `json:"repository_id"`
	Provider           string     `json:"provider"`
	PRNumber           int        `json:"pr_number"`
	PRURL              string     `json:"pr_url"`
	BranchName         string     `json:"branch_name"`
	Status             string     `json:"status"`
	AnalysisConfidence *float64   `json:"analysis_confidence,omitempty"`
	LLMProvider        string     `json:"llm_provider,omitempty"`
	LLMModel           string     `json:"llm_model,omitempty"`
	TokensUsed         int        `json:"tokens_used,omitempty"`
	ValidationPassed   *bool      `json:"validation_passed,omitempty"`
	FilesModified      int        `json:"files_modified,omitempty"`
	CreatedAt          time.Time  `json:"created_at"`
	UpdatedAt          time.Time  `json:"updated_at"`
}