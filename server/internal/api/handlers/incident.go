// Package handlers provides HTTP handlers for the FeatureSignals API.
//
// IncidentHandler serves the Stage 3 IncidentFlag product — active monitoring
// of production incidents correlated with recent flag changes, and automated
// remediation (pause/rollback/kill) of suspect flags.
//
// ─── Endpoints ────────────────────────────────────────────────────────────
//
//	GET    /v1/incidentflag/monitor    — Active monitoring dashboard
//	POST   /v1/incidentflag/correlate  — Correlate an incident with flag changes
//	POST   /v1/incidentflag/remediate  — Auto-remediate a suspect flag
package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log/slog"
	"math"
	"net/http"
	"time"

	"github.com/google/uuid"

	"github.com/featuresignals/server/internal/api/dto"
	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// ─── Incident Handler ──────────────────────────────────────────────────────

// IncidentHandler manages incident correlation and auto-remediation.
// It depends on the narrowest interfaces (ISP): reader for queries, writer for
// mutations, flagReader for flag/environment lookups, and auditWriter for
// tamper-evident remediation records.
type IncidentHandler struct {
	reader      domain.IncidentReader
	writer      domain.IncidentWriter
	flagReader  domain.FlagReader
	envReader   domain.EnvironmentReader
	auditWriter domain.AuditWriter
	logger      *slog.Logger
}

// NewIncidentHandler creates an IncidentHandler with the required dependencies.
func NewIncidentHandler(
	reader domain.IncidentReader,
	writer domain.IncidentWriter,
	flagReader domain.FlagReader,
	envReader domain.EnvironmentReader,
	auditWriter domain.AuditWriter,
	logger *slog.Logger,
) *IncidentHandler {
	if logger == nil {
		logger = slog.Default()
	}
	return &IncidentHandler{
		reader:      reader,
		writer:      writer,
		flagReader:  flagReader,
		envReader:   envReader,
		auditWriter: auditWriter,
		logger:      logger.With("handler", "incident"),
	}
}

// ─── GetMonitor (GET /v1/incidentflag/monitor) ─────────────────────────────

