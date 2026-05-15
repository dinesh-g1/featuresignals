package postgres_test

import (
	"context"
	"encoding/json"
	"log/slog"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"
	"github.com/testcontainers/testcontainers-go"
	tcpostgres "github.com/testcontainers/testcontainers-go/modules/postgres"
	"github.com/testcontainers/testcontainers-go/wait"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/migrate"
	"github.com/featuresignals/server/internal/store/postgres"
)

var (
	testContainer *tcpostgres.PostgresContainer
	testConnStr   string
	testOnce      sync.Once
	testOnceErr   error
	dockerOK      bool
)

func testPool(t *testing.T) *pgxpool.Pool {
	t.Helper()

	testOnce.Do(func() {
		ctx := context.Background()

		container, err := tcpostgres.Run(ctx, "postgres:16-alpine",
			testcontainers.WithWaitStrategy(
				wait.ForLog("database system is ready to accept connections").
					WithOccurrence(2).
					WithStartupTimeout(60*time.Second),
			),
		)
		if err != nil {
			testOnceErr = err
			return
		}
		testContainer = container
		dockerOK = true

		connStr, err := container.ConnectionString(ctx, "sslmode=disable")
		if err != nil {
			testOnceErr = err
			return
		}
		testConnStr = connStr

		// Run migrations on the fresh database
		if err := migrate.RunUp(ctx, connStr, slog.Default(), false); err != nil {
			testOnceErr = err
			return
		}
	})

	if !dockerOK {
		dbURL := os.Getenv("TEST_DATABASE_URL")
		if dbURL == "" {
			t.Skip("TEST_DATABASE_URL not set and Docker not available — skipping postgres integration test")
		}
		ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
		defer cancel()
		pool, err := pgxpool.New(ctx, dbURL)
		if err != nil {
			t.Fatalf("connect to test db: %v", err)
		}
		t.Cleanup(func() { pool.Close() })
		return pool
	}

	if testOnceErr != nil {
		t.Fatalf("start postgres container: %v", testOnceErr)
	}

	ctx := context.Background()
	pool, err := pgxpool.New(ctx, testConnStr)
	if err != nil {
		t.Fatalf("connect to test db: %v", err)
	}

	t.Cleanup(func() { pool.Close() })

	return pool
}

func cleanup(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	for _, table := range []string{
			"abm_track_events",
			"abm_behaviors",
			"agent_maturity",
		"agents",
		"governance_policies",
		"auto_remediations",
		"incident_correlations",
		"cost_attributions",
		"impact_reports",
		"org_learnings",
		"preflight_approval_requests",
		"rollout_phases",
		"preflight_reports",
		"audit_logs", "env_permissions", "flag_states", "api_keys",
		"generated_flags", "scan_results", "cleanup_queue",
		"flags", "segments", "environments", "projects", "org_members", "users", "organizations",
	} {
		if _, err := pool.Exec(ctx, "DELETE FROM "+table); err != nil {
			t.Fatalf("cleanup table %s: %v", table, err)
		}
	}
}

func seedOrg(t *testing.T, store *postgres.Store) *domain.Organization {
	t.Helper()
	org := &domain.Organization{Name: "Test Org", Slug: "test-org-" + time.Now().Format("150405.000")}
	if err := store.CreateOrganization(context.Background(), org); err != nil {
		t.Fatalf("create org: %v", err)
	}
	return org
}

func seedUser(t *testing.T, store *postgres.Store, suffix string) *domain.User {
	t.Helper()
	user := &domain.User{
		Email:        "user" + suffix + "@test.com",
		PasswordHash: "hash123",
		Name:         "Test User " + suffix,
	}
	if err := store.CreateUser(context.Background(), user); err != nil {
		t.Fatalf("create user: %v", err)
	}
	return user
}

