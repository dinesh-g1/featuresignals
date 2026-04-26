package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/janitor"
	"github.com/featuresignals/server/internal/sse"
	"github.com/featuresignals/server/internal/store"
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

type UpdateConfigRequest struct {
	ScanSchedule   string  `json:"scan_schedule,omitempty"`
	StaleThreshold int     `json:"stale_threshold_days,omitempty"`
	AutoGeneratePR bool    `json:"auto_generate_pr,omitempty"`
	BranchPrefix   string  `json:"branch_prefix,omitempty"`
	Notifications  bool    `json:"notifications_enabled,omitempty"`
	LLMProvider    string  `json:"llm_provider,omitempty"`
	LLMModel       string  `json:"llm_model,omitempty"`
	LLMTemperature float64 `json:"llm_temperature,omitempty"`
}

type StaleFlagResponse struct {
	Key            string   `json:"key"`
	Name           string   `json:"name"`
	Type           string   `json:"type"`
	Environment    string   `json:"environment"`
	DaysServed     int      `json:"days_served"`
	PercentageTrue float64  `json:"percentage_true"`
	SafeToRemove   bool     `json:"safe_to_remove"`
	LastEvaluated  string   `json:"last_evaluated"`
	PRUrl          string   `json:"pr_url,omitempty"`
	PRStatus       string   `json:"pr_status,omitempty"`
	Dismissed      bool     `json:"dismissed"`
	Confidence     *float64 `json:"analysis_confidence,omitempty"`
	LLMProvider    string   `json:"llm_provider,omitempty"`
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
	ScanSchedule   string  `json:"scan_schedule"`
	StaleThreshold int     `json:"stale_threshold_days"`
	AutoGeneratePR bool    `json:"auto_generate_pr"`
	BranchPrefix   string  `json:"branch_prefix"`
	Notifications  bool    `json:"notifications_enabled"`
	LLMProvider    string  `json:"llm_provider"`
	LLMModel       string  `json:"llm_model"`
	LLMTemperature float64 `json:"llm_temperature"`
	UpdatedAt      string  `json:"updated_at"`
}

type ScanResponse struct {
	ScanID    string `json:"scan_id"`
	Status    string `json:"status"`
	CreatedAt string `json:"created_at"`
}

type RepositoryResponse struct {
	ID            string  `json:"id"`
	Provider      string  `json:"provider"`
	Name          string  `json:"name"`
	FullName      string  `json:"full_name"`
	DefaultBranch string  `json:"default_branch"`
	Private       bool    `json:"private"`
	Connected     bool    `json:"connected"`
	LastScanned   string  `json:"last_scanned,omitempty"`
}

type PRResponse struct {
	Status             string   `json:"status"`
	PRUrl              string   `json:"pr_url"`
	PRNumber           int      `json:"pr_number"`
	AnalysisConfidence *float64 `json:"analysis_confidence,omitempty"`
	LLMProvider        string   `json:"llm_provider,omitempty"`
	LLMModel           string   `json:"llm_model,omitempty"`
	TokensUsed         int      `json:"tokens_used,omitempty"`
}

// ─── Handler ───────────────────────────────────────────────────────────────

type JanitorHandler struct {
	store         domain.FlagReader
	janitorStore  store.JanitorStore
	git           *janitor.GitProviderRegistry
	eventBus      *sse.ScanEventBus
	logger        *slog.Logger
	lastScanTimes map[string]time.Time
}

func NewJanitorHandler(
	store domain.FlagReader,
	janitorStore store.JanitorStore,
	git *janitor.GitProviderRegistry,
	eventBus *sse.ScanEventBus,
	logger *slog.Logger,
) *JanitorHandler {
	return &JanitorHandler{
		store:         store,
		janitorStore:  janitorStore,
		git:           git,
		eventBus:      eventBus,
		logger:        logger.With("handler", "janitor"),
		lastScanTimes: make(map[string]time.Time),
	}
}

