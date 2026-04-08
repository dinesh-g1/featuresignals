package webhook

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type mockWebhookStore struct {
	mu         sync.Mutex
	webhooks   []domain.Webhook
	deliveries []domain.WebhookDelivery
}

func (m *mockWebhookStore) ListWebhooks(ctx context.Context, orgID string) ([]domain.Webhook, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var result []domain.Webhook
	for _, w := range m.webhooks {
		if w.OrgID == orgID {
			result = append(result, w)
		}
	}
	return result, nil
}

func (m *mockWebhookStore) CreateWebhookDelivery(ctx context.Context, d *domain.WebhookDelivery) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	d.ID = "del-1"
	d.DeliveredAt = time.Now()
	m.deliveries = append(m.deliveries, *d)
	return nil
}

func TestDispatcher_DeliverSuccess(t *testing.T) {
	var received []byte
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		buf := make([]byte, 8192)
		n, _ := r.Body.Read(buf)
		received = buf[:n]
		w.WriteHeader(200)
		w.Write([]byte("ok"))
	}))
	defer srv.Close()

	store := &mockWebhookStore{
		webhooks: []domain.Webhook{
			{ID: "wh-1", OrgID: "org-1", Name: "Test", URL: srv.URL, Secret: "mysecret", Events: []string{"flag.updated"}, Enabled: true},
		},
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	d := NewDispatcher(store, logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	d.Start(ctx)

	d.Enqueue(Event{
		Type:   "flag.updated",
		OrgID:  "org-1",
		EnvID:  "env-1",
		FlagID: "flag-1",
		Action: "updated",
		SentAt: time.Now(),
	})

	time.Sleep(500 * time.Millisecond)

	store.mu.Lock()
	defer store.mu.Unlock()
	if len(store.deliveries) != 1 {
		t.Fatalf("expected 1 delivery, got %d", len(store.deliveries))
	}
	if !store.deliveries[0].Success {
		t.Error("expected delivery success=true")
	}
	if store.deliveries[0].ResponseStatus != 200 {
		t.Errorf("expected status 200, got %d", store.deliveries[0].ResponseStatus)
	}

	var evt Event
	json.Unmarshal(received, &evt)
	if evt.Type != "flag.updated" {
		t.Errorf("expected event type flag.updated, got %s", evt.Type)
	}
}

func TestDispatcher_RetryOn500(t *testing.T) {
	attempts := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		if attempts < 3 {
			w.WriteHeader(500)
			w.Write([]byte("error"))
			return
		}
		w.WriteHeader(200)
		w.Write([]byte("ok"))
	}))
	defer srv.Close()

	store := &mockWebhookStore{
		webhooks: []domain.Webhook{
			{ID: "wh-2", OrgID: "org-1", Name: "Retry", URL: srv.URL, Events: []string{"*"}, Enabled: true},
		},
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	d := NewDispatcher(store, logger)
	d.maxRetries = 3

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	d.Start(ctx)

	d.Enqueue(Event{Type: "flag.created", OrgID: "org-1", SentAt: time.Now()})

	time.Sleep(8 * time.Second)

	store.mu.Lock()
	defer store.mu.Unlock()
	if len(store.deliveries) != 1 {
		t.Fatalf("expected 1 delivery, got %d", len(store.deliveries))
	}
	if !store.deliveries[0].Success {
		t.Errorf("expected success after retries")
	}
	if attempts != 3 {
		t.Errorf("expected 3 attempts, got %d", attempts)
	}
}

func TestDispatcher_EventFilter(t *testing.T) {
	store := &mockWebhookStore{
		webhooks: []domain.Webhook{
			{ID: "wh-3", OrgID: "org-1", Name: "Only Created", URL: "http://localhost:1", Events: []string{"flag.created"}, Enabled: true},
		},
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	d := NewDispatcher(store, logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	d.Start(ctx)

	d.Enqueue(Event{Type: "flag.deleted", OrgID: "org-1", SentAt: time.Now()})
	time.Sleep(300 * time.Millisecond)

	store.mu.Lock()
	defer store.mu.Unlock()
	if len(store.deliveries) != 0 {
		t.Errorf("expected 0 deliveries (event filtered), got %d", len(store.deliveries))
	}
}

func TestDispatcher_DisabledWebhook(t *testing.T) {
	store := &mockWebhookStore{
		webhooks: []domain.Webhook{
			{ID: "wh-4", OrgID: "org-1", Name: "Disabled", URL: "http://localhost:1", Events: []string{"*"}, Enabled: false},
		},
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	d := NewDispatcher(store, logger)

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	d.Start(ctx)

	d.Enqueue(Event{Type: "flag.updated", OrgID: "org-1", SentAt: time.Now()})
	time.Sleep(300 * time.Millisecond)

	store.mu.Lock()
	defer store.mu.Unlock()
	if len(store.deliveries) != 0 {
		t.Errorf("expected 0 deliveries (disabled webhook), got %d", len(store.deliveries))
	}
}

func TestDispatcher_NoRetryOn4xx(t *testing.T) {
	var attempts int
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		attempts++
		w.WriteHeader(http.StatusNotFound)
		w.Write([]byte("not found"))
	}))
	defer srv.Close()

	store := &mockWebhookStore{
		webhooks: []domain.Webhook{
			{ID: "wh-4xx", OrgID: "org-1", Name: "NotFound", URL: srv.URL, Events: []string{"*"}, Enabled: true},
		},
	}

	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	d := NewDispatcher(store, logger)
	d.maxRetries = 3

	ctx, cancel := context.WithCancel(context.Background())
	defer cancel()
	d.Start(ctx)

	d.Enqueue(Event{Type: "flag.created", OrgID: "org-1", SentAt: time.Now()})

	time.Sleep(1 * time.Second)

	store.mu.Lock()
	defer store.mu.Unlock()
	if attempts != 1 {
		t.Errorf("expected exactly 1 attempt for 4xx (no retries), got %d", attempts)
	}
	if len(store.deliveries) != 1 {
		t.Fatalf("expected 1 delivery record, got %d", len(store.deliveries))
	}
	if store.deliveries[0].Success {
		t.Error("expected delivery success=false for 4xx")
	}
}

func TestSign(t *testing.T) {
	payload := []byte(`{"type":"flag.updated"}`)
	sig := sign(payload, "secret")
	if sig[:7] != "sha256=" {
		t.Error("expected sha256= prefix")
	}
	if len(sig) != 7+64 {
		t.Errorf("expected 71 chars, got %d", len(sig))
	}
}
