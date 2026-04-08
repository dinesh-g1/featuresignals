package handlers

import (
	"bytes"
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
)

func ssoCtx(r *http.Request, orgID, userID string) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.OrgIDKey, orgID)
	return r.WithContext(ctx)
}

func TestSSOHandler_Get_NotConfigured(t *testing.T) {
	t.Parallel()
	store := newMockStore()
	h := NewSSOHandler(store)

	r := ssoCtx(httptest.NewRequest("GET", "/v1/sso/config", nil), "org-1", "user-1")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("got %d, want 404", w.Code)
	}
}

func TestSSOHandler_Upsert_OIDC_Valid(t *testing.T) {
	t.Parallel()
	store := newMockStore()
	h := NewSSOHandler(store)

	body := `{
		"provider_type": "oidc",
		"issuer_url": "https://accounts.google.com",
		"client_id": "test-client",
		"client_secret": "test-secret",
		"enabled": true
	}`

	r := httptest.NewRequest("POST", "/v1/sso/config", bytes.NewReader([]byte(body)))
	r.Header.Set("Content-Type", "application/json")
	r = ssoCtx(r, "org-1", "user-1")
	w := httptest.NewRecorder()

	h.Upsert(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("got %d, want 200; body: %s", w.Code, w.Body.String())
	}

	var resp SSOConfigResponse
	if err := json.NewDecoder(w.Body).Decode(&resp); err != nil {
		t.Fatal(err)
	}
	if resp.ProviderType != "oidc" {
		t.Errorf("got provider_type %q, want oidc", resp.ProviderType)
	}
	if !resp.Enabled {
		t.Error("expected enabled=true")
	}
}

func TestSSOHandler_Upsert_OIDC_MissingFields(t *testing.T) {
	t.Parallel()
	store := newMockStore()
	h := NewSSOHandler(store)

	body := `{"provider_type": "oidc", "issuer_url": "https://example.com"}`

	r := httptest.NewRequest("POST", "/v1/sso/config", bytes.NewReader([]byte(body)))
	r.Header.Set("Content-Type", "application/json")
	r = ssoCtx(r, "org-1", "user-1")
	w := httptest.NewRecorder()

	h.Upsert(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400; body: %s", w.Code, w.Body.String())
	}
}

func TestSSOHandler_Upsert_SAML_MissingFields(t *testing.T) {
	t.Parallel()
	store := newMockStore()
	h := NewSSOHandler(store)

	body := `{"provider_type": "saml"}`

	r := httptest.NewRequest("POST", "/v1/sso/config", bytes.NewReader([]byte(body)))
	r.Header.Set("Content-Type", "application/json")
	r = ssoCtx(r, "org-1", "user-1")
	w := httptest.NewRecorder()

	h.Upsert(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400; body: %s", w.Code, w.Body.String())
	}
}

func TestSSOHandler_Upsert_InvalidProviderType(t *testing.T) {
	t.Parallel()
	store := newMockStore()
	h := NewSSOHandler(store)

	body := `{"provider_type": "ldap"}`

	r := httptest.NewRequest("POST", "/v1/sso/config", bytes.NewReader([]byte(body)))
	r.Header.Set("Content-Type", "application/json")
	r = ssoCtx(r, "org-1", "user-1")
	w := httptest.NewRecorder()

	h.Upsert(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("got %d, want 400", w.Code)
	}
}

func TestSSOHandler_Delete(t *testing.T) {
	t.Parallel()
	store := newMockStore()
	h := NewSSOHandler(store)

	r := ssoCtx(httptest.NewRequest("DELETE", "/v1/sso/config", nil), "org-1", "user-1")
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("got %d, want 204", w.Code)
	}
}

func TestSSOHandler_TestConnection_NotConfigured(t *testing.T) {
	t.Parallel()
	store := newMockStore()
	h := NewSSOHandler(store)

	r := ssoCtx(httptest.NewRequest("POST", "/v1/sso/config/test", nil), "org-1", "user-1")
	w := httptest.NewRecorder()

	h.TestConnection(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("got %d, want 404", w.Code)
	}
}

// --- SSO Auth handler tests ---

func withChiSlug(r *http.Request, key, value string) *http.Request {
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add(key, value)
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
}

type mockJWTForSSO struct{}

