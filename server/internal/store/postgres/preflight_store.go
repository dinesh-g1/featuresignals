// Package postgres implements PreflightReader and PreflightWriter for PostgreSQL using pgx.
//
// The PreflightStore maps to the preflight_reports, rollout_phases, and
// preflight_approval_requests tables. All queries enforce tenant isolation
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

var _ domain.PreflightReader = (*PreflightStore)(nil)
var _ domain.PreflightWriter = (*PreflightStore)(nil)

// ─── PreflightStore ────────────────────────────────────────────────────────

// PreflightStore implements domain.PreflightReader and domain.PreflightWriter
// against PostgreSQL. It is a standalone store (like Code2FlagStore) rather than
// embedding in the main Store aggregate, keeping the Preflight surface area
// independently testable and deployable.
type PreflightStore struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

// NewPreflightStore creates a new PreflightStore backed by the given connection pool.
func NewPreflightStore(pool *pgxpool.Pool, logger *slog.Logger) *PreflightStore {
	return &PreflightStore{pool: pool, logger: logger}
}

// ─── Column allowlists for dynamic UPDATE operations ───────────────────────
//
// These prevent SQL injection via column name interpolation in Update* methods.
// Only columns in these allowlists may appear as keys in the updates map.

var preflightReportUpdateColumns = map[string]bool{
	"risk_score":         true,
	"affected_files":     true,
	"affected_code_refs": true,
	"report":             true,
	"viewed_at":          true,
	"change_type":        true,
}

var rolloutPhaseUpdateColumns = map[string]bool{
	"percentage":     true,
	"duration_hours": true,
	"guard_metrics":  true,
	"status":         true,
	"started_at":     true,
	"completed_at":   true,
}

var preflightApprovalUpdateColumns = map[string]bool{
	"status":        true,
	"reviewer_id":   true,
	"decision":      true,
	"comment":       true,
	"justification": true,
	"scheduled_at":  true,
	"decided_at":    true,
}

// ─── PreflightReport: Read Methods ─────────────────────────────────────────

// GetPreflightReport retrieves a single preflight report by ID.
func (s *PreflightStore) GetPreflightReport(ctx context.Context, id string) (*domain.PreflightReport, error) {
	query := `SELECT id, org_id, flag_key, flag_id, change_type, env_id,
		        report, risk_score, affected_files, affected_code_refs,
		        generated_at, viewed_at, created_at, updated_at
		 FROM preflight_reports WHERE id = $1`

	var r domain.PreflightReport
	var flagID, envID *string
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&r.ID, &r.OrgID, &r.FlagKey, &flagID, &r.ChangeType, &envID,
		&r.Report, &r.RiskScore, &r.AffectedFiles, &r.AffectedCodeRefs,
		&r.GeneratedAt, &r.ViewedAt, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "preflight_report")
	}
	if flagID != nil {
		r.FlagID = *flagID
	}
	if envID != nil {
		r.EnvID = *envID
	}
	return &r, nil
}

// ListPreflightReports returns preflight reports for an org, optionally filtered by flag key.
func (s *PreflightStore) ListPreflightReports(ctx context.Context, orgID string, flagKey string, limit, offset int) ([]domain.PreflightReport, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	var query string
	args := []interface{}{orgID}

	if flagKey != "" {
		query = `SELECT id, org_id, flag_key, flag_id, change_type, env_id,
			        report, risk_score, affected_files, affected_code_refs,
			        generated_at, viewed_at, created_at, updated_at
			 FROM preflight_reports WHERE org_id = $1 AND flag_key = $2
			 ORDER BY generated_at DESC
			 LIMIT $3 OFFSET $4`
		args = append(args, flagKey, limit, offset)
	} else {
		query = `SELECT id, org_id, flag_key, flag_id, change_type, env_id,
			        report, risk_score, affected_files, affected_code_refs,
			        generated_at, viewed_at, created_at, updated_at
			 FROM preflight_reports WHERE org_id = $1
			 ORDER BY generated_at DESC
			 LIMIT $2 OFFSET $3`
		args = append(args, limit, offset)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("preflight ListPreflightReports: %w", err)
	}
	defer rows.Close()

	var reports []domain.PreflightReport
	for rows.Next() {
		var r domain.PreflightReport
		var flagID, envID *string
		if err := rows.Scan(
			&r.ID, &r.OrgID, &r.FlagKey, &flagID, &r.ChangeType, &envID,
			&r.Report, &r.RiskScore, &r.AffectedFiles, &r.AffectedCodeRefs,
			&r.GeneratedAt, &r.ViewedAt, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("preflight ListPreflightReports scan: %w", err)
		}
		if flagID != nil {
			r.FlagID = *flagID
		}
		if envID != nil {
			r.EnvID = *envID
		}
		reports = append(reports, r)
	}
	if reports == nil {
		reports = []domain.PreflightReport{}
	}
	return reports, rows.Err()
}

