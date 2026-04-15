package domain

import (
	"encoding/json"
	"time"
)

// FlagVersion represents a snapshot of a flag's configuration at a point in time.
// Versions are auto-created on flag updates via a database trigger.
type FlagVersion struct {
	ID             string          `json:"id"`
	FlagID         string          `json:"flag_id"`
	Version        int             `json:"version"`
	Config         json.RawMessage `json:"config"`          // Full flag config at this version
	PreviousConfig json.RawMessage `json:"previous_config"` // What it was before this change
	ChangedBy      *string         `json:"changed_by"`      // User ID who made the change (nullable)
	ChangeReason   *string         `json:"change_reason"`   // Why the change was made (nullable)
	CreatedAt      time.Time       `json:"created_at"`
}

// FlagVersionDiff represents the difference between two flag versions.
type FlagVersionDiff struct {
	Version        int             `json:"version"`
	PreviousConfig json.RawMessage `json:"previous_config"`
	CurrentConfig  json.RawMessage `json:"current_config"`
	ChangedFields  []string        `json:"changed_fields"`
	CreatedAt      time.Time       `json:"created_at"`
}
