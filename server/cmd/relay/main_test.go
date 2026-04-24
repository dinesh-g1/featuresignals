// Package main tests the relay proxy with Redis Pub/Sub integration.
//
// These tests use mocks for both the Redis client and the upstream API,
// so no external dependencies are required. Run with:
//
//	go test ./cmd/relay/ -v
package main

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/events"
)

// ─── Mocks ───────────────────────────────────────────────────────────────────

// mockRedisClient implements events.RedisClient for testing. It records
// publishes and injects messages into subscriptions.
type mockRedisClient struct {
	mu           sync.Mutex
	published    []publishCall
	subscription *mockSubscription
	onClose      func() error
}

type publishCall struct {
	Channel string
	Message any
}

func newMockRedisClient() *mockRedisClient {
	return &mockRedisClient{
		subscription: newMockSubscription(),
	}
}

func (c *mockRedisClient) Publish(_ context.Context, channel string, message any) error {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.published = append(c.published, publishCall{Channel: channel, Message: message})

	// Also deliver the message to the subscription channel so that
	// roundtrip publish→subscribe tests work with a single mock client.
	if msgStr, ok := message.(string); ok {
		c.subscription.inject([]byte(msgStr))
	}

	return nil
}

func (c *mockRedisClient) Subscribe(_ context.Context, channels ...string) (events.RedisSubscription, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	c.subscription.channels = append(c.subscription.channels, channels...)
	return c.subscription, nil
}

func (c *mockRedisClient) Close() error {
	if c.onClose != nil {
		return c.onClose()
	}
	return nil
}

// publishedMessages returns a copy of all publish calls for assertions.
func (c *mockRedisClient) publishedMessages() []publishCall {
	c.mu.Lock()
	defer c.mu.Unlock()
	cp := make([]publishCall, len(c.published))
	copy(cp, c.published)
	return cp
}

// mockSubscription implements events.RedisSubscription for testing. It allows
// tests to inject messages programmatically.
type mockSubscription struct {
	mu       sync.Mutex
	ch       chan *events.RedisMessage
	channels []string
	closed   bool
}

func newMockSubscription() *mockSubscription {
	return &mockSubscription{
		ch: make(chan *events.RedisMessage, 256),
	}
}

func (s *mockSubscription) Channel() <-chan *events.RedisMessage {
	return s.ch
}

func (s *mockSubscription) Close() error {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.closed {
		s.closed = true
		close(s.ch)
	}
	return nil
}

// inject enqueues a message for delivery to the subscriber.
func (s *mockSubscription) inject(payload []byte) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if !s.closed {
		s.ch <- &events.RedisMessage{
			Channel: events.RulesetChannel,
			Payload: payload,
		}
	}
}

// ─── Tests ──────────────────────────────────────────────────────────────────

func TestRulesetEvent_Unmarshal(t *testing.T) {
	tests := []struct {
		name    string
		json    string
		want    events.RulesetEvent
		wantErr bool
	}{
		{
			name: "full event with flag key",
			json: `{
				"org_id": "org_abc",
				"project_id": "proj_xyz",
				"env_id": "env_123",
				"updated_at": 1700000000,
				"type": "flag_toggled",
				"flag_key": "my-flag"
			}`,
			want: events.RulesetEvent{
				OrgID:     "org_abc",
				ProjectID: "proj_xyz",
				EnvID:     "env_123",
				UpdatedAt: 1700000000,
				Type:      events.FlagToggled,
				FlagKey:   "my-flag",
			},
		},
		{
			name: "ruleset updated without flag key",
			json: `{
				"org_id": "org_abc",
				"project_id": "proj_xyz",
				"env_id": "env_123",
				"updated_at": 1700000001,
				"type": "ruleset_updated"
			}`,
			want: events.RulesetEvent{
				OrgID:     "org_abc",
				ProjectID: "proj_xyz",
				EnvID:     "env_123",
				UpdatedAt: 1700000001,
				Type:      events.RulesetUpdated,
			},
		},
		{
			name: "flag deleted event",
			json: `{
				"org_id": "org_abc",
				"project_id": "proj_xyz",
				"env_id": "env_123",
				"updated_at": 1700000002,
				"type": "flag_deleted",
				"flag_key": "old-flag"
			}`,
			want: events.RulesetEvent{
				OrgID:     "org_abc",
				ProjectID: "proj_xyz",
				EnvID:     "env_123",
				UpdatedAt: 1700000002,
				Type:      events.FlagDeleted,
				FlagKey:   "old-flag",
			},
		},
		{
			name:    "malformed JSON",
			json:    `{bad json`,
			wantErr: true,
		},
		{
			name: "missing optional flag_key",
			json: `{
				"org_id": "org_abc",
				"project_id": "proj_xyz",
				"env_id": "env_123",
				"updated_at": 1700000003,
				"type": "flag_toggled"
			}`,
			want: events.RulesetEvent{
				OrgID:     "org_abc",
				ProjectID: "proj_xyz",
				EnvID:     "env_123",
				UpdatedAt: 1700000003,
				Type:      events.FlagToggled,
			},
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			var got events.RulesetEvent
			err := json.Unmarshal([]byte(tc.json), &got)
			if tc.wantErr {
				if err == nil {
					t.Error("expected error, got nil")
				}
				return
			}
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if got.OrgID != tc.want.OrgID {
				t.Errorf("OrgID = %q, want %q", got.OrgID, tc.want.OrgID)
			}
			if got.ProjectID != tc.want.ProjectID {
				t.Errorf("ProjectID = %q, want %q", got.ProjectID, tc.want.ProjectID)
			}
			if got.EnvID != tc.want.EnvID {
				t.Errorf("EnvID = %q, want %q", got.EnvID, tc.want.EnvID)
			}
			if got.UpdatedAt != tc.want.UpdatedAt {
				t.Errorf("UpdatedAt = %d, want %d", got.UpdatedAt, tc.want.UpdatedAt)
			}
			if got.Type != tc.want.Type {
				t.Errorf("Type = %q, want %q", got.Type, tc.want.Type)
			}
			if got.FlagKey != tc.want.FlagKey {
				t.Errorf("FlagKey = %q, want %q", got.FlagKey, tc.want.FlagKey)
			}
		})
	}
}

