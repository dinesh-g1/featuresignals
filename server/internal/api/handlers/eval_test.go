package handlers

import (
	"context"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/eval"
	"github.com/featuresignals/server/internal/sse"
	"github.com/featuresignals/server/internal/store/cache"
)

func newTestEvalHandler(store domain.Store) *EvalHandler {
	logger := slog.New(slog.NewTextHandler(os.Stderr, &slog.HandlerOptions{Level: slog.LevelError}))
	c := cache.NewCache(store, logger, nil)
	engine := eval.NewEngine()
	sseServer := sse.NewServer(logger)
	return NewEvalHandler(store, c, engine, sseServer, logger, nil)
}

// setupEvalFixtures creates a complete environment with a flag, API key, and environment for testing eval endpoints.
func setupEvalFixtures(store *mockStore) (envID, apiKeyRaw string) {
	env := &domain.Environment{ProjectID: "proj-1", Name: "Production", Slug: "production"}
	store.CreateEnvironment(context.Background(), env)

	flag := &domain.Flag{
		ProjectID:    "proj-1",
		Key:          "dark-mode",
		Name:         "Dark Mode",
		FlagType:     domain.FlagTypeBoolean,
		DefaultValue: json.RawMessage(`false`),
	}
	store.CreateFlag(context.Background(), flag)

	store.UpsertFlagState(context.Background(), &domain.FlagState{
		FlagID:            flag.ID,
		EnvID:             env.ID,
		Enabled:           true,
		DefaultValue:      json.RawMessage(`true`),
		PercentageRollout: 10000, // 100%
	})

	rawKey, keyHash, keyPrefix := generateAPIKey(domain.APIKeyServer)
	store.CreateAPIKey(context.Background(), &domain.APIKey{
		EnvID:     env.ID,
		KeyHash:   keyHash,
		KeyPrefix: keyPrefix,
		Name:      "Test Key",
		Type:      domain.APIKeyServer,
	})

	return env.ID, rawKey
}