func seedProject(t *testing.T, store *postgres.Store, orgID string) *domain.Project {
	t.Helper()
	p := &domain.Project{OrgID: orgID, Name: "Test Project", Slug: "test-proj-" + time.Now().Format("150405.000")}
	if err := store.CreateProject(context.Background(), p); err != nil {
		t.Fatalf("create project: %v", err)
	}
	return p
}

func seedEnv(t *testing.T, store *postgres.Store, projectID, orgID, slug string) *domain.Environment {
	t.Helper()
	e := &domain.Environment{ProjectID: projectID, OrgID: orgID, Name: slug, Slug: slug, Color: "#6366F1"}
	if err := store.CreateEnvironment(context.Background(), e); err != nil {
		t.Fatalf("create env: %v", err)
	}
	return e
}

func TestOrganization_CRUD(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := &domain.Organization{Name: "Acme Corp", Slug: "acme"}
	if err := store.CreateOrganization(ctx, org); err != nil {
		t.Fatalf("create: %v", err)
	}
	if org.ID == "" {
		t.Fatal("expected non-empty ID")
	}

	got, err := store.GetOrganization(ctx, org.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Name != "Acme Corp" || got.Slug != "acme" {
		t.Errorf("unexpected org: %+v", got)
	}
}

func TestUser_CRUD(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	user := &domain.User{Email: "alice@test.com", PasswordHash: "hashed", Name: "Alice"}
	if err := store.CreateUser(ctx, user); err != nil {
		t.Fatalf("create: %v", err)
	}

	byEmail, err := store.GetUserByEmail(ctx, "alice@test.com")
	if err != nil {
		t.Fatalf("get by email: %v", err)
	}
	if byEmail.Name != "Alice" {
		t.Errorf("expected Alice, got %s", byEmail.Name)
	}

	byID, err := store.GetUserByID(ctx, user.ID)
	if err != nil {
		t.Fatalf("get by id: %v", err)
	}
	if byID.Email != "alice@test.com" {
		t.Errorf("expected alice@test.com, got %s", byID.Email)
	}
}

func TestOrgMembers(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)
	user := seedUser(t, store, "1")

	member := &domain.OrgMember{OrgID: org.ID, UserID: user.ID, Role: "admin"}
	if err := store.AddOrgMember(ctx, member); err != nil {
		t.Fatalf("add member: %v", err)
	}

	got, err := store.GetOrgMember(ctx, org.ID, user.ID)
	if err != nil {
		t.Fatalf("get member: %v", err)
	}
	if got.Role != "admin" {
		t.Errorf("expected admin, got %s", got.Role)
	}

	members, err := store.ListOrgMembers(ctx, org.ID, 50, 0)
	if err != nil {
		t.Fatalf("list members: %v", err)
	}
	if len(members) != 1 {
		t.Errorf("expected 1 member, got %d", len(members))
	}
}

