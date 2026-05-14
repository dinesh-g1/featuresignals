package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Mock Policy Store ─────────────────────────────────────────────────────

type mockPolicyStore struct {
	policies map[string]*domain.Policy
}

func newMockPolicyStore() *mockPolicyStore {
	return &mockPolicyStore{policies: make(map[string]*domain.Policy)}
}

func (m *mockPolicyStore) GetPolicy(_ context.Context, _, policyID string) (*domain.Policy, error) {
	p, ok := m.policies[policyID]
	if !ok {
		return nil, domain.WrapNotFound("policy")
	}
	return p, nil
}

func (m *mockPolicyStore) ListPolicies(_ context.Context, _ string, _, _ int) ([]domain.Policy, error) {
	var out []domain.Policy
	for _, p := range m.policies {
		out = append(out, *p)
	}
	if out == nil {
		out = []domain.Policy{}
	}
	return out, nil
}

func (m *mockPolicyStore) CountPolicies(_ context.Context, _ string) (int, error) {
	return len(m.policies), nil
}

func (m *mockPolicyStore) ListApplicablePolicies(_ context.Context, _ string, _ domain.PolicyScope) ([]domain.Policy, error) {
	return m.ListPolicies(context.Background(), "", 0, 0)
}

func (m *mockPolicyStore) CreatePolicy(_ context.Context, p *domain.Policy) error {
	if _, exists := m.policies[p.ID]; exists {
		return domain.WrapConflict("policy")
	}
	m.policies[p.ID] = p
	return nil
}

func (m *mockPolicyStore) UpdatePolicy(_ context.Context, p *domain.Policy) error {
	if _, exists := m.policies[p.ID]; !exists {
		return domain.WrapNotFound("policy")
	}
	m.policies[p.ID] = p
	return nil
}

func (m *mockPolicyStore) DeletePolicy(_ context.Context, _, policyID string) error {
	if _, exists := m.policies[policyID]; !exists {
		return domain.WrapNotFound("policy")
	}
	delete(m.policies, policyID)
	return nil
}

func (m *mockPolicyStore) SetPolicyEnabled(_ context.Context, _, policyID string, enabled bool) error {
	p, ok := m.policies[policyID]
	if !ok {
		return domain.WrapNotFound("policy")
	}
	p.Enabled = enabled
	return nil
}

// ─── Test Helpers ──────────────────────────────────────────────────────────

func setupPolicyHandler() (*PolicyHandler, *mockPolicyStore) {
	store := newMockPolicyStore()
	logger := testLogger()
	handler := NewPolicyHandler(store, logger, nil)
	return handler, store
}

func setupPolicyRouter() (chi.Router, *mockPolicyStore) {
	handler, store := setupPolicyHandler()
	r := chi.NewRouter()
	r.Post("/v1/policies", handler.Create)
	r.Get("/v1/policies", handler.List)
	r.Get("/v1/policies/{policyID}", handler.Get)
	r.Patch("/v1/policies/{policyID}", handler.Update)
	r.Delete("/v1/policies/{policyID}", handler.Delete)
	r.Post("/v1/policies/{policyID}/toggle", handler.Toggle)
	return r, store
}

func __mustMarshal(t *testing.T, v any) string {
	t.Helper()
	b, err := json.Marshal(v)
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return string(b)
}

// ─── Create Tests ──────────────────────────────────────────────────────────

func TestPolicyHandler_Create(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name       string
		body       string
		wantStatus int
	}{
		{
			name:       "valid policy",
			body:       `{"name":"Test Policy","priority":10,"effect":"deny"}`,
			wantStatus: http.StatusCreated,
		},
		{
			name:       "missing name",
			body:       `{"priority":10,"effect":"deny"}`,
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "invalid json",
			body:       `{broken`,
			wantStatus: http.StatusBadRequest,
		},
		{
			name:       "empty body",
			body:       `{}`,
			wantStatus: http.StatusUnprocessableEntity,
		},
		{
			name:       "with rules",
			body:       `{"name":"Rule Policy","priority":5,"effect":"warn","rules":[{"name":"r1","expression":"true","message":"test"}]}`,
			wantStatus: http.StatusCreated,
		},
	}

	for _, tc := range tests {
		tc := tc
		t.Run(tc.name, func(t *testing.T) {
			t.Parallel()
			r, _ := setupPolicyRouter()
			req := httptest.NewRequest(http.MethodPost, "/v1/policies", strings.NewReader(tc.body))
			req.Header.Set("Content-Type", "application/json")
			rec := httptest.NewRecorder()
			r.ServeHTTP(rec, req)

			if rec.Code != tc.wantStatus {
				t.Errorf("got status %d, want %d", rec.Code, tc.wantStatus)
			}
		})
	}
}

// ─── List Tests ────────────────────────────────────────────────────────────

