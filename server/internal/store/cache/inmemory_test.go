package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// --- minimal mock store ---

type mockStore struct {
	mu      sync.Mutex
	flags   []domain.Flag
	states  []domain.FlagState
	segs    []domain.Segment
	loadErr error
	listenCB func(payload string)
}

func (m *mockStore) LoadRuleset(_ context.Context, _, _ string) ([]domain.Flag, []domain.FlagState, []domain.Segment, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.loadErr != nil {
		return nil, nil, nil, m.loadErr
	}
	return m.flags, m.states, m.segs, nil
}

func (m *mockStore) ListenForChanges(_ context.Context, cb func(payload string)) error {
	m.mu.Lock()
	m.listenCB = cb
	m.mu.Unlock()
	return nil
}

func (m *mockStore) simulateNotify(payload string) {
	m.mu.Lock()
	cb := m.listenCB
	m.mu.Unlock()
	if cb != nil {
		cb(payload)
	}
}

// Satisfy domain.Store — unused methods return nil/zero.
func (m *mockStore) CreateOrganization(_ context.Context, _ *domain.Organization) error { return nil }
func (m *mockStore) GetOrganization(_ context.Context, _ string) (*domain.Organization, error) { return nil, nil }
func (m *mockStore) GetOrganizationByIDPrefix(_ context.Context, _ string) (*domain.Organization, error) { return nil, nil }
func (m *mockStore) CreateUser(_ context.Context, _ *domain.User) error { return nil }
func (m *mockStore) GetUserByEmail(_ context.Context, _ string) (*domain.User, error) { return nil, nil }
func (m *mockStore) GetUserByID(_ context.Context, _ string) (*domain.User, error) { return nil, nil }
func (m *mockStore) AddOrgMember(_ context.Context, _ *domain.OrgMember) error { return nil }
func (m *mockStore) GetOrgMember(_ context.Context, _, _ string) (*domain.OrgMember, error) { return nil, nil }
func (m *mockStore) ListOrgMembers(_ context.Context, _ string) ([]domain.OrgMember, error) { return nil, nil }
func (m *mockStore) CreateProject(_ context.Context, _ *domain.Project) error { return nil }
func (m *mockStore) GetProject(_ context.Context, _ string) (*domain.Project, error) { return nil, nil }
func (m *mockStore) ListProjects(_ context.Context, _ string) ([]domain.Project, error) { return nil, nil }
func (m *mockStore) DeleteProject(_ context.Context, _ string) error { return nil }
func (m *mockStore) CreateEnvironment(_ context.Context, _ *domain.Environment) error { return nil }
func (m *mockStore) ListEnvironments(_ context.Context, _ string) ([]domain.Environment, error) { return nil, nil }
func (m *mockStore) GetEnvironment(_ context.Context, _ string) (*domain.Environment, error) { return nil, nil }
func (m *mockStore) DeleteEnvironment(_ context.Context, _ string) error { return nil }
func (m *mockStore) CreateFlag(_ context.Context, _ *domain.Flag) error { return nil }
func (m *mockStore) GetFlag(_ context.Context, _, _ string) (*domain.Flag, error) { return nil, nil }
func (m *mockStore) ListFlags(_ context.Context, _ string) ([]domain.Flag, error) { return nil, nil }
func (m *mockStore) UpdateFlag(_ context.Context, _ *domain.Flag) error { return nil }
func (m *mockStore) DeleteFlag(_ context.Context, _ string) error { return nil }
func (m *mockStore) UpsertFlagState(_ context.Context, _ *domain.FlagState) error { return nil }
func (m *mockStore) GetFlagState(_ context.Context, _, _ string) (*domain.FlagState, error) { return nil, nil }
func (m *mockStore) CreateSegment(_ context.Context, _ *domain.Segment) error { return nil }
func (m *mockStore) ListSegments(_ context.Context, _ string) ([]domain.Segment, error) { return nil, nil }
func (m *mockStore) GetSegment(_ context.Context, _, _ string) (*domain.Segment, error) { return nil, nil }
func (m *mockStore) UpdateSegment(_ context.Context, _ *domain.Segment) error { return nil }
func (m *mockStore) DeleteSegment(_ context.Context, _ string) error { return nil }
func (m *mockStore) CreateAPIKey(_ context.Context, _ *domain.APIKey) error { return nil }
func (m *mockStore) GetAPIKeyByID(_ context.Context, _ string) (*domain.APIKey, error) { return nil, nil }
func (m *mockStore) GetAPIKeyByHash(_ context.Context, _ string) (*domain.APIKey, error) { return nil, nil }
func (m *mockStore) ListAPIKeys(_ context.Context, _ string) ([]domain.APIKey, error) { return nil, nil }
func (m *mockStore) RevokeAPIKey(_ context.Context, _ string) error { return nil }
func (m *mockStore) UpdateAPIKeyLastUsed(_ context.Context, _ string) error { return nil }
func (m *mockStore) CreateAuditEntry(_ context.Context, _ *domain.AuditEntry) error { return nil }
func (m *mockStore) ListAuditEntries(_ context.Context, _ string, _, _ int) ([]domain.AuditEntry, error) { return nil, nil }
func (m *mockStore) GetEnvironmentByAPIKeyHash(_ context.Context, _ string) (*domain.Environment, *domain.APIKey, error) { return nil, nil, nil }
func (m *mockStore) GetOrgMemberByID(_ context.Context, _ string) (*domain.OrgMember, error) { return nil, nil }
func (m *mockStore) UpdateOrgMemberRole(_ context.Context, _ string, _ domain.Role) error { return nil }
func (m *mockStore) RemoveOrgMember(_ context.Context, _ string) error { return nil }
func (m *mockStore) ListEnvPermissions(_ context.Context, _ string) ([]domain.EnvPermission, error) { return nil, nil }
func (m *mockStore) UpsertEnvPermission(_ context.Context, _ *domain.EnvPermission) error { return nil }
func (m *mockStore) DeleteEnvPermission(_ context.Context, _ string) error { return nil }
func (m *mockStore) CreateWebhook(_ context.Context, _ *domain.Webhook) error { return nil }
func (m *mockStore) GetWebhook(_ context.Context, _ string) (*domain.Webhook, error) { return nil, nil }
func (m *mockStore) ListWebhooks(_ context.Context, _ string) ([]domain.Webhook, error) { return nil, nil }
func (m *mockStore) UpdateWebhook(_ context.Context, _ *domain.Webhook) error { return nil }
func (m *mockStore) DeleteWebhook(_ context.Context, _ string) error { return nil }
func (m *mockStore) CreateWebhookDelivery(_ context.Context, _ *domain.WebhookDelivery) error { return nil }
func (m *mockStore) ListWebhookDeliveries(_ context.Context, _ string, _ int) ([]domain.WebhookDelivery, error) { return nil, nil }
func (m *mockStore) ListPendingSchedules(_ context.Context, _ time.Time) ([]domain.FlagState, error) { return nil, nil }
func (m *mockStore) CreateApprovalRequest(_ context.Context, _ *domain.ApprovalRequest) error { return nil }
func (m *mockStore) GetApprovalRequest(_ context.Context, _ string) (*domain.ApprovalRequest, error) { return nil, nil }
func (m *mockStore) ListApprovalRequests(_ context.Context, _ string, _ string, _, _ int) ([]domain.ApprovalRequest, error) { return nil, nil }
func (m *mockStore) UpdateApprovalRequest(_ context.Context, _ *domain.ApprovalRequest) error { return nil }
func (m *mockStore) GetSubscription(_ context.Context, _ string) (*domain.Subscription, error) { return nil, nil }
func (m *mockStore) UpsertSubscription(_ context.Context, _ *domain.Subscription) error { return nil }
func (m *mockStore) UpdateOrgPlan(_ context.Context, _ string, _ string, _ domain.PlanLimits) error { return nil }
func (m *mockStore) IncrementUsage(_ context.Context, _, _ string, _ int64) error { return nil }
func (m *mockStore) GetUsage(_ context.Context, _, _ string) (*domain.UsageMetric, error) { return nil, nil }
func (m *mockStore) GetOnboardingState(_ context.Context, _ string) (*domain.OnboardingState, error) { return nil, nil }
func (m *mockStore) UpsertOnboardingState(_ context.Context, _ *domain.OnboardingState) error { return nil }
func (m *mockStore) GetUserByEmailVerifyToken(_ context.Context, _ string) (*domain.User, error) { return nil, nil }
func (m *mockStore) UpdateUserPhone(_ context.Context, _, _ string) error { return nil }
func (m *mockStore) UpdateUserPhoneOTP(_ context.Context, _, _ string, _ time.Time) error { return nil }
func (m *mockStore) SetPhoneVerified(_ context.Context, _ string) error { return nil }
func (m *mockStore) UpdateUserEmailVerifyToken(_ context.Context, _, _ string, _ time.Time) error { return nil }
func (m *mockStore) SetEmailVerified(_ context.Context, _ string) error { return nil }
func (m *mockStore) UpsertPendingRegistration(_ context.Context, _ *domain.PendingRegistration) error { return nil }
func (m *mockStore) GetPendingRegistrationByEmail(_ context.Context, _ string) (*domain.PendingRegistration, error) { return nil, nil }
func (m *mockStore) IncrementPendingAttempts(_ context.Context, _ string) error { return nil }
func (m *mockStore) DeletePendingRegistration(_ context.Context, _ string) error { return nil }
func (m *mockStore) DeleteExpiredPendingRegistrations(_ context.Context, _ time.Time) (int, error) { return 0, nil }
func (m *mockStore) UpdateLastLoginAt(_ context.Context, _ string) error { return nil }
func (m *mockStore) SoftDeleteOrganization(_ context.Context, _ string) error { return nil }
func (m *mockStore) RestoreOrganization(_ context.Context, _ string) error { return nil }
func (m *mockStore) ListSoftDeletedOrgs(_ context.Context, _ time.Time) ([]domain.Organization, error) { return nil, nil }
func (m *mockStore) HardDeleteOrganization(_ context.Context, _ string) error { return nil }
func (m *mockStore) ListInactiveOrgs(_ context.Context, _ string, _ time.Time) ([]domain.Organization, error) { return nil, nil }
func (m *mockStore) DowngradeOrgToFree(_ context.Context, _ string) error { return nil }
func (m *mockStore) CreateSalesInquiry(_ context.Context, _ *domain.SalesInquiry) error { return nil }
func (m *mockStore) CreateOneTimeToken(_ context.Context, _, _ string, _ time.Duration) (string, error) {
	return "test-token", nil
}
func (m *mockStore) ConsumeOneTimeToken(_ context.Context, _ string) (string, string, error) {
	return "user-id", "org-id", nil
}

