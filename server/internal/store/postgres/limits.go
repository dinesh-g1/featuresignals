package postgres

import (
	"context"
	"fmt"

	"github.com/featuresignals/server/internal/domain"
	"github.com/jackc/pgx/v5"
)

// ─── Limits ─────────────────────────────────────────────────────────

func (s *Store) GetLimitsConfig(ctx context.Context, plan string) (*domain.LimitsConfigRow, error) {
	row := s.pool.QueryRow(ctx,
		`SELECT plan, max_flags, max_segments, max_environments, max_members,
		        max_webhooks, max_api_keys, max_projects, updated_at
		 FROM limits_config WHERE plan = $1`, plan)
	var cfg domain.LimitsConfigRow
	err := row.Scan(&cfg.Plan, &cfg.MaxFlags, &cfg.MaxSegments, &cfg.MaxEnvs,
		&cfg.MaxMembers, &cfg.MaxWebhooks, &cfg.MaxAPIKeys, &cfg.MaxProjects, &cfg.UpdatedAt)
	if err != nil {
		if err == pgx.ErrNoRows {
			// Fallback to free plan defaults
			return &domain.LimitsConfigRow{
				Plan:        "free",
				MaxFlags:    10,
				MaxSegments: 5,
				MaxEnvs:     3,
				MaxMembers:  3,
				MaxWebhooks: 2,
				MaxAPIKeys:  5,
				MaxProjects: 5,
			}, nil
		}
		return nil, fmt.Errorf("get limits config: %w", err)
	}
	return &cfg, nil
}

func (s *Store) CountFlags(ctx context.Context, orgID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM flags WHERE org_id = $1`, orgID).Scan(&count)
	return count, err
}

func (s *Store) CountSegments(ctx context.Context, orgID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM segments WHERE org_id = $1`, orgID).Scan(&count)
	return count, err
}

func (s *Store) CountEnvironments(ctx context.Context, orgID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM environments WHERE org_id = $1`, orgID).Scan(&count)
	return count, err
}

func (s *Store) CountMembers(ctx context.Context, orgID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM org_members WHERE org_id = $1`, orgID).Scan(&count)
	return count, err
}

func (s *Store) CountWebhooks(ctx context.Context, orgID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM webhooks WHERE org_id = $1`, orgID).Scan(&count)
	return count, err
}

func (s *Store) CountAPIKeys(ctx context.Context, orgID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM api_keys WHERE org_id = $1`, orgID).Scan(&count)
	return count, err
}

