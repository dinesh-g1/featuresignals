package postgres

import (
	"context"
	"database/sql"
	"strconv"
	"fmt"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Customer Environments ─────────────────────────────────────────────

func (s *Store) ListCustomerEnvironments(ctx context.Context, status, deploymentModel, region, search string, limit, offset int) ([]domain.CustomerEnvironment, int, error) {
	query := `
		SELECT ce.id, ce.org_id, ce.deployment_model, ce.vps_provider, ce.vps_id,
			ce.vps_ip::text, ce.vps_region, ce.vps_type, ce.vps_cpu_cores,
			ce.vps_memory_gb, ce.vps_disk_gb, ce.subdomain, ce.custom_domain,
			ce.monthly_vps_cost, ce.monthly_backup_cost, ce.monthly_support_cost,
			ce.status, ce.maintenance_mode, ce.maintenance_reason,
			ce.debug_mode, ce.debug_mode_expires_at,
			ce.provisioned_at, ce.decommissioned_at, ce.last_health_check,
			ce.created_at, ce.updated_at,
			o.name as org_name
		FROM customer_environments ce
		LEFT JOIN organizations o ON ce.org_id = o.id
		WHERE 1=1`
	args := []any{}
	argNum := 1

	if status != "" {
		query += " AND ce.status = $" + strconv.Itoa(argNum)
		args = append(args, status)
		argNum++
	}
	if deploymentModel != "" {
		query += " AND ce.deployment_model = $" + strconv.Itoa(argNum)
		args = append(args, deploymentModel)
		argNum++
	}
	if region != "" {
		query += " AND ce.vps_region = $" + strconv.Itoa(argNum)
		args = append(args, region)
		argNum++
	}
	if search != "" {
		query += " AND (ce.subdomain ILIKE $" + strconv.Itoa(argNum) + " OR ce.vps_ip::text ILIKE $" + strconv.Itoa(argNum) + " OR o.name ILIKE $" + strconv.Itoa(argNum) + ")"
		args = append(args, "%"+search+"%")
		argNum++
	}

	// Count query with same filters
	countQuery := "SELECT COUNT(*) FROM customer_environments ce LEFT JOIN organizations o ON ce.org_id = o.id WHERE 1=1"
	if status != "" {
		countQuery += " AND ce.status = $" + strconv.Itoa(argNum)
	}
	if deploymentModel != "" {
		countQuery += " AND ce.deployment_model = $" + strconv.Itoa(argNum+1)
	}
	if region != "" {
		countQuery += " AND ce.vps_region = $" + strconv.Itoa(argNum+2)
	}
	if search != "" {
		countQuery += " AND (ce.subdomain ILIKE $" + strconv.Itoa(argNum+3) + " OR ce.vps_ip::text ILIKE $" + strconv.Itoa(argNum+3) + " OR o.name ILIKE $" + strconv.Itoa(argNum+3) + ")"
	}
	var total int
	if err := s.pool.QueryRow(ctx, countQuery, args...).Scan(&total); err != nil {
		return nil, 0, wrapNotFound(err, "count customer environments")
	}

	query += " ORDER BY ce.created_at DESC LIMIT $" + strconv.Itoa(argNum) + " OFFSET $" + strconv.Itoa(argNum+1)
	args = append(args, limit, offset)

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, wrapNotFound(err, "list customer environments")
	}
	defer rows.Close()

	envs := make([]domain.CustomerEnvironment, 0)
	for rows.Next() {
		var e domain.CustomerEnvironment
		var orgName sql.NullString
		var vpsIP sql.NullString
		var maintReason sql.NullString
		var provAt, decommAt, lastHealth, debugExpires sql.NullTime
		if err := rows.Scan(
			&e.ID, &e.OrgID, &e.DeploymentModel, &e.VPSProvider, &e.VPSID,
			&vpsIP, &e.VPSRegion, &e.VPSType, &e.VPSCPUCores,
			&e.VPSMemoryGB, &e.VPSDiskGB, &e.Subdomain, &e.CustomDomain,
			&e.MonthlyVPSCost, &e.MonthlyBackupCost, &e.MonthlySupportCost,
			&e.Status, &e.MaintenanceMode, &maintReason,
			&e.DebugMode, &debugExpires,
			&provAt, &decommAt, &lastHealth,
			&e.CreatedAt, &e.UpdatedAt,
			&orgName,
		); err != nil {
			return nil, 0, wrapNotFound(err, "scan customer environment")
		}
		if vpsIP.Valid {
			e.VPSIP = vpsIP.String
		}
		if maintReason.Valid {
			e.MaintenanceReason = maintReason.String
		}
		if orgName.Valid {
			e.OrgName = orgName.String
		}
		// Handle null times
		if provAt.Valid {
			e.ProvisionedAt = &provAt.Time
		}
		if decommAt.Valid {
			e.DecommissionedAt = &decommAt.Time
		}
		if lastHealth.Valid {
			e.LastHealthCheck = &lastHealth.Time
		}
		if debugExpires.Valid {
			e.DebugModeExpiresAt = &debugExpires.Time
		}
		envs = append(envs, e)
	}

	return envs, total, nil
}

