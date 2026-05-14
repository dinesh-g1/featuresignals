package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
)

func requestWithClaims(r *http.Request, claims *auth.Claims) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, claims.UserID)
	ctx = context.WithValue(ctx, middleware.OrgIDKey, claims.OrgID)
	ctx = context.WithValue(ctx, middleware.RoleKey, claims.Role)
	ctx = context.WithValue(ctx, middleware.ClaimsKey, claims)
	return r.WithContext(ctx)
}

// ---------------------------------------------------------------------------
// Logout
// ---------------------------------------------------------------------------

func TestAuthHandler_Logout(t *testing.T) {
	tests := []struct {
		name       string
		claims     *auth.Claims
		setClaims  bool
		wantStatus int
		wantMsg    string
		wantRevoke bool
	}{
		{
			name: "success",
			claims: &auth.Claims{
				UserID: "user-1",
				OrgID:  "org-1",
				Role:   "owner",
				RegisteredClaims: jwt.RegisteredClaims{
					ID:        "test-jti",
					ExpiresAt: jwt.NewNumericDate(time.Now().Add(1 * time.Hour)),
				},
			},
			setClaims:  true,
			wantStatus: http.StatusOK,
			wantMsg:    "logged out",
			wantRevoke: true,
		},
		{
			name:       "no_claims",
			claims:     nil,
			setClaims:  false,
			wantStatus: http.StatusBadRequest,
			wantMsg:    "no token to revoke",
		},
		{
			name: "empty_jti",
			claims: &auth.Claims{
				UserID: "user-1",
				OrgID:  "org-1",
				Role:   "owner",
				RegisteredClaims: jwt.RegisteredClaims{
					ID: "",
				},
			},
			setClaims:  true,
			wantStatus: http.StatusBadRequest,
			wantMsg:    "no token to revoke",
		},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			h, store := newTestAuthHandler()
			r := httptest.NewRequest("POST", "/v1/auth/logout", nil)

			if tc.setClaims && tc.claims != nil {
				r = requestWithClaims(r, tc.claims)
			} else if !tc.setClaims {
				r = requestWithAuth(r, "user-1", "org-1", "owner")
			} else {
				r = requestWithClaims(r, tc.claims)
			}

			w := httptest.NewRecorder()
			h.Logout(w, r)

			if w.Code != tc.wantStatus {
				t.Fatalf("expected status %d, got %d: %s", tc.wantStatus, w.Code, w.Body.String())
			}

			var resp map[string]string
			json.Unmarshal(w.Body.Bytes(), &resp)

			if tc.wantStatus == http.StatusOK {
				if resp["message"] != tc.wantMsg {
					t.Errorf("expected message %q, got %q", tc.wantMsg, resp["message"])
				}
			} else {
				if resp["error"] != tc.wantMsg {
					t.Errorf("expected error %q, got %q", tc.wantMsg, resp["error"])
				}
			}

			if tc.wantRevoke {
				store.mu.RLock()
				revoked := store.revokedTokens[tc.claims.ID]
				store.mu.RUnlock()
				if !revoked {
					t.Error("expected token to be revoked in store")
				}
			}
		})
	}
}

// ---------------------------------------------------------------------------
// MFA
// ---------------------------------------------------------------------------

