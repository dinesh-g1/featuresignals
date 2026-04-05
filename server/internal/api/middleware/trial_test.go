package middleware

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

type trialMockStore struct {
	orgs       map[string]*domain.Organization
	downgraded map[string]bool
}

func newTrialMockStore() *trialMockStore {
	return &trialMockStore{
		orgs:       make(map[string]*domain.Organization),
		downgraded: make(map[string]bool),
	}
}

func (s *trialMockStore) GetOrganization(_ context.Context, id string) (*domain.Organization, error) {
	org, ok := s.orgs[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	return org, nil
}

func (s *trialMockStore) DowngradeOrgToFree(_ context.Context, orgID string) error {
	s.downgraded[orgID] = true
	if org, ok := s.orgs[orgID]; ok {
		org.Plan = domain.PlanFree
		org.TrialExpiresAt = nil
	}
	return nil
}

func trialTestHandler() http.HandlerFunc {
	return func(w http.ResponseWriter, _ *http.Request) {
		w.WriteHeader(http.StatusOK)
		w.Write([]byte(`{"ok":true}`))
	}
}

func TestTrialExpiry_ActiveTrial_PassesThrough(t *testing.T) {
	store := newTrialMockStore()
	future := time.Now().Add(7 * 24 * time.Hour)
	store.orgs["org-1"] = &domain.Organization{
		ID:             "org-1",
		Plan:           domain.PlanTrial,
		TrialExpiresAt: &future,
	}

	mw := TrialExpiry(store, slog.Default())
	handler := mw(trialTestHandler())

	r := httptest.NewRequest("GET", "/test", nil)
	r = r.WithContext(context.WithValue(r.Context(), OrgIDKey, "org-1"))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if store.downgraded["org-1"] {
		t.Error("active trial should not be downgraded")
	}
}

func TestTrialExpiry_ExpiredTrial_Downgrades(t *testing.T) {
	store := newTrialMockStore()
	past := time.Now().Add(-1 * time.Hour)
	store.orgs["org-1"] = &domain.Organization{
		ID:             "org-1",
		Plan:           domain.PlanTrial,
		TrialExpiresAt: &past,
	}

	mw := TrialExpiry(store, slog.Default())
	handler := mw(trialTestHandler())

	r := httptest.NewRequest("GET", "/test", nil)
	r = r.WithContext(context.WithValue(r.Context(), OrgIDKey, "org-1"))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 (pass-through after downgrade), got %d", w.Code)
	}
	if !store.downgraded["org-1"] {
		t.Error("expired trial should be downgraded to free")
	}
}

func TestTrialExpiry_SoftDeleted_Blocked(t *testing.T) {
	store := newTrialMockStore()
	deleted := time.Now().Add(-24 * time.Hour)
	store.orgs["org-1"] = &domain.Organization{
		ID:        "org-1",
		Plan:      domain.PlanFree,
		DeletedAt: &deleted,
	}

	mw := TrialExpiry(store, slog.Default())
	handler := mw(trialTestHandler())

	r := httptest.NewRequest("GET", "/test", nil)
	r = r.WithContext(context.WithValue(r.Context(), OrgIDKey, "org-1"))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 for deleted org, got %d", w.Code)
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)
	if resp["error"] != "This account has been deactivated. Contact support to restore it." {
		t.Errorf("expected deactivation error message, got %q", resp["error"])
	}
}

func TestTrialExpiry_FreePlan_NoDowngrade(t *testing.T) {
	store := newTrialMockStore()
	store.orgs["org-1"] = &domain.Organization{
		ID:   "org-1",
		Plan: domain.PlanFree,
	}

	mw := TrialExpiry(store, slog.Default())
	handler := mw(trialTestHandler())

	r := httptest.NewRequest("GET", "/test", nil)
	r = r.WithContext(context.WithValue(r.Context(), OrgIDKey, "org-1"))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200, got %d", w.Code)
	}
	if store.downgraded["org-1"] {
		t.Error("free plan org should not be downgraded")
	}
}

func TestTrialExpiry_NoOrgIDInContext_PassesThrough(t *testing.T) {
	store := newTrialMockStore()
	mw := TrialExpiry(store, slog.Default())
	handler := mw(trialTestHandler())

	r := httptest.NewRequest("GET", "/test", nil)
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 (no org context), got %d", w.Code)
	}
}

func TestTrialExpiry_OrgNotFound_PassesThrough(t *testing.T) {
	store := newTrialMockStore()
	mw := TrialExpiry(store, slog.Default())
	handler := mw(trialTestHandler())

	r := httptest.NewRequest("GET", "/test", nil)
	r = r.WithContext(context.WithValue(r.Context(), OrgIDKey, "nonexistent"))
	w := httptest.NewRecorder()

	handler.ServeHTTP(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 (org not found → pass through), got %d", w.Code)
	}
}
