package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
)

// ─── Mock ABM Store ────────────────────────────────────────────────────────

type mockABMStore struct {
	behaviors       map[string]*domain.ABMBehavior // key = orgID + ":" + behaviorKey
	events          []domain.ABMTrackEvent
	getErr          error
	createErr       error
	updateErr       error
	deleteErr       error
	listErr         error
	insertErr       error
	distErr         error
	distribution    map[string]int
}

func newMockABMStore() *mockABMStore {
	return &mockABMStore{
		behaviors: make(map[string]*domain.ABMBehavior),
	}
}

func (m *mockABMStore) storeKey(orgID, behaviorKey string) string {
	return orgID + ":" + behaviorKey
}

func (m *mockABMStore) CreateBehavior(_ context.Context, behavior *domain.ABMBehavior) error {
	if m.createErr != nil {
		return m.createErr
	}
	key := m.storeKey(behavior.OrgID, behavior.Key)
	if _, exists := m.behaviors[key]; exists {
		return domain.WrapConflict("abm_behavior")
	}
	behavior.CreatedAt = time.Now().UTC()
	behavior.UpdatedAt = time.Now().UTC()
	m.behaviors[key] = behavior
	return nil
}

func (m *mockABMStore) GetBehavior(_ context.Context, orgID, behaviorKey string) (*domain.ABMBehavior, error) {
	if m.getErr != nil {
		return nil, m.getErr
	}
	key := m.storeKey(orgID, behaviorKey)
	b, ok := m.behaviors[key]
	if !ok {
		return nil, domain.WrapNotFound("abm_behavior")
	}
	return b, nil
}

func (m *mockABMStore) ListBehaviors(_ context.Context, orgID string) ([]domain.ABMBehavior, error) {
	if m.listErr != nil {
		return nil, m.listErr
	}
	var list []domain.ABMBehavior
	for k, b := range m.behaviors {
		if strings.HasPrefix(k, orgID+":") {
			list = append(list, *b)
		}
	}
	if list == nil {
		list = []domain.ABMBehavior{}
	}
	return list, nil
}

func (m *mockABMStore) ListBehaviorsByAgentType(_ context.Context, orgID, agentType string) ([]domain.ABMBehavior, error) {
	if m.listErr != nil {
		return nil, m.listErr
	}
	var list []domain.ABMBehavior
	for k, b := range m.behaviors {
		if strings.HasPrefix(k, orgID+":") && b.AgentType == agentType {
			list = append(list, *b)
		}
	}
	if list == nil {
		list = []domain.ABMBehavior{}
	}
	return list, nil
}

func (m *mockABMStore) UpdateBehavior(_ context.Context, behavior *domain.ABMBehavior) error {
	if m.updateErr != nil {
		return m.updateErr
	}
	key := m.storeKey(behavior.OrgID, behavior.Key)
	if _, exists := m.behaviors[key]; !exists {
		return domain.WrapNotFound("abm_behavior")
	}
	behavior.UpdatedAt = time.Now().UTC()
	m.behaviors[key] = behavior
	return nil
}

func (m *mockABMStore) DeleteBehavior(_ context.Context, orgID, behaviorKey string) error {
	if m.deleteErr != nil {
		return m.deleteErr
	}
	key := m.storeKey(orgID, behaviorKey)
	if _, exists := m.behaviors[key]; !exists {
		return domain.WrapNotFound("abm_behavior")
	}
	delete(m.behaviors, key)
	return nil
}

func (m *mockABMStore) InsertTrackEvent(_ context.Context, event *domain.ABMTrackEvent) error {
	if m.insertErr != nil {
		return m.insertErr
	}
	m.events = append(m.events, *event)
	return nil
}

func (m *mockABMStore) InsertTrackEvents(_ context.Context, events []domain.ABMTrackEvent) error {
	if m.insertErr != nil {
		return m.insertErr
	}
	m.events = append(m.events, events...)
	return nil
}

func (m *mockABMStore) CountEventsByBehavior(_ context.Context, orgID, behaviorKey string, since time.Time) (int, error) {
	return 0, nil
}

