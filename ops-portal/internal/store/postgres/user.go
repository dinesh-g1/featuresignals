package postgres

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/google/uuid"
	"github.com/featuresignals/ops-portal/internal/domain"
	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// UserStore implements domain.OpsUserStore backed by PostgreSQL.
type UserStore struct {
	pool *pgxpool.Pool
}

// NewUserStore creates a new UserStore.
func NewUserStore(pool *pgxpool.Pool) *UserStore {
	return &UserStore{pool: pool}
}

// Create inserts a new ops user. Returns ErrConflict if the email already exists.
func (s *UserStore) Create(ctx context.Context, user *domain.OpsUser) error {
	if user.ID == "" {
		user.ID = uuid.New().String()
	}
	if user.CreatedAt.IsZero() {
		user.CreatedAt = time.Now().UTC()
	}

	query := `
		INSERT INTO ops_users (id, email, password_hash, name, role, created_at)
		VALUES ($1, $2, $3, $4, $5, $6)
	`

	_, err := s.pool.Exec(ctx, query,
		user.ID, user.Email, user.PasswordHash, user.Name, user.Role, user.CreatedAt,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.WrapConflict("user")
		}
		return fmt.Errorf("create user: %w", err)
	}
	return nil
}

// GetByID returns a user by their ID. Returns ErrNotFound if not found.
func (s *UserStore) GetByID(ctx context.Context, id string) (*domain.OpsUser, error) {
	query := `
		SELECT id, email, password_hash, name, role, created_at, last_login_at
		FROM ops_users WHERE id = $1
	`

	var user domain.OpsUser
	var lastLogin *time.Time
	err := s.pool.QueryRow(ctx, query, id).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&user.Role, &user.CreatedAt, &lastLogin,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.WrapNotFound("user")
		}
		return nil, fmt.Errorf("get user by id: %w", err)
	}
	user.LastLoginAt = lastLogin
	return &user, nil
}

// GetByEmail returns a user by their email address. Returns ErrNotFound if not found.
func (s *UserStore) GetByEmail(ctx context.Context, email string) (*domain.OpsUser, error) {
	query := `
		SELECT id, email, password_hash, name, role, created_at, last_login_at
		FROM ops_users WHERE email = $1
	`

	var user domain.OpsUser
	var lastLogin *time.Time
	err := s.pool.QueryRow(ctx, query, email).Scan(
		&user.ID, &user.Email, &user.PasswordHash, &user.Name,
		&user.Role, &user.CreatedAt, &lastLogin,
	)
	if err != nil {
		if errors.Is(err, pgx.ErrNoRows) {
			return nil, domain.WrapNotFound("user")
		}
		return nil, fmt.Errorf("get user by email: %w", err)
	}
	user.LastLoginAt = lastLogin
	return &user, nil
}

// List returns all ops users, ordered by creation date descending.
func (s *UserStore) List(ctx context.Context) ([]*domain.OpsUser, error) {
	query := `
		SELECT id, email, password_hash, name, role, created_at, last_login_at
		FROM ops_users ORDER BY created_at DESC
	`

	rows, err := s.pool.Query(ctx, query)
	if err != nil {
		return nil, fmt.Errorf("list users: %w", err)
	}
	defer rows.Close()

	var users []*domain.OpsUser
	for rows.Next() {
		var u domain.OpsUser
		var lastLogin *time.Time
		if err := rows.Scan(
			&u.ID, &u.Email, &u.PasswordHash, &u.Name,
			&u.Role, &u.CreatedAt, &lastLogin,
		); err != nil {
			return nil, fmt.Errorf("scan user: %w", err)
		}
		u.LastLoginAt = lastLogin
		users = append(users, &u)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate users: %w", err)
	}

	return users, nil
}

// Update modifies an existing user's mutable fields (email, name, role, last_login_at).
// Returns ErrNotFound if the user does not exist.
func (s *UserStore) Update(ctx context.Context, user *domain.OpsUser) error {
	query := `
		UPDATE ops_users SET email = $1, name = $2, role = $3, last_login_at = $4
		WHERE id = $5
	`

	result, err := s.pool.Exec(ctx, query,
		user.Email, user.Name, user.Role, user.LastLoginAt, user.ID,
	)
	if err != nil {
		if isUniqueViolation(err) {
			return domain.WrapConflict("user")
		}
		return fmt.Errorf("update user: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("user")
	}
	return nil
}

// Delete removes a user by their ID. Returns ErrNotFound if not found.
func (s *UserStore) Delete(ctx context.Context, id string) error {
	query := `DELETE FROM ops_users WHERE id = $1`

	result, err := s.pool.Exec(ctx, query, id)
	if err != nil {
		return fmt.Errorf("delete user: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("user")
	}
	return nil
}

// UpdatePasswordHash updates the password hash for a user (used for password changes).
// Returns ErrNotFound if the user does not exist.
func (s *UserStore) UpdatePasswordHash(ctx context.Context, id, hash string) error {
	query := `UPDATE ops_users SET password_hash = $1 WHERE id = $2`

	result, err := s.pool.Exec(ctx, query, hash, id)
	if err != nil {
		return fmt.Errorf("update password hash: %w", err)
	}
	if result.RowsAffected() == 0 {
		return domain.WrapNotFound("user")
	}
	return nil
}