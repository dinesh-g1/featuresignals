// Package agent provides the Agent Runtime implementation.
//
// AuthGovernanceStep implements domain.GovernanceStep for the "auth"
// stage of the 7-step governance pipeline. It validates that the agent
// action carries valid authentication context (OrgID, AgentID) and that
// the agent is known to the system.
package agent

import (
	"context"
	"log/slog"

	"github.com/featuresignals/server/internal/domain"
)

// AuthGovernanceStep validates agent authentication. It implements
// domain.GovernanceStep and is the first step in the governance pipeline.
type AuthGovernanceStep struct {
	logger *slog.Logger
}

// NewAuthGovernanceStep creates the auth governance step.
func NewAuthGovernanceStep(logger *slog.Logger) *AuthGovernanceStep {
	return &AuthGovernanceStep{
		logger: logger.With("step", domain.GovStepAuth),
	}
}

// Name returns the step's identifier.
func (s *AuthGovernanceStep) Name() string {
	return domain.GovStepAuth
}

// Execute validates that the action carries a valid OrgID and AgentID.
// This is the first line of defense — if the agent can't authenticate,
// no further steps execute.
func (s *AuthGovernanceStep) Execute(ctx context.Context, action domain.AgentAction) (domain.AgentAction, error) {
	action.PipelineStage = domain.GovStepAuth

	if action.AgentID == "" {
		s.logger.Warn("action rejected: missing agent_id")
		return action, &domain.GovernanceError{
			Step:           domain.GovStepAuth,
			Reason:         "unauthenticated",
			Message:        "Agent action has no AgentID. The agent must be registered and authenticated.",
			RequiresHuman:  true,
			OverrideInstructions: "Register the agent via the Agent Registry before submitting actions.",
		}
	}

	if action.Context.OrgID == "" {
		s.logger.Warn("action rejected: missing org_id",
			"agent_id", action.AgentID,
		)
		return action, &domain.GovernanceError{
			Step:           domain.GovStepAuth,
			Reason:         "missing_org",
			Message:        "Agent action has no OrgID. All actions must be scoped to an organization.",
			RequiresHuman:  true,
			OverrideInstructions: "Ensure the agent is registered within an organization.",
		}
	}

	s.logger.Debug("auth step passed",
		"agent_id", action.AgentID,
		"org_id", action.Context.OrgID,
	)
	return action, nil
}
