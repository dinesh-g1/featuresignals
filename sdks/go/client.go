package featuresignals

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"net/http"
	"sync"
	"time"
)

type Client struct {
	sdkKey   string
	baseURL  string
	flags    map[string]interface{}
	mu       sync.RWMutex
	client   *http.Client
	ready    bool
	pollInterval time.Duration
}

type Option func(*Client)

func WithBaseURL(url string) Option {
	return func(c *Client) { c.baseURL = url }
}

func WithPollingInterval(d time.Duration) Option {
	return func(c *Client) { c.pollInterval = d }
}

func NewClient(sdkKey string, opts ...Option) *Client {
	c := &Client{
		sdkKey:       sdkKey,
		baseURL:      "https://api.featuresignals.com",
		flags:        make(map[string]interface{}),
		client:       &http.Client{Timeout: 10 * time.Second},
		pollInterval: 30 * time.Second,
	}
	for _, opt := range opts {
		opt(c)
	}

	// Initial fetch
	if err := c.refresh(); err != nil {
		log.Printf("[featuresignals] initial fetch failed: %v", err)
	}

	// Start polling
	go c.poll()

	return c
}

func (c *Client) BoolVariation(key string, ctx EvalContext, fallback bool) bool {
	v, ok := c.getFlag(key)
	if !ok {
		return fallback
	}
	b, ok := v.(bool)
	if !ok {
		return fallback
	}
	return b
}

func (c *Client) StringVariation(key string, ctx EvalContext, fallback string) string {
	v, ok := c.getFlag(key)
	if !ok {
		return fallback
	}
	s, ok := v.(string)
	if !ok {
		return fallback
	}
	return s
}

func (c *Client) NumberVariation(key string, ctx EvalContext, fallback float64) float64 {
	v, ok := c.getFlag(key)
	if !ok {
		return fallback
	}
	n, ok := v.(float64)
	if !ok {
		return fallback
	}
	return n
}

func (c *Client) JSONVariation(key string, ctx EvalContext, fallback interface{}) interface{} {
	v, ok := c.getFlag(key)
	if !ok {
		return fallback
	}
	return v
}

func (c *Client) AllFlags() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()
	result := make(map[string]interface{}, len(c.flags))
	for k, v := range c.flags {
		result[k] = v
	}
	return result
}

func (c *Client) IsReady() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.ready
}

func (c *Client) getFlag(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	v, ok := c.flags[key]
	return v, ok
}

func (c *Client) refresh() error {
	req, err := http.NewRequestWithContext(context.Background(), "GET", c.baseURL+"/v1/client/env/flags?key=server", nil)
	if err != nil {
		return err
	}
	req.Header.Set("X-API-Key", c.sdkKey)

	resp, err := c.client.Do(req)
	if err != nil {
		return fmt.Errorf("fetch flags: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("fetch flags: status %d: %s", resp.StatusCode, string(body))
	}

	var flags map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&flags); err != nil {
		return fmt.Errorf("decode flags: %w", err)
	}

	c.mu.Lock()
	c.flags = flags
	c.ready = true
	c.mu.Unlock()

	return nil
}

func (c *Client) poll() {
	ticker := time.NewTicker(c.pollInterval)
	defer ticker.Stop()
	for range ticker.C {
		if err := c.refresh(); err != nil {
			log.Printf("[featuresignals] poll failed: %v", err)
		}
	}
}

func (c *Client) Close() {
	// Cleanup if needed
}