func (s *Store) GetCustomerEnvironment(ctx context.Context, id string) (*domain.CustomerEnvironment, error) {
	var e domain.CustomerEnvironment
	err := s.pool.QueryRow(ctx, `
		SELECT id, org_id, deployment_model, COALESCE(vps_provider,''), COALESCE(vps_id,''),
			COALESCE(vps_ip::text,''), COALESCE(vps_region,''), COALESCE(vps_type,''),
			COALESCE(vps_cpu_cores,0), COALESCE(vps_memory_gb,0), COALESCE(vps_disk_gb,0),
			COALESCE(subdomain,''), COALESCE(custom_domain,''),
			monthly_vps_cost, monthly_backup_cost, monthly_support_cost,
			status, maintenance_mode, COALESCE(maintenance_reason,''),
			debug_mode, debug_mode_expires_at,
			provisioned_at, decommissioned_at, last_health_check,
			created_at, updated_at
		FROM customer_environments WHERE id = $1`, id).Scan(
		&e.ID, &e.OrgID, &e.DeploymentModel, &e.VPSProvider, &e.VPSID,
		&e.VPSIP, &e.VPSRegion, &e.VPSType, &e.VPSCPUCores,
		&e.VPSMemoryGB, &e.VPSDiskGB, &e.Subdomain, &e.CustomDomain,
		&e.MonthlyVPSCost, &e.MonthlyBackupCost, &e.MonthlySupportCost,
		&e.Status, &e.MaintenanceMode, &e.MaintenanceReason,
		&e.DebugMode, &e.DebugModeExpiresAt,
		&e.ProvisionedAt, &e.DecommissionedAt, &e.LastHealthCheck,
		&e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "environment")
	}
	return &e, nil
}

func (s *Store) GetCustomerEnvironmentByVPSID(ctx context.Context, vpsID string) (*domain.CustomerEnvironment, error) {
	var e domain.CustomerEnvironment
	err := s.pool.QueryRow(ctx, `
		SELECT id, org_id, deployment_model, COALESCE(vps_provider,''), COALESCE(vps_id,''),
			COALESCE(vps_ip::text,''), COALESCE(vps_region,''), COALESCE(vps_type,''),
			COALESCE(vps_cpu_cores,0), COALESCE(vps_memory_gb,0), COALESCE(vps_disk_gb,0),
			COALESCE(subdomain,''), COALESCE(custom_domain,''),
			monthly_vps_cost, monthly_backup_cost, monthly_support_cost,
			status, maintenance_mode, COALESCE(maintenance_reason,''),
			debug_mode, debug_mode_expires_at,
			provisioned_at, decommissioned_at, last_health_check,
			created_at, updated_at
		FROM customer_environments WHERE vps_id = $1`, vpsID).Scan(
		&e.ID, &e.OrgID, &e.DeploymentModel, &e.VPSProvider, &e.VPSID,
		&e.VPSIP, &e.VPSRegion, &e.VPSType, &e.VPSCPUCores,
		&e.VPSMemoryGB, &e.VPSDiskGB, &e.Subdomain, &e.CustomDomain,
		&e.MonthlyVPSCost, &e.MonthlyBackupCost, &e.MonthlySupportCost,
		&e.Status, &e.MaintenanceMode, &e.MaintenanceReason,
		&e.DebugMode, &e.DebugModeExpiresAt,
		&e.ProvisionedAt, &e.DecommissionedAt, &e.LastHealthCheck,
		&e.CreatedAt, &e.UpdatedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "environment")
	}
	return &e, nil
}

