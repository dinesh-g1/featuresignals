package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store"
)

// ComplianceStore implements store.ComplianceStore with PostgreSQL.
type ComplianceStore struct {
	pool *pgxpool.Pool
}

// NewComplianceStore creates a new ComplianceStore.
func NewComplianceStore(pool *pgxpool.Pool) *ComplianceStore {
	return &ComplianceStore{pool: pool}
}

// ─── Approved Providers ──────────────────────────────────────────────────

func (s *ComplianceStore) ListApprovedProviders(ctx context.Context, orgID string) ([]domain.ApprovedLLMProvider, error) {
	query := `SELECT id, org_id, name, model, endpoint_url, is_self_hosted,
		data_region, priority, api_key_hash, api_key_prefix, created_at
		FROM approved_llm_providers WHERE org_id = $1 ORDER BY priority ASC`

	rows, err := s.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("list approved providers: %w", err)
	}
	defer rows.Close()

	var providers []domain.ApprovedLLMProvider
	for rows.Next() {
		var p domain.ApprovedLLMProvider
		if err := rows.Scan(&p.ID, &p.OrgID, &p.Name, &p.Model, &p.EndpointURL,
			&p.IsSelfHosted, &p.DataRegion, &p.Priority, &p.APIKeyHash,
			&p.APIKeyPrefix, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan approved provider: %w", err)
		}
		providers = append(providers, p)
	}
	if providers == nil {
		providers = []domain.ApprovedLLMProvider{}
	}
	return providers, nil
}

func (s *ComplianceStore) GetApprovedProvider(ctx context.Context, id string) (*domain.ApprovedLLMProvider, error) {
	query := `SELECT id, org_id, name, model, endpoint_url, is_self_hosted,
		data_region, priority, api_key_hash, api_key_prefix, created_at
		FROM approved_llm_providers WHERE id = $1`

	var p domain.ApprovedLLMProvider
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&p.ID, &p.OrgID, &p.Name, &p.Model, &p.EndpointURL,
		&p.IsSelfHosted, &p.DataRegion, &p.Priority, &p.APIKeyHash,
		&p.APIKeyPrefix, &p.CreatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("approved provider %w", err)
		}
		return nil, fmt.Errorf("get approved provider: %w", err)
	}
	return &p, nil
}

func (s *ComplianceStore) UpsertApprovedProvider(ctx context.Context, p *domain.ApprovedLLMProvider) error {
	query := `INSERT INTO approved_llm_providers (org_id, name, model, endpoint_url,
		is_self_hosted, data_region, priority, api_key_hash, api_key_prefix, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, NOW())
		ON CONFLICT (id) DO UPDATE SET
		name = EXCLUDED.name, model = EXCLUDED.model,
		endpoint_url = EXCLUDED.endpoint_url, is_self_hosted = EXCLUDED.is_self_hosted,
		data_region = EXCLUDED.data_region, priority = EXCLUDED.priority,
		api_key_hash = EXCLUDED.api_key_hash, api_key_prefix = EXCLUDED.api_key_prefix`

	_, err := s.pool.Exec(ctx, query,
		p.OrgID, p.Name, p.Model, p.EndpointURL,
		p.IsSelfHosted, p.DataRegion, p.Priority, p.APIKeyHash, p.APIKeyPrefix,
	)
	if err != nil {
		return fmt.Errorf("upsert approved provider: %w", err)
	}
	return nil
}

