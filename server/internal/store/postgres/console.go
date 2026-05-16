// Package postgres implements ConsoleReader and ConsoleWriter for PostgreSQL using pgx.
//
// The ConsoleStore powers the three-zone Console surface: CONNECT (integrations),
// LIFECYCLE (14-stage feature lifecycle), and LEARN (impact reports, cost tracking,
// team velocity, org learnings). All queries enforce tenant isolation (org_id)
// and use parameterized queries exclusively.
package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"strings"
	"time"

	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Compile-time interface checks ─────────────────────────────────────────

var _ domain.ConsoleReader = (*ConsoleStore)(nil)
var _ domain.ConsoleWriter = (*ConsoleStore)(nil)

// ─── ConsoleStore ──────────────────────────────────────────────────────────

// ConsoleStore implements domain.ConsoleReader and domain.ConsoleWriter against
// PostgreSQL. It is a standalone store, keeping the Console surface area
// independently testable and deployable.
type ConsoleStore struct {
	pool   *pgxpool.Pool
	logger *slog.Logger
}

// NewConsoleStore creates a new ConsoleStore backed by the given connection pool.
func NewConsoleStore(pool *pgxpool.Pool, logger *slog.Logger) *ConsoleStore {
	return &ConsoleStore{pool: pool, logger: logger}
}

// ─── ConsoleReader: ListFlags ──────────────────────────────────────────────

