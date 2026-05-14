package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"
	"time"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type userPrivacyStore interface {
	domain.UserReader
	domain.OrgMemberStore
	domain.AuditReader
	domain.AuditWriter
	domain.OrgReader
	SoftDeleteUser(ctx context.Context, userID string) error
}

type UserPrivacyHandler struct {
	store userPrivacyStore
}

func NewUserPrivacyHandler(store userPrivacyStore) *UserPrivacyHandler {
	return &UserPrivacyHandler{store: store}
}

type userDataExport struct {
	ExportedAt  string                    `json:"exported_at"`
	User        userExportData            `json:"user"`
	Memberships []membershipExportData    `json:"memberships"`
}

type userExportData struct {
	ID            string  `json:"id"`
	Email         string  `json:"email"`
	Name          string  `json:"name"`
	EmailVerified bool    `json:"email_verified"`
	LastLoginAt   *string `json:"last_login_at,omitempty"`
	CreatedAt     string  `json:"created_at"`
}

type membershipExportData struct {
	OrgID   string `json:"org_id"`
	OrgName string `json:"org_name"`
	Role    string `json:"role"`
}

// ExportMyData implements GET /v1/users/me/data — GDPR Article 15/20 (Right of Access / Portability)
func (h *UserPrivacyHandler) ExportMyData(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "user_privacy")
	userID := middleware.GetUserID(r.Context())

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "User lookup failed — no user matches the provided identifier. Verify the user ID or email.")
			return
		}
		logger.Error("failed to get user for data export", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	export := userDataExport{
		ExportedAt: time.Now().UTC().Format(time.RFC3339),
		User: userExportData{
			ID:            user.ID,
			Email:         user.Email,
			Name:          user.Name,
			EmailVerified: user.EmailVerified,
			CreatedAt:     user.CreatedAt.Format(time.RFC3339),
		},
	}
	if user.LastLoginAt != nil {
		ts := user.LastLoginAt.Format(time.RFC3339)
		export.User.LastLoginAt = &ts
	}

	orgID := middleware.GetOrgID(r.Context())
	if orgID != "" {
		members, _ := h.store.ListOrgMembers(r.Context(), orgID, 0, 0)
		for _, m := range members {
			if m.UserID == userID {
				orgName := orgID
				if org, err := h.store.GetOrganization(r.Context(), orgID); err == nil {
					orgName = org.Name
				}
				export.Memberships = append(export.Memberships, membershipExportData{
					OrgID:   orgID,
					OrgName: orgName,
					Role:    string(m.Role),
				})
			}
		}
	}

	actorID := userID
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &actorID, ActorType: "user",
		Action: "user.data_exported", ResourceType: "user", ResourceID: &userID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	w.Header().Set("Content-Type", "application/json")
	w.Header().Set("Content-Disposition", "attachment; filename=my-data-export.json")
	w.WriteHeader(http.StatusOK)
	json.NewEncoder(w).Encode(export)
}

// DeleteMyAccount implements DELETE /v1/users/me — GDPR Article 17 (Right to Erasure)
func (h *UserPrivacyHandler) DeleteMyAccount(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "user_privacy")
	userID := middleware.GetUserID(r.Context())
	orgID := middleware.GetOrgID(r.Context())

	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "User lookup failed — no user matches the provided identifier. Verify the user ID or email.")
			return
		}
		logger.Error("failed to get user for deletion", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	if orgID != "" {
		members, _ := h.store.ListOrgMembers(r.Context(), orgID, 0, 0)
		ownerCount := 0
		isOwner := false
		for _, m := range members {
			if m.Role == domain.RoleOwner {
				ownerCount++
				if m.UserID == userID {
					isOwner = true
				}
			}
		}
		if isOwner && ownerCount == 1 && len(members) > 1 {
			httputil.Error(w, http.StatusUnprocessableEntity,
				"you are the sole owner of this organization; transfer ownership before deleting your account")
			return
		}
	}

	if err := h.store.SoftDeleteUser(r.Context(), userID); err != nil {
		logger.Error("failed to soft-delete user", "error", err, "user_id", userID)
		httputil.Error(w, http.StatusInternalServerError, "Internal operation failed — an unexpected error occurred. Try again or contact support if the issue persists.")
		return
	}

	actorID := userID
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &actorID, ActorType: "user",
		Action: "user.account_deleted", ResourceType: "user", ResourceID: &userID,
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	logger.Info("user account soft-deleted (GDPR erasure)", "user_id", userID, "email", user.Email)
	httputil.JSON(w, http.StatusOK, map[string]string{
		"message":      "account scheduled for deletion",
		"grace_period": "30 days",
	})
}
