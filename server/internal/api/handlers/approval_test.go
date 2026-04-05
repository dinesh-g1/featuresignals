package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/domain"
)

func TestApprovalHandler_Create(t *testing.T) {
	store := newMockStore()
	h := NewApprovalHandler(store)

	body := `{"flag_id":"flag-1","env_id":"env-1","change_type":"toggle","payload":{"enabled":true}}`
	r := httptest.NewRequest("POST", "/v1/approvals", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var ar dto.ApprovalResponse
	json.Unmarshal(w.Body.Bytes(), &ar)
	if ar.ID == "" {
		t.Error("expected approval request ID")
	}
	if ar.Status != domain.ApprovalPending {
		t.Errorf("expected status 'pending', got '%s'", ar.Status)
	}
}

func TestApprovalHandler_Create_MissingFields(t *testing.T) {
	store := newMockStore()
	h := NewApprovalHandler(store)

	body := `{"flag_id":"flag-1"}`
	r := httptest.NewRequest("POST", "/v1/approvals", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "developer")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestApprovalHandler_List(t *testing.T) {
	store := newMockStore()
	h := NewApprovalHandler(store)

	store.CreateApprovalRequest(nil, &domain.ApprovalRequest{
		OrgID: testOrgID, RequestorID: "user-1", FlagID: "f1", EnvID: "e1",
		ChangeType: "toggle", Status: domain.ApprovalPending,
	})

	r := httptest.NewRequest("GET", "/v1/approvals", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Data  []dto.ApprovalResponse `json:"data"`
		Total int                    `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) != 1 {
		t.Errorf("expected 1 result, got %d", len(resp.Data))
	}
}

func TestApprovalHandler_List_Empty(t *testing.T) {
	store := newMockStore()
	h := NewApprovalHandler(store)

	r := httptest.NewRequest("GET", "/v1/approvals", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
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

func TestApprovalHandler_Get(t *testing.T) {
	store := newMockStore()
	h := NewApprovalHandler(store)

	store.CreateApprovalRequest(nil, &domain.ApprovalRequest{
		OrgID: testOrgID, RequestorID: "user-1", FlagID: "f1", EnvID: "e1",
		ChangeType: "toggle", Status: domain.ApprovalPending,
	})
	list, _ := store.ListApprovalRequests(nil, testOrgID, "", 10, 0)
	arID := list[0].ID

	r := httptest.NewRequest("GET", "/v1/approvals/"+arID, nil)
	r = requestWithChi(r, map[string]string{"approvalID": arID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestApprovalHandler_Get_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewApprovalHandler(store)

	store.CreateApprovalRequest(nil, &domain.ApprovalRequest{
		OrgID: testOrgID, RequestorID: "user-1", FlagID: "f1", EnvID: "e1",
		ChangeType: "toggle", Status: domain.ApprovalPending,
	})
	list, _ := store.ListApprovalRequests(nil, testOrgID, "", 10, 0)
	arID := list[0].ID

	r := httptest.NewRequest("GET", "/v1/approvals/"+arID, nil)
	r = requestWithChi(r, map[string]string{"approvalID": arID})
	r = requestWithAuth(r, "attacker", "org-2", "admin")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-org approval get, got %d", w.Code)
	}
}

func TestApprovalHandler_Review_Approve(t *testing.T) {
	store := newMockStore()
	h := NewApprovalHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateApprovalRequest(nil, &domain.ApprovalRequest{
		OrgID: testOrgID, RequestorID: "user-1", FlagID: "flag-1", EnvID: "env-1",
		ChangeType: "toggle", Payload: json.RawMessage(`{"enabled":true}`),
		Status: domain.ApprovalPending,
	})
	_ = projID
	list, _ := store.ListApprovalRequests(nil, testOrgID, "", 10, 0)
	arID := list[0].ID

	body := `{"action":"approve","note":"looks good"}`
	r := httptest.NewRequest("POST", "/v1/approvals/"+arID+"/review", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"approvalID": arID})
	r = requestWithAuth(r, "reviewer-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Review(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var result dto.ApprovalResponse
	json.Unmarshal(w.Body.Bytes(), &result)
	if result.Status != domain.ApprovalApproved && result.Status != domain.ApprovalApplied {
		t.Errorf("expected status approved or applied, got '%s'", result.Status)
	}
}

func TestApprovalHandler_Review_Reject(t *testing.T) {
	store := newMockStore()
	h := NewApprovalHandler(store)

	store.CreateApprovalRequest(nil, &domain.ApprovalRequest{
		OrgID: testOrgID, RequestorID: "user-1", FlagID: "f1", EnvID: "e1",
		ChangeType: "toggle", Status: domain.ApprovalPending,
	})
	list, _ := store.ListApprovalRequests(nil, testOrgID, "", 10, 0)
	arID := list[0].ID

	body := `{"action":"reject","note":"not ready"}`
	r := httptest.NewRequest("POST", "/v1/approvals/"+arID+"/review", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"approvalID": arID})
	r = requestWithAuth(r, "reviewer-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Review(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var result dto.ApprovalResponse
	json.Unmarshal(w.Body.Bytes(), &result)
	if result.Status != domain.ApprovalRejected {
		t.Errorf("expected status 'rejected', got '%s'", result.Status)
	}
}

func TestApprovalHandler_Review_SelfReview(t *testing.T) {
	store := newMockStore()
	h := NewApprovalHandler(store)

	store.CreateApprovalRequest(nil, &domain.ApprovalRequest{
		OrgID: testOrgID, RequestorID: "user-1", FlagID: "f1", EnvID: "e1",
		ChangeType: "toggle", Status: domain.ApprovalPending,
	})
	list, _ := store.ListApprovalRequests(nil, testOrgID, "", 10, 0)
	arID := list[0].ID

	body := `{"action":"approve","note":"self approve"}`
	r := httptest.NewRequest("POST", "/v1/approvals/"+arID+"/review", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"approvalID": arID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Review(w, r)

	if w.Code != http.StatusForbidden {
		t.Errorf("expected 403 for self-review, got %d", w.Code)
	}
}

func TestApprovalHandler_Review_InvalidAction(t *testing.T) {
	store := newMockStore()
	h := NewApprovalHandler(store)

	store.CreateApprovalRequest(nil, &domain.ApprovalRequest{
		OrgID: testOrgID, RequestorID: "user-1", FlagID: "f1", EnvID: "e1",
		ChangeType: "toggle", Status: domain.ApprovalPending,
	})
	list, _ := store.ListApprovalRequests(nil, testOrgID, "", 10, 0)
	arID := list[0].ID

	body := `{"action":"maybe","note":"idk"}`
	r := httptest.NewRequest("POST", "/v1/approvals/"+arID+"/review", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"approvalID": arID})
	r = requestWithAuth(r, "reviewer-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Review(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
