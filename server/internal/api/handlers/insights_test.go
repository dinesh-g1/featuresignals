package handlers

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/metrics"
)

type mockEvaluator struct {
	results map[string]domain.EvalResult
}

func (m *mockEvaluator) Evaluate(flagKey string, ctx domain.EvalContext, rs *domain.Ruleset) domain.EvalResult {
	if r, ok := m.results[flagKey]; ok {
		return r
	}
	return domain.EvalResult{FlagKey: flagKey, Value: false, Reason: domain.ReasonNotFound}
}

func (m *mockEvaluator) EvaluateAll(ctx domain.EvalContext, rs *domain.Ruleset) map[string]domain.EvalResult {
	return m.results
}

type mockRulesetCache struct {
	ruleset *domain.Ruleset
}

func (m *mockRulesetCache) GetRuleset(envID string) *domain.Ruleset { return m.ruleset }
func (m *mockRulesetCache) LoadRuleset(ctx context.Context, projectID, envID string) (*domain.Ruleset, error) {
	return m.ruleset, nil
}

func TestInsightsHandler_InspectEntity(t *testing.T) {
	store := newMockStore()
	projID, envID := setupTestEnv(store, testOrgID)

	evaluator := &mockEvaluator{
		results: map[string]domain.EvalResult{
			"feature-a": {FlagKey: "feature-a", Value: true, Reason: domain.ReasonTargeted},
			"feature-b": {FlagKey: "feature-b", Value: false, Reason: domain.ReasonDisabled},
		},
	}
	cache := &mockRulesetCache{ruleset: &domain.Ruleset{
		Flags:    map[string]*domain.Flag{},
		States:   map[string]*domain.FlagState{},
		Segments: map[string]*domain.Segment{},
	}}
	collector := metrics.NewCollector()

	h := NewInsightsHandler(store, cache, evaluator, collector)

	body := `{"key":"user-123","attributes":{"plan":"enterprise"}}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/environments/"+envID+"/inspect-entity", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID, "envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.InspectEntity(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var results []InspectEntityResult
	json.Unmarshal(w.Body.Bytes(), &results)

	if len(results) != 2 {
		t.Fatalf("expected 2 results, got %d", len(results))
	}

	found := false
	for _, res := range results {
		if res.FlagKey == "feature-a" {
			found = true
			if !res.IndividuallyTargeted {
				t.Error("feature-a should be individually targeted")
			}
			if res.Value != true {
				t.Error("feature-a should be true")
			}
		}
	}
	if !found {
		t.Error("feature-a not found in results")
	}
}

func TestInsightsHandler_InspectEntity_MissingKey(t *testing.T) {
	store := newMockStore()
	projID, envID := setupTestEnv(store, testOrgID)

	h := NewInsightsHandler(store, &mockRulesetCache{ruleset: &domain.Ruleset{}}, &mockEvaluator{}, metrics.NewCollector())

	body := `{"attributes":{"plan":"free"}}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/environments/"+envID+"/inspect-entity", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID, "envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.InspectEntity(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestInsightsHandler_CompareEntities(t *testing.T) {
	store := newMockStore()
	projID, envID := setupTestEnv(store, testOrgID)

	evaluator := &mockEvaluator{
		results: map[string]domain.EvalResult{
			"feature-x": {FlagKey: "feature-x", Value: true, Reason: domain.ReasonTargeted},
		},
	}
	cache := &mockRulesetCache{ruleset: &domain.Ruleset{
		Flags: map[string]*domain.Flag{}, States: map[string]*domain.FlagState{}, Segments: map[string]*domain.Segment{},
	}}
	collector := metrics.NewCollector()

	h := NewInsightsHandler(store, cache, evaluator, collector)

	body := `{
		"entity_a": {"key":"user-1","attributes":{"plan":"free"}},
		"entity_b": {"key":"user-2","attributes":{"plan":"enterprise"}}
	}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/environments/"+envID+"/compare-entities", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID, "envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.CompareEntities(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var results []EntityComparisonResult
	json.Unmarshal(w.Body.Bytes(), &results)

	if len(results) != 1 {
		t.Fatalf("expected 1 result, got %d", len(results))
	}
	if results[0].FlagKey != "feature-x" {
		t.Errorf("expected feature-x, got %s", results[0].FlagKey)
	}
}

func TestInsightsHandler_CompareEntities_MissingKeys(t *testing.T) {
	store := newMockStore()
	projID, envID := setupTestEnv(store, testOrgID)
	h := NewInsightsHandler(store, &mockRulesetCache{ruleset: &domain.Ruleset{}}, &mockEvaluator{}, metrics.NewCollector())

	body := `{"entity_a":{"key":""},"entity_b":{"key":"user-2"}}`
	r := httptest.NewRequest("POST", "/v1/projects/"+projID+"/environments/"+envID+"/compare-entities", strings.NewReader(body))
	r = requestWithChi(r, map[string]string{"projectID": projID, "envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.CompareEntities(w, r)

	if w.Code != http.StatusBadRequest {
		t.Errorf("expected 400, got %d", w.Code)
	}
}

func TestInsightsHandler_FlagInsights(t *testing.T) {
	store := newMockStore()
	projID, envID := setupTestEnv(store, testOrgID)

	collector := metrics.NewCollector()
	collector.RecordValue("flag-1", envID, true)
	collector.RecordValue("flag-1", envID, true)
	collector.RecordValue("flag-1", envID, false)
	collector.RecordValue("flag-2", envID, false)

	h := NewInsightsHandler(store, &mockRulesetCache{}, &mockEvaluator{}, collector)

	r := httptest.NewRequest("GET", "/v1/projects/"+projID+"/environments/"+envID+"/flag-insights", nil)
	r = requestWithChi(r, map[string]string{"projectID": projID, "envID": envID})
	r = requestWithAuth(r, "user-1", testOrgID, "admin")
	w := httptest.NewRecorder()

	h.FlagInsights(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d: %s", w.Code, w.Body.String())
	}

	var insights []metrics.FlagInsight
	json.Unmarshal(w.Body.Bytes(), &insights)

	if len(insights) != 2 {
		t.Fatalf("expected 2 flag insights, got %d", len(insights))
	}

	for _, ins := range insights {
		switch ins.FlagKey {
		case "flag-1":
			if ins.TrueCount != 2 || ins.FalseCount != 1 || ins.TotalCount != 3 {
				t.Errorf("flag-1 counts wrong: true=%d false=%d total=%d", ins.TrueCount, ins.FalseCount, ins.TotalCount)
			}
		case "flag-2":
			if ins.TrueCount != 0 || ins.FalseCount != 1 || ins.TotalCount != 1 {
				t.Errorf("flag-2 counts wrong: true=%d false=%d total=%d", ins.TrueCount, ins.FalseCount, ins.TotalCount)
			}
		}
	}
}
