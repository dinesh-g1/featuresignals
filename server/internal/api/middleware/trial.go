package middleware

import (
	"context"
	"log/slog"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// TrialStore is the minimal interface the trial middleware needs.
type TrialStore interface {
	GetOrganization(ctx context.Context, id string) (*domain.Organization, error)
	DowngradeOrgToFree(ctx context.Context, orgID string) error
}

// TrialExpiry checks if the authenticated org's trial has expired and
// automatically downgrades to the Free plan. Soft-deleted orgs are blocked.
func TrialExpiry(store TrialStore, logger *slog.Logger) func(http.Handler) http.Handler {
	return func(next http.Handler) http.Handler {
		return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
			orgID := GetOrgID(r.Context())
			if orgID == "" {
				next.ServeHTTP(w, r)
				return
			}

			org, err := store.GetOrganization(r.Context(), orgID)
			if err != nil {
				next.ServeHTTP(w, r)
				return
			}

			if org.DeletedAt != nil {
				httputil.JSON(w, http.StatusForbidden, map[string]string{
					"error":   "account_deleted",
					"message": "This account has been deactivated. Contact support to restore it.",
				})
				return
			}

			if org.Plan == domain.PlanTrial && org.TrialExpiresAt != nil && time.Now().After(*org.TrialExpiresAt) {
				if err := store.DowngradeOrgToFree(r.Context(), orgID); err != nil {
					logger.Error("failed to auto-downgrade trial", "error", err, "org_id", orgID)
				} else {
					logger.Info("trial expired, downgraded to free", "org_id", orgID)
				}
			}

			next.ServeHTTP(w, r)
		})
	}
}
