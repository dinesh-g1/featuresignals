package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
)

const (
	orgAlpha = "org-alpha"
	orgBeta  = "org-beta"
)

func setupTenantIsolation(t *testing.T) *mockStore {
	t.Helper()
	store := newMockStore()

	store.orgs[orgAlpha] = &domain.Organization{ID: orgAlpha, Name: "Alpha Corp"}
	store.orgs[orgBeta] = &domain.Organization{ID: orgBeta, Name: "Beta Inc"}

	store.projects["proj-alpha"] = &domain.Project{ID: "proj-alpha", Name: "Alpha Project", OrgID: orgAlpha}
	store.projects["proj-beta"] = &domain.Project{ID: "proj-beta", Name: "Beta Project", OrgID: orgBeta}

	store.flags["proj-alpha:alpha-feature"] = &domain.Flag{ID: "flag-alpha", Key: "alpha-feature", Name: "Alpha Feature", ProjectID: "proj-alpha"}
	store.flags["proj-beta:beta-feature"] = &domain.Flag{ID: "flag-beta", Key: "beta-feature", Name: "Beta Feature", ProjectID: "proj-beta"}

	return store
}

func authRequest(r *http.Request, userID, orgID, role string) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.OrgIDKey, orgID)
	ctx = context.WithValue(ctx, middleware.RoleKey, role)
	return r.WithContext(ctx)
}

func withURLParams(r *http.Request, params map[string]string) *http.Request {
	rctx := chi.NewRouteContext()
	for k, v := range params {
		rctx.URLParams.Add(k, v)
	}
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
}

// TestTenantIsolation_ProjectAccess verifies that an org cannot access
// another org's project. Cross-tenant access must return 404 (not 403)
// to prevent entity existence leakage.
func TestTenantIsolation_ProjectAccess(t *testing.T) {
	store := setupTenantIsolation(t)
	h := NewProjectHandler(store)

	tests := []struct {
		name       string
		userOrg    string
		projectID  string
		wantStatus int
	}{
		{
			name:       "same org access allowed",
			userOrg:    orgAlpha,
			projectID:  "proj-alpha",
			wantStatus: http.StatusOK,
		},
		{
			name:       "cross-tenant access blocked with 404",
			userOrg:    orgBeta,
			projectID:  "proj-alpha",
			wantStatus: http.StatusNotFound,
		},
		{
			name:       "nonexistent project returns 404",
			userOrg:    orgAlpha,
			projectID:  "proj-nonexistent",
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest("GET", "/v1/projects/"+tc.projectID, nil)
			r = authRequest(r, "user-1", tc.userOrg, "admin")
			r = withURLParams(r, map[string]string{"projectID": tc.projectID})
			w := httptest.NewRecorder()

			h.Get(w, r)

			if w.Code != tc.wantStatus {
				t.Errorf("expected %d, got %d: %s", tc.wantStatus, w.Code, w.Body.String())
			}
		})
	}
}

// TestTenantIsolation_FlagAccess verifies flags from one org aren't
// accessible by another org's authenticated user.
func TestTenantIsolation_FlagAccess(t *testing.T) {
	store := setupTenantIsolation(t)
	h := NewFlagHandler(store, nil)

	tests := []struct {
		name       string
		userOrg    string
		projectID  string
		flagKey    string
		wantStatus int
	}{
		{
			name:       "same org flag access",
			userOrg:    orgAlpha,
			projectID:  "proj-alpha",
			flagKey:    "alpha-feature",
			wantStatus: http.StatusOK,
		},
		{
			name:       "cross-tenant flag access blocked",
			userOrg:    orgBeta,
			projectID:  "proj-alpha",
			flagKey:    "alpha-feature",
			wantStatus: http.StatusNotFound,
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			r := httptest.NewRequest("GET", "/v1/projects/"+tc.projectID+"/flags/"+tc.flagKey, nil)
			r = authRequest(r, "user-1", tc.userOrg, "admin")
			r = withURLParams(r, map[string]string{"projectID": tc.projectID, "flagKey": tc.flagKey})
			w := httptest.NewRecorder()

			h.Get(w, r)

			if w.Code != tc.wantStatus {
				t.Errorf("expected %d, got %d: %s", tc.wantStatus, w.Code, w.Body.String())
			}
		})
	}
}

// TestTenantIsolation_ListReturnsOnlyOwnData verifies that listing
// endpoints only return data belonging to the authenticated org.
func TestTenantIsolation_ListReturnsOnlyOwnData(t *testing.T) {
	store := setupTenantIsolation(t)
	h := NewProjectHandler(store)

	r := httptest.NewRequest("GET", "/v1/projects", nil)
	r = authRequest(r, "user-1", orgAlpha, "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	body := w.Body.String()
	if contains(body, "Beta Project") {
		t.Error("response must not contain projects from another organization")
	}
}

func contains(s, substr string) bool {
	return len(s) >= len(substr) && searchSubstring(s, substr)
}

func searchSubstring(s, substr string) bool {
	for i := 0; i <= len(s)-len(substr); i++ {
		if s[i:i+len(substr)] == substr {
			return true
		}
	}
	return false
}
