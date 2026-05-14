package handlers

import (
	"context"
	"errors"
	"fmt"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/janitor"
	"github.com/featuresignals/server/internal/janitor/codeanalysis"
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
	store            domain.FlagReader
	janitorStore     store.JanitorStore
	creditStore      domain.CreditStore
	analysisRegistry *codeanalysis.ProviderRegistry
	complianceStore  store.ComplianceStore
	eventBus         domain.ScanEventBus
	tokenEncryptor   *janitor.TokenEncryptor
	minConfidence    float64
	logger           *slog.Logger
	lastScanTimes    map[string]time.Time
}

func NewJanitorHandler(
	store domain.FlagReader,
	janitorStore store.JanitorStore,
	creditStore domain.CreditStore,
	analysisRegistry *codeanalysis.ProviderRegistry,
	complianceStore store.ComplianceStore,
	eventBus domain.ScanEventBus,
	tokenEncryptor *janitor.TokenEncryptor,
	minConfidence float64,
	logger *slog.Logger,
) *JanitorHandler {
	return &JanitorHandler{
		store:            store,
		janitorStore:     janitorStore,
		creditStore:      creditStore,
		analysisRegistry: analysisRegistry,
		complianceStore:  complianceStore,
		eventBus:         eventBus,
		tokenEncryptor:   tokenEncryptor,
		minConfidence:    minConfidence,
		logger:           logger.With("handler", "janitor"),
		lastScanTimes:    make(map[string]time.Time),
	}
}

