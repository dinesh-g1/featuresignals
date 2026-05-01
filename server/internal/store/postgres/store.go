package postgres

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgconn"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/lifecycle"
)

type Store struct {
	pool               *pgxpool.Pool
	lockMu             sync.Mutex
	lockConn           *pgxpool.Conn
	auditIntegrityKey  string // HMAC key for audit log tamper-evidence chain
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

// SetAuditIntegrityKey sets the HMAC key used to compute audit log integrity
// hashes. Must be called before any audit entries are created. Uses
// ENCRYPTION_MASTER_KEY as the key material.
func (s *Store) SetAuditIntegrityKey(key string) {
	s.auditIntegrityKey = key
}

// Pool returns the underlying connection pool, allowing other stores
// (e.g. env var store) to share the same pool.
func (s *Store) Pool() *pgxpool.Pool {
	return s.pool
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
	if org.DataRegion == "" {
		org.DataRegion = domain.RegionUS
	}
	defaults := domain.PlanDefaults()[org.Plan]
	err := s.pool.QueryRow(ctx,
		`INSERT INTO organizations (name, slug, plan, plan_seats_limit, plan_projects_limit, plan_environments_limit, trial_expires_at, data_region)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at, updated_at`,
		org.Name, org.Slug, org.Plan, defaults.Seats, defaults.Projects, defaults.Environments, org.TrialExpiresAt, org.DataRegion,
	).Scan(&org.ID, &org.CreatedAt, &org.UpdatedAt)
	return wrapConflict(err, "organization")
}

func (s *Store) GetOrganization(ctx context.Context, id string) (*domain.Organization, error) {
	org := &domain.Organization{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, name, slug, created_at, updated_at,
		        COALESCE(plan, 'free'), COALESCE(payu_customer_ref, ''),
		        COALESCE(payment_gateway, 'payu'),
		        COALESCE(plan_seats_limit, 3), COALESCE(plan_projects_limit, 1), COALESCE(plan_environments_limit, 2),
		        COALESCE(data_region, 'us')
		 FROM organizations WHERE id = $1`, id,
	).Scan(&org.ID, &org.Name, &org.Slug, &org.CreatedAt, &org.UpdatedAt,
		&org.Plan, &org.PayUCustomerRef, &org.PaymentGateway,
		&org.PlanSeatsLimit, &org.PlanProjectsLimit, &org.PlanEnvironmentsLimit,
		&org.DataRegion)
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
		        COALESCE(payment_gateway, 'payu'),
		        COALESCE(plan_seats_limit, 3), COALESCE(plan_projects_limit, 1), COALESCE(plan_environments_limit, 2),
		        COALESCE(data_region, 'us')
		 FROM organizations WHERE id LIKE $1 || '%' LIMIT 1`, prefix,
	).Scan(&org.ID, &org.Name, &org.Slug, &org.CreatedAt, &org.UpdatedAt,
		&org.Plan, &org.PayUCustomerRef, &org.PaymentGateway,
		&org.PlanSeatsLimit, &org.PlanProjectsLimit, &org.PlanEnvironmentsLimit,
		&org.DataRegion)
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
		        COALESCE(email_verified, false),
		        COALESCE(email_verify_token, ''), email_verify_expires_at,
		        created_at, updated_at
		 FROM users WHERE email = $1`, email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&user.EmailVerified,
		&user.EmailVerifyToken, &user.EmailVerifyExpires,
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
		        COALESCE(email_verified, false),
		        COALESCE(email_verify_token, ''), email_verify_expires_at,
		        created_at, updated_at
		 FROM users WHERE id = $1`, id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&user.EmailVerified,
		&user.EmailVerifyToken, &user.EmailVerifyExpires,
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
		        COALESCE(email_verified, false),
		        COALESCE(email_verify_token, ''), email_verify_expires_at,
		        created_at, updated_at
		 FROM users WHERE email_verify_token = $1`, token,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&user.EmailVerified,
		&user.EmailVerifyToken, &user.EmailVerifyExpires,
		&user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "user")
	}
	return user, nil
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

// SetPasswordResetToken stores a password reset token for the given user.
// It invalidates any previous unused tokens for the same user.
func (s *Store) SetPasswordResetToken(ctx context.Context, userID, token string, expires time.Time, ip, ua string) error {
	// Invalidate any existing unused tokens first
	_, err := s.pool.Exec(ctx,
		`UPDATE password_reset_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`,
		userID)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`INSERT INTO password_reset_tokens (user_id, token, expires_at, ip_address, user_agent) VALUES ($1, $2, $3, $4, $5)`,
		userID, token, expires, ip, ua)
	return err
}

// ConsumePasswordResetToken validates an OTP against stored hashed tokens,
// returning the associated user ID. Returns domain.ErrNotFound if the OTP
// is invalid, expired, or already used.
func (s *Store) ConsumePasswordResetToken(ctx context.Context, otp string) (string, error) {
	// Find all valid (unused, not expired) tokens
	rows, err := s.pool.Query(ctx,
		`SELECT id, user_id, token, expires_at FROM password_reset_tokens WHERE used_at IS NULL AND expires_at > NOW()`)
	if err != nil {
		return "", err
	}
	defer rows.Close()

	var matchID string
	var matchUserID string
	found := false

	for rows.Next() {
		var id, userID, tokenHash string
		var expiresAt time.Time
		if err := rows.Scan(&id, &userID, &tokenHash, &expiresAt); err != nil {
			return "", err
		}
		// Compare OTP against stored bcrypt hash
		if auth.CheckPassword(otp, tokenHash) {
			matchID = id
			matchUserID = userID
			found = true
			break
		}
	}
	if err := rows.Err(); err != nil {
		return "", err
	}

	if !found {
		return "", domain.WrapNotFound("password reset token invalid or expired")
	}

	// Mark as consumed
	_, err = s.pool.Exec(ctx,
		`UPDATE password_reset_tokens SET used_at = now() WHERE id = $1`,
		matchID)
	if err != nil {
		return "", err
	}
	return matchUserID, nil
}

// UpdatePassword updates the user's password hash.
func (s *Store) UpdatePassword(ctx context.Context, userID, newPasswordHash string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET password_hash = $2, updated_at = now() WHERE id = $1`,
		userID, newPasswordHash)
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

func (s *Store) UpdateProject(ctx context.Context, p *domain.Project) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE projects SET name = $1, slug = $2, updated_at = NOW() WHERE id = $3`,
		p.Name, p.Slug, p.ID)
	if err != nil {
		return wrapConflict(err, "project slug")
	}
	return nil
}

// --- Environments ---

func (s *Store) CreateEnvironment(ctx context.Context, e *domain.Environment) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO environments (project_id, org_id, name, slug, color) VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at`,
		e.ProjectID, e.OrgID, e.Name, e.Slug, e.Color,
	).Scan(&e.ID, &e.CreatedAt, &e.UpdatedAt)
}

func (s *Store) ListEnvironments(ctx context.Context, projectID string) ([]domain.Environment, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, project_id, org_id, name, slug, color, created_at, updated_at FROM environments WHERE project_id = $1 ORDER BY created_at`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	envs := []domain.Environment{}
	for rows.Next() {
		var e domain.Environment
		if err := rows.Scan(&e.ID, &e.ProjectID, &e.OrgID, &e.Name, &e.Slug, &e.Color, &e.CreatedAt, &e.UpdatedAt); err != nil {
			return nil, err
		}
		envs = append(envs, e)
	}
	return envs, nil
}

func (s *Store) GetEnvironment(ctx context.Context, id string) (*domain.Environment, error) {
	e := &domain.Environment{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, project_id, org_id, name, slug, color, created_at, updated_at FROM environments WHERE id = $1`, id,
	).Scan(&e.ID, &e.ProjectID, &e.OrgID, &e.Name, &e.Slug, &e.Color, &e.CreatedAt, &e.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "environment")
	}
	return e, nil
}

func (s *Store) DeleteEnvironment(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM environments WHERE id = $1`, id)
	return err
}

func (s *Store) UpdateEnvironment(ctx context.Context, e *domain.Environment) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE environments SET name = $1, slug = $2, color = $3, updated_at = NOW() WHERE id = $4`,
		e.Name, e.Slug, e.Color, e.ID)
	if err != nil {
		return wrapConflict(err, "environment slug")
	}
	return nil
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
		`INSERT INTO flags (project_id, org_id, key, name, description, flag_type, category, status, default_value, tags, expires_at, prerequisites, mutual_exclusion_group)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, created_at, updated_at`,
		f.ProjectID, f.OrgID, f.Key, f.Name, f.Description, f.FlagType, f.Category, f.Status, f.DefaultValue, f.Tags, f.ExpiresAt, f.Prerequisites, f.MutualExclusionGroup,
	).Scan(&f.ID, &f.CreatedAt, &f.UpdatedAt)
	return wrapConflict(err, "flag key")
}

