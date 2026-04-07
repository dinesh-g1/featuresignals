package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// mockStore implements domain.Store for testing handlers without a database.
type mockStore struct {
	mu sync.RWMutex

	orgs           map[string]*domain.Organization
	users          map[string]*domain.User    // id -> user
	usersByEmail   map[string]*domain.User    // email -> user
	orgMembers     map[string][]domain.OrgMember // orgID -> members
	orgMembersByID map[string]*domain.OrgMember  // memberID -> member
	projects       map[string]*domain.Project
	projectsByOrg  map[string][]string // orgID -> []projectID
	envs           map[string]*domain.Environment
	envsByProject  map[string][]string // projectID -> []envID
	flags          map[string]*domain.Flag // "projectID:key" -> flag
	flagsByProject map[string][]string  // projectID -> []keys
	flagStates     map[string]*domain.FlagState // "flagID:envID" -> state
	segments       map[string]*domain.Segment // "projectID:key" -> segment
	apiKeys        map[string]*domain.APIKey // keyHash -> apikey
	apiKeysByEnv   map[string][]string       // envID -> []keyHash
	apiKeysById    map[string]*domain.APIKey // id -> apikey
	auditEntries   []domain.AuditEntry
	envPerms       map[string][]domain.EnvPermission // memberID -> perms
	envPermsById   map[string]*domain.EnvPermission  // id -> perm
	webhooks       map[string]*domain.Webhook        // id -> webhook
	webhooksByOrg  map[string][]string               // orgID -> []webhookID
	whDeliveries     map[string][]domain.WebhookDelivery        // webhookID -> deliveries
	approvals        map[string]*domain.ApprovalRequest         // id -> approval
	approvalsByOrg   map[string][]string                        // orgID -> []approvalID
	onboardingStates map[string]*domain.OnboardingState         // orgID -> state
	oneTimeTokens    map[string]*ottEntry                       // token -> entry
	pendingRegs      map[string]*domain.PendingRegistration     // email -> pending reg
	salesInquiries   []*domain.SalesInquiry
	ssoByOrgID       map[string]*domain.SSOConfig        // orgID -> sso config
	ssoConfigs       map[string]*domain.SSOConfig        // orgSlug -> sso config
	revokedTokens    map[string]bool
	mfaSecrets       map[string]*domain.MFASecret
	customRoles      map[string]*domain.CustomRole
	customRolesByOrg map[string][]string // orgID -> []roleID
	subscriptions    map[string]*domain.Subscription // stripeSubID -> subscription

	idCounter int
}

type ottEntry struct {
	userID    string
	orgID     string
	used      bool
	expiresAt time.Time
}

func newMockStore() *mockStore {
	return &mockStore{
		orgs:           make(map[string]*domain.Organization),
		users:          make(map[string]*domain.User),
		usersByEmail:   make(map[string]*domain.User),
		orgMembers:     make(map[string][]domain.OrgMember),
		orgMembersByID: make(map[string]*domain.OrgMember),
		projects:       make(map[string]*domain.Project),
		projectsByOrg:  make(map[string][]string),
		envs:           make(map[string]*domain.Environment),
		envsByProject:  make(map[string][]string),
		flags:          make(map[string]*domain.Flag),
		flagsByProject: make(map[string][]string),
		flagStates:     make(map[string]*domain.FlagState),
		segments:       make(map[string]*domain.Segment),
		apiKeys:        make(map[string]*domain.APIKey),
		apiKeysByEnv:   make(map[string][]string),
		apiKeysById:    make(map[string]*domain.APIKey),
		envPerms:       make(map[string][]domain.EnvPermission),
		envPermsById:   make(map[string]*domain.EnvPermission),
		webhooks:       make(map[string]*domain.Webhook),
		webhooksByOrg:    make(map[string][]string),
		whDeliveries:     make(map[string][]domain.WebhookDelivery),
		onboardingStates: make(map[string]*domain.OnboardingState),
		oneTimeTokens:    make(map[string]*ottEntry),
		pendingRegs:      make(map[string]*domain.PendingRegistration),
		ssoByOrgID:       make(map[string]*domain.SSOConfig),
		ssoConfigs:       make(map[string]*domain.SSOConfig),
		customRoles:      make(map[string]*domain.CustomRole),
		customRolesByOrg: make(map[string][]string),
		subscriptions:    make(map[string]*domain.Subscription),
	}
}

func (m *mockStore) nextID() string {
	m.idCounter++
	return fmt.Sprintf("id-%d", m.idCounter)
}

func (m *mockStore) CreateOrganization(ctx context.Context, org *domain.Organization) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	org.ID = m.nextID()
	m.orgs[org.ID] = org
	return nil
}