func TestEvalHandler_Evaluate(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	_, apiKey := setupEvalFixtures(store)

	body := `{"flag_key":"dark-mode","context":{"key":"user-123"}}`
	r := httptest.NewRequest("POST", "/v1/evaluate", strings.NewReader(body))
	r.Header.Set("X-API-Key", apiKey)
	w := httptest.NewRecorder()

	h.Evaluate(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var result domain.EvalResult
	json.Unmarshal(w.Body.Bytes(), &result)

	if result.Value != true {
		t.Errorf("expected true, got %v", result.Value)
	}
}

func TestEvalHandler_Evaluate_MissingAPIKey(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)

	body := `{"flag_key":"dark-mode","context":{"key":"user-123"}}`
	r := httptest.NewRequest("POST", "/v1/evaluate", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.Evaluate(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestEvalHandler_Evaluate_InvalidAPIKey(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)

	body := `{"flag_key":"dark-mode","context":{"key":"user-123"}}`
	r := httptest.NewRequest("POST", "/v1/evaluate", strings.NewReader(body))
	r.Header.Set("X-API-Key", "fs_srv_invalid_key_here")
	w := httptest.NewRecorder()

	h.Evaluate(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestEvalHandler_Evaluate_MissingFields(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	_, apiKey := setupEvalFixtures(store)

	tests := []struct {
		name string
		body string
	}{
		{"missing flag_key", `{"flag_key":"","context":{"key":"user-1"}}`},
		{"missing context key", `{"flag_key":"dark-mode","context":{"key":""}}`},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			r := httptest.NewRequest("POST", "/v1/evaluate", strings.NewReader(tt.body))
			r.Header.Set("X-API-Key", apiKey)
			w := httptest.NewRecorder()

			h.Evaluate(w, r)

			if w.Code != http.StatusBadRequest {
				t.Errorf("expected 400, got %d", w.Code)
			}
		})
	}
}

func TestEvalHandler_Evaluate_FlagNotFound(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	_, apiKey := setupEvalFixtures(store)

	body := `{"flag_key":"nonexistent","context":{"key":"user-123"}}`
	r := httptest.NewRequest("POST", "/v1/evaluate", strings.NewReader(body))
	r.Header.Set("X-API-Key", apiKey)
	w := httptest.NewRecorder()

	h.Evaluate(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var result domain.EvalResult
	json.Unmarshal(w.Body.Bytes(), &result)

	if result.Reason != domain.ReasonNotFound {
		t.Errorf("expected reason '%s', got '%s'", domain.ReasonNotFound, result.Reason)
	}
}

func TestEvalHandler_BulkEvaluate(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	_, apiKey := setupEvalFixtures(store)

	// Add another flag
	flag2 := &domain.Flag{
		ProjectID:    "proj-1",
		Key:          "new-ui",
		Name:         "New UI",
		FlagType:     domain.FlagTypeBoolean,
		DefaultValue: json.RawMessage(`false`),
	}
	store.CreateFlag(context.Background(), flag2)

	body := `{"flag_keys":["dark-mode","new-ui","nonexistent"],"context":{"key":"user-123"}}`
	r := httptest.NewRequest("POST", "/v1/evaluate/bulk", strings.NewReader(body))
	r.Header.Set("X-API-Key", apiKey)
	w := httptest.NewRecorder()

	h.BulkEvaluate(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var results map[string]domain.EvalResult
	json.Unmarshal(w.Body.Bytes(), &results)

	if len(results) != 3 {
		t.Errorf("expected 3 results, got %d", len(results))
	}
}

func TestEvalHandler_BulkEvaluate_MissingContextKey(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	_, apiKey := setupEvalFixtures(store)

	body := `{"flag_keys":["dark-mode"],"context":{"key":""}}`
	r := httptest.NewRequest("POST", "/v1/evaluate/bulk", strings.NewReader(body))
	r.Header.Set("X-API-Key", apiKey)
	w := httptest.NewRecorder()

	h.BulkEvaluate(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestEvalHandler_ClientFlags(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	_, apiKey := setupEvalFixtures(store)

	r := httptest.NewRequest("GET", "/v1/client/production/flags?key=user-123", nil)
	r.Header.Set("X-API-Key", apiKey)
	r = requestWithChi(r, map[string]string{"envKey": "production"})
	w := httptest.NewRecorder()

	h.ClientFlags(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var values map[string]interface{}
	json.Unmarshal(w.Body.Bytes(), &values)

	if values["dark-mode"] != true {
		t.Errorf("expected dark-mode=true, got %v", values["dark-mode"])
	}
}

func TestEvalHandler_ClientFlags_AnonymousDefault(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	_, apiKey := setupEvalFixtures(store)

	// No key param — should default to "anonymous"
	r := httptest.NewRequest("GET", "/v1/client/production/flags", nil)
	r.Header.Set("X-API-Key", apiKey)
	r = requestWithChi(r, map[string]string{"envKey": "production"})
	w := httptest.NewRecorder()

	h.ClientFlags(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
}

func TestEvalHandler_ClientFlags_NoAPIKey(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)

	r := httptest.NewRequest("GET", "/v1/client/production/flags", nil)
	r = requestWithChi(r, map[string]string{"envKey": "production"})
	w := httptest.NewRecorder()

	h.ClientFlags(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestEvalHandler_Stream_NoAPIKey(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)

	r := httptest.NewRequest("GET", "/v1/stream/production", nil)
	r = requestWithChi(r, map[string]string{"envKey": "production"})
	w := httptest.NewRecorder()

	h.Stream(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestEvalHandler_Stream_InvalidAPIKey(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)

	r := httptest.NewRequest("GET", "/v1/stream/production?api_key=fs_srv_invalid", nil)
	r = requestWithChi(r, map[string]string{"envKey": "production"})
	w := httptest.NewRecorder()

	h.Stream(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestEvalHandler_Stream_MissingEnvKey(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)

	r := httptest.NewRequest("GET", "/v1/stream/", nil)
	r = requestWithChi(r, map[string]string{"envKey": ""})
	w := httptest.NewRecorder()

	h.Stream(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestEvalHandler_Evaluate_InvalidJSON(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	_, apiKey := setupEvalFixtures(store)

	r := httptest.NewRequest("POST", "/v1/evaluate", strings.NewReader(`{invalid`))
	r.Header.Set("X-API-Key", apiKey)
	w := httptest.NewRecorder()

	h.Evaluate(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}
