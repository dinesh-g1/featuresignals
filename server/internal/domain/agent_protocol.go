// Package domain defines the core business interfaces for FeatureSignals.
//
// This file defines the Internal Agent Protocol (IAP) — the message
// types agents use to communicate with each other and with the Agent
// Runtime. IAP is protocol-agnostic: MCP, ACP, or any future protocol
// is an adapter that translates external messages into IAP messages.
//
// Design principle: MCP is an adapter, not our internal protocol.
// If MCP is replaced by ACP tomorrow, only the adapter changes —
// the IAP messages and the Agent Runtime remain unchanged.
package domain

import (
	"encoding/json"
	"time"
)

// ─── IAP Message Envelope ──────────────────────────────────────────────────

// AgentMessage is the top-level envelope for all internal agent
// communication. It wraps a typed payload with routing, tracing,
// and security metadata.
type AgentMessage struct {
	// ID uniquely identifies this message for idempotency and correlation.
	ID string `json:"id"`

	// Type categorizes the message (see AgentMessageType constants).
	Type AgentMessageType `json:"type"`

	// From identifies the sending agent. Empty for platform-originated messages.
	From string `json:"from,omitempty"`

	// To identifies the target agent. Empty for broadcasts.
	To string `json:"to,omitempty"`

	// ReplyTo is the message ID this is a response to, for request/reply.
	ReplyTo string `json:"reply_to,omitempty"`

	// TraceID carries the OpenTelemetry trace context.
	TraceID string `json:"trace_id,omitempty"`

	// TenantID is the organization for multi-tenant routing.
	TenantID string `json:"tenant_id,omitempty"`

	// Timestamp is when the message was created.
	Timestamp time.Time `json:"timestamp"`

	// Payload is the typed message body. Interpretation depends on Type.
	Payload json.RawMessage `json:"payload"`
}

// AgentMessageType enumerates the kinds of messages agents exchange.
type AgentMessageType string

const (
	// Task assignment and execution
	AgentMsgTaskAssign    AgentMessageType = "task.assign"    // Platform → Agent: execute this task
	AgentMsgTaskAccept    AgentMessageType = "task.accept"    // Agent → Platform: I'll do it
	AgentMsgTaskReject    AgentMessageType = "task.reject"    // Agent → Platform: can't do it
	AgentMsgTaskComplete  AgentMessageType = "task.complete"  // Agent → Platform: done, here's the result
	AgentMsgTaskProgress  AgentMessageType = "task.progress"  // Agent → Platform: still working

	// Agent discovery and capability
	AgentMsgDiscover      AgentMessageType = "discover"       // Agent → Registry: what agents exist?
	AgentMsgCapabilities  AgentMessageType = "capabilities"   // Agent → Agent: here's what I can do
	AgentMsgRegister      AgentMessageType = "register"       // Agent → Registry: I'm online
	AgentMsgUnregister    AgentMessageType = "unregister"     // Agent → Registry: I'm going offline
	AgentMsgHeartbeat     AgentMessageType = "heartbeat"      // Agent → Registry: still alive

	// Inter-agent collaboration
	AgentMsgRequest       AgentMessageType = "request"        // Agent → Agent: I need help
	AgentMsgResponse      AgentMessageType = "response"       // Agent → Agent: here's the help
	AgentMsgTeach         AgentMessageType = "teach"          // Agent → Agent: learn from my experience
	AgentMsgDelegate      AgentMessageType = "delegate"       // Agent → Agent: you handle this subtask

	// Human interaction
	AgentMsgHumanApproval AgentMessageType = "human.approval" // Agent → Human: approve this action
	AgentMsgHumanOverride AgentMessageType = "human.override" // Human → Agent: do this instead
	AgentMsgHumanQuery    AgentMessageType = "human.query"    // Agent → Human: I have a question

	// Governance and audit
	AgentMsgGovernanceCheck AgentMessageType = "governance.check"  // Agent → Pipeline: validate this action
	AgentMsgGovernancePass  AgentMessageType = "governance.pass"   // Pipeline → Agent: approved
	AgentMsgGovernanceReject AgentMessageType = "governance.reject" // Pipeline → Agent: denied
	AgentMsgAuditLog        AgentMessageType = "audit.log"         // Agent → Audit: record this
)

// ─── Common payload types ──────────────────────────────────────────────────

// TaskAssignPayload is the body of a task.assign message.
type TaskAssignPayload struct {
	Task      Task         `json:"task"`
	Context   AgentContext `json:"context"`
	AssignedBy string      `json:"assigned_by"` // agent ID or "platform"
}

// TaskCompletePayload is the body of a task.complete message.
type TaskCompletePayload struct {
	TaskID    string    `json:"task_id"`
	Decision  Decision  `json:"decision"`
	Reasoning Reasoning `json:"reasoning"`
	LatencyMs int64     `json:"latency_ms"`
}

// TaskRejectPayload is the body of a task.reject message.
type TaskRejectPayload struct {
	TaskID string `json:"task_id"`
	Reason string `json:"reason"`
}

// AgentCapabilitiesPayload is the body of a capabilities message.
type AgentCapabilitiesPayload struct {
	AgentID   string   `json:"agent_id"`
	AgentType string   `json:"agent_type"`
	BrainType BrainType `json:"brain_type"`
	Tools     []string `json:"tools"`       // tool names this agent has access to
	Scopes    []string `json:"scopes"`      // authorized scopes
	Maturity  MaturityLevel `json:"maturity"`
	MaxConcurrency int   `json:"max_concurrency"`
}

// HumanApprovalPayload is the body of a human.approval message.
type HumanApprovalPayload struct {
	AgentAction AgentAction `json:"action"`
	Question    string      `json:"question"` // what the human needs to decide
	Deadline    time.Time   `json:"deadline,omitempty"`
	ApprovalURL string      `json:"approval_url,omitempty"` // deep link to dashboard
}

// HumanOverridePayload is the body of a human.override message.
type HumanOverridePayload struct {
	ActionID  string          `json:"action_id"`
	NewDecision Decision      `json:"new_decision"`
	OverrideReason string     `json:"override_reason"`
	OverriddenBy   string     `json:"overridden_by"` // user ID
}

// TeachPayload is the body of a teach message (agent → agent learning).
type TeachPayload struct {
	Experience Experience `json:"experience"`
	FromAgent  string     `json:"from_agent"`
	ToAgent    string     `json:"to_agent"`
}
