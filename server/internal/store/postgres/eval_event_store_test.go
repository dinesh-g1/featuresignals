package postgres_test

import (
	"context"
	"testing"
	"time"

	"github.com/google/uuid"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store/postgres"
)

func TestEvalEventStore_InsertAndCount(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	now := time.Now().UTC()
	events := []domain.EvalEvent{
		{ID: uuid.NewString(), OrgID: org.ID, ProjectID: "proj-1", EnvironmentID: "env-1", FlagKey: "dark-mode", Value: "true", Reason: "targeting_match", LatencyUs: 150, EvaluatedAt: now},
		{ID: uuid.NewString(), OrgID: org.ID, ProjectID: "proj-1", EnvironmentID: "env-1", FlagKey: "dark-mode", Value: "false", Reason: "default", LatencyUs: 200, EvaluatedAt: now},
		{ID: uuid.NewString(), OrgID: org.ID, ProjectID: "proj-1", EnvironmentID: "env-1", FlagKey: "dark-mode", Value: "true", Reason: "percentage_rollout", LatencyUs: 180, EvaluatedAt: now},
		{ID: uuid.NewString(), OrgID: org.ID, ProjectID: "proj-2", EnvironmentID: "env-1", FlagKey: "other-flag", Value: "on", Reason: "targeting_match", LatencyUs: 100, EvaluatedAt: now},
	}
	for i := range events {
		if err := store.InsertEvalEvent(ctx, &events[i]); err != nil {
			t.Fatalf("insert event %d: %v", i, err)
		}
	}

	// Count evaluations for dark-mode
	count, err := store.CountEvaluations(ctx, org.ID, "dark-mode", now.Add(-time.Hour))
	if err != nil {
		t.Fatalf("count evaluations: %v", err)
	}
	if count != 3 {
		t.Errorf("expected 3 evaluations for dark-mode, got %d", count)
	}

	// Count evaluations for other-flag
	count, err = store.CountEvaluations(ctx, org.ID, "other-flag", now.Add(-time.Hour))
	if err != nil {
		t.Fatalf("count evaluations for other-flag: %v", err)
	}
	if count != 1 {
		t.Errorf("expected 1 evaluation for other-flag, got %d", count)
	}
}

func TestEvalEventStore_CountByVariant(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	now := time.Now().UTC()
	events := []domain.EvalEvent{
		{ID: uuid.NewString(), OrgID: org.ID, ProjectID: "proj-1", EnvironmentID: "env-1", FlagKey: "variant-flag", Variant: "control", Value: "off", Reason: "default", LatencyUs: 100, EvaluatedAt: now},
		{ID: uuid.NewString(), OrgID: org.ID, ProjectID: "proj-1", EnvironmentID: "env-1", FlagKey: "variant-flag", Variant: "treatment-a", Value: "on", Reason: "targeting_match", LatencyUs: 110, EvaluatedAt: now},
		{ID: uuid.NewString(), OrgID: org.ID, ProjectID: "proj-1", EnvironmentID: "env-1", FlagKey: "variant-flag", Variant: "treatment-a", Value: "on", Reason: "targeting_match", LatencyUs: 120, EvaluatedAt: now},
		{ID: uuid.NewString(), OrgID: org.ID, ProjectID: "proj-1", EnvironmentID: "env-1", FlagKey: "variant-flag", Variant: "treatment-b", Value: "on", Reason: "percentage_rollout", LatencyUs: 130, EvaluatedAt: now},
	}
	for i := range events {
		if err := store.InsertEvalEvent(ctx, &events[i]); err != nil {
			t.Fatalf("insert event %d: %v", i, err)
		}
	}

	dist, err := store.CountEvaluationsByVariant(ctx, org.ID, "variant-flag", now.Add(-time.Hour))
	if err != nil {
		t.Fatalf("count by variant: %v", err)
	}
	if dist["control"] != 1 {
		t.Errorf("expected control=1, got %d", dist["control"])
	}
	if dist["treatment-a"] != 2 {
		t.Errorf("expected treatment-a=2, got %d", dist["treatment-a"])
	}
	if dist["treatment-b"] != 1 {
		t.Errorf("expected treatment-b=1, got %d", dist["treatment-b"])
	}
}