func (m *mockABMStore) CountEventsByAgent(_ context.Context, orgID, agentID string, since time.Time) (int, error) {
	return 0, nil
}

func (m *mockABMStore) GetVariantDistribution(_ context.Context, orgID, behaviorKey string, since time.Time) (map[string]int, error) {
	if m.distErr != nil {
		return nil, m.distErr
	}
	if m.distribution != nil {
		return m.distribution, nil
	}
	return map[string]int{}, nil
}

// AuditWriter mock (not used in ABM handler but required by interface)
func (m *mockABMStore) CreateAuditEntry(_ context.Context, _ *domain.AuditEntry) error { return nil }
func (m *mockABMStore) PurgeAuditEntries(_ context.Context, _ time.Time) (int, error)   { return 0, nil }

// testLogger returns a no-op logger for tests.
func testLogger() *slog.Logger {
	return slog.New(slog.NewJSONHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError + 1}))
}

// ─── Helper: create a request with org_id in context ───────────────────────

func abmRequest(method, path string, body interface{}) (*http.Request, *httptest.ResponseRecorder) {
	var b []byte
	if body != nil {
		b, _ = json.Marshal(body)
	}
	req := httptest.NewRequest(method, path, strings.NewReader(string(b)))
	req.Header.Set("Content-Type", "application/json")

	// Set org_id in context (normally done by middleware)
	ctx := context.WithValue(req.Context(), middleware.OrgIDKey, "org_test")
	req = req.WithContext(ctx)

	return req, httptest.NewRecorder()
}

// ─── Resolve Tests ─────────────────────────────────────────────────────────

func TestABMHandler_Resolve_Success(t *testing.T) {
	t.Parallel()

	store := newMockABMStore()
	h := NewABMHandler(store, testLogger(), nil)

	// Seed a behavior
	behavior := &domain.ABMBehavior{
		OrgID:          "org_test",
		Key:            "search-ranking",
		Name:           "Search Ranking",
		Status:         "active",
		DefaultVariant: "control",
		Variants: []domain.ABMVariant{
			{Key: "control", Name: "Control", Config: json.RawMessage(`{"model":"old"}`), Weight: 50},
			{Key: "treatment", Name: "Treatment", Config: json.RawMessage(`{"model":"new"}`), Weight: 50},
		},
		RolloutPercentage: 100,
	}
	store.CreateBehavior(context.Background(), behavior)

	req, rec := abmRequest(http.MethodPost, "/v1/abm/resolve", domain.ABMResolutionRequest{
		BehaviorKey: "search-ranking",
		AgentID:     "agent-1",
		AgentType:   "recommender",
		UserID:      "user-123",
	})

	h.Resolve(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rec.Code, rec.Body.String())
	}

	var resp domain.ABMResolutionResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if resp.BehaviorKey != "search-ranking" {
		t.Errorf("expected behavior_key 'search-ranking', got %q", resp.BehaviorKey)
	}
	if resp.Variant == "" {
		t.Error("expected non-empty variant")
	}
	if resp.Reason == "" {
		t.Error("expected non-empty reason")
	}
}

func TestABMHandler_Resolve_BehaviorNotFound(t *testing.T) {
	t.Parallel()

	store := newMockABMStore()
	h := NewABMHandler(store, testLogger(), nil)

	req, rec := abmRequest(http.MethodPost, "/v1/abm/resolve", domain.ABMResolutionRequest{
		BehaviorKey: "nonexistent",
		AgentID:     "agent-1",
		AgentType:   "recommender",
	})

	h.Resolve(rec, req)

	// Should return 200 with default response (not 404) to avoid leaking
	// behavior existence.
	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var resp domain.ABMResolutionResponse
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Reason != "behavior_not_found" {
		t.Errorf("expected reason 'behavior_not_found', got %q", resp.Reason)
	}
}

