package domain

import (
	"context"
	"encoding/json"
	"time"
)

// EventCategory groups related product events for filtering and routing.
type EventCategory string

const (
	EventCategoryAuth      EventCategory = "auth"
	EventCategoryOnboard   EventCategory = "onboarding"
	EventCategoryFlag      EventCategory = "flag"
	EventCategorySegment   EventCategory = "segment"
	EventCategoryProject   EventCategory = "project"
	EventCategoryEnv       EventCategory = "environment"
	EventCategoryTeam      EventCategory = "team"
	EventCategoryBilling   EventCategory = "billing"
	EventCategoryEval      EventCategory = "evaluation"
	EventCategoryLifecycle EventCategory = "lifecycle"
)

// ProductEvent represents a structured product analytics event emitted from
// any surface (dashboard, API, server-side lifecycle). These events power
// lifecycle communications, upgrade nudges, feature discovery, and KPIs.
//
// Product events are separate from audit log entries — audit entries serve
// compliance and governance, product events serve product intelligence.
type ProductEvent struct {
	ID         string            `json:"id" db:"id"`
	Event      string            `json:"event" db:"event"`
	Category   EventCategory     `json:"category" db:"category"`
	UserID     string            `json:"user_id,omitempty" db:"user_id"`
	OrgID      string            `json:"org_id,omitempty" db:"org_id"`
	Properties json.RawMessage   `json:"properties,omitempty" db:"properties"`
	Context    *EventContext     `json:"context,omitempty" db:"-"`
	CreatedAt  time.Time         `json:"created_at" db:"created_at"`
}

// EventContext carries non-business metadata about where/how the event
// was generated. Stored as JSON within the properties column to keep
// the table schema stable.
type EventContext struct {
	Surface   string `json:"surface,omitempty"`
	SessionID string `json:"session_id,omitempty"`
	IPAddress string `json:"ip_address,omitempty"`
	UserAgent string `json:"user_agent,omitempty"`
	Referrer  string `json:"referrer,omitempty"`
}

// Feedback captures in-product user feedback (bug reports, feature requests,
// general comments) along with sentiment and the page context.
type Feedback struct {
	ID        string `json:"id" db:"id"`
	UserID    string `json:"user_id" db:"user_id"`
	OrgID     string `json:"org_id" db:"org_id"`
	Type      string `json:"type" db:"type"`
	Sentiment string `json:"sentiment" db:"sentiment"`
	Message   string `json:"message" db:"message"`
	Page      string `json:"page" db:"page"`
}

// EventEmitter is the port for recording product events. Implementations
// must be safe for concurrent use and must never block the caller —
// event emission is fire-and-forget from the business logic perspective.
type EventEmitter interface {
	Emit(ctx context.Context, event ProductEvent)
}

// EventStore persists product events for analytics queries. Separated from
// EventEmitter because the emitter may buffer/batch before writing.
type EventStore interface {
	InsertProductEvent(ctx context.Context, event *ProductEvent) error
	InsertProductEvents(ctx context.Context, events []ProductEvent) error
	CountEventsByOrg(ctx context.Context, orgID string, event string, since time.Time) (int, error)
	CountEventsByUser(ctx context.Context, userID string, event string, since time.Time) (int, error)
	CountEventsByCategory(ctx context.Context, category string, since time.Time) (int, error)
	CountDistinctOrgs(ctx context.Context, event string, since time.Time) (int, error)
	CountDistinctUsers(ctx context.Context, since time.Time) (int, error)
	EventFunnel(ctx context.Context, events []string, since time.Time) (map[string]int, error)
	PlanDistribution(ctx context.Context) (map[string]int, error)
}

// ─── Well-known event names ─────────────────────────────────────────────────
// These constants ensure consistent event naming across the codebase.

const (
	// Auth
	EventSignupCompleted = "auth.signup_completed"
	EventLogin           = "auth.login"
	EventLoginFailed     = "auth.login_failed"
	EventSessionExpired  = "auth.session_expired"

	// Onboarding
	EventOnboardingStarted   = "onboarding.started"
	EventOnboardingStep      = "onboarding.step_completed"
	EventOnboardingSkipped   = "onboarding.step_skipped"
	EventOnboardingCompleted = "onboarding.completed"
	EventOnboardingAbandoned = "onboarding.abandoned"

	// Flags
	EventFlagCreated  = "flag.created"
	EventFlagUpdated  = "flag.updated"
	EventFlagToggled  = "flag.toggled"
	EventFlagArchived = "flag.archived"
	EventFlagDeleted  = "flag.deleted"

	// Segments
	EventSegmentCreated = "segment.created"
	EventSegmentUpdated = "segment.updated"
	EventSegmentDeleted = "segment.deleted"

	// Projects & Environments
	EventProjectCreated     = "project.created"
	EventProjectDeleted     = "project.deleted"
	EventEnvironmentCreated = "environment.created"
	EventEnvironmentDeleted = "environment.deleted"

	// Team
	EventMemberInvited     = "member.invited"
	EventMemberJoined      = "member.joined"
	EventMemberRoleChanged = "member.role_changed"
	EventMemberRemoved     = "member.removed"

	// Billing
	EventPricingViewed      = "billing.pricing_viewed"
	EventCheckoutStarted    = "billing.checkout_started"
	EventCheckoutCompleted  = "billing.checkout_completed"
	EventCheckoutFailed     = "billing.checkout_failed"
	EventTrialStarted       = "billing.trial_started"
	EventSubscriptionCancel = "billing.subscription_canceled"
	EventPaymentFailed      = "billing.payment_failed"
	EventPlanChanged        = "billing.plan_changed"

	// Evaluation (aggregated milestones, not per-eval)
	EventFirstEvaluation = "evaluation.first"

	// Feature discovery
	EventFeatureFirstUsed   = "feature.first_used"
	EventGatedAccessAttempt = "feature.gated_access_attempted"
	EventUpgradeNudgeShown  = "upgrade_nudge.shown"
	EventUpgradeNudgeClick  = "upgrade_nudge.clicked"

	// Lifecycle / Communication
	EventEmailSent        = "email.sent"
	EventEmailFailed      = "email.failed"
	EventEmailOpened      = "email.opened"
	EventEmailClicked     = "email.clicked"
	EventEmailUnsubscribe = "email.unsubscribed"
)
