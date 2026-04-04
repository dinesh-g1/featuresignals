package postgres

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/domain"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

// wrapNotFound converts pgx.ErrNoRows into domain.ErrNotFound.
func wrapNotFound(err error, noun string) error {
	if err == nil {
		return nil
	}
	if errors.Is(err, pgx.ErrNoRows) {
		return domain.WrapNotFound(noun)
	}
	return err
}

// wrapConflict converts PostgreSQL unique-violation (23505) into domain.ErrConflict.
func wrapConflict(err error, noun string) error {
	if err == nil {
		return nil
	}
	var pgErr *pgconn.PgError
	if errors.As(err, &pgErr) && pgErr.Code == "23505" {
		return domain.WrapConflict(noun)
	}
	return err
}

// --- Organizations ---

func (s *Store) CreateOrganization(ctx context.Context, org *domain.Organization) error {
	if org.Plan == "" {
		org.Plan = domain.PlanFree
	}
	defaults := domain.PlanDefaults[org.Plan]
	err := s.pool.QueryRow(ctx,
		`INSERT INTO organizations (name, slug, plan, plan_seats_limit, plan_projects_limit, plan_environments_limit, trial_expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at, updated_at`,
		org.Name, org.Slug, org.Plan, defaults.Seats, defaults.Projects, defaults.Environments, org.TrialExpiresAt,
	).Scan(&org.ID, &org.CreatedAt, &org.UpdatedAt)
	return wrapConflict(err, "organization")
}

func (s *Store) GetOrganization(ctx context.Context, id string) (*domain.Organization, error) {
	org := &domain.Organization{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, name, slug, created_at, updated_at,
		        COALESCE(plan, 'free'), COALESCE(payu_customer_ref, ''),
		        COALESCE(plan_seats_limit, 3), COALESCE(plan_projects_limit, 1), COALESCE(plan_environments_limit, 2)
		 FROM organizations WHERE id = $1`, id,
	).Scan(&org.ID, &org.Name, &org.Slug, &org.CreatedAt, &org.UpdatedAt,
		&org.Plan, &org.PayUCustomerRef,
		&org.PlanSeatsLimit, &org.PlanProjectsLimit, &org.PlanEnvironmentsLimit)
	if err != nil {
		return nil, wrapNotFound(err, "organization")
	}
	return org, nil
}

func (s *Store) GetOrganizationByIDPrefix(ctx context.Context, prefix string) (*domain.Organization, error) {
	org := &domain.Organization{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, name, slug, created_at, updated_at,
		        COALESCE(plan, 'free'), COALESCE(payu_customer_ref, ''),
		        COALESCE(plan_seats_limit, 3), COALESCE(plan_projects_limit, 1), COALESCE(plan_environments_limit, 2)
		 FROM organizations WHERE id LIKE $1 || '%' LIMIT 1`, prefix,
	).Scan(&org.ID, &org.Name, &org.Slug, &org.CreatedAt, &org.UpdatedAt,
		&org.Plan, &org.PayUCustomerRef,
		&org.PlanSeatsLimit, &org.PlanProjectsLimit, &org.PlanEnvironmentsLimit)
	if err != nil {
		return nil, wrapNotFound(err, "organization")
	}
	return org, nil
}

// --- Users ---

func (s *Store) CreateUser(ctx context.Context, user *domain.User) error {
	err := s.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, name, email_verified) VALUES ($1, $2, $3, $4) RETURNING id, created_at, updated_at`,
		user.Email, user.PasswordHash, user.Name, user.EmailVerified,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
	return wrapConflict(err, "user")
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	user := &domain.User{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name,
		        COALESCE(phone, ''), COALESCE(phone_verified, false), COALESCE(email_verified, false),
		        COALESCE(email_verify_token, ''), email_verify_expires_at,
		        COALESCE(phone_otp, ''), phone_otp_expires_at,
		        created_at, updated_at
		 FROM users WHERE email = $1`, email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&user.Phone, &user.PhoneVerified, &user.EmailVerified,
		&user.EmailVerifyToken, &user.EmailVerifyExpires,
		&user.PhoneOTP, &user.PhoneOTPExpires,
		&user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "user")
	}
	return user, nil
}

func (s *Store) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	user := &domain.User{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name,
		        COALESCE(phone, ''), COALESCE(phone_verified, false), COALESCE(email_verified, false),
		        COALESCE(email_verify_token, ''), email_verify_expires_at,
		        COALESCE(phone_otp, ''), phone_otp_expires_at,
		        created_at, updated_at
		 FROM users WHERE id = $1`, id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&user.Phone, &user.PhoneVerified, &user.EmailVerified,
		&user.EmailVerifyToken, &user.EmailVerifyExpires,
		&user.PhoneOTP, &user.PhoneOTPExpires,
		&user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "user")
	}
	return user, nil
}

func (s *Store) GetUserByEmailVerifyToken(ctx context.Context, token string) (*domain.User, error) {
	user := &domain.User{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name,
		        COALESCE(phone, ''), COALESCE(phone_verified, false), COALESCE(email_verified, false),
		        COALESCE(email_verify_token, ''), email_verify_expires_at,
		        COALESCE(phone_otp, ''), phone_otp_expires_at,
		        created_at, updated_at
		 FROM users WHERE email_verify_token = $1`, token,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&user.Phone, &user.PhoneVerified, &user.EmailVerified,
		&user.EmailVerifyToken, &user.EmailVerifyExpires,
		&user.PhoneOTP, &user.PhoneOTPExpires,
		&user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "user")
	}
	return user, nil
}

func (s *Store) UpdateUserPhone(ctx context.Context, userID, phone string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET phone = $2, updated_at = now() WHERE id = $1`, userID, phone)
	return err
}

func (s *Store) UpdateUserPhoneOTP(ctx context.Context, userID, otpHash string, expires time.Time) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET phone_otp = $2, phone_otp_expires_at = $3, updated_at = now() WHERE id = $1`,
		userID, otpHash, expires)
	return err
}

