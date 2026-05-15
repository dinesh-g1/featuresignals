// Package postgres implements Code2FlagReader and Code2FlagWriter for PostgreSQL using pgx.
//
// The Code2FlagStore maps to the scan_results, generated_flags, and cleanup_queue
// tables created in migration 000108. All queries enforce tenant isolation (org_id)
// and use parameterized queries exclusively.
package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Compile-time interface checks ─────────────────────────────────────────

var _ domain.Code2FlagReader = (*Code2FlagStore)(nil)
var _ domain.Code2FlagWriter = (*Code2FlagStore)(nil)

// ─── Code2FlagStore ────────────────────────────────────────────────────────

// Code2FlagStore implements domain.Code2FlagReader and domain.Code2FlagWriter
// against PostgreSQL. It is a standalone store (like JanitorStore) rather than
// embedding in the main Store aggregate, keeping the Code2Flag surface area
// independently testable and deployable.
type Code2FlagStore struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

// NewCode2FlagStore creates a new Code2FlagStore backed by the given connection pool.
func NewCode2FlagStore(pool *pgxpool.Pool, logger *slog.Logger) *Code2FlagStore {
	return &Code2FlagStore{pool: pool, logger: logger}
}

// ─── Column allowlists for dynamic UPDATE operations ───────────────────────
//
// These prevent SQL injection via column name interpolation in Update* methods.
// Only columns in these allowlists may appear as keys in the updates map.

var scanResultUpdateColumns = map[string]bool{
	"status":              true,
	"confidence":          true,
	"suggested_flag_key":  true,
	"suggested_flag_name": true,
	"conditional_text":    true,
	"conditional_type":    true,
}

var generatedFlagUpdateColumns = map[string]bool{
	"status":       true,
	"pr_url":       true,
	"description":  true,
	"flag_type":    true,
}

var cleanupEntryUpdateColumns = map[string]bool{
	"status":                true,
	"pr_url":               true,
	"reason":               true,
	"days_since_100_percent": true,
}

// ─── ScanResult: Read Methods ──────────────────────────────────────────────

// ListScanResults returns scan results for a project, filtered and paginated.
func (s *Code2FlagStore) ListScanResults(ctx context.Context, orgID, projectID string, filter domain.ScanResultFilter, limit, offset int) ([]domain.ScanResult, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	var conditions []string
	args := []interface{}{orgID, projectID}
	argIdx := 3

	conditions = append(conditions, "org_id = $1")
	conditions = append(conditions, "project_id = $2")

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.Repository != "" {
		conditions = append(conditions, fmt.Sprintf("repository = $%d", argIdx))
		args = append(args, filter.Repository)
		argIdx++
	}
	if filter.MinConfidence > 0 {
		conditions = append(conditions, fmt.Sprintf("confidence >= $%d", argIdx))
		args = append(args, filter.MinConfidence)
		argIdx++
	}
	if filter.ScanJobID != "" {
		conditions = append(conditions, fmt.Sprintf("scan_job_id = $%d", argIdx))
		args = append(args, filter.ScanJobID)
		argIdx++
	}

	whereClause := strings.Join(conditions, " AND ")

	query := fmt.Sprintf(
		`SELECT id, org_id, project_id, repository, file_path, line_number,
		        conditional_type, conditional_text, confidence, status,
		        suggested_flag_key, suggested_flag_name, scan_job_id,
		        created_at, updated_at
		 FROM scan_results WHERE %s
		 ORDER BY created_at DESC
		 LIMIT $%d OFFSET $%d`,
		whereClause, argIdx, argIdx+1,
	)
	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("code2flag ListScanResults: %w", err)
	}
	defer rows.Close()

	var results []domain.ScanResult
	for rows.Next() {
		var sr domain.ScanResult
		if err := rows.Scan(
			&sr.ID, &sr.OrgID, &sr.ProjectID, &sr.Repository, &sr.FilePath,
			&sr.LineNumber, &sr.ConditionalType, &sr.ConditionalText,
			&sr.Confidence, &sr.Status, &sr.SuggestedFlagKey,
			&sr.SuggestedFlagName, &sr.ScanJobID, &sr.CreatedAt, &sr.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("code2flag ListScanResults scan: %w", err)
		}
		results = append(results, sr)
	}
	if results == nil {
		results = []domain.ScanResult{}
	}
	return results, rows.Err()
}

