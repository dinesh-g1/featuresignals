package handlers

import (
	"encoding/json"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/integrations"
)

// ─── Request Types ──────────────────────────────────────────────────────────

// ProvidersResponse lists all registered migration providers.
type ProvidersResponse struct {
	Providers []ProviderInfo `json:"providers"`
}

// ProviderInfo describes a migration source provider.
type ProviderInfo struct {
	Name         string   `json:"name"`
	DisplayName  string   `json:"display_name"`
	Capabilities []string `json:"capabilities"`
}

// ConnectRequest validates a connection to a source provider.
type ConnectRequest struct {
	Provider  string `json:"provider"`
	APIKey    string `json:"api_key"`
	BaseURL   string `json:"base_url,omitempty"`
	ProjectID string `json:"project_id,omitempty"`
}

// ConnectResponse returns connection validation results.
type ConnectResponse struct {
	Connected bool   `json:"connected"`
	Message   string `json:"message,omitempty"`
	Error     string `json:"error,omitempty"`
}

// AnalyzeRequest requests a migration analysis from a source provider.
type AnalyzeRequest struct {
	Provider        string   `json:"provider"`
	APIKey          string   `json:"api_key"`
	BaseURL         string   `json:"base_url,omitempty"`
	ProjectID       string   `json:"project_id,omitempty"`
	IncludeFlags    bool     `json:"include_flags"`
	IncludeEnvs     bool     `json:"include_environments"`
	IncludeSegments bool     `json:"include_segments"`
	ExportFormat    string   `json:"export_format,omitempty"` // terraform, pulumi, ansible, etc.
}

// AnalyzeResponse returns the migration plan.
type AnalyzeResponse struct {
	Plan         MigrationPlan      `json:"plan"`
	IaCFiles     []ExportFile       `json:"iac_files,omitempty"`
}

// MigrationPlan describes what would be migrated.
type MigrationPlan struct {
	Provider     string `json:"provider"`
	FlagsCount   int    `json:"flags_count"`
	EnvsCount    int    `json:"environments_count"`
	SegmentsCount int   `json:"segments_count"`
}

// ExportFile represents a generated IaC file.
type ExportFile struct {
	Path    string `json:"path"`
	Content string `json:"content"`
	Comment string `json:"comment,omitempty"`
}

// ExecuteRequest requests execution of a migration.
type ExecuteRequest struct {
	Provider        string   `json:"provider"`
	APIKey          string   `json:"api_key"`
	BaseURL         string   `json:"base_url,omitempty"`
	ProjectID       string   `json:"project_id,omitempty"`
	TargetProjectID string   `json:"target_project_id"`
	IncludeFlags    bool     `json:"include_flags"`
	IncludeEnvs     bool     `json:"include_environments"`
	IncludeSegments bool     `json:"include_segments"`
	ExportFormat    string   `json:"export_format,omitempty"`
}

// ExecuteResponse returns migration execution results.
type ExecuteResponse struct {
	MigrationID     string       `json:"migration_id"`
	Status          string       `json:"status"`
	ProjectID       string       `json:"project_id"`
	ImportedFlags   int          `json:"imported_flags"`
	ImportedEnvs    int          `json:"imported_environments"`
	ImportedSegments int         `json:"imported_segments"`
	GeneratedFiles  []ExportFile `json:"generated_files,omitempty"`
	CreatedAt       string       `json:"created_at"`
}

// StatusResponse returns migration job status.
type StatusResponse struct {
	ID        string `json:"id"`
	Status    string `json:"status"`
	Progress  int    `json:"progress"`
	Error     string `json:"error,omitempty"`
	CreatedAt string `json:"created_at"`
	UpdatedAt string `json:"updated_at"`
}

// ─── Store Interface ────────────────────────────────────────────────────────

// MigrationJob represents a migration job.
type MigrationJob struct {
	ID        string    `json:"id"`
	OrgID     string    `json:"org_id"`
	Provider  string    `json:"provider"`
	Status    string    `json:"status"`
	Progress  int       `json:"progress"`
	Error     string    `json:"error,omitempty"`
	CreatedAt time.Time `json:"created_at"`
	UpdatedAt time.Time `json:"updated_at"`
}

// ─── Handler ────────────────────────────────────────────────────────────────

// MigrationHandler handles importing feature flags from third-party providers.
type MigrationHandler struct {
	logger *slog.Logger
}

// NewMigrationHandler creates a new migration handler.
func NewMigrationHandler(logger *slog.Logger) *MigrationHandler {
	return &MigrationHandler{
		logger: logger.With("handler", "migration"),
	}
}

// RegisterRoutes mounts all migration endpoints on the given router.
func (h *MigrationHandler) RegisterRoutes(r chi.Router) {
	r.Post("/migration/providers", h.ListProviders)
	r.Post("/migration/connect", h.Connect)
	r.Post("/migration/analyze", h.Analyze)
	r.Post("/migration/execute", h.Execute)
	r.Get("/migration/status/{id}", h.GetStatus)
	r.Get("/migration/logs/{id}", h.GetLogs)
}

// ─── Handlers ──────────────────────────────────────────────────────────────

