package handlers

import (
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"strings"
	"sync"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
)

// ─── Mock Code2Flag Store ──────────────────────────────────────────────────

// mockCode2FlagStore implements both domain.Code2FlagReader and domain.Code2FlagWriter
// for handler tests. It stores data in-memory and supports all required operations.
type mockCode2FlagStore struct {
	mu             sync.RWMutex
	scanResults    map[string]*domain.ScanResult
	generatedFlags map[string]*domain.GeneratedFlag
	cleanupEntries map[string]*domain.CleanupEntry
	idCounter      int
}

func newMockCode2FlagStore() *mockCode2FlagStore {
	return &mockCode2FlagStore{
		scanResults:    make(map[string]*domain.ScanResult),
		generatedFlags: make(map[string]*domain.GeneratedFlag),
		cleanupEntries: make(map[string]*domain.CleanupEntry),
	}
}

func (m *mockCode2FlagStore) nextID() string {
	m.idCounter++
	return fmt.Sprintf("id-%d", m.idCounter)
}

// ─── ScanResult methods ────────────────────────────────────────────────────

func (m *mockCode2FlagStore) ListScanResults(_ context.Context, orgID, projectID string, filter domain.ScanResultFilter, limit, offset int) ([]domain.ScanResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var results []domain.ScanResult
	for _, sr := range m.scanResults {
		if sr.OrgID != orgID || sr.ProjectID != projectID {
			continue
		}
		if filter.Status != "" && sr.Status != filter.Status {
			continue
		}
		if filter.Repository != "" && sr.Repository != filter.Repository {
			continue
		}
		if filter.MinConfidence > 0 && sr.Confidence < filter.MinConfidence {
			continue
		}
		if filter.ScanJobID != "" && sr.ScanJobID != filter.ScanJobID {
			continue
		}
		results = append(results, *sr)
	}

	total := len(results)
	if offset >= total {
		return nil, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return results[offset:end], nil
}

func (m *mockCode2FlagStore) CountScanResults(_ context.Context, orgID, projectID string, filter domain.ScanResultFilter) (int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	count := 0
	for _, sr := range m.scanResults {
		if sr.OrgID != orgID || sr.ProjectID != projectID {
			continue
		}
		if filter.Status != "" && sr.Status != filter.Status {
			continue
		}
		if filter.Repository != "" && sr.Repository != filter.Repository {
			continue
		}
		if filter.MinConfidence > 0 && sr.Confidence < filter.MinConfidence {
			continue
		}
		if filter.ScanJobID != "" && sr.ScanJobID != filter.ScanJobID {
			continue
		}
		count++
	}
	return count, nil
}

func (m *mockCode2FlagStore) GetScanResult(_ context.Context, id string) (*domain.ScanResult, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	sr, ok := m.scanResults[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return sr, nil
}

func (m *mockCode2FlagStore) CreateScanResult(_ context.Context, sr *domain.ScanResult) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.scanResults[sr.ID] = sr
	return nil
}

func (m *mockCode2FlagStore) BatchCreateScanResults(_ context.Context, results []domain.ScanResult) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	for _, sr := range results {
		cp := sr
		m.scanResults[cp.ID] = &cp
	}
	return nil
}

func (m *mockCode2FlagStore) UpdateScanResult(_ context.Context, id string, updates map[string]interface{}) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	sr, ok := m.scanResults[id]
	if !ok {
		return domain.ErrNotFound
	}
	if status, ok := updates["status"].(string); ok {
		sr.Status = status
	}
	sr.UpdatedAt = time.Now()
	return nil
}

// ─── GeneratedFlag methods ─────────────────────────────────────────────────

