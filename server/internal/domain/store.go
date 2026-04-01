package domain

import (
	"context"
	"time"
)

// Store defines the contract for all data access operations.
//
// Every handler and service depends on this interface — never on a concrete
// implementation. This makes the entire server testable with an in-memory
// mock (see handlers/testutil_test.go) and allows swapping PostgreSQL for
// another backend without touching business logic.
//
// Implementations must be safe for concurrent use.
type Store interface {
	// ── Organizations ────────────────────────────────────────────────────
	CreateOrganization(ctx context.Context, org *Organization) error
	GetOrganization(ctx context.Context, id string) (*Organization, error)

	// ── Users ────────────────────────────────────────────────────────────
	CreateUser(ctx context.Context, user *User) error
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, id string) (*User, error)

	// ── Org Members ──────────────────────────────────────────────────────
	AddOrgMember(ctx context.Context, member *OrgMember) error
	// GetOrgMember retrieves a membership. Pass orgID="" to search all orgs.
	GetOrgMember(ctx context.Context, orgID, userID string) (*OrgMember, error)
	GetOrgMemberByID(ctx context.Context, memberID string) (*OrgMember, error)
	// ListOrgMembers lists members. Pass orgID="" to list across all orgs.
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
	GetEnvironment(ctx context.Context, id string) (*Environment, error)
	DeleteEnvironment(ctx context.Context, id string) error

	// ── Flags ────────────────────────────────────────────────────────────
	CreateFlag(ctx context.Context, f *Flag) error
	GetFlag(ctx context.Context, projectID, key string) (*Flag, error)
	ListFlags(ctx context.Context, projectID string) ([]Flag, error)
	UpdateFlag(ctx context.Context, f *Flag) error
	DeleteFlag(ctx context.Context, id string) error

	// ── Flag States (per environment) ────────────────────────────────────
	UpsertFlagState(ctx context.Context, fs *FlagState) error
	GetFlagState(ctx context.Context, flagID, envID string) (*FlagState, error)
	// ListPendingSchedules returns flag states with a schedule time that has passed.
	ListPendingSchedules(ctx context.Context, before time.Time) ([]FlagState, error)

	// ── Segments ─────────────────────────────────────────────────────────
	CreateSegment(ctx context.Context, seg *Segment) error
	ListSegments(ctx context.Context, projectID string) ([]Segment, error)
	GetSegment(ctx context.Context, projectID, key string) (*Segment, error)
	UpdateSegment(ctx context.Context, seg *Segment) error
	DeleteSegment(ctx context.Context, id string) error

	// ── API Keys ─────────────────────────────────────────────────────────
	CreateAPIKey(ctx context.Context, k *APIKey) error
	GetAPIKeyByHash(ctx context.Context, keyHash string) (*APIKey, error)
	ListAPIKeys(ctx context.Context, envID string) ([]APIKey, error)
	RevokeAPIKey(ctx context.Context, id string) error
	UpdateAPIKeyLastUsed(ctx context.Context, id string) error

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

	// ── Audit Log ────────────────────────────────────────────────────────
	CreateAuditEntry(ctx context.Context, entry *AuditEntry) error
	ListAuditEntries(ctx context.Context, orgID string, limit, offset int) ([]AuditEntry, error)

	// ── Evaluation (hot path) ────────────────────────────────────────────

	// LoadRuleset fetches all data needed to evaluate flags in one call.
	// Used by the cache to populate an in-memory Ruleset.
	LoadRuleset(ctx context.Context, projectID, envID string) ([]Flag, []FlagState, []Segment, error)

	// ListenForChanges subscribes to real-time change notifications (e.g.
	// PostgreSQL LISTEN/NOTIFY) and invokes callback on each event.
	ListenForChanges(ctx context.Context, callback func(payload string)) error

	// GetEnvironmentByAPIKeyHash resolves an API key hash to its parent
	// Environment and the key record itself.
	GetEnvironmentByAPIKeyHash(ctx context.Context, keyHash string) (*Environment, *APIKey, error)
}