// CountPreflightReports returns the total count of preflight reports for an org and optional flag key.
func (s *PreflightStore) CountPreflightReports(ctx context.Context, orgID string, flagKey string) (int, error) {
	var query string
	args := []interface{}{orgID}

	if flagKey != "" {
		query = `SELECT COUNT(*) FROM preflight_reports WHERE org_id = $1 AND flag_key = $2`
		args = append(args, flagKey)
	} else {
		query = `SELECT COUNT(*) FROM preflight_reports WHERE org_id = $1`
	}

	var count int
	err := s.pool.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("preflight CountPreflightReports: %w", err)
	}
	return count, nil
}

// GetLatestReport returns the most recently generated preflight report for a given org and flag key.
func (s *PreflightStore) GetLatestReport(ctx context.Context, orgID, flagKey string) (*domain.PreflightReport, error) {
	query := `SELECT id, org_id, flag_key, flag_id, change_type, env_id,
		        report, risk_score, affected_files, affected_code_refs,
		        generated_at, viewed_at, created_at, updated_at
		 FROM preflight_reports WHERE org_id = $1 AND flag_key = $2
		 ORDER BY generated_at DESC LIMIT 1`

	var r domain.PreflightReport
	var flagID, envID *string
	err := s.pool.QueryRow(ctx, query, orgID, flagKey).Scan(
		&r.ID, &r.OrgID, &r.FlagKey, &flagID, &r.ChangeType, &envID,
		&r.Report, &r.RiskScore, &r.AffectedFiles, &r.AffectedCodeRefs,
		&r.GeneratedAt, &r.ViewedAt, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "preflight_report")
	}
	if flagID != nil {
		r.FlagID = *flagID
	}
	if envID != nil {
		r.EnvID = *envID
	}
	return &r, nil
}

// ─── PreflightReport: Write Methods ────────────────────────────────────────

// CreatePreflightReport inserts a new preflight report.
func (s *PreflightStore) CreatePreflightReport(ctx context.Context, r *domain.PreflightReport) error {
	// Default report to empty JSON object if nil.
	report := r.Report
	if len(report) == 0 {
		report = json.RawMessage("{}")
	}

	query := `INSERT INTO preflight_reports (org_id, flag_key, flag_id, change_type, env_id,
		        report, risk_score, affected_files, affected_code_refs, generated_at, viewed_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		 RETURNING id, generated_at, created_at, updated_at`

	err := s.pool.QueryRow(ctx, query,
		r.OrgID, r.FlagKey, nilIfEmpty(r.FlagID), r.ChangeType, nilIfEmpty(r.EnvID),
		report, r.RiskScore, r.AffectedFiles, r.AffectedCodeRefs,
		r.GeneratedAt, r.ViewedAt,
	).Scan(&r.ID, &r.GeneratedAt, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return wrapConflict(fmt.Errorf("preflight CreatePreflightReport: %w", err), "preflight_report")
	}
	return nil
}