func (s *Store) GetFlag(ctx context.Context, projectID, key string) (*domain.Flag, error) {
	f := &domain.Flag{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, project_id, org_id, key, name, description, flag_type, category, status, default_value, tags, expires_at, prerequisites, mutual_exclusion_group, created_at, updated_at
		 FROM flags WHERE project_id = $1 AND key = $2`, projectID, key,
	).Scan(&f.ID, &f.ProjectID, &f.OrgID, &f.Key, &f.Name, &f.Description, &f.FlagType, &f.Category, &f.Status, &f.DefaultValue, &f.Tags, &f.ExpiresAt, &f.Prerequisites, &f.MutualExclusionGroup, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "flag")
	}
	return f, nil
}

func (s *Store) ListFlags(ctx context.Context, projectID string) ([]domain.Flag, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, project_id, org_id, key, name, description, flag_type, category, status, default_value, tags, expires_at, prerequisites, mutual_exclusion_group, created_at, updated_at
		 FROM flags WHERE project_id = $1 ORDER BY created_at`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	flags := []domain.Flag{}
	for rows.Next() {
		var f domain.Flag
		if err := rows.Scan(&f.ID, &f.ProjectID, &f.OrgID, &f.Key, &f.Name, &f.Description, &f.FlagType, &f.Category, &f.Status, &f.DefaultValue, &f.Tags, &f.ExpiresAt, &f.Prerequisites, &f.MutualExclusionGroup, &f.CreatedAt, &f.UpdatedAt); err != nil {
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

// --- Flag Versions ---

func (s *Store) ListFlagVersions(ctx context.Context, flagID string, limit, offset int) ([]domain.FlagVersion, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, flag_id, version, config, previous_config, changed_by, change_reason, created_at
		 FROM flag_versions WHERE flag_id = $1
		 ORDER BY version DESC LIMIT $2 OFFSET $3`,
		flagID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("list flag versions: %w", err)
	}
	defer rows.Close()

	var versions []domain.FlagVersion
	for rows.Next() {
		var v domain.FlagVersion
		var changedBy, changeReason *string
		if err := rows.Scan(&v.ID, &v.FlagID, &v.Version, &v.Config, &v.PreviousConfig, &changedBy, &changeReason, &v.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan flag version: %w", err)
		}
		v.ChangedBy = changedBy
		v.ChangeReason = changeReason
		versions = append(versions, v)
	}
	return versions, rows.Err()
}

func (s *Store) GetFlagVersion(ctx context.Context, flagID string, version int) (*domain.FlagVersion, error) {
	v := &domain.FlagVersion{}
	var changedBy, changeReason *string
	err := s.pool.QueryRow(ctx,
		`SELECT id, flag_id, version, config, previous_config, changed_by, change_reason, created_at
		 FROM flag_versions WHERE flag_id = $1 AND version = $2`,
		flagID, version,
	).Scan(&v.ID, &v.FlagID, &v.Version, &v.Config, &v.PreviousConfig, &changedBy, &changeReason, &v.CreatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "flag version")
	}
	v.ChangedBy = changedBy
	v.ChangeReason = changeReason
	return v, nil
}

func (s *Store) RollbackFlagToVersion(ctx context.Context, flagID string, version int, userID string, reason string) error {
	// Get the target version config
	targetVersion, err := s.GetFlagVersion(ctx, flagID, version)
	if err != nil {
		return err
	}

	// Extract flag config from the version snapshot
	var flagConfig struct {
		Key          string     `json:"key"`
		Name         string     `json:"name"`
		Description  string     `json:"description"`
		FlagType     string     `json:"flag_type"`
		DefaultValue string     `json:"default_value"`
		Tags         []string   `json:"tags"`
		ExpiresAt    *time.Time `json:"expires_at"`
	}

	if err := json.Unmarshal(targetVersion.Config, &flagConfig); err != nil {
		return fmt.Errorf("unmarshal flag config: %w", err)
	}

	// Update the flag with the old config
	_, err = s.pool.Exec(ctx,
		`UPDATE flags SET name=$1, description=$2, flag_type=$3, default_value=$4, tags=$5, expires_at=$6, updated_at=NOW()
		 WHERE id = $7`,
		flagConfig.Name, flagConfig.Description, flagConfig.FlagType, flagConfig.DefaultValue,
		flagConfig.Tags, flagConfig.ExpiresAt, flagID)
	if err != nil {
		return fmt.Errorf("rollback flag: %w", err)
	}

	// The trigger will auto-create a new version entry for this rollback
	// We need to update the latest version with the rollback metadata
	_, err = s.pool.Exec(ctx,
		`UPDATE flag_versions SET changed_by=$1, change_reason=$2
		 WHERE flag_id=$3 AND version = (SELECT MAX(version) FROM flag_versions WHERE flag_id=$3)`,
		userID, reason, flagID)
	if err != nil {
		return fmt.Errorf("update version metadata: %w", err)
	}

	return nil
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
		`INSERT INTO flag_states (flag_id, env_id, org_id, enabled, default_value, rules, percentage_rollout, variants, scheduled_enable_at, scheduled_disable_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		 ON CONFLICT (flag_id, env_id) DO UPDATE SET enabled=$4, default_value=$5, rules=$6, percentage_rollout=$7,
		   variants=$8, scheduled_enable_at=$9, scheduled_disable_at=$10, updated_at=NOW()
		 RETURNING id, created_at, updated_at`,
		fs.FlagID, fs.EnvID, fs.OrgID, fs.Enabled, fs.DefaultValue, rulesJSON, fs.PercentageRollout,
		variantsJSON, fs.ScheduledEnableAt, fs.ScheduledDisableAt,
	).Scan(&fs.ID, &fs.CreatedAt, &fs.UpdatedAt)
}

func (s *Store) GetFlagState(ctx context.Context, flagID, envID string) (*domain.FlagState, error) {
	fs := &domain.FlagState{}
	var rulesJSON, variantsJSON []byte
	err := s.pool.QueryRow(ctx,
		`SELECT id, flag_id, env_id, org_id, enabled, default_value, rules, percentage_rollout,
		        variants, scheduled_enable_at, scheduled_disable_at, created_at, updated_at
		 FROM flag_states WHERE flag_id = $1 AND env_id = $2`, flagID, envID,
	).Scan(&fs.ID, &fs.FlagID, &fs.EnvID, &fs.OrgID, &fs.Enabled, &fs.DefaultValue, &rulesJSON,
		&fs.PercentageRollout, &variantsJSON, &fs.ScheduledEnableAt, &fs.ScheduledDisableAt, &fs.CreatedAt, &fs.UpdatedAt)
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

func (s *Store) ListFlagStatesByEnv(ctx context.Context, envID string) ([]domain.FlagState, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, flag_id, env_id, org_id, enabled, default_value, rules, percentage_rollout,
		        variants, scheduled_enable_at, scheduled_disable_at, created_at, updated_at
		 FROM flag_states WHERE env_id = $1`, envID)
	if err != nil {
		return nil, fmt.Errorf("list flag states by env: %w", err)
	}
	defer rows.Close()

	var states []domain.FlagState
	for rows.Next() {
		var fs domain.FlagState
		var rulesJSON, variantsJSON []byte
		if err := rows.Scan(&fs.ID, &fs.FlagID, &fs.EnvID, &fs.OrgID, &fs.Enabled, &fs.DefaultValue, &rulesJSON,
			&fs.PercentageRollout, &variantsJSON, &fs.ScheduledEnableAt, &fs.ScheduledDisableAt, &fs.CreatedAt, &fs.UpdatedAt); err != nil {
			return nil, fmt.Errorf("scan flag state: %w", err)
		}
		if err := json.Unmarshal(rulesJSON, &fs.Rules); err != nil {
			return nil, fmt.Errorf("unmarshal rules: %w", err)
		}
		if len(variantsJSON) > 0 {
			if err := json.Unmarshal(variantsJSON, &fs.Variants); err != nil {
				return nil, fmt.Errorf("unmarshal variants: %w", err)
			}
		}
		states = append(states, fs)
	}
	return states, rows.Err()
}

func (s *Store) ListPendingSchedules(ctx context.Context, before time.Time) ([]domain.FlagState, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, flag_id, env_id, org_id, enabled, default_value, rules, percentage_rollout,
		        variants, scheduled_enable_at, scheduled_disable_at, created_at, updated_at
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
		if err := rows.Scan(&fs.ID, &fs.FlagID, &fs.EnvID, &fs.OrgID, &fs.Enabled, &fs.DefaultValue,
			&rulesJSON, &fs.PercentageRollout, &variantsJSON, &fs.ScheduledEnableAt, &fs.ScheduledDisableAt, &fs.CreatedAt, &fs.UpdatedAt); err != nil {
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
		`INSERT INTO segments (project_id, org_id, key, name, description, match_type, rules)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at, updated_at`,
		seg.ProjectID, seg.OrgID, seg.Key, seg.Name, seg.Description, seg.MatchType, rulesJSON,
	).Scan(&seg.ID, &seg.CreatedAt, &seg.UpdatedAt)
	return wrapConflict(err, "segment key")
}

func (s *Store) ListSegments(ctx context.Context, projectID string) ([]domain.Segment, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, project_id, org_id, key, name, description, match_type, rules, created_at, updated_at
		 FROM segments WHERE project_id = $1 ORDER BY created_at`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	segments := []domain.Segment{}
	for rows.Next() {
		var seg domain.Segment
		var rulesJSON []byte
		if err := rows.Scan(&seg.ID, &seg.ProjectID, &seg.OrgID, &seg.Key, &seg.Name, &seg.Description, &seg.MatchType, &rulesJSON, &seg.CreatedAt, &seg.UpdatedAt); err != nil {
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
		`SELECT id, project_id, org_id, key, name, description, match_type, rules, created_at, updated_at
		 FROM segments WHERE project_id = $1 AND key = $2`, projectID, key,
	).Scan(&seg.ID, &seg.ProjectID, &seg.OrgID, &seg.Key, &seg.Name, &seg.Description, &seg.MatchType, &rulesJSON, &seg.CreatedAt, &seg.UpdatedAt)
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
		`INSERT INTO api_keys (env_id, org_id, key_hash, key_prefix, name, type, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING id, created_at`,
		k.EnvID, k.OrgID, k.KeyHash, k.KeyPrefix, k.Name, k.Type, k.ExpiresAt,
	).Scan(&k.ID, &k.CreatedAt)
	return wrapConflict(err, "api key")
}

func (s *Store) GetAPIKeyByID(ctx context.Context, id string) (*domain.APIKey, error) {
	k := &domain.APIKey{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, env_id, org_id, key_hash, key_prefix, name, type, created_at, last_used_at, revoked_at, expires_at
		 FROM api_keys WHERE id = $1`, id,
	).Scan(&k.ID, &k.EnvID, &k.OrgID, &k.KeyHash, &k.KeyPrefix, &k.Name, &k.Type, &k.CreatedAt, &k.LastUsedAt, &k.RevokedAt, &k.ExpiresAt)
	if err != nil {
		return nil, wrapNotFound(err, "api key")
	}
	return k, nil
}

func (s *Store) GetAPIKeyByHash(ctx context.Context, keyHash string) (*domain.APIKey, error) {
	k := &domain.APIKey{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, env_id, org_id, key_hash, key_prefix, name, type, created_at, last_used_at, revoked_at, expires_at
		 FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL
		 AND (expires_at IS NULL OR expires_at > NOW())`, keyHash,
	).Scan(&k.ID, &k.EnvID, &k.OrgID, &k.KeyHash, &k.KeyPrefix, &k.Name, &k.Type, &k.CreatedAt, &k.LastUsedAt, &k.RevokedAt, &k.ExpiresAt)
	if err != nil {
		return nil, wrapNotFound(err, "api key")
	}
	return k, nil
}

func (s *Store) ListAPIKeys(ctx context.Context, envID string) ([]domain.APIKey, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, env_id, org_id, key_hash, key_prefix, name, type, created_at, last_used_at, revoked_at, expires_at
		 FROM api_keys WHERE env_id = $1 ORDER BY created_at`, envID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	keys := []domain.APIKey{}
	for rows.Next() {
		var k domain.APIKey
		if err := rows.Scan(&k.ID, &k.EnvID, &k.OrgID, &k.KeyHash, &k.KeyPrefix, &k.Name, &k.Type, &k.CreatedAt, &k.LastUsedAt, &k.RevokedAt, &k.ExpiresAt); err != nil {
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

func (s *Store) RotateAPIKey(ctx context.Context, oldKeyID, envID, name, newKeyHash, newKeyPrefix string, gracePeriod time.Duration) (*domain.APIKey, error) {
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return nil, fmt.Errorf("begin rotate tx: %w", err)
	}
	defer tx.Rollback(ctx)

	graceExpires := time.Now().Add(gracePeriod)
	_, err = tx.Exec(ctx,
		`UPDATE api_keys SET grace_expires_at = $1 WHERE id = $2`, graceExpires, oldKeyID)
	if err != nil {
		return nil, fmt.Errorf("set grace period: %w", err)
	}

	var oldKey domain.APIKey
	err = tx.QueryRow(ctx,
		`SELECT org_id FROM api_keys WHERE id = $1`, oldKeyID,
	).Scan(&oldKey.OrgID)
	if err != nil {
		return nil, fmt.Errorf("get old key org_id: %w", err)
	}

	var newKey domain.APIKey
	err = tx.QueryRow(ctx,
		`INSERT INTO api_keys (env_id, org_id, name, key_hash, key_prefix, rotated_from_id)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 RETURNING id, env_id, org_id, name, key_prefix, created_at`,
		envID, oldKey.OrgID, name, newKeyHash, newKeyPrefix, oldKeyID,
	).Scan(&newKey.ID, &newKey.EnvID, &newKey.OrgID, &newKey.Name, &newKey.KeyPrefix, &newKey.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create rotated key: %w", err)
	}

	if err := tx.Commit(ctx); err != nil {
		return nil, fmt.Errorf("commit rotate tx: %w", err)
	}
	return &newKey, nil
}

func (s *Store) CleanExpiredGracePeriodKeys(ctx context.Context) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE api_keys SET revoked_at = NOW()
		 WHERE grace_expires_at IS NOT NULL AND grace_expires_at < NOW() AND revoked_at IS NULL`)
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
	tx, err := s.pool.Begin(ctx)
	if err != nil {
		return fmt.Errorf("begin audit tx: %w", err)
	}
	defer tx.Rollback(ctx)

	var prevHash string
	err = tx.QueryRow(ctx,
		`SELECT COALESCE(integrity_hash, '') FROM audit_logs WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
		entry.OrgID).Scan(&prevHash)
	if err != nil && !errors.Is(err, pgx.ErrNoRows) {
		return fmt.Errorf("get last audit hash: %w", err)
	}

	entry.CreatedAt = time.Now().UTC()
	entry.IntegrityHash = entry.ComputeIntegrityHash(prevHash, s.auditIntegrityKey)

	err = tx.QueryRow(ctx,
		`INSERT INTO audit_logs (org_id, project_id, actor_id, actor_type, action, resource_type, resource_id, before_state, after_state, metadata, ip_address, user_agent, integrity_hash)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING id, created_at`,
		entry.OrgID, entry.ProjectID, entry.ActorID, entry.ActorType, entry.Action, entry.ResourceType, entry.ResourceID,
		entry.BeforeState, entry.AfterState, entry.Metadata,
		entry.IPAddress, entry.UserAgent, entry.IntegrityHash,
	).Scan(&entry.ID, &entry.CreatedAt)
	if err != nil {
		return err
	}

	return tx.Commit(ctx)
}

func (s *Store) ListAuditEntries(ctx context.Context, orgID string, limit, offset int) ([]domain.AuditEntry, error) {
	entries, err := s.listAuditEntries(ctx, orgID, limit, offset, "")
	if err != nil {
		// Fallback for databases before migration 90 (no project_id column)
		return s.listAuditEntriesLegacy(ctx, orgID, limit, offset)
	}
	return entries, nil
}

func (s *Store) ListAuditEntriesByProject(ctx context.Context, orgID, projectID string, limit, offset int) ([]domain.AuditEntry, error) {
	entries, err := s.listAuditEntries(ctx, orgID, limit, offset, projectID)
	if err != nil {
		// Fallback: if project_id column doesn't exist, return unfiltered entries
		return s.listAuditEntriesLegacy(ctx, orgID, limit, offset)
	}
	return entries, nil
}

func (s *Store) listAuditEntriesLegacy(ctx context.Context, orgID string, limit, offset int) ([]domain.AuditEntry, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, actor_id, actor_type, action, resource_type, resource_id, before_state, after_state, metadata, ip_address, user_agent, integrity_hash, created_at
		 FROM audit_logs WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`, orgID, limit, offset)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	entries := []domain.AuditEntry{}
	for rows.Next() {
		var e domain.AuditEntry
		if err := rows.Scan(&e.ID, &e.OrgID, &e.ActorID, &e.ActorType, &e.Action, &e.ResourceType, &e.ResourceID, &e.BeforeState, &e.AfterState, &e.Metadata, &e.IPAddress, &e.UserAgent, &e.IntegrityHash, &e.CreatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (s *Store) listAuditEntries(ctx context.Context, orgID string, limit, offset int, projectID string) ([]domain.AuditEntry, error) {
	var query string
	var args []interface{}

	if projectID != "" {
		query = `SELECT id, org_id, project_id, actor_id, actor_type, action, resource_type, resource_id, before_state, after_state, metadata, ip_address, user_agent, integrity_hash, created_at
		 FROM audit_logs WHERE org_id = $1 AND (project_id = $2 OR project_id IS NULL) ORDER BY created_at DESC LIMIT $3 OFFSET $4`
		args = []interface{}{orgID, projectID, limit, offset}
	} else {
		query = `SELECT id, org_id, project_id, actor_id, actor_type, action, resource_type, resource_id, before_state, after_state, metadata, ip_address, user_agent, integrity_hash, created_at
		 FROM audit_logs WHERE org_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`
		args = []interface{}{orgID, limit, offset}
	}

	rows, err := s.pool.Query(ctx, query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	entries := []domain.AuditEntry{}
	for rows.Next() {
		var e domain.AuditEntry
		var projectID *string
		if err := rows.Scan(&e.ID, &e.OrgID, &projectID, &e.ActorID, &e.ActorType, &e.Action, &e.ResourceType, &e.ResourceID, &e.BeforeState, &e.AfterState, &e.Metadata, &e.IPAddress, &e.UserAgent, &e.IntegrityHash, &e.CreatedAt); err != nil {
			return nil, err
		}
		e.ProjectID = projectID
		entries = append(entries, e)
	}
	return entries, nil
}

func (s *Store) ListAuditEntriesForExport(ctx context.Context, orgID string, from, to string) ([]domain.AuditEntry, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, actor_id, actor_type, action, resource_type, resource_id, before_state, after_state, metadata, ip_address, user_agent, integrity_hash, created_at
		 FROM audit_logs WHERE org_id = $1 AND created_at >= $2::timestamptz AND created_at <= $3::timestamptz ORDER BY created_at ASC`,
		orgID, from, to)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	entries := []domain.AuditEntry{}
	for rows.Next() {
		var e domain.AuditEntry
		if err := rows.Scan(&e.ID, &e.OrgID, &e.ActorID, &e.ActorType, &e.Action, &e.ResourceType, &e.ResourceID, &e.BeforeState, &e.AfterState, &e.Metadata, &e.IPAddress, &e.UserAgent, &e.IntegrityHash, &e.CreatedAt); err != nil {
			return nil, err
		}
		entries = append(entries, e)
	}
	return entries, nil
}

func (s *Store) PurgeAuditEntries(ctx context.Context, olderThan time.Time) (int, error) {
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM audit_logs WHERE created_at < $1`, olderThan)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}

func (s *Store) GetLastAuditHash(ctx context.Context, orgID string) (string, error) {
	var hash string
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(integrity_hash, '') FROM audit_logs WHERE org_id = $1 ORDER BY created_at DESC LIMIT 1`,
		orgID).Scan(&hash)
	if err != nil {
		return "", nil
	}
	return hash, nil
}

// --- Ruleset Loading (for evaluation cache) ---

func (s *Store) LoadRuleset(ctx context.Context, projectID, envID string) ([]domain.Flag, []domain.FlagState, []domain.Segment, error) {
	flags, err := s.ListFlags(ctx, projectID)
	if err != nil {
		return nil, nil, nil, fmt.Errorf("load flags: %w", err)
	}

	// Load flag states for this environment
	rows, err := s.pool.Query(ctx,
		`SELECT fs.id, fs.flag_id, fs.env_id, fs.org_id, fs.enabled, fs.default_value, fs.rules,
		        fs.percentage_rollout, fs.variants, fs.scheduled_enable_at, fs.scheduled_disable_at, fs.created_at, fs.updated_at
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
		if err := rows.Scan(&fs.ID, &fs.FlagID, &fs.EnvID, &fs.OrgID, &fs.Enabled, &fs.DefaultValue,
			&rulesJSON, &fs.PercentageRollout, &variantsJSON, &fs.ScheduledEnableAt, &fs.ScheduledDisableAt, &fs.CreatedAt, &fs.UpdatedAt); err != nil {
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
		`SELECT id, org_id, COALESCE(gateway_provider, 'payu'),
		        COALESCE(payu_txnid, ''), COALESCE(payu_mihpayid, ''),
		        COALESCE(stripe_customer_id, ''), COALESCE(stripe_subscription_id, ''), COALESCE(stripe_payment_intent_id, ''),
		        plan, status, current_period_start, current_period_end,
		        cancel_at_period_end, created_at, updated_at
		 FROM subscriptions WHERE org_id = $1`, orgID,
	).Scan(&sub.ID, &sub.OrgID, &sub.GatewayProvider,
		&sub.PayUTxnID, &sub.PayUMihpayID,
		&sub.StripeCustomerID, &sub.StripeSubscriptionID, &sub.StripePaymentIntentID,
		&sub.Plan, &sub.Status, &sub.CurrentPeriodStart, &sub.CurrentPeriodEnd,
		&sub.CancelAtPeriodEnd, &sub.CreatedAt, &sub.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "subscription")
	}
	return sub, nil
}

func (s *Store) UpsertSubscription(ctx context.Context, sub *domain.Subscription) error {
	if sub.GatewayProvider == "" {
		sub.GatewayProvider = domain.GatewayPayU
	}
	return s.pool.QueryRow(ctx,
		`INSERT INTO subscriptions (org_id, gateway_provider, payu_txnid, payu_mihpayid,
		    stripe_customer_id, stripe_subscription_id, stripe_payment_intent_id,
		    plan, status, current_period_start, current_period_end, cancel_at_period_end)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
		 ON CONFLICT (org_id) DO UPDATE SET
		   gateway_provider = COALESCE(NULLIF(EXCLUDED.gateway_provider, ''), subscriptions.gateway_provider),
		   payu_txnid = COALESCE(NULLIF(EXCLUDED.payu_txnid, ''), subscriptions.payu_txnid),
		   payu_mihpayid = COALESCE(NULLIF(EXCLUDED.payu_mihpayid, ''), subscriptions.payu_mihpayid),
		   stripe_customer_id = COALESCE(NULLIF(EXCLUDED.stripe_customer_id, ''), subscriptions.stripe_customer_id),
		   stripe_subscription_id = COALESCE(NULLIF(EXCLUDED.stripe_subscription_id, ''), subscriptions.stripe_subscription_id),
		   stripe_payment_intent_id = COALESCE(NULLIF(EXCLUDED.stripe_payment_intent_id, ''), subscriptions.stripe_payment_intent_id),
		   plan = COALESCE(NULLIF(EXCLUDED.plan, ''), subscriptions.plan),
		   status = COALESCE(NULLIF(EXCLUDED.status, ''), subscriptions.status),
		   current_period_start = CASE WHEN EXCLUDED.current_period_start = '0001-01-01'::timestamptz THEN subscriptions.current_period_start ELSE EXCLUDED.current_period_start END,
		   current_period_end = CASE WHEN EXCLUDED.current_period_end = '0001-01-01'::timestamptz THEN subscriptions.current_period_end ELSE EXCLUDED.current_period_end END,
		   cancel_at_period_end = EXCLUDED.cancel_at_period_end,
		   updated_at = NOW()
		 RETURNING id, created_at, updated_at`,
		sub.OrgID, sub.GatewayProvider, sub.PayUTxnID, sub.PayUMihpayID,
		sub.StripeCustomerID, sub.StripeSubscriptionID, sub.StripePaymentIntentID,
		sub.Plan, sub.Status, sub.CurrentPeriodStart, sub.CurrentPeriodEnd,
		sub.CancelAtPeriodEnd,
	).Scan(&sub.ID, &sub.CreatedAt, &sub.UpdatedAt)
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
	now := time.Now()
	periodStart := time.Date(now.Year(), now.Month(), 1, 0, 0, 0, 0, time.UTC)
	periodEnd := periodStart.AddDate(0, 1, 0)
	_, err := s.pool.Exec(ctx,
		`INSERT INTO usage_metrics (org_id, metric_name, value, period_start, period_end)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (org_id, metric_name) DO UPDATE SET value = usage_metrics.value + EXCLUDED.value`,
		orgID, metricName, delta, periodStart, periodEnd)
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

// --- Payment Gateway ---

func (s *Store) GetSubscriptionByStripeID(ctx context.Context, stripeSubID string) (*domain.Subscription, error) {
	sub := &domain.Subscription{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, COALESCE(gateway_provider, 'payu'),
		        COALESCE(payu_txnid, ''), COALESCE(payu_mihpayid, ''),
		        COALESCE(stripe_customer_id, ''), COALESCE(stripe_subscription_id, ''), COALESCE(stripe_payment_intent_id, ''),
		        plan, status, current_period_start, current_period_end,
		        cancel_at_period_end, created_at, updated_at
		 FROM subscriptions WHERE stripe_subscription_id = $1`, stripeSubID,
	).Scan(&sub.ID, &sub.OrgID, &sub.GatewayProvider,
		&sub.PayUTxnID, &sub.PayUMihpayID,
		&sub.StripeCustomerID, &sub.StripeSubscriptionID, &sub.StripePaymentIntentID,
		&sub.Plan, &sub.Status, &sub.CurrentPeriodStart, &sub.CurrentPeriodEnd,
		&sub.CancelAtPeriodEnd, &sub.CreatedAt, &sub.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "subscription")
	}
	return sub, nil
}

func (s *Store) CreatePaymentEvent(ctx context.Context, event *domain.PaymentEvent) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO payment_events (org_id, gateway_provider, event_type, event_id, payload, processed)
		 VALUES ($1, $2, $3, $4, $5, $6)
		 ON CONFLICT (gateway_provider, event_id) DO NOTHING
		 RETURNING id, created_at`,
		event.OrgID, event.GatewayProvider, event.EventType, event.EventID, event.Payload, event.Processed,
	).Scan(&event.ID, &event.CreatedAt)
}

func (s *Store) GetPaymentEventByExternalID(ctx context.Context, provider, eventID string) (*domain.PaymentEvent, error) {
	ev := &domain.PaymentEvent{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, gateway_provider, event_type, event_id, payload, processed, created_at
		 FROM payment_events WHERE gateway_provider = $1 AND event_id = $2`, provider, eventID,
	).Scan(&ev.ID, &ev.OrgID, &ev.GatewayProvider, &ev.EventType, &ev.EventID, &ev.Payload, &ev.Processed, &ev.CreatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "payment event")
	}
	return ev, nil
}