func TestRelayProxy_SyncTriggeredByRedisEvent(t *testing.T) {
	// ── Upstream mock API ─────────────────────────────────────────────────
	// Simulate the FeatureSignals API with a /v1/client/{envKey}/flags endpoint.
	var upstreamCallCount atomic.Int32
	upstream := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		upstreamCallCount.Add(1)
		if r.URL.Path != "/v1/client/test-env/flags" {
			t.Errorf("unexpected upstream path: %s", r.URL.Path)
		}
		if r.Header.Get("X-API-Key") != "test-api-key" {
			t.Errorf("missing or wrong X-API-Key header")
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"flag-a": map[string]interface{}{"enabled": true},
			"flag-b": map[string]interface{}{"enabled": false},
		})
	}))
	defer upstream.Close()

	// ── Relay proxy ──────────────────────────────────────────────────────
	proxy := &RelayProxy{
		apiKey:   "test-api-key",
		envKey:   "test-env",
		upstream: upstream.URL,
		http:     &http.Client{Timeout: 5 * time.Second},
		logger:   testLogger(t),
	}

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	// Initial sync.
	if err := proxy.Sync(ctx); err != nil {
		t.Fatalf("initial sync failed: %v", err)
	}
	if upstreamCallCount.Load() != 1 {
		t.Fatalf("expected 1 upstream call after initial sync, got %d", upstreamCallCount.Load())
	}
	if proxy.FlagCount() != 2 {
		t.Fatalf("expected 2 flags after initial sync, got %d", proxy.FlagCount())
	}

	// ── Mock Redis subscription ──────────────────────────────────────────
	mockClient := newMockRedisClient()
	subscriber := events.NewRedisSubscriber(
		func() (events.RedisClient, error) {
			return mockClient, nil
		},
		events.RulesetChannel,
		testLogger(t),
	)

	// Subscribe in background.
	var subErr error
	var subWg sync.WaitGroup
	subWg.Add(1)
	go func() {
		defer subWg.Done()
		subErr = subscriber.Listen(ctx, func(event events.RulesetEvent) {
			t.Logf("received ruleset event: type=%s org=%s flag=%s", event.Type, event.OrgID, event.FlagKey)
			if syncErr := proxy.Sync(ctx); syncErr != nil {
				t.Errorf("sync after event failed: %v", syncErr)
			}
		})
	}()

	// Give the subscriber a moment to connect.
	time.Sleep(50 * time.Millisecond)

	// ── Inject a ruleset update event ────────────────────────────────────
	event := events.RulesetEvent{
		OrgID:     "org_abc",
		ProjectID: "proj_xyz",
		EnvID:     "env_123",
		UpdatedAt: time.Now().Unix(),
		Type:      events.FlagToggled,
		FlagKey:   "flag-a",
	}
	payload, err := json.Marshal(event)
	if err != nil {
		t.Fatalf("marshal event: %v", err)
	}
	mockClient.subscription.inject(payload)

	// Wait for the subscriber to process and trigger sync.
	time.Sleep(200 * time.Millisecond)

	// ── Assertions ───────────────────────────────────────────────────────
	if upstreamCallCount.Load() != 2 {
		t.Errorf("expected 2 upstream calls (1 initial + 1 after event), got %d", upstreamCallCount.Load())
	}

	// Clean up.
	cancel()
	subWg.Wait()
	subscriber.Close()

	if subErr != nil && subErr != context.Canceled {
		t.Errorf("subscriber returned unexpected error: %v", subErr)
	}
}