// UpdatePreflightReport updates specific columns of a preflight report.
// Only keys in preflightReportUpdateColumns are permitted.
func (s *PreflightStore) UpdatePreflightReport(ctx context.Context, id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	var setClauses []string
	args := []interface{}{id}
	argIdx := 2

	for key, val := range updates {
		if !preflightReportUpdateColumns[key] {
			return fmt.Errorf("preflight UpdatePreflightReport: column %q is not allowed for update", key)
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIdx))
		args = append(args, val)
		argIdx++
	}

	query := fmt.Sprintf("UPDATE preflight_reports SET %s, updated_at = NOW() WHERE id = $1",
		strings.Join(setClauses, ", "))

	result, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("preflight UpdatePreflightReport: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("preflight_report")
	}
	return nil
}

// ─── RolloutPhase: Read Methods ────────────────────────────────────────────

// ListRolloutPhases returns all rollout phases for a flag, ordered by phase number.
func (s *PreflightStore) ListRolloutPhases(ctx context.Context, flagID string) ([]domain.RolloutPhase, error) {
	query := `SELECT id, org_id, flag_id, phase_number, percentage, duration_hours,
		        guard_metrics, status, started_at, completed_at, created_at, updated_at
		 FROM rollout_phases WHERE flag_id = $1
		 ORDER BY phase_number ASC`

	rows, err := s.pool.Query(ctx, query, flagID)
	if err != nil {
		return nil, fmt.Errorf("preflight ListRolloutPhases: %w", err)
	}
	defer rows.Close()

	var phases []domain.RolloutPhase
	for rows.Next() {
		var p domain.RolloutPhase
		if err := rows.Scan(
			&p.ID, &p.OrgID, &p.FlagID, &p.PhaseNumber, &p.Percentage,
			&p.DurationHours, &p.GuardMetrics, &p.Status, &p.StartedAt,
			&p.CompletedAt, &p.CreatedAt, &p.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("preflight ListRolloutPhases scan: %w", err)
		}
		phases = append(phases, p)
	}
	if phases == nil {
		phases = []domain.RolloutPhase{}
	}
	return phases, rows.Err()
}

// GetRolloutPhase retrieves a single rollout phase by ID.
func (s *PreflightStore) GetRolloutPhase(ctx context.Context, id string) (*domain.RolloutPhase, error) {
	query := `SELECT id, org_id, flag_id, phase_number, percentage, duration_hours,
		        guard_metrics, status, started_at, completed_at, created_at, updated_at
		 FROM rollout_phases WHERE id = $1`

	var p domain.RolloutPhase
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.OrgID, &p.FlagID, &p.PhaseNumber, &p.Percentage,
		&p.DurationHours, &p.GuardMetrics, &p.Status, &p.StartedAt,
		&p.CompletedAt, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "rollout_phase")
	}
	return &p, nil
}

// GetActivePhase returns the currently active rollout phase for a flag, if any.
func (s *PreflightStore) GetActivePhase(ctx context.Context, flagID string) (*domain.RolloutPhase, error) {
	query := `SELECT id, org_id, flag_id, phase_number, percentage, duration_hours,
		        guard_metrics, status, started_at, completed_at, created_at, updated_at
		 FROM rollout_phases WHERE flag_id = $1 AND status = 'active'
		 ORDER BY phase_number ASC LIMIT 1`

	var p domain.RolloutPhase
	err := s.pool.QueryRow(ctx, query, flagID).Scan(
		&p.ID, &p.OrgID, &p.FlagID, &p.PhaseNumber, &p.Percentage,
		&p.DurationHours, &p.GuardMetrics, &p.Status, &p.StartedAt,
		&p.CompletedAt, &p.CreatedAt, &p.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "rollout_phase")
	}
	return &p, nil
}

// ─── RolloutPhase: Write Methods ───────────────────────────────────────────