func (s *Store) UpdateOrgPaymentGateway(ctx context.Context, orgID, gateway string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE organizations SET payment_gateway = $1, updated_at = NOW() WHERE id = $2`,
		gateway, orgID)
	return err
}

func (s *Store) ListPastDueSubscriptions(ctx context.Context, pastDueBefore time.Time) ([]domain.Subscription, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, gateway_provider, plan, status,
		        current_period_start, current_period_end, cancel_at_period_end,
		        created_at, updated_at,
		        COALESCE(payu_txnid, ''), COALESCE(payu_mihpayid, ''),
		        COALESCE(stripe_customer_id, ''), COALESCE(stripe_subscription_id, ''),
		        COALESCE(stripe_payment_intent_id, '')
		 FROM subscriptions
		 WHERE status = 'past_due' AND updated_at < $1`, pastDueBefore)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var subs []domain.Subscription
	for rows.Next() {
		var sub domain.Subscription
		if err := rows.Scan(
			&sub.ID, &sub.OrgID, &sub.GatewayProvider, &sub.Plan, &sub.Status,
			&sub.CurrentPeriodStart, &sub.CurrentPeriodEnd, &sub.CancelAtPeriodEnd,
			&sub.CreatedAt, &sub.UpdatedAt,
			&sub.PayUTxnID, &sub.PayUMihpayID,
			&sub.StripeCustomerID, &sub.StripeSubscriptionID, &sub.StripePaymentIntentID,
		); err != nil {
			return nil, err
		}
		subs = append(subs, sub)
	}
	return subs, nil
}

