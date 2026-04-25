package handlers

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// OpsDashboardHandler serves the ops portal dashboard overview.
type OpsDashboardHandler struct {
	store  domain.Store
	logger *slog.Logger
}

// NewOpsDashboardHandler creates a new ops dashboard handler.
func NewOpsDashboardHandler(store domain.Store, logger *slog.Logger) *OpsDashboardHandler {
	return &OpsDashboardHandler{store: store, logger: logger}
}

// DashboardStats is the response shape for the dashboard overview.
type DashboardStats struct {
	Tenants       TenantStats    `json:"tenants"`
	MRR           MRRStats       `json:"mrr"`
	Cells         CellStats      `json:"cells"`
	RecentActions []RecentAction `json:"recent_actions"`
	GeneratedAt   time.Time      `json:"generated_at"`
}

// TenantStats holds aggregate tenant counts.
type TenantStats struct {
	Total      int `json:"total"`
	Active     int `json:"active"`
	Suspended  int `json:"suspended"`
	Provision  int `json:"provisioning"`
	Free       int `json:"free"`
	Pro        int `json:"pro"`
	Enterprise int `json:"enterprise"`
}

// MRRStats holds monthly recurring revenue data.
type MRRStats struct {
	TotalMRR      int64   `json:"total_mrr"`
	TotalCost     int64   `json:"total_cost"`
	TotalMargin   float64 `json:"total_margin"`
	CustomerCount int     `json:"customer_count"`
}

// CellStats holds aggregate cell health data.
type CellStats struct {
	Total    int `json:"total"`
	Healthy  int `json:"healthy"`
	Degraded int `json:"degraded"`
	Down     int `json:"down"`
}

// RecentAction is a single entry in the recent activity feed.
type RecentAction struct {
	ID        string    `json:"id"`
	Action    string    `json:"action"`
	Target    string    `json:"target,omitempty"`
	TargetID  string    `json:"target_id,omitempty"`
	OpsUser   string    `json:"ops_user,omitempty"`
	CreatedAt time.Time `json:"created_at"`
}

// Stats handles GET /api/v1/ops/dashboard/stats
func (h *OpsDashboardHandler) Stats(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_dashboard_stats")

	// 1. Financial summary
	financial, err := h.store.GetFinancialSummary(r.Context())
	if err != nil {
		log.Error("failed to get financial summary", "error", err)
		// Continue with defaults — financials are non-critical for dashboard load
		financial = &domain.FinancialSummary{
			MarginByTier:   make(map[string]*domain.TierFinancials),
			TopCustomers:   []domain.CustomerSummary{},
			NegativeMargin: []domain.CustomerSummary{},
		}
	}

	// 2. Tenant counts
	tenantStats := h.collectTenantStats(r.Context(), log)

	// 3. Cell stats (from environment health)
	cellStats := h.collectCellStats(r.Context(), log)

	// 4. Recent actions from ops audit log
	recent, _, err := h.store.ListOpsAuditLogs(r.Context(), "", "", "", "", "", 10, 0)
	recentActions := make([]RecentAction, 0, 10)
	if err != nil {
		log.Warn("failed to fetch recent audit logs", "error", err)
	} else {
		for _, l := range recent {
			recentActions = append(recentActions, RecentAction{
				ID:        l.ID,
				Action:    l.Action,
				Target:    l.TargetType,
				TargetID:  l.TargetID,
				OpsUser:   l.OpsUserName,
				CreatedAt: l.CreatedAt,
			})
		}
	}

	customerCount := 0
	if financial != nil {
		customerCount = len(financial.TopCustomers) + len(financial.NegativeMargin)
	}

	stats := DashboardStats{
		Tenants: tenantStats,
		MRR: MRRStats{
			TotalMRR:      financial.TotalMRR,
			TotalCost:     financial.TotalCost,
			TotalMargin:   financial.TotalMargin,
			CustomerCount: customerCount,
		},
		Cells:         cellStats,
		RecentActions: recentActions,
		GeneratedAt:   time.Now().UTC(),
	}

	httputil.JSON(w, http.StatusOK, stats)
}