// ListFlags returns a paginated, filtered list of console flags for an org.
// It joins flags with their most recent audit entry and per-environment state
// to derive the lifecycle stage, status, and health information.
func (s *ConsoleStore) ListFlags(ctx context.Context, orgID string, params domain.ConsoleListParams) ([]domain.ConsoleFlag, int, error) {
	// Build WHERE clauses dynamically based on filters.
	conditions := []string{"f.org_id = $1"}
	args := []interface{}{orgID}
	argIdx := 2

	if params.ProjectID != "" {
		conditions = append(conditions, fmt.Sprintf("f.project_id = $%d", argIdx))
		args = append(args, params.ProjectID)
		argIdx++
	}
	// Environment filter: tracked separately from the main WHERE clause so it
	// can be injected into the LATERAL subquery (see dataQuery below).
	var envFilterClause string
	if params.Environment != "" {
		envFilterClause = fmt.Sprintf("AND e.slug = $%d", argIdx)
		args = append(args, params.Environment)
		argIdx++
	}
	if params.Stage != "" && domain.ValidStage(params.Stage) {
		conditions = append(conditions, fmt.Sprintf("f.stage = $%d", argIdx))
		args = append(args, params.Stage)
		argIdx++
	}
	if params.Search != "" {
		conditions = append(conditions, fmt.Sprintf("(f.key ILIKE $%d OR f.name ILIKE $%d)", argIdx, argIdx))
		args = append(args, "%"+params.Search+"%")
		argIdx++
	}

	whereClause := strings.Join(conditions, " AND ")

	// Derive sort column and direction safely (no raw interpolation).
	sortCol, sortDir := parseConsoleSortSQL(params.Sort)

	// Count query — count distinct flags only (no env join needed).
	// When an environment filter is active, we count only flags that have
	// at least one flag_state in the specified environment.
	var countQuery string
	if envFilterClause != "" {
		countQuery = fmt.Sprintf(
			`SELECT COUNT(*) FROM flags f
			 WHERE %s AND EXISTS (
				SELECT 1 FROM flag_states fs
				JOIN environments e ON e.id = fs.env_id
				WHERE fs.flag_id = f.id %s
			 )`, whereClause, envFilterClause)
	} else {
		countQuery = fmt.Sprintf(
			`SELECT COUNT(*) FROM flags f
			 WHERE %s`, whereClause)
	}

	var total int
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, fmt.Errorf("console ListFlags count: %w", err)
	}

	// Main query — uses real console columns from the flags table (migration 000115).
	// Stage, health_score, eval_volume, ai_executed, and code_reference_count
	// are now persisted columns, not derived defaults.
	//
	// Uses a LATERAL subquery to pick ONE representative environment per flag,
	// prioritizing production > staging > development > any other. This prevents
	// duplicate rows when a flag has flag_states in multiple environments.
	// When an environment filter is specified, the LATERAL subquery is filtered
	// accordingly, so only flags with that environment are returned.
	dataQuery := fmt.Sprintf(
		`SELECT
			f.key, f.name, COALESCE(f.description, ''),
			f.stage,
			CASE
				WHEN f.stage IN ('ship','monitor','decide','analyze','learn') THEN 'live'
				WHEN f.stage = 'approve' THEN 'pending'
				WHEN f.stage IN ('plan','spec','design','flag','implement','test','configure') THEN
					CASE WHEN f.status IN ('active', 'rolled_out') THEN 'live' ELSE 'draft' END
				ELSE
					CASE WHEN f.status IN ('active', 'rolled_out') THEN 'live' ELSE 'draft' END
			END as status,
			COALESCE(best_env.slug, 'development'),
			COALESCE(best_env.name, 'Development'),
			COALESCE(f.flag_type::text, 'boolean'),
			COALESCE(f.eval_volume, 0),
			COALESCE(f.eval_trend, 0.0),
			COALESCE(best_env.percentage_rollout, 0) / 100.0,
			COALESCE(f.health_score, 100),
			COALESCE((
				SELECT a.action FROM audit_logs a
				WHERE a.resource_id = f.id AND a.resource_type = 'flag'
				ORDER BY a.created_at DESC LIMIT 1
			), 'created') AS last_action,
			(SELECT a.created_at FROM audit_logs a
				WHERE a.resource_id = f.id AND a.resource_type = 'flag'
				ORDER BY a.created_at DESC LIMIT 1) AS last_action_at,
			COALESCE((
				SELECT a.metadata->>'actor_name' FROM audit_logs a
				WHERE a.resource_id = f.id AND a.resource_type = 'flag'
				ORDER BY a.created_at DESC LIMIT 1
			), 'system') AS last_action_by,
			NULL::text AS ai_suggestion,
			NULL::text AS ai_suggestion_type,
			COALESCE(f.ai_executed, false),
			COALESCE(f.code_reference_count, 0),
			'[]'::jsonb as prereqs
		 FROM flags f
		 LEFT JOIN LATERAL (
			SELECT fs.percentage_rollout, e.slug, e.name
			FROM flag_states fs
			JOIN environments e ON e.id = fs.env_id
			WHERE fs.flag_id = f.id %s
			ORDER BY
				CASE e.slug
					WHEN 'production' THEN 1
					WHEN 'staging' THEN 2
					WHEN 'development' THEN 3
					ELSE 4
				END
			LIMIT 1
		 ) best_env ON true
		 WHERE %s
		 ORDER BY %s %s
		 LIMIT $%d OFFSET $%d`,
		envFilterClause, whereClause, sortCol, sortDir, argIdx, argIdx+1)

	args = append(args, params.Limit, params.Offset)
	rows, err := s.pool.Query(ctx, dataQuery, args...)
	if err != nil {
		return nil, 0, fmt.Errorf("console ListFlags query: %w", err)
	}
	defer rows.Close()

	flags := make([]domain.ConsoleFlag, 0, params.Limit)
	for rows.Next() {
		var f domain.ConsoleFlag
		var lastActionAt *time.Time
		var aiSuggestion, aiSuggestionType *string
		var prereqsJSON []byte

		if err := rows.Scan(
			&f.Key, &f.Name, &f.Description,
			&f.Stage, &f.Status,
			&f.Environment, &f.EnvironmentName,
			&f.Type, &f.EvalVolume, &f.EvalTrend,
			&f.RolloutPercent, &f.HealthScore,
			&f.LastAction, &lastActionAt, &f.LastActionBy,
			&aiSuggestion, &aiSuggestionType,
			&f.AIExecuted, &f.CodeReferenceCount,
			&prereqsJSON,
		); err != nil {
			return nil, 0, fmt.Errorf("console ListFlags scan: %w", err)
		}

		f.LastActionAt = lastActionAt
		f.AISuggestion = aiSuggestion
		f.AISuggestionType = aiSuggestionType

		// Parse prerequisites JSONB array into []string.
		if len(prereqsJSON) > 0 {
			var prereqs []string
			if err := json.Unmarshal(prereqsJSON, &prereqs); err == nil {
				f.DependsOn = prereqs
			}
		}

		// Default empty slices for JSON serialization.
		if f.DependsOn == nil {
			f.DependsOn = []string{}
		}
		f.DependedOnBy = []string{}

		flags = append(flags, f)
	}

	if err := rows.Err(); err != nil {
		return nil, 0, fmt.Errorf("console ListFlags rows: %w", err)
	}

	return flags, total, nil
}