func TestMFAHandler_Enable(t *testing.T) {
	store := newMockStore()
	h := NewMFAHandler(store)

	pw, _ := auth.HashPassword("Secure@123")
	user := &domain.User{Email: "mfa@example.com", Name: "MFA User", PasswordHash: pw}
	store.CreateUser(context.Background(), user)

	r := httptest.NewRequest("POST", "/v1/mfa/enable", nil)
	r = requestWithAuth(r, user.ID, "org-1", "owner")
	w := httptest.NewRecorder()

	h.Enable(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp dto.MFAEnableResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.Secret == "" {
		t.Error("expected non-empty secret")
	}
	if resp.QRURI == "" {
		t.Error("expected non-empty qr_uri")
	}
	if !strings.Contains(resp.QRURI, "mfa@example.com") {
		t.Errorf("expected qr_uri to contain user email, got %s", resp.QRURI)
	}

	stored, err := store.GetMFASecret(context.Background(), user.ID)
	if err != nil {
		t.Fatal("MFA secret not stored")
	}
	if stored.Secret != resp.Secret {
		t.Error("stored secret doesn't match response")
	}
}

func TestMFAHandler_Status_Disabled(t *testing.T) {
	store := newMockStore()
	h := NewMFAHandler(store)

	r := httptest.NewRequest("GET", "/v1/mfa/status", nil)
	r = requestWithAuth(r, "user-1", "org-1", "owner")
	w := httptest.NewRecorder()

	h.Status(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp["enabled"] != false {
		t.Errorf("expected enabled=false, got %v", resp["enabled"])
	}
}

func TestMFAHandler_Status_Enabled(t *testing.T) {
	store := newMockStore()
	h := NewMFAHandler(store)

	store.UpsertMFASecret(context.Background(), "user-1", "TESTSECRET")
	store.EnableMFA(context.Background(), "user-1")

	r := httptest.NewRequest("GET", "/v1/mfa/status", nil)
	r = requestWithAuth(r, "user-1", "org-1", "owner")
	w := httptest.NewRecorder()

	h.Status(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp["enabled"] != true {
		t.Errorf("expected enabled=true, got %v", resp["enabled"])
	}
}

func TestMFAHandler_Verify_NoSecret(t *testing.T) {
	store := newMockStore()
	h := NewMFAHandler(store)

	body := `{"code":"123456"}`
	r := httptest.NewRequest("POST", "/v1/mfa/verify", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", "org-1", "owner")
	w := httptest.NewRecorder()

	h.Verify(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)

	if !strings.Contains(resp["error"], "MFA not initiated") {
		t.Errorf("expected 'MFA not initiated' error, got %q", resp["error"])
	}
}

func TestMFAHandler_Disable_WrongPassword(t *testing.T) {
	store := newMockStore()
	h := NewMFAHandler(store)

	pw, _ := auth.HashPassword("Correct@123")
	user := &domain.User{Email: "mfa@example.com", Name: "MFA User", PasswordHash: pw}
	store.CreateUser(context.Background(), user)

	store.UpsertMFASecret(context.Background(), user.ID, "TESTSECRET")
	store.EnableMFA(context.Background(), user.ID)

	body := `{"password":"Wrong@Password1"}`
	r := httptest.NewRequest("POST", "/v1/mfa/disable", strings.NewReader(body))
	r = requestWithAuth(r, user.ID, "org-1", "owner")
	w := httptest.NewRecorder()

	h.Disable(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Fatalf("expected 401, got %d: %s", w.Code, w.Body.String())
	}

	var resp map[string]string
	json.Unmarshal(w.Body.Bytes(), &resp)

	if !strings.Contains(resp["error"], "password is incorrect") {
		t.Errorf("expected password incorrect error, got %q", resp["error"])
	}

	secret, err := store.GetMFASecret(context.Background(), user.ID)
	if err != nil || !secret.Enabled {
		t.Error("MFA should still be enabled after wrong password")
	}
}

func TestMFAHandler_Disable_Success(t *testing.T) {
	store := newMockStore()
	h := NewMFAHandler(store)

	pw, _ := auth.HashPassword("Correct@123")
	user := &domain.User{Email: "mfa@example.com", Name: "MFA User", PasswordHash: pw}
	store.CreateUser(context.Background(), user)

	store.UpsertMFASecret(context.Background(), user.ID, "TESTSECRET")
	store.EnableMFA(context.Background(), user.ID)

	body := `{"password":"Correct@123"}`
	r := httptest.NewRequest("POST", "/v1/mfa/disable", strings.NewReader(body))
	r = requestWithAuth(r, user.ID, "org-1", "owner")
	w := httptest.NewRecorder()

	h.Disable(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	_, err := store.GetMFASecret(context.Background(), user.ID)
	if err == nil {
		t.Error("MFA secret should be removed after disable")
	}
}

// ---------------------------------------------------------------------------
// SCIM
// ---------------------------------------------------------------------------

func setupSCIMOrg(store *mockStore) (orgID string, users []*domain.User) {
	org := &domain.Organization{Name: "SCIM Org", Slug: "scim-org"}
	store.CreateOrganization(context.Background(), org)

	for i, entry := range []struct {
		email string
		name  string
		role  domain.Role
	}{
		{"alice@example.com", "Alice", domain.RoleOwner},
		{"bob@example.com", "Bob", domain.RoleDeveloper},
	} {
		pw, _ := auth.HashPassword("Secure@1" + string(rune('0'+i)))
		u := &domain.User{Email: entry.email, Name: entry.name, PasswordHash: pw}
		store.CreateUser(context.Background(), u)
		store.AddOrgMember(context.Background(), &domain.OrgMember{
			OrgID:  org.ID,
			UserID: u.ID,
			Role:   entry.role,
		})
		users = append(users, u)
	}
	return org.ID, users
}

func TestSCIMHandler_ListUsers(t *testing.T) {
	store := newMockStore()
	h := NewSCIMHandler(store)
	orgID, _ := setupSCIMOrg(store)

	r := httptest.NewRequest("GET", "/v1/scim/Users", nil)
	r = requestWithAuth(r, "user-1", orgID, "owner")
	w := httptest.NewRecorder()

	h.ListUsers(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp scimListResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.TotalResults != 2 {
		t.Errorf("expected 2 results, got %d", resp.TotalResults)
	}
	if len(resp.Resources) != 2 {
		t.Errorf("expected 2 resources, got %d", len(resp.Resources))
	}
	if len(resp.Schemas) == 0 || resp.Schemas[0] != scimListSchema {
		t.Errorf("expected SCIM list schema, got %v", resp.Schemas)
	}
}

func TestSCIMHandler_ListUsers_WithFilter(t *testing.T) {
	store := newMockStore()
	h := NewSCIMHandler(store)
	orgID, _ := setupSCIMOrg(store)

	r := httptest.NewRequest("GET", "/v1/scim/Users", nil)
	q := r.URL.Query()
	q.Set("filter", `userName eq "alice@example.com"`)
	r.URL.RawQuery = q.Encode()
	r = requestWithAuth(r, "user-1", orgID, "owner")
	w := httptest.NewRecorder()

	h.ListUsers(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp scimListResponse
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.TotalResults != 1 {
		t.Errorf("expected 1 filtered result, got %d", resp.TotalResults)
	}
}

func TestSCIMHandler_GetUser_NotFound(t *testing.T) {
	store := newMockStore()
	h := NewSCIMHandler(store)

	r := httptest.NewRequest("GET", "/v1/scim/Users/nonexistent", nil)
	r = requestWithChi(r, map[string]string{"userID": "nonexistent"})
	r = requestWithAuth(r, "user-1", "org-1", "owner")
	w := httptest.NewRecorder()

	h.GetUser(w, r)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}

	var resp scimError
	json.Unmarshal(w.Body.Bytes(), &resp)

	if !strings.Contains(resp.Detail, "no user matches") {
		t.Errorf("expected 'no user matches' error, got %q", resp.Detail)
	}
}

func TestSCIMHandler_GetUser_Success(t *testing.T) {
	store := newMockStore()
	h := NewSCIMHandler(store)
	orgID, users := setupSCIMOrg(store)

	targetUser := users[0]
	r := httptest.NewRequest("GET", "/v1/scim/Users/"+targetUser.ID, nil)
	r = requestWithChi(r, map[string]string{"userID": targetUser.ID})
	r = requestWithAuth(r, "user-1", orgID, "owner")
	w := httptest.NewRecorder()

	h.GetUser(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var resp scimUser
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.UserName != targetUser.Email {
		t.Errorf("expected userName %q, got %q", targetUser.Email, resp.UserName)
	}
	if resp.ID != targetUser.ID {
		t.Errorf("expected id %q, got %q", targetUser.ID, resp.ID)
	}
}

func TestSCIMHandler_GetUser_CrossTenantBlocked(t *testing.T) {
	store := newMockStore()
	h := NewSCIMHandler(store)
	_, users := setupSCIMOrg(store)

	targetUser := users[0]
	r := httptest.NewRequest("GET", "/v1/scim/Users/"+targetUser.ID, nil)
	r = requestWithChi(r, map[string]string{"userID": targetUser.ID})
	r = requestWithAuth(r, "attacker", "other-org-id", "owner")
	w := httptest.NewRecorder()

	h.GetUser(w, r)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404 for cross-tenant access, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSCIMHandler_CreateUser(t *testing.T) {
	store := newMockStore()
	h := NewSCIMHandler(store)

	org := &domain.Organization{Name: "SCIM Org", Slug: "scim-org"}
	store.CreateOrganization(context.Background(), org)

	body := `{
		"schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
		"userName": "newuser@example.com",
		"name": {"formatted": "New User"}
	}`
	r := httptest.NewRequest("POST", "/v1/scim/Users", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", org.ID, "owner")
	w := httptest.NewRecorder()

	h.CreateUser(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var resp scimUser
	json.Unmarshal(w.Body.Bytes(), &resp)

	if resp.UserName != "newuser@example.com" {
		t.Errorf("expected userName 'newuser@example.com', got %q", resp.UserName)
	}
	if resp.ID == "" {
		t.Error("expected non-empty user ID")
	}

	created, err := store.GetUserByEmail(context.Background(), "newuser@example.com")
	if err != nil {
		t.Fatal("user not found in store after SCIM create")
	}
	if created.Name != "New User" {
		t.Errorf("expected name 'New User', got %q", created.Name)
	}

	_, memErr := store.GetOrgMember(context.Background(), org.ID, created.ID)
	if memErr != nil {
		t.Error("expected user to be added as org member")
	}
}

func TestSCIMHandler_CreateUser_MissingUserName(t *testing.T) {
	store := newMockStore()
	h := NewSCIMHandler(store)

	body := `{"schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"], "name": {"formatted": "No Email"}}`
	r := httptest.NewRequest("POST", "/v1/scim/Users", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", "org-1", "owner")
	w := httptest.NewRecorder()

	h.CreateUser(w, r)

	if w.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSCIMHandler_CreateUser_ExistingUser(t *testing.T) {
	store := newMockStore()
	h := NewSCIMHandler(store)
	orgID, users := setupSCIMOrg(store)

	body := `{
		"schemas": ["urn:ietf:params:scim:schemas:core:2.0:User"],
		"userName": "` + users[0].Email + `"
	}`
	r := httptest.NewRequest("POST", "/v1/scim/Users", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", orgID, "owner")
	w := httptest.NewRecorder()

	h.CreateUser(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200 for existing user, got %d: %s", w.Code, w.Body.String())
	}
}

func TestSCIMHandler_DeleteUser(t *testing.T) {
	store := newMockStore()
	h := NewSCIMHandler(store)
	orgID, users := setupSCIMOrg(store)
	targetUser := users[1]

	r := httptest.NewRequest("DELETE", "/v1/scim/Users/"+targetUser.ID, nil)
	r = requestWithChi(r, map[string]string{"userID": targetUser.ID})
	r = requestWithAuth(r, "user-1", orgID, "owner")
	w := httptest.NewRecorder()

	h.DeleteUser(w, r)

	if w.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", w.Code, w.Body.String())
	}

	_, err := store.GetOrgMember(context.Background(), orgID, targetUser.ID)
	if err == nil {
		t.Error("expected org membership to be removed after SCIM delete")
	}
}

func TestSCIMHandler_DeleteUser_NotFound(t *testing.T) {
	store := newMockStore()
	h := NewSCIMHandler(store)

	r := httptest.NewRequest("DELETE", "/v1/scim/Users/ghost", nil)
	r = requestWithChi(r, map[string]string{"userID": "ghost"})
	r = requestWithAuth(r, "user-1", "org-1", "owner")
	w := httptest.NewRecorder()

	h.DeleteUser(w, r)

	if w.Code != http.StatusNotFound {
		t.Fatalf("expected 404, got %d: %s", w.Code, w.Body.String())
	}
}
