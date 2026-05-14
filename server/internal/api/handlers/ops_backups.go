package handlers

import (
	"context"
	"crypto/rand"
	"fmt"
	"log/slog"
	"net/http"
	"sync"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/httputil"
)

// ─── View Models ──────────────────────────────────────────────────────

// BackupEntry represents a single backup operation in the system.
// Backups can be full or incremental and are stored in-memory for the ops portal.
type BackupEntry struct {
	ID          string     `json:"id"`
	Type        string     `json:"type"` // "full" or "incremental"
	SizeBytes   int64      `json:"size_bytes"`
	Status      string     `json:"status"` // "completed", "running", "failed"
	StartedAt   *time.Time `json:"started_at"`
	CompletedAt *time.Time `json:"completed_at,omitempty"`
	CreatedAt   time.Time  `json:"created_at"`
}

// BackupStatus holds the aggregated backup system status for the ops dashboard.
type BackupStatus struct {
	LastSuccessfulAt     *time.Time `json:"last_successful_at"`
	LastBackupSizeBytes  int64      `json:"last_backup_size_bytes"`
	TotalBackupSizeBytes int64      `json:"total_backup_size_bytes"`
	NextScheduledAt      time.Time  `json:"next_scheduled_at"`
	Schedule             string     `json:"schedule"`
	IsRunning            bool       `json:"is_running"`
}

// inMemoryBackupStore provides a thread-safe in-memory backup store for the ops portal.
// In production, this would be replaced with a database-backed implementation.
type inMemoryBackupStore struct {
	mu      sync.RWMutex
	backups []BackupEntry
	nextID  int
}

func newInMemoryBackupStore() *inMemoryBackupStore {
	now := time.Now().UTC()
	yesterday := now.Add(-24 * time.Hour)
	twoDaysAgo := now.Add(-48 * time.Hour)
	sixHoursAgo := now.Add(-6 * time.Hour)

	fullSize := int64(1_073_741_824) // 1 GB
	incSize := int64(268_435_456)    // 256 MB

	// ptr returns a pointer to the given time.
	ptr := func(t time.Time) *time.Time { return &t }

	return &inMemoryBackupStore{
		backups: []BackupEntry{
			{
				ID:          generateShortID(),
				Type:        "full",
				SizeBytes:   fullSize,
				Status:      "completed",
				StartedAt:   ptr(twoDaysAgo),
				CompletedAt: ptr(twoDaysAgo.Add(12 * time.Minute)),
				CreatedAt:   twoDaysAgo,
			},
			{
				ID:          generateShortID(),
				Type:        "incremental",
				SizeBytes:   incSize,
				Status:      "completed",
				StartedAt:   ptr(sixHoursAgo),
				CompletedAt: ptr(sixHoursAgo.Add(4 * time.Minute)),
				CreatedAt:   sixHoursAgo,
			},
			{
				ID:          generateShortID(),
				Type:        "full",
				SizeBytes:   fullSize,
				Status:      "completed",
				StartedAt:   ptr(yesterday),
				CompletedAt: ptr(yesterday.Add(10 * time.Minute)),
				CreatedAt:   yesterday,
			},
		},
		nextID: 4,
	}
}

// List returns a paginated list of backup entries and the total count.
func (s *inMemoryBackupStore) List(_ context.Context, limit, offset int) ([]BackupEntry, int, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	total := len(s.backups)

	if offset >= total {
		return []BackupEntry{}, total, nil
	}
	if limit <= 0 {
		limit = 50
	}
	if limit > 100 {
		limit = 100
	}

	end := offset + limit
	if end > total {
		end = total
	}

	result := make([]BackupEntry, 0, end-offset)
	for i := offset; i < end; i++ {
		result = append(result, s.backups[i])
	}
	return result, total, nil
}

// Create appends a new backup entry to the store.
func (s *inMemoryBackupStore) Create(_ context.Context, entry *BackupEntry) error {
	s.mu.Lock()
	defer s.mu.Unlock()

	s.backups = append(s.backups, *entry)
	return nil
}