func TestRedisSubscriber_ReconnectsOnConnectionLoss(t *testing.T) {
	// ── Setup ───────────────────────────────────────────────────────────
	// Use a client that fails the first two subscribe calls, then succeeds.
	attempt := &atomic.Int32{}
	clientFn := func() (events.RedisClient, error) {
		attempt.Add(1)
		if attempt.Load() <= 2 {
			// On first two attempts, return a client whose Subscribe fails.
			return &failingRedisClient{logger: testLogger(t)}, nil
		}
		return newMockRedisClient(), nil
	}

	subscriber := events.NewRedisSubscriber(clientFn, "", testLogger(t))
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()

	received := make(chan events.RulesetEvent, 1)

	go func() {
		subscriber.Listen(ctx, func(ev events.RulesetEvent) {
			received <- ev
		})
	}()

	// Wait for the subscriber to attempt reconnection with exponential backoff.
	// Each retry has ~1s base backoff + jitter, so with a 3-second wait we
	// should see at least 2 attempts (1 initial + 1 retry).
	time.Sleep(3 * time.Second)

	if attempt.Load() < 2 {
		t.Errorf("expected at least 2 client attempts (1 initial + 1 retry), got %d", attempt.Load())
	}
}

// failingRedisClient implements events.RedisClient but always fails on Subscribe.
type failingRedisClient struct {
	logger *slog.Logger
}

var _ events.RedisClient = (*failingRedisClient)(nil)

func (c *failingRedisClient) Publish(_ context.Context, _ string, _ any) error {
	return nil
}
func (c *failingRedisClient) Subscribe(_ context.Context, _ ...string) (events.RedisSubscription, error) {
	return nil, errors.New("simulated connection failure")
}
func (c *failingRedisClient) Close() error { return nil }

