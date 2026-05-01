package domain

import (
	"crypto/sha512"
	"encoding/hex"
	"encoding/json"
	"time"
)

// AuditEntry records every mutation performed through the management API.
// BeforeState and AfterState capture the resource before and after the change
// as JSON snapshots, enabling full change history and rollback support.
type AuditEntry struct {
	ID            string          `json:"id" db:"id"`
	OrgID         string          `json:"org_id" db:"org_id"`
	ProjectID     *string         `json:"project_id,omitempty" db:"project_id"`
	ActorID       *string         `json:"actor_id,omitempty" db:"actor_id"`
	ActorType     string          `json:"actor_type" db:"actor_type"`
	Action        string          `json:"action" db:"action"`
	ResourceType  string          `json:"resource_type" db:"resource_type"`
	ResourceID    *string         `json:"resource_id,omitempty" db:"resource_id"`
	BeforeState   json.RawMessage `json:"before_state,omitempty" db:"before_state"`
	AfterState    json.RawMessage `json:"after_state,omitempty" db:"after_state"`
	Metadata      json.RawMessage `json:"metadata,omitempty" db:"metadata"`
	IPAddress     string          `json:"ip_address,omitempty" db:"ip_address"`
	UserAgent     string          `json:"user_agent,omitempty" db:"user_agent"`
	IntegrityHash string          `json:"integrity_hash,omitempty" db:"integrity_hash"`
	CreatedAt     time.Time       `json:"created_at" db:"created_at"`
}

// ComputeIntegrityHash computes the SHA-512 chain hash for tamper evidence.
// Each entry's hash includes the previous entry's hash to form a chain.
// SHA-512 is used (over SHA-256) to satisfy CodeQL go/weak-sensitive-data-hashing
// since the hashed data may contain PII (OrgID, ActorID, BeforeState/AfterState snapshots).
func (e *AuditEntry) ComputeIntegrityHash(previousHash string) string {
	h := sha512.New()
	h.Write([]byte(previousHash))
	h.Write([]byte(e.OrgID))
	h.Write([]byte(e.Action))
	h.Write([]byte(e.ResourceType))
	if e.ResourceID != nil {
		h.Write([]byte(*e.ResourceID))
	}
	if e.ActorID != nil {
		h.Write([]byte(*e.ActorID))
	}
	h.Write(e.BeforeState)
	h.Write(e.AfterState)
	h.Write([]byte(e.CreatedAt.UTC().Format(time.RFC3339Nano)))
	return hex.EncodeToString(h.Sum(nil))
}
