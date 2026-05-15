// Package agent provides the Agent Runtime implementation.
//
// Tests for the 7 governance pipeline steps.
package agent

import (
	"context"
	"errors"
	"log/slog"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// testLogger creates a logger that discards output for tests.
func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(&discardWriter{}, &slog.HandlerOptions{Level: slog.LevelError}))
}

type discardWriter struct{}

func (w *discardWriter) Write(p []byte) (int, error) { return len(p), nil }

// ─── Helpers ────────────────────────────────────────────────────────────────

func newTestAction(agentID, orgID string) domain.AgentAction {
	return domain.AgentAction{
		ID:        "act_test_001",
		AgentID:   agentID,
		AgentType: "janitor",
		ToolName:  "flag.sweep",
		Context: domain.AgentContext{
			OrgID:         orgID,
			ProjectID:     "proj_test",
			EnvironmentID: "staging",
			MaturityLevel: domain.MaturityL3Supervised,
			Metadata:      make(map[string]any),
		},
		BlastRadius: domain.BlastRadiusEstimate{
			AffectedEntities:    100,
			AffectedPercentage:  1.0,
			RiskLevel:           "low",
			Rationale:           "test action",
		},
		Decision: domain.Decision{
			Action:     "sweep",
			Confidence: 0.95,
		},
		ProposedAt: time.Now(),
	}
}

// ─── Auth Step ──────────────────────────────────────────────────────────────

func TestAuthStep_Name(t *testing.T) {
	step := NewAuthGovernanceStep(testLogger())
	if step.Name() != domain.GovStepAuth {
		t.Errorf("expected %q, got %q", domain.GovStepAuth, step.Name())
	}
}

func TestAuthStep_RejectsEmptyAgentID(t *testing.T) {
	step := NewAuthGovernanceStep(testLogger())
	action := newTestAction("", "org_123")
	_, err := step.Execute(context.Background(), action)
	if err == nil {
		t.Fatal("expected error for empty AgentID")
	}
	govErr, ok := err.(*domain.GovernanceError)
	if !ok {
		t.Fatalf("expected *domain.GovernanceError, got %T", err)
	}
	if govErr.Step != domain.GovStepAuth {
		t.Errorf("expected step %q, got %q", domain.GovStepAuth, govErr.Step)
	}
	if govErr.Reason != "unauthenticated" {
		t.Errorf("expected reason 'unauthenticated', got %q", govErr.Reason)
	}
}

func TestAuthStep_RejectsEmptyOrgID(t *testing.T) {
	step := NewAuthGovernanceStep(testLogger())
	action := newTestAction("agt_123", "")
	_, err := step.Execute(context.Background(), action)
	if err == nil {
		t.Fatal("expected error for empty OrgID")
	}
	govErr, ok := err.(*domain.GovernanceError)
	if !ok {
		t.Fatalf("expected *domain.GovernanceError, got %T", err)
	}
	if govErr.Reason != "missing_org" {
		t.Errorf("expected reason 'missing_org', got %q", govErr.Reason)
	}
}

func TestAuthStep_PassesValidAction(t *testing.T) {
	step := NewAuthGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.PipelineStage != domain.GovStepAuth {
		t.Errorf("expected PipelineStage %q, got %q", domain.GovStepAuth, result.PipelineStage)
	}
}

// ─── AuthZ Step ─────────────────────────────────────────────────────────────

func TestAuthZStep_Name(t *testing.T) {
	step := NewAuthZGovernanceStep(testLogger())
	if step.Name() != domain.GovStepAuthZ {
		t.Errorf("expected %q, got %q", domain.GovStepAuthZ, step.Name())
	}
}

func TestAuthZStep_PassesWithNoRequiredScopes(t *testing.T) {
	step := NewAuthZGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.PipelineStage != domain.GovStepAuthZ {
		t.Errorf("expected PipelineStage %q, got %q", domain.GovStepAuthZ, result.PipelineStage)
	}
}

func TestAuthZStep_RejectsMissingScopes(t *testing.T) {
	step := NewAuthZGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	action.Context.Metadata["required_scopes"] = []string{"flag:production:toggle"}
	// Agent has no scopes in metadata
	_, err := step.Execute(context.Background(), action)
	if err == nil {
		t.Fatal("expected error for missing scopes")
	}
	govErr, ok := err.(*domain.GovernanceError)
	if !ok {
		t.Fatalf("expected *domain.GovernanceError, got %T", err)
	}
	if govErr.Reason != "no_scopes" {
		t.Errorf("expected reason 'no_scopes', got %q", govErr.Reason)
	}
}

