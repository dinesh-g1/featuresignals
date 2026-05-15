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

func newIncidentStore(t *testing.T) *postgres.IncidentStore {
	t.Helper()
	return postgres.NewIncidentStore(testPool(t), slog.Default())
}

// ─── IncidentCorrelation: Create, Get, List, Count ─────────────────────────

func TestIncidentStore_Correlation_CreateAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newIncidentStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	incidentStarted := time.Now().UTC().Add(-1 * time.Hour)
	c := &domain.IncidentCorrelation{
		OrgID:             org.ID,
		IncidentStartedAt: incidentStarted,
		ServicesAffected:  []string{"api-gateway", "user-service"},
		TotalFlagsChanged: 3,
		CorrelatedChanges: json.RawMessage(`[{"flag_key":"feature-x","change_type":"rollout","correlation_score":0.95}]`),
		HighestCorrelation: 0.95,
	}

	if err := is.CreateIncidentCorrelation(ctx, c); err != nil {
		t.Fatalf("CreateIncidentCorrelation: %v", err)
	}
	if c.ID == "" {
		t.Fatal("expected ID to be populated after create")
	}
	if c.CreatedAt.IsZero() {
		t.Fatal("expected CreatedAt to be populated")
	}

	got, err := is.GetIncidentCorrelation(ctx, c.ID)
	if err != nil {
		t.Fatalf("GetIncidentCorrelation: %v", err)
	}
	if got.ID != c.ID {
		t.Errorf("ID mismatch: got %s, want %s", got.ID, c.ID)
	}
	if got.OrgID != org.ID {
		t.Errorf("org_id mismatch: got %s, want %s", got.OrgID, org.ID)
	}
	if got.TotalFlagsChanged != 3 {
		t.Errorf("total_flags_changed mismatch: got %d, want 3", got.TotalFlagsChanged)
	}
	if got.HighestCorrelation != 0.95 {
		t.Errorf("highest_correlation mismatch: got %f, want 0.95", got.HighestCorrelation)
	}
	if len(got.ServicesAffected) != 2 {
		t.Errorf("services_affected length: got %d, want 2", len(got.ServicesAffected))
	}
}

func TestIncidentStore_Correlation_ListAndCount(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newIncidentStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	now := time.Now().UTC()
	for i := 0; i < 3; i++ {
		c := &domain.IncidentCorrelation{
			OrgID:             org.ID,
			IncidentStartedAt: now.Add(-time.Duration(i+1) * time.Hour),
			ServicesAffected:  []string{"svc"},
			TotalFlagsChanged: i + 1,
			CorrelatedChanges: json.RawMessage(`[]`),
			HighestCorrelation: float64(i) * 0.3,
		}
		if err := is.CreateIncidentCorrelation(ctx, c); err != nil {
			t.Fatalf("CreateIncidentCorrelation %d: %v", i, err)
		}
	}

	list, err := is.ListIncidentCorrelations(ctx, org.ID, 50, 0)
	if err != nil {
		t.Fatalf("ListIncidentCorrelations: %v", err)
	}
	if len(list) != 3 {
		t.Errorf("expected 3 correlations, got %d", len(list))
	}

	count, err := is.CountIncidentCorrelations(ctx, org.ID)
	if err != nil {
		t.Fatalf("CountIncidentCorrelations: %v", err)
	}
	if count != 3 {
		t.Errorf("expected count 3, got %d", count)
	}
}

