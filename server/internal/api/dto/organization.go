package dto

import (
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type OrganizationResponse struct {
	ID        string    `json:"id"`
	Name      string    `json:"name"`
	Slug      string    `json:"slug"`
	Plan      string    `json:"plan"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

func OrganizationFromDomain(o *domain.Organization) *OrganizationResponse {
	if o == nil {
		return nil
	}
	return &OrganizationResponse{
		ID:        o.ID,
		Name:      o.Name,
		Slug:      o.Slug,
		Plan:      o.Plan,
		CreatedAt: o.CreatedAt,
		UpdatedAt: o.UpdatedAt,
	}
}
