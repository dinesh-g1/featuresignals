package handlers

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strings"

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
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
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
	p := dto.ParsePagination(r)

	var (
		segments []domain.Segment
		total    int
		err      error
	)
	labelSelector := r.URL.Query().Get("label_selector")
	if labelSelector != "" {
		orgID := middleware.GetOrgID(r.Context())
		segments, err = h.store.ListSegmentsWithFilter(r.Context(), orgID, projectID, labelSelector, p.Limit, p.Offset)
		total, _ = h.store.CountSegmentsWithFilter(r.Context(), orgID, projectID, labelSelector)
		if err != nil {
			logger.Error("failed to list segments with filter", "error", err, "project_id", projectID, "label_selector", labelSelector)
			httputil.Error(w, http.StatusInternalServerError, "failed to list segments")
			return
		}
	} else {
		sortField, sortDir := dto.ParseSort(r, "segments")
		if sortField != "created_at" || sortDir != "DESC" {
			segments, err = h.store.ListSegmentsSorted(r.Context(), projectID, sortField, sortDir, p.Limit, p.Offset)
		} else {
			segments, err = h.store.ListSegments(r.Context(), projectID, p.Limit, p.Offset)
		}
		total, _ = h.store.CountSegmentsByProject(r.Context(), projectID)
		if err != nil {
			logger.Error("failed to list segments", "error", err, "project_id", projectID)
			httputil.Error(w, http.StatusInternalServerError, "failed to list segments")
			return
		}
	}
	if segments == nil {
		segments = []domain.Segment{}
	}
	all := dto.SegmentSliceFromDomain(segments)
	links := domain.LinksForSegmentsCollection(projectID)
	logger.Info("segments listed", "limit", p.Limit, "offset", p.Offset, "total", total)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(all, total, p.Limit, p.Offset, links...))
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
	resp := dto.SegmentFromDomain(seg)
	respWithLinks := map[string]interface{}{
		"segment": resp,
		"_links":  domain.LinksForSegment(projectID, segKey),
	}
	httputil.JSON(w, http.StatusOK, respWithLinks)
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
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
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

// Evaluate tests whether a given entity matches this segment's rules.
// The request body contains an entity (a map of attribute-value pairs).
// Returns the match result and which rules contributed to the decision.
// This is a diagnostic/testing endpoint — it does not require a flag context.
func (h *SegmentHandler) Evaluate(w http.ResponseWriter, r *http.Request) {
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

	var entity map[string]interface{}
	if err := httputil.DecodeJSON(r, &entity); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid entity: expected JSON object with attribute-value pairs")
		return
	}

	// Convert entity to domain.EvalContext for rule matching.
	// Extract the "key" field if present; everything else goes into Attributes.
	entityKey, _ := entity["key"].(string)
	attrs := make(map[string]interface{}, len(entity))
	for k, v := range entity {
		if k != "key" {
			attrs[k] = v
		}
	}
	evalCtx := domain.EvalContext{Key: entityKey, Attributes: attrs}

	// Evaluate segment rules against the entity
	matched, matchedRules := evaluateSegmentRules(seg, evalCtx)

	type evaluateResponse struct {
		SegmentKey  string   `json:"segment_key"`
		SegmentName string   `json:"segment_name"`
		Matched     bool     `json:"matched"`
		MatchType   string   `json:"match_type"`
		TotalRules  int      `json:"total_rules"`
		RulesMatched int     `json:"rules_matched"`
	}

	ruleCount := len(seg.Rules)
	matchedCount := 0
	if matched {
		matchedCount = len(matchedRules)
	}

	httputil.JSON(w, http.StatusOK, evaluateResponse{
		SegmentKey:   seg.Key,
		SegmentName:  seg.Name,
		Matched:      matched,
		MatchType:    string(seg.MatchType),
		TotalRules:   ruleCount,
		RulesMatched: matchedCount,
	})
}

// evaluateSegmentRules checks whether the given entity matches the segment's
// rules according to the segment's match type (all or any). Returns whether
// the entity matches and which rules contributed to the match.
func evaluateSegmentRules(seg *domain.Segment, ctx domain.EvalContext) (bool, []domain.Condition) {
	if seg == nil || len(seg.Rules) == 0 {
		return false, nil
	}

	var matched []domain.Condition
	for _, rule := range seg.Rules {
		if segmentRuleMatches(rule, ctx) {
			matched = append(matched, rule)
		}
	}

	switch seg.MatchType {
	case domain.MatchAny:
		return len(matched) > 0, matched
	case domain.MatchAll:
		return len(matched) == len(seg.Rules), matched
	default:
		return len(matched) > 0, matched
	}
}

// segmentRuleMatches evaluates a single segment rule against the entity context.
func segmentRuleMatches(rule domain.Condition, ctx domain.EvalContext) bool {
	attrValue, exists := ctx.GetAttribute(rule.Attribute)
	if !exists {
		return false
	}
	attrStr, ok := attrValue.(string)
	if !ok {
		attrStr = fmt.Sprintf("%v", attrValue)
	}

	switch rule.Operator {
	case domain.OpEquals:
		return len(rule.Values) > 0 && attrStr == rule.Values[0]
	case domain.OpNotEquals:
		return len(rule.Values) > 0 && attrStr != rule.Values[0]
	case domain.OpContains:
		for _, v := range rule.Values {
			if strings.Contains(attrStr, v) {
				return true
			}
		}
		return false
	case domain.OpStartsWith:
		for _, v := range rule.Values {
			if strings.HasPrefix(attrStr, v) {
				return true
			}
		}
		return false
	case domain.OpEndsWith:
		for _, v := range rule.Values {
			if strings.HasSuffix(attrStr, v) {
				return true
			}
		}
		return false
	case domain.OpIn:
		for _, v := range rule.Values {
			if attrStr == v {
				return true
			}
		}
		return false
	case domain.OpNotIn:
		for _, v := range rule.Values {
			if attrStr == v {
				return false
			}
		}
		return true
	default:
		return false
	}
}
