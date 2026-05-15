// Package agent provides the Agent Runtime implementation.
//
// BlastRadiusGovernanceStep implements domain.GovernanceStep for the
// "blast_radius" stage of the 7-step governance pipeline. It validates
// that the estimated impact of an agent action is within acceptable
// bounds for the current context.
package agent

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/featuresignals/server/internal/domain"
)

// BlastRadiusGovernanceStep validates the estimated blast radius of an
// agent action. It checks the affected entity count, affected percentage,
// and risk level against configurable thresholds. This is the sixth step.
type BlastRadiusGovernanceStep struct {
	// MaxAffectedEntities is the hard cap on entities affected.
	MaxAffectedEntities int64
	// MaxAffectedPercentage is the hard cap on percentage affected.
	MaxAffectedPercentage float64
	// RequireHumanAboveRisk is the risk level at which human approval
	// is required (default: "high").
	RequireHumanAboveRisk string

	logger *slog.Logger
}

// NewBlastRadiusGovernanceStep creates the blast radius governance step
// with sensible defaults. These can be overridden per organization.
func NewBlastRadiusGovernanceStep(logger *slog.Logger) *BlastRadiusGovernanceStep {
	return &BlastRadiusGovernanceStep{
		MaxAffectedEntities:   10000,
		MaxAffectedPercentage: 10.0,
		RequireHumanAboveRisk: "high",
		logger:                logger.With("step", domain.GovStepBlastRadius),
	}
}

// Name returns the step's identifier.
func (s *BlastRadiusGovernanceStep) Name() string {
	return domain.GovStepBlastRadius
}

// Execute validates the blast radius estimate against configured thresholds.
// If the blast radius exceeds hard caps, the action is rejected. If it
// exceeds the "require human" threshold, the action requires human approval.
func (s *BlastRadiusGovernanceStep) Execute(ctx context.Context, action domain.AgentAction) (domain.AgentAction, error) {
	action.PipelineStage = domain.GovStepBlastRadius

	br := action.BlastRadius

	// If no blast radius estimate is provided, assume worst case and
	// require human approval.
	if br.AffectedEntities == 0 && br.AffectedPercentage == 0 && br.RiskLevel == "" {
		s.logger.Warn("no blast radius estimate provided, requiring human approval",
			"agent_id", action.AgentID,
			"action_id", action.ID,
		)
		return action, &domain.GovernanceError{
			Step:           domain.GovStepBlastRadius,
			Reason:         "no_blast_radius_estimate",
			Message:        "The agent did not provide a blast radius estimate for this action. For safety, human approval is required.",
			RequiresHuman:  true,
			OverrideInstructions: "A human can review the action and override this requirement. Encourage the agent to provide blast radius estimates for future actions.",
		}
	}

	// Check hard caps
	if s.MaxAffectedEntities > 0 && br.AffectedEntities > s.MaxAffectedEntities {
		s.logger.Warn("action rejected: blast radius exceeds entity cap",
			"agent_id", action.AgentID,
			"affected_entities", br.AffectedEntities,
			"max", s.MaxAffectedEntities,
		)
		return action, &domain.GovernanceError{
			Step:    domain.GovStepBlastRadius,
			Reason:  "blast_radius_exceeded",
			Message: fmt.Sprintf("Action would affect %d entities (max: %d). Split this action into smaller batches or reduce scope.", br.AffectedEntities, s.MaxAffectedEntities),
			RequiresHuman: true,
			OverrideInstructions: "A human with admin permissions can override this cap for exceptional circumstances.",
		}
	}

	if s.MaxAffectedPercentage > 0 && br.AffectedPercentage > s.MaxAffectedPercentage {
		s.logger.Warn("action rejected: blast radius exceeds percentage cap",
			"agent_id", action.AgentID,
			"affected_pct", br.AffectedPercentage,
			"max_pct", s.MaxAffectedPercentage,
		)
		return action, &domain.GovernanceError{
			Step:    domain.GovStepBlastRadius,
			Reason:  "blast_radius_exceeded",
			Message: fmt.Sprintf("Action would affect %.1f%% of traffic/users (max: %.1f%%). Reduce the rollout percentage or use phased deployment.", br.AffectedPercentage, s.MaxAffectedPercentage),
			RequiresHuman: true,
			OverrideInstructions: "A human with admin permissions can override this cap for exceptional circumstances.",
		}
	}

	// Check risk level threshold for human approval
	if s.RequireHumanAboveRisk != "" && riskLevelRank(br.RiskLevel) >= riskLevelRank(s.RequireHumanAboveRisk) {
		s.logger.Warn("blast radius requires human approval",
			"agent_id", action.AgentID,
			"risk_level", br.RiskLevel,
			"threshold", s.RequireHumanAboveRisk,
		)
		return action, &domain.GovernanceError{
			Step:           domain.GovStepBlastRadius,
			Reason:         "blast_radius_requires_human",
			Message:        fmt.Sprintf("Action risk level is %q (threshold: %q). Human approval is required for actions at this risk level.", br.RiskLevel, s.RequireHumanAboveRisk),
			RequiresHuman:  true,
			OverrideInstructions: "A human can approve this action after reviewing the blast radius estimate and rationale.",
		}
	}

	s.logger.Debug("blast radius step passed",
		"agent_id", action.AgentID,
		"affected_entities", br.AffectedEntities,
		"affected_pct", br.AffectedPercentage,
		"risk_level", br.RiskLevel,
	)
	return action, nil
}

// riskLevelRank returns a numeric rank for a risk level string.
// Higher rank = higher risk.
func riskLevelRank(level string) int {
	switch level {
	case "critical":
		return 4
	case "high":
		return 3
	case "medium":
		return 2
	case "low":
		return 1
	default:
		return 0
	}
}
