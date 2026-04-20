package postgres

import (
	"context"
	"fmt"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// CreateOpsCredentials creates login credentials for an ops user.
func (s *Store) CreateOpsCredentials(ctx context.Context, opsUserID, email, passwordHash string) error {
	_, err := s.pool.Exec(ctx, `
		INSERT INTO ops_portal_credentials (ops_user_id, email, password_hash)
		VALUES ($1, $2, $3)
	`, opsUserID, email, passwordHash)
	if err != nil {
		return fmt.Errorf("create ops credentials: %w", err)
	}
	return nil
}

// GetOpsUserByEmail retrieves an ops user by email with their credentials.
func (s *Store) GetOpsUserByEmail(ctx context.Context, email string) (*domain.OpsUser, error) {
	var u domain.OpsUser
	var passwordHash string
	err := s.pool.QueryRow(ctx, `
		SELECT ou.id, ou.user_id, ou.ops_role, ou.allowed_env_types, ou.allowed_regions,
		       ou.max_sandbox_envs, ou.is_active, opc.password_hash,
		       COALESCE(u.email, ''), COALESCE(u.name, '')
		FROM ops_users ou
		JOIN ops_portal_credentials opc ON opc.ops_user_id = ou.id
		LEFT JOIN users u ON ou.user_id = u.id
		WHERE opc.email = $1 AND ou.is_active = true
	`, email).Scan(&u.ID, &u.UserID, &u.OpsRole, &u.AllowedEnvTypes, &u.AllowedRegions,
		&u.MaxSandboxEnvs, &u.IsActive, &passwordHash, &u.UserEmail, &u.UserName)
	if err != nil {
		return nil, wrapNotFound(err, "ops user")
	}
	u.PasswordHash = passwordHash
	return &u, nil
}

// CreateOpsSession creates a new session and returns the refresh token.
func (s *Store) CreateOpsSession(ctx context.Context, opsUserID, refreshTokenHash string, expiresAt time.Time) (string, error) {
	var sessionID string
	err := s.pool.QueryRow(ctx, `
		INSERT INTO ops_portal_sessions (ops_user_id, refresh_token_hash, expires_at)
		VALUES ($1, $2, $3)
		RETURNING id
	`, opsUserID, refreshTokenHash, expiresAt).Scan(&sessionID)
	if err != nil {
		return "", fmt.Errorf("create ops session: %w", err)
	}
	return sessionID, nil
}

// GetOpsSessionByRefreshToken retrieves the ops user for a valid refresh token.
func (s *Store) GetOpsSessionByRefreshToken(ctx context.Context, refreshTokenHash string) (*domain.OpsUser, error) {
	var u domain.OpsUser
	err := s.pool.QueryRow(ctx, `
		SELECT ou.id, ou.user_id, ou.ops_role, ou.allowed_env_types, ou.allowed_regions,
		       ou.max_sandbox_envs, ou.is_active
		FROM ops_users ou
		JOIN ops_portal_sessions ops ON ops.ops_user_id = ou.id
		WHERE ops.refresh_token_hash = $1 AND ops.expires_at > NOW() AND ou.is_active = true
	`, refreshTokenHash).Scan(&u.ID, &u.UserID, &u.OpsRole, &u.AllowedEnvTypes, &u.AllowedRegions,
		&u.MaxSandboxEnvs, &u.IsActive)
	if err != nil {
		return nil, wrapNotFound(err, "ops session")
	}
	return &u, nil
}

// DeleteOpsSession removes a specific session.
func (s *Store) DeleteOpsSession(ctx context.Context, opsUserID, refreshTokenHash string) error {
	_, err := s.pool.Exec(ctx, `
		DELETE FROM ops_portal_sessions WHERE ops_user_id = $1 AND refresh_token_hash = $2
	`, opsUserID, refreshTokenHash)
	return err
}

// DeleteAllOpsSessions removes all sessions for an ops user (logout everywhere).
func (s *Store) DeleteAllOpsSessions(ctx context.Context, opsUserID string) error {
	_, err := s.pool.Exec(ctx, `DELETE FROM ops_portal_sessions WHERE ops_user_id = $1`, opsUserID)
	return err
}
