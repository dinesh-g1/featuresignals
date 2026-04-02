package scheduler

import (
	"context"
	"log/slog"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// Store is the minimal interface the scheduler needs.
type Store interface {
	ListPendingSchedules(ctx context.Context, before time.Time) ([]domain.FlagState, error)
	UpsertFlagState(ctx context.Context, fs *domain.FlagState) error
	CreateAuditEntry(ctx context.Context, entry *domain.AuditEntry) error
	DeleteExpiredDemoOrgs(ctx context.Context, before time.Time) (int, error)
}

// Scheduler periodically checks for pending flag schedules and applies them.
type Scheduler struct {
	store         Store
	logger        *slog.Logger
	interval      time.Duration
	cleanupTicker int // counts ticks to run demo cleanup hourly
}

// New creates a scheduler that ticks at the given interval.
func New(store Store, logger *slog.Logger, interval time.Duration) *Scheduler {
	return &Scheduler{
		store:    store,
		logger:   logger.With("component", "scheduler"),
		interval: interval,
	}
}

// Start begins the scheduler loop. Blocks until ctx is cancelled.
func (s *Scheduler) Start(ctx context.Context) {
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	s.logger.Info("scheduler started", "interval", s.interval)

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("scheduler stopped")
			return
		case <-ticker.C:
			s.tick(ctx)
			s.cleanupTicker++
			ticksPerHour := int(time.Hour / s.interval)
			if ticksPerHour < 1 {
				ticksPerHour = 1
			}
			if s.cleanupTicker%ticksPerHour == 0 {
				s.cleanupDemoSessions(ctx)
			}
		}
	}
}

func (s *Scheduler) tick(ctx context.Context) {
	now := time.Now()
	pending, err := s.store.ListPendingSchedules(ctx, now)
	if err != nil {
		s.logger.Error("failed to list pending schedules", "error", err)
		return
	}

	for i := range pending {
		fs := &pending[i]
		changed := false

		if fs.ScheduledEnableAt != nil && !fs.ScheduledEnableAt.After(now) {
			s.logger.Info("applying scheduled enable", "flag_id", fs.FlagID, "env_id", fs.EnvID)
			fs.Enabled = true
			fs.ScheduledEnableAt = nil
			changed = true
		}

		if fs.ScheduledDisableAt != nil && !fs.ScheduledDisableAt.After(now) {
			s.logger.Info("applying scheduled disable", "flag_id", fs.FlagID, "env_id", fs.EnvID)
			fs.Enabled = false
			fs.ScheduledDisableAt = nil
			changed = true
		}

		if !changed {
			continue
		}

		if err := s.store.UpsertFlagState(ctx, fs); err != nil {
			s.logger.Error("failed to upsert scheduled flag state", "error", err, "flag_id", fs.FlagID)
			continue
		}

		systemActor := "system"
		s.store.CreateAuditEntry(ctx, &domain.AuditEntry{
			OrgID:        "",
			ActorID:      &systemActor,
			ActorType:    "system",
			Action:       "flag.scheduled_toggle",
			ResourceType: "flag",
			ResourceID:   &fs.FlagID,
		})
	}
}

func (s *Scheduler) cleanupDemoSessions(ctx context.Context) {
	count, err := s.store.DeleteExpiredDemoOrgs(ctx, time.Now())
	if err != nil {
		s.logger.Error("failed to cleanup expired demo sessions", "error", err)
		return
	}
	if count > 0 {
		s.logger.Info("cleaned up expired demo sessions", "count", count)
	}
}

// RunOnce runs a single tick (useful for testing).
func (s *Scheduler) RunOnce(ctx context.Context) {
	s.tick(ctx)
}

// RunDemoCleanup runs a single demo cleanup pass (useful for testing).
func (s *Scheduler) RunDemoCleanup(ctx context.Context) {
	s.cleanupDemoSessions(ctx)
}