func (s *Store) CreateCustomerEnvironment(ctx context.Context, env *domain.CustomerEnvironment) error {
	now := time.Now()
	return s.pool.QueryRow(ctx, `
		INSERT INTO customer_environments (org_id, deployment_model, vps_provider, vps_id, vps_ip,
			vps_region, vps_type, vps_cpu_cores, vps_memory_gb, vps_disk_gb, subdomain, custom_domain,
			monthly_vps_cost, monthly_backup_cost, monthly_support_cost, status, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
		RETURNING id`,
		env.OrgID, env.DeploymentModel, env.VPSProvider, env.VPSID, nilIfEmpty(env.VPSIP),
		env.VPSRegion, env.VPSType, env.VPSCPUCores, env.VPSMemoryGB, env.VPSDiskGB,
		env.Subdomain, env.CustomDomain, env.MonthlyVPSCost, env.MonthlyBackupCost, env.MonthlySupportCost,
		env.Status, now, now,
	).Scan(&env.ID)
}

func (s *Store) UpdateCustomerEnvironment(ctx context.Context, id string, updates map[string]any) error {
	setClauses := []string{"updated_at = NOW()"}
	args := []any{}
	argNum := 1

	for k, v := range updates {
		setClauses = append(setClauses, k+" = $"+strconv.Itoa(argNum))
		args = append(args, v)
		argNum++
	}

	query := "UPDATE customer_environments SET " + strings.Join(setClauses, ", ") + " WHERE id = $1"
	// Note: simplified — in production, use proper parameterized updates

	_, err := s.pool.Exec(ctx, query, args...)
	return wrapNotFound(err, "update environment")
}

func (s *Store) DeleteCustomerEnvironment(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, "DELETE FROM customer_environments WHERE id = $1", id)
	return wrapNotFound(err, "delete environment")
}

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

// ─── Sandboxes ────────────────────────────────────────────────────────

func (s *Store) ListSandboxes(ctx context.Context, status, ownerID string) ([]domain.SandboxEnvironment, int, error) {
	query := `SELECT se.id, se.owner_user_id, se.vps_id, se.vps_ip::text, se.vps_type,
			se.subdomain, se.status, se.expires_at, se.renewal_count, se.max_renewals,
			COALESCE(se.purpose,''), se.total_cost, se.created_at, se.updated_at,
			se.decommissioned_at, COALESCE(u.email,''), COALESCE(u.name,'')
		FROM sandbox_environments se LEFT JOIN users u ON se.owner_user_id = u.id
		WHERE 1=1`
	args := []any{}
	argNum := 1

	if status != "" {
		query += " AND se.status = $" + strconv.Itoa(argNum)
		args = append(args, status)
		argNum++
	}
	if ownerID != "" {
		query += " AND se.owner_user_id = $" + strconv.Itoa(argNum)
		args = append(args, ownerID)
		argNum++
	}

	query += " ORDER BY se.created_at DESC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, wrapNotFound(err, "list sandboxes")
	}
	defer rows.Close()

	var sandboxes []domain.SandboxEnvironment
	for rows.Next() {
		var sb domain.SandboxEnvironment
		if err := rows.Scan(
			&sb.ID, &sb.OwnerUserID, &sb.VPSID, &sb.VPSIP, &sb.VPSType,
			&sb.Subdomain, &sb.Status, &sb.ExpiresAt, &sb.RenewalCount, &sb.MaxRenewals,
			&sb.Purpose, &sb.TotalCost, &sb.CreatedAt, &sb.UpdatedAt,
			&sb.DecommissionedAt, &sb.OwnerEmail, &sb.OwnerName,
		); err != nil {
			return nil, 0, wrapNotFound(err, "scan sandbox")
		}
		sandboxes = append(sandboxes, sb)
	}
	return sandboxes, len(sandboxes), nil
}