func TestAuthZStep_RejectsInsufficientScopes(t *testing.T) {
	step := NewAuthZGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	action.Context.Metadata["required_scopes"] = []string{"flag:production:toggle", "flag:delete"}
	action.Context.Metadata["agent_scopes"] = []string{"flag:staging:toggle"}
	_, err := step.Execute(context.Background(), action)
	if err == nil {
		t.Fatal("expected error for insufficient scopes")
	}
	govErr, ok := err.(*domain.GovernanceError)
	if !ok {
		t.Fatalf("expected *domain.GovernanceError, got %T", err)
	}
	if govErr.Reason != "insufficient_scopes" {
		t.Errorf("expected reason 'insufficient_scopes', got %q", govErr.Reason)
	}
}

func TestAuthZStep_PassesWithSufficientScopes(t *testing.T) {
	step := NewAuthZGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	action.Context.Metadata["required_scopes"] = []string{"flag:production:toggle"}
	action.Context.Metadata["agent_scopes"] = []string{"flag:production:toggle", "flag:delete"}
	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.PipelineStage != domain.GovStepAuthZ {
		t.Errorf("expected PipelineStage %q, got %q", domain.GovStepAuthZ, result.PipelineStage)
	}
}

// ─── Maturity Step ─────────────────────────────────────────────────────────

func TestMaturityStep_Name(t *testing.T) {
	step := NewMaturityGovernanceStep(testLogger())
	if step.Name() != domain.GovStepMaturity {
		t.Errorf("expected %q, got %q", domain.GovStepMaturity, step.Name())
	}
}

func TestMaturityStep_PassesWithSufficientMaturity(t *testing.T) {
	step := NewMaturityGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	action.Context.MaturityLevel = domain.MaturityL4Autonomous
	action.Context.Metadata["required_maturity"] = domain.MaturityL3Supervised
	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.PipelineStage != domain.GovStepMaturity {
		t.Errorf("expected PipelineStage %q, got %q", domain.GovStepMaturity, result.PipelineStage)
	}
}

func TestMaturityStep_RejectsInsufficientMaturity(t *testing.T) {
	step := NewMaturityGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	action.Context.MaturityLevel = domain.MaturityL2Assist
	action.Context.Metadata["required_maturity"] = domain.MaturityL4Autonomous
	_, err := step.Execute(context.Background(), action)
	if err == nil {
		t.Fatal("expected error for insufficient maturity")
	}
	govErr, ok := err.(*domain.GovernanceError)
	if !ok {
		t.Fatalf("expected *domain.GovernanceError, got %T", err)
	}
	if govErr.Reason != "insufficient_maturity" {
		t.Errorf("expected reason 'insufficient_maturity', got %q", govErr.Reason)
	}
}

func TestMaturityStep_PassesWithNoRequiredMaturity_SetsDefault(t *testing.T) {
	step := NewMaturityGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	action.Context.MaturityLevel = domain.MaturityL2Assist
	// No required maturity set — defaults to L1
	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.PipelineStage != domain.GovStepMaturity {
		t.Errorf("expected PipelineStage %q, got %q", domain.GovStepMaturity, result.PipelineStage)
	}
}

// ─── Rate Limit Step ────────────────────────────────────────────────────────

func TestRateLimitStep_Name(t *testing.T) {
	step := NewRateLimitGovernanceStep(testLogger())
	if step.Name() != domain.GovStepRateLimit {
		t.Errorf("expected %q, got %q", domain.GovStepRateLimit, step.Name())
	}
}

func TestRateLimitStep_PassesFirstAction(t *testing.T) {
	step := NewRateLimitGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.PipelineStage != domain.GovStepRateLimit {
		t.Errorf("expected PipelineStage %q, got %q", domain.GovStepRateLimit, result.PipelineStage)
	}
}

func TestRateLimitStep_ReleaseConcurrent(t *testing.T) {
	step := NewRateLimitGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	_, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	// Release should not panic
	step.ReleaseConcurrent("agt_123")
	step.ReleaseConcurrent("nonexistent") // should not panic
}

// ─── Blast Radius Step ─────────────────────────────────────────────────────

