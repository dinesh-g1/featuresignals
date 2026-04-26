// Package bitbucket implements the GitProvider interface for Bitbucket Cloud.
// It uses the Bitbucket Cloud REST API 2.0 directly with net/http.
// Authentication supports both App Passwords (Basic auth, "user:pass" format)
// and OAuth 2.0 tokens (Bearer auth).
package bitbucket

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"mime/multipart"
	"net/http"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/janitor"
)

// ─── Compile-time interface check ──────────────────────────────────────────

var _ janitor.GitProvider = (*BitbucketProvider)(nil)

// ErrNotImplemented is returned for methods that are not yet implemented
// for the Bitbucket provider (MVP subset).
var ErrNotImplemented = errors.New("not implemented")

// ─── Constants ─────────────────────────────────────────────────────────────

const (
	defaultAPIBase = "https://api.bitbucket.org/2.0"
	userAgent      = "featuresignals-janitor/1.0"
)

// ─── Bitbucket API types (internal, unexported) ───────────────────────────

// bbUser is the response from GET /2.0/user.
type bbUser struct {
	UUID        string `json:"uuid"`
	DisplayName string `json:"display_name"`
	AccountID   string `json:"account_id"`
	Nickname    string `json:"nickname"`
}

// bbRepository is a repo item in the list response.
type bbRepository struct {
	UUID        string `json:"uuid"`
	Name        string `json:"name"`
	FullName    string `json:"full_name"`
	Description string `json:"description"`
	IsPrivate   bool   `json:"is_private"`
	Language    string `json:"language"`
	Links       struct {
		Clone []struct {
			Name string `json:"name"`
			Href string `json:"href"`
		} `json:"clone"`
		HTML struct {
			Href string `json:"href"`
		} `json:"html"`
	} `json:"links"`
	MainBranch struct {
		Name string `json:"name"`
	} `json:"mainbranch"`
}

// bbPullRequest is a PR item in API responses.
type bbPullRequest struct {
	ID          int    `json:"id"`
	Title       string `json:"title"`
	Description string `json:"description"`
	State       string `json:"state"`
	Links       struct {
		HTML struct {
			Href string `json:"href"`
		} `json:"html"`
	} `json:"links"`
	Source struct {
		Branch struct {
			Name string `json:"name"`
		} `json:"branch"`
		Commit struct {
			Hash string `json:"hash"`
		} `json:"commit"`
	} `json:"source"`
	Destination struct {
		Branch struct {
			Name string `json:"name"`
		} `json:"branch"`
	} `json:"destination"`
	CreatedOn time.Time `json:"created_on"`
	UpdatedOn time.Time `json:"updated_on"`
}

// bbPaginatedResponse holds the common pagination envelope.
type bbPaginatedResponse struct {
	Values  json.RawMessage `json:"values"`
	Next    string          `json:"next,omitempty"`
	Page    int             `json:"page,omitempty"`
	Pagelen int             `json:"pagelen,omitempty"`
	Size    int             `json:"size,omitempty"`
}

// bbSrcEntry is an item in a source tree listing.
type bbSrcEntry struct {
	Path string `json:"path"`
	Type string `json:"type"` // "commit_file", "commit_directory", "commit_link"
}

// bbBranchRef is the response from the refs/branches endpoint.
type bbBranchRef struct {
	Name   string `json:"name"`
	Target struct {
		Hash string `json:"hash"`
	} `json:"target"`
}

// bbError is the Bitbucket API error envelope.
type bbError struct {
	Type  string `json:"type"`
	Error struct {
		Message string `json:"message"`
	} `json:"error"`
}

// bbWebhook is the response from creating a webhook.
type bbWebhook struct {
	UUID string `json:"uuid"`
}

// ─── Provider struct ───────────────────────────────────────────────────────

// BitbucketProvider implements janitor.GitProvider for Bitbucket Cloud.
type BitbucketProvider struct {
	httpClient *http.Client
	logger     *slog.Logger
	config     janitor.GitProviderConfig
	baseURL    string
}