func (s *Store) SetPhoneVerified(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET phone_verified = true, phone_otp = NULL, phone_otp_expires_at = NULL, updated_at = now() WHERE id = $1`,
		userID)
	return err
}

func (s *Store) UpdateUserEmailVerifyToken(ctx context.Context, userID, token string, expires time.Time) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET email_verify_token = $2, email_verify_expires_at = $3, updated_at = now() WHERE id = $1`,
		userID, token, expires)
	return err
}

func (s *Store) SetEmailVerified(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET email_verified = true, email_verify_token = NULL, email_verify_expires_at = NULL, updated_at = now() WHERE id = $1`,
		userID)
	return err
}

// --- Org Members ---

func (s *Store) AddOrgMember(ctx context.Context, member *domain.OrgMember) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO org_members (org_id, user_id, role) VALUES ($1, $2, $3) RETURNING id, created_at`,
		member.OrgID, member.UserID, member.Role,
	).Scan(&member.ID, &member.CreatedAt)
}

func (s *Store) GetOrgMember(ctx context.Context, orgID, userID string) (*domain.OrgMember, error) {
	m := &domain.OrgMember{}
	var query string
	var args []interface{}
	if orgID == "" {
		query = `SELECT id, org_id, user_id, role, created_at FROM org_members WHERE user_id = $1 LIMIT 1`
		args = []interface{}{userID}
	} else {
		query = `SELECT id, org_id, user_id, role, created_at FROM org_members WHERE org_id = $1 AND user_id = $2`
		args = []interface{}{orgID, userID}
	}
	err := s.pool.QueryRow(ctx, query, args...).Scan(&m.ID, &m.OrgID, &m.UserID, &m.Role, &m.CreatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "member")
	}
	return m, nil
}

func (s *Store) ListOrgMembers(ctx context.Context, orgID string) ([]domain.OrgMember, error) {
	var query string
	var args []interface{}
	if orgID == "" {
		query = `SELECT id, org_id, user_id, role, created_at FROM org_members`
		args = nil
	} else {
		query = `SELECT id, org_id, user_id, role, created_at FROM org_members WHERE org_id = $1`
		args = []interface{}{orgID}
	}
	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	members := []domain.OrgMember{}
	for rows.Next() {
		var m domain.OrgMember
		if err := rows.Scan(&m.ID, &m.OrgID, &m.UserID, &m.Role, &m.CreatedAt); err != nil {
			return nil, err
		}
		members = append(members, m)
	}
	return members, nil
}

func (s *Store) GetOrgMemberByID(ctx context.Context, memberID string) (*domain.OrgMember, error) {
	m := &domain.OrgMember{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, user_id, role, created_at FROM org_members WHERE id = $1`, memberID,
	).Scan(&m.ID, &m.OrgID, &m.UserID, &m.Role, &m.CreatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "member")
	}
	return m, nil
}

func (s *Store) UpdateOrgMemberRole(ctx context.Context, memberID string, role domain.Role) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE org_members SET role = $1 WHERE id = $2`, role, memberID)
	return err
}

func (s *Store) RemoveOrgMember(ctx context.Context, memberID string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM org_members WHERE id = $1`, memberID)
	return err
}

// --- Environment Permissions ---

func (s *Store) ListEnvPermissions(ctx context.Context, memberID string) ([]domain.EnvPermission, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, member_id, env_id, can_toggle, can_edit_rules FROM env_permissions WHERE member_id = $1`, memberID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	perms := []domain.EnvPermission{}
	for rows.Next() {
		var p domain.EnvPermission
		if err := rows.Scan(&p.ID, &p.MemberID, &p.EnvID, &p.CanToggle, &p.CanEditRules); err != nil {
			return nil, err
		}
		perms = append(perms, p)
	}
	return perms, nil
}

func (s *Store) UpsertEnvPermission(ctx context.Context, perm *domain.EnvPermission) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO env_permissions (member_id, env_id, can_toggle, can_edit_rules)
		 VALUES ($1, $2, $3, $4)
		 ON CONFLICT (member_id, env_id) DO UPDATE SET can_toggle=$3, can_edit_rules=$4
		 RETURNING id`,
		perm.MemberID, perm.EnvID, perm.CanToggle, perm.CanEditRules,
	).Scan(&perm.ID)
}

func (s *Store) DeleteEnvPermission(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM env_permissions WHERE id = $1`, id)
	return err
}

// --- Projects ---

func (s *Store) CreateProject(ctx context.Context, p *domain.Project) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO projects (org_id, name, slug) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at`,
		p.OrgID, p.Name, p.Slug,
	).Scan(&p.ID, &p.CreatedAt, &p.UpdatedAt)
}

func (s *Store) GetProject(ctx context.Context, id string) (*domain.Project, error) {
	p := &domain.Project{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, name, slug, created_at, updated_at FROM projects WHERE id = $1`, id,
	).Scan(&p.ID, &p.OrgID, &p.Name, &p.Slug, &p.CreatedAt, &p.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "project")
	}
	return p, nil
}

func (s *Store) ListProjects(ctx context.Context, orgID string) ([]domain.Project, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, name, slug, created_at, updated_at FROM projects WHERE org_id = $1 ORDER BY created_at`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	projects := []domain.Project{}
	for rows.Next() {
		var p domain.Project
		if err := rows.Scan(&p.ID, &p.OrgID, &p.Name, &p.Slug, &p.CreatedAt, &p.UpdatedAt); err != nil {
			return nil, err
		}
		projects = append(projects, p)
	}
	return projects, nil
}

func (s *Store) DeleteProject(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM projects WHERE id = $1`, id)
	return err
}

// --- Environments ---

func (s *Store) CreateEnvironment(ctx context.Context, e *domain.Environment) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO environments (project_id, name, slug, color) VALUES ($1, $2, $3, $4) RETURNING id, created_at`,
		e.ProjectID, e.Name, e.Slug, e.Color,
	).Scan(&e.ID, &e.CreatedAt)
}

func (s *Store) ListEnvironments(ctx context.Context, projectID string) ([]domain.Environment, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, project_id, name, slug, color, created_at FROM environments WHERE project_id = $1 ORDER BY created_at`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	envs := []domain.Environment{}
	for rows.Next() {
		var e domain.Environment
		if err := rows.Scan(&e.ID, &e.ProjectID, &e.Name, &e.Slug, &e.Color, &e.CreatedAt); err != nil {
			return nil, err
		}
		envs = append(envs, e)
	}
	return envs, nil
}

