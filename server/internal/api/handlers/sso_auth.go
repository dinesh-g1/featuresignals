package handlers

import (
	"context"
	"crypto/rand"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/go-chi/chi/v5"

	"github.com/featuresignals/server/internal/auth"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/sso"
)

// ssoAuthStore is the narrowest interface needed by the SSO auth handlers.
type ssoAuthStore interface {
	domain.SSOStore
	domain.UserReader
	domain.UserWriter
	domain.OrgMemberStore
	domain.AuditWriter
}

// SSOAuthHandler handles the public SSO authentication flows: SAML ACS, OIDC
// callback, login initiation, metadata, and discovery.
type SSOAuthHandler struct {
	store      ssoAuthStore
	jwtMgr     auth.TokenManager
	appBaseURL string
	dashURL    string

	// oidcStates caches OIDC state parameters for CSRF protection.
	// In production, this should be replaced with a Redis or DB-backed store
	// for multi-instance deployments. For now we use an in-memory map guarded
	// by the org slug as a namespace.
	oidcStates *stateCache
}

func NewSSOAuthHandler(store ssoAuthStore, jwtMgr auth.TokenManager, appBaseURL, dashURL string) *SSOAuthHandler {
	return &SSOAuthHandler{
		store:      store,
		jwtMgr:     jwtMgr,
		appBaseURL: appBaseURL,
		dashURL:    dashURL,
		oidcStates: newStateCache(10 * time.Minute),
	}
}

// Discovery returns the SSO provider type and status for a given org slug.
// This is a public endpoint used by the login page to determine if SSO is
// available for an organization.
func (h *SSOAuthHandler) Discovery(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "orgSlug")
	if slug == "" {
		httputil.Error(w, http.StatusBadRequest, "org slug is required")
		return
	}

	cfg, err := h.store.GetSSOConfigByOrgSlug(r.Context(), slug)
	if err != nil {
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"sso_enabled": false,
		})
		return
	}

	if !cfg.Enabled {
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"sso_enabled": false,
		})
		return
	}

	httputil.JSON(w, http.StatusOK, map[string]interface{}{
		"sso_enabled":   true,
		"provider_type": cfg.ProviderType,
		"enforce":       cfg.Enforce,
	})
}

// SAMLMetadata returns the SP metadata XML for the IdP to import.
func (h *SSOAuthHandler) SAMLMetadata(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "orgSlug")
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "sso_auth", "org_slug", slug)

	cfg, err := h.store.GetSSOConfigByOrgSlug(r.Context(), slug)
	if err != nil {
		logger.Warn("SSO config not found for slug", "error", err)
		httputil.Error(w, http.StatusNotFound, "SSO not configured")
		return
	}
	if cfg.ProviderType != domain.SSOProviderSAML {
		httputil.Error(w, http.StatusBadRequest, "SAML not configured for this organization")
		return
	}

	sp, err := sso.NewSAMLProvider(cfg, h.appBaseURL, slug)
	if err != nil {
		logger.Error("failed to build SAML provider", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "SSO configuration error")
		return
	}

	w.Header().Set("Content-Type", "application/xml")
	w.WriteHeader(http.StatusOK)
	w.Write(sp.Metadata())
}

// SAMLLogin initiates the SAML authentication flow by redirecting to the IdP.
func (h *SSOAuthHandler) SAMLLogin(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "orgSlug")
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "sso_auth", "org_slug", slug)

	cfg, err := h.store.GetSSOConfigByOrgSlug(r.Context(), slug)
	if err != nil || !cfg.Enabled {
		httputil.Error(w, http.StatusNotFound, "SSO not configured or disabled")
		return
	}
	if cfg.ProviderType != domain.SSOProviderSAML {
		httputil.Error(w, http.StatusBadRequest, "SAML not configured for this organization")
		return
	}

	sp, err := sso.NewSAMLProvider(cfg, h.appBaseURL, slug)
	if err != nil {
		logger.Error("failed to build SAML provider", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "SSO configuration error")
		return
	}

	relayState := h.dashURL + "/login?sso_complete=true"
	redirectURL, err := sp.AuthnRequestURL(relayState)
	if err != nil {
		logger.Error("failed to generate SAML authn request", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to initiate SSO login")
		return
	}

	http.Redirect(w, r, redirectURL, http.StatusFound)
}