// NewBitbucketProvider creates a new BitbucketProvider.
//
// Authentication is determined by the format of config.Token:
//   - "username:app_password" → Basic Auth
//   - "oauth_token" (no colon) → Bearer Auth
//
// The provider validates the token on creation by calling GET /2.0/user.
func NewBitbucketProvider(config janitor.GitProviderConfig) (janitor.GitProvider, error) {
	if config.Token == "" {
		return nil, fmt.Errorf("%w: bitbucket token is required", domain.ErrValidation)
	}

	logger := slog.Default().With("provider", "bitbucket")

	baseURL := defaultAPIBase
	if config.BaseURL != "" {
		baseURL = strings.TrimRight(config.BaseURL, "/")
	}

	provider := &BitbucketProvider{
		httpClient: &http.Client{Timeout: 30 * time.Second},
		logger:     logger,
		config:     config,
		baseURL:    baseURL,
	}

	// Validate the token by fetching the authenticated user.
	if err := provider.ValidateToken(context.Background()); err != nil {
		return nil, fmt.Errorf("bitbucket token validation failed: %w", err)
	}

	return provider, nil
}

// ─── Provider metadata ─────────────────────────────────────────────────────

// Name returns the provider name.
func (p *BitbucketProvider) Name() string {
	return "bitbucket"
}