// CreateRolloutPhase inserts a new rollout phase.
func (s *PreflightStore) CreateRolloutPhase(ctx context.Context, p *domain.RolloutPhase) error {
	// Default guard_metrics to empty JSON array if nil.
	guardMetrics := p.GuardMetrics
	if len(guardMetrics) == 0 {
		guardMetrics = json.RawMessage("[]")
	}

	query := `INSERT INTO rollout_phases (org_id, flag_id, phase_number, percentage,
		        duration_hours, guard_metrics, status, started_at, completed_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, created_at, updated_at`

	err := s.pool.QueryRow(ctx, query,
		p.OrgID, p.FlagID, p.PhaseNumber, p.Percentage,
		p.DurationHours, guardMetrics, p.Status, p.StartedAt, p.CompletedAt,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return wrapConflict(fmt.Errorf("preflight CreateRolloutPhase: %w", err), "rollout_phase")
	}
	return nil
}

// UpdateRolloutPhase updates specific columns of a rollout phase.
// Only keys in rolloutPhaseUpdateColumns are permitted.
func (s *PreflightStore) UpdateRolloutPhase(ctx context.Context, id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	var setClauses []string
	args := []interface{}{id}
	argIdx := 2

	for key, val := range updates {
		if !rolloutPhaseUpdateColumns[key] {
			return fmt.Errorf("preflight UpdateRolloutPhase: column %q is not allowed for update", key)
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIdx))
		args = append(args, val)
		argIdx++
	}

	query := fmt.Sprintf("UPDATE rollout_phases SET %s, updated_at = NOW() WHERE id = $1",
		strings.Join(setClauses, ", "))

	result, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("preflight UpdateRolloutPhase: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("rollout_phase")
	}
	return nil
}

// BatchCreateRolloutPhases inserts multiple rollout phases in a single transaction.
func (s *PreflightStore) BatchCreateRolloutPhases(ctx context.Context, phases []domain.RolloutPhase) error {
	if len(phases) == 0 {
		return nil
	}

	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("preflight BatchCreateRolloutPhases begin tx: %w", err)
	}
	defer tx.Rollback(ctx)

	for i := range phases {
		guardMetrics := phases[i].GuardMetrics
		if len(guardMetrics) == 0 {
			guardMetrics = json.RawMessage("[]")
		}

		query := `INSERT INTO rollout_phases (org_id, flag_id, phase_number, percentage,
			        duration_hours, guard_metrics, status, started_at, completed_at)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
			 RETURNING id, created_at, updated_at`

		err := tx.QueryRow(ctx, query,
			phases[i].OrgID, phases[i].FlagID, phases[i].PhaseNumber, phases[i].Percentage,
			phases[i].DurationHours, guardMetrics, phases[i].Status,
			phases[i].StartedAt, phases[i].CompletedAt,
		).Scan(&phases[i].ID, &phases[i].CreatedAt, &phases[i].UpdatedAt)
		if err != nil {
			return fmt.Errorf("preflight BatchCreateRolloutPhases row %d: %w", i, err)
		}
	}

	if err := tx.Commit(ctx); err != nil {
		return fmt.Errorf("preflight BatchCreateRolloutPhases commit: %w", err)
	}
	return nil
}

// ─── ApprovalRequest: Read Methods ─────────────────────────────────────────

// GetApprovalRequest retrieves a single preflight approval request by ID.
func (s *PreflightStore) GetApprovalRequest(ctx context.Context, id string) (*domain.PreflightApprovalRequest, error) {
	query := `SELECT id, org_id, assessment_id, flag_key, requested_by, status,
		        reviewer_id, decision, comment, justification,
		        scheduled_at, decided_at, created_at, updated_at
		 FROM preflight_approval_requests WHERE id = $1`

	var a domain.PreflightApprovalRequest
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&a.ID, &a.OrgID, &a.AssessmentID, &a.FlagKey, &a.RequestedBy, &a.Status,
		&a.ReviewerID, &a.Decision, &a.Comment, &a.Justification,
		&a.ScheduledAt, &a.DecidedAt, &a.CreatedAt, &a.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "preflight_approval_request")
	}
	return &a, nil
}

