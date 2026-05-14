package handlers

import (
	"context"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type analyticsStore interface {
	CountEventsByOrg(ctx context.Context, orgID string, event string, since time.Time) (int, error)
	CountEventsByCategory(ctx context.Context, category string, since time.Time) (int, error)
	CountDistinctOrgs(ctx context.Context, event string, since time.Time) (int, error)
	CountDistinctUsers(ctx context.Context, since time.Time) (int, error)
	EventFunnel(ctx context.Context, events []string, since time.Time) (map[string]int, error)
	PlanDistribution(ctx context.Context) (map[string]int, error)
}

// AnalyticsHandler exposes internal KPI metrics aggregated from product_events.
// Access is restricted to owner/admin roles via route configuration.
type AnalyticsHandler struct {
	store analyticsStore
}

func NewAnalyticsHandler(store analyticsStore) *AnalyticsHandler {
	return &AnalyticsHandler{store: store}
}

type kpiResponse struct {
	Period          string         `json:"period"`
	ActiveWorkspaces int           `json:"active_workspaces"`
	ActiveUsers     int            `json:"active_users"`
	Funnel          map[string]int `json:"funnel"`
	Plans           map[string]int `json:"plan_distribution"`
	EventCounts     map[string]int `json:"event_counts"`
}

// Overview returns aggregated KPI metrics for the internal dashboard.
func (h *AnalyticsHandler) Overview(w http.ResponseWriter, r *http.Request) {
	ctx := r.Context()
	logger := httputil.LoggerFromContext(ctx).With("handler", "analytics")

	period := r.URL.Query().Get("period")
	since := parsePeriod(period)

	funnelEvents := []string{
		domain.EventSignupCompleted,
		domain.EventOnboardingCompleted,
		domain.EventFlagCreated,
		domain.EventFirstEvaluation,
		domain.EventCheckoutCompleted,
	}

	funnel, err := h.store.EventFunnel(ctx, funnelEvents, since)
	if err != nil {
		logger.Error("failed to load funnel", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	activeWorkspaces, err := h.store.CountDistinctOrgs(ctx, domain.EventFlagCreated, since)
	if err != nil {
		logger.Error("failed to count active workspaces", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	activeUsers, err := h.store.CountDistinctUsers(ctx, since)
	if err != nil {
		logger.Error("failed to count active users", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	plans, err := h.store.PlanDistribution(ctx)
	if err != nil {
		logger.Error("failed to load plan distribution", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	categories := []string{"auth", "flag", "billing", "team", "evaluation"}
	eventCounts := make(map[string]int, len(categories))
	for _, cat := range categories {
		count, cerr := h.store.CountEventsByCategory(ctx, cat, since)
		if cerr != nil {
			logger.Warn("failed to count events for category", "category", cat, "error", cerr)
			continue
		}
		eventCounts[cat] = count
	}

	httputil.JSON(w, http.StatusOK, kpiResponse{
		Period:           period,
		ActiveWorkspaces: activeWorkspaces,
		ActiveUsers:      activeUsers,
		Funnel:           funnel,
		Plans:            plans,
		EventCounts:      eventCounts,
	})
}

func parsePeriod(p string) time.Time {
	switch p {
	case "24h":
		return time.Now().Add(-24 * time.Hour)
	case "7d":
		return time.Now().Add(-7 * 24 * time.Hour)
	case "90d":
		return time.Now().Add(-90 * 24 * time.Hour)
	default:
		return time.Now().Add(-30 * 24 * time.Hour)
	}
}
