package handlers

import (
	"encoding/json"
	"net/http"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type approvalHandlerStore interface {
	domain.ApprovalStore
	domain.FlagReader
	domain.FlagWriter
	domain.AuditWriter
}

type ApprovalHandler struct {
	store approvalHandlerStore
}

func NewApprovalHandler(store approvalHandlerStore) *ApprovalHandler {
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
	logger := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	var req CreateApprovalRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}
	if req.FlagID == "" || req.EnvID == "" || req.ChangeType == "" {
		httputil.Error(w, http.StatusBadRequest, "Approval creation blocked — flag_id, env_id, and change_type are required fields. Provide all three.")
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
		logger.Error("Approval creation failed — an unexpected error occurred on the server. Try again or contact support.", "error", err, "flag_id", req.FlagID, "env_id", req.EnvID)
		httputil.Error(w, http.StatusInternalServerError, "Approval creation failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	httputil.JSON(w, http.StatusCreated, dto.ApprovalFromDomain(ar))
}

// List returns approval requests for the org, optionally filtered by status.
func (h *ApprovalHandler) List(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context())
	orgID := middleware.GetOrgID(r.Context())
	status := r.URL.Query().Get("status")
	p := dto.ParsePagination(r)

	results, err := h.store.ListApprovalRequests(r.Context(), orgID, status, p.Limit, p.Offset)
	if err != nil {
		logger.Error("failed to list approval requests", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Approval listing failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}
	if results == nil {
		results = []domain.ApprovalRequest{}
	}

	total, err := h.store.CountApprovalRequests(r.Context(), orgID, status)
	if err != nil {
		logger.Error("failed to count approval requests", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Approval counting failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	all := dto.ApprovalSliceFromDomain(results)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(all, total, p.Limit, p.Offset))
}

// Get returns a single approval request.
func (h *ApprovalHandler) Get(w http.ResponseWriter, r *http.Request) {
	ar, ok := verifyApprovalOwnership(h.store, r, w)
	if !ok {
		return
	}
	httputil.JSON(w, http.StatusOK, dto.ApprovalFromDomain(ar))
}

type ReviewRequest struct {
	Action string `json:"action"` // "approve" or "reject"
	Note   string `json:"note"`
}

// Review approves or rejects a pending request. If approved, the change is applied.
func (h *ApprovalHandler) Review(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context())
	ar, ok := verifyApprovalOwnership(h.store, r, w)
	if !ok {
		return
	}

	var req ReviewRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	userID := middleware.GetUserID(r.Context())
	if err := ar.ProcessDecision(req.Action, req.Note, userID); err != nil {
		status := http.StatusBadRequest
		if err.Error() == "approval request is no longer pending" {
			status = http.StatusConflict
		} else if err.Error() == "cannot review your own request" {
			status = http.StatusForbidden
		}
		httputil.Error(w, status, err.Error())
		return
	}

	if err := h.store.UpdateApprovalRequest(r.Context(), ar); err != nil {
		logger.Error("failed to update approval request", "error", err, "approval_id", ar.ID)
		httputil.Error(w, http.StatusInternalServerError, "Approval update failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	// If approved, apply the change
	if ar.Status == domain.ApprovalApproved {
		if err := h.applyChange(r, ar); err != nil {
			logger.Error("failed to apply approved change", "error", err, "approval_id", ar.ID, "flag_id", ar.FlagID, "env_id", ar.EnvID)
			ar.Status = domain.ApprovalApproved // keep approved but note the failure
		} else {
			ar.Status = domain.ApprovalApplied
			if err := h.store.UpdateApprovalRequest(r.Context(), ar); err != nil {
				logger.Error("failed to mark approval as applied", "error", err, "approval_id", ar.ID)
			}
		}
	}

	httputil.JSON(w, http.StatusOK, dto.ApprovalFromDomain(ar))
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
