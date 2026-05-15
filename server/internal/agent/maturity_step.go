// Package agent provides the Agent Runtime implementation.
//
// MaturityGovernanceStep implements domain.GovernanceStep for the
// "maturity" stage of the 7-step governance pipeline. It checks that
// the agent's maturity level is sufficient for the requested action.
package agent

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/featuresignals/server/internal/domain"
)

// MaturityGovernanceStep validates agent maturity. It checks that the
// agent's current maturity level meets or exceeds the level required
// by the action or tool. This is the fourth step in the pipeline.
type MaturityGovernanceStep struct {
	logger *slog.Logger
}

// NewMaturityGovernanceStep creates the maturity governance step.
func NewMaturityGovernanceStep(logger *slog.Logger) *MaturityGovernanceStep {
	return &MaturityGovernanceStep{
		logger: logger.With("step", domain.GovStepMaturity),
	}
}

// Name returns the step's identifier.
func (s *MaturityGovernanceStep) Name() string {
	return domain.GovStepMaturity
}

// Execute checks the agent's maturity level against the action's
// required maturity level (from action.Context.Metadata["required_maturity"]).
// If no required maturity is specified, the action defaults to requiring
// at least L1 (Shadow — any registered agent can attempt it).
func (s *MaturityGovernanceStep) Execute(ctx context.Context, action domain.AgentAction) (domain.AgentAction, error) {
	action.PipelineStage = domain.GovStepMaturity

	agentLevel := action.Context.MaturityLevel
	if agentLevel == 0 {
		agentLevel = domain.MaturityL1Shadow
	}

	requiredLevel := extractMaturityLevel(action.Context.Metadata, "required_maturity")
	if requiredLevel == 0 {
		requiredLevel = domain.MaturityL1Shadow
	}

	if agentLevel < requiredLevel {
		s.logger.Warn("action rejected: insufficient maturity",
			"agent_id", action.AgentID,
			"agent_level", int(agentLevel),
			"required_level", int(requiredLevel),
			"tool_name", action.ToolName,
		)
		return action, &domain.GovernanceError{
			Step:    domain.GovStepMaturity,
			Reason:  "insufficient_maturity",
			Message: fmt.Sprintf("Agent %q is at maturity L%d but action %q requires L%d. Improve accuracy above 95%% and reduce incidents to progress.", action.AgentID, int(agentLevel), action.ToolName, int(requiredLevel)),
			RequiresHuman: true,
			OverrideInstructions: fmt.Sprintf("A human can override this restriction. The agent needs L%d maturity; currently at L%d.", int(requiredLevel), int(agentLevel)),
		}
	}

	s.logger.Debug("maturity step passed",
		"agent_id", action.AgentID,
		"agent_level", int(agentLevel),
		"required_level", int(requiredLevel),
	)
	return action, nil
}

// extractMaturityLevel extracts a maturity level integer from metadata.
func extractMaturityLevel(metadata map[string]any, key string) domain.MaturityLevel {
	if metadata == nil {
		return 0
	}
	val, ok := metadata[key]
	if !ok {
		return 0
	}
	switch v := val.(type) {
	case domain.MaturityLevel:
		return v
	case int:
		return domain.MaturityLevel(v)
	case float64:
		return domain.MaturityLevel(int(v))
	case string:
		// Try to parse string representations
		levels := map[string]domain.MaturityLevel{
			"L1": domain.MaturityL1Shadow,
			"L2": domain.MaturityL2Assist,
			"L3": domain.MaturityL3Supervised,
			"L4": domain.MaturityL4Autonomous,
			"L5": domain.MaturityL5Sentinel,
		}
		if lvl, ok := levels[v]; ok {
			return lvl
		}
	}
	return 0
}