func (m *mockJWTForSSO) GenerateTokenPair(userID, orgID, role string) (*auth.TokenPair, error) {
	return &auth.TokenPair{
		AccessToken:  "mock-access-token",
		RefreshToken: "mock-refresh-token",
		ExpiresAt:    9999999999,
	}, nil
}
func (m *mockJWTForSSO) ValidateToken(tokenStr string) (*auth.Claims, error) {
	return nil, auth.ErrInvalidToken
}
func (m *mockJWTForSSO) ValidateRefreshToken(tokenStr string) (*auth.Claims, error) {
	return nil, auth.ErrInvalidToken
}

func TestSSOAuthHandler_Discovery_NoSSO(t *testing.T) {
	t.Parallel()
	store := newMockStore()
	h := NewSSOAuthHandler(store, &mockJWTForSSO{}, "http://localhost:8080", "http://localhost:3000")

	r := httptest.NewRequest("GET", "/v1/sso/discovery/unknown-org", nil)
	r = withChiSlug(r, "orgSlug", "unknown-org")
	w := httptest.NewRecorder()

	h.Discovery(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("got %d, want 200", w.Code)
	}

	var resp map[string]interface{}
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["sso_enabled"] != false {
		t.Error("expected sso_enabled=false for unknown org")
	}
}

func TestSSOAuthHandler_Discovery_SSOEnabled(t *testing.T) {
	t.Parallel()
	store := newMockStore()
	store.ssoConfigs["test-org"] = &domain.SSOConfig{
		OrgID:        "org-1",
		ProviderType: domain.SSOProviderOIDC,
		Enabled:      true,
		Enforce:      false,
		IssuerURL:    "https://accounts.google.com",
		ClientID:     "client",
		ClientSecret: "secret",
	}
	h := NewSSOAuthHandler(store, &mockJWTForSSO{}, "http://localhost:8080", "http://localhost:3000")

	r := httptest.NewRequest("GET", "/v1/sso/discovery/test-org", nil)
	r = withChiSlug(r, "orgSlug", "test-org")
	w := httptest.NewRecorder()

	h.Discovery(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("got %d, want 200", w.Code)
	}

	var resp map[string]interface{}
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["sso_enabled"] != true {
		t.Error("expected sso_enabled=true")
	}
	if resp["provider_type"] != "oidc" {
		t.Errorf("expected provider_type=oidc, got %v", resp["provider_type"])
	}
}

func TestSSOAuthHandler_Discovery_SSODisabled(t *testing.T) {
	t.Parallel()
	store := newMockStore()
	store.ssoConfigs["disabled-org"] = &domain.SSOConfig{
		OrgID:        "org-2",
		ProviderType: domain.SSOProviderSAML,
		Enabled:      false,
	}
	h := NewSSOAuthHandler(store, &mockJWTForSSO{}, "http://localhost:8080", "http://localhost:3000")

	r := httptest.NewRequest("GET", "/v1/sso/discovery/disabled-org", nil)
	r = withChiSlug(r, "orgSlug", "disabled-org")
	w := httptest.NewRecorder()

	h.Discovery(w, r)

	var resp map[string]interface{}
	json.NewDecoder(w.Body).Decode(&resp)
	if resp["sso_enabled"] != false {
		t.Error("expected sso_enabled=false for disabled SSO")
	}
}

