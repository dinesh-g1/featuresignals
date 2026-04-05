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

type stubTokenManager struct{}

func (s *stubTokenManager) GenerateTokenPair(userID, orgID, role string) (*auth.TokenPair, error) {
	return &auth.TokenPair{AccessToken: "tok", RefreshToken: "ref"}, nil
}
func (s *stubTokenManager) ValidateToken(tokenStr string) (*auth.Claims, error) {
	return &auth.Claims{}, nil
}
func (s *stubTokenManager) ValidateRefreshToken(tokenStr string) (*auth.Claims, error) {
	return &auth.Claims{}, nil
}
func (s *stubTokenManager) GenerateDemoTokenPair(userID, orgID, role string, demoExpiresAt int64) (*auth.TokenPair, error) {
	return &auth.TokenPair{AccessToken: "demo-tok", RefreshToken: "demo-ref"}, nil
}

func teamCtx(ctx context.Context, userID, orgID, role string) context.Context {
	ctx = context.WithValue(ctx, middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.OrgIDKey, orgID)
	ctx = context.WithValue(ctx, middleware.RoleKey, role)
	return ctx
}

func setupTeamTest() (*mockStore, *TeamHandler) {
	store := newMockStore()
	handler := NewTeamHandler(store, &stubTokenManager{})

	store.CreateOrganization(context.Background(), &domain.Organization{Name: "Org", Slug: "org"})
	store.CreateUser(context.Background(), &domain.User{Email: "owner@test.com", Name: "Owner", PasswordHash: "x"})
	store.AddOrgMember(context.Background(), &domain.OrgMember{OrgID: "id-1", UserID: "id-2", Role: domain.RoleOwner})

	return store, handler
}

func TestTeamHandler_List(t *testing.T) {
	_, handler := setupTeamTest()

	req := httptest.NewRequest("GET", "/v1/members", nil)
	req = req.WithContext(teamCtx(req.Context(), "id-2", "id-1", "owner"))
	rr := httptest.NewRecorder()
	handler.List(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp struct {
		Data  []MemberResponse `json:"data"`
		Total int              `json:"total"`
	}
	json.NewDecoder(rr.Body).Decode(&resp)
	if len(resp.Data) != 1 {
		t.Fatalf("expected 1 member, got %d", len(resp.Data))
	}
	if resp.Data[0].Email != "owner@test.com" {
		t.Errorf("expected email owner@test.com, got %s", resp.Data[0].Email)
	}
}

func TestTeamHandler_Invite(t *testing.T) {
	_, handler := setupTeamTest()

	body, _ := json.Marshal(InviteRequest{Email: "dev@test.com", Role: domain.RoleDeveloper})
	req := httptest.NewRequest("POST", "/v1/members/invite", bytes.NewReader(body))
	req = req.WithContext(teamCtx(req.Context(), "id-2", "id-1", "owner"))
	rr := httptest.NewRecorder()
	handler.Invite(rr, req)

	if rr.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", rr.Code, rr.Body.String())
	}

	var resp MemberResponse
	json.NewDecoder(rr.Body).Decode(&resp)
	if resp.Email != "dev@test.com" {
		t.Errorf("expected dev@test.com, got %s", resp.Email)
	}
	if resp.Role != domain.RoleDeveloper {
		t.Errorf("expected developer, got %s", resp.Role)
	}
}