func TestABMHandler_Resolve_MissingRequired(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		req  domain.ABMResolutionRequest
		want int
	}{
		{
			name: "missing behavior_key",
			req:  domain.ABMResolutionRequest{AgentID: "a1"},
			want: http.StatusBadRequest,
		},
		{
			name: "missing agent_id",
			req:  domain.ABMResolutionRequest{BehaviorKey: "b1"},
			want: http.StatusBadRequest,
		},
		{
			name: "empty body",
			req:  domain.ABMResolutionRequest{},
			want: http.StatusBadRequest,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			store := newMockABMStore()
			h := NewABMHandler(store, testLogger(), nil)

			req, rec := abmRequest(http.MethodPost, "/v1/abm/resolve", tc.req)
			h.Resolve(rec, req)

			if rec.Code != tc.want {
				t.Errorf("expected %d, got %d", tc.want, rec.Code)
			}
		})
	}
}

func TestABMHandler_Resolve_InvalidJSON(t *testing.T) {
	t.Parallel()

	store := newMockABMStore()
	h := NewABMHandler(store, testLogger(), nil)

	req := httptest.NewRequest(http.MethodPost, "/v1/abm/resolve", strings.NewReader(`{broken`))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()

	h.Resolve(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

// ─── Track Tests ───────────────────────────────────────────────────────────

func TestABMHandler_Track_Success(t *testing.T) {
	t.Parallel()

	store := newMockABMStore()
	h := NewABMHandler(store, testLogger(), nil)

	req, rec := abmRequest(http.MethodPost, "/v1/abm/track", domain.ABMTrackEvent{
		BehaviorKey: "search-ranking",
		Variant:     "treatment",
		AgentID:     "agent-1",
		AgentType:   "recommender",
		Action:      "search.ranked",
		Outcome:     "clicked",
	})

	h.Track(rec, req)

	if rec.Code != http.StatusAccepted {
		t.Errorf("expected 202, got %d", rec.Code)
	}
}

func TestABMHandler_Track_MissingBehaviorKey(t *testing.T) {
	t.Parallel()

	store := newMockABMStore()
	h := NewABMHandler(store, testLogger(), nil)

	req, rec := abmRequest(http.MethodPost, "/v1/abm/track", domain.ABMTrackEvent{
		AgentID: "agent-1",
	})

	h.Track(rec, req)

	if rec.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", rec.Code)
	}
}

// ─── CRUD Tests ────────────────────────────────────────────────────────────

func TestABMHandler_CreateBehavior_Success(t *testing.T) {
	t.Parallel()

	store := newMockABMStore()
	h := NewABMHandler(store, testLogger(), nil)

	req, rec := abmRequest(http.MethodPost, "/v1/abm/behaviors", domain.ABMBehavior{
		Key:            "my-behavior",
		Name:           "My Behavior",
		Description:    "Test behavior",
		AgentType:      "recommender",
		DefaultVariant: "default",
		Status:         "draft",
	})

	h.CreateBehavior(rec, req)

	if rec.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rec.Code, rec.Body.String())
	}

	var created domain.ABMBehavior
	json.Unmarshal(rec.Body.Bytes(), &created)
	if created.Key != "my-behavior" {
		t.Errorf("expected key 'my-behavior', got %q", created.Key)
	}
}

func TestABMHandler_CreateBehavior_DuplicateKey(t *testing.T) {
	t.Parallel()

	store := newMockABMStore()
	h := NewABMHandler(store, testLogger(), nil)

	// First create succeeds
	req1, rec1 := abmRequest(http.MethodPost, "/v1/abm/behaviors", domain.ABMBehavior{
		Key:  "dup-key",
		Name: "First",
	})
	h.CreateBehavior(rec1, req1)

	// Second create with same key fails
	req2, rec2 := abmRequest(http.MethodPost, "/v1/abm/behaviors", domain.ABMBehavior{
		Key:  "dup-key",
		Name: "Second",
	})
	h.CreateBehavior(rec2, req2)

	if rec2.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", rec2.Code)
	}
}