// CountScanResults returns the total count of scan results matching the filter.
func (s *Code2FlagStore) CountScanResults(ctx context.Context, orgID, projectID string, filter domain.ScanResultFilter) (int, error) {
	var conditions []string
	args := []interface{}{orgID, projectID}
	argIdx := 3

	conditions = append(conditions, "org_id = $1")
	conditions = append(conditions, "project_id = $2")

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.Repository != "" {
		conditions = append(conditions, fmt.Sprintf("repository = $%d", argIdx))
		args = append(args, filter.Repository)
		argIdx++
	}
	if filter.MinConfidence > 0 {
		conditions = append(conditions, fmt.Sprintf("confidence >= $%d", argIdx))
		args = append(args, filter.MinConfidence)
		argIdx++
	}
	if filter.ScanJobID != "" {
		conditions = append(conditions, fmt.Sprintf("scan_job_id = $%d", argIdx))
		args = append(args, filter.ScanJobID)
		argIdx++
	}

	whereClause := strings.Join(conditions, " AND ")
	query := fmt.Sprintf("SELECT COUNT(*) FROM scan_results WHERE %s", whereClause)

	var count int
	err := s.pool.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("code2flag CountScanResults: %w", err)
	}
	return count, nil
}

// GetScanResult retrieves a single scan result by ID.
func (s *Code2FlagStore) GetScanResult(ctx context.Context, id string) (*domain.ScanResult, error) {
	query := `SELECT id, org_id, project_id, repository, file_path, line_number,
		        conditional_type, conditional_text, confidence, status,
		        suggested_flag_key, suggested_flag_name, scan_job_id,
		        created_at, updated_at
		 FROM scan_results WHERE id = $1`

	var sr domain.ScanResult
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&sr.ID, &sr.OrgID, &sr.ProjectID, &sr.Repository, &sr.FilePath,
		&sr.LineNumber, &sr.ConditionalType, &sr.ConditionalText,
		&sr.Confidence, &sr.Status, &sr.SuggestedFlagKey,
		&sr.SuggestedFlagName, &sr.ScanJobID, &sr.CreatedAt, &sr.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "scan_result")
	}
	return &sr, nil
}

// ─── ScanResult: Write Methods ─────────────────────────────────────────────

// CreateScanResult inserts a single scan result.
func (s *Code2FlagStore) CreateScanResult(ctx context.Context, sr *domain.ScanResult) error {
	query := `INSERT INTO scan_results (org_id, project_id, repository, file_path,
		        line_number, conditional_type, conditional_text, confidence, status,
		        suggested_flag_key, suggested_flag_name, scan_job_id)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		 RETURNING id, created_at, updated_at`

	err := s.pool.QueryRow(ctx, query,
		sr.OrgID, sr.ProjectID, sr.Repository, sr.FilePath,
		sr.LineNumber, sr.ConditionalType, sr.ConditionalText,
		sr.Confidence, sr.Status, sr.SuggestedFlagKey,
		sr.SuggestedFlagName, sr.ScanJobID,
	).Scan(&sr.ID, &sr.CreatedAt, &sr.UpdatedAt)
	if err != nil {
		return fmt.Errorf("code2flag CreateScanResult: %w", err)
	}
	return nil
}

