package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/google/uuid"
	"github.com/jackc/pgx/v5/pgxpool"
)

// AuditStore implements domain.AuditStore backed by PostgreSQL.
type AuditStore struct {
	pool *pgxpool.Pool
}

// NewAuditStore creates a new postgres-backed audit store.
func NewAuditStore(pool *pgxpool.Pool) *AuditStore {
	return &AuditStore{pool: pool}
}

// Append records a new audit entry. The log is append-only — no update or delete.
func (s *AuditStore) Append(ctx context.Context, entry *domain.AuditEntry) error {
	if entry.ID == "" {
		entry.ID = uuid.New().String()
	}
	if entry.CreatedAt.IsZero() {
		entry.CreatedAt = time.Now().UTC()
	}

	query := `
		INSERT INTO audit_entries (id, user_id, action, target_type, target_id, details, ip, created_at)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
	`

	_, err := s.pool.Exec(ctx, query,
		entry.ID,
		entry.UserID,
		entry.Action,
		entry.TargetType,
		entry.TargetID,
		entry.Details,
		entry.IP,
		entry.CreatedAt,
	)
	if err != nil {
		return fmt.Errorf("audit append: %w", err)
	}
	return nil
}

// List returns audit entries ordered by created_at descending, with pagination.
func (s *AuditStore) List(ctx context.Context, limit, offset int) ([]domain.AuditEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT id, user_id, action, target_type, target_id, COALESCE(details,''), COALESCE(ip,''), created_at
		FROM audit_entries
		ORDER BY created_at DESC
		LIMIT $1 OFFSET $2
	`

	rows, err := s.pool.Query(ctx, query, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("audit list: %w", err)
	}
	defer rows.Close()

	var entries []domain.AuditEntry
	for rows.Next() {
		var e domain.AuditEntry
		if err := rows.Scan(&e.ID, &e.UserID, &e.Action, &e.TargetType, &e.TargetID, &e.Details, &e.IP, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("audit list scan: %w", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("audit list iterate: %w", err)
	}

	if entries == nil {
		entries = []domain.AuditEntry{}
	}
	return entries, nil
}

// Count returns the total number of audit entries.
func (s *AuditStore) Count(ctx context.Context) (int, error) {
	var count int
	err := s.pool.QueryRow(ctx, `SELECT COUNT(*) FROM audit_entries`).Scan(&count)
	if err != nil {
		return 0, fmt.Errorf("audit count: %w", err)
	}
	return count, nil
}

// ListByUser returns audit entries for a specific user.
func (s *AuditStore) ListByUser(ctx context.Context, userID string, limit, offset int) ([]domain.AuditEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT id, user_id, action, target_type, target_id, COALESCE(details,''), COALESCE(ip,''), created_at
		FROM audit_entries
		WHERE user_id = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := s.pool.Query(ctx, query, userID, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("audit list by user: %w", err)
	}
	defer rows.Close()

	var entries []domain.AuditEntry
	for rows.Next() {
		var e domain.AuditEntry
		if err := rows.Scan(&e.ID, &e.UserID, &e.Action, &e.TargetType, &e.TargetID, &e.Details, &e.IP, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("audit list by user scan: %w", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("audit list by user iterate: %w", err)
	}

	if entries == nil {
		entries = []domain.AuditEntry{}
	}
	return entries, nil
}

// ListByAction returns audit entries for a specific action type.
func (s *AuditStore) ListByAction(ctx context.Context, action string, limit, offset int) ([]domain.AuditEntry, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	if offset < 0 {
		offset = 0
	}

	query := `
		SELECT id, user_id, action, target_type, target_id, COALESCE(details,''), COALESCE(ip,''), created_at
		FROM audit_entries
		WHERE action = $1
		ORDER BY created_at DESC
		LIMIT $2 OFFSET $3
	`

	rows, err := s.pool.Query(ctx, query, action, limit, offset)
	if err != nil {
		return nil, fmt.Errorf("audit list by action: %w", err)
	}
	defer rows.Close()

	var entries []domain.AuditEntry
	for rows.Next() {
		var e domain.AuditEntry
		if err := rows.Scan(&e.ID, &e.UserID, &e.Action, &e.TargetType, &e.TargetID, &e.Details, &e.IP, &e.CreatedAt); err != nil {
			return nil, fmt.Errorf("audit list by action scan: %w", err)
		}
		entries = append(entries, e)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("audit list by action iterate: %w", err)
	}

	if entries == nil {
		entries = []domain.AuditEntry{}
	}
	return entries, nil
}