func TestProject_CRUD(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)

	p := &domain.Project{OrgID: org.ID, Name: "MyProject", Slug: "myproj"}
	if err := store.CreateProject(ctx, p); err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := store.GetProject(ctx, p.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Name != "MyProject" {
		t.Errorf("expected MyProject, got %s", got.Name)
	}

	projects, err := store.ListProjects(ctx, org.ID, 50, 0)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(projects) != 1 {
		t.Errorf("expected 1 project, got %d", len(projects))
	}

	if err := store.DeleteProject(ctx, p.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	projects, _ = store.ListProjects(ctx, org.ID, 50, 0)
	if len(projects) != 0 {
		t.Errorf("expected 0 after delete, got %d", len(projects))
	}
}

func TestEnvironment_CRUD(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)
	proj := seedProject(t, store, org.ID)

	env := &domain.Environment{ProjectID: proj.ID, OrgID: org.ID, Name: "Production", Slug: "production", Color: "#10B981"}
	if err := store.CreateEnvironment(ctx, env); err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := store.GetEnvironment(ctx, env.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Slug != "production" {
		t.Errorf("expected production, got %s", got.Slug)
	}

	envs, err := store.ListEnvironments(ctx, proj.ID, 50, 0)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(envs) != 1 {
		t.Errorf("expected 1, got %d", len(envs))
	}

	if err := store.DeleteEnvironment(ctx, env.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
}

func TestFlag_CRUD(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)
	proj := seedProject(t, store, org.ID)

	flag := &domain.Flag{
		ProjectID:    proj.ID,
		OrgID:        org.ID,
		Key:          "dark-mode",
		Name:         "Dark Mode",
		Description:  "Enable dark mode",
		FlagType:     domain.FlagTypeBoolean,
		DefaultValue: json.RawMessage(`false`),
		Tags:         []string{"ui"},
	}
	if err := store.CreateFlag(ctx, flag); err != nil {
		t.Fatalf("create: %v", err)
	}
	if flag.ID == "" {
		t.Fatal("expected non-empty ID")
	}

	got, err := store.GetFlag(ctx, proj.ID, "dark-mode")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Name != "Dark Mode" {
		t.Errorf("expected Dark Mode, got %s", got.Name)
	}

	flag.Name = "Dark Theme"
	if err := store.UpdateFlag(ctx, flag); err != nil {
		t.Fatalf("update: %v", err)
	}
	got, _ = store.GetFlag(ctx, proj.ID, "dark-mode")
	if got.Name != "Dark Theme" {
		t.Errorf("expected Dark Theme, got %s", got.Name)
	}

	flags, err := store.ListFlags(ctx, proj.ID, 50, 0)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(flags) != 1 {
		t.Errorf("expected 1, got %d", len(flags))
	}

	if err := store.DeleteFlag(ctx, flag.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
	flags, _ = store.ListFlags(ctx, proj.ID, 50, 0)
	if len(flags) != 0 {
		t.Errorf("expected 0, got %d", len(flags))
	}
}

func TestFlagState_UpsertAndGet(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)
	proj := seedProject(t, store, org.ID)
	env := seedEnv(t, store, proj.ID, org.ID, "staging")

	flag := &domain.Flag{
		ProjectID:    proj.ID,
		OrgID:        org.ID,
		Key:          "feature-x",
		Name:         "Feature X",
		FlagType:     domain.FlagTypeBoolean,
		DefaultValue: json.RawMessage(`false`),
		Tags:         []string{},
	}
	store.CreateFlag(ctx, flag)

	state := &domain.FlagState{
		FlagID:            flag.ID,
		EnvID:             env.ID,
		OrgID:             org.ID,
		Enabled:           true,
		DefaultValue:      json.RawMessage(`true`),
		Rules:             []domain.TargetingRule{},
		PercentageRollout: 5000,
	}
	if err := store.UpsertFlagState(ctx, state); err != nil {
		t.Fatalf("upsert: %v", err)
	}
	if state.ID == "" {
		t.Fatal("expected non-empty ID")
	}

	got, err := store.GetFlagState(ctx, flag.ID, env.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if !got.Enabled {
		t.Error("expected enabled")
	}
	if got.PercentageRollout != 5000 {
		t.Errorf("expected 5000, got %d", got.PercentageRollout)
	}

	state.PercentageRollout = 10000
	if err := store.UpsertFlagState(ctx, state); err != nil {
		t.Fatalf("upsert update: %v", err)
	}
	got, _ = store.GetFlagState(ctx, flag.ID, env.ID)
	if got.PercentageRollout != 10000 {
		t.Errorf("expected 10000 after upsert, got %d", got.PercentageRollout)
	}
}

func TestFlagState_WithRules(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)
	proj := seedProject(t, store, org.ID)
	env := seedEnv(t, store, proj.ID, org.ID, "prod")

	flag := &domain.Flag{
		ProjectID: proj.ID, OrgID: org.ID, Key: "banner", Name: "Banner",
		FlagType: domain.FlagTypeString, DefaultValue: json.RawMessage(`"off"`), Tags: []string{},
	}
	store.CreateFlag(ctx, flag)

	rules := []domain.TargetingRule{
		{
			ID: "r1", Priority: 1, Description: "Beta users",
			Conditions: []domain.Condition{{Attribute: "plan", Operator: "eq", Values: []string{"beta"}}},
			Percentage: 10000, Value: json.RawMessage(`"on"`), MatchType: "all",
		},
	}
	state := &domain.FlagState{
		FlagID: flag.ID, EnvID: env.ID, OrgID: org.ID, Enabled: true,
		Rules: rules, PercentageRollout: 0,
	}
	if err := store.UpsertFlagState(ctx, state); err != nil {
		t.Fatalf("upsert: %v", err)
	}

	got, err := store.GetFlagState(ctx, flag.ID, env.ID)
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if len(got.Rules) != 1 {
		t.Fatalf("expected 1 rule, got %d", len(got.Rules))
	}
	if got.Rules[0].Description != "Beta users" {
		t.Errorf("unexpected description: %s", got.Rules[0].Description)
	}
	if len(got.Rules[0].Conditions) != 1 || got.Rules[0].Conditions[0].Attribute != "plan" {
		t.Errorf("unexpected conditions: %+v", got.Rules[0].Conditions)
	}
}

func TestSegment_CRUD(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)
	proj := seedProject(t, store, org.ID)

	seg := &domain.Segment{
		ProjectID:   proj.ID,
		OrgID:       org.ID,
		Key:         "beta-users",
		Name:        "Beta Users",
		Description: "Users in beta",
		MatchType:   domain.MatchAll,
		Rules:       []domain.Condition{{Attribute: "plan", Operator: "eq", Values: []string{"beta"}}},
	}
	if err := store.CreateSegment(ctx, seg); err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := store.GetSegment(ctx, proj.ID, "beta-users")
	if err != nil {
		t.Fatalf("get: %v", err)
	}
	if got.Name != "Beta Users" {
		t.Errorf("expected Beta Users, got %s", got.Name)
	}
	if len(got.Rules) != 1 {
		t.Errorf("expected 1 rule, got %d", len(got.Rules))
	}

	seg.Name = "Beta Testers"
	if err := store.UpdateSegment(ctx, seg); err != nil {
		t.Fatalf("update: %v", err)
	}
	got, _ = store.GetSegment(ctx, proj.ID, "beta-users")
	if got.Name != "Beta Testers" {
		t.Errorf("expected Beta Testers, got %s", got.Name)
	}

	segs, err := store.ListSegments(ctx, proj.ID, 50, 0)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(segs) != 1 {
		t.Errorf("expected 1, got %d", len(segs))
	}

	if err := store.DeleteSegment(ctx, seg.ID); err != nil {
		t.Fatalf("delete: %v", err)
	}
}

