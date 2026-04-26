package domain

import (
	"context"
	"time"
)

// ─── License ──────────────────────────────────────────────────────────

type License struct {
	ID                   string     `json:"id"`
	LicenseKey           string     `json:"license_key"`
	OrgID                string     `json:"org_id,omitempty"`
	CustomerName         string     `json:"customer_name"`
	CustomerEmail        string     `json:"customer_email,omitempty"`
	Plan                 string     `json:"plan"`
	BillingCycle         string     `json:"billing_cycle,omitempty"`
	MaxSeats             int        `json:"max_seats,omitempty"`
	MaxProjects          int        `json:"max_projects,omitempty"`
	MaxEnvironments      int        `json:"max_environments,omitempty"`
	MaxEvalsPerMonth     int64      `json:"max_evaluations_per_month,omitempty"`
	MaxAPICallsPerMonth  int64      `json:"max_api_calls_per_month,omitempty"`
	MaxStorageGB         int        `json:"max_storage_gb,omitempty"`
	Features             []byte     `json:"features,omitempty"`
	CurrentSeats         int        `json:"current_seats"`
	CurrentProjects      int        `json:"current_projects"`
	CurrentEnvironments  int        `json:"current_environments"`
	EvalsThisMonth       int64      `json:"evaluations_this_month"`
	APICallsThisMonth    int64      `json:"api_calls_this_month"`
	StorageUsedGB        float64    `json:"storage_used_gb"`
	LastUsageReset       *time.Time `json:"last_usage_reset,omitempty"`
	BreachCount          int        `json:"breach_count"`
	LastBreachAt         *time.Time `json:"last_breach_at,omitempty"`
	BreachAction         string     `json:"breach_action,omitempty"`
	IssuedAt             time.Time  `json:"issued_at"`
	ExpiresAt            *time.Time `json:"expires_at,omitempty"`
	RevokedAt            *time.Time `json:"revoked_at,omitempty"`
	RevokedReason        string     `json:"revoked_reason,omitempty"`
	DeploymentModel      string     `json:"deployment_model"`
	PhoneHomeEnabled     bool       `json:"phone_home_enabled"`
	PhoneHomeIntervalHrs int        `json:"phone_home_interval_hours,omitempty"`
	LastPhoneHomeAt      *time.Time `json:"last_phone_home_at,omitempty"`
	PhoneHomeStatus      string     `json:"phone_home_status,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
	PasswordHash         string     `json:"-"`
}

// ─── Ops User ─────────────────────────────────────────────────────────

type OpsUser struct {
	ID              string    `json:"id"`
	UserID          string    `json:"user_id"`
	OpsRole         string    `json:"ops_role"`
	AllowedEnvTypes []string  `json:"allowed_env_types"`
	AllowedRegions  []string  `json:"allowed_regions"`
	MaxSandboxEnvs  int       `json:"max_sandbox_envs"`
	IsActive        bool      `json:"is_active"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
	PasswordHash    string    `json:"-"`
	// Joined from users table
	UserEmail string `json:"user_email,omitempty"`
	UserName  string `json:"user_name,omitempty"`
}

// ─── Org Cost Daily ───────────────────────────────────────────────────

type OrgCostDaily struct {
	ID                 string    `json:"id"`
	OrgID              string    `json:"org_id"`
	Date               string    `json:"date"`
	Evaluations        int64     `json:"evaluations"`
	StorageMB          float64   `json:"storage_mb"`
	BandwidthMB        float64   `json:"bandwidth_mb"`
	APICalls           int64     `json:"api_calls"`
	ActiveSeats        int       `json:"active_seats"`
	ActiveProjects     int       `json:"active_projects"`
	ActiveEnvironments int       `json:"active_environments"`
	ComputeCost        int64     `json:"compute_cost"`
	StorageCost        int64     `json:"storage_cost"`
	BandwidthCost      int64     `json:"bandwidth_cost"`
	ObservabilityCost  int64     `json:"observability_cost"`
	DatabaseCost       int64     `json:"database_cost"`
	BackupCost         int64     `json:"backup_cost"`
	TotalCost          int64     `json:"total_cost"`
	DeploymentModel    string    `json:"deployment_model"`
	CreatedAt          time.Time `json:"created_at"`
}

// ─── Ops Audit Log ────────────────────────────────────────────────────

type OpsAuditLog struct {
	ID         string    `json:"id"`
	OpsUserID  string    `json:"ops_user_id"`
	Action     string    `json:"action"`
	TargetType string    `json:"target_type,omitempty"`
	TargetID   string    `json:"target_id,omitempty"`
	TargetName string    `json:"target_name,omitempty"`
	Details    []byte    `json:"details,omitempty"`
	IPAddress  string    `json:"ip_address,omitempty"`
	UserAgent  string    `json:"user_agent,omitempty"`
	CreatedAt  time.Time `json:"created_at"`
	// Joined
	OpsUserName string `json:"ops_user_name,omitempty"`
}

// ─── Ops Store Interface ──────────────────────────────────────────────

type OpsStore interface {
	// Licenses
	ListLicenses(ctx context.Context, plan, deploymentModel, search string) ([]License, int, error)
	GetLicense(ctx context.Context, id string) (*License, error)
	GetLicenseByOrg(ctx context.Context, orgID string) (*License, error)
	CreateLicense(ctx context.Context, lic *License) error
	UpdateLicense(ctx context.Context, id string, updates map[string]any) error
	RevokeLicense(ctx context.Context, id, reason string) error
	OverrideLicenseQuota(ctx context.Context, id string, updates map[string]any) error
	ResetLicenseUsage(ctx context.Context, id string) error

	// Ops Users
	ListOpsUsers(ctx context.Context) ([]OpsUser, error)
	GetOpsUser(ctx context.Context, id string) (*OpsUser, error)
	GetOpsUserByUserID(ctx context.Context, userID string) (*OpsUser, error)
	CreateOpsUser(ctx context.Context, u *OpsUser) error
	UpdateOpsUser(ctx context.Context, id string, updates map[string]any) error
	DeleteOpsUser(ctx context.Context, id string) error

	// Daily cost
	ListOrgCostDaily(ctx context.Context, orgID, startDate, endDate string) ([]OrgCostDaily, error)

	// Audit
	ListOpsAuditLogs(ctx context.Context, action, targetType, userID, startDate, endDate string, limit, offset int) ([]OpsAuditLog, int, error)
	CreateOpsAuditLog(ctx context.Context, log *OpsAuditLog) error
}