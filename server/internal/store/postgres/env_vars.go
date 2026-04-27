package postgres

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"regexp"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/crypto"
	"github.com/featuresignals/server/internal/domain"
)

// secretKeyPattern matches key names that should be treated as secrets.
var secretKeyPattern = regexp.MustCompile(`(?i)_(SECRET|PASSWORD|TOKEN|KEY|SALT|CREDENTIALS)$`)

// EnvVarStore is a domain.EnvVarStore implementation backed by PostgreSQL.
// All values are encrypted at rest using AES-256-GCM.
type EnvVarStore struct {
	pool      *pgxpool.Pool
	masterKey [32]byte
}

// NewEnvVarStore creates a new EnvVarStore with the given connection pool and master key.
// The masterKey must be exactly 32 bytes (for AES-256).
func NewEnvVarStore(pool *pgxpool.Pool, masterKey [32]byte) *EnvVarStore {
	return &EnvVarStore{pool: pool, masterKey: masterKey}
}

func isSecretKey(key string) bool {
	return secretKeyPattern.MatchString(key)
}

// generateID creates a random hex-encoded ID for new env var records.
func generateID() string {
	b := make([]byte, 12)
	if _, err := rand.Read(b); err != nil {
		// Fallback: timestamp-based ID (should never happen on healthy systems)
		return fmt.Sprintf("%x", time.Now().UnixNano())
	}
	return hex.EncodeToString(b)
}

// List returns env vars matching the given filter.
func (s *EnvVarStore) List(ctx context.Context, filter domain.EnvVarFilter) ([]*domain.EnvVar, error) {
	query := `SELECT id, scope, scope_id, key, value_hash, is_secret, created_at, updated_at, updated_by FROM env_vars WHERE 1=1`
	args := []any{}
	argIdx := 1

	if filter.Scope != "" {
		query += fmt.Sprintf(" AND scope = $%d", argIdx)
		args = append(args, filter.Scope)
		argIdx++
	}
	if filter.ScopeID != "" {
		query += fmt.Sprintf(" AND scope_id = $%d", argIdx)
		args = append(args, filter.ScopeID)
		argIdx++
	}
	if filter.Search != "" {
		query += fmt.Sprintf(" AND key ILIKE $%d", argIdx)
		args = append(args, "%"+filter.Search+"%")
		argIdx++
	}
	if filter.Secret != nil {
		query += fmt.Sprintf(" AND is_secret = $%d", argIdx)
		args = append(args, *filter.Secret)
		argIdx++
	}

	query += " ORDER BY scope, scope_id, key"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list env vars: %w", err)
	}
	defer rows.Close()

	result := make([]*domain.EnvVar, 0)
	for rows.Next() {
		var v domain.EnvVar
		if err := rows.Scan(&v.ID, &v.Scope, &v.ScopeID, &v.Key, &v.ValueHash, &v.IsSecret, &v.CreatedAt, &v.UpdatedAt, &v.UpdatedBy); err != nil {
			return nil, fmt.Errorf("scan env var: %w", err)
		}
		// Mask secret values
		if v.IsSecret {
			v.Value = "••••••••"
		}
		result = append(result, &v)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate env vars: %w", err)
	}

	return result, nil
}

// Upsert creates or updates env vars at the given scope. This is idempotent —
// safe to retry on transient failures.
func (s *EnvVarStore) Upsert(ctx context.Context, scope domain.EnvVarScope, scopeID string, vars []domain.EnvVarInput, updatedBy string) error {
	if updatedBy == "" {
		updatedBy = "system"
	}

	for _, v := range vars {
		plaintext := []byte(v.Value)
		encryptedValue, nonce, err := crypto.Encrypt(plaintext, s.masterKey)
		if err != nil {
			return fmt.Errorf("encrypt env var %s: %w", v.Key, err)
		}

		valueHash := crypto.Hash(plaintext)
		secret := isSecretKey(v.Key)
		now := time.Now().UTC()
		id := generateID()

		_, err = s.pool.Exec(ctx, `
			INSERT INTO env_vars (id, scope, scope_id, key, encrypted_value, encryption_nonce, value_hash, is_secret, created_at, updated_at, updated_by)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $9, $10)
			ON CONFLICT (scope, scope_id, key) DO UPDATE SET
				encrypted_value = EXCLUDED.encrypted_value,
				encryption_nonce = EXCLUDED.encryption_nonce,
				value_hash = EXCLUDED.value_hash,
				is_secret = EXCLUDED.is_secret,
				updated_at = EXCLUDED.updated_at,
				updated_by = EXCLUDED.updated_by
		`, id, string(scope), scopeID, v.Key, encryptedValue, nonce, valueHash, secret, now, updatedBy)
		if err != nil {
			return fmt.Errorf("upsert env var %s: %w", v.Key, err)
		}
	}

	return nil
}

