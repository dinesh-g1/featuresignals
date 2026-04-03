package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
)

func requestWithChi(r *http.Request, params map[string]string) *http.Request {
	rctx := chi.NewRouteContext()
	for k, v := range params {
		rctx.URLParams.Add(k, v)
	}
	return r.WithContext(context.WithValue(r.Context(), chi.RouteCtxKey, rctx))
}

func requestWithAuth(r *http.Request, userID, orgID, role string) *http.Request {
	ctx := context.WithValue(r.Context(), middleware.UserIDKey, userID)
	ctx = context.WithValue(ctx, middleware.OrgIDKey, orgID)
	ctx = context.WithValue(ctx, middleware.RoleKey, role)
	return r.WithContext(ctx)
}

const testOrgID = "org-1"

func TestFlagHandler_Create(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	body := `{"key":"new-feature","name":"New Feature","flag_type":"boolean"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/flags", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var flag domain.Flag
	json.Unmarshal(w.Body.Bytes(), &flag)

	if flag.Key != "new-feature" {
		t.Errorf("expected key 'new-feature', got '%s'", flag.Key)
	}
	if flag.FlagType != domain.FlagTypeBoolean {
		t.Errorf("expected boolean flag type, got '%s'", flag.FlagType)
	}
}

func TestFlagHandler_Create_DefaultType(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	body := `{"key":"test","name":"Test"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/flags", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var flag domain.Flag
	json.Unmarshal(w.Body.Bytes(), &flag)

	if flag.FlagType != domain.FlagTypeBoolean {
		t.Errorf("expected default boolean type, got '%s'", flag.FlagType)
	}
}

func TestFlagHandler_Create_MissingFields(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	body := `{"key":"","name":""}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/flags", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestFlagHandler_Create_DuplicateKey(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	body := `{"key":"dup-flag","name":"Dup Flag"}`
	r1 := httptest.NewRequest("POST", "/v1/projects/"+projID+"/flags", strings.NewReader(body))
	r1 = requestWithChi(r1, map[string]string{"projectID": projID})
	r1 = requestWithAuth(r1, "user-1", testOrgID, "admin")
	w1 := httptest.NewRecorder()
	h.Create(w1, r1)

	r2 := httptest.NewRequest("POST", "/v1/projects/"+projID+"/flags", strings.NewReader(body))
	r2 = requestWithChi(r2, map[string]string{"projectID": projID})
	r2 = requestWithAuth(r2, "user-1", testOrgID, "admin")
	w2 := httptest.NewRecorder()
	h.Create(w2, r2)

	if w2.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w2.Code)
	}
}

func TestFlagHandler_Create_InvalidFlagType(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	body := `{"key":"bad-type","name":"Bad Type","flag_type":"invalid"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/flags", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for invalid flag_type, got %d", w.Code)
	}
}

func TestFlagHandler_Create_InvalidKey(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	body := `{"key":"UPPER-CASE","name":"Bad Key"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/flags", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400 for uppercase key, got %d", w.Code)
	}
}

func TestFlagHandler_Create_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	body := `{"key":"hack-flag","name":"Hack Flag"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/flags", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "attacker", "org-2", "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-org flag create, got %d", w.Code)
	}
}

