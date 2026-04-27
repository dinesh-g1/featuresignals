package domain

import (
	"context"
	"time"
)

// TenantResourceOverride defines per-tenant resource quota overrides.
// These override the tier defaults for CPU, memory, and priority class.
type TenantResourceOverride struct {
	TenantID      string    `json:"tenant_id"`
	CPURequest    string    `json:"cpu_request"`    // e.g., "1", "2", "500m"
	MemoryRequest string    `json:"memory_request"` // e.g., "2Gi", "4Gi"
	CPULimit      string    `json:"cpu_limit"`      // e.g., "2", "4"
	MemoryLimit   string    `json:"memory_limit"`   // e.g., "4Gi", "8Gi"
	PriorityClass string    `json:"priority_class"` // low-priority, default, high-priority, critical
	UpdatedAt     time.Time `json:"updated_at"`
	UpdatedBy     string    `json:"updated_by"`
}

// TierQuota returns the default resource quota for a given tier.
type TierQuota struct {
	Tier          string `json:"tier"`
	CPURequest    string `json:"cpu_request"`
	MemoryRequest string `json:"memory_request"`
	CPULimit      string `json:"cpu_limit"`
	MemoryLimit   string `json:"memory_limit"`
	PriorityClass string `json:"priority_class"`
}

// TierDefaults maps tiers to their default resource quotas.
var TierDefaults = map[string]TierQuota{
	TierFree: {
		Tier: TierFree, CPURequest: "500m", MemoryRequest: "1Gi",
		CPULimit: "1", MemoryLimit: "2Gi", PriorityClass: "low-priority",
	},
	"starter": {
		Tier: "starter", CPURequest: "1", MemoryRequest: "2Gi",
		CPULimit: "2", MemoryLimit: "4Gi", PriorityClass: "default",
	},
	TierPro: {
		Tier: TierPro, CPURequest: "2", MemoryRequest: "4Gi",
		CPULimit: "4", MemoryLimit: "8Gi", PriorityClass: "high-priority",
	},
	TierEnterprise: {
		Tier: TierEnterprise, CPURequest: "4", MemoryRequest: "8Gi",
		CPULimit: "8", MemoryLimit: "16Gi", PriorityClass: "critical",
	},
}

// TenantResourceOverrideStore provides CRUD for tenant resource overrides.
type TenantResourceOverrideStore interface {
	// GetOverride returns the resource overrides for a tenant, or nil if none set.
	GetOverride(ctx context.Context, tenantID string) (*TenantResourceOverride, error)

	// UpsertOverride creates or updates resource overrides for a tenant.
	UpsertOverride(ctx context.Context, override *TenantResourceOverride) error

	// DeleteOverride removes resource overrides for a tenant (reverts to tier default).
	DeleteOverride(ctx context.Context, tenantID string) error
}