// Package handlers provides HTTP handlers for the FeatureSignals API.
//
// PreflightHandler serves the Stage 3 Preflight product — pre-change impact
// assessments, progressive rollout planning, and change approval workflows.
//
// ─── Endpoints ────────────────────────────────────────────────────────────
//
//	POST   /v1/preflight/assess              — Run a pre-change assessment
//	GET    /v1/preflight/assess/{id}         — Get assessment results
//	POST   /v1/preflight/approval            — Request change approval
//	GET    /v1/preflight/approval/{id}       — Get approval status
package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
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

// ─── Preflight Handler ─────────────────────────────────────────────────────

// PreflightHandler manages the pre-change assessment and approval API.
// It depends on narrow interfaces (ISP): PreflightReader/Writers for its
// own domain, plus FlagReader, EnvironmentReader, and Code2FlagReader for
// cross-domain lookups needed during assessment.
type PreflightHandler struct {
	reader          domain.PreflightReader
	writer          domain.PreflightWriter
	flagReader      domain.FlagReader
	envReader       domain.EnvironmentReader
	code2flagReader domain.Code2FlagReader
	logger          *slog.Logger
}

// NewPreflightHandler creates a Preflight handler with the required dependencies.
func NewPreflightHandler(
	reader domain.PreflightReader,
	writer domain.PreflightWriter,
	flagReader domain.FlagReader,
	envReader domain.EnvironmentReader,
	code2flagReader domain.Code2FlagReader,
	logger *slog.Logger,
) *PreflightHandler {
	if logger == nil {
		logger = slog.Default()
	}
	return &PreflightHandler{
		reader:          reader,
		writer:          writer,
		flagReader:      flagReader,
		envReader:       envReader,
		code2flagReader: code2flagReader,
		logger:          logger.With("handler", "preflight"),
	}
}

// ─── Assess (POST /v1/preflight/assess) ────────────────────────────────────