func (m *mockStore) GetOrganization(ctx context.Context, id string) (*domain.Organization, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	org, ok := m.orgs[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return org, nil
}

func (m *mockStore) GetOrganizationByIDPrefix(ctx context.Context, prefix string) (*domain.Organization, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for id, org := range m.orgs {
		if len(id) >= len(prefix) && id[:len(prefix)] == prefix {
			return org, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockStore) CreateUser(ctx context.Context, user *domain.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.usersByEmail[user.Email]; exists {
		return domain.WrapConflict("email")
	}
	user.ID = m.nextID()
	m.users[user.ID] = user
	m.usersByEmail[user.Email] = user
	return nil
}

func (m *mockStore) GetUserByEmail(ctx context.Context, email string) (*domain.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	user, ok := m.usersByEmail[email]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return user, nil
}

func (m *mockStore) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	user, ok := m.users[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return user, nil
}

func (m *mockStore) AddOrgMember(ctx context.Context, member *domain.OrgMember) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	member.ID = m.nextID()
	m.orgMembers[member.OrgID] = append(m.orgMembers[member.OrgID], *member)
	cp := *member
	m.orgMembersByID[member.ID] = &cp
	return nil
}

func (m *mockStore) GetOrgMemberByID(ctx context.Context, memberID string) (*domain.OrgMember, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	mem, ok := m.orgMembersByID[memberID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return mem, nil
}

func (m *mockStore) UpdateOrgMemberRole(ctx context.Context, memberID string, role domain.Role) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	mem, ok := m.orgMembersByID[memberID]
	if !ok {
		return domain.ErrNotFound
	}
	mem.Role = role
	for i, mm := range m.orgMembers[mem.OrgID] {
		if mm.ID == memberID {
			m.orgMembers[mem.OrgID][i].Role = role
			break
		}
	}
	return nil
}

func (m *mockStore) RemoveOrgMember(ctx context.Context, memberID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	mem, ok := m.orgMembersByID[memberID]
	if !ok {
		return domain.ErrNotFound
	}
	delete(m.orgMembersByID, memberID)
	members := m.orgMembers[mem.OrgID]
	for i, mm := range members {
		if mm.ID == memberID {
			m.orgMembers[mem.OrgID] = append(members[:i], members[i+1:]...)
			break
		}
	}
	return nil
}

func (m *mockStore) ListEnvPermissions(ctx context.Context, memberID string) ([]domain.EnvPermission, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	perms := m.envPerms[memberID]
	if perms == nil {
		return []domain.EnvPermission{}, nil
	}
	return perms, nil
}

func (m *mockStore) UpsertEnvPermission(ctx context.Context, perm *domain.EnvPermission) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for i, existing := range m.envPerms[perm.MemberID] {
		if existing.EnvID == perm.EnvID {
			perm.ID = existing.ID
			m.envPerms[perm.MemberID][i] = *perm
			m.envPermsById[perm.ID] = perm
			return nil
		}
	}
	perm.ID = m.nextID()
	m.envPerms[perm.MemberID] = append(m.envPerms[perm.MemberID], *perm)
	cp := *perm
	m.envPermsById[perm.ID] = &cp
	return nil
}

func (m *mockStore) DeleteEnvPermission(ctx context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	p, ok := m.envPermsById[id]
	if !ok {
		return nil
	}
	delete(m.envPermsById, id)
	perms := m.envPerms[p.MemberID]
	for i, pp := range perms {
		if pp.ID == id {
			m.envPerms[p.MemberID] = append(perms[:i], perms[i+1:]...)
			break
		}
	}
	return nil
}

func (m *mockStore) GetOrgMember(ctx context.Context, orgID, userID string) (*domain.OrgMember, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	// If orgID is empty, search all orgs (for login flow)
	if orgID == "" {
		for _, members := range m.orgMembers {
			for i := range members {
				if members[i].UserID == userID {
					return &members[i], nil
				}
			}
		}
		return nil, domain.ErrNotFound
	}
	members := m.orgMembers[orgID]
	for i := range members {
		if members[i].UserID == userID {
			return &members[i], nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockStore) ListOrgMembers(ctx context.Context, orgID string) ([]domain.OrgMember, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if orgID == "" {
		var all []domain.OrgMember
		for _, members := range m.orgMembers {
			all = append(all, members...)
		}
		return all, nil
	}
	return m.orgMembers[orgID], nil
}

func (m *mockStore) CreateProject(ctx context.Context, p *domain.Project) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	p.ID = m.nextID()
	m.projects[p.ID] = p
	m.projectsByOrg[p.OrgID] = append(m.projectsByOrg[p.OrgID], p.ID)
	return nil
}

func (m *mockStore) GetProject(ctx context.Context, id string) (*domain.Project, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	p, ok := m.projects[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return p, nil
}

func (m *mockStore) ListProjects(ctx context.Context, orgID string) ([]domain.Project, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.Project
	for _, id := range m.projectsByOrg[orgID] {
		if p, ok := m.projects[id]; ok {
			result = append(result, *p)
		}
	}
	return result, nil
}

func (m *mockStore) DeleteProject(ctx context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.projects, id)
	return nil
}

func (m *mockStore) CreateEnvironment(ctx context.Context, e *domain.Environment) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	e.ID = m.nextID()
	m.envs[e.ID] = e
	m.envsByProject[e.ProjectID] = append(m.envsByProject[e.ProjectID], e.ID)
	return nil
}

func (m *mockStore) ListEnvironments(ctx context.Context, projectID string) ([]domain.Environment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.Environment
	for _, id := range m.envsByProject[projectID] {
		if e, ok := m.envs[id]; ok {
			result = append(result, *e)
		}
	}
	return result, nil
}

func (m *mockStore) GetEnvironment(ctx context.Context, id string) (*domain.Environment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	e, ok := m.envs[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return e, nil
}

func (m *mockStore) DeleteEnvironment(ctx context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.envs, id)
	return nil
}

func (m *mockStore) CreateFlag(ctx context.Context, f *domain.Flag) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := f.ProjectID + ":" + f.Key
	if _, exists := m.flags[key]; exists {
		return domain.WrapConflict("flag key")
	}
	f.ID = m.nextID()
	m.flags[key] = f
	m.flagsByProject[f.ProjectID] = append(m.flagsByProject[f.ProjectID], f.Key)
	return nil
}

