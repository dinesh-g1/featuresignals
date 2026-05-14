package handlers

import (
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
	p := dto.ParsePagination(r)

	items, err := h.store.ListPinnedItems(r.Context(), orgID, userID, projectID, p.Limit, p.Offset)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "Pinned items listing failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	total, _ := h.store.CountPinnedItems(r.Context(), orgID, userID, projectID)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(dto.PinnedItemsFromDomain(items), total, p.Limit, p.Offset))
}

func (h *PinnedHandler) Create(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	var payload dto.CreatePinnedItemPayload
	if err := httputil.DecodeJSON(r, &payload); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}
	if payload.ProjectID == "" || payload.ResourceType == "" || payload.ResourceID == "" {
		httputil.Error(w, http.StatusBadRequest, "Pinning blocked — project_id, resource_type, and resource_id are required fields. Provide all three.")
		return
	}

	item, err := h.store.CreatePinnedItem(r.Context(), orgID, userID, payload.ProjectID, payload.ResourceType, payload.ResourceID)
	if err != nil {
		httputil.Error(w, http.StatusInternalServerError, "Pin operation failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	httputil.JSON(w, http.StatusCreated, dto.PinnedItemFromDomain(*item))
}

func (h *PinnedHandler) Delete(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())
	pinnedItemID := chi.URLParam(r, "pinnedID")

	if err := h.store.DeletePinnedItem(r.Context(), orgID, userID, pinnedItemID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "Unpin operation failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	w.WriteHeader(http.StatusNoContent)
}