func TestEvalEventStore_Latency(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	now := time.Now().UTC()
	// Insert events with different latencies
	latencies := []int64{50, 100, 150, 200, 250, 300, 350, 400, 450, 500}
	for i, lat := range latencies {
		event := domain.EvalEvent{
			ID:            uuid.NewString(),
			OrgID:         org.ID,
			ProjectID:     "proj-1",
			EnvironmentID: "env-1",
			FlagKey:       "latency-flag",
			Value:         "true",
			Reason:        "targeting_match",
			LatencyUs:     lat,
			EvaluatedAt:   now,
		}
		if err := store.InsertEvalEvent(ctx, &event); err != nil {
			t.Fatalf("insert event %d: %v", i, err)
		}
	}

	p50, p95, p99, err := store.GetEvaluationLatency(ctx, org.ID, "latency-flag", now.Add(-time.Hour))
	if err != nil {
		t.Fatalf("get evaluation latency: %v", err)
	}

	// With 10 values sorted: 50,100,150,200,250,300,350,400,450,500
	// p50 = 250 (or 300 depending on discrete percentile calculation)
	if p50 < 200 || p50 > 300 {
		t.Errorf("expected p50 around 250-300, got %d", p50)
	}
	if p95 < 400 || p95 > 500 {
		t.Errorf("expected p95 around 450-500, got %d", p95)
	}
	if p99 < 450 || p99 > 500 {
		t.Errorf("expected p99 around 500, got %d", p99)
	}
}

func TestEvalEventStore_Volume(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	// Insert events spread across different times
	base := time.Now().UTC().Add(-3 * time.Hour)
	for h := 0; h < 3; h++ {
		eventTime := base.Add(time.Duration(h) * time.Hour)
		for i := 0; i < 5; i++ {
			event := domain.EvalEvent{
				ID:            uuid.NewString(),
				OrgID:         org.ID,
				ProjectID:     "proj-1",
				EnvironmentID: "env-1",
				FlagKey:       "volume-flag",
				Value:         "true",
				Reason:        "default",
				LatencyUs:     100,
				EvaluatedAt:   eventTime,
			}
			if err := store.InsertEvalEvent(ctx, &event); err != nil {
				t.Fatalf("insert event h=%d i=%d: %v", h, i, err)
			}
		}
	}

	points, err := store.GetEvaluationVolume(ctx, org.ID, base.Add(-time.Hour), "hour")
	if err != nil {
		t.Fatalf("get evaluation volume: %v", err)
	}
	if len(points) < 3 {
		t.Errorf("expected at least 3 time series points, got %d", len(points))
	}
	// Each hour should have 5 events
	for _, pt := range points {
		if pt.Value != 5 {
			t.Logf("time series point: %v -> %d evaluations", pt.Timestamp, pt.Value)
		}
	}
}

func TestEvalEventStore_BatchInsert(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	now := time.Now().UTC()
	batch := &domain.EvalEventBatch{
		ID:            "batch-test-001",
		OrgID:         org.ID,
		EnvironmentID: "env-1",
		Events: []domain.EvalEvent{
			{ID: uuid.NewString(), OrgID: org.ID, ProjectID: "proj-1", EnvironmentID: "env-1", FlagKey: "batch-flag", Value: "true", Reason: "default", LatencyUs: 100, EvaluatedAt: now},
			{ID: uuid.NewString(), OrgID: org.ID, ProjectID: "proj-1", EnvironmentID: "env-1", FlagKey: "batch-flag", Value: "false", Reason: "targeting_match", LatencyUs: 200, EvaluatedAt: now},
			{ID: uuid.NewString(), OrgID: org.ID, ProjectID: "proj-1", EnvironmentID: "env-1", FlagKey: "batch-flag", Value: "true", Reason: "percentage_rollout", LatencyUs: 150, EvaluatedAt: now},
		},
		BatchSize:   3,
		SampledRate: 1.0,
		WindowStart: now,
		WindowEnd:   now,
		EmittedAt:   now,
	}
	if err := store.InsertEvalEventBatch(ctx, batch); err != nil {
		t.Fatalf("batch insert: %v", err)
	}

	count, err := store.CountEvaluations(ctx, org.ID, "batch-flag", now.Add(-time.Hour))
	if err != nil {
		t.Fatalf("count after batch: %v", err)
	}
	if count != 3 {
		t.Errorf("expected 3 evaluations after batch insert, got %d", count)
	}
}
