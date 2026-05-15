// Package postgres implements ImpactReader and ImpactWriter for PostgreSQL using pgx.
//
// The ImpactStore maps to the impact_reports, cost_attributions, and org_learnings
// tables created in migration 000113. All queries enforce tenant isolation
// (org_id) and use parameterized queries exclusively.
package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Compile-time interface checks ─────────────────────────────────────────

var _ domain.ImpactReader = (*ImpactStore)(nil)
var _ domain.ImpactWriter = (*ImpactStore)(nil)

// ─── ImpactStore ───────────────────────────────────────────────────────────

// ImpactStore implements domain.ImpactReader and domain.ImpactWriter against
// PostgreSQL. It is a standalone store (like PreflightStore) rather than
// embedding in the main Store aggregate, keeping the Impact Analyzer surface
// area independently testable and deployable.
type ImpactStore struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

// NewImpactStore creates a new ImpactStore backed by the given connection pool.
func NewImpactStore(pool *pgxpool.Pool, logger *slog.Logger) *ImpactStore {
	return &ImpactStore{pool: pool, logger: logger}
}

// ─── ImpactReport: Read Methods ────────────────────────────────────────────

// GetImpactReport retrieves a single impact report by ID.
func (s *ImpactStore) GetImpactReport(ctx context.Context, id string) (*domain.ImpactReport, error) {
	query := `SELECT id, org_id, flag_key, flag_id, report, metrics_snapshot,
		        business_impact, cost_attribution, recommendations,
		        generated_at, created_at, updated_at
		 FROM impact_reports WHERE id = $1`

	var r domain.ImpactReport
	var flagID *string
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&r.ID, &r.OrgID, &r.FlagKey, &flagID, &r.Report, &r.MetricsSnapshot,
		&r.BusinessImpact, &r.CostAttribution, &r.Recommendations,
		&r.GeneratedAt, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "impact_report")
	}
	if flagID != nil {
		r.FlagID = *flagID
	}
	return &r, nil
}

// ListImpactReports returns impact reports for an org, optionally filtered by flag key.
func (s *ImpactStore) ListImpactReports(ctx context.Context, orgID, flagKey string, limit, offset int) ([]domain.ImpactReport, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	var query string
	args := []interface{}{orgID}

	if flagKey != "" {
		query = `SELECT id, org_id, flag_key, flag_id, report, metrics_snapshot,
			        business_impact, cost_attribution, recommendations,
			        generated_at, created_at, updated_at
			 FROM impact_reports WHERE org_id = $1 AND flag_key = $2
			 ORDER BY generated_at DESC
			 LIMIT $3 OFFSET $4`
		args = append(args, flagKey, limit, offset)
	} else {
		query = `SELECT id, org_id, flag_key, flag_id, report, metrics_snapshot,
			        business_impact, cost_attribution, recommendations,
			        generated_at, created_at, updated_at
			 FROM impact_reports WHERE org_id = $1
			 ORDER BY generated_at DESC
			 LIMIT $2 OFFSET $3`
		args = append(args, limit, offset)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("impact ListImpactReports: %w", err)
	}
	defer rows.Close()

	var reports []domain.ImpactReport
	for rows.Next() {
		var r domain.ImpactReport
		var flagID *string
		if err := rows.Scan(
			&r.ID, &r.OrgID, &r.FlagKey, &flagID, &r.Report, &r.MetricsSnapshot,
			&r.BusinessImpact, &r.CostAttribution, &r.Recommendations,
			&r.GeneratedAt, &r.CreatedAt, &r.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("impact ListImpactReports scan: %w", err)
		}
		if flagID != nil {
			r.FlagID = *flagID
		}
		reports = append(reports, r)
	}
	if reports == nil {
		reports = []domain.ImpactReport{}
	}
	return reports, rows.Err()
}

// CountImpactReports returns the total count of impact reports for an org and optional flag key.
func (s *ImpactStore) CountImpactReports(ctx context.Context, orgID, flagKey string) (int, error) {
	var query string
	args := []interface{}{orgID}

	if flagKey != "" {
		query = `SELECT COUNT(*) FROM impact_reports WHERE org_id = $1 AND flag_key = $2`
		args = append(args, flagKey)
	} else {
		query = `SELECT COUNT(*) FROM impact_reports WHERE org_id = $1`
	}

	var count int
	err := s.pool.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("impact CountImpactReports: %w", err)
	}
	return count, nil
}

