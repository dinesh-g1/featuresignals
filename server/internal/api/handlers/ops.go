package handlers

import (
	"context"
	"crypto/rand"
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

// ─── Environment Routes ───────────────────────────────────────────────

func (h *OpsHandler) ListEnvironments(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_list_envs")
	q := r.URL.Query()
	status := q.Get("status")
	model := q.Get("deployment_model")
	region := q.Get("region")
	search := q.Get("search")

	limit := 50
	if l := q.Get("limit"); l != "" {
		if n := parseIntOrDefault(l, 50); n > 0 && n <= 100 {
			limit = n
		}
	}
	offset := parseIntOrDefault(q.Get("offset"), 0)

	envs, total, err := h.store.ListCustomerEnvironments(r.Context(), status, model, region, search, limit, offset)
	if err != nil {
		log.Error("failed to list environments", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list environments")
		return
	}



	httputil.JSON(w, http.StatusOK, map[string]any{
		"environments": envs,
		"total":        total,
	})
}

func (h *OpsHandler) GetEnvironment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	env, err := h.store.GetCustomerEnvironment(r.Context(), id)
	if err != nil {
		if isNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "environment not found")
			return
		}
		httputil.LoggerFromContext(r.Context()).Error("failed to get environment", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to get environment")
		return
	}
	httputil.JSON(w, http.StatusOK, env)
}

func (h *OpsHandler) UpdateEnvironment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_update", "id", id, "user_id", userID)

	var updates map[string]any
	if err := httputil.DecodeJSON(r, &updates); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	// Validate allowed fields
	allowed := map[string]bool{
		"subdomain":        true,
		"custom_domain":    true,
		"vps_type":         true,
		"vps_region":       true,
		"monthly_vps_cost": true,
		"monthly_backup_cost": true,
		"monthly_support_cost": true,
		"status":           true,
	}

	for key := range updates {
		if !allowed[key] {
			httputil.Error(w, http.StatusBadRequest, fmt.Sprintf("field %s cannot be updated via this endpoint", key))
			return
		}
	}

	if err := h.store.UpdateCustomerEnvironment(r.Context(), id, updates); err != nil {
		if isNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "environment not found")
			return
		}
		log.Error("failed to update environment", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to update environment")
		return
	}

	env, err := h.store.GetCustomerEnvironment(r.Context(), id)
	if err != nil {
		log.Error("failed to fetch updated environment", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to fetch updated environment")
		return
	}

	// Send welcome email if environment just became active and has customer email
	if statusVal, ok := updates["status"]; ok && statusVal == "active" && env.CustomerEmail != "" && h.mailer != nil {
		go func() {
			ctx := context.Background()
			msg := domain.EmailMessage{
				To:        env.CustomerEmail,
				ToName:    env.CustomerEmail, // Could use customer name if available
				Template:  domain.TemplateEnvironmentReady,
				Subject:   "Your FeatureSignals Environment is Ready",
				Data: map[string]string{
					"subdomain":   env.Subdomain,
					"customer_email": env.CustomerEmail,
					"login_url":   "https://" + env.Subdomain + "/login",
					"dashboard_url": "https://" + env.Subdomain + "/dashboard",
					"support_url": "https://featuresignals.com/support",
				},
			}
			if err := h.mailer.Send(ctx, "", msg); err != nil {
				log.Warn("failed to send environment ready email", "error", err, "customer_email", env.CustomerEmail)
			} else {
				log.Info("environment ready email sent", "customer_email", env.CustomerEmail)
			}
		}()
	}

	h.auditLog(r, userID, "update", "environment", id, updates)
	log.Info("environment updated", "fields", len(updates))

	httputil.JSON(w, http.StatusOK, env)
}

