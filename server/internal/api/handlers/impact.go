// Package handlers provides HTTP handlers for the FeatureSignals API.
//
// ImpactHandler serves the Stage 3 Impact Analyzer product — post-rollout
// impact measurement, cost attribution, and organizational learning.
package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"time"

	"github.com/go-chi/chi/v5"
	"github.com/google/uuid"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// ─── Impact Handler ────────────────────────────────────────────────────────

// ImpactHandler manages impact reports, cost attributions, and organizational
// learnings. It depends on the narrowest interfaces (ISP).
type ImpactHandler struct {
	reader       domain.ImpactReader
	writer       domain.ImpactWriter
	flagReader   domain.FlagReader
	code2flagReader domain.Code2FlagReader
	logger       *slog.Logger
}

// NewImpactHandler creates an ImpactHandler with the required dependencies.
func NewImpactHandler(
	reader domain.ImpactReader,
	writer domain.ImpactWriter,
	flagReader domain.FlagReader,
	code2flagReader domain.Code2FlagReader,
	logger *slog.Logger,
) *ImpactHandler {
	if logger == nil {
		logger = slog.Default()
	}
	return &ImpactHandler{
		reader:          reader,
		writer:          writer,
		flagReader:      flagReader,
		code2flagReader: code2flagReader,
		logger:          logger.With("handler", "impact"),
	}
}

// ─── GetImpactReport (GET /v1/impact/report/{flagKey}) ─────────────────────

