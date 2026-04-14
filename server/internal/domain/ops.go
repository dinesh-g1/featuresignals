package domain

import (
	"context"
	"time"
)

// ─── Customer Environment ─────────────────────────────────────────────

type CustomerEnvironment struct {
	ID                   string     `json:"id"`
	OrgID                string     `json:"org_id"`
	DeploymentModel      string     `json:"deployment_model"`
	VPSProvider          string     `json:"vps_provider,omitempty"`
	VPSID                string     `json:"vps_id,omitempty"`
	VPSIP                string     `json:"vps_ip,omitempty"`
	VPSRegion            string     `json:"vps_region,omitempty"`
	VPSType              string     `json:"vps_type,omitempty"`
	VPSCPUCores          int        `json:"vps_cpu_cores,omitempty"`
	VPSMemoryGB          int        `json:"vps_memory_gb,omitempty"`
	VPSDiskGB            int        `json:"vps_disk_gb,omitempty"`
	Subdomain            string     `json:"subdomain,omitempty"`
	CustomDomain         string     `json:"custom_domain,omitempty"`
	CloudflareRecordID   string     `json:"cloudflare_record_id,omitempty"`
	MonthlyVPSCost       int64      `json:"monthly_vps_cost"`
	MonthlyBackupCost    int64      `json:"monthly_backup_cost"`
	MonthlySupportCost   int64      `json:"monthly_support_cost"`
	Status               string     `json:"status"`
	MaintenanceMode      bool       `json:"maintenance_mode"`
	MaintenanceReason    string     `json:"maintenance_reason,omitempty"`
	MaintenanceEnabledBy string     `json:"maintenance_enabled_by,omitempty"`
	MaintenanceEnabledAt *time.Time `json:"maintenance_enabled_at,omitempty"`
	DebugMode            bool       `json:"debug_mode"`
	DebugModeEnabledBy   string     `json:"debug_mode_enabled_by,omitempty"`
	DebugModeEnabledAt   *time.Time `json:"debug_mode_enabled_at,omitempty"`
	DebugModeExpiresAt   *time.Time `json:"debug_mode_expires_at,omitempty"`
	ProvisionedAt        *time.Time `json:"provisioned_at,omitempty"`
	DecommissionedAt     *time.Time `json:"decommissioned_at,omitempty"`
	LastHealthCheck      *time.Time `json:"last_health_check,omitempty"`
	CreatedAt            time.Time  `json:"created_at"`
	UpdatedAt            time.Time  `json:"updated_at"`
}

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
	// Joined from users table
	UserEmail string `json:"user_email,omitempty"`
	UserName  string `json:"user_name,omitempty"`
}

// ─── Sandbox Environment ──────────────────────────────────────────────