func (m *mockStore) GetFlag(ctx context.Context, projectID, key string) (*domain.Flag, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	f, ok := m.flags[projectID+":"+key]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return f, nil
}

func (m *mockStore) ListFlags(ctx context.Context, projectID string) ([]domain.Flag, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.Flag
	for _, key := range m.flagsByProject[projectID] {
		if f, ok := m.flags[projectID+":"+key]; ok {
			result = append(result, *f)
		}
	}
	return result, nil
}

func (m *mockStore) UpdateFlag(ctx context.Context, f *domain.Flag) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for key, existing := range m.flags {
		if existing.ID == f.ID {
			m.flags[key] = f
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockStore) DeleteFlag(ctx context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for key, f := range m.flags {
		if f.ID == id {
			delete(m.flags, key)
			return nil
		}
	}
	return nil
}

func (m *mockStore) UpsertFlagState(ctx context.Context, fs *domain.FlagState) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := fs.FlagID + ":" + fs.EnvID
	if fs.ID == "" {
		fs.ID = m.nextID()
	}
	m.flagStates[key] = fs
	return nil
}

func (m *mockStore) GetFlagState(ctx context.Context, flagID, envID string) (*domain.FlagState, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	fs, ok := m.flagStates[flagID+":"+envID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return fs, nil
}

func (m *mockStore) ListFlagStatesByEnv(_ context.Context, envID string) ([]domain.FlagState, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var states []domain.FlagState
	for _, fs := range m.flagStates {
		if fs.EnvID == envID {
			states = append(states, *fs)
		}
	}
	return states, nil
}

func (m *mockStore) CreateSegment(ctx context.Context, seg *domain.Segment) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := seg.ProjectID + ":" + seg.Key
	if _, exists := m.segments[key]; exists {
		return domain.WrapConflict("segment key")
	}
	seg.ID = m.nextID()
	m.segments[key] = seg
	return nil
}

func (m *mockStore) ListSegments(ctx context.Context, projectID string) ([]domain.Segment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.Segment
	for key, seg := range m.segments {
		if len(key) > len(projectID) && key[:len(projectID)] == projectID {
			result = append(result, *seg)
		}
	}
	return result, nil
}

func (m *mockStore) GetSegment(ctx context.Context, projectID, key string) (*domain.Segment, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	seg, ok := m.segments[projectID+":"+key]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return seg, nil
}

func (m *mockStore) UpdateSegment(ctx context.Context, seg *domain.Segment) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for key, existing := range m.segments {
		if existing.ID == seg.ID {
			m.segments[key] = seg
			return nil
		}
	}
	return domain.ErrNotFound
}

func (m *mockStore) DeleteSegment(ctx context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for key, seg := range m.segments {
		if seg.ID == id {
			delete(m.segments, key)
			return nil
		}
	}
	return nil
}

func (m *mockStore) CreateAPIKey(ctx context.Context, k *domain.APIKey) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	k.ID = m.nextID()
	m.apiKeys[k.KeyHash] = k
	m.apiKeysById[k.ID] = k
	m.apiKeysByEnv[k.EnvID] = append(m.apiKeysByEnv[k.EnvID], k.KeyHash)
	return nil
}

