package webhook

import (
	"context"
	"fmt"
	"log/slog"
	"os"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type notifierMockStore struct{}

func (m *notifierMockStore) ListWebhooks(ctx context.Context, orgID string) ([]domain.Webhook, error) {
	return nil, nil
}
func (m *notifierMockStore) CreateWebhookDelivery(ctx context.Context, d *domain.WebhookDelivery) error {
	return nil
}

type mockOrgResolver struct {
	orgID string
	err   error
}

func (r *mockOrgResolver) ResolveOrgIDByEnvID(ctx context.Context, envID string) (string, error) {
	return r.orgID, r.err
}

func TestNotifyFlagChange_EnqueuesEvent(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	d := NewDispatcher(&notifierMockStore{}, logger, nil)
	resolver := &mockOrgResolver{orgID: "org-123"}
	n := NewNotifier(d, resolver)

	n.NotifyFlagChange(context.Background(), "env-1", "flag-1", "updated")

	select {
	case evt := <-d.events:
		if evt.Type != "flag.updated" {
			t.Errorf("expected event type 'flag.updated', got '%s'", evt.Type)
		}
		if evt.OrgID != "org-123" {
			t.Errorf("expected orgID 'org-123', got '%s'", evt.OrgID)
		}
		if evt.FlagID != "flag-1" {
			t.Errorf("expected flagID 'flag-1', got '%s'", evt.FlagID)
		}
		if evt.EnvID != "env-1" {
			t.Errorf("expected envID 'env-1', got '%s'", evt.EnvID)
		}
	case <-time.After(time.Second):
		t.Error("event was not enqueued")
	}
}

func TestNotifyFlagChange_ResolverFailure(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	d := NewDispatcher(&notifierMockStore{}, logger, nil)
	resolver := &mockOrgResolver{err: fmt.Errorf("not found")}
	n := NewNotifier(d, resolver)

	n.NotifyFlagChange(context.Background(), "env-1", "flag-1", "created")

	select {
	case evt := <-d.events:
		if evt.OrgID != "" {
			t.Errorf("expected empty orgID on resolver failure, got '%s'", evt.OrgID)
		}
		if evt.Type != "flag.created" {
			t.Errorf("expected 'flag.created', got '%s'", evt.Type)
		}
	case <-time.After(time.Second):
		t.Error("event was not enqueued")
	}
}

func TestNotifyFlagChange_NilResolver(t *testing.T) {
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	d := NewDispatcher(&notifierMockStore{}, logger, nil)
	n := NewNotifier(d, nil)

	n.NotifyFlagChange(context.Background(), "env-1", "flag-1", "deleted")

	select {
	case evt := <-d.events:
		if evt.OrgID != "" {
			t.Errorf("expected empty orgID with nil resolver, got '%s'", evt.OrgID)
		}
	case <-time.After(time.Second):
		t.Error("event was not enqueued")
	}
}