// GetLatestImpactReport returns the most recently generated impact report for a given org and flag key.
func (s *ImpactStore) GetLatestImpactReport(ctx context.Context, orgID, flagKey string) (*domain.ImpactReport, error) {
	query := `SELECT id, org_id, flag_key, flag_id, report, metrics_snapshot,
		        business_impact, cost_attribution, recommendations,
		        generated_at, created_at, updated_at
		 FROM impact_reports WHERE org_id = $1 AND flag_key = $2
		 ORDER BY generated_at DESC LIMIT 1`

	var r domain.ImpactReport
	var flagID *string
	err := s.pool.QueryRow(ctx, query, orgID, flagKey).Scan(
		&r.ID, &r.OrgID, &r.FlagKey, &flagID, &r.Report, &r.MetricsSnapshot,
		&r.BusinessImpact, &r.CostAttribution, &r.Recommendations,
		&r.GeneratedAt, &r.CreatedAt, &r.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "impact_report")
	}
	if flagID != nil {
		r.FlagID = *flagID
	}
	return &r, nil
}

// ─── CostAttribution: Read Methods ─────────────────────────────────────────

// ListCostAttributions returns cost attributions for an org and flag, ordered by period.
func (s *ImpactStore) ListCostAttributions(ctx context.Context, orgID, flagKey string) ([]domain.CostAttribution, error) {
	query := `SELECT id, org_id, flag_key, resource_type, cost_amount,
		        currency, period_start, period_end, created_at, updated_at
		 FROM cost_attributions WHERE org_id = $1 AND flag_key = $2
		 ORDER BY period_start DESC`

	rows, err := s.pool.Query(ctx, query, orgID, flagKey)
	if err != nil {
		return nil, fmt.Errorf("impact ListCostAttributions: %w", err)
	}
	defer rows.Close()

	var attributions []domain.CostAttribution
	for rows.Next() {
		var a domain.CostAttribution
		if err := rows.Scan(
			&a.ID, &a.OrgID, &a.FlagKey, &a.ResourceType, &a.CostAmount,
			&a.Currency, &a.PeriodStart, &a.PeriodEnd, &a.CreatedAt, &a.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("impact ListCostAttributions scan: %w", err)
		}
		attributions = append(attributions, a)
	}
	if attributions == nil {
		attributions = []domain.CostAttribution{}
	}
	return attributions, rows.Err()
}

// ─── OrgLearning: Read Methods ─────────────────────────────────────────────

// GetOrgLearning returns the latest organizational learning for an org.
func (s *ImpactStore) GetOrgLearning(ctx context.Context, orgID string) (*domain.OrgLearning, error) {
	query := `SELECT id, org_id, total_flags_analyzed, cleanup_candidates,
		        flags_without_owners, stale_flags, avg_risk_score,
		        avg_time_to_full_rollout_hours, top_insights,
		        generated_at, created_at, updated_at
		 FROM org_learnings WHERE org_id = $1
		 ORDER BY generated_at DESC LIMIT 1`

	var l domain.OrgLearning
	err := s.pool.QueryRow(ctx, query, orgID).Scan(
		&l.ID, &l.OrgID, &l.TotalFlagsAnalyzed, &l.CleanupCandidates,
		&l.FlagsWithoutOwners, &l.StaleFlags, &l.AvgRiskScore,
		&l.AvgTimeToFullRollout, &l.TopInsights,
		&l.GeneratedAt, &l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "org_learning")
	}
	return &l, nil
}