// --- Onboarding ---

func (s *Store) GetOnboardingState(ctx context.Context, orgID string) (*domain.OnboardingState, error) {
	state := &domain.OnboardingState{}
	err := s.pool.QueryRow(ctx,
		`SELECT org_id, plan_selected, first_flag_created, first_sdk_connected,
		        first_evaluation, completed, completed_at, updated_at
		 FROM onboarding_states WHERE org_id = $1`, orgID,
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
		`INSERT INTO onboarding_states (org_id, plan_selected, first_flag_created, first_sdk_connected,
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
	if pr.DataRegion == "" {
		pr.DataRegion = domain.RegionUS
	}
	return s.pool.QueryRow(ctx,
		`INSERT INTO pending_registrations (email, name, org_name, password_hash, otp_hash, expires_at, data_region)
		 VALUES ($1, $2, $3, $4, $5, $6, $7)
		 ON CONFLICT (email) DO UPDATE SET
		   name = EXCLUDED.name,
		   org_name = EXCLUDED.org_name,
		   password_hash = EXCLUDED.password_hash,
		   otp_hash = EXCLUDED.otp_hash,
		   expires_at = EXCLUDED.expires_at,
		   data_region = EXCLUDED.data_region,
		   attempts = 0,
		   created_at = now()
		 RETURNING id, created_at`,
		pr.Email, pr.Name, pr.OrgName, pr.PasswordHash, pr.OTPHash, pr.ExpiresAt, pr.DataRegion,
	).Scan(&pr.ID, &pr.CreatedAt)
}

func (s *Store) GetPendingRegistrationByEmail(ctx context.Context, email string) (*domain.PendingRegistration, error) {
	pr := &domain.PendingRegistration{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, name, org_name, password_hash, otp_hash, expires_at, attempts, created_at, COALESCE(data_region, 'us')
		 FROM pending_registrations WHERE email = $1`, email,
	).Scan(&pr.ID, &pr.Email, &pr.Name, &pr.OrgName, &pr.PasswordHash, &pr.OTPHash,
		&pr.ExpiresAt, &pr.Attempts, &pr.CreatedAt, &pr.DataRegion)
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
		        COALESCE(payment_gateway, 'payu'),
		        COALESCE(plan_seats_limit, 3), COALESCE(plan_projects_limit, 1), COALESCE(plan_environments_limit, 3),
		        trial_expires_at, deleted_at, COALESCE(data_region, 'us')
		 FROM organizations WHERE deleted_at IS NOT NULL AND deleted_at < $1`, deletedBefore)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var orgs []domain.Organization
	for rows.Next() {
		var o domain.Organization
		if err := rows.Scan(&o.ID, &o.Name, &o.Slug, &o.CreatedAt, &o.UpdatedAt,
			&o.Plan, &o.PayUCustomerRef, &o.PaymentGateway,
			&o.PlanSeatsLimit, &o.PlanProjectsLimit, &o.PlanEnvironmentsLimit,
			&o.TrialExpiresAt, &o.DeletedAt, &o.DataRegion); err != nil {
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
		        COALESCE(o.payment_gateway, 'payu'),
		        COALESCE(o.plan_seats_limit, 3), COALESCE(o.plan_projects_limit, 1), COALESCE(o.plan_environments_limit, 3),
		        o.trial_expires_at, o.deleted_at, COALESCE(o.data_region, 'us')
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
			&o.Plan, &o.PayUCustomerRef, &o.PaymentGateway,
			&o.PlanSeatsLimit, &o.PlanProjectsLimit, &o.PlanEnvironmentsLimit,
			&o.TrialExpiresAt, &o.DeletedAt, &o.DataRegion); err != nil {
			return nil, err
		}
		orgs = append(orgs, o)
	}
	return orgs, nil
}

func (s *Store) DowngradeOrgToFree(ctx context.Context, orgID string) error {
	defaults := domain.PlanDefaults()[domain.PlanFree]
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

// --- SSO Config ---

func (s *Store) UpsertSSOConfig(ctx context.Context, config *domain.SSOConfig) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO sso_configs (org_id, provider_type, metadata_url, metadata_xml, entity_id, acs_url, certificate, client_id, client_secret, issuer_url, enabled, enforce, default_role)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
		 ON CONFLICT (org_id) DO UPDATE SET
		   provider_type = EXCLUDED.provider_type, metadata_url = EXCLUDED.metadata_url,
		   metadata_xml = EXCLUDED.metadata_xml, entity_id = EXCLUDED.entity_id,
		   acs_url = EXCLUDED.acs_url, certificate = EXCLUDED.certificate,
		   client_id = EXCLUDED.client_id, client_secret = EXCLUDED.client_secret,
		   issuer_url = EXCLUDED.issuer_url, enabled = EXCLUDED.enabled,
		   enforce = EXCLUDED.enforce, default_role = EXCLUDED.default_role,
		   updated_at = NOW()
		 RETURNING id, created_at, updated_at`,
		config.OrgID, config.ProviderType, config.MetadataURL, config.MetadataXML,
		config.EntityID, config.ACSURL, config.Certificate,
		config.ClientID, config.ClientSecret, config.IssuerURL,
		config.Enabled, config.Enforce, config.DefaultRole,
	).Scan(&config.ID, &config.CreatedAt, &config.UpdatedAt)
}