func TestBlastRadiusStep_Name(t *testing.T) {
	step := NewBlastRadiusGovernanceStep(testLogger())
	if step.Name() != domain.GovStepBlastRadius {
		t.Errorf("expected %q, got %q", domain.GovStepBlastRadius, step.Name())
	}
}

func TestBlastRadiusStep_PassesWithLowRisk(t *testing.T) {
	step := NewBlastRadiusGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	action.BlastRadius = domain.BlastRadiusEstimate{
		AffectedEntities:    50,
		AffectedPercentage:  0.5,
		RiskLevel:           "low",
		Rationale:           "test",
	}
	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.PipelineStage != domain.GovStepBlastRadius {
		t.Errorf("expected PipelineStage %q, got %q", domain.GovStepBlastRadius, result.PipelineStage)
	}
}

func TestBlastRadiusStep_RejectsExcessiveEntities(t *testing.T) {
	step := NewBlastRadiusGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	action.BlastRadius = domain.BlastRadiusEstimate{
		AffectedEntities:    50000,
		AffectedPercentage:  5.0,
		RiskLevel:           "medium",
		Rationale:           "test",
	}
	_, err := step.Execute(context.Background(), action)
	if err == nil {
		t.Fatal("expected error for excessive entities")
	}
	govErr, ok := err.(*domain.GovernanceError)
	if !ok {
		t.Fatalf("expected *domain.GovernanceError, got %T", err)
	}
	if govErr.Reason != "blast_radius_exceeded" {
		t.Errorf("expected reason 'blast_radius_exceeded', got %q", govErr.Reason)
	}
}

func TestBlastRadiusStep_RejectsExcessivePercentage(t *testing.T) {
	step := NewBlastRadiusGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	action.BlastRadius = domain.BlastRadiusEstimate{
		AffectedEntities:    100,
		AffectedPercentage:  25.0,
		RiskLevel:           "medium",
		Rationale:           "test",
	}
	_, err := step.Execute(context.Background(), action)
	if err == nil {
		t.Fatal("expected error for excessive percentage")
	}
	govErr, ok := err.(*domain.GovernanceError)
	if !ok {
		t.Fatalf("expected *domain.GovernanceError, got %T", err)
	}
	if govErr.Reason != "blast_radius_exceeded" {
		t.Errorf("expected reason 'blast_radius_exceeded', got %q", govErr.Reason)
	}
}

func TestBlastRadiusStep_RequiresHumanForHighRisk(t *testing.T) {
	step := NewBlastRadiusGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	action.BlastRadius = domain.BlastRadiusEstimate{
		AffectedEntities:    100,
		AffectedPercentage:  1.0,
		RiskLevel:           "high",
		Rationale:           "test",
	}
	_, err := step.Execute(context.Background(), action)
	if err == nil {
		t.Fatal("expected human approval requirement for high risk")
	}
	govErr, ok := err.(*domain.GovernanceError)
	if !ok {
		t.Fatalf("expected *domain.GovernanceError, got %T", err)
	}
	if govErr.Reason != "blast_radius_requires_human" {
		t.Errorf("expected reason 'blast_radius_requires_human', got %q", govErr.Reason)
	}
	if !govErr.RequiresHuman {
		t.Error("expected RequiresHuman to be true")
	}
}

func TestBlastRadiusStep_RequiresHumanForNoEstimate(t *testing.T) {
	step := NewBlastRadiusGovernanceStep(testLogger())
	action := newTestAction("agt_123", "org_123")
	action.BlastRadius = domain.BlastRadiusEstimate{} // empty estimate
	_, err := step.Execute(context.Background(), action)
	if err == nil {
		t.Fatal("expected human approval requirement for missing estimate")
	}
	govErr, ok := err.(*domain.GovernanceError)
	if !ok {
		t.Fatalf("expected *domain.GovernanceError, got %T", err)
	}
	if govErr.Reason != "no_blast_radius_estimate" {
		t.Errorf("expected reason 'no_blast_radius_estimate', got %q", govErr.Reason)
	}
}

// ─── riskLevelRank ─────────────────────────────────────────────────────────

func TestRiskLevelRank(t *testing.T) {
	tests := []struct {
		level string
		want  int
	}{
		{"critical", 4},
		{"high", 3},
		{"medium", 2},
		{"low", 1},
		{"unknown", 0},
		{"", 0},
	}
	for _, tc := range tests {
		got := riskLevelRank(tc.level)
		if got != tc.want {
			t.Errorf("riskLevelRank(%q) = %d, want %d", tc.level, got, tc.want)
		}
	}
}