func TestIncidentStore_Correlation_NotFound(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newIncidentStore(t)
	ctx := context.Background()

	_, err := is.GetIncidentCorrelation(ctx, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Fatal("expected error for non-existent correlation")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestIncidentStore_Correlation_TenantIsolation(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newIncidentStore(t)
	ctx := context.Background()

	org1 := seedOrg(t, postgres.NewStore(pool))
	org2 := seedOrg(t, postgres.NewStore(pool))

	// Create correlation in org1
	c1 := &domain.IncidentCorrelation{
		OrgID:             org1.ID,
		IncidentStartedAt: time.Now().UTC(),
		TotalFlagsChanged: 1,
		CorrelatedChanges: json.RawMessage(`[]`),
	}
	if err := is.CreateIncidentCorrelation(ctx, c1); err != nil {
		t.Fatalf("CreateIncidentCorrelation org1: %v", err)
	}

	// Create correlation in org2
	c2 := &domain.IncidentCorrelation{
		OrgID:             org2.ID,
		IncidentStartedAt: time.Now().UTC(),
		TotalFlagsChanged: 2,
		CorrelatedChanges: json.RawMessage(`[]`),
	}
	if err := is.CreateIncidentCorrelation(ctx, c2); err != nil {
		t.Fatalf("CreateIncidentCorrelation org2: %v", err)
	}

	// List should only return org1's correlation
	list, err := is.ListIncidentCorrelations(ctx, org1.ID, 50, 0)
	if err != nil {
		t.Fatalf("ListIncidentCorrelations org1: %v", err)
	}
	if len(list) != 1 {
		t.Errorf("expected 1 correlation for org1, got %d", len(list))
	}
	if list[0].OrgID != org1.ID {
		t.Errorf("tenant isolation broken: got org %s, want %s", list[0].OrgID, org1.ID)
	}

	// Count should be 1 per org
	count1, _ := is.CountIncidentCorrelations(ctx, org1.ID)
	count2, _ := is.CountIncidentCorrelations(ctx, org2.ID)
	if count1 != 1 || count2 != 1 {
		t.Errorf("tenant count mismatch: org1=%d, org2=%d", count1, count2)
	}
}

func TestIncidentStore_Correlation_WithEnv(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newIncidentStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))
	proj := seedProject(t, postgres.NewStore(pool), org.ID)
	env := seedEnv(t, postgres.NewStore(pool), proj.ID, org.ID, "prod-"+org.ID[:8])

	c := &domain.IncidentCorrelation{
		OrgID:             org.ID,
		EnvID:             env.ID,
		IncidentStartedAt: time.Now().UTC(),
		ServicesAffected:  []string{"payment-service"},
		TotalFlagsChanged: 1,
		CorrelatedChanges: json.RawMessage(`[]`),
	}

	if err := is.CreateIncidentCorrelation(ctx, c); err != nil {
		t.Fatalf("CreateIncidentCorrelation: %v", err)
	}

	got, err := is.GetIncidentCorrelation(ctx, c.ID)
	if err != nil {
		t.Fatalf("GetIncidentCorrelation: %v", err)
	}
	if got.EnvID != env.ID {
		t.Errorf("env_id mismatch: got %s, want %s", got.EnvID, env.ID)
	}
}

// ─── AutoRemediation: Create, Get, List, Count, Update ─────────────────────

func TestIncidentStore_Remediation_CreateAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newIncidentStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	r := &domain.AutoRemediation{
		OrgID:         org.ID,
		FlagKey:       "feature-x",
		Action:        domain.RemediationActionPause,
		Reason:        "Incident correlation score 0.95 detected",
		Status:        domain.RemediationStatusApplied,
		PreviousState: json.RawMessage(`{"enabled":true,"percentage":10000}`),
	}

	if err := is.CreateAutoRemediation(ctx, r); err != nil {
		t.Fatalf("CreateAutoRemediation: %v", err)
	}
	if r.ID == "" {
		t.Fatal("expected ID to be populated after create")
	}

	got, err := is.GetAutoRemediation(ctx, r.ID)
	if err != nil {
		t.Fatalf("GetAutoRemediation: %v", err)
	}
	if got.ID != r.ID {
		t.Errorf("ID mismatch: got %s, want %s", got.ID, r.ID)
	}
	if got.FlagKey != "feature-x" {
		t.Errorf("flag_key mismatch: got %s, want feature-x", got.FlagKey)
	}
	if got.Action != domain.RemediationActionPause {
		t.Errorf("action mismatch: got %s, want %s", got.Action, domain.RemediationActionPause)
	}
	if got.Status != domain.RemediationStatusApplied {
		t.Errorf("status mismatch: got %s, want %s", got.Status, domain.RemediationStatusApplied)
	}
	if got.Reason != "Incident correlation score 0.95 detected" {
		t.Errorf("reason mismatch: got %s", got.Reason)
	}
}

func TestIncidentStore_Remediation_ListAndCount(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newIncidentStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	// Create 2 remediations for feature-a, 1 for feature-b
	remediations := []domain.AutoRemediation{
		{OrgID: org.ID, FlagKey: "feature-a", Action: domain.RemediationActionPause, Status: domain.RemediationStatusApplied},
		{OrgID: org.ID, FlagKey: "feature-a", Action: domain.RemediationActionRollback, Status: domain.RemediationStatusApplied},
		{OrgID: org.ID, FlagKey: "feature-b", Action: domain.RemediationActionKill, Status: domain.RemediationStatusFailed},
	}

	for i := range remediations {
		if err := is.CreateAutoRemediation(ctx, &remediations[i]); err != nil {
			t.Fatalf("CreateAutoRemediation %d: %v", i, err)
		}
	}

	// List all (no flag key filter)
	all, err := is.ListAutoRemediations(ctx, org.ID, "", 50, 0)
	if err != nil {
		t.Fatalf("ListAutoRemediations: %v", err)
	}
	if len(all) != 3 {
		t.Errorf("expected 3 remediations, got %d", len(all))
	}

	allCount, err := is.CountAutoRemediations(ctx, org.ID, "")
	if err != nil {
		t.Fatalf("CountAutoRemediations: %v", err)
	}
	if allCount != 3 {
		t.Errorf("expected all count 3, got %d", allCount)
	}

	// Filter by flag_key
	featureA, err := is.ListAutoRemediations(ctx, org.ID, "feature-a", 50, 0)
	if err != nil {
		t.Fatalf("ListAutoRemediations feature-a: %v", err)
	}
	if len(featureA) != 2 {
		t.Errorf("expected 2 feature-a remediations, got %d", len(featureA))
	}

	countA, err := is.CountAutoRemediations(ctx, org.ID, "feature-a")
	if err != nil {
		t.Fatalf("CountAutoRemediations feature-a: %v", err)
	}
	if countA != 2 {
		t.Errorf("expected feature-a count 2, got %d", countA)
	}
}

