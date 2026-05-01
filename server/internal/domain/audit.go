package domain

import (
	"crypto/hmac"
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

// ComputeIntegrityHash computes an HMAC-SHA-512 chain hash for tamper evidence.
// Each entry's hash includes the previous entry's hash to form a chain.
// HMAC-SHA-512 with a server-side key is used to satisfy CodeQL
// go/weak-sensitive-data-hashing — the key material prevents brute-force
// attacks on the hashed PII data (OrgID, ActorID, BeforeState/AfterState snapshots
// which may contain passwords or other secrets).
func (e *AuditEntry) ComputeIntegrityHash(previousHash string, keyMaterial string) string {
	mac := hmac.New(sha512.New, []byte(keyMaterial))
	mac.Write([]byte(previousHash))
	mac.Write([]byte(e.OrgID))
	mac.Write([]byte(e.Action))
	mac.Write([]byte(e.ResourceType))
	if e.ResourceID != nil {
		mac.Write([]byte(*e.ResourceID))
	}
	if e.ActorID != nil {
		mac.Write([]byte(*e.ActorID))
	}
	mac.Write(e.BeforeState)
	mac.Write(e.AfterState)
	mac.Write([]byte(e.CreatedAt.UTC().Format(time.RFC3339Nano)))
	return hex.EncodeToString(mac.Sum(nil))
}
