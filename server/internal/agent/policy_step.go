// Package agent provides the Agent Runtime implementation.
//
// PolicyGovernanceStep implements domain.GovernanceStep for the "policy"
// stage of the 7-step governance pipeline. It loads applicable CEL policies
// for the organization, evaluates them against the agent action, and either
// passes the action through (possibly enriched with policy metadata) or
// rejects it with a structured GovernanceError.
package agent

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// PolicyEvaluator is the interface the policy step needs from the CEL
// evaluation engine. This keeps the step decoupled from the concrete
// evaluator implementation.
type PolicyEvaluator interface {
	Evaluate(ctx context.Context, action domain.AgentAction, policies []domain.Policy) (*domain.PolicyEvalResult, error)
}

// PolicyGovernanceStep evaluates CEL-based governance policies against
// agent actions. It implements domain.GovernanceStep and plugs into the
// InMemoryPipeline at position 3 (after auth + authz, before maturity).
type PolicyGovernanceStep struct {
	store     domain.PolicyReader
	evaluator PolicyEvaluator
	logger    *slog.Logger
}

// NewPolicyGovernanceStep creates the policy governance step.
func NewPolicyGovernanceStep(store domain.PolicyReader, evaluator PolicyEvaluator, logger *slog.Logger) *PolicyGovernanceStep {
	return &PolicyGovernanceStep{
		store:     store,
		evaluator: evaluator,
		logger:    logger.With("step", domain.GovStepPolicy),
	}
}

// Name returns the step's identifier for the governance pipeline.
func (s *PolicyGovernanceStep) Name() string {
	return domain.GovStepPolicy
}

