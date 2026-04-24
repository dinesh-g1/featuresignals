package provider

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
	"path"
	"strings"
)

// ---------------------------------------------------------------------------
// Client
// ---------------------------------------------------------------------------

// Client communicates with the FeatureSignals REST API.
type Client struct {
	httpClient *http.Client
	baseURL    string
	apiKey     string
}

// NewClient creates a new FeatureSignals API client.
func NewClient(httpClient *http.Client, baseURL, apiKey string) *Client {
	return &Client{
		httpClient: httpClient,
		baseURL:    baseURL,
		apiKey:     apiKey,
	}
}

// ---------------------------------------------------------------------------
// Request helpers
// ---------------------------------------------------------------------------

// apiURL builds the full URL for the given resource path.
func (c *Client) apiURL(elem ...string) string {
	u, err := url.Parse(c.baseURL)
	if err != nil {
		return c.baseURL + "/" + strings.Join(elem, "/")
	}
	u.Path = path.Join(u.Path, path.Join(elem...))
	return u.String()
}

// doRequest performs an HTTP request and unmarshals the JSON response body
// into the target pointer (if non-nil). Returns the raw *http.Response so
// callers can inspect status codes.
func (c *Client) doRequest(ctx context.Context, method, urlStr string, body, target interface{}) (*http.Response, error) {
	var reqBody io.Reader

	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal request body: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, method, urlStr, reqBody)
	if err != nil {
		return nil, fmt.Errorf("create request: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.apiKey)
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("Accept", "application/json")
	req.Header.Set("User-Agent", "terraform-provider-featuresignals/0.1.0")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("execute request: %w", err)
	}

	// Read the body for error inspection
	defer resp.Body.Close()
	respBytes, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response body: %w", err)
	}

	// Check for HTTP errors
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return resp, parseAPIError(resp.StatusCode, respBytes)
	}

	// Unmarshal response into target if requested
	if target != nil && len(respBytes) > 0 {
		if err := json.Unmarshal(respBytes, target); err != nil {
			return resp, fmt.Errorf("unmarshal response: %w", err)
		}
	}

	return resp, nil
}

// ---------------------------------------------------------------------------
// API error handling
// ---------------------------------------------------------------------------

// APIError represents an error returned by the FeatureSignals API.
type APIError struct {
	StatusCode int    `json:"-"`
	Message    string `json:"message"`
	Code       string `json:"code,omitempty"`
}

func (e *APIError) Error() string {
	if e.Code != "" {
		return fmt.Sprintf("HTTP %d: %s (code: %s)", e.StatusCode, e.Message, e.Code)
	}
	return fmt.Sprintf("HTTP %d: %s", e.StatusCode, e.Message)
}

func parseAPIError(statusCode int, body []byte) *APIError {
	apiErr := &APIError{StatusCode: statusCode, Message: fmt.Sprintf("unexpected status %d", statusCode)}

	// Try to parse structured error body
	var structured struct {
		Error   string `json:"error"`
		Message string `json:"message"`
		Code    string `json:"code"`
	}
	if err := json.Unmarshal(body, &structured); err == nil {
		msg := structured.Error
		if msg == "" {
			msg = structured.Message
		}
		if msg != "" {
			apiErr.Message = msg
		}
		apiErr.Code = structured.Code
	}

	return apiErr
}

// ---------------------------------------------------------------------------
// Health
// ---------------------------------------------------------------------------

// HealthCheck verifies connectivity to the FeatureSignals API.
func (c *Client) HealthCheck(ctx context.Context) (bool, error) {
	urlStr := c.apiURL("health")
	resp, err := c.doRequest(ctx, http.MethodGet, urlStr, nil, nil)
	if err != nil {
		// If the server returned an error, the connection itself worked.
		// Only return false if there's a transport-level error.
		var apiErr *APIError
		if !asAPIError(err, &apiErr) {
			return false, fmt.Errorf("health check transport failure: %w", err)
		}
		// API responded — connection works even if health endpoint returns non-2xx
		return false, nil
	}
	_ = resp
	return true, nil
}

// asAPIError unwraps err into *APIError. Returns false if not an APIError.
func asAPIError(err error, target **APIError) bool {
	if err == nil {
		return false
	}
	if strings.Contains(err.Error(), "HTTP ") {
		*target = &APIError{Message: err.Error()}
		return true
	}
	return false
}

// ---------------------------------------------------------------------------
// Flag types
// ---------------------------------------------------------------------------