func (h *OpsHandler) ProvisionEnvironment(w http.ResponseWriter, r *http.Request) {
	var req struct {
		CustomerName  string `json:"customer_name"`
		CustomerEmail string `json:"customer_email,omitempty"`
		OrgID         string `json:"org_id"`
		VPSType       string `json:"vps_type"`
		Region        string `json:"region"`
		Plan          string `json:"plan"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.CustomerName == "" || req.OrgID == "" {
		httputil.Error(w, http.StatusBadRequest, "customer_name and org_id are required")
		return
	}

	// Create environment record in "provisioning" status
	env := &domain.CustomerEnvironment{
		OrgID:           req.OrgID,
		CustomerEmail:   req.CustomerEmail,
		DeploymentModel: "isolated",
		VPSProvider:     "hetzner",
		VPSType:         req.VPSType,
		VPSRegion:       req.Region,
		Status:          "provisioning",
		Subdomain:       req.CustomerName + ".featuresignals.com",
	}

	// Set cost based on VPS type
	env.MonthlyVPSCost = vpsCost(req.VPSType)

	if err := h.store.CreateCustomerEnvironment(r.Context(), env); err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to create environment record", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create environment")
		return
	}

	httputil.LoggerFromContext(r.Context()).Info("environment provisioned", "org_id", req.OrgID, "subdomain", env.Subdomain, "customer_email", req.CustomerEmail)
	httputil.JSON(w, http.StatusAccepted, map[string]any{
		"environment": env,
		"message":     "Provisioning workflow triggered. This will take ~15 minutes.",
	})
}

func (h *OpsHandler) ToggleMaintenance(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_maintenance", "id", id)

	var req struct {
		Enabled bool   `json:"enabled"`
		Reason  string `json:"reason"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	now := time.Now()
	updates := map[string]any{
		"maintenance_mode":       req.Enabled,
		"maintenance_reason":     req.Reason,
		"maintenance_enabled_by": userID,
	}
	if req.Enabled {
		updates["maintenance_enabled_at"] = now
	} else {
		updates["maintenance_enabled_at"] = nil
	}

	if err := h.store.UpdateCustomerEnvironment(r.Context(), id, updates); err != nil {
		log.Error("failed to toggle maintenance", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to toggle maintenance")
		return
	}

	h.auditLog(r, userID, "toggle_maintenance", "environment", id, req)

	env, err := h.store.GetCustomerEnvironment(r.Context(), id)
	if err != nil {
		log.Error("failed to get updated environment", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to retrieve updated environment")
		return
	}
	httputil.JSON(w, http.StatusOK, env)
}

func (h *OpsHandler) ToggleDebug(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_debug", "id", id)

	var req struct {
		Enabled       bool `json:"enabled"`
		DurationHours int  `json:"duration_hours"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}
	if req.DurationHours <= 0 {
		req.DurationHours = 4
	}
	if req.DurationHours > 24 {
		req.DurationHours = 24
	}

	now := time.Now()
	updates := map[string]any{
		"debug_mode":            req.Enabled,
		"debug_mode_enabled_by": userID,
	}
	if req.Enabled {
		expiresAt := now.Add(time.Duration(req.DurationHours) * time.Hour)
		updates["debug_mode_enabled_at"] = now
		updates["debug_mode_expires_at"] = expiresAt
	} else {
		updates["debug_mode_enabled_at"] = nil
		updates["debug_mode_expires_at"] = nil
	}

	if err := h.store.UpdateCustomerEnvironment(r.Context(), id, updates); err != nil {
		log.Error("failed to toggle debug mode", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to toggle debug mode")
		return
	}

	h.auditLog(r, userID, "toggle_debug", "environment", id, req)

	env, err := h.store.GetCustomerEnvironment(r.Context(), id)
	if err != nil {
		log.Error("failed to get updated environment", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to retrieve updated environment")
		return
	}
	httputil.JSON(w, http.StatusOK, env)
}

func (h *OpsHandler) RestartEnvironment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_restart", "id", id, "user_id", userID)

	// Verify environment exists first
	if _, err := h.store.GetCustomerEnvironment(r.Context(), id); err != nil {
		if isNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "environment not found")
			return
		}
		log.Error("failed to verify environment exists", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to restart")
		return
	}

	log.Info("restart requested")
	h.auditLog(r, userID, "restart", "environment", id, nil)

	httputil.JSON(w, http.StatusOK, map[string]any{"success": true, "message": "Restart initiated"})
}

func (h *OpsHandler) DecommissionEnvironment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	userID := middleware.GetUserID(r.Context())
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_decommission", "id", id)

	// Verify environment exists and is not already decommissioned
	env, err := h.store.GetCustomerEnvironment(r.Context(), id)
	if err != nil {
		if isNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "environment not found")
			return
		}
		log.Error("failed to get environment", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to decommission")
		return
	}
	if env.Status == "decommissioned" {
		httputil.Error(w, http.StatusBadRequest, "environment already decommissioned")
		return
	}
	if env.Status == "decommissioning" {
		httputil.Error(w, http.StatusConflict, "environment already being decommissioned")
		return
	}

	// Update status to decommissioning
	if err := h.store.UpdateCustomerEnvironment(r.Context(), id, map[string]any{
		"status": "decommissioning",
	}); err != nil {
		log.Error("failed to update environment status", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to decommission")
		return
	}

	h.auditLog(r, userID, "decommission_env", "environment", id, map[string]string{"reason": "requested"})

	httputil.JSON(w, http.StatusAccepted, map[string]any{
		"success": true,
		"message": "Decommission workflow initiated. Backup will be created before destruction.",
	})
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
			httputil.JSON(w, http.StatusOK, nil)
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

	var req struct {
		OrgID               string `json:"org_id"`
		CustomerName        string `json:"customer_name"`
		CustomerEmail       string `json:"customer_email"`
		Plan                string `json:"plan"`
		BillingCycle        string `json:"billing_cycle"`
		MaxSeats            int    `json:"max_seats"`
		MaxProjects         int    `json:"max_projects"`
		MaxEnvironments     int    `json:"max_environments"`
		MaxEvalsPerMonth    int64  `json:"max_evaluations_per_month"`
		MaxAPICallsPerMonth int64  `json:"max_api_calls_per_month"`
		ExpiresAt           string `json:"expires_at"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.OrgID == "" || req.CustomerName == "" || req.Plan == "" {
		httputil.Error(w, http.StatusBadRequest, "org_id, customer_name, and plan are required")
		return
	}

	lic := &domain.License{
		OrgID:               req.OrgID,
		CustomerName:        req.CustomerName,
		CustomerEmail:       req.CustomerEmail,
		Plan:                req.Plan,
		BillingCycle:        req.BillingCycle,
		MaxSeats:            req.MaxSeats,
		MaxProjects:         req.MaxProjects,
		MaxEnvironments:     req.MaxEnvironments,
		MaxEvalsPerMonth:    req.MaxEvalsPerMonth,
		MaxAPICallsPerMonth: req.MaxAPICallsPerMonth,
	}

	if req.ExpiresAt != "" {
		if t, err := time.Parse("2006-01-02", req.ExpiresAt); err == nil {
			lic.ExpiresAt = &t
		}
	}

	if err := h.store.CreateLicense(r.Context(), lic); err != nil {
		log.Error("failed to create license", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create license")
		return
	}

	h.auditLog(r, middleware.GetUserID(r.Context()), "create_license", "license", lic.ID, req)
	httputil.JSON(w, http.StatusCreated, lic)
}

func (h *OpsHandler) RevokeLicense(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	var req struct {
		Reason string `json:"reason"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.store.RevokeLicense(r.Context(), id, req.Reason); err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to revoke license", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to revoke license")
		return
	}

	h.auditLog(r, middleware.GetUserID(r.Context()), "revoke_license", "license", id, req)
	httputil.JSON(w, http.StatusOK, map[string]any{"success": true})
}

func (h *OpsHandler) OverrideLicenseQuota(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_quota_override", "id", id)

	var req map[string]any
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := h.store.OverrideLicenseQuota(r.Context(), id, req); err != nil {
		log.Error("failed to override license quota", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to override quota")
		return
	}

	h.auditLog(r, middleware.GetUserID(r.Context()), "override_quota", "license", id, req)

	lic, err := h.store.GetLicense(r.Context(), id)
	if err != nil {
		log.Error("failed to get updated license", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to retrieve updated license")
		return
	}
	httputil.JSON(w, http.StatusOK, lic)
}

func (h *OpsHandler) ResetLicenseUsage(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.store.ResetLicenseUsage(r.Context(), id); err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to reset license usage", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to reset usage")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// ─── Sandbox Routes ───────────────────────────────────────────────────

func (h *OpsHandler) ListSandboxes(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	sandboxes, total, err := h.store.ListSandboxes(r.Context(), q.Get("status"), q.Get("owner_id"))
	if err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to list sandboxes", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list sandboxes")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]any{"sandboxes": sandboxes, "total": total})
}

func (h *OpsHandler) CreateSandbox(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_create_sandbox")
	userID := middleware.GetUserID(r.Context())

	var req struct {
		Purpose string `json:"purpose"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Purpose == "" {
		httputil.Error(w, http.StatusBadRequest, "purpose is required")
		return
	}

	sb := &domain.SandboxEnvironment{
		OwnerUserID: userID,
		VPSType:     "cx22",
		Status:      "provisioning",
		ExpiresAt:   time.Now().Add(30 * 24 * time.Hour),
		MaxRenewals: 2,
		Purpose:     req.Purpose,
		Subdomain:   "sandbox-" + generateShortID() + ".featuresignals.com",
	}

	if err := h.store.CreateSandbox(r.Context(), sb); err != nil {
		log.Error("failed to create sandbox", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to create sandbox")
		return
	}

	h.auditLog(r, userID, "create_sandbox", "sandbox", sb.ID, req)
	httputil.JSON(w, http.StatusCreated, map[string]any{"sandbox": sb})
}

func (h *OpsHandler) RenewSandbox(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	s, err := h.store.RenewSandbox(r.Context(), id)
	if err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to renew sandbox", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to renew sandbox")
		return
	}
	httputil.JSON(w, http.StatusOK, s)
}

func (h *OpsHandler) DecommissionSandbox(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")
	if err := h.store.DecommissionSandbox(r.Context(), id); err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to decommission sandbox", "error", err, "id", id)
		httputil.Error(w, http.StatusInternalServerError, "failed to decommission sandbox")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]any{"success": true})
}

// ─── Financial Routes ─────────────────────────────────────────────────

func (h *OpsHandler) GetCostDaily(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	orgID := q.Get("org_id")
	startDate := q.Get("start_date")
	endDate := q.Get("end_date")

	costs, err := h.store.ListOrgCostDaily(r.Context(), orgID, startDate, endDate)
	if err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to get daily costs", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to get cost data")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]any{"costs": costs})
}

