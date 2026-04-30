package domain

import (
	"context"
	"encoding/json"
	"time"
)

// PublicSession stores migration preview data for unauthenticated visitors.
// Sessions expire after 7 days and are retrievable via a JWT session token.
type PublicSession struct {
	ID           string          `json:"id"`
	SessionToken string          `json:"session_token"`
	Provider     string          `json:"provider"`
	Data         json.RawMessage `json:"data"`
	Email        string          `json:"email,omitempty"`
	CreatedAt    time.Time       `json:"created_at"`
	ExpiresAt    time.Time       `json:"expires_at"`
}

// SessionStore defines the contract for public session persistence.
type SessionStore interface {
	CreateSession(ctx context.Context, session *PublicSession) error
	GetSession(ctx context.Context, token string) (*PublicSession, error)
	DeleteSession(ctx context.Context, token string) error
	CleanExpiredSessions(ctx context.Context) (int, error)
}