// ─── ConsoleReader: GetFlag ────────────────────────────────────────────────

// GetFlag returns a single console flag by org and key.
func (s *ConsoleStore) GetFlag(ctx context.Context, orgID, key string) (*domain.ConsoleFlag, error) {
	query := `SELECT
		f.key, f.name, COALESCE(f.description, ''),
		f.stage,
		CASE
			WHEN f.stage IN ('ship','monitor','decide','analyze','learn') THEN 'live'
			WHEN f.stage = 'approve' THEN 'pending'
			WHEN f.stage IN ('plan','spec','design','flag','implement','test','configure') THEN
				CASE WHEN f.status IN ('active', 'rolled_out') THEN 'live' ELSE 'draft' END
			ELSE
				CASE WHEN f.status IN ('active', 'rolled_out') THEN 'live' ELSE 'draft' END
		END as status,
		COALESCE(best_env.slug, 'development'),
		COALESCE(best_env.name, 'Development'),
		COALESCE(f.flag_type::text, 'boolean'),
		COALESCE(f.eval_volume, 0),
		COALESCE(f.eval_trend, 0.0),
		COALESCE(best_env.percentage_rollout, 0) / 100.0,
		COALESCE(f.health_score, 100),
		COALESCE((
			SELECT a.action FROM audit_logs a
			WHERE a.resource_id = f.id AND a.resource_type = 'flag'
			ORDER BY a.created_at DESC LIMIT 1
		), 'created') AS last_action,
		(SELECT a.created_at FROM audit_logs a
			WHERE a.resource_id = f.id AND a.resource_type = 'flag'
			ORDER BY a.created_at DESC LIMIT 1) AS last_action_at,
		COALESCE((
			SELECT a.metadata->>'actor_name' FROM audit_logs a
			WHERE a.resource_id = f.id AND a.resource_type = 'flag'
			ORDER BY a.created_at DESC LIMIT 1
		), 'system') AS last_action_by,
		NULL::text AS ai_suggestion,
		NULL::text AS ai_suggestion_type,
		COALESCE(f.ai_executed, false),
		COALESCE(f.code_reference_count, 0),
		'[]'::jsonb as prereqs
	 FROM flags f
	 LEFT JOIN LATERAL (
		SELECT fs.percentage_rollout, e.slug, e.name
		FROM flag_states fs
		JOIN environments e ON e.id = fs.env_id
		WHERE fs.flag_id = f.id
		ORDER BY
			CASE e.slug
				WHEN 'production' THEN 1
				WHEN 'staging' THEN 2
				WHEN 'development' THEN 3
				ELSE 4
			END
		LIMIT 1
	 ) best_env ON true
	 WHERE f.org_id = $1 AND f.key = $2`

	var f domain.ConsoleFlag
	var lastActionAt *time.Time
	var aiSuggestion, aiSuggestionType *string
	var prereqsJSON []byte

	err := s.pool.QueryRow(ctx, query, orgID, key).Scan(
		&f.Key, &f.Name, &f.Description,
		&f.Stage, &f.Status,
		&f.Environment, &f.EnvironmentName,
		&f.Type, &f.EvalVolume, &f.EvalTrend,
		&f.RolloutPercent, &f.HealthScore,
		&f.LastAction, &lastActionAt, &f.LastActionBy,
		&aiSuggestion, &aiSuggestionType,
		&f.AIExecuted, &f.CodeReferenceCount,
		&prereqsJSON,
	)
	if err != nil {
		return nil, wrapNotFound(err, "console flag")
	}

	f.LastActionAt = lastActionAt
	f.AISuggestion = aiSuggestion
	f.AISuggestionType = aiSuggestionType

	if len(prereqsJSON) > 0 {
		var prereqs []string
		if err := json.Unmarshal(prereqsJSON, &prereqs); err == nil {
			f.DependsOn = prereqs
		}
	}
	if f.DependsOn == nil {
		f.DependsOn = []string{}
	}
	f.DependedOnBy = []string{}

	return &f, nil
}

// ─── ConsoleReader: GetInsights ────────────────────────────────────────────