// ─── Policy Step ───────────────────────────────────────────────────────────

// mockPolicyReader implements domain.PolicyReader for tests.
type mockPolicyReader struct {
	policies []domain.Policy
	err      error
}

func (m *mockPolicyReader) GetPolicy(_ context.Context, _, _ string) (*domain.Policy, error) {
	return nil, nil
}
func (m *mockPolicyReader) ListPolicies(_ context.Context, _ string, _, _ int) ([]domain.Policy, error) {
	return m.policies, m.err
}
func (m *mockPolicyReader) CountPolicies(_ context.Context, _ string) (int, error) {
	return len(m.policies), nil
}
func (m *mockPolicyReader) ListApplicablePolicies(_ context.Context, _ string, _ domain.PolicyScope) ([]domain.Policy, error) {
	return m.policies, m.err
}

// mockPolicyEvaluator implements PolicyEvaluator for tests.
type mockPolicyEvaluator struct {
	result *domain.PolicyEvalResult
	err    error
}

func (m *mockPolicyEvaluator) Evaluate(_ context.Context, _ domain.AgentAction, _ []domain.Policy) (*domain.PolicyEvalResult, error) {
	return m.result, m.err
}

func TestPolicyStep_Name(t *testing.T) {
	step := NewPolicyGovernanceStep(&mockPolicyReader{}, &mockPolicyEvaluator{}, testLogger(), nil)
	if step.Name() != domain.GovStepPolicy {
		t.Errorf("expected %q, got %q", domain.GovStepPolicy, step.Name())
	}
}

func TestPolicyStep_Execute_PassesWhenCELConditionMatches(t *testing.T) {
	reader := &mockPolicyReader{
		policies: []domain.Policy{
			{
				ID:   "policy-1",
				Name: "Test Policy",
				Rules: []domain.PolicyRule{
					{Name: "check-tool", Expression: "action.tool_name == 'flag.sweep'"},
				},
				Effect: domain.PolicyEffectDeny,
			},
		},
	}
	evaluator := &mockPolicyEvaluator{
		result: &domain.PolicyEvalResult{
			PolicyID:   "policy-1",
			PolicyName: "Test Policy",
			Passed:     true,
		},
	}
	step := NewPolicyGovernanceStep(reader, evaluator, testLogger(), nil)
	action := newTestAction("agt_123", "org_123")

	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.PipelineStage != domain.GovStepPolicy {
		t.Errorf("expected PipelineStage %q, got %q", domain.GovStepPolicy, result.PipelineStage)
	}
	// Policy eval result should be recorded in metadata
	if result.Context.Metadata["policy_eval_result"] != "passed" {
		t.Error("expected policy_eval_result=passed in metadata")
	}
}

func TestPolicyStep_Execute_BlocksWhenCELConditionFails(t *testing.T) {
	reader := &mockPolicyReader{
		policies: []domain.Policy{
			{
				ID:   "policy-1",
				Name: "Deny Production",
				Rules: []domain.PolicyRule{
					{Name: "no-production", Expression: "action.context.environment_id != 'production'"},
				},
				Effect: domain.PolicyEffectDeny,
			},
		},
	}
	evaluator := &mockPolicyEvaluator{
		result: &domain.PolicyEvalResult{
			PolicyID:   "policy-1",
			PolicyName: "Deny Production",
			Passed:     false,
			Effect:     domain.PolicyEffectDeny,
			Failures: []domain.PolicyRuleFailure{
				{
					RuleName:   "no-production",
					Expression: "action.context.environment_id != 'production'",
					Message:    "production environment is not allowed",
				},
			},
		},
	}
	step := NewPolicyGovernanceStep(reader, evaluator, testLogger(), nil)
	action := newTestAction("agt_123", "org_123")

	_, err := step.Execute(context.Background(), action)
	if err == nil {
		t.Fatal("expected error for policy denial")
	}
	govErr, ok := err.(*domain.GovernanceError)
	if !ok {
		t.Fatalf("expected *domain.GovernanceError, got %T", err)
	}
	if govErr.Step != domain.GovStepPolicy {
		t.Errorf("expected step %q, got %q", domain.GovStepPolicy, govErr.Step)
	}
	if govErr.Reason != "policy_violation" {
		t.Errorf("expected reason 'policy_violation', got %q", govErr.Reason)
	}
}

