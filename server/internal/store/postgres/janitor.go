package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/store"
)

// JanitorStore implements store.JanitorStore with PostgreSQL.
type JanitorStore struct {
	pool *pgxpool.Pool
}

// NewJanitorStore creates a new JanitorStore.
func NewJanitorStore(pool *pgxpool.Pool) *JanitorStore {
	return &JanitorStore{pool: pool}
}

// ─── Config ──────────────────────────────────────────────────────────────

func (s *JanitorStore) GetJanitorConfig(ctx context.Context, orgID string) (*store.JanitorConfig, error) {
	query := `SELECT org_id, scan_schedule, stale_threshold_days, auto_generate_pr,
		branch_prefix, notifications_enabled, llm_provider, llm_model,
		llm_temperature, llm_min_confidence, updated_at
		FROM janitor_config WHERE org_id = $1`

	var cfg store.JanitorConfig
	err := s.pool.QueryRow(ctx, query, orgID).Scan(
		&cfg.OrgID, &cfg.ScanSchedule, &cfg.StaleThreshold, &cfg.AutoGeneratePR,
		&cfg.BranchPrefix, &cfg.Notifications, &cfg.LLMProvider, &cfg.LLMModel,
		&cfg.LLMTemperature, &cfg.LLMMinConfidence, &cfg.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Return defaults
			return &store.JanitorConfig{
				OrgID:            orgID,
				ScanSchedule:     "weekly",
				StaleThreshold:   90,
				AutoGeneratePR:   false,
				BranchPrefix:     "janitor/",
				Notifications:    true,
				LLMProvider:      "deepseek",
				LLMModel:         "deepseek-chat",
				LLMTemperature:   0.10,
				LLMMinConfidence: 0.85,
				UpdatedAt:        time.Now().UTC(),
			}, nil
		}
		return nil, fmt.Errorf("get janitor config: %w", err)
	}
	return &cfg, nil
}

func (s *JanitorStore) UpsertJanitorConfig(ctx context.Context, cfg *store.JanitorConfig) error {
	query := `INSERT INTO janitor_config (org_id, scan_schedule, stale_threshold_days, auto_generate_pr,
		branch_prefix, notifications_enabled, llm_provider, llm_model,
		llm_temperature, llm_min_confidence, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
		ON CONFLICT (org_id) DO UPDATE SET
		scan_schedule = EXCLUDED.scan_schedule,
		stale_threshold_days = EXCLUDED.stale_threshold_days,
		auto_generate_pr = EXCLUDED.auto_generate_pr,
		branch_prefix = EXCLUDED.branch_prefix,
		notifications_enabled = EXCLUDED.notifications_enabled,
		llm_provider = EXCLUDED.llm_provider,
		llm_model = EXCLUDED.llm_model,
		llm_temperature = EXCLUDED.llm_temperature,
		llm_min_confidence = EXCLUDED.llm_min_confidence,
		updated_at = NOW()`

	_, err := s.pool.Exec(ctx, query,
		cfg.OrgID, cfg.ScanSchedule, cfg.StaleThreshold, cfg.AutoGeneratePR,
		cfg.BranchPrefix, cfg.Notifications, cfg.LLMProvider, cfg.LLMModel,
		cfg.LLMTemperature, cfg.LLMMinConfidence,
	)
	if err != nil {
		return fmt.Errorf("upsert janitor config: %w", err)
	}
	return nil
}

// ─── Repositories ────────────────────────────────────────────────────────

