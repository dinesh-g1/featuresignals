package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type SegmentHandler struct {
	store domain.Store
}

func NewSegmentHandler(store domain.Store) *SegmentHandler {
	return &SegmentHandler{store: store}
}

type CreateSegmentRequest struct {
	Key         string            `json:"key"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	MatchType   string            `json:"match_type"`
	Rules       []domain.Condition `json:"rules"`
}

func (h *SegmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")

	var req CreateSegmentRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Key == "" || req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "key and name are required")
		return
	}

	matchType := domain.MatchType(req.MatchType)
	if matchType == "" {
		matchType = domain.MatchAll
	}

	seg := &domain.Segment{
		ProjectID:   projectID,
		Key:         req.Key,
		Name:        req.Name,
		Description: req.Description,
		MatchType:   matchType,
		Rules:       req.Rules,
	}

	if err := h.store.CreateSegment(r.Context(), seg); err != nil {
		httputil.Error(w, http.StatusConflict, "segment key already exists in this project")
		return
	}

	httputil.JSON(w, http.StatusCreated, seg)
}

func (h *SegmentHandler) List(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")
	segments, err := h.store.ListSegments(r.Context(), projectID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list segments")
		return
	}
	if segments == nil {
		segments = []domain.Segment{}
	}
	httputil.JSON(w, http.StatusOK, segments)
}

func (h *SegmentHandler) Get(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")
	segKey := chi.URLParam(r, "segmentKey")

	seg, err := h.store.GetSegment(r.Context(), projectID, segKey)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "segment not found")
		return
	}
	httputil.JSON(w, http.StatusOK, seg)
}

func (h *SegmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	projectID := chi.URLParam(r, "projectID")
	segKey := chi.URLParam(r, "segmentKey")

	seg, err := h.store.GetSegment(r.Context(), projectID, segKey)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "segment not found")
		return
	}

	if err := h.store.DeleteSegment(r.Context(), seg.ID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to delete segment")
		return
	}
	w.WriteHeader(http.StatusNoContent)
}