type SandboxEnvironment struct {
	ID               string     `json:"id"`
	OwnerUserID      string     `json:"owner_user_id"`
	VPSID            string     `json:"vps_id"`
	VPSIP            string     `json:"vps_ip"`
	VPSType          string     `json:"vps_type"`
	Subdomain        string     `json:"subdomain"`
	Status           string     `json:"status"`
	ExpiresAt        time.Time  `json:"expires_at"`
	RenewalCount     int        `json:"renewal_count"`
	MaxRenewals      int        `json:"max_renewals"`
	Purpose          string     `json:"purpose,omitempty"`
	TotalCost        int64      `json:"total_cost"`
	CreatedAt        time.Time  `json:"created_at"`
	UpdatedAt        time.Time  `json:"updated_at"`
	DecommissionedAt *time.Time `json:"decommissioned_at,omitempty"`
	// Joined
	OwnerEmail string `json:"owner_email,omitempty"`
	OwnerName  string `json:"owner_name,omitempty"`
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
	// Environments
	ListCustomerEnvironments(ctx context.Context, status, deploymentModel, region, search string, limit, offset int) ([]CustomerEnvironment, int, error)
	GetCustomerEnvironment(ctx context.Context, id string) (*CustomerEnvironment, error)
	GetCustomerEnvironmentByVPSID(ctx context.Context, vpsID string) (*CustomerEnvironment, error)
	CreateCustomerEnvironment(ctx context.Context, env *CustomerEnvironment) error
	UpdateCustomerEnvironment(ctx context.Context, id string, updates map[string]any) error
	DeleteCustomerEnvironment(ctx context.Context, id string) error

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

	// Sandboxes
	ListSandboxes(ctx context.Context, status, ownerID string) ([]SandboxEnvironment, int, error)
	CreateSandbox(ctx context.Context, s *SandboxEnvironment) error
	RenewSandbox(ctx context.Context, id string) (*SandboxEnvironment, error)
	DecommissionSandbox(ctx context.Context, id string) error
	GetExpiringSandboxes(ctx context.Context, days int) ([]SandboxEnvironment, error)

	// Financial
	ListOrgCostDaily(ctx context.Context, orgID, startDate, endDate string) ([]OrgCostDaily, error)
	ListOrgCostMonthly(ctx context.Context, month string) ([]OrgCostMonthlySummary, error)
	GetFinancialSummary(ctx context.Context) (*FinancialSummary, error)

	// Audit
	ListOpsAuditLogs(ctx context.Context, action, targetType, userID, startDate, endDate string, limit, offset int) ([]OpsAuditLog, int, error)
	CreateOpsAuditLog(ctx context.Context, log *OpsAuditLog) error

	// Customer summary
	GetCustomerDetail(ctx context.Context, orgID string) (*CustomerDetail, error)
	ListCustomers(ctx context.Context, plan, deploymentModel, search string) ([]CustomerSummary, int, error)
}

// CustomerSummary is a joined row for the customer list view.
type CustomerSummary struct {
	OrgID           string     `json:"org_id"`
	OrgName         string     `json:"org_name"`
	OrgSlug         string     `json:"org_slug"`
	Plan            string     `json:"plan"`
	DeploymentModel string     `json:"deployment_model"`
	DataRegion      string     `json:"data_region"`
	Status          string     `json:"status"`
	MRR             int64      `json:"mrr"`
	MonthlyCost     int64      `json:"monthly_cost"`
	Margin          float64    `json:"margin"`
	LastHealthCheck *time.Time `json:"last_health_check,omitempty"`
	HealthScore     float64    `json:"health_score"`
	CreatedAt       time.Time  `json:"created_at"`
}

// CustomerDetail is a joined row for a single customer detail view.
type CustomerDetail struct {
	Org             Organization         `json:"org"`
	Environment     *CustomerEnvironment `json:"environment,omitempty"`
	License         *License             `json:"license,omitempty"`
	MonthlyCost     int64                `json:"monthly_cost"`
	MRR             int64                `json:"mrr"`
	HealthScore     float64              `json:"health_score"`
	RecentAuditLogs []OpsAuditLog        `json:"recent_audit_logs"`
}

// FinancialSummary aggregates financial data across all customers.
type FinancialSummary struct {
	TotalMRR       int64                      `json:"total_mrr"`
	TotalCost      int64                      `json:"total_cost"`
	TotalMargin    float64                    `json:"total_margin"`
	MarginByTier   map[string]*TierFinancials `json:"margin_by_tier"`
	TopCustomers   []CustomerSummary          `json:"top_customers"`
	NegativeMargin []CustomerSummary          `json:"negative_margin"`
}

// TierFinancials holds revenue/cost/margin for a single tier.
type TierFinancials struct {
	MRR    int64   `json:"mrr"`
	Cost   int64   `json:"cost"`
	Margin float64 `json:"margin"`
}

// OrgCostMonthlySummary is the view result from org_cost_monthly_summary.
type OrgCostMonthlySummary struct {
	OrgID            string `json:"org_id"`
	Month            string `json:"month"`
	TotalEvaluations int64  `json:"total_evaluations"`
	TotalAPICalls    int64  `json:"total_api_calls"`
	TotalCost        int64  `json:"total_cost"`
	DaysTracked      int    `json:"days_tracked"`
	OrgName          string `json:"org_name,omitempty"`
	OrgPlan          string `json:"org_plan,omitempty"`
	OrgMRR           int64  `json:"org_mrr,omitempty"`
}