// Delete removes an env var by ID. Returns domain.ErrNotFound if the ID does not exist.
func (s *EnvVarStore) Delete(ctx context.Context, id string) error {
	tag, err := s.pool.Exec(ctx, `DELETE FROM env_vars WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("delete env var %s: %w", id, err)
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("env var")
	}
	return nil
}

// GetEffective returns the resolved env vars for a given tenant,
// following the resolution chain: global → region → cell → tenant.
// Higher-priority scopes override lower-priority ones for the same key.
func (s *EnvVarStore) GetEffective(ctx context.Context, tenantID string) ([]*domain.EnvVar, error) {
	// Get tenant's region and cell assignment
	var region, cellID string
	err := s.pool.QueryRow(ctx, `SELECT region, cell_id FROM tenant_region WHERE tenant_id = $1`, tenantID).Scan(&region, &cellID)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			// No tenant_region assigned — just return global env vars
			return s.getEffectiveByScopes(ctx, []domain.EnvVarScope{domain.EnvVarScopeGlobal}, []string{""})
		}
		return nil, fmt.Errorf("lookup tenant region: %w", err)
	}

	scopes := []domain.EnvVarScope{
		domain.EnvVarScopeGlobal,
		domain.EnvVarScopeRegion,
		domain.EnvVarScopeCell,
		domain.EnvVarScopeTenant,
	}
	scopeIDs := []string{
		"",
		region,
		cellID,
		tenantID,
	}

	return s.getEffectiveByScopes(ctx, scopes, scopeIDs)
}

// getEffectiveByScopes resolves env vars across a chain of scopes.
// Scopes are processed in order; later scopes override earlier ones for the same key.
func (s *EnvVarStore) getEffectiveByScopes(ctx context.Context, scopes []domain.EnvVarScope, scopeIDs []string) ([]*domain.EnvVar, error) {
	seen := make(map[string]int) // key → index in result slice
	result := make([]*domain.EnvVar, 0)

	for i, scope := range scopes {
		var sid string
		if i < len(scopeIDs) {
			sid = scopeIDs[i]
		}

		rows, err := s.pool.Query(ctx, `
			SELECT id, scope, scope_id, key, encrypted_value, encryption_nonce, value_hash, is_secret, created_at, updated_at, updated_by
			FROM env_vars
			WHERE scope = $1 AND scope_id = $2
			ORDER BY key
		`, string(scope), sid)
		if err != nil {
			return nil, fmt.Errorf("query env vars for scope %s/%s: %w", scope, sid, err)
		}

		for rows.Next() {
			var v domain.EnvVar
			var encryptedValue, nonce []byte
			if err := rows.Scan(
				&v.ID, &v.Scope, &v.ScopeID, &v.Key,
				&encryptedValue, &nonce,
				&v.ValueHash, &v.IsSecret,
				&v.CreatedAt, &v.UpdatedAt, &v.UpdatedBy,
			); err != nil {
				rows.Close()
				return nil, fmt.Errorf("scan env var: %w", err)
			}

			// Decrypt the value for runtime use
			plaintext, err := crypto.Decrypt(encryptedValue, nonce, s.masterKey)
			if err != nil {
				rows.Close()
				return nil, fmt.Errorf("decrypt env var %s: %w", v.Key, err)
			}
			v.Value = string(plaintext)

			// Annotate with source info
			switch scope {
			case domain.EnvVarScopeGlobal:
				v.Source = "global"
			case domain.EnvVarScopeRegion:
				v.Source = fmt.Sprintf("region (%s)", sid)
			case domain.EnvVarScopeCell:
				v.Source = fmt.Sprintf("cell (%s)", sid)
			case domain.EnvVarScopeTenant:
				v.Source = "tenant"
			}

			if idx, exists := seen[v.Key]; exists {
				// This scope overrides the previous one — replace in-place
				result[idx] = &v
			} else {
				seen[v.Key] = len(result)
				result = append(result, &v)
			}
		}
		rows.Close()
	}

	return result, nil
}

// GetScopes returns all distinct scopes from the env_vars table.
func (s *EnvVarStore) GetScopes(ctx context.Context) ([]string, error) {
	rows, err := s.pool.Query(ctx, `SELECT DISTINCT scope FROM env_vars ORDER BY scope`)
	if err != nil {
		return nil, fmt.Errorf("get scopes: %w", err)
	}
	defer rows.Close()

	result := make([]string, 0)
	for rows.Next() {
		var scope string
		if err := rows.Scan(&scope); err != nil {
			return nil, fmt.Errorf("scan scope: %w", err)
		}
		result = append(result, scope)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate scopes: %w", err)
	}

	return result, nil
}