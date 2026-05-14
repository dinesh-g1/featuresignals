// Package handlers provides HTTP handlers for flag version history and rollback.
//
// Flag versioning enables:
// - Audit trail of all flag configuration changes
// - Rollback to any previous version
// - Diff viewing between versions
package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"strconv"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// FlagHistoryHandler handles flag version history and rollback endpoints.
type FlagHistoryHandler struct {
	store domain.FlagVersionStore
}

// NewFlagHistoryHandler creates a new flag history handler.
func NewFlagHistoryHandler(store domain.FlagVersionStore) *FlagHistoryHandler {
	return &FlagHistoryHandler{store: store}
}

// ListVersions handles GET /v1/projects/{projectID}/flags/{flagKey}/history
// Returns paginated list of flag versions.
func (h *FlagHistoryHandler) ListVersions(w http.ResponseWriter, r *http.Request) {
	flagKey := chi.URLParam(r, "flagKey")
	projectID := chi.URLParam(r, "projectID")

	// Parse pagination using standard parser
	p := dto.ParsePagination(r)

	// Get flag to resolve flagID from projectID+key
	// Note: This handler depends on FlagReader to resolve flagID
	flagReader, ok := h.store.(interface {
		GetFlag(ctx context.Context, projectID, key string) (*domain.Flag, error)
	})
	if !ok {
		httputil.Error(w, http.StatusInternalServerError, "Configuration error — the storage backend does not support flag lookup. This is a server configuration issue. Contact support.")
		return
	}

	flag, err := flagReader.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Feature lookup failed — no feature matches the provided key. Verify the feature key and project ID are correct.")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "Feature retrieval failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	versions, err := h.store.ListFlagVersions(r.Context(), flag.ID, p.Limit, p.Offset)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "Version listing failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	total, _ := h.store.CountFlagVersions(r.Context(), flag.ID)

	// Convert to response format
	type versionResponse struct {
		ID           string          `json:"id"`
		Version      int             `json:"version"`
		Config       json.RawMessage `json:"config"`
		ChangedBy    *string         `json:"changed_by,omitempty"`
		ChangeReason *string         `json:"change_reason,omitempty"`
		CreatedAt    string          `json:"created_at"`
	}

	resp := make([]versionResponse, len(versions))
	for i, v := range versions {
		resp[i] = versionResponse{
			ID:           v.ID,
			Version:      v.Version,
			Config:       v.Config,
			ChangedBy:    v.ChangedBy,
			ChangeReason: v.ChangeReason,
			CreatedAt:    v.CreatedAt.Format("2006-01-02T15:04:05Z"),
		}
	}

	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(resp, total, p.Limit, p.Offset))
}

// GetVersion handles GET /v1/projects/{projectID}/flags/{flagKey}/history/{version}
// Returns a specific flag version with diff from previous version.
func (h *FlagHistoryHandler) GetVersion(w http.ResponseWriter, r *http.Request) {
	flagKey := chi.URLParam(r, "flagKey")
	projectID := chi.URLParam(r, "projectID")
	versionStr := chi.URLParam(r, "version")

	version, err := strconv.Atoi(versionStr)
	if err != nil || version < 1 {
		httputil.Error(w, http.StatusBadRequest, "Version lookup blocked — the version number is invalid. Provide a positive integer version number.")
		return
	}

	// Resolve flag ID
	flagReader, ok := h.store.(interface {
		GetFlag(ctx context.Context, projectID, key string) (*domain.Flag, error)
	})
	if !ok {
		httputil.Error(w, http.StatusInternalServerError, "Configuration error — the storage backend does not support flag lookup. This is a server configuration issue. Contact support.")
		return
	}

	flag, err := flagReader.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Feature lookup failed — no feature matches the provided key. Verify the feature key and project ID are correct.")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "Feature retrieval failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	flagVersion, err := h.store.GetFlagVersion(r.Context(), flag.ID, version)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Version lookup failed — the requested version does not exist. Check the version number and try again.")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "Version retrieval failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"id":              flagVersion.ID,
		"flag_id":         flagVersion.FlagID,
		"version":         flagVersion.Version,
		"config":          flagVersion.Config,
		"previous_config": flagVersion.PreviousConfig,
		"changed_by":      flagVersion.ChangedBy,
		"change_reason":   flagVersion.ChangeReason,
		"created_at":      flagVersion.CreatedAt.Format("2006-01-02T15:04:05Z"),
	})
}

// Rollback handles POST /v1/projects/{projectID}/flags/{flagKey}/rollback
// Rolls back a flag to a previous version.
func (h *FlagHistoryHandler) Rollback(w http.ResponseWriter, r *http.Request) {
	flagKey := chi.URLParam(r, "flagKey")
	projectID := chi.URLParam(r, "projectID")

	var req struct {
		Version int    `json:"version"`
		Reason  string `json:"reason,omitempty"`
	}

	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.Version < 1 {
		httputil.Error(w, http.StatusBadRequest, "Revert blocked — the version number must be 1 or greater. Specify a valid version to revert to.")
		return
	}

	// Resolve flag ID
	flagReader, ok := h.store.(interface {
		GetFlag(ctx context.Context, projectID, key string) (*domain.Flag, error)
	})
	if !ok {
		httputil.Error(w, http.StatusInternalServerError, "Configuration error — the storage backend does not support flag lookup. This is a server configuration issue. Contact support.")
		return
	}

	flag, err := flagReader.GetFlag(r.Context(), projectID, flagKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Feature lookup failed — no feature matches the provided key. Verify the feature key and project ID are correct.")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "Feature retrieval failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	// Get user ID from context (set by JWT middleware)
	userID := ""
	if id := r.Context().Value(middleware.UserIDKey); id != nil {
		if s, ok := id.(string); ok {
			userID = s
		}
	}

	reason := req.Reason
	if reason == "" {
		reason = "Revert to version " + strconv.Itoa(req.Version)
	}

	if err := h.store.RollbackFlagToVersion(r.Context(), flag.ID, req.Version, userID, reason); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "Version lookup failed — the requested version does not exist. Check the version number and try again.")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "Revert failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"message": "feature reverted to version " + strconv.Itoa(req.Version),
		"version": req.Version,
	})
}

// RegisterRoutes registers flag history routes.
func (h *FlagHistoryHandler) RegisterRoutes(r chi.Router) {
	r.Get("/", h.ListVersions)
	r.Get("/{version}", h.GetVersion)
	r.Post("/rollback", h.Rollback)
}
