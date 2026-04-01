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

	var project domain.Project
	json.Unmarshal(w.Body.Bytes(), &project)

	if project.Name != "My Project" {
		t.Errorf("expected 'My Project', got '%s'", project.Name)
	}
	if project.Slug != "my-project" {
		t.Errorf("expected 'my-project', got '%s'", project.Slug)
	}
	if project.OrgID != "org-1" {
		t.Errorf("expected org 'org-1', got '%s'", project.OrgID)
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

	var projects []domain.Project
	json.Unmarshal(w.Body.Bytes(), &projects)

	if len(projects) != 2 {
		t.Errorf("expected 2 projects, got %d", len(projects))
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

	body := strings.TrimSpace(w.Body.String())
	if body != "[]" {
		t.Errorf("expected empty JSON array, got %s", body)
	}
}

func TestProjectHandler_Get(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	p := &domain.Project{OrgID: "org-1", Name: "Test", Slug: "test"}
	store.CreateProject(context.Background(), p)

	r := httptest.NewRequest("GET", "/v1/projects/"+p.ID, nil)
	r = requestWithChi(r, map[string]string{"projectID": p.ID})
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
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
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestProjectHandler_Delete(t *testing.T) {
	store := newMockStore()
	h := NewProjectHandler(store)

	p := &domain.Project{OrgID: "org-1", Name: "Del", Slug: "del"}
	store.CreateProject(context.Background(), p)

	r := httptest.NewRequest("DELETE", "/v1/projects/"+p.ID, nil)
	r = requestWithChi(r, map[string]string{"projectID": p.ID})
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

// --- Environment Handler Tests ---

func TestEnvironmentHandler_Create(t *testing.T) {
	store := newMockStore()
	h := NewEnvironmentHandler(store)

	body := `{"name":"Production","slug":"production","color":"#EF4444"}`
	r := httptest.NewRequest("POST", "/v1/projects/proj-1/environments", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": "proj-1"})
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

	body := `{"name":"Staging"}`
	r := httptest.NewRequest("POST", "/v1/projects/proj-1/environments", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": "proj-1"})
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

	body := `{"name":""}`
	r := httptest.NewRequest("POST", "/v1/projects/proj-1/environments", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": "proj-1"})
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestEnvironmentHandler_List(t *testing.T) {
	store := newMockStore()
	h := NewEnvironmentHandler(store)

	store.CreateEnvironment(context.Background(), &domain.Environment{ProjectID: "proj-1", Name: "Dev", Slug: "dev"})
	store.CreateEnvironment(context.Background(), &domain.Environment{ProjectID: "proj-1", Name: "Prod", Slug: "prod"})

	r := httptest.NewRequest("GET", "/v1/projects/proj-1/environments", nil)
	r = requestWithChi(r, map[string]string{"projectID": "proj-1"})
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var envs []domain.Environment
	json.Unmarshal(w.Body.Bytes(), &envs)

	if len(envs) != 2 {
		t.Errorf("expected 2 environments, got %d", len(envs))
	}
}

func TestEnvironmentHandler_List_Empty(t *testing.T) {
	store := newMockStore()
	h := NewEnvironmentHandler(store)

	r := httptest.NewRequest("GET", "/v1/projects/proj-1/environments", nil)
	r = requestWithChi(r, map[string]string{"projectID": "proj-1"})
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

func TestEnvironmentHandler_Delete(t *testing.T) {
	store := newMockStore()
	h := NewEnvironmentHandler(store)

	env := &domain.Environment{ProjectID: "proj-1", Name: "Del", Slug: "del"}
	store.CreateEnvironment(context.Background(), env)

	r := httptest.NewRequest("DELETE", "/v1/projects/proj-1/environments/"+env.ID, nil)
	r = requestWithChi(r, map[string]string{"projectID": "proj-1", "envID": env.ID})
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}
