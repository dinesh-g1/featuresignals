package domain

import (
	"context"
	"time"
)

// ─── Focused sub-interfaces (ISP) ──────────────────────────────────────────
// Handlers and services should depend on the narrowest interface they need.

// FlagReader provides read-only access to flags and their states.
type FlagReader interface {
	GetFlag(ctx context.Context, projectID, key string) (*Flag, error)
	ListFlags(ctx context.Context, projectID string) ([]Flag, error)
	ListFlagsWithFilter(ctx context.Context, orgID, projectID, labelSelector string) ([]Flag, error)
	ListFlagsSorted(ctx context.Context, projectID, sortField, sortDir string) ([]Flag, error)
	GetFlagState(ctx context.Context, flagID, envID string) (*FlagState, error)
	ListFlagStatesByEnv(ctx context.Context, envID string) ([]FlagState, error)
}

// FlagWriter provides mutating operations on flags and their states.
type FlagWriter interface {
	CreateFlag(ctx context.Context, f *Flag) error
	UpdateFlag(ctx context.Context, f *Flag) error
	DeleteFlag(ctx context.Context, id string) error
	UpsertFlagState(ctx context.Context, fs *FlagState) error
}

// SegmentStore provides CRUD for segments.
type SegmentStore interface {
	CreateSegment(ctx context.Context, seg *Segment) error
	ListSegments(ctx context.Context, projectID string) ([]Segment, error)
	ListSegmentsWithFilter(ctx context.Context, orgID, projectID, labelSelector string) ([]Segment, error)
	ListSegmentsSorted(ctx context.Context, projectID, sortField, sortDir string) ([]Segment, error)
	GetSegment(ctx context.Context, projectID, key string) (*Segment, error)
	UpdateSegment(ctx context.Context, seg *Segment) error
	DeleteSegment(ctx context.Context, id string) error
}

// EvalStore is the minimal interface needed by the evaluation hot path.
type EvalStore interface {
	LoadRuleset(ctx context.Context, projectID, envID string) ([]Flag, []FlagState, []Segment, error)
	ListenForChanges(ctx context.Context, callback func(payload string)) error
	GetEnvironmentByAPIKeyHash(ctx context.Context, keyHash string) (*Environment, *APIKey, error)
	UpdateAPIKeyLastUsed(ctx context.Context, id string) error
	GetEnvironment(ctx context.Context, id string) (*Environment, error)
}

// AuditWriter provides write access to the audit log.
type AuditWriter interface {
	CreateAuditEntry(ctx context.Context, entry *AuditEntry) error
	PurgeAuditEntries(ctx context.Context, olderThan time.Time) (int, error)
}

// AuditReader provides read access to the audit log.
type AuditReader interface {
	ListAuditEntries(ctx context.Context, orgID string, limit, offset int) ([]AuditEntry, error)
	ListAuditEntriesByProject(ctx context.Context, orgID, projectID string, limit, offset int) ([]AuditEntry, error)
	ListAuditEntriesForExport(ctx context.Context, orgID string, from, to string) ([]AuditEntry, error)
	GetLastAuditHash(ctx context.Context, orgID string) (string, error)
	CountAuditEntries(ctx context.Context, orgID string) (int, error)
}

// ProjectReader provides read access to projects.
type ProjectReader interface {
	GetProject(ctx context.Context, id string) (*Project, error)
	ListProjects(ctx context.Context, orgID string) ([]Project, error)
}

// ProjectWriter provides mutating operations on projects.
type ProjectWriter interface {
	CreateProject(ctx context.Context, p *Project) error
	UpdateProject(ctx context.Context, p *Project) error
	DeleteProject(ctx context.Context, id string) error
}

// EnvironmentReader provides read access to environments.
type EnvironmentReader interface {
	GetEnvironment(ctx context.Context, id string) (*Environment, error)
	ListEnvironments(ctx context.Context, projectID string) ([]Environment, error)
}

// EnvironmentWriter provides mutating operations on environments.
type EnvironmentWriter interface {
	CreateEnvironment(ctx context.Context, e *Environment) error
	UpdateEnvironment(ctx context.Context, e *Environment) error
	DeleteEnvironment(ctx context.Context, id string) error
}

// OrgReader provides read access to organizations.
type OrgReader interface {
	GetOrganization(ctx context.Context, id string) (*Organization, error)
	GetOrganizationByIDPrefix(ctx context.Context, prefix string) (*Organization, error)
}

