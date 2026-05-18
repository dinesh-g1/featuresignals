package handlers

import (
	"encoding/json"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// orgStore defines the narrow interface the OrganizationHandler needs.
// This follows the Interface Segregation Principle — the handler only
// depends on the methods it actually calls.
type orgStore interface {
	domain.OrgLifecycleStore
	domain.OrgReader
	domain.OrgResourceReader
	domain.AuditWriter
	domain.TokenRevocationStore
}

// OrganizationHandler manages organization lifecycle operations:
// soft-delete, recovery, and pre-deletion resource audit.
type OrganizationHandler struct {
	store orgStore
}

// NewOrganizationHandler creates a new OrganizationHandler with the
// required store dependency.
func NewOrganizationHandler(store orgStore) *OrganizationHandler {
	return &OrganizationHandler{store: store}
}

// deleteResponse is returned after a successful soft-delete.
type deleteResponse struct {
	Message         string `json:"message"`
	GracePeriodDays int    `json:"grace_period_days"`
	ScheduledPurge  string `json:"scheduled_purge_at"`
}

// recoverResponse is returned after a successful organization recovery.
type recoverResponse struct {
	Message string `json:"message"`
}

// Delete handles DELETE /v1/organization — soft-deletes the caller's
// organization, creates an audit entry, and revokes the caller's token
// so they are logged out.
func (h *OrganizationHandler) Delete(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "organization.delete")
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	// Soft-delete the organization (sets deleted_at).
	if err := h.store.SoftDeleteOrganization(r.Context(), orgID); err != nil {
		logger.Error("failed to soft-delete organization", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError,
			"Organization deletion failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	// Create audit entry before we revoke the token (need userID).
	meta, _ := json.Marshal(map[string]string{"action": "soft_delete"})
	if err := h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID:        orgID,
		ActorID:      &userID,
		ActorType:    "user",
		Action:       "organization.deleted",
		ResourceType: "organization",
		ResourceID:   &orgID,
		Metadata:     meta,
		IPAddress:    r.RemoteAddr,
		UserAgent:    r.UserAgent(),
	}); err != nil {
		logger.Warn("failed to create audit entry for org deletion", "error", err, "org_id", orgID)
		// Non-fatal: the deletion already succeeded.
	}

	// Revoke the current user's token so they are logged out.
	claims := middleware.GetClaims(r.Context())
	if claims != nil && claims.ID != "" {
		expiresAt := time.Now().Add(1 * time.Hour)
		if claims.ExpiresAt != nil {
			expiresAt = claims.ExpiresAt.Time
		}
		if err := h.store.RevokeToken(r.Context(), claims.ID, claims.UserID, claims.OrgID, expiresAt); err != nil {
			logger.Warn("failed to revoke token after org deletion", "error", err, "user_id", userID)
			// Non-fatal: the deletion already succeeded.
		}
	}

	// Calculate the scheduled purge date (now + grace period).
	scheduledPurge := time.Now().UTC().Add(time.Duration(domain.HardDeleteGraceDays) * 24 * time.Hour)

	logger.Info("organization soft-deleted", "org_id", orgID, "user_id", userID,
		"grace_period_days", domain.HardDeleteGraceDays, "scheduled_purge", scheduledPurge)

	httputil.JSON(w, http.StatusOK, deleteResponse{
		Message:         "Organization scheduled for deletion",
		GracePeriodDays: domain.HardDeleteGraceDays,
		ScheduledPurge:  scheduledPurge.Format(time.RFC3339),
	})
}

// Recover handles POST /v1/organization/recover — restores a soft-deleted
// organization within the grace period and creates an audit entry.
func (h *OrganizationHandler) Recover(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "organization.recover")
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	// Verify the org is actually soft-deleted before attempting restore.
	org, err := h.store.GetOrganization(r.Context(), orgID)
	if err != nil {
		logger.Error("failed to get organization for recovery", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError,
			"Organization recovery failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}
	if org.DeletedAt == nil {
		httputil.Error(w, http.StatusBadRequest, "Organization is not deleted")
		return
	}

	if err := h.store.RestoreOrganization(r.Context(), orgID); err != nil {
		logger.Error("failed to restore organization", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError,
			"Organization recovery failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	// Create audit entry.
	meta, _ := json.Marshal(map[string]string{"action": "recover"})
	if err := h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID:        orgID,
		ActorID:      &userID,
		ActorType:    "user",
		Action:       "organization.recovered",
		ResourceType: "organization",
		ResourceID:   &orgID,
		Metadata:     meta,
		IPAddress:    r.RemoteAddr,
		UserAgent:    r.UserAgent(),
	}); err != nil {
		logger.Warn("failed to create audit entry for org recovery", "error", err, "org_id", orgID)
		// Non-fatal: the recovery already succeeded.
	}

	logger.Info("organization recovered", "org_id", orgID, "user_id", userID)

	httputil.JSON(w, http.StatusOK, recoverResponse{
		Message: "Organization recovered",
	})
}

// GetResources handles GET /v1/organization/resources — returns counts of
// all resources owned by the organization. This is the pre-deletion audit
// endpoint that helps users understand what will be destroyed.
func (h *OrganizationHandler) GetResources(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "organization.resources")
	orgID := middleware.GetOrgID(r.Context())

	counts, err := h.store.GetOrganizationResourceCounts(r.Context(), orgID)
	if err != nil {
		logger.Error("failed to get organization resource counts", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError,
			"Resource audit failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	logger.Info("organization resource counts retrieved", "org_id", orgID,
		"total_resources", counts.TotalResources)

	httputil.JSON(w, http.StatusOK, counts)
}

// purgeResponse is returned after a successful immediate hard-delete.
type purgeResponse struct {
	Message string `json:"message"`
}

// Purge handles POST /v1/organization/purge — immediately hard-deletes the
// caller's organization, bypassing the 30-day grace period. All resources
// are cascade-deleted. The user's token is revoked, logging them out.
// Only the organization owner may purge.
func (h *OrganizationHandler) Purge(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "organization.purge")
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	// Create audit entry before destruction (will be deleted by cascade,
	// but we log it for the response).
	meta, _ := json.Marshal(map[string]string{"action": "purge"})
	_ = h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID:        orgID,
		ActorID:      &userID,
		ActorType:    "user",
		Action:       "organization.purged",
		ResourceType: "organization",
		ResourceID:   &orgID,
		Metadata:     meta,
		IPAddress:    r.RemoteAddr,
		UserAgent:    r.UserAgent(),
	})

	// Hard-delete the organization with full cascade.
	if err := h.store.HardDeleteOrganization(r.Context(), orgID); err != nil {
		logger.Error("failed to hard-delete organization", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError,
			"Organization purge failed — an unexpected error occurred on the server. Try again or contact support.")
		return
	}

	// Revoke the current user's token so they are logged out.
	claims := middleware.GetClaims(r.Context())
	if claims != nil && claims.ID != "" {
		expiresAt := time.Now().Add(1 * time.Hour)
		if claims.ExpiresAt != nil {
			expiresAt = claims.ExpiresAt.Time
		}
		if err := h.store.RevokeToken(r.Context(), claims.ID, claims.UserID, claims.OrgID, expiresAt); err != nil {
			logger.Warn("failed to revoke token after org purge", "error", err, "user_id", userID)
			// Non-fatal: the purge already succeeded.
		}
	}

	logger.Info("organization purged", "org_id", orgID, "user_id", userID)

	httputil.JSON(w, http.StatusOK, purgeResponse{
		Message: "Organization permanently deleted",
	})
}