func (s *JanitorStore) ListRepositories(ctx context.Context, orgID string) ([]store.JanitorRepository, error) {
	query := `SELECT id, org_id, provider, provider_repo_id, name, full_name,
		default_branch, private, connected, last_scanned, created_at
		FROM janitor_repositories WHERE org_id = $1 AND connected = true
		ORDER BY name ASC`

	rows, err := s.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("list repositories: %w", err)
	}
	defer rows.Close()

	var repos []store.JanitorRepository
	for rows.Next() {
		var r store.JanitorRepository
		if err := rows.Scan(&r.ID, &r.OrgID, &r.Provider, &r.ProviderRepoID,
			&r.Name, &r.FullName, &r.DefaultBranch, &r.Private, &r.Connected,
			&r.LastScanned, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan repository: %w", err)
		}
		repos = append(repos, r)
	}

	if repos == nil {
		repos = []store.JanitorRepository{}
	}
	return repos, nil
}

func (s *JanitorStore) GetRepository(ctx context.Context, id string) (*store.JanitorRepository, error) {
	query := `SELECT id, org_id, provider, provider_repo_id, name, full_name,
		default_branch, private, connected, last_scanned, encrypted_token, created_at
		FROM janitor_repositories WHERE id = $1`

	var r store.JanitorRepository
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&r.ID, &r.OrgID, &r.Provider, &r.ProviderRepoID, &r.Name, &r.FullName,
		&r.DefaultBranch, &r.Private, &r.Connected, &r.LastScanned,
		&r.EncryptedToken, &r.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("repository %w", err)
		}
		return nil, fmt.Errorf("get repository: %w", err)
	}
	return &r, nil
}

func (s *JanitorStore) ConnectRepository(ctx context.Context, repo *store.JanitorRepository) error {
	query := `INSERT INTO janitor_repositories (org_id, provider, provider_repo_id, name, full_name,
		default_branch, private, encrypted_token, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())
		ON CONFLICT (org_id, provider, provider_repo_id) DO UPDATE SET
		name = EXCLUDED.name, full_name = EXCLUDED.full_name,
		default_branch = EXCLUDED.default_branch, private = EXCLUDED.private,
		connected = true, encrypted_token = EXCLUDED.encrypted_token`

	_, err := s.pool.Exec(ctx, query,
		repo.OrgID, repo.Provider, repo.ProviderRepoID, repo.Name, repo.FullName,
		repo.DefaultBranch, repo.Private, repo.EncryptedToken,
	)
	if err != nil {
		return fmt.Errorf("connect repository: %w", err)
	}
	return nil
}

func (s *JanitorStore) DisconnectRepository(ctx context.Context, orgID, id string) error {
	query := `UPDATE janitor_repositories SET connected = false WHERE id = $1 AND org_id = $2`
	result, err := s.pool.Exec(ctx, query, id, orgID)
	if err != nil {
		return fmt.Errorf("disconnect repository: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("repository %w", pgx.ErrNoRows)
	}
	return nil
}

func (s *JanitorStore) UpdateRepositoryLastScanned(ctx context.Context, id string, t time.Time) error {
	query := `UPDATE janitor_repositories SET last_scanned = $1 WHERE id = $2`
	_, err := s.pool.Exec(ctx, query, t, id)
	if err != nil {
		return fmt.Errorf("update repository last scanned: %w", err)
	}
	return nil
}

// ─── Scans ───────────────────────────────────────────────────────────────

func (s *JanitorStore) CreateScan(ctx context.Context, scan *store.JanitorScan) error {
	query := `INSERT INTO janitor_scans (id, org_id, status, progress, total_repos,
		completed_repos, total_flags, stale_flags_found, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`

	if scan.ID == "" {
		scan.ID = fmt.Sprintf("scan_%d", time.Now().UnixNano())
	}

	_, err := s.pool.Exec(ctx, query,
		scan.ID, scan.OrgID, scan.Status, scan.Progress, scan.TotalRepos,
		scan.CompletedRepos, scan.TotalFlags, scan.StaleFlagsFound,
	)
	if err != nil {
		return fmt.Errorf("create scan: %w", err)
	}
	return nil
}

func (s *JanitorStore) UpdateScan(ctx context.Context, id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	setClauses := ""
	args := []interface{}{id}
	argIdx := 2

	for key, val := range updates {
		if setClauses != "" {
			setClauses += ", "
		}
		setClauses += fmt.Sprintf("%s = $%d", key, argIdx)
		args = append(args, val)
		argIdx++
	}

	query := fmt.Sprintf("UPDATE janitor_scans SET %s WHERE id = $1", setClauses)
	_, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("update scan: %w", err)
	}
	return nil
}