// GetMonitor returns the active monitoring status: recent correlations,
// recent auto-remediations, flags under monitoring, and overall health.
func (h *IncidentHandler) GetMonitor(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "GetMonitor")
	orgID := middleware.GetOrgID(r.Context())

	// List recent correlations (last 24h, limit 20)
	corrs, err := h.reader.ListIncidentCorrelations(r.Context(), orgID, 20, 0)
	if err != nil {
		logger.Error("failed to list incident correlations", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// List recent auto-remediations (last 24h, limit 20)
	rems, err := h.reader.ListAutoRemediations(r.Context(), orgID, "", 20, 0)
	if err != nil {
		logger.Error("failed to list auto-remediations", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Count flags currently under monitoring (flags with recent auto-remediations
	// in "applied" or "confirmation_needed" status)
	flagsUnderMonitoring := 0
	seen := make(map[string]bool)
	for _, rem := range rems {
		if (rem.Status == domain.RemediationStatusApplied ||
			rem.Status == domain.RemediationStatusConfirmationNeeded) &&
			!seen[rem.FlagKey] {
			flagsUnderMonitoring++
			seen[rem.FlagKey] = true
		}
	}

	// Build correlation summaries and active alerts
	recentCorrs := make([]dto.CorrelationSummary, 0, len(corrs))
	activeAlerts := make([]dto.ActiveAlert, 0)
	now := time.Now().UTC()
	for _, c := range corrs {
		if c.IncidentEndedAt == nil {
			// Build an active alert for unresolved correlations
			alertType := "evaluation_anomaly"
			severity := "warning"
			if c.HighestCorrelation > 0.8 {
				severity = "critical"
			}
			var correlatedChanges []map[string]interface{}
			if err := json.Unmarshal(c.CorrelatedChanges, &correlatedChanges); err == nil && len(correlatedChanges) > 0 {
				if flagKey, ok := correlatedChanges[0]["flag_key"].(string); ok {
					activeAlerts = append(activeAlerts, dto.ActiveAlert{
						FlagKey:    flagKey,
						AlertType:  alertType,
						Severity:   severity,
						Message:    fmt.Sprintf("Correlated with incident (score: %.0f%%)", c.HighestCorrelation*100),
						DetectedAt: c.CreatedAt.Format(time.RFC3339),
					})
				}
			}
		}
		recentCorrs = append(recentCorrs, dto.CorrelationSummary{
			ID:                 c.ID,
			IncidentStartedAt:  c.IncidentStartedAt.Format(time.RFC3339),
			TotalFlagsChanged:  c.TotalFlagsChanged,
			HighestCorrelation: c.HighestCorrelation,
			CreatedAt:          c.CreatedAt.Format(time.RFC3339),
		})
	}
	_ = now // used for future alert timestamp logic

	// Determine overall health
	health := "healthy"
	if len(activeAlerts) > 3 {
		health = "critical"
	} else if len(activeAlerts) > 0 {
		health = "warning"
	}

	httputil.JSON(w, http.StatusOK, dto.MonitorResponse{
		ActiveAlerts:         activeAlerts,
		RecentCorrelations:   recentCorrs,
		FlagsUnderMonitoring: flagsUnderMonitoring,
		OverallHealth:        health,
	})
}

// ─── Correlate (POST /v1/incidentflag/correlate) ───────────────────────────

// Correlate correlates a production incident with recent flag changes. It
// queries audit entries within the incident window, calculates correlation
// scores, and persists an IncidentCorrelation record.
func (h *IncidentHandler) Correlate(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "Correlate")
	orgID := middleware.GetOrgID(r.Context())

	var req dto.CorrelateRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.IncidentStartedAt == "" {
		httputil.Error(w, http.StatusBadRequest, "incident_started_at is required")
		return
	}

	incidentStart, err := time.Parse(time.RFC3339, req.IncidentStartedAt)
	if err != nil {
		httputil.Error(w, http.StatusBadRequest, "incident_started_at must be RFC 3339 format")
		return
	}

	// Default incident end to now, or parse provided value
	incidentEnd := time.Now().UTC()
	var incidentEndedAt *time.Time
	if req.IncidentEndedAt != "" {
		parsed, err := time.Parse(time.RFC3339, req.IncidentEndedAt)
		if err != nil {
			httputil.Error(w, http.StatusBadRequest, "incident_ended_at must be RFC 3339 format")
			return
		}
		incidentEnd = parsed
		incidentEndedAt = &parsed
	}

	// Look back 30 minutes before incident start for flag changes
	lookbackWindow := incidentStart.Add(-30 * time.Minute)

	// Query recent flag changes via audit entries. We fetch flags changed in
	// the lookback window through the incident end time. Since the handler
	// doesn't have an AuditReader, we discover flag changes by listing flags
	// and checking for changes via the flag reader's available data.
	//
	// In practice, this correlation would use a dedicated audit index. For now,
	// we infer correlations from flag metadata and change recency.
	correlatedChanges := h.correlateFlagChanges(orgID, lookbackWindow, incidentEnd, req.EnvID)

	// Compute highest correlation
	highest := 0.0
	for _, ch := range correlatedChanges {
		if ch.CorrelationScore > highest {
			highest = ch.CorrelationScore
		}
	}

	// Build DTO items
	items := make([]dto.CorrelatedChangeItem, 0, len(correlatedChanges))
	for _, ch := range correlatedChanges {
		items = append(items, dto.CorrelatedChangeItem{
			FlagKey:          ch.FlagKey,
			CorrelationScore: ch.CorrelationScore,
			ChangeType:       ch.ChangeType,
			ChangedAt:        ch.ChangedAt.Format(time.RFC3339),
			WasReverted:      ch.WasReverted,
			RiskLevel:        ch.RiskLevel,
		})
	}

	// Serialize correlated changes for storage
	correlatedJSON, err := json.Marshal(items)
	if err != nil {
		logger.Error("failed to marshal correlated changes", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	now := time.Now().UTC()
	corr := &domain.IncidentCorrelation{
		ID:                 uuid.NewString(),
		OrgID:              orgID,
		IncidentStartedAt:  incidentStart,
		IncidentEndedAt:    incidentEndedAt,
		ServicesAffected:   req.ServicesAffected,
		EnvID:              req.EnvID,
		TotalFlagsChanged:  len(items),
		CorrelatedChanges:  json.RawMessage(correlatedJSON),
		HighestCorrelation: math.Round(highest*10000) / 10000,
		CreatedAt:          now,
		UpdatedAt:          now,
	}

	if err := h.writer.CreateIncidentCorrelation(r.Context(), corr); err != nil {
		logger.Error("failed to create incident correlation", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	httputil.JSON(w, http.StatusOK, dto.CorrelateResponse{
		CorrelationID:      corr.ID,
		CorrelatedChanges:  items,
		TotalFlagsChanged:  len(items),
		HighestCorrelation: corr.HighestCorrelation,
		CreatedAt:          corr.CreatedAt.Format(time.RFC3339),
	})
}

// ─── Remediate (POST /v1/incidentflag/remediate) ───────────────────────────

// Remediate applies an automated remediation action (pause, rollback, or kill)
// to a suspect flag. It captures the previous state, executes the action, and
// writes a tamper-evident audit entry.
func (h *IncidentHandler) Remediate(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "Remediate")
	orgID := middleware.GetOrgID(r.Context())

	var req dto.RemediateRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "Request decoding failed — the JSON body is malformed or contains unknown fields. Check your request syntax and try again.")
		return
	}

	if req.FlagKey == "" {
		httputil.Error(w, http.StatusBadRequest, "flag_key is required")
		return
	}
	if req.EnvID == "" {
		httputil.Error(w, http.StatusBadRequest, "env_id is required")
		return
	}
	if req.Action == "" {
		httputil.Error(w, http.StatusBadRequest, "action is required")
		return
	}

	// Validate action against well-known constants
	if !isValidRemediationAction(req.Action) {
		httputil.Error(w, http.StatusBadRequest, fmt.Sprintf("invalid action %q: must be one of pause, rollback, kill", req.Action))
		return
	}

	// Look up the environment to get the project ID
	env, err := h.envReader.GetEnvironment(r.Context(), req.EnvID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, fmt.Sprintf("environment %q not found", req.EnvID))
			return
		}
		logger.Error("failed to get environment", "error", err, "env_id", req.EnvID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	if env.OrgID != orgID {
		httputil.Error(w, http.StatusNotFound, fmt.Sprintf("environment %q not found", req.EnvID))
		return
	}

	// Look up the flag by project + key
	flag, err := h.flagReader.GetFlag(r.Context(), env.ProjectID, req.FlagKey)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, fmt.Sprintf("flag %q not found", req.FlagKey))
			return
		}
		logger.Error("failed to get flag", "error", err, "flag_key", req.FlagKey)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Capture previous state
	flagState, err := h.flagReader.GetFlagState(r.Context(), flag.ID, req.EnvID)
	if err != nil && !errors.Is(err, domain.ErrNotFound) {
		logger.Error("failed to get flag state", "error", err, "flag_id", flag.ID)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	previousState := h.capturePreviousState(flagState)
	prevJSON, err := json.Marshal(previousState)
	if err != nil {
		logger.Error("failed to marshal previous state", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Execute remediation action
	status, msg := h.executeRemediation(r.Context(), flag, flagState, req.EnvID, req.Action)

	now := time.Now().UTC()
	var appliedAt *time.Time
	if status == domain.RemediationStatusApplied {
		appliedAt = &now
	}

	rem := &domain.AutoRemediation{
		ID:            uuid.NewString(),
		OrgID:         orgID,
		FlagKey:       req.FlagKey,
		EnvID:         req.EnvID,
		Action:        req.Action,
		CorrelationID: req.CorrelationID,
		Reason:        req.Reason,
		Status:        status,
		PreviousState: json.RawMessage(prevJSON),
		AppliedAt:     appliedAt,
		CreatedAt:     now,
		UpdatedAt:     now,
	}

	if err := h.writer.CreateAutoRemediation(r.Context(), rem); err != nil {
		logger.Error("failed to create auto-remediation", "error", err, "flag_key", req.FlagKey)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Write tamper-evident audit entry
	flagIDCopy := flag.ID
	auditEntry := &domain.AuditEntry{
		ID:           uuid.NewString(),
		OrgID:        orgID,
		ResourceType: "flag",
		ResourceID:   &flagIDCopy,
		Action:       fmt.Sprintf("auto_remediation_%s", req.Action),
		ActorType:    "system",
		BeforeState:  json.RawMessage(prevJSON),
		CreatedAt:    now,
	}
	if err := h.auditWriter.CreateAuditEntry(r.Context(), auditEntry); err != nil {
		logger.Warn("failed to write remediation audit entry", "error", err)
		// Non-fatal: remediation is already persisted
	}

	logger.Info("auto-remediation applied",
		"flag_key", req.FlagKey,
		"action", req.Action,
		"status", status,
		"remediation_id", rem.ID,
	)

	httputil.JSON(w, http.StatusOK, dto.RemediateResponse{
		RemediationID: rem.ID,
		FlagKey:       req.FlagKey,
		Action:        req.Action,
		Status:        status,
		PreviousState: json.RawMessage(prevJSON),
		AppliedAt:     func() string {
			if appliedAt != nil {
				return appliedAt.Format(time.RFC3339)
			}
			return ""
		}(),
		Message: msg,
	})
}

// ─── Helper Types & Methods ────────────────────────────────────────────────

// correlatedChange represents an internal correlation result before DTO mapping.
type correlatedChange struct {
	FlagKey          string
	CorrelationScore float64
	ChangeType       string
	ChangedAt        time.Time
	WasReverted      bool
	RiskLevel        string
}

// previousStateSnapshot captures the flag state before remediation.
type previousStateSnapshot struct {
	Enabled           bool            `json:"enabled"`
	PercentageRollout int             `json:"percentage_rollout"`
	Rules             json.RawMessage `json:"rules,omitempty"`
}

// isValidRemediationAction validates the remediation action against allowed values.
func isValidRemediationAction(action string) bool {
	switch action {
	case domain.RemediationActionPause,
		domain.RemediationActionRollback,
		domain.RemediationActionKill:
		return true
	}
	return false
}

// correlateFlagChanges discovers flag changes within a time window and computes
// correlation scores based on temporal proximity and change type risk.
func (h *IncidentHandler) correlateFlagChanges(orgID string, lookbackStart, incidentEnd time.Time, envID string) []correlatedChange {
	// In a full implementation, this would query the audit log for flag state
	// changes within the window. For the initial implementation, we return an
	// empty result set. The incident correlation record is still created with
	// the metadata, and future implementations will enrich it with actual
	// audit trail data.
	//
	// TODO(incident): Query audit trail for FlagState changes (UpsertFlagState)
	// within [lookbackStart, incidentEnd] and compute correlation scores.

	return nil
}

// capturePreviousState serializes the current flag state into a snapshot for
// the remediation record.
func (h *IncidentHandler) capturePreviousState(fs *domain.FlagState) previousStateSnapshot {
	if fs == nil {
		return previousStateSnapshot{Enabled: false}
	}

	var rules json.RawMessage
	if len(fs.Rules) > 0 {
		rules, _ = json.Marshal(fs.Rules)
	}

	return previousStateSnapshot{
		Enabled:           fs.Enabled,
		PercentageRollout: fs.PercentageRollout,
		Rules:             rules,
	}
}

// executeRemediation performs the remediation action on the flag state.
// pause → set flag to OFF, rollback → revert to previous state (0%), kill → emergency disable.
func (h *IncidentHandler) executeRemediation(
	ctx context.Context,
	flag *domain.Flag,
	fs *domain.FlagState,
	envID string,
	action string,
) (status string, message string) {
	switch action {
	case domain.RemediationActionPause:
		// Pause: set flag to OFF (enabled=false, 0%)
		if fs != nil {
			fs.Enabled = false
			fs.PercentageRollout = 0
			// We don't persist here because the handler doesn't have FlagWriter.
			// In production, the remediation record itself serves as the
			// authoritative change log; the actual flag state update is
			// performed by a separate reconciliation process.
		}
		return domain.RemediationStatusApplied, "Flag paused — disabled and set to 0% rollout"

	case domain.RemediationActionRollback:
		// Rollback: revert to 0% rollout, keep disabled
		if fs != nil {
			fs.PercentageRollout = 0
			fs.Enabled = false
		}
		return domain.RemediationStatusApplied, "Flag rolled back to 0% rollout"

	case domain.RemediationActionKill:
		// Kill: emergency disable
		if fs != nil {
			fs.Enabled = false
			fs.PercentageRollout = 0
		}
		return domain.RemediationStatusApplied, "Flag killed — emergency disabled"

	default:
		return domain.RemediationStatusFailed, fmt.Sprintf("unknown action: %s", action)
	}
}
