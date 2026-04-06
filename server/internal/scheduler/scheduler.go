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
	DeleteExpiredPendingRegistrations(ctx context.Context, before time.Time) (int, error)
	ListInactiveOrgs(ctx context.Context, plan string, inactiveSince time.Time) ([]domain.Organization, error)
	SoftDeleteOrganization(ctx context.Context, orgID string) error
	ListSoftDeletedOrgs(ctx context.Context, deletedBefore time.Time) ([]domain.Organization, error)
	HardDeleteOrganization(ctx context.Context, orgID string) error
	DowngradeOrgToFree(ctx context.Context, orgID string) error
	GetOrganization(ctx context.Context, id string) (*domain.Organization, error)
	CleanExpiredRevocations(ctx context.Context) error
	CleanExpiredGracePeriodKeys(ctx context.Context) error
	PurgeAuditEntries(ctx context.Context, olderThan time.Time) (int, error)
	TryAdvisoryLock(ctx context.Context, lockID int64) (bool, error)
	ReleaseAdvisoryLock(ctx context.Context, lockID int64) error
}

// Scheduler periodically checks for pending flag schedules and applies them.
type Scheduler struct {
	store              Store
	logger             *slog.Logger
	interval           time.Duration
	cleanupTicker      int // counts ticks to run hourly jobs
	auditRetentionDays int
}

// New creates a scheduler that ticks at the given interval.
// auditRetentionDays controls how many days of audit logs to keep (0 = default 90).
func New(store Store, logger *slog.Logger, interval time.Duration, auditRetentionDays int) *Scheduler {
	if auditRetentionDays <= 0 {
		auditRetentionDays = 90
	}
	return &Scheduler{
		store:              store,
		logger:             logger.With("component", "scheduler"),
		interval:           interval,
		auditRetentionDays: auditRetentionDays,
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
				s.cleanupPendingRegistrations(ctx)
				s.autoDowngradeExpiredTrials(ctx)
				s.softDeleteInactiveOrgs(ctx)
				s.hardDeleteExpiredOrgs(ctx)
				s.cleanExpiredRevocations(ctx)
				s.cleanExpiredGracePeriodKeys(ctx)
				s.purgeOldAuditEntries(ctx)
			}
		}
	}
}

const schedulerLockID int64 = 1

func (s *Scheduler) tick(ctx context.Context) {
	acquired, err := s.store.TryAdvisoryLock(ctx, schedulerLockID)
	if err != nil {
		s.logger.Error("failed to acquire scheduler advisory lock", "error", err)
		return
	}
	if !acquired {
		return
	}
	defer func() {
		if err := s.store.ReleaseAdvisoryLock(ctx, schedulerLockID); err != nil {
			s.logger.Error("failed to release scheduler advisory lock", "error", err)
		}
	}()

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

func (s *Scheduler) cleanupPendingRegistrations(ctx context.Context) {
	count, err := s.store.DeleteExpiredPendingRegistrations(ctx, time.Now())
	if err != nil {
		s.logger.Error("failed to cleanup expired pending registrations", "error", err)
		return
	}
	if count > 0 {
		s.logger.Info("cleaned up expired pending registrations", "count", count)
	}
}

func (s *Scheduler) autoDowngradeExpiredTrials(ctx context.Context) {
	// Find trial orgs whose trial has expired by checking all orgs with trial plan
	// The TrialExpiry middleware handles per-request downgrades, but this covers
	// orgs that haven't been accessed since expiry.
	now := time.Now()
	inactiveTrials, err := s.store.ListInactiveOrgs(ctx, domain.PlanTrial, now.AddDate(0, 0, -domain.TrialDurationDays))
	if err != nil {
		s.logger.Error("failed to list inactive trial orgs for downgrade", "error", err)
		return
	}
	for _, org := range inactiveTrials {
		if org.TrialExpiresAt != nil && now.After(*org.TrialExpiresAt) {
			if err := s.store.DowngradeOrgToFree(ctx, org.ID); err != nil {
				s.logger.Error("failed to auto-downgrade trial org", "error", err, "org_id", org.ID)
			} else {
				s.logger.Info("auto-downgraded expired trial org", "org_id", org.ID)
			}
		}
	}
}

func (s *Scheduler) softDeleteInactiveOrgs(ctx context.Context) {
	cutoff := time.Now().AddDate(0, 0, -domain.SoftDeleteInactiveDays)
	orgs, err := s.store.ListInactiveOrgs(ctx, domain.PlanFree, cutoff)
	if err != nil {
		s.logger.Error("failed to list inactive free orgs for soft-delete", "error", err)
		return
	}
	for _, org := range orgs {
		if err := s.store.SoftDeleteOrganization(ctx, org.ID); err != nil {
			s.logger.Error("failed to soft-delete inactive org", "error", err, "org_id", org.ID)
		} else {
			s.logger.Info("soft-deleted inactive free org", "org_id", org.ID)
		}
	}
}

func (s *Scheduler) hardDeleteExpiredOrgs(ctx context.Context) {
	cutoff := time.Now().AddDate(0, 0, -domain.HardDeleteGraceDays)
	orgs, err := s.store.ListSoftDeletedOrgs(ctx, cutoff)
	if err != nil {
		s.logger.Error("failed to list soft-deleted orgs for hard-delete", "error", err)
		return
	}
	for _, org := range orgs {
		if err := s.store.HardDeleteOrganization(ctx, org.ID); err != nil {
			s.logger.Error("failed to hard-delete org", "error", err, "org_id", org.ID)
		} else {
			s.logger.Info("hard-deleted org", "org_id", org.ID)
		}
	}
}

func (s *Scheduler) cleanExpiredRevocations(ctx context.Context) {
	if err := s.store.CleanExpiredRevocations(ctx); err != nil {
		s.logger.Error("failed to clean expired token revocations", "error", err)
	}
}

func (s *Scheduler) cleanExpiredGracePeriodKeys(ctx context.Context) {
	if err := s.store.CleanExpiredGracePeriodKeys(ctx); err != nil {
		s.logger.Error("failed to clean expired grace-period API keys", "error", err)
	}
}

func (s *Scheduler) purgeOldAuditEntries(ctx context.Context) {
	cutoff := time.Now().AddDate(0, 0, -s.auditRetentionDays)
	count, err := s.store.PurgeAuditEntries(ctx, cutoff)
	if err != nil {
		s.logger.Error("failed to purge old audit entries", "error", err)
		return
	}
	if count > 0 {
		s.logger.Info("purged old audit entries", "count", count, "retention_days", s.auditRetentionDays)
	}
}

// RunOnce runs a single tick (useful for testing).
func (s *Scheduler) RunOnce(ctx context.Context) {
	s.tick(ctx)
}

