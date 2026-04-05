package dto

import (
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type SegmentResponse struct {
	ID          string           `json:"id"`
	Key         string           `json:"key"`
	Name        string           `json:"name"`
	Description string           `json:"description"`
	MatchType   domain.MatchType `json:"match_type"`
	Rules       []domain.Condition `json:"rules"`
	CreatedAt   time.Time        `json:"created_at"`
	UpdatedAt   time.Time        `json:"updated_at"`
}

func SegmentFromDomain(s *domain.Segment) *SegmentResponse {
	if s == nil {
		return nil
	}
	rules := s.Rules
	if rules == nil {
		rules = []domain.Condition{}
	}
	return &SegmentResponse{
		ID:          s.ID,
		Key:         s.Key,
		Name:        s.Name,
		Description: s.Description,
		MatchType:   s.MatchType,
		Rules:       rules,
		CreatedAt:   s.CreatedAt,
		UpdatedAt:   s.UpdatedAt,
	}
}

func SegmentSliceFromDomain(ss []domain.Segment) []SegmentResponse {
	out := make([]SegmentResponse, 0, len(ss))
	for i := range ss {
		out = append(out, *SegmentFromDomain(&ss[i]))
	}
	return out
}
