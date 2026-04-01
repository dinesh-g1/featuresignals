package postgres

import (
	"context"
	"encoding/json"
	"fmt"
	"time"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/server/internal/domain"
)

type Store struct {
	pool *pgxpool.Pool
}

func NewStore(pool *pgxpool.Pool) *Store {
	return &Store{pool: pool}
}

// --- Organizations ---

func (s *Store) CreateOrganization(ctx context.Context, org *domain.Organization) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO organizations (name, slug) VALUES ($1, $2) RETURNING id, created_at, updated_at`,
		org.Name, org.Slug,
	).Scan(&org.ID, &org.CreatedAt, &org.UpdatedAt)
}

func (s *Store) GetOrganization(ctx context.Context, id string) (*domain.Organization, error) {
	org := &domain.Organization{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, name, slug, created_at, updated_at FROM organizations WHERE id = $1`, id,
	).Scan(&org.ID, &org.Name, &org.Slug, &org.CreatedAt, &org.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return org, nil
}

// --- Users ---

func (s *Store) CreateUser(ctx context.Context, user *domain.User) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING id, created_at, updated_at`,
		user.Email, user.PasswordHash, user.Name,
	).Scan(&user.ID, &user.CreatedAt, &user.UpdatedAt)
}

func (s *Store) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	user := &domain.User{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name, created_at, updated_at FROM users WHERE email = $1`, email,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
}

func (s *Store) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	user := &domain.User{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, email, password_hash, name, created_at, updated_at FROM users WHERE id = $1`, id,
	).Scan(&user.ID, &user.Email, &user.PasswordHash, &user.Name, &user.CreatedAt, &user.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return user, nil
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
	err := s.pool.QueryRow(ctx,
		`SELECT id, org_id, user_id, role, created_at FROM org_members WHERE org_id = $1 AND user_id = $2`,
		orgID, userID,
	).Scan(&m.ID, &m.OrgID, &m.UserID, &m.Role, &m.CreatedAt)
	if err != nil {
		return nil, err
	}
	return m, nil
}

func (s *Store) ListOrgMembers(ctx context.Context, orgID string) ([]domain.OrgMember, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, user_id, role, created_at FROM org_members WHERE org_id = $1`, orgID)
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
		return nil, err
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
		return nil, err
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
		return nil, err
	}
	return e, nil
}

func (s *Store) DeleteEnvironment(ctx context.Context, id string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM environments WHERE id = $1`, id)
	return err
}

// --- Flags ---

func (s *Store) CreateFlag(ctx context.Context, f *domain.Flag) error {
	return s.pool.QueryRow(ctx,
		`INSERT INTO flags (project_id, key, name, description, flag_type, default_value, tags, expires_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING id, created_at, updated_at`,
		f.ProjectID, f.Key, f.Name, f.Description, f.FlagType, f.DefaultValue, f.Tags, f.ExpiresAt,
	).Scan(&f.ID, &f.CreatedAt, &f.UpdatedAt)
}

func (s *Store) GetFlag(ctx context.Context, projectID, key string) (*domain.Flag, error) {
	f := &domain.Flag{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, project_id, key, name, description, flag_type, default_value, tags, expires_at, created_at, updated_at
		 FROM flags WHERE project_id = $1 AND key = $2`, projectID, key,
	).Scan(&f.ID, &f.ProjectID, &f.Key, &f.Name, &f.Description, &f.FlagType, &f.DefaultValue, &f.Tags, &f.ExpiresAt, &f.CreatedAt, &f.UpdatedAt)
	if err != nil {
		return nil, err
	}
	return f, nil
}

