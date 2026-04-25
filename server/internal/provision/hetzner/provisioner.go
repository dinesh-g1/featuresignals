// Package hetzner provides a provisioner for Hetzner Cloud servers.
// It wraps the hcloud-go SDK to provision, deprovision, and query
// cloud servers used as FeatureSignals tenant cells.
package hetzner

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/hetznercloud/hcloud-go/v2/hcloud"
)

// Config holds the Hetzner Cloud API configuration.
type Config struct {
	APIToken  string // Hetzner Cloud API token
	Region    string // Default region, e.g., "fsn1" (Falkenstein)
	SSHKeyID  int64  // SSH key ID for server access
	NetworkID int64  // Private network ID
}

// ProvisionRequest specifies the parameters for provisioning a new server.
type ProvisionRequest struct {
	Name       string            // Server hostname
	ServerType string            // e.g., "cx22", "cx32", "cx52"
	Location   string            // e.g., "fsn1", "nbg1", "hel1"
	Image      string            // OS image, e.g., "ubuntu-24.04"
	Labels     map[string]string // Tags for identification
	UserData   string            // Cloud-init script
}

// ServerInfo contains the details of a Hetzner cloud server.
type ServerInfo struct {
	ID         int64
	Name       string
	Status     string // "running", "starting", "stopping", "off"
	PublicIP   string
	PrivateIP  string
	Location   string
	ServerType string
	CreatedAt  time.Time
}

// Provisioner manages Hetzner Cloud server lifecycle.
type Provisioner struct {
	client *hcloud.Client
	config Config
	logger *slog.Logger
}

// NewProvisioner creates a new Hetzner provisioner with the given config.
func NewProvisioner(config Config, logger *slog.Logger) *Provisioner {
	client := hcloud.NewClient(
		hcloud.WithToken(config.APIToken),
	)
	return &Provisioner{
		client: client,
		config: config,
		logger: logger.With("provisioner", "hetzner"),
	}
}

// ProvisionServer creates a new Hetzner cloud server for a tenant cell.
// Returns the server details including IP, ID, and status.
func (p *Provisioner) ProvisionServer(ctx context.Context, req ProvisionRequest) (*ServerInfo, error) {
	logger := p.logger.With("server_name", req.Name, "location", req.Location, "server_type", req.ServerType)

	// Build server create request
	createReq := hcloud.ServerCreateOpts{
		Name:       req.Name,
		ServerType: &hcloud.ServerType{Name: req.ServerType},
		Location:   &hcloud.Location{Name: req.Location},
		Image:      &hcloud.Image{Name: req.Image},
		Labels:     req.Labels,
		UserData:   req.UserData,
	}

	// Attach SSH key if configured
	if p.config.SSHKeyID > 0 {
		createReq.SSHKeys = []*hcloud.SSHKey{{ID: p.config.SSHKeyID}}
	}

	// Attach to private network if configured
	if p.config.NetworkID > 0 {
		createReq.Networks = []*hcloud.Network{{ID: p.config.NetworkID}}
	}

	result, _, err := p.client.Server.Create(ctx, createReq)
	if err != nil {
		return nil, fmt.Errorf("create server: %w", err)
	}

	logger.Info("server provision initiated", "server_id", result.Server.ID)

	// Wait for server to become ready (root disk is created asynchronously)
	_, errCh := p.client.Action.WatchProgress(ctx, result.Action)
	if err := <-errCh; err != nil {
		return nil, fmt.Errorf("wait for server create action: %w", err)
	}

	// Refresh server state after creation completes
	server, _, err := p.client.Server.GetByID(ctx, result.Server.ID)
	if err != nil {
		return nil, fmt.Errorf("get server after creation: %w", err)
	}
	if server == nil {
		return nil, fmt.Errorf("server not found after creation")
	}

	info := p.toServerInfo(server)
	logger.Info("server provisioned", "server_id", info.ID, "public_ip", info.PublicIP)
	return info, nil
}

// DeprovisionServer deletes a Hetzner server by ID.
func (p *Provisioner) DeprovisionServer(ctx context.Context, serverID int64) error {
	logger := p.logger.With("server_id", serverID)

	server, _, err := p.client.Server.GetByID(ctx, serverID)
	if err != nil {
		return fmt.Errorf("get server for deprovision: %w", err)
	}
	if server == nil {
		return fmt.Errorf("server %d not found", serverID)
	}

	result, _, err := p.client.Server.DeleteWithResult(ctx, server)
	if err != nil {
		return fmt.Errorf("delete server: %w", err)
	}

	// Watch the delete action to completion
	_, errCh := p.client.Action.WatchProgress(ctx, result.Action)
	if err := <-errCh; err != nil {
		return fmt.Errorf("wait for server delete action: %w", err)
	}

	logger.Info("server deprovisioned")
	return nil
}

// GetServerStatus returns current status of a Hetzner server.
func (p *Provisioner) GetServerStatus(ctx context.Context, serverID int64) (*ServerInfo, error) {
	server, _, err := p.client.Server.GetByID(ctx, serverID)
	if err != nil {
		return nil, fmt.Errorf("get server: %w", err)
	}
	if server == nil {
		return nil, fmt.Errorf("server %d not found", serverID)
	}

	return p.toServerInfo(server), nil
}

// ListServers returns all Hetzner servers tagged for FeatureSignals.
func (p *Provisioner) ListServers(ctx context.Context) ([]ServerInfo, error) {
	servers, err := p.client.Server.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("list servers: %w", err)
	}

	infos := make([]ServerInfo, 0, len(servers))
	for _, s := range servers {
		if s.Labels != nil && s.Labels["featuresignals.com/managed-by"] == "ops-portal" {
			infos = append(infos, *p.toServerInfo(s))
		}
	}
	return infos, nil
}

// toServerInfo converts a hcloud.Server to a ServerInfo value object.
func (p *Provisioner) toServerInfo(server *hcloud.Server) *ServerInfo {
	info := &ServerInfo{
		ID:         server.ID,
		Name:       server.Name,
		Status:     string(server.Status),
		Location:   server.Datacenter.Location.Name,
		ServerType: server.ServerType.Name,
		CreatedAt:  server.Created,
	}

	// Primary public IPv4
	if server.PublicNet.IPv4.IP != nil {
		info.PublicIP = server.PublicNet.IPv4.IP.String()
	}

	// First private network IP
	for _, net := range server.PrivateNet {
		if net.IP != nil {
			info.PrivateIP = net.IP.String()
			break
		}
	}

	return info
}