package handlers

import (
	"net/http"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type SearchHandler struct {
	store domain.SearchStore
}

func NewSearchHandler(store domain.SearchStore) *SearchHandler {
	return &SearchHandler{store: store}
}

func (h *SearchHandler) Search(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	q := r.URL.Query().Get("q")
	if q == "" {
		httputil.Error(w, http.StatusBadRequest, "query parameter 'q' is required")
		return
	}
	projectID := r.URL.Query().Get("project_id")

	hits, err := h.store.Search(r.Context(), orgID, projectID, q)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "search failed")
		return
	}

	// Group hits by category
	results := make(map[string][]dto.SearchHit)
	total := 0
	for _, hit := range hits {
		category := hit.Category
		results[category] = append(results[category], dto.SearchHit{
			ID:          hit.ID,
			Label:       hit.Label,
			Description: hit.Description,
			Category:    hit.Category,
			Href:        hit.Href,
		})
		total++
	}

	resp := dto.SearchResponse{
		Query:   q,
		Results: results,
		Total:   total,
	}
	httputil.JSON(w, http.StatusOK, resp)
}

// Suggest provides search autocomplete/suggestions for the global search bar.
// Returns a flat list of matching items (up to 10) ordered by relevance.
// Accepts a query parameter "q" and optional "project_id" for scoping.
// Results are returned as a simple array for fast rendering in dropdowns.
func (h *SearchHandler) Suggest(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	q := r.URL.Query().Get("q")
	if q == "" {
		// No query — return empty array (not an error; user hasn't typed yet)
		httputil.JSON(w, http.StatusOK, []dto.SearchHit{})
		return
	}
	projectID := r.URL.Query().Get("project_id")

	hits, err := h.store.Search(r.Context(), orgID, projectID, q)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "suggest failed")
		return
	}

	// Return top 10 results as a flat list optimized for dropdown rendering.
	// The Search method already returns results ordered by relevance.
	limit := 10
	results := make([]dto.SearchHit, 0, limit)
	for i, hit := range hits {
		if i >= limit {
			break
		}
		results = append(results, dto.SearchHit{
			ID:          hit.ID,
			Label:       hit.Label,
			Description: hit.Description,
			Category:    hit.Category,
			Href:        hit.Href,
		})
	}
	if results == nil {
		results = []dto.SearchHit{}
	}

	httputil.JSON(w, http.StatusOK, results)
}
