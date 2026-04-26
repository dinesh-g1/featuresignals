package postgres

import (
	"context"
	"fmt"
	"strconv"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Licenses ─────────────────────────────────────────────────────────

func (s *Store) ListLicenses(ctx context.Context, plan, deploymentModel, search string) ([]domain.License, int, error) {
	query := `SELECT id, license_key, COALESCE(org_id,''), customer_name, COALESCE(customer_email,''),
		plan, COALESCE(billing_cycle,''), COALESCE(max_seats,0), COALESCE(max_projects,0),
		COALESCE(max_environments,0), COALESCE(max_evaluations_per_month,0),
		COALESCE(max_api_calls_per_month,0), COALESCE(max_storage_gb,0),
		features, COALESCE(current_seats,0), COALESCE(current_projects,0),
		COALESCE(current_environments,0), COALESCE(evaluations_this_month,0),
		COALESCE(api_calls_this_month,0), COALESCE(storage_used_gb,0),
		last_usage_reset, COALESCE(breach_count,0), last_breach_at,
		COALESCE(breach_action,''), issued_at, expires_at, revoked_at,
		COALESCE(revoked_reason,''), deployment_model, phone_home_enabled,
		phone_home_interval_hours, last_phone_home_at, COALESCE(phone_home_status,''),
		created_at, updated_at
		FROM licenses WHERE 1=1`
	args := []any{}
	argNum := 1

	if plan != "" {
		query += " AND plan = $" + strconv.Itoa(argNum)
		args = append(args, plan)
		argNum++
	}
	if deploymentModel != "" {
		query += " AND deployment_model = $" + strconv.Itoa(argNum)
		args = append(args, deploymentModel)
		argNum++
	}
	if search != "" {
		query += " AND (customer_name ILIKE $" + strconv.Itoa(argNum) + " OR customer_email ILIKE $" + strconv.Itoa(argNum) + ")"
		args = append(args, "%"+search+"%")
		argNum++
	}

	query += " ORDER BY created_at DESC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, wrapNotFound(err, "list licenses")
	}
	defer rows.Close()

	var licenses []domain.License
	for rows.Next() {
		var l domain.License
		if err := rows.Scan(
			&l.ID, &l.LicenseKey, &l.OrgID, &l.CustomerName, &l.CustomerEmail,
			&l.Plan, &l.BillingCycle, &l.MaxSeats, &l.MaxProjects,
			&l.MaxEnvironments, &l.MaxEvalsPerMonth, &l.MaxAPICallsPerMonth, &l.MaxStorageGB,
			&l.Features, &l.CurrentSeats, &l.CurrentProjects,
			&l.CurrentEnvironments, &l.EvalsThisMonth, &l.APICallsThisMonth, &l.StorageUsedGB,
			&l.LastUsageReset, &l.BreachCount, &l.LastBreachAt,
			&l.BreachAction, &l.IssuedAt, &l.ExpiresAt, &l.RevokedAt,
			&l.RevokedReason, &l.DeploymentModel, &l.PhoneHomeEnabled,
			&l.PhoneHomeIntervalHrs, &l.LastPhoneHomeAt, &l.PhoneHomeStatus,
			&l.CreatedAt, &l.UpdatedAt,
		); err != nil {
			return nil, 0, wrapNotFound(err, "scan license")
		}
		licenses = append(licenses, l)
	}

	return licenses, len(licenses), nil
}