// --- mock broadcaster ---

type mockBroadcaster struct {
	mu     sync.Mutex
	events []broadcastEvent
}

type broadcastEvent struct {
	envID string
	data  interface{}
}

func (b *mockBroadcaster) BroadcastFlagUpdate(envID string, data interface{}) {
	b.mu.Lock()
	defer b.mu.Unlock()
	b.events = append(b.events, broadcastEvent{envID, data})
}

func (b *mockBroadcaster) count() int {
	b.mu.Lock()
	defer b.mu.Unlock()
	return len(b.events)
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
}

// --- tests ---

func TestGetRuleset_Empty(t *testing.T) {
	c := NewCache(&mockStore{}, testLogger(), nil)
	if r := c.GetRuleset("env-1"); r != nil {
		t.Errorf("expected nil, got %v", r)
	}
}

func TestLoadRuleset_CachesAndReturns(t *testing.T) {
	store := &mockStore{
		flags: []domain.Flag{
			{ID: "f1", Key: "dark-mode", Name: "Dark Mode", FlagType: "boolean", DefaultValue: json.RawMessage(`false`)},
		},
		states: []domain.FlagState{
			{ID: "s1", FlagID: "f1", EnvID: "env-1", Enabled: true, Rules: []domain.TargetingRule{}, PercentageRollout: 10000},
		},
		segs: []domain.Segment{
			{ID: "seg1", Key: "beta", Name: "Beta", MatchType: "all", Rules: []domain.Condition{}},
		},
	}
	c := NewCache(store, testLogger(), nil)
	ctx := context.Background()

	rs, err := c.LoadRuleset(ctx, "proj-1", "env-1")
	if err != nil {
		t.Fatalf("load: %v", err)
	}

	if len(rs.Flags) != 1 {
		t.Errorf("expected 1 flag, got %d", len(rs.Flags))
	}
	if _, ok := rs.Flags["dark-mode"]; !ok {
		t.Error("expected dark-mode flag")
	}
	if len(rs.States) != 1 {
		t.Errorf("expected 1 state, got %d", len(rs.States))
	}
	if _, ok := rs.States["dark-mode"]; !ok {
		t.Error("expected state keyed by flag key")
	}
	if len(rs.Segments) != 1 {
		t.Errorf("expected 1 segment, got %d", len(rs.Segments))
	}

	cached := c.GetRuleset("env-1")
	if cached == nil {
		t.Fatal("expected cached ruleset")
	}
	if cached != rs {
		t.Error("expected same pointer")
	}
}

