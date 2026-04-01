package sse

import (
	"context"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

func newTestServer() *Server {
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	return NewServer(logger)
}

func TestNewServer(t *testing.T) {
	s := newTestServer()
	if s == nil {
		t.Fatal("expected non-nil server")
	}
	if s.clients == nil {
		t.Error("expected initialized clients map")
	}
}

func TestClientCount_Empty(t *testing.T) {
	s := newTestServer()
	if s.ClientCount("env-1") != 0 {
		t.Error("expected 0 clients for new environment")
	}
}

func TestAddRemoveClient(t *testing.T) {
	s := newTestServer()

	c := &Client{envID: "env-1", events: make(chan []byte, 64)}
	s.addClient(c)

	if s.ClientCount("env-1") != 1 {
		t.Errorf("expected 1 client, got %d", s.ClientCount("env-1"))
	}

	s.removeClient(c)

	if s.ClientCount("env-1") != 0 {
		t.Errorf("expected 0 clients after remove, got %d", s.ClientCount("env-1"))
	}
}

func TestMultipleClients(t *testing.T) {
	s := newTestServer()

	c1 := &Client{envID: "env-1", events: make(chan []byte, 64)}
	c2 := &Client{envID: "env-1", events: make(chan []byte, 64)}
	c3 := &Client{envID: "env-2", events: make(chan []byte, 64)}

	s.addClient(c1)
	s.addClient(c2)
	s.addClient(c3)

	if s.ClientCount("env-1") != 2 {
		t.Errorf("expected 2 clients for env-1, got %d", s.ClientCount("env-1"))
	}
	if s.ClientCount("env-2") != 1 {
		t.Errorf("expected 1 client for env-2, got %d", s.ClientCount("env-2"))
	}

	s.removeClient(c1)
	if s.ClientCount("env-1") != 1 {
		t.Errorf("expected 1 client for env-1 after remove, got %d", s.ClientCount("env-1"))
	}
}

func TestBroadcastFlagUpdate(t *testing.T) {
	s := newTestServer()

	c1 := &Client{envID: "env-1", events: make(chan []byte, 64)}
	c2 := &Client{envID: "env-1", events: make(chan []byte, 64)}
	c3 := &Client{envID: "env-2", events: make(chan []byte, 64)}

	s.addClient(c1)
	s.addClient(c2)
	s.addClient(c3)

	s.BroadcastFlagUpdate("env-1", map[string]string{"flag_key": "feature-x"})

	// env-1 clients should receive the event
	select {
	case msg := <-c1.events:
		if !strings.Contains(string(msg), "feature-x") {
			t.Errorf("expected feature-x in message, got %s", string(msg))
		}
	default:
		t.Error("expected c1 to receive broadcast")
	}

	select {
	case msg := <-c2.events:
		if !strings.Contains(string(msg), "feature-x") {
			t.Errorf("expected feature-x in message, got %s", string(msg))
		}
	default:
		t.Error("expected c2 to receive broadcast")
	}

	// env-2 client should NOT receive
	select {
	case <-c3.events:
		t.Error("env-2 client should not receive env-1 broadcast")
	default:
		// expected
	}

	// Cleanup
	s.removeClient(c1)
	s.removeClient(c2)
	s.removeClient(c3)
}

func TestBroadcastFlagUpdate_NoClients(t *testing.T) {
	s := newTestServer()
	// Should not panic
	s.BroadcastFlagUpdate("nonexistent-env", map[string]string{"test": "data"})
}

func TestBroadcastFlagUpdate_FullBuffer(t *testing.T) {
	s := newTestServer()
	c := &Client{envID: "env-1", events: make(chan []byte, 1)} // tiny buffer
	s.addClient(c)

	// Fill the buffer
	s.BroadcastFlagUpdate("env-1", map[string]string{"msg": "1"})
	// Second should be dropped without panic
	s.BroadcastFlagUpdate("env-1", map[string]string{"msg": "2"})

	s.removeClient(c)
}

func TestHandleStream(t *testing.T) {
	s := newTestServer()

	ctx, cancel := context.WithTimeout(context.Background(), 100*time.Millisecond)
	defer cancel()

	r := httptest.NewRequest("GET", "/stream/env-1", nil).WithContext(ctx)
	w := httptest.NewRecorder()

	var wg sync.WaitGroup
	wg.Add(1)
	go func() {
		defer wg.Done()
		s.HandleStream(w, r, "env-1")
	}()

	// Brief delay to let the handler start
	time.Sleep(10 * time.Millisecond)

	if s.ClientCount("env-1") != 1 {
		t.Errorf("expected 1 client during stream, got %d", s.ClientCount("env-1"))
	}

	// Wait for context to expire
	wg.Wait()

	// Client should be removed after disconnect
	if s.ClientCount("env-1") != 0 {
		t.Errorf("expected 0 clients after disconnect, got %d", s.ClientCount("env-1"))
	}

	body := w.Body.String()
	if !strings.Contains(body, "event: connected") {
		t.Error("expected 'event: connected' in response")
	}
	if !strings.Contains(body, `"env_id":"env-1"`) {
		t.Error("expected env_id in connected event")
	}

	ct := w.Header().Get("Content-Type")
	if ct != "text/event-stream" {
		t.Errorf("expected Content-Type text/event-stream, got %s", ct)
	}
}

func TestHandleStream_NonFlusher(t *testing.T) {
	s := newTestServer()

	r := httptest.NewRequest("GET", "/stream/env-1", nil)
	w := &nonFlusherWriter{ResponseWriter: httptest.NewRecorder()}

	s.HandleStream(w, r, "env-1")

	if w.ResponseWriter.(*httptest.ResponseRecorder).Code != http.StatusInternalServerError {
		t.Error("expected 500 for non-flusher writer")
	}
}

// nonFlusherWriter wraps ResponseWriter without implementing http.Flusher
type nonFlusherWriter struct {
	http.ResponseWriter
}

func TestConcurrentBroadcast(t *testing.T) {
	s := newTestServer()

	clients := make([]*Client, 10)
	for i := range clients {
		clients[i] = &Client{envID: "env-1", events: make(chan []byte, 100)}
		s.addClient(clients[i])
	}

	var wg sync.WaitGroup
	for i := 0; i < 50; i++ {
		wg.Add(1)
		go func(i int) {
			defer wg.Done()
			s.BroadcastFlagUpdate("env-1", map[string]int{"seq": i})
		}(i)
	}
	wg.Wait()

	for i, c := range clients {
		count := len(c.events)
		if count != 50 {
			t.Errorf("client %d: expected 50 events, got %d", i, count)
		}
		s.removeClient(c)
	}
}
