package postgres_test

import (
	"errors"
	"context"
	"testing"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store/postgres"
)

func TestPolicyStore_CreateAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	policy := &domain.Policy{
		ID:          "pol-test-001",
		OrgID:       org.ID,
		Name:        "Require approval for production",
		Description: "All production changes require human approval",
		Enabled:     true,
		Priority:    10,
		Scope: domain.PolicyScope{
			AgentTypes:   []string{"janitor"},
			Environments: []string{"production"},
		},
		Rules: []domain.PolicyRule{
			{
				Name:        "Check environment",
				Description: "Only allow production with approval",
				Expression:  `action.context.environment_id != "production" || action.decision.requires_human`,
				Message:     "Production changes require human approval",
			},
		},
		Effect: domain.PolicyEffectRequireHuman,
	}
	if err := store.CreatePolicy(ctx, policy); err != nil {
		t.Fatalf("create policy: %v", err)
	}
	t.Cleanup(func() {
		store.DeletePolicy(ctx, org.ID, "pol-test-001")
	})

	got, err := store.GetPolicy(ctx, org.ID, "pol-test-001")
	if err != nil {
		t.Fatalf("get policy: %v", err)
	}
	if got.Name != "Require approval for production" {
		t.Errorf("unexpected name: %s", got.Name)
	}
	if !got.Enabled {
		t.Error("expected enabled=true")
	}
	if got.Priority != 10 {
		t.Errorf("expected priority 10, got %d", got.Priority)
	}
	if got.Effect != domain.PolicyEffectRequireHuman {
		t.Errorf("expected require_human, got %s", got.Effect)
	}
	if len(got.Rules) != 1 {
		t.Errorf("expected 1 rule, got %d", len(got.Rules))
	}
	if len(got.Scope.AgentTypes) != 1 || got.Scope.AgentTypes[0] != "janitor" {
		t.Errorf("unexpected scope agent_types: %v", got.Scope.AgentTypes)
	}
}

func TestPolicyStore_List(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	policies := []*domain.Policy{
		{
			ID:       "pol-list-001",
			OrgID:    org.ID,
			Name:     "Policy A",
			Enabled:  true,
			Priority: 1,
			Effect:   domain.PolicyEffectDeny,
		},
		{
			ID:       "pol-list-002",
			OrgID:    org.ID,
			Name:     "Policy B",
			Enabled:  true,
			Priority: 5,
			Effect:   domain.PolicyEffectWarn,
		},
		{
			ID:       "pol-list-003",
			OrgID:    org.ID,
			Name:     "Policy C",
			Enabled:  false,
			Priority: 10,
			Effect:   domain.PolicyEffectAudit,
		},
	}
	for _, p := range policies {
		if err := store.CreatePolicy(ctx, p); err != nil {
			t.Fatalf("create policy %s: %v", p.ID, err)
		}
	}
	t.Cleanup(func() {
		for _, p := range policies {
			store.DeletePolicy(ctx, org.ID, p.ID)
		}
	})

	all, err := store.ListPolicies(ctx, org.ID, 50, 0)
	if err != nil {
		t.Fatalf("list policies: %v", err)
	}
	if len(all) != 3 {
		t.Errorf("expected 3 policies, got %d", len(all))
	}
	// Verify ordering by priority
	if all[0].Priority != 1 || all[1].Priority != 5 || all[2].Priority != 10 {
		t.Errorf("policies not ordered by priority: %+v", []int{all[0].Priority, all[1].Priority, all[2].Priority})
	}
}

func TestPolicyStore_ListApplicable(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	// Create policies with different scopes
	policies := []*domain.Policy{
		{
			ID: "pol-app-001", OrgID: org.ID, Name: "Janitor-only policy",
			Enabled: true, Priority: 1, Effect: domain.PolicyEffectDeny,
			Scope: domain.PolicyScope{AgentTypes: []string{"janitor"}},
		},
		{
			ID: "pol-app-002", OrgID: org.ID, Name: "Preflight-only policy",
			Enabled: true, Priority: 2, Effect: domain.PolicyEffectWarn,
			Scope: domain.PolicyScope{AgentTypes: []string{"preflight"}},
		},
		{
			ID: "pol-app-003", OrgID: org.ID, Name: "All agents policy",
			Enabled: true, Priority: 3, Effect: domain.PolicyEffectAudit,
			Scope: domain.PolicyScope{}, // Empty scope = applies to all
		},
	}
	for _, p := range policies {
		if err := store.CreatePolicy(ctx, p); err != nil {
			t.Fatalf("create policy %s: %v", p.ID, err)
		}
	}
	t.Cleanup(func() {
		for _, p := range policies {
			store.DeletePolicy(ctx, org.ID, p.ID)
		}
	})

	// Filter by janitor agent_type
	applicable, err := store.ListApplicablePolicies(ctx, org.ID, domain.PolicyScope{
		AgentTypes: []string{"janitor"},
	})
	if err != nil {
		t.Fatalf("list applicable policies: %v", err)
	}
	// Should return janitor-only + all-agents policies
	if len(applicable) < 2 {
		t.Errorf("expected at least 2 applicable policies for janitor, got %d", len(applicable))
	}

	// Filter by preflight agent_type
	applicable, err = store.ListApplicablePolicies(ctx, org.ID, domain.PolicyScope{
		AgentTypes: []string{"preflight"},
	})
	if err != nil {
		t.Fatalf("list applicable policies for preflight: %v", err)
	}
	if len(applicable) < 2 {
		t.Errorf("expected at least 2 applicable policies for preflight, got %d", len(applicable))
	}
}