func TestAPIKey_CRUD(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)
	proj := seedProject(t, store, org.ID)
	env := seedEnv(t, store, proj.ID, org.ID, "dev")

	key := &domain.APIKey{
		EnvID:     env.ID,
		OrgID:     org.ID,
		KeyHash:   "abc123hash",
		KeyPrefix: "fs_srv_abc1",
		Name:      "Dev Key",
		Type:      "server",
	}
	if err := store.CreateAPIKey(ctx, key); err != nil {
		t.Fatalf("create: %v", err)
	}

	got, err := store.GetAPIKeyByHash(ctx, "abc123hash")
	if err != nil {
		t.Fatalf("get by hash: %v", err)
	}
	if got.Name != "Dev Key" {
		t.Errorf("expected Dev Key, got %s", got.Name)
	}

	keys, err := store.ListAPIKeys(ctx, env.ID, 50, 0)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(keys) != 1 {
		t.Errorf("expected 1, got %d", len(keys))
	}

	if err := store.UpdateAPIKeyLastUsed(ctx, key.ID); err != nil {
		t.Fatalf("update last used: %v", err)
	}

	if err := store.RevokeAPIKey(ctx, key.ID); err != nil {
		t.Fatalf("revoke: %v", err)
	}
	_, err = store.GetAPIKeyByHash(ctx, "abc123hash")
	if err == nil {
		t.Error("expected error after revoke")
	}
}

