package postgres_test

import (
	"errors"
	"context"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store/postgres"
)

func TestAgentStore_CreateAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	agent := &domain.Agent{
		ID:           "agent-test-001",
		OrgID:        org.ID,
		Name:         "Flag Janitor",
		Type:         "janitor",
		Version:      "2.0.0",
		BrainType:    domain.BrainTypeLLM,
		Status:       domain.AgentStatusActive,
		Scopes:       []string{"flag:production:toggle", "flag:staging:cleanup"},
		RateLimits:   domain.AgentRateLimits{PerMinute: 10, PerHour: 100, ConcurrentActions: 5},
		CostProfile:  domain.AgentCostProfile{LLMTokensPerAction: 500, AvgLatencyMs: 200, CostPerActionMicros: 1500},
		RegisteredAt: time.Now().UTC(),
	}
	if err := store.CreateAgent(ctx, agent); err != nil {
		t.Fatalf("create agent: %v", err)
	}
	if agent.ID == "" {
		t.Fatal("expected non-empty ID")
	}
	if agent.CreatedAt.IsZero() {
		t.Fatal("expected non-zero CreatedAt")
	}

	got, err := store.GetAgent(ctx, org.ID, "agent-test-001")
	if err != nil {
		t.Fatalf("get agent: %v", err)
	}
	if got.Name != "Flag Janitor" {
		t.Errorf("expected Flag Janitor, got %s", got.Name)
	}
	if got.Type != "janitor" {
		t.Errorf("expected janitor, got %s", got.Type)
	}
	if got.Version != "2.0.0" {
		t.Errorf("expected 2.0.0, got %s", got.Version)
	}
	if got.BrainType != domain.BrainTypeLLM {
		t.Errorf("expected llm, got %s", got.BrainType)
	}
	if got.Status != domain.AgentStatusActive {
		t.Errorf("expected active, got %s", got.Status)
	}
	if len(got.Scopes) != 2 {
		t.Errorf("expected 2 scopes, got %d", len(got.Scopes))
	}
	if got.LastHeartbeat.IsZero() == false {
		// LastHeartbeat should be zero before any heartbeat
		t.Logf("last_heartbeat is set: %v (may have been initialized)", got.LastHeartbeat)
	}

	t.Cleanup(func() {
		store.DeleteAgent(ctx, org.ID, "agent-test-001")
	})
}

func TestAgentStore_ListByType(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	// Create 3 agents — 2 janitor, 1 preflight
	agents := []struct {
		id   string
		name string
		typ  string
	}{
		{"agent-j1", "Janitor Alpha", "janitor"},
		{"agent-j2", "Janitor Beta", "janitor"},
		{"agent-p1", "Preflight Gamma", "preflight"},
	}
	for _, a := range agents {
		agent := &domain.Agent{
			ID:           a.id,
			OrgID:        org.ID,
			Name:         a.name,
			Type:         a.typ,
			Version:      "1.0.0",
			BrainType:    domain.BrainTypeLLM,
			Status:       domain.AgentStatusActive,
			RegisteredAt: time.Now().UTC(),
		}
		if err := store.CreateAgent(ctx, agent); err != nil {
			t.Fatalf("create agent %s: %v", a.id, err)
		}
	}

	t.Cleanup(func() {
		for _, a := range agents {
			store.DeleteAgent(ctx, org.ID, a.id)
		}
	})

	// List all
	allAgents, err := store.ListAgents(ctx, org.ID)
	if err != nil {
		t.Fatalf("list all agents: %v", err)
	}
	if len(allAgents) != 3 {
		t.Errorf("expected 3 agents, got %d", len(allAgents))
	}

	// List by janitor type
	janitors, err := store.ListAgentsByType(ctx, org.ID, "janitor")
	if err != nil {
		t.Fatalf("list janitor agents: %v", err)
	}
	if len(janitors) != 2 {
		t.Errorf("expected 2 janitor agents, got %d", len(janitors))
	}
	for _, a := range janitors {
		if a.Type != "janitor" {
			t.Errorf("expected janitor type, got %s", a.Type)
		}
	}

	// List by preflight type
	preflights, err := store.ListAgentsByType(ctx, org.ID, "preflight")
	if err != nil {
		t.Fatalf("list preflight agents: %v", err)
	}
	if len(preflights) != 1 {
		t.Errorf("expected 1 preflight agent, got %d", len(preflights))
	}
	if preflights[0].Name != "Preflight Gamma" {
		t.Errorf("expected Preflight Gamma, got %s", preflights[0].Name)
	}
}