// ListOrgLearnings returns organizational learnings for an org, paginated.
func (s *ImpactStore) ListOrgLearnings(ctx context.Context, orgID string, limit, offset int) ([]domain.OrgLearning, error) {
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	query := `SELECT id, org_id, total_flags_analyzed, cleanup_candidates,
		        flags_without_owners, stale_flags, avg_risk_score,
		        avg_time_to_full_rollout_hours, top_insights,
		        generated_at, created_at, updated_at
		 FROM org_learnings WHERE org_id = $1
		 ORDER BY generated_at DESC
		 LIMIT $2 OFFSET $3`

	rows, err := s.pool.Query(ctx, query, orgID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("impact ListOrgLearnings: %w", err)
	}
	defer rows.Close()

	var learnings []domain.OrgLearning
	for rows.Next() {
		var l domain.OrgLearning
		if err := rows.Scan(
			&l.ID, &l.OrgID, &l.TotalFlagsAnalyzed, &l.CleanupCandidates,
			&l.FlagsWithoutOwners, &l.StaleFlags, &l.AvgRiskScore,
			&l.AvgTimeToFullRollout, &l.TopInsights,
			&l.GeneratedAt, &l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("impact ListOrgLearnings scan: %w", err)
		}
		learnings = append(learnings, l)
	}
	if learnings == nil {
		learnings = []domain.OrgLearning{}
	}
	return learnings, rows.Err()
}

// ─── ImpactReport: Write Methods ───────────────────────────────────────────

// CreateImpactReport inserts a new impact report.
func (s *ImpactStore) CreateImpactReport(ctx context.Context, r *domain.ImpactReport) error {
	// Default report to empty JSON object if nil.
	report := r.Report
	if len(report) == 0 {
		report = json.RawMessage("{}")
	}

	query := `INSERT INTO impact_reports (org_id, flag_key, flag_id, report, metrics_snapshot,
		        business_impact, cost_attribution, recommendations, generated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, created_at, updated_at`

	err := s.pool.QueryRow(ctx, query,
		r.OrgID, r.FlagKey, nilIfEmpty(r.FlagID), report, r.MetricsSnapshot,
		r.BusinessImpact, r.CostAttribution, r.Recommendations, r.GeneratedAt,
	).Scan(&r.ID, &r.CreatedAt, &r.UpdatedAt)
	if err != nil {
		return wrapConflict(fmt.Errorf("impact CreateImpactReport: %w", err), "impact_report")
	}
	return nil
}

// ─── CostAttribution: Write Methods ────────────────────────────────────────

// CreateCostAttribution inserts a new cost attribution.
func (s *ImpactStore) CreateCostAttribution(ctx context.Context, c *domain.CostAttribution) error {
	// Default currency to USD if empty.
	currency := c.Currency
	if currency == "" {
		currency = "USD"
	}

	query := `INSERT INTO cost_attributions (org_id, flag_key, resource_type, cost_amount,
		        currency, period_start, period_end)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at, updated_at`

	err := s.pool.QueryRow(ctx, query,
		c.OrgID, c.FlagKey, c.ResourceType, c.CostAmount,
		currency, c.PeriodStart, c.PeriodEnd,
	).Scan(&c.ID, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return wrapConflict(fmt.Errorf("impact CreateCostAttribution: %w", err), "cost_attribution")
	}
	return nil
}

// ─── OrgLearning: Write Methods ────────────────────────────────────────────

// CreateOrgLearning inserts a new organizational learning.
func (s *ImpactStore) CreateOrgLearning(ctx context.Context, l *domain.OrgLearning) error {
	// Default top_insights to empty JSON array if nil.
	topInsights := l.TopInsights
	if len(topInsights) == 0 {
		topInsights = json.RawMessage("[]")
	}

	query := `INSERT INTO org_learnings (org_id, total_flags_analyzed, cleanup_candidates,
		        flags_without_owners, stale_flags, avg_risk_score,
		        avg_time_to_full_rollout_hours, top_insights, generated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 RETURNING id, created_at, updated_at`

	err := s.pool.QueryRow(ctx, query,
		l.OrgID, l.TotalFlagsAnalyzed, l.CleanupCandidates,
		l.FlagsWithoutOwners, l.StaleFlags, l.AvgRiskScore,
		l.AvgTimeToFullRollout, topInsights, l.GeneratedAt,
	).Scan(&l.ID, &l.CreatedAt, &l.UpdatedAt)
	if err != nil {
		return wrapConflict(fmt.Errorf("impact CreateOrgLearning: %w", err), "org_learning")
	}
	return nil
}