func (s *Store) GetLicense(ctx context.Context, id string) (*domain.License, error) {
	var l domain.License
	err := s.pool.QueryRow(ctx, `
		SELECT id, license_key, COALESCE(org_id,''), customer_name, COALESCE(customer_email,''),
			plan, COALESCE(billing_cycle,''), COALESCE(max_seats,0), COALESCE(max_projects,0),
			COALESCE(max_environments,0), COALESCE(max_evaluations_per_month,0),
			COALESCE(max_api_calls_per_month,0), COALESCE(max_storage_gb,0),
			features, COALESCE(current_seats,0), COALESCE(current_projects,0),
			COALESCE(current_environments,0), COALESCE(evaluations_this_month,0),
			COALESCE(api_calls_this_month,0), COALESCE(storage_used_gb,0),
			last_usage_reset, COALESCE(breach_count,0), last_breach_at,
			COALESCE(breach_action,''), issued_at, expires_at, revoked_at,
			COALESCE(revoked_reason,''), deployment_model, phone_home_enabled,
			phone_home_interval_hours, last_phone_home_at, COALESCE(phone_home_status,''),
			created_at, updated_at
		FROM licenses WHERE id = $1`, id).Scan(
		&l.ID, &l.LicenseKey, &l.OrgID, &l.CustomerName, &l.CustomerEmail,
		&l.Plan, &l.BillingCycle, &l.MaxSeats, &l.MaxProjects,
		&l.MaxEnvironments, &l.MaxEvalsPerMonth, &l.MaxAPICallsPerMonth, &l.MaxStorageGB,
		&l.Features, &l.CurrentSeats, &l.CurrentProjects,
		&l.CurrentEnvironments, &l.EvalsThisMonth, &l.APICallsThisMonth, &l.StorageUsedGB,
		&l.LastUsageReset, &l.BreachCount, &l.LastBreachAt,
		&l.BreachAction, &l.IssuedAt, &l.ExpiresAt, &l.RevokedAt,
		&l.RevokedReason, &l.DeploymentModel, &l.PhoneHomeEnabled,
		&l.PhoneHomeIntervalHrs, &l.LastPhoneHomeAt, &l.PhoneHomeStatus,
		&l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "license")
	}
	return &l, nil
}

func (s *Store) GetLicenseByOrg(ctx context.Context, orgID string) (*domain.License, error) {
	var l domain.License
	err := s.pool.QueryRow(ctx, `
		SELECT id, license_key, COALESCE(org_id,''), customer_name, COALESCE(customer_email,''),
			plan, COALESCE(billing_cycle,''), COALESCE(max_seats,0), COALESCE(max_projects,0),
			COALESCE(max_environments,0), COALESCE(max_evaluations_per_month,0),
			COALESCE(max_api_calls_per_month,0), COALESCE(max_storage_gb,0),
			features, COALESCE(current_seats,0), COALESCE(current_projects,0),
			COALESCE(current_environments,0), COALESCE(evaluations_this_month,0),
			COALESCE(api_calls_this_month,0), COALESCE(storage_used_gb,0),
			last_usage_reset, COALESCE(breach_count,0), last_breach_at,
			COALESCE(breach_action,''), issued_at, expires_at, revoked_at,
			COALESCE(revoked_reason,''), deployment_model, phone_home_enabled,
			phone_home_interval_hours, last_phone_home_at, COALESCE(phone_home_status,''),
			created_at, updated_at
		FROM licenses WHERE org_id = $1 AND revoked_at IS NULL`, orgID).Scan(
		&l.ID, &l.LicenseKey, &l.OrgID, &l.CustomerName, &l.CustomerEmail,
		&l.Plan, &l.BillingCycle, &l.MaxSeats, &l.MaxProjects,
		&l.MaxEnvironments, &l.MaxEvalsPerMonth, &l.MaxAPICallsPerMonth, &l.MaxStorageGB,
		&l.Features, &l.CurrentSeats, &l.CurrentProjects,
		&l.CurrentEnvironments, &l.EvalsThisMonth, &l.APICallsThisMonth, &l.StorageUsedGB,
		&l.LastUsageReset, &l.BreachCount, &l.LastBreachAt,
		&l.BreachAction, &l.IssuedAt, &l.ExpiresAt, &l.RevokedAt,
		&l.RevokedReason, &l.DeploymentModel, &l.PhoneHomeEnabled,
		&l.PhoneHomeIntervalHrs, &l.LastPhoneHomeAt, &l.PhoneHomeStatus,
		&l.CreatedAt, &l.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "license")
	}
	return &l, nil
}

