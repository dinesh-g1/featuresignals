package handlers

import (
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/integrations/launchdarkly"
)

// ─── Request / Response types ───────────────────────────────────────────────

// ImportLDRequest is the JSON body for the LaunchDarkly import endpoint.
type ImportLDRequest struct {
	APIKey          string `json:"api_key"`
	ProjectKey      string `json:"project_key"`
	TargetProjectID string `json:"target_project_id"`
}

// ImportLDResponse is returned on a successful import.
type ImportLDResponse struct {
	Status             string `json:"status"`
	FlagsCount         int    `json:"flags_count"`
	EnvironmentsCount  int    `json:"environments_count"`
}

// ─── Handler ────────────────────────────────────────────────────────────────

// ImportHandler handles importing feature flags from third-party providers.
type ImportHandler struct {
	store        domain.FlagWriter
	projectStore domain.ProjectReader
	logger       *slog.Logger
}

// NewImportHandler creates a new import handler.
func NewImportHandler(
	store domain.FlagWriter,
	projectStore domain.ProjectReader,
	logger *slog.Logger,
) *ImportHandler {
	return &ImportHandler{
		store:        store,
		projectStore: projectStore,
		logger:       logger,
	}
}

// ImportLaunchDarkly imports flags from a LaunchDarkly project into a
// FeatureSignals project. It fetches all flags and environments from the
// LD API via the provided API key, maps them to domain types, and persists
// them via the store.
//
// The endpoint requires a valid LaunchDarkly API key with read access to
// the source project, and a target project ID that already exists in
// FeatureSignals.
func (h *ImportHandler) ImportLaunchDarkly(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "import_launchdarkly")

	var req ImportLDRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	defer r.Body.Close()

	// ── Validate request ────────────────────────────────────────────
	if req.APIKey == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "api_key is required")
		return
	}
	if req.ProjectKey == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "project_key is required")
		return
	}
	if req.TargetProjectID == "" {
		httputil.Error(w, http.StatusUnprocessableEntity, "target_project_id is required")
		return
	}

	// Verify the target project exists.
	project, err := h.projectStore.GetProject(r.Context(), req.TargetProjectID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "target project not found")
			return
		}
		logger.Error("failed to verify target project", "error", err, "target_project_id", req.TargetProjectID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// ── Fetch from LaunchDarkly ─────────────────────────────────────
	ldClient := launchdarkly.NewClient(req.APIKey, "https://app.launchdarkly.com")

	environments, err := ldClient.FetchEnvironments(r.Context(), req.ProjectKey)
	if err != nil {
		logger.Error("failed to fetch LD environments", "error", err,
			"ld_project_key", req.ProjectKey)
		httputil.Error(w, http.StatusBadGateway, "failed to fetch environments from LaunchDarkly: "+err.Error())
		return
	}

	ldFlags, err := ldClient.FetchFlags(r.Context(), req.ProjectKey)
	if err != nil {
		logger.Error("failed to fetch LD flags", "error", err,
			"ld_project_key", req.ProjectKey)
		httputil.Error(w, http.StatusBadGateway, "failed to fetch flags from LaunchDarkly: "+err.Error())
		return
	}

	logger.Info("fetched data from LaunchDarkly",
		"flags_count", len(ldFlags),
		"environments_count", len(environments),
		"ld_project_key", req.ProjectKey,
	)

	// ── Map and persist ─────────────────────────────────────────────
	importedCount := 0
	for _, ldFlag := range ldFlags {
		flagImport, err := launchdarkly.MapLDFlagToDomain(ldFlag, environments)
		if err != nil {
			logger.Warn("skipping unmappable LD flag", "flag_key", ldFlag.Key, "error", err)
			continue
		}

		// Assign the target project and org.
		flagImport.Flag.ProjectID = project.ID
		flagImport.Flag.OrgID = project.OrgID

		// Create the flag.
		if err := h.store.CreateFlag(r.Context(), &flagImport.Flag); err != nil {
			if errors.Is(err, domain.ErrConflict) {
				logger.Warn("flag already exists, skipping", "flag_key", ldFlag.Key)
				continue
			}
			logger.Error("failed to create flag", "error", err,
				"flag_key", ldFlag.Key,
				"project_id", project.ID,
			)
			// Continue with the next flag — partial success is acceptable.
			continue
		}

		// Persist each environment state.
		for envKey, state := range flagImport.States {
			if state == nil {
				continue
			}

			// Look up the environment by its LD key. We need the FS env ID.
			// For now, we associate states using the flag ID we just created
			// and let the caller handle environment mapping.
			state.FlagID = flagImport.Flag.ID
			state.OrgID = project.OrgID

			if err := h.store.UpsertFlagState(r.Context(), state); err != nil {
				logger.Error("failed to upsert flag state", "error", err,
					"flag_key", ldFlag.Key,
					"env_key", envKey,
				)
			}
		}

		importedCount++
		logger.Debug("flag imported", "flag_key", ldFlag.Key, "env_states", len(flagImport.States))
	}

	logger.Info("LaunchDarkly import completed",
		"imported_count", importedCount,
		"total_ld_flags", len(ldFlags),
		"ld_environments", len(environments),
	)

	httputil.JSON(w, http.StatusOK, ImportLDResponse{
		Status:            "imported",
		FlagsCount:        importedCount,
		EnvironmentsCount: len(environments),
	})
}