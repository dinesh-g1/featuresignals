// Package domain defines core business types for FeatureSignals.
//
// Console maturity types power the progressive disclosure system: the Console
// adapts its surface area (visible stages, CONNECT zone content, LEARN zone
// depth, AI posture) based on the organization's process maturity level (L1–L5).
//
// PRS Requirement IDs: FS-S3-CONSOLE-MATURITY-001 through FS-S3-CONSOLE-MATURITY-010

package domain

import "context"

// ConsoleMaturityLevel represents the 5-level organisational process maturity
// model defined in PROCESS_ALIGNMENT_ARCHITECTURE.md. This is distinct from
// agent maturity (agent_types.go) — it governs the Console surface, not agent
// behaviour.
//
//	L1 = Solo        — single developer, 4 stages visible
//	L2 = Team        — full team, all 14 stages visible
//	L3 = Growing     — multi-service, workflows enabled
//	L4 = Enterprise  — compliance, SSO, dual control
//	L5 = Regulated   — air-gapped, FIPS, auditor access, 7-year retention
type ConsoleMaturityLevel int

const (
	MaturitySolo       ConsoleMaturityLevel = 1
	MaturityTeam       ConsoleMaturityLevel = 2
	MaturityGrowing    ConsoleMaturityLevel = 3
	MaturityEnterprise ConsoleMaturityLevel = 4
	MaturityRegulated  ConsoleMaturityLevel = 5
)

// ValidConsoleMaturityLevel returns true if the level is within the valid range.
func ValidConsoleMaturityLevel(l int) bool {
	return l >= 1 && l <= 5
}

// String returns the human-readable name for the maturity level.
func (m ConsoleMaturityLevel) String() string {
	switch m {
	case MaturitySolo:
		return "Solo"
	case MaturityTeam:
		return "Team"
	case MaturityGrowing:
		return "Growing"
	case MaturityEnterprise:
		return "Enterprise"
	case MaturityRegulated:
		return "Regulated"
	default:
		return "Unknown"
	}
}

// VisibleStages returns the lifecycle stage IDs visible on the Console canvas
// at this maturity level. This implements progressive disclosure: lower levels
// see fewer stages to reduce cognitive load.
func (m ConsoleMaturityLevel) VisibleStages() []string {
	all14 := []string{
		StagePlan, StageSpec, StageDesign, StageFlag,
		StageImplement, StageTest, StageConfigure, StageApprove,
		StageShip, StageMonitor, StageDecide, StageAnalyze, StageLearn,
	}

	switch m {
	case MaturitySolo:
		// L1: Only the 4 essential stages — Flag, Ship, Monitor, Analyze.
		return []string{StageFlag, StageShip, StageMonitor, StageAnalyze}
	default:
		// L2+: All 14 stages are visible.
		return all14
	}
}

// MaxVisibleStages returns the count of visible stages at this level.
func (m ConsoleMaturityLevel) MaxVisibleStages() int {
	return len(m.VisibleStages())
}

// ─── MaturityConfig ────────────────────────────────────────────────────────

// MaturityConfig holds per-organisation configuration for Console progressive
// disclosure. It is derived from the org's maturity level and controls which
// Console features are available.
type MaturityConfig struct {
	Level              ConsoleMaturityLevel `json:"level"`
	VisibleStages      []string             `json:"visible_stages"`
	EnableApprovals    bool                 `json:"enable_approvals"`
	EnablePolicies     bool                 `json:"enable_policies"`
	EnableWorkflows    bool                 `json:"enable_workflows"`
	EnableCompliance   bool                 `json:"enable_compliance"`
	AutoAdvance        bool                 `json:"auto_advance"`
	RequireDualControl bool                 `json:"require_dual_control"`
	RetentionDays      int                  `json:"retention_days"`
}

// DefaultConfig returns the canonical MaturityConfig for a given level.
// These defaults encode the progressive disclosure rules from
// PROCESS_ALIGNMENT_ARCHITECTURE.md.
func DefaultConfig(level ConsoleMaturityLevel) MaturityConfig {
	cfg := MaturityConfig{
		Level:         level,
		VisibleStages: level.VisibleStages(),
	}

	switch level {
	case MaturitySolo:
		cfg.EnableApprovals = false
		cfg.EnablePolicies = false
		cfg.EnableWorkflows = false
		cfg.EnableCompliance = false
		cfg.AutoAdvance = true
		cfg.RequireDualControl = false
		cfg.RetentionDays = 90
	case MaturityTeam:
		cfg.EnableApprovals = true
		cfg.EnablePolicies = false
		cfg.EnableWorkflows = false
		cfg.EnableCompliance = false
		cfg.AutoAdvance = false
		cfg.RequireDualControl = false
		cfg.RetentionDays = 365
	case MaturityGrowing:
		cfg.EnableApprovals = true
		cfg.EnablePolicies = true
		cfg.EnableWorkflows = true
		cfg.EnableCompliance = false
		cfg.AutoAdvance = false
		cfg.RequireDualControl = false
		cfg.RetentionDays = 365
	case MaturityEnterprise:
		cfg.EnableApprovals = true
		cfg.EnablePolicies = true
		cfg.EnableWorkflows = true
		cfg.EnableCompliance = true
		cfg.AutoAdvance = false
		cfg.RequireDualControl = true
		cfg.RetentionDays = 1825 // 5 years
	case MaturityRegulated:
		cfg.EnableApprovals = true
		cfg.EnablePolicies = true
		cfg.EnableWorkflows = true
		cfg.EnableCompliance = true
		cfg.AutoAdvance = false
		cfg.RequireDualControl = true
		cfg.RetentionDays = 2555 // 7 years
	}

	return cfg
}

// ─── Store Interfaces (ISP — narrowest possible) ───────────────────────────

// MaturityReader provides read access to an organisation's Console maturity
// configuration.
type MaturityReader interface {
	GetConfig(ctx context.Context, orgID string) (*MaturityConfig, error)
}

// MaturityWriter allows updating an organisation's Console maturity level.
type MaturityWriter interface {
	SetLevel(ctx context.Context, orgID string, level ConsoleMaturityLevel, updatedBy string) (*MaturityConfig, error)
}

// ─── Compile-time guard ────────────────────────────────────────────────────

var _ = (ConsoleMaturityLevel(0)).String // ensure String is callable
