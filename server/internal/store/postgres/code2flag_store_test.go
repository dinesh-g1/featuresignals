package postgres_test

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"testing"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store/postgres"
)

// ─── Helpers ───────────────────────────────────────────────────────────────

func newCode2FlagStore(t *testing.T) *postgres.Code2FlagStore {
	t.Helper()
	return postgres.NewCode2FlagStore(testPool(t), slog.Default())
}

func seedProjectForC2F(t *testing.T, orgID string) *domain.Project {
	t.Helper()
	store := postgres.NewStore(testPool(t))
	p := &domain.Project{OrgID: orgID, Name: "C2F Test Project", Slug: "c2f-test-" + orgID[:8]}
	if err := store.CreateProject(context.Background(), p); err != nil {
		t.Fatalf("create project: %v", err)
	}
	return p
}

// seedFlagForCleanup creates a real flag for use in cleanup_queue tests
// (cleanup_queue has FK to flags).
func seedFlagForCleanup(t *testing.T, orgID, projectID string) *domain.Flag {
	t.Helper()
	store := postgres.NewStore(testPool(t))
	flag := &domain.Flag{
		OrgID:        orgID,
		ProjectID:    projectID,
		Key:          "c2f-cleanup-test-flag-" + orgID[:8],
		Name:         "C2F Cleanup Test Flag",
		FlagType:     "boolean",
		DefaultValue: json.RawMessage("false"),
	}
	if err := store.CreateFlag(context.Background(), flag); err != nil {
		t.Fatalf("create flag for cleanup: %v", err)
	}
	return flag
}

// ─── ScanResult CRUD ───────────────────────────────────────────────────────

func TestCode2FlagStore_ScanResult_CreateAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)

	sr := &domain.ScanResult{
		OrgID:            org.ID,
		ProjectID:        proj.ID,
		Repository:       "github.com/example/repo",
		FilePath:         "src/features.ts",
		LineNumber:       42,
		ConditionalType:  domain.ConditionalTypeIfStatement,
		ConditionalText:  "if (process.env.FEATURE_X === 'true')",
		Confidence:       0.95,
		Status:           domain.ScanResultStatusUnreviewed,
		SuggestedFlagKey: "feature-x",
		SuggestedFlagName: "Feature X",
	}

	if err := c2f.CreateScanResult(ctx, sr); err != nil {
		t.Fatalf("CreateScanResult: %v", err)
	}
	if sr.ID == "" {
		t.Fatal("expected ID to be populated after create")
	}
	if sr.CreatedAt.IsZero() {
		t.Fatal("expected CreatedAt to be populated")
	}

	got, err := c2f.GetScanResult(ctx, sr.ID)
	if err != nil {
		t.Fatalf("GetScanResult: %v", err)
	}
	if got.ID != sr.ID {
		t.Errorf("ID mismatch: got %s, want %s", got.ID, sr.ID)
	}
	if got.Repository != "github.com/example/repo" {
		t.Errorf("repository mismatch: got %s", got.Repository)
	}
	if got.LineNumber != 42 {
		t.Errorf("line_number mismatch: got %d, want 42", got.LineNumber)
	}
	if got.ConditionalType != domain.ConditionalTypeIfStatement {
		t.Errorf("conditional_type mismatch: got %s", got.ConditionalType)
	}
	if got.Confidence != 0.95 {
		t.Errorf("confidence mismatch: got %f, want 0.95", got.Confidence)
	}
	if got.Status != domain.ScanResultStatusUnreviewed {
		t.Errorf("status mismatch: got %s", got.Status)
	}
	if got.SuggestedFlagKey != "feature-x" {
		t.Errorf("suggested_flag_key mismatch: got %s", got.SuggestedFlagKey)
	}
}

