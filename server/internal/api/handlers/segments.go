package handlers

import (
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type SegmentHandler struct {
	store domain.Store
}

func NewSegmentHandler(store domain.Store) *SegmentHandler {
	return &SegmentHandler{store: store}
}

type UpdateSegmentRequest struct {
	Name        *string            `json:"name"`
	Description *string            `json:"description"`
	MatchType   *string            `json:"match_type"`
	Rules       []domain.Condition `json:"rules"`
}

type CreateSegmentRequest struct {
	Key         string            `json:"key"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	MatchType   string            `json:"match_type"`
	Rules       []domain.Condition `json:"rules"`
}

func (h *SegmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
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
	if !validateFlagKey(req.Key) {
		httputil.Error(w, http.StatusBadRequest, "key must match pattern: lowercase alphanumeric, hyphens, underscores (max 128 chars)")
		return
	}
	if !validateStringLength(req.Name, 255) {
		httputil.Error(w, http.StatusBadRequest, "name must be at most 255 characters")
		return
	}
	if !validateStringLength(req.Description, 2000) {
		httputil.Error(w, http.StatusBadRequest, "description must be at most 2000 characters")
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

	httputil.JSON(w, http.StatusCreated, dto.SegmentFromDomain(seg))
}

func (h *SegmentHandler) List(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	segments, err := h.store.ListSegments(r.Context(), projectID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list segments")
		return
	}
	if segments == nil {
		segments = []domain.Segment{}
	}
	all := dto.SegmentSliceFromDomain(segments)
	p := dto.ParsePagination(r)
	page, total := dto.Paginate(all, p)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(page, total, p.Limit, p.Offset))
}

func (h *SegmentHandler) Get(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	segKey := chi.URLParam(r, "segmentKey")

	seg, err := h.store.GetSegment(r.Context(), projectID, segKey)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "segment not found")
		return
	}
	httputil.JSON(w, http.StatusOK, dto.SegmentFromDomain(seg))
}

func (h *SegmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	projectID := chi.URLParam(r, "projectID")
	segKey := chi.URLParam(r, "segmentKey")

	seg, err := h.store.GetSegment(r.Context(), projectID, segKey)
	if err != nil {
		httputil.Error(w, http.StatusNotFound, "segment not found")
		return
	}

	var req UpdateSegmentRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name != nil {
		seg.Name = *req.Name
	}
	if req.Description != nil {
		seg.Description = *req.Description
	}
	if req.MatchType != nil {
		seg.MatchType = domain.MatchType(*req.MatchType)
	}
	if req.Rules != nil {
		seg.Rules = req.Rules
	}

	if err := h.store.UpdateSegment(r.Context(), seg); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to update segment")
		return
	}

	httputil.JSON(w, http.StatusOK, dto.SegmentFromDomain(seg))
}

func (h *SegmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
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
