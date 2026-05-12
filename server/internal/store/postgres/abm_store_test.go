package postgres_test

import (
	"errors"
	"context"
	"encoding/json"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store/postgres"
)

func TestABMStore_CreateAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	behavior := &domain.ABMBehavior{
		OrgID:          org.ID,
		Key:            "checkout-recommendation",
		Name:           "Checkout Recommendation",
		Description:    "AI-powered checkout product recommendations",
		AgentType:      "recommender",
		Variants: []domain.ABMVariant{
			{Key: "control", Name: "Control", Description: "No recommendations", Config: json.RawMessage(`{"mode":"off"}`), Weight: 50},
			{Key: "treatment-v2", Name: "ML Model v2", Description: "New recommendation model", Config: json.RawMessage(`{"mode":"ml","model":"v2"}`), Weight: 50},
		},
		DefaultVariant:   "control",
		TargetingRules:   []domain.ABMTargetingRule{},
		RolloutPercentage: 100,
		Status:           "active",
	}
	if err := store.CreateBehavior(ctx, behavior); err != nil {
		t.Fatalf("create behavior: %v", err)
	}
	t.Cleanup(func() {
		store.DeleteBehavior(ctx, org.ID, "checkout-recommendation")
	})

	got, err := store.GetBehavior(ctx, org.ID, "checkout-recommendation")
	if err != nil {
		t.Fatalf("get behavior: %v", err)
	}
	if got.Name != "Checkout Recommendation" {
		t.Errorf("unexpected name: %s", got.Name)
	}
	if got.AgentType != "recommender" {
		t.Errorf("expected recommender, got %s", got.AgentType)
	}
	if got.DefaultVariant != "control" {
		t.Errorf("expected control, got %s", got.DefaultVariant)
	}
	if len(got.Variants) != 2 {
		t.Errorf("expected 2 variants, got %d", len(got.Variants))
	}
	if got.Status != "active" {
		t.Errorf("expected active, got %s", got.Status)
	}
}

func TestABMStore_ListByAgentType(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	behaviors := []*domain.ABMBehavior{
		{OrgID: org.ID, Key: "recommender-1", Name: "Rec 1", AgentType: "recommender", DefaultVariant: "default", Status: "active"},
		{OrgID: org.ID, Key: "janitor-1", Name: "Jan 1", AgentType: "janitor", DefaultVariant: "default", Status: "active"},
		{OrgID: org.ID, Key: "recommender-2", Name: "Rec 2", AgentType: "recommender", DefaultVariant: "default", Status: "draft"},
	}
	for _, b := range behaviors {
		if err := store.CreateBehavior(ctx, b); err != nil {
			t.Fatalf("create behavior %s: %v", b.Key, err)
		}
	}
	t.Cleanup(func() {
		for _, b := range behaviors {
			store.DeleteBehavior(ctx, org.ID, b.Key)
		}
	})

	// List all
	all, err := store.ListBehaviors(ctx, org.ID)
	if err != nil {
		t.Fatalf("list all behaviors: %v", err)
	}
	if len(all) != 3 {
		t.Errorf("expected 3 behaviors, got %d", len(all))
	}

	// List by recommender
	recs, err := store.ListBehaviorsByAgentType(ctx, org.ID, "recommender")
	if err != nil {
		t.Fatalf("list recommender behaviors: %v", err)
	}
	if len(recs) != 2 {
		t.Errorf("expected 2 recommender behaviors, got %d", len(recs))
	}

	// List by janitor
	jans, err := store.ListBehaviorsByAgentType(ctx, org.ID, "janitor")
	if err != nil {
		t.Fatalf("list janitor behaviors: %v", err)
	}
	if len(jans) != 1 {
		t.Errorf("expected 1 janitor behavior, got %d", len(jans))
	}
}

func TestABMStore_DuplicateKey(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	b1 := &domain.ABMBehavior{
		OrgID: org.ID, Key: "dup-key", Name: "First", AgentType: "recommender",
		DefaultVariant: "default", Status: "active",
	}
	if err := store.CreateBehavior(ctx, b1); err != nil {
		t.Fatalf("first create: %v", err)
	}
	t.Cleanup(func() {
		store.DeleteBehavior(ctx, org.ID, "dup-key")
	})

	b2 := &domain.ABMBehavior{
		OrgID: org.ID, Key: "dup-key", Name: "Second", AgentType: "janitor",
		DefaultVariant: "default", Status: "draft",
	}
	err := store.CreateBehavior(ctx, b2)
	if err == nil {
		t.Fatal("expected conflict error on duplicate key")
	}
	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict, got %v", err)
	}
}