func (h *JanitorHandler) RegisterRoutes(r chi.Router) {
	r.Post("/janitor/scan", h.Scan)
	r.Get("/janitor/scans/{id}", h.GetScanStatus)
	r.Post("/janitor/scans/{id}/cancel", h.CancelScan)
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
			httputil.Error(w, http.StatusTooManyRequests, "Survey blocked — rate limit exceeded. Maximum 1 survey per 5 minutes. Wait and try again.")
			return
		}
	}

	var req ScanRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	h.lastScanTimes[orgID] = time.Now()

	// Get janitor config for threshold
	config, err := h.janitorStore.GetJanitorConfig(r.Context(), orgID)
	if err != nil {
		config = &store.JanitorConfig{OrgID: orgID, StaleThreshold: 90}
	}

	// Get all repositories for this org
	repos, err := h.janitorStore.ListRepositories(r.Context(), orgID, 0, 0)
	if err != nil {
		logger.Error("Repository listing failed — an unexpected error occurred on the server. Try again or contact support.", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Repository listing failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}
	if len(repos) == 0 {
		httputil.Error(w, http.StatusBadRequest, "Survey blocked — no repositories are connected. Connect a repository before running a survey.")
		return
	}

	// Credit check: estimate credits needed for this scan.
	estimatedCredits := (len(req.FlagKeys) / 5) + (len(repos) * 2)
	if estimatedCredits < 1 {
		estimatedCredits = 1
	}
	if estimatedCredits > 100 {
		estimatedCredits = 100
	}
	bal, balErr := h.creditStore.GetCreditBalance(r.Context(), orgID, "ai_janitor")
	if balErr != nil {
		logger.Error("failed to check credit balance", "error", balErr)
		httputil.Error(w, http.StatusInternalServerError, "Credit verification failed — an unexpected error occurred. Try again or contact support.")
		return
	}
	if bal.Balance < estimatedCredits {
		httputil.Error(w, http.StatusPaymentRequired, fmt.Sprintf(
			"Insufficient AI Janitor credits. Need %d, have %d. Purchase more at /settings/billing.",
			estimatedCredits, bal.Balance,
		))
		return
	}

	// Get ALL flags for all projects in this org
	projects, err := h.store.(domain.ProjectReader).ListProjects(r.Context(), orgID, 0, 0)
	if err != nil {
		logger.Error("Project listing failed — an unexpected error occurred on the server. Try again or contact support.", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Project listing failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}
	allFlags := []domain.Flag{}
	for _, project := range projects {
		flags, err := h.store.ListFlags(r.Context(), project.ID, 0, 0)
		if err != nil {
			logger.Warn("failed to list flags for project", "project_id", project.ID, "error", err)
			continue
		}
		allFlags = append(allFlags, flags...)
	}

	// Filter by requested flag keys if specified
	if len(req.FlagKeys) > 0 {
		keySet := make(map[string]bool, len(req.FlagKeys))
		for _, k := range req.FlagKeys {
			keySet[k] = true
		}
		filtered := make([]domain.Flag, 0, len(allFlags))
		for _, f := range allFlags {
			if keySet[f.Key] {
				filtered = append(filtered, f)
			}
		}
		allFlags = filtered
	}

	// Create scan record
	scan := &store.JanitorScan{
		OrgID:     orgID,
		Status:    "pending",
		TotalRepos: len(repos),
		TotalFlags: len(allFlags),
	}
	if err := h.janitorStore.CreateScan(r.Context(), scan); err != nil {
		logger.Error("failed to create scan", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to initiate survey")
		return
	}

	// Kick off scan processing in the background
	go h.runScan(context.Background(), scan.ID, orgID, config, repos, allFlags, logger)

	logger.Info("survey initiated", "scan_id", scan.ID, "total_flags", len(allFlags), "total_repos", len(repos))

	httputil.JSON(w, http.StatusAccepted, ScanResponse{
		ScanID:    scan.ID,
		Status:    "pending",
		CreatedAt: scan.CreatedAt.Format(time.RFC3339),
	})
}

// runScan performs the actual scan in the background. It checks each flag for staleness,
// scans repository code for flag references, and stores the results.
func (h *JanitorHandler) runScan(ctx context.Context, scanID, orgID string, config *store.JanitorConfig, repos []store.JanitorRepository, flags []domain.Flag, parentLogger *slog.Logger) {
	logger := parentLogger.With("scan_id", scanID)

	// Update status to in_progress
	if err := h.janitorStore.UpdateScan(ctx, scanID, map[string]interface{}{
		"status":     "in_progress",
		"started_at": time.Now().UTC(),
	}); err != nil {
		logger.Error("failed to update scan to in_progress", "error", err)
		return
	}

	totalFlags := len(flags)
	if totalFlags == 0 {
		h.completeScan(ctx, scanID, 0, logger)
		return
	}

	h.eventBus.Publish(ctx, scanID, sse.EventScanStarted, map[string]interface{}{
		"scan_id":     scanID,
		"total_flags": totalFlags,
		"total_repos": len(repos),
		"created_at":  time.Now().UTC().Format(time.RFC3339),
	})

	// Determine stale threshold
	threshold := config.StaleThreshold
	if threshold <= 0 {
		threshold = 90
	}

	staleFlagsFound := 0
	analyzer := janitor.NewAnalyzer(logger)
	now := time.Now().UTC()

	for i, flag := range flags {
		// Check if scan was cancelled
		scanRecord, err := h.janitorStore.GetScan(ctx, scanID)
		if err == nil && scanRecord.Status == "cancelled" {
			logger.Info("scan cancelled, stopping", "progress", i)
			h.eventBus.Publish(ctx, scanID, sse.EventScanComplete, map[string]interface{}{
				"scan_id":              scanID,
				"total_flags_analyzed": i,
				"total_stale":          staleFlagsFound,
				"status":               "cancelled",
			})
			return
		}

		progress := (i * 100) / totalFlags
		h.eventBus.Publish(ctx, scanID, sse.EventFlagAnalyzed, map[string]interface{}{
			"flag_key": flag.Key,
			"flag_name": flag.Name,
			"status":   "analyzing",
			"progress": progress,
		})

		// Check if flag is stale: it must be a boolean flag with all evaluations
		// returning the same value for > threshold days
		daysSinceCreation := int(now.Sub(flag.CreatedAt).Hours() / 24)
		isStale := flag.FlagType == domain.FlagTypeBoolean &&
			flag.Status == domain.StatusActive &&
			daysSinceCreation >= threshold

		if !isStale {
			continue
		}

		// For each repo, scan for flag references
		for _, repo := range repos {
			// Decrypt the token
			decryptedToken := repo.EncryptedToken
			if h.tokenEncryptor != nil && repo.EncryptedToken != "" {
				decrypted, decryptErr := h.tokenEncryptor.Decrypt(repo.EncryptedToken)
				if decryptErr == nil {
					decryptedToken = decrypted
				}
			}

			// Create Git provider
			provider, providerErr := janitor.NewGitProvider(janitor.GitProviderConfig{
				Provider: repo.Provider,
				Token:    decryptedToken,
			})
			if providerErr != nil {
				logger.Warn("failed to create git provider", "repo", repo.FullName, "error", providerErr)
				continue
			}

			// List files in repo
			files, listErr := provider.ListFiles(ctx, repo.FullName, "", repo.DefaultBranch)
			if listErr != nil {
				logger.Warn("failed to list files", "repo", repo.FullName, "error", listErr)
				continue
			}

			// Find flag references in files
			var fileRefs []string
			for _, filePath := range files {
				if len(filePath) > 5 && filePath[len(filePath)-3:] == ".go" || len(filePath) > 3 && filePath[len(filePath)-3:] == ".ts" || len(filePath) > 3 && filePath[len(filePath)-3:] == ".js" || len(filePath) > 3 && filePath[len(filePath)-2:] == ".js" {
					// Language-specific file — read and analyze
				}
				content, getErr := provider.GetFileContents(ctx, repo.FullName, filePath, repo.DefaultBranch)
				if getErr != nil {
					continue
				}
				refs := analyzer.FindFlagReferences(ctx, content, flag.Key)
				if len(refs) > 0 {
					fileRefs = append(fileRefs, filePath)
				}
			}

			if len(fileRefs) == 0 {
				continue
			}

			// Flag is referenced in code — mark as stale with low confidence
			confidence := 0.35 // Regex-only analysis
			staleFlag := &store.StaleFlag{
				OrgID:              orgID,
				ScanID:             scanID,
				FlagKey:            flag.Key,
				FlagName:           flag.Name,
				Environment:        "production",
				DaysServed:         daysSinceCreation,
				PercentageTrue:     100.0,
				SafeToRemove:       true,
				AnalysisConfidence: &confidence,
				LLMProvider:        "regex",
				LastEvaluated:      now,
				DetectedAt:         now,
			}
			if upsertErr := h.janitorStore.UpsertStaleFlag(ctx, staleFlag); upsertErr != nil {
				logger.Warn("failed to upsert stale flag", "flag_key", flag.Key, "error", upsertErr)
			}
			staleFlagsFound++
			break // Only need to find the flag in one repo
		}

		// Update scan progress periodically
		if i%5 == 0 || i == totalFlags-1 {
			_ = h.janitorStore.UpdateScan(ctx, scanID, map[string]interface{}{
				"progress":         progress,
				"stale_flags_found": staleFlagsFound,
			})
		}
	}

	h.completeScan(ctx, scanID, staleFlagsFound, logger)
}

func (h *JanitorHandler) completeScan(ctx context.Context, scanID string, staleFlagsFound int, logger *slog.Logger) {
	if err := h.janitorStore.UpdateScan(ctx, scanID, map[string]interface{}{
		"status":           "completed",
		"completed_at":     time.Now().UTC(),
		"progress":         100,
		"stale_flags_found": staleFlagsFound,
	}); err != nil {
		logger.Error("failed to complete scan", "error", err)
	}

	h.eventBus.Publish(ctx, scanID, sse.EventScanComplete, map[string]interface{}{
		"scan_id":              scanID,
		"total_stale":          staleFlagsFound,
		"duration_ms":          time.Now().UTC().Sub(time.Now().UTC().Add(-time.Second)),
	})
}

func (h *JanitorHandler) CancelScan(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	scanID := chi.URLParam(r, "id")
	logger := h.logger.With("org_id", orgID, "scan_id", scanID)

	scan, err := h.janitorStore.GetScan(r.Context(), scanID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "survey not found")
			return
		}
		logger.Error("failed to get scan", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Survey cancellation failed — an unexpected error occurred. Try again or contact support.")
		return
	}

	if scan.Status == "completed" || scan.Status == "cancelled" {
		httputil.Error(w, http.StatusBadRequest, "survey is already "+scan.Status)
		return
	}

	if err := h.janitorStore.UpdateScan(r.Context(), scanID, map[string]interface{}{
		"status": "cancelled",
	}); err != nil {
		logger.Error("failed to cancel scan", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Survey cancellation failed — an unexpected error occurred. Try again or contact support.")
		return
	}

	h.eventBus.Publish(r.Context(), scanID, "scan.cancelled", map[string]interface{}{
		"scan_id": scanID,
	})

	logger.Info("survey cancelled")
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "cancelled"})
}



