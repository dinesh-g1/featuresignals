package cloudflare

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"time"
)

var ErrNotConfigured = errors.New("Cloudflare not configured — set CLOUDFLARE_TOKEN and CLOUDFLARE_ZONE_ID")

type DNSRecord struct {
	ID      string `json:"id"`
	Type    string `json:"type"`
	Name    string `json:"name"`
	Content string `json:"content"`
	TTL     int    `json:"ttl"`
	Proxied bool   `json:"proxied"`
	ZoneID  string `json:"zone_id"`
}

type Client struct {
	token  string
	zoneID string
	http   *http.Client
}

func NewClient(token, zoneID string) *Client {
	return &Client{
		token:  token,
		zoneID: zoneID,
		http:   &http.Client{Timeout: 30 * time.Second},
	}
}

func (c *Client) configured() bool {
	return c.token != "" && c.zoneID != ""
}

// ListDNSRecords returns all DNS records for the configured zone.
func (c *Client) ListDNSRecords(ctx context.Context) ([]DNSRecord, error) {
	if !c.configured() {
		return nil, ErrNotConfigured
	}

	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records", c.zoneID)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, fmt.Errorf("create list dns records request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("list dns records request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
		Errors  []struct {
			Code    int    `json:"code"`
			Message string `json:"message"`
		} `json:"errors"`
		Result []DNSRecord `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode list dns records response: %w", err)
	}

	if !result.Success {
		if len(result.Errors) > 0 {
			return nil, fmt.Errorf("Cloudflare error: %s", result.Errors[0].Message)
		}
		return nil, errors.New("Cloudflare request failed")
	}

	return result.Result, nil
}

// CreateDNSRecord creates a new DNS record in the configured zone.
func (c *Client) CreateDNSRecord(ctx context.Context, recordType, name, content string, ttl int, proxied bool) (*DNSRecord, error) {
	if !c.configured() {
		return nil, ErrNotConfigured
	}

	if ttl == 0 {
		ttl = 1 // 1 = Auto
	}

	body := map[string]interface{}{
		"type":    recordType,
		"name":    name,
		"content": content,
		"ttl":     ttl,
		"proxied": proxied,
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return nil, fmt.Errorf("marshal create dns record body: %w", err)
	}

	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records", c.zoneID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(payload))
	if err != nil {
		return nil, fmt.Errorf("create create dns record request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return nil, fmt.Errorf("create dns record request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
		Result DNSRecord `json:"result"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("decode create dns record response: %w", err)
	}

	if !result.Success {
		if len(result.Errors) > 0 {
			return nil, fmt.Errorf("Cloudflare error: %s", result.Errors[0].Message)
		}
		return nil, errors.New("Cloudflare request failed")
	}

	return &result.Result, nil
}

// UpdateDNSRecord updates an existing DNS record in the configured zone.
func (c *Client) UpdateDNSRecord(ctx context.Context, recordID, recordType, name, content string, ttl int, proxied bool) error {
	if !c.configured() {
		return ErrNotConfigured
	}

	if ttl == 0 {
		ttl = 1
	}

	body := map[string]interface{}{
		"type":    recordType,
		"name":    name,
		"content": content,
		"ttl":     ttl,
		"proxied": proxied,
	}

	payload, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshal update dns record body: %w", err)
	}

	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records/%s", c.zoneID, recordID)
	req, err := http.NewRequestWithContext(ctx, http.MethodPut, url, bytes.NewReader(payload))
	if err != nil {
		return fmt.Errorf("create update dns record request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("update dns record request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("decode update dns record response: %w", err)
	}

	if !result.Success {
		if len(result.Errors) > 0 {
			return fmt.Errorf("Cloudflare error: %s", result.Errors[0].Message)
		}
		return errors.New("Cloudflare request failed")
	}

	return nil
}

// DeleteDNSRecord deletes a DNS record from the configured zone.
func (c *Client) DeleteDNSRecord(ctx context.Context, recordID string) error {
	if !c.configured() {
		return ErrNotConfigured
	}

	url := fmt.Sprintf("https://api.cloudflare.com/client/v4/zones/%s/dns_records/%s", c.zoneID, recordID)
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, url, nil)
	if err != nil {
		return fmt.Errorf("create delete dns record request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.http.Do(req)
	if err != nil {
		return fmt.Errorf("delete dns record request: %w", err)
	}
	defer resp.Body.Close()

	var result struct {
		Success bool `json:"success"`
		Errors  []struct {
			Message string `json:"message"`
		} `json:"errors"`
	}

	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return fmt.Errorf("decode delete dns record response: %w", err)
	}

	if !result.Success {
		if len(result.Errors) > 0 {
			return fmt.Errorf("Cloudflare error: %s", result.Errors[0].Message)
		}
		return errors.New("Cloudflare request failed")
	}

	return nil
}