// OrgWriter provides mutating operations on organizations.
type OrgWriter interface {
	CreateOrganization(ctx context.Context, org *Organization) error
}

// UserReader provides read access to users.
type UserReader interface {
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, id string) (*User, error)
	GetUserByEmailVerifyToken(ctx context.Context, token string) (*User, error)
}

// UserWriter provides mutating operations on users.
type UserWriter interface {
	CreateUser(ctx context.Context, user *User) error
	UpdateUserEmailVerifyToken(ctx context.Context, userID, token string, expires time.Time) error
	SetEmailVerified(ctx context.Context, userID string) error
	UpdateLastLoginAt(ctx context.Context, userID string) error
	SoftDeleteUser(ctx context.Context, userID string) error
	SetPasswordResetToken(ctx context.Context, userID, tokenHash string, expires time.Time, ip, ua string) error
	ConsumePasswordResetToken(ctx context.Context, otp string) (userID string, err error)
	UpdatePassword(ctx context.Context, userID, newPasswordHash string) error
}

// OrgMemberStore provides CRUD for organization members.
type OrgMemberStore interface {
	AddOrgMember(ctx context.Context, member *OrgMember) error
	GetOrgMember(ctx context.Context, orgID, userID string) (*OrgMember, error)
	GetOrgMemberByID(ctx context.Context, memberID string) (*OrgMember, error)
	ListOrgMembers(ctx context.Context, orgID string) ([]OrgMember, error)
	UpdateOrgMemberRole(ctx context.Context, memberID string, role Role) error
	RemoveOrgMember(ctx context.Context, memberID string) error
}

// EnvPermissionStore provides CRUD for environment-level permissions.
type EnvPermissionStore interface {
	ListEnvPermissions(ctx context.Context, memberID string) ([]EnvPermission, error)
	UpsertEnvPermission(ctx context.Context, perm *EnvPermission) error
	DeleteEnvPermission(ctx context.Context, id string) error
}

// APIKeyStore provides CRUD for API keys.
type APIKeyStore interface {
	CreateAPIKey(ctx context.Context, k *APIKey) error
	GetAPIKeyByID(ctx context.Context, id string) (*APIKey, error)
	GetAPIKeyByHash(ctx context.Context, keyHash string) (*APIKey, error)
	ListAPIKeys(ctx context.Context, envID string) ([]APIKey, error)
	RevokeAPIKey(ctx context.Context, id string) error
	RotateAPIKey(ctx context.Context, oldKeyID, envID, name, newKeyHash, newKeyPrefix string, gracePeriod time.Duration) (*APIKey, error)
	CleanExpiredGracePeriodKeys(ctx context.Context) error
}

// WebhookStore provides CRUD for webhooks and their deliveries.
type WebhookStore interface {
	CreateWebhook(ctx context.Context, w *Webhook) error
	GetWebhook(ctx context.Context, id string) (*Webhook, error)
	ListWebhooks(ctx context.Context, orgID string) ([]Webhook, error)
	UpdateWebhook(ctx context.Context, w *Webhook) error
	DeleteWebhook(ctx context.Context, id string) error
	CreateWebhookDelivery(ctx context.Context, d *WebhookDelivery) error
	ListWebhookDeliveries(ctx context.Context, webhookID string, limit int) ([]WebhookDelivery, error)
}

// ApprovalStore provides CRUD for approval requests.
type ApprovalStore interface {
	CreateApprovalRequest(ctx context.Context, ar *ApprovalRequest) error
	GetApprovalRequest(ctx context.Context, id string) (*ApprovalRequest, error)
	ListApprovalRequests(ctx context.Context, orgID string, status string, limit, offset int) ([]ApprovalRequest, error)
	UpdateApprovalRequest(ctx context.Context, ar *ApprovalRequest) error
	CountApprovalRequests(ctx context.Context, orgID string, status string) (int, error)
}

// BillingStore provides access to billing and usage data.
type BillingStore interface {
	GetSubscription(ctx context.Context, orgID string) (*Subscription, error)
	UpsertSubscription(ctx context.Context, sub *Subscription) error
	UpdateOrgPlan(ctx context.Context, orgID, plan string, limits PlanLimits) error
	IncrementUsage(ctx context.Context, orgID, metricName string, delta int64) error
	GetUsage(ctx context.Context, orgID, metricName string) (*UsageMetric, error)

	// Payment gateway support
	GetSubscriptionByStripeID(ctx context.Context, stripeSubID string) (*Subscription, error)
	CreatePaymentEvent(ctx context.Context, event *PaymentEvent) error
	GetPaymentEventByExternalID(ctx context.Context, provider, eventID string) (*PaymentEvent, error)
	UpdateOrgPaymentGateway(ctx context.Context, orgID, gateway string) error

	// Dunning: find subscriptions stuck in past_due for longer than the grace period.
	ListPastDueSubscriptions(ctx context.Context, pastDueBefore time.Time) ([]Subscription, error)
}