// SAMLACS handles the SAML Assertion Consumer Service callback (POST from IdP).
func (h *SSOAuthHandler) SAMLACS(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "orgSlug")
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "sso_auth", "org_slug", slug)

	cfg, err := h.store.GetSSOConfigByOrgSlug(r.Context(), slug)
	if err != nil || !cfg.Enabled {
		logger.Warn("SAML ACS: SSO not configured", "error", err)
		h.redirectWithError(w, r, "SSO not configured for this organization")
		return
	}

	sp, err := sso.NewSAMLProvider(cfg, h.appBaseURL, slug)
	if err != nil {
		logger.Error("SAML ACS: failed to build provider", "error", err)
		h.redirectWithError(w, r, "SSO configuration error")
		return
	}

	identity, err := sp.ParseResponse(r)
	if err != nil {
		logger.Warn("SAML ACS: invalid assertion", "error", err)
		h.redirectWithError(w, r, "Invalid SSO response from identity provider")
		return
	}

	tokens, err := h.provisionAndLogin(r.Context(), cfg, identity, r.RemoteAddr, r.UserAgent())
	if err != nil {
		logger.Error("SAML ACS: provisioning failed", "error", err, "email", identity.Email)
		h.redirectWithError(w, r, "Failed to complete SSO login")
		return
	}

	logger.Info("SAML SSO login successful", "email", identity.Email, "org_id", cfg.OrgID)

	h.redirectWithTokens(w, r, tokens)
}

// OIDCAuthorize initiates the OIDC authorization code flow.
func (h *SSOAuthHandler) OIDCAuthorize(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "orgSlug")
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "sso_auth", "org_slug", slug)

	cfg, err := h.store.GetSSOConfigByOrgSlug(r.Context(), slug)
	if err != nil || !cfg.Enabled {
		httputil.Error(w, http.StatusNotFound, "SSO not configured or disabled")
		return
	}
	if cfg.ProviderType != domain.SSOProviderOIDC {
		httputil.Error(w, http.StatusBadRequest, "OIDC not configured for this organization")
		return
	}

	callbackURL := fmt.Sprintf("%s/v1/sso/oidc/callback/%s", h.appBaseURL, slug)
	provider, err := sso.NewOIDCProvider(r.Context(), cfg, callbackURL)
	if err != nil {
		logger.Error("OIDC: failed to build provider", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "SSO configuration error")
		return
	}

	state, err := sso.GenerateState()
	if err != nil {
		logger.Error("OIDC: failed to generate state", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "failed to initiate SSO login")
		return
	}

	h.oidcStates.Set(state, slug)

	http.Redirect(w, r, provider.AuthCodeURL(state), http.StatusFound)
}

// OIDCCallback handles the OIDC authorization code callback.
func (h *SSOAuthHandler) OIDCCallback(w http.ResponseWriter, r *http.Request) {
	slug := chi.URLParam(r, "orgSlug")
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "sso_auth", "org_slug", slug)

	if errParam := r.URL.Query().Get("error"); errParam != "" {
		desc := r.URL.Query().Get("error_description")
		logger.Warn("OIDC callback error from IdP", "error", errParam, "description", desc)
		h.redirectWithError(w, r, "Identity provider returned an error: "+errParam)
		return
	}

	state := r.URL.Query().Get("state")
	code := r.URL.Query().Get("code")

	if state == "" || code == "" {
		h.redirectWithError(w, r, "Invalid OIDC callback parameters")
		return
	}

	cachedSlug, valid := h.oidcStates.Get(state)
	if !valid || cachedSlug != slug {
		logger.Warn("OIDC callback: invalid state parameter")
		h.redirectWithError(w, r, "Invalid or expired SSO session")
		return
	}

	cfg, err := h.store.GetSSOConfigByOrgSlug(r.Context(), slug)
	if err != nil || !cfg.Enabled {
		h.redirectWithError(w, r, "SSO not configured for this organization")
		return
	}

	callbackURL := fmt.Sprintf("%s/v1/sso/oidc/callback/%s", h.appBaseURL, slug)
	provider, err := sso.NewOIDCProvider(r.Context(), cfg, callbackURL)
	if err != nil {
		logger.Error("OIDC callback: failed to build provider", "error", err)
		h.redirectWithError(w, r, "SSO configuration error")
		return
	}

	identity, err := provider.Exchange(r.Context(), code)
	if err != nil {
		logger.Warn("OIDC callback: token exchange failed", "error", err)
		h.redirectWithError(w, r, "Failed to verify identity with provider")
		return
	}

	tokens, err := h.provisionAndLogin(r.Context(), cfg, identity, r.RemoteAddr, r.UserAgent())
	if err != nil {
		logger.Error("OIDC callback: provisioning failed", "error", err, "email", identity.Email)
		h.redirectWithError(w, r, "Failed to complete SSO login")
		return
	}

	logger.Info("OIDC SSO login successful", "email", identity.Email, "org_id", cfg.OrgID)

	h.redirectWithTokens(w, r, tokens)
}

