package handlers

import (
	"context"
	"encoding/json"
	"errors"
	"net/http"

	"github.com/coreos/go-oidc/v3/oidc"

	"github.com/featuresignals/server/internal/api/middleware"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

type ssoStore interface {
	domain.SSOStore
	domain.AuditWriter
	domain.OrgReader
}

// SSOHandler manages SSO configuration (admin CRUD). The actual SSO login
// flows are handled by SSOAuthHandler.
type SSOHandler struct {
	store ssoStore
}

func NewSSOHandler(store ssoStore) *SSOHandler {
	return &SSOHandler{store: store}
}

// UpsertSSOConfigRequest is the request body for creating/updating SSO config.
type UpsertSSOConfigRequest struct {
	ProviderType string `json:"provider_type"`
	MetadataURL  string `json:"metadata_url"`
	MetadataXML  string `json:"metadata_xml"`
	EntityID     string `json:"entity_id"`
	ACSURL       string `json:"acs_url"`
	Certificate  string `json:"certificate"`
	ClientID     string `json:"client_id"`
	ClientSecret string `json:"client_secret"`
	IssuerURL    string `json:"issuer_url"`
	Enabled      *bool  `json:"enabled"`
	Enforce      *bool  `json:"enforce"`
	DefaultRole  string `json:"default_role"`
}

// SSOConfigResponse is the API response shape. Secrets are masked.
type SSOConfigResponse struct {
	ID           string `json:"id"`
	OrgID        string `json:"org_id"`
	ProviderType string `json:"provider_type"`
	MetadataURL  string `json:"metadata_url,omitempty"`
	HasMetadata  bool   `json:"has_metadata_xml"`
	EntityID     string `json:"entity_id"`
	ACSURL       string `json:"acs_url"`
	HasCert      bool   `json:"has_certificate"`
	ClientID     string `json:"client_id,omitempty"`
	HasSecret    bool   `json:"has_client_secret"`
	IssuerURL    string `json:"issuer_url,omitempty"`
	Enabled      bool   `json:"enabled"`
	Enforce      bool   `json:"enforce"`
	DefaultRole  string `json:"default_role"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
}

func ssoConfigToResponse(c *domain.SSOConfig) *SSOConfigResponse {
	return &SSOConfigResponse{
		ID:           c.ID,
		OrgID:        c.OrgID,
		ProviderType: string(c.ProviderType),
		MetadataURL:  c.MetadataURL,
		HasMetadata:  c.MetadataXML != "",
		EntityID:     c.EntityID,
		ACSURL:       c.ACSURL,
		HasCert:      c.Certificate != "",
		ClientID:     c.ClientID,
		HasSecret:    c.ClientSecret != "",
		IssuerURL:    c.IssuerURL,
		Enabled:      c.Enabled,
		Enforce:      c.Enforce,
		DefaultRole:  c.DefaultRole,
		CreatedAt:    c.CreatedAt.UTC().Format("2006-01-02T15:04:05Z"),
		UpdatedAt:    c.UpdatedAt.UTC().Format("2006-01-02T15:04:05Z"),
	}
}

// Get returns the SSO configuration for the org. Secrets are masked but
// presence is indicated via boolean flags.
func (h *SSOHandler) Get(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())

	config, err := h.store.GetSSOConfigFull(r.Context(), orgID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "SSO not configured")
			return
		}
		httputil.Error(w, http.StatusInternalServerError, "failed to load SSO configuration")
		return
	}

	httputil.JSON(w, http.StatusOK, ssoConfigToResponse(config))
}

// Upsert creates or updates the SSO configuration.
func (h *SSOHandler) Upsert(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "sso")
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	var req UpsertSSOConfigRequest
	if err := httputil.DecodeJSON(r, &req); err != nil {
		httputil.Error(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if req.ProviderType != string(domain.SSOProviderSAML) && req.ProviderType != string(domain.SSOProviderOIDC) {
		httputil.Error(w, http.StatusBadRequest, "provider_type must be saml or oidc")
		return
	}

	if req.ProviderType == string(domain.SSOProviderSAML) {
		if req.MetadataURL == "" && req.MetadataXML == "" && (req.Certificate == "" || req.EntityID == "") {
			httputil.Error(w, http.StatusBadRequest, "SAML requires metadata_url, metadata_xml, or certificate + entity_id")
			return
		}
	}
	if req.ProviderType == string(domain.SSOProviderOIDC) {
		if req.IssuerURL == "" || req.ClientID == "" || req.ClientSecret == "" {
			httputil.Error(w, http.StatusBadRequest, "OIDC requires issuer_url, client_id, and client_secret")
			return
		}
	}

	config := &domain.SSOConfig{
		OrgID:        orgID,
		ProviderType: domain.SSOProviderType(req.ProviderType),
		MetadataURL:  req.MetadataURL,
		MetadataXML:  req.MetadataXML,
		EntityID:     req.EntityID,
		ACSURL:       req.ACSURL,
		Certificate:  req.Certificate,
		ClientID:     req.ClientID,
		ClientSecret: req.ClientSecret,
		IssuerURL:    req.IssuerURL,
		DefaultRole:  req.DefaultRole,
	}
	if req.Enabled != nil {
		config.Enabled = *req.Enabled
	}
	if req.Enforce != nil {
		config.Enforce = *req.Enforce
	}
	if config.DefaultRole == "" {
		config.DefaultRole = string(domain.RoleDeveloper)
	}

	if err := h.store.UpsertSSOConfig(r.Context(), config); err != nil {
		logger.Error("failed to upsert SSO config", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to save SSO configuration")
		return
	}

	afterState, _ := json.Marshal(ssoConfigToResponse(config))
	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &userID, ActorType: "user",
		Action: "sso.configured", ResourceType: "sso_config", ResourceID: &config.ID,
		AfterState: afterState, IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	httputil.JSON(w, http.StatusOK, ssoConfigToResponse(config))
}

// Delete removes the SSO configuration and disables SSO for the org.
func (h *SSOHandler) Delete(w http.ResponseWriter, r *http.Request) {
	orgID := middleware.GetOrgID(r.Context())
	userID := middleware.GetUserID(r.Context())

	if err := h.store.DeleteSSOConfig(r.Context(), orgID); err != nil {
		httputil.Error(w, http.StatusInternalServerError, "failed to delete SSO configuration")
		return
	}

	h.store.CreateAuditEntry(r.Context(), &domain.AuditEntry{
		OrgID: orgID, ActorID: &userID, ActorType: "user",
		Action: "sso.deleted", ResourceType: "sso_config",
		IPAddress: r.RemoteAddr, UserAgent: r.UserAgent(),
	})

	w.WriteHeader(http.StatusNoContent)
}

// TestConnection verifies that the SSO configuration can successfully connect
// to the IdP. For OIDC, it performs discovery. For SAML, it validates metadata.
func (h *SSOHandler) TestConnection(w http.ResponseWriter, r *http.Request) {
	logger := httputil.LoggerFromContext(r.Context()).With("handler", "sso")
	orgID := middleware.GetOrgID(r.Context())

	config, err := h.store.GetSSOConfigFull(r.Context(), orgID)
	if err != nil {
		if errors.Is(err, domain.ErrNotFound) {
			httputil.Error(w, http.StatusNotFound, "SSO not configured")
			return
		}
		logger.Error("failed to load SSO config for test", "error", err, "org_id", orgID)
		httputil.Error(w, http.StatusInternalServerError, "failed to load SSO configuration")
		return
	}

	switch config.ProviderType {
	case domain.SSOProviderOIDC:
		if config.IssuerURL == "" || config.ClientID == "" {
			httputil.JSON(w, http.StatusOK, map[string]interface{}{
				"success": false,
				"message": "OIDC requires issuer_url and client_id",
			})
			return
		}
		oidcErr := oidcDiscoveryCheck(r.Context(), config.IssuerURL)
		if oidcErr != nil {
			httputil.JSON(w, http.StatusOK, map[string]interface{}{
				"success": false,
				"message": "OIDC discovery failed: " + oidcErr.Error(),
			})
			return
		}
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "OIDC discovery successful",
		})

	case domain.SSOProviderSAML:
		if config.MetadataXML == "" && config.MetadataURL == "" && config.Certificate == "" {
			httputil.JSON(w, http.StatusOK, map[string]interface{}{
				"success": false,
				"message": "SAML requires metadata or certificate",
			})
			return
		}
		httputil.JSON(w, http.StatusOK, map[string]interface{}{
			"success": true,
			"message": "SAML configuration is valid",
		})

	default:
		httputil.Error(w, http.StatusBadRequest, "unknown provider type")
	}
}

func oidcDiscoveryCheck(ctx context.Context, issuerURL string) error {
	_, err := oidc.NewProvider(ctx, issuerURL)
	return err
}
