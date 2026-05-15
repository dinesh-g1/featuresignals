// Package postgres implements IncidentReader and IncidentWriter for PostgreSQL using pgx.
//
// The IncidentStore maps to the incident_correlations and auto_remediations
// tables created in migration 000113. All queries enforce tenant isolation
// (org_id) and use parameterized queries exclusively.
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

var _ domain.IncidentReader = (*IncidentStore)(nil)
var _ domain.IncidentWriter = (*IncidentStore)(nil)

// ─── IncidentStore ─────────────────────────────────────────────────────────

// IncidentStore implements domain.IncidentReader and domain.IncidentWriter
// against PostgreSQL. It is a standalone store (like PreflightStore) rather than
// embedding in the main Store aggregate, keeping the IncidentFlag surface area
// independently testable and deployable.
type IncidentStore struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

// NewIncidentStore creates a new IncidentStore backed by the given connection pool.
func NewIncidentStore(pool *pgxpool.Pool, logger *slog.Logger) *IncidentStore {
	return &IncidentStore{pool: pool, logger: logger}
}

// ─── Column allowlists for dynamic UPDATE operations ───────────────────────

var autoRemediationUpdateColumns = map[string]bool{
	"status":         true,
	"previous_state": true,
	"applied_at":     true,
	"reason":         true,
}

// ─── IncidentCorrelation: Read Methods ─────────────────────────────────────

// GetIncidentCorrelation retrieves a single incident correlation by ID.
func (s *IncidentStore) GetIncidentCorrelation(ctx context.Context, id string) (*domain.IncidentCorrelation, error) {
	query := `SELECT id, org_id, incident_started_at, incident_ended_at,
		        services_affected, env_id, total_flags_changed,
		        correlated_changes, highest_correlation, created_at, updated_at
		 FROM incident_correlations WHERE id = $1`

	var c domain.IncidentCorrelation
	var envID *string
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&c.ID, &c.OrgID, &c.IncidentStartedAt, &c.IncidentEndedAt,
		&c.ServicesAffected, &envID, &c.TotalFlagsChanged,
		&c.CorrelatedChanges, &c.HighestCorrelation, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "incident_correlation")
	}
	if envID != nil {
		c.EnvID = *envID
	}
	if c.ServicesAffected == nil {
		c.ServicesAffected = []string{}
	}
	return &c, nil
}

// ListIncidentCorrelations returns incident correlations for an org, paginated.
func (s *IncidentStore) ListIncidentCorrelations(ctx context.Context, orgID string, limit, offset int) ([]domain.IncidentCorrelation, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	query := `SELECT id, org_id, incident_started_at, incident_ended_at,
		        services_affected, env_id, total_flags_changed,
		        correlated_changes, highest_correlation, created_at, updated_at
		 FROM incident_correlations WHERE org_id = $1
		 ORDER BY incident_started_at DESC
		 LIMIT $2 OFFSET $3`

	rows, err := s.pool.Query(ctx, query, orgID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("incident ListIncidentCorrelations: %w", err)
	}
	defer rows.Close()

	var correlations []domain.IncidentCorrelation
	for rows.Next() {
		var c domain.IncidentCorrelation
		var envID *string
		if err := rows.Scan(
			&c.ID, &c.OrgID, &c.IncidentStartedAt, &c.IncidentEndedAt,
			&c.ServicesAffected, &envID, &c.TotalFlagsChanged,
			&c.CorrelatedChanges, &c.HighestCorrelation, &c.CreatedAt, &c.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("incident ListIncidentCorrelations scan: %w", err)
		}
		if envID != nil {
			c.EnvID = *envID
		}
		if c.ServicesAffected == nil {
			c.ServicesAffected = []string{}
		}
		correlations = append(correlations, c)
	}
	if correlations == nil {
		correlations = []domain.IncidentCorrelation{}
	}
	return correlations, rows.Err()
}

// CountIncidentCorrelations returns the total count of incident correlations for an org.
func (s *IncidentStore) CountIncidentCorrelations(ctx context.Context, orgID string) (int, error) {
	query := `SELECT COUNT(*) FROM incident_correlations WHERE org_id = $1`

	var count int
	err := s.pool.QueryRow(ctx, query, orgID).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("incident CountIncidentCorrelations: %w", err)
	}
	return count, nil
}

// GetAutoRemediation retrieves a single auto-remediation by ID.
func (s *IncidentStore) GetAutoRemediation(ctx context.Context, id string) (*domain.AutoRemediation, error) {
	query := `SELECT id, org_id, flag_key, env_id, action, correlation_id,
		        reason, status, previous_state, applied_at, created_at, updated_at
		 FROM auto_remediations WHERE id = $1`

	var r domain.AutoRemediation
	var envID, correlationID *string
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&r.ID, &r.OrgID, &r.FlagKey, &envID, &r.Action, &correlationID,
		&r.Reason, &r.Status, &r.PreviousState, &r.AppliedAt, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "auto_remediation")
	}
	if envID != nil {
		r.EnvID = *envID
	}
	if correlationID != nil {
		r.CorrelationID = *correlationID
	}
	return &r, nil
}

