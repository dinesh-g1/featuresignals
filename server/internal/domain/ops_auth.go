package domain

import (
	"context"
	"time"
)

// OpsLoginRequest contains credentials for ops portal login.
type OpsLoginRequest struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

// OpsLoginResponse contains the auth tokens and user info.
type OpsLoginResponse struct {
	Token        string    `json:"token"`
	RefreshToken string    `json:"refresh_token"`
	ExpiresAt    time.Time `json:"expires_at"`
	User         OpsUser   `json:"user"`
}

// OpsRefreshRequest contains a refresh token.
type OpsRefreshRequest struct {
	RefreshToken string `json:"refresh_token"`
}

// OpsPortalStore defines the persistence interface for ops portal auth.
type OpsPortalStore interface {
	CreateOpsCredentials(ctx context.Context, opsUserID string, email, passwordHash string) error
	GetOpsUserByEmail(ctx context.Context, email string) (*OpsUser, error)
	CreateOpsSession(ctx context.Context, opsUserID, refreshTokenHash string, expiresAt time.Time) (string, error)
	GetOpsSessionByRefreshToken(ctx context.Context, refreshTokenHash string) (*OpsUser, error)
	DeleteOpsSession(ctx context.Context, opsUserID, refreshTokenHash string) error
	DeleteAllOpsSessions(ctx context.Context, opsUserID string) error
}
