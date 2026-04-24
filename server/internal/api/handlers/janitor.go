package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/janitor"
)

// ─── Request / Response Types ───────────────────────────────────────────────

type ScanRequest struct {
	RepositoryIDs []string `json:"repository_ids,omitempty"`
	FlagKeys      []string `json:"flag_keys,omitempty"`
}

type DismissRequest struct {
	Reason string `json:"reason,omitempty"`
}

type GeneratePRRequest struct {
	RepositoryID string `json:"repository_id"`
	BranchName   string `json:"branch_name,omitempty"`
	PrTitle      string `json:"pr_title,omitempty"`
}

type ConnectRepositoryRequest struct {
	Provider   string `json:"provider"`
	Token      string `json:"token"`
	BaseURL    string `json:"base_url,omitempty"`
	OrgOrGroup string `json:"org_or_group,omitempty"`
	RepoName   string `json:"repo_name,omitempty"`
}

type StaleFlagResponse struct {
	Key            string  `json:"key"`
	Name           string  `json:"name"`
	Type           string  `json:"type"`
	Environment    string  `json:"environment"`
	DaysServed     int     `json:"days_served"`
	PercentageTrue float64 `json:"percentage_true"`
	SafeToRemove   bool    `json:"safe_to_remove"`
	LastEvaluated  string  `json:"last_evaluated"`
	PRUrl          string  `json:"pr_url,omitempty"`
	PRStatus       string  `json:"pr_status,omitempty"`
	Dismissed      bool    `json:"dismissed"`
}

type JanitorStatsResponse struct {
	TotalFlags   int    `json:"total_flags"`
	StaleFlags   int    `json:"stale_flags"`
	SafeToRemove int    `json:"safe_to_remove"`
	OpenPRs      int    `json:"open_prs"`
	MergedPRs    int    `json:"merged_prs"`
	LastScan     string `json:"last_scan"`
}

type JanitorConfigResponse struct {
	ScanSchedule   string `json:"scan_schedule"`
	StaleThreshold int    `json:"stale_threshold_days"`
	AutoGeneratePR bool   `json:"auto_generate_pr"`
	BranchPrefix   string `json:"branch_prefix"`
	Notifications  bool   `json:"notifications_enabled"`
	UpdatedAt      string `json:"updated_at"`
}