// GetStatus computes the aggregated backup status from the stored entries.
func (s *inMemoryBackupStore) GetStatus(_ context.Context) (*BackupStatus, error) {
	s.mu.RLock()
	defer s.mu.RUnlock()

	now := time.Now().UTC()
	status := &BackupStatus{
		Schedule: "0 3 * * *",
		NextScheduledAt: time.Date(now.Year(), now.Month(), now.Day(), 3, 0, 0, 0, time.UTC),
	}

	if status.NextScheduledAt.Before(now) {
		status.NextScheduledAt = status.NextScheduledAt.Add(24 * time.Hour)
	}

	for _, b := range s.backups {
		if b.Status == "running" {
			status.IsRunning = true
		}
		if b.Status != "completed" {
			continue
		}
		status.TotalBackupSizeBytes += b.SizeBytes

		if status.LastSuccessfulAt == nil || (b.CompletedAt != nil && b.CompletedAt.After(*status.LastSuccessfulAt)) {
			status.LastSuccessfulAt = b.CompletedAt
			status.LastBackupSizeBytes = b.SizeBytes
		}
	}

	return status, nil
}

// ─── Handler ──────────────────────────────────────────────────────────

// OpsBackupsHandler serves backup management endpoints for the ops portal.
type OpsBackupsHandler struct {
	backups *inMemoryBackupStore
	logger  *slog.Logger
}

// NewOpsBackupsHandler creates a new ops backups handler.
func NewOpsBackupsHandler(logger *slog.Logger) *OpsBackupsHandler {
	return &OpsBackupsHandler{
		backups: newInMemoryBackupStore(),
		logger:  logger,
	}
}

// List handles GET /api/v1/ops/backups
func (h *OpsBackupsHandler) List(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_backups_list")

	limit := parseIntOrDefault(r.URL.Query().Get("limit"), 50)
	offset := parseIntOrDefault(r.URL.Query().Get("offset"), 0)

	backups, total, err := h.backups.List(r.Context(), limit, offset)
	if err != nil {
		log.Error("failed to list backups", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list backups")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"backups": backups,
		"total":   total,
	})
}

// Trigger handles POST /api/v1/ops/backups
// It creates a new backup entry with status "running", then simulates completion.
func (h *OpsBackupsHandler) Trigger(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_backups_trigger")
	now := time.Now().UTC()

	entry := &BackupEntry{
		ID:        generateShortID(),
		Type:      "full",
		SizeBytes: 0,
		Status:    "running",
		StartedAt: &now,
		CreatedAt: now,
	}

	if err := h.backups.Create(r.Context(), entry); err != nil {
		log.Error("failed to create backup", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to trigger backup")
		return
	}

	// Simulate backup completion for the response.
	completedAt := now.Add(30 * time.Second)
	entry.Status = "completed"
	entry.CompletedAt = &completedAt
	entry.SizeBytes = 1_073_741_824 // 1 GB

	log.Info("backup triggered", "backup_id", entry.ID)
	httputil.JSON(w, http.StatusCreated, entry)
}

// Restore handles POST /api/v1/ops/backups/{id}/restore
func (h *OpsBackupsHandler) Restore(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_backups_restore")
	id := chi.URLParam(r, "id")

	backups, _, err := h.backups.List(r.Context(), 0, 0)
	if err != nil {
		log.Error("failed to list backups for restore", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to initiate restore")
		return
	}

	found := false
	for _, b := range backups {
		if b.ID == id {
			found = true
			break
		}
	}
	if !found {
		httputil.Error(w, http.StatusNotFound, "backup not found")
		return
	}

	log.Info("backup restore initiated", "backup_id", id)
	httputil.JSON(w, http.StatusAccepted, map[string]string{
		"status":    "restore_initiated",
		"backup_id": id,
	})
}

// Status handles GET /api/v1/ops/backups/status
func (h *OpsBackupsHandler) Status(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_backups_status")

	status, err := h.backups.GetStatus(r.Context())
	if err != nil {
		log.Error("failed to get backup status", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to get backup status")
		return
	}

	httputil.JSON(w, http.StatusOK, status)
}

func generateShortID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("fallback-%d", time.Now().UnixNano())
	}
	return fmt.Sprintf("%x", b)
}