func (s *Store) GetEnvironment(ctx context.Context, id string) (*domain.Environment, error) {
	e := &domain.Environment{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, project_id, name, slug, color, created_at FROM environments WHERE id = $1`, id,
	).Scan(&e.ID, &e.ProjectID, &e.Name, &e.Slug, &e.Color, &e.CreatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "environment")
	}
	return e, nil
}

func (s *Store) DeleteEnvironment(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM environments WHERE id = $1`, id)
	return err
}

// ResolveOrgIDByEnvID returns the organization ID that owns the given
// environment by joining through the projects table.
func (s *Store) ResolveOrgIDByEnvID(ctx context.Context, envID string) (string, error) {
	var orgID string
	err := s.pool.QueryRow(ctx,
		`SELECT p.org_id FROM environments e JOIN projects p ON e.project_id = p.id WHERE e.id = $1`, envID,
	).Scan(&orgID)
	return orgID, err
}

// --- Flags ---

func (s *Store) CreateFlag(ctx context.Context, f *domain.Flag) error {
	if f.Prerequisites == nil {
		f.Prerequisites = []string{}
	}
	if f.Category == "" {
		f.Category = domain.CategoryRelease
	}
	if f.Status == "" {
		f.Status = domain.StatusActive
	}
	err := s.pool.QueryRow(ctx,
		`INSERT INTO flags (project_id, key, name, description, flag_type, category, status, default_value, tags, expires_at, prerequisites, mutual_exclusion_group)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING id, created_at, updated_at`,
		f.ProjectID, f.Key, f.Name, f.Description, f.FlagType, f.Category, f.Status, f.DefaultValue, f.Tags, f.ExpiresAt, f.Prerequisites, f.MutualExclusionGroup,
	).Scan(&f.ID, &f.CreatedAt, &f.UpdatedAt)
	return wrapConflict(err, "flag key")
}

