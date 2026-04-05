package dto

import (
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type ApprovalResponse struct {
	ID         string                `json:"id"`
	FlagID     string                `json:"flag_id"`
	EnvID      string                `json:"env_id"`
	ChangeType string                `json:"change_type"`
	Status     domain.ApprovalStatus `json:"status"`
	ReviewNote string                `json:"review_note,omitempty"`
	ReviewedAt *time.Time            `json:"reviewed_at,omitempty"`
	CreatedAt  time.Time             `json:"created_at"`
	UpdatedAt  time.Time             `json:"updated_at"`
}

func ApprovalFromDomain(a *domain.ApprovalRequest) *ApprovalResponse {
	if a == nil {
		return nil
	}
	return &ApprovalResponse{
		ID:         a.ID,
		FlagID:     a.FlagID,
		EnvID:      a.EnvID,
		ChangeType: a.ChangeType,
		Status:     a.Status,
		ReviewNote: a.ReviewNote,
		ReviewedAt: a.ReviewedAt,
		CreatedAt:  a.CreatedAt,
		UpdatedAt:  a.UpdatedAt,
	}
}

func ApprovalSliceFromDomain(as []domain.ApprovalRequest) []ApprovalResponse {
	out := make([]ApprovalResponse, 0, len(as))
	for i := range as {
		out = append(out, *ApprovalFromDomain(&as[i]))
	}
	return out
}