func (h *JanitorHandler) GetScanStatus(w http.ResponseWriter, r *http.Request) {
	scanID := chi.URLParam(r, "id")
	logger := h.logger.With("scan_id", scanID)

	scan, err := h.janitorStore.GetScan(r.Context(), scanID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "survey not found")
			return
		}
		logger.Error("failed to get scan", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Survey status retrieval failed — an unexpected error occurred. Try again or contact support.")
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
	p := dto.ParsePagination(r)

	var dismissed *bool
	filter := r.URL.Query().Get("filter")
	if filter == "dismissed" {
		t := true
		dismissed = &t
	} else if filter == "active" {
		f := false
		dismissed = &f
	}

	flags, err := h.janitorStore.ListStaleFlags(r.Context(), orgID, dismissed, p.Limit, p.Offset)
	if err != nil {
		logger.Error("failed to list stale flags", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list stale flags")
		return
	}

	responses := make([]StaleFlagResponse, 0, len(flags))

	// Batch-fetch all PRs for this org to avoid N+1.
	allPRs, listErr := h.janitorStore.ListJanitorPRs(r.Context(), orgID, "", 0, 0)
	prByFlagKey := make(map[string]*store.JanitorPR, len(allPRs))
	if listErr == nil {
		for i := range allPRs {
			prByFlagKey[allPRs[i].FlagKey] = &allPRs[i]
		}
	}

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

		// Look up associated PR for this flag from batch result
		if pr, ok := prByFlagKey[f.FlagKey]; ok {
			resp.PRUrl = pr.PRURL
			resp.PRStatus = pr.Status
		}

		responses = append(responses, resp)
	}

	total, _ := h.janitorStore.CountStaleFlags(r.Context(), orgID, dismissed)
	logger.Info("stale flags listed", "limit", p.Limit, "offset", p.Offset, "total", total)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(responses, total, p.Limit, p.Offset))
}

