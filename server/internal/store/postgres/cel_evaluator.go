// Package postgres contains the CELPolicyEvaluator — the CEL expression
// evaluation engine for governance policies. It builds a sandboxed CEL
// environment exposing action, agent, context, blast_radius, and now
// variables, then evaluates each policy rule against that environment.
//
// The evaluator is stateless and safe for concurrent use. Evaluation is
// bounded by a configurable timeout (default 10ms per policy).
package postgres

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/google/cel-go/cel"

	"github.com/featuresignals/server/internal/domain"
)

// CELPolicyEvaluator evaluates CEL-based governance policies against
// agent actions. It is stateless — all configuration comes from the
// constructor and all policy data comes from the arguments.
type CELPolicyEvaluator struct {
	maxPolicies int
	timeout     time.Duration
	logger      *slog.Logger
}

// NewCELPolicyEvaluator creates a new evaluator with the given bounds.
func NewCELPolicyEvaluator(maxPolicies int, timeoutMs int, logger *slog.Logger) *CELPolicyEvaluator {
	return &CELPolicyEvaluator{
		maxPolicies: maxPolicies,
		timeout:     time.Duration(timeoutMs) * time.Millisecond,
		logger:      logger.With("component", "cel_evaluator"),
	}
}

// Evaluate runs each enabled policy's rules against the action and returns
// a combined result. Policies are evaluated in priority order. If a deny
// policy fails, evaluation short-circuits.
func (e *CELPolicyEvaluator) Evaluate(ctx context.Context, action domain.AgentAction, policies []domain.Policy) (*domain.PolicyEvalResult, error) {
	if len(policies) > e.maxPolicies {
		policies = policies[:e.maxPolicies]
		e.logger.Warn("truncating policies to max",
			"action_id", action.ID,
			"total", len(policies),
			"max", e.maxPolicies,
		)
	}

	if len(policies) == 0 {
		return &domain.PolicyEvalResult{
			Passed:      true,
			EvaluatedAt: time.Now(),
		}, nil
	}

	// Build CEL environment with action data injected as variables.
	env, err := e.buildEnv()
	if err != nil {
		return nil, fmt.Errorf("build cel environment: %w", err)
	}

	// Flatten the action into a map for CEL variable binding.
	actionData := flattenAction(action)

	var combinedFailures []domain.PolicyRuleFailure
	worstEffect := domain.PolicyEffectAudit
	overallPassed := true
	start := time.Now()

	for _, policy := range policies {
		policyCtx, cancel := context.WithTimeout(ctx, e.timeout)
		result := e.evaluatePolicy(policyCtx, env, policy, actionData)
		cancel()

		if !result.Passed {
			overallPassed = false
			combinedFailures = append(combinedFailures, result.Failures...)
			worstEffect = worseEffect(worstEffect, result.Effect)

			if result.Effect == domain.PolicyEffectDeny {
				e.logger.Warn("policy denied action",
					"policy_id", policy.ID,
					"policy_name", policy.Name,
					"action_id", action.ID,
					"agent_id", action.AgentID,
					"failures", len(result.Failures),
				)
				break
			}
		}
	}

	return &domain.PolicyEvalResult{
		PolicyID:       "",
		PolicyName:     "combined",
		Passed:         overallPassed,
		Failures:       combinedFailures,
		Effect:         worstEffect,
		EvaluatedAt:    time.Now(),
		EvalDurationMs: time.Since(start).Milliseconds(),
	}, nil
}

// evaluatePolicy evaluates a single policy's rules against the action data.
func (e *CELPolicyEvaluator) evaluatePolicy(ctx context.Context, env *cel.Env, policy domain.Policy, actionData map[string]any) domain.PolicyEvalResult {
	result := domain.PolicyEvalResult{
		PolicyID:    policy.ID,
		PolicyName:  policy.Name,
		Passed:      true,
		Effect:      policy.Effect,
		EvaluatedAt: time.Now(),
	}

	for _, rule := range policy.Rules {
		select {
		case <-ctx.Done():
			result.Passed = false
			result.Failures = append(result.Failures, domain.PolicyRuleFailure{
				RuleName:    rule.Name,
				Expression:  rule.Expression,
				Message:     "evaluation timed out",
				ActualValue: "timeout",
			})
			return result
		default:
		}

		passed, actualValue := e.evaluateRule(env, rule, actionData)
		if !passed {
			result.Passed = false
			result.Failures = append(result.Failures, domain.PolicyRuleFailure{
				RuleName:    rule.Name,
				Expression:  rule.Expression,
				Message:     rule.Message,
				ActualValue: actualValue,
			})
		}
	}

	result.EvalDurationMs = time.Since(result.EvaluatedAt).Milliseconds()
	return result
}

