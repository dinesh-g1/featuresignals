package handlers

import (
	"encoding/json"
	"errors"
	"fmt"
	"net"
	"net/http"
	"strconv"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/go-chi/chi/v5"
)

// OpsStore defines the methods the ops handler needs.
type OpsStore interface {
	domain.OpsStore
	domain.OrgReader
	domain.UserReader
}

// OpsHandler handles all /api/v1/ops/* routes.
type OpsHandler struct {
	store  OpsStore
	mailer LifecycleSender
}

// NewOpsHandler creates a new ops handler.
func NewOpsHandler(store OpsStore, mailer LifecycleSender) *OpsHandler {
	return &OpsHandler{store: store, mailer: mailer}
}

// ─── License Routes ───────────────────────────────────────────────────

func (h *OpsHandler) ListLicenses(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	licenses, total, err := h.store.ListLicenses(r.Context(), q.Get("plan"), q.Get("deployment_model"), q.Get("search"))
	if err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to list licenses", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list licenses")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]any{"licenses": licenses, "total": total})
}

func (h *OpsHandler) GetLicense(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	lic, err := h.store.GetLicense(r.Context(), id)
	if err != nil {
		if isNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "license not found")
			return
		}
		httputil.LoggerFromContext(r.Context()).Error("failed to get license", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to get license")
		return
	}
	httputil.JSON(w, http.StatusOK, lic)
}

func (h *OpsHandler) GetLicenseByOrg(w http.ResponseWriter, r *http.Request) {
	orgID := chi.URLParam(r, "org_id")
	lic, err := h.store.GetLicenseByOrg(r.Context(), orgID)
	if err != nil {
		if isNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "license not found")
			return
		}
		httputil.LoggerFromContext(r.Context()).Error("failed to get license by org", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to get license")
		return
	}
	httputil.JSON(w, http.StatusOK, lic)
}

func (h *OpsHandler) CreateLicense(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_create_license")
	userID := middleware.GetUserID(r.Context())

	var req struct {
		OrgID            string     `json:"org_id"`
		CustomerName     string     `json:"customer_name"`
		CustomerEmail    string     `json:"customer_email,omitempty"`
		Plan             string     `json:"plan"`
		BillingCycle     string     `json:"billing_cycle,omitempty"`
		MaxSeats         int        `json:"max_seats,omitempty"`
		MaxProjects      int        `json:"max_projects,omitempty"`
		MaxEnvironments  int        `json:"max_environments,omitempty"`
		MaxEvalsPerMonth int64      `json:"max_evaluations_per_month,omitempty"`
		ExpiresAt        *time.Time `json:"expires_at,omitempty"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.CustomerName == "" || req.Plan == "" {
		httputil.Error(w, http.StatusBadRequest, "customer_name and plan are required")
		return
	}

	lic := &domain.License{
		OrgID:            req.OrgID,
		CustomerName:     req.CustomerName,
		CustomerEmail:    req.CustomerEmail,
		Plan:             req.Plan,
		BillingCycle:     req.BillingCycle,
		MaxSeats:         req.MaxSeats,
		MaxProjects:      req.MaxProjects,
		MaxEnvironments:  req.MaxEnvironments,
		MaxEvalsPerMonth: req.MaxEvalsPerMonth,
		DeploymentModel:  "cloud",
		PhoneHomeEnabled: true,
		IssuedAt:         time.Now(),
		ExpiresAt:        req.ExpiresAt,
	}

	if err := h.store.CreateLicense(r.Context(), lic); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "license key conflict")
			return
		}
		log.Error("failed to create license", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create license")
		return
	}

	h.auditLog(r, userID, "create_license", "license", lic.ID, req)
	log.Info("license created", "license_id", lic.ID, "customer_name", req.CustomerName, "plan", req.Plan)
	httputil.JSON(w, http.StatusCreated, lic)
}

func (h *OpsHandler) RevokeLicense(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_revoke_license", "id", id)

	var req struct {
		Reason string `json:"reason"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.Reason == "" {
		req.Reason = "manual revocation"
	}

	if err := h.store.RevokeLicense(r.Context(), id, req.Reason); err != nil {
		if isNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "license not found")
			return
		}
		log.Error("failed to revoke license", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to revoke license")
		return
	}

	h.auditLog(r, userID, "revoke_license", "license", id, req)
	log.Info("license revoked", "reason", req.Reason)
	httputil.JSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *OpsHandler) OverrideLicenseQuota(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_override_quota", "id", id)

	var updates map[string]any
	if err := httputil.DecodeJSON(r, &updates); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.store.OverrideLicenseQuota(r.Context(), id, updates); err != nil {
		log.Error("failed to override license quota", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to override quota")
		return
	}

	log.Info("license quota overridden", "updates", fmt.Sprintf("%v", updates))
	httputil.JSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *OpsHandler) ResetLicenseUsage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.store.ResetLicenseUsage(r.Context(), id); err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to reset license usage", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to reset license usage")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// ─── Ops User Routes ──────────────────────────────────────────────────