func (s *Store) GetFlag(ctx context.Context, projectID, key string) (*domain.Flag, error) {
	f := &domain.Flag{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, project_id, key, name, description, flag_type, category, status, default_value, tags, expires_at, prerequisites, mutual_exclusion_group, created_at, updated_at
		 FROM flags WHERE project_id = $1 AND key = $2`, projectID, key,
	).Scan(&f.ID, &f.ProjectID, &f.Key, &f.Name, &f.Description, &f.FlagType, &f.Category, &f.Status, &f.DefaultValue, &f.Tags, &f.ExpiresAt, &f.Prerequisites, &f.MutualExclusionGroup, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "flag")
	}
	return f, nil
}

func (s *Store) ListFlags(ctx context.Context, projectID string) ([]domain.Flag, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, project_id, key, name, description, flag_type, category, status, default_value, tags, expires_at, prerequisites, mutual_exclusion_group, created_at, updated_at
		 FROM flags WHERE project_id = $1 ORDER BY created_at`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	flags := []domain.Flag{}
	for rows.Next() {
		var f domain.Flag
		if err := rows.Scan(&f.ID, &f.ProjectID, &f.Key, &f.Name, &f.Description, &f.FlagType, &f.Category, &f.Status, &f.DefaultValue, &f.Tags, &f.ExpiresAt, &f.Prerequisites, &f.MutualExclusionGroup, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		flags = append(flags, f)
	}
	return flags, nil
}

func (s *Store) UpdateFlag(ctx context.Context, f *domain.Flag) error {
	if f.Prerequisites == nil {
		f.Prerequisites = []string{}
	}
	_, err := s.pool.Exec(ctx,
		`UPDATE flags SET name=$1, description=$2, default_value=$3, tags=$4, expires_at=$5, prerequisites=$6, mutual_exclusion_group=$7, category=$8, status=$9, updated_at=NOW()
		 WHERE id = $10`,
		f.Name, f.Description, f.DefaultValue, f.Tags, f.ExpiresAt, f.Prerequisites, f.MutualExclusionGroup, f.Category, f.Status, f.ID)
	return err
}

func (s *Store) DeleteFlag(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM flags WHERE id = $1`, id)
	return err
}

// --- Flag States ---

func (s *Store) UpsertFlagState(ctx context.Context, fs *domain.FlagState) error {
	rulesJSON, err := json.Marshal(fs.Rules)
	if err != nil {
		return fmt.Errorf("marshal rules: %w", err)
	}
	variantsJSON, err := json.Marshal(fs.Variants)
	if err != nil {
		return fmt.Errorf("marshal variants: %w", err)
	}
	return s.pool.QueryRow(ctx,
		`INSERT INTO flag_states (flag_id, env_id, enabled, default_value, rules, percentage_rollout, variants, scheduled_enable_at, scheduled_disable_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
		 ON CONFLICT (flag_id, env_id) DO UPDATE SET enabled=$3, default_value=$4, rules=$5, percentage_rollout=$6,
		   variants=$7, scheduled_enable_at=$8, scheduled_disable_at=$9, updated_at=NOW()
		 RETURNING id, updated_at`,
		fs.FlagID, fs.EnvID, fs.Enabled, fs.DefaultValue, rulesJSON, fs.PercentageRollout,
		variantsJSON, fs.ScheduledEnableAt, fs.ScheduledDisableAt,
	).Scan(&fs.ID, &fs.UpdatedAt)
}

func (s *Store) GetFlagState(ctx context.Context, flagID, envID string) (*domain.FlagState, error) {
	fs := &domain.FlagState{}
	var rulesJSON, variantsJSON []byte
	err := s.pool.QueryRow(ctx,
		`SELECT id, flag_id, env_id, enabled, default_value, rules, percentage_rollout,
		        variants, scheduled_enable_at, scheduled_disable_at, updated_at
		 FROM flag_states WHERE flag_id = $1 AND env_id = $2`, flagID, envID,
	).Scan(&fs.ID, &fs.FlagID, &fs.EnvID, &fs.Enabled, &fs.DefaultValue, &rulesJSON,
		&fs.PercentageRollout, &variantsJSON, &fs.ScheduledEnableAt, &fs.ScheduledDisableAt, &fs.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "flag state")
	}
	if err := json.Unmarshal(rulesJSON, &fs.Rules); err != nil {
		return nil, fmt.Errorf("unmarshal rules: %w", err)
	}
	if len(variantsJSON) > 0 {
		if err := json.Unmarshal(variantsJSON, &fs.Variants); err != nil {
			return nil, fmt.Errorf("unmarshal variants: %w", err)
		}
	}
	return fs, nil
}

func (s *Store) ListPendingSchedules(ctx context.Context, before time.Time) ([]domain.FlagState, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, flag_id, env_id, enabled, default_value, rules, percentage_rollout,
		        variants, scheduled_enable_at, scheduled_disable_at, updated_at
		 FROM flag_states
		 WHERE (scheduled_enable_at IS NOT NULL AND scheduled_enable_at <= $1)
		    OR (scheduled_disable_at IS NOT NULL AND scheduled_disable_at <= $1)`, before)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []domain.FlagState
	for rows.Next() {
		var fs domain.FlagState
		var rulesJSON, variantsJSON []byte
		if err := rows.Scan(&fs.ID, &fs.FlagID, &fs.EnvID, &fs.Enabled, &fs.DefaultValue,
			&rulesJSON, &fs.PercentageRollout, &variantsJSON, &fs.ScheduledEnableAt, &fs.ScheduledDisableAt, &fs.UpdatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(rulesJSON, &fs.Rules); err != nil {
			return nil, fmt.Errorf("unmarshal rules: %w", err)
		}
		if len(variantsJSON) > 0 {
			json.Unmarshal(variantsJSON, &fs.Variants)
		}
		result = append(result, fs)
	}
	return result, nil
}

// --- Segments ---

func (s *Store) CreateSegment(ctx context.Context, seg *domain.Segment) error {
	rulesJSON, err := json.Marshal(seg.Rules)
	if err != nil {
		return fmt.Errorf("marshal rules: %w", err)
	}
	err = s.pool.QueryRow(ctx,
		`INSERT INTO segments (project_id, key, name, description, match_type, rules)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at, updated_at`,
		seg.ProjectID, seg.Key, seg.Name, seg.Description, seg.MatchType, rulesJSON,
	).Scan(&seg.ID, &seg.CreatedAt, &seg.UpdatedAt)
	return wrapConflict(err, "segment key")
}

func (s *Store) ListSegments(ctx context.Context, projectID string) ([]domain.Segment, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, project_id, key, name, description, match_type, rules, created_at, updated_at
		 FROM segments WHERE project_id = $1 ORDER BY created_at`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	segments := []domain.Segment{}
	for rows.Next() {
		var seg domain.Segment
		var rulesJSON []byte
		if err := rows.Scan(&seg.ID, &seg.ProjectID, &seg.Key, &seg.Name, &seg.Description, &seg.MatchType, &rulesJSON, &seg.CreatedAt, &seg.UpdatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(rulesJSON, &seg.Rules); err != nil {
			return nil, fmt.Errorf("unmarshal rules: %w", err)
		}
		segments = append(segments, seg)
	}
	return segments, nil
}

func (s *Store) GetSegment(ctx context.Context, projectID, key string) (*domain.Segment, error) {
	seg := &domain.Segment{}
	var rulesJSON []byte
	err := s.pool.QueryRow(ctx,
		`SELECT id, project_id, key, name, description, match_type, rules, created_at, updated_at
		 FROM segments WHERE project_id = $1 AND key = $2`, projectID, key,
	).Scan(&seg.ID, &seg.ProjectID, &seg.Key, &seg.Name, &seg.Description, &seg.MatchType, &rulesJSON, &seg.CreatedAt, &seg.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "segment")
	}
	if err := json.Unmarshal(rulesJSON, &seg.Rules); err != nil {
		return nil, fmt.Errorf("unmarshal rules: %w", err)
	}
	return seg, nil
}

func (s *Store) UpdateSegment(ctx context.Context, seg *domain.Segment) error {
	rulesJSON, err := json.Marshal(seg.Rules)
	if err != nil {
		return fmt.Errorf("marshal rules: %w", err)
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE segments SET name = $1, description = $2, match_type = $3, rules = $4, updated_at = $5
		 WHERE id = $6`,
		seg.Name, seg.Description, seg.MatchType, rulesJSON, time.Now(), seg.ID,
	)
	return err
}

func (s *Store) DeleteSegment(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM segments WHERE id = $1`, id)
	return err
}

// --- API Keys ---

func (s *Store) CreateAPIKey(ctx context.Context, k *domain.APIKey) error {
	err := s.pool.QueryRow(ctx,
		`INSERT INTO api_keys (env_id, key_hash, key_prefix, name, type, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at`,
		k.EnvID, k.KeyHash, k.KeyPrefix, k.Name, k.Type, k.ExpiresAt,
	).Scan(&k.ID, &k.CreatedAt)
	return wrapConflict(err, "api key")
}

func (s *Store) GetAPIKeyByID(ctx context.Context, id string) (*domain.APIKey, error) {
	k := &domain.APIKey{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, env_id, key_hash, key_prefix, name, type, created_at, last_used_at, revoked_at, expires_at
		 FROM api_keys WHERE id = $1`, id,
	).Scan(&k.ID, &k.EnvID, &k.KeyHash, &k.KeyPrefix, &k.Name, &k.Type, &k.CreatedAt, &k.LastUsedAt, &k.RevokedAt, &k.ExpiresAt)
	if err != nil {
		return nil, wrapNotFound(err, "api key")
	}
	return k, nil
}

func (s *Store) GetAPIKeyByHash(ctx context.Context, keyHash string) (*domain.APIKey, error) {
	k := &domain.APIKey{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, env_id, key_hash, key_prefix, name, type, created_at, last_used_at, revoked_at, expires_at
		 FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL
		 AND (expires_at IS NULL OR expires_at > NOW())`, keyHash,
	).Scan(&k.ID, &k.EnvID, &k.KeyHash, &k.KeyPrefix, &k.Name, &k.Type, &k.CreatedAt, &k.LastUsedAt, &k.RevokedAt, &k.ExpiresAt)
	if err != nil {
		return nil, wrapNotFound(err, "api key")
	}
	return k, nil
}

func (s *Store) ListAPIKeys(ctx context.Context, envID string) ([]domain.APIKey, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, env_id, key_hash, key_prefix, name, type, created_at, last_used_at, revoked_at, expires_at
		 FROM api_keys WHERE env_id = $1 ORDER BY created_at`, envID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	keys := []domain.APIKey{}
	for rows.Next() {
		var k domain.APIKey
		if err := rows.Scan(&k.ID, &k.EnvID, &k.KeyHash, &k.KeyPrefix, &k.Name, &k.Type, &k.CreatedAt, &k.LastUsedAt, &k.RevokedAt, &k.ExpiresAt); err != nil {
			return nil, err
		}
		keys = append(keys, k)
	}
	return keys, nil
}

func (s *Store) RevokeAPIKey(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE api_keys SET revoked_at = NOW() WHERE id = $1`, id)
	return err
}

func (s *Store) UpdateAPIKeyLastUsed(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE api_keys SET last_used_at = NOW() WHERE id = $1`, id)
	return err
}

// --- Webhooks ---

func (s *Store) CreateWebhook(ctx context.Context, w *domain.Webhook) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO webhooks (org_id, name, url, secret, events, enabled)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at, updated_at`,
		w.OrgID, w.Name, w.URL, w.Secret, w.Events, w.Enabled,
	).Scan(&w.ID, &w.CreatedAt, &w.UpdatedAt)
}

func (s *Store) GetWebhook(ctx context.Context, id string) (*domain.Webhook, error) {
	w := &domain.Webhook{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, name, url, secret, events, enabled, created_at, updated_at
		 FROM webhooks WHERE id = $1`, id,
	).Scan(&w.ID, &w.OrgID, &w.Name, &w.URL, &w.Secret, &w.Events, &w.Enabled, &w.CreatedAt, &w.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "webhook")
	}
	return w, nil
}