func TestCode2FlagStore_ScanResult_ListAndCount(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)

	// Create 3 scan results with varying statuses
	results := []domain.ScanResult{
		{
			OrgID: org.ID, ProjectID: proj.ID, Repository: "repo/a",
			FilePath: "a.ts", LineNumber: 1, ConditionalType: domain.ConditionalTypeIfStatement,
			ConditionalText: "if (A)", Confidence: 0.9,
			Status: domain.ScanResultStatusUnreviewed,
		},
		{
			OrgID: org.ID, ProjectID: proj.ID, Repository: "repo/b",
			FilePath: "b.ts", LineNumber: 2, ConditionalType: domain.ConditionalTypeTernary,
			ConditionalText: "x ? y : z", Confidence: 0.7,
			Status: domain.ScanResultStatusAccepted,
		},
		{
			OrgID: org.ID, ProjectID: proj.ID, Repository: "repo/a",
			FilePath: "c.ts", LineNumber: 3, ConditionalType: domain.ConditionalTypeConfigCheck,
			ConditionalText: "config.check('flag')", Confidence: 0.5,
			Status: domain.ScanResultStatusRejected,
		},
	}

	for i := range results {
		if err := c2f.CreateScanResult(ctx, &results[i]); err != nil {
			t.Fatalf("CreateScanResult %d: %v", i, err)
		}
	}

	// List all (unfiltered)
	all, err := c2f.ListScanResults(ctx, org.ID, proj.ID, domain.ScanResultFilter{}, 50, 0)
	if err != nil {
		t.Fatalf("ListScanResults: %v", err)
	}
	if len(all) != 3 {
		t.Errorf("expected 3 results, got %d", len(all))
	}

	count, err := c2f.CountScanResults(ctx, org.ID, proj.ID, domain.ScanResultFilter{})
	if err != nil {
		t.Fatalf("CountScanResults: %v", err)
	}
	if count != 3 {
		t.Errorf("expected count 3, got %d", count)
	}

	// Filter by status
	filtered, err := c2f.ListScanResults(ctx, org.ID, proj.ID, domain.ScanResultFilter{
		Status: domain.ScanResultStatusUnreviewed,
	}, 50, 0)
	if err != nil {
		t.Fatalf("ListScanResults filtered: %v", err)
	}
	if len(filtered) != 1 {
		t.Errorf("expected 1 unreviewed result, got %d", len(filtered))
	}

	// Filter by repository
	repoFiltered, err := c2f.ListScanResults(ctx, org.ID, proj.ID, domain.ScanResultFilter{
		Repository: "repo/a",
	}, 50, 0)
	if err != nil {
		t.Fatalf("ListScanResults repo filtered: %v", err)
	}
	if len(repoFiltered) != 2 {
		t.Errorf("expected 2 repo/a results, got %d", len(repoFiltered))
	}

	// Filter by min confidence
	confFiltered, err := c2f.ListScanResults(ctx, org.ID, proj.ID, domain.ScanResultFilter{
		MinConfidence: 0.8,
	}, 50, 0)
	if err != nil {
		t.Fatalf("ListScanResults confidence filtered: %v", err)
	}
	if len(confFiltered) != 1 {
		t.Errorf("expected 1 result with confidence >= 0.8, got %d", len(confFiltered))
	}
}

func TestCode2FlagStore_ScanResult_Update(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)

	sr := &domain.ScanResult{
		OrgID: org.ID, ProjectID: proj.ID, Repository: "repo/x",
		FilePath: "x.ts", LineNumber: 10, ConditionalType: domain.ConditionalTypeIfStatement,
		ConditionalText: "if (X)", Confidence: 0.6,
		Status: domain.ScanResultStatusUnreviewed,
	}
	if err := c2f.CreateScanResult(ctx, sr); err != nil {
		t.Fatalf("CreateScanResult: %v", err)
	}

	// Update status and confidence
	err := c2f.UpdateScanResult(ctx, sr.ID, map[string]interface{}{
		"status":     domain.ScanResultStatusAccepted,
		"confidence": 0.99,
	})
	if err != nil {
		t.Fatalf("UpdateScanResult: %v", err)
	}

	got, err := c2f.GetScanResult(ctx, sr.ID)
	if err != nil {
		t.Fatalf("GetScanResult after update: %v", err)
	}
	if got.Status != domain.ScanResultStatusAccepted {
		t.Errorf("status not updated: got %s, want %s", got.Status, domain.ScanResultStatusAccepted)
	}
	if got.Confidence != 0.99 {
		t.Errorf("confidence not updated: got %f, want 0.99", got.Confidence)
	}
}