func (s *Store) CreateSandbox(ctx context.Context, sb *domain.SandboxEnvironment) error {
	now := time.Now()
	return s.pool.QueryRow(ctx, `
		INSERT INTO sandbox_environments (owner_user_id, vps_id, vps_ip, vps_type, subdomain,
			status, expires_at, renewal_count, max_renewals, purpose, total_cost, created_at, updated_at)
		VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13) RETURNING id`,
		sb.OwnerUserID, sb.VPSID, sb.VPSIP, sb.VPSType, sb.Subdomain,
		sb.Status, sb.ExpiresAt, sb.RenewalCount, sb.MaxRenewals, sb.Purpose, sb.TotalCost,
		now, now,
	).Scan(&sb.ID)
}

func (s *Store) RenewSandbox(ctx context.Context, id string) (*domain.SandboxEnvironment, error) {
	var sb domain.SandboxEnvironment
	err := s.pool.QueryRow(ctx, `
		UPDATE sandbox_environments
		SET expires_at = expires_at + INTERVAL '30 days', renewal_count = renewal_count + 1, updated_at = NOW()
		WHERE id = $1 AND renewal_count < max_renewals
		RETURNING id, owner_user_id, vps_id, vps_ip::text, vps_type, subdomain, status,
			expires_at, renewal_count, max_renewals, purpose, total_cost, created_at, updated_at, decommissioned_at`,
		id).Scan(
		&sb.ID, &sb.OwnerUserID, &sb.VPSID, &sb.VPSIP, &sb.VPSType, &sb.Subdomain, &sb.Status,
		&sb.ExpiresAt, &sb.RenewalCount, &sb.MaxRenewals, &sb.Purpose, &sb.TotalCost,
		&sb.CreatedAt, &sb.UpdatedAt, &sb.DecommissionedAt,
	)
	if err != nil {
		return nil, wrapNotFound(err, "sandbox")
	}
	return &sb, nil
}

func (s *Store) DecommissionSandbox(ctx context.Context, id string) error {
	now := time.Now()
	_, err := s.pool.Exec(ctx,
		"UPDATE sandbox_environments SET status = 'decommissioned', decommissioned_at = $1, updated_at = NOW() WHERE id = $2",
		now, id)
	return wrapNotFound(err, "decommission sandbox")
}