func (s *Store) GetSSOConfig(ctx context.Context, orgID string) (*domain.SSOConfig, error) {
	var c domain.SSOConfig
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, provider_type, metadata_url, entity_id, acs_url, client_id, issuer_url, enabled, enforce, default_role, created_at, updated_at
		 FROM sso_configs WHERE org_id = $1`, orgID,
	).Scan(&c.ID, &c.OrgID, &c.ProviderType, &c.MetadataURL, &c.EntityID, &c.ACSURL, &c.ClientID, &c.IssuerURL, &c.Enabled, &c.Enforce, &c.DefaultRole, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "sso_config")
	}
	return &c, nil
}

func (s *Store) GetSSOConfigFull(ctx context.Context, orgID string) (*domain.SSOConfig, error) {
	var c domain.SSOConfig
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, provider_type, metadata_url, metadata_xml, entity_id, acs_url, certificate, client_id, client_secret, issuer_url, enabled, enforce, default_role, created_at, updated_at
		 FROM sso_configs WHERE org_id = $1`, orgID,
	).Scan(&c.ID, &c.OrgID, &c.ProviderType, &c.MetadataURL, &c.MetadataXML, &c.EntityID, &c.ACSURL, &c.Certificate, &c.ClientID, &c.ClientSecret, &c.IssuerURL, &c.Enabled, &c.Enforce, &c.DefaultRole, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "sso_config")
	}
	return &c, nil
}

