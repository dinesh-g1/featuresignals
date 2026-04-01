package domain

import (
	"encoding/json"
	"time"
)

// AuditEntry records every mutation performed through the management API.
// BeforeState and AfterState capture the resource before and after the change
// as JSON snapshots, enabling full change history and rollback support.
type AuditEntry struct {
	ID           string          `json:"id" db:"id"`
	OrgID        string          `json:"org_id" db:"org_id"`
	ActorID      *string         `json:"actor_id,omitempty" db:"actor_id"`
	ActorType    string          `json:"actor_type" db:"actor_type"`
	Action       string          `json:"action" db:"action"`
	ResourceType string          `json:"resource_type" db:"resource_type"`
	ResourceID   *string         `json:"resource_id,omitempty" db:"resource_id"`
	BeforeState  json.RawMessage `json:"before_state,omitempty" db:"before_state"`
	AfterState   json.RawMessage `json:"after_state,omitempty" db:"after_state"`
	Metadata     json.RawMessage `json:"metadata,omitempty" db:"metadata"`
	CreatedAt    time.Time       `json:"created_at" db:"created_at"`
}
