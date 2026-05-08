package featuresignals

import (
	"bufio"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"math/rand"
	"net/http"
	"net/url"
	"strings"
	"sync"
	"time"
)

type clientEventKind int

const (
	clientEventUpdate clientEventKind = iota
	clientEventError
)

type clientEvent struct {
	kind clientEventKind
	err  error
}

// Client is the main FeatureSignals SDK entry point. It fetches flag values
// from the server, keeps them in memory, and updates them via SSE streaming
// or polling. All flag reads are local — no network call per evaluation.
type Client struct {
	sdkKey       string
	envKey       string
	baseURL      string
	flags        map[string]interface{}
	mu           sync.RWMutex
	httpClient   *http.Client
	ready        bool
	readyCh      chan struct{}
	readyOnce    sync.Once
	ctx          context.Context
	cancel       context.CancelFunc
	closeOnce    sync.Once
	wg           sync.WaitGroup
	pollInterval time.Duration
	sseEnabled   bool
	sseRetry     time.Duration
	logger       *slog.Logger
	onReady      func()
	onError      func(error)
	onUpdate     func(map[string]interface{})
	onWarn       WarnHandler
	userCtx      EvalContext

	anomaly *AnomalyDetector

	eventSubsMu sync.Mutex
	eventSubs   []chan<- clientEvent
}

// Option configures the Client.
type Option func(*Client)

// WithBaseURL overrides the default API base URL.
func WithBaseURL(u string) Option {
	return func(c *Client) { c.baseURL = strings.TrimRight(u, "/") }
}

// WithPollingInterval sets how often the client polls for flag updates.
func WithPollingInterval(d time.Duration) Option {
	return func(c *Client) { c.pollInterval = d }
}

// WithSSE enables Server-Sent Events streaming for real-time flag updates.
func WithSSE(enabled bool) Option {
	return func(c *Client) { c.sseEnabled = enabled }
}

// WithSSERetryInterval sets the reconnection delay for SSE.
func WithSSERetryInterval(d time.Duration) Option {
	return func(c *Client) { c.sseRetry = d }
}

// WithLogger sets a structured logger.
func WithLogger(l *slog.Logger) Option {
	return func(c *Client) { c.logger = l }
}

// WithHTTPClient overrides the default HTTP client.
func WithHTTPClient(hc *http.Client) Option {
	return func(c *Client) { c.httpClient = hc }
}

// WithOnReady registers a callback fired when the initial flag fetch succeeds.
func WithOnReady(fn func()) Option {
	return func(c *Client) { c.onReady = fn }
}

// WithOnError registers a callback fired on fetch/stream errors.
func WithOnError(fn func(error)) Option {
	return func(c *Client) { c.onError = fn }
}

// WithOnUpdate registers a callback fired after flags are refreshed.
func WithOnUpdate(fn func(map[string]interface{})) Option {
	return func(c *Client) { c.onUpdate = fn }
}

// WithContext sets the default EvalContext used when fetching flags.
func WithContext(ctx EvalContext) Option {
	return func(c *Client) { c.userCtx = ctx }
}

// WithWarnHandler registers a callback for anomaly warnings from the
// built-in AnomalyDetector. The anomaly detector is automatically enabled
// when this option is used (with default thresholds). See
// AnomalyDetectorConfig for customising thresholds.
func WithWarnHandler(fn WarnHandler) Option {
	return func(c *Client) {
		c.onWarn = fn
		c.anomaly = NewAnomalyDetector(nil, fn)
	}
}

// WithAnomalyDetector sets a fully customised AnomalyDetector. This
// overrides any handler set via WithWarnHandler.
func WithAnomalyDetector(detector *AnomalyDetector) Option {
	return func(c *Client) {
		c.anomaly = detector
		c.onWarn = detector.handler
	}
}