func TestPolicyHandler_List(t *testing.T) {
	t.Parallel()

	t.Run("empty list", func(t *testing.T) {
		t.Parallel()
		r, _ := setupPolicyRouter()
		req := httptest.NewRequest(http.MethodGet, "/v1/policies", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("got status %d, want %d", rec.Code, http.StatusOK)
		}
		var resp map[string]any
		json.NewDecoder(rec.Body).Decode(&resp)
		if data, ok := resp["data"].([]any); !ok || len(data) != 0 {
			t.Error("expected empty data array")
		}
	})

	t.Run("with policies", func(t *testing.T) {
		t.Parallel()
		r, store := setupPolicyRouter()

		// Seed a policy
		_ = store.CreatePolicy(context.Background(), &domain.Policy{
			ID: "pol_test", OrgID: "org_1", Name: "Test", Enabled: true, Priority: 10,
		})

		req := httptest.NewRequest(http.MethodGet, "/v1/policies", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("got status %d, want %d", rec.Code, http.StatusOK)
		}
		var resp map[string]any
		json.NewDecoder(rec.Body).Decode(&resp)
		if total, ok := resp["total"].(float64); !ok || total != 1 {
			t.Errorf("expected total 1, got %v", resp["total"])
		}
	})
}

// ─── Get Tests ─────────────────────────────────────────────────────────────

func TestPolicyHandler_Get(t *testing.T) {
	t.Parallel()

	t.Run("found", func(t *testing.T) {
		t.Parallel()
		r, store := setupPolicyRouter()
		_ = store.CreatePolicy(context.Background(), &domain.Policy{
			ID: "pol_123", OrgID: "org_1", Name: "Found", Enabled: true, Priority: 1,
		})

		req := httptest.NewRequest(http.MethodGet, "/v1/policies/pol_123", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("got status %d, want %d", rec.Code, http.StatusOK)
		}
	})

	t.Run("not found", func(t *testing.T) {
		t.Parallel()
		r, _ := setupPolicyRouter()
		req := httptest.NewRequest(http.MethodGet, "/v1/policies/nonexistent", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Errorf("got status %d, want %d", rec.Code, http.StatusNotFound)
		}
	})
}

// ─── Update Tests ──────────────────────────────────────────────────────────

func TestPolicyHandler_Update(t *testing.T) {
	t.Parallel()

	t.Run("valid update", func(t *testing.T) {
		t.Parallel()
		r, store := setupPolicyRouter()
		_ = store.CreatePolicy(context.Background(), &domain.Policy{
			ID: "pol_upd", OrgID: "org_1", Name: "Original", Enabled: true, Priority: 10,
		})

		body := `{"name":"Updated"}`
		req := httptest.NewRequest(http.MethodPatch, "/v1/policies/pol_upd", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("got status %d, want %d", rec.Code, http.StatusOK)
		}
	})

	t.Run("not found", func(t *testing.T) {
		t.Parallel()
		r, _ := setupPolicyRouter()
		body := `{"name":"Updated"}`
		req := httptest.NewRequest(http.MethodPatch, "/v1/policies/nonexistent", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Errorf("got status %d, want %d", rec.Code, http.StatusNotFound)
		}
	})
}

// ─── Delete Tests ──────────────────────────────────────────────────────────

func TestPolicyHandler_Delete(t *testing.T) {
	t.Parallel()

	t.Run("valid delete", func(t *testing.T) {
		t.Parallel()
		r, store := setupPolicyRouter()
		_ = store.CreatePolicy(context.Background(), &domain.Policy{
			ID: "pol_del", OrgID: "org_1", Name: "DeleteMe", Enabled: true, Priority: 10,
		})

		req := httptest.NewRequest(http.MethodDelete, "/v1/policies/pol_del", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("got status %d, want %d", rec.Code, http.StatusOK)
		}
	})

	t.Run("not found", func(t *testing.T) {
		t.Parallel()
		r, _ := setupPolicyRouter()
		req := httptest.NewRequest(http.MethodDelete, "/v1/policies/nonexistent", nil)
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Errorf("got status %d, want %d", rec.Code, http.StatusNotFound)
		}
	})
}

// ─── Toggle Tests ──────────────────────────────────────────────────────────

func TestPolicyHandler_Toggle(t *testing.T) {
	t.Parallel()

	t.Run("toggle off", func(t *testing.T) {
		t.Parallel()
		r, store := setupPolicyRouter()
		_ = store.CreatePolicy(context.Background(), &domain.Policy{
			ID: "pol_tog", OrgID: "org_1", Name: "ToggleMe", Enabled: true, Priority: 10,
		})

		body := `{"enabled":false}`
		req := httptest.NewRequest(http.MethodPost, "/v1/policies/pol_tog/toggle", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("got status %d, want %d", rec.Code, http.StatusOK)
		}
	})

	t.Run("toggle on", func(t *testing.T) {
		t.Parallel()
		r, store := setupPolicyRouter()
		_ = store.CreatePolicy(context.Background(), &domain.Policy{
			ID: "pol_tog2", OrgID: "org_1", Name: "ToggleMe2", Enabled: false, Priority: 10,
		})

		body := `{"enabled":true}`
		req := httptest.NewRequest(http.MethodPost, "/v1/policies/pol_tog2/toggle", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusOK {
			t.Errorf("got status %d, want %d", rec.Code, http.StatusOK)
		}
	})

	t.Run("not found", func(t *testing.T) {
		t.Parallel()
		r, _ := setupPolicyRouter()
		body := `{"enabled":false}`
		req := httptest.NewRequest(http.MethodPost, "/v1/policies/nonexistent/toggle", strings.NewReader(body))
		req.Header.Set("Content-Type", "application/json")
		rec := httptest.NewRecorder()
		r.ServeHTTP(rec, req)

		if rec.Code != http.StatusNotFound {
			t.Errorf("got status %d, want %d", rec.Code, http.StatusNotFound)
		}
	})
}