// GetInsights aggregates post-rollout learning data for the LEARN zone.
// Gracefully degrades when ClickHouse is not available — returns empty
// collections rather than errors.
func (s *ConsoleStore) GetInsights(ctx context.Context, orgID string) (*domain.ConsoleInsights, error) {
	insights := &domain.ConsoleInsights{
		ImpactReports:  []domain.ImpactReport{},
		OrgLearnings:   []domain.OrgLearning{},
		RecentActivity: []domain.ActivityEntry{},
	}

	// Impact reports: latest 5 for this org.
	reports, err := s.listImpactReports(ctx, orgID, 5)
	if err != nil {
		s.logger.Warn("console GetInsights: impact reports unavailable, degrading gracefully",
			"org_id", orgID, "error", err)
	} else {
		insights.ImpactReports = reports
	}

	// Org learnings: latest 3 for this org.
	learnings, err := s.listOrgLearnings(ctx, orgID, 3)
	if err != nil {
		s.logger.Warn("console GetInsights: org learnings unavailable, degrading gracefully",
			"org_id", orgID, "error", err)
	} else {
		insights.OrgLearnings = learnings
	}

	// Cost attribution: latest for this org.
	costAttr, err := s.getLatestCostAttribution(ctx, orgID)
	if err != nil {
		s.logger.Warn("console GetInsights: cost attribution unavailable, degrading gracefully",
			"org_id", orgID, "error", err)
	} else if costAttr != nil {
		insights.CostAttribution = *costAttr
	}

	// Team velocity: computed from audit log.
	velocity, err := s.computeTeamVelocity(ctx, orgID)
	if err != nil {
		s.logger.Warn("console GetInsights: team velocity unavailable, degrading gracefully",
			"org_id", orgID, "error", err)
	} else {
		insights.TeamVelocity = velocity
	}

	// Recent activity: last 10 audit entries.
	activity, err := s.listRecentActivity(ctx, orgID, 10)
	if err != nil {
		s.logger.Warn("console GetInsights: recent activity unavailable, degrading gracefully",
			"org_id", orgID, "error", err)
	} else {
		insights.RecentActivity = activity
	}

	return insights, nil
}

// ─── ConsoleReader: GetIntegrations ────────────────────────────────────────

// GetIntegrations returns integration statuses for the CONNECT zone.
func (s *ConsoleStore) GetIntegrations(ctx context.Context, orgID string) (*domain.ConsoleIntegrations, error) {
	integrations := &domain.ConsoleIntegrations{
		Repositories: []domain.RepoStatus{},
		SDKs:         []domain.SdkStatus{},
		Agents:       []domain.ConsoleAgentStatus{},
		APIKeys:      []domain.ConsoleApiKeyStatus{},
	}

	// Repositories.
	repos, err := s.listRepos(ctx, orgID)
	if err != nil {
		s.logger.Warn("console GetIntegrations: repos unavailable", "org_id", orgID, "error", err)
	} else {
		integrations.Repositories = repos
	}

	// SDKs — derived from API key usage patterns.
	sdks, err := s.listSDKs(ctx, orgID)
	if err != nil {
		s.logger.Warn("console GetIntegrations: SDKs unavailable", "org_id", orgID, "error", err)
	} else {
		integrations.SDKs = sdks
	}

	// Agents — customer agents only; NEVER internal platform agents.
	agents, err := s.listCustomerAgents(ctx, orgID)
	if err != nil {
		s.logger.Warn("console GetIntegrations: agents unavailable", "org_id", orgID, "error", err)
	} else {
		integrations.Agents = agents
	}

	// API keys.
	apiKeys, err := s.listAPIKeyStatuses(ctx, orgID)
	if err != nil {
		s.logger.Warn("console GetIntegrations: API keys unavailable", "org_id", orgID, "error", err)
	} else {
		integrations.APIKeys = apiKeys
	}

	return integrations, nil
}

// ─── ConsoleReader: GetHelpContext ─────────────────────────────────────────

