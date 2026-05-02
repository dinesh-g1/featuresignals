package dto

import "github.com/featuresignals/server/internal/domain"

// PinnedItemDTO is returned/consumed by the pinned items endpoints.
type PinnedItemDTO struct {
	ID           string `json:"id"`
	ProjectID    string `json:"project_id"`
	ResourceType string `json:"resource_type"`
	ResourceID   string `json:"resource_id"`
	CreatedAt    string `json:"created_at"`
}

// PinnedItemsResponse wraps a list of pinned items.
type PinnedItemsResponse struct {
	Items []PinnedItemDTO `json:"items"`
}

// CreatePinnedItemPayload is the request body for POST /v1/pinned.
type CreatePinnedItemPayload struct {
	ProjectID    string `json:"project_id"`
	ResourceType string `json:"resource_type"`
	ResourceID   string `json:"resource_id"`
}

// PinnedItemFromDomain converts a domain PinnedItem to the DTO.
func PinnedItemFromDomain(p domain.PinnedItem) PinnedItemDTO {
	return PinnedItemDTO{
		ID:           p.ID,
		ProjectID:    p.ProjectID,
		ResourceType: p.ResourceType,
		ResourceID:   p.ResourceID,
		CreatedAt:    p.CreatedAt.Format("2006-01-02T15:04:05Z"),
	}
}

// PinnedItemsFromDomain converts a slice of domain PinnedItems to DTOs.
func PinnedItemsFromDomain(items []domain.PinnedItem) []PinnedItemDTO {
	result := make([]PinnedItemDTO, len(items))
	for i, p := range items {
		result[i] = PinnedItemFromDomain(p)
	}
	return result
}