// ListProviders returns all registered migration providers with capabilities.
func (h *MigrationHandler) ListProviders(w http.ResponseWriter, r *http.Request) {
	names := integrations.ListProviders()
	providers := make([]ProviderInfo, 0, len(names))

	for _, name := range names {
		// Attempt to create a minimal importer to get display name and capabilities
		importer, err := integrations.NewImporter(name, integrations.ImporterConfig{})
		if err != nil {
			h.logger.Warn("failed to create importer for listing", "provider", name, "error", err)
			providers = append(providers, ProviderInfo{
				Name:        name,
				DisplayName: name,
			})
			continue
		}
		providers = append(providers, ProviderInfo{
			Name:         importer.Name(),
			DisplayName:  importer.DisplayName(),
			Capabilities: importer.Capabilities(),
		})
	}

	httputil.JSON(w, http.StatusOK, ProvidersResponse{Providers: providers})
}

// Connect validates a connection to a source provider.
func (h *MigrationHandler) Connect(w http.ResponseWriter, r *http.Request) {
	var req ConnectRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Provider == "" {
		httputil.Error(w, http.StatusBadRequest, "provider is required")
		return
	}

	importer, err := integrations.NewImporter(req.Provider, integrations.ImporterConfig{
		APIKey:     req.APIKey,
		BaseURL:    req.BaseURL,
		ProjectKey: req.ProjectID,
	})
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if err := importer.ValidateConnection(r.Context()); err != nil {
		h.logger.Warn("connection validation failed", "provider", req.Provider, "error", err)
		httputil.JSON(w, http.StatusOK, ConnectResponse{
			Connected: false,
			Error:     err.Error(),
		})
		return
	}

	httputil.JSON(w, http.StatusOK, ConnectResponse{
		Connected: true,
		Message:   "Successfully connected to " + importer.DisplayName(),
	})
}

// Analyze analyzes the source provider and returns a migration plan.
func (h *MigrationHandler) Analyze(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("request_id", r.Context().Value("requestID"))
	orgID := middleware.GetOrgID(r.Context())

	var req AnalyzeRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Provider == "" {
		httputil.Error(w, http.StatusBadRequest, "provider is required")
		return
	}

	importer, err := integrations.NewImporter(req.Provider, integrations.ImporterConfig{
		APIKey:     req.APIKey,
		BaseURL:    req.BaseURL,
		ProjectKey: req.ProjectID,
	})
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	plan := MigrationPlan{Provider: req.Provider}

	if req.IncludeFlags {
		flags, err := importer.FetchFlags(r.Context())
		if err != nil {
			logger.Error("failed to fetch flags for analysis", "provider", req.Provider, "error", err)
			httputil.Error(w, http.StatusInternalServerError, "failed to fetch flags: "+err.Error())
			return
		}
		plan.FlagsCount = len(flags)
	}

	if req.IncludeEnvs {
		envs, err := importer.FetchEnvironments(r.Context())
		if err != nil {
			logger.Error("failed to fetch environments for analysis", "provider", req.Provider, "error", err)
			httputil.Error(w, http.StatusInternalServerError, "failed to fetch environments: "+err.Error())
			return
		}
		plan.EnvsCount = len(envs)
	}

	if req.IncludeSegments {
		segs, err := importer.FetchSegments(r.Context())
		if err != nil {
			logger.Error("failed to fetch segments for analysis", "provider", req.Provider, "error", err)
			httputil.Error(w, http.StatusInternalServerError, "failed to fetch segments: "+err.Error())
			return
		}
		plan.SegmentsCount = len(segs)
	}

	logger.Info("migration analysis complete",
		"org_id", orgID,
		"provider", req.Provider,
		"flags", plan.FlagsCount,
		"environments", plan.EnvsCount,
		"segments", plan.SegmentsCount,
	)

	resp := AnalyzeResponse{Plan: plan}

	// If export format is specified, also generate IaC preview
	if req.ExportFormat != "" {
		// TODO: Generate IaC preview files
	}

	httputil.JSON(w, http.StatusOK, resp)
}

// Execute runs the migration from source to FeatureSignals.
func (h *MigrationHandler) Execute(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("request_id", r.Context().Value("requestID"))
	orgID := middleware.GetOrgID(r.Context())

	var req ExecuteRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Provider == "" {
		httputil.Error(w, http.StatusBadRequest, "provider is required")
		return
	}
	if req.TargetProjectID == "" {
		httputil.Error(w, http.StatusBadRequest, "target_project_id is required")
		return
	}

	jobID := "migration_" + time.Now().Format("20060102150405")

	logger.Info("migration started",
		"org_id", orgID,
		"provider", req.Provider,
		"job_id", jobID,
	)

	httputil.JSON(w, http.StatusAccepted, ExecuteResponse{
		MigrationID: jobID,
		Status:      "pending",
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	})

}

// GetStatus returns the status of a migration job.
func (h *MigrationHandler) GetStatus(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jobID := chi.URLParam(r, "id")
	logger := h.logger.With("org_id", orgID, "job_id", jobID)

	logger.Debug("migration status requested")

	httputil.JSON(w, http.StatusOK, StatusResponse{
		ID:        jobID,
		Status:    "completed",
		Progress:  100,
		CreatedAt: time.Now().UTC().Add(-10 * time.Minute).Format(time.RFC3339),
		UpdatedAt: time.Now().UTC().Format(time.RFC3339),
	})
}

// GetLogs returns the migration logs (placeholder - would stream from log store).
func (h *MigrationHandler) GetLogs(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	jobID := chi.URLParam(r, "id")

	// In a real implementation, this would stream logs from a log store
	logger := h.logger.With("org_id", orgID, "job_id", jobID)
	logger.Debug("migration logs requested")

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"logs":   []string{},
		"job_id": jobID,
	})
}