package dto

import (
	"encoding/json"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type FlagResponse struct {
	ID                   string          `json:"id"`
	Key                  string          `json:"key"`
	Name                 string          `json:"name"`
	Description          string          `json:"description"`
	FlagType             domain.FlagType `json:"flag_type"`
	Category             string          `json:"category"`
	Status               string          `json:"status"`
	DefaultValue         json.RawMessage `json:"default_value"`
	Tags                 []string        `json:"tags"`
	ExpiresAt            *time.Time      `json:"expires_at,omitempty"`
	Prerequisites        []string        `json:"prerequisites,omitempty"`
	MutualExclusionGroup string          `json:"mutual_exclusion_group,omitempty"`
	CreatedAt            time.Time       `json:"created_at"`
	UpdatedAt            time.Time       `json:"updated_at"`
}

func FlagFromDomain(f *domain.Flag) *FlagResponse {
	if f == nil {
		return nil
	}
	tags := f.Tags
	if tags == nil {
		tags = []string{}
	}
	return &FlagResponse{
		ID:                   f.ID,
		Key:                  f.Key,
		Name:                 f.Name,
		Description:          f.Description,
		FlagType:             f.FlagType,
		Category:             string(f.Category),
		Status:               string(f.Status),
		DefaultValue:         f.DefaultValue,
		Tags:                 tags,
		ExpiresAt:            f.ExpiresAt,
		Prerequisites:        f.Prerequisites,
		MutualExclusionGroup: f.MutualExclusionGroup,
		CreatedAt:            f.CreatedAt,
		UpdatedAt:            f.UpdatedAt,
	}
}

func FlagSliceFromDomain(fs []domain.Flag) []FlagResponse {
	out := make([]FlagResponse, 0, len(fs))
	for i := range fs {
		out = append(out, *FlagFromDomain(&fs[i]))
	}
	return out
}

type FlagStateResponse struct {
	ID                 string            `json:"id"`
	Enabled            bool              `json:"enabled"`
	DefaultValue       json.RawMessage   `json:"default_value,omitempty"`
	Rules              []domain.TargetingRule `json:"rules"`
	PercentageRollout  int               `json:"percentage_rollout"`
	Variants           []domain.Variant  `json:"variants,omitempty"`
	ScheduledEnableAt  *time.Time        `json:"scheduled_enable_at,omitempty"`
	ScheduledDisableAt *time.Time        `json:"scheduled_disable_at,omitempty"`
	UpdatedAt          time.Time         `json:"updated_at"`
}

func FlagStateFromDomain(s *domain.FlagState) *FlagStateResponse {
	if s == nil {
		return nil
	}
	rules := s.Rules
	if rules == nil {
		rules = []domain.TargetingRule{}
	}
	return &FlagStateResponse{
		ID:                 s.ID,
		Enabled:            s.Enabled,
		DefaultValue:       s.DefaultValue,
		Rules:              rules,
		PercentageRollout:  s.PercentageRollout,
		Variants:           s.Variants,
		ScheduledEnableAt:  s.ScheduledEnableAt,
		ScheduledDisableAt: s.ScheduledDisableAt,
		UpdatedAt:          s.UpdatedAt,
	}
}