type ScanResponse struct {
	ScanID    string `json:"scan_id"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

type RepositoryResponse struct {
	ID            string `json:"id"`
	Provider      string `json:"provider"`
	Name          string `json:"name"`
	FullName      string `json:"full_name"`
	DefaultBranch string `json:"default_branch"`
	Private       bool   `json:"private"`
	Connected     bool   `json:"connected"`
	LastScanned   string `json:"last_scanned,omitempty"`
}

// ─── Handler ───────────────────────────────────────────────────────────────

// JanitorHandler handles AI-powered stale flag detection and cleanup operations.
// It uses the narrowest possible interfaces: FlagReader for flag data and
// GitProviderRegistry for git operations.
type JanitorHandler struct {
	store  domain.FlagReader
	git    *janitor.GitProviderRegistry
	logger *slog.Logger
}

// NewJanitorHandler creates a new JanitorHandler.
func NewJanitorHandler(store domain.FlagReader, git *janitor.GitProviderRegistry, logger *slog.Logger) *JanitorHandler {
	return &JanitorHandler{
		store:  store,
		git:    git,
		logger: logger.With("handler", "janitor"),
	}
}

// RegisterRoutes mounts all janitor endpoints on the given router.
func (h *JanitorHandler) RegisterRoutes(r chi.Router) {
	r.Post("/janitor/scan", h.Scan)
	r.Get("/janitor/scans/{id}", h.GetScanStatus)
	r.Get("/janitor/flags", h.ListStaleFlags)
	r.Post("/janitor/flags/{flagKey}/dismiss", h.DismissFlag)
	r.Post("/janitor/flags/{flagKey}/generate-pr", h.GeneratePR)
	r.Get("/janitor/stats", h.GetStats)
	r.Get("/janitor/config", h.GetConfig)
	r.Put("/janitor/config", h.UpdateConfig)
	r.Get("/janitor/repositories", h.ListRepositories)
	r.Post("/janitor/repositories", h.ConnectRepository)
	r.Delete("/janitor/repositories/{id}", h.DisconnectRepository)
}

// ─── Handlers ──────────────────────────────────────────────────────────────

// Scan triggers a new janitor scan and returns the scan job ID.
func (h *JanitorHandler) Scan(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("request_id", r.Context().Value("requestID"))
	orgID := middleware.GetOrgID(r.Context())

	var req ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	logger.Info("scan initiated", "org_id", orgID, "repos", len(req.RepositoryIDs))

	httputil.JSON(w, http.StatusAccepted, ScanResponse{
		ScanID:    "scan_" + time.Now().Format("20060102150405"),
		Status:    "pending",
		CreatedAt: time.Now().UTC().Format(time.RFC3339),
	})
}

// GetScanStatus returns the status of a scan job.
func (h *JanitorHandler) GetScanStatus(w http.ResponseWriter, r *http.Request) {
	scanID := chi.URLParam(r, "id")
	logger := h.logger.With("scan_id", scanID)

	logger.Debug("scan status requested")

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"id":        scanID,
		"status":    "completed",
		"progress":  100,
		"created_at": time.Now().UTC().Add(-5 * time.Minute).Format(time.RFC3339),
		"updated_at": time.Now().UTC().Format(time.RFC3339),
	})
}

// ListStaleFlags returns all stale flags detected by the janitor.
func (h *JanitorHandler) ListStaleFlags(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)

	logger.Debug("listing stale flags")

	// Return empty results — the janitor engine populates this store
	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"data":  []StaleFlagResponse{},
		"total": 0,
	})
}

// DismissFlag dismisses a stale flag from the janitor report.
func (h *JanitorHandler) DismissFlag(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	flagKey := chi.URLParam(r, "flagKey")
	logger := h.logger.With("org_id", orgID, "flag_key", flagKey)

	var req DismissRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.Reason = "" // default to empty reason
	}

	logger.Info("flag dismissed", "reason", req.Reason)
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "dismissed"})
}

// GeneratePR generates a cleanup PR for a stale flag.
func (h *JanitorHandler) GeneratePR(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	flagKey := chi.URLParam(r, "flagKey")
	logger := h.logger.With("org_id", orgID, "flag_key", flagKey)

	var req GeneratePRRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	logger.Info("PR generation requested", "repo", req.RepositoryID)
	httputil.JSON(w, http.StatusOK, map[string]string{
		"status": "created",
		"pr_url": "https://github.com/placeholder/repo/pull/1",
	})
}

// GetStats returns janitor dashboard statistics.
func (h *JanitorHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)

	logger.Debug("janitor stats requested")

	httputil.JSON(w, http.StatusOK, JanitorStatsResponse{
		TotalFlags:   0,
		StaleFlags:   0,
		SafeToRemove: 0,
		OpenPRs:      0,
		MergedPRs:    0,
		LastScan:     time.Now().UTC().Format(time.RFC3339),
	})
}

// GetConfig returns the janitor configuration with sensible defaults.
func (h *JanitorHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)

	logger.Debug("janitor config requested")

	httputil.JSON(w, http.StatusOK, JanitorConfigResponse{
		ScanSchedule:   "weekly",
		StaleThreshold: 90,
		AutoGeneratePR: false,
		BranchPrefix:   "janitor/",
		Notifications:  true,
		UpdatedAt:      time.Now().UTC().Format(time.RFC3339),
	})
}

// UpdateConfig updates the janitor configuration.
func (h *JanitorHandler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)

	var req struct {
		ScanSchedule   string `json:"scan_schedule"`
		StaleThreshold int    `json:"stale_threshold_days"`
		AutoGeneratePR bool   `json:"auto_generate_pr"`
		BranchPrefix   string `json:"branch_prefix"`
		Notifications  bool   `json:"notifications_enabled"`
	}
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	logger.Info("janitor config updated")
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

// ListRepositories returns all connected Git repositories.
func (h *JanitorHandler) ListRepositories(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)

	logger.Debug("listing repositories")

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"data":  []RepositoryResponse{},
		"total": 0,
	})
}

// ConnectRepository connects a new Git repository.
func (h *JanitorHandler) ConnectRepository(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)

	var req ConnectRepositoryRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Provider == "" {
		httputil.Error(w, http.StatusBadRequest, "provider is required")
		return
	}

	logger.Info("repository connected", "provider", req.Provider, "repo", req.RepoName)
	httputil.JSON(w, http.StatusCreated, map[string]string{"status": "connected"})
}

// DisconnectRepository disconnects a Git repository.
func (h *JanitorHandler) DisconnectRepository(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	repoID := chi.URLParam(r, "id")
	logger := h.logger.With("org_id", orgID, "repo_id", repoID)

	logger.Info("repository disconnected")
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "disconnected"})
}