func (h *OpsHandler) ListOpsUsers(w http.ResponseWriter, r *http.Request) {
	users, err := h.store.ListOpsUsers(r.Context())
	if err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to list ops users", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list ops users")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]any{"users": users})
}

func (h *OpsHandler) GetOpsUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	u, err := h.store.GetOpsUser(r.Context(), id)
	if err != nil {
		if isNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "ops user not found")
			return
		}
		httputil.LoggerFromContext(r.Context()).Error("failed to get ops user", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to get ops user")
		return
	}
	httputil.JSON(w, http.StatusOK, u)
}

func (h *OpsHandler) GetMe(w http.ResponseWriter, r *http.Request) {
	userID := middleware.GetUserID(r.Context())
	u, err := h.store.GetOpsUserByUserID(r.Context(), userID)
	if err != nil {
		if isNotFound(err) {
			httputil.JSON(w, http.StatusOK, nil)
			return
		}
		httputil.LoggerFromContext(r.Context()).Error("failed to get ops user", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to get ops user")
		return
	}
	httputil.JSON(w, http.StatusOK, u)
}

func (h *OpsHandler) CreateOpsUser(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_create_ops_user")

	var req struct {
		UserID          string   `json:"user_id"`
		OpsRole         string   `json:"ops_role"`
		AllowedEnvTypes []string `json:"allowed_env_types"`
		AllowedRegions  []string `json:"allowed_regions"`
		MaxSandboxEnvs  int      `json:"max_sandbox_envs"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.UserID == "" || req.OpsRole == "" {
		httputil.Error(w, http.StatusBadRequest, "user_id and ops_role are required")
		return
	}

	// Check for duplicate
	existing, _ := h.store.GetOpsUserByUserID(r.Context(), req.UserID)
	if existing != nil && existing.IsActive {
		httputil.Error(w, http.StatusConflict, "ops user already exists for this user")
		return
	}

	u := &domain.OpsUser{
		UserID:          req.UserID,
		OpsRole:         req.OpsRole,
		AllowedEnvTypes: req.AllowedEnvTypes,
		AllowedRegions:  req.AllowedRegions,
		MaxSandboxEnvs:  req.MaxSandboxEnvs,
		IsActive:        true,
	}

	if u.MaxSandboxEnvs == 0 {
		u.MaxSandboxEnvs = 2
	}

	if err := h.store.CreateOpsUser(r.Context(), u); err != nil {
		log.Error("failed to create ops user", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create ops user")
		return
	}

	// Enrich with user email/name
	if user, err := h.store.GetUserByID(r.Context(), req.UserID); err == nil {
		u.UserEmail = user.Email
		u.UserName = user.Name
	} else {
		log.Warn("failed to enrich ops user with user details", "user_id", req.UserID, "error", err)
	}

	h.auditLog(r, middleware.GetUserID(r.Context()), "create_ops_user", "ops_user", u.ID, req)
	httputil.JSON(w, http.StatusCreated, u)
}

func (h *OpsHandler) UpdateOpsUser(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_update_user", "id", id)

	var req map[string]any
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.store.UpdateOpsUser(r.Context(), id, req); err != nil {
		log.Error("failed to update ops user", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to update ops user")
		return
	}

	u, err := h.store.GetOpsUser(r.Context(), id)
	if err != nil {
		log.Error("failed to get updated user", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to retrieve updated user")
		return
	}
	httputil.JSON(w, http.StatusOK, u)
}

// ─── Audit Routes ─────────────────────────────────────────────────────

func (h *OpsHandler) ListOpsAuditLogs(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	limit := parseIntOrDefault(q.Get("limit"), 50)
	if limit > 100 {
		limit = 100
	}
	offset := parseIntOrDefault(q.Get("offset"), 0)

	logs, total, err := h.store.ListOpsAuditLogs(r.Context(),
		q.Get("action"), q.Get("target_type"), q.Get("user_id"),
		q.Get("start_date"), q.Get("end_date"), limit, offset)
	if err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to list audit logs", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list audit logs")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]any{"logs": logs, "total": total})
}

// ─── Helpers ──────────────────────────────────────────────────────────

func (h *OpsHandler) auditLog(r *http.Request, userID, action, targetType, targetID string, details any) {
	logEntry := &domain.OpsAuditLog{
		OpsUserID:  userID,
		Action:     action,
		TargetType: targetType,
		TargetID:   targetID,
	}

	if details != nil {
		detailsJSON, _ := json.Marshal(details)
		if ip := r.RemoteAddr; ip != "" {
			if host, _, err := net.SplitHostPort(ip); err == nil {
				logEntry.IPAddress = host
			} else {
				logEntry.IPAddress = ip
			}
		}
		logEntry.Details = detailsJSON
	}

	if err := h.store.CreateOpsAuditLog(r.Context(), logEntry); err != nil {
		httputil.LoggerFromContext(r.Context()).Warn("failed to write audit log", "error", err, "action", action)
	}
}

func parseIntOrDefault(s string, def int) int {
	n, err := strconv.Atoi(s)
	if err != nil {
		return def
	}
	return n
}

func isNotFound(err error) bool {
	return errors.Is(err, domain.ErrNotFound)
}