func TestCode2FlagStore_ScanResult_UpdateDisallowedColumn(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)

	sr := &domain.ScanResult{
		OrgID: org.ID, ProjectID: proj.ID, Repository: "repo/x",
		FilePath: "x.ts", LineNumber: 10, ConditionalType: domain.ConditionalTypeIfStatement,
		ConditionalText: "if (X)", Confidence: 0.6,
		Status: domain.ScanResultStatusUnreviewed,
	}
	if err := c2f.CreateScanResult(ctx, sr); err != nil {
		t.Fatalf("CreateScanResult: %v", err)
	}

	err := c2f.UpdateScanResult(ctx, sr.ID, map[string]interface{}{
		"org_id": "evil-org", // not in allowlist
	})
	if err == nil {
		t.Fatal("expected error for disallowed column update")
	}
}

func TestCode2FlagStore_ScanResult_BatchCreate(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)

	results := []domain.ScanResult{
		{
			OrgID: org.ID, ProjectID: proj.ID, Repository: "repo/1",
			FilePath: "a.ts", LineNumber: 1, ConditionalType: domain.ConditionalTypeIfStatement,
			ConditionalText: "if (A)", Confidence: 0.9,
			Status: domain.ScanResultStatusUnreviewed,
		},
		{
			OrgID: org.ID, ProjectID: proj.ID, Repository: "repo/2",
			FilePath: "b.ts", LineNumber: 2, ConditionalType: domain.ConditionalTypeTernary,
			ConditionalText: "x ? y : z", Confidence: 0.8,
			Status: domain.ScanResultStatusUnreviewed,
		},
		{
			OrgID: org.ID, ProjectID: proj.ID, Repository: "repo/3",
			FilePath: "c.ts", LineNumber: 3, ConditionalType: domain.ConditionalTypeSwitchCase,
			ConditionalText: "switch(x) { case A: }", Confidence: 0.7,
			Status: domain.ScanResultStatusUnreviewed,
		},
	}

	if err := c2f.BatchCreateScanResults(ctx, results); err != nil {
		t.Fatalf("BatchCreateScanResults: %v", err)
	}

	for i := range results {
		if results[i].ID == "" {
			t.Errorf("result %d: ID not populated", i)
		}
		if results[i].CreatedAt.IsZero() {
			t.Errorf("result %d: CreatedAt not populated", i)
		}
	}

	count, err := c2f.CountScanResults(ctx, org.ID, proj.ID, domain.ScanResultFilter{})
	if err != nil {
		t.Fatalf("CountScanResults: %v", err)
	}
	if count != 3 {
		t.Errorf("expected 3 results after batch create, got %d", count)
	}
}

