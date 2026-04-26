package postgres

import (
	"context"
	"crypto/sha256"
	_ "embed"
	"encoding/hex"
	"fmt"
	"log/slog"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/domain"
)

//go:embed migrations/tenant_template.sql
var tenantTemplateSQL string

//go:embed migrations/tenant_template_indexes.sql
var tenantTemplateIndexesSQL string

// TenantStore implements domain.TenantRegistry over PostgreSQL.
// All tenant-scoped operations use the public schema; the tenant's own
// schema is created at registration time and provides natural data isolation.
type TenantStore struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

// NewTenantStore creates a TenantStore. The pool must be connected to the
// shared database; tenant schemas are managed inside it.
func NewTenantStore(pool *pgxpool.Pool, logger *slog.Logger) *TenantStore {
	return &TenantStore{pool: pool, logger: logger}
}

// Register creates a new tenant: inserts into public.tenants, creates the
// tenant's PostgreSQL schema, and runs the template migrations — all in a
// single transaction. If any step fails, the transaction rolls back.
func (s *TenantStore) Register(ctx context.Context, t *domain.Tenant) error {
	logger := s.logger.With(
		"tenant_id", t.ID,
		"tenant_name", t.Name,
		"schema", t.Schema,
	)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin register tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// 1. Insert into public.tenants
	_, err = tx.Exec(ctx,
		`INSERT INTO public.tenants (id, name, slug, schema, tier, status, cell_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)`,
		t.ID, t.Name, t.Slug, t.Schema, t.Tier, t.Status, t.CellID,
	)
	if err != nil {
		return wrapConflict(fmt.Errorf("insert tenant: %w", err), "tenant")
	}

	// 2. Create the tenant's schema
	_, err = tx.Exec(ctx, fmt.Sprintf("CREATE SCHEMA IF NOT EXISTS %s", pqQuoteIdent(t.Schema)))
	if err != nil {
		return fmt.Errorf("create schema %s: %w", t.Schema, err)
	}

	// 3. Run template SQL scoped to the new schema
	schemaSQL := replaceSchemaPlaceholder(tenantTemplateSQL, t.Schema)
	_, err = tx.Exec(ctx, schemaSQL)
	if err != nil {
		return fmt.Errorf("apply tenant template for %s: %w", t.Schema, err)
	}

	// 4. Run template indexes
	indexSQL := replaceSchemaPlaceholder(tenantTemplateIndexesSQL, t.Schema)
	_, err = tx.Exec(ctx, indexSQL)
	if err != nil {
		return fmt.Errorf("apply tenant indexes for %s: %w", t.Schema, err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit register tx: %w", err)
	}

	logger.Info("tenant registered", "tier", t.Tier)
	return nil
}

// LookupByKey resolves a tenant from a SHA-256-hashed API key.
// JOINs api_keys → tenants in the public schema. This is on the evaluation
// hot path — the query is a simple indexed lookup.
func (s *TenantStore) LookupByKey(ctx context.Context, apiKeyHash string) (*domain.Tenant, error) {
	t := &domain.Tenant{}
	err := s.pool.QueryRow(ctx,
		`SELECT t.id, t.name, t.slug, t.schema, t.tier, t.status, t.cell_id, t.created_at, t.updated_at
			 FROM public.tenants t
			 INNER JOIN public.tenant_api_keys ak ON ak.tenant_id = t.id
			 WHERE ak.key_hash = $1
			   AND ak.revoked_at IS NULL`,
		apiKeyHash,
	).Scan(&t.ID, &t.Name, &t.Slug, &t.Schema, &t.Tier, &t.Status, &t.CellID, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "tenant api key")
	}
	return t, nil
}

