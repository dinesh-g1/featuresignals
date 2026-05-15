package postgres_test

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store/postgres"
)

// ─── Helpers ───────────────────────────────────────────────────────────────

func newPreflightStore(t *testing.T) *postgres.PreflightStore {
	t.Helper()
	return postgres.NewPreflightStore(testPool(t), slog.Default())
}

// seedFlagForPreflight creates a real flag for use in preflight tests
// (rollout_phases and preflight_reports both have FK to flags).
func seedFlagForPreflight(t *testing.T, orgID, projectID string) *domain.Flag {
	t.Helper()
	store := postgres.NewStore(testPool(t))
	flag := &domain.Flag{
		OrgID:        orgID,
		ProjectID:    projectID,
		Key:          "preflight-test-flag-" + orgID[:8],
		Name:         "Preflight Test Flag",
		FlagType:     "boolean",
		DefaultValue: json.RawMessage("false"),
	}
	if err := store.CreateFlag(context.Background(), flag); err != nil {
		t.Fatalf("create flag for preflight: %v", err)
	}
	return flag
}

// ─── PreflightReport: Create, Get, List, Count, GetLatest ──────────────────

func TestPreflightStore_Report_CreateAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	r := &domain.PreflightReport{
		OrgID:            org.ID,
		FlagKey:          "feature-x",
		ChangeType:       domain.ChangeTypeRollout,
		Report:           json.RawMessage(`{"summary":"Low risk rollout"}`),
		RiskScore:        15,
		AffectedFiles:    3,
		AffectedCodeRefs: 7,
		GeneratedAt:      time.Now().UTC(),
	}

	if err := pf.CreatePreflightReport(ctx, r); err != nil {
		t.Fatalf("CreatePreflightReport: %v", err)
	}
	if r.ID == "" {
		t.Fatal("expected ID to be populated after create")
	}
	if r.CreatedAt.IsZero() {
		t.Fatal("expected CreatedAt to be populated")
	}

	got, err := pf.GetPreflightReport(ctx, r.ID)
	if err != nil {
		t.Fatalf("GetPreflightReport: %v", err)
	}
	if got.ID != r.ID {
		t.Errorf("ID mismatch: got %s, want %s", got.ID, r.ID)
	}
	if got.FlagKey != "feature-x" {
		t.Errorf("flag_key mismatch: got %s, want feature-x", got.FlagKey)
	}
	if got.RiskScore != 15 {
		t.Errorf("risk_score mismatch: got %d, want 15", got.RiskScore)
	}
	if got.AffectedFiles != 3 {
		t.Errorf("affected_files mismatch: got %d, want 3", got.AffectedFiles)
	}
	if got.AffectedCodeRefs != 7 {
		t.Errorf("affected_code_refs mismatch: got %d, want 7", got.AffectedCodeRefs)
	}
	if got.ChangeType != domain.ChangeTypeRollout {
		t.Errorf("change_type mismatch: got %s, want %s", got.ChangeType, domain.ChangeTypeRollout)
	}
}

func TestPreflightStore_Report_ListAndCount(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	// Create 3 reports: 2 for feature-a, 1 for feature-b
	reports := []domain.PreflightReport{
		{
			OrgID: org.ID, FlagKey: "feature-a", ChangeType: domain.ChangeTypeRollout,
			Report: json.RawMessage(`{}`), RiskScore: 10, GeneratedAt: time.Now().UTC(),
		},
		{
			OrgID: org.ID, FlagKey: "feature-a", ChangeType: domain.ChangeTypeToggle,
			Report: json.RawMessage(`{}`), RiskScore: 20, GeneratedAt: time.Now().UTC(),
		},
		{
			OrgID: org.ID, FlagKey: "feature-b", ChangeType: domain.ChangeTypeKill,
			Report: json.RawMessage(`{}`), RiskScore: 30, GeneratedAt: time.Now().UTC(),
		},
	}

	for i := range reports {
		if err := pf.CreatePreflightReport(ctx, &reports[i]); err != nil {
			t.Fatalf("CreatePreflightReport %d: %v", i, err)
		}
	}

	// List all (no flag key filter)
	all, err := pf.ListPreflightReports(ctx, org.ID, "", 50, 0)
	if err != nil {
		t.Fatalf("ListPreflightReports: %v", err)
	}
	if len(all) != 3 {
		t.Errorf("expected 3 reports, got %d", len(all))
	}

	count, err := pf.CountPreflightReports(ctx, org.ID, "")
	if err != nil {
		t.Fatalf("CountPreflightReports: %v", err)
	}
	if count != 3 {
		t.Errorf("expected count 3, got %d", count)
	}

	// Filter by flag_key
	featureA, err := pf.ListPreflightReports(ctx, org.ID, "feature-a", 50, 0)
	if err != nil {
		t.Fatalf("ListPreflightReports feature-a: %v", err)
	}
	if len(featureA) != 2 {
		t.Errorf("expected 2 feature-a reports, got %d", len(featureA))
	}

	countA, err := pf.CountPreflightReports(ctx, org.ID, "feature-a")
	if err != nil {
		t.Fatalf("CountPreflightReports feature-a: %v", err)
	}
	if countA != 2 {
		t.Errorf("expected feature-a count 2, got %d", countA)
	}
}

