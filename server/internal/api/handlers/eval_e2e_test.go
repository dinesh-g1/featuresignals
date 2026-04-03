package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

func TestEvalFlow_CreateFlagAndEvaluate(t *testing.T) {
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
	if err := json.Unmarshal(w.Body.Bytes(), &result); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if result.FlagKey != "dark-mode" {
		t.Errorf("expected flag_key=dark-mode, got %s", result.FlagKey)
	}
	if result.Value != true {
		t.Errorf("expected value=true, got %v", result.Value)
	}
	if result.Reason != domain.ReasonRollout {
		t.Errorf("expected reason=%s, got %s", domain.ReasonRollout, result.Reason)
	}
}

func TestEvalFlow_EvalWithExpiredAPIKey(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	_, apiKey := setupEvalFixtures(store)

	expired := time.Now().Add(-1 * time.Hour)
	keyHash := hashAPIKey(apiKey)
	store.mu.Lock()
	store.apiKeys[keyHash].ExpiresAt = &expired
	store.mu.Unlock()

	body := `{"flag_key":"dark-mode","context":{"key":"user-123"}}`
	r := httptest.NewRequest("POST", "/v1/evaluate", strings.NewReader(body))
	r.Header.Set("X-API-Key", apiKey)
	w := httptest.NewRecorder()

	h.Evaluate(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for expired API key, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEvalFlow_EvalWithRevokedAPIKey(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	_, apiKey := setupEvalFixtures(store)

	revoked := time.Now().Add(-1 * time.Hour)
	keyHash := hashAPIKey(apiKey)
	store.mu.Lock()
	store.apiKeys[keyHash].RevokedAt = &revoked
	store.mu.Unlock()

	body := `{"flag_key":"dark-mode","context":{"key":"user-123"}}`
	r := httptest.NewRequest("POST", "/v1/evaluate", strings.NewReader(body))
	r.Header.Set("X-API-Key", apiKey)
	w := httptest.NewRecorder()

	h.Evaluate(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for revoked API key, got %d: %s", w.Code, w.Body.String())
	}
}

func TestEvalFlow_BulkEvaluateMultipleFlags(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	envID, apiKey := setupEvalFixtures(store)

	extraFlags := []struct {
		key  string
		name string
	}{
		{"beta-feature", "Beta Feature"},
		{"new-ui", "New UI"},
	}
	for _, ef := range extraFlags {
		flag := &domain.Flag{
			ProjectID:    "proj-1",
			Key:          ef.key,
			Name:         ef.name,
			FlagType:     domain.FlagTypeBoolean,
			DefaultValue: json.RawMessage(`false`),
		}
		store.CreateFlag(context.Background(), flag)
		store.UpsertFlagState(context.Background(), &domain.FlagState{
			FlagID:            flag.ID,
			EnvID:             envID,
			Enabled:           true,
			DefaultValue:      json.RawMessage(`true`),
			PercentageRollout: 10000,
		})
	}

	body := `{"flag_keys":["dark-mode","beta-feature","new-ui"],"context":{"key":"user-123"}}`
	r := httptest.NewRequest("POST", "/v1/evaluate/bulk", strings.NewReader(body))
	r.Header.Set("X-API-Key", apiKey)
	w := httptest.NewRecorder()

	h.BulkEvaluate(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var results map[string]domain.EvalResult
	if err := json.Unmarshal(w.Body.Bytes(), &results); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if len(results) != 3 {
		t.Fatalf("expected 3 results, got %d", len(results))
	}

	for _, key := range []string{"dark-mode", "beta-feature", "new-ui"} {
		res, ok := results[key]
		if !ok {
			t.Errorf("missing result for flag %s", key)
			continue
		}
		if res.Value != true {
			t.Errorf("flag %s: expected value=true, got %v", key, res.Value)
		}
		if res.Reason != domain.ReasonRollout {
			t.Errorf("flag %s: expected reason=%s, got %s", key, domain.ReasonRollout, res.Reason)
		}
	}
}

func TestEvalFlow_ClientFlagsEndpoint(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	envID, apiKey := setupEvalFixtures(store)

	flag2 := &domain.Flag{
		ProjectID:    "proj-1",
		Key:          "beta-feature",
		Name:         "Beta Feature",
		FlagType:     domain.FlagTypeBoolean,
		DefaultValue: json.RawMessage(`false`),
	}
	store.CreateFlag(context.Background(), flag2)
	store.UpsertFlagState(context.Background(), &domain.FlagState{
		FlagID:            flag2.ID,
		EnvID:             envID,
		Enabled:           true,
		DefaultValue:      json.RawMessage(`true`),
		PercentageRollout: 10000,
	})

	r := httptest.NewRequest("GET", "/v1/client/production/flags?key=user-123", nil)
	r.Header.Set("X-API-Key", apiKey)
	r = requestWithChi(r, map[string]string{"envKey": "production"})
	w := httptest.NewRecorder()

	h.ClientFlags(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var values map[string]interface{}
	if err := json.Unmarshal(w.Body.Bytes(), &values); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}

	if values["dark-mode"] != true {
		t.Errorf("expected dark-mode=true, got %v", values["dark-mode"])
	}
	if values["beta-feature"] != true {
		t.Errorf("expected beta-feature=true, got %v", values["beta-feature"])
	}
	if len(values) != 2 {
		t.Errorf("expected 2 flags in response, got %d: %v", len(values), values)
	}
}

func TestEvalFlow_InvalidAPIKey(t *testing.T) {
	store := newMockStore()
	h := newTestEvalHandler(store)
	setupEvalFixtures(store)

	body := `{"flag_key":"dark-mode","context":{"key":"user-123"}}`
	r := httptest.NewRequest("POST", "/v1/evaluate", strings.NewReader(body))
	r.Header.Set("X-API-Key", "fs_srv_totally_bogus_key_000000000000")
	w := httptest.NewRecorder()

	h.Evaluate(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for invalid API key, got %d: %s", w.Code, w.Body.String())
	}
}