// FlagCreateRequest is the request body for creating a flag.
type FlagCreateRequest struct {
	ProjectID     string               `json:"project_id"`
	Key           string               `json:"key"`
	Name          string               `json:"name,omitempty"`
	Description   string               `json:"description,omitempty"`
	FlagType      string               `json:"flag_type,omitempty"`
	Category      string               `json:"category,omitempty"`
	Status        string               `json:"status,omitempty"`
	DefaultValue  string               `json:"default_value,omitempty"`
	Tags          []string             `json:"tags,omitempty"`
	Enabled       bool                 `json:"enabled"`
	Environments  []FlagEnvironment     `json:"environments,omitempty"`
}

// FlagUpdateRequest is the request body for updating a flag.
type FlagUpdateRequest struct {
	Name         string              `json:"name,omitempty"`
	Description  string              `json:"description,omitempty"`
	FlagType     string              `json:"flag_type,omitempty"`
	Category     string              `json:"category,omitempty"`
	Status       string              `json:"status,omitempty"`
	DefaultValue string              `json:"default_value,omitempty"`
	Tags         []string            `json:"tags,omitempty"`
	Enabled      *bool               `json:"enabled,omitempty"`
	Environments []FlagEnvironment   `json:"environments,omitempty"`
}

// FlagResponse is the API response for a single flag.
type FlagResponse struct {
	ID           string             `json:"id"`
	ProjectID    string             `json:"project_id"`
	Key          string             `json:"key"`
	Name         string             `json:"name"`
	Description  string             `json:"description"`
	FlagType     string             `json:"flag_type"`
	Category     string             `json:"category"`
	Status       string             `json:"status"`
	DefaultValue string             `json:"default_value"`
	Tags         []string           `json:"tags"`
	Enabled      bool               `json:"enabled"`
	Environments []FlagEnvironment  `json:"environments"`
	CreatedAt    string             `json:"created_at"`
	UpdatedAt    string             `json:"updated_at"`
}

// FlagEnvironment represents a per-environment state of a flag.
type FlagEnvironment struct {
	Key     string `json:"key"`
	Enabled bool   `json:"enabled"`
	Rules   string `json:"rules,omitempty"`
}

// ListFlagsResponse is the API response for listing flags.
type ListFlagsResponse struct {
	Data  []FlagResponse `json:"data"`
	Total int            `json:"total"`
}

// ---------------------------------------------------------------------------
// Flag CRUD
// ---------------------------------------------------------------------------

// CreateFlag creates a new feature flag.
func (c *Client) CreateFlag(ctx context.Context, req FlagCreateRequest) (*FlagResponse, error) {
	urlStr := c.apiURL("v1", "flags")
	var flag FlagResponse
	_, err := c.doRequest(ctx, http.MethodPost, urlStr, req, &flag)
	if err != nil {
		return nil, fmt.Errorf("create flag: %w", err)
	}
	return &flag, nil
}

// GetFlag retrieves a single flag by ID.
func (c *Client) GetFlag(ctx context.Context, flagID string) (*FlagResponse, error) {
	urlStr := c.apiURL("v1", "flags", flagID)
	var flag FlagResponse
	_, err := c.doRequest(ctx, http.MethodGet, urlStr, nil, &flag)
	if err != nil {
		return nil, fmt.Errorf("get flag %q: %w", flagID, err)
	}
	return &flag, nil
}

// UpdateFlag updates an existing flag.
func (c *Client) UpdateFlag(ctx context.Context, flagID string, req FlagUpdateRequest) (*FlagResponse, error) {
	urlStr := c.apiURL("v1", "flags", flagID)
	var flag FlagResponse
	_, err := c.doRequest(ctx, http.MethodPut, urlStr, req, &flag)
	if err != nil {
		return nil, fmt.Errorf("update flag %q: %w", flagID, err)
	}
	return &flag, nil
}

// DeleteFlag deletes a flag by ID.
func (c *Client) DeleteFlag(ctx context.Context, flagID string) error {
	urlStr := c.apiURL("v1", "flags", flagID)
	_, err := c.doRequest(ctx, http.MethodDelete, urlStr, nil, nil)
	if err != nil {
		return fmt.Errorf("delete flag %q: %w", flagID, err)
	}
	return nil
}

// ListFlags retrieves all flags for a project.
func (c *Client) ListFlags(ctx context.Context, projectID string) ([]FlagResponse, error) {
	v := url.Values{}
	if projectID != "" {
		v.Set("project_id", projectID)
	}
	urlStr := c.apiURL("v1", "flags")
	if qs := v.Encode(); qs != "" {
		urlStr = urlStr + "?" + qs
	}

	var list ListFlagsResponse
	_, err := c.doRequest(ctx, http.MethodGet, urlStr, nil, &list)
	if err != nil {
		return nil, fmt.Errorf("list flags: %w", err)
	}
	return list.Data, nil
}