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

func TestMetricsHandler_Summary(t *testing.T) {
	store := newMockStore()
	c := metrics.NewCollector()
	ic := metrics.NewImpressionCollector(1000)
	h := NewMetricsHandler(store, c, ic)

	c.Record("flag-1", "env-1", "match")
	c.Record("flag-1", "env-1", "match")

	r := httptest.NewRequest("GET", "/v1/metrics/summary", nil)
	w := httptest.NewRecorder()
	h.Summary(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var summary metrics.EvalSummary
	json.Unmarshal(w.Body.Bytes(), &summary)
	if summary.TotalEvaluations != 2 {
		t.Errorf("expected 2 total evaluations, got %d", summary.TotalEvaluations)
	}
}

func TestMetricsHandler_Summary_Empty(t *testing.T) {
	store := newMockStore()
	c := metrics.NewCollector()
	ic := metrics.NewImpressionCollector(1000)
	h := NewMetricsHandler(store, c, ic)

	r := httptest.NewRequest("GET", "/v1/metrics/summary", nil)
	w := httptest.NewRecorder()
	h.Summary(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}
	var summary metrics.EvalSummary
	json.Unmarshal(w.Body.Bytes(), &summary)
	if summary.TotalEvaluations != 0 {
		t.Errorf("expected 0, got %d", summary.TotalEvaluations)
	}
}

func TestMetricsHandler_Reset(t *testing.T) {
	store := newMockStore()
	c := metrics.NewCollector()
	ic := metrics.NewImpressionCollector(1000)
	h := NewMetricsHandler(store, c, ic)

	c.Record("flag-1", "env-1", "match")

	r := httptest.NewRequest("POST", "/v1/metrics/reset", nil)
	w := httptest.NewRecorder()
	h.Reset(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	summary := c.Summary()
	if summary.TotalEvaluations != 0 {
		t.Errorf("expected 0 after reset, got %d", summary.TotalEvaluations)
	}
}

func TestMetricsHandler_TrackImpression(t *testing.T) {
	store := newMockStore()
	_, envID := setupTestEnv(store, testOrgID)
	store.CreateAPIKey(context.Background(), &domain.APIKey{
		EnvID: envID, KeyHash: "testhash", KeyPrefix: "fs_srv_test", Name: "test", Type: domain.APIKeyServer,
	})

	c := metrics.NewCollector()
	ic := metrics.NewImpressionCollector(1000)
	h := NewMetricsHandler(store, c, ic)

	body := `{"flag_key":"feat-1","variant_key":"control","user_key":"user-123"}`
	r := httptest.NewRequest("POST", "/v1/impressions", strings.NewReader(body))
	r.Header.Set("X-API-Key", "raw-key-that-we-need-hash-for")
	w := httptest.NewRecorder()

	// This will fail because the API key hash won't match, testing the auth path
	h.TrackImpression(w, r)
	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 for mismatched API key, got %d", w.Code)
	}
}

func TestMetricsHandler_TrackImpression_MissingAPIKey(t *testing.T) {
	store := newMockStore()
	c := metrics.NewCollector()
	ic := metrics.NewImpressionCollector(1000)
	h := NewMetricsHandler(store, c, ic)

	body := `{"flag_key":"feat-1","variant_key":"control","user_key":"user-123"}`
	r := httptest.NewRequest("POST", "/v1/impressions", strings.NewReader(body))
	w := httptest.NewRecorder()

	h.TrackImpression(w, r)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401, got %d", w.Code)
	}
}

func TestMetricsHandler_ImpressionSummary(t *testing.T) {
	store := newMockStore()
	c := metrics.NewCollector()
	ic := metrics.NewImpressionCollector(1000)
	h := NewMetricsHandler(store, c, ic)

	ic.Record("flag-1", "variant-a", "user-1")
	ic.Record("flag-1", "variant-a", "user-2")

	r := httptest.NewRequest("GET", "/v1/impressions/summary", nil)
	w := httptest.NewRecorder()
	h.ImpressionSummary(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var summaries []metrics.ImpressionSummary
	json.Unmarshal(w.Body.Bytes(), &summaries)
	if len(summaries) != 1 {
		t.Fatalf("expected 1 summary entry, got %d", len(summaries))
	}
	if summaries[0].Count != 2 {
		t.Errorf("expected count 2, got %d", summaries[0].Count)
	}
}

func TestMetricsHandler_FlushImpressions(t *testing.T) {
	store := newMockStore()
	c := metrics.NewCollector()
	ic := metrics.NewImpressionCollector(1000)
	h := NewMetricsHandler(store, c, ic)

	ic.Record("flag-1", "variant-a", "user-1")

	r := httptest.NewRequest("POST", "/v1/impressions/flush", nil)
	w := httptest.NewRecorder()
	h.FlushImpressions(w, r)

	if w.Code != http.StatusOK {
		t.Fatalf("expected 200, got %d", w.Code)
	}

	var impressions []metrics.Impression
	json.Unmarshal(w.Body.Bytes(), &impressions)
	if len(impressions) != 1 {
		t.Fatalf("expected 1 impression, got %d", len(impressions))
	}

	// After flush, should be empty
	summary := ic.Summary()
	if len(summary) != 0 {
		t.Errorf("expected empty summary after flush, got %d", len(summary))
	}
}
