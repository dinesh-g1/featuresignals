package hetzner

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

var ErrNotConfigured = errors.New("Hetzner not configured — set HETZNER_TOKEN")

type Server struct {
	ID         int64             `json:"id"`
	Name       string            `json:"name"`
	Status     string            `json:"status"`
	PublicNet  PublicNet         `json:"public_net"`
	ServerType ServerType        `json:"server_type"`
	Datacenter Datacenter        `json:"datacenter"`
	Labels     map[string]string `json:"labels"`
	Created    string            `json:"created"`
}

type PublicNet struct {
	IPv4 IPv4 `json:"ipv4"`
	IPv6 IPv6 `json:"ipv6"`
}

type IPv4 struct {
	IP      string `json:"ip"`
	Blocked bool   `json:"blocked"`
	DNSPTR  string `json:"dns_ptr"`
}

type IPv6 struct {
	IP      string `json:"ip"`
	Blocked bool   `json:"blocked"`
}

type ServerType struct {
	Name   string `json:"name"`
	Cores  int    `json:"cores"`
	Memory int    `json:"memory"`
	Disk   int    `json:"disk"`
}

type Datacenter struct {
	Name     string   `json:"name"`
	Location Location `json:"location"`
}

type Location struct {
	Name    string `json:"name"`
	Network string `json:"network"`
	City    string `json:"city"`
	Country string `json:"country"`
}

type CreateServerRequest struct {
	Name       string            `json:"name"`
	ServerType string            `json:"server_type"`
	Location   string            `json:"location"`
	Image      string            `json:"image"`
	SSHKeys    []int64           `json:"ssh_keys"`
	UserData   string            `json:"user_data"`
	Labels     map[string]string `json:"labels"`
}

type Client struct {
	token string
	http  *http.Client
}

func NewClient(token string) *Client {
	return &Client{
		token: token,
		http:  &http.Client{Timeout: 60 * time.Second},
	}
}

func (c *Client) configured() bool {
	return c.token != ""
}

func (c *Client) ListServers(ctx context.Context) ([]Server, error) {
	if !c.configured() {
		return nil, ErrNotConfigured
	}

	req, _ := http.NewRequestWithContext(ctx, "GET", "https://api.hetzner.cloud/v1/servers", nil)
	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("list servers: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Hetzner returned status %d", resp.StatusCode)
	}

	var result struct {
		Servers []Server `json:"servers"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode servers: %w", err)
	}

	return result.Servers, nil
}

func (c *Client) CreateServer(ctx context.Context, req CreateServerRequest) (*Server, error) {
	if !c.configured() {
		return nil, ErrNotConfigured
	}

	if req.Image == "" {
		req.Image = "ubuntu-24.04"
	}
	if req.ServerType == "" {
		req.ServerType = "cpx42"
	}
	if req.Location == "" {
		req.Location = "fsn1"
	}

	payload, _ := json.Marshal(req)
	httpReq, _ := http.NewRequestWithContext(ctx, "POST", "https://api.hetzner.cloud/v1/servers", bytes.NewReader(payload))
	httpReq.Header.Set("Authorization", "Bearer "+c.token)
	httpReq.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("create server request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusCreated {
		return nil, fmt.Errorf("Hetzner returned status %d", resp.StatusCode)
	}

	var result struct {
		Server Server `json:"server"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode server: %w", err)
	}

	return &result.Server, nil
}

func (c *Client) DeleteServer(ctx context.Context, id int64) error {
	if !c.configured() {
		return ErrNotConfigured
	}

	url := fmt.Sprintf("https://api.hetzner.cloud/v1/servers/%d", id)
	req, _ := http.NewRequestWithContext(ctx, "DELETE", url, nil)
	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("delete server request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK && resp.StatusCode != http.StatusNoContent {
		return fmt.Errorf("Hetzner returned status %d", resp.StatusCode)
	}

	return nil
}

func (c *Client) GetServer(ctx context.Context, id int64) (*Server, error) {
	if !c.configured() {
		return nil, ErrNotConfigured
	}

	url := fmt.Sprintf("https://api.hetzner.cloud/v1/servers/%d", id)
	req, _ := http.NewRequestWithContext(ctx, "GET", url, nil)
	req.Header.Set("Authorization", "Bearer "+c.token)

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("get server request: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("Hetzner returned status %d", resp.StatusCode)
	}

	var result struct {
		Server Server `json:"server"`
	}
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode server: %w", err)
	}

	return &result.Server, nil
}