func TestFlagHandler_List(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateFlag(context.Background(), &domain.Flag{ProjectID: projID, Key: "flag-1", Name: "Flag 1"})
	store.CreateFlag(context.Background(), &domain.Flag{ProjectID: projID, Key: "flag-2", Name: "Flag 2"})

	r := httptest.NewRequest("GET", "/v1/projects/"+projID+"/flags", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var flags []domain.Flag
	json.Unmarshal(w.Body.Bytes(), &flags)

	if len(flags) != 2 {
		t.Errorf("expected 2 flags, got %d", len(flags))
	}
}

func TestFlagHandler_List_Empty(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	r := httptest.NewRequest("GET", "/v1/projects/"+projID+"/flags", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	body := strings.TrimSpace(w.Body.String())
	if body != "[]" {
		t.Errorf("expected empty JSON array, got %s", body)
	}
}

func TestFlagHandler_Get(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateFlag(context.Background(), &domain.Flag{ProjectID: projID, Key: "my-flag", Name: "My Flag"})

	r := httptest.NewRequest("GET", "/v1/projects/"+projID+"/flags/my-flag", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID, "flagKey": "my-flag"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestFlagHandler_Get_NotFound(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	r := httptest.NewRequest("GET", "/v1/projects/"+projID+"/flags/nonexistent", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID, "flagKey": "nonexistent"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestFlagHandler_Update(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateFlag(context.Background(), &domain.Flag{ProjectID: projID, Key: "upd-flag", Name: "Original"})

	body := `{"name":"Updated Name","description":"New description"}`
	r := httptest.NewRequest("PUT", "/v1/projects/"+projID+"/flags/upd-flag", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID, "flagKey": "upd-flag"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Update(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var flag domain.Flag
	json.Unmarshal(w.Body.Bytes(), &flag)

	if flag.Name != "Updated Name" {
		t.Errorf("expected 'Updated Name', got '%s'", flag.Name)
	}
}

func TestFlagHandler_Delete(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateFlag(context.Background(), &domain.Flag{ProjectID: projID, Key: "del-flag", Name: "Delete Me"})

	r := httptest.NewRequest("DELETE", "/v1/projects/"+projID+"/flags/del-flag", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID, "flagKey": "del-flag"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

func TestFlagHandler_UpdateState(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateFlag(context.Background(), &domain.Flag{ProjectID: projID, Key: "state-flag", Name: "State Flag"})

	body := `{"enabled":true,"percentage_rollout":5000}`
	r := httptest.NewRequest("PUT", "/v1/projects/"+projID+"/flags/state-flag/environments/env-1", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID, "flagKey": "state-flag", "envID": "env-1"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.UpdateState(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var state domain.FlagState
	json.Unmarshal(w.Body.Bytes(), &state)

	if !state.Enabled {
		t.Error("expected enabled=true")
	}
	if state.PercentageRollout != 5000 {
		t.Errorf("expected rollout 5000, got %d", state.PercentageRollout)
	}
}

func TestFlagHandler_GetState(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	flag := &domain.Flag{ProjectID: projID, Key: "gs-flag", Name: "Get State"}
	store.CreateFlag(context.Background(), flag)

	r := httptest.NewRequest("GET", "/v1/projects/"+projID+"/flags/gs-flag/environments/env-1", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID, "flagKey": "gs-flag", "envID": "env-1"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.GetState(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var state domain.FlagState
	json.Unmarshal(w.Body.Bytes(), &state)

	if state.Enabled {
		t.Error("expected disabled by default")
	}
}

func TestFlagHandler_Promote(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	flag := &domain.Flag{ProjectID: projID, Key: "promo-flag", Name: "Promo Flag"}
	store.CreateFlag(context.Background(), flag)

	store.UpsertFlagState(context.Background(), &domain.FlagState{
		FlagID:            flag.ID,
		EnvID:             "staging",
		Enabled:           true,
		DefaultValue:      json.RawMessage(`"variant-a"`),
		PercentageRollout: 5000,
	})

	body := `{"source_env_id":"staging","target_env_id":"production"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/flags/promo-flag/promote", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID, "flagKey": "promo-flag"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Promote(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var promoted domain.FlagState
	json.Unmarshal(w.Body.Bytes(), &promoted)

	if promoted.EnvID != "production" {
		t.Errorf("expected target env production, got %s", promoted.EnvID)
	}
	if !promoted.Enabled {
		t.Error("expected enabled=true in promoted state")
	}
	if promoted.PercentageRollout != 5000 {
		t.Errorf("expected rollout 5000, got %d", promoted.PercentageRollout)
	}

	if len(store.auditEntries) == 0 {
		t.Fatal("expected audit entry for promotion")
	}
	lastAudit := store.auditEntries[len(store.auditEntries)-1]
	if lastAudit.Action != "flag.promoted" {
		t.Errorf("expected audit action flag.promoted, got %s", lastAudit.Action)
	}
}

func TestFlagHandler_Promote_SameEnv(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateFlag(context.Background(), &domain.Flag{ProjectID: projID, Key: "f1", Name: "F1"})

	body := `{"source_env_id":"staging","target_env_id":"staging"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/flags/f1/promote", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID, "flagKey": "f1"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Promote(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestFlagHandler_Promote_MissingSource(t *testing.T) {
	store := newMockStore()
	h := NewFlagHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateFlag(context.Background(), &domain.Flag{ProjectID: projID, Key: "f2", Name: "F2"})

	body := `{"source_env_id":"nonexist","target_env_id":"production"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/flags/f2/promote", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID, "flagKey": "f2"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Promote(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}