func (s *Store) GetExpiringSandboxes(ctx context.Context, days int) ([]domain.SandboxEnvironment, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, owner_user_id, vps_id, vps_ip::text, vps_type, subdomain, status,
			expires_at, renewal_count, max_renewals, purpose, total_cost, created_at, updated_at, decommissioned_at
		FROM sandbox_environments
		WHERE status = 'active' AND expires_at <= NOW() + ($1 * INTERVAL '1 day')
		ORDER BY expires_at`, days)
	if err != nil {
		return nil, wrapNotFound(err, "get expiring sandboxes")
	}
	defer rows.Close()

	var sandboxes []domain.SandboxEnvironment
	for rows.Next() {
		var s domain.SandboxEnvironment
		if err := rows.Scan(&s.ID, &s.OwnerUserID, &s.VPSID, &s.VPSIP, &s.VPSType, &s.Subdomain, &s.Status, &s.ExpiresAt, &s.RenewalCount, &s.MaxRenewals, &s.Purpose, &s.TotalCost, &s.CreatedAt, &s.UpdatedAt, &s.DecommissionedAt); err != nil {
			return nil, wrapNotFound(err, "scan sandbox")
		}
		sandboxes = append(sandboxes, s)
	}
	return sandboxes, nil
}

// ─── Financial ────────────────────────────────────────────────────────

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

func (s *Store) ListOrgCostMonthly(ctx context.Context, month string) ([]domain.OrgCostMonthlySummary, error) {
	query := "SELECT org_id, month::text, total_evaluations, total_api_calls, total_cost, days_tracked FROM org_cost_monthly_summary"
	args := []any{}
	if month != "" {
		query += " WHERE month = $1"
		args = append(args, month)
	}
	query += " ORDER BY month DESC, total_cost DESC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, wrapNotFound(err, "list org costs monthly")
	}
	defer rows.Close()

	var summaries []domain.OrgCostMonthlySummary
	for rows.Next() {
		var s domain.OrgCostMonthlySummary
		if err := rows.Scan(&s.OrgID, &s.Month, &s.TotalEvaluations, &s.TotalAPICalls, &s.TotalCost, &s.DaysTracked, &s.OrgName, &s.OrgPlan, &s.OrgMRR); err != nil {
			return nil, wrapNotFound(err, "scan org cost monthly")
		}
		summaries = append(summaries, s)
	}
	return summaries, nil
}

func (s *Store) GetFinancialSummary(ctx context.Context) (*domain.FinancialSummary, error) {
	summary := &domain.FinancialSummary{
		MarginByTier:   make(map[string]*domain.TierFinancials),
		TopCustomers:   []domain.CustomerSummary{},
		NegativeMargin: []domain.CustomerSummary{},
	}

	// Get total MRR and cost from organizations + cost tables
	err := s.pool.QueryRow(ctx, `
		SELECT
			COALESCE(SUM(
				CASE plan
					WHEN 'pro' THEN 99900
					WHEN 'enterprise' THEN 499900
					ELSE 0
				END
			), 0) as total_mrr
		FROM organizations WHERE deleted_at IS NULL`).Scan(&summary.TotalMRR)
	if err != nil {
		return nil, wrapNotFound(err, "get total MRR")
	}

	// Get total cost
	err = s.pool.QueryRow(ctx,
		"SELECT COALESCE(SUM(total_cost), 0) FROM org_cost_daily WHERE date >= NOW() - INTERVAL '30 days'").Scan(&summary.TotalCost)
	if err != nil {
		return nil, wrapNotFound(err, "get total cost")
	}

	// Calculate margin
	if summary.TotalMRR > 0 {
		summary.TotalMargin = float64(summary.TotalMRR-summary.TotalCost) / float64(summary.TotalMRR) * 100
	}

	return summary, nil
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

// ─── Customer Summary ─────────────────────────────────────────────────

func (s *Store) ListCustomers(ctx context.Context, plan, deploymentModel, search string) ([]domain.CustomerSummary, int, error) {
	query := `SELECT o.id, o.name, o.slug, o.plan,
			COALESCE(ce.deployment_model, 'shared') as deployment_model,
			o.data_region, 'active' as status,
			0 as mrr, 0 as monthly_cost, 0.0 as margin,
			ce.last_health_check, 100.0 as health_score, o.created_at
		FROM organizations o
		LEFT JOIN customer_environments ce ON o.id = ce.org_id AND ce.deployment_model != 'shared'
		WHERE o.deleted_at IS NULL`
	args := []any{}
	argNum := 1

	if plan != "" {
		query += " AND o.plan = $" + strconv.Itoa(argNum)
		args = append(args, plan)
		argNum++
	}
	if deploymentModel != "" {
		query += " AND COALESCE(ce.deployment_model, 'shared') = $" + strconv.Itoa(argNum)
		args = append(args, deploymentModel)
		argNum++
	}
	if search != "" {
		query += " AND (o.name ILIKE $" + strconv.Itoa(argNum) + " OR o.slug ILIKE $" + strconv.Itoa(argNum) + ")"
		args = append(args, "%"+search+"%")
		argNum++
	}

	query += " ORDER BY o.created_at DESC"

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, 0, wrapNotFound(err, "list customers")
	}
	defer rows.Close()

	var customers []domain.CustomerSummary
	for rows.Next() {
		var c domain.CustomerSummary
		var lastHealth sql.NullTime
		if err := rows.Scan(&c.OrgID, &c.OrgName, &c.OrgSlug, &c.Plan, &c.DeploymentModel, &c.DataRegion, &c.Status, &c.MRR, &c.MonthlyCost, &c.Margin, &lastHealth, &c.HealthScore, &c.CreatedAt); err != nil {
			return nil, 0, wrapNotFound(err, "scan customer")
		}
		if lastHealth.Valid {
			c.LastHealthCheck = &lastHealth.Time
		}
		customers = append(customers, c)
	}
	return customers, len(customers), nil
}

func (s *Store) GetCustomerDetail(ctx context.Context, orgID string) (*domain.CustomerDetail, error) {
	detail := &domain.CustomerDetail{}

	// Get org
	org, err := s.GetOrganization(ctx, orgID)
	if err != nil {
		return nil, wrapNotFound(err, "organization")
	}
	detail.Org = *org

	// Get environment by looking up via org_id
	rows, err := s.pool.Query(ctx,
		"SELECT id, org_id, deployment_model, COALESCE(vps_provider,''), COALESCE(vps_id,''), COALESCE(vps_ip::text,''), COALESCE(vps_region,''), COALESCE(vps_type,''), COALESCE(vps_cpu_cores,0), COALESCE(vps_memory_gb,0), COALESCE(vps_disk_gb,0), COALESCE(subdomain,''), COALESCE(custom_domain,''), monthly_vps_cost, monthly_backup_cost, monthly_support_cost, status, maintenance_mode, COALESCE(maintenance_reason,''), debug_mode, debug_mode_expires_at, provisioned_at, decommissioned_at, last_health_check, created_at, updated_at FROM customer_environments WHERE org_id = $1 AND status != 'decommissioned' LIMIT 1",
		orgID)
	if err != nil {
		return nil, wrapNotFound(err, "query customer environment")
	}
	defer rows.Close()

	if rows.Next() {
		var env domain.CustomerEnvironment
		var debugExpires, provAt, decommAt, lastHealth sql.NullTime
		if err := rows.Scan(
			&env.ID, &env.OrgID, &env.DeploymentModel, &env.VPSProvider, &env.VPSID,
			&env.VPSIP, &env.VPSRegion, &env.VPSType, &env.VPSCPUCores,
			&env.VPSMemoryGB, &env.VPSDiskGB, &env.Subdomain, &env.CustomDomain,
			&env.MonthlyVPSCost, &env.MonthlyBackupCost, &env.MonthlySupportCost,
			&env.Status, &env.MaintenanceMode, &env.MaintenanceReason,
			&env.DebugMode, &debugExpires, &provAt, &decommAt, &lastHealth,
			&env.CreatedAt, &env.UpdatedAt,
		); err != nil {
			return nil, wrapNotFound(err, "scan customer environment")
		}
		if provAt.Valid {
			env.ProvisionedAt = &provAt.Time
		}
		if decommAt.Valid {
			env.DecommissionedAt = &decommAt.Time
		}
		if lastHealth.Valid {
			env.LastHealthCheck = &lastHealth.Time
		}
		if debugExpires.Valid {
			env.DebugModeExpiresAt = &debugExpires.Time
		}
		detail.Environment = &env
	}

	return detail, nil
}



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