func (h *JanitorHandler) RegisterRoutes(r chi.Router) {
	r.Post("/janitor/scan", h.Scan)
	r.Get("/janitor/scans/{id}", h.GetScanStatus)
	// SSE endpoint is mounted separately in router.go (bypasses RequireJSON)
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

func (h *JanitorHandler) Scan(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)

	// Rate limit: 1 scan per 5 minutes per org
	if lastTime, ok := h.lastScanTimes[orgID]; ok {
		if time.Since(lastTime) < 5*time.Minute {
			w.Header().Set("Retry-After", "300")
			httputil.Error(w, http.StatusTooManyRequests, "scan rate limit exceeded. Max 1 scan per 5 minutes.")
			return
		}
	}

	var req ScanRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	h.lastScanTimes[orgID] = time.Now()

	// Create scan record
	scan := &store.JanitorScan{
		OrgID:      orgID,
		Status:     "pending",
		TotalRepos: len(req.RepositoryIDs),
	}
	if err := h.janitorStore.CreateScan(r.Context(), scan); err != nil {
		logger.Error("failed to create scan", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to initiate scan")
		return
	}

	// Kick off scan processing in the background
	go func(scanID string) {
		ctx := context.Background()

		if err := h.janitorStore.UpdateScan(ctx, scanID, map[string]interface{}{
			"status":     "in_progress",
			"started_at": time.Now().UTC(),
		}); err != nil {
			logger.Error("failed to update scan to in_progress", "error", err)
		}

		h.eventBus.Publish(ctx, scanID, sse.EventScanStarted, map[string]interface{}{
			"scan_id":     scanID,
			"total_flags": 0,
			"total_repos": len(req.RepositoryIDs),
			"created_at":  time.Now().UTC().Format(time.RFC3339),
		})

		// Simulate scanning progress
		time.Sleep(2 * time.Second)

		if err := h.janitorStore.UpdateScan(ctx, scanID, map[string]interface{}{
			"status":           "completed",
			"completed_at":     time.Now().UTC(),
			"progress":         100,
			"stale_flags_found": 0,
		}); err != nil {
			logger.Error("failed to complete scan", "error", err)
		}

		h.eventBus.Publish(ctx, scanID, sse.EventScanComplete, map[string]interface{}{
			"total_flags_analyzed": 0,
			"total_stale":          0,
			"total_safe":           0,
			"duration_ms":          2000,
		})
	}(scan.ID)

	logger.Info("scan initiated", "scan_id", scan.ID)

	httputil.JSON(w, http.StatusAccepted, ScanResponse{
		ScanID:    scan.ID,
		Status:    "pending",
		CreatedAt: scan.CreatedAt.Format(time.RFC3339),
	})
}

func (h *JanitorHandler) GetScanStatus(w http.ResponseWriter, r *http.Request) {
	scanID := chi.URLParam(r, "id")
	logger := h.logger.With("scan_id", scanID)

	scan, err := h.janitorStore.GetScan(r.Context(), scanID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "scan not found")
			return
		}
		logger.Error("failed to get scan", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to retrieve scan status")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"id":         scan.ID,
		"status":     scan.Status,
		"progress":   scan.Progress,
		"created_at": scan.CreatedAt.Format(time.RFC3339),
		"updated_at": time.Now().UTC().Format(time.RFC3339),
	})
}

func (h *JanitorHandler) ScanEvents(w http.ResponseWriter, r *http.Request) {
	scanID := chi.URLParam(r, "id")

	// Set SSE headers
	w.Header().Set("Content-Type", "text/event-stream")
	w.Header().Set("Cache-Control", "no-cache")
	w.Header().Set("Connection", "keep-alive")
	w.Header().Set("X-Accel-Buffering", "no")

	flusher, ok := w.(http.Flusher)
	if !ok {
		httputil.Error(w, http.StatusInternalServerError, "streaming not supported")
		return
	}

	// Parse optional after event ID for reconnection
	var afterEventID int64
	if after := r.URL.Query().Get("after"); after != "" {
		// Best-effort parse; zero means no replay
		// We use fmt.Sscanf-style manually since we avoid extra imports
		for _, c := range after {
			if c < '0' || c > '9' {
				break
			}
			afterEventID = afterEventID*10 + int64(c-'0')
		}
	}

	ch, cancel := h.eventBus.Subscribe(scanID, afterEventID)
	defer cancel()

	// Send initial connected event
	_, _ = w.Write([]byte("event: connected\ndata: {\"scan_id\":\"" + scanID + "\"}\n\n"))
	flusher.Flush()

	for {
		select {
		case msg, ok := <-ch:
			if !ok {
				_, _ = w.Write([]byte("event: closed\ndata: {}\n\n"))
				flusher.Flush()
				return
			}
			if _, err := w.Write(msg); err != nil {
				return
			}
			flusher.Flush()

		case <-r.Context().Done():
			return
		}
	}
}

