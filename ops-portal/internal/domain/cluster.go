package domain

import "time"

// Cluster represents a registered FeatureSignals cluster.
type Cluster struct {
	ID              string    `json:"id"`
	Name            string    `json:"name"`             // e.g. "eu-001"
	Region          string    `json:"region"`           // e.g. "eu"
	Provider        string    `json:"provider"`          // e.g. "hetzner"
	ServerType      string    `json:"server_type"`       // e.g. "cpx42"
	PublicIP        string    `json:"public_ip"`
	APIToken        string    `json:"api_token,omitempty"` // Ops API auth token (SHA-256 hash)
	Status          string    `json:"status"`             // "online", "degraded", "offline"
	Version         string    `json:"version"`            // Deployed version SHA
	HetznerServerID int64     `json:"hetzner_server_id,omitempty"`
	CostPerMonth    float64   `json:"cost_per_month"`
	SignozURL       string    `json:"signoz_url,omitempty"`
	CreatedAt       time.Time `json:"created_at"`
	UpdatedAt       time.Time `json:"updated_at"`
}

// ClusterStore defines the persistence contract for clusters.
type ClusterStore interface {
	// Create persists a new cluster. Returns ErrConflict if a cluster
	// with the same ID or name already exists.
	Create(cluster *Cluster) error

	// GetByID returns a cluster by its ID. Returns ErrNotFound if it
	// does not exist.
	GetByID(id string) (*Cluster, error)

	// List returns all registered clusters, ordered by creation date
	// descending.
	List() ([]*Cluster, error)

	// Update modifies an existing cluster's mutable fields (name, region,
	// public_ip, api_token, status, version, server_type, provider,
	// hetzner_server_id, cost_per_month). Returns ErrNotFound if the
	// cluster does not exist.
	Update(cluster *Cluster) error

	// Delete removes a cluster by its ID. Returns ErrNotFound if it
	// does not exist.
	Delete(id string) error
}

// ClusterHealth represents the health status of a single cluster,
// as returned by the cluster's /ops/health endpoint.
type ClusterHealth struct {
	Status   string            `json:"status"`   // "ok", "degraded", "error"
	Cluster  string            `json:"cluster"`  // Cluster name
	Version  string            `json:"version"`  // Deployed version
	Uptime   int64             `json:"uptime"`   // Seconds since boot
	Services map[string]string `json:"services"` // Service name → status
}

// ClusterStatus constants.
const (
	ClusterStatusOnline   = "online"
	ClusterStatusDegraded = "degraded"
	ClusterStatusOffline  = "offline"
	ClusterStatusUnknown  = "unknown"
)