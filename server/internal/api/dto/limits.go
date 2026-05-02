package dto

import "github.com/featuresignals/server/internal/domain"

// LimitsResponse is returned by GET /v1/limits.
type LimitsResponse struct {
	Plan   string             `json:"plan"`
	Limits []ResourceLimitDTO `json:"limits"`
}

// ResourceLimitDTO holds current usage vs max for one resource type.
type ResourceLimitDTO struct {
	Resource string `json:"resource"`
	Used     int    `json:"used"`
	Max      int    `json:"max"` // -1 = unlimited
}

// LimitsResponseFromDomain converts domain data to the DTO shape.
func LimitsResponseFromDomain(plan string, limits []domain.ResourceLimit) LimitsResponse {
	items := make([]ResourceLimitDTO, len(limits))
	for i, l := range limits {
		items[i] = ResourceLimitDTO{
			Resource: l.Resource,
			Used:     l.Used,
			Max:      l.Max,
		}
	}
	return LimitsResponse{
		Plan:   plan,
		Limits: items,
	}
}
