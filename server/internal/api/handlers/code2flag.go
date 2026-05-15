// Package handlers provides HTTP handlers for the FeatureSignals API.
//
// Code2FlagHandler serves the Stage 3 Code2Flag product — feature discovery,
// specification generation, implementation code generation, and cleanup detection.
//
// ─── Endpoints ────────────────────────────────────────────────────────────
//
//	GET    /v1/code2flag/references   — List scan results (discovered conditionals)
//	POST   /v1/code2flag/spec         — Generate a flag specification from references
//	POST   /v1/code2flag/implement    — Generate implementation code for a flag
//	GET    /v1/code2flag/cleanup      — List cleanup candidates (flags safe to remove)
//
// ─── Curl Examples ─────────────────────────────────────────────────────────
//
// List references:
//
//	curl -X GET "http://localhost:8080/v1/code2flag/references?project_id=proj-1&status=unreviewed&limit=20" \
//	  -H "Authorization: Bearer $TOKEN"
//
// Generate flag spec:
//
//	curl -X POST http://localhost:8080/v1/code2flag/spec \
//	  -H "Authorization: Bearer $TOKEN" \
//	  -H "Content-Type: application/json" \
//	  -d '{"flag_key":"dark-mode","repo_name":"myapp/web","references":["sr-1","sr-2"]}'
//
// Generate implementation:
//
//	curl -X POST http://localhost:8080/v1/code2flag/implement \
//	  -H "Authorization: Bearer $TOKEN" \
//	  -H "Content-Type: application/json" \
//	  -d '{"flag_key":"dark-mode","repo_name":"myapp/web","language":"typescript","file_path":"src/features.ts","line_number":42}'
//
// List cleanup candidates:
//
//	curl -X GET "http://localhost:8080/v1/code2flag/cleanup?project_id=proj-1&status=pending" \
//	  -H "Authorization: Bearer $TOKEN"
package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"strings"
	"time"

	"github.com/google/uuid"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/store"
)

// ─── Code2Flag Handler ─────────────────────────────────────────────────────

// Code2FlagHandler manages the Code2Flag feature discovery and generation API.
// It depends on the narrowest interfaces (ISP): reader for queries, writer for
// mutations, and janitorStore for accessing connected repository metadata.
type Code2FlagHandler struct {
	reader       domain.Code2FlagReader
	writer       domain.Code2FlagWriter
	janitorStore store.JanitorStore
	logger       *slog.Logger
}

// NewCode2FlagHandler creates a Code2Flag handler with the required dependencies.
func NewCode2FlagHandler(
	reader domain.Code2FlagReader,
	writer domain.Code2FlagWriter,
	janitorStore store.JanitorStore,
	logger *slog.Logger,
) *Code2FlagHandler {
	if logger == nil {
		logger = slog.Default()
	}
	return &Code2FlagHandler{
		reader:       reader,
		writer:       writer,
		janitorStore: janitorStore,
		logger:       logger.With("handler", "code2flag"),
	}
}

// ─── ListReferences (GET /v1/code2flag/references) ─────────────────────────