func (s *JanitorStore) GetScan(ctx context.Context, id string) (*store.JanitorScan, error) {
	query := `SELECT id, org_id, status, progress, total_repos, completed_repos,
		total_flags, stale_flags_found, started_at, completed_at, error_message, created_at
		FROM janitor_scans WHERE id = $1`

	var scan store.JanitorScan
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&scan.ID, &scan.OrgID, &scan.Status, &scan.Progress, &scan.TotalRepos,
		&scan.CompletedRepos, &scan.TotalFlags, &scan.StaleFlagsFound,
		&scan.StartedAt, &scan.CompletedAt, &scan.ErrorMessage, &scan.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("scan %w", err)
		}
		return nil, fmt.Errorf("get scan: %w", err)
	}
	return &scan, nil
}

func (s *JanitorStore) ListScans(ctx context.Context, orgID string, limit int) ([]store.JanitorScan, error) {
	if limit <= 0 {
		limit = 20
	}

	query := `SELECT id, org_id, status, progress, total_repos, completed_repos,
		total_flags, stale_flags_found, started_at, completed_at, error_message, created_at
		FROM janitor_scans WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2`

	rows, err := s.pool.Query(ctx, query, orgID, limit)
	if err != nil {
		return nil, fmt.Errorf("list scans: %w", err)
	}
	defer rows.Close()

	var scans []store.JanitorScan
	for rows.Next() {
		var s store.JanitorScan
		if err := rows.Scan(&s.ID, &s.OrgID, &s.Status, &s.Progress, &s.TotalRepos,
			&s.CompletedRepos, &s.TotalFlags, &s.StaleFlagsFound,
			&s.StartedAt, &s.CompletedAt, &s.ErrorMessage, &s.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan scan: %w", err)
		}
		scans = append(scans, s)
	}

	if scans == nil {
		scans = []store.JanitorScan{}
	}
	return scans, nil
}

// ─── Scan Events ─────────────────────────────────────────────────────────

func (s *JanitorStore) AppendScanEvent(ctx context.Context, event *store.ScanEventRecord) error {
	query := `INSERT INTO janitor_scan_events (scan_id, event_type, event_data, created_at)
		VALUES ($1, $2, $3, NOW()) RETURNING id`

	err := s.pool.QueryRow(ctx, query, event.ScanID, event.EventType, event.EventData).Scan(&event.ID)
	if err != nil {
		return fmt.Errorf("append scan event: %w", err)
	}
	return nil
}

func (s *JanitorStore) GetScanEventsSince(ctx context.Context, scanID string, afterID int64) ([]store.ScanEventRecord, error) {
	query := `SELECT id, scan_id, event_type, event_data, created_at
		FROM janitor_scan_events WHERE scan_id = $1 AND id > $2 ORDER BY id ASC`

	rows, err := s.pool.Query(ctx, query, scanID, afterID)
	if err != nil {
		return nil, fmt.Errorf("get scan events: %w", err)
	}
	defer rows.Close()

	var events []store.ScanEventRecord
	for rows.Next() {
		var e store.ScanEventRecord
		if err := rows.Scan(&e.ID, &e.ScanID, &e.EventType, &e.EventData, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan event: %w", err)
		}
		events = append(events, e)
	}

	if events == nil {
		events = []store.ScanEventRecord{}
	}
	return events, nil
}

// ─── Stale Flags ─────────────────────────────────────────────────────────