// OnboardingStore provides access to onboarding state.
type OnboardingStore interface {
	GetOnboardingState(ctx context.Context, orgID string) (*OnboardingState, error)
	UpsertOnboardingState(ctx context.Context, state *OnboardingState) error
}

// SalesStore provides access to sales inquiries.
type SalesStore interface {
	CreateSalesInquiry(ctx context.Context, inq *SalesInquiry) error
}

// PendingRegistrationStore provides access to verify-first signup data.
type PendingRegistrationStore interface {
	UpsertPendingRegistration(ctx context.Context, pr *PendingRegistration) error
	GetPendingRegistrationByEmail(ctx context.Context, email string) (*PendingRegistration, error)
	IncrementPendingAttempts(ctx context.Context, id string) error
	DeletePendingRegistration(ctx context.Context, id string) error
	DeleteExpiredPendingRegistrations(ctx context.Context, before time.Time) (int, error)
}

// OrgLifecycleStore provides organization lifecycle management.
type OrgLifecycleStore interface {
	SoftDeleteOrganization(ctx context.Context, orgID string) error
	RestoreOrganization(ctx context.Context, orgID string) error
	ListSoftDeletedOrgs(ctx context.Context, deletedBefore time.Time) ([]Organization, error)
	HardDeleteOrganization(ctx context.Context, orgID string) error
	ListInactiveOrgs(ctx context.Context, plan string, inactiveSince time.Time) ([]Organization, error)
	DowngradeOrgToFree(ctx context.Context, orgID string) error
}

// OneTimeTokenStore provides access to cross-domain auth tokens.
type OneTimeTokenStore interface {
	CreateOneTimeToken(ctx context.Context, userID, orgID string, ttl time.Duration) (string, error)
	ConsumeOneTimeToken(ctx context.Context, token string) (userID, orgID string, err error)
}

// ScheduleReader provides read access to pending flag schedules.
type ScheduleReader interface {
	ListPendingSchedules(ctx context.Context, before time.Time) ([]FlagState, error)
}

// MagicLinkStore manages one-time login tokens for email deep links.
type MagicLinkStore interface {
	CreateMagicLinkToken(ctx context.Context, userID, orgID, token string, expires time.Time) error
	ConsumeMagicLinkToken(ctx context.Context, token string) (userID, orgID string, err error)
}

// Store defines the contract for all data access operations.
//
// Every handler and service depends on this interface — never on a concrete
// implementation. This makes the entire server testable with an in-memory
// mock (see handlers/testutil_test.go) and allows swapping PostgreSQL for
// another backend without touching business logic.
//
// It composes all focused sub-interfaces above. Implementations must be safe
// for concurrent use.
// TokenRevocationStore manages revoked JWT tokens for server-side session invalidation.
type TokenRevocationStore interface {
	RevokeToken(ctx context.Context, jti, userID, orgID string, expiresAt time.Time) error
	IsTokenRevoked(ctx context.Context, jti string) (bool, error)
	CleanExpiredRevocations(ctx context.Context) error
}

// MFAStore manages TOTP multi-factor authentication secrets.
type MFAStore interface {
	UpsertMFASecret(ctx context.Context, userID, secret string) error
	GetMFASecret(ctx context.Context, userID string) (*MFASecret, error)
	EnableMFA(ctx context.Context, userID string) error
	DisableMFA(ctx context.Context, userID string) error
}

// LoginAttemptStore records login attempts for brute-force detection.
type LoginAttemptStore interface {
	RecordLoginAttempt(ctx context.Context, email, ip, ua string, success bool) error
	CountRecentFailedAttempts(ctx context.Context, email string, since time.Time) (int, error)
}

// IPAllowlistStore manages per-org IP allowlist configuration.
type IPAllowlistStore interface {
	GetIPAllowlist(ctx context.Context, orgID string) (bool, []string, error)
	UpsertIPAllowlist(ctx context.Context, orgID string, enabled bool, cidrs []string) error
}

