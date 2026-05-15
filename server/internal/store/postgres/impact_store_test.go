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

func newImpactStore(t *testing.T) *postgres.ImpactStore {
	t.Helper()
	return postgres.NewImpactStore(testPool(t), slog.Default())
}

// ─── ImpactReport: Create, Get, List, Count, GetLatest ─────────────────────

func TestImpactStore_Report_CreateAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newImpactStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	r := &domain.ImpactReport{
		OrgID:           org.ID,
		FlagKey:         "feature-x",
		Report:          json.RawMessage(`{"summary":"Feature X reduced latency by 15%","metrics":{"p99_latency_ms":42}}`),
		MetricsSnapshot: json.RawMessage(`{"p99_latency_ms":42,"error_rate":0.001}`),
		BusinessImpact:  domain.BusinessImpactPositive,
		CostAttribution: 150.75,
		Recommendations: json.RawMessage(`[{"action":"archive_flag","reason":"Rolled out 30 days ago, 100% stable"}]`),
		GeneratedAt:     time.Now().UTC(),
	}

	if err := is.CreateImpactReport(ctx, r); err != nil {
		t.Fatalf("CreateImpactReport: %v", err)
	}
	if r.ID == "" {
		t.Fatal("expected ID to be populated after create")
	}
	if r.CreatedAt.IsZero() {
		t.Fatal("expected CreatedAt to be populated")
	}

	got, err := is.GetImpactReport(ctx, r.ID)
	if err != nil {
		t.Fatalf("GetImpactReport: %v", err)
	}
	if got.ID != r.ID {
		t.Errorf("ID mismatch: got %s, want %s", got.ID, r.ID)
	}
	if got.OrgID != org.ID {
		t.Errorf("org_id mismatch: got %s, want %s", got.OrgID, org.ID)
	}
	if got.FlagKey != "feature-x" {
		t.Errorf("flag_key mismatch: got %s, want feature-x", got.FlagKey)
	}
	if got.BusinessImpact != domain.BusinessImpactPositive {
		t.Errorf("business_impact mismatch: got %s, want %s", got.BusinessImpact, domain.BusinessImpactPositive)
	}
	if got.CostAttribution != 150.75 {
		t.Errorf("cost_attribution mismatch: got %f, want 150.75", got.CostAttribution)
	}
}

func TestImpactStore_Report_ListAndCount(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newImpactStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	now := time.Now().UTC()
	reports := []domain.ImpactReport{
		{OrgID: org.ID, FlagKey: "feature-a", Report: json.RawMessage(`{}`), BusinessImpact: domain.BusinessImpactPositive, CostAttribution: 10.0, GeneratedAt: now},
		{OrgID: org.ID, FlagKey: "feature-a", Report: json.RawMessage(`{}`), BusinessImpact: domain.BusinessImpactNeutral, CostAttribution: 20.0, GeneratedAt: now.Add(-1 * time.Hour)},
		{OrgID: org.ID, FlagKey: "feature-b", Report: json.RawMessage(`{}`), BusinessImpact: domain.BusinessImpactNegative, CostAttribution: 5.0, GeneratedAt: now},
	}

	for i := range reports {
		if err := is.CreateImpactReport(ctx, &reports[i]); err != nil {
			t.Fatalf("CreateImpactReport %d: %v", i, err)
		}
	}

	// List all
	all, err := is.ListImpactReports(ctx, org.ID, "", 50, 0)
	if err != nil {
		t.Fatalf("ListImpactReports: %v", err)
	}
	if len(all) != 3 {
		t.Errorf("expected 3 reports, got %d", len(all))
	}

	count, err := is.CountImpactReports(ctx, org.ID, "")
	if err != nil {
		t.Fatalf("CountImpactReports: %v", err)
	}
	if count != 3 {
		t.Errorf("expected count 3, got %d", count)
	}

	// Filter by flag_key
	featureA, err := is.ListImpactReports(ctx, org.ID, "feature-a", 50, 0)
	if err != nil {
		t.Fatalf("ListImpactReports feature-a: %v", err)
	}
	if len(featureA) != 2 {
		t.Errorf("expected 2 feature-a reports, got %d", len(featureA))
	}

	countA, err := is.CountImpactReports(ctx, org.ID, "feature-a")
	if err != nil {
		t.Fatalf("CountImpactReports feature-a: %v", err)
	}
	if countA != 2 {
		t.Errorf("expected feature-a count 2, got %d", countA)
	}
}