func (m *mockStore) GetAPIKeyByID(ctx context.Context, id string) (*domain.APIKey, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	k, ok := m.apiKeysById[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return k, nil
}

func (m *mockStore) GetAPIKeyByHash(ctx context.Context, keyHash string) (*domain.APIKey, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	k, ok := m.apiKeys[keyHash]
	if !ok {
		return nil, domain.ErrNotFound
	}
	if k.RevokedAt != nil {
		return nil, domain.ErrNotFound
	}
	if k.ExpiresAt != nil && time.Now().After(*k.ExpiresAt) {
		return nil, domain.ErrNotFound
	}
	return k, nil
}

func (m *mockStore) ListAPIKeys(ctx context.Context, envID string) ([]domain.APIKey, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.APIKey
	for _, hash := range m.apiKeysByEnv[envID] {
		if k, ok := m.apiKeys[hash]; ok {
			result = append(result, *k)
		}
	}
	return result, nil
}

func (m *mockStore) RevokeAPIKey(ctx context.Context, id string) error {
	return nil
}

func (m *mockStore) UpdateAPIKeyLastUsed(ctx context.Context, id string) error {
	return nil
}

func (m *mockStore) RotateAPIKey(_ context.Context, _, _, _, _, _ string, _ time.Duration) (*domain.APIKey, error) {
	return &domain.APIKey{ID: m.nextID(), Name: "rotated"}, nil
}

func (m *mockStore) CleanExpiredGracePeriodKeys(_ context.Context) error { return nil }

func (m *mockStore) CreateAuditEntry(ctx context.Context, entry *domain.AuditEntry) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	entry.ID = m.nextID()
	m.auditEntries = append(m.auditEntries, *entry)
	return nil
}

func (m *mockStore) ListAuditEntries(ctx context.Context, orgID string, limit, offset int) ([]domain.AuditEntry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.AuditEntry
	for _, e := range m.auditEntries {
		if e.OrgID == orgID {
			result = append(result, e)
		}
	}
	if offset >= len(result) {
		return []domain.AuditEntry{}, nil
	}
	result = result[offset:]
	if limit < len(result) {
		result = result[:limit]
	}
	return result, nil
}

func (m *mockStore) ListAuditEntriesForExport(_ context.Context, orgID string, _, _ string) ([]domain.AuditEntry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.AuditEntry
	for _, e := range m.auditEntries {
		if e.OrgID == orgID {
			result = append(result, e)
		}
	}
	return result, nil
}

func (m *mockStore) GetLastAuditHash(_ context.Context, _ string) (string, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if len(m.auditEntries) == 0 {
		return "", nil
	}
	return m.auditEntries[len(m.auditEntries)-1].IntegrityHash, nil
}

func (m *mockStore) PurgeAuditEntries(_ context.Context, _ time.Time) (int, error) { return 0, nil }

func (m *mockStore) CountAuditEntries(_ context.Context, orgID string) (int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	count := 0
	for _, e := range m.auditEntries {
		if e.OrgID == orgID {
			count++
		}
	}
	return count, nil
}

func (m *mockStore) LoadRuleset(ctx context.Context, projectID, envID string) ([]domain.Flag, []domain.FlagState, []domain.Segment, error) {
	flags, _ := m.ListFlags(ctx, projectID)
	var states []domain.FlagState
	for _, f := range flags {
		if s, err := m.GetFlagState(ctx, f.ID, envID); err == nil {
			states = append(states, *s)
		}
	}
	segments, _ := m.ListSegments(ctx, projectID)
	return flags, states, segments, nil
}

func (m *mockStore) ListenForChanges(ctx context.Context, callback func(payload string)) error {
	return nil
}

func (m *mockStore) GetEnvironmentByAPIKeyHash(ctx context.Context, keyHash string) (*domain.Environment, *domain.APIKey, error) {
	k, err := m.GetAPIKeyByHash(ctx, keyHash)
	if err != nil {
		return nil, nil, domain.ErrNotFound
	}
	env, err := m.GetEnvironment(ctx, k.EnvID)
	if err != nil {
		return nil, nil, err
	}
	return env, k, nil
}

func (m *mockStore) ListPendingSchedules(ctx context.Context, before time.Time) ([]domain.FlagState, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.FlagState
	for _, fs := range m.flagStates {
		if (fs.ScheduledEnableAt != nil && !fs.ScheduledEnableAt.After(before)) ||
			(fs.ScheduledDisableAt != nil && !fs.ScheduledDisableAt.After(before)) {
			result = append(result, *fs)
		}
	}
	return result, nil
}