func TestCode2FlagStore_ScanResult_NotFound(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	_, err := c2f.GetScanResult(ctx, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Fatal("expected error for missing scan result")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestCode2FlagStore_ScanResult_TenantIsolation(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	mainStore := postgres.NewStore(pool)
	ctx := context.Background()

	org1 := seedOrg(t, mainStore)
	org2 := seedOrg(t, mainStore)
	proj1 := seedProjectForC2F(t, org1.ID)
	proj2 := seedProjectForC2F(t, org2.ID)

	// Create scan result in org1
	sr1 := &domain.ScanResult{
		OrgID: org1.ID, ProjectID: proj1.ID, Repository: "repo/org1",
		FilePath: "org1.ts", LineNumber: 1, ConditionalType: domain.ConditionalTypeIfStatement,
		ConditionalText: "if (ORG1)", Confidence: 0.9,
		Status: domain.ScanResultStatusUnreviewed,
	}
	if err := c2f.CreateScanResult(ctx, sr1); err != nil {
		t.Fatalf("CreateScanResult org1: %v", err)
	}

	// Create scan result in org2
	sr2 := &domain.ScanResult{
		OrgID: org2.ID, ProjectID: proj2.ID, Repository: "repo/org2",
		FilePath: "org2.ts", LineNumber: 1, ConditionalType: domain.ConditionalTypeIfStatement,
		ConditionalText: "if (ORG2)", Confidence: 0.9,
		Status: domain.ScanResultStatusUnreviewed,
	}
	if err := c2f.CreateScanResult(ctx, sr2); err != nil {
		t.Fatalf("CreateScanResult org2: %v", err)
	}

	// org1 listing should only see org1's results
	org1Results, err := c2f.ListScanResults(ctx, org1.ID, proj1.ID, domain.ScanResultFilter{}, 50, 0)
	if err != nil {
		t.Fatalf("ListScanResults org1: %v", err)
	}
	for _, r := range org1Results {
		if r.OrgID != org1.ID {
			t.Errorf("tenant isolation violation: org1 saw result from org %s", r.OrgID)
		}
	}

	// org1 count should be 1
	count, err := c2f.CountScanResults(ctx, org1.ID, proj1.ID, domain.ScanResultFilter{})
	if err != nil {
		t.Fatalf("CountScanResults org1: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 result for org1, got %d", count)
	}

	// org2 count should also be 1
	count2, err := c2f.CountScanResults(ctx, org2.ID, proj2.ID, domain.ScanResultFilter{})
	if err != nil {
		t.Fatalf("CountScanResults org2: %v", err)
	}
	if count2 != 1 {
		t.Errorf("expected 1 result for org2, got %d", count2)
	}
}

func TestCode2FlagStore_ScanResult_Pagination(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)

	// Create 5 scan results
	for i := 0; i < 5; i++ {
		sr := &domain.ScanResult{
			OrgID: org.ID, ProjectID: proj.ID, Repository: "repo/paginate",
			FilePath: "file.ts", LineNumber: i, ConditionalType: domain.ConditionalTypeIfStatement,
			ConditionalText: "if (X)", Confidence: 0.5,
			Status: domain.ScanResultStatusUnreviewed,
		}
		if err := c2f.CreateScanResult(ctx, sr); err != nil {
			t.Fatalf("CreateScanResult %d: %v", i, err)
		}
	}

	// Page 1: limit 2, offset 0
	page1, err := c2f.ListScanResults(ctx, org.ID, proj.ID, domain.ScanResultFilter{}, 2, 0)
	if err != nil {
		t.Fatalf("ListScanResults page 1: %v", err)
	}
	if len(page1) != 2 {
		t.Errorf("page 1: expected 2 results, got %d", len(page1))
	}

	// Page 2: limit 2, offset 2
	page2, err := c2f.ListScanResults(ctx, org.ID, proj.ID, domain.ScanResultFilter{}, 2, 2)
	if err != nil {
		t.Fatalf("ListScanResults page 2: %v", err)
	}
	if len(page2) != 2 {
		t.Errorf("page 2: expected 2 results, got %d", len(page2))
	}

	// Page 3: limit 2, offset 4 (should get 1)
	page3, err := c2f.ListScanResults(ctx, org.ID, proj.ID, domain.ScanResultFilter{}, 2, 4)
	if err != nil {
		t.Fatalf("ListScanResults page 3: %v", err)
	}
	if len(page3) != 1 {
		t.Errorf("page 3: expected 1 result, got %d", len(page3))
	}

	// Verify no overlap: IDs in page1 should not appear in page2
	page1IDs := make(map[string]bool)
	for _, r := range page1 {
		page1IDs[r.ID] = true
	}
	for _, r := range page2 {
		if page1IDs[r.ID] {
			t.Errorf("pagination overlap: ID %s appeared in both pages", r.ID)
		}
	}
}

// ─── GeneratedFlag CRUD ────────────────────────────────────────────────────

func TestCode2FlagStore_GeneratedFlag_CreateAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)

	gf := &domain.GeneratedFlag{
		OrgID:       org.ID,
		ProjectID:   proj.ID,
		Key:         "gen-flag-1",
		Name:        "Generated Flag 1",
		Description: "Auto-generated from scan",
		FlagType:    "boolean",
		Status:      domain.GeneratedFlagStatusProposed,
	}

	if err := c2f.CreateGeneratedFlag(ctx, gf); err != nil {
		t.Fatalf("CreateGeneratedFlag: %v", err)
	}
	if gf.ID == "" {
		t.Fatal("expected ID to be populated")
	}
	if gf.CreatedAt.IsZero() {
		t.Fatal("expected CreatedAt to be populated")
	}

	got, err := c2f.GetGeneratedFlag(ctx, gf.ID)
	if err != nil {
		t.Fatalf("GetGeneratedFlag: %v", err)
	}
	if got.Key != "gen-flag-1" {
		t.Errorf("key mismatch: got %s, want gen-flag-1", got.Key)
	}
	if got.Name != "Generated Flag 1" {
		t.Errorf("name mismatch: got %s", got.Name)
	}
	if got.Status != domain.GeneratedFlagStatusProposed {
		t.Errorf("status mismatch: got %s", got.Status)
	}
}