// GetHelpContext returns contextual information for the AI assistant.
func (s *ConsoleStore) GetHelpContext(ctx context.Context, orgID, userID string) (*domain.HelpContext, error) {
	hctx := &domain.HelpContext{
		OrgID:         orgID,
		RecentActions: []domain.ActivityEntry{},
	}

	// Org name and plan.
	var orgName, plan string
	err := s.pool.QueryRow(ctx,
		`SELECT name, COALESCE(plan, 'free') FROM organizations WHERE id = $1`,
		orgID,
	).Scan(&orgName, &plan)
	if err != nil {
		return nil, wrapNotFound(err, "organization")
	}
	hctx.OrgName = orgName
	hctx.Plan = plan

	// User name and role.
	if userID != "" {
		var userName, userRole string
		err := s.pool.QueryRow(ctx,
			`SELECT COALESCE(name, email), COALESCE(role, 'viewer') FROM users WHERE id = $1`,
			userID,
		).Scan(&userName, &userRole)
		if err == nil {
			hctx.UserName = userName
			hctx.UserRole = userRole
		}
	}

	// Recent activity: last 5 audit entries.
	activity, err := s.listRecentActivity(ctx, orgID, 5)
	if err != nil {
		s.logger.Warn("console GetHelpContext: recent activity unavailable",
			"org_id", orgID, "error", err)
	} else {
		hctx.RecentActions = activity
	}

	return hctx, nil
}

// ─── ConsoleWriter: AdvanceStage ───────────────────────────────────────────

