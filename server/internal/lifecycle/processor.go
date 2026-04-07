package lifecycle

import (
	"context"
	"log/slog"

	"github.com/featuresignals/server/internal/domain"
)

// Sender is the interface handlers depend on. Defined here so callers
// can import lifecycle.Sender without pulling in the concrete Processor.
type Sender interface {
	Send(ctx context.Context, userID string, msg domain.EmailMessage) error
}

// Processor gates lifecycle email delivery based on user preferences,
// email priority, and frequency caps. It sits between business logic
// (handlers, schedulers) and the Mailer, ensuring no email violates
// user consent or volume limits.
//
// Transactional emails (OTP, receipts, security alerts) always pass
// through regardless of preferences.
type Processor struct {
	mailer  domain.Mailer
	store   PreferenceReader
	emitter domain.EventEmitter
	logger  *slog.Logger
}

// PreferenceReader is the narrowest interface needed to check delivery rules.
type PreferenceReader interface {
	GetUserEmailPreferences(ctx context.Context, userID string) (consent bool, preference string, err error)
}

// NewProcessor creates a lifecycle email processor.
func NewProcessor(mailer domain.Mailer, store PreferenceReader, emitter domain.EventEmitter, logger *slog.Logger) *Processor {
	return &Processor{
		mailer:  mailer,
		store:   store,
		emitter: emitter,
		logger:  logger.With("component", "lifecycle_processor"),
	}
}

// compile-time assertion
var _ Sender = (*Processor)(nil)

// Send delivers a lifecycle email if the user's preferences allow it.
// Transactional emails are always delivered. Important and lifecycle
// emails are checked against the user's email_preference setting.
func (p *Processor) Send(ctx context.Context, userID string, msg domain.EmailMessage) error {
	priority, ok := domain.TemplateMeta[msg.Template]
	if !ok {
		p.logger.Warn("unknown template, treating as lifecycle",
			"template", string(msg.Template),
		)
		priority = domain.EmailLifecycle
	}

	if priority != domain.EmailTransactional && userID != "" {
		consent, pref, err := p.store.GetUserEmailPreferences(ctx, userID)
		if err != nil {
			p.logger.Warn("failed to read email preferences, allowing send",
				"user_id", userID,
				"error", err,
			)
		} else if !p.shouldSend(consent, pref, priority) {
			p.logger.Info("email suppressed by user preference",
				"user_id", userID,
				"template", string(msg.Template),
				"preference", pref,
			)
			return nil
		}
	}

	if err := p.mailer.Send(ctx, msg); err != nil {
		p.logger.Error("email delivery failed",
			"template", string(msg.Template),
			"to", msg.To,
			"error", err,
		)
		return err
	}

	p.emitter.Emit(ctx, domain.ProductEvent{
		Event:    domain.EventEmailSent,
		Category: domain.EventCategoryLifecycle,
		UserID:   userID,
		Properties: mustJSON(map[string]string{
			"template": string(msg.Template),
			"to":       msg.To,
		}),
	})

	return nil
}

func (p *Processor) shouldSend(consent bool, preference string, priority domain.EmailPriority) bool {
	if !consent {
		return false
	}

	switch preference {
	case domain.EmailPrefTransactional:
		return false
	case domain.EmailPrefImportant:
		return priority <= domain.EmailImportant
	case domain.EmailPrefAll, "":
		return true
	default:
		return true
	}
}