func (s *Store) GetSSOConfigByOrgSlug(ctx context.Context, slug string) (*domain.SSOConfig, error) {
	var c domain.SSOConfig
	err := s.pool.QueryRow(ctx,
		`SELECT sc.id, sc.org_id, sc.provider_type, sc.metadata_url, sc.metadata_xml, sc.entity_id, sc.acs_url, sc.certificate, sc.client_id, sc.client_secret, sc.issuer_url, sc.enabled, sc.enforce, sc.default_role, sc.created_at, sc.updated_at
		 FROM sso_configs sc JOIN organizations o ON sc.org_id = o.id WHERE o.slug = $1`, slug,
	).Scan(&c.ID, &c.OrgID, &c.ProviderType, &c.MetadataURL, &c.MetadataXML, &c.EntityID, &c.ACSURL, &c.Certificate, &c.ClientID, &c.ClientSecret, &c.IssuerURL, &c.Enabled, &c.Enforce, &c.DefaultRole, &c.CreatedAt, &c.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "sso_config")
	}
	return &c, nil
}

func (s *Store) DeleteSSOConfig(ctx context.Context, orgID string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM sso_configs WHERE org_id = $1`, orgID)
	return err
}

// --- Token Revocation ---

func (s *Store) RevokeToken(ctx context.Context, jti, userID, orgID string, expiresAt time.Time) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO token_revocations (token_jti, user_id, org_id, expires_at)
		 VALUES ($1, $2, $3, $4) ON CONFLICT DO NOTHING`,
		jti, userID, orgID, expiresAt)
	return err
}

func (s *Store) IsTokenRevoked(ctx context.Context, jti string) (bool, error) {
	var exists bool
	err := s.pool.QueryRow(ctx,
		`SELECT EXISTS(SELECT 1 FROM token_revocations WHERE token_jti = $1)`, jti).Scan(&exists)
	return exists, err
}

func (s *Store) CleanExpiredRevocations(ctx context.Context) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM token_revocations WHERE expires_at < NOW()`)
	return err
}

// --- MFA ---

func (s *Store) UpsertMFASecret(ctx context.Context, userID, secret string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO mfa_secrets (user_id, secret) VALUES ($1, $2)
		 ON CONFLICT (user_id) DO UPDATE SET secret = $2, enabled = false, verified_at = NULL, updated_at = NOW()`,
		userID, secret)
	return err
}

func (s *Store) GetMFASecret(ctx context.Context, userID string) (*domain.MFASecret, error) {
	var m domain.MFASecret
	err := s.pool.QueryRow(ctx,
		`SELECT id, user_id, secret, enabled, verified_at, created_at, updated_at
		 FROM mfa_secrets WHERE user_id = $1`, userID,
	).Scan(&m.ID, &m.UserID, &m.Secret, &m.Enabled, &m.VerifiedAt, &m.CreatedAt, &m.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "mfa_secret")
	}
	return &m, nil
}

func (s *Store) EnableMFA(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE mfa_secrets SET enabled = true, verified_at = NOW(), updated_at = NOW() WHERE user_id = $1`, userID)
	return err
}

func (s *Store) DisableMFA(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM mfa_secrets WHERE user_id = $1`, userID)
	return err
}

// --- Login Attempts ---

func (s *Store) RecordLoginAttempt(ctx context.Context, email, ip, ua string, success bool) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO login_attempts (email, ip_address, user_agent, success) VALUES ($1, $2, $3, $4)`,
		email, ip, ua, success)
	return err
}

func (s *Store) CountRecentFailedAttempts(ctx context.Context, email string, since time.Time) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM login_attempts WHERE email = $1 AND success = false AND created_at > $2`,
		email, since).Scan(&count)
	return count, err
}

// --- IP Allowlist ---

func (s *Store) GetIPAllowlist(ctx context.Context, orgID string) (bool, []string, error) {
	var enabled bool
	var cidrs []string
	err := s.pool.QueryRow(ctx,
		`SELECT enabled, cidr_ranges FROM ip_allowlists WHERE org_id = $1`, orgID,
	).Scan(&enabled, &cidrs)
	if err != nil {
		return false, nil, err
	}
	return enabled, cidrs, nil
}

func (s *Store) UpsertIPAllowlist(ctx context.Context, orgID string, enabled bool, cidrs []string) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO ip_allowlists (org_id, enabled, cidr_ranges) VALUES ($1, $2, $3)
		 ON CONFLICT (org_id) DO UPDATE SET enabled = $2, cidr_ranges = $3, updated_at = NOW()`,
		orgID, enabled, cidrs)
	return err
}

// --- Custom Roles ---

func (s *Store) CreateCustomRole(ctx context.Context, role *domain.CustomRole) error {
	permsJSON, err := json.Marshal(role.Permissions)
	if err != nil {
		return fmt.Errorf("marshal permissions: %w", err)
	}
	err = s.pool.QueryRow(ctx,
		`INSERT INTO custom_roles (org_id, name, description, base_role, permissions)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at, updated_at`,
		role.OrgID, role.Name, role.Description, role.BaseRole, permsJSON,
	).Scan(&role.ID, &role.CreatedAt, &role.UpdatedAt)
	return wrapConflict(err, "custom role")
}

func (s *Store) GetCustomRole(ctx context.Context, id string) (*domain.CustomRole, error) {
	role := &domain.CustomRole{}
	var permsJSON []byte
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, name, description, base_role, permissions, created_at, updated_at
		 FROM custom_roles WHERE id = $1`, id,
	).Scan(&role.ID, &role.OrgID, &role.Name, &role.Description, &role.BaseRole, &permsJSON, &role.CreatedAt, &role.UpdatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "custom role")
	}
	if err := json.Unmarshal(permsJSON, &role.Permissions); err != nil {
		return nil, fmt.Errorf("unmarshal permissions: %w", err)
	}
	return role, nil
}

func (s *Store) ListCustomRoles(ctx context.Context, orgID string) ([]domain.CustomRole, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, name, description, base_role, permissions, created_at, updated_at
		 FROM custom_roles WHERE org_id = $1 ORDER BY created_at`, orgID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	roles := []domain.CustomRole{}
	for rows.Next() {
		var role domain.CustomRole
		var permsJSON []byte
		if err := rows.Scan(&role.ID, &role.OrgID, &role.Name, &role.Description, &role.BaseRole, &permsJSON, &role.CreatedAt, &role.UpdatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(permsJSON, &role.Permissions); err != nil {
			return nil, fmt.Errorf("unmarshal permissions: %w", err)
		}
		roles = append(roles, role)
	}
	return roles, nil
}

func (s *Store) UpdateCustomRole(ctx context.Context, role *domain.CustomRole) error {
	permsJSON, err := json.Marshal(role.Permissions)
	if err != nil {
		return fmt.Errorf("marshal permissions: %w", err)
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE custom_roles SET name = $1, description = $2, base_role = $3, permissions = $4, updated_at = NOW()
		 WHERE id = $5`,
		role.Name, role.Description, role.BaseRole, permsJSON, role.ID)
	return err
}

func (s *Store) DeleteCustomRole(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM custom_roles WHERE id = $1`, id)
	return err
}

// --- Advisory Locks ---

func (s *Store) TryAdvisoryLock(ctx context.Context, lockID int64) (bool, error) {
	conn, err := s.pool.Acquire(ctx)
	if err != nil {
		return false, fmt.Errorf("acquire conn for advisory lock: %w", err)
	}

	var acquired bool
	err = conn.QueryRow(ctx, `SELECT pg_try_advisory_lock($1)`, lockID).Scan(&acquired)
	if err != nil {
		conn.Release()
		return false, fmt.Errorf("try advisory lock: %w", err)
	}

	if !acquired {
		conn.Release()
		return false, nil
	}

	s.lockMu.Lock()
	s.lockConn = conn
	s.lockMu.Unlock()

	return true, nil
}

func (s *Store) ReleaseAdvisoryLock(ctx context.Context, lockID int64) error {
	s.lockMu.Lock()
	conn := s.lockConn
	s.lockConn = nil
	s.lockMu.Unlock()

	if conn == nil {
		return nil
	}
	defer conn.Release()

	_, err := conn.Exec(ctx, `SELECT pg_advisory_unlock($1)`, lockID)
	return err
}

// --- Pagination Counts ---

func (s *Store) CountAuditEntries(ctx context.Context, orgID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM audit_logs WHERE org_id = $1`, orgID).Scan(&count)
	return count, err
}