func TestCode2FlagStore_GeneratedFlag_DuplicateKey(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)

	gf1 := &domain.GeneratedFlag{
		OrgID: org.ID, ProjectID: proj.ID, Key: "dup-key",
		Name: "First", FlagType: "boolean", Status: domain.GeneratedFlagStatusProposed,
	}
	if err := c2f.CreateGeneratedFlag(ctx, gf1); err != nil {
		t.Fatalf("CreateGeneratedFlag first: %v", err)
	}

	gf2 := &domain.GeneratedFlag{
		OrgID: org.ID, ProjectID: proj.ID, Key: "dup-key",
		Name: "Second", FlagType: "boolean", Status: domain.GeneratedFlagStatusProposed,
	}
	err := c2f.CreateGeneratedFlag(ctx, gf2)
	if err == nil {
		t.Fatal("expected conflict error for duplicate key")
	}
	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict, got %v", err)
	}
}

func TestCode2FlagStore_GeneratedFlag_ListAndCount(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)

	for i := 0; i < 3; i++ {
		gf := &domain.GeneratedFlag{
			OrgID: org.ID, ProjectID: proj.ID,
			Key: "list-flag-" + string(rune('a'+i)),
			Name: "List Flag " + string(rune('A'+i)),
			FlagType: "boolean", Status: domain.GeneratedFlagStatusProposed,
		}
		if err := c2f.CreateGeneratedFlag(ctx, gf); err != nil {
			t.Fatalf("CreateGeneratedFlag %d: %v", i, err)
		}
	}

	all, err := c2f.ListGeneratedFlags(ctx, org.ID, proj.ID, 50, 0)
	if err != nil {
		t.Fatalf("ListGeneratedFlags: %v", err)
	}
	if len(all) != 3 {
		t.Errorf("expected 3 flags, got %d", len(all))
	}

	count, err := c2f.CountGeneratedFlags(ctx, org.ID, proj.ID)
	if err != nil {
		t.Fatalf("CountGeneratedFlags: %v", err)
	}
	if count != 3 {
		t.Errorf("expected count 3, got %d", count)
	}
}

func TestCode2FlagStore_GeneratedFlag_Update(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)

	gf := &domain.GeneratedFlag{
		OrgID: org.ID, ProjectID: proj.ID, Key: "update-flag",
		Name: "Update Test", FlagType: "boolean", Status: domain.GeneratedFlagStatusProposed,
	}
	if err := c2f.CreateGeneratedFlag(ctx, gf); err != nil {
		t.Fatalf("CreateGeneratedFlag: %v", err)
	}

	err := c2f.UpdateGeneratedFlag(ctx, gf.ID, map[string]interface{}{
		"status": domain.GeneratedFlagStatusFlagCreated,
	})
	if err != nil {
		t.Fatalf("UpdateGeneratedFlag: %v", err)
	}

	got, err := c2f.GetGeneratedFlag(ctx, gf.ID)
	if err != nil {
		t.Fatalf("GetGeneratedFlag after update: %v", err)
	}
	if got.Status != domain.GeneratedFlagStatusFlagCreated {
		t.Errorf("status not updated: got %s", got.Status)
	}
}

