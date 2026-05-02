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

type PinnedHandler struct {
	store domain.PinnedItemsStore
}

func NewPinnedHandler(store domain.PinnedItemsStore) *PinnedHandler {
	return &PinnedHandler{store: store}
}

func (h *PinnedHandler) List(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	projectID := chi.URLParam(r, "projectID")

	items, err := h.store.ListPinnedItems(r.Context(), orgID, userID, projectID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to list pinned items")
		return
	}

	resp := dto.PinnedItemsResponse{Items: dto.PinnedItemsFromDomain(items)}
	httputil.JSON(w, http.StatusOK, resp)
}

func (h *PinnedHandler) Create(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	var payload dto.CreatePinnedItemPayload
	if err := json.NewDecoder(r.Body).Decode(&payload); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if payload.ProjectID == "" || payload.ResourceType == "" || payload.ResourceID == "" {
		httputil.Error(w, http.StatusBadRequest, "project_id, resource_type, resource_id are required")
		return
	}

	item, err := h.store.CreatePinnedItem(r.Context(), orgID, userID, payload.ProjectID, payload.ResourceType, payload.ResourceID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to pin item")
		return
	}

	httputil.JSON(w, http.StatusCreated, dto.PinnedItemFromDomain(*item))
}

func (h *PinnedHandler) Delete(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	pinnedItemID := chi.URLParam(r, "pinnedID")

	if err := h.store.DeletePinnedItem(r.Context(), orgID, userID, pinnedItemID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to unpin item")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
