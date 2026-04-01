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
	whDeliveries   map[string][]domain.WebhookDelivery // webhookID -> deliveries

	idCounter int
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
		webhooksByOrg:  make(map[string][]string),
		whDeliveries:   make(map[string][]domain.WebhookDelivery),
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
		return nil, fmt.Errorf("not found")
	}
	return org, nil
}

func (m *mockStore) CreateUser(ctx context.Context, user *domain.User) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	if _, exists := m.usersByEmail[user.Email]; exists {
		return fmt.Errorf("email already exists")
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
		return nil, fmt.Errorf("not found")
	}
	return user, nil
}

func (m *mockStore) GetUserByID(ctx context.Context, id string) (*domain.User, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	user, ok := m.users[id]
	if !ok {
		return nil, fmt.Errorf("not found")
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
		return nil, fmt.Errorf("not found")
	}
	return mem, nil
}

func (m *mockStore) UpdateOrgMemberRole(ctx context.Context, memberID string, role domain.Role) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	mem, ok := m.orgMembersByID[memberID]
	if !ok {
		return fmt.Errorf("not found")
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
		return fmt.Errorf("not found")
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
		return nil, fmt.Errorf("not found")
	}
	members := m.orgMembers[orgID]
	for i := range members {
		if members[i].UserID == userID {
			return &members[i], nil
		}
	}
	return nil, fmt.Errorf("not found")
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
		return nil, fmt.Errorf("not found")
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
		return nil, fmt.Errorf("not found")
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
		return fmt.Errorf("flag key already exists")
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
		return nil, fmt.Errorf("not found")
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
	return fmt.Errorf("not found")
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
		return nil, fmt.Errorf("not found")
	}
	return fs, nil
}

func (m *mockStore) CreateSegment(ctx context.Context, seg *domain.Segment) error {
	m.mu.Lock()
	defer m.mu.Unlock()
	key := seg.ProjectID + ":" + seg.Key
	if _, exists := m.segments[key]; exists {
		return fmt.Errorf("segment key already exists")
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
		return nil, fmt.Errorf("not found")
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
	return fmt.Errorf("not found")
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

func (m *mockStore) GetAPIKeyByHash(ctx context.Context, keyHash string) (*domain.APIKey, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()
	k, ok := m.apiKeys[keyHash]
	if !ok {
		return nil, fmt.Errorf("not found")
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
		return nil, nil, fmt.Errorf("api key not found")
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
		return nil, fmt.Errorf("not found")
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
		return fmt.Errorf("not found")
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

func jsonRaw(v interface{}) json.RawMessage {
	b, _ := json.Marshal(v)
	return b
}
