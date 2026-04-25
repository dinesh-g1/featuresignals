package handlers

import (
	"context"
	"crypto/rand"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/go-chi/chi/v5"
)

// ─── View Models ──────────────────────────────────────────────────────

// Preview represents a temporary preview environment for demos or testing.
// Previews are short-lived and auto-expire after a configured TTL.
// This is a local view model — not persisted in the database.
type Preview struct {
	ID          string     `json:"id"`
	Name        string     `json:"name"`
	Description string     `json:"description,omitempty"`
	OrgID       string     `json:"org_id,omitempty"`
	CreatorID   string     `json:"creator_id"`
	Status      string     `json:"status"` // active, expiring, expired
	URL         string     `json:"url,omitempty"`
	ExpiresAt   time.Time  `json:"expires_at"`
	ExpiredAt   *time.Time `json:"expired_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
	UpdatedAt   time.Time  `json:"updated_at"`
}

// inMemoryPreviewStore provides a thread-safe in-memory preview store for MVP.
// In production, this would be replaced with a database-backed implementation.
type inMemoryPreviewStore struct {
	mu       sync.RWMutex
	previews map[string]*Preview
}

func newInMemoryPreviewStore() *inMemoryPreviewStore {
	return &inMemoryPreviewStore{
		previews: make(map[string]*Preview),
	}
}

func (s *inMemoryPreviewStore) List(_ context.Context, status string) ([]Preview, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	result := make([]Preview, 0, len(s.previews))
	for _, p := range s.previews {
		if status != "" && p.Status != status {
			continue
		}
		result = append(result, *p)
	}
	return result, nil
}

func (s *inMemoryPreviewStore) Create(_ context.Context, p *Preview) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	// Check for duplicate name (in-memory uniqueness check).
	for _, existing := range s.previews {
		if existing.Name == p.Name && existing.Status != "expired" {
			return domain.ErrConflict
		}
	}

	clone := *p
	s.previews[p.ID] = &clone
	return nil
}

func (s *inMemoryPreviewStore) Get(_ context.Context, id string) (*Preview, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	p, ok := s.previews[id]
	if !ok {
		return nil, domain.ErrNotFound
	}
	clone := *p
	return &clone, nil
}

func (s *inMemoryPreviewStore) Delete(_ context.Context, id string) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	if _, ok := s.previews[id]; !ok {
		return domain.ErrNotFound
	}
	delete(s.previews, id)
	return nil
}

// ─── Handler ──────────────────────────────────────────────────────────

// OpsPreviewsHandler serves preview management endpoints for the ops portal.
type OpsPreviewsHandler struct {
	store    domain.Store
	previews *inMemoryPreviewStore
	logger   *slog.Logger
}

// NewOpsPreviewsHandler creates a new ops previews handler.
func NewOpsPreviewsHandler(store domain.Store, logger *slog.Logger) *OpsPreviewsHandler {
	return &OpsPreviewsHandler{
		store:    store,
		previews: newInMemoryPreviewStore(),
		logger:   logger,
	}
}

// List handles GET /api/v1/ops/previews
func (h *OpsPreviewsHandler) List(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_previews_list")
	status := r.URL.Query().Get("status")

	previews, err := h.previews.List(r.Context(), status)
	if err != nil {
		log.Error("failed to list previews", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list previews")
		return
	}

	if previews == nil {
		previews = []Preview{}
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"previews": previews,
		"total":    len(previews),
	})
}

// Create handles POST /api/v1/ops/previews
func (h *OpsPreviewsHandler) Create(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_previews_create")

	var req struct {
		Name        string `json:"name"`
		Description string `json:"description,omitempty"`
		OrgID       string `json:"org_id,omitempty"`
		TTLHours    int    `json:"ttl_hours,omitempty"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "name is required")
		return
	}

	if req.TTLHours <= 0 {
		req.TTLHours = 24 // Default 24-hour TTL
	}
	if req.TTLHours > 168 {
		req.TTLHours = 168 // Max 7 days
	}

	now := time.Now().UTC()
	preview := &Preview{
		ID:          generatePreviewID(),
		Name:        req.Name,
		Description: req.Description,
		OrgID:       req.OrgID,
		Status:      "active",
		ExpiresAt:   now.Add(time.Duration(req.TTLHours) * time.Hour),
		CreatedAt:   now,
		UpdatedAt:   now,
	}

	if err := h.previews.Create(r.Context(), preview); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "preview with this name already exists")
			return
		}
		log.Error("failed to create preview", "error", err, "name", req.Name)
		httputil.Error(w, http.StatusInternalServerError, "failed to create preview")
		return
	}

	log.Info("preview created", "preview_id", preview.ID, "name", preview.Name, "ttl_hours", req.TTLHours)
	httputil.JSON(w, http.StatusCreated, preview)
}

// Delete handles DELETE /api/v1/ops/previews/{id}
func (h *OpsPreviewsHandler) Delete(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_previews_delete")
	id := chi.URLParam(r, "id")

	if err := h.previews.Delete(r.Context(), id); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "preview not found")
			return
		}
		log.Error("failed to delete preview", "error", err, "preview_id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to delete preview")
		return
	}

	log.Info("preview deleted", "preview_id", id)
	w.WriteHeader(http.StatusNoContent)
}

// generatePreviewID creates a short, readable preview ID.
func generatePreviewID() string {
	b := make([]byte, 6)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("preview-%d", time.Now().UnixNano())
	}
	return fmt.Sprintf("prev_%x", b)
}