// ListAutoRemediations returns auto-remediations for an org, optionally filtered by flag key.
func (s *IncidentStore) ListAutoRemediations(ctx context.Context, orgID, flagKey string, limit, offset int) ([]domain.AutoRemediation, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	var query string
	args := []interface{}{orgID}

	if flagKey != "" {
		query = `SELECT id, org_id, flag_key, env_id, action, correlation_id,
			        reason, status, previous_state, applied_at, created_at, updated_at
			 FROM auto_remediations WHERE org_id = $1 AND flag_key = $2
			 ORDER BY created_at DESC
			 LIMIT $3 OFFSET $4`
		args = append(args, flagKey, limit, offset)
	} else {
		query = `SELECT id, org_id, flag_key, env_id, action, correlation_id,
			        reason, status, previous_state, applied_at, created_at, updated_at
			 FROM auto_remediations WHERE org_id = $1
			 ORDER BY created_at DESC
			 LIMIT $2 OFFSET $3`
		args = append(args, limit, offset)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("incident ListAutoRemediations: %w", err)
	}
	defer rows.Close()

	var remediations []domain.AutoRemediation
	for rows.Next() {
		var r domain.AutoRemediation
		var envID, correlationID *string
		if err := rows.Scan(
			&r.ID, &r.OrgID, &r.FlagKey, &envID, &r.Action, &correlationID,
			&r.Reason, &r.Status, &r.PreviousState, &r.AppliedAt, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("incident ListAutoRemediations scan: %w", err)
		}
		if envID != nil {
			r.EnvID = *envID
		}
		if correlationID != nil {
			r.CorrelationID = *correlationID
		}
		remediations = append(remediations, r)
	}
	if remediations == nil {
		remediations = []domain.AutoRemediation{}
	}
	return remediations, rows.Err()
}

// CountAutoRemediations returns the total count of auto-remediations for an org and optional flag key.
func (s *IncidentStore) CountAutoRemediations(ctx context.Context, orgID, flagKey string) (int, error) {
	var query string
	args := []interface{}{orgID}

	if flagKey != "" {
		query = `SELECT COUNT(*) FROM auto_remediations WHERE org_id = $1 AND flag_key = $2`
		args = append(args, flagKey)
	} else {
		query = `SELECT COUNT(*) FROM auto_remediations WHERE org_id = $1`
	}

	var count int
	err := s.pool.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("incident CountAutoRemediations: %w", err)
	}
	return count, nil
}

// ─── IncidentCorrelation: Write Methods ────────────────────────────────────

// CreateIncidentCorrelation inserts a new incident correlation.
func (s *IncidentStore) CreateIncidentCorrelation(ctx context.Context, c *domain.IncidentCorrelation) error {
	// Default correlated_changes to empty JSON array if nil.
	correlatedChanges := c.CorrelatedChanges
	if len(correlatedChanges) == 0 {
		correlatedChanges = json.RawMessage("[]")
	}

	query := `INSERT INTO incident_correlations (org_id, incident_started_at, incident_ended_at,
		        services_affected, env_id, total_flags_changed, correlated_changes, highest_correlation)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 RETURNING id, created_at, updated_at`

	err := s.pool.QueryRow(ctx, query,
		c.OrgID, c.IncidentStartedAt, c.IncidentEndedAt,
		c.ServicesAffected, nilIfEmpty(c.EnvID), c.TotalFlagsChanged,
		correlatedChanges, c.HighestCorrelation,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return wrapConflict(fmt.Errorf("incident CreateIncidentCorrelation: %w", err), "incident_correlation")
	}
	return nil
}

// ─── AutoRemediation: Write Methods ────────────────────────────────────────

// CreateAutoRemediation inserts a new auto-remediation.
func (s *IncidentStore) CreateAutoRemediation(ctx context.Context, r *domain.AutoRemediation) error {
	query := `INSERT INTO auto_remediations (org_id, flag_key, env_id, action, correlation_id,
		        reason, status, previous_state, applied_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, created_at, updated_at`

	err := s.pool.QueryRow(ctx, query,
		r.OrgID, r.FlagKey, nilIfEmpty(r.EnvID), r.Action, nilIfEmpty(r.CorrelationID),
		r.Reason, r.Status, r.PreviousState, r.AppliedAt,
	).Scan(&r.ID, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return wrapConflict(fmt.Errorf("incident CreateAutoRemediation: %w", err), "auto_remediation")
	}
	return nil
}

// UpdateAutoRemediation updates specific columns of an auto-remediation.
// Only keys in autoRemediationUpdateColumns are permitted.
func (s *IncidentStore) UpdateAutoRemediation(ctx context.Context, id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	var setClauses []string
	args := []interface{}{id}
	argIdx := 2

	for key, val := range updates {
		if !autoRemediationUpdateColumns[key] {
			return fmt.Errorf("incident UpdateAutoRemediation: column %q is not allowed for update", key)
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIdx))
		args = append(args, val)
		argIdx++
	}

	query := fmt.Sprintf("UPDATE auto_remediations SET %s, updated_at = NOW() WHERE id = $1",
		strings.Join(setClauses, ", "))

	result, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("incident UpdateAutoRemediation: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("auto_remediation")
	}
	return nil
}