func (s *Store) ListFlags(ctx context.Context, projectID string) ([]domain.Flag, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, project_id, key, name, description, flag_type, default_value, tags, expires_at, created_at, updated_at
		 FROM flags WHERE project_id = $1 ORDER BY created_at`, projectID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	flags := []domain.Flag{}
	for rows.Next() {
		var f domain.Flag
		if err := rows.Scan(&f.ID, &f.ProjectID, &f.Key, &f.Name, &f.Description, &f.FlagType, &f.DefaultValue, &f.Tags, &f.ExpiresAt, &f.CreatedAt, &f.UpdatedAt); err != nil {
			return nil, err
		}
		flags = append(flags, f)
	}
	return flags, nil
}

func (s *Store) UpdateFlag(ctx context.Context, f *domain.Flag) error {
	_, err := s.pool.Exec(ctx,
		`UPDATE flags SET name=$1, description=$2, default_value=$3, tags=$4, expires_at=$5, updated_at=NOW()
		 WHERE id = $6`,
		f.Name, f.Description, f.DefaultValue, f.Tags, f.ExpiresAt, f.ID)
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
	return s.pool.QueryRow(ctx,
		`INSERT INTO flag_states (flag_id, env_id, enabled, default_value, rules, percentage_rollout, scheduled_enable_at, scheduled_disable_at)
		 VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
		 ON CONFLICT (flag_id, env_id) DO UPDATE SET enabled=$3, default_value=$4, rules=$5, percentage_rollout=$6,
		   scheduled_enable_at=$7, scheduled_disable_at=$8, updated_at=NOW()
		 RETURNING id, updated_at`,
		fs.FlagID, fs.EnvID, fs.Enabled, fs.DefaultValue, rulesJSON, fs.PercentageRollout,
		fs.ScheduledEnableAt, fs.ScheduledDisableAt,
	).Scan(&fs.ID, &fs.UpdatedAt)
}

func (s *Store) GetFlagState(ctx context.Context, flagID, envID string) (*domain.FlagState, error) {
	fs := &domain.FlagState{}
	var rulesJSON []byte
	err := s.pool.QueryRow(ctx,
		`SELECT id, flag_id, env_id, enabled, default_value, rules, percentage_rollout,
		        scheduled_enable_at, scheduled_disable_at, updated_at
		 FROM flag_states WHERE flag_id = $1 AND env_id = $2`, flagID, envID,
	).Scan(&fs.ID, &fs.FlagID, &fs.EnvID, &fs.Enabled, &fs.DefaultValue, &rulesJSON,
		&fs.PercentageRollout, &fs.ScheduledEnableAt, &fs.ScheduledDisableAt, &fs.UpdatedAt)
	if err != nil {
		return nil, err
	}
	if err := json.Unmarshal(rulesJSON, &fs.Rules); err != nil {
		return nil, fmt.Errorf("unmarshal rules: %w", err)
	}
	return fs, nil
}

func (s *Store) ListPendingSchedules(ctx context.Context, before time.Time) ([]domain.FlagState, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, flag_id, env_id, enabled, default_value, rules, percentage_rollout,
		        scheduled_enable_at, scheduled_disable_at, updated_at
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
		var rulesJSON []byte
		if err := rows.Scan(&fs.ID, &fs.FlagID, &fs.EnvID, &fs.Enabled, &fs.DefaultValue,
			&rulesJSON, &fs.PercentageRollout, &fs.ScheduledEnableAt, &fs.ScheduledDisableAt, &fs.UpdatedAt); err != nil {
			return nil, err
		}
		if err := json.Unmarshal(rulesJSON, &fs.Rules); err != nil {
			return nil, fmt.Errorf("unmarshal rules: %w", err)
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
	return s.pool.QueryRow(ctx,
		`INSERT INTO segments (project_id, key, name, description, match_type, rules)
		 VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, created_at, updated_at`,
		seg.ProjectID, seg.Key, seg.Name, seg.Description, seg.MatchType, rulesJSON,
	).Scan(&seg.ID, &seg.CreatedAt, &seg.UpdatedAt)
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
		return nil, err
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
	return s.pool.QueryRow(ctx,
		`INSERT INTO api_keys (env_id, key_hash, key_prefix, name, type)
		 VALUES ($1, $2, $3, $4, $5) RETURNING id, created_at`,
		k.EnvID, k.KeyHash, k.KeyPrefix, k.Name, k.Type,
	).Scan(&k.ID, &k.CreatedAt)
}

func (s *Store) GetAPIKeyByHash(ctx context.Context, keyHash string) (*domain.APIKey, error) {
	k := &domain.APIKey{}
	err := s.pool.QueryRow(ctx,
		`SELECT id, env_id, key_hash, key_prefix, name, type, created_at, last_used_at, revoked_at
		 FROM api_keys WHERE key_hash = $1 AND revoked_at IS NULL`, keyHash,
	).Scan(&k.ID, &k.EnvID, &k.KeyHash, &k.KeyPrefix, &k.Name, &k.Type, &k.CreatedAt, &k.LastUsedAt, &k.RevokedAt)
	if err != nil {
		return nil, err
	}
	return k, nil
}

func (s *Store) ListAPIKeys(ctx context.Context, envID string) ([]domain.APIKey, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, env_id, key_hash, key_prefix, name, type, created_at, last_used_at, revoked_at
		 FROM api_keys WHERE env_id = $1 ORDER BY created_at`, envID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	keys := []domain.APIKey{}
	for rows.Next() {
		var k domain.APIKey
		if err := rows.Scan(&k.ID, &k.EnvID, &k.KeyHash, &k.KeyPrefix, &k.Name, &k.Type, &k.CreatedAt, &k.LastUsedAt, &k.RevokedAt); err != nil {
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
		return nil, err
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
		        fs.percentage_rollout, fs.scheduled_enable_at, fs.scheduled_disable_at, fs.updated_at
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
		var rulesJSON []byte
		if err := rows.Scan(&fs.ID, &fs.FlagID, &fs.EnvID, &fs.Enabled, &fs.DefaultValue,
			&rulesJSON, &fs.PercentageRollout, &fs.ScheduledEnableAt, &fs.ScheduledDisableAt, &fs.UpdatedAt); err != nil {
			return nil, nil, nil, err
		}
		if err := json.Unmarshal(rulesJSON, &fs.Rules); err != nil {
			return nil, nil, nil, fmt.Errorf("unmarshal rules: %w", err)
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
