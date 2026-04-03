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

func TestAPIKeyHandler_Create(t *testing.T) {
	store := newMockStore()
	h := NewAPIKeyHandler(store)
	_, envID := setupTestEnv(store, testOrgID)

	body := `{"name":"Production Server Key","type":"server"}`
	r := httptest.NewRequest("POST", "/v1/environments/"+envID+"/api-keys", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d: %s", w.Code, w.Body.String())
	}

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)

	if result["key"] == nil {
		t.Error("expected raw key in response")
	}
	key := result["key"].(string)
	if !strings.HasPrefix(key, "fs_srv_") {
		t.Errorf("expected server key prefix 'fs_srv_', got '%s'", key[:7])
	}
	if result["name"] != "Production Server Key" {
		t.Errorf("expected name 'Production Server Key', got '%v'", result["name"])
	}
}

func TestAPIKeyHandler_Create_ClientKey(t *testing.T) {
	store := newMockStore()
	h := NewAPIKeyHandler(store)
	_, envID := setupTestEnv(store, testOrgID)

	body := `{"name":"Client Key","type":"client"}`
	r := httptest.NewRequest("POST", "/v1/environments/"+envID+"/api-keys", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)

	key := result["key"].(string)
	if !strings.HasPrefix(key, "fs_cli_") {
		t.Errorf("expected client key prefix 'fs_cli_', got '%s'", key[:7])
	}
}

func TestAPIKeyHandler_Create_DefaultsToServer(t *testing.T) {
	store := newMockStore()
	h := NewAPIKeyHandler(store)
	_, envID := setupTestEnv(store, testOrgID)

	body := `{"name":"Default Key","type":"unknown"}`
	r := httptest.NewRequest("POST", "/v1/environments/"+envID+"/api-keys", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusCreated {
		t.Fatalf("expected 201, got %d", w.Code)
	}

	var result map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &result)

	if result["type"] != "server" {
		t.Errorf("expected default type 'server', got '%v'", result["type"])
	}
}

func TestAPIKeyHandler_Create_MissingName(t *testing.T) {
	store := newMockStore()
	h := NewAPIKeyHandler(store)
	_, envID := setupTestEnv(store, testOrgID)

	body := `{"name":"","type":"server"}`
	r := httptest.NewRequest("POST", "/v1/environments/"+envID+"/api-keys", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestAPIKeyHandler_Create_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewAPIKeyHandler(store)
	_, envID := setupTestEnv(store, testOrgID)

	body := `{"name":"Hack Key","type":"server"}`
	r := httptest.NewRequest("POST", "/v1/environments/"+envID+"/api-keys", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"envID": envID})
	r = requestWithAuth(r, "attacker", "org-2", "admin")
	w := httptest.NewRecorder()

	h.Create(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-org API key create, got %d", w.Code)
	}
}

func TestAPIKeyHandler_List(t *testing.T) {
	store := newMockStore()
	h := NewAPIKeyHandler(store)
	_, envID := setupTestEnv(store, testOrgID)

	store.CreateAPIKey(context.Background(), &domain.APIKey{
		EnvID: envID, KeyHash: "hash1", KeyPrefix: "fs_srv_abc1", Name: "Key 1", Type: domain.APIKeyServer,
	})
	store.CreateAPIKey(context.Background(), &domain.APIKey{
		EnvID: envID, KeyHash: "hash2", KeyPrefix: "fs_cli_xyz2", Name: "Key 2", Type: domain.APIKeyClient,
	})

	r := httptest.NewRequest("GET", "/v1/environments/"+envID+"/api-keys", nil)
	r = requestWithChi(r, map[string]string{"envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.List(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var keys []domain.APIKey
	json.Unmarshal(w.Body.Bytes(), &keys)

	if len(keys) != 2 {
		t.Errorf("expected 2 keys, got %d", len(keys))
	}
}

func TestAPIKeyHandler_List_Empty(t *testing.T) {
	store := newMockStore()
	h := NewAPIKeyHandler(store)
	_, envID := setupTestEnv(store, testOrgID)

	r := httptest.NewRequest("GET", "/v1/environments/"+envID+"/api-keys", nil)
	r = requestWithChi(r, map[string]string{"envID": envID})
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

func TestAPIKeyHandler_Revoke(t *testing.T) {
	store := newMockStore()
	h := NewAPIKeyHandler(store)
	_, envID := setupTestEnv(store, testOrgID)

	store.CreateAPIKey(context.Background(), &domain.APIKey{
		EnvID: envID, KeyHash: "hash-rev", KeyPrefix: "fs_srv_rev1", Name: "Revoke Me", Type: domain.APIKeyServer,
	})
	keys, _ := store.ListAPIKeys(context.Background(), envID)
	keyID := keys[0].ID

	r := httptest.NewRequest("DELETE", "/v1/api-keys/"+keyID, nil)
	r = requestWithChi(r, map[string]string{"keyID": keyID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.Revoke(w, r)

	if w.Code != http.StatusNoContent {
		t.Errorf("expected 204, got %d", w.Code)
	}
}

func TestAPIKeyHandler_Revoke_OrgIsolation(t *testing.T) {
	store := newMockStore()
	h := NewAPIKeyHandler(store)
	_, envID := setupTestEnv(store, testOrgID)

	store.CreateAPIKey(context.Background(), &domain.APIKey{
		EnvID: envID, KeyHash: "hash-iso", KeyPrefix: "fs_srv_iso1", Name: "Org1 Key", Type: domain.APIKeyServer,
	})
	keys, _ := store.ListAPIKeys(context.Background(), envID)
	keyID := keys[0].ID

	r := httptest.NewRequest("DELETE", "/v1/api-keys/"+keyID, nil)
	r = requestWithChi(r, map[string]string{"keyID": keyID})
	r = requestWithAuth(r, "attacker", "org-2", "admin")
	w := httptest.NewRecorder()

	h.Revoke(w, r)

	if w.Code != http.StatusNotFound {
		t.Errorf("expected 404 for cross-org API key revoke, got %d", w.Code)
	}
}

func TestGenerateAPIKey_ServerKey(t *testing.T) {
	rawKey, keyHash, keyPrefix := generateAPIKey(domain.APIKeyServer)

	if !strings.HasPrefix(rawKey, "fs_srv_") {
		t.Errorf("server key should start with 'fs_srv_', got '%s'", rawKey[:7])
	}
	if keyHash == "" {
		t.Error("key hash should not be empty")
	}
	if keyPrefix == "" {
		t.Error("key prefix should not be empty")
	}
	if len(keyPrefix) != 12 {
		t.Errorf("key prefix should be 12 chars, got %d", len(keyPrefix))
	}
}

func TestGenerateAPIKey_ClientKey(t *testing.T) {
	rawKey, _, _ := generateAPIKey(domain.APIKeyClient)

	if !strings.HasPrefix(rawKey, "fs_cli_") {
		t.Errorf("client key should start with 'fs_cli_', got '%s'", rawKey[:7])
	}
}

func TestGenerateAPIKey_Uniqueness(t *testing.T) {
	key1, hash1, _ := generateAPIKey(domain.APIKeyServer)
	key2, hash2, _ := generateAPIKey(domain.APIKeyServer)

	if key1 == key2 {
		t.Error("two generated keys should not be the same")
	}
	if hash1 == hash2 {
		t.Error("two generated key hashes should not be the same")
	}
}
