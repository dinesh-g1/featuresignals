// Package agent provides the Agent Runtime implementation.
//
// AuditGovernanceStep implements domain.GovernanceStep for the "audit"
// stage of the 7-step governance pipeline. It records the agent action
// in the audit log with a tamper-evident integrity hash chain.
package agent

import (
	"context"
	"encoding/json"
	"log/slog"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// AuditGovernanceStep records agent actions in the audit log. It is the
// final (seventh) step in the governance pipeline. Audit entries are
// written asynchronously — a failure to write an audit entry does not
// block the action (fail-open for audit, fail-closed for everything else).
type AuditGovernanceStep struct {
	store  domain.AuditWriter
	logger *slog.Logger
}

// NewAuditGovernanceStep creates the audit governance step.
func NewAuditGovernanceStep(store domain.AuditWriter, logger *slog.Logger) *AuditGovernanceStep {
	return &AuditGovernanceStep{
		store:  store,
		logger: logger.With("step", domain.GovStepAudit),
	}
}

// Name returns the step's identifier.
func (s *AuditGovernanceStep) Name() string {
	return domain.GovStepAudit
}

// Execute records the action in the audit log. Audit writes are
// fire-and-forget — if the write fails, the action still proceeds
// (fail-open) but the failure is logged at ERROR level.
func (s *AuditGovernanceStep) Execute(ctx context.Context, action domain.AgentAction) (domain.AgentAction, error) {
	action.PipelineStage = domain.GovStepAudit

	entry := buildAuditEntry(action)
	if entry == nil {
		s.logger.Warn("skipping audit: could not build audit entry",
			"agent_id", action.AgentID,
			"action_id", action.ID,
		)
		return action, nil
	}

	// Write audit entry with a background context + timeout.
	// Audit writes are fire-and-forget for the action pipeline (fail-open),
	// but use context.Background() with a timeout to respect shutdown.
	// The parent action context may be cancelled after the pipeline completes.
	writeCtx, writeCancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer writeCancel()

	if err := s.store.CreateAuditEntry(writeCtx, entry); err != nil {
		s.logger.Error("failed to write audit entry",
			"agent_id", action.AgentID,
			"action_id", action.ID,
			"error", err,
		)
	}

	s.logger.Debug("audit step passed",
		"agent_id", action.AgentID,
		"action_id", action.ID,
		"audit_entry_id", entry.ID,
	)
	return action, nil
}

// buildAuditEntry constructs an AuditEntry from an AgentAction.
func buildAuditEntry(action domain.AgentAction) *domain.AuditEntry {
	now := time.Now().UTC()

	// Serialize action metadata for the audit record
	beforeState := json.RawMessage("null")
	afterState, err := json.Marshal(map[string]any{
		"decision":    action.Decision.Action,
		"confidence":  action.Decision.Confidence,
		"tool_name":   action.ToolName,
		"tool_params": string(action.ToolParams),
		"pipeline_stage": action.PipelineStage,
	})
	if err != nil {
		afterState = json.RawMessage("{}")
	}

	projectID := action.Context.ProjectID
	if projectID == "" {
		projectID = "unknown"
	}

	return &domain.AuditEntry{
		ID:           "audit_agent_" + action.ID,
		OrgID:        action.Context.OrgID,
		ProjectID:    &projectID,
		ActorID:      &action.AgentID,
		ActorType:    "agent",
		Action:       "agent.action." + action.Decision.Action,
		ResourceType: "agent_action",
		ResourceID:   &action.ID,
		BeforeState:  beforeState,
		AfterState:   afterState,
		Metadata:     nil,
		CreatedAt:    now,
	}
}
