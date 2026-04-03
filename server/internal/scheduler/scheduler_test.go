package scheduler

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type mockScheduleStore struct {
	mu         sync.Mutex
	states     map[string]*domain.FlagState // "flagID:envID" -> state
	audits     []domain.AuditEntry
	idCounter  int
}

func newMockScheduleStore() *mockScheduleStore {
	return &mockScheduleStore{
		states: make(map[string]*domain.FlagState),
	}
}

func (m *mockScheduleStore) nextID() string {
	m.idCounter++
	return fmt.Sprintf("id-%d", m.idCounter)
}

func (m *mockScheduleStore) ListPendingSchedules(ctx context.Context, before time.Time) ([]domain.FlagState, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	var result []domain.FlagState
	for _, fs := range m.states {
		if (fs.ScheduledEnableAt != nil && !fs.ScheduledEnableAt.After(before)) ||
			(fs.ScheduledDisableAt != nil && !fs.ScheduledDisableAt.After(before)) {
			result = append(result, *fs)
		}
	}
	return result, nil
}

func (m *mockScheduleStore) UpsertFlagState(ctx context.Context, fs *domain.FlagState) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := fs.FlagID + ":" + fs.EnvID
	if fs.ID == "" {
		fs.ID = m.nextID()
	}
	m.states[key] = fs
	return nil
}

func (m *mockScheduleStore) CreateAuditEntry(ctx context.Context, entry *domain.AuditEntry) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	entry.ID = m.nextID()
	m.audits = append(m.audits, *entry)
	return nil
}

func (m *mockScheduleStore) DeleteExpiredDemoOrgs(ctx context.Context, before time.Time) (int, error) {
	return 0, nil
}

func (m *mockScheduleStore) DeleteDemoData(ctx context.Context, orgID string) error {
	return nil
}

func (m *mockScheduleStore) CreateOneTimeToken(ctx context.Context, userID, orgID string, ttl time.Duration) (string, error) {
	return "test-token", nil
}

func (m *mockScheduleStore) ConsumeOneTimeToken(ctx context.Context, token string) (userID, orgID string, err error) {
	return "user-id", "org-id", nil
}

func TestScheduler_EnableSchedule(t *testing.T) {
	store := newMockScheduleStore()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	s := New(store, logger, time.Minute)

	past := time.Now().Add(-time.Hour)
	store.states["f1:e1"] = &domain.FlagState{
		ID:                "fs-1",
		FlagID:            "f1",
		EnvID:             "e1",
		Enabled:           false,
		DefaultValue:      json.RawMessage(`true`),
		ScheduledEnableAt: &past,
	}

	s.RunOnce(context.Background())

	store.mu.Lock()
	defer store.mu.Unlock()

	fs := store.states["f1:e1"]
	if !fs.Enabled {
		t.Error("expected flag to be enabled after schedule")
	}
	if fs.ScheduledEnableAt != nil {
		t.Error("expected scheduled_enable_at to be cleared")
	}
	if len(store.audits) != 1 {
		t.Fatalf("expected 1 audit entry, got %d", len(store.audits))
	}
	if store.audits[0].Action != "flag.scheduled_toggle" {
		t.Errorf("expected audit action flag.scheduled_toggle, got %s", store.audits[0].Action)
	}
}

func TestScheduler_DisableSchedule(t *testing.T) {
	store := newMockScheduleStore()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	s := New(store, logger, time.Minute)

	past := time.Now().Add(-time.Minute)
	store.states["f2:e2"] = &domain.FlagState{
		ID:                 "fs-2",
		FlagID:             "f2",
		EnvID:              "e2",
		Enabled:            true,
		DefaultValue:       json.RawMessage(`true`),
		ScheduledDisableAt: &past,
	}

	s.RunOnce(context.Background())

	store.mu.Lock()
	defer store.mu.Unlock()

	fs := store.states["f2:e2"]
	if fs.Enabled {
		t.Error("expected flag to be disabled after schedule")
	}
	if fs.ScheduledDisableAt != nil {
		t.Error("expected scheduled_disable_at to be cleared")
	}
}

func TestScheduler_FutureScheduleNotApplied(t *testing.T) {
	store := newMockScheduleStore()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	s := New(store, logger, time.Minute)

	future := time.Now().Add(time.Hour)
	store.states["f3:e3"] = &domain.FlagState{
		ID:                "fs-3",
		FlagID:            "f3",
		EnvID:             "e3",
		Enabled:           false,
		DefaultValue:      json.RawMessage(`true`),
		ScheduledEnableAt: &future,
	}

	s.RunOnce(context.Background())

	store.mu.Lock()
	defer store.mu.Unlock()

	fs := store.states["f3:e3"]
	if fs.Enabled {
		t.Error("flag should not be enabled for future schedule")
	}
	if fs.ScheduledEnableAt == nil {
		t.Error("schedule should not be cleared for future time")
	}
}

func TestScheduler_BothSchedules(t *testing.T) {
	store := newMockScheduleStore()
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))
	s := New(store, logger, time.Minute)

	past := time.Now().Add(-time.Minute)
	store.states["f4:e4"] = &domain.FlagState{
		ID:                 "fs-4",
		FlagID:             "f4",
		EnvID:              "e4",
		Enabled:            true,
		DefaultValue:       json.RawMessage(`true`),
		ScheduledEnableAt:  &past,
		ScheduledDisableAt: &past,
	}

	s.RunOnce(context.Background())

	store.mu.Lock()
	defer store.mu.Unlock()

	fs := store.states["f4:e4"]
	if fs.Enabled {
		t.Error("disable should win when both schedules fire simultaneously")
	}
}