func (s *Store) CountApprovalRequests(ctx context.Context, orgID string, status string) (int, error) {
	var count int
	if status != "" {
		err := s.pool.QueryRow(ctx,
			`SELECT COUNT(*) FROM approval_requests WHERE org_id = $1 AND status = $2`,
			orgID, status).Scan(&count)
		return count, err
	}
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM approval_requests WHERE org_id = $1`,
		orgID).Scan(&count)
	return count, err
}

func (s *Store) SoftDeleteUser(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx, `UPDATE users SET email = CONCAT('deleted-', id, '@deleted.local'), name = 'Deleted User', password_hash = '', updated_at = NOW() WHERE id = $1`, userID)
	return err
}

// --- Product Events ---

func (s *Store) InsertProductEvent(ctx context.Context, event *domain.ProductEvent) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO product_events (event, category, user_id, org_id, properties, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		event.Event, event.Category, nilIfEmpty(event.UserID), nilIfEmpty(event.OrgID),
		event.Properties, event.CreatedAt,
	)
	return err
}

func (s *Store) InsertProductEvents(ctx context.Context, events []domain.ProductEvent) error {
	if len(events) == 0 {
		return nil
	}
	batch := &pgx.Batch{}
	for i := range events {
		batch.Queue(
			`INSERT INTO product_events (event, category, user_id, org_id, properties, created_at)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			events[i].Event, events[i].Category,
			nilIfEmpty(events[i].UserID), nilIfEmpty(events[i].OrgID),
			events[i].Properties, events[i].CreatedAt,
		)
	}
	br := s.pool.SendBatch(ctx, batch)
	defer br.Close()
	for range events {
		if _, err := br.Exec(); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) CountEventsByOrg(ctx context.Context, orgID, event string, since time.Time) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM product_events WHERE org_id = $1 AND event = $2 AND created_at >= $3`,
		orgID, event, since,
	).Scan(&count)
	return count, err
}

func (s *Store) CountEventsByUser(ctx context.Context, userID, event string, since time.Time) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM product_events WHERE user_id = $1 AND event = $2 AND created_at >= $3`,
		userID, event, since,
	).Scan(&count)
	return count, err
}

func (s *Store) CountEventsByCategory(ctx context.Context, category string, since time.Time) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(*) FROM product_events WHERE category = $1 AND created_at >= $2`,
		category, since,
	).Scan(&count)
	return count, err
}

func (s *Store) CountDistinctOrgs(ctx context.Context, event string, since time.Time) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(DISTINCT org_id) FROM product_events WHERE event = $1 AND created_at >= $2 AND org_id IS NOT NULL`,
		event, since,
	).Scan(&count)
	return count, err
}

func (s *Store) CountDistinctUsers(ctx context.Context, since time.Time) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx,
		`SELECT COUNT(DISTINCT user_id) FROM product_events WHERE created_at >= $1 AND user_id IS NOT NULL`,
		since,
	).Scan(&count)
	return count, err
}

func (s *Store) EventFunnel(ctx context.Context, events []string, since time.Time) (map[string]int, error) {
	result := make(map[string]int, len(events))
	for _, evt := range events {
		var count int
		err := s.pool.QueryRow(ctx,
			`SELECT COUNT(DISTINCT COALESCE(user_id, org_id)) FROM product_events WHERE event = $1 AND created_at >= $2`,
			evt, since,
		).Scan(&count)
		if err != nil {
			return nil, err
		}
		result[evt] = count
	}
	return result, nil
}

func (s *Store) PlanDistribution(ctx context.Context) (map[string]int, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT COALESCE(plan, 'free'), COUNT(*) FROM organizations WHERE deleted_at IS NULL GROUP BY plan`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	result := make(map[string]int)
	for rows.Next() {
		var plan string
		var count int
		if err := rows.Scan(&plan, &count); err != nil {
			return nil, err
		}
		result[plan] = count
	}
	return result, rows.Err()
}

func nilIfEmpty(s string) interface{} {
	if s == "" {
		return nil
	}
	return s
}

// --- User Preferences ---

func (s *Store) UpdateUserEmailPreferences(ctx context.Context, userID string, consent bool, preference string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET email_consent = $2, email_preference = $3, email_consent_at = NOW(), updated_at = NOW() WHERE id = $1`,
		userID, consent, preference,
	)
	return err
}

func (s *Store) GetUserEmailPreferences(ctx context.Context, userID string) (consent bool, preference string, err error) {
	err = s.pool.QueryRow(ctx,
		`SELECT email_consent, email_preference FROM users WHERE id = $1`, userID,
	).Scan(&consent, &preference)
	err = wrapNotFound(err, "user")
	return
}

func (s *Store) DismissHint(ctx context.Context, userID, hintID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET dismissed_hints = array_append(dismissed_hints, $2), updated_at = NOW()
		 WHERE id = $1 AND NOT ($2 = ANY(dismissed_hints))`,
		userID, hintID,
	)
	return err
}

func (s *Store) GetDismissedHints(ctx context.Context, userID string) ([]string, error) {
	var hints []string
	err := s.pool.QueryRow(ctx,
		`SELECT COALESCE(dismissed_hints, '{}') FROM users WHERE id = $1`, userID,
	).Scan(&hints)
	if err != nil {
		return nil, wrapNotFound(err, "user")
	}
	return hints, nil
}

func (s *Store) SetTourCompleted(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET tour_completed = TRUE, tour_completed_at = NOW(), updated_at = NOW() WHERE id = $1`,
		userID,
	)
	return err
}

// --- Lifecycle Scheduler Queries ---

func (s *Store) ListTrialOrgsExpiringSoon(ctx context.Context, withinDays int) ([]lifecycle.OrgUserPair, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT o.id, o.name, u.id, u.email, u.name, o.plan, o.trial_expires_at
		 FROM organizations o
		 JOIN org_members om ON om.org_id = o.id
		 JOIN users u ON u.id = om.user_id
		 WHERE o.plan = 'trial'
		   AND o.trial_expires_at IS NOT NULL
		   AND o.trial_expires_at BETWEEN NOW() AND NOW() + make_interval(days => $1)
		   AND o.deleted_at IS NULL
		   AND om.role = 'owner'`, withinDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []lifecycle.OrgUserPair
	for rows.Next() {
		var p lifecycle.OrgUserPair
		if err := rows.Scan(&p.OrgID, &p.OrgName, &p.UserID, &p.UserEmail, &p.UserName, &p.Plan, &p.ExpiresAt); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

func (s *Store) ListExpiredTrialOrgs(ctx context.Context) ([]lifecycle.OrgUserPair, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT o.id, o.name, u.id, u.email, u.name, o.plan, o.trial_expires_at
		 FROM organizations o
		 JOIN org_members om ON om.org_id = o.id
		 JOIN users u ON u.id = om.user_id
		 WHERE o.plan = 'trial'
		   AND o.trial_expires_at IS NOT NULL
		   AND o.trial_expires_at < NOW()
		   AND o.trial_expires_at > NOW() - INTERVAL '1 day'
		   AND o.deleted_at IS NULL
		   AND om.role = 'owner'`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []lifecycle.OrgUserPair
	for rows.Next() {
		var p lifecycle.OrgUserPair
		if err := rows.Scan(&p.OrgID, &p.OrgName, &p.UserID, &p.UserEmail, &p.UserName, &p.Plan, &p.ExpiresAt); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

func (s *Store) ListInactiveUsers(ctx context.Context, since time.Time) ([]lifecycle.UserRow, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, email, name, last_login_at, created_at
		 FROM users
		 WHERE (last_login_at IS NULL OR last_login_at < $1)
		   AND deleted_at IS NULL
		 LIMIT 500`, since)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []lifecycle.UserRow
	for rows.Next() {
		var u lifecycle.UserRow
		if err := rows.Scan(&u.UserID, &u.Email, &u.Name, &u.LastLoginAt, &u.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, u)
	}
	return result, rows.Err()
}

func (s *Store) ListRenewalOrgs(ctx context.Context, withinDays int) ([]lifecycle.OrgUserPair, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT o.id, o.name, u.id, u.email, u.name, o.plan, s.current_period_end
		 FROM organizations o
		 JOIN org_members om ON om.org_id = o.id
		 JOIN users u ON u.id = om.user_id
		 LEFT JOIN subscriptions s ON s.org_id = o.id
		 WHERE o.plan = 'pro'
		   AND s.current_period_end IS NOT NULL
		   AND s.current_period_end BETWEEN NOW() AND NOW() + make_interval(days => $1)
		   AND s.status = 'active'
		   AND o.deleted_at IS NULL
		   AND om.role = 'owner'`, withinDays)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []lifecycle.OrgUserPair
	for rows.Next() {
		var p lifecycle.OrgUserPair
		if err := rows.Scan(&p.OrgID, &p.OrgName, &p.UserID, &p.UserEmail, &p.UserName, &p.Plan, &p.ExpiresAt); err != nil {
			return nil, err
		}
		result = append(result, p)
	}
	return result, rows.Err()
}

func (s *Store) ListActiveDigestUsers(ctx context.Context) ([]lifecycle.DigestRow, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT u.id, u.email, u.name, o.id, o.name,
		        COALESCE((SELECT COUNT(DISTINCT p.id) FROM projects p WHERE p.org_id = o.id), 0),
		        COALESCE((SELECT COUNT(*) FROM environments e JOIN projects p ON p.id = e.project_id WHERE p.org_id = o.id), 0),
		        COALESCE((SELECT COUNT(*) FROM flags f JOIN projects p ON p.id = f.project_id WHERE p.org_id = o.id), 0),
		        COALESCE((SELECT COUNT(DISTINCT f.id) FROM flags f JOIN flag_states fs ON fs.flag_id = f.id JOIN projects p ON p.id = f.project_id WHERE p.org_id = o.id AND fs.enabled = true), 0),
		        0,
		        COALESCE((SELECT f.key FROM flags f JOIN flag_states fs ON fs.flag_id = f.id JOIN projects p ON p.id = f.project_id WHERE p.org_id = o.id AND fs.updated_at > NOW() - INTERVAL '7 days' ORDER BY fs.updated_at DESC LIMIT 1), '')
		 FROM users u
		 JOIN org_members om ON om.user_id = u.id
		 JOIN organizations o ON o.id = om.org_id
		 WHERE u.email_consent = TRUE
		   AND COALESCE(u.email_preference, 'all') = 'all'
		   AND u.last_login_at > NOW() - INTERVAL '30 days'
		   AND (u.last_digest_sent_at IS NULL OR u.last_digest_sent_at < NOW() - INTERVAL '7 days')
		   AND u.deleted_at IS NULL
		   AND o.deleted_at IS NULL
		 LIMIT 1000`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []lifecycle.DigestRow
	for rows.Next() {
		var d lifecycle.DigestRow
		if err := rows.Scan(&d.UserID, &d.Email, &d.Name, &d.OrgID, &d.OrgName, &d.ProjectCount, &d.EnvCount, &d.FlagCount, &d.ActiveFlagCount, &d.EvalCount, &d.TopFlagKey); err != nil {
			return nil, err
		}
		result = append(result, d)
	}
	return result, rows.Err()
}

func (s *Store) MarkDigestSent(ctx context.Context, userID string) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE users SET last_digest_sent_at = NOW() WHERE id = $1`, userID)
	return err
}

