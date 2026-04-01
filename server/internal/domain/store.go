package domain

import "context"

// Store defines the interface for all data access operations.
// Handlers depend on this interface, not the concrete postgres.Store.
type Store interface {
	// Organizations
	CreateOrganization(ctx context.Context, org *Organization) error
	GetOrganization(ctx context.Context, id string) (*Organization, error)

	// Users
	CreateUser(ctx context.Context, user *User) error
	GetUserByEmail(ctx context.Context, email string) (*User, error)
	GetUserByID(ctx context.Context, id string) (*User, error)

	// Org Members
	AddOrgMember(ctx context.Context, member *OrgMember) error
	GetOrgMember(ctx context.Context, orgID, userID string) (*OrgMember, error)
	ListOrgMembers(ctx context.Context, orgID string) ([]OrgMember, error)

	// Projects
	CreateProject(ctx context.Context, p *Project) error
	GetProject(ctx context.Context, id string) (*Project, error)
	ListProjects(ctx context.Context, orgID string) ([]Project, error)
	DeleteProject(ctx context.Context, id string) error

	// Environments
	CreateEnvironment(ctx context.Context, e *Environment) error
	ListEnvironments(ctx context.Context, projectID string) ([]Environment, error)
	GetEnvironment(ctx context.Context, id string) (*Environment, error)
	DeleteEnvironment(ctx context.Context, id string) error

	// Flags
	CreateFlag(ctx context.Context, f *Flag) error
	GetFlag(ctx context.Context, projectID, key string) (*Flag, error)
	ListFlags(ctx context.Context, projectID string) ([]Flag, error)
	UpdateFlag(ctx context.Context, f *Flag) error
	DeleteFlag(ctx context.Context, id string) error

	// Flag States
	UpsertFlagState(ctx context.Context, fs *FlagState) error
	GetFlagState(ctx context.Context, flagID, envID string) (*FlagState, error)

	// Segments
	CreateSegment(ctx context.Context, seg *Segment) error
	ListSegments(ctx context.Context, projectID string) ([]Segment, error)
	GetSegment(ctx context.Context, projectID, key string) (*Segment, error)
	DeleteSegment(ctx context.Context, id string) error

	// API Keys
	CreateAPIKey(ctx context.Context, k *APIKey) error
	GetAPIKeyByHash(ctx context.Context, keyHash string) (*APIKey, error)
	ListAPIKeys(ctx context.Context, envID string) ([]APIKey, error)
	RevokeAPIKey(ctx context.Context, id string) error
	UpdateAPIKeyLastUsed(ctx context.Context, id string) error

	// Audit Log
	CreateAuditEntry(ctx context.Context, entry *AuditEntry) error
	ListAuditEntries(ctx context.Context, orgID string, limit, offset int) ([]AuditEntry, error)

	// Ruleset Loading (for evaluation cache)
	LoadRuleset(ctx context.Context, projectID, envID string) ([]Flag, []FlagState, []Segment, error)

	// Listen for changes
	ListenForChanges(ctx context.Context, callback func(payload string)) error

	// Get environment by API key
	GetEnvironmentByAPIKeyHash(ctx context.Context, keyHash string) (*Environment, *APIKey, error)
}
