package domain

import "time"

// ─── Compliance Mode ──────────────────────────────────────────────────────

// LLMComplianceMode defines what LLM processing is allowed for an organization.
type LLMComplianceMode string

const (
	LLMComplianceModeDisabled LLMComplianceMode = "disabled" // No LLM at all, regex-only
	LLMComplianceModeApproved LLMComplianceMode = "approved" // Only approved providers
	LLMComplianceModeBYO     LLMComplianceMode = "byo"       // Self-hosted / on-premise only
	LLMComplianceModeStrict  LLMComplianceMode = "strict"    // Approved + data masking + audit
)

// ─── Approved LLM Provider ───────────────────────────────────────────────

// ApprovedLLMProvider defines a single approved provider instance for an org.
type ApprovedLLMProvider struct {
	ID           string    `json:"id"`
	OrgID        string    `json:"org_id"`
	Name         string    `json:"name"`          // "deepseek", "azure-openai", "openai", "self-hosted"
	Model        string    `json:"model"`         // "deepseek-chat", "gpt-4", etc.
	EndpointURL  string    `json:"endpoint_url"`  // Custom endpoint (empty for SaaS defaults)
	IsSelfHosted bool      `json:"is_self_hosted"` // Whether this runs on org's own infra
	DataRegion   string    `json:"data_region"`   // "us", "eu", "in", "self-managed"
	Priority     int       `json:"priority"`      // Selection priority (lower = preferred)
	APIKeyHash   string    `json:"-"`             // Never serialized - SHA-256 of API key
	APIKeyPrefix string    `json:"api_key_prefix"` // First 8 chars for identification
	CreatedAt    time.Time `json:"created_at"`
}

// ─── Redaction Rule ──────────────────────────────────────────────────────

// RedactionRule defines a pattern to mask sensitive data before sending to an LLM.
type RedactionRule struct {
	ID          string   `json:"id"`
	OrgID       string   `json:"org_id"`
	Name        string   `json:"name"`
	Pattern     string   `json:"pattern"`     // Go regexp pattern
	Replacement string   `json:"replacement"` // What to replace with (e.g., "[REDACTED]")
	ApplyTo     []string `json:"apply_to"`    // Which operations: "analysis", "validation", "pr_description"
	IsEnabled   bool     `json:"is_enabled"`
	CreatedAt   time.Time `json:"created_at"`
}

// ─── LLM Interaction Record (Audit) ──────────────────────────────────────

// LLMInteractionRecord is an immutable audit log entry for every LLM call.
type LLMInteractionRecord struct {
	ID                string    `json:"id"`
	OrgID             string    `json:"org_id"`
	ScanID            string    `json:"scan_id"`
	FlagKey           string    `json:"flag_key"`
	Operation         string    `json:"operation"`          // "analyze", "validate", "generate_pr"
	ProviderName      string    `json:"provider_name"`
	Model             string    `json:"model"`
	Endpoint          string    `json:"endpoint"`           // Where the request was sent
	DataRegion        string    `json:"data_region"`        // Region routing decision
	PromptTokens      int       `json:"prompt_tokens"`
	CompletionTokens  int       `json:"completion_tokens"`
	TotalTokens       int       `json:"total_tokens"`
	CostCents         int       `json:"cost_cents"`
	DurationMs        int       `json:"duration_ms"`
	StatusCode        int       `json:"status_code"`
	ErrorMessage      string    `json:"error_message,omitempty"`
	EncryptedPromptHash string  `json:"encrypted_prompt_hash"` // SHA-256 of encrypted payload
	FilePaths         []string  `json:"file_paths"`            // Which files were included
	BytesSent         int       `json:"bytes_sent"`
	BytesReceived     int       `json:"bytes_received"`
	CreatedAt         time.Time `json:"created_at"`
}

// ─── Org Compliance Policy ───────────────────────────────────────────────

// LLMCompliancePolicy is the per-organization compliance configuration.
type LLMCompliancePolicy struct {
	OrgID              string            `json:"org_id"`
	Mode               LLMComplianceMode `json:"mode"`
	AllowedProviderIDs []string          `json:"allowed_provider_ids"`
	DefaultProviderID  string            `json:"default_provider_id"`
	RequireAuditLog    bool              `json:"require_audit_log"`
	RequireDataMasking bool              `json:"require_data_masking"`
	AllowedDataRegions []string          `json:"allowed_data_regions"`
	MaxTokensPerCall   int               `json:"max_tokens_per_call"`
	EnableCostTracking bool              `json:"enable_cost_tracking"`
	MonthlyBudgetCents int               `json:"monthly_budget_cents"`
	UpdatedAt          time.Time         `json:"updated_at"`
}