// NewClient creates and initialises a FeatureSignals client.
// sdkKey is the environment API key. envKey is the environment slug
// (e.g. "production"). The client performs an initial flag fetch
// synchronously, then starts background updates.
func NewClient(sdkKey, envKey string, opts ...Option) *Client {
	bgCtx, cancel := context.WithCancel(context.Background())
	c := &Client{
		sdkKey:       sdkKey,
		envKey:       envKey,
		baseURL:      "https://api.featuresignals.com",
		flags:        make(map[string]interface{}),
		httpClient:   &http.Client{Timeout: 10 * time.Second},
		pollInterval: 30 * time.Second,
		sseRetry:     1 * time.Second,
		readyCh:      make(chan struct{}),
		ctx:          bgCtx,
		cancel:       cancel,
		logger:       slog.Default(),
		userCtx:      NewContext("server"),
	}
	for _, opt := range opts {
		opt(c)
	}

	if err := c.refresh(bgCtx); err != nil {
		c.logError("initial fetch failed", err)
	} else {
		c.markReady()
	}

	c.wg.Add(1)
	if c.sseEnabled {
		go c.streamLoop()
	} else {
		go c.pollLoop()
	}

	return c
}

// BoolVariation returns the boolean value of a flag, or fallback if missing or wrong type.
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

// StringVariation returns the string value of a flag, or fallback.
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

// NumberVariation returns the numeric value of a flag, or fallback.
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

// JSONVariation returns the raw value of a flag, or fallback.
func (c *Client) JSONVariation(key string, ctx EvalContext, fallback interface{}) interface{} {
	v, ok := c.getFlag(key)
	if !ok {
		return fallback
	}
	return v
}

// AllFlags returns a snapshot of all current flag values.
func (c *Client) AllFlags() map[string]interface{} {
	c.mu.RLock()
	defer c.mu.RUnlock()
	out := make(map[string]interface{}, len(c.flags))
	for k, v := range c.flags {
		out[k] = v
	}
	return out
}

// IsReady reports whether the initial flag fetch has completed.
func (c *Client) IsReady() bool {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.ready
}

// Ready returns a channel that is closed when the client has loaded flags.
func (c *Client) Ready() <-chan struct{} {
	return c.readyCh
}

// Close shuts down background polling/streaming, waits for goroutines to
// finish, and releases resources. Safe to call multiple times.
func (c *Client) Close() {
	c.closeOnce.Do(func() {
		c.cancel()
		c.wg.Wait()
	})
}

func (c *Client) getFlag(key string) (interface{}, bool) {
	c.mu.RLock()
	defer c.mu.RUnlock()
	v, ok := c.flags[key]
	return v, ok
}

func (c *Client) markReady() {
	c.readyOnce.Do(func() {
		c.mu.Lock()
		c.ready = true
		c.mu.Unlock()
		close(c.readyCh)
		if c.onReady != nil {
			c.onReady()
		}
	})
}

func (c *Client) addEventSub(ch chan<- clientEvent) {
	c.eventSubsMu.Lock()
	c.eventSubs = append(c.eventSubs, ch)
	c.eventSubsMu.Unlock()
}

func (c *Client) emitClientEvent(evt clientEvent) {
	c.eventSubsMu.Lock()
	defer c.eventSubsMu.Unlock()
	for _, ch := range c.eventSubs {
		select {
		case ch <- evt:
		default:
		}
	}
}

func (c *Client) setFlags(flags map[string]interface{}) {
	c.mu.Lock()
	c.flags = flags
	c.mu.Unlock()
	if c.onUpdate != nil {
		snapshot := make(map[string]interface{}, len(flags))
		for k, v := range flags {
			snapshot[k] = v
		}
		c.onUpdate(snapshot)
	}
	c.emitClientEvent(clientEvent{kind: clientEventUpdate})
}