func TestLoadRuleset_Error(t *testing.T) {
	store := &mockStore{loadErr: fmt.Errorf("db down")}
	c := NewCache(store, testLogger(), nil)

	_, err := c.LoadRuleset(context.Background(), "p", "e")
	if err == nil {
		t.Fatal("expected error")
	}
}

func TestLoadRuleset_MapsStatesToFlagKeys(t *testing.T) {
	store := &mockStore{
		flags: []domain.Flag{
			{ID: "f1", Key: "alpha"},
			{ID: "f2", Key: "bravo"},
		},
		states: []domain.FlagState{
			{ID: "s2", FlagID: "f2", EnvID: "e1", Enabled: true, Rules: []domain.TargetingRule{}},
		},
	}
	c := NewCache(store, testLogger(), nil)

	rs, _ := c.LoadRuleset(context.Background(), "p", "e1")
	if _, ok := rs.States["alpha"]; ok {
		t.Error("alpha should not have a state")
	}
	if _, ok := rs.States["bravo"]; !ok {
		t.Error("bravo should have a state")
	}
}

func TestStartListening_InvalidatesOnNotify(t *testing.T) {
	store := &mockStore{
		flags: []domain.Flag{{ID: "f1", Key: "test"}},
	}
	c := NewCache(store, testLogger(), nil)
	ctx := context.Background()

	c.LoadRuleset(ctx, "p", "env-1")
	if c.GetRuleset("env-1") == nil {
		t.Fatal("expected cached ruleset before notify")
	}

	c.StartListening(ctx)

	payload, _ := json.Marshal(map[string]string{
		"flag_id": "f1", "env_id": "env-1", "action": "UPDATE",
	})
	store.simulateNotify(string(payload))

	if c.GetRuleset("env-1") != nil {
		t.Error("expected cache to be invalidated after notify")
	}
}

