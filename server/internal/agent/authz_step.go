// Package agent provides the Agent Runtime implementation.
//
// AuthZGovernanceStep implements domain.GovernanceStep for the "authz"
// stage of the 7-step governance pipeline. It validates that the agent
// has the required scopes to perform the requested action.
package agent

import (
	"context"
	"fmt"
	"log/slog"

	"github.com/featuresignals/server/internal/domain"
)

// AuthZGovernanceStep validates agent authorization. It checks that the
// agent's allowed scopes cover the scopes required by the action/tool.
// This is the second step in the governance pipeline.
type AuthZGovernanceStep struct {
	logger *slog.Logger
}

// NewAuthZGovernanceStep creates the authz governance step.
func NewAuthZGovernanceStep(logger *slog.Logger) *AuthZGovernanceStep {
	return &AuthZGovernanceStep{
		logger: logger.With("step", domain.GovStepAuthZ),
	}
}

// Name returns the step's identifier.
func (s *AuthZGovernanceStep) Name() string {
	return domain.GovStepAuthZ
}

// Execute verifies the agent's scopes cover the action's required scopes.
// Required scopes are extracted from action.Context.Metadata["required_scopes"]
// if present. If no required scopes are specified, the action passes.
func (s *AuthZGovernanceStep) Execute(ctx context.Context, action domain.AgentAction) (domain.AgentAction, error) {
	action.PipelineStage = domain.GovStepAuthZ

	// Extract required scopes from action metadata (set by the caller/tool)
	requiredScopes := extractScopes(action.Context.Metadata, "required_scopes")
	if len(requiredScopes) == 0 {
		s.logger.Debug("no required scopes, action allowed",
			"agent_id", action.AgentID,
			"tool_name", action.ToolName,
		)
		return action, nil
	}

	// Extract agent's allowed scopes from action metadata (set by the
	// agent registry / handler before submitting the action)
	agentScopes := extractScopes(action.Context.Metadata, "agent_scopes")
	if len(agentScopes) == 0 {
		s.logger.Warn("action rejected: agent has no scopes",
			"agent_id", action.AgentID,
			"required_scopes", requiredScopes,
		)
		return action, &domain.GovernanceError{
			Step:           domain.GovStepAuthZ,
			Reason:         "no_scopes",
			Message:        fmt.Sprintf("Agent %q has no assigned scopes but the action requires: %v", action.AgentID, requiredScopes),
			RequiresHuman:  true,
			OverrideInstructions: "Assign scopes to this agent via the Agent Registry before it can perform actions.",
		}
	}

	// Build a set of agent scopes for O(1) lookup
	agentScopeSet := make(map[string]bool, len(agentScopes))
	for _, s := range agentScopes {
		agentScopeSet[s] = true
	}

	// Check every required scope is present
	var missing []string
	for _, required := range requiredScopes {
		if !agentScopeSet[required] {
			missing = append(missing, required)
		}
	}

	if len(missing) > 0 {
		s.logger.Warn("action rejected: insufficient scopes",
			"agent_id", action.AgentID,
			"tool_name", action.ToolName,
			"missing_scopes", missing,
			"agent_scopes", agentScopes,
		)
		return action, &domain.GovernanceError{
			Step:           domain.GovStepAuthZ,
			Reason:         "insufficient_scopes",
			Message:        fmt.Sprintf("Agent %q is missing required scopes: %v. Agent scopes: %v", action.AgentID, missing, agentScopes),
			RequiresHuman:  true,
			OverrideInstructions: "A human with admin permissions can override this restriction or grant additional scopes.",
		}
	}

	s.logger.Debug("authz step passed",
		"agent_id", action.AgentID,
		"tool_name", action.ToolName,
		"checked_scopes", requiredScopes,
	)
	return action, nil
}

// extractScopes extracts a string slice from action metadata.
func extractScopes(metadata map[string]any, key string) []string {
	if metadata == nil {
		return nil
	}
	val, ok := metadata[key]
	if !ok {
		return nil
	}
	switch v := val.(type) {
	case []string:
		return v
	case []any:
		result := make([]string, 0, len(v))
		for _, item := range v {
			if s, ok := item.(string); ok {
				result = append(result, s)
			}
		}
		return result
	}
	return nil
}