// LookupByID returns a tenant by its primary key.
func (s *TenantStore) LookupByID(ctx context.Context, tenantID string) (*domain.Tenant, error) {
	t := &domain.Tenant{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, name, slug, schema, tier, status, cell_id, created_at, updated_at
		 FROM public.tenants WHERE id = $1`, tenantID,
	).Scan(&t.ID, &t.Name, &t.Slug, &t.Schema, &t.Tier, &t.Status, &t.CellID, &t.CreatedAt, &t.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "tenant")
	}
	return t, nil
}

// List returns a paginated, filterable list of tenants.
// Returns the slice and the total count (ignoring limit/offset for the count).
func (s *TenantStore) List(ctx context.Context, filter domain.TenantFilter) ([]*domain.Tenant, int, error) {
	// Build dynamic WHERE clause from filter fields.
	var conditions []string
	var args []interface{}
	argIdx := 1

	if filter.Search != "" {
		conditions = append(conditions, fmt.Sprintf(
			"(name ILIKE $%d OR slug ILIKE $%d)", argIdx, argIdx,
		))
		args = append(args, "%"+filter.Search+"%")
		argIdx++
	}
	if filter.Tier != "" {
		conditions = append(conditions, fmt.Sprintf("tier = $%d", argIdx))
		args = append(args, filter.Tier)
		argIdx++
	}
	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.CellID != "" {
		conditions = append(conditions, fmt.Sprintf("cell_id = $%d", argIdx))
		args = append(args, filter.CellID)
		argIdx++
	}

	whereClause := ""
	if len(conditions) > 0 {
		whereClause = "WHERE " + strings.Join(conditions, " AND ")
	}

	// Count query
	var total int
	countQuery := fmt.Sprintf("SELECT COUNT(*) FROM public.tenants %s", whereClause)
	err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total)
	if err != nil {
		return nil, 0, fmt.Errorf("count tenants: %w", err)
	}

	// Apply defaults
	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}
	offset := filter.Offset
	if offset < 0 {
		offset = 0
	}

	args = append(args, limit, offset)
	dataQuery := fmt.Sprintf(
		`SELECT id, name, slug, schema, tier, status, cell_id, created_at, updated_at
		 FROM public.tenants %s ORDER BY created_at DESC LIMIT $%d OFFSET $%d`,
		whereClause, argIdx, argIdx+1,
	)

	rows, err := s.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("list tenants: %w", err)
	}
	defer rows.Close()

	tenants := make([]*domain.Tenant, 0, limit)
	for rows.Next() {
		t := &domain.Tenant{}
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Schema, &t.Tier, &t.Status, &t.CellID, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, 0, fmt.Errorf("scan tenant: %w", err)
		}
		tenants = append(tenants, t)
	}
	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("iterate tenants: %w", err)
	}

	return tenants, total, nil
}

// UpdateStatus changes a tenant's status. Valid transitions:
//   active ↔ suspended → decommissioned
func (s *TenantStore) UpdateStatus(ctx context.Context, tenantID, status string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE public.tenants SET status = $1, updated_at = NOW() WHERE id = $2`,
		status, tenantID,
	)
	if err != nil {
		return fmt.Errorf("update tenant status: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("tenant")
	}
	s.logger.Info("tenant status updated", "tenant_id", tenantID, "status", status)
	return nil
}

// Decommission irreversibly removes a tenant: drops its schema, deletes from
// public.tenants, and revokes all API keys. This is a destructive operation
// and should only be called after the tenant has been fully drained.
func (s *TenantStore) Decommission(ctx context.Context, tenantID string) error {
	logger := s.logger.With("tenant_id", tenantID)

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin decommission tx: %w", err)
	}
	defer tx.Rollback(ctx)

	// Fetch the schema name before deleting the tenant record.
	var schemaName string
	err = tx.QueryRow(ctx,
		`SELECT schema FROM public.tenants WHERE id = $1`, tenantID,
	).Scan(&schemaName)
	if err != nil {
		return wrapNotFound(fmt.Errorf("lookup tenant for decommission: %w", err), "tenant")
	}

	// Revoke all API keys for this tenant.
	_, err = tx.Exec(ctx,
		`UPDATE public.tenant_api_keys SET revoked_at = NOW() WHERE tenant_id = $1 AND revoked_at IS NULL`,
		tenantID,
	)
	if err != nil {
		return fmt.Errorf("revoke tenant api keys: %w", err)
	}

	// Drop the tenant's schema.
	_, err = tx.Exec(ctx, fmt.Sprintf("DROP SCHEMA IF EXISTS %s CASCADE", pqQuoteIdent(schemaName)))
	if err != nil {
		return fmt.Errorf("drop schema %s: %w", schemaName, err)
	}

	// Remove the tenant record.
	_, err = tx.Exec(ctx,
		`DELETE FROM public.tenants WHERE id = $1`, tenantID,
	)
	if err != nil {
		return fmt.Errorf("delete tenant: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("commit decommission tx: %w", err)
	}

	logger.Info("tenant decommissioned", "schema", schemaName)
	return nil
}

// AssignCell assigns a tenant to a specific cell by updating its cell_id.
func (s *TenantStore) AssignCell(ctx context.Context, tenantID, cellID string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE public.tenants SET cell_id = $1, updated_at = NOW() WHERE id = $2`,
		cellID, tenantID,
	)
	if err != nil {
		return fmt.Errorf("assign tenant to cell: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("tenant")
	}
	s.logger.Info("tenant assigned to cell", "tenant_id", tenantID, "cell_id", cellID)
	return nil
}

// LookupByCell returns all tenants assigned to the given cell.
func (s *TenantStore) LookupByCell(ctx context.Context, cellID string) ([]*domain.Tenant, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, name, slug, schema, tier, status, cell_id, created_at, updated_at
		 FROM public.tenants WHERE cell_id = $1
		 ORDER BY created_at DESC`, cellID,
	)
	if err != nil {
		return nil, fmt.Errorf("lookup tenants by cell: %w", err)
	}
	defer rows.Close()

	tenants := make([]*domain.Tenant, 0)
	for rows.Next() {
		t := &domain.Tenant{}
		if err := rows.Scan(&t.ID, &t.Name, &t.Slug, &t.Schema, &t.Tier, &t.Status, &t.CellID, &t.CreatedAt, &t.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan tenant: %w", err)
		}
		tenants = append(tenants, t)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate tenants: %w", err)
	}
	return tenants, nil
}