func TestImpactStore_Report_GetLatest(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newImpactStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	now := time.Now().UTC()
	// Create older report
	older := &domain.ImpactReport{
		OrgID: org.ID, FlagKey: "feature-x", Report: json.RawMessage(`{"version":1}`),
		BusinessImpact: domain.BusinessImpactNeutral, CostAttribution: 10.0, GeneratedAt: now.Add(-2 * time.Hour),
	}
	if err := is.CreateImpactReport(ctx, older); err != nil {
		t.Fatalf("CreateImpactReport older: %v", err)
	}

	// Create newer report
	newer := &domain.ImpactReport{
		OrgID: org.ID, FlagKey: "feature-x", Report: json.RawMessage(`{"version":2}`),
		BusinessImpact: domain.BusinessImpactPositive, CostAttribution: 5.0, GeneratedAt: now,
	}
	if err := is.CreateImpactReport(ctx, newer); err != nil {
		t.Fatalf("CreateImpactReport newer: %v", err)
	}

	latest, err := is.GetLatestImpactReport(ctx, org.ID, "feature-x")
	if err != nil {
		t.Fatalf("GetLatestImpactReport: %v", err)
	}
	if latest.ID != newer.ID {
		t.Errorf("expected latest to be newer report: got %s, want %s", latest.ID, newer.ID)
	}
}