// Scopes returns the required OAuth scopes for Bitbucket.
func (p *BitbucketProvider) Scopes() []string {
	return []string{"repository", "pullrequest"}
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────

// isAppPassword returns true when the token is in "username:password" format.
func (p *BitbucketProvider) isAppPassword() bool {
	return strings.Contains(p.config.Token, ":")
}

// authParts returns the username and secret for Basic auth when using
// an app password. Returns empty strings for Bearer auth.
func (p *BitbucketProvider) authParts() (username, password string) {
	if p.isAppPassword() {
		parts := strings.SplitN(p.config.Token, ":", 2)
		return parts[0], parts[1]
	}
	return "", ""
}

// setAuthHeaders sets the appropriate Authorization header on the request
// based on the token format. App passwords use Basic auth. OAuth tokens
// use Bearer auth.
func (p *BitbucketProvider) setAuthHeaders(req *http.Request) {
	if p.isAppPassword() {
		user, pass := p.authParts()
		req.SetBasicAuth(user, pass)
	} else {
		req.Header.Set("Authorization", "Bearer "+p.config.Token)
	}
}

// newRequest creates an HTTP request with authentication and default headers.
func (p *BitbucketProvider) newRequest(ctx context.Context, method, endpoint string, body io.Reader) (*http.Request, error) {
	u := p.baseURL + endpoint
	req, err := http.NewRequestWithContext(ctx, method, u, body)
	if err != nil {
		return nil, fmt.Errorf("creating request: %w", err)
	}

	p.setAuthHeaders(req)
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Accept", "application/json")
	if body != nil {
		req.Header.Set("Content-Type", "application/json")
	}

	return req, nil
}

// doRequest executes an HTTP request and decodes the JSON response into dest.
// It maps HTTP status codes to domain errors.
func (p *BitbucketProvider) doRequest(req *http.Request, dest interface{}) error {
	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("bitbucket api request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("reading bitbucket response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return p.mapHTTPError(resp.StatusCode, body)
	}

	if dest != nil && len(body) > 0 {
		if err := json.Unmarshal(body, dest); err != nil {
			return fmt.Errorf("decoding bitbucket response: %w", err)
		}
	}

	return nil
}

// doRequestRaw executes an HTTP request and returns the raw body bytes.
func (p *BitbucketProvider) doRequestRaw(req *http.Request) ([]byte, error) {
	resp, err := p.httpClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("bitbucket api request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("reading bitbucket response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return nil, p.mapHTTPError(resp.StatusCode, body)
	}

	return body, nil
}

// mapHTTPError translates Bitbucket HTTP error codes to domain errors.
func (p *BitbucketProvider) mapHTTPError(statusCode int, body []byte) error {
	// Try to extract the error message from the Bitbucket error envelope.
	var errResp bbError
	msg := ""
	if json.Unmarshal(body, &errResp) == nil && errResp.Error.Message != "" {
		msg = errResp.Error.Message
	}

	switch statusCode {
	case http.StatusNotFound:
		if msg != "" {
			return fmt.Errorf("%s: %w", msg, domain.ErrNotFound)
		}
		return fmt.Errorf("%w", domain.ErrNotFound)
	case http.StatusConflict:
		if msg != "" {
			return fmt.Errorf("%s: %w", msg, domain.ErrConflict)
		}
		return fmt.Errorf("%w", domain.ErrConflict)
	case http.StatusUnauthorized:
		if msg != "" {
			return fmt.Errorf("%w: %s", domain.NewValidationError("token", "invalid credentials"), msg)
		}
		return domain.NewValidationError("token", "invalid credentials")
	case http.StatusForbidden:
		if msg != "" {
			return fmt.Errorf("%w: %s", domain.NewValidationError("token", "insufficient permissions"), msg)
		}
		return domain.NewValidationError("token", "insufficient permissions")
	default:
		if msg != "" {
			return fmt.Errorf("bitbucket api error (status %d): %s", statusCode, msg)
		}
		return fmt.Errorf("bitbucket api error (status %d)", statusCode)
	}
}

// getPaginatedResults fetches all pages from a paginated endpoint and returns
// the concatenated raw JSON arrays.
func (p *BitbucketProvider) getPaginatedResults(ctx context.Context, endpoint string) ([]json.RawMessage, error) {
	var allItems []json.RawMessage
	nextURL := endpoint

	for nextURL != "" {
		// If it's a relative path, prepend the base URL.
		u := nextURL
		if !strings.HasPrefix(u, "https://") && !strings.HasPrefix(u, "http://") {
			u = p.baseURL + u
		}

		req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
		if err != nil {
			return nil, fmt.Errorf("creating paginated request: %w", err)
		}

		p.setAuthHeaders(req)
		req.Header.Set("User-Agent", userAgent)
		req.Header.Set("Accept", "application/json")

		resp, err := p.httpClient.Do(req)
		if err != nil {
			return nil, fmt.Errorf("paginated request: %w", err)
		}

		body, err := io.ReadAll(resp.Body)
		resp.Body.Close()
		if err != nil {
			return nil, fmt.Errorf("reading paginated response: %w", err)
		}

		if resp.StatusCode >= 400 {
			return nil, p.mapHTTPError(resp.StatusCode, body)
		}

		var page bbPaginatedResponse
		if err := json.Unmarshal(body, &page); err != nil {
			return nil, fmt.Errorf("decoding paginated response: %w", err)
		}

		// Unmarshal the values array into individual items.
		var items []json.RawMessage
		if page.Values != nil {
			if err := json.Unmarshal(page.Values, &items); err != nil {
				return nil, fmt.Errorf("decoding values array: %w", err)
			}
		}
		allItems = append(allItems, items...)

		nextURL = page.Next
	}

	return allItems, nil
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// splitRepo splits a "workspace/repo-slug" string into workspace and repoSlug.
func splitRepo(repo string) (workspace, repoSlug string) {
	parts := strings.SplitN(repo, "/", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return parts[0], parts[0]
}

// ─── Repository operations ─────────────────────────────────────────────────

// FetchRepository downloads a repository as tar.gz from Bitbucket.
//
// Uses: GET /2.0/repositories/{workspace}/{slug}/src/{branch}?format=tar
func (p *BitbucketProvider) FetchRepository(ctx context.Context, repo, branch string) ([]byte, error) {
	workspace, repoSlug := splitRepo(repo)

	endpoint := fmt.Sprintf("/repositories/%s/%s/src/%s?format=tar", workspace, repoSlug, branch)
	req, err := p.newRequest(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("fetching repository %s: %w", repo, err)
	}
	req.Header.Set("Accept", "application/octet-stream")

	return p.doRequestRaw(req)
}

// ListRepositories lists all repositories for the configured workspace.
// The workspace is taken from config.OrgOrGroup. If empty, the authenticated
// user's repositories are returned.
//
// Uses: GET /2.0/repositories/{workspace}?pagelen=100
func (p *BitbucketProvider) ListRepositories(ctx context.Context) ([]janitor.Repository, error) {
	workspace := p.config.OrgOrGroup
	var endpoint string
	if workspace != "" {
		endpoint = fmt.Sprintf("/repositories/%s?pagelen=100", workspace)
	} else {
		endpoint = "/repositories?pagelen=100&role=member"
	}

	items, err := p.getPaginatedResults(ctx, endpoint)
	if err != nil {
		return nil, fmt.Errorf("listing repositories: %w", err)
	}

	result := make([]janitor.Repository, 0, len(items))
	for _, raw := range items {
		var bbRepo bbRepository
		if err := json.Unmarshal(raw, &bbRepo); err != nil {
			p.logger.LogAttrs(ctx, slog.LevelWarn, "skipping unparseable repo",
				slog.String("error", err.Error()))
			continue
		}
		result = append(result, bbRepoToJanitor(bbRepo))
	}

	return result, nil
}

// GetFileContents retrieves the contents of a file at the given path and branch.
//
// Uses: GET /2.0/repositories/{workspace}/{repo_slug}/src/{commit}/{path}
func (p *BitbucketProvider) GetFileContents(ctx context.Context, repo, path, branch string) ([]byte, error) {
	workspace, repoSlug := splitRepo(repo)

	if branch == "" {
		branch = "main"
	}

	// Bitbucket's src endpoint returns the raw file content.
	endpoint := fmt.Sprintf("/repositories/%s/%s/src/%s/%s", workspace, repoSlug, branch, path)
	req, err := p.newRequest(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("getting file %s/%s: %w", repo, path, err)
	}
	// The src endpoint returns raw content, not JSON.
	req.Header.Set("Accept", "*/*")

	return p.doRequestRaw(req)
}

// ListFiles lists all files in the given path and branch.
//
// Uses: GET /2.0/repositories/{workspace}/{repo_slug}/src/{commit}?pagelen=100
func (p *BitbucketProvider) ListFiles(ctx context.Context, repo, path, branch string) ([]string, error) {
	workspace, repoSlug := splitRepo(repo)

	if branch == "" {
		branch = "main"
	}

	// Build the source tree URL. If path is specified, it's appended to the URL.
	endpoint := fmt.Sprintf("/repositories/%s/%s/src/%s", workspace, repoSlug, branch)
	if path != "" {
		endpoint = fmt.Sprintf("%s/%s", endpoint, strings.TrimPrefix(path, "/"))
	}
	endpoint += "?pagelen=100"

	items, err := p.getPaginatedResults(ctx, endpoint)
	if err != nil {
		return nil, fmt.Errorf("listing files in %s/%s: %w", repo, path, err)
	}

	var files []string
	prefix := strings.TrimSuffix(path, "/")
	if prefix != "" {
		prefix += "/"
	}

	for _, raw := range items {
		var entry bbSrcEntry
		if err := json.Unmarshal(raw, &entry); err != nil {
			continue
		}
		if entry.Type != "commit_file" {
			continue
		}
		if prefix != "" && !strings.HasPrefix(entry.Path, prefix) {
			continue
		}
		files = append(files, entry.Path)
	}

	return files, nil
}

// ─── Branch operations ─────────────────────────────────────────────────────

// getBranchCommitSHA retrieves the commit hash at the HEAD of the given branch.
func (p *BitbucketProvider) getBranchCommitSHA(ctx context.Context, workspace, repoSlug, branch string) (string, error) {
	endpoint := fmt.Sprintf("/repositories/%s/%s/refs/branches/%s", workspace, repoSlug, branch)
	req, err := p.newRequest(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return "", err
	}

	var ref bbBranchRef
	if err := p.doRequest(req, &ref); err != nil {
		return "", fmt.Errorf("getting branch %s: %w", branch, err)
	}

	if ref.Target.Hash == "" {
		return "", fmt.Errorf("branch %s has no target commit", branch)
	}

	return ref.Target.Hash, nil
}

// CreateBranch creates a new branch from the given base branch.
//
// Uses: POST /2.0/repositories/{workspace}/{repo_slug}/refs/branches
func (p *BitbucketProvider) CreateBranch(ctx context.Context, repo, branch, baseBranch string) error {
	workspace, repoSlug := splitRepo(repo)

	if baseBranch == "" {
		baseBranch = "main"
	}

	// Get the commit SHA of the base branch.
	commitSHA, err := p.getBranchCommitSHA(ctx, workspace, repoSlug, baseBranch)
	if err != nil {
		return fmt.Errorf("getting base branch %s commit: %w", baseBranch, err)
	}

	body := map[string]interface{}{
		"name": branch,
		"target": map[string]string{
			"hash": commitSHA,
		},
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshalling branch request: %w", err)
	}

	endpoint := fmt.Sprintf("/repositories/%s/%s/refs/branches", workspace, repoSlug)
	req, err := p.newRequest(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("creating branch request: %w", err)
	}

	if err := p.doRequest(req, nil); err != nil {
		return fmt.Errorf("creating branch %s in %s: %w", branch, repo, err)
	}

	return nil
}

// DeleteBranch deletes a branch from a Bitbucket repository.
//
// Uses: DELETE /2.0/repositories/{workspace}/{slug}/refs/branches/{branch}
func (p *BitbucketProvider) DeleteBranch(ctx context.Context, repo, branch string) error {
	workspace, repoSlug := splitRepo(repo)

	endpoint := fmt.Sprintf("/repositories/%s/%s/refs/branches/%s", workspace, repoSlug, branch)
	req, err := p.newRequest(ctx, http.MethodDelete, endpoint, nil)
	if err != nil {
		return fmt.Errorf("deleting branch request: %w", err)
	}

	if err := p.doRequest(req, nil); err != nil {
		return fmt.Errorf("deleting branch %s in %s: %w", branch, repo, err)
	}

	return nil
}

// BranchExists checks whether a branch exists in a Bitbucket repository.
// Delegates to the internal branchExistsInternal helper.
func (p *BitbucketProvider) BranchExists(ctx context.Context, repo, branch string) (bool, error) {
	workspace, repoSlug := splitRepo(repo)
	return p.branchExistsInternal(ctx, workspace, repoSlug, branch)
}

// ─── PR operations ─────────────────────────────────────────────────────────

// CreatePullRequest commits file changes to the branch and creates a pull request.
//
// Uses: POST /2.0/repositories/{workspace}/{repo_slug}/pullrequests
func (p *BitbucketProvider) CreatePullRequest(ctx context.Context, repo, branch, title, body string, changes []janitor.FileChange) (*janitor.PR, error) {
	workspace, repoSlug := splitRepo(repo)

	// First, commit the files to the branch.
	if err := p.CommitFiles(ctx, repo, branch, title, changes); err != nil {
		return nil, fmt.Errorf("committing files for PR: %w", err)
	}

	// Get the repository info to determine the default branch.
	repoInfo, err := p.getRepositoryInfo(ctx, workspace, repoSlug)
	if err != nil {
		return nil, fmt.Errorf("getting repository info: %w", err)
	}
	baseBranch := "main"
	if repoInfo.MainBranch.Name != "" {
		baseBranch = repoInfo.MainBranch.Name
	}

	// Create the pull request via Bitbucket API.
	prBody := map[string]interface{}{
		"title":       title,
		"description": body,
		"source": map[string]interface{}{
			"branch": map[string]string{
				"name": branch,
			},
		},
		"destination": map[string]interface{}{
			"branch": map[string]string{
				"name": baseBranch,
			},
		},
	}

	bodyBytes, err := json.Marshal(prBody)
	if err != nil {
		return nil, fmt.Errorf("marshalling PR request: %w", err)
	}

	endpoint := fmt.Sprintf("/repositories/%s/%s/pullrequests", workspace, repoSlug)
	req, err := p.newRequest(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return nil, fmt.Errorf("creating PR request: %w", err)
	}

	var bbPR bbPullRequest
	if err := p.doRequest(req, &bbPR); err != nil {
		return nil, fmt.Errorf("creating pull request in %s: %w", repo, err)
	}

	return bbPRToJanitor(&bbPR), nil
}

// UpdatePullRequest updates a pull request by committing new changes to its source branch.
//
// Uses: GET /2.0/repositories/{workspace}/{slug}/pullrequests/{id}
// Followed by CommitFiles to the source branch.
func (p *BitbucketProvider) UpdatePullRequest(ctx context.Context, repo string, prNumber int, changes []janitor.FileChange) error {
	pr, err := p.GetPullRequest(ctx, repo, prNumber)
	if err != nil {
		return fmt.Errorf("getting pull request #%d: %w", prNumber, err)
	}
	if pr.Branch == "" {
		return fmt.Errorf("pull request #%d has no source branch", prNumber)
	}

	return p.CommitFiles(ctx, repo, pr.Branch, "Update pull request with changes", changes)
}

// GetPullRequest retrieves a pull request by number.
//
// Uses: GET /2.0/repositories/{workspace}/{repo_slug}/pullrequests/{id}
func (p *BitbucketProvider) GetPullRequest(ctx context.Context, repo string, prNumber int) (*janitor.PR, error) {
	workspace, repoSlug := splitRepo(repo)

	endpoint := fmt.Sprintf("/repositories/%s/%s/pullrequests/%d", workspace, repoSlug, prNumber)
	req, err := p.newRequest(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, fmt.Errorf("getting PR request: %w", err)
	}

	var bbPR bbPullRequest
	if err := p.doRequest(req, &bbPR); err != nil {
		return nil, fmt.Errorf("getting pull request #%d in %s: %w", prNumber, repo, err)
	}

	return bbPRToJanitor(&bbPR), nil
}

// ListPullRequests lists pull requests filtered by state ("OPEN", "MERGED",
// "DECLINED", or "" for all).
//
// Uses: GET /2.0/repositories/{workspace}/{repo_slug}/pullrequests
func (p *BitbucketProvider) ListPullRequests(ctx context.Context, repo, state string) ([]janitor.PR, error) {
	workspace, repoSlug := splitRepo(repo)

	if state == "" {
		state = "OPEN"
	}

	// Bitbucket uses uppercase state values: OPEN, MERGED, DECLINED, SUPERSEDED.
	// Map common lowercase states to Bitbucket format.
	switch strings.ToUpper(state) {
	case "OPEN":
		state = "OPEN"
	case "CLOSED", "MERGED":
		state = "MERGED"
	case "ALL":
		state = ""
	default:
		state = "OPEN"
	}

	endpoint := fmt.Sprintf("/repositories/%s/%s/pullrequests?pagelen=100", workspace, repoSlug)
	if state != "" {
		endpoint += "&state=" + state
	}

	items, err := p.getPaginatedResults(ctx, endpoint)
	if err != nil {
		return nil, fmt.Errorf("listing pull requests for %s: %w", repo, err)
	}

	result := make([]janitor.PR, 0, len(items))
	for _, raw := range items {
		var bbPR bbPullRequest
		if err := json.Unmarshal(raw, &bbPR); err != nil {
			p.logger.LogAttrs(ctx, slog.LevelWarn, "skipping unparseable PR",
				slog.String("error", err.Error()))
			continue
		}
		result = append(result, *bbPRToJanitor(&bbPR))
	}

	return result, nil
}

// MergePullRequest merges a pull request.
// Returns domain.ErrConflict on 409 (merge conflict or already merged).
//
// Uses: POST /2.0/repositories/{workspace}/{slug}/pullrequests/{id}/merge
func (p *BitbucketProvider) MergePullRequest(ctx context.Context, repo string, prNumber int) error {
	workspace, repoSlug := splitRepo(repo)

	endpoint := fmt.Sprintf("/repositories/%s/%s/pullrequests/%d/merge", workspace, repoSlug, prNumber)
	req, err := p.newRequest(ctx, http.MethodPost, endpoint, nil)
	if err != nil {
		return fmt.Errorf("creating merge request: %w", err)
	}

	if err := p.doRequest(req, nil); err != nil {
		return fmt.Errorf("merging pull request #%d in %s: %w", prNumber, repo, err)
	}

	return nil
}

// ─── Comment operations ────────────────────────────────────────────────────

// AddPullRequestComment adds a comment to a pull request.
//
// Uses: POST /2.0/repositories/{workspace}/{slug}/pullrequests/{id}/comments
// Body: {"content": {"raw": "comment text"}}
func (p *BitbucketProvider) AddPullRequestComment(ctx context.Context, repo string, prNumber int, body string) error {
	workspace, repoSlug := splitRepo(repo)

	commentBody := map[string]interface{}{
		"content": map[string]string{
			"raw": body,
		},
	}

	bodyBytes, err := json.Marshal(commentBody)
	if err != nil {
		return fmt.Errorf("marshalling comment: %w", err)
	}

	endpoint := fmt.Sprintf("/repositories/%s/%s/pullrequests/%d/comments", workspace, repoSlug, prNumber)
	req, err := p.newRequest(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("creating comment request: %w", err)
	}

	if err := p.doRequest(req, nil); err != nil {
		return fmt.Errorf("adding comment to pull request #%d in %s: %w", prNumber, repo, err)
	}

	return nil
}

// ─── Webhook operations ────────────────────────────────────────────────────

// CreateWebhook creates a webhook on a Bitbucket repository.
// Returns the webhook UUID as a string.
//
// Uses: POST /2.0/repositories/{workspace}/{slug}/hooks
// Body: {"description": "AI Janitor", "url": "...", "active": true, "events": [...]}
func (p *BitbucketProvider) CreateWebhook(ctx context.Context, repo, urlStr, secret string, events []string) (string, error) {
	workspace, repoSlug := splitRepo(repo)

	webhookBody := map[string]interface{}{
		"description": "AI Janitor",
		"url":         urlStr,
		"active":      true,
		"events":      events,
	}

	bodyBytes, err := json.Marshal(webhookBody)
	if err != nil {
		return "", fmt.Errorf("marshalling webhook: %w", err)
	}

	endpoint := fmt.Sprintf("/repositories/%s/%s/hooks", workspace, repoSlug)
	req, err := p.newRequest(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return "", fmt.Errorf("creating webhook request: %w", err)
	}

	var hook bbWebhook
	if err := p.doRequest(req, &hook); err != nil {
		return "", fmt.Errorf("creating webhook on %s: %w", repo, err)
	}

	if hook.UUID == "" {
		return "", fmt.Errorf("webhook created with no UUID")
	}

	return hook.UUID, nil
}

// DeleteWebhook deletes a webhook from a Bitbucket repository.
//
// Uses: DELETE /2.0/repositories/{workspace}/{slug}/hooks/{hook_id}
func (p *BitbucketProvider) DeleteWebhook(ctx context.Context, repo, webhookID string) error {
	workspace, repoSlug := splitRepo(repo)

	endpoint := fmt.Sprintf("/repositories/%s/%s/hooks/%s", workspace, repoSlug, webhookID)
	req, err := p.newRequest(ctx, http.MethodDelete, endpoint, nil)
	if err != nil {
		return fmt.Errorf("creating delete webhook request: %w", err)
	}

	if err := p.doRequest(req, nil); err != nil {
		return fmt.Errorf("deleting webhook %s from %s: %w", webhookID, repo, err)
	}

	return nil
}

// ─── Authentication ────────────────────────────────────────────────────────

// ValidateToken validates the current token by fetching the authenticated user.
//
// Uses: GET /2.0/user
func (p *BitbucketProvider) ValidateToken(ctx context.Context) error {
	req, err := p.newRequest(ctx, http.MethodGet, "/user", nil)
	if err != nil {
		return fmt.Errorf("creating validate request: %w", err)
	}

	var user bbUser
	if err := p.doRequest(req, &user); err != nil {
		return fmt.Errorf("validating bitbucket token: %w", err)
	}

	if user.UUID == "" {
		return fmt.Errorf("%w: bitbucket returned empty user", domain.ErrValidation)
	}

	p.logger.LogAttrs(ctx, slog.LevelDebug, "bitbucket token validated",
		slog.String("user", user.DisplayName),
	)

	return nil
}

// RefreshToken is a no-op for Bitbucket App Passwords since they don't expire.
// OAuth 2.0 tokens would need a separate refresh flow managed externally.
func (p *BitbucketProvider) RefreshToken(ctx context.Context) error {
	p.logger.LogAttrs(ctx, slog.LevelWarn, "bitbucket token refresh is a no-op for app passwords; use OAuth refresh flow for user tokens")
	return nil
}

// ─── File operations ───────────────────────────────────────────────────────

// CommitFiles creates commits for the given file changes on the specified branch.
// If the branch does not exist, it is created from the repository's default
// branch before committing.
//
// Uses: POST /2.0/repositories/{workspace}/{repo_slug}/src
func (p *BitbucketProvider) CommitFiles(ctx context.Context, repo, branch, message string, changes []janitor.FileChange) error {
	workspace, repoSlug := splitRepo(repo)

	if len(changes) == 0 {
		return nil
	}

	// Check if branch exists; if not, create it from the default branch.
	exists, err := p.branchExistsInternal(ctx, workspace, repoSlug, branch)
	if err != nil {
		return fmt.Errorf("checking if branch exists: %w", err)
	}

	if !exists {
		baseBranch := "main"
		repoInfo, err := p.getRepositoryInfo(ctx, workspace, repoSlug)
		if err == nil && repoInfo.MainBranch.Name != "" {
			baseBranch = repoInfo.MainBranch.Name
		}
		if err := p.createBranchInternal(ctx, workspace, repoSlug, branch, baseBranch); err != nil {
			return fmt.Errorf("creating branch %s: %w", branch, err)
		}
	}

	// Bitbucket's POST /2.0/repositories/{workspace}/{repo_slug}/src endpoint
	// accepts multipart form data with branch, message, and file contents.
	var buf bytes.Buffer
	w := multipart.NewWriter(&buf)

	// Add branch field.
	if err := w.WriteField("branch", branch); err != nil {
		return fmt.Errorf("writing branch field: %w", err)
	}

	// Add message field.
	if err := w.WriteField("message", message); err != nil {
		return fmt.Errorf("writing message field: %w", err)
	}

	// Add each file as a form file.
	for _, change := range changes {
		part, err := w.CreateFormFile(change.Path, change.Path)
		if err != nil {
			return fmt.Errorf("creating form file for %s: %w", change.Path, err)
		}
		if _, err := part.Write(change.Content); err != nil {
			return fmt.Errorf("writing content for %s: %w", change.Path, err)
		}
	}

	if err := w.Close(); err != nil {
		return fmt.Errorf("closing multipart writer: %w", err)
	}

	endpoint := fmt.Sprintf("/repositories/%s/%s/src", workspace, repoSlug)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, p.baseURL+endpoint, &buf)
	if err != nil {
		return fmt.Errorf("creating commit request: %w", err)
	}

	p.setAuthHeaders(req)
	req.Header.Set("User-Agent", userAgent)
	req.Header.Set("Content-Type", w.FormDataContentType())
	req.Header.Set("Accept", "application/json")

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return fmt.Errorf("bitbucket commit request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return fmt.Errorf("reading commit response: %w", err)
	}

	if resp.StatusCode >= 400 {
		return p.mapHTTPError(resp.StatusCode, body)
	}

	p.logger.LogAttrs(ctx, slog.LevelDebug, "committed files to branch",
		slog.String("repo", repo),
		slog.String("branch", branch),
		slog.Int("file_count", len(changes)),
	)

	return nil
}

// ─── Internal helpers (shared between public methods and CommitFiles) ──────

// branchExistsInternal checks if a branch exists without going through the
// public BranchExists method (which returns ErrNotImplemented for MVP).
func (p *BitbucketProvider) branchExistsInternal(ctx context.Context, workspace, repoSlug, branch string) (bool, error) {
	endpoint := fmt.Sprintf("/repositories/%s/%s/refs/branches/%s", workspace, repoSlug, branch)
	req, err := p.newRequest(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return false, fmt.Errorf("checking branch request: %w", err)
	}

	resp, err := p.httpClient.Do(req)
	if err != nil {
		return false, fmt.Errorf("checking branch %s: %w", branch, err)
	}
	defer resp.Body.Close()

	if resp.StatusCode == http.StatusNotFound {
		return false, nil
	}

	if resp.StatusCode >= 400 {
		body, _ := io.ReadAll(resp.Body)
		return false, p.mapHTTPError(resp.StatusCode, body)
	}

	return true, nil
}

// createBranchInternal creates a branch without going through the public
// CreateBranch (which has different semantics with ctx-based logging).
func (p *BitbucketProvider) createBranchInternal(ctx context.Context, workspace, repoSlug, branch, baseBranch string) error {
	commitSHA, err := p.getBranchCommitSHA(ctx, workspace, repoSlug, baseBranch)
	if err != nil {
		return fmt.Errorf("getting base branch %s commit: %w", baseBranch, err)
	}

	body := map[string]interface{}{
		"name": branch,
		"target": map[string]string{
			"hash": commitSHA,
		},
	}

	bodyBytes, err := json.Marshal(body)
	if err != nil {
		return fmt.Errorf("marshalling branch request: %w", err)
	}

	endpoint := fmt.Sprintf("/repositories/%s/%s/refs/branches", workspace, repoSlug)
	req, err := p.newRequest(ctx, http.MethodPost, endpoint, bytes.NewReader(bodyBytes))
	if err != nil {
		return fmt.Errorf("creating branch request: %w", err)
	}

	if err := p.doRequest(req, nil); err != nil {
		return fmt.Errorf("creating branch %s: %w", branch, err)
	}

	return nil
}

// getRepositoryInfo fetches basic repository metadata.
func (p *BitbucketProvider) getRepositoryInfo(ctx context.Context, workspace, repoSlug string) (*bbRepository, error) {
	endpoint := fmt.Sprintf("/repositories/%s/%s", workspace, repoSlug)
	req, err := p.newRequest(ctx, http.MethodGet, endpoint, nil)
	if err != nil {
		return nil, err
	}

	var repo bbRepository
	if err := p.doRequest(req, &repo); err != nil {
		return nil, fmt.Errorf("getting repository info: %w", err)
	}

	return &repo, nil
}

// ─── Conversion helpers ─────────────────────────────────────────────────────

// bbRepoToJanitor converts a Bitbucket API repository to a janitor.Repository.
func bbRepoToJanitor(r bbRepository) janitor.Repository {
	jr := janitor.Repository{
		ID:       r.UUID,
		Name:     r.Name,
		FullName: r.FullName,
		Private:  r.IsPrivate,
		Language: r.Language,
	}

	if r.MainBranch.Name != "" {
		jr.DefaultBranch = r.MainBranch.Name
	} else {
		jr.DefaultBranch = "main"
	}

	for _, clone := range r.Links.Clone {
		if clone.Name == "https" {
			jr.CloneURL = clone.Href
		}
	}

	jr.HTMLURL = r.Links.HTML.Href

	return jr
}

// bbPRToJanitor converts a Bitbucket API pull request to a janitor.PR.
func bbPRToJanitor(pr *bbPullRequest) *janitor.PR {
	jpr := &janitor.PR{
		Number: pr.ID,
		URL:    pr.Links.HTML.Href,
		Title:  pr.Title,
		Body:   pr.Description,
		State:  pr.State,
	}

	jpr.Branch = pr.Source.Branch.Name
	jpr.BaseBranch = pr.Destination.Branch.Name
	jpr.HeadSHA = pr.Source.Commit.Hash

	if !pr.CreatedOn.IsZero() {
		jpr.CreatedAt = pr.CreatedOn
	}
	if !pr.UpdatedOn.IsZero() {
		jpr.UpdatedAt = pr.UpdatedOn
	}

	return jpr
}