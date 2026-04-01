package domain

import "time"

// Segment groups users by shared attributes (e.g. "Beta Users", "Enterprise Plan").
// Segments are reusable across flags via TargetingRule.SegmentKeys.
type Segment struct {
	ID          string      `json:"id" db:"id"`
	ProjectID   string      `json:"project_id" db:"project_id"`
	Key         string      `json:"key" db:"key"`
	Name        string      `json:"name" db:"name"`
	Description string      `json:"description" db:"description"`
	MatchType   MatchType   `json:"match_type" db:"match_type"`
	Rules       []Condition `json:"rules" db:"rules"`
	CreatedAt   time.Time   `json:"created_at" db:"created_at"`
	UpdatedAt   time.Time   `json:"updated_at" db:"updated_at"`
}