func (m *mockStore) CreateWebhook(ctx context.Context, w *domain.Webhook) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	w.ID = m.nextID()
	m.webhooks[w.ID] = w
	m.webhooksByOrg[w.OrgID] = append(m.webhooksByOrg[w.OrgID], w.ID)
	return nil
}

func (m *mockStore) GetWebhook(ctx context.Context, id string) (*domain.Webhook, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	w, ok := m.webhooks[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return w, nil
}

func (m *mockStore) ListWebhooks(ctx context.Context, orgID string) ([]domain.Webhook, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.Webhook
	for _, id := range m.webhooksByOrg[orgID] {
		if w, ok := m.webhooks[id]; ok {
			result = append(result, *w)
		}
	}
	return result, nil
}

func (m *mockStore) UpdateWebhook(ctx context.Context, w *domain.Webhook) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.webhooks[w.ID]; !ok {
		return domain.ErrNotFound
	}
	m.webhooks[w.ID] = w
	return nil
}

func (m *mockStore) DeleteWebhook(ctx context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.webhooks, id)
	return nil
}

func (m *mockStore) CreateWebhookDelivery(ctx context.Context, d *domain.WebhookDelivery) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	d.ID = m.nextID()
	m.whDeliveries[d.WebhookID] = append(m.whDeliveries[d.WebhookID], *d)
	return nil
}

func (m *mockStore) ListWebhookDeliveries(ctx context.Context, webhookID string, limit int) ([]domain.WebhookDelivery, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	dels := m.whDeliveries[webhookID]
	if limit < len(dels) {
		dels = dels[:limit]
	}
	return dels, nil
}

// --- Approval Requests ---

func (m *mockStore) CreateApprovalRequest(ctx context.Context, ar *domain.ApprovalRequest) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	ar.ID = m.nextID()
	ar.CreatedAt = time.Now()
	ar.UpdatedAt = ar.CreatedAt
	if m.approvals == nil {
		m.approvals = make(map[string]*domain.ApprovalRequest)
		m.approvalsByOrg = make(map[string][]string)
	}
	cp := *ar
	m.approvals[ar.ID] = &cp
	m.approvalsByOrg[ar.OrgID] = append(m.approvalsByOrg[ar.OrgID], ar.ID)
	return nil
}

func (m *mockStore) GetApprovalRequest(ctx context.Context, id string) (*domain.ApprovalRequest, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if m.approvals == nil {
		return nil, domain.ErrNotFound
	}
	ar, ok := m.approvals[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *ar
	return &cp, nil
}

func (m *mockStore) ListApprovalRequests(ctx context.Context, orgID string, status string, limit, offset int) ([]domain.ApprovalRequest, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.ApprovalRequest
	if m.approvals == nil {
		return []domain.ApprovalRequest{}, nil
	}
	for _, id := range m.approvalsByOrg[orgID] {
		if ar, ok := m.approvals[id]; ok {
			if status == "" || string(ar.Status) == status {
				result = append(result, *ar)
			}
		}
	}
	if offset >= len(result) {
		return []domain.ApprovalRequest{}, nil
	}
	result = result[offset:]
	if limit < len(result) {
		result = result[:limit]
	}
	return result, nil
}

func (m *mockStore) CountApprovalRequests(_ context.Context, orgID string, status string) (int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	count := 0
	if m.approvals == nil {
		return 0, nil
	}
	for _, id := range m.approvalsByOrg[orgID] {
		if ar, ok := m.approvals[id]; ok {
			if status == "" || string(ar.Status) == status {
				count++
			}
		}
	}
	return count, nil
}

func (m *mockStore) UpdateApprovalRequest(ctx context.Context, ar *domain.ApprovalRequest) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.approvals == nil {
		return domain.ErrNotFound
	}
	if _, ok := m.approvals[ar.ID]; !ok {
		return domain.ErrNotFound
	}
	cp := *ar
	cp.UpdatedAt = time.Now()
	m.approvals[ar.ID] = &cp
	return nil
}

// --- Billing ---

func (m *mockStore) GetSubscription(ctx context.Context, orgID string) (*domain.Subscription, error) {
	return nil, domain.ErrNotFound
}

func (m *mockStore) UpsertSubscription(ctx context.Context, sub *domain.Subscription) error {
	return nil
}

func (m *mockStore) UpdateOrgPlan(ctx context.Context, orgID, plan string, limits domain.PlanLimits) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if org, ok := m.orgs[orgID]; ok {
		org.Plan = plan
		org.PlanSeatsLimit = limits.Seats
		org.PlanProjectsLimit = limits.Projects
		org.PlanEnvironmentsLimit = limits.Environments
	}
	return nil
}