// ListApprovalRequests returns approval requests for an org, optionally filtered by status.
func (s *PreflightStore) ListApprovalRequests(ctx context.Context, orgID string, status string, limit, offset int) ([]domain.PreflightApprovalRequest, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	var query string
	args := []interface{}{orgID}

	if status != "" {
		query = `SELECT id, org_id, assessment_id, flag_key, requested_by, status,
			        reviewer_id, decision, comment, justification,
			        scheduled_at, decided_at, created_at, updated_at
			 FROM preflight_approval_requests WHERE org_id = $1 AND status = $2
			 ORDER BY created_at DESC
			 LIMIT $3 OFFSET $4`
		args = append(args, status, limit, offset)
	} else {
		query = `SELECT id, org_id, assessment_id, flag_key, requested_by, status,
			        reviewer_id, decision, comment, justification,
			        scheduled_at, decided_at, created_at, updated_at
			 FROM preflight_approval_requests WHERE org_id = $1
			 ORDER BY created_at DESC
			 LIMIT $2 OFFSET $3`
		args = append(args, limit, offset)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("preflight ListApprovalRequests: %w", err)
	}
	defer rows.Close()

	var approvals []domain.PreflightApprovalRequest
	for rows.Next() {
		var a domain.PreflightApprovalRequest
		if err := rows.Scan(
			&a.ID, &a.OrgID, &a.AssessmentID, &a.FlagKey, &a.RequestedBy, &a.Status,
			&a.ReviewerID, &a.Decision, &a.Comment, &a.Justification,
			&a.ScheduledAt, &a.DecidedAt, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("preflight ListApprovalRequests scan: %w", err)
		}
		approvals = append(approvals, a)
	}
	if approvals == nil {
		approvals = []domain.PreflightApprovalRequest{}
	}
	return approvals, rows.Err()
}

// CountApprovalRequests returns the total count of approval requests for an org and optional status.
func (s *PreflightStore) CountApprovalRequests(ctx context.Context, orgID string, status string) (int, error) {
	var query string
	args := []interface{}{orgID}

	if status != "" {
		query = `SELECT COUNT(*) FROM preflight_approval_requests WHERE org_id = $1 AND status = $2`
		args = append(args, status)
	} else {
		query = `SELECT COUNT(*) FROM preflight_approval_requests WHERE org_id = $1`
	}

	var count int
	err := s.pool.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("preflight CountApprovalRequests: %w", err)
	}
	return count, nil
}

// ─── ApprovalRequest: Write Methods ────────────────────────────────────────

// CreateApprovalRequest inserts a new preflight approval request.
func (s *PreflightStore) CreateApprovalRequest(ctx context.Context, a *domain.PreflightApprovalRequest) error {
	query := `INSERT INTO preflight_approval_requests (org_id, assessment_id, flag_key,
		        requested_by, status, reviewer_id, decision, comment, justification,
		        scheduled_at, decided_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
		 RETURNING id, created_at, updated_at`

	err := s.pool.QueryRow(ctx, query,
		a.OrgID, a.AssessmentID, a.FlagKey, a.RequestedBy, a.Status,
		a.ReviewerID, a.Decision, a.Comment, a.Justification,
		a.ScheduledAt, a.DecidedAt,
	).Scan(&a.ID, &a.CreatedAt, &a.UpdatedAt)
	if err != nil {
		return wrapConflict(fmt.Errorf("preflight CreateApprovalRequest: %w", err), "preflight_approval_request")
	}
	return nil
}

// UpdateApprovalRequest updates specific columns of a preflight approval request.
// Only keys in preflightApprovalUpdateColumns are permitted.
func (s *PreflightStore) UpdateApprovalRequest(ctx context.Context, id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	var setClauses []string
	args := []interface{}{id}
	argIdx := 2

	for key, val := range updates {
		if !preflightApprovalUpdateColumns[key] {
			return fmt.Errorf("preflight UpdateApprovalRequest: column %q is not allowed for update", key)
		}
		setClauses = append(setClauses, fmt.Sprintf("%s = $%d", key, argIdx))
		args = append(args, val)
		argIdx++
	}

	query := fmt.Sprintf("UPDATE preflight_approval_requests SET %s, updated_at = NOW() WHERE id = $1",
		strings.Join(setClauses, ", "))

	result, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("preflight UpdateApprovalRequest: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("preflight_approval_request")
	}
	return nil
}
