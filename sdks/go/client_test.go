package featuresignals

import (
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func flagServer(flags map[string]interface{}) *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Header.Get("X-API-Key") == "" && r.URL.Query().Get("api_key") == "" {
			http.Error(w, "unauthorized", http.StatusUnauthorized)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(flags)
	}))
}

func testLogger() *slog.Logger {
	return slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
}

func TestNewClient_FetchesFlags(t *testing.T) {
	srv := flagServer(map[string]interface{}{"dark-mode": true, "limit": 42.0})
	defer srv.Close()

	c := NewClient("test-key", "production",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
	)
	defer c.Close()

	if !c.IsReady() {
		t.Fatal("client should be ready after initial fetch")
	}
	if c.BoolVariation("dark-mode", NewContext("u1"), false) != true {
		t.Error("expected dark-mode=true")
	}
	if c.NumberVariation("limit", NewContext("u1"), 0) != 42.0 {
		t.Error("expected limit=42")
	}
}

func TestNewClient_ReadyChannel(t *testing.T) {
	srv := flagServer(map[string]interface{}{"f": true})
	defer srv.Close()

	c := NewClient("key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
	)
	defer c.Close()

	select {
	case <-c.Ready():
	case <-time.After(time.Second):
		t.Fatal("ready channel not closed")
	}
}

func TestBoolVariation_Fallback(t *testing.T) {
	srv := flagServer(map[string]interface{}{"flag-a": "not-a-bool"})
	defer srv.Close()

	c := NewClient("key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
	)
	defer c.Close()

	if c.BoolVariation("missing", NewContext("u"), true) != true {
		t.Error("expected fallback for missing flag")
	}
	if c.BoolVariation("flag-a", NewContext("u"), true) != true {
		t.Error("expected fallback for wrong-type flag")
	}
}

func TestStringVariation(t *testing.T) {
	srv := flagServer(map[string]interface{}{"banner": "hello"})
	defer srv.Close()

	c := NewClient("key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
	)
	defer c.Close()

	if c.StringVariation("banner", NewContext("u"), "default") != "hello" {
		t.Error("expected hello")
	}
	if c.StringVariation("missing", NewContext("u"), "default") != "default" {
		t.Error("expected default for missing")
	}
}

func TestNumberVariation(t *testing.T) {
	srv := flagServer(map[string]interface{}{"rate": 99.5})
	defer srv.Close()

	c := NewClient("key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
	)
	defer c.Close()

	if c.NumberVariation("rate", NewContext("u"), 0) != 99.5 {
		t.Error("expected 99.5")
	}
	if c.NumberVariation("missing", NewContext("u"), -1) != -1 {
		t.Error("expected fallback")
	}
}

func TestJSONVariation(t *testing.T) {
	cfg := map[string]interface{}{"nested": true}
	srv := flagServer(map[string]interface{}{"config": cfg})
	defer srv.Close()

	c := NewClient("key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
	)
	defer c.Close()

	v := c.JSONVariation("config", NewContext("u"), nil)
	m, ok := v.(map[string]interface{})
	if !ok {
		t.Fatalf("expected map, got %T", v)
	}
	if m["nested"] != true {
		t.Error("expected nested=true")
	}
	if c.JSONVariation("nope", NewContext("u"), "fb") != "fb" {
		t.Error("expected fallback")
	}
}

func TestAllFlags(t *testing.T) {
	srv := flagServer(map[string]interface{}{"a": true, "b": "x"})
	defer srv.Close()

	c := NewClient("key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
	)
	defer c.Close()

	all := c.AllFlags()
	if len(all) != 2 {
		t.Errorf("expected 2 flags, got %d", len(all))
	}
	if all["a"] != true || all["b"] != "x" {
		t.Error("flag values mismatch")
	}
}

func TestClient_InvalidAPIKey(t *testing.T) {
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		http.Error(w, "unauthorized", http.StatusUnauthorized)
	}))
	defer srv.Close()

	var errCalled atomic.Bool
	c := NewClient("bad-key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
		WithOnError(func(err error) { errCalled.Store(true) }),
	)
	defer c.Close()

	if c.IsReady() {
		t.Error("should not be ready after failed fetch")
	}
	if !errCalled.Load() {
		t.Error("onError should have been called")
	}
	if c.BoolVariation("any", NewContext("u"), true) != true {
		t.Error("should return fallback when not ready")
	}
}

func TestClient_ServerDown(t *testing.T) {
	c := NewClient("key", "prod",
		WithBaseURL("http://127.0.0.1:1"),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
	)
	defer c.Close()

	if c.IsReady() {
		t.Error("should not be ready if server is unreachable")
	}
}

func TestClient_Close_StopsPolling(t *testing.T) {
	var fetchCount atomic.Int32
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		fetchCount.Add(1)
		json.NewEncoder(w).Encode(map[string]interface{}{"f": true})
	}))
	defer srv.Close()

	c := NewClient("key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(50*time.Millisecond),
	)

	time.Sleep(200 * time.Millisecond)
	c.Close()
	countAtClose := fetchCount.Load()
	time.Sleep(200 * time.Millisecond)

	if fetchCount.Load() > countAtClose+1 {
		t.Error("polling should have stopped after Close()")
	}
}

func TestClient_PollingUpdatesFlags(t *testing.T) {
	var mu sync.Mutex
	flags := map[string]interface{}{"v": 1.0}

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		json.NewEncoder(w).Encode(flags)
	}))
	defer srv.Close()

	c := NewClient("key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(50*time.Millisecond),
	)
	defer c.Close()

	if c.NumberVariation("v", NewContext("u"), 0) != 1.0 {
		t.Fatal("expected initial value 1.0")
	}

	mu.Lock()
	flags["v"] = 2.0
	mu.Unlock()

	time.Sleep(200 * time.Millisecond)

	if c.NumberVariation("v", NewContext("u"), 0) != 2.0 {
		t.Error("expected updated value 2.0 after polling")
	}
}