func TestABMHandler_CreateBehavior_MissingRequired(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name string
		req  domain.ABMBehavior
		want int
	}{
		{name: "missing key", req: domain.ABMBehavior{Name: "Test"}, want: http.StatusBadRequest},
		{name: "missing name", req: domain.ABMBehavior{Key: "test"}, want: http.StatusBadRequest},
		{name: "empty request", req: domain.ABMBehavior{}, want: http.StatusBadRequest},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			store := newMockABMStore()
			h := NewABMHandler(store, testLogger(), nil)

			req, rec := abmRequest(http.MethodPost, "/v1/abm/behaviors", tc.req)
			h.CreateBehavior(rec, req)

			if rec.Code != tc.want {
				t.Errorf("expected %d, got %d", tc.want, rec.Code)
			}
		})
	}
}

func TestABMHandler_GetBehavior_Success(t *testing.T) {
	t.Parallel()

	store := newMockABMStore()
	h := NewABMHandler(store, testLogger(), nil)

	behavior := &domain.ABMBehavior{
		OrgID:  "org_test",
		Key:    "get-test",
		Name:   "Get Test",
		Status: "active",
	}
	store.CreateBehavior(context.Background(), behavior)

	req, rec := abmRequest(http.MethodGet, "/v1/abm/behaviors/get-test", nil)
	// chi.URLParam is set via chi route context, not standard context.
	// For tests, we set it directly.
	req = setChiURLParam(req, "key", "get-test")

	h.GetBehavior(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}
}

func TestABMHandler_GetBehavior_NotFound(t *testing.T) {
	t.Parallel()

	store := newMockABMStore()
	h := NewABMHandler(store, testLogger(), nil)

	req, rec := abmRequest(http.MethodGet, "/v1/abm/behaviors/nonexistent", nil)
	req = setChiURLParam(req, "key", "nonexistent")

	h.GetBehavior(rec, req)

	if rec.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", rec.Code)
	}
}

func TestABMHandler_DeleteBehavior_Success(t *testing.T) {
	t.Parallel()

	store := newMockABMStore()
	h := NewABMHandler(store, testLogger(), nil)

	behavior := &domain.ABMBehavior{
		OrgID: "org_test",
		Key:   "delete-test",
		Name:  "Delete Test",
	}
	store.CreateBehavior(context.Background(), behavior)

	req, rec := abmRequest(http.MethodDelete, "/v1/abm/behaviors/delete-test", nil)
	req = setChiURLParam(req, "key", "delete-test")

	h.DeleteBehavior(rec, req)

	if rec.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", rec.Code)
	}

	// Verify it's gone
	_, err := store.GetBehavior(context.Background(), "org_test", "delete-test")
	if !errors.Is(err, domain.ErrNotFound) {
		t.Error("expected behavior to be deleted")
	}
}

func TestABMHandler_ListBehaviors(t *testing.T) {
	t.Parallel()

	store := newMockABMStore()
	h := NewABMHandler(store, testLogger(), nil)

	// Seed two behaviors
	for _, b := range []*domain.ABMBehavior{
		{OrgID: "org_test", Key: "b1", Name: "Behavior 1", Status: "active"},
		{OrgID: "org_test", Key: "b2", Name: "Behavior 2", Status: "draft"},
	} {
		store.CreateBehavior(context.Background(), b)
	}

	req, rec := abmRequest(http.MethodGet, "/v1/abm/behaviors", nil)
	h.ListBehaviors(rec, req)

	if rec.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", rec.Code)
	}

	var resp struct {
		Data  []domain.ABMBehavior `json:"data"`
		Total int                  `json:"total"`
	}
	json.Unmarshal(rec.Body.Bytes(), &resp)
	if resp.Total != 2 {
		t.Errorf("expected 2 behaviors, got %d", resp.Total)
	}
}

// ─── Helper: set chi URL param in request context ──────────────────────────

func setChiURLParam(r *http.Request, key, value string) *http.Request {
	// chi stores URL params in the route context.
	// We add the param via chi.RouteContext, preserving any existing context values.
	ctx := r.Context()
	// Create a proper chi.Context with the URL params.
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add(key, value)
	ctx = context.WithValue(ctx, chi.RouteCtxKey, rctx)
	return r.WithContext(ctx)
}

// middlewareContextKey is the type used by the real middleware for context values.
// This mirrors the actual key to ensure tests exercise the same code paths.
type middlewareContextKey string