func TestPreflightStore_Report_GetLatest(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	// Create 2 reports for same flag key, second one more recent
	older := &domain.PreflightReport{
		OrgID: org.ID, FlagKey: "feature-z", ChangeType: domain.ChangeTypeRollout,
		Report: json.RawMessage(`{"v":1}`), RiskScore: 10,
		GeneratedAt: time.Now().UTC().Add(-1 * time.Hour),
	}
	newer := &domain.PreflightReport{
		OrgID: org.ID, FlagKey: "feature-z", ChangeType: domain.ChangeTypeRollout,
		Report: json.RawMessage(`{"v":2}`), RiskScore: 5,
		GeneratedAt: time.Now().UTC(),
	}

	if err := pf.CreatePreflightReport(ctx, older); err != nil {
		t.Fatalf("CreatePreflightReport older: %v", err)
	}
	if err := pf.CreatePreflightReport(ctx, newer); err != nil {
		t.Fatalf("CreatePreflightReport newer: %v", err)
	}

	latest, err := pf.GetLatestReport(ctx, org.ID, "feature-z")
	if err != nil {
		t.Fatalf("GetLatestReport: %v", err)
	}
	if latest.ID != newer.ID {
		t.Errorf("expected latest ID %s, got %s", newer.ID, latest.ID)
	}
	if latest.RiskScore != 5 {
		t.Errorf("expected risk_score 5, got %d", latest.RiskScore)
	}
}

func TestPreflightStore_Report_Update(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	r := &domain.PreflightReport{
		OrgID: org.ID, FlagKey: "feature-u", ChangeType: domain.ChangeTypeRollout,
		Report: json.RawMessage(`{}`), RiskScore: 50, GeneratedAt: time.Now().UTC(),
	}
	if err := pf.CreatePreflightReport(ctx, r); err != nil {
		t.Fatalf("CreatePreflightReport: %v", err)
	}

	// Update risk_score and viewed_at
	now := time.Now().UTC()
	err := pf.UpdatePreflightReport(ctx, r.ID, map[string]interface{}{
		"risk_score": 25,
		"viewed_at":  now,
	})
	if err != nil {
		t.Fatalf("UpdatePreflightReport: %v", err)
	}

	got, err := pf.GetPreflightReport(ctx, r.ID)
	if err != nil {
		t.Fatalf("GetPreflightReport after update: %v", err)
	}
	if got.RiskScore != 25 {
		t.Errorf("risk_score not updated: got %d, want 25", got.RiskScore)
	}
	if got.ViewedAt == nil || !got.ViewedAt.Truncate(time.Second).Equal(now.Truncate(time.Second)) {
		t.Errorf("viewed_at not updated: got %v, want %v", got.ViewedAt, now)
	}
}

