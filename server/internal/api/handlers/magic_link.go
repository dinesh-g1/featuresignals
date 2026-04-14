package handlers

import (
	"context"
	"net/http"
	"strconv"
	"time"

	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type magicLinkStore interface {
	domain.MagicLinkStore
	domain.UserReader
	domain.OrgReader
	domain.OrgMemberStore
}

type loginAttemptRecorder interface {
	RecordLoginAttempt(ctx context.Context, email, ip, ua string, success bool) error
}

type MagicLinkHandler struct {
	store        magicLinkStore
	jwtMgr       auth.TokenManager
	dashboardURL string
}

func NewMagicLinkHandler(store magicLinkStore, jwtMgr auth.TokenManager, dashboardURL string) *MagicLinkHandler {
	return &MagicLinkHandler{
		store:        store,
		jwtMgr:       jwtMgr,
		dashboardURL: dashboardURL,
	}
}

// Exchange handles GET /v1/auth/magic-link?token=xxx
// It consumes the one-time token, generates a JWT pair, and redirects
// the user to the dashboard with the tokens in the URL fragment.
func (h *MagicLinkHandler) Exchange(w http.ResponseWriter, r *http.Request) {
	log := httputil.LoggerFromContext(r.Context())

	token := r.URL.Query().Get("token")
	if token == "" {
		httputil.Error(w, http.StatusBadRequest, "token is required")
		return
	}

	userID, orgID, err := h.store.ConsumeMagicLinkToken(r.Context(), token)
	if err != nil {
		log.Warn("invalid magic link token", "error", err)
		http.Redirect(w, r, h.dashboardURL+"/login?magic_link_error=expired", http.StatusFound)
		return
	}

	// Get user and org for the JWT claims
	user, err := h.store.GetUserByID(r.Context(), userID)
	if err != nil {
		log.Error("failed to get user for magic link", "error", err, "user_id", userID)
		http.Redirect(w, r, h.dashboardURL+"/login?magic_link_error=error", http.StatusFound)
		return
	}

	member, err := h.store.GetOrgMember(r.Context(), orgID, userID)
	if err != nil {
		log.Error("failed to get org member for magic link", "error", err, "user_id", userID, "org_id", orgID)
		http.Redirect(w, r, h.dashboardURL+"/login?magic_link_error=error", http.StatusFound)
		return
	}

	org, err := h.store.GetOrganization(r.Context(), orgID)
	if err != nil {
		log.Error("failed to get org for magic link", "error", err, "org_id", orgID)
		http.Redirect(w, r, h.dashboardURL+"/login?magic_link_error=error", http.StatusFound)
		return
	}

	// Generate JWT pair
	tokens, err := h.jwtMgr.GenerateTokenPair(user.ID, org.ID, string(member.Role), user.Email, org.DataRegion)
	if err != nil {
		log.Error("failed to generate tokens for magic link", "error", err, "user_id", userID)
		http.Redirect(w, r, h.dashboardURL+"/login?magic_link_error=error", http.StatusFound)
		return
	}

	log.Info("magic link exchanged", "user_id", userID, "org_id", orgID)

	// Record login (best effort — don't fail the flow if this fails)
	if recorder, ok := h.store.(loginAttemptRecorder); ok {
		_ = recorder.RecordLoginAttempt(r.Context(), user.Email, r.RemoteAddr, r.UserAgent(), true)
	}

	// Redirect to magic link callback which extracts tokens from URL fragment
	// and stores them in the app store (same token format as login/signup).
	fragment := "#access_token=" + tokens.AccessToken +
		"&refresh_token=" + tokens.RefreshToken +
		"&expires_at=" + strconv.FormatInt(tokens.ExpiresAt, 10)
	http.Redirect(w, r, h.dashboardURL+"/magic-link-callback"+fragment, http.StatusFound)
}

// MagicLinkExpiry is the TTL for magic link tokens.
const MagicLinkExpiry = 24 * time.Hour
