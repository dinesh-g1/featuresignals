package dto

import (
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type ProjectResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func ProjectFromDomain(p *domain.Project) *ProjectResponse {
	if p == nil {
		return nil
	}
	return &ProjectResponse{
		ID:        p.ID,
		Name:      p.Name,
		Slug:      p.Slug,
		CreatedAt: p.CreatedAt,
		UpdatedAt: p.UpdatedAt,
	}
}

func ProjectSliceFromDomain(ps []domain.Project) []ProjectResponse {
	out := make([]ProjectResponse, 0, len(ps))
	for i := range ps {
		out = append(out, *ProjectFromDomain(&ps[i]))
	}
	return out
}

type EnvironmentResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Color     string    `json:"color"`
	CreatedAt time.Time `json:"created_at"`
}

func EnvironmentFromDomain(e *domain.Environment) *EnvironmentResponse {
	if e == nil {
		return nil
	}
	return &EnvironmentResponse{
		ID:        e.ID,
		Name:      e.Name,
		Slug:      e.Slug,
		Color:     e.Color,
		CreatedAt: e.CreatedAt,
	}
}

func EnvironmentSliceFromDomain(es []domain.Environment) []EnvironmentResponse {
	out := make([]EnvironmentResponse, 0, len(es))
	for i := range es {
		out = append(out, *EnvironmentFromDomain(&es[i]))
	}
	return out
}