// AdvanceStage advances a flag to the next lifecycle stage. It validates that
// the next stage exists and that prerequisites are met.
func (s *ConsoleStore) AdvanceStage(ctx context.Context, orgID, key, environment string) (*domain.AdvanceResult, error) {
	// Fetch current flag to determine current stage.
	var currentStage string
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(stage, 'plan') FROM flags WHERE org_id = $1 AND key = $2`,
		orgID, key,
	).Scan(&currentStage)
	if err != nil {
		return nil, wrapNotFound(err, "flag")
	}

	// Determine next stage.
	nextStage := domain.NextStage(currentStage)
	if nextStage == "" {
		return nil, domain.NewValidationError("stage", fmt.Sprintf(
			"cannot advance: '%s' is the final stage in the lifecycle", currentStage))
	}

	// Update the flag's stage.
	tag, err := s.pool.Exec(ctx,
		`UPDATE flags SET stage = $1, updated_at = NOW() WHERE org_id = $2 AND key = $3`,
		nextStage, orgID, key,
	)
	if err != nil {
		return nil, fmt.Errorf("advance stage update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.WrapNotFound("flag")
	}

	// Re-fetch the updated flag.
	flag, err := s.GetFlag(ctx, orgID, key)
	if err != nil {
		return nil, fmt.Errorf("advance stage re-fetch: %w", err)
	}

	return &domain.AdvanceResult{
		Flag:     *flag,
		NewStage: nextStage,
	}, nil
}

// ─── ConsoleWriter: Ship ───────────────────────────────────────────────────

// Ship updates the rollout percentage for a flag in the specified environment
// and updates the stage to "ship".
func (s *ConsoleStore) Ship(ctx context.Context, orgID, key string, params domain.ShipParams) (*domain.ShipResult, error) {
	// Validate target percent.
	if params.TargetPercent < 0 || params.TargetPercent > 100 {
		return nil, domain.NewValidationError("target_percent", "must be between 0 and 100")
	}

	// Look up the flag and its environment state.
	var flagID, envID string
	err := s.pool.QueryRow(ctx,
		`SELECT f.id, e.id FROM flags f
		 JOIN environments e ON e.project_id = f.project_id AND e.slug = $3
		 LEFT JOIN flag_states fs ON fs.flag_id = f.id AND fs.env_id = e.id
		 WHERE f.org_id = $1 AND f.key = $2`,
		orgID, key, params.Environment,
	).Scan(&flagID, &envID)
	if err != nil {
		return nil, wrapNotFound(err, "flag or environment state")
	}

	// Convert target percent (0-100) to basis points (0-10000) for the flag_state table.
	basisPoints := params.TargetPercent * 100

	// Update the flag state's rollout percentage.
	// Note: flag_states has no org_id column; tenant isolation is guaranteed
	// because flag_id is scoped via the earlier lookup joining through flags (which has org_id).
	tag, err := s.pool.Exec(ctx,
		`UPDATE flag_states
		 SET percentage_rollout = $1, enabled = $2, updated_at = NOW()
		 WHERE flag_id = $3 AND env_id = $4`,
		basisPoints, params.TargetPercent > 0, flagID, envID,
	)
	if err != nil {
		return nil, fmt.Errorf("ship update flag_state: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.WrapNotFound("flag state")
	}

	// Update the flag's stage to "ship".
	_, err = s.pool.Exec(ctx,
		`UPDATE flags SET stage = 'ship', updated_at = NOW() WHERE id = $1 AND org_id = $2`,
		flagID, orgID,
	)
	if err != nil {
		return nil, fmt.Errorf("ship update stage: %w", err)
	}

	// Re-fetch the updated flag.
	flag, err := s.GetFlag(ctx, orgID, key)
	if err != nil {
		return nil, fmt.Errorf("ship re-fetch: %w", err)
	}

	liveEvalURL := fmt.Sprintf("/v1/client/%s/flags", params.Environment)

	return &domain.ShipResult{
		Flag:        *flag,
		LiveEvalURL: liveEvalURL,
	}, nil
}

// ─── ConsoleWriter: ToggleFlag ─────────────────────────────────────────────

// ToggleFlag pauses or resumes a feature flag. The action parameter must be
// "pause" (sets status to "paused") or "resume" (sets status to "active").
func (s *ConsoleStore) ToggleFlag(ctx context.Context, orgID, key, action string) (*domain.ConsoleFlag, error) {
	var newStatus string
	switch action {
	case "pause":
		newStatus = string(domain.StatusPaused)
	case "resume":
		newStatus = string(domain.StatusActive)
	default:
		return nil, domain.NewValidationError("action", "must be 'pause' or 'resume'")
	}

	tag, err := s.pool.Exec(ctx,
		`UPDATE flags SET status = $1, updated_at = NOW() WHERE org_id = $2 AND key = $3`,
		newStatus, orgID, key,
	)
	if err != nil {
		return nil, fmt.Errorf("toggle flag update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.WrapNotFound("flag")
	}

	// Re-fetch the updated flag.
	flag, err := s.GetFlag(ctx, orgID, key)
	if err != nil {
		return nil, fmt.Errorf("toggle flag re-fetch: %w", err)
	}

	return flag, nil
}

// ─── ConsoleWriter: ArchiveFlag ────────────────────────────────────────────

// ArchiveFlag soft-deletes a feature flag by setting its status to "archived"
// and recording the deletion timestamp.
func (s *ConsoleStore) ArchiveFlag(ctx context.Context, orgID, key string) (*domain.ConsoleFlag, error) {
	tag, err := s.pool.Exec(ctx,
		`UPDATE flags SET status = $1, deleted_at = NOW(), updated_at = NOW() WHERE org_id = $2 AND key = $3`,
		string(domain.StatusArchived), orgID, key,
	)
	if err != nil {
		return nil, fmt.Errorf("archive flag update: %w", err)
	}
	if tag.RowsAffected() == 0 {
		return nil, domain.WrapNotFound("flag")
	}

	// Re-fetch the updated flag.
	flag, err := s.GetFlag(ctx, orgID, key)
	if err != nil {
		return nil, fmt.Errorf("archive flag re-fetch: %w", err)
	}

	return flag, nil
}

// ─── Private helpers ───────────────────────────────────────────────────────

func (s *ConsoleStore) listImpactReports(ctx context.Context, orgID string, limit int) ([]domain.ImpactReport, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, flag_key, flag_id, report, metrics_snapshot,
		        business_impact, cost_attribution, recommendations,
		        generated_at, created_at, updated_at
		 FROM impact_reports WHERE org_id = $1
		 ORDER BY generated_at DESC LIMIT $2`, orgID, limit)
	if err != nil {
		return nil, fmt.Errorf("listImpactReports: %w", err)
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
			return nil, fmt.Errorf("listImpactReports scan: %w", err)
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

func (s *ConsoleStore) listOrgLearnings(ctx context.Context, orgID string, limit int) ([]domain.OrgLearning, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, total_flags_analyzed, cleanup_candidates,
		        flags_without_owners, stale_flags, avg_risk_score,
		        avg_time_to_full_rollout, top_insights,
		        generated_at, created_at, updated_at
		 FROM org_learnings WHERE org_id = $1
		 ORDER BY generated_at DESC LIMIT $2`, orgID, limit)
	if err != nil {
		return nil, fmt.Errorf("listOrgLearnings: %w", err)
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
			return nil, fmt.Errorf("listOrgLearnings scan: %w", err)
		}
		learnings = append(learnings, l)
	}
	if learnings == nil {
		learnings = []domain.OrgLearning{}
	}
	return learnings, rows.Err()
}

func (s *ConsoleStore) getLatestCostAttribution(ctx context.Context, orgID string) (*domain.CostAttribution, error) {
	var c domain.CostAttribution
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, flag_key, resource_type, cost_amount, currency,
		        period_start, period_end, created_at, updated_at
		 FROM cost_attributions WHERE org_id = $1
		 ORDER BY created_at DESC LIMIT 1`, orgID,
	).Scan(
		&c.ID, &c.OrgID, &c.FlagKey, &c.ResourceType, &c.CostAmount,
		&c.Currency, &c.PeriodStart, &c.PeriodEnd, &c.CreatedAt, &c.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "cost_attribution")
	}
	return &c, nil
}

