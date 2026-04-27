package postgres

import (
	"context"

	"os"
	"testing"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/crypto"
	"github.com/featuresignals/server/internal/domain"
)

func testEnvVarStore(t *testing.T) (*EnvVarStore, func()) {
	t.Helper()
	dbURL := os.Getenv("TEST_DATABASE_URL")
	if dbURL == "" {
		t.Skip("TEST_DATABASE_URL not set — skipping postgres integration test")
	}
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()
	pool, err := pgxpool.New(ctx, dbURL)
	if err != nil {
		t.Fatalf("connect to test db: %v", err)
	}

	// Generate a deterministic master key for tests
	var masterKey [32]byte
	for i := range masterKey {
		masterKey[i] = byte(i)
	}

	cleanup := func() {
		ctx := context.Background()
		for _, table := range []string{"env_vars", "tenant_region"} {
			pool.Exec(ctx, "DELETE FROM "+table)
		}
		pool.Close()
	}

	store := NewEnvVarStore(pool, masterKey)
	return store, cleanup
}

func ensureTable(t *testing.T, pool *pgxpool.Pool) {
	t.Helper()
	ctx := context.Background()
	// Create the env_vars table if it doesn't exist (integration test setup)
	_, err := pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS env_vars (
			id TEXT PRIMARY KEY,
			scope TEXT NOT NULL,
			scope_id TEXT NOT NULL DEFAULT '',
			key TEXT NOT NULL,
			encrypted_value BYTEA NOT NULL,
			encryption_nonce BYTEA NOT NULL,
			value_hash TEXT NOT NULL,
			is_secret BOOLEAN NOT NULL DEFAULT false,
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_by TEXT NOT NULL DEFAULT 'system',
			UNIQUE (scope, scope_id, key)
		)
	`)
	if err != nil {
		t.Fatalf("create env_vars table: %v", err)
	}

	_, err = pool.Exec(ctx, `
		CREATE TABLE IF NOT EXISTS tenant_region (
			tenant_id TEXT PRIMARY KEY,
			region TEXT NOT NULL DEFAULT '',
			cell_id TEXT NOT NULL DEFAULT '',
			routing_key TEXT NOT NULL DEFAULT '',
			created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
			updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
		)
	`)
	if err != nil {
		t.Fatalf("create tenant_region table: %v", err)
	}
}

func TestEnvVarStore_UpsertAndList(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	// Upsert global env vars
	input := []domain.EnvVarInput{
		{Key: "DATABASE_URL", Value: "postgres://localhost:5432/db"},
		{Key: "API_KEY", Value: "sk-secret-12345"},
		{Key: "LOG_LEVEL", Value: "debug"},
	}
	err := store.Upsert(ctx, domain.EnvVarScopeGlobal, "", input, "admin@test.com")
	if err != nil {
		t.Fatalf("Upsert() error = %v", err)
	}

	// List all
	vars, err := store.List(ctx, domain.EnvVarFilter{})
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(vars) != 3 {
		t.Fatalf("List() returned %d, want 3", len(vars))
	}

	// Verify secret masking
	for _, v := range vars {
		if v.Key == "API_KEY" {
			if !v.IsSecret {
				t.Error("API_KEY should be marked as secret")
			}
			if v.Value != "••••••••" {
				t.Errorf("API_KEY value should be masked, got %q", v.Value)
			}
		}
		if v.Key == "DATABASE_URL" {
			if v.IsSecret {
				t.Error("DATABASE_URL should NOT be marked as secret")
			}
		}
	}
}

func TestEnvVarStore_Upsert_Idempotent(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	input := []domain.EnvVarInput{{Key: "LOG_LEVEL", Value: "debug"}}

	// Upsert twice — should be idempotent
	if err := store.Upsert(ctx, domain.EnvVarScopeGlobal, "", input, "user1"); err != nil {
		t.Fatalf("first upsert: %v", err)
	}
	if err := store.Upsert(ctx, domain.EnvVarScopeGlobal, "", input, "user2"); err != nil {
		t.Fatalf("second upsert: %v", err)
	}

	vars, err := store.List(ctx, domain.EnvVarFilter{Scope: "global"})
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(vars) != 1 {
		t.Fatalf("expected 1 env var after idempotent upsert, got %d", len(vars))
	}
}

func TestEnvVarStore_Upsert_OverridesValue(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	// Upsert with initial value
	if err := store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{{Key: "FEATURE_FLAG", Value: "false"}}, "admin"); err != nil {
		t.Fatalf("first upsert: %v", err)
	}

	// Upsert with new value
	if err := store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{{Key: "FEATURE_FLAG", Value: "true"}}, "admin"); err != nil {
		t.Fatalf("second upsert: %v", err)
	}

	vars, err := store.List(ctx, domain.EnvVarFilter{})
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(vars) != 1 {
		t.Fatalf("expected 1 env var after override, got %d", len(vars))
	}
}

func TestEnvVarStore_List_FilterByScope(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	// Insert global vars
	store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{{Key: "GLOBAL_KEY", Value: "global"}}, "admin")

	// Insert tenant vars
	store.Upsert(ctx, domain.EnvVarScopeTenant, "tenant-1",
		[]domain.EnvVarInput{{Key: "TENANT_KEY", Value: "tenant1"}}, "admin")

	// Filter by scope
	vars, err := store.List(ctx, domain.EnvVarFilter{Scope: "global"})
	if err != nil {
		t.Fatalf("List(global) error = %v", err)
	}
	if len(vars) != 1 {
		t.Fatalf("expected 1 global var, got %d", len(vars))
	}
	if vars[0].Key != "GLOBAL_KEY" {
		t.Errorf("expected GLOBAL_KEY, got %s", vars[0].Key)
	}
}

func TestEnvVarStore_List_FilterBySearch(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{
			{Key: "DATABASE_URL", Value: "postgres://db"},
			{Key: "REDIS_URL", Value: "redis://cache"},
			{Key: "LOG_LEVEL", Value: "debug"},
		}, "admin")

	vars, err := store.List(ctx, domain.EnvVarFilter{Search: "URL"})
	if err != nil {
		t.Fatalf("List(search=URL) error = %v", err)
	}
	if len(vars) != 2 {
		t.Fatalf("expected 2 vars matching 'URL', got %d", len(vars))
	}
}

func TestEnvVarStore_List_FilterBySecret(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{
			{Key: "LOG_LEVEL", Value: "debug"},
			{Key: "API_SECRET", Value: "s3cr3t"},
			{Key: "DB_PASSWORD", Value: "pass123"},
		}, "admin")

	// Filter secrets only
	secret := true
	vars, err := store.List(ctx, domain.EnvVarFilter{Secret: &secret})
	if err != nil {
		t.Fatalf("List(secret=true) error = %v", err)
	}
	if len(vars) != 2 {
		t.Fatalf("expected 2 secrets, got %d", len(vars))
	}

	// Filter non-secrets only
	notSecret := false
	vars, err = store.List(ctx, domain.EnvVarFilter{Secret: &notSecret})
	if err != nil {
		t.Fatalf("List(secret=false) error = %v", err)
	}
	if len(vars) != 1 {
		t.Fatalf("expected 1 non-secret, got %d", len(vars))
	}
}

func TestEnvVarStore_Delete(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{{Key: "TO_DELETE", Value: "value"}}, "admin")

	vars, _ := store.List(ctx, domain.EnvVarFilter{})
	if len(vars) != 1 {
		t.Fatalf("expected 1 var before delete, got %d", len(vars))
	}

	err := store.Delete(ctx, vars[0].ID)
	if err != nil {
		t.Fatalf("Delete() error = %v", err)
	}

	vars, _ = store.List(ctx, domain.EnvVarFilter{})
	if len(vars) != 0 {
		t.Errorf("expected 0 vars after delete, got %d", len(vars))
	}
}

func TestEnvVarStore_Delete_NotFound(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	err := store.Delete(context.Background(), "nonexistent-id")
	if err != domain.ErrNotFound {
		t.Errorf("Delete(nonexistent) = %v, want ErrNotFound", err)
	}
}

func TestEnvVarStore_GetEffective_GlobalOnly(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	// Insert global vars only
	store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{
			{Key: "DATABASE_URL", Value: "postgres://global/db"},
			{Key: "LOG_LEVEL", Value: "info"},
		}, "admin")

	// Get effective for a tenant with no region assignment
	vars, err := store.GetEffective(ctx, "tenant-no-region")
	if err != nil {
		t.Fatalf("GetEffective() error = %v", err)
	}
	if len(vars) != 2 {
		t.Fatalf("expected 2 effective vars, got %d", len(vars))
	}
	for _, v := range vars {
		if v.Source != "global" {
			t.Errorf("expected source 'global' for %s, got %q", v.Key, v.Source)
		}
	}
}

func TestEnvVarStore_GetEffective_ResolutionChain(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	// Insert global var
	store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{{Key: "DATABASE_URL", Value: "postgres://global/db"}}, "admin")

	// Insert region var
	store.Upsert(ctx, domain.EnvVarScopeRegion, "us-east",
		[]domain.EnvVarInput{{Key: "DATABASE_URL", Value: "postgres://us-east/db"}}, "admin")

	// Insert cell var
	store.Upsert(ctx, domain.EnvVarScopeCell, "cell-1",
		[]domain.EnvVarInput{{Key: "DATABASE_URL", Value: "postgres://cell-1/db"}}, "admin")

	// Insert tenant var
	store.Upsert(ctx, domain.EnvVarScopeTenant, "tenant-42",
		[]domain.EnvVarInput{{Key: "DATABASE_URL", Value: "postgres://tenant-42/db"}}, "admin")

	// Insert a var that only exists at global scope
	store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{{Key: "LOG_LEVEL", Value: "warn"}}, "admin")

	// Register tenant region assignment
	_, err := pool.Exec(ctx, `INSERT INTO tenant_region (tenant_id, region, cell_id) VALUES ($1, $2, $3)`,
		"tenant-42", "us-east", "cell-1")
	if err != nil {
		t.Fatalf("insert tenant_region: %v", err)
	}

	vars, err := store.GetEffective(ctx, "tenant-42")
	if err != nil {
		t.Fatalf("GetEffective() error = %v", err)
	}

	// Should have 2 vars: DATABASE_URL (overridden by tenant) and LOG_LEVEL (from global)
	if len(vars) != 2 {
		t.Fatalf("expected 2 effective vars, got %d: %+v", len(vars), vars)
	}

	for _, v := range vars {
		switch v.Key {
		case "DATABASE_URL":
			if v.Value != "postgres://tenant-42/db" {
				t.Errorf("DATABASE_URL = %q, want 'postgres://tenant-42/db'", v.Value)
			}
			if v.Source != "tenant" {
				t.Errorf("DATABASE_URL source = %q, want 'tenant'", v.Source)
			}
		case "LOG_LEVEL":
			if v.Value != "warn" {
				t.Errorf("LOG_LEVEL = %q, want 'warn'", v.Value)
			}
			if v.Source != "global" {
				t.Errorf("LOG_LEVEL source = %q, want 'global'", v.Source)
			}
		}
	}
}

func TestEnvVarStore_GetEffective_PartialOverride(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	// Global scope has two vars
	store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{
			{Key: "DATABASE_URL", Value: "postgres://global/db"},
			{Key: "REDIS_URL", Value: "redis://global/cache"},
		}, "admin")

	// Tenant scope only overrides DATABASE_URL
	store.Upsert(ctx, domain.EnvVarScopeTenant, "tenant-99",
		[]domain.EnvVarInput{{Key: "DATABASE_URL", Value: "postgres://tenant-99/db"}}, "admin")

	// Register tenant
	_, err := pool.Exec(ctx, `INSERT INTO tenant_region (tenant_id, region, cell_id) VALUES ($1, $2, $3)`,
		"tenant-99", "us-west", "cell-2")
	if err != nil {
		t.Fatalf("insert tenant_region: %v", err)
	}

	vars, err := store.GetEffective(ctx, "tenant-99")
	if err != nil {
		t.Fatalf("GetEffective() error = %v", err)
	}

	if len(vars) != 2 {
		t.Fatalf("expected 2 effective vars, got %d", len(vars))
	}

	for _, v := range vars {
		switch v.Key {
		case "DATABASE_URL":
			if v.Value != "postgres://tenant-99/db" {
				t.Errorf("DATABASE_URL = %q, want overridden tenant value", v.Value)
			}
			if v.Source != "tenant" {
				t.Errorf("DATABASE_URL source = %q, want 'tenant'", v.Source)
			}
		case "REDIS_URL":
			if v.Value != "redis://global/cache" {
				t.Errorf("REDIS_URL = %q, want 'redis://global/cache'", v.Value)
			}
			if v.Source != "global" {
				t.Errorf("REDIS_URL source = %q, want 'global'", v.Source)
			}
		}
	}
}

func TestEnvVarStore_GetEffective_RegionOverridesGlobal(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{
			{Key: "DATABASE_URL", Value: "postgres://global/db"},
			{Key: "LOG_LEVEL", Value: "debug"},
		}, "admin")

	store.Upsert(ctx, domain.EnvVarScopeRegion, "eu-central",
		[]domain.EnvVarInput{
			{Key: "DATABASE_URL", Value: "postgres://eu-central/db"},
		}, "admin")

	// Tenant with region but no cell or tenant-level override
	_, err := pool.Exec(ctx, `INSERT INTO tenant_region (tenant_id, region, cell_id) VALUES ($1, $2, $3)`,
		"tenant-eu", "eu-central", "cell-3")
	if err != nil {
		t.Fatalf("insert tenant_region: %v", err)
	}

	vars, err := store.GetEffective(ctx, "tenant-eu")
	if err != nil {
		t.Fatalf("GetEffective() error = %v", err)
	}

	if len(vars) != 2 {
		t.Fatalf("expected 2 effective vars, got %d", len(vars))
	}

	for _, v := range vars {
		switch v.Key {
		case "DATABASE_URL":
			if v.Value != "postgres://eu-central/db" {
				t.Errorf("DATABASE_URL = %q, want region override", v.Value)
			}
		case "LOG_LEVEL":
			if v.Value != "debug" {
				t.Errorf("LOG_LEVEL = %q, want global value 'debug'", v.Value)
			}
		}
	}
}

func TestEnvVarStore_GetScopes(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	// No scopes yet
	scopes, err := store.GetScopes(ctx)
	if err != nil {
		t.Fatalf("GetScopes() error = %v", err)
	}
	if len(scopes) != 0 {
		t.Errorf("expected 0 scopes initially, got %d", len(scopes))
	}

	// Insert vars at different scopes
	store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{{Key: "K1", Value: "v1"}}, "admin")
	store.Upsert(ctx, domain.EnvVarScopeRegion, "us-east",
		[]domain.EnvVarInput{{Key: "K2", Value: "v2"}}, "admin")
	store.Upsert(ctx, domain.EnvVarScopeTenant, "t1",
		[]domain.EnvVarInput{{Key: "K3", Value: "v3"}}, "admin")

	scopes, err = store.GetScopes(ctx)
	if err != nil {
		t.Fatalf("GetScopes() error = %v", err)
	}
	if len(scopes) != 3 {
		t.Errorf("expected 3 scopes, got %d: %v", len(scopes), scopes)
	}
}

func TestEnvVarStore_SecretDetection(t *testing.T) {
	tests := []struct {
		key      string
		isSecret bool
	}{
		{"API_SECRET", true},
		{"DB_PASSWORD", true},
		{"AUTH_TOKEN", true},
		{"PRIVATE_KEY", true},
		{"ENCRYPTION_SALT", true},
		{"AWS_CREDENTIALS", true},
		{"DATABASE_URL", false},
		{"LOG_LEVEL", false},
		{"FEATURE_FLAG_ENABLED", false},
		{"secret", false}, // doesn't match pattern
		{"my_secret_key", false}, // doesn't end with one of the suffixes
	}

	for _, tt := range tests {
		t.Run(tt.key, func(t *testing.T) {
			got := isSecretKey(tt.key)
			if got != tt.isSecret {
				t.Errorf("isSecretKey(%q) = %v, want %v", tt.key, got, tt.isSecret)
			}
		})
	}
}

func TestEnvVarStore_Upsert_EmptyUpdatedByDefaultsToSystem(t *testing.T) {
	store, cleanup := testEnvVarStore(t)
	defer cleanup()

	pool := store.pool
	ensureTable(t, pool)

	ctx := context.Background()

	err := store.Upsert(ctx, domain.EnvVarScopeGlobal, "",
		[]domain.EnvVarInput{{Key: "SOME_KEY", Value: "value"}}, "")
	if err != nil {
		t.Fatalf("Upsert() with empty updatedBy error = %v", err)
	}

	vars, err := store.List(ctx, domain.EnvVarFilter{})
	if err != nil {
		t.Fatalf("List() error = %v", err)
	}
	if len(vars) != 1 {
		t.Fatalf("expected 1 var, got %d", len(vars))
	}
	if vars[0].UpdatedBy != "system" {
		t.Errorf("updated_by = %q, want 'system'", vars[0].UpdatedBy)
	}
}

func TestEnvVarStore_Encryption_DifferentKeys(t *testing.T) {
	// Verify that env vars encrypted with different master keys produce different ciphertexts
	_ = context.Background()

	// Store with key1
	var key1 [32]byte
	key1[0] = 1
	store1 := NewEnvVarStore(nil, key1)

	// Store with key2
	var key2 [32]byte
	key2[0] = 2
	store2 := NewEnvVarStore(nil, key2)

	plaintext := []byte("sensitive-value")
	c1, n1, err := crypto.Encrypt(plaintext, store1.masterKey)
	if err != nil {
		t.Fatalf("Encrypt with key1: %v", err)
	}
	c2, _, err := crypto.Encrypt(plaintext, store2.masterKey)
	if err != nil {
		t.Fatalf("Encrypt with key2: %v", err)
	}

	if string(c1) == string(c2) {
		t.Error("ciphertexts should differ with different keys")
	}

	// Verify decryption works with matching key
	got1, err := crypto.Decrypt(c1, n1, store1.masterKey)
	if err != nil {
		t.Fatalf("Decrypt with matching key: %v", err)
	}
	if string(got1) != string(plaintext) {
		t.Errorf("Decrypt with matching key = %q, want %q", got1, plaintext)
	}

	// Verify decryption fails with wrong key
	_, err = crypto.Decrypt(c1, n1, store2.masterKey)
	if err == nil {
		t.Error("Decrypt with wrong key should error")
	}
}