package domain

import (
	"context"
	"time"
)

// OpsUser represents an operator who can access the ops portal.
type OpsUser struct {
	ID           string     `json:"id"`
	Email        string     `json:"email"`
	PasswordHash string     `json:"-"`
	Name         string     `json:"name"`
	Role         string     `json:"role"` // "admin", "engineer", "viewer"
	CreatedAt    time.Time  `json:"created_at"`
	LastLoginAt  *time.Time `json:"last_login_at,omitempty"`
}

// OpsUserStore defines the persistence contract for ops users.
type OpsUserStore interface {
	Create(ctx context.Context, user *OpsUser) error
	GetByID(ctx context.Context, id string) (*OpsUser, error)
	GetByEmail(ctx context.Context, email string) (*OpsUser, error)
	List(ctx context.Context) ([]*OpsUser, error)
	Update(ctx context.Context, user *OpsUser) error
	Delete(ctx context.Context, id string) error
}