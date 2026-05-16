package handlers

import (
	"encoding/json"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strings"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
)

// GitHubOAuthHandler handles the GitHub OAuth App flow for connecting
// repositories to the FeatureSignals Console.
//
// Flow:
//  1. GET /v1/integrations/github/auth — redirects user to GitHub authorize page
//  2. GET /v1/integrations/github/callback — GitHub redirects here with ?code=
//     We exchange the code for an access token, store it encrypted, and
//     redirect the user back to the Console.
type GitHubOAuthHandler struct {
	store       domain.GitHubOAuthStore
	clientID    string
	clientSecret string
	redirectURI string
	dashboardURL string
	logger      *slog.Logger
	httpClient  *http.Client
}

// NewGitHubOAuthHandler creates a GitHub OAuth handler.
func NewGitHubOAuthHandler(
	store domain.GitHubOAuthStore,
	clientID, clientSecret, redirectURI, dashboardURL string,
	logger *slog.Logger,
) *GitHubOAuthHandler {
	return &GitHubOAuthHandler{
		store:        store,
		clientID:     clientID,
		clientSecret: clientSecret,
		redirectURI:  redirectURI,
		dashboardURL: dashboardURL,
		logger:       logger,
		httpClient:   &http.Client{},
	}
}

// Auth initiates the GitHub OAuth flow by redirecting the user to GitHub's
// authorize endpoint. The user must already be authenticated (JWT) so we can
// extract their org ID before redirecting.
//
// Query param: ?org_id=<id> (required — the org to associate the token with)
func (h *GitHubOAuthHandler) Auth(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "github_oauth_auth")

	orgID := r.URL.Query().Get("org_id")
	if orgID == "" {
		httputil.Error(w, http.StatusBadRequest, "org_id query parameter is required")
		return
	}

	// Build the GitHub authorize URL.
	// Scopes: repo (private repos), read:org (org membership for org repos).
	// State carries the org ID so we can associate the token on callback.
	authURL := fmt.Sprintf(
		"https://github.com/login/oauth/authorize?client_id=%s&redirect_uri=%s&scope=%s&state=%s",
		url.QueryEscape(h.clientID),
		url.QueryEscape(h.redirectURI),
		url.QueryEscape("repo,read:org"),
		url.QueryEscape(orgID),
	)

	logger.Info("redirecting to github oauth", "org_id", orgID)
	http.Redirect(w, r, authURL, http.StatusFound)
}

// Callback handles the OAuth callback from GitHub. GitHub redirects the user
// here with ?code=<temporary_code>&state=<org_id>.
//
// Steps:
//  1. Validate code and state parameters
//  2. Exchange code for an access token via POST https://github.com/login/oauth/access_token
//  3. Fetch the authenticated user's GitHub login
//  4. Store the token encrypted in the database
//  5. Redirect user to the Console with ?github_connected=true
func (h *GitHubOAuthHandler) Callback(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("handler", "github_oauth_callback")

	code := r.URL.Query().Get("code")
	state := r.URL.Query().Get("state") // org_id

	if code == "" {
		logger.Warn("github oauth callback missing code")
		httputil.Error(w, http.StatusBadRequest, "authorization code is required")
		return
	}
	if state == "" {
		logger.Warn("github oauth callback missing state")
		httputil.Error(w, http.StatusBadRequest, "state parameter is required")
		return
	}

	orgID := state

	// Exchange the authorization code for an access token.
	accessToken, err := h.exchangeCodeForToken(r, code)
	if err != nil {
		logger.Error("failed to exchange code for token", "error", err, "org_id", orgID)
		redirectWithError(w, r, h.dashboardURL, "github_auth_failed")
		return
	}

	// Fetch the authenticated GitHub user.
	githubUser, err := h.fetchGitHubUser(r, accessToken)
	if err != nil {
		logger.Error("failed to fetch github user", "error", err, "org_id", orgID)
		redirectWithError(w, r, h.dashboardURL, "github_auth_failed")
		return
	}

	// Store the encrypted token. repoFullName is populated later when the user
	// selects a repository or we can fetch the default repo here.
	if err := h.store.StoreGitHubToken(r.Context(), orgID, accessToken, githubUser, ""); err != nil {
		logger.Error("failed to store github token", "error", err, "org_id", orgID, "github_user", githubUser)
		redirectWithError(w, r, h.dashboardURL, "github_auth_failed")
		return
	}

	logger.Info("github oauth connected successfully", "org_id", orgID, "github_user", githubUser)

	// Redirect back to the Console with success flag.
	redirectWithSuccess(w, r, h.dashboardURL)
}