func TestPreflightStore_Report_NotFound(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	_, err := pf.GetPreflightReport(ctx, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Fatal("expected error for missing report")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestPreflightStore_Report_TenantIsolation(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	mainStore := postgres.NewStore(pool)
	ctx := context.Background()

	org1 := seedOrg(t, mainStore)
	org2 := seedOrg(t, mainStore)

	// Create report in org1
	r1 := &domain.PreflightReport{
		OrgID: org1.ID, FlagKey: "iso-flag", ChangeType: domain.ChangeTypeRollout,
		Report: json.RawMessage(`{}`), RiskScore: 10, GeneratedAt: time.Now().UTC(),
	}
	if err := pf.CreatePreflightReport(ctx, r1); err != nil {
		t.Fatalf("CreatePreflightReport org1: %v", err)
	}

	// Create report in org2
	r2 := &domain.PreflightReport{
		OrgID: org2.ID, FlagKey: "iso-flag", ChangeType: domain.ChangeTypeRollout,
		Report: json.RawMessage(`{}`), RiskScore: 20, GeneratedAt: time.Now().UTC(),
	}
	if err := pf.CreatePreflightReport(ctx, r2); err != nil {
		t.Fatalf("CreatePreflightReport org2: %v", err)
	}

	// org1 listing should only see org1's reports
	org1Reports, err := pf.ListPreflightReports(ctx, org1.ID, "", 50, 0)
	if err != nil {
		t.Fatalf("ListPreflightReports org1: %v", err)
	}
	for _, rep := range org1Reports {
		if rep.OrgID != org1.ID {
			t.Errorf("tenant isolation violation: org1 saw report from org %s", rep.OrgID)
		}
	}

	count1, err := pf.CountPreflightReports(ctx, org1.ID, "")
	if err != nil {
		t.Fatalf("CountPreflightReports org1: %v", err)
	}
	if count1 != 1 {
		t.Errorf("expected 1 report for org1, got %d", count1)
	}

	count2, err := pf.CountPreflightReports(ctx, org2.ID, "")
	if err != nil {
		t.Fatalf("CountPreflightReports org2: %v", err)
	}
	if count2 != 1 {
		t.Errorf("expected 1 report for org2, got %d", count2)
	}
}

// ─── RolloutPhase: Create, List, Get, Update, BatchCreate ──────────────────

func TestPreflightStore_Phase_CreateAndList(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProject(t, postgres.NewStore(pool), org.ID)
	flag := seedFlagForPreflight(t, org.ID, proj.ID)

	p1 := &domain.RolloutPhase{
		OrgID: org.ID, FlagID: flag.ID, PhaseNumber: 1,
		Percentage: 1000, DurationHours: 24, Status: domain.PhaseStatusPending,
	}
	p2 := &domain.RolloutPhase{
		OrgID: org.ID, FlagID: flag.ID, PhaseNumber: 2,
		Percentage: 5000, DurationHours: 48, Status: domain.PhaseStatusPending,
	}

	if err := pf.CreateRolloutPhase(ctx, p1); err != nil {
		t.Fatalf("CreateRolloutPhase p1: %v", err)
	}
	if err := pf.CreateRolloutPhase(ctx, p2); err != nil {
		t.Fatalf("CreateRolloutPhase p2: %v", err)
	}

	phases, err := pf.ListRolloutPhases(ctx, flag.ID)
	if err != nil {
		t.Fatalf("ListRolloutPhases: %v", err)
	}
	if len(phases) != 2 {
		t.Errorf("expected 2 phases, got %d", len(phases))
	}
	if phases[0].PhaseNumber != 1 {
		t.Errorf("expected phase 1 first, got phase %d", phases[0].PhaseNumber)
	}
	if phases[1].PhaseNumber != 2 {
		t.Errorf("expected phase 2 second, got phase %d", phases[1].PhaseNumber)
	}
}

func TestPreflightStore_Phase_Get(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProject(t, postgres.NewStore(pool), org.ID)
	flag := seedFlagForPreflight(t, org.ID, proj.ID)

	p := &domain.RolloutPhase{
		OrgID: org.ID, FlagID: flag.ID, PhaseNumber: 1,
		Percentage: 2500, DurationHours: 12,
		GuardMetrics: json.RawMessage(`[{"metric":"error_rate","threshold":0.01,"operator":"lt"}]`),
		Status:       domain.PhaseStatusPending,
	}
	if err := pf.CreateRolloutPhase(ctx, p); err != nil {
		t.Fatalf("CreateRolloutPhase: %v", err)
	}

	got, err := pf.GetRolloutPhase(ctx, p.ID)
	if err != nil {
		t.Fatalf("GetRolloutPhase: %v", err)
	}
	if got.ID != p.ID {
		t.Errorf("ID mismatch: got %s, want %s", got.ID, p.ID)
	}
	if got.Percentage != 2500 {
		t.Errorf("percentage mismatch: got %d, want 2500", got.Percentage)
	}
	if got.DurationHours != 12 {
		t.Errorf("duration_hours mismatch: got %d, want 12", got.DurationHours)
	}
}

func TestPreflightStore_Phase_UpdateStatus(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProject(t, postgres.NewStore(pool), org.ID)
	flag := seedFlagForPreflight(t, org.ID, proj.ID)

	p := &domain.RolloutPhase{
		OrgID: org.ID, FlagID: flag.ID, PhaseNumber: 1,
		Percentage: 5000, DurationHours: 24, Status: domain.PhaseStatusPending,
	}
	if err := pf.CreateRolloutPhase(ctx, p); err != nil {
		t.Fatalf("CreateRolloutPhase: %v", err)
	}

	now := time.Now().UTC()
	err := pf.UpdateRolloutPhase(ctx, p.ID, map[string]interface{}{
		"status":     domain.PhaseStatusActive,
		"started_at": now,
	})
	if err != nil {
		t.Fatalf("UpdateRolloutPhase: %v", err)
	}

	got, err := pf.GetRolloutPhase(ctx, p.ID)
	if err != nil {
		t.Fatalf("GetRolloutPhase after update: %v", err)
	}
	if got.Status != domain.PhaseStatusActive {
		t.Errorf("status not updated: got %s, want %s", got.Status, domain.PhaseStatusActive)
	}
	if got.StartedAt == nil || !got.StartedAt.Truncate(time.Second).Equal(now.Truncate(time.Second)) {
		t.Errorf("started_at not updated: got %v, want %v", got.StartedAt, now)
	}
}

func TestPreflightStore_Phase_BatchCreate(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProject(t, postgres.NewStore(pool), org.ID)
	flag := seedFlagForPreflight(t, org.ID, proj.ID)

	phases := []domain.RolloutPhase{
		{OrgID: org.ID, FlagID: flag.ID, PhaseNumber: 1, Percentage: 1000, DurationHours: 4, Status: domain.PhaseStatusPending},
		{OrgID: org.ID, FlagID: flag.ID, PhaseNumber: 2, Percentage: 2500, DurationHours: 8, Status: domain.PhaseStatusPending},
		{OrgID: org.ID, FlagID: flag.ID, PhaseNumber: 3, Percentage: 5000, DurationHours: 12, Status: domain.PhaseStatusPending},
	}

	if err := pf.BatchCreateRolloutPhases(ctx, phases); err != nil {
		t.Fatalf("BatchCreateRolloutPhases: %v", err)
	}

	for i := range phases {
		if phases[i].ID == "" {
			t.Errorf("phase %d: ID not populated", i)
		}
		if phases[i].CreatedAt.IsZero() {
			t.Errorf("phase %d: CreatedAt not populated", i)
		}
	}

	all, err := pf.ListRolloutPhases(ctx, flag.ID)
	if err != nil {
		t.Fatalf("ListRolloutPhases: %v", err)
	}
	if len(all) != 3 {
		t.Errorf("expected 3 phases after batch create, got %d", len(all))
	}
}

func TestPreflightStore_Phase_GetActive(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProject(t, postgres.NewStore(pool), org.ID)
	flag := seedFlagForPreflight(t, org.ID, proj.ID)

	// Create 3 phases: completed, active, pending
	phases := []domain.RolloutPhase{
		{OrgID: org.ID, FlagID: flag.ID, PhaseNumber: 1, Percentage: 1000, DurationHours: 4, Status: domain.PhaseStatusCompleted},
		{OrgID: org.ID, FlagID: flag.ID, PhaseNumber: 2, Percentage: 2500, DurationHours: 8, Status: domain.PhaseStatusActive},
		{OrgID: org.ID, FlagID: flag.ID, PhaseNumber: 3, Percentage: 5000, DurationHours: 12, Status: domain.PhaseStatusPending},
	}

	if err := pf.BatchCreateRolloutPhases(ctx, phases); err != nil {
		t.Fatalf("BatchCreateRolloutPhases: %v", err)
	}

	active, err := pf.GetActivePhase(ctx, flag.ID)
	if err != nil {
		t.Fatalf("GetActivePhase: %v", err)
	}
	if active.PhaseNumber != 2 {
		t.Errorf("expected active phase number 2, got %d", active.PhaseNumber)
	}
	if active.Status != domain.PhaseStatusActive {
		t.Errorf("expected status active, got %s", active.Status)
	}
}

func TestPreflightStore_Phase_NotFound(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	_, err := pf.GetRolloutPhase(ctx, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Fatal("expected error for missing phase")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// ─── ApprovalRequest: Create, Get, List, Update, Count ─────────────────────

func TestPreflightStore_Approval_CreateAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	// First create a preflight report (FK dependency)
	r := &domain.PreflightReport{
		OrgID: org.ID, FlagKey: "approval-flag", ChangeType: domain.ChangeTypeRollout,
		Report: json.RawMessage(`{}`), RiskScore: 40, GeneratedAt: time.Now().UTC(),
	}
	if err := pf.CreatePreflightReport(ctx, r); err != nil {
		t.Fatalf("CreatePreflightReport: %v", err)
	}

	a := &domain.PreflightApprovalRequest{
		OrgID:         org.ID,
		AssessmentID:  r.ID,
		FlagKey:       "approval-flag",
		RequestedBy:   "user-1",
		Status:        domain.PreflightApprovalStatusPending,
		Justification: "Rolling out to 10% of users",
	}

	if err := pf.CreateApprovalRequest(ctx, a); err != nil {
		t.Fatalf("CreateApprovalRequest: %v", err)
	}
	if a.ID == "" {
		t.Fatal("expected ID to be populated after create")
	}
	if a.CreatedAt.IsZero() {
		t.Fatal("expected CreatedAt to be populated")
	}

	got, err := pf.GetApprovalRequest(ctx, a.ID)
	if err != nil {
		t.Fatalf("GetApprovalRequest: %v", err)
	}
	if got.ID != a.ID {
		t.Errorf("ID mismatch: got %s, want %s", got.ID, a.ID)
	}
	if got.AssessmentID != r.ID {
		t.Errorf("assessment_id mismatch: got %s, want %s", got.AssessmentID, r.ID)
	}
	if got.FlagKey != "approval-flag" {
		t.Errorf("flag_key mismatch: got %s, want approval-flag", got.FlagKey)
	}
	if got.RequestedBy != "user-1" {
		t.Errorf("requested_by mismatch: got %s, want user-1", got.RequestedBy)
	}
	if got.Justification != "Rolling out to 10% of users" {
		t.Errorf("justification mismatch: got %s", got.Justification)
	}
}

func TestPreflightStore_Approval_ListByStatus(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	// Create a preflight report
	r := &domain.PreflightReport{
		OrgID: org.ID, FlagKey: "list-flag", ChangeType: domain.ChangeTypeRollout,
		Report: json.RawMessage(`{}`), RiskScore: 10, GeneratedAt: time.Now().UTC(),
	}
	if err := pf.CreatePreflightReport(ctx, r); err != nil {
		t.Fatalf("CreatePreflightReport: %v", err)
	}

	// Create 2 pending + 1 approved
	pending1 := &domain.PreflightApprovalRequest{
		OrgID: org.ID, AssessmentID: r.ID, FlagKey: "list-flag",
		RequestedBy: "user-a", Status: domain.PreflightApprovalStatusPending,
	}
	pending2 := &domain.PreflightApprovalRequest{
		OrgID: org.ID, AssessmentID: r.ID, FlagKey: "list-flag",
		RequestedBy: "user-b", Status: domain.PreflightApprovalStatusPending,
	}
	approved := &domain.PreflightApprovalRequest{
		OrgID: org.ID, AssessmentID: r.ID, FlagKey: "list-flag",
		RequestedBy: "user-c", Status: domain.PreflightApprovalStatusApproved,
		ReviewerID: "reviewer-1", Decision: "approved",
	}

	if err := pf.CreateApprovalRequest(ctx, pending1); err != nil {
		t.Fatalf("CreateApprovalRequest pending1: %v", err)
	}
	if err := pf.CreateApprovalRequest(ctx, pending2); err != nil {
		t.Fatalf("CreateApprovalRequest pending2: %v", err)
	}
	if err := pf.CreateApprovalRequest(ctx, approved); err != nil {
		t.Fatalf("CreateApprovalRequest approved: %v", err)
	}

	// List all
	all, err := pf.ListApprovalRequests(ctx, org.ID, "", 50, 0)
	if err != nil {
		t.Fatalf("ListApprovalRequests all: %v", err)
	}
	if len(all) != 3 {
		t.Errorf("expected 3 approvals, got %d", len(all))
	}

	// Filter by pending
	pendingList, err := pf.ListApprovalRequests(ctx, org.ID, domain.PreflightApprovalStatusPending, 50, 0)
	if err != nil {
		t.Fatalf("ListApprovalRequests pending: %v", err)
	}
	if len(pendingList) != 2 {
		t.Errorf("expected 2 pending, got %d", len(pendingList))
	}

	// Filter by approved
	approvedList, err := pf.ListApprovalRequests(ctx, org.ID, domain.PreflightApprovalStatusApproved, 50, 0)
	if err != nil {
		t.Fatalf("ListApprovalRequests approved: %v", err)
	}
	if len(approvedList) != 1 {
		t.Errorf("expected 1 approved, got %d", len(approvedList))
	}
}

func TestPreflightStore_Approval_UpdateApprove(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	r := &domain.PreflightReport{
		OrgID: org.ID, FlagKey: "approved-flag", ChangeType: domain.ChangeTypeRollout,
		Report: json.RawMessage(`{}`), RiskScore: 10, GeneratedAt: time.Now().UTC(),
	}
	if err := pf.CreatePreflightReport(ctx, r); err != nil {
		t.Fatalf("CreatePreflightReport: %v", err)
	}

	a := &domain.PreflightApprovalRequest{
		OrgID: org.ID, AssessmentID: r.ID, FlagKey: "approved-flag",
		RequestedBy: "requestor", Status: domain.PreflightApprovalStatusPending,
		Justification: "Safe to proceed",
	}
	if err := pf.CreateApprovalRequest(ctx, a); err != nil {
		t.Fatalf("CreateApprovalRequest: %v", err)
	}

	now := time.Now().UTC()
	err := pf.UpdateApprovalRequest(ctx, a.ID, map[string]interface{}{
		"status":      domain.PreflightApprovalStatusApproved,
		"reviewer_id": "reviewer-1",
		"decision":    "approved",
		"comment":     "LGTM",
		"decided_at":  now,
	})
	if err != nil {
		t.Fatalf("UpdateApprovalRequest: %v", err)
	}

	got, err := pf.GetApprovalRequest(ctx, a.ID)
	if err != nil {
		t.Fatalf("GetApprovalRequest after update: %v", err)
	}
	if got.Status != domain.PreflightApprovalStatusApproved {
		t.Errorf("status not updated: got %s, want %s", got.Status, domain.PreflightApprovalStatusApproved)
	}
	if got.ReviewerID != "reviewer-1" {
		t.Errorf("reviewer_id not updated: got %s", got.ReviewerID)
	}
	if got.Decision != "approved" {
		t.Errorf("decision not updated: got %s", got.Decision)
	}
	if got.Comment != "LGTM" {
		t.Errorf("comment not updated: got %s", got.Comment)
	}
}

func TestPreflightStore_Approval_Count(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	r := &domain.PreflightReport{
		OrgID: org.ID, FlagKey: "count-flag", ChangeType: domain.ChangeTypeRollout,
		Report: json.RawMessage(`{}`), RiskScore: 10, GeneratedAt: time.Now().UTC(),
	}
	if err := pf.CreatePreflightReport(ctx, r); err != nil {
		t.Fatalf("CreatePreflightReport: %v", err)
	}

	for i := 0; i < 5; i++ {
		a := &domain.PreflightApprovalRequest{
			OrgID: org.ID, AssessmentID: r.ID, FlagKey: "count-flag",
			RequestedBy: "user", Status: domain.PreflightApprovalStatusPending,
		}
		if err := pf.CreateApprovalRequest(ctx, a); err != nil {
			t.Fatalf("CreateApprovalRequest %d: %v", i, err)
		}
	}

	count, err := pf.CountApprovalRequests(ctx, org.ID, "")
	if err != nil {
		t.Fatalf("CountApprovalRequests: %v", err)
	}
	if count != 5 {
		t.Errorf("expected count 5, got %d", count)
	}

	pendingCount, err := pf.CountApprovalRequests(ctx, org.ID, domain.PreflightApprovalStatusPending)
	if err != nil {
		t.Fatalf("CountApprovalRequests pending: %v", err)
	}
	if pendingCount != 5 {
		t.Errorf("expected pending count 5, got %d", pendingCount)
	}

	approvedCount, err := pf.CountApprovalRequests(ctx, org.ID, domain.PreflightApprovalStatusApproved)
	if err != nil {
		t.Fatalf("CountApprovalRequests approved: %v", err)
	}
	if approvedCount != 0 {
		t.Errorf("expected approved count 0, got %d", approvedCount)
	}
}

func TestPreflightStore_Approval_NotFound(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	pf := newPreflightStore(t)
	ctx := context.Background()

	_, err := pf.GetApprovalRequest(ctx, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Fatal("expected error for missing approval request")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}