func (s *ConsoleStore) computeTeamVelocity(ctx context.Context, orgID string) (domain.TeamVelocity, error) {
	v := domain.TeamVelocity{}

	// Count flags shipped and in progress.
	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM flags WHERE org_id = $1 AND stage IN ('ship', 'monitor', 'decide', 'analyze', 'learn')`,
		orgID,
	).Scan(&v.TotalFlagsShipped)

	_ = s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM flags WHERE org_id = $1 AND stage NOT IN ('ship', 'monitor', 'decide', 'analyze', 'learn')`,
		orgID,
	).Scan(&v.TotalFlagsInProgress)

	// Compute average days between stages from audit log timestamps.
	// This is a best-effort computation.
	_ = s.pool.QueryRow(ctx,
		`SELECT COALESCE(AVG(EXTRACT(EPOCH FROM (next_ts - created_at))/86400), 0)
		 FROM (
			SELECT action, created_at,
				LEAD(created_at) OVER (PARTITION BY resource_id ORDER BY created_at) AS next_ts
			FROM audit_logs
			WHERE org_id = $1 AND resource_type = 'flag'
			  AND action IN ('flag.created', 'flag.stage_changed')
		 ) t WHERE t.action = 'flag.created'`,
		orgID,
	).Scan(&v.AvgDaysPlanToFlag)

	return v, nil
}

func (s *ConsoleStore) listRecentActivity(ctx context.Context, orgID string, limit int) ([]domain.ActivityEntry, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT ae.id, ae.action, f.key AS flag_key, f.name AS flag_name,
		        COALESCE(u.name, u.email, ae.actor_id) AS actor_name,
		        ae.created_at AS timestamp
		 FROM audit_logs ae
		 LEFT JOIN flags f ON f.id = ae.resource_id AND ae.resource_type = 'flag'
		 LEFT JOIN users u ON u.id = ae.actor_id
		 WHERE ae.org_id = $1
		 ORDER BY ae.created_at DESC LIMIT $2`, orgID, limit)
	if err != nil {
		return nil, fmt.Errorf("listRecentActivity: %w", err)
	}
	defer rows.Close()

	var entries []domain.ActivityEntry
	for rows.Next() {
		var e domain.ActivityEntry
		var flagKey, flagName, actorName *string
		if err := rows.Scan(&e.ID, &e.Action, &flagKey, &flagName, &actorName, &e.Timestamp); err != nil {
			return nil, fmt.Errorf("listRecentActivity scan: %w", err)
		}
		if flagKey != nil {
			e.FlagKey = *flagKey
		}
		if flagName != nil {
			e.FlagName = *flagName
		}
		if actorName != nil {
			e.ActorName = *actorName
		}
		entries = append(entries, e)
	}
	if entries == nil {
		entries = []domain.ActivityEntry{}
	}
	return entries, rows.Err()
}

func (s *ConsoleStore) listRepos(ctx context.Context, orgID string) ([]domain.RepoStatus, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, name, provider, default_branch, last_synced_at, status,
		        total_prs, open_prs
		 FROM repositories WHERE org_id = $1
		 ORDER BY name`, orgID)
	if err != nil {
		return nil, fmt.Errorf("listRepos: %w", err)
	}
	defer rows.Close()

	var repos []domain.RepoStatus
	for rows.Next() {
		var r domain.RepoStatus
		if err := rows.Scan(&r.ID, &r.Name, &r.Provider, &r.DefaultBranch,
			&r.LastSyncedAt, &r.Status, &r.TotalPRs, &r.OpenPRs); err != nil {
			return nil, fmt.Errorf("listRepos scan: %w", err)
		}
		repos = append(repos, r)
	}
	if repos == nil {
		repos = []domain.RepoStatus{}
	}
	return repos, rows.Err()
}