func TestPolicyStore_Duplicate(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	policy := &domain.Policy{
		ID:      "pol-dup-001",
		OrgID:   org.ID,
		Name:    "Duplicate Test",
		Enabled: true,
		Effect:  domain.PolicyEffectDeny,
	}
	if err := store.CreatePolicy(ctx, policy); err != nil {
		t.Fatalf("first create: %v", err)
	}
	t.Cleanup(func() {
		store.DeletePolicy(ctx, org.ID, "pol-dup-001")
	})

	dup := &domain.Policy{
		ID:      "pol-dup-001",
		OrgID:   org.ID,
		Name:    "Duplicate Test 2",
		Enabled: true,
		Effect:  domain.PolicyEffectWarn,
	}
	err := store.CreatePolicy(ctx, dup)
	if err == nil {
		t.Fatal("expected conflict error on duplicate ID")
	}
	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict, got %v", err)
	}
}

func TestPolicyStore_Toggle(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	policy := &domain.Policy{
		ID:      "pol-tog-001",
		OrgID:   org.ID,
		Name:    "Toggle Test",
		Enabled: true,
		Effect:  domain.PolicyEffectDeny,
	}
	if err := store.CreatePolicy(ctx, policy); err != nil {
		t.Fatalf("create policy: %v", err)
	}
	t.Cleanup(func() {
		store.DeletePolicy(ctx, org.ID, "pol-tog-001")
	})

	// Toggle to disabled
	if err := store.SetPolicyEnabled(ctx, org.ID, "pol-tog-001", false); err != nil {
		t.Fatalf("toggle disabled: %v", err)
	}

	got, err := store.GetPolicy(ctx, org.ID, "pol-tog-001")
	if err != nil {
		t.Fatalf("get policy after toggle: %v", err)
	}
	if got.Enabled {
		t.Error("expected enabled=false after toggle")
	}

	// Toggle back to enabled
	if err := store.SetPolicyEnabled(ctx, org.ID, "pol-tog-001", true); err != nil {
		t.Fatalf("toggle enabled: %v", err)
	}
	got, err = store.GetPolicy(ctx, org.ID, "pol-tog-001")
	if err != nil {
		t.Fatalf("get policy after toggle back: %v", err)
	}
	if !got.Enabled {
		t.Error("expected enabled=true after toggle back")
	}
}

func TestPolicyStore_Delete(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	policy := &domain.Policy{
		ID:      "pol-del-001",
		OrgID:   org.ID,
		Name:    "Delete Test",
		Enabled: true,
		Effect:  domain.PolicyEffectDeny,
	}
	if err := store.CreatePolicy(ctx, policy); err != nil {
		t.Fatalf("create policy: %v", err)
	}

	if err := store.DeletePolicy(ctx, org.ID, "pol-del-001"); err != nil {
		t.Fatalf("delete policy: %v", err)
	}

	_, err := store.GetPolicy(ctx, org.ID, "pol-del-001")
	if err == nil {
		t.Fatal("expected not found after delete")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestPolicyStore_Update(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	policy := &domain.Policy{
		ID:       "pol-upd-001",
		OrgID:    org.ID,
		Name:     "Original Policy",
		Enabled:  true,
		Priority: 1,
		Effect:   domain.PolicyEffectDeny,
	}
	if err := store.CreatePolicy(ctx, policy); err != nil {
		t.Fatalf("create policy: %v", err)
	}
	t.Cleanup(func() {
		store.DeletePolicy(ctx, org.ID, "pol-upd-001")
	})

	// Update fields
	policy.Name = "Updated Policy"
	policy.Description = "Updated description"
	policy.Priority = 50
	policy.Effect = domain.PolicyEffectWarn
	if err := store.UpdatePolicy(ctx, policy); err != nil {
		t.Fatalf("update policy: %v", err)
	}

	got, err := store.GetPolicy(ctx, org.ID, "pol-upd-001")
	if err != nil {
		t.Fatalf("get updated policy: %v", err)
	}
	if got.Name != "Updated Policy" {
		t.Errorf("expected Updated Policy, got %s", got.Name)
	}
	if got.Priority != 50 {
		t.Errorf("expected priority 50, got %d", got.Priority)
	}
	if got.Effect != domain.PolicyEffectWarn {
		t.Errorf("expected effect warn, got %s", got.Effect)
	}
}
