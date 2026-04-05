package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func TestProjectHandler_Create(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	body := `{"name":"My Project","slug":"my-project"}`
	r := httptest.NewRequest("POST", "/v1/projects", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var project struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		Slug string `json:"slug"`
	}
	json.Unmarshal(w.Body.Bytes(), &project)

	if project.Name != "My Project" {
		t.Errorf("expected 'My Project', got '%s'", project.Name)
	}
	if project.Slug != "my-project" {
		t.Errorf("expected 'my-project', got '%s'", project.Slug)
	}
	if project.ID == "" {
		t.Error("expected non-empty project ID")
	}
}

func TestProjectHandler_Create_MissingName(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	body := `{"name":"","slug":"test"}`
	r := httptest.NewRequest("POST", "/v1/projects", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestProjectHandler_Create_AutoSlug(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	body := `{"name":"My Cool Project"}`
	r := httptest.NewRequest("POST", "/v1/projects", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var project domain.Project
	json.Unmarshal(w.Body.Bytes(), &project)

	if project.Slug == "" {
		t.Error("expected auto-generated slug, got empty")
	}
}

func TestProjectHandler_List(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	store.CreateProject(context.Background(), &domain.Project{OrgID: "org-1", Name: "P1", Slug: "p1"})
	store.CreateProject(context.Background(), &domain.Project{OrgID: "org-1", Name: "P2", Slug: "p2"})
	store.CreateProject(context.Background(), &domain.Project{OrgID: "org-2", Name: "Other", Slug: "other"})

	r := httptest.NewRequest("GET", "/v1/projects", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Data  []domain.Project `json:"data"`
		Total int              `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if len(resp.Data) != 2 {
		t.Errorf("expected 2 projects, got %d", len(resp.Data))
	}
}

func TestProjectHandler_List_Empty(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	r := httptest.NewRequest("GET", "/v1/projects", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Data  []json.RawMessage `json:"data"`
		Total int               `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) != 0 {
		t.Errorf("expected 0 items, got %d", len(resp.Data))
	}
}

func TestProjectHandler_Get(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	p := &domain.Project{OrgID: "org-1", Name: "Test", Slug: "test"}
	store.CreateProject(context.Background(), p)

	r := httptest.NewRequest("GET", "/v1/projects/"+p.ID, nil)
	r = requestWithChi(r, map[string]string{"projectID": p.ID})
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var project domain.Project
	json.Unmarshal(w.Body.Bytes(), &project)

	if project.Name != "Test" {
		t.Errorf("expected 'Test', got '%s'", project.Name)
	}
}

func TestProjectHandler_Get_NotFound(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	r := httptest.NewRequest("GET", "/v1/projects/nonexistent", nil)
	r = requestWithChi(r, map[string]string{"projectID": "nonexistent"})
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestProjectHandler_Get_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	p := &domain.Project{OrgID: "org-1", Name: "Secret", Slug: "secret"}
	store.CreateProject(context.Background(), p)

	r := httptest.NewRequest("GET", "/v1/projects/"+p.ID, nil)
	r = requestWithChi(r, map[string]string{"projectID": p.ID})
	r = requestWithAuth(r, "attacker", "org-2", "admin")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-org access, got %d", w.Code)
	}
}

func TestProjectHandler_Delete(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	p := &domain.Project{OrgID: "org-1", Name: "Del", Slug: "del"}
	store.CreateProject(context.Background(), p)

	r := httptest.NewRequest("DELETE", "/v1/projects/"+p.ID, nil)
	r = requestWithChi(r, map[string]string{"projectID": p.ID})
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

func TestProjectHandler_Delete_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	p := &domain.Project{OrgID: "org-1", Name: "Other", Slug: "other"}
	store.CreateProject(context.Background(), p)

	r := httptest.NewRequest("DELETE", "/v1/projects/"+p.ID, nil)
	r = requestWithChi(r, map[string]string{"projectID": p.ID})
	r = requestWithAuth(r, "attacker", "org-2", "admin")
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-org delete, got %d", w.Code)
	}
}

// --- Environment Handler Tests ---

func TestEnvironmentHandler_Create(t *testing.T) {
	store := newMockStore()
	h := NewEnvironmentHandler(store)

	projID := setupTestProject(store, "org-1")

	body := `{"name":"Production","slug":"production","color":"#EF4444"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/environments", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var env domain.Environment
	json.Unmarshal(w.Body.Bytes(), &env)

	if env.Name != "Production" {
		t.Errorf("expected 'Production', got '%s'", env.Name)
	}
	if env.Color != "#EF4444" {
		t.Errorf("expected '#EF4444', got '%s'", env.Color)
	}
}

func TestEnvironmentHandler_Create_DefaultColor(t *testing.T) {
	store := newMockStore()
	h := NewEnvironmentHandler(store)

	projID := setupTestProject(store, "org-1")

	body := `{"name":"Staging"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/environments", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}

	var env domain.Environment
	json.Unmarshal(w.Body.Bytes(), &env)

	if env.Color != "#6B7280" {
		t.Errorf("expected default color '#6B7280', got '%s'", env.Color)
	}
}

func TestEnvironmentHandler_Create_MissingName(t *testing.T) {
	store := newMockStore()
	h := NewEnvironmentHandler(store)

	projID := setupTestProject(store, "org-1")

	body := `{"name":""}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/environments", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestEnvironmentHandler_Create_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewEnvironmentHandler(store)

	projID := setupTestProject(store, "org-1")

	body := `{"name":"Hacked"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/environments", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "attacker", "org-2", "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-org env create, got %d", w.Code)
	}
}

func TestEnvironmentHandler_List(t *testing.T) {
	store := newMockStore()
	h := NewEnvironmentHandler(store)

	projID := setupTestProject(store, "org-1")
	store.CreateEnvironment(context.Background(), &domain.Environment{ProjectID: projID, Name: "Dev", Slug: "dev"})
	store.CreateEnvironment(context.Background(), &domain.Environment{ProjectID: projID, Name: "Prod", Slug: "prod"})

	r := httptest.NewRequest("GET", "/v1/projects/"+projID+"/environments", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Data  []domain.Environment `json:"data"`
		Total int                  `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if len(resp.Data) != 2 {
		t.Errorf("expected 2 environments, got %d", len(resp.Data))
	}
}

func TestEnvironmentHandler_List_Empty(t *testing.T) {
	store := newMockStore()
	h := NewEnvironmentHandler(store)

	projID := setupTestProject(store, "org-1")

	r := httptest.NewRequest("GET", "/v1/projects/"+projID+"/environments", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Data  []json.RawMessage `json:"data"`
		Total int               `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) != 0 {
		t.Errorf("expected 0 items, got %d", len(resp.Data))
	}
}

func TestEnvironmentHandler_Delete(t *testing.T) {
	store := newMockStore()
	h := NewEnvironmentHandler(store)

	projID := setupTestProject(store, "org-1")
	env := &domain.Environment{ProjectID: projID, Name: "Del", Slug: "del"}
	store.CreateEnvironment(context.Background(), env)

	r := httptest.NewRequest("DELETE", "/v1/projects/"+projID+"/environments/"+env.ID, nil)
	r = requestWithChi(r, map[string]string{"projectID": projID, "envID": env.ID})
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}
