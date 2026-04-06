package sso

import (
	"context"
	"crypto/rand"
	"encoding/base64"
	"fmt"

	"github.com/coreos/go-oidc/v3/oidc"
	"golang.org/x/oauth2"

	"github.com/featuresignals/server/internal/domain"
)

// OIDCProvider handles the OIDC Authorization Code flow for a single org.
type OIDCProvider struct {
	verifier    *oidc.IDTokenVerifier
	oauthConfig oauth2.Config
}

// NewOIDCProvider creates an OIDC provider from stored config. It performs
// OpenID Connect Discovery against the issuer URL.
func NewOIDCProvider(ctx context.Context, cfg *domain.SSOConfig, callbackURL string) (*OIDCProvider, error) {
	if cfg.IssuerURL == "" || cfg.ClientID == "" || cfg.ClientSecret == "" {
		return nil, fmt.Errorf("OIDC requires issuer_url, client_id, and client_secret")
	}

	provider, err := oidc.NewProvider(ctx, cfg.IssuerURL)
	if err != nil {
		return nil, fmt.Errorf("OIDC discovery for %s: %w", cfg.IssuerURL, err)
	}

	oauthConfig := oauth2.Config{
		ClientID:     cfg.ClientID,
		ClientSecret: cfg.ClientSecret,
		Endpoint:     provider.Endpoint(),
		RedirectURL:  callbackURL,
		Scopes:       []string{oidc.ScopeOpenID, "profile", "email"},
	}

	verifier := provider.Verifier(&oidc.Config{ClientID: cfg.ClientID})

	return &OIDCProvider{
		verifier:    verifier,
		oauthConfig: oauthConfig,
	}, nil
}

// GenerateState creates a cryptographically random state parameter for CSRF
// protection in the OIDC flow.
func GenerateState() (string, error) {
	b := make([]byte, 32)
	if _, err := rand.Read(b); err != nil {
		return "", fmt.Errorf("generate OIDC state: %w", err)
	}
	return base64.RawURLEncoding.EncodeToString(b), nil
}

// AuthCodeURL returns the URL to redirect the user to for OIDC authentication.
func (p *OIDCProvider) AuthCodeURL(state string) string {
	return p.oauthConfig.AuthCodeURL(state)
}

// Exchange trades an authorization code for tokens, verifies the ID token,
// and extracts the user's identity.
func (p *OIDCProvider) Exchange(ctx context.Context, code string) (*Identity, error) {
	token, err := p.oauthConfig.Exchange(ctx, code)
	if err != nil {
		return nil, fmt.Errorf("OIDC token exchange: %w", err)
	}

	rawIDToken, ok := token.Extra("id_token").(string)
	if !ok {
		return nil, fmt.Errorf("%w: no id_token in response", ErrInvalidAssertion)
	}

	idToken, err := p.verifier.Verify(ctx, rawIDToken)
	if err != nil {
		return nil, fmt.Errorf("%w: %v", ErrInvalidAssertion, err)
	}

	var claims struct {
		Email         string   `json:"email"`
		EmailVerified bool     `json:"email_verified"`
		Name          string   `json:"name"`
		GivenName     string   `json:"given_name"`
		FamilyName    string   `json:"family_name"`
		Groups        []string `json:"groups"`
	}
	if err := idToken.Claims(&claims); err != nil {
		return nil, fmt.Errorf("parse OIDC claims: %w", err)
	}

	if claims.Email == "" {
		return nil, ErrMissingEmail
	}

	name := claims.Name
	if name == "" && (claims.GivenName != "" || claims.FamilyName != "") {
		name = claims.GivenName + " " + claims.FamilyName
	}

	return &Identity{
		Email:     claims.Email,
		Name:      name,
		FirstName: claims.GivenName,
		LastName:  claims.FamilyName,
		Groups:    claims.Groups,
	}, nil
}