// ListReferences returns paginated scan results (discovered conditionals) for a
// project, optionally filtered by type, repository, and status.
func (h *Code2FlagHandler) ListReferences(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "ListReferences")
	orgID := middleware.GetOrgID(r.Context())

	q := r.URL.Query()
	projectID := q.Get("project_id")
	if projectID == "" {
		httputil.Error(w, http.StatusBadRequest, "project_id is required")
		return
	}

	// Build filter from query params
	filter := domain.ScanResultFilter{
		Status:     q.Get("status"),
		Repository: q.Get("repository"),
	}
	// Note: "type" query param (usage/definition/cleanup_candidate) is accepted
	// but not directly mapped to the domain filter — the domain uses ConditionalType
	// which can be extended in future iterations.
	_ = q.Get("type")

	pg := dto.ParsePagination(r)
	results, err := h.reader.ListScanResults(r.Context(), orgID, projectID, filter, pg.Limit, pg.Offset)
	if err != nil {
		logger.Error("failed to list scan results", "error", err, "org_id", orgID, "project_id", projectID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	total, err := h.reader.CountScanResults(r.Context(), orgID, projectID, filter)
	if err != nil {
		logger.Error("failed to count scan results", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Map domain entities to DTO items
	items := make([]dto.Code2FlagReferenceItem, 0, len(results))
	for _, sr := range results {
		items = append(items, dto.Code2FlagReferenceItem{
			ID:              sr.ID,
			Repository:      sr.Repository,
			FilePath:        sr.FilePath,
			LineNumber:      sr.LineNumber,
			ConditionalType: sr.ConditionalType,
			ConditionalText: sr.ConditionalText,
			Confidence:      sr.Confidence,
			Status:          sr.Status,
			ReferenceType:   sr.ConditionalType, // maps such as if-statement=usage, config-check=definition
		})
	}

	httputil.JSON(w, http.StatusOK, dto.ListReferencesResponse{Data: items, Total: total})
}

// ─── CreateSpec (POST /v1/code2flag/spec) ──────────────────────────────────

// CreateSpec generates a feature flag specification from code references.
// It validates input, loads referenced scan results, infers flag type and
// variants, and persists a GeneratedFlag.
func (h *Code2FlagHandler) CreateSpec(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "CreateSpec")
	orgID := middleware.GetOrgID(r.Context())

	var req dto.CreateSpecRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.FlagKey == "" || req.RepoName == "" {
		httputil.Error(w, http.StatusBadRequest, "flag_key and repo_name are required")
		return
	}

	// Load referenced scan results for analysis
	var refs []domain.ScanResult
	for _, refID := range req.References {
		sr, err := h.reader.GetScanResult(r.Context(), refID)
		if err != nil {
			if errors.Is(err, domain.ErrNotFound) {
				logger.Warn("scan result not found", "scan_result_id", refID)
				httputil.Error(w, http.StatusNotFound, fmt.Sprintf("scan result %s not found", refID))
				return
			}
			logger.Error("failed to get scan result", "error", err, "scan_result_id", refID)
			httputil.Error(w, http.StatusInternalServerError, "internal error")
			return
		}
		refs = append(refs, *sr)
	}

	// Generate spec from scan results
	flagType, variants, confidence := h.inferFlagSpec(refs)
	flagName := req.FlagKey // default name from key; real implementation would use LLM

	now := time.Now().UTC()
	gf := &domain.GeneratedFlag{
		ID:               uuid.NewString(),
		OrgID:            orgID,
		ProjectID:        "", // populated when flag is created in a specific project
		Key:              req.FlagKey,
		Name:             flagName,
		Description:      fmt.Sprintf("Auto-generated flag from %d scan results", len(refs)),
		FlagType:         flagType,
		ProposedVariants: variants,
		Status:           domain.GeneratedFlagStatusProposed,
		CreatedAt:        now,
		UpdatedAt:        now,
	}

	if err := h.writer.CreateGeneratedFlag(r.Context(), gf); err != nil {
		logger.Error("failed to create generated flag", "error", err, "flag_key", req.FlagKey)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	httputil.JSON(w, http.StatusCreated, dto.CreateSpecResponse{
		FlagKey:           gf.Key,
		FlagName:          gf.Name,
		FlagType:          gf.FlagType,
		SuggestedVariants: gf.ProposedVariants,
		Confidence:        confidence,
		CreatedAt:         gf.CreatedAt.Format(time.RFC3339),
	})
}

// ─── CreateImplementation (POST /v1/code2flag/implement) ──────────────────

// CreateImplementation generates a code snippet for implementing a feature flag
// in the specified language at the given file path and line number.
func (h *Code2FlagHandler) CreateImplementation(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "CreateImplementation")
	orgID := middleware.GetOrgID(r.Context())

	var req dto.CreateImplementRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.FlagKey == "" || req.RepoName == "" || req.Language == "" || req.FilePath == "" {
		httputil.Error(w, http.StatusBadRequest, "flag_key, repo_name, language, and file_path are required")
		return
	}

	// Find the generated flag by key (list and filter in-memory)
	gfs, err := h.reader.ListGeneratedFlags(r.Context(), orgID, "", 200, 0)
	if err != nil {
		logger.Error("failed to list generated flags", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	var gf *domain.GeneratedFlag
	for i := range gfs {
		if gfs[i].Key == req.FlagKey {
			gf = &gfs[i]
			break
		}
	}
	if gf == nil {
		httputil.Error(w, http.StatusNotFound, fmt.Sprintf("flag %q not found in generated flags", req.FlagKey))
		return
	}

	// Generate implementation code snippet for the target language
	codeSnippet := h.generateCodeSnippet(req.FlagKey, req.Language, gf.FlagType)

	httputil.JSON(w, http.StatusCreated, dto.CreateImplementResponse{
		CodeSnippet: codeSnippet,
		Language:    req.Language,
		FilePath:    req.FilePath,
		CreatedAt:   time.Now().UTC().Format(time.RFC3339),
	})
}

// ─── ListCleanupCandidates (GET /v1/code2flag/cleanup) ────────────────────

// ListCleanupCandidates returns paginated cleanup entries — feature flags that
// are safe to remove from the codebase.
func (h *Code2FlagHandler) ListCleanupCandidates(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "ListCleanupCandidates")
	orgID := middleware.GetOrgID(r.Context())

	q := r.URL.Query()
	projectID := q.Get("project_id")
	if projectID == "" {
		httputil.Error(w, http.StatusBadRequest, "project_id is required")
		return
	}
	// Note: project_id is accepted for API consistency but not directly
	// used in the underlying domain filter (CleanupFilter only supports
	// Status and Reason). Repository filtering is also accepted but
	// requires future domain extension.
	_ = projectID

	// Build filter from query params
	filter := domain.CleanupFilter{
		Status: q.Get("status"),
		Reason: q.Get("reason"),
	}
	// Accept repository param for forward compatibility
	_ = q.Get("repository")

	pg := dto.ParsePagination(r)
	entries, err := h.reader.ListCleanupEntries(r.Context(), orgID, filter, pg.Limit, pg.Offset)
	if err != nil {
		logger.Error("failed to list cleanup entries", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	total, err := h.reader.CountCleanupEntries(r.Context(), orgID, filter)
	if err != nil {
		logger.Error("failed to count cleanup entries", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Map domain entities to DTO items
	items := make([]dto.CleanupCandidateItem, 0, len(entries))
	for _, ce := range entries {
		items = append(items, dto.CleanupCandidateItem{
			ID:                  ce.ID,
			FlagKey:             ce.FlagKey,
			Reason:              ce.Reason,
			DaysSince100Percent: ce.DaysSince100Percent,
			PRURL:               ce.PRURL,
			Status:              ce.Status,
			CreatedAt:           ce.CreatedAt.Format(time.RFC3339),
		})
	}

	httputil.JSON(w, http.StatusOK, dto.ListCleanupResponse{Data: items, Total: total})
}

// ─── Helper Methods ────────────────────────────────────────────────────────

// inferFlagSpec analyzes scan results to infer a flag type, suggested variants,
// and confidence score.
func (h *Code2FlagHandler) inferFlagSpec(refs []domain.ScanResult) (flagType string, variants json.RawMessage, confidence float64) {
	if len(refs) == 0 {
		return "boolean", nil, 0.5
	}

	// Count conditional types to infer the best flag type
	typeCounts := map[string]int{}
	var totalConf float64
	for _, sr := range refs {
		typeCounts[sr.ConditionalType]++
		totalConf += sr.Confidence
	}

	// Infer flag type based on conditional patterns
	switch {
	case typeCounts[domain.ConditionalTypeIfStatement] > len(refs)/2:
		flagType = "boolean"
	case typeCounts[domain.ConditionalTypeConfigCheck] > len(refs)/2:
		flagType = "multi_variant"
	case typeCounts[domain.ConditionalTypeSwitchCase] > 0:
		flagType = "multi_variant"
	default:
		flagType = "boolean"
	}

	// Compute average confidence
	confidence = totalConf / float64(len(refs))
	// Clamp to [0, 1]
	confidence = math.Max(0, math.Min(1, confidence))

	// Generate suggested variants based on flag type
	if flagType == "boolean" {
		variants = json.RawMessage(`[{"key":"on","name":"Enabled","value":true},{"key":"off","name":"Disabled","value":false}]`)
	}

	return flagType, variants, confidence
}

// generateCodeSnippet produces a language-specific code snippet for
// implementing a feature flag at a given location.
func (h *Code2FlagHandler) generateCodeSnippet(flagKey, language, flagType string) string {
	switch strings.ToLower(language) {
	case "typescript", "ts":
		return fmt.Sprintf(`import { isEnabled } from '@featuresignals/sdk';

if (isEnabled('%s')) {
  // New feature code here
} else {
  // Existing behavior
}`, flagKey)
	case "javascript", "js":
		return fmt.Sprintf(`const { isEnabled } = require('@featuresignals/sdk');

if (isEnabled('%s')) {
  // New feature code here
} else {
  // Existing behavior
}`, flagKey)
	case "python", "py":
		return fmt.Sprintf(`from featuresignals import is_enabled

if is_enabled('%s'):
    # New feature code here
    pass
else:
    # Existing behavior
    pass`, flagKey)
	case "go", "golang":
		return fmt.Sprintf(`import "github.com/featuresignals/sdk-go"

if featuresignals.IsEnabled(ctx, "%s") {
    // New feature code here
} else {
    // Existing behavior
}`, flagKey)
	case "java":
		return fmt.Sprintf(`import com.featuresignals.sdk.FeatureSignals;

if (FeatureSignals.isEnabled("%s")) {
    // New feature code here
} else {
    // Existing behavior
}`, flagKey)
	case "ruby", "rb":
		return fmt.Sprintf(`require 'featuresignals'

if FeatureSignals.is_enabled?('%s')
  # New feature code here
else
  # Existing behavior
end`, flagKey)
	case "rust", "rs":
		return fmt.Sprintf(`use featuresignals::is_enabled;

if is_enabled("%s") {
    // New feature code here
} else {
    // Existing behavior
}`, flagKey)
	case "csharp", "cs", "dotnet":
		return fmt.Sprintf(`using FeatureSignals.Sdk;

if (FeatureSignals.IsEnabled("%s"))
{
    // New feature code here
}
else
{
    // Existing behavior
}`, flagKey)
	default:
		// Generic snippet for unknown languages
		return fmt.Sprintf(`// Feature flag: %s
// Replace with your SDK's evaluation call
if (evaluateFlag("%s")) {
  // New feature code
} else {
  // Existing behavior
}`, flagKey, flagKey)
	}
}