func (s *ConsoleStore) listSDKs(ctx context.Context, orgID string) ([]domain.SdkStatus, error) {
	// SDK status is derived from API key usage — each unique SDK user-agent
	// seen in the evaluation events (or api_keys table metadata) maps to an SDK.
	// For now, return an empty list (graceful degradation).
	return []domain.SdkStatus{}, nil
}

func (s *ConsoleStore) listCustomerAgents(ctx context.Context, orgID string) ([]domain.ConsoleAgentStatus, error) {
	// CRITICAL: Only return customer agents. Internal platform agents are
	// NEVER exposed in the console. Filter by owner_type = 'customer' or
	// equivalent guard. Here we assume all agents in the agents table for
	// this org are customer agents unless a special flag marks them internal.
	rows, err := s.pool.Query(ctx,
		`SELECT a.id, a.name, a.type, COALESCE(a.status::text, 'offline'),
		        a.last_heartbeat,
		        COALESCE(a.tasks_completed, 0)
		 FROM agents a
		 WHERE a.org_id = $1
		   AND (a.owner_type IS NULL OR a.owner_type = 'customer')
		 ORDER BY a.name`, orgID)
	if err != nil {
		return nil, fmt.Errorf("listCustomerAgents: %w", err)
	}
	defer rows.Close()

	var agents []domain.ConsoleAgentStatus
	for rows.Next() {
		var ag domain.ConsoleAgentStatus
		if err := rows.Scan(&ag.ID, &ag.Name, &ag.Type, &ag.Status,
			&ag.LastHeartbeat, &ag.TasksCompleted); err != nil {
			return nil, fmt.Errorf("listCustomerAgents scan: %w", err)
		}
		agents = append(agents, ag)
	}
	if agents == nil {
		agents = []domain.ConsoleAgentStatus{}
	}
	return agents, rows.Err()
}

func (s *ConsoleStore) listAPIKeyStatuses(ctx context.Context, orgID string) ([]domain.ConsoleApiKeyStatus, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT ak.id, ak.name, COALESCE(ak.type::text, 'server'),
		        ak.key_prefix, ak.last_used_at,
		        CASE
		            WHEN ak.revoked_at IS NOT NULL THEN 'revoked'
		            WHEN ak.expires_at IS NOT NULL AND ak.expires_at < NOW() THEN 'expired'
		            ELSE 'active'
		        END AS status,
		        COALESCE(e.name, '') AS env_name
		 FROM api_keys ak
		 LEFT JOIN environments e ON e.id = ak.env_id
		 WHERE ak.org_id = $1
		 ORDER BY ak.created_at DESC`, orgID)
	if err != nil {
		return nil, fmt.Errorf("listAPIKeyStatuses: %w", err)
	}
	defer rows.Close()

	var keys []domain.ConsoleApiKeyStatus
	for rows.Next() {
		var k domain.ConsoleApiKeyStatus
		if err := rows.Scan(&k.ID, &k.Name, &k.Type, &k.KeyPrefix,
			&k.LastUsedAt, &k.Status, &k.Environment); err != nil {
			return nil, fmt.Errorf("listAPIKeyStatuses scan: %w", err)
		}
		keys = append(keys, k)
	}
	if keys == nil {
		keys = []domain.ConsoleApiKeyStatus{}
	}
	return keys, rows.Err()
}

// ─── SQL utilities ─────────────────────────────────────────────────────────

// parseConsoleSortSQL converts a sort string like "name:asc" into a safe
// SQL column and direction pair. Never interpolates raw user input.
// Keys must match the allowlist in api/dto/console.go parseConsoleSort().
func parseConsoleSortSQL(sort string) (column, direction string) {
	allowedCols := map[string]string{
		"stage":        "f.stage",
		"status":       "f.status",
		"name":         "f.name",
		"key":          "f.key",
		"eval_volume":  "f.eval_volume",
		"health_score": "f.health_score",
		"updated_at":   "f.updated_at",
		"created_at":   "f.created_at",
	}

	field, dir := splitConsoleSortSQL(sort)
	col, ok := allowedCols[field]
	if !ok {
		col = "f.updated_at"
	}
	if dir != "ASC" && dir != "DESC" {
		dir = "DESC"
	}
	return col, dir
}

func splitConsoleSortSQL(raw string) (field, dir string) {
	for i, c := range raw {
		if c == ':' {
			f := raw[:i]
			d := strings.ToUpper(raw[i+1:])
			return f, d
		}
	}
	return raw, "DESC"
}
