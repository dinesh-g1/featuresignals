package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"

	"github.com/featuresignals/ops-portal/internal/domain"
)

// ConfigTemplateStore implements domain.ConfigTemplateStore backed by PostgreSQL.
type ConfigTemplateStore struct {
	pool *pgxpool.Pool
}

// NewConfigTemplateStore creates a new ConfigTemplateStore.
func NewConfigTemplateStore(pool *pgxpool.Pool) *ConfigTemplateStore {
	return &ConfigTemplateStore{pool: pool}
}

// Create inserts a new config template.
func (s *ConfigTemplateStore) Create(ctx context.Context, ct *domain.ConfigTemplate) error {
	if ct.ID == "" {
		ct.ID = uuid.New().String()
	}
	now := time.Now().UTC()
	if ct.CreatedAt.IsZero() {
		ct.CreatedAt = now
	}
	if ct.UpdatedAt.IsZero() {
		ct.UpdatedAt = now
	}

	query := `
		INSERT INTO config_templates (id, name, template, scope, scope_key, created_at, updated_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
	`

	_, err := s.pool.Exec(ctx, query,
		ct.ID, ct.Name, ct.Template, ct.Scope, ct.ScopeKey, ct.CreatedAt, ct.UpdatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("config template %w", domain.ErrConflict)
		}
		return fmt.Errorf("create config template: %w", err)
	}
	return nil
}

// GetByID returns a config template by its ID. Returns ErrNotFound if not found.
func (s *ConfigTemplateStore) GetByID(ctx context.Context, id string) (*domain.ConfigTemplate, error) {
	query := `
		SELECT id, name, template, scope, scope_key, created_at, updated_at
		FROM config_templates WHERE id = $1
	`

	ct := &domain.ConfigTemplate{}
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&ct.ID, &ct.Name, &ct.Template, &ct.Scope, &ct.ScopeKey,
		&ct.CreatedAt, &ct.UpdatedAt,
	)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, fmt.Errorf("config template %w", domain.ErrNotFound)
	}
	if err != nil {
		return nil, fmt.Errorf("get config template by id: %w", err)
	}
	return ct, nil
}

// List returns all config templates, ordered by creation date descending.
func (s *ConfigTemplateStore) List(ctx context.Context) ([]domain.ConfigTemplate, error) {
	query := `
		SELECT id, name, template, scope, scope_key, created_at, updated_at
		FROM config_templates ORDER BY created_at DESC
	`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list config templates: %w", err)
	}
	defer rows.Close()

	var templates []domain.ConfigTemplate
	for rows.Next() {
		var ct domain.ConfigTemplate
		if err := rows.Scan(
			&ct.ID, &ct.Name, &ct.Template, &ct.Scope, &ct.ScopeKey,
			&ct.CreatedAt, &ct.UpdatedAt,
		); err != nil {
			return nil, fmt.Errorf("scan config template: %w", err)
		}
		templates = append(templates, ct)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate config templates: %w", err)
	}

	if templates == nil {
		templates = []domain.ConfigTemplate{}
	}
	return templates, nil
}

// Update modifies an existing config template's mutable fields. Returns ErrNotFound if not found.
func (s *ConfigTemplateStore) Update(ctx context.Context, ct *domain.ConfigTemplate) error {
	ct.UpdatedAt = time.Now().UTC()

	query := `
		UPDATE config_templates
		SET name = $1, template = $2, scope = $3, scope_key = $4, updated_at = $5
		WHERE id = $6
	`

	result, err := s.pool.Exec(ctx, query,
		ct.Name, ct.Template, ct.Scope, ct.ScopeKey, ct.UpdatedAt, ct.ID,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return fmt.Errorf("config template %w", domain.ErrConflict)
		}
		return fmt.Errorf("update config template: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("config template %w", domain.ErrNotFound)
	}
	return nil
}

// Delete removes a config template by its ID. Returns ErrNotFound if not found.
func (s *ConfigTemplateStore) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM config_templates WHERE id = $1`

	result, err := s.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete config template: %w", err)
	}
	if result.RowsAffected() == 0 {
		return fmt.Errorf("config template %w", domain.ErrNotFound)
	}
	return nil
}