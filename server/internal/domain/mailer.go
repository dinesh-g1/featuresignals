package domain

import "context"

// TemplateID identifies a lifecycle email template. Every email the system
// can send has a well-known ID that maps to an HTML template + plaintext
// fallback in the mailer implementation.
type TemplateID string

const (
	TemplateWelcome            TemplateID = "welcome"
	TemplateActivationFlag     TemplateID = "activation_first_flag"
	TemplateActivationEval     TemplateID = "activation_first_eval"
	TemplateTeamInvite         TemplateID = "team_invite"
	TemplateTeamJoined         TemplateID = "team_joined"
	TemplateTrialMidpoint      TemplateID = "trial_midpoint"
	TemplateTrialEnding        TemplateID = "trial_ending"
	TemplateTrialExpired       TemplateID = "trial_expired"
	TemplateWeeklyDigest       TemplateID = "weekly_digest"
	TemplateReEngage48h        TemplateID = "re_engage_48h"
	TemplateReEngage14d        TemplateID = "re_engage_14d"
	TemplateReEngage90d        TemplateID = "re_engage_90d"
	TemplateUpgradeLimitHit    TemplateID = "upgrade_limit_hit"
	TemplateRenewalUpcoming    TemplateID = "renewal_upcoming"
	TemplatePaymentSuccess     TemplateID = "payment_success"
	TemplatePaymentFailed      TemplateID = "payment_failed"
	TemplatePaymentFailedFinal TemplateID = "payment_failed_final"
	TemplateCancellation       TemplateID = "cancellation_confirmed"
	TemplateDowngrade          TemplateID = "downgrade_effective"
	TemplateDeletionRequested  TemplateID = "deletion_requested"
	TemplateDeletionCanceled   TemplateID = "deletion_canceled"
	TemplateFeatureAnnounce    TemplateID = "feature_announcement"
	TemplateEnterpriseAck      TemplateID = "enterprise_inquiry_ack"
	TemplateSecurityAlert      TemplateID = "security_alert"
	TemplateAPIKeyCreated      TemplateID = "api_key_created"
	TemplateExportReady        TemplateID = "export_ready"
)

// EmailPriority determines whether the email is transactional (always sent)
// or lifecycle (subject to user preferences and frequency caps).
type EmailPriority int

const (
	EmailTransactional EmailPriority = iota // OTP, receipts, security — always sent
	EmailImportant                          // Trial, payment, team — sent unless "transactional only"
	EmailLifecycle                          // Digest, tips, announcements — sent only on "all"
)

// TemplateMeta provides metadata about each template for the lifecycle
// processor to decide whether to send based on user preferences.
var TemplateMeta = map[TemplateID]EmailPriority{
	TemplateWelcome:            EmailTransactional,
	TemplateActivationFlag:     EmailLifecycle,
	TemplateActivationEval:     EmailLifecycle,
	TemplateTeamInvite:         EmailTransactional,
	TemplateTeamJoined:         EmailLifecycle,
	TemplateTrialMidpoint:      EmailImportant,
	TemplateTrialEnding:        EmailImportant,
	TemplateTrialExpired:       EmailImportant,
	TemplateWeeklyDigest:       EmailLifecycle,
	TemplateReEngage48h:        EmailLifecycle,
	TemplateReEngage14d:        EmailLifecycle,
	TemplateReEngage90d:        EmailLifecycle,
	TemplateUpgradeLimitHit:    EmailLifecycle,
	TemplateRenewalUpcoming:    EmailImportant,
	TemplatePaymentSuccess:     EmailTransactional,
	TemplatePaymentFailed:      EmailTransactional,
	TemplatePaymentFailedFinal: EmailTransactional,
	TemplateCancellation:       EmailTransactional,
	TemplateDowngrade:          EmailImportant,
	TemplateDeletionRequested:  EmailTransactional,
	TemplateDeletionCanceled:   EmailTransactional,
	TemplateFeatureAnnounce:    EmailLifecycle,
	TemplateEnterpriseAck:      EmailTransactional,
	TemplateSecurityAlert:      EmailTransactional,
	TemplateAPIKeyCreated:      EmailImportant,
	TemplateExportReady:        EmailTransactional,
}

// EmailMessage represents a fully resolved email ready for delivery.
type EmailMessage struct {
	To         string            `json:"to"`
	ToName     string            `json:"to_name,omitempty"`
	Template   TemplateID        `json:"template"`
	Subject    string            `json:"subject"`
	Data       map[string]string `json:"data"`
}

// Mailer is the port for sending lifecycle and transactional emails.
// Implementations handle template rendering, HTML/plaintext generation,
// and delivery via the configured provider.
//
// The Mailer does NOT check user preferences — that responsibility belongs
// to the lifecycle processor that calls the Mailer. The Mailer is a dumb
// pipe that renders and sends.
type Mailer interface {
	Send(ctx context.Context, msg EmailMessage) error
	SendBatch(ctx context.Context, msgs []EmailMessage) error
}