func TestAgentStore_Duplicate(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	agent := &domain.Agent{
		ID:           "agent-dup-001",
		OrgID:        org.ID,
		Name:         "Duplicate Test",
		Type:         "janitor",
		Version:      "1.0.0",
		BrainType:    domain.BrainTypeLLM,
		Status:       domain.AgentStatusActive,
		RegisteredAt: time.Now().UTC(),
	}
	if err := store.CreateAgent(ctx, agent); err != nil {
		t.Fatalf("first create: %v", err)
	}
	t.Cleanup(func() {
		store.DeleteAgent(ctx, org.ID, "agent-dup-001")
	})

	// Second create with same ID should fail with conflict.
	dup := &domain.Agent{
		ID:           "agent-dup-001",
		OrgID:        org.ID,
		Name:         "Duplicate Test 2",
		Type:         "preflight",
		Version:      "2.0.0",
		BrainType:    domain.BrainTypeRule,
		Status:       domain.AgentStatusActive,
		RegisteredAt: time.Now().UTC(),
	}
	err := store.CreateAgent(ctx, dup)
	if err == nil {
		t.Fatal("expected conflict error on duplicate ID, got nil")
	}
	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict, got %v", err)
	}
}

func TestAgentStore_Heartbeat(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	agent := &domain.Agent{
		ID:           "agent-hb-001",
		OrgID:        org.ID,
		Name:         "Heartbeat Test",
		Type:         "janitor",
		Version:      "1.0.0",
		BrainType:    domain.BrainTypeLLM,
		Status:       domain.AgentStatusActive,
		RegisteredAt: time.Now().UTC(),
	}
	if err := store.CreateAgent(ctx, agent); err != nil {
		t.Fatalf("create agent: %v", err)
	}
	t.Cleanup(func() {
		store.DeleteAgent(ctx, org.ID, "agent-hb-001")
	})

	// Verify last_heartbeat is NULL initially
	got, err := store.GetAgent(ctx, org.ID, "agent-hb-001")
	if err != nil {
		t.Fatalf("get agent: %v", err)
	}
	if !got.LastHeartbeat.IsZero() {
		t.Error("expected zero last_heartbeat before heartbeat update")
	}

	// Update heartbeat
	if err := store.UpdateAgentHeartbeat(ctx, "agent-hb-001"); err != nil {
		t.Fatalf("update heartbeat: %v", err)
	}

	// Verify last_heartbeat is now set
	got, err = store.GetAgent(ctx, org.ID, "agent-hb-001")
	if err != nil {
		t.Fatalf("get agent after heartbeat: %v", err)
	}
	if got.LastHeartbeat.IsZero() {
		t.Error("expected non-zero last_heartbeat after heartbeat update")
	}
}

func TestAgentStore_Delete(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	agent := &domain.Agent{
		ID:           "agent-del-001",
		OrgID:        org.ID,
		Name:         "Delete Test",
		Type:         "janitor",
		Version:      "1.0.0",
		BrainType:    domain.BrainTypeLLM,
		Status:       domain.AgentStatusActive,
		RegisteredAt: time.Now().UTC(),
	}
	if err := store.CreateAgent(ctx, agent); err != nil {
		t.Fatalf("create agent: %v", err)
	}

	// Delete it
	if err := store.DeleteAgent(ctx, org.ID, "agent-del-001"); err != nil {
		t.Fatalf("delete agent: %v", err)
	}

	// Verify it's gone
	_, err := store.GetAgent(ctx, org.ID, "agent-del-001")
	if err == nil {
		t.Fatal("expected not found after delete")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}

	// Double delete should also return not found
	err = store.DeleteAgent(ctx, org.ID, "agent-del-001")
	if err == nil {
		t.Fatal("expected not found on double delete")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound on double delete, got %v", err)
	}
}