// BatchCreateScanResults inserts multiple scan results in a single transaction.
func (s *Code2FlagStore) BatchCreateScanResults(ctx context.Context, results []domain.ScanResult) error {
	if len(results) == 0 {
		return nil
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("code2flag BatchCreateScanResults begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	for i := range results {
		query := `INSERT INTO scan_results (org_id, project_id, repository, file_path,
			        line_number, conditional_type, conditional_text, confidence, status,
			        suggested_flag_key, suggested_flag_name, scan_job_id)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
			 RETURNING id, created_at, updated_at`

		err := tx.QueryRow(ctx, query,
			results[i].OrgID, results[i].ProjectID, results[i].Repository, results[i].FilePath,
			results[i].LineNumber, results[i].ConditionalType, results[i].ConditionalText,
			results[i].Confidence, results[i].Status, results[i].SuggestedFlagKey,
			results[i].SuggestedFlagName, results[i].ScanJobID,
		).Scan(&results[i].ID, &results[i].CreatedAt, &results[i].UpdatedAt)
		if err != nil {
			return fmt.Errorf("code2flag BatchCreateScanResults row %d: %w", i, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("code2flag BatchCreateScanResults commit: %w", err)
	}
	return nil
}

// UpdateScanResult updates specific columns of a scan result.
// Only keys in scanResultUpdateColumns are permitted.
func (s *Code2FlagStore) UpdateScanResult(ctx context.Context, id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	var setClauses []string
	args := []interface{}{id}
	argIdx := 2

	for key, val := range updates {
		if !scanResultUpdateColumns[key] {
			return fmt.Errorf("code2flag UpdateScanResult: column %q is not allowed for update", key)
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIdx))
		args = append(args, val)
		argIdx++
	}

	query := fmt.Sprintf("UPDATE scan_results SET %s, updated_at = NOW() WHERE id = $1",
		strings.Join(setClauses, ", "))

	result, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("code2flag UpdateScanResult: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("scan_result")
	}
	return nil
}

// ─── GeneratedFlag: Read Methods ───────────────────────────────────────────

// ListGeneratedFlags returns generated flags for a project, paginated.
func (s *Code2FlagStore) ListGeneratedFlags(ctx context.Context, orgID, projectID string, limit, offset int) ([]domain.GeneratedFlag, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	query := `SELECT id, org_id, project_id, key, name, description, flag_type,
		        proposed_variants, source_scan_result_id, pr_url, status,
		        created_at, updated_at
		 FROM generated_flags WHERE org_id = $1 AND project_id = $2
		 ORDER BY created_at DESC
		 LIMIT $3 OFFSET $4`

	rows, err := s.pool.Query(ctx, query, orgID, projectID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("code2flag ListGeneratedFlags: %w", err)
	}
	defer rows.Close()

	var flags []domain.GeneratedFlag
	for rows.Next() {
		var gf domain.GeneratedFlag
		if err := rows.Scan(
			&gf.ID, &gf.OrgID, &gf.ProjectID, &gf.Key, &gf.Name,
			&gf.Description, &gf.FlagType, &gf.ProposedVariants,
			&gf.SourceScanResultID, &gf.PRURL, &gf.Status,
			&gf.CreatedAt, &gf.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("code2flag ListGeneratedFlags scan: %w", err)
		}
		flags = append(flags, gf)
	}
	if flags == nil {
		flags = []domain.GeneratedFlag{}
	}
	return flags, rows.Err()
}

// CountGeneratedFlags returns the total number of generated flags for a project.
func (s *Code2FlagStore) CountGeneratedFlags(ctx context.Context, orgID, projectID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM generated_flags WHERE org_id = $1 AND project_id = $2`,
		orgID, projectID,
	).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("code2flag CountGeneratedFlags: %w", err)
	}
	return count, nil
}

// GetGeneratedFlag retrieves a single generated flag by ID.
func (s *Code2FlagStore) GetGeneratedFlag(ctx context.Context, id string) (*domain.GeneratedFlag, error) {
	query := `SELECT id, org_id, project_id, key, name, description, flag_type,
		        proposed_variants, source_scan_result_id, pr_url, status,
		        created_at, updated_at
		 FROM generated_flags WHERE id = $1`

	var gf domain.GeneratedFlag
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&gf.ID, &gf.OrgID, &gf.ProjectID, &gf.Key, &gf.Name,
		&gf.Description, &gf.FlagType, &gf.ProposedVariants,
		&gf.SourceScanResultID, &gf.PRURL, &gf.Status,
		&gf.CreatedAt, &gf.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "generated_flag")
	}
	return &gf, nil
}

// ─── GeneratedFlag: Write Methods ──────────────────────────────────────────

// CreateGeneratedFlag inserts a new generated flag.
func (s *Code2FlagStore) CreateGeneratedFlag(ctx context.Context, gf *domain.GeneratedFlag) error {
	// Default proposed_variants to empty JSON array if nil.
	variants := gf.ProposedVariants
	if len(variants) == 0 {
		variants = json.RawMessage("[]")
	}

	query := `INSERT INTO generated_flags (org_id, project_id, key, name, description,
		        flag_type, proposed_variants, source_scan_result_id, pr_url, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 RETURNING id, created_at, updated_at`

	err := s.pool.QueryRow(ctx, query,
		gf.OrgID, gf.ProjectID, gf.Key, gf.Name, gf.Description,
		gf.FlagType, variants, gf.SourceScanResultID, gf.PRURL, gf.Status,
	).Scan(&gf.ID, &gf.CreatedAt, &gf.UpdatedAt)
	if err != nil {
		return wrapConflict(fmt.Errorf("code2flag CreateGeneratedFlag: %w", err), "generated_flag")
	}
	return nil
}

// UpdateGeneratedFlag updates specific columns of a generated flag.
// Only keys in generatedFlagUpdateColumns are permitted.
func (s *Code2FlagStore) UpdateGeneratedFlag(ctx context.Context, id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	var setClauses []string
	args := []interface{}{id}
	argIdx := 2

	for key, val := range updates {
		if !generatedFlagUpdateColumns[key] {
			return fmt.Errorf("code2flag UpdateGeneratedFlag: column %q is not allowed for update", key)
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIdx))
		args = append(args, val)
		argIdx++
	}

	query := fmt.Sprintf("UPDATE generated_flags SET %s, updated_at = NOW() WHERE id = $1",
		strings.Join(setClauses, ", "))

	result, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("code2flag UpdateGeneratedFlag: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("generated_flag")
	}
	return nil
}

// ─── CleanupEntry: Read Methods ────────────────────────────────────────────

// ListCleanupEntries returns cleanup queue entries for an org, filtered and paginated.
func (s *Code2FlagStore) ListCleanupEntries(ctx context.Context, orgID string, filter domain.CleanupFilter, limit, offset int) ([]domain.CleanupEntry, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	var conditions []string
	args := []interface{}{orgID}
	argIdx := 2

	conditions = append(conditions, "org_id = $1")

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.Reason != "" {
		conditions = append(conditions, fmt.Sprintf("reason = $%d", argIdx))
		args = append(args, filter.Reason)
		argIdx++
	}

	whereClause := strings.Join(conditions, " AND ")

	query := fmt.Sprintf(
		`SELECT id, org_id, flag_id, flag_key, reason, days_since_100_percent,
		        pr_url, status, created_at, updated_at
		 FROM cleanup_queue WHERE %s
		 ORDER BY created_at DESC
		 LIMIT $%d OFFSET $%d`,
		whereClause, argIdx, argIdx+1,
	)
	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("code2flag ListCleanupEntries: %w", err)
	}
	defer rows.Close()

	var entries []domain.CleanupEntry
	for rows.Next() {
		var ce domain.CleanupEntry
		if err := rows.Scan(
			&ce.ID, &ce.OrgID, &ce.FlagID, &ce.FlagKey, &ce.Reason,
			&ce.DaysSince100Percent, &ce.PRURL, &ce.Status,
			&ce.CreatedAt, &ce.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("code2flag ListCleanupEntries scan: %w", err)
		}
		entries = append(entries, ce)
	}
	if entries == nil {
		entries = []domain.CleanupEntry{}
	}
	return entries, rows.Err()
}

// CountCleanupEntries returns the total count of cleanup entries matching the filter.
func (s *Code2FlagStore) CountCleanupEntries(ctx context.Context, orgID string, filter domain.CleanupFilter) (int, error) {
	var conditions []string
	args := []interface{}{orgID}
	argIdx := 2

	conditions = append(conditions, "org_id = $1")

	if filter.Status != "" {
		conditions = append(conditions, fmt.Sprintf("status = $%d", argIdx))
		args = append(args, filter.Status)
		argIdx++
	}
	if filter.Reason != "" {
		conditions = append(conditions, fmt.Sprintf("reason = $%d", argIdx))
		args = append(args, filter.Reason)
		argIdx++
	}

	whereClause := strings.Join(conditions, " AND ")
	query := fmt.Sprintf("SELECT COUNT(*) FROM cleanup_queue WHERE %s", whereClause)

	var count int
	err := s.pool.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("code2flag CountCleanupEntries: %w", err)
	}
	return count, nil
}

// GetCleanupEntry retrieves a single cleanup entry by ID.
func (s *Code2FlagStore) GetCleanupEntry(ctx context.Context, id string) (*domain.CleanupEntry, error) {
	query := `SELECT id, org_id, flag_id, flag_key, reason, days_since_100_percent,
		        pr_url, status, created_at, updated_at
		 FROM cleanup_queue WHERE id = $1`

	var ce domain.CleanupEntry
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&ce.ID, &ce.OrgID, &ce.FlagID, &ce.FlagKey, &ce.Reason,
		&ce.DaysSince100Percent, &ce.PRURL, &ce.Status,
		&ce.CreatedAt, &ce.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "cleanup_entry")
	}
	return &ce, nil
}

// ─── CleanupEntry: Write Methods ───────────────────────────────────────────

// CreateCleanupEntry inserts a new cleanup queue entry.
func (s *Code2FlagStore) CreateCleanupEntry(ctx context.Context, ce *domain.CleanupEntry) error {
	query := `INSERT INTO cleanup_queue (org_id, flag_id, flag_key, reason,
		        days_since_100_percent, pr_url, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at, updated_at`

	err := s.pool.QueryRow(ctx, query,
		ce.OrgID, ce.FlagID, ce.FlagKey, ce.Reason,
		ce.DaysSince100Percent, ce.PRURL, ce.Status,
	).Scan(&ce.ID, &ce.CreatedAt, &ce.UpdatedAt)
	if err != nil {
		return wrapConflict(fmt.Errorf("code2flag CreateCleanupEntry: %w", err), "cleanup_entry")
	}
	return nil
}

// UpdateCleanupEntry updates specific columns of a cleanup entry.
// Only keys in cleanupEntryUpdateColumns are permitted.
func (s *Code2FlagStore) UpdateCleanupEntry(ctx context.Context, id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	var setClauses []string
	args := []interface{}{id}
	argIdx := 2

	for key, val := range updates {
		if !cleanupEntryUpdateColumns[key] {
			return fmt.Errorf("code2flag UpdateCleanupEntry: column %q is not allowed for update", key)
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIdx))
		args = append(args, val)
		argIdx++
	}

	query := fmt.Sprintf("UPDATE cleanup_queue SET %s, updated_at = NOW() WHERE id = $1",
		strings.Join(setClauses, ", "))

	result, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("code2flag UpdateCleanupEntry: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("cleanup_entry")
	}
	return nil
}

// DeleteCleanupEntry removes a cleanup entry by ID.
func (s *Code2FlagStore) DeleteCleanupEntry(ctx context.Context, id string) error {
	result, err := s.pool.Exec(ctx, `DELETE FROM cleanup_queue WHERE id = $1`, id)
	if err != nil {
		return fmt.Errorf("code2flag DeleteCleanupEntry: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("cleanup_entry")
	}
	return nil
}