func (s *ComplianceStore) DeleteApprovedProvider(ctx context.Context, orgID, id string) error {
	query := `DELETE FROM approved_llm_providers WHERE id = $1 AND org_id = $2`
	result, err := s.pool.Exec(ctx, query, id, orgID)
	if err != nil {
		return fmt.Errorf("delete approved provider: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("approved provider %w", pgx.ErrNoRows)
	}
	return nil
}

// ─── Redaction Rules ─────────────────────────────────────────────────────

func (s *ComplianceStore) ListRedactionRules(ctx context.Context, orgID string) ([]domain.RedactionRule, error) {
	query := `SELECT id, org_id, name, pattern, replacement, apply_to, is_enabled, created_at
		FROM redaction_rules WHERE org_id = $1 ORDER BY name ASC`

	rows, err := s.pool.Query(ctx, query, orgID)
	if err != nil {
		return nil, fmt.Errorf("list redaction rules: %w", err)
	}
	defer rows.Close()

	var rules []domain.RedactionRule
	for rows.Next() {
		var r domain.RedactionRule
		if err := rows.Scan(&r.ID, &r.OrgID, &r.Name, &r.Pattern, &r.Replacement,
			&r.ApplyTo, &r.IsEnabled, &r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan redaction rule: %w", err)
		}
		rules = append(rules, r)
	}
	if rules == nil {
		rules = []domain.RedactionRule{}
	}
	return rules, nil
}

func (s *ComplianceStore) UpsertRedactionRule(ctx context.Context, r *domain.RedactionRule) error {
	query := `INSERT INTO redaction_rules (org_id, name, pattern, replacement, apply_to, is_enabled, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, NOW())
		ON CONFLICT (id) DO UPDATE SET
		name = EXCLUDED.name, pattern = EXCLUDED.pattern,
		replacement = EXCLUDED.replacement, apply_to = EXCLUDED.apply_to,
		is_enabled = EXCLUDED.is_enabled`

	_, err := s.pool.Exec(ctx, query,
		r.OrgID, r.Name, r.Pattern, r.Replacement, r.ApplyTo, r.IsEnabled,
	)
	if err != nil {
		return fmt.Errorf("upsert redaction rule: %w", err)
	}
	return nil
}

func (s *ComplianceStore) DeleteRedactionRule(ctx context.Context, orgID, id string) error {
	query := `DELETE FROM redaction_rules WHERE id = $1 AND org_id = $2`
	result, err := s.pool.Exec(ctx, query, id, orgID)
	if err != nil {
		return fmt.Errorf("delete redaction rule: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("redaction rule %w", pgx.ErrNoRows)
	}
	return nil
}

// ─── Compliance Policy ───────────────────────────────────────────────────

func (s *ComplianceStore) GetCompliancePolicy(ctx context.Context, orgID string) (*domain.LLMCompliancePolicy, error) {
	query := `SELECT org_id, mode, allowed_provider_ids, default_provider_id,
		require_audit_log, require_data_masking, allowed_data_regions,
		max_tokens_per_call, enable_cost_tracking, monthly_budget_cents, updated_at
		FROM llm_compliance_policies WHERE org_id = $1`

	var p domain.LLMCompliancePolicy
	err := s.pool.QueryRow(ctx, query, orgID).Scan(
		&p.OrgID, &p.Mode, &p.AllowedProviderIDs, &p.DefaultProviderID,
		&p.RequireAuditLog, &p.RequireDataMasking, &p.AllowedDataRegions,
		&p.MaxTokensPerCall, &p.EnableCostTracking, &p.MonthlyBudgetCents, &p.UpdatedAt,
	)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, fmt.Errorf("compliance policy %w", err)
		}
		return nil, fmt.Errorf("get compliance policy: %w", err)
	}
	return &p, nil
}

func (s *ComplianceStore) UpsertCompliancePolicy(ctx context.Context, p *domain.LLMCompliancePolicy) error {
	query := `INSERT INTO llm_compliance_policies (org_id, mode, allowed_provider_ids,
		default_provider_id, require_audit_log, require_data_masking,
		allowed_data_regions, max_tokens_per_call, enable_cost_tracking,
		monthly_budget_cents, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW())
		ON CONFLICT (org_id) DO UPDATE SET
		mode = EXCLUDED.mode,
		allowed_provider_ids = EXCLUDED.allowed_provider_ids,
		default_provider_id = EXCLUDED.default_provider_id,
		require_audit_log = EXCLUDED.require_audit_log,
		require_data_masking = EXCLUDED.require_data_masking,
		allowed_data_regions = EXCLUDED.allowed_data_regions,
		max_tokens_per_call = EXCLUDED.max_tokens_per_call,
		enable_cost_tracking = EXCLUDED.enable_cost_tracking,
		monthly_budget_cents = EXCLUDED.monthly_budget_cents,
		updated_at = NOW()`

	_, err := s.pool.Exec(ctx, query,
		p.OrgID, string(p.Mode), p.AllowedProviderIDs,
		p.DefaultProviderID, p.RequireAuditLog, p.RequireDataMasking,
		p.AllowedDataRegions, p.MaxTokensPerCall, p.EnableCostTracking,
		p.MonthlyBudgetCents,
	)
	if err != nil {
		return fmt.Errorf("upsert compliance policy: %w", err)
	}
	return nil
}

// ─── LLM Interaction Audit Log ──────────────────────────────────────────

