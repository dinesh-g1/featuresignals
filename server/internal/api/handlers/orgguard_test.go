package handlers

import (
	"context"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func TestVerifyProjectOwnership_MatchingOrg(t *testing.T) {
	store := newMockStore()
	projID := setupTestProject(store, testOrgID)

	r := httptest.NewRequest("GET", "/", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	project, ok := verifyProjectOwnership(store, r, w)
	if !ok {
		t.Fatalf("expected ownership verification to pass, got %d", w.Code)
	}
	if project.ID != projID {
		t.Errorf("expected project ID '%s', got '%s'", projID, project.ID)
	}
}

func TestVerifyProjectOwnership_DifferentOrg(t *testing.T) {
	store := newMockStore()
	projID := setupTestProject(store, testOrgID)

	r := httptest.NewRequest("GET", "/", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", "org-other", "admin")
	w := httptest.NewRecorder()

	_, ok := verifyProjectOwnership(store, r, w)
	if ok {
		t.Error("expected ownership verification to fail for different org")
	}
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestVerifyProjectOwnership_MissingProject(t *testing.T) {
	store := newMockStore()

	r := httptest.NewRequest("GET", "/", nil)
	r = requestWithChi(r, map[string]string{"projectID": "nonexistent"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	_, ok := verifyProjectOwnership(store, r, w)
	if ok {
		t.Error("expected ownership verification to fail for missing project")
	}
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestVerifyProjectOwnership_EmptyProjectID(t *testing.T) {
	store := newMockStore()

	r := httptest.NewRequest("GET", "/", nil)
	r = requestWithChi(r, map[string]string{"projectID": ""})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	_, ok := verifyProjectOwnership(store, r, w)
	if ok {
		t.Error("expected ownership verification to fail for empty project ID")
	}
	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestVerifyEnvironmentOwnership_MatchingOrg(t *testing.T) {
	store := newMockStore()
	_, envID := setupTestEnv(store, testOrgID)

	r := httptest.NewRequest("GET", "/", nil)
	r = requestWithChi(r, map[string]string{"envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	env, ok := verifyEnvironmentOwnership(store, r, w)
	if !ok {
		t.Fatalf("expected ownership verification to pass, got %d", w.Code)
	}
	if env.ID != envID {
		t.Errorf("expected env ID '%s', got '%s'", envID, env.ID)
	}
}

func TestVerifyEnvironmentOwnership_DifferentOrg(t *testing.T) {
	store := newMockStore()
	_, envID := setupTestEnv(store, testOrgID)

	r := httptest.NewRequest("GET", "/", nil)
	r = requestWithChi(r, map[string]string{"envID": envID})
	r = requestWithAuth(r, "user-1", "org-other", "admin")
	w := httptest.NewRecorder()

	_, ok := verifyEnvironmentOwnership(store, r, w)
	if ok {
		t.Error("expected ownership verification to fail for different org")
	}
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestVerifyEnvironmentOwnership_MissingEnv(t *testing.T) {
	store := newMockStore()

	r := httptest.NewRequest("GET", "/", nil)
	r = requestWithChi(r, map[string]string{"envID": "nonexistent"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	_, ok := verifyEnvironmentOwnership(store, r, w)
	if ok {
		t.Error("expected ownership verification to fail")
	}
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestVerifyWebhookOwnership_MatchingOrg(t *testing.T) {
	store := newMockStore()
	store.CreateWebhook(context.Background(), &domain.Webhook{
		OrgID: testOrgID, Name: "Hook", URL: "https://a.com", Events: []string{"flag.updated"}, Enabled: true,
	})
	webhooks, _ := store.ListWebhooks(context.Background(), testOrgID, 0, 0)
	whID := webhooks[0].ID

	r := httptest.NewRequest("GET", "/", nil)
	r = requestWithChi(r, map[string]string{"webhookID": whID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	wh, ok := verifyWebhookOwnership(store, r, w)
	if !ok {
		t.Fatalf("expected ownership to pass, got %d", w.Code)
	}
	if wh.ID != whID {
		t.Errorf("expected webhook ID '%s', got '%s'", whID, wh.ID)
	}
}

func TestVerifyWebhookOwnership_DifferentOrg(t *testing.T) {
	store := newMockStore()
	store.CreateWebhook(context.Background(), &domain.Webhook{
		OrgID: testOrgID, Name: "Hook", URL: "https://a.com", Events: []string{"flag.updated"}, Enabled: true,
	})
	webhooks, _ := store.ListWebhooks(context.Background(), testOrgID, 0, 0)
	whID := webhooks[0].ID

	r := httptest.NewRequest("GET", "/", nil)
	r = requestWithChi(r, map[string]string{"webhookID": whID})
	r = requestWithAuth(r, "user-1", "org-other", "admin")
	w := httptest.NewRecorder()

	_, ok := verifyWebhookOwnership(store, r, w)
	if ok {
		t.Error("expected ownership to fail for different org")
	}
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestVerifyApprovalOwnership_MatchingOrg(t *testing.T) {
	store := newMockStore()
	store.CreateApprovalRequest(context.Background(), &domain.ApprovalRequest{
		OrgID: testOrgID, RequestorID: "user-1", FlagID: "f1", EnvID: "e1",
		ChangeType: "toggle", Status: domain.ApprovalPending,
	})
	list, _ := store.ListApprovalRequests(context.Background(), testOrgID, "", 10, 0)
	arID := list[0].ID

	r := httptest.NewRequest("GET", "/", nil)
	r = requestWithChi(r, map[string]string{"approvalID": arID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	ar, ok := verifyApprovalOwnership(store, r, w)
	if !ok {
		t.Fatalf("expected ownership to pass, got %d", w.Code)
	}
	if ar.ID != arID {
		t.Errorf("expected approval ID '%s', got '%s'", arID, ar.ID)
	}
}

func TestVerifyApprovalOwnership_DifferentOrg(t *testing.T) {
	store := newMockStore()
	store.CreateApprovalRequest(context.Background(), &domain.ApprovalRequest{
		OrgID: testOrgID, RequestorID: "user-1", FlagID: "f1", EnvID: "e1",
		ChangeType: "toggle", Status: domain.ApprovalPending,
	})
	list, _ := store.ListApprovalRequests(context.Background(), testOrgID, "", 10, 0)
	arID := list[0].ID

	r := httptest.NewRequest("GET", "/", nil)
	r = requestWithChi(r, map[string]string{"approvalID": arID})
	r = requestWithAuth(r, "attacker", "org-other", "admin")
	w := httptest.NewRecorder()

	_, ok := verifyApprovalOwnership(store, r, w)
	if ok {
		t.Error("expected ownership to fail for different org")
	}
	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}