func (m *mockStore) IncrementUsage(ctx context.Context, orgID, metricName string, delta int64) error {
	return nil
}

func (m *mockStore) GetUsage(ctx context.Context, orgID, metricName string) (*domain.UsageMetric, error) {
	return nil, domain.ErrNotFound
}

func (m *mockStore) GetSubscriptionByStripeID(ctx context.Context, stripeSubID string) (*domain.Subscription, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if sub, ok := m.subscriptions[stripeSubID]; ok {
		return sub, nil
	}
	return nil, domain.ErrNotFound
}

func (m *mockStore) CreatePaymentEvent(ctx context.Context, event *domain.PaymentEvent) error {
	return nil
}

func (m *mockStore) GetPaymentEventByExternalID(ctx context.Context, provider, eventID string) (*domain.PaymentEvent, error) {
	return nil, domain.ErrNotFound
}

func (m *mockStore) UpdateOrgPaymentGateway(ctx context.Context, orgID, gateway string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if org, ok := m.orgs[orgID]; ok {
		org.PaymentGateway = gateway
	}
	return nil
}

func (m *mockStore) GetOnboardingState(ctx context.Context, orgID string) (*domain.OnboardingState, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	s, ok := m.onboardingStates[orgID]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return s, nil
}

func (m *mockStore) UpsertOnboardingState(ctx context.Context, state *domain.OnboardingState) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.onboardingStates[state.OrgID] = state
	return nil
}

func (m *mockStore) GetUserByEmailVerifyToken(ctx context.Context, token string) (*domain.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	for _, u := range m.users {
		if u.EmailVerifyToken == token {
			return u, nil
		}
	}
	return nil, domain.ErrNotFound
}

func (m *mockStore) UpdateUserEmailVerifyToken(ctx context.Context, userID, token string, expires time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u, ok := m.users[userID]; ok {
		u.EmailVerifyToken = token
		u.EmailVerifyExpires = &expires
	}
	return nil
}

func (m *mockStore) SetEmailVerified(ctx context.Context, userID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u, ok := m.users[userID]; ok {
		u.EmailVerified = true
		u.EmailVerifyToken = ""
		u.EmailVerifyExpires = nil
	}
	return nil
}

// --- Pending Registrations ---

func (m *mockStore) UpsertPendingRegistration(ctx context.Context, pr *domain.PendingRegistration) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	pr.ID = m.nextID()
	pr.CreatedAt = time.Now()
	m.pendingRegs[pr.Email] = pr
	return nil
}

func (m *mockStore) GetPendingRegistrationByEmail(ctx context.Context, email string) (*domain.PendingRegistration, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	pr, ok := m.pendingRegs[email]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return pr, nil
}

func (m *mockStore) IncrementPendingAttempts(ctx context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, pr := range m.pendingRegs {
		if pr.ID == id {
			pr.Attempts++
			return nil
		}
	}
	return nil
}

func (m *mockStore) DeletePendingRegistration(ctx context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for email, pr := range m.pendingRegs {
		if pr.ID == id {
			delete(m.pendingRegs, email)
			return nil
		}
	}
	return nil
}

func (m *mockStore) DeleteExpiredPendingRegistrations(ctx context.Context, before time.Time) (int, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	count := 0
	for email, pr := range m.pendingRegs {
		if pr.ExpiresAt.Before(before) {
			delete(m.pendingRegs, email)
			count++
		}
	}
	return count, nil
}

// --- Trial & Account Lifecycle ---

func (m *mockStore) UpdateLastLoginAt(ctx context.Context, userID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if u, ok := m.users[userID]; ok {
		now := time.Now()
		u.LastLoginAt = &now
	}
	return nil
}

func (m *mockStore) SoftDeleteOrganization(ctx context.Context, orgID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if org, ok := m.orgs[orgID]; ok {
		now := time.Now()
		org.DeletedAt = &now
	}
	return nil
}

func (m *mockStore) RestoreOrganization(ctx context.Context, orgID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if org, ok := m.orgs[orgID]; ok {
		org.DeletedAt = nil
	}
	return nil
}

func (m *mockStore) ListSoftDeletedOrgs(ctx context.Context, deletedBefore time.Time) ([]domain.Organization, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.Organization
	for _, org := range m.orgs {
		if org.DeletedAt != nil && org.DeletedAt.Before(deletedBefore) {
			result = append(result, *org)
		}
	}
	return result, nil
}

func (m *mockStore) HardDeleteOrganization(ctx context.Context, orgID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.orgs, orgID)
	return nil
}

func (m *mockStore) ListInactiveOrgs(ctx context.Context, plan string, inactiveSince time.Time) ([]domain.Organization, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.Organization
	for _, org := range m.orgs {
		if org.Plan == plan && org.DeletedAt == nil {
			result = append(result, *org)
		}
	}
	return result, nil
}