func (s *JanitorStore) ListStaleFlags(ctx context.Context, orgID string, dismissed *bool, limit int) ([]store.StaleFlag, error) {
	if limit <= 0 {
		limit = 100
	}

	query := `SELECT id, org_id, scan_id, flag_key, flag_name, environment,
		days_served, percentage_true, safe_to_remove, analysis_confidence,
		llm_provider, llm_model, tokens_used, dismissed, dismiss_reason,
		last_evaluated, detected_at
		FROM janitor_stale_flags WHERE org_id = $1`
	args := []interface{}{orgID}
	argIdx := 2

	if dismissed != nil {
		query += fmt.Sprintf(" AND dismissed = $%d", argIdx)
		args = append(args, *dismissed)
		argIdx++
	} else {
		query += " AND dismissed = false"
	}

	query += " ORDER BY days_served DESC, percentage_true DESC LIMIT $" + fmt.Sprintf("%d", argIdx)
	args = append(args, limit)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list stale flags: %w", err)
	}
	defer rows.Close()

	var flags []store.StaleFlag
	for rows.Next() {
		var f store.StaleFlag
		if err := rows.Scan(&f.ID, &f.OrgID, &f.ScanID, &f.FlagKey, &f.FlagName,
			&f.Environment, &f.DaysServed, &f.PercentageTrue, &f.SafeToRemove,
			&f.AnalysisConfidence, &f.LLMProvider, &f.LLMModel, &f.TokensUsed,
			&f.Dismissed, &f.DismissReason, &f.LastEvaluated, &f.DetectedAt); err != nil {
			return nil, fmt.Errorf("scan stale flag: %w", err)
		}
		flags = append(flags, f)
	}

	if flags == nil {
		flags = []store.StaleFlag{}
	}
	return flags, nil
}

func (s *JanitorStore) GetStaleFlag(ctx context.Context, id string) (*store.StaleFlag, error) {
	query := `SELECT id, org_id, scan_id, flag_key, flag_name, environment,
		days_served, percentage_true, safe_to_remove, analysis_confidence,
		llm_provider, llm_model, tokens_used, dismissed, dismiss_reason,
		last_evaluated, detected_at
		FROM janitor_stale_flags WHERE id = $1`

	var f store.StaleFlag
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&f.ID, &f.OrgID, &f.ScanID, &f.FlagKey, &f.FlagName,
		&f.Environment, &f.DaysServed, &f.PercentageTrue, &f.SafeToRemove,
		&f.AnalysisConfidence, &f.LLMProvider, &f.LLMModel, &f.TokensUsed,
		&f.Dismissed, &f.DismissReason, &f.LastEvaluated, &f.DetectedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("stale flag %w", err)
		}
		return nil, fmt.Errorf("get stale flag: %w", err)
	}
	return &f, nil
}

func (s *JanitorStore) UpsertStaleFlag(ctx context.Context, flag *store.StaleFlag) error {
	query := `INSERT INTO janitor_stale_flags (org_id, scan_id, flag_key, flag_name, environment,
		days_served, percentage_true, safe_to_remove, analysis_confidence,
		llm_provider, llm_model, tokens_used, dismissed, last_evaluated, detected_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, NOW())
		ON CONFLICT (org_id, flag_key, scan_id) DO UPDATE SET
		days_served = EXCLUDED.days_served,
		percentage_true = EXCLUDED.percentage_true,
		safe_to_remove = EXCLUDED.safe_to_remove,
		analysis_confidence = EXCLUDED.analysis_confidence,
		llm_provider = EXCLUDED.llm_provider,
		llm_model = EXCLUDED.llm_model,
		tokens_used = EXCLUDED.tokens_used,
		last_evaluated = EXCLUDED.last_evaluated`

	_, err := s.pool.Exec(ctx, query,
		flag.OrgID, flag.ScanID, flag.FlagKey, flag.FlagName, flag.Environment,
		flag.DaysServed, flag.PercentageTrue, flag.SafeToRemove,
		flag.AnalysisConfidence, flag.LLMProvider, flag.LLMModel, flag.TokensUsed,
		flag.Dismissed, flag.LastEvaluated,
	)
	if err != nil {
		return fmt.Errorf("upsert stale flag: %w", err)
	}
	return nil
}

