package dto

import (
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type OrganizationResponse struct {
	ID             string     `json:"id"`
	Name           string     `json:"name"`
	Slug           string     `json:"slug"`
	Plan           string     `json:"plan"`
	DataRegion     string     `json:"data_region"`
	TrialExpiresAt *time.Time `json:"trial_expires_at,omitempty"`
	CreatedAt      time.Time  `json:"created_at"`
	UpdatedAt      time.Time  `json:"updated_at"`
}

func OrganizationFromDomain(o *domain.Organization) *OrganizationResponse {
	if o == nil {
		return nil
	}
	return &OrganizationResponse{
		ID:             o.ID,
		Name:           o.Name,
		Slug:           o.Slug,
		Plan:           o.Plan,
		DataRegion:     o.DataRegion,
		TrialExpiresAt: o.TrialExpiresAt,
		CreatedAt:      o.CreatedAt,
		UpdatedAt:      o.UpdatedAt,
	}
}