func (m *mockStore) DowngradeOrgToFree(ctx context.Context, orgID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if org, ok := m.orgs[orgID]; ok {
		defaults := domain.PlanDefaults[domain.PlanFree]
		org.Plan = domain.PlanFree
		org.TrialExpiresAt = nil
		org.PlanSeatsLimit = defaults.Seats
		org.PlanProjectsLimit = defaults.Projects
		org.PlanEnvironmentsLimit = defaults.Environments
	}
	return nil
}

// --- Sales Inquiries ---

func (m *mockStore) CreateSalesInquiry(ctx context.Context, inq *domain.SalesInquiry) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	inq.ID = m.nextID()
	inq.CreatedAt = time.Now()
	m.salesInquiries = append(m.salesInquiries, inq)
	return nil
}

func (m *mockStore) CreateOneTimeToken(ctx context.Context, userID, orgID string, ttl time.Duration) (string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	token := fmt.Sprintf("ott-%d", m.idCounter)
	m.idCounter++
	m.oneTimeTokens[token] = &ottEntry{
		userID:    userID,
		orgID:     orgID,
		used:      false,
		expiresAt: time.Now().Add(ttl),
	}
	return token, nil
}

func (m *mockStore) ConsumeOneTimeToken(ctx context.Context, token string) (string, string, error) {
	m.mu.Lock()
	defer m.mu.Unlock()
	entry, ok := m.oneTimeTokens[token]
	if !ok || entry.used || time.Now().After(entry.expiresAt) {
		return "", "", domain.ErrNotFound
	}
	entry.used = true
	return entry.userID, entry.orgID, nil
}

func jsonRaw(v interface{}) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}

// setupTestProject creates a project owned by orgID and returns its generated ID.
func setupTestProject(store *mockStore, orgID string) string {
	p := &domain.Project{OrgID: orgID, Name: "Test Project", Slug: "test"}
	store.CreateProject(context.Background(), p)
	return p.ID
}

// setupTestEnv creates a project and an environment, returning both IDs.
func setupTestEnv(store *mockStore, orgID string) (projectID, envID string) {
	pID := setupTestProject(store, orgID)
	env := &domain.Environment{ProjectID: pID, Name: "Dev", Slug: "dev"}
	store.CreateEnvironment(context.Background(), env)
	return pID, env.ID
}

// --- SSO Config mock ---

func (m *mockStore) UpsertSSOConfig(_ context.Context, cfg *domain.SSOConfig) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.ssoByOrgID == nil {
		m.ssoByOrgID = make(map[string]*domain.SSOConfig)
	}
	if cfg.ID == "" {
		m.idCounter++
		cfg.ID = fmt.Sprintf("sso-%d", m.idCounter)
	}
	cfg.CreatedAt = time.Now()
	cfg.UpdatedAt = time.Now()
	m.ssoByOrgID[cfg.OrgID] = cfg
	return nil
}

func (m *mockStore) GetSSOConfig(_ context.Context, orgID string) (*domain.SSOConfig, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if cfg, ok := m.ssoByOrgID[orgID]; ok {
		return cfg, nil
	}
	return nil, domain.ErrNotFound
}

func (m *mockStore) GetSSOConfigFull(_ context.Context, orgID string) (*domain.SSOConfig, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if cfg, ok := m.ssoByOrgID[orgID]; ok {
		return cfg, nil
	}
	return nil, domain.ErrNotFound
}

func (m *mockStore) GetSSOConfigByOrgSlug(_ context.Context, slug string) (*domain.SSOConfig, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if cfg, ok := m.ssoConfigs[slug]; ok {
		return cfg, nil
	}
	return nil, domain.ErrNotFound
}

func (m *mockStore) DeleteSSOConfig(_ context.Context, orgID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.ssoByOrgID, orgID)
	return nil
}

// --- Token Revocation ---

func (m *mockStore) RevokeToken(_ context.Context, jti, _, _ string, _ time.Time) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.revokedTokens == nil {
		m.revokedTokens = map[string]bool{}
	}
	m.revokedTokens[jti] = true
	return nil
}

func (m *mockStore) IsTokenRevoked(_ context.Context, jti string) (bool, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	return m.revokedTokens[jti], nil
}

func (m *mockStore) CleanExpiredRevocations(_ context.Context) error { return nil }

// --- MFA ---

func (m *mockStore) UpsertMFASecret(_ context.Context, userID, secret string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.mfaSecrets == nil {
		m.mfaSecrets = map[string]*domain.MFASecret{}
	}
	m.mfaSecrets[userID] = &domain.MFASecret{UserID: userID, Secret: secret}
	return nil
}

