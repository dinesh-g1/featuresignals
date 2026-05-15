// Package abm provides the Go SDK for FeatureSignals' Agent Behavior Mesh (ABM).
//
// ABM is the agent equivalent of feature flags. It allows customer applications
// to manage AI agent behaviors — resolving behavior variants, tracking agent
// actions, and measuring outcomes — with the same governance and observability
// as feature flags.
//
// Basic usage:
//
//	client := abm.NewClient(abm.Config{
//	    APIKey:  os.Getenv("FS_ABM_API_KEY"),
//	    BaseURL: "https://app.featuresignals.com",
//	})
//
//	resp, err := client.Resolve(ctx, abm.ResolveRequest{
//	    BehaviorKey: "search-ranking",
//	    AgentID:     "recommender-v2",
//	    AgentType:   "recommender",
//	})
//
//	client.Track(ctx, abm.TrackEvent{
//	    BehaviorKey: "search-ranking",
//	    Variant:     resp.Variant,
//	    Action:      "search.ranked",
//	    Outcome:     "displayed",
//	})
package abm

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"sync"
	"time"
)

// ─── Configuration ─────────────────────────────────────────────────────────

// Config holds the ABM client configuration.
type Config struct {
	// APIKey is the FeatureSignals API key (server-side or client-side).
	APIKey string

	// BaseURL is the FeatureSignals API base URL.
	// Default: "https://app.featuresignals.com"
	BaseURL string

	// HTTPClient overrides the default HTTP client.
	HTTPClient *http.Client

	// CacheTTL is how long resolved behaviors are cached locally.
	// Default: 10 seconds (per ABM_SDK_SPECIFICATION.md §1.3). 0 disables caching.
	CacheTTL time.Duration
}

// ─── Types ─────────────────────────────────────────────────────────────────

// ResolveRequest is sent to resolve which behavior variant an agent should use.
type ResolveRequest struct {
	BehaviorKey string         `json:"behavior_key"`
	AgentID     string         `json:"agent_id"`
	AgentType   string         `json:"agent_type"`
	UserID      string         `json:"user_id,omitempty"`
	Attributes  map[string]any `json:"attributes,omitempty"`
	SessionID   string         `json:"session_id,omitempty"`
}

// ResolveResponse is the result of resolving a behavior.
type ResolveResponse struct {
	BehaviorKey string          `json:"behavior_key"`
	Variant     string          `json:"variant"`
	Config      json.RawMessage `json:"config,omitempty"`
	Reason      string          `json:"reason"`
	ResolvedAt  time.Time       `json:"resolved_at"`
	IsSticky    bool            `json:"is_sticky"`
	TTLSeconds  int             `json:"ttl_seconds"`
}

// TrackEvent records an agent behavior event for analytics.
type TrackEvent struct {
	BehaviorKey string         `json:"behavior_key"`
	Variant     string         `json:"variant"`
	AgentID     string         `json:"agent_id"`
	AgentType   string         `json:"agent_type"`
	UserID      string         `json:"user_id,omitempty"`
	Action      string         `json:"action"`
	Outcome     string         `json:"outcome,omitempty"`
	Value       float64        `json:"value,omitempty"`
	Metadata    map[string]any `json:"metadata,omitempty"`
	SessionID   string         `json:"session_id,omitempty"`
	RecordedAt  time.Time      `json:"recorded_at"`
}

// ─── Client ────────────────────────────────────────────────────────────────

// Client is the ABM SDK client. It resolves agent behaviors and tracks
// agent actions. Resolved behaviors are cached locally for fast access.
type Client struct {
	apiKey     string
	baseURL    string
	httpClient *http.Client
	cacheTTL   time.Duration

	cache   map[string]*cacheEntry // behaviorKey -> entry
	cacheMu sync.RWMutex
}

type cacheEntry struct {
	response  ResolveResponse
	expiresAt time.Time
}

// NewClient creates a new ABM client with the given configuration.
func NewClient(cfg Config) *Client {
	if cfg.BaseURL == "" {
		cfg.BaseURL = "https://app.featuresignals.com"
	}
	if cfg.HTTPClient == nil {
		cfg.HTTPClient = &http.Client{Timeout: 10 * time.Second}
	}
	if cfg.CacheTTL == 0 {
		cfg.CacheTTL = 10 * time.Second // Per ABM_SDK_SPECIFICATION.md §1.3
	}

	return &Client{
		apiKey:     cfg.APIKey,
		baseURL:    cfg.BaseURL,
		httpClient: cfg.HTTPClient,
		cacheTTL:   cfg.CacheTTL,
		cache:      make(map[string]*cacheEntry),
	}
}

// ─── Resolve ───────────────────────────────────────────────────────────────