// provisionAndLogin performs JIT provisioning (create user + org membership if
// needed) and generates JWT tokens.
func (h *SSOAuthHandler) provisionAndLogin(ctx context.Context, cfg *domain.SSOConfig, identity *sso.Identity, ip, ua string) (*auth.TokenPair, error) {
	user, err := h.store.GetUserByEmail(ctx, identity.Email)
	if err != nil {
		if !errors.Is(err, domain.ErrNotFound) {
			return nil, fmt.Errorf("lookup user: %w", err)
		}

		name := identity.Name
		if name == "" {
			name = strings.Split(identity.Email, "@")[0]
		}

		randomPassword, _ := generateRandomPassword()

		hash, hashErr := auth.HashPassword(randomPassword)
		if hashErr != nil {
			return nil, fmt.Errorf("hash password for SSO user: %w", hashErr)
		}

		user = &domain.User{
			Email:         identity.Email,
			Name:          name,
			PasswordHash:  hash,
			EmailVerified: true,
		}
		if createErr := h.store.CreateUser(ctx, user); createErr != nil {
			if errors.Is(createErr, domain.ErrConflict) {
				user, err = h.store.GetUserByEmail(ctx, identity.Email)
				if err != nil {
					return nil, fmt.Errorf("re-fetch user after conflict: %w", err)
				}
			} else {
				return nil, fmt.Errorf("create SSO user: %w", createErr)
			}
		}
	}

	member, err := h.store.GetOrgMember(ctx, cfg.OrgID, user.ID)
	if err != nil {
		role := sso.MapRole(identity.Groups, cfg.DefaultRole)
		member = &domain.OrgMember{
			OrgID:  cfg.OrgID,
			UserID: user.ID,
			Role:   role,
		}
		if addErr := h.store.AddOrgMember(ctx, member); addErr != nil {
			if !errors.Is(addErr, domain.ErrConflict) {
				return nil, fmt.Errorf("add org member via SSO: %w", addErr)
			}
			member, err = h.store.GetOrgMember(ctx, cfg.OrgID, user.ID)
			if err != nil {
				return nil, fmt.Errorf("re-fetch member after conflict: %w", err)
			}
		}
	}

	_ = h.store.UpdateLastLoginAt(ctx, user.ID)

	tokens, err := h.jwtMgr.GenerateTokenPair(user.ID, cfg.OrgID, string(member.Role), "")
	if err != nil {
		return nil, fmt.Errorf("generate tokens: %w", err)
	}

	h.store.CreateAuditEntry(ctx, &domain.AuditEntry{
		OrgID: cfg.OrgID, ActorID: &user.ID, ActorType: "user",
		Action: "sso.login", ResourceType: "user", ResourceID: &user.ID,
		IPAddress: ip, UserAgent: ua,
	})

	return tokens, nil
}

// redirectWithTokens sends the user back to the dashboard with tokens in the
// URL fragment so the SPA can capture them. Tokens are in the fragment (not
// query params) to keep them out of server logs and browser history.
func (h *SSOAuthHandler) redirectWithTokens(w http.ResponseWriter, r *http.Request, tokens *auth.TokenPair) {
	redirectURL := fmt.Sprintf("%s/sso/callback#access_token=%s&refresh_token=%s&expires_at=%d",
		h.dashURL, tokens.AccessToken, tokens.RefreshToken, tokens.ExpiresAt)
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

func (h *SSOAuthHandler) redirectWithError(w http.ResponseWriter, r *http.Request, msg string) {
	redirectURL := fmt.Sprintf("%s/login?sso_error=%s", h.dashURL, msg)
	http.Redirect(w, r, redirectURL, http.StatusFound)
}

func generateRandomPassword() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", err
	}
	return hex.EncodeToString(b), nil
}
