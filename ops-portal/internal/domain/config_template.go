package domain

import (
	"context"
	"time"
)

type ConfigTemplate struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Template  string    `json:"template"`    // JSON string
	Scope     string    `json:"scope"`        // "base", "region", "cluster"
	ScopeKey  string    `json:"scope_key"`    // region name or cluster ID, empty for base
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

type ConfigTemplateStore interface {
	Create(ctx context.Context, ct *ConfigTemplate) error
	GetByID(ctx context.Context, id string) (*ConfigTemplate, error)
	List(ctx context.Context) ([]ConfigTemplate, error)
	Update(ctx context.Context, ct *ConfigTemplate) error
	Delete(ctx context.Context, id string) error
}