func TestPolicyStep_Execute_NoPoliciesPasses(t *testing.T) {
	reader := &mockPolicyReader{
		policies: nil, // no policies
	}
	evaluator := &mockPolicyEvaluator{}
	step := NewPolicyGovernanceStep(reader, evaluator, testLogger(), nil)
	action := newTestAction("agt_123", "org_123")

	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error: %v (no policies = allow)", err)
	}
	if result.PipelineStage != domain.GovStepPolicy {
		t.Errorf("expected PipelineStage %q, got %q", domain.GovStepPolicy, result.PipelineStage)
	}
}

func TestPolicyStep_Execute_ReaderErrorFailsOpen(t *testing.T) {
	reader := &mockPolicyReader{
		err: errors.New("store unavailable"),
	}
	evaluator := &mockPolicyEvaluator{}
	step := NewPolicyGovernanceStep(reader, evaluator, testLogger(), nil)
	action := newTestAction("agt_123", "org_123")

	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("expected fail-open (no error), got: %v", err)
	}
	// Should record the error in metadata
	if result.Context.Metadata["policy_eval_error"] == nil {
		t.Error("expected policy_eval_error in metadata")
	}
}

// ─── Audit Step ────────────────────────────────────────────────────────────

// mockAuditWriter implements domain.AuditWriter for tests.
type mockAuditWriter struct {
	err         error
	entries     []*domain.AuditEntry
	createCount int
}

func (m *mockAuditWriter) CreateAuditEntry(_ context.Context, entry *domain.AuditEntry) error {
	m.createCount++
	m.entries = append(m.entries, entry)
	return m.err
}
func (m *mockAuditWriter) PurgeAuditEntries(_ context.Context, _ time.Time) (int, error) {
	return 0, nil
}

func TestAuditStep_Name(t *testing.T) {
	step := NewAuditGovernanceStep(&mockAuditWriter{}, testLogger())
	if step.Name() != domain.GovStepAudit {
		t.Errorf("expected %q, got %q", domain.GovStepAudit, step.Name())
	}
}

func TestAuditStep_Execute_CreatesAuditEntry(t *testing.T) {
	writer := &mockAuditWriter{}
	step := NewAuditGovernanceStep(writer, testLogger())
	action := newTestAction("agt_123", "org_123")

	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.PipelineStage != domain.GovStepAudit {
		t.Errorf("expected PipelineStage %q, got %q", domain.GovStepAudit, result.PipelineStage)
	}
	if writer.createCount != 1 {
		t.Errorf("expected 1 audit entry created, got %d", writer.createCount)
	}
	if len(writer.entries) != 1 {
		t.Fatalf("expected 1 entry, got %d", len(writer.entries))
	}
	entry := writer.entries[0]
	if entry.OrgID != "org_123" {
		t.Errorf("expected OrgID 'org_123', got %q", entry.OrgID)
	}
	if entry.ActorType != "agent" {
		t.Errorf("expected ActorType 'agent', got %q", entry.ActorType)
	}
}

func TestAuditStep_Execute_HandlesWriteErrorGracefully(t *testing.T) {
	writer := &mockAuditWriter{
		err: errors.New("audit write failed"),
	}
	step := NewAuditGovernanceStep(writer, testLogger())
	action := newTestAction("agt_123", "org_123")

	// Audit step should fail-open — action proceeds even if audit write fails
	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error (audit should fail-open): %v", err)
	}
	if result.PipelineStage != domain.GovStepAudit {
		t.Errorf("expected PipelineStage %q, got %q", domain.GovStepAudit, result.PipelineStage)
	}
	// The write was attempted
	if writer.createCount != 1 {
		t.Errorf("expected 1 write attempt, got %d", writer.createCount)
	}
}

func TestAuditStep_Execute_NilEntryHandled(t *testing.T) {
	// Test that buildAuditEntry handles edge cases without panicking.
	// An action with missing required fields should not panic.
	step := NewAuditGovernanceStep(&mockAuditWriter{}, testLogger())

	// Action with empty fields everywhere
	action := domain.AgentAction{
		ID:        "",
		AgentID:   "",
		AgentType: "",
	}

	result, err := step.Execute(context.Background(), action)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if result.PipelineStage != domain.GovStepAudit {
		t.Errorf("expected PipelineStage %q, got %q", domain.GovStepAudit, result.PipelineStage)
	}
}
