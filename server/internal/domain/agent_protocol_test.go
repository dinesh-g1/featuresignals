// Package domain provides core business types for FeatureSignals.
//
// Tests for Internal Agent Protocol (IAP) message serialization —
// round-trip marshal/unmarshal for every payload type.
package domain

import (
	"encoding/json"
	"testing"
	"time"
)

// ─── AgentMessage Round-Trip ────────────────────────────────────────────────

func TestAgentMessage_RoundTrip(t *testing.T) {
	original := AgentMessage{
		ID:        "msg_001",
		Type:      AgentMsgTaskAssign,
		From:      "platform",
		To:        "agent_janitor_1",
		TraceID:   "0af7651916cd43dd8448eb211c80319c",
		TenantID:  "org_123",
		Timestamp: time.Now().UTC().Truncate(time.Millisecond),
		Payload:   json.RawMessage(`{"task":{"id":"task_1","type":"flag.sweep"}}`),
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var restored AgentMessage
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if restored.ID != original.ID {
		t.Errorf("ID: got %q, want %q", restored.ID, original.ID)
	}
	if restored.Type != original.Type {
		t.Errorf("Type: got %q, want %q", restored.Type, original.Type)
	}
	if restored.From != original.From {
		t.Errorf("From: got %q, want %q", restored.From, original.From)
	}
	if restored.To != original.To {
		t.Errorf("To: got %q, want %q", restored.To, original.To)
	}
	if restored.TraceID != original.TraceID {
		t.Errorf("TraceID: got %q, want %q", restored.TraceID, original.TraceID)
	}
	if restored.TenantID != original.TenantID {
		t.Errorf("TenantID: got %q, want %q", restored.TenantID, original.TenantID)
	}
	if !restored.Timestamp.Equal(original.Timestamp) {
		t.Errorf("Timestamp: got %v, want %v", restored.Timestamp, original.Timestamp)
	}
}

// ─── Payload Round-Trips ────────────────────────────────────────────────────

func TestTaskAssignPayload_RoundTrip(t *testing.T) {
	original := TaskAssignPayload{
		Task: Task{
			ID:        "task_1",
			Type:      "flag.sweep",
			Priority:  PriorityHigh,
			CreatedAt: time.Now().UTC().Truncate(time.Millisecond),
		},
		Context: AgentContext{
			OrgID:         "org_123",
			ProjectID:     "proj_1",
			EnvironmentID: "staging",
			MaturityLevel: MaturityL3Supervised,
		},
		AssignedBy: "platform",
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var restored TaskAssignPayload
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if restored.Task.ID != original.Task.ID {
		t.Errorf("Task.ID: got %q, want %q", restored.Task.ID, original.Task.ID)
	}
	if restored.Context.OrgID != original.Context.OrgID {
		t.Errorf("Context.OrgID: got %q, want %q", restored.Context.OrgID, original.Context.OrgID)
	}
	if restored.AssignedBy != original.AssignedBy {
		t.Errorf("AssignedBy: got %q, want %q", restored.AssignedBy, original.AssignedBy)
	}
}

func TestTaskCompletePayload_RoundTrip(t *testing.T) {
	original := TaskCompletePayload{
		TaskID: "task_1",
		Decision: Decision{
			Action:     "sweep",
			Confidence: 0.95,
		},
		Reasoning: Reasoning{
			Summary: "Flag is unused for 90 days",
			Steps: []ReasoningStep{
				{Thought: "Check last evaluation", Confidence: 0.95},
			},
		},
		LatencyMs: 150,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var restored TaskCompletePayload
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if restored.TaskID != original.TaskID {
		t.Errorf("TaskID: got %q, want %q", restored.TaskID, original.TaskID)
	}
	if restored.Decision.Action != original.Decision.Action {
		t.Errorf("Decision.Action: got %q, want %q", restored.Decision.Action, original.Decision.Action)
	}
	if restored.Reasoning.Summary != original.Reasoning.Summary {
		t.Errorf("Reasoning.Summary: got %q, want %q", restored.Reasoning.Summary, original.Reasoning.Summary)
	}
	if restored.LatencyMs != original.LatencyMs {
		t.Errorf("LatencyMs: got %d, want %d", restored.LatencyMs, original.LatencyMs)
	}
}

func TestTaskRejectPayload_RoundTrip(t *testing.T) {
	original := TaskRejectPayload{
		TaskID: "task_1",
		Reason: "agent is offline",
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var restored TaskRejectPayload
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if restored.TaskID != original.TaskID {
		t.Errorf("TaskID: got %q, want %q", restored.TaskID, original.TaskID)
	}
	if restored.Reason != original.Reason {
		t.Errorf("Reason: got %q, want %q", restored.Reason, original.Reason)
	}
}

func TestAgentCapabilitiesPayload_RoundTrip(t *testing.T) {
	original := AgentCapabilitiesPayload{
		AgentID:   "agt_123",
		AgentType: "janitor",
		BrainType: BrainTypeLLM,
		Tools:     []string{"flag.sweep", "flag.list", "audit.read"},
		Scopes:    []string{"flag:staging:sweep", "flag:staging:read"},
		Maturity:  MaturityL3Supervised,
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var restored AgentCapabilitiesPayload
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if restored.AgentID != original.AgentID {
		t.Errorf("AgentID: got %q, want %q", restored.AgentID, original.AgentID)
	}
	if len(restored.Tools) != len(original.Tools) {
		t.Errorf("Tools length: got %d, want %d", len(restored.Tools), len(original.Tools))
	}
	if restored.Maturity != original.Maturity {
		t.Errorf("Maturity: got %d, want %d", restored.Maturity, original.Maturity)
	}
}

func TestHumanApprovalPayload_RoundTrip(t *testing.T) {
	deadline := time.Now().UTC().Add(1 * time.Hour).Truncate(time.Millisecond)
	original := HumanApprovalPayload{
		AgentAction: AgentAction{
			ID:        "act_001",
			AgentID:   "agt_123",
			AgentType: "janitor",
			ToolName:  "flag.delete",
			Context: AgentContext{
				OrgID:         "org_123",
				EnvironmentID: "production",
			},
		},
		Question:    "Should I delete the flag 'old-feature' from production?",
		Deadline:    deadline,
		ApprovalURL: "https://app.featuresignals.io/approvals/act_001",
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var restored HumanApprovalPayload
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if restored.Question != original.Question {
		t.Errorf("Question: got %q, want %q", restored.Question, original.Question)
	}
	if restored.ApprovalURL != original.ApprovalURL {
		t.Errorf("ApprovalURL: got %q, want %q", restored.ApprovalURL, original.ApprovalURL)
	}
	if !restored.Deadline.Equal(original.Deadline) {
		t.Errorf("Deadline: got %v, want %v", restored.Deadline, original.Deadline)
	}
}

func TestHumanOverridePayload_RoundTrip(t *testing.T) {
	original := HumanOverridePayload{
		ActionID: "act_001",
		NewDecision: Decision{
			Action:     "skip",
			Confidence: 1.0,
		},
		OverrideReason: "Flag is still needed by mobile app",
		OverriddenBy:   "user_456",
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var restored HumanOverridePayload
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if restored.ActionID != original.ActionID {
		t.Errorf("ActionID: got %q, want %q", restored.ActionID, original.ActionID)
	}
	if restored.NewDecision.Action != original.NewDecision.Action {
		t.Errorf("NewDecision.Action: got %q, want %q", restored.NewDecision.Action, original.NewDecision.Action)
	}
	if restored.OverrideReason != original.OverrideReason {
		t.Errorf("OverrideReason: got %q, want %q", restored.OverrideReason, original.OverrideReason)
	}
}

func TestTeachPayload_RoundTrip(t *testing.T) {
	original := TeachPayload{
		Experience: Experience{
			DecisionID:   "dec_001",
			TaskID:       "task_1",
			Outcome:      "Flag swept successfully, no incidents",
			WasSuccessful: true,
			LatencyMs:    250,
		},
		FromAgent: "agt_sentinel_1",
		ToAgent:   "agt_janitor_2",
	}

	data, err := json.Marshal(original)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}

	var restored TeachPayload
	if err := json.Unmarshal(data, &restored); err != nil {
		t.Fatalf("unmarshal: %v", err)
	}

	if restored.Experience.DecisionID != original.Experience.DecisionID {
		t.Errorf("DecisionID: got %q, want %q", restored.Experience.DecisionID, original.Experience.DecisionID)
	}
	if restored.Experience.Outcome != original.Experience.Outcome {
		t.Errorf("Outcome: got %q, want %q", restored.Experience.Outcome, original.Experience.Outcome)
	}
	if restored.FromAgent != original.FromAgent {
		t.Errorf("FromAgent: got %q, want %q", restored.FromAgent, original.FromAgent)
	}
}

// ─── Forward-Compatibility Tests ────────────────────────────────────────────

func TestAgentMessage_UnknownFieldsIgnored(t *testing.T) {
	// Simulate a future version adding an unknown field
	data := []byte(`{
		"id": "msg_001",
		"type": "task.assign",
		"from": "platform",
		"timestamp": "2026-05-23T00:00:00Z",
		"payload": {},
		"future_field": "should be ignored",
		"nested": {"also": "ignored"}
	}`)

	var msg AgentMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		t.Fatalf("unmarshal with unknown fields: %v", err)
	}
	if msg.ID != "msg_001" {
		t.Errorf("ID: got %q, want %q", msg.ID, "msg_001")
	}
}

func TestAgentMessage_UnknownTypeAccepted(t *testing.T) {
	data := []byte(`{
		"id": "msg_002",
		"type": "future.message.type",
		"timestamp": "2026-05-23T00:00:00Z",
		"payload": {}
	}`)

	var msg AgentMessage
	if err := json.Unmarshal(data, &msg); err != nil {
		t.Fatalf("unmarshal with unknown type: %v", err)
	}
	if msg.Type != AgentMessageType("future.message.type") {
		t.Errorf("Type: got %q, want %q", msg.Type, "future.message.type")
	}
}

// ─── Envelope Validation ────────────────────────────────────────────────────

func TestAgentMessage_MissingRequiredFields(t *testing.T) {
	tests := []struct {
		name string
		json string
	}{
		{"missing id", `{"type":"task.assign","timestamp":"2026-05-23T00:00:00Z","payload":{}}`},
		{"missing type", `{"id":"msg_001","timestamp":"2026-05-23T00:00:00Z","payload":{}}`},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var msg AgentMessage
			if err := json.Unmarshal([]byte(tc.json), &msg); err != nil {
				t.Fatalf("unmarshal should not error for missing fields: %v", err)
			}
			// ID should be empty if missing
			if tc.name == "missing id" && msg.ID != "" {
				t.Errorf("expected empty ID, got %q", msg.ID)
			}
			// Type should be empty if missing
			if tc.name == "missing type" && msg.Type != "" {
				t.Errorf("expected empty Type, got %q", msg.Type)
			}
		})
	}
}
