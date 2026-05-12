// Package agent provides the Agent Runtime implementation — the
// protocol-agnostic engine that powers all FeatureSignals agents.
//
// This file implements the domain.ToolRegistry and domain.GovernancePipeline
// interfaces with in-memory, concurrency-safe defaults suitable for
// single-instance deployments and testing.
package agent

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── In-Memory ToolRegistry ────────────────────────────────────────────────

// InMemoryToolRegistry implements domain.ToolRegistry with a concurrency-safe
// in-memory map. Tools are registered at startup and looked up by name.
type InMemoryToolRegistry struct {
	mu       sync.RWMutex
	tools    map[string]domain.Tool
	handlers map[string]domain.ToolHandler
	logger   *slog.Logger
}

// NewInMemoryToolRegistry creates an empty tool registry.
func NewInMemoryToolRegistry(logger *slog.Logger) *InMemoryToolRegistry {
	return &InMemoryToolRegistry{
		tools:    make(map[string]domain.Tool),
		handlers: make(map[string]domain.ToolHandler),
		logger:   logger.With("component", "tool_registry"),
	}
}

func (r *InMemoryToolRegistry) Register(tool domain.Tool, handler domain.ToolHandler) error {
	r.mu.Lock()
	defer r.mu.Unlock()
	if _, exists := r.tools[tool.Name]; exists {
		return fmt.Errorf("tool %q already registered", tool.Name)
	}
	r.tools[tool.Name] = tool
	r.handlers[tool.Name] = handler
	r.logger.Info("tool registered",
		"name", tool.Name,
		"dangerous", tool.IsDangerous,
		"maturity_required", tool.MaturityRequired,
	)
	return nil
}

func (r *InMemoryToolRegistry) MustRegister(tool domain.Tool, handler domain.ToolHandler) {
	r.mu.Lock()
	defer r.mu.Unlock()
	r.tools[tool.Name] = tool
	r.handlers[tool.Name] = handler
	r.logger.Info("tool registered (must)", "name", tool.Name)
}

func (r *InMemoryToolRegistry) Execute(ctx context.Context, toolName string, caller domain.Agent, params json.RawMessage) (json.RawMessage, error) {
	r.mu.RLock()
	tool, toolExists := r.tools[toolName]
	handler, handlerExists := r.handlers[toolName]
	r.mu.RUnlock()

	if !toolExists || !handlerExists {
		return nil, domain.WrapNotFound(toolName)
	}

	// Check maturity requirement
	if caller.Maturity.CurrentLevel < tool.MaturityRequired {
		return nil, &domain.GovernanceError{
			Step:    domain.GovStepMaturity,
			Reason:  "insufficient_maturity",
			Message: fmt.Sprintf("agent %q maturity L%d < required L%d for tool %q",
				caller.ID, caller.Maturity.CurrentLevel, tool.MaturityRequired, toolName),
			RequiresHuman: true,
		}
	}

	start := time.Now()
	result, err := handler(ctx, caller, params)
	elapsed := time.Since(start)

	if err != nil {
		r.logger.Warn("tool execution failed",
			"tool", toolName,
			"agent_id", caller.ID,
			"error", err,
			"latency_ms", elapsed.Milliseconds(),
		)
		return nil, err
	}

	r.logger.Debug("tool executed",
		"tool", toolName,
		"agent_id", caller.ID,
		"latency_ms", elapsed.Milliseconds(),
	)
	return result, nil
}

func (r *InMemoryToolRegistry) List(_ context.Context, caller *domain.Agent) ([]domain.Tool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	tools := make([]domain.Tool, 0, len(r.tools))
	for _, tool := range r.tools {
		if caller == nil || r.agentHasScope(caller, tool.Scopes) {
			tools = append(tools, tool)
		}
	}
	return tools, nil
}

func (r *InMemoryToolRegistry) Get(_ context.Context, toolName string) (domain.Tool, error) {
	r.mu.RLock()
	defer r.mu.RUnlock()

	tool, exists := r.tools[toolName]
	if !exists {
		return domain.Tool{}, domain.WrapNotFound(toolName)
	}
	return tool, nil
}

func (r *InMemoryToolRegistry) agentHasScope(caller *domain.Agent, requiredScopes []string) bool {
	if len(requiredScopes) == 0 {
		return true
	}
	callerScopes := make(map[string]bool, len(caller.Scopes))
	for _, s := range caller.Scopes {
		callerScopes[s] = true
	}
	for _, required := range requiredScopes {
		if !callerScopes[required] {
			return false
		}
	}
	return true
}

// ─── In-Memory GovernancePipeline ──────────────────────────────────────────

// InMemoryPipeline implements domain.GovernancePipeline with an ordered
// slice of steps. It executes each step sequentially with a 10ms per-step
// latency budget.
type InMemoryPipeline struct {
	mu     sync.RWMutex
	steps  []domain.GovernanceStep
	logger *slog.Logger
}

// NewInMemoryPipeline creates an empty governance pipeline.
func NewInMemoryPipeline(logger *slog.Logger) *InMemoryPipeline {
	return &InMemoryPipeline{
		logger: logger.With("component", "governance_pipeline"),
	}
}

func (p *InMemoryPipeline) Execute(ctx context.Context, action domain.AgentAction) (domain.AgentAction, error) {
	p.mu.RLock()
	steps := make([]domain.GovernanceStep, len(p.steps))
	copy(steps, p.steps)
	p.mu.RUnlock()

	for _, step := range steps {
		stepCtx, stepCancel := context.WithTimeout(ctx, 10*time.Millisecond)
		action.PipelineStage = step.Name()

		next, err := step.Execute(stepCtx, action)
		stepCancel()

		if err != nil {
			p.logger.Warn("governance step rejected action",
				"step", step.Name(),
				"agent_id", action.AgentID,
				"action_id", action.ID,
				"error", err,
			)
			return action, err
		}
		action = next
	}

	p.logger.Debug("governance pipeline passed",
		"agent_id", action.AgentID,
		"action_id", action.ID,
		"steps", len(steps),
	)
	return action, nil
}

func (p *InMemoryPipeline) Steps() []string {
	p.mu.RLock()
	defer p.mu.RUnlock()
	names := make([]string, len(p.steps))
	for i, s := range p.steps {
		names[i] = s.Name()
	}
	return names
}

func (p *InMemoryPipeline) AddStep(step domain.GovernanceStep) {
	p.mu.Lock()
	defer p.mu.Unlock()
	p.steps = append(p.steps, step)
	p.logger.Info("governance step added", "step", step.Name(), "total", len(p.steps))
}

func (p *InMemoryPipeline) InsertStep(index int, step domain.GovernanceStep) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	if index < 0 || index > len(p.steps) {
		return fmt.Errorf("governance pipeline: insert index %d out of bounds [0, %d]", index, len(p.steps))
	}
	p.steps = append(p.steps[:index], append([]domain.GovernanceStep{step}, p.steps[index:]...)...)
	p.logger.Info("governance step inserted", "step", step.Name(), "index", index, "total", len(p.steps))
	return nil
}

func (p *InMemoryPipeline) RemoveStep(name string) error {
	p.mu.Lock()
	defer p.mu.Unlock()
	for i, step := range p.steps {
		if step.Name() == name {
			p.steps = append(p.steps[:i], p.steps[i+1:]...)
			p.logger.Info("governance step removed", "step", name, "total", len(p.steps))
			return nil
		}
	}
	return fmt.Errorf("governance pipeline: step %q not found", name)
}