// ─── CleanupEntry CRUD ─────────────────────────────────────────────────────

func TestCode2FlagStore_CleanupEntry_CreateAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)
	flag := seedFlagForCleanup(t, org.ID, proj.ID)

	ce := &domain.CleanupEntry{
		OrgID:               org.ID,
		FlagID:              flag.ID,
		FlagKey:             flag.Key,
		Reason:              domain.CleanupReasonStale,
		DaysSince100Percent: 30,
		Status:              domain.CleanupStatusPending,
	}

	if err := c2f.CreateCleanupEntry(ctx, ce); err != nil {
		t.Fatalf("CreateCleanupEntry: %v", err)
	}
	if ce.ID == "" {
		t.Fatal("expected ID to be populated")
	}
	if ce.CreatedAt.IsZero() {
		t.Fatal("expected CreatedAt to be populated")
	}

	got, err := c2f.GetCleanupEntry(ctx, ce.ID)
	if err != nil {
		t.Fatalf("GetCleanupEntry: %v", err)
	}
	if got.FlagKey != flag.Key {
		t.Errorf("flag_key mismatch: got %s, want %s", got.FlagKey, flag.Key)
	}
	if got.Reason != domain.CleanupReasonStale {
		t.Errorf("reason mismatch: got %s", got.Reason)
	}
	if got.DaysSince100Percent != 30 {
		t.Errorf("days_since_100_percent mismatch: got %d, want 30", got.DaysSince100Percent)
	}
	if got.Status != domain.CleanupStatusPending {
		t.Errorf("status mismatch: got %s", got.Status)
	}
}

func TestCode2FlagStore_CleanupEntry_ListAndCount(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)

	// Create 2 flags and 2 cleanup entries with different statuses
	flag1 := seedFlagForCleanup(t, org.ID, proj.ID)
	ce1 := &domain.CleanupEntry{
		OrgID: org.ID, FlagID: flag1.ID, FlagKey: flag1.Key,
		Reason: domain.CleanupReasonStale, DaysSince100Percent: 10,
		Status: domain.CleanupStatusPending,
	}
	if err := c2f.CreateCleanupEntry(ctx, ce1); err != nil {
		t.Fatalf("CreateCleanupEntry 1: %v", err)
	}

	flag2 := seedFlagForCleanup(t, org.ID, proj.ID)
	ce2 := &domain.CleanupEntry{
		OrgID: org.ID, FlagID: flag2.ID, FlagKey: flag2.Key,
		Reason: domain.CleanupReason100PercentRolledOut, DaysSince100Percent: 60,
		Status: domain.CleanupStatusPRCreated,
	}
	if err := c2f.CreateCleanupEntry(ctx, ce2); err != nil {
		t.Fatalf("CreateCleanupEntry 2: %v", err)
	}

	// List all
	all, err := c2f.ListCleanupEntries(ctx, org.ID, domain.CleanupFilter{}, 50, 0)
	if err != nil {
		t.Fatalf("ListCleanupEntries: %v", err)
	}
	if len(all) != 2 {
		t.Errorf("expected 2 entries, got %d", len(all))
	}

	// Count all
	count, err := c2f.CountCleanupEntries(ctx, org.ID, domain.CleanupFilter{})
	if err != nil {
		t.Fatalf("CountCleanupEntries: %v", err)
	}
	if count != 2 {
		t.Errorf("expected count 2, got %d", count)
	}

	// Filter by status
	pending, err := c2f.ListCleanupEntries(ctx, org.ID, domain.CleanupFilter{
		Status: domain.CleanupStatusPending,
	}, 50, 0)
	if err != nil {
		t.Fatalf("ListCleanupEntries pending: %v", err)
	}
	if len(pending) != 1 {
		t.Errorf("expected 1 pending entry, got %d", len(pending))
	}

	// Filter by reason
	stale, err := c2f.ListCleanupEntries(ctx, org.ID, domain.CleanupFilter{
		Reason: domain.CleanupReasonStale,
	}, 50, 0)
	if err != nil {
		t.Fatalf("ListCleanupEntries stale: %v", err)
	}
	if len(stale) != 1 {
		t.Errorf("expected 1 stale entry, got %d", len(stale))
	}
}

