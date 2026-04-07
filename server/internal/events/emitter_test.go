package events

import (
	"context"
	"sync"
	"testing"
	"time"

	"log/slog"

	"github.com/featuresignals/server/internal/domain"
)

type spyEventStore struct {
	mu     sync.Mutex
	events []domain.ProductEvent
}

func (s *spyEventStore) InsertProductEvent(_ context.Context, event *domain.ProductEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append(s.events, *event)
	return nil
}

func (s *spyEventStore) InsertProductEvents(_ context.Context, evts []domain.ProductEvent) error {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.events = append(s.events, evts...)
	return nil
}

func (s *spyEventStore) CountEventsByOrg(_ context.Context, _, _ string, _ time.Time) (int, error) {
	return 0, nil
}

func (s *spyEventStore) CountEventsByUser(_ context.Context, _, _ string, _ time.Time) (int, error) {
	return 0, nil
}
func (s *spyEventStore) CountEventsByCategory(_ context.Context, _ string, _ time.Time) (int, error) {
	return 0, nil
}
func (s *spyEventStore) CountDistinctOrgs(_ context.Context, _ string, _ time.Time) (int, error) {
	return 0, nil
}
func (s *spyEventStore) CountDistinctUsers(_ context.Context, _ time.Time) (int, error) {
	return 0, nil
}
func (s *spyEventStore) EventFunnel(_ context.Context, _ []string, _ time.Time) (map[string]int, error) {
	return nil, nil
}
func (s *spyEventStore) PlanDistribution(_ context.Context) (map[string]int, error) {
	return nil, nil
}

func (s *spyEventStore) collected() []domain.ProductEvent {
	s.mu.Lock()
	defer s.mu.Unlock()
	cp := make([]domain.ProductEvent, len(s.events))
	copy(cp, s.events)
	return cp
}

func TestAsyncEmitter_BatchesEvents(t *testing.T) {
	spy := &spyEventStore{}
	logger := slog.Default()

	emitter := NewAsyncEmitter(spy, logger,
		WithBufferSize(64),
		WithBatchSize(5),
		WithFlushInterval(50*time.Millisecond),
	)

	for i := 0; i < 12; i++ {
		emitter.Emit(context.Background(), domain.ProductEvent{
			Event:    domain.EventFlagCreated,
			Category: domain.EventCategoryFlag,
			OrgID:    "org_1",
			UserID:   "usr_1",
		})
	}

	// Wait for flush
	time.Sleep(200 * time.Millisecond)

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	emitter.Close(ctx)

	got := spy.collected()
	if len(got) != 12 {
		t.Errorf("expected 12 events, got %d", len(got))
	}
}

func TestAsyncEmitter_SetsCreatedAt(t *testing.T) {
	spy := &spyEventStore{}
	logger := slog.Default()

	emitter := NewAsyncEmitter(spy, logger,
		WithFlushInterval(10*time.Millisecond),
	)

	before := time.Now().UTC()
	emitter.Emit(context.Background(), domain.ProductEvent{
		Event:    domain.EventLogin,
		Category: domain.EventCategoryAuth,
	})

	time.Sleep(50 * time.Millisecond)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	emitter.Close(ctx)

	got := spy.collected()
	if len(got) != 1 {
		t.Fatalf("expected 1 event, got %d", len(got))
	}
	if got[0].CreatedAt.Before(before) {
		t.Errorf("created_at %v should not be before %v", got[0].CreatedAt, before)
	}
}

func TestAsyncEmitter_DropsWhenFull(t *testing.T) {
	spy := &spyEventStore{}
	logger := slog.Default()

	emitter := NewAsyncEmitter(spy, logger,
		WithBufferSize(2),
		WithBatchSize(100),
		WithFlushInterval(1*time.Hour), // never auto-flush
	)

	// Fill buffer
	emitter.Emit(context.Background(), domain.ProductEvent{Event: "a", Category: "test"})
	emitter.Emit(context.Background(), domain.ProductEvent{Event: "b", Category: "test"})
	// This should be dropped (buffer full, flush hasn't run)
	emitter.Emit(context.Background(), domain.ProductEvent{Event: "c", Category: "test"})

	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	emitter.Close(ctx)

	got := spy.collected()
	if len(got) > 2 {
		t.Errorf("expected at most 2 events (buffer size), got %d", len(got))
	}
}
