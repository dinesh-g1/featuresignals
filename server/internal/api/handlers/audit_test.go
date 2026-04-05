package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/featuresignals/server/internal/domain"
)

func TestAuditHandler_List(t *testing.T) {
	store := newMockStore()
	h := NewAuditHandler(store)

	// Create audit entries
	for i := 0; i < 5; i++ {
		store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
			OrgID:        "org-1",
			ActorType:    "user",
			Action:       "flag.created",
			ResourceType: "flag",
		})
	}

	r := httptest.NewRequest("GET", "/v1/audit", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Data  []domain.AuditEntry `json:"data"`
		Total int                 `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if len(resp.Data) != 5 {
		t.Errorf("expected 5 entries, got %d", len(resp.Data))
	}
}

func TestAuditHandler_List_WithPagination(t *testing.T) {
	store := newMockStore()
	h := NewAuditHandler(store)

	for i := 0; i < 10; i++ {
		store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
			OrgID:        "org-1",
			ActorType:    "user",
			Action:       "flag.created",
			ResourceType: "flag",
		})
	}

	r := httptest.NewRequest("GET", "/v1/audit?limit=3&offset=2", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Data  []domain.AuditEntry `json:"data"`
		Total int                 `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if len(resp.Data) != 3 {
		t.Errorf("expected 3 entries (limit=3), got %d", len(resp.Data))
	}
}

func TestAuditHandler_List_DefaultLimit(t *testing.T) {
	store := newMockStore()
	h := NewAuditHandler(store)

	// Create 60 entries
	for i := 0; i < 60; i++ {
		store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
			OrgID:        "org-1",
			ActorType:    "user",
			Action:       "flag.toggled",
			ResourceType: "flag",
		})
	}

	r := httptest.NewRequest("GET", "/v1/audit", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var resp struct {
		Data  []domain.AuditEntry `json:"data"`
		Total int                 `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if len(resp.Data) != 50 {
		t.Errorf("expected default limit 50 entries, got %d", len(resp.Data))
	}
}

func TestAuditHandler_List_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewAuditHandler(store)

	store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
		OrgID: "org-1", ActorType: "user", Action: "flag.created", ResourceType: "flag",
	})
	store.CreateAuditEntry(context.Background(), &domain.AuditEntry{
		OrgID: "org-2", ActorType: "user", Action: "flag.created", ResourceType: "flag",
	})

	r := httptest.NewRequest("GET", "/v1/audit", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	var resp struct {
		Data  []domain.AuditEntry `json:"data"`
		Total int                 `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)

	if len(resp.Data) != 1 {
		t.Errorf("expected 1 entry for org-1, got %d", len(resp.Data))
	}
}

func TestAuditHandler_List_Empty(t *testing.T) {
	store := newMockStore()
	h := NewAuditHandler(store)

	r := httptest.NewRequest("GET", "/v1/audit", nil)
	r = requestWithAuth(r, "user-1", "org-1", "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}
