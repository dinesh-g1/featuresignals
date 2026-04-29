package cluster

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
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

// Health fetches health status from a cluster's /ops/health endpoint.
func (c *Client) Health(ctx context.Context, cluster *domain.Cluster) (*domain.ClusterHealth, error) {
	url := fmt.Sprintf("%s://%s/ops/health", schemeForIP(cluster.PublicIP), cluster.PublicIP)

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
	url := fmt.Sprintf("%s://%s/ops/config", schemeForIP(cluster.PublicIP), cluster.PublicIP)

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
	url := fmt.Sprintf("%s://%s/ops/config", schemeForIP(cluster.PublicIP), cluster.PublicIP)

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
	url := fmt.Sprintf("%s://%s/ops/metrics", schemeForIP(cluster.PublicIP), cluster.PublicIP)

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