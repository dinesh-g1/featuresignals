package handlers

import (
	"encoding/json"
	"net/http"
	"strconv"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type ApprovalHandler struct {
	store domain.Store
}

func NewApprovalHandler(store domain.Store) *ApprovalHandler {
	return &ApprovalHandler{store: store}
}

type CreateApprovalRequest struct {
	FlagID     string          `json:"flag_id"`
	EnvID      string          `json:"env_id"`
	ChangeType string          `json:"change_type"`
	Payload    json.RawMessage `json:"payload"`
}

// Create submits a new change request for review.
func (h *ApprovalHandler) Create(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	var req CreateApprovalRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.FlagID == "" || req.EnvID == "" || req.ChangeType == "" {
		httputil.Error(w, http.StatusBadRequest, "flag_id, env_id, and change_type are required")
		return
	}

	ar := &domain.ApprovalRequest{
		OrgID:       orgID,
		RequestorID: userID,
		FlagID:      req.FlagID,
		EnvID:       req.EnvID,
		ChangeType:  req.ChangeType,
		Payload:     req.Payload,
		Status:      domain.ApprovalPending,
	}

	if err := h.store.CreateApprovalRequest(r.Context(), ar); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to create approval request")
		return
	}

	httputil.JSON(w, http.StatusCreated, ar)
}

// List returns approval requests for the org, optionally filtered by status.
func (h *ApprovalHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	status := r.URL.Query().Get("status")
	limit, _ := strconv.Atoi(r.URL.Query().Get("limit"))
	offset, _ := strconv.Atoi(r.URL.Query().Get("offset"))
	if limit <= 0 {
		limit = 50
	}

	results, err := h.store.ListApprovalRequests(r.Context(), orgID, status, limit, offset)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list approvals")
		return
	}
	if results == nil {
		results = []domain.ApprovalRequest{}
	}

	httputil.JSON(w, http.StatusOK, results)
}

// Get returns a single approval request.
func (h *ApprovalHandler) Get(w http.ResponseWriter, r *http.Request) {
	ar, ok := verifyApprovalOwnership(h.store, r, w)
	if !ok {
		return
	}
	httputil.JSON(w, http.StatusOK, ar)
}

type ReviewRequest struct {
	Action string `json:"action"` // "approve" or "reject"
	Note   string `json:"note"`
}

// Review approves or rejects a pending request. If approved, the change is applied.
func (h *ApprovalHandler) Review(w http.ResponseWriter, r *http.Request) {
	ar, ok := verifyApprovalOwnership(h.store, r, w)
	if !ok {
		return
	}
	userID := middleware.GetUserID(r.Context())
	if ar.Status != domain.ApprovalPending {
		httputil.Error(w, http.StatusConflict, "request is no longer pending")
		return
	}
	if ar.RequestorID == userID {
		httputil.Error(w, http.StatusForbidden, "cannot review your own request")
		return
	}

	var req ReviewRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	now := time.Now()
	ar.ReviewerID = &userID
	ar.ReviewNote = req.Note
	ar.ReviewedAt = &now

	switch req.Action {
	case "approve":
		ar.Status = domain.ApprovalApproved
	case "reject":
		ar.Status = domain.ApprovalRejected
	default:
		httputil.Error(w, http.StatusBadRequest, "action must be 'approve' or 'reject'")
		return
	}

	if err := h.store.UpdateApprovalRequest(r.Context(), ar); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to update approval")
		return
	}

	// If approved, apply the change
	if ar.Status == domain.ApprovalApproved {
		if err := h.applyChange(r, ar); err != nil {
			ar.Status = domain.ApprovalApproved // keep approved but note the failure
		} else {
			ar.Status = domain.ApprovalApplied
			h.store.UpdateApprovalRequest(r.Context(), ar)
		}
	}

	httputil.JSON(w, http.StatusOK, ar)
}

// applyChange applies the approved flag state change.
func (h *ApprovalHandler) applyChange(r *http.Request, ar *domain.ApprovalRequest) error {
	var state domain.FlagState
	if err := json.Unmarshal(ar.Payload, &state); err != nil {
		return err
	}
	state.FlagID = ar.FlagID
	state.EnvID = ar.EnvID

	existing, err := h.store.GetFlagState(r.Context(), ar.FlagID, ar.EnvID)
	if err == nil {
		state.ID = existing.ID
	}

	if err := h.store.UpsertFlagState(r.Context(), &state); err != nil {
		return err
	}

	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	afterState, _ := json.Marshal(state)
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID:        orgID,
		ActorID:      &userID,
		ActorType:    "user",
		Action:       "flag.approved_change_applied",
		ResourceType: "flag",
		ResourceID:   &ar.FlagID,
		AfterState:   afterState,
	})

	return nil
}