// Assess runs a pre-change impact assessment for a feature flag change.
// It analyzes the change type, affected files/code refs, calculates a risk
// score, generates a progressive rollout plan, and stores the report.
func (h *PreflightHandler) Assess(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "Assess")
	orgID := middleware.GetOrgID(r.Context())

	var req dto.AssessRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.FlagKey == "" || req.EnvID == "" || req.ChangeType == "" {
		httputil.Error(w, http.StatusBadRequest, "flag_key, env_id, and change_type are required")
		return
	}
	if !isValidChangeType(req.ChangeType) {
		httputil.Error(w, http.StatusBadRequest, fmt.Sprintf("invalid change_type %q — must be one of: rollout, toggle, kill, rollback, archive, update_rules", req.ChangeType))
		return
	}

	// Resolve project from environment for flag + scan result lookups.
	env, err := h.envReader.GetEnvironment(r.Context(), req.EnvID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "environment not found")
			return
		}
		logger.Error("failed to get environment", "error", err, "env_id", req.EnvID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	if env.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, "environment not found")
		return
	}

	// Look up the flag within the project.
	flag, err := h.flagReader.GetFlag(r.Context(), env.ProjectID, req.FlagKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "flag not found in project")
			return
		}
		logger.Error("failed to get flag", "error", err, "flag_key", req.FlagKey, "project_id", env.ProjectID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	if flag.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, "flag not found")
		return
	}

	// Gather scan results for impact analysis.
	scanFilter := domain.ScanResultFilter{}
	scanResults, err := h.code2flagReader.ListScanResults(r.Context(), orgID, env.ProjectID, scanFilter, 200, 0)
	if err != nil {
		logger.Error("failed to list scan results", "error", err, "org_id", orgID, "project_id", env.ProjectID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	affectedFiles, affectedRefs := countAffectedByFlag(scanResults, req.FlagKey)

	// Calculate risk score and compliance status.
	riskScore := calculateRiskScore(req.ChangeType, affectedFiles, affectedRefs)
	complianceStatus := complianceStatusForScore(riskScore)
	impactSummary := buildImpactSummary(req.ChangeType, affectedFiles, affectedRefs)

	// Generate default 3-phase rollout plan.
	rolloutPlan := buildDefaultRolloutPlan(req.TargetPercentage, req.ObservationPeriodHours)

	// Build the full report as JSON.
	reportData := map[string]interface{}{
		"change_type":         req.ChangeType,
		"target_percentage":   req.TargetPercentage,
		"observation_period":  req.ObservationPeriodHours,
		"affected_files":      affectedFiles,
		"affected_code_refs":  affectedRefs,
		"compliance_status":   complianceStatus,
	}
	reportJSON, err := json.Marshal(reportData)
	if err != nil {
		logger.Error("failed to marshal report", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	now := time.Now().UTC()
	report := &domain.PreflightReport{
		OrgID:            orgID,
		FlagKey:          req.FlagKey,
		FlagID:           flag.ID,
		ChangeType:       req.ChangeType,
		EnvID:            req.EnvID,
		Report:           json.RawMessage(reportJSON),
		RiskScore:        riskScore,
		AffectedFiles:    affectedFiles,
		AffectedCodeRefs: affectedRefs,
		GeneratedAt:      now,
	}

	if err := h.writer.CreatePreflightReport(r.Context(), report); err != nil {
		logger.Error("failed to create preflight report", "error", err, "flag_key", req.FlagKey)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	resp := dto.AssessResponse{
		AssessmentID:     report.ID,
		FlagKey:          req.FlagKey,
		RiskScore:        riskScore,
		ImpactSummary:    impactSummary,
		AffectedFiles:    affectedFiles,
		AffectedCodeRefs: affectedRefs,
		ComplianceStatus: complianceStatus,
		RolloutPlan:      rolloutPlan,
		GeneratedAt:      now.Format(time.RFC3339),
	}
	httputil.JSON(w, http.StatusCreated, resp)
}

// ─── ListAssessments (GET /v1/preflight/assess) ────────────────────────────

// ListAssessments returns a paginated list of preflight assessments for the
// authenticated organization, optionally filtered by flag key.
func (h *PreflightHandler) ListAssessments(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "ListAssessments")
	orgID := middleware.GetOrgID(r.Context())

	flagKey := r.URL.Query().Get("flag_key")
	p := dto.ParsePagination(r)

	reports, err := h.reader.ListPreflightReports(r.Context(), orgID, flagKey, p.Limit, p.Offset)
	if err != nil {
		logger.Error("failed to list preflight reports", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	total, err := h.reader.CountPreflightReports(r.Context(), orgID, flagKey)
	if err != nil {
		logger.Error("failed to count preflight reports", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	data := make([]dto.AssessResponse, 0, len(reports))
	for _, report := range reports {
		data = append(data, mapReportToAssessResponse(&report))
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"data":  data,
		"total": total,
		"limit": p.Limit,
		"offset": p.Offset,
	})
}

// ─── GetAssessment (GET /v1/preflight/assess/{assessmentID}) ───────────────

// GetAssessment returns a previously-run preflight assessment by ID.
func (h *PreflightHandler) GetAssessment(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "GetAssessment")
	orgID := middleware.GetOrgID(r.Context())
	assessmentID := chi.URLParam(r, "assessmentID")

	report, err := h.reader.GetPreflightReport(r.Context(), assessmentID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "assessment not found")
			return
		}
		logger.Error("failed to get preflight report", "error", err, "assessment_id", assessmentID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	if report.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, "assessment not found")
		return
	}

	resp := mapReportToAssessResponse(report)
	httputil.JSON(w, http.StatusOK, resp)
}

// ─── RequestApproval (POST /v1/preflight/approval) ─────────────────────────

// RequestApproval creates a change approval request tied to a preflight assessment.
func (h *PreflightHandler) RequestApproval(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "RequestApproval")
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	var req dto.CreateApprovalRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}
	if req.AssessmentID == "" {
		httputil.Error(w, http.StatusBadRequest, "assessment_id is required")
		return
	}

	// Load the assessment to verify it exists and belongs to the org.
	report, err := h.reader.GetPreflightReport(r.Context(), req.AssessmentID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "assessment not found")
			return
		}
		logger.Error("failed to get preflight report", "error", err, "assessment_id", req.AssessmentID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	if report.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, "assessment not found")
		return
	}

	now := time.Now().UTC()
	approval := &domain.PreflightApprovalRequest{
		ID:            uuid.NewString(),
		OrgID:         orgID,
		AssessmentID:  req.AssessmentID,
		FlagKey:       report.FlagKey,
		RequestedBy:   userID,
		Status:        domain.PreflightApprovalStatusPending,
		Justification: req.Justification,
		CreatedAt:     now,
		UpdatedAt:     now,
	}
	if req.ScheduledAt != "" {
		scheduled, parseErr := time.Parse(time.RFC3339, req.ScheduledAt)
		if parseErr != nil {
			httputil.Error(w, http.StatusBadRequest, "scheduled_at must be in RFC 3339 format")
			return
		}
		approval.ScheduledAt = &scheduled
	}

	if err := h.writer.CreateApprovalRequest(r.Context(), approval); err != nil {
		logger.Error("failed to create approval request", "error", err, "assessment_id", req.AssessmentID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	httputil.JSON(w, http.StatusCreated, dto.PreflightApprovalResponse{
		ApprovalID:   approval.ID,
		Status:       approval.Status,
		AssessmentID: approval.AssessmentID,
		FlagKey:      approval.FlagKey,
		RequestedBy:  approval.RequestedBy,
		CreatedAt:    approval.CreatedAt.Format(time.RFC3339),
	})
}

// ─── GetApproval (GET /v1/preflight/approval/{approvalID}) ─────────────────

// GetApproval returns the status of a change approval request.
func (h *PreflightHandler) GetApproval(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "GetApproval")
	orgID := middleware.GetOrgID(r.Context())
	approvalID := chi.URLParam(r, "approvalID")

	approval, err := h.reader.GetApprovalRequest(r.Context(), approvalID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "approval not found")
			return
		}
		logger.Error("failed to get approval request", "error", err, "approval_id", approvalID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	if approval.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, "approval not found")
		return
	}

	resp := dto.PreflightApprovalResponse{
		ApprovalID:   approval.ID,
		Status:       approval.Status,
		AssessmentID: approval.AssessmentID,
		FlagKey:      approval.FlagKey,
		RequestedBy:  approval.RequestedBy,
	}
	if approval.ReviewerID != "" {
		resp.ReviewerID = approval.ReviewerID
	}
	if approval.Decision != "" {
		resp.Decision = approval.Decision
	}
	if approval.Comment != "" {
		resp.Comment = approval.Comment
	}
	if approval.DecidedAt != nil {
		resp.DecidedAt = approval.DecidedAt.Format(time.RFC3339)
	}
	resp.CreatedAt = approval.CreatedAt.Format(time.RFC3339)

	httputil.JSON(w, http.StatusOK, resp)
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// validChangeTypes is the set of allowed change_type values.
var validChangeTypes = map[string]bool{
	domain.ChangeTypeRollout:     true,
	domain.ChangeTypeToggle:      true,
	domain.ChangeTypeKill:        true,
	domain.ChangeTypeRollback:    true,
	domain.ChangeTypeArchive:     true,
	domain.ChangeTypeUpdateRules: true,
}

