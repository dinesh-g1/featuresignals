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
	GetFlagState(ctx context.Context, flagID, envID string) (*FlagState, error)
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
}

// AuditReader provides read access to the audit log.
type AuditReader interface {
	ListAuditEntries(ctx context.Context, orgID string, limit, offset int) ([]AuditEntry, error)
}

// Store defines the contract for all data access operations.
//
// Every handler and service depends on this interface — never on a concrete
// implementation. This makes the entire server testable with an in-memory
// mock (see handlers/testutil_test.go) and allows swapping PostgreSQL for
// another backend without touching business logic.
//
// It composes the focused sub-interfaces above plus remaining methods that
// are not yet extracted into their own interfaces.
//
// Implementations must be safe for concurrent use.
type Store interface {
	FlagReader
	FlagWriter
	SegmentStore
	EvalStore
	AuditWriter
	AuditReader

	// ── Organizations ────────────────────────────────────────────────────
	CreateOrganization(ctx context.Context, org *Organization) error
	GetOrganization(ctx context.Context, id string) (*Organization, error)
	GetOrganizationByIDPrefix(ctx context.Context, prefix string) (*Organization, error)

	// ── Users ────────────────────────────────────────────────────────────
	CreateUser(ctx context.Context, user *User) error
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, id string) (*User, error)
	GetUserByEmailVerifyToken(ctx context.Context, token string) (*User, error)
	UpdateUserPhone(ctx context.Context, userID, phone string) error
	UpdateUserPhoneOTP(ctx context.Context, userID, otpHash string, expires time.Time) error
	SetPhoneVerified(ctx context.Context, userID string) error
	UpdateUserEmailVerifyToken(ctx context.Context, userID, token string, expires time.Time) error
	SetEmailVerified(ctx context.Context, userID string) error

	// ── Org Members ──────────────────────────────────────────────────────
	AddOrgMember(ctx context.Context, member *OrgMember) error
	GetOrgMember(ctx context.Context, orgID, userID string) (*OrgMember, error)
	GetOrgMemberByID(ctx context.Context, memberID string) (*OrgMember, error)
	ListOrgMembers(ctx context.Context, orgID string) ([]OrgMember, error)
	UpdateOrgMemberRole(ctx context.Context, memberID string, role Role) error
	RemoveOrgMember(ctx context.Context, memberID string) error

	// ── Environment Permissions ──────────────────────────────────────────
	ListEnvPermissions(ctx context.Context, memberID string) ([]EnvPermission, error)
	UpsertEnvPermission(ctx context.Context, perm *EnvPermission) error
	DeleteEnvPermission(ctx context.Context, id string) error

	// ── Projects ─────────────────────────────────────────────────────────
	CreateProject(ctx context.Context, p *Project) error
	GetProject(ctx context.Context, id string) (*Project, error)
	ListProjects(ctx context.Context, orgID string) ([]Project, error)
	DeleteProject(ctx context.Context, id string) error

	// ── Environments ─────────────────────────────────────────────────────
	CreateEnvironment(ctx context.Context, e *Environment) error
	ListEnvironments(ctx context.Context, projectID string) ([]Environment, error)
	DeleteEnvironment(ctx context.Context, id string) error

	// ── Flag States (additional) ─────────────────────────────────────────
	ListPendingSchedules(ctx context.Context, before time.Time) ([]FlagState, error)

	// ── API Keys ─────────────────────────────────────────────────────────
	CreateAPIKey(ctx context.Context, k *APIKey) error
	GetAPIKeyByID(ctx context.Context, id string) (*APIKey, error)
	GetAPIKeyByHash(ctx context.Context, keyHash string) (*APIKey, error)
	ListAPIKeys(ctx context.Context, envID string) ([]APIKey, error)
	RevokeAPIKey(ctx context.Context, id string) error

	// ── Webhooks ─────────────────────────────────────────────────────────
	CreateWebhook(ctx context.Context, w *Webhook) error
	GetWebhook(ctx context.Context, id string) (*Webhook, error)
	ListWebhooks(ctx context.Context, orgID string) ([]Webhook, error)
	UpdateWebhook(ctx context.Context, w *Webhook) error
	DeleteWebhook(ctx context.Context, id string) error
	CreateWebhookDelivery(ctx context.Context, d *WebhookDelivery) error
	ListWebhookDeliveries(ctx context.Context, webhookID string, limit int) ([]WebhookDelivery, error)

	// ── Approval Requests ────────────────────────────────────────────────
	CreateApprovalRequest(ctx context.Context, ar *ApprovalRequest) error
	GetApprovalRequest(ctx context.Context, id string) (*ApprovalRequest, error)
	ListApprovalRequests(ctx context.Context, orgID string, status string, limit, offset int) ([]ApprovalRequest, error)
	UpdateApprovalRequest(ctx context.Context, ar *ApprovalRequest) error

	// ── Billing ─────────────────────────────────────────────────────────
	GetSubscription(ctx context.Context, orgID string) (*Subscription, error)
	UpsertSubscription(ctx context.Context, sub *Subscription) error
	UpdateOrgPlan(ctx context.Context, orgID, plan string, limits PlanLimits) error

	// ── Usage ────────────────────────────────────────────────────────────
	IncrementUsage(ctx context.Context, orgID, metricName string, delta int64) error
	GetUsage(ctx context.Context, orgID, metricName string) (*UsageMetric, error)

	// ── Onboarding ───────────────────────────────────────────────────────
	GetOnboardingState(ctx context.Context, orgID string) (*OnboardingState, error)
	UpsertOnboardingState(ctx context.Context, state *OnboardingState) error

	// ── Pending Registrations (verify-first signup) ─────────────────────
	UpsertPendingRegistration(ctx context.Context, pr *PendingRegistration) error
	GetPendingRegistrationByEmail(ctx context.Context, email string) (*PendingRegistration, error)
	IncrementPendingAttempts(ctx context.Context, id string) error
	DeletePendingRegistration(ctx context.Context, id string) error
	DeleteExpiredPendingRegistrations(ctx context.Context, before time.Time) (int, error)

	// ── Trial & Account Lifecycle ────────────────────────────────────────
	UpdateLastLoginAt(ctx context.Context, userID string) error
	SoftDeleteOrganization(ctx context.Context, orgID string) error
	RestoreOrganization(ctx context.Context, orgID string) error
	ListSoftDeletedOrgs(ctx context.Context, deletedBefore time.Time) ([]Organization, error)
	HardDeleteOrganization(ctx context.Context, orgID string) error
	ListInactiveOrgs(ctx context.Context, plan string, inactiveSince time.Time) ([]Organization, error)
	DowngradeOrgToFree(ctx context.Context, orgID string) error

	// ── Sales Inquiries ──────────────────────────────────────────────────
	CreateSalesInquiry(ctx context.Context, inq *SalesInquiry) error

	// ── One-Time Tokens (cross-domain auth) ──────────────────────────────
	CreateOneTimeToken(ctx context.Context, userID, orgID string, ttl time.Duration) (string, error)
	ConsumeOneTimeToken(ctx context.Context, token string) (userID, orgID string, err error)
}