// Execute loads applicable policies, evaluates them via CEL, and returns
// the action (enriched) or a rejection. Policy evaluation is the third
// step in the governance pipeline.
func (s *PolicyGovernanceStep) Execute(ctx context.Context, action domain.AgentAction) (domain.AgentAction, error) {
	action.PipelineStage = domain.GovStepPolicy
	start := time.Now()

	// Build scope filter from the action context
	scope := domain.PolicyScope{
		AgentTypes:   []string{action.AgentType},
		ToolNames:    []string{action.ToolName},
		Environments: []string{action.Context.EnvironmentID},
		Projects:     []string{action.Context.ProjectID},
	}

	// Remove empty scope fields to avoid filtering out everything
	scope = cleanScope(scope)

	// Load applicable policies for this action's org
	policies, err := s.store.ListApplicablePolicies(ctx, action.Context.OrgID, scope)
	if err != nil {
		s.logger.Error("failed to load policies",
			"org_id", action.Context.OrgID,
			"action_id", action.ID,
			"error", err,
		)
		// Policy engine errors should not block actions — fail open
		// with a warning logged. If policies can't be loaded, the
		// action proceeds but with an audit note.
		action.Context.Metadata["policy_eval_error"] = err.Error()
		s.logger.Warn("policy eval bypassed due to store error",
			"action_id", action.ID,
			"agent_id", action.AgentID,
		)
		return action, nil
	}

	if len(policies) == 0 {
		s.logger.Debug("no applicable policies",
			"action_id", action.ID,
			"agent_id", action.AgentID,
			"org_id", action.Context.OrgID,
		)
		return action, nil
	}

	s.logger.Debug("evaluating policies",
		"action_id", action.ID,
		"agent_id", action.AgentID,
		"policy_count", len(policies),
	)

	// Evaluate all applicable policies
	result, err := s.evaluator.Evaluate(ctx, action, policies)
	if err != nil {
		s.logger.Error("policy evaluation failed",
			"action_id", action.ID,
			"error", err,
		)
		// Fail open — log and allow
		action.Context.Metadata["policy_eval_error"] = err.Error()
		return action, nil
	}

	elapsed := time.Since(start)

	if result.Passed {
		s.logger.Info("policy evaluation passed",
			"action_id", action.ID,
			"agent_id", action.AgentID,
			"policies_evaluated", len(policies),
			"duration_ms", elapsed.Milliseconds(),
		)
		// Enrich action with policy metadata for downstream steps
		action.Context.Metadata["policy_eval_result"] = "passed"
		action.Context.Metadata["policy_eval_count"] = fmt.Sprintf("%d", len(policies))
		return action, nil
	}

	// Policy evaluation failed — determine the response based on effect
	switch result.Effect {
	case domain.PolicyEffectDeny:
		s.logger.Warn("policy denied action",
			"action_id", action.ID,
			"agent_id", action.AgentID,
			"failures", len(result.Failures),
			"duration_ms", elapsed.Milliseconds(),
		)
		return action, &domain.GovernanceError{
			Step:           domain.GovStepPolicy,
			Reason:         "policy_violation",
			Message:        formatFailures(result.Failures),
			RequiresHuman:  true,
			OverrideInstructions: "Review policy violations in the dashboard and override if authorized.",
		}

	case domain.PolicyEffectRequireHuman:
		s.logger.Warn("policy requires human approval",
			"action_id", action.ID,
			"agent_id", action.AgentID,
			"failures", len(result.Failures),
			"duration_ms", elapsed.Milliseconds(),
		)
		return action, &domain.GovernanceError{
			Step:           domain.GovStepPolicy,
			Reason:         "policy_requires_human",
			Message:        formatFailures(result.Failures),
			RequiresHuman:  true,
			OverrideInstructions: "A human must approve this action. Review the policy violations and approve or deny.",
		}

	case domain.PolicyEffectWarn:
		s.logger.Warn("policy warning (action allowed)",
			"action_id", action.ID,
			"agent_id", action.AgentID,
			"failures", len(result.Failures),
			"duration_ms", elapsed.Milliseconds(),
		)
		// Allow the action but attach warnings
		action.Context.Metadata["policy_warnings"] = formatFailures(result.Failures)
		return action, nil

	case domain.PolicyEffectAudit:
		s.logger.Info("policy audit (action allowed, high-severity audit)",
			"action_id", action.ID,
			"agent_id", action.AgentID,
			"failures", len(result.Failures),
			"duration_ms", elapsed.Milliseconds(),
		)
		// Allow the action but attach audit metadata
		action.Context.Metadata["policy_audit"] = formatFailures(result.Failures)
		return action, nil

	default:
		s.logger.Warn("unknown policy effect, allowing action",
			"effect", string(result.Effect),
			"action_id", action.ID,
		)
		return action, nil
	}
}

// formatFailures produces a human-readable summary of policy rule failures.
func formatFailures(failures []domain.PolicyRuleFailure) string {
	if len(failures) == 0 {
		return "policy check failed"
	}
	if len(failures) == 1 {
		return failures[0].Message
	}
	msg := fmt.Sprintf("%d policy rules failed: ", len(failures))
	for i, f := range failures {
		if i > 0 {
			msg += "; "
		}
		msg += f.Message
	}
	return msg
}

// cleanScope removes empty fields from a PolicyScope to avoid overly
// restrictive JSONB containment queries. An empty slice in the scope
// means "match any", but in JSONB containment it means "must be empty".
func cleanScope(scope domain.PolicyScope) domain.PolicyScope {
	cleaned := domain.PolicyScope{}
	if len(scope.AgentTypes) > 0 && scope.AgentTypes[0] != "" {
		cleaned.AgentTypes = scope.AgentTypes
	}
	if len(scope.ToolNames) > 0 && scope.ToolNames[0] != "" {
		cleaned.ToolNames = scope.ToolNames
	}
	if len(scope.Environments) > 0 && scope.Environments[0] != "" {
		cleaned.Environments = scope.Environments
	}
	if len(scope.Projects) > 0 && scope.Projects[0] != "" {
		cleaned.Projects = scope.Projects
	}
	return cleaned
}