func (s *JanitorStore) DismissStaleFlag(ctx context.Context, orgID, flagKey, reason string) error {
	query := `UPDATE janitor_stale_flags SET dismissed = true, dismiss_reason = $1
		WHERE org_id = $2 AND flag_key = $3`

	result, err := s.pool.Exec(ctx, query, reason, orgID, flagKey)
	if err != nil {
		return fmt.Errorf("dismiss stale flag: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("stale flag not found for org %s and key %s", orgID, flagKey)
	}
	return nil
}

// ─── Janitor PRs ─────────────────────────────────────────────────────────

func (s *JanitorStore) CreateJanitorPR(ctx context.Context, pr *store.JanitorPR) error {
	query := `INSERT INTO janitor_prs (org_id, flag_key, stale_flag_id, repository_id,
		provider, pr_number, pr_url, branch_name, status, analysis_confidence,
		llm_provider, llm_model, tokens_used, validation_passed, files_modified, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, NOW(), NOW())`

	_, err := s.pool.Exec(ctx, query,
		pr.OrgID, pr.FlagKey, pr.StaleFlagID, pr.RepositoryID,
		pr.Provider, pr.PRNumber, pr.PRURL, pr.BranchName, pr.Status,
		pr.AnalysisConfidence, pr.LLMProvider, pr.LLMModel, pr.TokensUsed,
		pr.ValidationPassed, pr.FilesModified,
	)
	if err != nil {
		return fmt.Errorf("create janitor PR: %w", err)
	}
	return nil
}

func (s *JanitorStore) UpdateJanitorPR(ctx context.Context, id string, updates map[string]interface{}) error {
	if len(updates) == 0 {
		return nil
	}

	updates["updated_at"] = time.Now().UTC()
	setClauses := ""
	args := []interface{}{id}
	argIdx := 2

	for key, val := range updates {
		if setClauses != "" {
			setClauses += ", "
		}
		setClauses += fmt.Sprintf("%s = $%d", key, argIdx)
		args = append(args, val)
		argIdx++
	}

	query := fmt.Sprintf("UPDATE janitor_prs SET %s WHERE id = $1", setClauses)
	_, err := s.pool.Exec(ctx, query, args...)
	if err != nil {
		return fmt.Errorf("update janitor PR: %w", err)
	}
	return nil
}

func (s *JanitorStore) ListJanitorPRs(ctx context.Context, orgID string, status string) ([]store.JanitorPR, error) {
	query := `SELECT id, org_id, flag_key, stale_flag_id, repository_id, provider,
		pr_number, pr_url, branch_name, status, analysis_confidence,
		llm_provider, llm_model, tokens_used, validation_passed, files_modified,
		created_at, updated_at
		FROM janitor_prs WHERE org_id = $1`
	args := []interface{}{orgID}
	argIdx := 2

	if status != "" {
		query += fmt.Sprintf(" AND status = $%d", argIdx)
		args = append(args, status)
		argIdx++
	}

	query += " ORDER BY created_at DESC LIMIT 100"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("list janitor PRs: %w", err)
	}
	defer rows.Close()

	var prs []store.JanitorPR
	for rows.Next() {
		var p store.JanitorPR
		if err := rows.Scan(&p.ID, &p.OrgID, &p.FlagKey, &p.StaleFlagID, &p.RepositoryID,
			&p.Provider, &p.PRNumber, &p.PRURL, &p.BranchName, &p.Status,
			&p.AnalysisConfidence, &p.LLMProvider, &p.LLMModel, &p.TokensUsed,
			&p.ValidationPassed, &p.FilesModified, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan janitor PR: %w", err)
		}
		prs = append(prs, p)
	}

	if prs == nil {
		prs = []store.JanitorPR{}
	}
	return prs, nil
}