func (s *Store) CreateLicense(ctx context.Context, lic *domain.License) error {
	now := time.Now()
	return s.pool.QueryRow(ctx, `
		INSERT INTO licenses (license_key, org_id, customer_name, customer_email, plan,
			billing_cycle, max_seats, max_projects, max_environments,
			max_evaluations_per_month, max_api_calls_per_month, max_storage_gb,
			features, deployment_model, phone_home_enabled, expires_at, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		RETURNING id`,
		lic.LicenseKey, nilIfEmpty(lic.OrgID), lic.CustomerName, lic.CustomerEmail,
		lic.Plan, lic.BillingCycle, lic.MaxSeats, lic.MaxProjects, lic.MaxEnvironments,
		lic.MaxEvalsPerMonth, lic.MaxAPICallsPerMonth, lic.MaxStorageGB,
		lic.Features, lic.DeploymentModel, lic.PhoneHomeEnabled, lic.ExpiresAt, now, now,
	).Scan(&lic.ID)
}

func (s *Store) UpdateLicense(ctx context.Context, id string, updates map[string]any) error {
	setClauses := []string{"updated_at = NOW()"}
	args := []any{}
	argNum := 1
	for k, v := range updates {
		setClauses = append(setClauses, k+" = $"+strconv.Itoa(argNum))
		args = append(args, v)
		argNum++
	}
	args = append(args, id)
	query := "UPDATE licenses SET " + strings.Join(setClauses, ", ") + " WHERE id = $" + strconv.Itoa(argNum)
	_, err := s.pool.Exec(ctx, query, args...)
	return wrapNotFound(err, "update license")
}

func (s *Store) RevokeLicense(ctx context.Context, id, reason string) error {
	now := time.Now()
	_, err := s.pool.Exec(ctx,
		"UPDATE licenses SET revoked_at = $1, revoked_reason = $2, updated_at = NOW() WHERE id = $3",
		now, reason, id)
	return wrapNotFound(err, "revoke license")
}

func (s *Store) OverrideLicenseQuota(ctx context.Context, id string, updates map[string]any) error {
	return s.UpdateLicense(ctx, id, updates)
}

func (s *Store) ResetLicenseUsage(ctx context.Context, id string) error {
	now := time.Now()
	_, err := s.pool.Exec(ctx,
		"UPDATE licenses SET evaluations_this_month = 0, api_calls_this_month = 0, last_usage_reset = $1, updated_at = NOW() WHERE id = $2",
		now, id)
	return wrapNotFound(err, "reset license usage")
}

// ─── Ops Users ────────────────────────────────────────────────────────

