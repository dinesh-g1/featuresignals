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

	body := `{"key":"beta-users","name":"Beta Users","description":"Users in beta program","match_type":"all","rules":[{"attribute":"plan","operator":"eq","value":"beta"}]}`
	r := httptest.NewRequest("POST", "/v1/projects/proj-1/segments", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": "proj-1"})
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

	body := `{"key":"vip","name":"VIP Users"}`
	r := httptest.NewRequest("POST", "/v1/projects/proj-1/segments", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": "proj-1"})
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
			r := httptest.NewRequest("POST", "/v1/projects/proj-1/segments", strings.NewReader(tt.body))
			r = requestWithChi(r, map[string]string{"projectID": "proj-1"})
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

	body := `{"key":"dup-seg","name":"Dup"}`
	r1 := httptest.NewRequest("POST", "/v1/projects/proj-1/segments", strings.NewReader(body))
	r1 = requestWithChi(r1, map[string]string{"projectID": "proj-1"})
	w1 := httptest.NewRecorder()
	h.Create(w1, r1)

	r2 := httptest.NewRequest("POST", "/v1/projects/proj-1/segments", strings.NewReader(body))
	r2 = requestWithChi(r2, map[string]string{"projectID": "proj-1"})
	w2 := httptest.NewRecorder()
	h.Create(w2, r2)

	if w2.Code != http.StatusConflict {
		t.Errorf("expected 409, got %d", w2.Code)
	}
}

func TestSegmentHandler_List(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)

	store.CreateSegment(context.Background(), &domain.Segment{ProjectID: "proj-1", Key: "seg-1", Name: "Seg 1"})
	store.CreateSegment(context.Background(), &domain.Segment{ProjectID: "proj-1", Key: "seg-2", Name: "Seg 2"})

	r := httptest.NewRequest("GET", "/v1/projects/proj-1/segments", nil)
	r = requestWithChi(r, map[string]string{"projectID": "proj-1"})
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var segments []domain.Segment
	json.Unmarshal(w.Body.Bytes(), &segments)

	if len(segments) != 2 {
		t.Errorf("expected 2 segments, got %d", len(segments))
	}
}

func TestSegmentHandler_List_Empty(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)

	r := httptest.NewRequest("GET", "/v1/projects/proj-1/segments", nil)
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

func TestSegmentHandler_Get(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)

	store.CreateSegment(context.Background(), &domain.Segment{ProjectID: "proj-1", Key: "my-seg", Name: "My Segment"})

	r := httptest.NewRequest("GET", "/v1/projects/proj-1/segments/my-seg", nil)
	r = requestWithChi(r, map[string]string{"projectID": "proj-1", "segmentKey": "my-seg"})
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

	r := httptest.NewRequest("GET", "/v1/projects/proj-1/segments/nonexistent", nil)
	r = requestWithChi(r, map[string]string{"projectID": "proj-1", "segmentKey": "nonexistent"})
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}

func TestSegmentHandler_Delete(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)

	store.CreateSegment(context.Background(), &domain.Segment{ProjectID: "proj-1", Key: "del-seg", Name: "Delete Me"})

	r := httptest.NewRequest("DELETE", "/v1/projects/proj-1/segments/del-seg", nil)
	r = requestWithChi(r, map[string]string{"projectID": "proj-1", "segmentKey": "del-seg"})
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

func TestSegmentHandler_Delete_NotFound(t *testing.T) {
	store := newMockStore()
	h := NewSegmentHandler(store)

	r := httptest.NewRequest("DELETE", "/v1/projects/proj-1/segments/nonexistent", nil)
	r = requestWithChi(r, map[string]string{"projectID": "proj-1", "segmentKey": "nonexistent"})
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404, got %d", w.Code)
	}
}