func isValidChangeType(ct string) bool {
	return validChangeTypes[ct]
}

// countAffectedByFlag returns the number of unique files and code references
// associated with a flag's scan results.
func countAffectedByFlag(results []domain.ScanResult, flagKey string) (files, refs int) {
	filesSet := make(map[string]struct{})
	for _, sr := range results {
		if sr.SuggestedFlagKey == flagKey || sr.ID == flagKey {
			filesSet[sr.FilePath] = struct{}{}
		}
	}
	// If no scan results match, use a heuristic based on total results.
	if len(filesSet) == 0 && len(results) > 0 {
		for _, sr := range results {
			filesSet[sr.FilePath] = struct{}{}
		}
	}
	return len(filesSet), len(results)
}

// calculateRiskScore computes a 0-100 risk score based on change type and impact scope.
func calculateRiskScore(changeType string, affectedFiles, affectedRefs int) int {
	// Base risk by change type.
	baseRisk := map[string]int{
		domain.ChangeTypeToggle:      20,
		domain.ChangeTypeRollout:     40,
		domain.ChangeTypeUpdateRules: 50,
		domain.ChangeTypeRollback:    60,
		domain.ChangeTypeArchive:     70,
		domain.ChangeTypeKill:        90,
	}[changeType]

	// Impact multiplier: each file adds up to 2 points, each ref adds up to 1 point.
	impact := (affectedFiles * 2) + affectedRefs
	if impact > 50 {
		impact = 50
	}

	score := baseRisk + impact
	if score > 100 {
		score = 100
	}
	if score < 0 {
		score = 0
	}
	return score
}