func TestRulesetEvent_RoundTripPublishSubscribe(t *testing.T) {
	// Verify that a RulesetEvent published via RedisPublisher is correctly
	// received and parsed by RedisSubscriber.
	client := newMockRedisClient()
	publisher := events.NewRedisPublisher(client, events.RulesetChannel, testLogger(t))
	subscriber := events.NewRedisSubscriber(
		func() (events.RedisClient, error) { return client, nil },
		events.RulesetChannel,
		testLogger(t),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	// Start subscriber.
	received := make(chan events.RulesetEvent, 1)
	go func() {
		subscriber.Listen(ctx, func(ev events.RulesetEvent) {
			received <- ev
		})
	}()

	time.Sleep(50 * time.Millisecond)

	// Publish an event.
	want := events.RulesetEvent{
		OrgID:     "org_roundtrip",
		ProjectID: "proj_roundtrip",
		EnvID:     "env_roundtrip",
		UpdatedAt: 1700000123,
		Type:      events.FlagDeleted,
		FlagKey:   "flag-to-delete",
	}

	if err := publisher.PublishRulesetUpdate(ctx, want); err != nil {
		t.Fatalf("publish: %v", err)
	}

	// The mock subscription is bi-directionally wired: the publisher writes
	// to the same mock client, and the subscriber reads from the same
	// subscription. After publish, the mock client's subscription channel
	// should have the message.
	select {
	case got := <-received:
		if got.OrgID != want.OrgID {
			t.Errorf("OrgID = %q, want %q", got.OrgID, want.OrgID)
		}
		if got.Type != want.Type {
			t.Errorf("Type = %q, want %q", got.Type, want.Type)
		}
		if got.FlagKey != want.FlagKey {
			t.Errorf("FlagKey = %q, want %q", got.FlagKey, want.FlagKey)
		}
		if got.UpdatedAt != want.UpdatedAt {
			t.Errorf("UpdatedAt = %d, want %d", got.UpdatedAt, want.UpdatedAt)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timed out waiting for event delivery")
	}

	cancel()
	subscriber.Close()
	publisher.Close()
}

func TestDefaultConnectRedis_NoOpWhenURLIsEmpty(t *testing.T) {
	// Verify that the default Redis wire function returns a no-op client
	// when the URL is empty.
	if connectRedis == nil {
		t.Fatal("connectRedis is nil — wire init may not have run")
	}

	client := connectRedis("", testLogger(t))
	if _, ok := client.(*events.NoopRedisClient); !ok {
		t.Errorf("expected *events.NoopRedisClient, got %T", client)
	}
}

func TestDefaultConnectRedis_WarnsWhenURLIsSetWithoutRedisDriver(t *testing.T) {
	// Verify that when a non-empty URL is provided but no real Redis driver
	// is compiled in, the function returns a no-op client.
	if connectRedis == nil {
		t.Fatal("connectRedis is nil — wire init may not have run")
	}

	client := connectRedis("redis://localhost:6379/0", testLogger(t))
	if _, ok := client.(*events.NoopRedisClient); !ok {
		t.Errorf("expected *events.NoopRedisClient for non-empty URL without driver, got %T", client)
	}
}

func TestRelayProxy_HealthEndpoint_Ready(t *testing.T) {
	proxy := &RelayProxy{
		flags: map[string]interface{}{"flag-a": true},
		ready: true,
	}

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	proxy.HandleHealth(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var body map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&body)
	resp.Body.Close()

	if body["status"] != "ok" {
		t.Errorf("expected status 'ok', got %v", body["status"])
	}
	if body["flags"] != float64(1) {
		t.Errorf("expected flags 1, got %v", body["flags"])
	}
}

func TestRelayProxy_HealthEndpoint_NotReady(t *testing.T) {
	proxy := &RelayProxy{
		ready: false,
		flags: nil,
	}

	req := httptest.NewRequest("GET", "/health", nil)
	w := httptest.NewRecorder()
	proxy.HandleHealth(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusServiceUnavailable {
		t.Errorf("expected 503, got %d", resp.StatusCode)
	}

	var body map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&body)
	resp.Body.Close()

	if body["status"] != "not_ready" {
		t.Errorf("expected status 'not_ready', got %v", body["status"])
	}
}

func TestRelayProxy_HandleFlags(t *testing.T) {
	proxy := &RelayProxy{
		flags: map[string]interface{}{
			"flag-a": map[string]interface{}{"enabled": true},
			"flag-b": map[string]interface{}{"enabled": false},
		},
		ready: true,
	}

	req := httptest.NewRequest("GET", "/v1/client/prod/flags", nil)
	w := httptest.NewRecorder()
	proxy.HandleFlags(w, req)

	resp := w.Result()
	if resp.StatusCode != http.StatusOK {
		t.Errorf("expected 200, got %d", resp.StatusCode)
	}

	var body map[string]interface{}
	json.NewDecoder(resp.Body).Decode(&body)
	resp.Body.Close()

	if len(body) != 2 {
		t.Errorf("expected 2 flags, got %d", len(body))
	}
}

func TestRedisSubscriber_IgnoresMalformedMessages(t *testing.T) {
	client := newMockRedisClient()
	subscriber := events.NewRedisSubscriber(
		func() (events.RedisClient, error) { return client, nil },
		events.RulesetChannel,
		testLogger(t),
	)

	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()

	received := make(chan events.RulesetEvent, 1)

	go func() {
		subscriber.Listen(ctx, func(ev events.RulesetEvent) {
			received <- ev
		})
	}()

	time.Sleep(50 * time.Millisecond)

	// Inject a malformed message (not valid JSON).
	client.subscription.inject([]byte(`not json`))

	// Inject an empty JSON object (missing required fields).
	client.subscription.inject([]byte(`{}`))

	// Inject a valid event.
	validEvent := events.RulesetEvent{
		OrgID:     "org_valid",
		ProjectID: "proj_valid",
		EnvID:     "env_valid",
		UpdatedAt: time.Now().Unix(),
		Type:      events.RulesetUpdated,
	}
	payload, _ := json.Marshal(validEvent)
	client.subscription.inject(payload)

	// We should only receive the valid event.
	select {
	case got := <-received:
		if got.OrgID != "org_valid" {
			t.Errorf("expected org_valid, got %q", got.OrgID)
		}
	case <-time.After(1 * time.Second):
		t.Fatal("timed out waiting for valid event — malformed messages may have broken the subscription")
	}

	// Ensure no extra events were delivered (malformed ones must be ignored).
	select {
	case <-received:
		t.Error("received unexpected extra event after valid one")
	case <-time.After(200 * time.Millisecond):
		// Expected — no extra events.
	}

	cancel()
	subscriber.Close()
}

// testLogger returns a *slog.Logger that routes through t.Log for test output.
func testLogger(t *testing.T) *slog.Logger {
	t.Helper()
	return slog.New(slog.NewTextHandler(testWriter{t}, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

type testWriter struct{ t *testing.T }

func (w testWriter) Write(p []byte) (int, error) {
	w.t.Log(string(p))
	return len(p), nil
}