// --- Feature Spotlight (re-onboarding) ---

func (s *Store) ListUsersWithoutFeatureUsage(ctx context.Context, feature string, daysSinceSignup int) ([]lifecycle.UserRow, error) {
	var eventPattern string
	switch feature {
	case "segments":
		eventPattern = "segment.%"
	case "webhooks":
		eventPattern = "webhook.%"
	case "team_invite":
		eventPattern = "team.member_invited"
	default:
		return nil, nil
	}

	rows, err := s.pool.Query(ctx,
		`SELECT u.id, u.email, u.name, u.last_login_at, u.created_at
		 FROM users u
		 WHERE u.email_consent = TRUE
		   AND COALESCE(u.email_preference, 'all') IN ('all', 'important')
		   AND u.created_at < NOW() - make_interval(days => $1)
		   AND u.created_at > NOW() - INTERVAL '90 days'
		   AND u.deleted_at IS NULL
		   AND NOT EXISTS (
		       SELECT 1 FROM product_events pe
		       WHERE pe.user_id = u.id::TEXT AND pe.event LIKE $2
		   )
		 LIMIT 200`, daysSinceSignup, eventPattern)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	var result []lifecycle.UserRow
	for rows.Next() {
		var u lifecycle.UserRow
		if err := rows.Scan(&u.UserID, &u.Email, &u.Name, &u.LastLoginAt, &u.CreatedAt); err != nil {
			return nil, err
		}
		result = append(result, u)
	}
	return result, rows.Err()
}

// --- Feedback ---

func (s *Store) InsertFeedback(ctx context.Context, fb *domain.Feedback) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO feedback (user_id, org_id, type, sentiment, message, page, created_at)
		 VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
		fb.UserID, fb.OrgID, fb.Type, fb.Sentiment, fb.Message, fb.Page,
	)
	return err
}

// --- Status Checks ---

func (s *Store) InsertStatusChecks(ctx context.Context, checks []domain.StatusCheck) error {
	if len(checks) == 0 {
		return nil
	}
	batch := &pgx.Batch{}
	for i := range checks {
		batch.Queue(
			`INSERT INTO status_checks (region, component, status, latency_ms, message, checked_at)
			 VALUES ($1, $2, $3, $4, $5, $6)`,
			checks[i].Region, checks[i].Component, checks[i].Status,
			checks[i].LatencyMs, checks[i].Message, checks[i].CheckedAt,
		)
	}
	br := s.pool.SendBatch(ctx, batch)
	defer br.Close()
	for range checks {
		if _, err := br.Exec(); err != nil {
			return err
		}
	}
	return nil
}

func (s *Store) GetComponentHistory(ctx context.Context, days int) ([]domain.DailyComponentStatus, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT
			TO_CHAR(DATE(checked_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS day,
			region,
			component,
			COUNT(*) AS total_checks,
			COUNT(*) FILTER (WHERE status = 'operational') AS operational_checks
		 FROM status_checks
		 WHERE checked_at >= NOW() - make_interval(days => $1)
		   AND status != 'unreachable'
		 GROUP BY day, region, component
		 ORDER BY day, region, component`, days)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var result []domain.DailyComponentStatus
	for rows.Next() {
		var d domain.DailyComponentStatus
		if err := rows.Scan(&d.Date, &d.Region, &d.Component, &d.TotalChecks, &d.OperationalChecks); err != nil {
			return nil, err
		}
		if d.TotalChecks > 0 {
			d.UptimePct = float64(d.OperationalChecks) / float64(d.TotalChecks) * 100
		}
		result = append(result, d)
	}
	return result, rows.Err()
}

// CreateMagicLinkToken creates a one-time login token.
func (s *Store) CreateMagicLinkToken(ctx context.Context, userID, orgID, token string, expires time.Time) error {
	// Invalidate any existing unused tokens for this user
	_, err := s.pool.Exec(ctx,
		`UPDATE magic_link_tokens SET used_at = now() WHERE user_id = $1 AND used_at IS NULL`,
		userID)
	if err != nil {
		return err
	}
	_, err = s.pool.Exec(ctx,
		`INSERT INTO magic_link_tokens (user_id, org_id, token, expires_at) VALUES ($1, $2, $3, $4)`,
		userID, orgID, token, expires)
	return wrapConflict(err, "magic link token")
}

// ConsumeMagicLinkToken validates and consumes a magic link token,
// returning the associated user and org IDs.
func (s *Store) ConsumeMagicLinkToken(ctx context.Context, token string) (string, string, error) {
	var userID, orgID string
	var expiresAt time.Time
	var usedAt *time.Time
	err := s.pool.QueryRow(ctx,
		`SELECT user_id, org_id, expires_at, used_at FROM magic_link_tokens WHERE token = $1`,
		token).Scan(&userID, &orgID, &expiresAt, &usedAt)
	if err != nil {
		return "", "", wrapNotFound(err, "magic link token")
	}
	if usedAt != nil {
		return "", "", domain.WrapExpired("magic link token already used")
	}
	if time.Now().After(expiresAt) {
		return "", "", domain.WrapExpired("magic link token expired")
	}
	_, err = s.pool.Exec(ctx,
		`UPDATE magic_link_tokens SET used_at = now() WHERE token = $1`,
		token)
	if err != nil {
		return "", "", err
	}
	return userID, orgID, nil
}

// ─── SessionStore implementation ─────────────────────────────────────────────

// CreateSession inserts a new public session.
func (s *Store) CreateSession(ctx context.Context, sess *domain.PublicSession) error {
	_, err := s.pool.Exec(ctx,
		`INSERT INTO public_sessions (id, session_token, provider, data, email, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6)`,
		sess.ID, sess.SessionToken, sess.Provider, sess.Data, nilIfEmpty(sess.Email), sess.ExpiresAt)
	return wrapConflict(err, "public session")
}

// GetSession retrieves a public session by its session token. Returns
// domain.ErrNotFound if the token does not exist or has expired.
func (s *Store) GetSession(ctx context.Context, token string) (*domain.PublicSession, error) {
	var sess domain.PublicSession
	var email *string
	err := s.pool.QueryRow(ctx,
		`SELECT id, session_token, provider, data, email, created_at, expires_at
		 FROM public_sessions WHERE session_token = $1`, token).
		Scan(&sess.ID, &sess.SessionToken, &sess.Provider, &sess.Data, &email, &sess.CreatedAt, &sess.ExpiresAt)
	if err != nil {
		return nil, wrapNotFound(err, "public session")
	}
	if time.Now().After(sess.ExpiresAt) {
		return nil, domain.WrapExpired("public session")
	}
	if email != nil {
		sess.Email = *email
	}
	return &sess, nil
}

// DeleteSession removes a public session by its session token.
func (s *Store) DeleteSession(ctx context.Context, token string) error {
	_, err := s.pool.Exec(ctx,
		`DELETE FROM public_sessions WHERE session_token = $1`, token)
	return err
}

// CleanExpiredSessions removes all expired public sessions and returns the count.
func (s *Store) CleanExpiredSessions(ctx context.Context) (int, error) {
	tag, err := s.pool.Exec(ctx,
		`DELETE FROM public_sessions WHERE expires_at < now()`)
	if err != nil {
		return 0, err
	}
	return int(tag.RowsAffected()), nil
}
