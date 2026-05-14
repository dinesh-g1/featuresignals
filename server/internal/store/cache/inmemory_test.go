package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"sync"
	"errors"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// --- minimal mock store ---

type mockStore struct {
	mu       sync.Mutex
	flags    []domain.Flag
	states   []domain.FlagState
	segs     []domain.Segment
	loadErr  error
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
func (m *mockStore) GetOrganization(_ context.Context, _ string) (*domain.Organization, error) {
	return nil, nil
}
func (m *mockStore) GetOrganizationByIDPrefix(_ context.Context, _ string) (*domain.Organization, error) {
	return nil, nil
}
func (m *mockStore) CreateUser(_ context.Context, _ *domain.User) error { return nil }
func (m *mockStore) GetUserByEmail(_ context.Context, _ string) (*domain.User, error) {
	return nil, nil
}
func (m *mockStore) GetUserByID(_ context.Context, _ string) (*domain.User, error) { return nil, nil }
func (m *mockStore) GetUsersByIDs(_ context.Context, _ []string) ([]domain.User, error) { return nil, nil }
func (m *mockStore) AddOrgMember(_ context.Context, _ *domain.OrgMember) error     { return nil }
func (m *mockStore) GetOrgMember(_ context.Context, _, _ string) (*domain.OrgMember, error) {
	return nil, nil
}
func (m *mockStore) ListOrgMembers(_ context.Context, _ string, _, _ int) ([]domain.OrgMember, error) {
	return nil, nil
}
func (m *mockStore) CreateProject(_ context.Context, _ *domain.Project) error        { return nil }
func (m *mockStore) GetProject(_ context.Context, _ string) (*domain.Project, error) { return nil, nil }
func (m *mockStore) ListProjects(_ context.Context, _ string, _, _ int) ([]domain.Project, error) {
	return nil, nil
}
func (m *mockStore) DeleteProject(_ context.Context, _ string) error                  { return nil }
func (m *mockStore) UpdateProject(_ context.Context, _ *domain.Project) error         { return nil }
func (m *mockStore) CreateEnvironment(_ context.Context, _ *domain.Environment) error { return nil }
func (m *mockStore) ListEnvironments(_ context.Context, _ string, _, _ int) ([]domain.Environment, error) {
	return nil, nil
}
func (m *mockStore) GetEnvironment(_ context.Context, _ string) (*domain.Environment, error) {
	return nil, nil
}
func (m *mockStore) DeleteEnvironment(_ context.Context, _ string) error              { return nil }
func (m *mockStore) UpdateEnvironment(_ context.Context, _ *domain.Environment) error { return nil }
func (m *mockStore) CreateFlag(_ context.Context, _ *domain.Flag) error               { return nil }
func (m *mockStore) GetFlag(_ context.Context, _, _ string) (*domain.Flag, error)     { return nil, nil }
func (m *mockStore) ListFlags(_ context.Context, _ string, _, _ int) ([]domain.Flag, error)     { return nil, nil }
func (m *mockStore) ListFlagsWithFilter(_ context.Context, _, _, _ string, _, _ int) ([]domain.Flag, error) {
	return nil, nil
}
func (m *mockStore) ListFlagsSorted(_ context.Context, _, _, _ string, _, _ int) ([]domain.Flag, error) {
	return nil, nil
}
func (m *mockStore) UpdateFlag(_ context.Context, _ *domain.Flag) error               { return nil }
func (m *mockStore) DeleteFlag(_ context.Context, _ string) error                     { return nil }
func (m *mockStore) UpsertFlagState(_ context.Context, _ *domain.FlagState) error     { return nil }
func (m *mockStore) GetFlagState(_ context.Context, _, _ string) (*domain.FlagState, error) {
	return nil, nil
}
func (m *mockStore) ListFlagStatesByEnv(_ context.Context, _ string, _, _ int) ([]domain.FlagState, error) {
	return nil, nil
}
func (m *mockStore) CreateSegment(_ context.Context, _ *domain.Segment) error { return nil }
func (m *mockStore) ListSegments(_ context.Context, _ string, _, _ int) ([]domain.Segment, error) {
	return nil, nil
}
func (m *mockStore) ListSegmentsWithFilter(_ context.Context, _, _, _ string, _, _ int) ([]domain.Segment, error) {
	return nil, nil
}
func (m *mockStore) ListSegmentsSorted(_ context.Context, _, _, _ string, _, _ int) ([]domain.Segment, error) {
	return nil, nil
}
func (m *mockStore) GetSegment(_ context.Context, _, _ string) (*domain.Segment, error) {
	return nil, nil
}
func (m *mockStore) UpdateSegment(_ context.Context, _ *domain.Segment) error { return nil }
func (m *mockStore) DeleteSegment(_ context.Context, _ string) error          { return nil }
func (m *mockStore) CreateAPIKey(_ context.Context, _ *domain.APIKey) error   { return nil }
func (m *mockStore) GetAPIKeyByID(_ context.Context, _ string) (*domain.APIKey, error) {
	return nil, nil
}
func (m *mockStore) GetAPIKeyByHash(_ context.Context, _ string) (*domain.APIKey, error) {
	return nil, nil
}
func (m *mockStore) ListAPIKeys(_ context.Context, _ string, _, _ int) ([]domain.APIKey, error) {
	return nil, nil
}
func (m *mockStore) RevokeAPIKey(_ context.Context, _ string) error { return nil }
func (m *mockStore) RotateAPIKey(_ context.Context, _, _, _, _, _ string, _ time.Duration) (*domain.APIKey, error) {
	return nil, nil
}
func (m *mockStore) CleanExpiredGracePeriodKeys(_ context.Context) error            { return nil }
func (m *mockStore) UpdateAPIKeyLastUsed(_ context.Context, _ string) error         { return nil }
func (m *mockStore) CreateAuditEntry(_ context.Context, _ *domain.AuditEntry) error { return nil }
func (m *mockStore) PurgeAuditEntries(_ context.Context, _ time.Time) (int, error)  { return 0, nil }
func (m *mockStore) ListAuditEntries(_ context.Context, _ string, _, _ int) ([]domain.AuditEntry, error) {
	return nil, nil
}
func (m *mockStore) ListAuditEntriesByProject(_ context.Context, _, _ string, _, _ int) ([]domain.AuditEntry, error) {
	return nil, nil
}
func (m *mockStore) ListAuditEntriesForExport(_ context.Context, _ string, _, _ string) ([]domain.AuditEntry, error) {
	return nil, nil
}
func (m *mockStore) GetLastAuditHash(_ context.Context, _ string) (string, error) { return "", nil }
func (m *mockStore) GetLimitsConfig(_ context.Context, _ string) (*domain.LimitsConfigRow, error) {
	return &domain.LimitsConfigRow{Plan: "free", MaxFlags: 10, MaxSegments: 5, MaxEnvs: 3, MaxMembers: 3, MaxWebhooks: 2, MaxAPIKeys: 5, MaxProjects: 5}, nil
}
func (m *mockStore) CountFlags(_ context.Context, _ string) (int, error)       { return 0, nil }
func (m *mockStore) CountSegments(_ context.Context, _ string) (int, error)    { return 0, nil }
func (m *mockStore) CountEnvironments(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountMembers(_ context.Context, _ string) (int, error)     { return 0, nil }
func (m *mockStore) CountAPIKeys(_ context.Context, _ string) (int, error)     { return 0, nil }
func (m *mockStore) CountProjects(_ context.Context, _ string) (int, error)    { return 0, nil }
func (m *mockStore) CountFlagsByProject(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountFlagStatesByEnv(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountSegmentsByProject(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountSegmentsWithFilter(_ context.Context, _, _, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountFlagsWithFilter(_ context.Context, _, _, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountAPIKeysByEnv(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountEnvironmentsByProject(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountOrgMembers(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountWebhooks(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountWebhookDeliveries(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountCustomRoles(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountFlagVersions(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountPinnedItems(_ context.Context, _, _, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountPolicies(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountAgents(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountAgentsByType(_ context.Context, _, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountMaturities(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountBehaviors(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountBehaviorsByAgentType(_ context.Context, _, _ string) (int, error) { return 0, nil }
func (m *mockStore) CountIntegrations(_ context.Context, _ string) (int, error) { return 0, nil }
func (m *mockStore) ListPinnedItems(_ context.Context, _, _, _ string, _, _ int) ([]domain.PinnedItem, error) {
	return nil, nil
}
func (m *mockStore) CreatePinnedItem(context.Context, string, string, string, string, string) (*domain.PinnedItem, error) {
	return nil, nil
}
func (m *mockStore) DeletePinnedItem(context.Context, string, string, string) error {
	return nil
}
func (m *mockStore) Search(context.Context, string, string, string) ([]domain.SearchHit, error) {
	return nil, nil
}
func (m *mockStore) CountAuditEntries(_ context.Context, _ string) (int, error)   { return 0, nil }
func (m *mockStore) CountApprovalRequests(_ context.Context, _ string, _ string) (int, error) {
	return 0, nil
}
func (m *mockStore) GetEnvironmentByAPIKeyHash(_ context.Context, _ string) (*domain.Environment, *domain.APIKey, error) {
	return nil, nil, nil
}
func (m *mockStore) GetOrgMemberByID(_ context.Context, _ string) (*domain.OrgMember, error) {
	return nil, nil
}
func (m *mockStore) UpdateOrgMemberRole(_ context.Context, _ string, _ domain.Role) error { return nil }
func (m *mockStore) RemoveOrgMember(_ context.Context, _ string) error                    { return nil }
func (m *mockStore) ListEnvPermissions(_ context.Context, _ string) ([]domain.EnvPermission, error) {
	return nil, nil
}
func (m *mockStore) UpsertEnvPermission(_ context.Context, _ *domain.EnvPermission) error { return nil }
func (m *mockStore) DeleteEnvPermission(_ context.Context, _ string) error                { return nil }
func (m *mockStore) CreateWebhook(_ context.Context, _ *domain.Webhook) error             { return nil }
func (m *mockStore) GetWebhook(_ context.Context, _ string) (*domain.Webhook, error)      { return nil, nil }
func (m *mockStore) ListWebhooks(_ context.Context, _ string, _, _ int) ([]domain.Webhook, error) {
	return nil, nil
}
func (m *mockStore) UpdateWebhook(_ context.Context, _ *domain.Webhook) error { return nil }
func (m *mockStore) DeleteWebhook(_ context.Context, _ string) error          { return nil }
func (m *mockStore) CreateWebhookDelivery(_ context.Context, _ *domain.WebhookDelivery) error {
	return nil
}
func (m *mockStore) ListWebhookDeliveries(_ context.Context, _ string, _ int) ([]domain.WebhookDelivery, error) {
	return nil, nil
}
func (m *mockStore) ListPendingSchedules(_ context.Context, _ time.Time) ([]domain.FlagState, error) {
	return nil, nil
}
func (m *mockStore) CreateApprovalRequest(_ context.Context, _ *domain.ApprovalRequest) error {
	return nil
}
func (m *mockStore) GetApprovalRequest(_ context.Context, _ string) (*domain.ApprovalRequest, error) {
	return nil, nil
}
func (m *mockStore) ListApprovalRequests(_ context.Context, _ string, _ string, _, _ int) ([]domain.ApprovalRequest, error) {
	return nil, nil
}
func (m *mockStore) UpdateApprovalRequest(_ context.Context, _ *domain.ApprovalRequest) error {
	return nil
}
func (m *mockStore) GetSubscription(_ context.Context, _ string) (*domain.Subscription, error) {
	return nil, nil
}
func (m *mockStore) UpsertSubscription(_ context.Context, _ *domain.Subscription) error { return nil }
func (m *mockStore) UpdateOrgPlan(_ context.Context, _ string, _ string, _ domain.PlanLimits) error {
	return nil
}
func (m *mockStore) IncrementUsage(_ context.Context, _, _ string, _ int64) error { return nil }
func (m *mockStore) GetUsage(_ context.Context, _, _ string) (*domain.UsageMetric, error) {
	return nil, nil
}
func (m *mockStore) GetSubscriptionByStripeID(_ context.Context, _ string) (*domain.Subscription, error) {
	return nil, nil
}
func (m *mockStore) CreatePaymentEvent(_ context.Context, _ *domain.PaymentEvent) error { return nil }
func (m *mockStore) GetPaymentEventByExternalID(_ context.Context, _, _ string) (*domain.PaymentEvent, error) {
	return nil, nil
}
func (m *mockStore) UpdateOrgPaymentGateway(_ context.Context, _, _ string) error { return nil }
func (m *mockStore) ListPastDueSubscriptions(_ context.Context, _ time.Time) ([]domain.Subscription, error) {
	return nil, nil
}
func (m *mockStore) GetOnboardingState(_ context.Context, _ string) (*domain.OnboardingState, error) {
	return nil, nil
}
func (m *mockStore) UpsertOnboardingState(_ context.Context, _ *domain.OnboardingState) error {
	return nil
}
func (m *mockStore) GetUserByEmailVerifyToken(_ context.Context, _ string) (*domain.User, error) {
	return nil, nil
}
func (m *mockStore) UpdateUserEmailVerifyToken(_ context.Context, _, _ string, _ time.Time) error {
	return nil
}
func (m *mockStore) SetEmailVerified(_ context.Context, _ string) error { return nil }
func (m *mockStore) UpsertPendingRegistration(_ context.Context, _ *domain.PendingRegistration) error {
	return nil
}
func (m *mockStore) GetPendingRegistrationByEmail(_ context.Context, _ string) (*domain.PendingRegistration, error) {
	return nil, nil
}
func (m *mockStore) IncrementPendingAttempts(_ context.Context, _ string) error  { return nil }
func (m *mockStore) DeletePendingRegistration(_ context.Context, _ string) error { return nil }
func (m *mockStore) DeleteExpiredPendingRegistrations(_ context.Context, _ time.Time) (int, error) {
	return 0, nil
}
func (m *mockStore) UpdateLastLoginAt(_ context.Context, _ string) error      { return nil }
func (m *mockStore) SoftDeleteOrganization(_ context.Context, _ string) error { return nil }
func (m *mockStore) RestoreOrganization(_ context.Context, _ string) error    { return nil }
func (m *mockStore) ListSoftDeletedOrgs(_ context.Context, _ time.Time) ([]domain.Organization, error) {
	return nil, nil
}
func (m *mockStore) HardDeleteOrganization(_ context.Context, _ string) error { return nil }
func (m *mockStore) ListInactiveOrgs(_ context.Context, _ string, _ time.Time) ([]domain.Organization, error) {
	return nil, nil
}
func (m *mockStore) DowngradeOrgToFree(_ context.Context, _ string) error               { return nil }
func (m *mockStore) CreateSalesInquiry(_ context.Context, _ *domain.SalesInquiry) error { return nil }
func (m *mockStore) CreateOneTimeToken(_ context.Context, _, _ string, _ time.Duration) (string, error) {
	return "test-token", nil
}
func (m *mockStore) ConsumeOneTimeToken(_ context.Context, _ string) (string, string, error) {
	return "user-id", "org-id", nil
}
func (m *mockStore) UpsertSSOConfig(_ context.Context, _ *domain.SSOConfig) error { return nil }
func (m *mockStore) GetSSOConfig(_ context.Context, _ string) (*domain.SSOConfig, error) {
	return nil, nil
}
func (m *mockStore) GetSSOConfigFull(_ context.Context, _ string) (*domain.SSOConfig, error) {
	return nil, nil
}
func (m *mockStore) GetSSOConfigByOrgSlug(_ context.Context, _ string) (*domain.SSOConfig, error) {
	return nil, nil
}
func (m *mockStore) DeleteSSOConfig(_ context.Context, _ string) error { return nil }

func (m *mockStore) RevokeToken(_ context.Context, _, _, _ string, _ time.Time) error { return nil }
func (m *mockStore) IsTokenRevoked(_ context.Context, _ string) (bool, error)         { return false, nil }
func (m *mockStore) CleanExpiredRevocations(_ context.Context) error                  { return nil }
func (m *mockStore) UpsertMFASecret(_ context.Context, _, _ string) error             { return nil }
func (m *mockStore) GetMFASecret(_ context.Context, _ string) (*domain.MFASecret, error) {
	return nil, fmt.Errorf("not found")
}
func (m *mockStore) EnableMFA(_ context.Context, _ string) error                        { return nil }
func (m *mockStore) DisableMFA(_ context.Context, _ string) error                       { return nil }
func (m *mockStore) RecordLoginAttempt(_ context.Context, _, _, _ string, _ bool) error { return nil }
func (m *mockStore) CountRecentFailedAttempts(_ context.Context, _ string, _ time.Time) (int, error) {
	return 0, nil
}
func (m *mockStore) GetIPAllowlist(_ context.Context, _ string) (bool, []string, error) {
	return false, nil, nil
}
func (m *mockStore) UpsertIPAllowlist(_ context.Context, _ string, _ bool, _ []string) error {
	return nil
}
func (m *mockStore) CreateCustomRole(_ context.Context, _ *domain.CustomRole) error { return nil }
func (m *mockStore) GetCustomRole(_ context.Context, _ string) (*domain.CustomRole, error) {
	return nil, domain.ErrNotFound
}
func (m *mockStore) ListCustomRoles(_ context.Context, _ string, _, _ int) ([]domain.CustomRole, error) {
	return nil, nil
}
func (m *mockStore) UpdateCustomRole(_ context.Context, _ *domain.CustomRole) error { return nil }
func (m *mockStore) DeleteCustomRole(_ context.Context, _ string) error             { return nil }
func (m *mockStore) SoftDeleteUser(_ context.Context, _ string) error               { return nil }
func (m *mockStore) SetPasswordResetToken(_ context.Context, _, _ string, _ time.Time, _, _ string) error {
	return nil
}
func (m *mockStore) ConsumePasswordResetToken(_ context.Context, _ string) (string, error) {
	return "", nil
}
func (m *mockStore) UpdatePassword(_ context.Context, _, _ string) error { return nil }

func (m *mockStore) InsertProductEvent(_ context.Context, _ *domain.ProductEvent) error { return nil }
func (m *mockStore) InsertProductEvents(_ context.Context, _ []domain.ProductEvent) error {
	return nil
}
func (m *mockStore) CountEventsByOrg(_ context.Context, _, _ string, _ time.Time) (int, error) {
	return 0, nil
}
func (m *mockStore) CountEventsByUser(_ context.Context, _, _ string, _ time.Time) (int, error) {
	return 0, nil
}
func (m *mockStore) CountEventsByCategory(_ context.Context, _ string, _ time.Time) (int, error) {
	return 0, nil
}
func (m *mockStore) CountDistinctOrgs(_ context.Context, _ string, _ time.Time) (int, error) {
	return 0, nil
}
func (m *mockStore) CountDistinctUsers(_ context.Context, _ time.Time) (int, error) { return 0, nil }
func (m *mockStore) EventFunnel(_ context.Context, _ []string, _ time.Time) (map[string]int, error) {
	return nil, nil
}
func (m *mockStore) PlanDistribution(_ context.Context) (map[string]int, error) { return nil, nil }
func (m *mockStore) UpdateUserEmailPreferences(_ context.Context, _ string, _ bool, _ string) error {
	return nil
}
func (m *mockStore) GetUserEmailPreferences(_ context.Context, _ string) (bool, string, error) {
	return false, "", nil
}
func (m *mockStore) DismissHint(_ context.Context, _, _ string) error { return nil }
func (m *mockStore) GetDismissedHints(_ context.Context, _ string) ([]string, error) {
	return nil, nil
}
func (m *mockStore) SetTourCompleted(_ context.Context, _ string) error { return nil }

func (m *mockStore) InsertFeedback(_ context.Context, _ *domain.Feedback) error { return nil }

// FlagVersionStore stubs
func (m *mockStore) ListFlagVersions(_ context.Context, _ string, _, _ int) ([]domain.FlagVersion, error) {
	return nil, nil
}
func (m *mockStore) GetFlagVersion(_ context.Context, _ string, _ int) (*domain.FlagVersion, error) {
	return nil, nil
}
func (m *mockStore) RollbackFlagToVersion(_ context.Context, _ string, _ int, _, _ string) error {
	return nil
}

func (m *mockStore) InsertStatusChecks(_ context.Context, _ []domain.StatusCheck) error {
	return nil
}
func (m *mockStore) GetComponentHistory(_ context.Context, _ int) ([]domain.DailyComponentStatus, error) {
	return nil, nil
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
			{ID: "seg1", Key: "beta", Name: "Beta", MatchType: "all", Rules: []domain.Condition{},
			},
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
			{ID: "s2", FlagID: "f2", EnvID: "e1", Enabled: true, Rules: []domain.TargetingRule{},
			},
		},
		segs: []domain.Segment{},
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

// ─── Tests for CacheInvalidator path ───────────────────────────────────────

// mockInvalidator implements domain.CacheInvalidator for testing.
type mockInvalidator struct {
	mu      sync.Mutex
	handler domain.InvalidationHandler
}

func (m *mockInvalidator) Invalidate(_ context.Context, _ string, _ []byte) error {
	return nil
}

func (m *mockInvalidator) Subscribe(ctx context.Context, channel string, handler domain.InvalidationHandler) error {
	m.mu.Lock()
	m.handler = handler
	m.mu.Unlock()
	<-ctx.Done()
	return ctx.Err()
}

func (m *mockInvalidator) Close() error {
	return nil
}

func (m *mockInvalidator) simulateNotify(channel string, payload []byte) {
	m.mu.Lock()
	h := m.handler
	m.mu.Unlock()
	if h != nil {
		h(context.Background(), channel, payload)
	}
}

func TestStartListening_InvalidatorPath_InvalidatesOnNotify(t *testing.T) {
	store := &mockStore{
		flags: []domain.Flag{{ID: "f1", Key: "test"}},
	}
	inv := &mockInvalidator{}
	c := NewCache(store, testLogger(), nil)
	c.SetInvalidator(inv)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	c.LoadRuleset(ctx, "p", "env-1")
	if c.GetRuleset("env-1") == nil {
		t.Fatal("expected cached ruleset before notify")
	}

	// Start listening in background (blocked on ctx)
	go c.StartListening(ctx)

	// Give the goroutine time to register the handler
	time.Sleep(10 * time.Millisecond)

	payload, _ := json.Marshal(map[string]string{
		"flag_id": "f1", "env_id": "env-1", "action": "UPDATE",
	})
	inv.simulateNotify("flag_changes", payload)

	// Give the handler goroutine time to process
	time.Sleep(10 * time.Millisecond)

	if c.GetRuleset("env-1") != nil {
		t.Error("expected cache to be invalidated after notify via invalidator")
	}
}

func TestStartListening_InvalidatorPath_BroadcastsOnNotify(t *testing.T) {
	store := &mockStore{}
	inv := &mockInvalidator{}
	bc := &mockBroadcaster{}
	c := NewCache(store, testLogger(), bc)
	c.SetInvalidator(inv)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	go c.StartListening(ctx)
	time.Sleep(10 * time.Millisecond)

	payload, _ := json.Marshal(map[string]string{
		"flag_id": "f1", "env_id": "env-42", "action": "INSERT",
	})
	inv.simulateNotify("flag_changes", payload)
	time.Sleep(10 * time.Millisecond)

	if bc.count() != 1 {
		t.Fatalf("expected 1 broadcast, got %d", bc.count())
	}
	if bc.events[0].envID != "env-42" {
		t.Errorf("expected env-42, got %s", bc.events[0].envID)
	}
}

func TestStartListening_InvalidatorPath_InvalidJSON(t *testing.T) {
	store := &mockStore{
		flags: []domain.Flag{{ID: "f1", Key: "test"}},
	}
	inv := &mockInvalidator{}
	c := NewCache(store, testLogger(), nil)
	c.SetInvalidator(inv)
	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()

	c.LoadRuleset(ctx, "p", "env-1")
	go c.StartListening(ctx)
	time.Sleep(10 * time.Millisecond)

	inv.simulateNotify("flag_changes", []byte("not json at all"))
	time.Sleep(10 * time.Millisecond)

	if c.GetRuleset("env-1") == nil {
		t.Error("cache should NOT be invalidated for unparseable payload")
	}
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
func (m *mockStore) CreateMagicLinkToken(_ context.Context, _, _, _ string, _ time.Time) error {
	return nil
}
func (m *mockStore) ConsumeMagicLinkToken(_ context.Context, _ string) (string, string, error) {
	return "", "", nil
}

// ─── OpsStore stubs (required by domain.Store) ────────────────────────

func (m *mockStore) ListLicenses(context.Context, string, string, string) ([]domain.License, int, error) {
	return nil, 0, nil
}
func (m *mockStore) GetLicense(context.Context, string) (*domain.License, error) {
	return nil, fmt.Errorf("not found")
}
func (m *mockStore) GetLicenseByOrg(context.Context, string) (*domain.License, error) {
	return nil, fmt.Errorf("not found")
}
func (m *mockStore) CreateLicense(context.Context, *domain.License) error        { return nil }
func (m *mockStore) UpdateLicense(context.Context, string, map[string]any) error { return nil }
func (m *mockStore) RevokeLicense(context.Context, string, string) error         { return nil }
func (m *mockStore) OverrideLicenseQuota(context.Context, string, map[string]any) error {
	return nil
}
func (m *mockStore) ResetLicenseUsage(context.Context, string) error { return nil }
func (m *mockStore) ListOpsUsers(context.Context) ([]domain.OpsUser, error) {
	return nil, nil
}
func (m *mockStore) GetOpsUser(context.Context, string) (*domain.OpsUser, error) {
	return nil, fmt.Errorf("not found")
}
func (m *mockStore) GetOpsUserByUserID(context.Context, string) (*domain.OpsUser, error) {
	return nil, fmt.Errorf("not found")
}
func (m *mockStore) CreateOpsUser(context.Context, *domain.OpsUser) error { return nil }
func (m *mockStore) UpdateOpsUser(context.Context, string, map[string]any) error {
	return nil
}
func (m *mockStore) DeleteOpsUser(context.Context, string) error { return nil }
func (m *mockStore) ListOrgCostDaily(context.Context, string, string, string) ([]domain.OrgCostDaily, error) {
	return nil, nil
}
func (m *mockStore) ListOpsAuditLogs(context.Context, string, string, string, string, string, int, int) ([]domain.OpsAuditLog, int, error) {
	return nil, 0, nil
}
func (m *mockStore) CreateOpsAuditLog(context.Context, *domain.OpsAuditLog) error { return nil }

func (s *mockStore) CreateIntegration(context.Context, domain.CreateIntegrationRequest) (*domain.Integration, error) {
	return nil, nil
}
func (s *mockStore) GetIntegration(context.Context, string, string) (*domain.Integration, error) {
	return nil, nil
}
func (s *mockStore) ListIntegrations(_ context.Context, _ string, _, _ int) ([]domain.Integration, error) {
	return nil, nil
}
func (s *mockStore) UpdateIntegration(context.Context, string, string, domain.UpdateIntegrationRequest) (*domain.Integration, error) {
	return nil, nil
}
func (s *mockStore) DeleteIntegration(context.Context, string, string) error {
	return nil
}
func (s *mockStore) TestIntegration(context.Context, string) (*domain.IntegrationDelivery, error) {
	return nil, nil
}
func (s *mockStore) ListDeliveries(context.Context, string, int) ([]domain.IntegrationDelivery, error) {
	return nil, nil
}

func (s *mockStore) CreateOpsCredentials(context.Context, string, string, string) error { return nil }
func (s *mockStore) GetOpsUserByEmail(context.Context, string) (*domain.OpsUser, error) { return nil, nil }
func (s *mockStore) CreateOpsSession(context.Context, string, string, time.Time) (string, error) { return "", nil }
func (s *mockStore) GetOpsSessionByRefreshToken(context.Context, string) (*domain.OpsUser, error) { return nil, nil }
func (s *mockStore) DeleteOpsSession(context.Context, string, string) error { return nil }
func (s *mockStore) DeleteAllOpsSessions(context.Context, string) error { return nil }

func (s *mockStore) CreateSession(context.Context, *domain.PublicSession) error { return nil }
func (s *mockStore) GetSession(context.Context, string) (*domain.PublicSession, error) {
	return nil, fmt.Errorf("not found")
}
func (s *mockStore) DeleteSession(context.Context, string) error          { return nil }
func (s *mockStore) CleanExpiredSessions(context.Context) (int, error) { return 0, nil }

// CreditStore stubs — satisfy domain.Store interface in tests.
var errCreditNotImpl = errors.New("credit store not implemented in tests")

func (s *mockStore) ListCostBearers(ctx context.Context) ([]domain.CostBearer, error) {
	return nil, errCreditNotImpl
}
func (s *mockStore) GetCostBearer(ctx context.Context, bearerID string) (*domain.CostBearer, error) {
	return nil, errCreditNotImpl
}
func (s *mockStore) ListCreditPacks(ctx context.Context, bearerID string) ([]domain.CreditPack, error) {
	return nil, errCreditNotImpl
}
func (s *mockStore) GetCreditPack(ctx context.Context, packID string) (*domain.CreditPack, error) {
	return nil, errCreditNotImpl
}
func (s *mockStore) GetCreditBalance(ctx context.Context, orgID, bearerID string) (*domain.CreditBalance, error) {
	return &domain.CreditBalance{OrgID: orgID, BearerID: bearerID}, nil
}
func (s *mockStore) ListCreditBalances(ctx context.Context, orgID string) ([]domain.CreditBalance, error) {
	return nil, errCreditNotImpl
}
func (s *mockStore) ConsumeCredits(ctx context.Context, orgID, bearerID string, credits int, operation string, metadata map[string]any, idempotencyKey string) (int, error) {
	return 0, errCreditNotImpl
}
func (s *mockStore) PurchaseCredits(ctx context.Context, orgID, packID string) (*domain.CreditPurchase, error) {
	return nil, errCreditNotImpl
}
func (s *mockStore) ListCreditPurchases(ctx context.Context, orgID string, limit, offset int) ([]domain.CreditPurchase, error) {
	return nil, errCreditNotImpl
}
func (s *mockStore) ListCreditConsumptions(ctx context.Context, orgID, bearerID string, limit, offset int) ([]domain.CreditConsumption, error) {
	return nil, errCreditNotImpl
}
func (s *mockStore) GrantMonthlyCredits(ctx context.Context, orgID, plan string, periodStart time.Time) error {
	return errCreditNotImpl
}

func (s *mockStore) CreateAgent(_ context.Context, _ *domain.Agent) error {
	return errCreditNotImpl
}
func (s *mockStore) GetAgent(_ context.Context, _, _ string) (*domain.Agent, error) {
	return nil, errCreditNotImpl
}
func (s *mockStore) ListAgents(_ context.Context, _ string, _, _ int) ([]domain.Agent, error) {
	return nil, errCreditNotImpl
}
func (s *mockStore) ListAgentsByType(_ context.Context, _, _ string, _, _ int) ([]domain.Agent, error) {
	return nil, errCreditNotImpl
}
func (s *mockStore) UpdateAgent(_ context.Context, _ *domain.Agent) error {
	return errCreditNotImpl
}
func (s *mockStore) UpdateAgentHeartbeat(_ context.Context, _ string) error {
	return errCreditNotImpl
}
func (s *mockStore) DeleteAgent(_ context.Context, _, _ string) error {
	return errCreditNotImpl
}
func (s *mockStore) UpsertMaturity(_ context.Context, _ string, _ *domain.AgentMaturity) error {
	return errCreditNotImpl
}
func (s *mockStore) GetMaturity(_ context.Context, _, _ string) (*domain.AgentMaturity, error) {
	return nil, errCreditNotImpl
}
func (s *mockStore) ListMaturities(_ context.Context, _ string, _, _ int) ([]domain.AgentMaturity, error) {
	return nil, errCreditNotImpl
}

// ─── EvalEventWriter ───────────────────────────────────────────────────────

func (s *mockStore) InsertEvalEvent(_ context.Context, _ *domain.EvalEvent) error {
	return errCreditNotImpl
}

func (s *mockStore) InsertEvalEventBatch(_ context.Context, _ *domain.EvalEventBatch) error {
	return errCreditNotImpl
}

// ─── EvalEventReader ───────────────────────────────────────────────────────

func (s *mockStore) CountEvaluations(_ context.Context, _, _ string, _ time.Time) (int64, error) {
	return 0, errCreditNotImpl
}

func (s *mockStore) CountEvaluationsByVariant(_ context.Context, _, _ string, _ time.Time) (map[string]int64, error) {
	return nil, errCreditNotImpl
}

func (s *mockStore) GetEvaluationLatency(_ context.Context, _, _ string, _ time.Time) (int64, int64, int64, error) {
	return 0, 0, 0, errCreditNotImpl
}

func (s *mockStore) GetEvaluationVolume(_ context.Context, _ string, _ time.Time, _ string) ([]domain.TimeSeriesPoint, error) {
	return nil, errCreditNotImpl
}

// ─── ABMEventStore ─────────────────────────────────────────────────────────

func (s *mockStore) InsertTrackEvent(_ context.Context, _ *domain.ABMTrackEvent) error {
	return errCreditNotImpl
}

func (s *mockStore) InsertTrackEvents(_ context.Context, _ []domain.ABMTrackEvent) error {
	return errCreditNotImpl
}

func (s *mockStore) CountEventsByBehavior(_ context.Context, _, _ string, _ time.Time) (int, error) {
	return 0, errCreditNotImpl
}

func (s *mockStore) CountEventsByAgent(_ context.Context, _, _ string, _ time.Time) (int, error) {
	return 0, errCreditNotImpl
}

func (s *mockStore) GetVariantDistribution(_ context.Context, _, _ string, _ time.Time) (map[string]int, error) {
	return nil, errCreditNotImpl
}

// ─── PolicyStore ───────────────────────────────────────────────────────────

func (s *mockStore) GetPolicy(_ context.Context, _, _ string) (*domain.Policy, error) {
	return nil, errCreditNotImpl
}

func (s *mockStore) ListPolicies(_ context.Context, _ string, _, _ int) ([]domain.Policy, error) {
	return nil, errCreditNotImpl
}

func (s *mockStore) ListApplicablePolicies(_ context.Context, _ string, _ domain.PolicyScope) ([]domain.Policy, error) {
	return nil, errCreditNotImpl
}

func (s *mockStore) CreatePolicy(_ context.Context, _ *domain.Policy) error {
	return errCreditNotImpl
}

func (s *mockStore) UpdatePolicy(_ context.Context, _ *domain.Policy) error {
	return errCreditNotImpl
}

func (s *mockStore) DeletePolicy(_ context.Context, _, _ string) error {
	return errCreditNotImpl
}

func (s *mockStore) SetPolicyEnabled(_ context.Context, _, _ string, _ bool) error {
	return errCreditNotImpl
}

// ─── ABMBehaviorStore ──────────────────────────────────────────────────────

func (s *mockStore) CreateBehavior(_ context.Context, _ *domain.ABMBehavior) error {
	return errCreditNotImpl
}

func (s *mockStore) GetBehavior(_ context.Context, _, _ string) (*domain.ABMBehavior, error) {
	return nil, errCreditNotImpl
}

func (s *mockStore) ListBehaviors(_ context.Context, _ string, _, _ int) ([]domain.ABMBehavior, error) {
	return nil, errCreditNotImpl
}

func (s *mockStore) ListBehaviorsByAgentType(_ context.Context, _, _ string, _, _ int) ([]domain.ABMBehavior, error) {
	return nil, errCreditNotImpl
}

func (s *mockStore) UpdateBehavior(_ context.Context, _ *domain.ABMBehavior) error {
	return errCreditNotImpl
}

func (s *mockStore) DeleteBehavior(_ context.Context, _, _ string) error {
	return errCreditNotImpl
}