func (s *Store) ListWebhooks(ctx context.Context, orgID string) ([]domain.Webhook, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, name, url, secret, events, enabled, created_at, updated_at
		 FROM webhooks WHERE org_id = $1 ORDER BY created_at`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	webhooks := []domain.Webhook{}
	for rows.Next() {
		var w domain.Webhook
		if err := rows.Scan(&w.ID, &w.OrgID, &w.Name, &w.URL, &w.Secret, &w.Events, &w.Enabled, &w.CreatedAt, &w.UpdatedAt); err != nil {
			return nil, err
		}
		webhooks = append(webhooks, w)
	}
	return webhooks, nil
}

func (s *Store) UpdateWebhook(ctx context.Context, w *domain.Webhook) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE webhooks SET name=$1, url=$2, secret=$3, events=$4, enabled=$5, updated_at=NOW()
		 WHERE id = $6`,
		w.Name, w.URL, w.Secret, w.Events, w.Enabled, w.ID)
	return err
}

func (s *Store) DeleteWebhook(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM webhooks WHERE id = $1`, id)
	return err
}

func (s *Store) CreateWebhookDelivery(ctx context.Context, d *domain.WebhookDelivery) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO webhook_deliveries (webhook_id, event_type, payload, response_status, response_body, success)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, delivered_at`,
		d.WebhookID, d.EventType, d.Payload, d.ResponseStatus, d.ResponseBody, d.Success,
	).Scan(&d.ID, &d.DeliveredAt)
}

func (s *Store) ListWebhookDeliveries(ctx context.Context, webhookID string, limit int) ([]domain.WebhookDelivery, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, webhook_id, event_type, payload, response_status, response_body, delivered_at, success
		 FROM webhook_deliveries WHERE webhook_id = $1 ORDER BY delivered_at DESC LIMIT $2`, webhookID, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	deliveries := []domain.WebhookDelivery{}
	for rows.Next() {
		var d domain.WebhookDelivery
		if err := rows.Scan(&d.ID, &d.WebhookID, &d.EventType, &d.Payload, &d.ResponseStatus, &d.ResponseBody, &d.DeliveredAt, &d.Success); err != nil {
			return nil, err
		}
		deliveries = append(deliveries, d)
	}
	return deliveries, nil
}

// --- Audit Log ---

func (s *Store) CreateAuditEntry(ctx context.Context, entry *domain.AuditEntry) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO audit_logs (org_id, actor_id, actor_type, action, resource_type, resource_id, before_state, after_state, metadata)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9) RETURNING id, created_at`,
		entry.OrgID, entry.ActorID, entry.ActorType, entry.Action, entry.ResourceType, entry.ResourceID,
		entry.BeforeState, entry.AfterState, entry.Metadata,
	).Scan(&entry.ID, &entry.CreatedAt)
}