func TestSSOAuthHandler_SAMLMetadata_NotConfigured(t *testing.T) {
	t.Parallel()
	store := newMockStore()
	h := NewSSOAuthHandler(store, &mockJWTForSSO{}, "http://localhost:8080", "http://localhost:3000")

	r := httptest.NewRequest("GET", "/v1/sso/saml/metadata/no-org", nil)
	r = withChiSlug(r, "orgSlug", "no-org")
	w := httptest.NewRecorder()

	h.SAMLMetadata(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestSSOAuthHandler_OIDCAuthorize_NotConfigured(t *testing.T) {
	t.Parallel()
	store := newMockStore()
	h := NewSSOAuthHandler(store, &mockJWTForSSO{}, "http://localhost:8080", "http://localhost:3000")

	r := httptest.NewRequest("GET", "/v1/sso/oidc/authorize/no-org", nil)
	r = withChiSlug(r, "orgSlug", "no-org")
	w := httptest.NewRecorder()

	h.OIDCAuthorize(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

// --- Auth handler SSO enforcement tests ---

func TestAuthHandler_Login_SSOEnforced_BlocksNonOwner(t *testing.T) {
	t.Parallel()

	store := newMockStore()
	hash, _ := auth.HashPassword("Test1234!")
	store.usersByEmail["dev@test.com"] = &domain.User{
		ID: "user-dev", Email: "dev@test.com", PasswordHash: hash,
	}
	store.users["user-dev"] = store.usersByEmail["dev@test.com"]
	store.orgMembers["org-sso"] = []domain.OrgMember{
		{ID: "mem-1", OrgID: "org-sso", UserID: "user-dev", Role: domain.RoleDeveloper},
	}
	store.orgs["org-sso"] = &domain.Organization{ID: "org-sso", Name: "SSO Org"}
	store.ssoByOrgID["org-sso"] = &domain.SSOConfig{
		OrgID: "org-sso", Enabled: true, Enforce: true, ProviderType: domain.SSOProviderOIDC,
	}

	h := NewAuthHandler(store, &mockJWTForSSO{}, "", "", nil)

	body := `{"email":"dev@test.com","password":"Test1234!"}`
	r := httptest.NewRequest("POST", "/v1/auth/login", bytes.NewReader([]byte(body)))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Login(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 for SSO-enforced non-owner, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestAuthHandler_Login_SSOEnforced_AllowsOwner(t *testing.T) {
	t.Parallel()

	store := newMockStore()
	hash, _ := auth.HashPassword("Test1234!")
	store.usersByEmail["owner@test.com"] = &domain.User{
		ID: "user-owner", Email: "owner@test.com", PasswordHash: hash,
	}
	store.users["user-owner"] = store.usersByEmail["owner@test.com"]
	store.orgMembers["org-sso2"] = []domain.OrgMember{
		{ID: "mem-2", OrgID: "org-sso2", UserID: "user-owner", Role: domain.RoleOwner},
	}
	store.orgs["org-sso2"] = &domain.Organization{ID: "org-sso2", Name: "SSO Org"}
	store.ssoByOrgID["org-sso2"] = &domain.SSOConfig{
		OrgID: "org-sso2", Enabled: true, Enforce: true, ProviderType: domain.SSOProviderOIDC,
	}

	h := NewAuthHandler(store, &mockJWTForSSO{}, "", "", nil)

	body := `{"email":"owner@test.com","password":"Test1234!"}`
	r := httptest.NewRequest("POST", "/v1/auth/login", bytes.NewReader([]byte(body)))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Login(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 for owner break-glass, got %d; body: %s", w.Code, w.Body.String())
	}
}

func TestAuthHandler_Login_SSONotEnforced_AllowsPassword(t *testing.T) {
	t.Parallel()

	store := newMockStore()
	hash, _ := auth.HashPassword("Test1234!")
	store.usersByEmail["dev2@test.com"] = &domain.User{
		ID: "user-dev2", Email: "dev2@test.com", PasswordHash: hash,
	}
	store.users["user-dev2"] = store.usersByEmail["dev2@test.com"]
	store.orgMembers["org-noenforce"] = []domain.OrgMember{
		{ID: "mem-3", OrgID: "org-noenforce", UserID: "user-dev2", Role: domain.RoleDeveloper},
	}
	store.orgs["org-noenforce"] = &domain.Organization{ID: "org-noenforce", Name: "Org"}
	store.ssoByOrgID["org-noenforce"] = &domain.SSOConfig{
		OrgID: "org-noenforce", Enabled: true, Enforce: false, ProviderType: domain.SSOProviderOIDC,
	}

	h := NewAuthHandler(store, &mockJWTForSSO{}, "", "", nil)

	body := `{"email":"dev2@test.com","password":"Test1234!"}`
	r := httptest.NewRequest("POST", "/v1/auth/login", bytes.NewReader([]byte(body)))
	r.Header.Set("Content-Type", "application/json")
	w := httptest.NewRecorder()

	h.Login(w, r)

	if w.Code != http.StatusOK {
		t.Errorf("expected 200 when SSO not enforced, got %d; body: %s", w.Code, w.Body.String())
	}
}