func TestTeamHandler_InviteDuplicate(t *testing.T) {
	_, handler := setupTeamTest()

	body, _ := json.Marshal(InviteRequest{Email: "owner@test.com", Role: domain.RoleDeveloper})
	req := httptest.NewRequest("POST", "/v1/members/invite", bytes.NewReader(body))
	req = req.WithContext(teamCtx(req.Context(), "id-2", "id-1", "owner"))
	rr := httptest.NewRecorder()
	handler.Invite(rr, req)

	if rr.Code != http.StatusConflict {
		t.Fatalf("expected 409, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestTeamHandler_UpdateRole(t *testing.T) {
	store, handler := setupTeamTest()

	store.CreateUser(context.Background(), &domain.User{Email: "dev@test.com", Name: "Dev", PasswordHash: "x"})
	store.AddOrgMember(context.Background(), &domain.OrgMember{OrgID: "id-1", UserID: "id-4", Role: domain.RoleDeveloper})

	body, _ := json.Marshal(UpdateRoleRequest{Role: domain.RoleAdmin})
	req := httptest.NewRequest("PUT", "/v1/members/id-5", bytes.NewReader(body))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("memberID", "id-5")
	req = req.WithContext(context.WithValue(teamCtx(req.Context(), "id-2", "id-1", "owner"), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()
	handler.UpdateRole(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", rr.Code, rr.Body.String())
	}

	updated, _ := store.GetOrgMemberByID(context.Background(), "id-5")
	if updated.Role != domain.RoleAdmin {
		t.Errorf("expected admin, got %s", updated.Role)
	}
}

func TestTeamHandler_Remove(t *testing.T) {
	store, handler := setupTeamTest()

	store.CreateUser(context.Background(), &domain.User{Email: "dev@test.com", Name: "Dev", PasswordHash: "x"})
	store.AddOrgMember(context.Background(), &domain.OrgMember{OrgID: "id-1", UserID: "id-4", Role: domain.RoleDeveloper})

	req := httptest.NewRequest("DELETE", "/v1/members/id-5", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("memberID", "id-5")
	req = req.WithContext(context.WithValue(teamCtx(req.Context(), "id-2", "id-1", "owner"), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()
	handler.Remove(rr, req)

	if rr.Code != http.StatusNoContent {
		t.Fatalf("expected 204, got %d: %s", rr.Code, rr.Body.String())
	}

	members, _ := store.ListOrgMembers(context.Background(), "id-1")
	if len(members) != 1 {
		t.Errorf("expected 1 member remaining, got %d", len(members))
	}
}

func TestTeamHandler_RemoveSelfForbidden(t *testing.T) {
	_, handler := setupTeamTest()

	req := httptest.NewRequest("DELETE", "/v1/members/id-3", nil)
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("memberID", "id-3")
	req = req.WithContext(context.WithValue(teamCtx(req.Context(), "id-2", "id-1", "owner"), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()
	handler.Remove(rr, req)

	if rr.Code != http.StatusBadRequest {
		t.Fatalf("expected 400, got %d: %s", rr.Code, rr.Body.String())
	}
}

func TestTeamHandler_Permissions(t *testing.T) {
	store, handler := setupTeamTest()

	store.CreateEnvironment(context.Background(), &domain.Environment{ProjectID: "p1", Name: "Dev", Slug: "dev"})

	permsBody, _ := json.Marshal(UpdatePermissionsRequest{
		Permissions: []domain.EnvPermission{
			{EnvID: "id-6", CanToggle: true, CanEditRules: false},
		},
	})
	req := httptest.NewRequest("PUT", "/v1/members/id-3/permissions", bytes.NewReader(permsBody))
	rctx := chi.NewRouteContext()
	rctx.URLParams.Add("memberID", "id-3")
	req = req.WithContext(context.WithValue(teamCtx(req.Context(), "id-2", "id-1", "owner"), chi.RouteCtxKey, rctx))
	rr := httptest.NewRecorder()
	handler.UpdatePermissions(rr, req)

	if rr.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", rr.Code, rr.Body.String())
	}

	// List permissions
	req2 := httptest.NewRequest("GET", "/v1/members/id-3/permissions", nil)
	rctx2 := chi.NewRouteContext()
	rctx2.URLParams.Add("memberID", "id-3")
	req2 = req2.WithContext(context.WithValue(teamCtx(req2.Context(), "id-2", "id-1", "owner"), chi.RouteCtxKey, rctx2))
	rr2 := httptest.NewRecorder()
	handler.ListPermissions(rr2, req2)

	var perms []domain.EnvPermission
	json.NewDecoder(rr2.Body).Decode(&perms)
	if len(perms) != 1 {
		t.Fatalf("expected 1 perm, got %d", len(perms))
	}
	if !perms[0].CanToggle {
		t.Error("expected can_toggle=true")
	}
}