func TestCode2FlagStore_CleanupEntry_Update(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)
	flag := seedFlagForCleanup(t, org.ID, proj.ID)

	ce := &domain.CleanupEntry{
		OrgID: org.ID, FlagID: flag.ID, FlagKey: flag.Key,
		Reason: domain.CleanupReasonStale, DaysSince100Percent: 0,
		Status: domain.CleanupStatusPending,
	}
	if err := c2f.CreateCleanupEntry(ctx, ce); err != nil {
		t.Fatalf("CreateCleanupEntry: %v", err)
	}

	err := c2f.UpdateCleanupEntry(ctx, ce.ID, map[string]interface{}{
		"status":                  domain.CleanupStatusPRCreated,
		"days_since_100_percent": 90,
	})
	if err != nil {
		t.Fatalf("UpdateCleanupEntry: %v", err)
	}

	got, err := c2f.GetCleanupEntry(ctx, ce.ID)
	if err != nil {
		t.Fatalf("GetCleanupEntry after update: %v", err)
	}
	if got.Status != domain.CleanupStatusPRCreated {
		t.Errorf("status not updated: got %s", got.Status)
	}
	if got.DaysSince100Percent != 90 {
		t.Errorf("days_since_100_percent not updated: got %d, want 90", got.DaysSince100Percent)
	}
}

func TestCode2FlagStore_CleanupEntry_Delete(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProjectForC2F(t, org.ID)
	flag := seedFlagForCleanup(t, org.ID, proj.ID)

	ce := &domain.CleanupEntry{
		OrgID: org.ID, FlagID: flag.ID, FlagKey: flag.Key,
		Reason: domain.CleanupReasonStale, DaysSince100Percent: 0,
		Status: domain.CleanupStatusPending,
	}
	if err := c2f.CreateCleanupEntry(ctx, ce); err != nil {
		t.Fatalf("CreateCleanupEntry: %v", err)
	}

	if err := c2f.DeleteCleanupEntry(ctx, ce.ID); err != nil {
		t.Fatalf("DeleteCleanupEntry: %v", err)
	}

	_, err := c2f.GetCleanupEntry(ctx, ce.ID)
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound after delete, got %v", err)
	}
}

func TestCode2FlagStore_CleanupEntry_NotFound(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	_, err := c2f.GetCleanupEntry(ctx, "00000000-0000-0000-0000-000000000000")
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

// ─── Edge Cases ────────────────────────────────────────────────────────────

func TestCode2FlagStore_ScanResult_EmptyBatchCreate(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	// Empty batch should not error
	if err := c2f.BatchCreateScanResults(ctx, nil); err != nil {
		t.Fatalf("nil batch: %v", err)
	}
	if err := c2f.BatchCreateScanResults(ctx, []domain.ScanResult{}); err != nil {
		t.Fatalf("empty batch: %v", err)
	}
}

func TestCode2FlagStore_ScanResult_EmptyUpdate(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	// Empty updates should not error
	if err := c2f.UpdateScanResult(ctx, "any-id", nil); err != nil {
		t.Fatalf("nil updates: %v", err)
	}
	if err := c2f.UpdateScanResult(ctx, "any-id", map[string]interface{}{}); err != nil {
		t.Fatalf("empty updates: %v", err)
	}
}

func TestCode2FlagStore_UpdateScanResult_NotFound(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	c2f := newCode2FlagStore(t)
	ctx := context.Background()

	err := c2f.UpdateScanResult(ctx, "00000000-0000-0000-0000-000000000000", map[string]interface{}{
		"status": domain.ScanResultStatusAccepted,
	})
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound for update on missing row, got %v", err)
	}
}