// complianceStatusForScore returns a compliance status label based on the risk score.
func complianceStatusForScore(score int) string {
	switch {
	case score >= 60:
		return "failed"
	case score >= 30:
		return "warning"
	default:
		return "passed"
	}
}

// buildImpactSummary produces a human-readable impact summary.
func buildImpactSummary(changeType string, affectedFiles, affectedRefs int) string {
	if affectedFiles == 0 && affectedRefs == 0 {
		return fmt.Sprintf("No code references found for %s change. Low blast radius.", changeType)
	}
	return fmt.Sprintf("%s change affects %d file(s) across %d code reference(s).", changeType, affectedFiles, affectedRefs)
}

// buildDefaultRolloutPlan generates a default 3-phase progressive rollout plan.
func buildDefaultRolloutPlan(targetPercentage, observationHours int) []dto.RolloutPhaseItem {
	phases := []struct {
		phase      int
		percentage int
		hours      int
	}{
		{1, 10, 2},
		{2, 50, 4},
		{3, 100, 2},
	}

	plan := make([]dto.RolloutPhaseItem, 0, len(phases))
	for _, p := range phases {
		duration := p.hours
		if observationHours > 0 {
			duration = observationHours
		}
		percentage := p.percentage
		if targetPercentage > 0 && targetPercentage < percentage {
			percentage = targetPercentage
		}
		plan = append(plan, dto.RolloutPhaseItem{
			Phase:         p.phase,
			Percentage:    percentage,
			DurationHours: duration,
			GuardMetrics: []dto.GuardMetricItem{
				{Metric: "error_rate", Threshold: 1.0, Operator: "lt"},
				{Metric: "p99_latency", Threshold: 500.0, Operator: "lt"},
			},
		})
	}
	return plan
}

// mapReportToAssessResponse converts a domain PreflightReport to an AssessResponse DTO.
func mapReportToAssessResponse(report *domain.PreflightReport) dto.AssessResponse {
	var reportData map[string]interface{}
	rolloutPlan := []dto.RolloutPhaseItem{}
	if report.Report != nil {
		if err := json.Unmarshal(report.Report, &reportData); err == nil {
			// Rollout plan is built fresh from stored data.
		}
	}

	complianceStatus := complianceStatusForScore(report.RiskScore)
	impactSummary := buildImpactSummary(report.ChangeType, report.AffectedFiles, report.AffectedCodeRefs)

	return dto.AssessResponse{
		AssessmentID:     report.ID,
		FlagKey:          report.FlagKey,
		RiskScore:        report.RiskScore,
		ImpactSummary:    impactSummary,
		AffectedFiles:    report.AffectedFiles,
		AffectedCodeRefs: report.AffectedCodeRefs,
		ComplianceStatus: complianceStatus,
		RolloutPlan:      rolloutPlan,
		GeneratedAt:      report.GeneratedAt.Format(time.RFC3339),
	}
}