func (s *Store) ListAuditEntries(ctx context.Context, orgID string, limit, offset int) ([]domain.AuditEntry, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, actor_id, actor_type, action, resource_type, resource_id, before_state, after_state, metadata, created_at
		 FROM audit_logs WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, orgID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	entries := []domain.AuditEntry{}
	for rows.Next() {
		var e domain.AuditEntry
		if err := rows.Scan(&e.ID, &e.OrgID, &e.ActorID, &e.ActorType, &e.Action, &e.ResourceType, &e.ResourceID, &e.BeforeState, &e.AfterState, &e.Metadata, &e.CreatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

// --- Ruleset Loading (for evaluation cache) ---

func (s *Store) LoadRuleset(ctx context.Context, projectID, envID string) ([]domain.Flag, []domain.FlagState, []domain.Segment, error) {
	flags, err := s.ListFlags(ctx, projectID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("load flags: %w", err)
	}

	// Load flag states for this environment
	rows, err := s.pool.Query(ctx,
		`SELECT fs.id, fs.flag_id, fs.env_id, fs.enabled, fs.default_value, fs.rules,
		        fs.percentage_rollout, fs.variants, fs.scheduled_enable_at, fs.scheduled_disable_at, fs.updated_at
		 FROM flag_states fs
		 JOIN flags f ON f.id = fs.flag_id
		 WHERE f.project_id = $1 AND fs.env_id = $2`, projectID, envID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("load flag states: %w", err)
	}
	defer rows.Close()
	states := []domain.FlagState{}
	for rows.Next() {
		var fs domain.FlagState
		var rulesJSON, variantsJSON []byte
		if err := rows.Scan(&fs.ID, &fs.FlagID, &fs.EnvID, &fs.Enabled, &fs.DefaultValue,
			&rulesJSON, &fs.PercentageRollout, &variantsJSON, &fs.ScheduledEnableAt, &fs.ScheduledDisableAt, &fs.UpdatedAt); err != nil {
			return nil, nil, nil, err
		}
		if err := json.Unmarshal(rulesJSON, &fs.Rules); err != nil {
			return nil, nil, nil, fmt.Errorf("unmarshal rules: %w", err)
		}
		if len(variantsJSON) > 0 {
			json.Unmarshal(variantsJSON, &fs.Variants)
		}
		states = append(states, fs)
	}

	segments, err := s.ListSegments(ctx, projectID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("load segments: %w", err)
	}

	return flags, states, segments, nil
}

// --- Listen for changes ---

func (s *Store) ListenForChanges(ctx context.Context, callback func(payload string)) error {
	conn, err := s.pool.Acquire(ctx)
	if err != nil {
		return fmt.Errorf("acquire conn for listen: %w", err)
	}

	_, err = conn.Exec(ctx, "LISTEN flag_changes")
	if err != nil {
		conn.Release()
		return fmt.Errorf("listen: %w", err)
	}

	go func() {
		defer conn.Release()
		for {
			notification, err := conn.Conn().WaitForNotification(ctx)
			if err != nil {
				if ctx.Err() != nil {
					return
				}
				time.Sleep(time.Second)
				continue
			}
			callback(notification.Payload)
		}
	}()

	return nil
}

// --- Approval Requests ---

func (s *Store) CreateApprovalRequest(ctx context.Context, ar *domain.ApprovalRequest) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO approval_requests (org_id, requestor_id, flag_id, env_id, change_type, payload, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at, updated_at`,
		ar.OrgID, ar.RequestorID, ar.FlagID, ar.EnvID, ar.ChangeType, ar.Payload, ar.Status,
	).Scan(&ar.ID, &ar.CreatedAt, &ar.UpdatedAt)
}

func (s *Store) GetApprovalRequest(ctx context.Context, id string) (*domain.ApprovalRequest, error) {
	ar := &domain.ApprovalRequest{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, requestor_id, flag_id, env_id, change_type, payload, status,
		        reviewer_id, review_note, reviewed_at, created_at, updated_at
		 FROM approval_requests WHERE id = $1`, id,
	).Scan(&ar.ID, &ar.OrgID, &ar.RequestorID, &ar.FlagID, &ar.EnvID, &ar.ChangeType,
		&ar.Payload, &ar.Status, &ar.ReviewerID, &ar.ReviewNote, &ar.ReviewedAt, &ar.CreatedAt, &ar.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "approval request")
	}
	return ar, nil
}

func (s *Store) ListApprovalRequests(ctx context.Context, orgID string, status string, limit, offset int) ([]domain.ApprovalRequest, error) {
	query := `SELECT id, org_id, requestor_id, flag_id, env_id, change_type, payload, status,
	                  reviewer_id, review_note, reviewed_at, created_at, updated_at
	           FROM approval_requests WHERE org_id = $1`
	args := []interface{}{orgID}
	if status != "" {
		query += ` AND status = $2`
		args = append(args, status)
		query += ` ORDER BY created_at DESC LIMIT $3 OFFSET $4`
		args = append(args, limit, offset)
	} else {
		query += ` ORDER BY created_at DESC LIMIT $2 OFFSET $3`
		args = append(args, limit, offset)
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []domain.ApprovalRequest
	for rows.Next() {
		var ar domain.ApprovalRequest
		if err := rows.Scan(&ar.ID, &ar.OrgID, &ar.RequestorID, &ar.FlagID, &ar.EnvID,
			&ar.ChangeType, &ar.Payload, &ar.Status, &ar.ReviewerID, &ar.ReviewNote,
			&ar.ReviewedAt, &ar.CreatedAt, &ar.UpdatedAt); err != nil {
			return nil, err
		}
		result = append(result, ar)
	}
	return result, nil
}

func (s *Store) UpdateApprovalRequest(ctx context.Context, ar *domain.ApprovalRequest) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE approval_requests SET status=$1, reviewer_id=$2, review_note=$3, reviewed_at=$4, updated_at=NOW()
		 WHERE id=$5`,
		ar.Status, ar.ReviewerID, ar.ReviewNote, ar.ReviewedAt, ar.ID)
	return err
}

// --- Get environment by API key ---

func (s *Store) GetEnvironmentByAPIKeyHash(ctx context.Context, keyHash string) (*domain.Environment, *domain.APIKey, error) {
	k, err := s.GetAPIKeyByHash(ctx, keyHash)
	if err != nil {
		if err == pgx.ErrNoRows {
			return nil, nil, fmt.Errorf("api key not found")
		}
		return nil, nil, err
	}
	env, err := s.GetEnvironment(ctx, k.EnvID)
	if err != nil {
		return nil, nil, err
	}
	return env, k, nil
}

// --- Billing ---

func (s *Store) GetSubscription(ctx context.Context, orgID string) (*domain.Subscription, error) {
	sub := &domain.Subscription{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, COALESCE(payu_txnid, ''), COALESCE(payu_mihpayid, ''), plan, status,
		        current_period_start, current_period_end, cancel_at_period_end, created_at, updated_at
		 FROM subscriptions WHERE org_id = $1`, orgID,
	).Scan(&sub.ID, &sub.OrgID, &sub.PayUTxnID, &sub.PayUMihpayID,
		&sub.Plan, &sub.Status, &sub.CurrentPeriodStart, &sub.CurrentPeriodEnd,
		&sub.CancelAtPeriodEnd, &sub.CreatedAt, &sub.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "subscription")
	}
	return sub, nil
}