// GetImpactReport returns the impact report for a specific flag, including
// metrics snapshot, business impact, cost attribution, and recommendations.
// If no report exists, it generates a basic one on the fly.
func (h *ImpactHandler) GetImpactReport(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "GetImpactReport")
	orgID := middleware.GetOrgID(r.Context())
	flagKey := chi.URLParam(r, "flagKey")
	projectID := r.URL.Query().Get("project_id")

	// Look up the flag by scanning all projects for this org.
	flags, err := h.flagReader.ListFlagsWithFilter(r.Context(), orgID, projectID, "", 1000, 0)
	if err != nil {
		logger.Error("failed to list flags", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	var found *domain.Flag
	for i := range flags {
		if flags[i].Key == flagKey {
			found = &flags[i]
			break
		}
	}
	if found == nil {
		httputil.Error(w, http.StatusNotFound, "flag not found")
		return
	}

	// Try to get the latest impact report
	report, err := h.reader.GetLatestImpactReport(r.Context(), orgID, flagKey)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		logger.Error("failed to get latest impact report", "error", err, "flag_key", flagKey)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if report != nil {
		// Return the existing report
		costBreakdown := h.fetchCostBreakdown(r.Context(), orgID, flagKey)

		httputil.JSON(w, http.StatusOK, dto.ImpactReportResponse{
			FlagKey:         report.FlagKey,
			Report:          report.Report,
			MetricsSnapshot: report.MetricsSnapshot,
			BusinessImpact:  report.BusinessImpact,
			CostAttribution: report.CostAttribution,
			Recommendations: report.Recommendations,
			GeneratedAt:     report.GeneratedAt.Format(time.RFC3339),
			CostBreakdown:   costBreakdown,
		})
		return
	}

	// No report exists — generate a basic one
	basicReport := h.generateBasicReport(flagKey, found)
	costBreakdown := h.fetchCostBreakdown(r.Context(), orgID, flagKey)

	// Persist the generated report
	now := time.Now().UTC()
	reportJSON, _ := json.Marshal(basicReport)

	newReport := &domain.ImpactReport{
		ID:              uuid.NewString(),
		OrgID:           orgID,
		FlagKey:         flagKey,
		FlagID:          found.ID,
		Report:          json.RawMessage(reportJSON),
		BusinessImpact:  "neutral",
		CostAttribution: basicReport.CostAttribution,
		GeneratedAt:     now,
		CreatedAt:       now,
		UpdatedAt:       now,
	}

	if err := h.writer.CreateImpactReport(r.Context(), newReport); err != nil {
		logger.Warn("failed to persist generated impact report", "error", err)
		// Non-fatal: still return the generated report
	}

	httputil.JSON(w, http.StatusOK, dto.ImpactReportResponse{
		FlagKey:         flagKey,
		Report:          json.RawMessage(reportJSON),
		BusinessImpact:  "neutral",
		CostAttribution: basicReport.CostAttribution,
		GeneratedAt:     now.Format(time.RFC3339),
		CostBreakdown:   costBreakdown,
	})
}

// ─── GetOrgLearnings (GET /v1/impact/learnings) ────────────────────────────

// GetOrgLearnings returns organizational learnings — aggregated insights
// across all flags in the organization. If no learning record exists, it
// generates a basic one on the fly.
func (h *ImpactHandler) GetOrgLearnings(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "GetOrgLearnings")
	orgID := middleware.GetOrgID(r.Context())

	// Try to get the latest org learning
	learning, err := h.reader.GetOrgLearning(r.Context(), orgID)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		logger.Error("failed to get org learning", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	if learning != nil {
		httputil.JSON(w, http.StatusOK, dto.OrgLearningsResponse{
			TotalFlagsAnalyzed:       learning.TotalFlagsAnalyzed,
			CleanupCandidates:        learning.CleanupCandidates,
			FlagsWithoutOwners:       learning.FlagsWithoutOwners,
			StaleFlags:               learning.StaleFlags,
			AvgRiskScore:             learning.AvgRiskScore,
			AvgTimeToFullRolloutHours: learning.AvgTimeToFullRollout,
			TopInsights:              learning.TopInsights,
			GeneratedAt:              learning.GeneratedAt.Format(time.RFC3339),
		})
		return
	}

	// No learning record exists — generate a basic one
	basicLearning := h.generateBasicLearning(orgID)

	now := time.Now().UTC()
	newLearning := &domain.OrgLearning{
		ID:                   uuid.NewString(),
		OrgID:                orgID,
		TotalFlagsAnalyzed:   basicLearning.TotalFlagsAnalyzed,
		CleanupCandidates:    basicLearning.CleanupCandidates,
		FlagsWithoutOwners:   basicLearning.FlagsWithoutOwners,
		StaleFlags:           basicLearning.StaleFlags,
		AvgRiskScore:         basicLearning.AvgRiskScore,
		AvgTimeToFullRollout: basicLearning.AvgTimeToFullRolloutHours,
		TopInsights:          basicLearning.TopInsights,
		GeneratedAt:          now,
		CreatedAt:            now,
		UpdatedAt:            now,
	}

	if err := h.writer.CreateOrgLearning(r.Context(), newLearning); err != nil {
		logger.Warn("failed to persist generated org learning", "error", err)
		// Non-fatal: still return the generated data
	}

	httputil.JSON(w, http.StatusOK, *basicLearning)
}

// ─── Helper Types & Methods ────────────────────────────────────────────────

// basicReportResult holds a generated report before persistence.
type basicReportResult struct {
	CostAttribution float64 `json:"cost_attribution"`
	TotalFlags      int     `json:"total_flags"`
	ActiveFlags     int     `json:"active_flags"`
}

// generateBasicReport creates a minimal impact report when none exists.
func (h *ImpactHandler) generateBasicReport(flagKey string, flag *domain.Flag) *basicReportResult {
	// Estimate cost based on flag type and status
	cost := 0.0
	switch flag.FlagType {
	case domain.FlagTypeBoolean:
		cost = 0.01 // minimal compute cost for boolean checks
	case domain.FlagTypeString, domain.FlagTypeNumber:
		cost = 0.02
	case domain.FlagTypeJSON:
		cost = 0.05
	default:
		cost = 0.01
	}

	return &basicReportResult{
		CostAttribution: cost,
		TotalFlags:      1,
		ActiveFlags:     1,
	}
}

// generateBasicLearning creates a minimal org learning when none exists.
func (h *ImpactHandler) generateBasicLearning(orgID string) *dto.OrgLearningsResponse {
	// Count total flags in the org to populate basic metrics
	ctx := context.Background()
	totalFlags, err := h.flagReader.CountFlagsWithFilter(ctx, orgID, "", "")
	if err != nil || totalFlags == 0 {
		return &dto.OrgLearningsResponse{
			TotalFlagsAnalyzed:       0,
			TopInsights:              json.RawMessage(`[]`),
			GeneratedAt:              time.Now().UTC().Format(time.RFC3339),
		}
	}

	return &dto.OrgLearningsResponse{
		TotalFlagsAnalyzed:       totalFlags,
		AvgRiskScore:             0.0,
		AvgTimeToFullRolloutHours: 0.0,
		TopInsights:               json.RawMessage(`[]`),
		GeneratedAt:               time.Now().UTC().Format(time.RFC3339),
	}
}

// fetchCostBreakdown retrieves cost attributions for a given flag.
func (h *ImpactHandler) fetchCostBreakdown(ctx context.Context, orgID, flagKey string) []dto.CostAttributionItem {
	costs, err := h.reader.ListCostAttributions(ctx, orgID, flagKey)
	if err != nil || len(costs) == 0 {
		return nil
	}

	items := make([]dto.CostAttributionItem, 0, len(costs))
	for _, c := range costs {
		items = append(items, dto.CostAttributionItem{
			ResourceType: c.ResourceType,
			CostAmount:   c.CostAmount,
			Currency:     c.Currency,
			PeriodStart:  c.PeriodStart.Format(time.RFC3339),
			PeriodEnd:    c.PeriodEnd.Format(time.RFC3339),
		})
	}
	return items
}


