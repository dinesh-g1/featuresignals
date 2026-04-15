package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type segmentStore interface {
	domain.SegmentStore
	domain.AuditWriter
	projectGetter
}

type SegmentHandler struct {
	store segmentStore
}

func NewSegmentHandler(store segmentStore) *SegmentHandler {
	return &SegmentHandler{store: store}
}

type UpdateSegmentRequest struct {
	Name        *string            `json:"name"`
	Description *string            `json:"description"`
	MatchType   *string            `json:"match_type"`
	Rules       []domain.Condition `json:"rules"`
}

type CreateSegmentRequest struct {
	Key         string             `json:"key"`
	Name        string             `json:"name"`
	Description string             `json:"description"`
	MatchType   string             `json:"match_type"`
	Rules       []domain.Condition `json:"rules"`
}

func (h *SegmentHandler) Create(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	logger := httputil.LoggerFromContext(r.Context())
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

	orgID := middleware.GetOrgID(r.Context())
	seg := &domain.Segment{
		ProjectID:   projectID,
		OrgID:       orgID,
		Key:         req.Key,
		Name:        req.Name,
		Description: req.Description,
		MatchType:   matchType,
		Rules:       req.Rules,
	}

	if err := h.store.CreateSegment(r.Context(), seg); err != nil {
		logger.Warn("failed to create segment", "error", err, "project_id", projectID, "segment_key", req.Key)
		httputil.Error(w, http.StatusConflict, "segment key already exists in this project")
		return
	}
	userID := middleware.GetUserID(r.Context())
	afterState, _ := json.Marshal(seg)
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ProjectID: &projectID, ActorID: &userID, ActorType: "user",
		Action: "segment.created", ResourceType: "segment", ResourceID: &seg.ID,
		AfterState: afterState, IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	httputil.JSON(w, http.StatusCreated, dto.SegmentFromDomain(seg))
}

func (h *SegmentHandler) List(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	logger := httputil.LoggerFromContext(r.Context())
	projectID := chi.URLParam(r, "projectID")
	segments, err := h.store.ListSegments(r.Context(), projectID)
	if err != nil {
		logger.Error("failed to list segments", "error", err, "project_id", projectID)
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
	logger := httputil.LoggerFromContext(r.Context())
	projectID := chi.URLParam(r, "projectID")
	segKey := chi.URLParam(r, "segmentKey")

	seg, err := h.store.GetSegment(r.Context(), projectID, segKey)
	if err != nil {
		logger.Warn("failed to get segment", "error", err, "project_id", projectID, "segment_key", segKey)
		httputil.Error(w, http.StatusNotFound, "segment not found")
		return
	}
	httputil.JSON(w, http.StatusOK, dto.SegmentFromDomain(seg))
}

func (h *SegmentHandler) Update(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	logger := httputil.LoggerFromContext(r.Context())
	projectID := chi.URLParam(r, "projectID")
	segKey := chi.URLParam(r, "segmentKey")

	seg, err := h.store.GetSegment(r.Context(), projectID, segKey)
	if err != nil {
		logger.Warn("failed to get segment", "error", err, "project_id", projectID, "segment_key", segKey)
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

	beforeState, _ := json.Marshal(seg)
	if err := h.store.UpdateSegment(r.Context(), seg); err != nil {
		logger.Error("failed to update segment", "error", err, "project_id", projectID, "segment_key", segKey)
		httputil.Error(w, http.StatusInternalServerError, "failed to update segment")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	afterState, _ := json.Marshal(seg)
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ProjectID: &projectID, ActorID: &userID, ActorType: "user",
		Action: "segment.updated", ResourceType: "segment", ResourceID: &seg.ID,
		BeforeState: beforeState, AfterState: afterState,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	httputil.JSON(w, http.StatusOK, dto.SegmentFromDomain(seg))
}

func (h *SegmentHandler) Delete(w http.ResponseWriter, r *http.Request) {
	if _, ok := verifyProjectOwnership(h.store, r, w); !ok {
		return
	}
	logger := httputil.LoggerFromContext(r.Context())
	projectID := chi.URLParam(r, "projectID")
	segKey := chi.URLParam(r, "segmentKey")

	seg, err := h.store.GetSegment(r.Context(), projectID, segKey)
	if err != nil {
		logger.Warn("failed to get segment", "error", err, "project_id", projectID, "segment_key", segKey)
		httputil.Error(w, http.StatusNotFound, "segment not found")
		return
	}

	beforeState, _ := json.Marshal(seg)
	if err := h.store.DeleteSegment(r.Context(), seg.ID); err != nil {
		logger.Error("failed to delete segment", "error", err, "project_id", projectID, "segment_key", segKey, "segment_id", seg.ID)
		httputil.Error(w, http.StatusInternalServerError, "failed to delete segment")
		return
	}

	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ProjectID: &projectID, ActorID: &userID, ActorType: "user",
		Action: "segment.deleted", ResourceType: "segment", ResourceID: &seg.ID,
		BeforeState: beforeState, IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	w.WriteHeader(http.StatusNoContent)
}