func TestImpactStore_Report_NotFound(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newImpactStore(t)
	ctx := context.Background()

	_, err := is.GetImpactReport(ctx, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Fatal("expected error for non-existent report")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestImpactStore_Report_TenantIsolation(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newImpactStore(t)
	ctx := context.Background()

	org1 := seedOrg(t, postgres.NewStore(pool))
	org2 := seedOrg(t, postgres.NewStore(pool))

	r1 := &domain.ImpactReport{
		OrgID: org1.ID, FlagKey: "feature-a", Report: json.RawMessage(`{}`),
		BusinessImpact: domain.BusinessImpactPositive, CostAttribution: 1.0, GeneratedAt: time.Now().UTC(),
	}
	if err := is.CreateImpactReport(ctx, r1); err != nil {
		t.Fatalf("CreateImpactReport org1: %v", err)
	}

	r2 := &domain.ImpactReport{
		OrgID: org2.ID, FlagKey: "feature-a", Report: json.RawMessage(`{}`),
		BusinessImpact: domain.BusinessImpactNegative, CostAttribution: 2.0, GeneratedAt: time.Now().UTC(),
	}
	if err := is.CreateImpactReport(ctx, r2); err != nil {
		t.Fatalf("CreateImpactReport org2: %v", err)
	}

	list1, _ := is.ListImpactReports(ctx, org1.ID, "", 50, 0)
	if len(list1) != 1 || list1[0].OrgID != org1.ID {
		t.Errorf("tenant isolation broken for org1")
	}

	count1, _ := is.CountImpactReports(ctx, org1.ID, "")
	count2, _ := is.CountImpactReports(ctx, org2.ID, "")
	if count1 != 1 || count2 != 1 {
		t.Errorf("tenant count mismatch: org1=%d, org2=%d", count1, count2)
	}
}

// ─── CostAttribution: Create, List ─────────────────────────────────────────

func TestImpactStore_CostAttribution_CreateAndList(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newImpactStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	now := time.Now().UTC()
	attrs := []domain.CostAttribution{
		{OrgID: org.ID, FlagKey: "feature-x", ResourceType: domain.ResourceTypeCompute, CostAmount: 100.0, Currency: "USD", PeriodStart: now.Add(-24 * time.Hour), PeriodEnd: now},
		{OrgID: org.ID, FlagKey: "feature-x", ResourceType: domain.ResourceTypeLatency, CostAmount: 50.0, Currency: "USD", PeriodStart: now.Add(-24 * time.Hour), PeriodEnd: now},
		{OrgID: org.ID, FlagKey: "feature-x", ResourceType: domain.ResourceTypeLLMTokens, CostAmount: 25.5, Currency: "USD", PeriodStart: now.Add(-24 * time.Hour), PeriodEnd: now},
	}

	for i := range attrs {
		if err := is.CreateCostAttribution(ctx, &attrs[i]); err != nil {
			t.Fatalf("CreateCostAttribution %d: %v", i, err)
		}
		if attrs[i].ID == "" {
			t.Fatalf("expected ID for attribution %d", i)
		}
	}

	list, err := is.ListCostAttributions(ctx, org.ID, "feature-x")
	if err != nil {
		t.Fatalf("ListCostAttributions: %v", err)
	}
	if len(list) != 3 {
		t.Errorf("expected 3 attributions, got %d", len(list))
	}

	// Verify types
	types := map[string]bool{}
	for _, a := range list {
		types[a.ResourceType] = true
	}
	if !types[domain.ResourceTypeCompute] || !types[domain.ResourceTypeLatency] || !types[domain.ResourceTypeLLMTokens] {
		t.Errorf("missing resource types in result: %v", types)
	}
}

func TestImpactStore_CostAttribution_DefaultCurrency(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newImpactStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	now := time.Now().UTC()
	a := &domain.CostAttribution{
		OrgID:        org.ID,
		FlagKey:      "feature-x",
		ResourceType: domain.ResourceTypeBandwidth,
		CostAmount:   75.0,
		// Currency left empty — should default to USD
		PeriodStart: now.Add(-24 * time.Hour),
		PeriodEnd:   now,
	}

	if err := is.CreateCostAttribution(ctx, a); err != nil {
		t.Fatalf("CreateCostAttribution: %v", err)
	}

	list, err := is.ListCostAttributions(ctx, org.ID, "feature-x")
	if err != nil {
		t.Fatalf("ListCostAttributions: %v", err)
	}
	if len(list) != 1 {
		t.Fatalf("expected 1 attribution, got %d", len(list))
	}
	if list[0].Currency != "USD" {
		t.Errorf("expected default currency USD, got %s", list[0].Currency)
	}
}

// ─── OrgLearning: Create, Get, List ────────────────────────────────────────

func TestImpactStore_OrgLearning_CreateAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newImpactStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	l := &domain.OrgLearning{
		OrgID:                   org.ID,
		TotalFlagsAnalyzed:      42,
		CleanupCandidates:       8,
		FlagsWithoutOwners:      3,
		StaleFlags:              5,
		AvgRiskScore:            35.5,
		AvgTimeToFullRollout:    72.0,
		TopInsights:             json.RawMessage(`[{"insight":"80% of flags rolled out within 3 days"}]`),
		GeneratedAt:             time.Now().UTC(),
	}

	if err := is.CreateOrgLearning(ctx, l); err != nil {
		t.Fatalf("CreateOrgLearning: %v", err)
	}
	if l.ID == "" {
		t.Fatal("expected ID to be populated after create")
	}

	got, err := is.GetOrgLearning(ctx, org.ID)
	if err != nil {
		t.Fatalf("GetOrgLearning: %v", err)
	}
	if got.ID != l.ID {
		t.Errorf("ID mismatch: got %s, want %s", got.ID, l.ID)
	}
	if got.TotalFlagsAnalyzed != 42 {
		t.Errorf("total_flags_analyzed mismatch: got %d, want 42", got.TotalFlagsAnalyzed)
	}
	if got.CleanupCandidates != 8 {
		t.Errorf("cleanup_candidates mismatch: got %d, want 8", got.CleanupCandidates)
	}
	if got.FlagsWithoutOwners != 3 {
		t.Errorf("flags_without_owners mismatch: got %d, want 3", got.FlagsWithoutOwners)
	}
	if got.StaleFlags != 5 {
		t.Errorf("stale_flags mismatch: got %d, want 5", got.StaleFlags)
	}
	if got.AvgRiskScore != 35.5 {
		t.Errorf("avg_risk_score mismatch: got %f, want 35.5", got.AvgRiskScore)
	}
	if got.AvgTimeToFullRollout != 72.0 {
		t.Errorf("avg_time_to_full_rollout_hours mismatch: got %f, want 72.0", got.AvgTimeToFullRollout)
	}
}

func TestImpactStore_OrgLearning_List(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newImpactStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	now := time.Now().UTC()
	for i := 0; i < 3; i++ {
		l := &domain.OrgLearning{
			OrgID:               org.ID,
			TotalFlagsAnalyzed:  10 + i,
			AvgRiskScore:        float64(20 + i*5),
			AvgTimeToFullRollout: float64(48 + i*12),
			TopInsights:         json.RawMessage(`[]`),
			GeneratedAt:         now.Add(-time.Duration(2-i) * 24 * time.Hour),
		}
		if err := is.CreateOrgLearning(ctx, l); err != nil {
			t.Fatalf("CreateOrgLearning %d: %v", i, err)
		}
	}

	list, err := is.ListOrgLearnings(ctx, org.ID, 50, 0)
	if err != nil {
		t.Fatalf("ListOrgLearnings: %v", err)
	}
	if len(list) != 3 {
		t.Errorf("expected 3 learnings, got %d", len(list))
	}

	// Latest (GetOrgLearning) should return most recent by generated_at
	latest, err := is.GetOrgLearning(ctx, org.ID)
	if err != nil {
		t.Fatalf("GetOrgLearning: %v", err)
	}
	if latest.TotalFlagsAnalyzed != 12 {
		t.Errorf("expected latest total_flags_analyzed=12, got %d", latest.TotalFlagsAnalyzed)
	}
}

func TestImpactStore_OrgLearning_NotFound(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newImpactStore(t)
	ctx := context.Background()

	_, err := is.GetOrgLearning(ctx, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Fatal("expected error for non-existent org learning")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestImpactStore_OrgLearning_TenantIsolation(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newImpactStore(t)
	ctx := context.Background()

	org1 := seedOrg(t, postgres.NewStore(pool))
	org2 := seedOrg(t, postgres.NewStore(pool))

	l1 := &domain.OrgLearning{
		OrgID: org1.ID, TotalFlagsAnalyzed: 10, AvgRiskScore: 25.0,
		AvgTimeToFullRollout: 48.0, TopInsights: json.RawMessage(`[]`), GeneratedAt: time.Now().UTC(),
	}
	if err := is.CreateOrgLearning(ctx, l1); err != nil {
		t.Fatalf("CreateOrgLearning org1: %v", err)
	}

	l2 := &domain.OrgLearning{
		OrgID: org2.ID, TotalFlagsAnalyzed: 20, AvgRiskScore: 50.0,
		AvgTimeToFullRollout: 96.0, TopInsights: json.RawMessage(`[]`), GeneratedAt: time.Now().UTC(),
	}
	if err := is.CreateOrgLearning(ctx, l2); err != nil {
		t.Fatalf("CreateOrgLearning org2: %v", err)
	}

	got, err := is.GetOrgLearning(ctx, org1.ID)
	if err != nil {
		t.Fatalf("GetOrgLearning org1: %v", err)
	}
	if got.OrgID != org1.ID {
		t.Errorf("tenant isolation broken: got org %s, want %s", got.OrgID, org1.ID)
	}
	if got.TotalFlagsAnalyzed != 10 {
		t.Errorf("wrong org1 data: got %d total_flags_analyzed", got.TotalFlagsAnalyzed)
	}
}
