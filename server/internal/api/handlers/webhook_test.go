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

func TestWebhookHandler_Create(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	body := `{"name":"My Hook","url":"https://example.com/webhook","secret":"s3cret","events":["flag.updated"]}`
	r := httptest.NewRequest("POST", "/v1/webhooks", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}
	var wh domain.Webhook
	json.Unmarshal(w.Body.Bytes(), &wh)
	if wh.Name != "My Hook" {
		t.Errorf("expected name 'My Hook', got '%s'", wh.Name)
	}
	if !wh.Enabled {
		t.Error("expected webhook to be enabled by default")
	}
}

func TestWebhookHandler_Create_MissingFields(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	body := `{"name":"","url":""}`
	r := httptest.NewRequest("POST", "/v1/webhooks", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestWebhookHandler_Create_InvalidURL(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	body := `{"name":"Hook","url":"ftp://bad.com/hook"}`
	r := httptest.NewRequest("POST", "/v1/webhooks", strings.NewReader(body))
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestWebhookHandler_List(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	store.CreateWebhook(context.Background(), &domain.Webhook{
		OrgID: testOrgID, Name: "Hook 1", URL: "https://a.com", Events: []string{"flag.updated"}, Enabled: true,
	})

	r := httptest.NewRequest("GET", "/v1/webhooks", nil)
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp struct {
		Data  []domain.Webhook `json:"data"`
		Total int              `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) != 1 {
		t.Errorf("expected 1 webhook, got %d", len(resp.Data))
	}
}

func TestWebhookHandler_List_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	store.CreateWebhook(context.Background(), &domain.Webhook{
		OrgID: testOrgID, Name: "Hook 1", URL: "https://a.com", Events: []string{"flag.updated"}, Enabled: true,
	})

	r := httptest.NewRequest("GET", "/v1/webhooks", nil)
	r = requestWithAuth(r, "attacker", "org-2", "admin")
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
		t.Errorf("expected 0 webhooks for other org, got %d", len(resp.Data))
	}
}

func TestWebhookHandler_Get(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	store.CreateWebhook(context.Background(), &domain.Webhook{
		OrgID: testOrgID, Name: "Hook 1", URL: "https://a.com", Events: []string{"flag.updated"}, Enabled: true,
	})
	webhooks, _ := store.ListWebhooks(context.Background(), testOrgID, 0, 0)
	whID := webhooks[0].ID

	r := httptest.NewRequest("GET", "/v1/webhooks/"+whID, nil)
	r = requestWithChi(r, map[string]string{"webhookID": whID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestWebhookHandler_Get_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	store.CreateWebhook(context.Background(), &domain.Webhook{
		OrgID: testOrgID, Name: "Hook 1", URL: "https://a.com", Events: []string{"flag.updated"}, Enabled: true,
	})
	webhooks, _ := store.ListWebhooks(context.Background(), testOrgID, 0, 0)
	whID := webhooks[0].ID

	r := httptest.NewRequest("GET", "/v1/webhooks/"+whID, nil)
	r = requestWithChi(r, map[string]string{"webhookID": whID})
	r = requestWithAuth(r, "attacker", "org-2", "admin")
	w := httptest.NewRecorder()

	h.Get(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-org webhook get, got %d", w.Code)
	}
}

func TestWebhookHandler_Update(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	store.CreateWebhook(context.Background(), &domain.Webhook{
		OrgID: testOrgID, Name: "Hook 1", URL: "https://a.com", Events: []string{"flag.updated"}, Enabled: true,
	})
	webhooks, _ := store.ListWebhooks(context.Background(), testOrgID, 0, 0)
	whID := webhooks[0].ID

	body := `{"name":"Updated Hook"}`
	r := httptest.NewRequest("PATCH", "/v1/webhooks/"+whID, strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"webhookID": whID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Update(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}
	var updated domain.Webhook
	json.Unmarshal(w.Body.Bytes(), &updated)
	if updated.Name != "Updated Hook" {
		t.Errorf("expected updated name, got '%s'", updated.Name)
	}
}

func TestWebhookHandler_Update_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	store.CreateWebhook(context.Background(), &domain.Webhook{
		OrgID: testOrgID, Name: "Hook 1", URL: "https://a.com", Events: []string{"flag.updated"}, Enabled: true,
	})
	webhooks, _ := store.ListWebhooks(context.Background(), testOrgID, 0, 0)
	whID := webhooks[0].ID

	body := `{"name":"Hacked"}`
	r := httptest.NewRequest("PATCH", "/v1/webhooks/"+whID, strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"webhookID": whID})
	r = requestWithAuth(r, "attacker", "org-2", "admin")
	w := httptest.NewRecorder()

	h.Update(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-org webhook update, got %d", w.Code)
	}
}

func TestWebhookHandler_Delete(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	store.CreateWebhook(context.Background(), &domain.Webhook{
		OrgID: testOrgID, Name: "Hook 1", URL: "https://a.com", Events: []string{"flag.updated"}, Enabled: true,
	})
	webhooks, _ := store.ListWebhooks(context.Background(), testOrgID, 0, 0)
	whID := webhooks[0].ID

	r := httptest.NewRequest("DELETE", "/v1/webhooks/"+whID, nil)
	r = requestWithChi(r, map[string]string{"webhookID": whID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

func TestWebhookHandler_Delete_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	store.CreateWebhook(context.Background(), &domain.Webhook{
		OrgID: testOrgID, Name: "Hook 1", URL: "https://a.com", Events: []string{"flag.updated"}, Enabled: true,
	})
	webhooks, _ := store.ListWebhooks(context.Background(), testOrgID, 0, 0)
	whID := webhooks[0].ID

	r := httptest.NewRequest("DELETE", "/v1/webhooks/"+whID, nil)
	r = requestWithChi(r, map[string]string{"webhookID": whID})
	r = requestWithAuth(r, "attacker", "org-2", "admin")
	w := httptest.NewRecorder()

	h.Delete(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-org webhook delete, got %d", w.Code)
	}
}

func TestWebhookHandler_ListDeliveries(t *testing.T) {
	store := newMockStore()
	h := NewWebhookHandler(store)

	store.CreateWebhook(context.Background(), &domain.Webhook{
		OrgID: testOrgID, Name: "Hook 1", URL: "https://a.com", Events: []string{"flag.updated"}, Enabled: true,
	})
	webhooks, _ := store.ListWebhooks(context.Background(), testOrgID, 0, 0)
	whID := webhooks[0].ID

	store.CreateWebhookDelivery(context.Background(), &domain.WebhookDelivery{
		WebhookID: whID, EventType: "flag.updated", Payload: []byte(`{}`), ResponseStatus: 200, Success: true,
	})

	r := httptest.NewRequest("GET", "/v1/webhooks/"+whID+"/deliveries", nil)
	r = requestWithChi(r, map[string]string{"webhookID": whID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.ListDeliveries(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var resp struct {
		Data  []domain.WebhookDelivery `json:"data"`
		Total int                      `json:"total"`
	}
	json.Unmarshal(w.Body.Bytes(), &resp)
	if len(resp.Data) != 1 {
		t.Errorf("expected 1 delivery, got %d", len(resp.Data))
	}
}