// GetCellWithFewestTenants returns the cell with the fewest assigned tenants.
// Useful for balanced tenant placement when provisioning new tenants.
func (s *TenantStore) GetCellWithFewestTenants(ctx context.Context) (*domain.Cell, error) {
	cell := &domain.Cell{}
	var cpuTotal, cpuUsed, memTotal, memUsed, diskTotal, diskUsed float64

	err := s.pool.QueryRow(ctx,
		`SELECT c.id, c.name, c.provider, c.region, c.status, c.version, c.tenant_count,
		        c.provider_server_id, c.public_ip, c.private_ip,
		        c.cpu_total, c.cpu_used, c.mem_total, c.mem_used, c.disk_total, c.disk_used,
		        c.created_at, c.updated_at
		 FROM public.cells c
		 LEFT JOIN public.tenants t ON t.cell_id = c.id
		 WHERE c.status = 'running'
		 GROUP BY c.id
		 ORDER BY COUNT(t.id) ASC, c.tenant_count ASC
		 LIMIT 1`,
	).Scan(
		&cell.ID, &cell.Name, &cell.Provider, &cell.Region,
		&cell.Status, &cell.Version, &cell.TenantCount,
		&cell.ProviderServerID, &cell.PublicIP, &cell.PrivateIP,
		&cpuTotal, &cpuUsed, &memTotal, &memUsed, &diskTotal, &diskUsed,
		&cell.CreatedAt, &cell.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(fmt.Errorf("get cell with fewest tenants: %w", err), "cell")
	}

	cell.CPU = domain.ResourceUsage{
		Total:     cpuTotal,
		Used:      cpuUsed,
		Available: cpuTotal - cpuUsed,
		Percent:   safePercent(cpuUsed, cpuTotal),
	}
	cell.Memory = domain.ResourceUsage{
		Total:     memTotal,
		Used:      memUsed,
		Available: memTotal - memUsed,
		Percent:   safePercent(memUsed, memTotal),
	}
	cell.Disk = domain.ResourceUsage{
		Total:     diskTotal,
		Used:      diskUsed,
		Available: diskTotal - diskUsed,
		Percent:   safePercent(diskUsed, diskTotal),
	}

	return cell, nil
}

// CreateAPIKey registers a new tenant-level API key in the public schema.
func (s *TenantStore) CreateAPIKey(ctx context.Context, key *domain.TenantAPIKey) error {
	err := s.pool.QueryRow(ctx,
		`INSERT INTO public.tenant_api_keys (id, tenant_id, key_prefix, key_hash, label)
		 VALUES ($1, $2, $3, $4, $5)
		 RETURNING created_at`,
		key.ID, key.TenantID, key.KeyPrefix, key.KeyHash, key.Label,
	).Scan(&key.CreatedAt)
	return wrapConflict(fmt.Errorf("create tenant api key: %w", err), "tenant api key")
}

// RevokeAPIKey soft-deletes a tenant-level API key by setting revoked_at.
func (s *TenantStore) RevokeAPIKey(ctx context.Context, keyID string) error {
	tag, err := s.pool.Exec(ctx,
		`UPDATE public.tenant_api_keys SET revoked_at = NOW() WHERE id = $1 AND revoked_at IS NULL`,
		keyID,
	)
	if err != nil {
		return fmt.Errorf("revoke tenant api key: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return domain.WrapNotFound("tenant api key")
	}
	return nil
}

// ListAPIKeys returns all non-revoked API keys for a tenant, ordered by
// creation date descending.
func (s *TenantStore) ListAPIKeys(ctx context.Context, tenantID string) ([]*domain.TenantAPIKey, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, tenant_id, key_prefix, key_hash, label, last_used_at, created_at
			 FROM public.tenant_api_keys
			 WHERE tenant_id = $1 AND revoked_at IS NULL
			 ORDER BY created_at DESC`, tenantID,
	)
	if err != nil {
		return nil, fmt.Errorf("list tenant api keys: %w", err)
	}
	defer rows.Close()

	keys := make([]*domain.TenantAPIKey, 0)
	for rows.Next() {
		k := &domain.TenantAPIKey{}
		if err := rows.Scan(&k.ID, &k.TenantID, &k.KeyPrefix, &k.KeyHash, &k.Label, &k.LastUsedAt, &k.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan tenant api key: %w", err)
		}
		keys = append(keys, k)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate tenant api keys: %w", err)
	}
	return keys, nil
}

// --- Helpers ---

// HashAPIKey creates a SHA-256 hex digest of a raw API key string.
// This is the standard hashing mechanism for tenant-level API keys.
func HashAPIKey(rawKey string) string {
	h := sha256.Sum256([]byte(rawKey))
	return hex.EncodeToString(h[:])
}

// pqQuoteIdent safely quotes a PostgreSQL identifier, preventing SQL injection
// in schema names and other identifiers. Uses the same double-quote escaping
// as PostgreSQL's quote_ident.
func pqQuoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

// replaceSchemaPlaceholder replaces __SCHEMA__ placeholders in template SQL
// with the actual schema name. This allows template SQL to be run against
// a specific tenant schema via SET search_path.
func replaceSchemaPlaceholder(tmpl, schema string) string {
	return strings.ReplaceAll(tmpl, "__SCHEMA__", schema)
}

