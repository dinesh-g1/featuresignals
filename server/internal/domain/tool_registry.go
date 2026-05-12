// Package domain defines the core business interfaces for FeatureSignals.
//
// ToolRegistry is the protocol-agnostic interface for agent tool execution.
// MCP, ACP, or any future agent protocol translates its tool calls into
// ToolRegistry calls. The registry is the source of truth for what tools
// are available — adapters are just translation layers.
package domain

import (
	"context"
	"encoding/json"
)

// ─── Tool definition ──────────────────────────────────────────────────────

// Tool represents a capability that an agent can invoke. Tools are the
// atomic units of agent action — every agent operation goes through a tool.
type Tool struct {
	// Name uniquely identifies the tool (e.g., "flag.evaluate",
	// "rollout.advance", "incident.correlate").
	Name string `json:"name"`

	// DisplayName is a human-readable label.
	DisplayName string `json:"display_name"`

	// Description explains what the tool does, suitable for LLM function
	// calling descriptions.
	Description string `json:"description"`

	// Parameters is the JSON Schema for the tool's input parameters.
	// Follows the JSON Schema spec (https://json-schema.org).
	Parameters json.RawMessage `json:"parameters"`

	// Returns describes the tool's output shape (JSON Schema).
	Returns json.RawMessage `json:"returns,omitempty"`

	// Scopes are the permissions required to use this tool.
	// Format: "resource:action" (e.g., "flag:read", "environment:write").
	Scopes []string `json:"scopes"`

	// IsDangerous indicates the tool can cause irreversible changes
	// (e.g., toggle a production flag, delete data). Dangerous tools
	// require higher maturity levels or explicit human approval.
	IsDangerous bool `json:"is_dangerous"`

	// IsIdempotent indicates the tool can be safely retried with the
	// same parameters. Used for automatic retry logic.
	IsIdempotent bool `json:"is_idempotent"`

	// TimeoutMs is the maximum execution time in milliseconds.
	TimeoutMs int `json:"timeout_ms"`

	// MaturityRequired is the minimum maturity level an agent must have
	// to use this tool in production contexts.
	MaturityRequired MaturityLevel `json:"maturity_required"`
}

// ─── ToolRegistry interface ────────────────────────────────────────────────

// ToolRegistry is the central directory of tools available to agents.
// It is protocol-agnostic: MCP tools, ACP tools, and internal tools all
// register here. Protocol adapters translate external requests into
// ToolRegistry calls.
//
// Implementations must be safe for concurrent use. Tools are registered
// once at startup and then looked up by name for execution.
type ToolRegistry interface {
	// Register adds a tool to the registry. Returns an error if a tool
	// with the same name already exists (use MustRegister for idempotent
	// registration). The handler is the function that executes the tool.
	Register(tool Tool, handler ToolHandler) error

	// MustRegister adds a tool to the registry, overwriting any existing
	// tool with the same name. Safe to call at startup for idempotent init.
	MustRegister(tool Tool, handler ToolHandler)

	// Execute runs the named tool with the given parameters. The handler
	// receives the caller's context, agent identity, and parameters.
	// Returns the tool's output as raw JSON.
	Execute(ctx context.Context, toolName string, caller Agent, params json.RawMessage) (json.RawMessage, error)

	// List returns all registered tools visible to the given agent
	// (respects scopes). If agent is nil, returns all tools.
	List(ctx context.Context, caller *Agent) ([]Tool, error)

	// Get returns a single tool by name, or ErrNotFound if not registered.
	Get(ctx context.Context, toolName string) (Tool, error)
}

// ToolHandler is the function that implements a tool's behavior.
// It receives the caller's context and parsed parameters, and returns
// the tool's output as JSON.
//
// Handlers should:
//   - Validate parameters before execution
//   - Respect context cancellation
//   - Return structured errors (never panic)
//   - Log at the boundary with caller identity
type ToolHandler func(ctx context.Context, caller Agent, params json.RawMessage) (json.RawMessage, error)
