package dto

import (
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type AuditEntryResponse struct {
	ID           string    `json:"id"`
	ActorID      *string   `json:"actor_id,omitempty"`
	ActorType    string    `json:"actor_type"`
	Action       string    `json:"action"`
	ResourceType string    `json:"resource_type"`
	ResourceID   *string   `json:"resource_id,omitempty"`
	CreatedAt    time.Time `json:"created_at"`
}

func AuditEntryFromDomain(a *domain.AuditEntry) *AuditEntryResponse {
	if a == nil {
		return nil
	}
	return &AuditEntryResponse{
		ID:           a.ID,
		ActorID:      a.ActorID,
		ActorType:    a.ActorType,
		Action:       a.Action,
		ResourceType: a.ResourceType,
		ResourceID:   a.ResourceID,
		CreatedAt:    a.CreatedAt,
	}
}

func AuditEntrySliceFromDomain(as []domain.AuditEntry) []AuditEntryResponse {
	out := make([]AuditEntryResponse, 0, len(as))
	for i := range as {
		out = append(out, *AuditEntryFromDomain(&as[i]))
	}
	return out
}