// CustomRoleStore provides CRUD for org-scoped custom roles.
type CustomRoleStore interface {
	CreateCustomRole(ctx context.Context, role *CustomRole) error
	GetCustomRole(ctx context.Context, id string) (*CustomRole, error)
	ListCustomRoles(ctx context.Context, orgID string) ([]CustomRole, error)
	UpdateCustomRole(ctx context.Context, role *CustomRole) error
	DeleteCustomRole(ctx context.Context, id string) error
}

// UserPreferenceStore manages user-level product preferences (email consent,
// communication settings, dismissed hints, product tour state).
type UserPreferenceStore interface {
	UpdateUserEmailPreferences(ctx context.Context, userID string, consent bool, preference string) error
	GetUserEmailPreferences(ctx context.Context, userID string) (consent bool, preference string, err error)
	DismissHint(ctx context.Context, userID, hintID string) error
	GetDismissedHints(ctx context.Context, userID string) ([]string, error)
	SetTourCompleted(ctx context.Context, userID string) error
}

// FeedbackWriter persists in-product user feedback.
type FeedbackWriter interface {
	InsertFeedback(ctx context.Context, fb *Feedback) error
}

// FlagVersionStore provides CRUD for flag version history.
type FlagVersionStore interface {
	ListFlagVersions(ctx context.Context, flagID string, limit, offset int) ([]FlagVersion, error)
	GetFlagVersion(ctx context.Context, flagID string, version int) (*FlagVersion, error)
	RollbackFlagToVersion(ctx context.Context, flagID string, version int, userID string, reason string) error
}

// StatusRecorder records and queries infrastructure health checks.
type StatusRecorder interface {
	InsertStatusChecks(ctx context.Context, checks []StatusCheck) error
	GetComponentHistory(ctx context.Context, days int) ([]DailyComponentStatus, error)
}


// SearchHit is a cross-resource search result used by SearchStore.
type SearchHit struct {
	ID          string `json:"id"`
	Label       string `json:"label"`
	Description string `json:"description"`
	Category    string `json:"category"`
	Href        string `json:"href"`
}

// LimitsReader returns plan limits and current resource usage.
type LimitsReader interface {
	GetLimitsConfig(ctx context.Context, plan string) (*LimitsConfigRow, error)
	CountFlags(ctx context.Context, orgID string) (int, error)
	CountSegments(ctx context.Context, orgID string) (int, error)
	CountEnvironments(ctx context.Context, orgID string) (int, error)
	CountMembers(ctx context.Context, orgID string) (int, error)
	CountWebhooks(ctx context.Context, orgID string) (int, error)
	CountAPIKeys(ctx context.Context, orgID string) (int, error)
	CountProjects(ctx context.Context, orgID string) (int, error)
}

// PinnedItemsStore manages user-pinned resource bookmarks.
type PinnedItemsStore interface {
	ListPinnedItems(ctx context.Context, orgID, userID, projectID string) ([]PinnedItem, error)
	CreatePinnedItem(ctx context.Context, orgID, userID, projectID, resourceType, resourceID string) (*PinnedItem, error)
	DeletePinnedItem(ctx context.Context, orgID, userID, pinnedItemID string) error
}

// SearchStore provides cross-resource search.
type SearchStore interface {
	Search(ctx context.Context, orgID, projectID, query string) ([]SearchHit, error)
}

type Store interface {
	FlagReader
	FlagWriter
	SegmentStore
	EvalStore
	AuditWriter
	AuditReader
	ProjectReader
	ProjectWriter
	EnvironmentReader
	EnvironmentWriter
	OrgReader
	OrgWriter
	UserReader
	UserWriter
	OrgMemberStore
	EnvPermissionStore
	APIKeyStore
	WebhookStore
	ApprovalStore
	BillingStore
	CreditStore
	OnboardingStore
	SalesStore
	PendingRegistrationStore
	OrgLifecycleStore
	OneTimeTokenStore
	ScheduleReader
	SSOStore
	TokenRevocationStore
	MFAStore
	LoginAttemptStore
	IPAllowlistStore
	CustomRoleStore
	EventStore
	UserPreferenceStore
	FeedbackWriter
	FlagVersionStore
	StatusRecorder
	MagicLinkStore
	OpsStore
	IntegrationStore
	OpsPortalStore
	SessionStore
	LimitsReader
	PinnedItemsStore
	SearchStore
}