// Resolve evaluates a behavior for the given agent context and returns
// the matching variant with its configuration.
//
// Results are cached locally based on the CacheTTL. Use ResolveFresh
// to bypass the cache.
func (c *Client) Resolve(ctx context.Context, req ResolveRequest) (*ResolveResponse, error) {
	// Check cache first.
	if c.cacheTTL > 0 {
		c.cacheMu.RLock()
		entry, ok := c.cache[req.BehaviorKey]
		c.cacheMu.RUnlock()
		if ok && time.Now().Before(entry.expiresAt) {
			return &entry.response, nil
		}
	}
	return c.resolveRemote(ctx, req)
}

// ResolveFresh bypasses the local cache and always fetches from the server.
func (c *Client) ResolveFresh(ctx context.Context, req ResolveRequest) (*ResolveResponse, error) {
	return c.resolveRemote(ctx, req)
}

func (c *Client) resolveRemote(ctx context.Context, req ResolveRequest) (*ResolveResponse, error) {
	body, err := json.Marshal(req)
	if err != nil {
		return nil, fmt.Errorf("abm: marshal resolve request: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/v1/abm/resolve", bytes.NewReader(body))
	if err != nil {
		return nil, fmt.Errorf("abm: create request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return nil, fmt.Errorf("abm: resolve %q: %w", req.BehaviorKey, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		respBody, _ := io.ReadAll(resp.Body)
		return nil, fmt.Errorf("abm: resolve %q: status %d: %s", req.BehaviorKey, resp.StatusCode, string(respBody))
	}

	var result ResolveResponse
	if err := json.NewDecoder(resp.Body).Decode(&result); err != nil {
		return nil, fmt.Errorf("abm: decode resolve response: %w", err)
	}

	// Update cache.
	if c.cacheTTL > 0 {
		ttl := c.cacheTTL
		if result.TTLSeconds > 0 {
			ttl = time.Duration(result.TTLSeconds) * time.Second
		}
		c.cacheMu.Lock()
		c.cache[req.BehaviorKey] = &cacheEntry{
			response:  result,
			expiresAt: time.Now().Add(ttl),
		}
		c.cacheMu.Unlock()
	}

	return &result, nil
}

// ─── Track ─────────────────────────────────────────────────────────────────

// Track records an agent behavior event for analytics and billing.
// Tracking is fire-and-forget — errors are returned but the caller
// should not block critical paths on tracking.
func (c *Client) Track(ctx context.Context, event TrackEvent) error {
	if event.RecordedAt.IsZero() {
		event.RecordedAt = time.Now().UTC()
	}

	body, err := json.Marshal(event)
	if err != nil {
		return fmt.Errorf("abm: marshal track event: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/v1/abm/track", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("abm: create track request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("abm: track %q: %w", event.BehaviorKey, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("abm: track %q: status %d: %s", event.BehaviorKey, resp.StatusCode, string(respBody))
	}

	return nil
}

// TrackBatch records multiple events in a single request.
func (c *Client) TrackBatch(ctx context.Context, events []TrackEvent) error {
	if len(events) == 0 {
		return nil
	}

	now := time.Now().UTC()
	for i := range events {
		if events[i].RecordedAt.IsZero() {
			events[i].RecordedAt = now
		}
	}

	body, err := json.Marshal(events)
	if err != nil {
		return fmt.Errorf("abm: marshal track batch: %w", err)
	}

	httpReq, err := http.NewRequestWithContext(ctx, http.MethodPost,
		c.baseURL+"/v1/abm/track/batch", bytes.NewReader(body))
	if err != nil {
		return fmt.Errorf("abm: create track batch request: %w", err)
	}
	httpReq.Header.Set("Content-Type", "application/json")
	httpReq.Header.Set("Authorization", "Bearer "+c.apiKey)

	resp, err := c.httpClient.Do(httpReq)
	if err != nil {
		return fmt.Errorf("abm: track batch: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusAccepted {
		respBody, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("abm: track batch: status %d: %s", resp.StatusCode, string(respBody))
	}

	return nil
}

// ─── Cache Management ──────────────────────────────────────────────────────

// InvalidateCache clears the local resolution cache for a specific behavior.
func (c *Client) InvalidateCache(behaviorKey string) {
	c.cacheMu.Lock()
	delete(c.cache, behaviorKey)
	c.cacheMu.Unlock()
}

// InvalidateAllCache clears all locally cached resolutions.
func (c *Client) InvalidateAllCache() {
	c.cacheMu.Lock()
	c.cache = make(map[string]*cacheEntry)
	c.cacheMu.Unlock()
}

// ─── URL Helpers ───────────────────────────────────────────────────────────

// ResolveURL returns the full URL for the resolve endpoint.
func ResolveURL(baseURL string) string {
	return urlJoin(baseURL, "/v1/abm/resolve")
}

// TrackURL returns the full URL for the track endpoint.
func TrackURL(baseURL string) string {
	return urlJoin(baseURL, "/v1/abm/track")
}

func urlJoin(base, path string) string {
	u, err := url.Parse(base)
	if err != nil {
		return base + path
	}
	u = u.JoinPath(path)
	return u.String()
}