// refresh fetches all flag values from the server.
func (c *Client) refresh(ctx context.Context) error {
	u := fmt.Sprintf("%s/v1/client/%s/flags?key=%s",
		c.baseURL,
		url.PathEscape(c.envKey),
		url.QueryEscape(c.userCtx.Key))

	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	req.Header.Set("X-API-Key", c.sdkKey)

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("fetch flags: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			c.logger.Warn("failed to read error response body", "error", readErr)
		}
		return fmt.Errorf("fetch flags: status %d: %s", resp.StatusCode, string(body))
	}

	var flags map[string]interface{}
	if err := json.NewDecoder(resp.Body).Decode(&flags); err != nil {
		return fmt.Errorf("decode flags: %w", err)
	}

	c.setFlags(flags)
	return nil
}

// pollLoop periodically refreshes flags from the server.
func (c *Client) pollLoop() {
	defer c.wg.Done()
	ticker := time.NewTicker(c.pollInterval)
	defer ticker.Stop()
	for {
		select {
		case <-c.ctx.Done():
			return
		case <-ticker.C:
			if err := c.refresh(c.ctx); err != nil {
				c.logError("poll failed", err)
			} else {
				c.markReady()
			}
		}
	}
}

// streamLoop connects to the SSE endpoint, listens for flag_update events,
// and refreshes flags when notified. Reconnects with exponential backoff
// (starting at sseRetry, doubling up to 30s, with 25% random jitter) on
// failure. A successful connection resets the backoff.
func (c *Client) streamLoop() {
	defer c.wg.Done()
	backoff := c.sseRetry
	const maxBackoff = 30 * time.Second
	for {
		if err := c.connectSSE(); err != nil {
			c.logError("SSE connection failed", err)

			jitter := time.Duration(rand.Int63n(int64(backoff) / 4))
			select {
			case <-c.ctx.Done():
				return
			case <-time.After(backoff + jitter):
			}

			backoff *= 2
			if backoff > maxBackoff {
				backoff = maxBackoff
			}
		} else {
			backoff = c.sseRetry
			select {
			case <-c.ctx.Done():
				return
			case <-time.After(c.sseRetry):
			}
		}
	}
}

func (c *Client) connectSSE() error {
	u := fmt.Sprintf("%s/v1/stream/%s?api_key=%s",
		c.baseURL,
		url.PathEscape(c.envKey),
		url.QueryEscape(c.sdkKey))

	req, err := http.NewRequestWithContext(c.ctx, http.MethodGet, u, nil)
	if err != nil {
		return err
	}
	req.Header.Set("Accept", "text/event-stream")
	req.Header.Set("Cache-Control", "no-cache")

	resp, err := c.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("SSE connect: %w", err)
	}
	defer resp.Body.Close()

	if resp.StatusCode != http.StatusOK {
		body, readErr := io.ReadAll(resp.Body)
		if readErr != nil {
			c.logger.Warn("failed to read SSE error response body", "error", readErr)
		}
		return fmt.Errorf("SSE connect: status %d: %s", resp.StatusCode, string(body))
	}

	scanner := bufio.NewScanner(resp.Body)
	var eventType string
	for scanner.Scan() {
		line := scanner.Text()

		if strings.HasPrefix(line, "event:") {
			eventType = strings.TrimSpace(strings.TrimPrefix(line, "event:"))
			continue
		}

		if strings.HasPrefix(line, "data:") {
			if eventType == "flag-update" {
				if err := c.refresh(c.ctx); err != nil {
					c.logError("refresh after SSE event failed", err)
				}
			}
			eventType = ""
			continue
		}
	}

	return scanner.Err()
}

func (c *Client) logError(msg string, err error) {
	c.logger.Error("[featuresignals] "+msg, "error", err)
	if c.onError != nil {
		c.onError(err)
	}
	c.emitClientEvent(clientEvent{kind: clientEventError, err: err})
	// Also route to anomaly detector for drift detection if it's a connection failure.
	// The detector doesn't track connection errors directly, but recordMissing
	// is called per-flag on the evaluation path when flags aren't found.
}