func (h *OpsHandler) GetCostMonthly(w http.ResponseWriter, r *http.Request) {
	month := r.URL.Query().Get("month")
	summaries, err := h.store.ListOrgCostMonthly(r.Context(), month)
	if err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to get monthly costs", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to get monthly costs")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]any{"summaries": summaries})
}

func (h *OpsHandler) GetFinancialSummary(w http.ResponseWriter, r *http.Request) {
	summary, err := h.store.GetFinancialSummary(r.Context())
	if err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to get financial summary", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to get financial summary")
		return
	}
	if summary == nil {
		summary = &domain.FinancialSummary{
			MarginByTier:   make(map[string]*domain.TierFinancials),
			TopCustomers:   []domain.CustomerSummary{},
			NegativeMargin: []domain.CustomerSummary{},
		}
	}
	httputil.JSON(w, http.StatusOK, summary)
}

// ─── Customer Routes ──────────────────────────────────────────────────

func (h *OpsHandler) ListCustomers(w http.ResponseWriter, r *http.Request) {
	q := r.URL.Query()
	customers, total, err := h.store.ListCustomers(r.Context(), q.Get("plan"), q.Get("deployment_model"), q.Get("search"))
	if err != nil {
		httputil.LoggerFromContext(r.Context()).Error("failed to list customers", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list customers")
		return
	}
	httputil.JSON(w, http.StatusOK, map[string]any{"customers": customers, "total": total})
}

func (h *OpsHandler) GetCustomerDetail(w http.ResponseWriter, r *http.Request) {
	orgID := chi.URLParam(r, "org_id")
	detail, err := h.store.GetCustomerDetail(r.Context(), orgID)
	if err != nil {
		if isNotFound(err) {
			httputil.Error(w, http.StatusNotFound, "customer not found")
			return
		}
		httputil.LoggerFromContext(r.Context()).Error("failed to get customer detail", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to get customer detail")
		return
	}
	httputil.JSON(w, http.StatusOK, detail)
}

func (h *OpsHandler) CreateOrganization(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context()).With("handler", "ops_create_org")
	userID := middleware.GetUserID(r.Context())

	var req struct {
		Name       string `json:"name"`
		Slug       string `json:"slug,omitempty"`
		Plan       string `json:"plan,omitempty"`
		DataRegion string `json:"data_region,omitempty"`
	}
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.Name == "" {
		httputil.Error(w, http.StatusBadRequest, "name is required")
		return
	}

	// Generate slug if not provided
	slug := req.Slug
	if slug == "" {
		slug = slugify(req.Name)
	}

	// Set defaults
	plan := req.Plan
	if plan == "" {
		plan = domain.PlanFree
	}
	dataRegion := req.DataRegion
	if dataRegion == "" {
		dataRegion = domain.RegionUS
	}

	org := &domain.Organization{
		Name:       req.Name,
		Slug:       slug,
		Plan:       plan,
		DataRegion: dataRegion,
		// Trial expires at will be set by store.CreateOrganization based on plan
	}

	if err := h.store.CreateOrganization(r.Context(), org); err != nil {
		if errors.Is(err, domain.ErrConflict) {
			httputil.Error(w, http.StatusConflict, "organization with this slug already exists")
			return
		}
		log.Error("failed to create organization", "error", err, "name", req.Name)
		httputil.Error(w, http.StatusInternalServerError, "failed to create organization")
		return
	}

	h.auditLog(r, userID, "create_org", "organization", org.ID, map[string]any{
		"name":        org.Name,
		"slug":        org.Slug,
		"plan":        org.Plan,
		"data_region": org.DataRegion,
	})

	log.Info("organization created", "org_id", org.ID, "name", org.Name, "plan", org.Plan)
	httputil.JSON(w, http.StatusCreated, org)
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

// vpsCost returns the monthly cost in cents for a given VPS type.
// Prices are stored in cents (e.g., €4.51 = 451 cents).
func vpsCost(vpsType string) int64 {
	costs := map[string]int64{
		"cx22":  451,  // €4.51
		"cx32":  849,  // €8.49
		"cx42":  1421, // €14.21
		"cx52":  2479, // €24.79
		"cax11": 366,  // €3.66
		"cax21": 733,  // €7.33
		"cpx11": 435,  // €4.35
		"cpx21": 701,  // €7.01
		"cpx31": 1189, // €11.89
		"cpx41": 1960, // €19.60
	}
	if c, ok := costs[vpsType]; ok {
		return c
	}
	return 849 // default cx32
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

func generateShortID() string {
	b := make([]byte, 8)
	if _, err := rand.Read(b); err != nil {
		return fmt.Sprintf("fallback-%d", time.Now().UnixNano())
	}
	return fmt.Sprintf("%x", b)
}