func (h *JanitorHandler) ListStaleFlags(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)
	logger.Debug("listing stale flags")

	var dismissed *bool
	filter := r.URL.Query().Get("filter")
	if filter == "dismissed" {
		t := true
		dismissed = &t
	} else if filter == "active" {
		f := false
		dismissed = &f
	}

	flags, err := h.janitorStore.ListStaleFlags(r.Context(), orgID, dismissed, 100)
	if err != nil {
		logger.Error("failed to list stale flags", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list stale flags")
		return
	}

	responses := make([]StaleFlagResponse, 0, len(flags))
	for _, f := range flags {
		resp := StaleFlagResponse{
			Key:            f.FlagKey,
			Name:           f.FlagName,
			Type:           "boolean",
			Environment:    f.Environment,
			DaysServed:     f.DaysServed,
			PercentageTrue: f.PercentageTrue,
			SafeToRemove:   f.SafeToRemove,
			LastEvaluated:  f.LastEvaluated.Format(time.RFC3339),
			Dismissed:      f.Dismissed,
			Confidence:     f.AnalysisConfidence,
			LLMProvider:    f.LLMProvider,
		}

		// Look up associated PR for this flag
		prs, listErr := h.janitorStore.ListJanitorPRs(r.Context(), orgID, "")
		if listErr == nil {
			for _, pr := range prs {
				if pr.FlagKey == f.FlagKey {
					resp.PRUrl = pr.PRURL
					resp.PRStatus = pr.Status
					break
				}
			}
		}

		responses = append(responses, resp)
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"data":  responses,
		"total": len(responses),
	})
}

func (h *JanitorHandler) DismissFlag(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	flagKey := chi.URLParam(r, "flagKey")
	logger := h.logger.With("org_id", orgID, "flag_key", flagKey)

	var req DismissRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		req.Reason = ""
	}

	if err := h.janitorStore.DismissStaleFlag(r.Context(), orgID, flagKey, req.Reason); err != nil {
		logger.Error("failed to dismiss flag", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to dismiss flag")
		return
	}

	logger.Info("flag dismissed", "reason", req.Reason)
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "dismissed"})
}

func (h *JanitorHandler) GeneratePR(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	flagKey := chi.URLParam(r, "flagKey")
	logger := h.logger.With("org_id", orgID, "flag_key", flagKey)

	var req GeneratePRRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.RepositoryID == "" {
		httputil.Error(w, http.StatusBadRequest, "repository_id is required")
		return
	}

	// Find the stale flag record
	flags, err := h.janitorStore.ListStaleFlags(r.Context(), orgID, nil, 100)
	if err != nil {
		logger.Error("failed to list stale flags", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate PR")
		return
	}

	var staleFlag *store.StaleFlag
	for _, f := range flags {
		if f.FlagKey == flagKey {
			staleFlag = &f
			break
		}
	}
	if staleFlag == nil {
		httputil.Error(w, http.StatusNotFound, "stale flag not found")
		return
	}

	// Get repository info
	repo, err := h.janitorStore.GetRepository(r.Context(), req.RepositoryID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "repository not found")
			return
		}
		logger.Error("failed to get repository", "repo_id", req.RepositoryID, "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate PR")
		return
	}

	// Get janitor config for branch prefix and LLM settings
	config, err := h.janitorStore.GetJanitorConfig(r.Context(), orgID)
	if err != nil {
		logger.Error("failed to get config", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to generate PR")
		return
	}

	branchPrefix := config.BranchPrefix
	if branchPrefix == "" {
		branchPrefix = "janitor/"
	}

	branchName := req.BranchName
	if branchName == "" {
		branchName = branchPrefix + "remove-" + flagKey
	}

	prTitle := req.PrTitle
	if prTitle == "" {
		prTitle = "[AI Janitor] Remove stale flag: " + staleFlag.FlagName
	}

	logger.Info("PR generation requested",
		"repo", req.RepositoryID,
		"branch", branchName,
		"llm_provider", config.LLMProvider,
	)

	// Simulated PR creation — in production this would invoke the GitProvider
	httputil.JSON(w, http.StatusOK, PRResponse{
		Status:      "created",
		PRUrl:       "https://github.com/" + repo.FullName + "/pull/new/" + branchName,
		PRNumber:    1,
		LLMProvider: config.LLMProvider,
		LLMModel:    config.LLMModel,
	})
}

func (h *JanitorHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)
	logger.Debug("janitor stats requested")

	// Count non-dismissed stale flags
	f := false
	flags, err := h.janitorStore.ListStaleFlags(r.Context(), orgID, &f, 1000)
	if err != nil {
		logger.Error("failed to list stale flags for stats", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to get stats")
		return
	}

	safeCount := 0
	for _, fl := range flags {
		if fl.SafeToRemove {
			safeCount++
		}
	}

	// Count open and merged PRs
	prs, _ := h.janitorStore.ListJanitorPRs(r.Context(), orgID, "")
	openPRs := 0
	mergedPRs := 0
	for _, pr := range prs {
		switch pr.Status {
		case "open":
			openPRs++
		case "merged":
			mergedPRs++
		}
	}

	// Get last scan timestamp
	scans, _ := h.janitorStore.ListScans(r.Context(), orgID, 1)
	lastScan := ""
	if len(scans) > 0 {
		lastScan = scans[0].CreatedAt.Format(time.RFC3339)
	}

	httputil.JSON(w, http.StatusOK, JanitorStatsResponse{
		TotalFlags:   len(flags),
		StaleFlags:   len(flags),
		SafeToRemove: safeCount,
		OpenPRs:      openPRs,
		MergedPRs:    mergedPRs,
		LastScan:     lastScan,
	})
}