func (s *Store) CountProjects(ctx context.Context, orgID string) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM projects WHERE org_id = $1`, orgID).Scan(&count)
	return count, err
}

// ─── Pinned Items ───────────────────────────────────────────────────

func (s *Store) ListPinnedItems(ctx context.Context, orgID, userID, projectID string) ([]domain.PinnedItem, error) {
	rows, err := s.pool.Query(ctx,
		`SELECT id, org_id, project_id, user_id, resource_type, resource_id, created_at
		 FROM pinned_items
		 WHERE org_id = $1 AND user_id = $2 AND project_id = $3
		 ORDER BY created_at DESC`, orgID, userID, projectID)
	if err != nil {
		return nil, fmt.Errorf("list pinned items: %w", err)
	}
	defer rows.Close()

	var items []domain.PinnedItem
	for rows.Next() {
		var p domain.PinnedItem
		if err := rows.Scan(&p.ID, &p.OrgID, &p.ProjectID, &p.UserID, &p.ResourceType, &p.ResourceID, &p.CreatedAt); err != nil {
			return nil, fmt.Errorf("scan pinned item: %w", err)
		}
		items = append(items, p)
	}
	if items == nil {
		items = make([]domain.PinnedItem, 0)
	}
	return items, nil
}

func (s *Store) CreatePinnedItem(ctx context.Context, orgID, userID, projectID, resourceType, resourceID string) (*domain.PinnedItem, error) {
	p := &domain.PinnedItem{}
	err := s.pool.QueryRow(ctx,
		`INSERT INTO pinned_items (org_id, project_id, user_id, resource_type, resource_id)
		 VALUES ($1, $2, $3, $4, $5)
		 ON CONFLICT (org_id, user_id, project_id, resource_type, resource_id) DO UPDATE SET created_at = NOW()
		 RETURNING id, org_id, project_id, user_id, resource_type, resource_id, created_at`,
		orgID, projectID, userID, resourceType, resourceID,
	).Scan(&p.ID, &p.OrgID, &p.ProjectID, &p.UserID, &p.ResourceType, &p.ResourceID, &p.CreatedAt)
	if err != nil {
		return nil, fmt.Errorf("create pinned item: %w", err)
	}
	return p, nil
}

func (s *Store) DeletePinnedItem(ctx context.Context, orgID, userID, pinnedItemID string) error {
	_, err := s.pool.Exec(ctx,
		`DELETE FROM pinned_items WHERE id = $1 AND org_id = $2 AND user_id = $3`,
		pinnedItemID, orgID, userID)
	if err != nil {
		return fmt.Errorf("delete pinned item: %w", err)
	}
	return nil
}

// ─── Search ─────────────────────────────────────────────────────────

func (s *Store) Search(ctx context.Context, orgID, projectID, query string) ([]domain.SearchHit, error) {
	var hits []domain.SearchHit
	like := "%" + query + "%"

	// Search flags
	if projectID != "" {
		flagRows, err := s.pool.Query(ctx,
			`SELECT id, key, name, 'flag' as category
			 FROM flags WHERE org_id = $1 AND project_id = $2
			 AND (key ILIKE $3 OR name ILIKE $3)
			 LIMIT 10`, orgID, projectID, like)
		if err == nil {
			defer flagRows.Close()
			for flagRows.Next() {
				var id, key, name, cat string
				flagRows.Scan(&id, &key, &name, &cat)
				hits = append(hits, domain.SearchHit{
					ID: id, Label: key, Description: name,
					Category: cat, Href: "/flags/" + key,
				})
			}
		}

		// Search segments
		segRows, err := s.pool.Query(ctx,
			`SELECT id, key, name, 'segment' as category
			 FROM segments WHERE org_id = $1 AND project_id = $2
			 AND (key ILIKE $3 OR name ILIKE $3)
			 LIMIT 10`, orgID, projectID, like)
		if err == nil {
			defer segRows.Close()
			for segRows.Next() {
				var id, key, name, cat string
				segRows.Scan(&id, &key, &name, &cat)
				hits = append(hits, domain.SearchHit{
					ID: id, Label: key, Description: name,
					Category: cat, Href: "/segments",
				})
			}
		}
	}

	// Search environments (scoped to project when projectID is set)
	envRows, err := s.pool.Query(ctx,
		`SELECT id, name, slug, 'environment' as category
		 FROM environments WHERE org_id = $1 AND project_id = $2
		 AND (name ILIKE $3 OR slug ILIKE $3)
		 LIMIT 10`, orgID, projectID, like)
	if err == nil {
		defer envRows.Close()
		for envRows.Next() {
			var id, name, slug, cat string
			envRows.Scan(&id, &name, &slug, &cat)
			hits = append(hits, domain.SearchHit{
				ID: id, Label: name, Description: slug,
				Category: cat, Href: "/environments",
			})
		}
	}

	// Search projects (always searchable)
	projRows, err := s.pool.Query(ctx,
		`SELECT id, name, slug, 'project' as category
		 FROM projects WHERE org_id = $1
		 AND (name ILIKE $2 OR slug ILIKE $2)
		 LIMIT 5`, orgID, like)
	if err == nil {
		defer projRows.Close()
		for projRows.Next() {
			var id, name, slug, cat string
			projRows.Scan(&id, &name, &slug, &cat)
			hits = append(hits, domain.SearchHit{
				ID: id, Label: name, Description: slug,
				Category: cat, Href: "/dashboard",
			})
		}
	}

	// Search members (across entire org, joined via org_members)
	memberRows, err := s.pool.Query(ctx,
		`SELECT u.id, u.name, u.email, 'member' as category
		 FROM users u
		 INNER JOIN org_members om ON om.user_id = u.id
		 WHERE om.org_id = $1 AND (u.name ILIKE $2 OR u.email ILIKE $3)
		 LIMIT 10`, orgID, like, like)
	if err == nil {
		defer memberRows.Close()
		for memberRows.Next() {
			var id, name, email, cat string
			memberRows.Scan(&id, &name, &email, &cat)
			hits = append(hits, domain.SearchHit{
				ID: id, Label: name, Description: email,
				Category: cat, Href: "/members",
			})
		}
	}

	if hits == nil {
		hits = make([]domain.SearchHit, 0)
	}
	return hits, nil
}