func TestAgentStore_Update(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	agent := &domain.Agent{
		ID:           "agent-upd-001",
		OrgID:        org.ID,
		Name:         "Original Name",
		Type:         "janitor",
		Version:      "1.0.0",
		BrainType:    domain.BrainTypeLLM,
		Status:       domain.AgentStatusActive,
		Scopes:       []string{"read"},
		RegisteredAt: time.Now().UTC(),
	}
	if err := store.CreateAgent(ctx, agent); err != nil {
		t.Fatalf("create agent: %v", err)
	}
	t.Cleanup(func() {
		store.DeleteAgent(ctx, org.ID, "agent-upd-001")
	})

	// Update fields
	agent.Name = "Updated Name"
	agent.Type = "preflight"
	agent.Version = "2.0.0"
	agent.Status = domain.AgentStatusDegraded
	agent.Scopes = []string{"read", "write"}
	if err := store.UpdateAgent(ctx, agent); err != nil {
		t.Fatalf("update agent: %v", err)
	}

	got, err := store.GetAgent(ctx, org.ID, "agent-upd-001")
	if err != nil {
		t.Fatalf("get updated agent: %v", err)
	}
	if got.Name != "Updated Name" {
		t.Errorf("expected Updated Name, got %s", got.Name)
	}
	if got.Type != "preflight" {
		t.Errorf("expected preflight, got %s", got.Type)
	}
	if got.Version != "2.0.0" {
		t.Errorf("expected 2.0.0, got %s", got.Version)
	}
	if got.Status != domain.AgentStatusDegraded {
		t.Errorf("expected degraded, got %s", got.Status)
	}
	if len(got.Scopes) != 2 {
		t.Errorf("expected 2 scopes, got %d", len(got.Scopes))
	}
}

func TestAgentMaturity_UpsertAndList(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	// Create an agent first
	agent := &domain.Agent{
		ID:           "agent-mat-001",
		OrgID:        org.ID,
		Name:         "Maturity Test Agent",
		Type:         "janitor",
		Version:      "1.0.0",
		BrainType:    domain.BrainTypeLLM,
		Status:       domain.AgentStatusActive,
		RegisteredAt: time.Now().UTC(),
	}
	if err := store.CreateAgent(ctx, agent); err != nil {
		t.Fatalf("create agent: %v", err)
	}
	t.Cleanup(func() {
		store.DeleteAgent(ctx, org.ID, "agent-mat-001")
	})

	// Upsert maturity for staging cleanup
	m1 := &domain.AgentMaturity{
		ID:           "mat-001",
		CurrentLevel: domain.MaturityL3Supervised,
		PerContext: map[string]domain.MaturityLevel{
			"flag.cleanup.staging": domain.MaturityL3Supervised,
		},
		Stats: domain.MaturityStats{
			TotalDecisions:       100,
			SuccessfulDecisions:  95,
			Accuracy:             0.95,
			IncidentsCaused:      1,
			HumanOverrideRate:    0.05,
			AvgConfidence:        0.92,
			DaysSinceLastIncident: 30,
		},
	}
	if err := store.UpsertMaturity(ctx, "agent-mat-001", m1); err != nil {
		t.Fatalf("upsert maturity 1: %v", err)
	}

	// Upsert maturity for production rollout
	m2 := &domain.AgentMaturity{
		ID:           "mat-002",
		CurrentLevel: domain.MaturityL2Assist,
		PerContext: map[string]domain.MaturityLevel{
			"flag.rollout.production": domain.MaturityL2Assist,
		},
		Stats: domain.MaturityStats{
			TotalDecisions:       50,
			SuccessfulDecisions:  48,
			Accuracy:             0.96,
			IncidentsCaused:      0,
			HumanOverrideRate:    0.02,
			AvgConfidence:        0.88,
			DaysSinceLastIncident: 90,
		},
	}
	if err := store.UpsertMaturity(ctx, "agent-mat-001", m2); err != nil {
		t.Fatalf("upsert maturity 2: %v", err)
	}

	// List maturities for the agent
	maturities, err := store.ListMaturities(ctx, "agent-mat-001")
	if err != nil {
		t.Fatalf("list maturities: %v", err)
	}
	if len(maturities) != 2 {
		t.Errorf("expected 2 maturities, got %d", len(maturities))
	}

	// Verify individual retrievals
	got1, err := store.GetMaturity(ctx, "agent-mat-001", "flag.cleanup.staging")
	if err != nil {
		t.Fatalf("get maturity 1: %v", err)
	}
	if got1.CurrentLevel != domain.MaturityL3Supervised {
		t.Errorf("expected L3, got %d", got1.CurrentLevel)
	}
	if got1.Stats.TotalDecisions != 100 {
		t.Errorf("expected 100 decisions, got %d", got1.Stats.TotalDecisions)
	}
}
