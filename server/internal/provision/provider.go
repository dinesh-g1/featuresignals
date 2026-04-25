// Package provision defines cloud-agnostic interfaces for provisioning
// and managing cloud server infrastructure. Concrete implementations
// (hetzner, aws, azure) act as adapters from their respective SDKs
// to these shared types, enabling the CellManager to be provider-agnostic.
package provision

import (
	"context"
	"time"
)

// Provisioner is the cloud-agnostic interface for managing server lifecycle.
// Implementations wrap a specific cloud provider's SDK and translate
// between the provider's types and the shared types defined here.
//
// All methods accept a context.Context for cancellation and timeouts.
// Errors should be wrapped with context using fmt.Errorf.
type Provisioner interface {
	// ProvisionServer creates a new cloud server with the given configuration.
	// Returns the server details including ID, IP addresses, and status.
	// The returned ServerInfo.ID is a provider-agnostic string identifier.
	ProvisionServer(ctx context.Context, req ProvisionRequest) (*ServerInfo, error)

	// DeprovisionServer deletes a cloud server by its provider-agnostic ID.
	// Returns an error if the server does not exist or cannot be deleted.
	DeprovisionServer(ctx context.Context, serverID string) error

	// GetServerStatus returns the current status and details of a cloud server.
	// Returns an error if the server does not exist.
	GetServerStatus(ctx context.Context, serverID string) (*ServerInfo, error)

	// ListServers returns all cloud servers managed by this provisioner,
	// filtered to those belonging to the FeatureSignals platform.
	ListServers(ctx context.Context) ([]ServerInfo, error)
}

// ProvisionRequest specifies the parameters for provisioning a new server.
// Fields common across all cloud providers are top-level. Provider-specific
// options can be passed via ProviderOpts.
type ProvisionRequest struct {
	// Name is the hostname or display name for the server.
	Name string

	// ServerType is the instance/size type, e.g., "cx22" (Hetzner),
	// "t3.medium" (AWS), or "Standard_B2s" (Azure).
	ServerType string

	// Region is the cloud region/datacenter, e.g., "fsn1", "us-east-1".
	Region string

	// Image is the OS image, e.g., "ubuntu-24.04".
	Image string

	// Labels are arbitrary key-value pairs for identification and filtering.
	Labels map[string]string

	// UserData is cloud-init or similar initialization script content.
	UserData string

	// ProviderOpts allows passing provider-specific configuration that
	// doesn't fit the common fields (e.g., SSH key IDs, network IDs).
	// Each provider documents its expected keys and value types.
	ProviderOpts map[string]any
}

// ServerInfo contains the details of a provisioned cloud server.
// The ID field is a string to remain cloud-agnostic — concrete adapters
// convert provider-specific numeric or UUID identifiers to strings.
type ServerInfo struct {
	// ID is the cloud-agnostic server identifier (string).
	// For Hetzner, this is the server ID formatted as a decimal string.
	ID string `json:"id"`

	// Name is the server hostname or display name.
	Name string `json:"name"`

	// Status indicates the server's operational state.
	// Common values: "running", "starting", "stopping", "off".
	Status string `json:"status"`

	// PublicIP is the server's public IPv4 address, if assigned.
	PublicIP string `json:"public_ip,omitempty"`

	// PrivateIP is the server's private network IPv4 address, if assigned.
	PrivateIP string `json:"private_ip,omitempty"`

	// Region is the cloud region or datacenter where the server runs.
	Region string `json:"region"`

	// ServerType is the instance/size type, e.g., "cx22".
	ServerType string `json:"server_type"`

	// CreatedAt is when the server was created, in UTC.
	CreatedAt time.Time `json:"created_at"`

	// Provider identifies the cloud provider: "hetzner", "aws", "azure".
	Provider string `json:"provider"`
}