func (h *JanitorHandler) GetConfig(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)

	cfg, err := h.janitorStore.GetJanitorConfig(r.Context(), orgID)
	if err != nil {
		logger.Error("failed to get config", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to get config")
		return
	}

	httputil.JSON(w, http.StatusOK, JanitorConfigResponse{
		ScanSchedule:   cfg.ScanSchedule,
		StaleThreshold: cfg.StaleThreshold,
		AutoGeneratePR: cfg.AutoGeneratePR,
		BranchPrefix:   cfg.BranchPrefix,
		Notifications:  cfg.Notifications,
		LLMProvider:    cfg.LLMProvider,
		LLMModel:       cfg.LLMModel,
		LLMTemperature: cfg.LLMTemperature,
		UpdatedAt:      cfg.UpdatedAt.Format(time.RFC3339),
	})
}

func (h *JanitorHandler) UpdateConfig(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)

	var req UpdateConfigRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Get existing config or create defaults
	cfg, err := h.janitorStore.GetJanitorConfig(r.Context(), orgID)
	if err != nil {
		cfg = &store.JanitorConfig{OrgID: orgID}
	}

	// Apply updates
	if req.ScanSchedule != "" {
		cfg.ScanSchedule = req.ScanSchedule
	}
	if req.StaleThreshold > 0 {
		cfg.StaleThreshold = req.StaleThreshold
	}
	cfg.AutoGeneratePR = req.AutoGeneratePR
	if req.BranchPrefix != "" {
		cfg.BranchPrefix = req.BranchPrefix
	}
	cfg.Notifications = req.Notifications
	if req.LLMProvider != "" {
		cfg.LLMProvider = req.LLMProvider
	}
	if req.LLMModel != "" {
		cfg.LLMModel = req.LLMModel
	}
	if req.LLMTemperature > 0 {
		cfg.LLMTemperature = req.LLMTemperature
	}

	if err := h.janitorStore.UpsertJanitorConfig(r.Context(), cfg); err != nil {
		logger.Error("failed to update config", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to update config")
		return
	}

	logger.Info("janitor config updated")
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *JanitorHandler) ListRepositories(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)

	repos, err := h.janitorStore.ListRepositories(r.Context(), orgID)
	if err != nil {
		logger.Error("failed to list repositories", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list repositories")
		return
	}

	responses := make([]RepositoryResponse, 0, len(repos))
	for _, r := range repos {
		resp := RepositoryResponse{
			ID:            r.ID,
			Provider:      r.Provider,
			Name:          r.Name,
			FullName:      r.FullName,
			DefaultBranch: r.DefaultBranch,
			Private:       r.Private,
			Connected:     r.Connected,
		}
		if r.LastScanned != nil {
			resp.LastScanned = r.LastScanned.Format(time.RFC3339)
		}
		responses = append(responses, resp)
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"data":  responses,
		"total": len(responses),
	})
}

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
	if req.Token == "" {
		httputil.Error(w, http.StatusBadRequest, "token is required")
		return
	}

	// Validate the provider is supported
	providers := janitor.ListGitProviders()
	validProvider := false
	for _, p := range providers {
		if p == req.Provider {
			validProvider = true
			break
		}
	}
	if !validProvider {
		httputil.Error(w, http.StatusBadRequest, "unsupported provider: "+req.Provider)
		return
	}

	repo := &store.JanitorRepository{
		OrgID:          orgID,
		Provider:       req.Provider,
		ProviderRepoID: req.RepoName + "-" + orgID,
		Name:           req.RepoName,
		FullName:       req.RepoName,
		DefaultBranch:  "main",
		Connected:      true,
		EncryptedToken: req.Token,
	}

	if err := h.janitorStore.ConnectRepository(r.Context(), repo); err != nil {
		logger.Error("failed to connect repository", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to connect repository")
		return
	}

	logger.Info("repository connected", "provider", req.Provider, "repo", req.RepoName)
	httputil.JSON(w, http.StatusCreated, map[string]string{"status": "connected", "id": repo.ID})
}

func (h *JanitorHandler) DisconnectRepository(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	repoID := chi.URLParam(r, "id")
	logger := h.logger.With("org_id", orgID, "repo_id", repoID)

	if err := h.janitorStore.DisconnectRepository(r.Context(), orgID, repoID); err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "repository not found")
			return
		}
		logger.Error("failed to disconnect repository", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to disconnect repository")
		return
	}

	logger.Info("repository disconnected")
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "disconnected"})
}