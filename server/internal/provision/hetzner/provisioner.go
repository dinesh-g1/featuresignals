// Package hetzner provides a Hetzner Cloud adapter implementing the
// provision.Provisioner interface. It wraps the hcloud-go SDK to provision,
// deprovision, and query cloud servers used as FeatureSignals tenant cells.
//
// This package acts as an adapter from the hcloud SDK types to the
// cloud-agnostic provision.Provisioner interface and shared types.
package hetzner

import (
	"context"
	"fmt"
	"log/slog"
	"strconv"

	"github.com/hetznercloud/hcloud-go/v2/hcloud"

	"github.com/featuresignals/server/internal/provision"
)

// Config holds the Hetzner Cloud API configuration.
// This is provider-specific and not part of the shared provision types.
type Config struct {
	APIToken  string // Hetzner Cloud API token
	Region    string // Default region, e.g., "fsn1" (Falkenstein)
	SSHKeyID  int64  // SSH key ID for server access
	NetworkID int64  // Private network ID
}

// HetznerProvisioner manages Hetzner Cloud server lifecycle.
// It implements provision.Provisioner by adapting hcloud-go SDK types
// to the cloud-agnostic provision package types.
type HetznerProvisioner struct {
	client *hcloud.Client
	config Config
	logger *slog.Logger
}

// NewHetznerProvisioner creates a new Hetzner provisioner with the given config.
func NewHetznerProvisioner(config Config, logger *slog.Logger) *HetznerProvisioner {
	client := hcloud.NewClient(
		hcloud.WithToken(config.APIToken),
	)
	return &HetznerProvisioner{
		client: client,
		config: config,
		logger: logger.With("provisioner", "hetzner"),
	}
}

// ProvisionServer creates a new Hetzner cloud server for a tenant cell.
// Implements provision.Provisioner.ProvisionServer.
func (p *HetznerProvisioner) ProvisionServer(ctx context.Context, req provision.ProvisionRequest) (*provision.ServerInfo, error) {
	logger := p.logger.With("server_name", req.Name, "region", req.Region, "server_type", req.ServerType)

	// Build server create request
	createReq := hcloud.ServerCreateOpts{
		Name:       req.Name,
		ServerType: &hcloud.ServerType{Name: req.ServerType},
		Location:   &hcloud.Location{Name: req.Region},
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

// DeprovisionServer deletes a Hetzner server by its cloud-agnostic string ID.
// Implements provision.Provisioner.DeprovisionServer.
func (p *HetznerProvisioner) DeprovisionServer(ctx context.Context, serverID string) error {
	id, err := strconv.ParseInt(serverID, 10, 64)
	if err != nil {
		return fmt.Errorf("parse server ID %q: %w", serverID, err)
	}

	logger := p.logger.With("server_id", id)

	server, _, err := p.client.Server.GetByID(ctx, id)
	if err != nil {
		return fmt.Errorf("get server for deprovision: %w", err)
	}
	if server == nil {
		return fmt.Errorf("server %d not found", id)
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

// GetServerStatus returns current status of a Hetzner server by its
// cloud-agnostic string ID. Implements provision.Provisioner.GetServerStatus.
func (p *HetznerProvisioner) GetServerStatus(ctx context.Context, serverID string) (*provision.ServerInfo, error) {
	id, err := strconv.ParseInt(serverID, 10, 64)
	if err != nil {
		return nil, fmt.Errorf("parse server ID %q: %w", serverID, err)
	}

	server, _, err := p.client.Server.GetByID(ctx, id)
	if err != nil {
		return nil, fmt.Errorf("get server: %w", err)
	}
	if server == nil {
		return nil, fmt.Errorf("server %d not found", id)
	}

	return p.toServerInfo(server), nil
}

// ListServers returns all Hetzner servers tagged for FeatureSignals.
// Implements provision.Provisioner.ListServers.
func (p *HetznerProvisioner) ListServers(ctx context.Context) ([]provision.ServerInfo, error) {
	servers, err := p.client.Server.All(ctx)
	if err != nil {
		return nil, fmt.Errorf("list servers: %w", err)
	}

	infos := make([]provision.ServerInfo, 0, len(servers))
	for _, s := range servers {
		if s.Labels != nil && s.Labels["featuresignals.com/managed-by"] == "ops-portal" {
			infos = append(infos, *p.toServerInfo(s))
		}
	}
	return infos, nil
}

// toServerInfo converts a hcloud.Server to a cloud-agnostic provision.ServerInfo.
// The Hetzner numeric server ID is converted to a string for provider abstraction.
func (p *HetznerProvisioner) toServerInfo(server *hcloud.Server) *provision.ServerInfo {
	info := &provision.ServerInfo{
		ID:         fmt.Sprintf("%d", server.ID),
		Name:       server.Name,
		Status:     string(server.Status),
		Region:     server.Datacenter.Location.Name,
		ServerType: server.ServerType.Name,
		CreatedAt:  server.Created,
		Provider:   "hetzner",
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