// evaluateRule compiles and evaluates a single CEL expression.
func (e *CELPolicyEvaluator) evaluateRule(env *cel.Env, rule domain.PolicyRule, vars map[string]any) (bool, string) {
	ast, issues := env.Compile(rule.Expression)
	if issues != nil && issues.Err() != nil {
		e.logger.Error("cel compile error",
			"rule", rule.Name,
			"expression", rule.Expression,
			"error", issues.Err(),
		)
		return false, fmt.Sprintf("compile error: %v", issues.Err())
	}

	prg, err := env.Program(ast)
	if err != nil {
		e.logger.Error("cel program error",
			"rule", rule.Name,
			"expression", rule.Expression,
			"error", err,
		)
		return false, fmt.Sprintf("program error: %v", err)
	}

	out, _, err := prg.Eval(vars)
	if err != nil {
		e.logger.Warn("cel eval error",
			"rule", rule.Name,
			"expression", rule.Expression,
			"error", err,
		)
		return false, fmt.Sprintf("eval error: %v", err)
	}

	boolVal, ok := out.Value().(bool)
	if !ok {
		return false, fmt.Sprintf("non-boolean result: %v (%T)", out.Value(), out.Value())
	}

	return boolVal, fmt.Sprintf("%v", out.Value())
}

// buildEnv constructs a CEL environment declaring all variables that
// policies can reference: action, agent, context, blast_radius, and now.
func (e *CELPolicyEvaluator) buildEnv() (*cel.Env, error) {
	env, err := cel.NewEnv(
		cel.Variable("action", cel.DynType),
		cel.Variable("agent", cel.DynType),
		cel.Variable("context", cel.DynType),
		cel.Variable("blast_radius", cel.DynType),
		cel.Variable("now", cel.TimestampType),
	)
	if err != nil {
		return nil, err
	}
	return env, nil
}

// worseEffect returns the more severe of two policy effects.
// Order: deny > require_human > warn > audit
func worseEffect(a, b domain.PolicyEffect) domain.PolicyEffect {
	severity := map[domain.PolicyEffect]int{
		domain.PolicyEffectDeny:         4,
		domain.PolicyEffectRequireHuman: 3,
		domain.PolicyEffectWarn:         2,
		domain.PolicyEffectAudit:        1,
	}
	if severity[a] >= severity[b] {
		return a
	}
	return b
}

// flattenAction converts an AgentAction into a map suitable for CEL
// variable binding. Policy expressions can access nested fields via
// standard CEL map navigation: action.agent_type, context.org_id, etc.
func flattenAction(action domain.AgentAction) map[string]any {
	return map[string]any{
		"action": map[string]any{
			"id":             action.ID,
			"agent_id":       action.AgentID,
			"agent_type":     action.AgentType,
			"task_id":        action.TaskID,
			"tool_name":      action.ToolName,
			"pipeline_stage": action.PipelineStage,
			"proposed_at":    action.ProposedAt.Format(time.RFC3339),
		},
		"agent": map[string]any{
			"id":         action.AgentID,
			"agent_type": action.AgentType,
		},
		"context": map[string]any{
			"org_id":         action.Context.OrgID,
			"project_id":     action.Context.ProjectID,
			"environment_id": action.Context.EnvironmentID,
			"user_id":        action.Context.UserID,
			"maturity_level": int(action.Context.MaturityLevel),
		},
		"blast_radius": map[string]any{
			"affected_entities":   action.BlastRadius.AffectedEntities,
			"affected_percentage": action.BlastRadius.AffectedPercentage,
			"risk_level":          action.BlastRadius.RiskLevel,
		},
		"now": time.Now(),
	}
}