func (m *mockStore) GetMFASecret(_ context.Context, userID string) (*domain.MFASecret, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	if s, ok := m.mfaSecrets[userID]; ok {
		return s, nil
	}
	return nil, domain.ErrNotFound
}

func (m *mockStore) EnableMFA(_ context.Context, userID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if s, ok := m.mfaSecrets[userID]; ok {
		s.Enabled = true
	}
	return nil
}

func (m *mockStore) DisableMFA(_ context.Context, userID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	delete(m.mfaSecrets, userID)
	return nil
}

// --- Login Attempts ---

func (m *mockStore) RecordLoginAttempt(_ context.Context, _, _, _ string, _ bool) error { return nil }
func (m *mockStore) CountRecentFailedAttempts(_ context.Context, _ string, _ time.Time) (int, error) {
	return 0, nil
}

// --- IP Allowlist ---

func (m *mockStore) GetIPAllowlist(_ context.Context, _ string) (bool, []string, error) {
	return false, nil, nil
}
func (m *mockStore) UpsertIPAllowlist(_ context.Context, _ string, _ bool, _ []string) error {
	return nil
}

// --- Custom Roles ---

func (m *mockStore) CreateCustomRole(_ context.Context, role *domain.CustomRole) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	for _, id := range m.customRolesByOrg[role.OrgID] {
		if r, ok := m.customRoles[id]; ok && r.Name == role.Name {
			return domain.ErrConflict
		}
	}
	role.ID = m.nextID()
	role.CreatedAt = time.Now()
	role.UpdatedAt = role.CreatedAt
	cp := *role
	m.customRoles[role.ID] = &cp
	m.customRolesByOrg[role.OrgID] = append(m.customRolesByOrg[role.OrgID], role.ID)
	return nil
}

func (m *mockStore) GetCustomRole(_ context.Context, id string) (*domain.CustomRole, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	r, ok := m.customRoles[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	cp := *r
	return &cp, nil
}

func (m *mockStore) ListCustomRoles(_ context.Context, orgID string) ([]domain.CustomRole, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	var result []domain.CustomRole
	for _, id := range m.customRolesByOrg[orgID] {
		if r, ok := m.customRoles[id]; ok {
			result = append(result, *r)
		}
	}
	return result, nil
}

func (m *mockStore) UpdateCustomRole(_ context.Context, role *domain.CustomRole) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.customRoles[role.ID]; !ok {
		return domain.ErrNotFound
	}
	role.UpdatedAt = time.Now()
	cp := *role
	m.customRoles[role.ID] = &cp
	return nil
}

func (m *mockStore) DeleteCustomRole(_ context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.customRoles[id]; !ok {
		return domain.ErrNotFound
	}
	delete(m.customRoles, id)
	return nil
}

func (m *mockStore) SoftDeleteUser(_ context.Context, userID string) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, ok := m.users[userID]; !ok {
		return domain.ErrNotFound
	}
	delete(m.users, userID)
	return nil
}

func (m *mockStore) InsertProductEvent(_ context.Context, _ *domain.ProductEvent) error { return nil }
func (m *mockStore) InsertProductEvents(_ context.Context, _ []domain.ProductEvent) error {
	return nil
}
func (m *mockStore) CountEventsByOrg(_ context.Context, _, _ string, _ time.Time) (int, error) {
	return 0, nil
}
func (m *mockStore) CountEventsByUser(_ context.Context, _, _ string, _ time.Time) (int, error) {
	return 0, nil
}
func (m *mockStore) CountEventsByCategory(_ context.Context, _ string, _ time.Time) (int, error) {
	return 0, nil
}
func (m *mockStore) CountDistinctOrgs(_ context.Context, _ string, _ time.Time) (int, error) {
	return 0, nil
}
func (m *mockStore) CountDistinctUsers(_ context.Context, _ time.Time) (int, error) { return 0, nil }
func (m *mockStore) EventFunnel(_ context.Context, _ []string, _ time.Time) (map[string]int, error) {
	return nil, nil
}
func (m *mockStore) PlanDistribution(_ context.Context) (map[string]int, error) { return nil, nil }
func (m *mockStore) UpdateUserEmailPreferences(_ context.Context, _ string, _ bool, _ string) error {
	return nil
}
func (m *mockStore) GetUserEmailPreferences(_ context.Context, _ string) (bool, string, error) {
	return false, "", nil
}
func (m *mockStore) DismissHint(_ context.Context, _, _ string) error { return nil }
func (m *mockStore) GetDismissedHints(_ context.Context, _ string) ([]string, error) {
	return nil, nil
}
func (m *mockStore) SetTourCompleted(_ context.Context, _ string) error { return nil }