func (m *mockCode2FlagStore) ListGeneratedFlags(_ context.Context, orgID, projectID string, limit, offset int) ([]domain.GeneratedFlag, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var results []domain.GeneratedFlag
	for _, gf := range m.generatedFlags {
		if gf.OrgID != orgID {
			continue
		}
		if projectID != "" && gf.ProjectID != projectID {
			continue
		}
		results = append(results, *gf)
	}

	total := len(results)
	if offset >= total {
		return nil, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return results[offset:end], nil
}

func (m *mockCode2FlagStore) CountGeneratedFlags(_ context.Context, orgID, projectID string) (int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	count := 0
	for _, gf := range m.generatedFlags {
		if gf.OrgID != orgID {
			continue
		}
		if projectID != "" && gf.ProjectID != projectID {
			continue
		}
		count++
	}
	return count, nil
}

func (m *mockCode2FlagStore) GetGeneratedFlag(_ context.Context, id string) (*domain.GeneratedFlag, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	gf, ok := m.generatedFlags[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return gf, nil
}

func (m *mockCode2FlagStore) CreateGeneratedFlag(_ context.Context, gf *domain.GeneratedFlag) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.generatedFlags[gf.ID] = gf
	return nil
}

func (m *mockCode2FlagStore) UpdateGeneratedFlag(_ context.Context, id string, updates map[string]interface{}) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	gf, ok := m.generatedFlags[id]
	if !ok {
		return domain.ErrNotFound
	}
	if status, ok := updates["status"].(string); ok {
		gf.Status = status
	}
	gf.UpdatedAt = time.Now()
	return nil
}

// ─── CleanupEntry methods ──────────────────────────────────────────────────

func (m *mockCode2FlagStore) ListCleanupEntries(_ context.Context, orgID string, filter domain.CleanupFilter, limit, offset int) ([]domain.CleanupEntry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	var results []domain.CleanupEntry
	for _, ce := range m.cleanupEntries {
		if ce.OrgID != orgID {
			continue
		}
		if filter.Status != "" && ce.Status != filter.Status {
			continue
		}
		if filter.Reason != "" && ce.Reason != filter.Reason {
			continue
		}
		results = append(results, *ce)
	}

	total := len(results)
	if offset >= total {
		return nil, nil
	}
	end := offset + limit
	if end > total {
		end = total
	}
	return results[offset:end], nil
}

func (m *mockCode2FlagStore) CountCleanupEntries(_ context.Context, orgID string, filter domain.CleanupFilter) (int, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	count := 0
	for _, ce := range m.cleanupEntries {
		if ce.OrgID != orgID {
			continue
		}
		if filter.Status != "" && ce.Status != filter.Status {
			continue
		}
		if filter.Reason != "" && ce.Reason != filter.Reason {
			continue
		}
		count++
	}
	return count, nil
}

func (m *mockCode2FlagStore) GetCleanupEntry(_ context.Context, id string) (*domain.CleanupEntry, error) {
	m.mu.RLock()
	defer m.mu.RUnlock()

	ce, ok := m.cleanupEntries[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return ce, nil
}

func (m *mockCode2FlagStore) CreateCleanupEntry(_ context.Context, ce *domain.CleanupEntry) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	m.cleanupEntries[ce.ID] = ce
	return nil
}

func (m *mockCode2FlagStore) UpdateCleanupEntry(_ context.Context, id string, updates map[string]interface{}) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	ce, ok := m.cleanupEntries[id]
	if !ok {
		return domain.ErrNotFound
	}
	if status, ok := updates["status"].(string); ok {
		ce.Status = status
	}
	ce.UpdatedAt = time.Now()
	return nil
}

func (m *mockCode2FlagStore) DeleteCleanupEntry(_ context.Context, id string) error {
	m.mu.Lock()
	defer m.mu.Unlock()

	delete(m.cleanupEntries, id)
	return nil
}

// ─── Seed Helpers ──────────────────────────────────────────────────────────

func (m *mockCode2FlagStore) seedScanResult(orgID, projectID, status, repo string, confidence float64) *domain.ScanResult {
	sr := &domain.ScanResult{
		ID:              m.nextID(),
		OrgID:           orgID,
		ProjectID:       projectID,
		Repository:      repo,
		FilePath:        "src/main.go",
		LineNumber:      42,
		ConditionalType: domain.ConditionalTypeIfStatement,
		ConditionalText: "if featureEnabled {",
		Confidence:      confidence,
		Status:          status,
		CreatedAt:       time.Now(),
		UpdatedAt:       time.Now(),
	}
	m.scanResults[sr.ID] = sr
	return sr
}

func (m *mockCode2FlagStore) seedGeneratedFlag(orgID, key, flagType, status string) *domain.GeneratedFlag {
	now := time.Now().UTC()
	gf := &domain.GeneratedFlag{
		ID:          m.nextID(),
		OrgID:       orgID,
		Key:         key,
		Name:        key,
		Description: "Auto-generated flag",
		FlagType:    flagType,
		Status:      status,
		CreatedAt:   now,
		UpdatedAt:   now,
	}
	m.generatedFlags[gf.ID] = gf
	return gf
}

