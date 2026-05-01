package cluster

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/url"
	"time"

	"github.com/featuresignals/ops-portal/internal/domain"
)

// Client communicates with a remote cluster's /ops/* endpoints.
// Each cluster exposes an ops API that the portal proxies through.
type Client struct {
	httpClient *http.Client
}

// NewClient creates a new cluster client with sensible timeouts.
func NewClient() *Client {
	return &Client{
		httpClient: &http.Client{
			Timeout: 10 * time.Second,
			Transport: &http.Transport{
				IdleConnTimeout:     30 * time.Second,
				DisableCompression:  false,
				MaxIdleConnsPerHost: 2,
			},
		},
	}
}

// validateHost strips the port (if any) from the given address, parses the
// remaining host as an IP, and returns an error if it is a loopback, private,
// link-local, or otherwise non-global unicast address.  This prevents SSRF
// attacks through a maliciously crafted cluster.PublicIP.
func validateHost(addr string) error {
	// Strip port if present (IPv6 addresses may contain colons).
	host, _, err := net.SplitHostPort(addr)
	if err != nil {
		// net.SplitHostPort fails when there is no port — that's fine, the
		// whole string is the host.
		host = addr
	}

	// Resolve the host to an IP.  If it's a hostname (e.g. "cluster.example.com")
	// we look it up; if it's already an IP we get it back directly.
	ip := net.ParseIP(host)
	if ip == nil {
		// Host is not a literal IP — resolve it.
		ips, err := net.LookupIP(host)
		if err != nil {
			return fmt.Errorf("cluster host lookup failed: %w", err)
		}
		if len(ips) == 0 {
			return fmt.Errorf("cluster host resolved to no addresses")
		}
		ip = ips[0]
	}

	if ip.IsLoopback() {
		return fmt.Errorf("cluster host is a loopback address: %s", ip)
	}
	if ip.IsPrivate() {
		return fmt.Errorf("cluster host is a private address: %s", ip)
	}
	if ip.IsLinkLocalUnicast() {
		return fmt.Errorf("cluster host is a link-local address: %s", ip)
	}
	if ip.IsUnspecified() {
		return fmt.Errorf("cluster host is the unspecified address: %s", ip)
	}

	return nil
}

// schemeForIP returns "http" for local addresses, "https" for public IPs.
func schemeForIP(ip string) string {
	// Strip port if present
	addr := ip
	for i := 0; i < len(ip); i++ {
		if ip[i] == ':' {
			addr = ip[:i]
			break
		}
	}
	if addr == "localhost" || addr == "127.0.0.1" || addr == "::1" {
		return "http"
	}
	if len(addr) >= 4 && addr[:4] == "10." {
		return "http"
	}
	if len(addr) >= 8 && addr[:8] == "192.168." {
		return "http"
	}
	if len(addr) >= 8 && addr[:8] == "172.16." {
		return "http"
	}
	return "https"
}

// clusterURL builds a validated URL for a cluster endpoint using net/url
// for safe URL construction (CodeQL go/request-forgery). The host is validated
// by validateHost before URL construction.
func (c *Client) clusterURL(cluster *domain.Cluster, path string) (string, error) {
	if err := validateHost(cluster.PublicIP); err != nil {
		return "", err
	}
	u := &url.URL{
		Scheme: schemeForIP(cluster.PublicIP),
		Host:   cluster.PublicIP,
		Path:   path,
	}
	return u.String(), nil
}

// Health fetches health status from a cluster's /ops/health endpoint.
func (c *Client) Health(ctx context.Context, cluster *domain.Cluster) (*domain.ClusterHealth, error) {
	url, err := c.clusterURL(cluster, "/ops/health")
	if err != nil {
		return nil, fmt.Errorf("cluster health: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create health request: %w", err)
	}

	if cluster.APIToken != "" {
		req.Header.Set("Authorization", "Bearer "+cluster.APIToken)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("cluster health request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read health response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("cluster returned status %d: %s", resp.StatusCode, string(body))
	}

	var health domain.ClusterHealth
	if err := json.Unmarshal(body, &health); err != nil {
		return nil, fmt.Errorf("decode health response: %w", err)
	}

	return &health, nil
}

// FetchConfig fetches the current configuration from a cluster's /ops/config endpoint.
func (c *Client) FetchConfig(ctx context.Context, cluster *domain.Cluster) (string, error) {
	url, err := c.clusterURL(cluster, "/ops/config")
	if err != nil {
		return "", fmt.Errorf("cluster config: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return "", fmt.Errorf("create config request: %w", err)
	}

	if cluster.APIToken != "" {
		req.Header.Set("Authorization", "Bearer "+cluster.APIToken)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("cluster config request failed: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return "", fmt.Errorf("read config response: %w", err)
	}

	if resp.StatusCode != http.StatusOK {
		return "", fmt.Errorf("cluster returned status %d: %s", resp.StatusCode, string(body))
	}

	return string(body), nil
}

// UpdateConfig pushes a configuration update to a cluster's /ops/config endpoint.
func (c *Client) UpdateConfig(ctx context.Context, cluster *domain.Cluster, configJSON string) error {
	url, err := c.clusterURL(cluster, "/ops/config")
	if err != nil {
		return fmt.Errorf("cluster config update: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader([]byte(configJSON)))
	if err != nil {
		return fmt.Errorf("create config update request: %w", err)
	}

	if cluster.APIToken != "" {
		req.Header.Set("Authorization", "Bearer "+cluster.APIToken)
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("cluster config update request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("cluster returned status %d: %s", resp.StatusCode, string(body))
	}

	return nil
}

// FetchMetrics fetches metrics from a cluster's /ops/metrics endpoint.
func (c *Client) FetchMetrics(ctx context.Context, cluster *domain.Cluster) (*domain.ClusterMetric, error) {
	url, err := c.clusterURL(cluster, "/ops/metrics")
	if err != nil {
		return nil, fmt.Errorf("cluster metrics: %w", err)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create metrics request: %w", err)
	}

	if cluster.APIToken != "" {
		req.Header.Set("Authorization", "Bearer "+cluster.APIToken)
	}

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("cluster metrics request failed: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("cluster returned status %d", resp.StatusCode)
	}

	var metrics struct {
		CPU    float64 `json:"cpu"`
		Memory float64 `json:"memory"`
		Disk   float64 `json:"disk"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&metrics); err != nil {
		return nil, fmt.Errorf("decode metrics response: %w", err)
	}

	return &domain.ClusterMetric{
		ClusterID:  cluster.ID,
		CPU:        metrics.CPU,
		Memory:     metrics.Memory,
		Disk:       metrics.Disk,
		RecordedAt: time.Now().UTC(),
	}, nil
}