func TestABMStore_Delete(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	b := &domain.ABMBehavior{
		OrgID: org.ID, Key: "del-key", Name: "Delete Me", AgentType: "recommender",
		DefaultVariant: "default", Status: "active",
	}
	if err := store.CreateBehavior(ctx, b); err != nil {
		t.Fatalf("create: %v", err)
	}

	if err := store.DeleteBehavior(ctx, org.ID, "del-key"); err != nil {
		t.Fatalf("delete: %v", err)
	}

	_, err := store.GetBehavior(ctx, org.ID, "del-key")
	if err == nil {
		t.Fatal("expected not found after delete")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestABMEventStore_InsertAndCount(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	now := time.Now().UTC()
	events := []domain.ABMTrackEvent{
		{OrgID: org.ID, BehaviorKey: "search-ranking", Variant: "treatment", AgentID: "agent-1", AgentType: "recommender", Action: "search.ranked", Outcome: "clicked", RecordedAt: now},
		{OrgID: org.ID, BehaviorKey: "search-ranking", Variant: "control", AgentID: "agent-2", AgentType: "recommender", Action: "search.ranked", Outcome: "dismissed", RecordedAt: now},
		{OrgID: org.ID, BehaviorKey: "search-ranking", Variant: "treatment", AgentID: "agent-1", AgentType: "recommender", Action: "search.ranked", Outcome: "purchased", RecordedAt: now},
		{OrgID: org.ID, BehaviorKey: "other-behavior", Variant: "default", AgentID: "agent-3", AgentType: "janitor", Action: "cleanup.executed", RecordedAt: now},
	}
	for i := range events {
		if err := store.InsertTrackEvent(ctx, &events[i]); err != nil {
			t.Fatalf("insert event %d: %v", i, err)
		}
	}
	t.Cleanup(func() {
		store.DeleteBehavior(ctx, org.ID, "search-ranking")
		store.DeleteBehavior(ctx, org.ID, "other-behavior")
	})

	// Count by behavior
	count, err := store.CountEventsByBehavior(ctx, org.ID, "search-ranking", now.Add(-time.Hour))
	if err != nil {
		t.Fatalf("count events by behavior: %v", err)
	}
	if count != 3 {
		t.Errorf("expected 3 events for search-ranking, got %d", count)
	}

	// Count by agent
	count, err = store.CountEventsByAgent(ctx, org.ID, "agent-1", now.Add(-time.Hour))
	if err != nil {
		t.Fatalf("count events by agent: %v", err)
	}
	if count != 2 {
		t.Errorf("expected 2 events for agent-1, got %d", count)
	}
}

func TestABMEventStore_VariantDistribution(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	now := time.Now().UTC()
	events := []domain.ABMTrackEvent{
		{OrgID: org.ID, BehaviorKey: "variant-test", Variant: "control", AgentID: "a1", AgentType: "recommender", Action: "test", RecordedAt: now},
		{OrgID: org.ID, BehaviorKey: "variant-test", Variant: "treatment-a", AgentID: "a1", AgentType: "recommender", Action: "test", RecordedAt: now},
		{OrgID: org.ID, BehaviorKey: "variant-test", Variant: "treatment-a", AgentID: "a2", AgentType: "recommender", Action: "test", RecordedAt: now},
		{OrgID: org.ID, BehaviorKey: "variant-test", Variant: "treatment-a", AgentID: "a3", AgentType: "recommender", Action: "test", RecordedAt: now},
		{OrgID: org.ID, BehaviorKey: "variant-test", Variant: "treatment-b", AgentID: "a1", AgentType: "recommender", Action: "test", RecordedAt: now},
	}
	for i := range events {
		if err := store.InsertTrackEvent(ctx, &events[i]); err != nil {
			t.Fatalf("insert event %d: %v", i, err)
		}
	}

	dist, err := store.GetVariantDistribution(ctx, org.ID, "variant-test", now.Add(-time.Hour))
	if err != nil {
		t.Fatalf("get variant distribution: %v", err)
	}
	if dist["control"] != 1 {
		t.Errorf("expected control=1, got %d", dist["control"])
	}
	if dist["treatment-a"] != 3 {
		t.Errorf("expected treatment-a=3, got %d", dist["treatment-a"])
	}
	if dist["treatment-b"] != 1 {
		t.Errorf("expected treatment-b=1, got %d", dist["treatment-b"])
	}
}

func TestABMEventStore_BatchInsert(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	now := time.Now().UTC()
	events := []domain.ABMTrackEvent{
		{OrgID: org.ID, BehaviorKey: "batch-test", Variant: "v1", AgentID: "a1", AgentType: "recommender", Action: "test", RecordedAt: now},
		{OrgID: org.ID, BehaviorKey: "batch-test", Variant: "v2", AgentID: "a2", AgentType: "recommender", Action: "test", RecordedAt: now},
		{OrgID: org.ID, BehaviorKey: "batch-test", Variant: "v1", AgentID: "a3", AgentType: "recommender", Action: "test", RecordedAt: now},
	}
	if err := store.InsertTrackEvents(ctx, events); err != nil {
		t.Fatalf("batch insert: %v", err)
	}

	count, err := store.CountEventsByBehavior(ctx, org.ID, "batch-test", now.Add(-time.Hour))
	if err != nil {
		t.Fatalf("count: %v", err)
	}
	if count != 3 {
		t.Errorf("expected 3 events, got %d", count)
	}
}