func (s *Store) UpsertSubscription(ctx context.Context, sub *domain.Subscription) error {
	existing, err := s.GetSubscription(ctx, sub.OrgID)
	if err != nil || existing == nil {
		return s.pool.QueryRow(ctx,
			`INSERT INTO subscriptions (org_id, payu_txnid, payu_mihpayid, plan, status,
			                            current_period_start, current_period_end, cancel_at_period_end)
			 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
			 RETURNING id, created_at, updated_at`,
			sub.OrgID, sub.PayUTxnID, sub.PayUMihpayID,
			sub.Plan, sub.Status, sub.CurrentPeriodStart, sub.CurrentPeriodEnd,
			sub.CancelAtPeriodEnd,
		).Scan(&sub.ID, &sub.CreatedAt, &sub.UpdatedAt)
	}

	_, err = s.pool.Exec(ctx,
		`UPDATE subscriptions SET
		   payu_txnid = COALESCE(NULLIF($2, ''), payu_txnid),
		   payu_mihpayid = COALESCE(NULLIF($3, ''), payu_mihpayid),
		   plan = COALESCE(NULLIF($4, ''), plan),
		   status = COALESCE(NULLIF($5, ''), status),
		   current_period_start = CASE WHEN $6 = '0001-01-01'::timestamptz THEN current_period_start ELSE $6 END,
		   current_period_end = CASE WHEN $7 = '0001-01-01'::timestamptz THEN current_period_end ELSE $7 END,
		   cancel_at_period_end = $8,
		   updated_at = NOW()
		 WHERE org_id = $1`,
		sub.OrgID, sub.PayUTxnID, sub.PayUMihpayID,
		sub.Plan, sub.Status, sub.CurrentPeriodStart, sub.CurrentPeriodEnd,
		sub.CancelAtPeriodEnd,
	)
	return err
}

func (s *Store) UpdateOrgPlan(ctx context.Context, orgID, plan string, limits domain.PlanLimits) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE organizations SET plan = $1, plan_seats_limit = $2, plan_projects_limit = $3,
		        plan_environments_limit = $4, updated_at = NOW()
		 WHERE id = $5`,
		plan, limits.Seats, limits.Projects, limits.Environments, orgID)
	return err
}

// --- Usage ---

func (s *Store) IncrementUsage(ctx context.Context, orgID, metricName string, delta int64) error {
	existing, err := s.GetUsage(ctx, orgID, metricName)
	if err != nil || existing == nil {
		now := time.Now()
		periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
		periodEnd := periodStart.AddDate(0, 1, 0)
		_, err := s.pool.Exec(ctx,
			`INSERT INTO usage_metrics (org_id, metric_name, value, period_start, period_end)
			 VALUES ($1, $2, $3, $4, $5)`,
			orgID, metricName, delta, periodStart, periodEnd)
		return err
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE usage_metrics SET value = value + $1 WHERE id = $2`,
		delta, existing.ID)
	return err
}

func (s *Store) GetUsage(ctx context.Context, orgID, metricName string) (*domain.UsageMetric, error) {
	m := &domain.UsageMetric{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, metric_name, value, period_start, period_end, created_at
		 FROM usage_metrics WHERE org_id = $1 AND metric_name = $2`, orgID, metricName,
	).Scan(&m.ID, &m.OrgID, &m.MetricName, &m.Value, &m.PeriodStart, &m.PeriodEnd, &m.CreatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "usage metric")
	}
	return m, nil
}

// --- Onboarding ---

func (s *Store) GetOnboardingState(ctx context.Context, orgID string) (*domain.OnboardingState, error) {
	state := &domain.OnboardingState{}
	err := s.pool.QueryRow(ctx,
		`SELECT org_id, plan_selected, first_flag_created, first_sdk_connected,
		        first_evaluation, completed, completed_at, updated_at
		 FROM onboarding_state WHERE org_id = $1`, orgID,
	).Scan(&state.OrgID, &state.PlanSelected, &state.FirstFlagCreated,
		&state.FirstSDKConnected, &state.FirstEvaluation, &state.Completed,
		&state.CompletedAt, &state.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "onboarding state")
	}
	return state, nil
}

func (s *Store) UpsertOnboardingState(ctx context.Context, state *domain.OnboardingState) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO onboarding_state (org_id, plan_selected, first_flag_created, first_sdk_connected,
		                               first_evaluation, completed, completed_at, updated_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())
		 ON CONFLICT (org_id) DO UPDATE SET
		   plan_selected = $2, first_flag_created = $3, first_sdk_connected = $4,
		   first_evaluation = $5, completed = $6, completed_at = $7, updated_at = NOW()`,
		state.OrgID, state.PlanSelected, state.FirstFlagCreated, state.FirstSDKConnected,
		state.FirstEvaluation, state.Completed, state.CompletedAt)
	return err
}

// --- Pending Registrations ---

func (s *Store) UpsertPendingRegistration(ctx context.Context, pr *domain.PendingRegistration) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO pending_registrations (email, name, org_name, password_hash, otp_hash, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (email) DO UPDATE SET
		   name = EXCLUDED.name,
		   org_name = EXCLUDED.org_name,
		   password_hash = EXCLUDED.password_hash,
		   otp_hash = EXCLUDED.otp_hash,
		   expires_at = EXCLUDED.expires_at,
		   attempts = 0,
		   created_at = now()
		 RETURNING id, created_at`,
		pr.Email, pr.Name, pr.OrgName, pr.PasswordHash, pr.OTPHash, pr.ExpiresAt,
	).Scan(&pr.ID, &pr.CreatedAt)
}

func (s *Store) GetPendingRegistrationByEmail(ctx context.Context, email string) (*domain.PendingRegistration, error) {
	pr := &domain.PendingRegistration{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, name, org_name, password_hash, otp_hash, expires_at, attempts, created_at
		 FROM pending_registrations WHERE email = $1`, email,
	).Scan(&pr.ID, &pr.Email, &pr.Name, &pr.OrgName, &pr.PasswordHash, &pr.OTPHash,
		&pr.ExpiresAt, &pr.Attempts, &pr.CreatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "pending registration")
	}
	return pr, nil
}

