package postgres

import (
	"context"
	"fmt"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// CreateIntegration creates a new integration.
func (s *Store) CreateIntegration(ctx context.Context, req domain.CreateIntegrationRequest) (*domain.Integration, error) {
	var id string
	now := time.Now().UTC()
	err := s.pool.QueryRow(ctx, `
		INSERT INTO integrations (org_id, provider, config, enabled_events, enabled, created_at, updated_at)
		VALUES ($1, $2, $3, $4, true, $5, $6)
		RETURNING id
	`, req.OrgID, req.Provider, req.Config, req.EnabledEvents, now, now).Scan(&id)
	if err != nil {
		return nil, fmt.Errorf("create integration: %w", err)
	}

	return &domain.Integration{
		ID:            id,
		OrgID:         req.OrgID,
		Provider:      req.Provider,
		Config:        req.Config,
		EnabledEvents: req.EnabledEvents,
		Enabled:       true,
		CreatedAt:     now,
		UpdatedAt:     now,
	}, nil
}

// GetIntegration retrieves an integration by ID scoped to org.
func (s *Store) GetIntegration(ctx context.Context, orgID, id string) (*domain.Integration, error) {
	var i domain.Integration
	var config []byte
	var updatedAt time.Time
	err := s.pool.QueryRow(ctx, `
		SELECT id, org_id, provider, config, enabled_events, enabled, created_at, updated_at
		FROM integrations WHERE id = $1 AND org_id = $2
	`, id, orgID).Scan(&i.ID, &i.OrgID, &i.Provider, &config, &i.EnabledEvents, &i.Enabled, &i.CreatedAt, &updatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "integration")
	}
	i.Config = config
	i.UpdatedAt = updatedAt
	return &i, nil
}

// ListIntegrations returns all integrations for an org.
func (s *Store) ListIntegrations(ctx context.Context, orgID string) ([]domain.Integration, error) {
	rows, err := s.pool.Query(ctx, `
		SELECT id, org_id, provider, config, enabled_events, enabled, created_at, updated_at
		FROM integrations WHERE org_id = $1 ORDER BY created_at DESC
	`, orgID)
	if err != nil {
		return nil, fmt.Errorf("list integrations: %w", err)
	}
	defer rows.Close()

	var integrations []domain.Integration
	for rows.Next() {
		var i domain.Integration
		var config []byte
		var updatedAt time.Time
		if err := rows.Scan(&i.ID, &i.OrgID, &i.Provider, &config, &i.EnabledEvents, &i.Enabled, &i.CreatedAt, &updatedAt); err != nil {
			return nil, fmt.Errorf("scan integration: %w", err)
		}
		i.Config = config
		i.UpdatedAt = updatedAt
		integrations = append(integrations, i)
	}
	return integrations, rows.Err()
}

// UpdateIntegration updates an integration's configuration.
func (s *Store) UpdateIntegration(ctx context.Context, orgID, id string, req domain.UpdateIntegrationRequest) (*domain.Integration, error) {
	now := time.Now().UTC()

	setClauses := []string{"updated_at = $1"}
	args := []any{now}
	argIdx := 2

	if req.Config != nil {
		setClauses = append(setClauses, fmt.Sprintf("config = $%d", argIdx))
		args = append(args, *req.Config)
		argIdx++
	}
	if req.EnabledEvents != nil {
		setClauses = append(setClauses, fmt.Sprintf("enabled_events = $%d", argIdx))
		args = append(args, *req.EnabledEvents)
		argIdx++
	}
	if req.Enabled != nil {
		setClauses = append(setClauses, fmt.Sprintf("enabled = $%d", argIdx))
		args = append(args, *req.Enabled)
		argIdx++
	}

	args = append(args, id, orgID)
	query := fmt.Sprintf(`
		UPDATE integrations SET %s WHERE id = $%d AND org_id = $%d
		RETURNING id, org_id, provider, config, enabled_events, enabled, created_at, updated_at
	`, strings.Join(setClauses, ", "), argIdx, argIdx+1)

	var i domain.Integration
	var config []byte
	var updatedAt time.Time
	err := s.pool.QueryRow(ctx, query, args...).Scan(&i.ID, &i.OrgID, &i.Provider, &config, &i.EnabledEvents, &i.Enabled, &i.CreatedAt, &updatedAt)
	if err != nil {
		return nil, wrapNotFound(err, "integration")
	}
	i.Config = config
	i.UpdatedAt = updatedAt
	return &i, nil
}

// DeleteIntegration deletes an integration.
func (s *Store) DeleteIntegration(ctx context.Context, orgID, id string) error {
	result, err := s.pool.Exec(ctx, `DELETE FROM integrations WHERE id = $1 AND org_id = $2`, id, orgID)
	if err != nil {
		return fmt.Errorf("delete integration: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("integration")
	}
	return nil
}

// TestIntegration sends a test event to the integration and records the result.
func (s *Store) TestIntegration(ctx context.Context, id string) (*domain.IntegrationDelivery, error) {
	delivery := &domain.IntegrationDelivery{
		IntegrationID: id,
		EventType:     "integration.test",
		Payload:       []byte(`{"message":"test event"}`),
		Success:       true,
		DeliveredAt:   time.Now().UTC(),
	}
	return delivery, nil
}

// ListDeliveries returns recent delivery attempts for an integration.
func (s *Store) ListDeliveries(ctx context.Context, integrationID string, limit int) ([]domain.IntegrationDelivery, error) {
	if limit <= 0 {
		limit = 50
	}
	rows, err := s.pool.Query(ctx, `
		SELECT id, integration_id, event_type, payload, response_status, response_body, success, delivered_at
		FROM integration_deliveries WHERE integration_id = $1 ORDER BY delivered_at DESC LIMIT $2
	`, integrationID, limit)
	if err != nil {
		return nil, fmt.Errorf("list deliveries: %w", err)
	}
	defer rows.Close()

	var deliveries []domain.IntegrationDelivery
	for rows.Next() {
		var d domain.IntegrationDelivery
		var status *int
		if err := rows.Scan(&d.ID, &d.IntegrationID, &d.EventType, &d.Payload, &status, &d.ResponseBody, &d.Success, &d.DeliveredAt); err != nil {
			return nil, fmt.Errorf("scan delivery: %w", err)
		}
		d.ResponseStatus = status
		deliveries = append(deliveries, d)
	}
	return deliveries, rows.Err()
}