func TestStartListening_BroadcastsOnNotify(t *testing.T) {
	store := &mockStore{}
	bc := &mockBroadcaster{}
	c := NewCache(store, testLogger(), bc)
	ctx := context.Background()

	c.StartListening(ctx)

	payload, _ := json.Marshal(map[string]string{
		"flag_id": "f1", "env_id": "env-42", "action": "INSERT",
	})
	store.simulateNotify(string(payload))

	if bc.count() != 1 {
		t.Fatalf("expected 1 broadcast, got %d", bc.count())
	}
	if bc.events[0].envID != "env-42" {
		t.Errorf("expected env-42, got %s", bc.events[0].envID)
	}
}

func TestStartListening_NilBroadcaster(t *testing.T) {
	store := &mockStore{}
	c := NewCache(store, testLogger(), nil)
	ctx := context.Background()

	c.StartListening(ctx)

	payload, _ := json.Marshal(map[string]string{
		"flag_id": "f1", "env_id": "env-1", "action": "DELETE",
	})
	store.simulateNotify(string(payload))
	// no panic = pass
}

func TestStartListening_InvalidJSON(t *testing.T) {
	store := &mockStore{
		flags: []domain.Flag{{ID: "f1", Key: "test"}},
	}
	c := NewCache(store, testLogger(), nil)
	ctx := context.Background()

	c.LoadRuleset(ctx, "p", "env-1")
	c.StartListening(ctx)

	store.simulateNotify("not json at all")

	if c.GetRuleset("env-1") == nil {
		t.Error("cache should NOT be invalidated for unparseable payload")
	}
}

func TestConcurrentAccess(t *testing.T) {
	store := &mockStore{
		flags: []domain.Flag{{ID: "f1", Key: "test"}},
	}
	c := NewCache(store, testLogger(), nil)
	ctx := context.Background()

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(2)
		envID := fmt.Sprintf("env-%d", i%5)
		go func() {
			defer wg.Done()
			c.LoadRuleset(ctx, "p", envID)
		}()
		go func() {
			defer wg.Done()
			c.GetRuleset(envID)
		}()
	}
	wg.Wait()
}

// Verify cache satisfies the handler interface
func TestCache_ImplementsRulesetCache(t *testing.T) {
	type RulesetCache interface {
		GetRuleset(envID string) *domain.Ruleset
		LoadRuleset(ctx context.Context, projectID, envID string) (*domain.Ruleset, error)
	}
	var _ RulesetCache = (*Cache)(nil)
}

// Ensure NewCache fields are properly initialised
func TestNewCache_Initialization(t *testing.T) {
	store := &mockStore{}
	bc := &mockBroadcaster{}
	logger := testLogger()

	c := NewCache(store, logger, bc)
	if c.rulesets == nil {
		t.Error("rulesets map should be initialised")
	}
	if c.store != store {
		t.Error("store not set")
	}
	if c.broadcaster != bc {
		t.Error("broadcaster not set")
	}

	_ = time.Now() // suppress unused import
}