// collectTenantStats iterates over all tenants to compute aggregate counts.
func (h *OpsDashboardHandler) collectTenantStats(ctx context.Context, log *slog.Logger) TenantStats {
	stats := TenantStats{}

	registry, ok := h.store.(domain.TenantRegistry)
	if !ok {
		log.Warn("TenantRegistry not available")
		return stats
	}
	tenants, _, err := registry.List(ctx, domain.TenantFilter{Limit: 1000})
	if err != nil {
		log.Warn("failed to list tenants for dashboard stats", "error", err)
		return stats
	}

	for _, t := range tenants {
		stats.Total++
		switch t.Status {
		case domain.TenantStatusActive:
			stats.Active++
		case domain.TenantStatusSuspended:
			stats.Suspended++
		default:
			stats.Provision++
		}
		switch t.Tier {
		case domain.TierFree:
			stats.Free++
		case domain.TierPro:
			stats.Pro++
		default:
			stats.Enterprise++
		}
	}

	return stats
}

// collectCellStats derives cell health from customer environment statuses.
func (h *OpsDashboardHandler) collectCellStats(ctx context.Context, log *slog.Logger) CellStats {
	stats := CellStats{}

	envs, _, err := h.store.ListCustomerEnvironments(ctx, "", "", "", "", 1000, 0)
	if err != nil {
		log.Warn("failed to list environments for cell stats", "error", err)
		return stats
	}

	// Group environments by region (cell) and assess health.
	type cellHealth struct {
		total    int
		healthy  int
		degraded int
		down     int
	}
	cells := make(map[string]*cellHealth)

	for _, env := range envs {
		region := env.VPSRegion
		if region == "" {
			region = "unknown"
		}
		ch, ok := cells[region]
		if !ok {
			ch = &cellHealth{}
			cells[region] = ch
		}
		ch.total++
		switch env.Status {
		case "active", "provisioned":
			ch.healthy++
		case "maintenance", "provisioning", "decommissioning":
			ch.degraded++
		default:
			ch.down++
		}
	}

	stats.Total = len(cells)
	for _, ch := range cells {
		if ch.down > 0 {
			stats.Down++
		} else if ch.degraded > 0 {
			stats.Degraded++
		} else {
			stats.Healthy++
		}
	}

	return stats
}

// MRR handles GET /api/v1/ops/billing/mrr
func (h *OpsDashboardHandler) MRR(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_billing_mrr")

	summary, err := h.store.GetFinancialSummary(r.Context())
	if err != nil {
		log.Error("failed to get financial summary", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to get MRR data")
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"total_mrr":      summary.TotalMRR,
		"total_cost":     summary.TotalCost,
		"total_margin":   summary.TotalMargin,
		"margin_by_tier": summary.MarginByTier,
		"top_customers":  summary.TopCustomers,
	})
}

// Invoices handles GET /api/v1/ops/billing/invoices
func (h *OpsDashboardHandler) Invoices(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_billing_invoices")

	q := r.URL.Query()
	month := q.Get("month")
	if month == "" {
		month = time.Now().UTC().Format("2006-01")
	}

	summaries, err := h.store.ListOrgCostMonthly(r.Context(), month)
	if err != nil {
		log.Error("failed to get cost data for invoices", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to get invoice data")
		return
	}

	if summaries == nil {
		summaries = []domain.OrgCostMonthlySummary{}
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"month":    month,
		"invoices": summaries,
		"total":    len(summaries),
	})
}

// ListAudit handles GET /api/v1/ops/audit
func (h *OpsDashboardHandler) ListAudit(w http.ResponseWriter, r *http.Request) {
	log := h.logger.With("handler", "ops_audit_list")

	q := r.URL.Query()
	limit := 50
	if l := parseIntOrDefault(q.Get("limit"), 50); l > 0 && l <= 100 {
		limit = l
	}
	offset := parseIntOrDefault(q.Get("offset"), 0)

	logs, total, err := h.store.ListOpsAuditLogs(r.Context(),
		q.Get("action"), q.Get("target_type"), q.Get("user_id"),
		q.Get("start_date"), q.Get("end_date"), limit, offset,
	)
	if err != nil {
		log.Error("failed to list audit logs", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to list audit logs")
		return
	}

	if logs == nil {
		logs = []domain.OpsAuditLog{}
	}

	httputil.JSON(w, http.StatusOK, map[string]any{
		"logs":  logs,
		"total": total,
	})
}