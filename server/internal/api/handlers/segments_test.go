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

func TestSegmentHandler_Create(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	body := `{"key":"beta-users","name":"Beta Users","description":"Users in beta program","match_type":"all","rules":[{"attribute":"plan","operator":"eq","values":["beta"]}]}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/segments", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var seg domain.Segment
	json.Unmarshal(w.Body.Bytes(), &seg)

	if seg.Key != "beta-users" {
		t.Errorf("expected key 'beta-users', got '%s'", seg.Key)
	}
	if seg.MatchType != domain.MatchAll {
		t.Errorf("expected match_type 'all', got '%s'", seg.MatchType)
	}
	if len(seg.Rules) != 1 {
		t.Errorf("expected 1 rule, got %d", len(seg.Rules))
	}
}

func TestSegmentHandler_Create_DefaultMatchType(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	body := `{"key":"vip","name":"VIP Users"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/segments", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}

	var seg domain.Segment
	json.Unmarshal(w.Body.Bytes(), &seg)

	if seg.MatchType != domain.MatchAll {
		t.Errorf("expected default match_type 'all', got '%s'", seg.MatchType)
	}
}

func TestSegmentHandler_Create_MissingFields(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	tests := []struct {
		name string
		body string
	}{
		{"missing key", `{"key":"","name":"Test"}`},
		{"missing name", `{"key":"test","name":""}`},
		{"both missing", `{"key":"","name":""}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/segments", strings.NewReader(tt.body))
			r = requestWithChi(r, map[string]string{"projectID": projID})
			r = requestWithAuth(r, "user-1", testOrgID, "admin")
			w := httptest.NewRecorder()

			h.Create(w, r)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", w.Code)
			}
		})
	}
}

func TestSegmentHandler_Create_DuplicateKey(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	body := `{"key":"dup-seg","name":"Dup"}`
	r1 := httptest.NewRequest("POST", "/v1/projects/"+projID+"/segments", strings.NewReader(body))
	r1 = requestWithChi(r1, map[string]string{"projectID": projID})
	r1 = requestWithAuth(r1, "user-1", testOrgID, "admin")
	w1 := httptest.NewRecorder()
	h.Create(w1, r1)

	r2 := httptest.NewRequest("POST", "/v1/projects/"+projID+"/segments", strings.NewReader(body))
	r2 = requestWithChi(r2, map[string]string{"projectID": projID})
	r2 = requestWithAuth(r2, "user-1", testOrgID, "admin")
	w2 := httptest.NewRecorder()
	h.Create(w2, r2)

	if w2.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w2.Code)
	}
}

func TestSegmentHandler_Create_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	body := `{"key":"hack-seg","name":"Hack Segment"}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/segments", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "attacker", "org-2", "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-org segment create, got %d", w.Code)
	}
}

func TestSegmentHandler_List(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateSegment(context.Background(), &domain.Segment{ProjectID: projID, Key: "seg-1", Name: "Seg 1"})
	store.CreateSegment(context.Background(), &domain.Segment{ProjectID: projID, Key: "seg-2", Name: "Seg 2"})

	r := httptest.NewRequest("GET", "/v1/projects/"+projID+"/segments", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Data  []domain.Segment `json:"data"`
		Total int              `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if len(resp.Data) != 2 {
		t.Errorf("expected 2 segments, got %d", len(resp.Data))
	}
}

func TestSegmentHandler_List_Empty(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	r := httptest.NewRequest("GET", "/v1/projects/"+projID+"/segments", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID})
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

func TestSegmentHandler_Get(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateSegment(context.Background(), &domain.Segment{ProjectID: projID, Key: "my-seg", Name: "My Segment"})

	r := httptest.NewRequest("GET", "/v1/projects/"+projID+"/segments/my-seg", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID, "segmentKey": "my-seg"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var seg domain.Segment
	json.Unmarshal(w.Body.Bytes(), &seg)

	if seg.Name != "My Segment" {
		t.Errorf("expected 'My Segment', got '%s'", seg.Name)
	}
}

func TestSegmentHandler_Get_NotFound(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	r := httptest.NewRequest("GET", "/v1/projects/"+projID+"/segments/nonexistent", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID, "segmentKey": "nonexistent"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestSegmentHandler_Update(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateSegment(context.Background(), &domain.Segment{
		ProjectID: projID, Key: "upd-seg", Name: "Original", MatchType: domain.MatchAll,
	})

	body := `{"name":"Updated Name","match_type":"any","rules":[{"attribute":"plan","operator":"eq","values":["pro"]}]}`
	r := httptest.NewRequest("PUT", "/v1/projects/"+projID+"/segments/upd-seg", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID, "segmentKey": "upd-seg"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Update(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var seg domain.Segment
	json.Unmarshal(w.Body.Bytes(), &seg)

	if seg.Name != "Updated Name" {
		t.Errorf("expected name 'Updated Name', got '%s'", seg.Name)
	}
	if seg.MatchType != domain.MatchAny {
		t.Errorf("expected match_type 'any', got '%s'", seg.MatchType)
	}
	if len(seg.Rules) != 1 {
		t.Errorf("expected 1 rule, got %d", len(seg.Rules))
	}
}

func TestSegmentHandler_Update_NotFound(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	body := `{"name":"Updated"}`
	r := httptest.NewRequest("PUT", "/v1/projects/"+projID+"/segments/nonexistent", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID, "segmentKey": "nonexistent"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Update(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestSegmentHandler_Update_PartialFields(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateSegment(context.Background(), &domain.Segment{
		ProjectID: projID, Key: "partial-seg", Name: "Original", Description: "Original Desc", MatchType: domain.MatchAll,
	})

	body := `{"description":"Updated Desc"}`
	r := httptest.NewRequest("PUT", "/v1/projects/"+projID+"/segments/partial-seg", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID, "segmentKey": "partial-seg"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Update(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var seg domain.Segment
	json.Unmarshal(w.Body.Bytes(), &seg)

	if seg.Name != "Original" {
		t.Errorf("name should be unchanged, got '%s'", seg.Name)
	}
	if seg.Description != "Updated Desc" {
		t.Errorf("expected description 'Updated Desc', got '%s'", seg.Description)
	}
}

func TestSegmentHandler_Delete(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	store.CreateSegment(context.Background(), &domain.Segment{ProjectID: projID, Key: "del-seg", Name: "Delete Me"})

	r := httptest.NewRequest("DELETE", "/v1/projects/"+projID+"/segments/del-seg", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID, "segmentKey": "del-seg"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

func TestSegmentHandler_Delete_NotFound(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)
	projID := setupTestProject(store, testOrgID)

	r := httptest.NewRequest("DELETE", "/v1/projects/"+projID+"/segments/nonexistent", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID, "segmentKey": "nonexistent"})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}
