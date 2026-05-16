package dto

import (
	"github.com/featuresignals/server/internal/domain"
)

// MaturityConfigResponse is the API response shape for GET /v1/console/maturity.
type MaturityConfigResponse struct {
	Level              int           `json:"level"`
	VisibleStages      []string      `json:"visible_stages"`
	EnableApprovals    bool          `json:"enable_approvals"`
	EnablePolicies     bool          `json:"enable_policies"`
	EnableWorkflows    bool          `json:"enable_workflows"`
	EnableCompliance   bool          `json:"enable_compliance"`
	AutoAdvance        bool          `json:"auto_advance"`
	RequireDualControl bool          `json:"require_dual_control"`
	RetentionDays      int           `json:"retention_days"`
	Links              domain.Links  `json:"_links,omitempty"`
}

// MaturityConfigFromDomain maps a domain.MaturityConfig to the API response shape.
func MaturityConfigFromDomain(cfg *domain.MaturityConfig) *MaturityConfigResponse {
	if cfg == nil {
		return nil
	}
	return &MaturityConfigResponse{
		Level:              int(cfg.Level),
		VisibleStages:      cfg.VisibleStages,
		EnableApprovals:    cfg.EnableApprovals,
		EnablePolicies:     cfg.EnablePolicies,
		EnableWorkflows:    cfg.EnableWorkflows,
		EnableCompliance:   cfg.EnableCompliance,
		AutoAdvance:        cfg.AutoAdvance,
		RequireDualControl: cfg.RequireDualControl,
		RetentionDays:      cfg.RetentionDays,
		Links:              domain.LinksForMaturity(),
	}
}

// SetMaturityRequest is the request body for PUT /v1/console/maturity.
type SetMaturityRequest struct {
	Level int `json:"level"` // 1–5
}

// Validate checks that the maturity level is within the valid range.
func (r *SetMaturityRequest) Validate() error {
	if !domain.ValidConsoleMaturityLevel(r.Level) {
		return domain.NewValidationError("level", "must be between 1 and 5")
	}
	return nil
}