func (s *Store) ListOpsUsers(ctx context.Context) ([]domain.OpsUser, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT ou.id, ou.user_id, ou.ops_role, ou.allowed_env_types, ou.allowed_regions,
			ou.max_sandbox_envs, ou.is_active, ou.created_at, ou.updated_at,
			COALESCE(u.email,''), COALESCE(u.name,'')
		FROM ops_users ou
		LEFT JOIN users u ON ou.user_id = u.id
		WHERE ou.is_active = true
		ORDER BY ou.created_at`)
	if err != nil {
		return nil, wrapNotFound(err, "list ops users")
	}
	defer rows.Close()

	var users []domain.OpsUser
	for rows.Next() {
		var u domain.OpsUser
		if err := rows.Scan(
			&u.ID, &u.UserID, &u.OpsRole, pqStringArray(&u.AllowedEnvTypes),
			pqStringArray(&u.AllowedRegions), &u.MaxSandboxEnvs, &u.IsActive,
			&u.CreatedAt, &u.UpdatedAt, &u.UserEmail, &u.UserName,
		); err != nil {
			return nil, wrapNotFound(err, "scan ops user")
		}
		users = append(users, u)
	}
	return users, nil
}

func (s *Store) GetOpsUser(ctx context.Context, id string) (*domain.OpsUser, error) {
	var u domain.OpsUser
	err := s.pool.QueryRow(ctx, `
		SELECT ou.id, ou.user_id, ou.ops_role, ou.allowed_env_types, ou.allowed_regions,
			ou.max_sandbox_envs, ou.is_active, ou.created_at, ou.updated_at,
			COALESCE(u.email,''), COALESCE(u.name,'')
		FROM ops_users ou LEFT JOIN users u ON ou.user_id = u.id
		WHERE ou.id = $1`, id).Scan(
		&u.ID, &u.UserID, &u.OpsRole, pqStringArray(&u.AllowedEnvTypes),
		pqStringArray(&u.AllowedRegions), &u.MaxSandboxEnvs, &u.IsActive,
		&u.CreatedAt, &u.UpdatedAt, &u.UserEmail, &u.UserName,
	)
	if err != nil {
		return nil, wrapNotFound(err, "ops user")
	}
	return &u, nil
}

func (s *Store) GetOpsUserByUserID(ctx context.Context, userID string) (*domain.OpsUser, error) {
	var u domain.OpsUser
	err := s.pool.QueryRow(ctx, `
		SELECT ou.id, ou.user_id, ou.ops_role, ou.allowed_env_types, ou.allowed_regions,
			ou.max_sandbox_envs, ou.is_active, ou.created_at, ou.updated_at,
			COALESCE(u.email,''), COALESCE(u.name,'')
		FROM ops_users ou LEFT JOIN users u ON ou.user_id = u.id
		WHERE ou.user_id = $1`, userID).Scan(
		&u.ID, &u.UserID, &u.OpsRole, pqStringArray(&u.AllowedEnvTypes),
		pqStringArray(&u.AllowedRegions), &u.MaxSandboxEnvs, &u.IsActive,
		&u.CreatedAt, &u.UpdatedAt, &u.UserEmail, &u.UserName,
	)
	if err != nil {
		return nil, wrapNotFound(err, "ops user")
	}
	return &u, nil
}

func (s *Store) CreateOpsUser(ctx context.Context, u *domain.OpsUser) error {
	now := time.Now()
	return s.pool.QueryRow(ctx, `
		INSERT INTO ops_users (user_id, ops_role, allowed_env_types, allowed_regions,
			max_sandbox_envs, is_active, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING id`,
		u.UserID, u.OpsRole, u.AllowedEnvTypes, u.AllowedRegions,
		u.MaxSandboxEnvs, u.IsActive, now, now,
	).Scan(&u.ID)
}

func (s *Store) UpdateOpsUser(ctx context.Context, id string, updates map[string]any) error {
	setClauses := []string{"updated_at = NOW()"}
	args := []any{}
	argNum := 1
	for k, v := range updates {
		setClauses = append(setClauses, k+" = $"+strconv.Itoa(argNum))
		args = append(args, v)
		argNum++
	}
	args = append(args, id)
	query := "UPDATE ops_users SET " + strings.Join(setClauses, ", ") + " WHERE id = $" + strconv.Itoa(argNum)
	_, err := s.pool.Exec(ctx, query, args...)
	return wrapNotFound(err, "update ops user")
}

func (s *Store) DeleteOpsUser(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, "DELETE FROM ops_users WHERE id = $1", id)
	return wrapNotFound(err, "delete ops user")
}

// ─── Daily Cost ──────────────────────────────────────────────────────

func (s *Store) ListOrgCostDaily(ctx context.Context, orgID, startDate, endDate string) ([]domain.OrgCostDaily, error) {
	query := "SELECT id, org_id, date::text, evaluations, storage_mb, bandwidth_mb, api_calls, active_seats, active_projects, active_environments, compute_cost, storage_cost, bandwidth_cost, observability_cost, database_cost, backup_cost, total_cost, deployment_model, created_at FROM org_cost_daily WHERE 1=1"
	args := []any{}
	argNum := 1

	if orgID != "" {
		query += " AND org_id = $" + strconv.Itoa(argNum)
		args = append(args, orgID)
		argNum++
	}
	if startDate != "" {
		query += " AND date >= $" + strconv.Itoa(argNum)
		args = append(args, startDate)
		argNum++
	}
	if endDate != "" {
		query += " AND date <= $" + strconv.Itoa(argNum)
		args = append(args, endDate)
		argNum++
	}

	query += " ORDER BY date DESC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, wrapNotFound(err, "list org costs daily")
	}
	defer rows.Close()

	var costs []domain.OrgCostDaily
	for rows.Next() {
		var c domain.OrgCostDaily
		if err := rows.Scan(&c.ID, &c.OrgID, &c.Date, &c.Evaluations, &c.StorageMB, &c.BandwidthMB, &c.APICalls, &c.ActiveSeats, &c.ActiveProjects, &c.ActiveEnvironments, &c.ComputeCost, &c.StorageCost, &c.BandwidthCost, &c.ObservabilityCost, &c.DatabaseCost, &c.BackupCost, &c.TotalCost, &c.DeploymentModel, &c.CreatedAt); err != nil {
			return nil, wrapNotFound(err, "scan org cost")
		}
		costs = append(costs, c)
	}
	return costs, nil
}

// ─── Audit ────────────────────────────────────────────────────────────

func (s *Store) ListOpsAuditLogs(ctx context.Context, action, targetType, userID, startDate, endDate string, limit, offset int) ([]domain.OpsAuditLog, int, error) {
	query := `SELECT oal.id, oal.ops_user_id, oal.action, COALESCE(oal.target_type,''),
			COALESCE(oal.target_id,''), COALESCE(oal.target_name,''), oal.details,
			COALESCE(oal.ip_address,''), COALESCE(oal.user_agent,''), oal.created_at,
			COALESCE(u.name,'')
		FROM ops_audit_log oal LEFT JOIN ops_users ou ON oal.ops_user_id = ou.id
		LEFT JOIN users u ON ou.user_id = u.id WHERE 1=1`
	args := []any{}
	argNum := 1

	if action != "" {
		query += " AND oal.action = $" + strconv.Itoa(argNum)
		args = append(args, action)
		argNum++
	}
	if targetType != "" {
		query += " AND oal.target_type = $" + strconv.Itoa(argNum)
		args = append(args, targetType)
		argNum++
	}
	if userID != "" {
		query += " AND oal.ops_user_id = $" + strconv.Itoa(argNum)
		args = append(args, userID)
		argNum++
	}
	if startDate != "" {
		query += " AND oal.created_at >= $" + strconv.Itoa(argNum)
		args = append(args, startDate)
		argNum++
	}
	if endDate != "" {
		query += " AND oal.created_at <= $" + strconv.Itoa(argNum)
		args = append(args, endDate)
		argNum++
	}

	query += " ORDER BY oal.created_at DESC LIMIT $" + strconv.Itoa(argNum) + " OFFSET $" + strconv.Itoa(argNum+1)
	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, wrapNotFound(err, "list ops audit logs")
	}
	defer rows.Close()

	var logs []domain.OpsAuditLog
	for rows.Next() {
		var l domain.OpsAuditLog
		if err := rows.Scan(
			&l.ID, &l.OpsUserID, &l.Action, &l.TargetType, &l.TargetID, &l.TargetName,
			&l.Details, &l.IPAddress, &l.UserAgent, &l.CreatedAt, &l.OpsUserName,
		); err != nil {
			return nil, 0, wrapNotFound(err, "scan ops audit log")
		}
		logs = append(logs, l)
	}
	return logs, len(logs), nil
}

func (s *Store) CreateOpsAuditLog(ctx context.Context, log *domain.OpsAuditLog) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO ops_audit_log (ops_user_id, action, target_type, target_id, target_name, details, ip_address, user_agent)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
		log.OpsUserID, log.Action, log.TargetType, log.TargetID, log.TargetName,
		log.Details, log.IPAddress, log.UserAgent)
	return wrapNotFound(err, "create audit log")
}

// ─── Helpers ──────────────────────────────────────────────────────────

// pqStringArray scans a PostgreSQL text[] into a Go []string.
func pqStringArray(ptr *[]string) interface{} {
	return &pqStringArrayScanner{ptr}
}

type pqStringArrayScanner struct{ ptr *[]string }

func (s *pqStringArrayScanner) Scan(src interface{}) error {
	if src == nil {
		*s.ptr = nil
		return nil
	}
	raw, ok := src.([]byte)
	if !ok {
		rawStr, ok := src.(string)
		if !ok {
			return fmt.Errorf("pqStringArray: unexpected type %T", src)
		}
		raw = []byte(rawStr)
	}
	// PostgreSQL text[] format: {elem1,elem2,elem3}
	str := string(raw)
	if len(str) < 2 || str[0] != '{' || str[len(str)-1] != '}' {
		*s.ptr = []string{str}
		return nil
	}
	inner := str[1 : len(str)-1]
	if inner == "" {
		*s.ptr = []string{}
		return nil
	}
	// Simple comma-split (doesn't handle quoted elements with commas)
	parts := strings.Split(inner, ",")
	*s.ptr = make([]string, 0, len(parts))
	for _, p := range parts {
		*s.ptr = append(*s.ptr, strings.TrimSpace(p))
	}
	return nil
}
