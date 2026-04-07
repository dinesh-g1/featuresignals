package lifecycle

import (
	"context"
	"fmt"
	"log/slog"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// SchedulerStore provides the queries the scheduler needs to find users
// eligible for time-based lifecycle emails.
type SchedulerStore interface {
	ListTrialOrgsExpiringSoon(ctx context.Context, withinDays int) ([]OrgUserPair, error)
	ListExpiredTrialOrgs(ctx context.Context) ([]OrgUserPair, error)
	ListInactiveUsers(ctx context.Context, since time.Time) ([]UserRow, error)
	ListRenewalOrgs(ctx context.Context, withinDays int) ([]OrgUserPair, error)
	ListActiveDigestUsers(ctx context.Context) ([]DigestRow, error)
}

// OrgUserPair associates an organization with its owner for email delivery.
type OrgUserPair struct {
	OrgID     string
	OrgName   string
	UserID    string
	UserEmail string
	UserName  string
	Plan      string
	ExpiresAt *time.Time
}

// UserRow carries user data for re-engagement email decisions.
type UserRow struct {
	UserID      string
	Email       string
	Name        string
	LastLoginAt *time.Time
	CreatedAt   time.Time
}

// DigestRow carries user + org + activity data for weekly digest emails.
type DigestRow struct {
	UserID    string
	Email     string
	Name      string
	OrgID     string
	OrgName   string
	FlagCount int
	EvalCount int
}

// Scheduler runs periodic lifecycle email jobs as a goroutine inside
// the main server process. It checks every interval for users who need
// trial reminders, re-engagement emails, weekly digests, and renewal notices.
type Scheduler struct {
	store    SchedulerStore
	sender   Sender
	emitter  domain.EventEmitter
	logger   *slog.Logger
	interval time.Duration
}

// NewScheduler creates a lifecycle scheduler. The interval controls how
// often the scheduler polls for pending emails (typically 1 hour).
func NewScheduler(store SchedulerStore, sender Sender, emitter domain.EventEmitter, logger *slog.Logger, interval time.Duration) *Scheduler {
	if interval < time.Minute {
		interval = time.Hour
	}
	return &Scheduler{
		store:    store,
		sender:   sender,
		emitter:  emitter,
		logger:   logger.With("component", "lifecycle_scheduler"),
		interval: interval,
	}
}

// Run starts the scheduler loop. It blocks until ctx is canceled.
func (s *Scheduler) Run(ctx context.Context) {
	s.logger.Info("lifecycle scheduler started", "interval", s.interval.String())
	ticker := time.NewTicker(s.interval)
	defer ticker.Stop()

	s.runOnce(ctx)

	for {
		select {
		case <-ctx.Done():
			s.logger.Info("lifecycle scheduler stopped")
			return
		case <-ticker.C:
			s.runOnce(ctx)
		}
	}
}

func (s *Scheduler) runOnce(ctx context.Context) {
	s.sendTrialMidpoint(ctx)
	s.sendTrialEnding(ctx)
	s.sendTrialExpired(ctx)
	s.sendReEngagement(ctx)
	s.sendRenewalReminders(ctx)

	if isWeeklyDigestDay() {
		s.sendWeeklyDigest(ctx)
	}
}

func (s *Scheduler) sendTrialMidpoint(ctx context.Context) {
	orgs, err := s.store.ListTrialOrgsExpiringSoon(ctx, 7)
	if err != nil {
		s.logger.Error("failed to list trial midpoint orgs", "error", err)
		return
	}
	for _, o := range orgs {
		_ = s.sender.Send(ctx, o.UserID, domain.EmailMessage{
			To:       o.UserEmail,
			ToName:   o.UserName,
			Template: domain.TemplateTrialMidpoint,
			Subject:  "Halfway through your Pro trial",
			Data: map[string]string{
				"ToName":       o.UserName,
				"OrgName":      o.OrgName,
				"DashboardURL": "https://app.featuresignals.com",
			},
		})
	}
	if len(orgs) > 0 {
		s.logger.Info("sent trial midpoint emails", "count", len(orgs))
	}
}

func (s *Scheduler) sendTrialEnding(ctx context.Context) {
	orgs, err := s.store.ListTrialOrgsExpiringSoon(ctx, 2)
	if err != nil {
		s.logger.Error("failed to list trial ending orgs", "error", err)
		return
	}
	for _, o := range orgs {
		daysLeft := 0
		if o.ExpiresAt != nil {
			daysLeft = int(time.Until(*o.ExpiresAt).Hours() / 24)
			if daysLeft < 0 {
				daysLeft = 0
			}
		}
		_ = s.sender.Send(ctx, o.UserID, domain.EmailMessage{
			To:       o.UserEmail,
			ToName:   o.UserName,
			Template: domain.TemplateTrialEnding,
			Subject:  fmt.Sprintf("Your Pro trial ends in %d days", daysLeft),
			Data: map[string]string{
				"ToName":       o.UserName,
				"DaysLeft":     fmt.Sprintf("%d", daysLeft),
				"DashboardURL": "https://app.featuresignals.com/settings/billing",
			},
		})
	}
	if len(orgs) > 0 {
		s.logger.Info("sent trial ending emails", "count", len(orgs))
	}
}

func (s *Scheduler) sendTrialExpired(ctx context.Context) {
	orgs, err := s.store.ListExpiredTrialOrgs(ctx)
	if err != nil {
		s.logger.Error("failed to list expired trial orgs", "error", err)
		return
	}
	for _, o := range orgs {
		_ = s.sender.Send(ctx, o.UserID, domain.EmailMessage{
			To:       o.UserEmail,
			ToName:   o.UserName,
			Template: domain.TemplateTrialExpired,
			Subject:  "Your Pro trial has ended",
			Data: map[string]string{
				"ToName":       o.UserName,
				"DashboardURL": "https://app.featuresignals.com/settings/billing",
			},
		})
	}
	if len(orgs) > 0 {
		s.logger.Info("sent trial expired emails", "count", len(orgs))
	}
}

func (s *Scheduler) sendReEngagement(ctx context.Context) {
	since48h := time.Now().Add(-48 * time.Hour)
	users, err := s.store.ListInactiveUsers(ctx, since48h)
	if err != nil {
		s.logger.Error("failed to list inactive users", "error", err)
		return
	}
	for _, u := range users {
		inactiveDays := int(time.Since(u.CreatedAt).Hours() / 24)
		var tmpl domain.TemplateID
		var subject string
		switch {
		case inactiveDays <= 3:
			tmpl = domain.TemplateReEngage48h
			subject = "Your workspace is waiting"
		case inactiveDays >= 14 && inactiveDays <= 21:
			tmpl = domain.TemplateReEngage14d
			subject = "Your flags are still running"
		case inactiveDays >= 90:
			tmpl = domain.TemplateReEngage90d
			subject = "We miss you at FeatureSignals"
		default:
			continue
		}
		_ = s.sender.Send(ctx, u.UserID, domain.EmailMessage{
			To:       u.Email,
			ToName:   u.Name,
			Template: tmpl,
			Subject:  subject,
			Data: map[string]string{
				"ToName":       u.Name,
				"DashboardURL": "https://app.featuresignals.com",
			},
		})
	}
	if len(users) > 0 {
		s.logger.Info("sent re-engagement emails", "count", len(users))
	}
}

func (s *Scheduler) sendRenewalReminders(ctx context.Context) {
	orgs, err := s.store.ListRenewalOrgs(ctx, 3)
	if err != nil {
		s.logger.Error("failed to list renewal orgs", "error", err)
		return
	}
	for _, o := range orgs {
		_ = s.sender.Send(ctx, o.UserID, domain.EmailMessage{
			To:       o.UserEmail,
			ToName:   o.UserName,
			Template: domain.TemplateRenewalUpcoming,
			Subject:  "Your FeatureSignals Pro renewal is coming up",
			Data: map[string]string{
				"ToName":       o.UserName,
				"OrgName":      o.OrgName,
				"DashboardURL": "https://app.featuresignals.com/settings/billing",
			},
		})
	}
	if len(orgs) > 0 {
		s.logger.Info("sent renewal reminder emails", "count", len(orgs))
	}
}

func (s *Scheduler) sendWeeklyDigest(ctx context.Context) {
	rows, err := s.store.ListActiveDigestUsers(ctx)
	if err != nil {
		s.logger.Error("failed to list digest users", "error", err)
		return
	}
	for _, r := range rows {
		_ = s.sender.Send(ctx, r.UserID, domain.EmailMessage{
			To:       r.Email,
			ToName:   r.Name,
			Template: domain.TemplateWeeklyDigest,
			Subject:  "Your FeatureSignals weekly",
			Data: map[string]string{
				"ToName":       r.Name,
				"OrgName":      r.OrgName,
				"FlagCount":    fmt.Sprintf("%d", r.FlagCount),
				"EvalCount":    fmt.Sprintf("%d", r.EvalCount),
				"DashboardURL": "https://app.featuresignals.com",
			},
		})
	}
	if len(rows) > 0 {
		s.logger.Info("sent weekly digest emails", "count", len(rows))
	}
}

func isWeeklyDigestDay() bool {
	return time.Now().UTC().Weekday() == time.Monday
}