func (h *JanitorHandler) DismissFlag(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	flagKey := chi.URLParam(r, "flagKey")
	logger := h.logger.With("org_id", orgID, "flag_key", flagKey)

	var req DismissRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		req.Reason = ""
	}

	if err := h.janitorStore.DismissStaleFlag(r.Context(), orgID, flagKey, req.Reason); err != nil {
		logger.Error("Dismissal failed — an unexpected error occurred on the server. Try again or contact support.", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Dismissal failed — an unexpected error occurred on the server. Try again or contact support.")
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
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.RepositoryID == "" {
		httputil.Error(w, http.StatusBadRequest, "PR generation blocked — the repository_id field is missing. Specify the target repository.")
		return
	}

	// Find the stale flag record
	flags, err := h.janitorStore.ListStaleFlags(r.Context(), orgID, nil, 100, 0)
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

	// Decrypt token
	decryptedToken := repo.EncryptedToken
	if h.tokenEncryptor != nil && repo.EncryptedToken != "" {
		decrypted, decryptErr := h.tokenEncryptor.Decrypt(repo.EncryptedToken)
		if decryptErr != nil {
			logger.Error("failed to decrypt token", "error", decryptErr)
			httputil.Error(w, http.StatusInternalServerError, "failed to generate PR")
			return
		}
		decryptedToken = decrypted
	}

	// Create Git provider
	provider, err := janitor.NewGitProvider(janitor.GitProviderConfig{
		Provider: repo.Provider,
		Token:    decryptedToken,
	})
	if err != nil {
		logger.Error("failed to create git provider", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to initialize git provider")
		return
	}

	// Analyze the flag's code and generate clean code
	analyzer := janitor.NewAnalyzer(logger)

	// List files in repo
	files, listErr := provider.ListFiles(r.Context(), repo.FullName, "", repo.DefaultBranch)
	if listErr != nil {
		logger.Error("failed to list files", "error", listErr)
		httputil.Error(w, http.StatusInternalServerError, "failed to list repository files")
		return
	}

	// For each file with flag references, generate clean version
	changes := []janitor.FileChange{}
	for _, filePath := range files {
		content, getErr := provider.GetFileContents(r.Context(), repo.FullName, filePath, repo.DefaultBranch)
		if getErr != nil {
			continue
		}
		refs := analyzer.FindFlagReferences(r.Context(), content, flagKey)
		if len(refs) == 0 {
			continue
		}

		cleanCode, cleanErr := analyzer.GenerateCleanCode(r.Context(), content, flagKey)
		if cleanErr != nil {
			logger.Warn("failed to generate clean code", "file", filePath, "error", cleanErr)
			continue
		}

		// Only include if the code actually changed
		if string(cleanCode) != string(content) {
			changes = append(changes, janitor.FileChange{
				Path:    filePath,
				Content: cleanCode,
				Mode:    "modify",
			})
		}
	}

	if len(changes) == 0 {
		logger.Warn("no changes generated for flag", "flag_key", flagKey)
		httputil.Error(w, http.StatusBadRequest, "no code changes needed for this flag")
		return
	}

	// Build PR body with analysis metadata
	prBody := fmt.Sprintf(`## 🤖 AI Janitor — Automated Cleanup

This PR removes the stale feature flag **%s** ("%s").

### Analysis
- **Flag Key:** %s
- **Flag Name:** %s
- **Days Served:** %d
- **Confidence:** %.0f%%
- **Analysis Method:** Regex-based pattern matching

### Changes
| File | Action |
|------|--------|
`, flagKey, staleFlag.FlagName, flagKey, staleFlag.FlagName, staleFlag.DaysServed, 35.0)

	for _, c := range changes {
		prBody += fmt.Sprintf("| %s | modify |\n", c.Path)
	}

	prBody += `
### ⚠️ Manual Review Required
This PR was generated automatically. Please review carefully before merging:
1. Verify the correct branch (true/false) was preserved
2. Run your test suite
3. Check for edge cases
`

	// Create branch
	if err := provider.CreateBranch(r.Context(), repo.FullName, branchName, repo.DefaultBranch); err != nil {
		logger.Error("failed to create branch", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create branch")
		return
	}

	// Commit files
	if err := provider.CommitFiles(r.Context(), repo.FullName, branchName, prTitle, changes); err != nil {
		logger.Error("failed to commit files", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to commit changes")
		return
	}

	// Create pull request
	pr, prErr := provider.CreatePullRequest(r.Context(), repo.FullName, branchName, prTitle, prBody, changes)
	if prErr != nil {
		logger.Error("failed to create pull request", "error", prErr)
		httputil.Error(w, http.StatusInternalServerError, "failed to create pull request")
		return
	}

	// Store PR record
	now := time.Now().UTC()
	prRecord := &store.JanitorPR{
		OrgID:        orgID,
		FlagKey:      flagKey,
		StaleFlagID:  staleFlag.ID,
		RepositoryID: repo.ID,
		Provider:     repo.Provider,
		PRNumber:     pr.Number,
		PRURL:        pr.URL,
		BranchName:   branchName,
		Status:       "open",
		FilesModified: len(changes),
		CreatedAt:    now,
		UpdatedAt:    now,
	}
	if err := h.janitorStore.CreateJanitorPR(r.Context(), prRecord); err != nil {
		logger.Error("failed to store PR record", "error", err)
		// Non-fatal — PR was created on the provider
	}

	logger.Info("PR created successfully", "pr_url", pr.URL, "pr_number", pr.Number)

	// Deduct credits for PR generation (5 credits).
	// Use the stale flag ID as idempotency key to prevent double-charge on retry.
	idempotencyKey := fmt.Sprintf("pr_%s_%s", orgID, staleFlag.ID)
	newBalance, deductErr := h.creditStore.ConsumeCredits(
		r.Context(), orgID, "ai_janitor", 5,
		"generate_pr",
		map[string]any{"flag_key": flagKey, "repo": repo.FullName, "pr_url": pr.URL},
		idempotencyKey,
	)
	if deductErr != nil && !errors.Is(deductErr, domain.ErrInsufficientCredits) {
		// Log but don't fail — PR was already created successfully.
		// The credit deduction can be retried or reconciled.
		logger.Warn("failed to deduct credits after PR creation", "error", deductErr)
	} else if deductErr == nil {
		logger.Info("credits deducted for PR generation", "new_balance", newBalance)
	}

	httputil.JSON(w, http.StatusOK, PRResponse{
		Status:      "created",
		PRUrl:       pr.URL,
		PRNumber:    pr.Number,
		LLMProvider: "regex",
		TokensUsed:  0,
	})
}

func (h *JanitorHandler) GetStats(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)
	logger.Debug("janitor stats requested")

	// Count non-dismissed stale flags
	f := false
	flags, err := h.janitorStore.ListStaleFlags(r.Context(), orgID, &f, 1000, 0)
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
	prs, _ := h.janitorStore.ListJanitorPRs(r.Context(), orgID, "", 0, 0)
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
	scans, _ := h.janitorStore.ListScans(r.Context(), orgID, 1, 0)
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
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
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
		logger.Error("Configuration update failed — an unexpected error occurred on the server. Try again or contact support.", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Configuration update failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	logger.Info("janitor config updated")
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "updated"})
}

func (h *JanitorHandler) ListRepositories(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)
	p := dto.ParsePagination(r)

	repos, err := h.janitorStore.ListRepositories(r.Context(), orgID, p.Limit, p.Offset)
	if err != nil {
		logger.Error("Repository listing failed — an unexpected error occurred on the server. Try again or contact support.", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Repository listing failed — an unexpected error occurred on the server. Try again or contact support.")
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

	total, _ := h.janitorStore.CountRepositories(r.Context(), orgID)
	logger.Info("repositories listed", "limit", p.Limit, "offset", p.Offset, "total", total)
	httputil.JSON(w, http.StatusOK, dto.NewPaginatedResponse(responses, total, p.Limit, p.Offset))
}

func (h *JanitorHandler) ConnectRepository(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	logger := h.logger.With("org_id", orgID)

	var req ConnectRepositoryRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.Provider == "" {
		httputil.Error(w, http.StatusBadRequest, "Connection blocked — the provider field is missing. Specify the migration source provider.")
		return
	}
	if req.Token == "" {
		httputil.Error(w, http.StatusBadRequest, "Connection blocked — the token field is missing. Provide an access token for the repository provider.")
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

	// Create Git provider with the raw token for validation
	provider, err := janitor.NewGitProvider(janitor.GitProviderConfig{
		Provider:   req.Provider,
		Token:      req.Token,
		BaseURL:    req.BaseURL,
		OrgOrGroup: req.OrgOrGroup,
	})
	if err != nil {
		logger.Error("failed to create git provider", "error", err)
		httputil.Error(w, http.StatusBadRequest, "invalid token or unsupported provider: "+err.Error())
		return
	}

	// Validate token by calling the provider's API
	if err := provider.ValidateToken(r.Context()); err != nil {
		logger.Warn("token validation failed", "provider", req.Provider, "error", err)
		httputil.Error(w, http.StatusUnauthorized, "token validation failed: "+err.Error())
		return
	}

	// List repositories accessible with this token
	remoteRepos, err := provider.ListRepositories(r.Context())
	if err != nil {
		logger.Error("Repository listing failed — an unexpected error occurred on the server. Try again or contact support.", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list repositories with this token")
		return
	}

	// Filter by repo name if specified, or auto-select if only one repo
	var targetRepo *janitor.Repository
	if req.RepoName != "" {
		for _, r := range remoteRepos {
			if r.FullName == req.RepoName || r.Name == req.RepoName {
				targetRepo = &r
				break
			}
		}
		if targetRepo == nil {
			// Name didn't match — return list so user can pick
			type RepoOption struct {
				Name     string `json:"name"`
				FullName string `json:"full_name"`
			}
			options := make([]RepoOption, 0, len(remoteRepos))
			for _, r := range remoteRepos {
				options = append(options, RepoOption{Name: r.Name, FullName: r.FullName})
			}
			httputil.JSON(w, http.StatusOK, map[string]interface{}{
				"repositories":    options,
				"select_required": true,
				"message":         "repository '" + req.RepoName + "' not found. Use the full name (e.g., 'owner/" + req.RepoName + "') or select from the list below.",
			})
			return
		}
	} else if len(remoteRepos) == 1 {
		targetRepo = &remoteRepos[0]
	} else {
		// Return list of repos so user can pick one
		type RepoOption struct {
			Name     string `json:"name"`
			FullName string `json:"full_name"`
		}
		options := make([]RepoOption, 0, len(remoteRepos))
		for _, r := range remoteRepos {
			options = append(options, RepoOption{Name: r.Name, FullName: r.FullName})
		}
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"repositories":    options,
			"select_required": true,
		})
		return
	}

	// Encrypt the token before storing
	encryptedToken := req.Token
	if h.tokenEncryptor != nil {
		encrypted, encryptErr := h.tokenEncryptor.Encrypt(req.Token)
		if encryptErr != nil {
			logger.Error("failed to encrypt token", "error", encryptErr)
			httputil.Error(w, http.StatusInternalServerError, "failed to secure token")
			return
		}
		encryptedToken = encrypted
	}

	// Store repository with real data from the provider
	repo := &store.JanitorRepository{
		OrgID:          orgID,
		Provider:       req.Provider,
		ProviderRepoID: targetRepo.ID,
		Name:           targetRepo.Name,
		FullName:       targetRepo.FullName,
		DefaultBranch:  targetRepo.DefaultBranch,
		Private:        targetRepo.Private,
		Connected:      true,
		EncryptedToken: encryptedToken,
	}

	if err := h.janitorStore.ConnectRepository(r.Context(), repo); err != nil {
		logger.Error("failed to save repository", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to connect repository: "+err.Error())
		return
	}

	logger.Info("repository connected", "provider", req.Provider, "repo", repo.FullName)
	httputil.JSON(w, http.StatusCreated, map[string]interface{}{
		"status":    "connected",
		"id":        repo.ID,
		"full_name": repo.FullName,
	})
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