func TestIncidentStore_Remediation_UpdateStatus(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newIncidentStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	r := &domain.AutoRemediation{
		OrgID:  org.ID,
		FlagKey: "feature-x",
		Action:  domain.RemediationActionPause,
		Status:  domain.RemediationStatusConfirmationNeeded,
		Reason:  "High severity — requires manual confirmation",
	}
	if err := is.CreateAutoRemediation(ctx, r); err != nil {
		t.Fatalf("CreateAutoRemediation: %v", err)
	}

	// Update to applied
	now := time.Now().UTC()
	err := is.UpdateAutoRemediation(ctx, r.ID, map[string]interface{}{
		"status":     domain.RemediationStatusApplied,
		"applied_at": now,
	})
	if err != nil {
		t.Fatalf("UpdateAutoRemediation: %v", err)
	}

	got, err := is.GetAutoRemediation(ctx, r.ID)
	if err != nil {
		t.Fatalf("GetAutoRemediation after update: %v", err)
	}
	if got.Status != domain.RemediationStatusApplied {
		t.Errorf("status mismatch after update: got %s, want %s", got.Status, domain.RemediationStatusApplied)
	}
	if got.AppliedAt == nil || !got.AppliedAt.Equal(now) {
		t.Errorf("applied_at not updated correctly: got %v", got.AppliedAt)
	}
}

func TestIncidentStore_Remediation_InvalidUpdateColumn(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newIncidentStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	r := &domain.AutoRemediation{
		OrgID:  org.ID,
		FlagKey: "feature-x",
		Action:  domain.RemediationActionPause,
		Status:  domain.RemediationStatusConfirmationNeeded,
	}
	if err := is.CreateAutoRemediation(ctx, r); err != nil {
		t.Fatalf("CreateAutoRemediation: %v", err)
	}

	// Try updating a non-allowed column
	err := is.UpdateAutoRemediation(ctx, r.ID, map[string]interface{}{
		"flag_key": "hacked-key",
	})
	if err == nil {
		t.Fatal("expected error updating non-allowed column")
	}
}

func TestIncidentStore_Remediation_NotFound(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newIncidentStore(t)
	ctx := context.Background()

	_, err := is.GetAutoRemediation(ctx, "00000000-0000-0000-0000-000000000000")
	if err == nil {
		t.Fatal("expected error for non-existent remediation")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestIncidentStore_Remediation_WithCorrelation(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newIncidentStore(t)
	ctx := context.Background()

	org := seedOrg(t, postgres.NewStore(pool))

	// Create correlation first
	corr := &domain.IncidentCorrelation{
		OrgID:             org.ID,
		IncidentStartedAt: time.Now().UTC().Add(-30 * time.Minute),
		TotalFlagsChanged: 2,
		CorrelatedChanges: json.RawMessage(`[{"flag_key":"feature-y","change_type":"rollout","correlation_score":0.88}]`),
		HighestCorrelation: 0.88,
	}
	if err := is.CreateIncidentCorrelation(ctx, corr); err != nil {
		t.Fatalf("CreateIncidentCorrelation: %v", err)
	}

	// Create remediation linked to correlation
	r := &domain.AutoRemediation{
		OrgID:         org.ID,
		FlagKey:       "feature-y",
		Action:        domain.RemediationActionRollback,
		CorrelationID: corr.ID,
		Reason:        "Auto-remediated due to incident correlation",
		Status:        domain.RemediationStatusApplied,
	}
	if err := is.CreateAutoRemediation(ctx, r); err != nil {
		t.Fatalf("CreateAutoRemediation: %v", err)
	}

	got, err := is.GetAutoRemediation(ctx, r.ID)
	if err != nil {
		t.Fatalf("GetAutoRemediation: %v", err)
	}
	if got.CorrelationID != corr.ID {
		t.Errorf("correlation_id mismatch: got %s, want %s", got.CorrelationID, corr.ID)
	}
}

func TestIncidentStore_Remediation_UpdateNotFound(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	is := newIncidentStore(t)
	ctx := context.Background()

	err := is.UpdateAutoRemediation(ctx, "00000000-0000-0000-0000-000000000000", map[string]interface{}{
		"status": domain.RemediationStatusApplied,
	})
	if err == nil {
		t.Fatal("expected error updating non-existent remediation")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}
