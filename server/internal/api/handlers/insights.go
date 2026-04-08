package handlers

import (
	"net/http"
	"sort"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/metrics"
)

// InsightsHandler serves the entity inspector, entity comparison,
// and flag usage insights endpoints.
type InsightsHandler struct {
	store     projectGetter
	cache     RulesetCache
	engine    Evaluator
	collector *metrics.Collector
}

func NewInsightsHandler(store projectGetter, cache RulesetCache, engine Evaluator, collector *metrics.Collector) *InsightsHandler {
	return &InsightsHandler{store: store, cache: cache, engine: engine, collector: collector}
}

// --- Entity Inspector ---

type InspectEntityRequest struct {
	Key        string                 `json:"key"`
	Attributes map[string]interface{} `json:"attributes"`
}

type InspectEntityResult struct {
	FlagKey              string      `json:"flag_key"`
	Value                interface{} `json:"value"`
	Reason               string      `json:"reason"`
	VariantKey           string      `json:"variant_key,omitempty"`
	IndividuallyTargeted bool        `json:"individually_targeted"`
}

// InspectEntity evaluates all flags for a specific entity context.
func (h *InsightsHandler) InspectEntity(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	envID := chi.URLParam(r, "envID")

	var req InspectEntityRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Key == "" {
		httputil.Error(w, http.StatusBadRequest, "key is required")
		return
	}

	ruleset, err := h.loadRuleset(w, r, projectID, envID)
	if err != nil {
		return
	}

	ctx := domain.EvalContext{Key: req.Key, Attributes: req.Attributes}
	if ctx.Attributes == nil {
		ctx.Attributes = make(map[string]interface{})
	}

	allResults := h.engine.EvaluateAll(ctx, ruleset)

	results := make([]InspectEntityResult, 0, len(allResults))
	for flagKey, res := range allResults {
		results = append(results, InspectEntityResult{
			FlagKey:              flagKey,
			Value:                res.Value,
			Reason:               res.Reason,
			VariantKey:           res.VariantKey,
			IndividuallyTargeted: res.Reason == domain.ReasonTargeted,
		})
	}
	sort.Slice(results, func(i, j int) bool { return results[i].FlagKey < results[j].FlagKey })

	httputil.JSON(w, http.StatusOK, results)
}

// --- Entity Comparison ---

type CompareEntitiesRequest struct {
	EntityA EntityDef `json:"entity_a"`
	EntityB EntityDef `json:"entity_b"`
}

type EntityDef struct {
	Key        string                 `json:"key"`
	Attributes map[string]interface{} `json:"attributes"`
}

type EntityComparisonResult struct {
	FlagKey    string      `json:"flag_key"`
	ValueA     interface{} `json:"value_a"`
	ValueB     interface{} `json:"value_b"`
	ReasonA    string      `json:"reason_a"`
	ReasonB    string      `json:"reason_b"`
	IsDifferent bool       `json:"is_different"`
}

// CompareEntities evaluates all flags for two entities and returns a diff.
func (h *InsightsHandler) CompareEntities(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	envID := chi.URLParam(r, "envID")

	var req CompareEntitiesRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.EntityA.Key == "" || req.EntityB.Key == "" {
		httputil.Error(w, http.StatusBadRequest, "entity_a.key and entity_b.key are required")
		return
	}

	ruleset, err := h.loadRuleset(w, r, projectID, envID)
	if err != nil {
		return
	}

	ctxA := domain.EvalContext{Key: req.EntityA.Key, Attributes: req.EntityA.Attributes}
	ctxB := domain.EvalContext{Key: req.EntityB.Key, Attributes: req.EntityB.Attributes}
	if ctxA.Attributes == nil {
		ctxA.Attributes = make(map[string]interface{})
	}
	if ctxB.Attributes == nil {
		ctxB.Attributes = make(map[string]interface{})
	}

	resultsA := h.engine.EvaluateAll(ctxA, ruleset)
	resultsB := h.engine.EvaluateAll(ctxB, ruleset)

	allKeys := make(map[string]bool)
	for k := range resultsA {
		allKeys[k] = true
	}
	for k := range resultsB {
		allKeys[k] = true
	}

	comparison := make([]EntityComparisonResult, 0, len(allKeys))
	for flagKey := range allKeys {
		resA := resultsA[flagKey]
		resB := resultsB[flagKey]
		comparison = append(comparison, EntityComparisonResult{
			FlagKey:     flagKey,
			ValueA:      resA.Value,
			ValueB:      resB.Value,
			ReasonA:     resA.Reason,
			ReasonB:     resB.Reason,
			IsDifferent: isDifferentValue(resA.Value, resB.Value),
		})
	}
	sort.Slice(comparison, func(i, j int) bool { return comparison[i].FlagKey < comparison[j].FlagKey })

	httputil.JSON(w, http.StatusOK, comparison)
}

// --- Flag Usage Insights ---

// FlagInsights returns per-flag value distribution for a given environment.
func (h *InsightsHandler) FlagInsights(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	envID := chi.URLParam(r, "envID")
	if envID == "" {
		httputil.Error(w, http.StatusBadRequest, "environment ID is required")
		return
	}

	insights := h.collector.Insights(envID)
	sort.Slice(insights, func(i, j int) bool { return insights[i].FlagKey < insights[j].FlagKey })

	httputil.JSON(w, http.StatusOK, insights)
}

// --- Helpers ---

func (h *InsightsHandler) loadRuleset(w http.ResponseWriter, r *http.Request, projectID, envID string) (*domain.Ruleset, error) {
	ruleset := h.cache.GetRuleset(envID)
	if ruleset == nil {
		var err error
		ruleset, err = h.cache.LoadRuleset(r.Context(), projectID, envID)
		if err != nil {
			logger := httputil.LoggerFromContext(r.Context())
			logger.Error("failed to load ruleset", "error", err, "project_id", projectID, "env_id", envID)
			httputil.Error(w, http.StatusInternalServerError, "failed to load ruleset")
			return nil, err
		}
	}
	return ruleset, nil
}

func isDifferentValue(a, b interface{}) bool {
	if a == nil && b == nil {
		return false
	}
	if a == nil || b == nil {
		return true
	}
	return a != b
}