func TestClient_OnReadyCallback(t *testing.T) {
	srv := flagServer(map[string]interface{}{"f": true})
	defer srv.Close()

	var called atomic.Bool
	c := NewClient("key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
		WithOnReady(func() { called.Store(true) }),
	)
	defer c.Close()

	if !called.Load() {
		t.Error("onReady should have been called")
	}
}

func TestClient_OnUpdateCallback(t *testing.T) {
	srv := flagServer(map[string]interface{}{"f": true})
	defer srv.Close()

	var updated atomic.Bool
	c := NewClient("key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
		WithOnUpdate(func(flags map[string]interface{}) { updated.Store(true) }),
	)
	defer c.Close()

	if !updated.Load() {
		t.Error("onUpdate should have been called on initial fetch")
	}
}

func TestClient_SSE_RefreshesOnEvent(t *testing.T) {
	var mu sync.Mutex
	flags := map[string]interface{}{"v": 1.0}
	var sseWriter http.Flusher

	mux := http.NewServeMux()
	mux.HandleFunc("/v1/client/prod/flags", func(w http.ResponseWriter, r *http.Request) {
		mu.Lock()
		defer mu.Unlock()
		json.NewEncoder(w).Encode(flags)
	})
	mux.HandleFunc("/v1/stream/prod", func(w http.ResponseWriter, r *http.Request) {
		flusher, ok := w.(http.Flusher)
		if !ok {
			http.Error(w, "no flusher", 500)
			return
		}
		w.Header().Set("Content-Type", "text/event-stream")
		w.Header().Set("Cache-Control", "no-cache")
		w.WriteHeader(http.StatusOK)
		flusher.Flush()
		sseWriter = flusher

		fmt.Fprintf(w, "event: connected\ndata: {}\n\n")
		flusher.Flush()

		time.Sleep(100 * time.Millisecond)
		mu.Lock()
		flags["v"] = 99.0
		mu.Unlock()

		fmt.Fprintf(w, "event: flag_update\ndata: {\"flag_key\":\"v\"}\n\n")
		flusher.Flush()

		time.Sleep(500 * time.Millisecond)
	})

	srv := httptest.NewServer(mux)
	defer srv.Close()

	c := NewClient("test-key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithSSE(true),
		WithSSERetryInterval(50*time.Millisecond),
	)
	defer c.Close()

	_ = sseWriter
	time.Sleep(400 * time.Millisecond)

	if v := c.NumberVariation("v", NewContext("u"), 0); v != 99.0 {
		t.Errorf("expected 99.0 after SSE event, got %v", v)
	}
}

func TestClient_RequestIncludesAPIKey(t *testing.T) {
	var receivedKey string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedKey = r.Header.Get("X-API-Key")
		json.NewEncoder(w).Encode(map[string]interface{}{})
	}))
	defer srv.Close()

	c := NewClient("my-secret-key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
	)
	defer c.Close()

	if receivedKey != "my-secret-key" {
		t.Errorf("expected API key 'my-secret-key', got '%s'", receivedKey)
	}
}

func TestClient_RequestIncludesUserKey(t *testing.T) {
	var receivedPath string
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		receivedPath = r.URL.RequestURI()
		json.NewEncoder(w).Encode(map[string]interface{}{})
	}))
	defer srv.Close()

	c := NewClient("key", "my-env",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
		WithContext(NewContext("user-42")),
	)
	defer c.Close()

	if receivedPath != "/v1/client/my-env/flags?key=user-42" {
		t.Errorf("unexpected request path: %s", receivedPath)
	}
}

func TestClient_ConcurrentReads(t *testing.T) {
	srv := flagServer(map[string]interface{}{"f": true, "n": 10.0})
	defer srv.Close()

	c := NewClient("key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
	)
	defer c.Close()

	var wg sync.WaitGroup
	for i := 0; i < 100; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			c.BoolVariation("f", NewContext("u"), false)
			c.NumberVariation("n", NewContext("u"), 0)
			c.AllFlags()
			c.IsReady()
		}()
	}
	wg.Wait()
}

func TestEvalContext_WithAttribute(t *testing.T) {
	ctx := NewContext("u1").
		WithAttribute("plan", "pro").
		WithAttribute("country", "US")

	if ctx.Key != "u1" {
		t.Errorf("expected key u1, got %s", ctx.Key)
	}
	if ctx.Attributes["plan"] != "pro" {
		t.Error("expected plan=pro")
	}
	if ctx.Attributes["country"] != "US" {
		t.Error("expected country=US")
	}
}

func TestEvalContext_WithAttribute_DoesNotMutateOriginal(t *testing.T) {
	ctx1 := NewContext("u1").WithAttribute("a", "1")
	ctx2 := ctx1.WithAttribute("b", "2")

	if _, ok := ctx1.Attributes["b"]; ok {
		t.Error("original context should not have attribute 'b'")
	}
	if ctx2.Attributes["a"] != "1" || ctx2.Attributes["b"] != "2" {
		t.Error("new context should have both attributes")
	}
}

func TestClient_Close_Idempotent(t *testing.T) {
	srv := flagServer(map[string]interface{}{})
	defer srv.Close()

	c := NewClient("key", "prod",
		WithBaseURL(srv.URL),
		WithLogger(testLogger()),
		WithPollingInterval(time.Hour),
	)

	c.Close()
	c.Close()
	c.Close()
}