func (m *mockCode2FlagStore) seedCleanupEntry(orgID, flagKey, reason, status string) *domain.CleanupEntry {
	now := time.Now().UTC()
	ce := &domain.CleanupEntry{
		ID:                  m.nextID(),
		OrgID:               orgID,
		FlagKey:             flagKey,
		Reason:              reason,
		DaysSince100Percent: 30,
		Status:              status,
		CreatedAt:           now,
		UpdatedAt:           now,
	}
	m.cleanupEntries[ce.ID] = ce
	return ce
}

// ─── Request Helpers ───────────────────────────────────────────────────────

// requestWithOrgID adds the org ID to the request context (minimal auth).
func requestWithOrgID(r *http.Request, orgID string) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.OrgIDKey, orgID)
	return r.WithContext(ctx)
}

// ─── Tests ─────────────────────────────────────────────────────────────────

// TestCode2FlagHandler_ListReferences_Success tests the happy path for listing
// scan results with default pagination.
func TestCode2FlagHandler_ListReferences_Success(t *testing.T) {
	t.Parallel()
	store := newMockCode2FlagStore()
	h := NewCode2FlagHandler(store, store, nil, nil)
	orgID := testOrgID
	projID := "proj-1"

	store.seedScanResult(orgID, projID, domain.ScanResultStatusUnreviewed, "myapp/web", 0.9)
	store.seedScanResult(orgID, projID, domain.ScanResultStatusUnreviewed, "myapp/api", 0.85)

	url := fmt.Sprintf("/v1/code2flag/references?project_id=%s", projID)
	r := httptest.NewRequest("GET", url, nil)
	r = requestWithOrgID(r, orgID)
	w := httptest.NewRecorder()

	h.ListReferences(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ListReferencesResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Total != 2 {
		t.Errorf("expected total 2, got %d", resp.Total)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 items, got %d", len(resp.Data))
	}
}

// TestCode2FlagHandler_ListReferences_WithFilters tests filtering scan results
// by status and repository.
func TestCode2FlagHandler_ListReferences_WithFilters(t *testing.T) {
	t.Parallel()
	store := newMockCode2FlagStore()
	h := NewCode2FlagHandler(store, store, nil, nil)
	orgID := testOrgID
	projID := "proj-1"

	store.seedScanResult(orgID, projID, domain.ScanResultStatusUnreviewed, "myapp/web", 0.9)
	store.seedScanResult(orgID, projID, domain.ScanResultStatusAccepted, "myapp/web", 0.95)
	store.seedScanResult(orgID, projID, domain.ScanResultStatusUnreviewed, "myapp/api", 0.8)

	url := fmt.Sprintf("/v1/code2flag/references?project_id=%s&status=%s", projID, domain.ScanResultStatusAccepted)
	r := httptest.NewRequest("GET", url, nil)
	r = requestWithOrgID(r, orgID)
	w := httptest.NewRecorder()

	h.ListReferences(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ListReferencesResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Total != 1 {
		t.Errorf("expected total 1, got %d", resp.Total)
	}
	if len(resp.Data) != 1 {
		t.Errorf("expected 1 item, got %d", len(resp.Data))
	}
	if resp.Data[0].Status != domain.ScanResultStatusAccepted {
		t.Errorf("expected status %s, got %s", domain.ScanResultStatusAccepted, resp.Data[0].Status)
	}
}

// TestCode2FlagHandler_ListReferences_Pagination tests limit/offset pagination.
func TestCode2FlagHandler_ListReferences_Pagination(t *testing.T) {
	t.Parallel()
	store := newMockCode2FlagStore()
	h := NewCode2FlagHandler(store, store, nil, nil)
	orgID := testOrgID
	projID := "proj-1"

	for i := 0; i < 5; i++ {
		store.seedScanResult(orgID, projID, domain.ScanResultStatusUnreviewed, "myapp/web", 0.9)
	}

	// Page 1: limit=2, offset=0
	url := fmt.Sprintf("/v1/code2flag/references?project_id=%s&limit=2&offset=0", projID)
	r := httptest.NewRequest("GET", url, nil)
	r = requestWithOrgID(r, orgID)
	w := httptest.NewRecorder()
	h.ListReferences(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var resp dto.ListReferencesResponse
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 items, got %d", len(resp.Data))
	}
	if resp.Total != 5 {
		t.Errorf("expected total 5, got %d", resp.Total)
	}
}

// TestCode2FlagHandler_ListReferences_EmptyProject tests listing when project
// has no scan results.
func TestCode2FlagHandler_ListReferences_EmptyProject(t *testing.T) {
	t.Parallel()
	store := newMockCode2FlagStore()
	h := NewCode2FlagHandler(store, store, nil, nil)
	orgID := testOrgID

	url := "/v1/code2flag/references?project_id=empty-proj"
	r := httptest.NewRequest("GET", url, nil)
	r = requestWithOrgID(r, orgID)
	w := httptest.NewRecorder()

	h.ListReferences(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ListReferencesResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Total != 0 {
		t.Errorf("expected total 0, got %d", resp.Total)
	}
	if len(resp.Data) != 0 {
		t.Errorf("expected 0 items, got %d", len(resp.Data))
	}
}

// TestCode2FlagHandler_CreateSpec_Success tests creating a flag spec from
// scan results.
func TestCode2FlagHandler_CreateSpec_Success(t *testing.T) {
	t.Parallel()
	store := newMockCode2FlagStore()
	h := NewCode2FlagHandler(store, store, nil, nil)
	orgID := testOrgID
	projID := "proj-1"

	sr := store.seedScanResult(orgID, projID, domain.ScanResultStatusUnreviewed, "myapp/web", 0.92)

	body := fmt.Sprintf(`{"flag_key":"dark-mode","repo_name":"myapp/web","references":["%s"]}`, sr.ID)
	r := httptest.NewRequest("POST", "/v1/code2flag/spec", strings.NewReader(body))
	r = requestWithOrgID(r, orgID)
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.CreateSpec(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.CreateSpecResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.FlagKey != "dark-mode" {
		t.Errorf("expected flag_key 'dark-mode', got '%s'", resp.FlagKey)
	}
	if resp.FlagType != "boolean" {
		t.Errorf("expected flag_type 'boolean', got '%s'", resp.FlagType)
	}
	if resp.Confidence != 0.92 {
		t.Errorf("expected confidence 0.92, got %f", resp.Confidence)
	}
}

// TestCode2FlagHandler_CreateSpec_MissingFlagKey tests validation when flag_key
// is missing.
func TestCode2FlagHandler_CreateSpec_MissingFlagKey(t *testing.T) {
	t.Parallel()
	store := newMockCode2FlagStore()
	h := NewCode2FlagHandler(store, store, nil, nil)
	orgID := testOrgID

	body := `{"repo_name":"myapp/web"}`
	r := httptest.NewRequest("POST", "/v1/code2flag/spec", strings.NewReader(body))
	r = requestWithOrgID(r, orgID)
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.CreateSpec(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// TestCode2FlagHandler_CreateSpec_InvalidJSON tests rejection of malformed JSON.
func TestCode2FlagHandler_CreateSpec_InvalidJSON(t *testing.T) {
	t.Parallel()
	store := newMockCode2FlagStore()
	h := NewCode2FlagHandler(store, store, nil, nil)
	orgID := testOrgID

	body := `{broken`
	r := httptest.NewRequest("POST", "/v1/code2flag/spec", strings.NewReader(body))
	r = requestWithOrgID(r, orgID)
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.CreateSpec(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// TestCode2FlagHandler_CreateImplementation_Success tests generating
// implementation code for a flag.
func TestCode2FlagHandler_CreateImplementation_Success(t *testing.T) {
	t.Parallel()
	store := newMockCode2FlagStore()
	h := NewCode2FlagHandler(store, store, nil, nil)
	orgID := testOrgID

	store.seedGeneratedFlag(orgID, "dark-mode", "boolean", domain.GeneratedFlagStatusProposed)

	body := `{"flag_key":"dark-mode","repo_name":"myapp/web","language":"typescript","file_path":"src/features.ts","line_number":42}`
	r := httptest.NewRequest("POST", "/v1/code2flag/implement", strings.NewReader(body))
	r = requestWithOrgID(r, orgID)
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.CreateImplementation(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.CreateImplementResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Language != "typescript" {
		t.Errorf("expected language 'typescript', got '%s'", resp.Language)
	}
	if !strings.Contains(resp.CodeSnippet, "isEnabled") {
		t.Errorf("expected isEnabled in code snippet, got: %s", resp.CodeSnippet)
	}
	if resp.FilePath != "src/features.ts" {
		t.Errorf("expected file_path 'src/features.ts', got '%s'", resp.FilePath)
	}
}

// TestCode2FlagHandler_CreateImplementation_MissingFields tests validation
// when required fields are missing.
func TestCode2FlagHandler_CreateImplementation_MissingFields(t *testing.T) {
	t.Parallel()
	store := newMockCode2FlagStore()
	h := NewCode2FlagHandler(store, store, nil, nil)
	orgID := testOrgID

	body := `{"flag_key":"dark-mode"}`
	r := httptest.NewRequest("POST", "/v1/code2flag/implement", strings.NewReader(body))
	r = requestWithOrgID(r, orgID)
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.CreateImplementation(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

// TestCode2FlagHandler_ListCleanupCandidates_Success tests listing cleanup
// entries with default pagination.
func TestCode2FlagHandler_ListCleanupCandidates_Success(t *testing.T) {
	t.Parallel()
	store := newMockCode2FlagStore()
	h := NewCode2FlagHandler(store, store, nil, nil)
	orgID := testOrgID

	store.seedCleanupEntry(orgID, "old-feature", domain.CleanupReasonStale, domain.CleanupStatusPending)
	store.seedCleanupEntry(orgID, "legacy-toggle", domain.CleanupReason100PercentRolledOut, domain.CleanupStatusPending)

	url := "/v1/code2flag/cleanup?project_id=proj-1"
	r := httptest.NewRequest("GET", url, nil)
	r = requestWithOrgID(r, orgID)
	w := httptest.NewRecorder()

	h.ListCleanupCandidates(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ListCleanupResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Total != 2 {
		t.Errorf("expected total 2, got %d", resp.Total)
	}
	if len(resp.Data) != 2 {
		t.Errorf("expected 2 items, got %d", len(resp.Data))
	}
}

// TestCode2FlagHandler_ListCleanupCandidates_WithFilters tests filtering
// cleanup entries by status.
func TestCode2FlagHandler_ListCleanupCandidates_WithFilters(t *testing.T) {
	t.Parallel()
	store := newMockCode2FlagStore()
	h := NewCode2FlagHandler(store, store, nil, nil)
	orgID := testOrgID

	store.seedCleanupEntry(orgID, "old-feature", domain.CleanupReasonStale, domain.CleanupStatusPending)
	store.seedCleanupEntry(orgID, "legacy-toggle", domain.CleanupReason100PercentRolledOut, domain.CleanupStatusPRCreated)

	url := "/v1/code2flag/cleanup?project_id=proj-1&status=" + domain.CleanupStatusPending
	r := httptest.NewRequest("GET", url, nil)
	r = requestWithOrgID(r, orgID)
	w := httptest.NewRecorder()

	h.ListCleanupCandidates(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ListCleanupResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Total != 1 {
		t.Errorf("expected total 1, got %d", resp.Total)
	}
	if resp.Data[0].FlagKey != "old-feature" {
		t.Errorf("expected flag_key 'old-feature', got '%s'", resp.Data[0].FlagKey)
	}
}

// TestCode2FlagHandler_ListCleanupCandidates_Empty tests listing when no
// cleanup entries exist.
func TestCode2FlagHandler_ListCleanupCandidates_Empty(t *testing.T) {
	t.Parallel()
	store := newMockCode2FlagStore()
	h := NewCode2FlagHandler(store, store, nil, nil)
	orgID := testOrgID

	url := "/v1/code2flag/cleanup?project_id=proj-1"
	r := httptest.NewRequest("GET", url, nil)
	r = requestWithOrgID(r, orgID)
	w := httptest.NewRecorder()

	h.ListCleanupCandidates(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.ListCleanupResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Total != 0 {
		t.Errorf("expected total 0, got %d", resp.Total)
	}
	if len(resp.Data) != 0 {
		t.Errorf("expected 0 items, got %d", len(resp.Data))
	}
}