func (s *Store) IncrementPendingAttempts(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE pending_registrations SET attempts = attempts + 1 WHERE id = $1`, id)
	return err
}

func (s *Store) DeletePendingRegistration(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx,
		`DELETE FROM pending_registrations WHERE id = $1`, id)
	return err
}

func (s *Store) DeleteExpiredPendingRegistrations(ctx context.Context, before time.Time) (int, error) {
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM pending_registrations WHERE expires_at < $1`, before)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

// --- Trial & Account Lifecycle ---

func (s *Store) UpdateLastLoginAt(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET last_login_at = now() WHERE id = $1`, userID)
	return err
}

func (s *Store) SoftDeleteOrganization(ctx context.Context, orgID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE organizations SET deleted_at = now(), updated_at = now() WHERE id = $1 AND deleted_at IS NULL`, orgID)
	return err
}

func (s *Store) RestoreOrganization(ctx context.Context, orgID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE organizations SET deleted_at = NULL, updated_at = now() WHERE id = $1 AND deleted_at IS NOT NULL`, orgID)
	return err
}

func (s *Store) ListSoftDeletedOrgs(ctx context.Context, deletedBefore time.Time) ([]domain.Organization, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, name, slug, created_at, updated_at,
		        COALESCE(plan, 'free'), COALESCE(payu_customer_ref, ''),
		        COALESCE(plan_seats_limit, 3), COALESCE(plan_projects_limit, 1), COALESCE(plan_environments_limit, 3),
		        trial_expires_at, deleted_at
		 FROM organizations WHERE deleted_at IS NOT NULL AND deleted_at < $1`, deletedBefore)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var orgs []domain.Organization
	for rows.Next() {
		var o domain.Organization
		if err := rows.Scan(&o.ID, &o.Name, &o.Slug, &o.CreatedAt, &o.UpdatedAt,
			&o.Plan, &o.PayUCustomerRef,
			&o.PlanSeatsLimit, &o.PlanProjectsLimit, &o.PlanEnvironmentsLimit,
			&o.TrialExpiresAt, &o.DeletedAt); err != nil {
			return nil, err
		}
		orgs = append(orgs, o)
	}
	return orgs, nil
}

func (s *Store) HardDeleteOrganization(ctx context.Context, orgID string) error {
	_, err := s.pool.Exec(ctx,
		`DELETE FROM organizations WHERE id = $1`, orgID)
	return err
}

func (s *Store) ListInactiveOrgs(ctx context.Context, plan string, inactiveSince time.Time) ([]domain.Organization, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT o.id, o.name, o.slug, o.created_at, o.updated_at,
		        COALESCE(o.plan, 'free'), COALESCE(o.payu_customer_ref, ''),
		        COALESCE(o.plan_seats_limit, 3), COALESCE(o.plan_projects_limit, 1), COALESCE(o.plan_environments_limit, 3),
		        o.trial_expires_at, o.deleted_at
		 FROM organizations o
		 WHERE o.plan = $1 AND o.deleted_at IS NULL
		 AND NOT EXISTS (
		   SELECT 1 FROM org_members om
		   JOIN users u ON u.id = om.user_id
		   WHERE om.org_id = o.id AND u.last_login_at > $2
		 )`, plan, inactiveSince)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var orgs []domain.Organization
	for rows.Next() {
		var o domain.Organization
		if err := rows.Scan(&o.ID, &o.Name, &o.Slug, &o.CreatedAt, &o.UpdatedAt,
			&o.Plan, &o.PayUCustomerRef,
			&o.PlanSeatsLimit, &o.PlanProjectsLimit, &o.PlanEnvironmentsLimit,
			&o.TrialExpiresAt, &o.DeletedAt); err != nil {
			return nil, err
		}
		orgs = append(orgs, o)
	}
	return orgs, nil
}

func (s *Store) DowngradeOrgToFree(ctx context.Context, orgID string) error {
	defaults := domain.PlanDefaults[domain.PlanFree]
	_, err := s.pool.Exec(ctx,
		`UPDATE organizations SET
		   plan = $1, trial_expires_at = NULL,
		   plan_seats_limit = $2, plan_projects_limit = $3, plan_environments_limit = $4,
		   updated_at = now()
		 WHERE id = $5`,
		domain.PlanFree, defaults.Seats, defaults.Projects, defaults.Environments, orgID)
	return err
}

// --- Sales Inquiries ---

func (s *Store) CreateSalesInquiry(ctx context.Context, inq *domain.SalesInquiry) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO sales_inquiries (org_id, contact_name, email, company, team_size, message, status)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 RETURNING id, created_at`,
		inq.OrgID, inq.ContactName, inq.Email, inq.Company, inq.TeamSize, inq.Message, domain.SalesStatusNew,
	).Scan(&inq.ID, &inq.CreatedAt)
}

// --- One-Time Tokens ---

func (s *Store) CreateOneTimeToken(ctx context.Context, userID, orgID string, ttl time.Duration) (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generating one-time token: %w", err)
	}
	token := hex.EncodeToString(b)
	expiresAt := time.Now().Add(ttl)

	_, err := s.pool.Exec(ctx,
		`INSERT INTO one_time_tokens (token, user_id, org_id, expires_at)
		 VALUES ($1, $2, $3, $4)`,
		token, userID, orgID, expiresAt)
	if err != nil {
		return "", err
	}
	return token, nil
}

func (s *Store) ConsumeOneTimeToken(ctx context.Context, token string) (string, string, error) {
	var userID, orgID string
	err := s.pool.QueryRow(ctx,
		`UPDATE one_time_tokens
		 SET used = true
		 WHERE token = $1 AND used = false AND expires_at > NOW()
		 RETURNING user_id, org_id`,
		token).Scan(&userID, &orgID)
	if err != nil {
		return "", "", fmt.Errorf("invalid or expired token")
	}
	return userID, orgID, nil
}