// exchangeCodeForToken POSTs to GitHub's access_token endpoint to exchange
// the temporary authorization code for a long-lived access token.
func (h *GitHubOAuthHandler) exchangeCodeForToken(r *http.Request, code string) (string, error) {
	tokenURL := "https://github.com/login/oauth/access_token"

	data := url.Values{}
	data.Set("client_id", h.clientID)
	data.Set("client_secret", h.clientSecret)
	data.Set("code", code)
	data.Set("redirect_uri", h.redirectURI)

	req, err := http.NewRequestWithContext(r.Context(), http.MethodPost, tokenURL, strings.NewReader(data.Encode()))
	if err != nil {
		return "", fmt.Errorf("build token request: %w", err)
	}
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	req.Header.Set("Accept", "application/json")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("token exchange request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<12)) // 4KB max
	if err != nil {
		return "", fmt.Errorf("read token response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("token exchange failed with status %d: %s", resp.StatusCode, string(body))
	}

	// Parse the JSON response. GitHub returns JSON when Accept: application/json is set.
	var tokenResp struct {
		AccessToken string `json:"access_token"`
		TokenType   string `json:"token_type"`
		Scope       string `json:"scope"`
		Error       string `json:"error"`
		ErrorDesc   string `json:"error_description"`
	}
	if err := json.Unmarshal(body, &tokenResp); err != nil {
		return "", fmt.Errorf("parse token response: %w (body: %s)", err, string(body))
	}

	if tokenResp.Error != "" {
		return "", fmt.Errorf("github oauth error: %s — %s", tokenResp.Error, tokenResp.ErrorDesc)
	}
	if tokenResp.AccessToken == "" {
		return "", fmt.Errorf("empty access_token in response: %s", string(body))
	}

	return tokenResp.AccessToken, nil
}

// fetchGitHubUser calls GET /user on the GitHub API to get the authenticated
// user's login name.
func (h *GitHubOAuthHandler) fetchGitHubUser(r *http.Request, accessToken string) (string, error) {
	req, err := http.NewRequestWithContext(r.Context(), http.MethodGet, "https://api.github.com/user", nil)
	if err != nil {
		return "", fmt.Errorf("build user request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+accessToken)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	resp, err := h.httpClient.Do(req)
	if err != nil {
		return "", fmt.Errorf("user request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(io.LimitReader(resp.Body, 1<<12))
	if err != nil {
		return "", fmt.Errorf("read user response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return "", fmt.Errorf("github user request failed with status %d: %s", resp.StatusCode, string(body))
	}

	var userResp struct {
		Login string `json:"login"`
	}
	if err := json.Unmarshal(body, &userResp); err != nil {
		return "", fmt.Errorf("parse user response: %w", err)
	}
	if userResp.Login == "" {
		return "", fmt.Errorf("empty login in user response")
	}

	return userResp.Login, nil
}

// redirectWithSuccess sends the user back to the Console with a success param.
func redirectWithSuccess(w http.ResponseWriter, r *http.Request, dashboardURL string) {
	target := dashboardURL + "/console?github_connected=true"
	http.Redirect(w, r, target, http.StatusFound)
}

// redirectWithError sends the user back to the Console with an error param.
func redirectWithError(w http.ResponseWriter, r *http.Request, dashboardURL, errorCode string) {
	target := fmt.Sprintf("%s/console?github_error=%s", dashboardURL, url.QueryEscape(errorCode))
	http.Redirect(w, r, target, http.StatusFound)
}