func (s *ComplianceStore) RecordLLMInteraction(ctx context.Context, r *domain.LLMInteractionRecord) error {
	query := `INSERT INTO llm_interaction_log (org_id, scan_id, flag_key, operation,
		provider_name, model, endpoint, data_region, prompt_tokens, completion_tokens,
		total_tokens, cost_cents, duration_ms, status_code, error_message,
		encrypted_prompt_hash, file_paths, bytes_sent, bytes_received, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())`

	_, err := s.pool.Exec(ctx, query,
		r.OrgID, r.ScanID, r.FlagKey, r.Operation,
		r.ProviderName, r.Model, r.Endpoint, r.DataRegion,
		r.PromptTokens, r.CompletionTokens, r.TotalTokens,
		r.CostCents, r.DurationMs, r.StatusCode, r.ErrorMessage,
		r.EncryptedPromptHash, r.FilePaths, r.BytesSent, r.BytesReceived,
	)
	if err != nil {
		return fmt.Errorf("record LLM interaction: %w", err)
	}
	return nil
}

func (s *ComplianceStore) QueryLLMInteractions(ctx context.Context, orgID string, filter store.LLMInteractionFilter) ([]domain.LLMInteractionRecord, error) {
	query := `SELECT id, org_id, scan_id, flag_key, operation, provider_name, model,
		endpoint, data_region, prompt_tokens, completion_tokens, total_tokens,
		cost_cents, duration_ms, status_code, error_message, encrypted_prompt_hash,
		file_paths, bytes_sent, bytes_received, created_at
		FROM llm_interaction_log WHERE org_id = $1`
	args := []interface{}{orgID}
	argIdx := 2

	if filter.Operation != "" {
		query += fmt.Sprintf(" AND operation = $%d", argIdx)
		args = append(args, filter.Operation)
		argIdx++
	}
	if filter.Provider != "" {
		query += fmt.Sprintf(" AND provider_name = $%d", argIdx)
		args = append(args, filter.Provider)
		argIdx++
	}
	if filter.FlagKey != "" {
		query += fmt.Sprintf(" AND flag_key = $%d", argIdx)
		args = append(args, filter.FlagKey)
		argIdx++
	}
	if filter.ScanID != "" {
		query += fmt.Sprintf(" AND scan_id = $%d", argIdx)
		args = append(args, filter.ScanID)
		argIdx++
	}
	if filter.Status > 0 {
		query += fmt.Sprintf(" AND status_code = $%d", argIdx)
		args = append(args, filter.Status)
		argIdx++
	}

	limit := filter.Limit
	if limit <= 0 {
		limit = 50
	}
	query += " ORDER BY created_at DESC LIMIT $" + fmt.Sprintf("%d", argIdx)
	args = append(args, limit)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, fmt.Errorf("query LLM interactions: %w", err)
	}
	defer rows.Close()

	var records []domain.LLMInteractionRecord
	for rows.Next() {
		var r domain.LLMInteractionRecord
		if err := rows.Scan(&r.ID, &r.OrgID, &r.ScanID, &r.FlagKey, &r.Operation,
			&r.ProviderName, &r.Model, &r.Endpoint, &r.DataRegion,
			&r.PromptTokens, &r.CompletionTokens, &r.TotalTokens,
			&r.CostCents, &r.DurationMs, &r.StatusCode, &r.ErrorMessage,
			&r.EncryptedPromptHash, &r.FilePaths, &r.BytesSent, &r.BytesReceived,
			&r.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan LLM interaction: %w", err)
		}
		records = append(records, r)
	}
	if records == nil {
		records = []domain.LLMInteractionRecord{}
	}
	return records, nil
}

func (s *ComplianceStore) CountLLMInteractions(ctx context.Context, orgID string, filter store.LLMInteractionFilter) (int, error) {
	query := `SELECT COUNT(*) FROM llm_interaction_log WHERE org_id = $1`
	args := []interface{}{orgID}

	if filter.Operation != "" {
		query += " AND operation = $2"
		args = append(args, filter.Operation)
	}

	var count int
	err := s.pool.QueryRow(ctx, query, args...).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("count LLM interactions: %w", err)
	}
	return count, nil
}

func (s *ComplianceStore) GetLLMBudgetUsage(ctx context.Context, orgID string, since time.Time) (int, error) {
	query := `SELECT COALESCE(SUM(cost_cents), 0) FROM llm_interaction_log
		WHERE org_id = $1 AND created_at >= $2`

	var total int
	err := s.pool.QueryRow(ctx, query, orgID, since).Scan(&total)
	if err != nil {
		return 0, fmt.Errorf("get LLM budget usage: %w", err)
	}
	return total, nil
}