func TestGetEnvironmentByAPIKeyHash(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)
	proj := seedProject(t, store, org.ID)
	env := seedEnv(t, store, proj.ID, org.ID, "production")

	key := &domain.APIKey{
		EnvID: env.ID, OrgID: org.ID, KeyHash: "keyhash999", KeyPrefix: "fs_srv_key9",
		Name: "Prod Key", Type: "server",
	}
	store.CreateAPIKey(ctx, key)

	gotEnv, gotKey, err := store.GetEnvironmentByAPIKeyHash(ctx, "keyhash999")
	if err != nil {
		t.Fatalf("get env by key hash: %v", err)
	}
	if gotEnv.Slug != "production" {
		t.Errorf("expected production, got %s", gotEnv.Slug)
	}
	if gotKey.Name != "Prod Key" {
		t.Errorf("expected Prod Key, got %s", gotKey.Name)
	}
}

func TestLoadRuleset(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)
	proj := seedProject(t, store, org.ID)
	env := seedEnv(t, store, proj.ID, org.ID, "staging")

	flag1 := &domain.Flag{
		ProjectID: proj.ID, OrgID: org.ID, Key: "f1", Name: "Flag 1",
		FlagType: domain.FlagTypeBoolean, DefaultValue: json.RawMessage(`true`), Tags: []string{},
	}
	flag2 := &domain.Flag{
		ProjectID: proj.ID, OrgID: org.ID, Key: "f2", Name: "Flag 2",
		FlagType: domain.FlagTypeString, DefaultValue: json.RawMessage(`"off"`), Tags: []string{},
	}
	store.CreateFlag(ctx, flag1)
	store.CreateFlag(ctx, flag2)

	store.UpsertFlagState(ctx, &domain.FlagState{
		FlagID: flag1.ID, EnvID: env.ID, OrgID: org.ID, Enabled: true, Rules: []domain.TargetingRule{}, PercentageRollout: 10000,
	})

	seg := &domain.Segment{
		ProjectID: proj.ID, OrgID: org.ID, Key: "premium", Name: "Premium", MatchType: "all",
		Rules: []domain.Condition{{Attribute: "plan", Operator: "eq", Values: []string{"pro"}}},
	}
	store.CreateSegment(ctx, seg)

	flags, states, segments, err := store.LoadRuleset(ctx, proj.ID, env.ID)
	if err != nil {
		t.Fatalf("load ruleset: %v", err)
	}
	if len(flags) != 2 {
		t.Errorf("expected 2 flags, got %d", len(flags))
	}
	if len(states) != 1 {
		t.Errorf("expected 1 state, got %d", len(states))
	}
	if len(segments) != 1 {
		t.Errorf("expected 1 segment, got %d", len(segments))
	}
}

func TestAuditLog(t *testing.T) {
	pool := testPool(t)
	cleanup(t, pool)
	store := postgres.NewStore(pool)
	ctx := context.Background()

	org := seedOrg(t, store)
	user := seedUser(t, store, "aud")

	entry := &domain.AuditEntry{
		OrgID:        org.ID,
		ActorID:      &user.ID,
		ActorType:    "user",
		Action:       "flag.created",
		ResourceType: "flag",
		AfterState:   json.RawMessage(`{"key":"test"}`),
	}
	if err := store.CreateAuditEntry(ctx, entry); err != nil {
		t.Fatalf("create: %v", err)
	}

	entries, err := store.ListAuditEntries(ctx, org.ID, 10, 0)
	if err != nil {
		t.Fatalf("list: %v", err)
	}
	if len(entries) != 1 {
		t.Errorf("expected 1, got %d", len(entries))
	}
	if entries[0].Action != "flag.created" {
		t.Errorf("expected flag.created, got %s", entries[0].Action)
	}
}
