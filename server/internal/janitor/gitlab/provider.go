// Package gitlab implements the GitProvider interface for GitLab.
// It uses the GitLab REST API v4 with raw HTTP client and PRIVATE-TOKEN auth.
package gitlab

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/janitor"
)

// ─── Compile-time interface check ──────────────────────────────────────────

var _ janitor.GitProvider = (*GitLabProvider)(nil)

// ErrNotImplemented is returned for methods that are not yet implemented
// for the GitLab provider (MVP subset).
var ErrNotImplemented = errors.New("not implemented")

// ─── Provider metadata ─────────────────────────────────────────────────────

// GitLabProvider implements janitor.GitProvider for GitLab.
type GitLabProvider struct {
	client  *http.Client
	logger  *slog.Logger
	config  janitor.GitProviderConfig
	baseURL string
}

// NewGitLabProvider creates a new GitLabProvider using the given config.
// It sets up a raw HTTP client with PRIVATE-TOKEN auth and validates the
// connection by calling GET /user.
func NewGitLabProvider(config janitor.GitProviderConfig) (janitor.GitProvider, error) {
	if config.Token == "" {
		return nil, fmt.Errorf("%w: gitlab token is required", domain.ErrValidation)
	}

	baseURL := "https://gitlab.com/api/v4"
	if config.BaseURL != "" {
		baseURL = strings.TrimRight(config.BaseURL, "/") + "/api/v4"
	}

	logger := slog.Default().With("provider", "gitlab")

	provider := &GitLabProvider{
		client:  &http.Client{},
		logger:  logger,
		config:  config,
		baseURL: baseURL,
	}

	// Validate the token by fetching the authenticated user.
	if err := provider.ValidateToken(context.Background()); err != nil {
		return nil, fmt.Errorf("gitlab token validation failed: %w", err)
	}

	return provider, nil
}

// Name returns the provider name.
func (p *GitLabProvider) Name() string {
	return "gitlab"
}

// Scopes returns the required OAuth scopes for GitLab.
func (p *GitLabProvider) Scopes() []string {
	return []string{"api", "read_repository", "write_repository"}
}

// ─── HTTP helpers ──────────────────────────────────────────────────────────

// doGet performs an authenticated GET request and returns the body bytes,
// HTTP status code, and any error.
func (p *GitLabProvider) doGet(ctx context.Context, path string) ([]byte, int, error) {
	u := p.baseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, u, nil)
	if err != nil {
		return nil, 0, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("PRIVATE-TOKEN", p.config.Token)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("gitlab api request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("reading response body: %w", err)
	}

	return body, resp.StatusCode, nil
}

// doPost performs an authenticated POST request with an optional JSON body
// and returns the body bytes, HTTP status code, and any error.
func (p *GitLabProvider) doPost(ctx context.Context, path string, body interface{}) ([]byte, int, error) {
	u := p.baseURL + path
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, 0, fmt.Errorf("marshalling request body: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, u, reqBody)
	if err != nil {
		return nil, 0, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("PRIVATE-TOKEN", p.config.Token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("gitlab api request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("reading response body: %w", err)
	}

	return respBody, resp.StatusCode, nil
}

// doPut performs an authenticated PUT request with an optional JSON body
// and returns the body bytes, HTTP status code, and any error.
func (p *GitLabProvider) doPut(ctx context.Context, path string, body interface{}) ([]byte, int, error) {
	u := p.baseURL + path
	var reqBody io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return nil, 0, fmt.Errorf("marshalling request body: %w", err)
		}
		reqBody = bytes.NewReader(b)
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPut, u, reqBody)
	if err != nil {
		return nil, 0, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("PRIVATE-TOKEN", p.config.Token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("gitlab api request: %w", err)
	}
	defer resp.Body.Close()

	respBody, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("reading response body: %w", err)
	}

	return respBody, resp.StatusCode, nil
}

// doDelete performs an authenticated DELETE request and returns the body bytes,
// HTTP status code, and any error.
func (p *GitLabProvider) doDelete(ctx context.Context, path string) ([]byte, int, error) {
	u := p.baseURL + path
	req, err := http.NewRequestWithContext(ctx, http.MethodDelete, u, nil)
	if err != nil {
		return nil, 0, fmt.Errorf("creating request: %w", err)
	}
	req.Header.Set("PRIVATE-TOKEN", p.config.Token)

	resp, err := p.client.Do(req)
	if err != nil {
		return nil, 0, fmt.Errorf("gitlab api request: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, resp.StatusCode, fmt.Errorf("reading response body: %w", err)
	}

	return body, resp.StatusCode, nil
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// repoPath converts a repo identifier (numeric ID or "group/project" path)
// into a URL-safe project path for the GitLab API.
// Numeric IDs are returned as-is; paths have "/" replaced with "%2F".
func repoPath(repo string) string {
	if _, err := strconv.Atoi(repo); err == nil {
		return repo
	}
	// GitLab API requires URL-encoded project paths in the URL.
	// "namespace/project" becomes "namespace%2Fproject".
	return url.PathEscape(repo)
}

// encodeFilePath encodes a file path for GitLab's repository files API.
// GitLab API v4 requires the file path to be URL-encoded in the URL.
// For example, "src/main.go" becomes "src%2Fmain.go".
func encodeFilePath(path string) string {
	return url.PathEscape(path)
}

// gitLabError represents a GitLab API error response.
type gitLabError struct {
	Message json.RawMessage `json:"message"`
	Error   string          `json:"error"`
}

// gitLabProject represents a GitLab project (repository) API response.
type gitLabProject struct {
	ID                int    `json:"id"`
	Name              string `json:"name"`
	PathWithNamespace string `json:"path_with_namespace"`
	HTTPURLToRepo     string `json:"http_url_to_repo"`
	WebURL            string `json:"web_url"`
	DefaultBranch     string `json:"default_branch"`
	Visibility        string `json:"visibility"`
}

// gitLabMergeRequest represents a GitLab merge request API response.
type gitLabMergeRequest struct {
	IID          int    `json:"iid"`
	Title        string `json:"title"`
	Description  string `json:"description"`
	State        string `json:"state"`
	WebURL       string `json:"web_url"`
	SourceBranch string `json:"source_branch"`
	TargetBranch string `json:"target_branch"`
	CreatedAt    string `json:"created_at"`
	UpdatedAt    string `json:"updated_at"`
	SHA          string `json:"sha"`
}

// gitLabCommit represents a GitLab commit API response (minimal subset).
type gitLabCommit struct {
	ID      string `json:"id"`
	Message string `json:"message"`
}

// getProject fetches a single GitLab project by its identifier.
func (p *GitLabProvider) getProject(ctx context.Context, projectPath string) (*gitLabProject, error) {
	body, status, err := p.doGet(ctx, "/projects/"+projectPath)
	if err != nil {
		return nil, fmt.Errorf("getting project %s: %w", projectPath, err)
	}
	if status != http.StatusOK {
		return nil, mapError(status, "project "+projectPath)
	}

	var proj gitLabProject
	if err := json.Unmarshal(body, &proj); err != nil {
		return nil, fmt.Errorf("decoding project: %w", err)
	}
	return &proj, nil
}

// getDefaultBranch fetches the default branch name for the given project.
// Falls back to "main" if the project cannot be retrieved or has no default.
func (p *GitLabProvider) getDefaultBranch(ctx context.Context, projectPath string) string {
	targetBranch := "main"
	proj, err := p.getProject(ctx, projectPath)
	if err == nil && proj.DefaultBranch != "" {
		targetBranch = proj.DefaultBranch
	}
	return targetBranch
}

// mapError maps HTTP status codes to domain errors with context.
func mapError(statusCode int, noun string) error {
	switch statusCode {
	case http.StatusNotFound:
		return fmt.Errorf("%s %w", noun, domain.ErrNotFound)
	case http.StatusConflict:
		return fmt.Errorf("%s %w", noun, domain.ErrConflict)
	case http.StatusUnauthorized, http.StatusForbidden:
		return domain.NewValidationError("token", "invalid or insufficient permissions")
	default:
		if statusCode >= 400 {
			return fmt.Errorf("%s: unexpected status %d", noun, statusCode)
		}
		return nil
	}
}

// mrToPR converts a gitLabMergeRequest to a janitor.PR.
func mrToPR(mr *gitLabMergeRequest) *janitor.PR {
	pr := &janitor.PR{
		Number:     mr.IID,
		URL:        mr.WebURL,
		Title:      mr.Title,
		Body:       mr.Description,
		State:      mr.State,
		Branch:     mr.SourceBranch,
		BaseBranch: mr.TargetBranch,
		HeadSHA:    mr.SHA,
	}

	if mr.CreatedAt != "" {
		pr.CreatedAt, _ = time.Parse(time.RFC3339, mr.CreatedAt)
	}
	if mr.UpdatedAt != "" {
		pr.UpdatedAt, _ = time.Parse(time.RFC3339, mr.UpdatedAt)
	}

	return pr
}

// ─── Repository operations ─────────────────────────────────────────────────

// FetchRepository downloads the repository as a tar.gz archive.
func (p *GitLabProvider) FetchRepository(ctx context.Context, repo, branch string) ([]byte, error) {
	projectPath := repoPath(repo)
	u := fmt.Sprintf("/projects/%s/repository/archive.tar.gz?sha=%s", projectPath, url.QueryEscape(branch))

	body, status, err := p.doGet(ctx, u)
	if err != nil {
		return nil, fmt.Errorf("fetching repository %s: %w", repo, err)
	}
	if status != http.StatusOK {
		return nil, mapError(status, fmt.Sprintf("fetching repository %s", repo))
	}

	return body, nil
}

// ListRepositories lists all repositories accessible to the authenticated user.
// If an org/group is configured in the provider config, only projects in that
// group scope are included.
func (p *GitLabProvider) ListRepositories(ctx context.Context) ([]janitor.Repository, error) {
	var result []janitor.Repository
	page := 1

	for {
		u := fmt.Sprintf("/projects?membership=true&per_page=100&page=%d", page)
		if p.config.OrgOrGroup != "" {
			u += "&owned=true"
		}

		body, status, err := p.doGet(ctx, u)
		if err != nil {
			return nil, fmt.Errorf("listing repositories: %w", err)
		}
		if status != http.StatusOK {
			return nil, mapError(status, "listing repositories")
		}

		var repos []gitLabProject
		if err := json.Unmarshal(body, &repos); err != nil {
			return nil, fmt.Errorf("decoding repositories: %w", err)
		}

		if len(repos) == 0 {
			break
		}

		for _, r := range repos {
			result = append(result, janitor.Repository{
				ID:            strconv.Itoa(r.ID),
				Name:          r.Name,
				FullName:      r.PathWithNamespace,
				CloneURL:      r.HTTPURLToRepo,
				HTMLURL:       r.WebURL,
				DefaultBranch: r.DefaultBranch,
				Private:       r.Visibility == "private",
			})
		}
		page++
	}

	return result, nil
}

// GetFileContents retrieves the raw contents of a file at the given path
// and branch using the GitLab repository files API.
func (p *GitLabProvider) GetFileContents(ctx context.Context, repo, path, branch string) ([]byte, error) {
	projectPath := repoPath(repo)
	encodedPath := encodeFilePath(path)
	u := fmt.Sprintf("/projects/%s/repository/files/%s/raw?ref=%s",
		projectPath, encodedPath, url.QueryEscape(branch))

	body, status, err := p.doGet(ctx, u)
	if err != nil {
		return nil, fmt.Errorf("getting file contents %s/%s: %w", repo, path, err)
	}
	if status != http.StatusOK {
		return nil, mapError(status, fmt.Sprintf("file %s in %s", path, repo))
	}

	return body, nil
}

// ListFiles recursively lists all files in the given path and branch.
func (p *GitLabProvider) ListFiles(ctx context.Context, repo, path, branch string) ([]string, error) {
	projectPath := repoPath(repo)
	u := fmt.Sprintf("/projects/%s/repository/tree?recursive=true&per_page=100", projectPath)
	if branch != "" {
		u += "&ref=" + url.QueryEscape(branch)
	}

	body, status, err := p.doGet(ctx, u)
	if err != nil {
		return nil, fmt.Errorf("listing files in %s/%s: %w", repo, path, err)
	}
	if status != http.StatusOK {
		return nil, mapError(status, "listing files in "+repo)
	}

	var entries []struct {
		ID   string `json:"id"`
		Name string `json:"name"`
		Type string `json:"type"`
		Path string `json:"path"`
	}
	if err := json.Unmarshal(body, &entries); err != nil {
		return nil, fmt.Errorf("decoding tree entries: %w", err)
	}

	prefix := strings.TrimSuffix(path, "/")
	if prefix != "" {
		prefix += "/"
	}

	var files []string
	for _, entry := range entries {
		if entry.Type != "blob" {
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

// CreateBranch creates a new branch from the given base branch.
func (p *GitLabProvider) CreateBranch(ctx context.Context, repo, branch, baseBranch string) error {
	projectPath := repoPath(repo)

	branchBody := map[string]string{
		"branch": branch,
		"ref":    baseBranch,
	}

	respBody, status, err := p.doPost(ctx, "/projects/"+projectPath+"/repository/branches", branchBody)
	if err != nil {
		return fmt.Errorf("creating branch %s in %s: %w", branch, repo, err)
	}
	if status != http.StatusCreated {
		if status == http.StatusConflict {
			return fmt.Errorf("branch %s in %s: %w", branch, repo, domain.ErrConflict)
		}
		var glErr gitLabError
		if json.Unmarshal(respBody, &glErr) == nil && len(glErr.Message) > 0 {
			return fmt.Errorf("creating branch %s in %s: %s", branch, repo, string(glErr.Message))
		}
		return mapError(status, fmt.Sprintf("creating branch %s in %s", branch, repo))
	}

	return nil
}

// DeleteBranch deletes the specified branch from the repository.
func (p *GitLabProvider) DeleteBranch(ctx context.Context, repo, branch string) error {
	projectPath := repoPath(repo)
	u := fmt.Sprintf("/projects/%s/repository/branches/%s", projectPath, url.PathEscape(branch))

	_, status, err := p.doDelete(ctx, u)
	if err != nil {
		return fmt.Errorf("deleting branch %s in %s: %w", branch, repo, err)
	}
	if status != http.StatusNoContent {
		return mapError(status, fmt.Sprintf("deleting branch %s in %s", branch, repo))
	}

	p.logger.LogAttrs(ctx, slog.LevelDebug, "deleted branch",
		slog.String("repo", repo),
		slog.String("branch", branch),
	)

	return nil
}

// BranchExists checks whether the specified branch exists in the repository.
// Returns (true, nil) if the branch exists, (false, nil) on 404, or (false, err)
// on other errors.
func (p *GitLabProvider) BranchExists(ctx context.Context, repo, branch string) (bool, error) {
	projectPath := repoPath(repo)
	u := fmt.Sprintf("/projects/%s/repository/branches/%s", projectPath, url.PathEscape(branch))

	_, status, err := p.doGet(ctx, u)
	if err != nil {
		return false, fmt.Errorf("checking branch %s in %s: %w", branch, repo, err)
	}

	switch status {
	case http.StatusOK:
		return true, nil
	case http.StatusNotFound:
		return false, nil
	default:
		return false, mapError(status, fmt.Sprintf("checking branch %s in %s", branch, repo))
	}
}

// ─── Merge request operations ──────────────────────────────────────────────

// CreatePullRequest commits the given file changes on the branch, then creates
// a merge request from that branch into the default branch.
func (p *GitLabProvider) CreatePullRequest(ctx context.Context, repo, branch, title, body string, changes []janitor.FileChange) (*janitor.PR, error) {
	// First, commit the files to the branch.
	if err := p.CommitFiles(ctx, repo, branch, title, changes); err != nil {
		return nil, fmt.Errorf("committing files for MR: %w", err)
	}

	projectPath := repoPath(repo)

	// Get the default branch to use as the target.
	targetBranch := p.getDefaultBranch(ctx, projectPath)

	mrBody := map[string]string{
		"source_branch": branch,
		"target_branch": targetBranch,
		"title":         title,
		"description":   body,
	}

	respBody, status, err := p.doPost(ctx, "/projects/"+projectPath+"/merge_requests", mrBody)
	if err != nil {
		return nil, fmt.Errorf("creating merge request in %s: %w", repo, err)
	}
	if status != http.StatusCreated {
		var glErr gitLabError
		if json.Unmarshal(respBody, &glErr) == nil && len(glErr.Message) > 0 {
			return nil, fmt.Errorf("creating merge request in %s: %s", repo, string(glErr.Message))
		}
		return nil, mapError(status, fmt.Sprintf("creating merge request in %s", repo))
	}

	var mr gitLabMergeRequest
	if err := json.Unmarshal(respBody, &mr); err != nil {
		return nil, fmt.Errorf("decoding merge request response: %w", err)
	}

	return mrToPR(&mr), nil
}

// UpdatePullRequest updates the merge request with new file changes by committing
// them to the source branch.
func (p *GitLabProvider) UpdatePullRequest(ctx context.Context, repo string, prNumber int, changes []janitor.FileChange) error {
	projectPath := repoPath(repo)

	// Get the MR details to find its source branch.
	mrURL := fmt.Sprintf("/projects/%s/merge_requests/%d", projectPath, prNumber)
	body, status, err := p.doGet(ctx, mrURL)
	if err != nil {
		return fmt.Errorf("getting merge request #%d in %s: %w", prNumber, repo, err)
	}
	if status != http.StatusOK {
		return mapError(status, fmt.Sprintf("merge request #%d in %s", prNumber, repo))
	}

	var mr gitLabMergeRequest
	if err := json.Unmarshal(body, &mr); err != nil {
		return fmt.Errorf("decoding merge request #%d: %w", prNumber, err)
	}

	// Commit changes to the source branch.
	if err := p.CommitFiles(ctx, repo, mr.SourceBranch, "Update pull request with changes", changes); err != nil {
		return fmt.Errorf("committing files to branch %s in %s: %w", mr.SourceBranch, repo, err)
	}

	return nil
}

// GetPullRequest retrieves a merge request by its IID (project-scoped number).
func (p *GitLabProvider) GetPullRequest(ctx context.Context, repo string, prNumber int) (*janitor.PR, error) {
	projectPath := repoPath(repo)
	u := fmt.Sprintf("/projects/%s/merge_requests/%d", projectPath, prNumber)

	body, status, err := p.doGet(ctx, u)
	if err != nil {
		return nil, fmt.Errorf("getting merge request #%d in %s: %w", prNumber, repo, err)
	}
	if status != http.StatusOK {
		return nil, mapError(status, fmt.Sprintf("merge request #%d in %s", prNumber, repo))
	}

	var mr gitLabMergeRequest
	if err := json.Unmarshal(body, &mr); err != nil {
		return nil, fmt.Errorf("decoding merge request response: %w", err)
	}

	return mrToPR(&mr), nil
}

// ListPullRequests lists merge requests filtered by state ("opened", "closed",
// "merged", or "all").
func (p *GitLabProvider) ListPullRequests(ctx context.Context, repo, state string) ([]janitor.PR, error) {
	projectPath := repoPath(repo)
	u := "/projects/" + projectPath + "/merge_requests"
	if state != "" {
		u += "?state=" + url.QueryEscape(state)
	}

	body, status, err := p.doGet(ctx, u)
	if err != nil {
		return nil, fmt.Errorf("listing merge requests for %s: %w", repo, err)
	}
	if status != http.StatusOK {
		return nil, mapError(status, "listing merge requests for "+repo)
	}

	var mrs []gitLabMergeRequest
	if err := json.Unmarshal(body, &mrs); err != nil {
		return nil, fmt.Errorf("decoding merge requests: %w", err)
	}

	result := make([]janitor.PR, 0, len(mrs))
	for _, mr := range mrs {
		result = append(result, *mrToPR(&mr))
	}

	return result, nil
}

// MergePullRequest merges the specified merge request.
// Returns domain.ErrConflict if the merge cannot be completed due to conflicts.
func (p *GitLabProvider) MergePullRequest(ctx context.Context, repo string, prNumber int) error {
	projectPath := repoPath(repo)
	u := fmt.Sprintf("/projects/%s/merge_requests/%d/merge", projectPath, prNumber)

	respBody, status, err := p.doPut(ctx, u, map[string]interface{}{})
	if err != nil {
		return fmt.Errorf("merging merge request #%d in %s: %w", prNumber, repo, err)
	}

	if status == http.StatusConflict || status == http.StatusNotAcceptable {
		return fmt.Errorf("merge request #%d in %s: %w", prNumber, repo, domain.ErrConflict)
	}

	if status != http.StatusOK {
		var glErr gitLabError
		if json.Unmarshal(respBody, &glErr) == nil && len(glErr.Message) > 0 {
			return fmt.Errorf("merging merge request #%d in %s: %s", prNumber, repo, string(glErr.Message))
		}
		return mapError(status, fmt.Sprintf("merging merge request #%d in %s", prNumber, repo))
	}

	return nil
}

// ─── Comment operations ────────────────────────────────────────────────────

// AddPullRequestComment adds a comment to the specified merge request.
func (p *GitLabProvider) AddPullRequestComment(ctx context.Context, repo string, prNumber int, body string) error {
	projectPath := repoPath(repo)
	u := fmt.Sprintf("/projects/%s/merge_requests/%d/notes", projectPath, prNumber)

	commentBody := map[string]string{"body": body}

	_, status, err := p.doPost(ctx, u, commentBody)
	if err != nil {
		return fmt.Errorf("adding comment to merge request #%d in %s: %w", prNumber, repo, err)
	}
	if status != http.StatusCreated {
		return mapError(status, fmt.Sprintf("adding comment to merge request #%d in %s", prNumber, repo))
	}

	return nil
}

// ─── Webhook operations ────────────────────────────────────────────────────

// CreateWebhook creates a webhook on the repository with the given URL, secret,
// and event types. Returns the hook ID as a string.
func (p *GitLabProvider) CreateWebhook(ctx context.Context, repo, urlStr, secret string, events []string) (string, error) {
	projectPath := repoPath(repo)

	hookBody := map[string]interface{}{
		"url":                     urlStr,
		"token":                   secret,
		"enable_ssl_verification": true,
	}
	for _, event := range events {
		hookBody[event] = true
	}

	respBody, status, err := p.doPost(ctx, "/projects/"+projectPath+"/hooks", hookBody)
	if err != nil {
		return "", fmt.Errorf("creating webhook on %s: %w", repo, err)
	}
	if status != http.StatusCreated {
		var glErr gitLabError
		if json.Unmarshal(respBody, &glErr) == nil && len(glErr.Message) > 0 {
			return "", fmt.Errorf("creating webhook on %s: %s", repo, string(glErr.Message))
		}
		return "", mapError(status, fmt.Sprintf("creating webhook on %s", repo))
	}

	var result struct {
		ID int `json:"id"`
	}
	if err := json.Unmarshal(respBody, &result); err != nil {
		return "", fmt.Errorf("decoding webhook response: %w", err)
	}

	p.logger.LogAttrs(ctx, slog.LevelDebug, "created webhook",
		slog.String("repo", repo),
		slog.Int("hook_id", result.ID),
	)

	return strconv.Itoa(result.ID), nil
}

// DeleteWebhook deletes a webhook from the repository by its ID.
func (p *GitLabProvider) DeleteWebhook(ctx context.Context, repo, webhookID string) error {
	projectPath := repoPath(repo)
	u := fmt.Sprintf("/projects/%s/hooks/%s", projectPath, url.PathEscape(webhookID))

	_, status, err := p.doDelete(ctx, u)
	if err != nil {
		return fmt.Errorf("deleting webhook %s from %s: %w", webhookID, repo, err)
	}
	if status != http.StatusNoContent {
		return mapError(status, fmt.Sprintf("deleting webhook %s from %s", webhookID, repo))
	}

	p.logger.LogAttrs(ctx, slog.LevelDebug, "deleted webhook",
		slog.String("repo", repo),
		slog.String("hook_id", webhookID),
	)

	return nil
}

// ─── Authentication ────────────────────────────────────────────────────────

// ValidateToken validates the current token by fetching the authenticated user.
func (p *GitLabProvider) ValidateToken(ctx context.Context) error {
	body, status, err := p.doGet(ctx, "/user")
	if err != nil {
		return fmt.Errorf("validating gitlab token: %w", err)
	}
	if status != http.StatusOK {
		if status == http.StatusUnauthorized {
			return fmt.Errorf("%w: gitlab token is invalid or expired", domain.ErrValidation)
		}
		return mapError(status, "validating gitlab token")
	}

	var user struct {
		ID       int    `json:"id"`
		Username string `json:"username"`
	}
	if err := json.Unmarshal(body, &user); err != nil {
		return fmt.Errorf("decoding user response: %w", err)
	}

	p.logger.LogAttrs(ctx, slog.LevelDebug, "gitlab token validated",
		slog.String("user", user.Username),
	)

	return nil
}

// RefreshToken is a no-op for GitLab personal access tokens.
// GitLab PATs do not support OAuth refresh; the caller must use the OAuth
// refresh token flow for application tokens externally.
func (p *GitLabProvider) RefreshToken(ctx context.Context) error {
	p.logger.LogAttrs(ctx, slog.LevelWarn,
		"gitlab token refresh is a no-op for PATs; use OAuth refresh token flow for app tokens",
	)
	return nil
}

// ─── File operations ───────────────────────────────────────────────────────

// CommitFiles creates a commit with the given file changes on the specified
// branch using GitLab's commits API with multiple actions.
//
// If the branch does not already exist, it is automatically created from the
// project's default branch using the start_branch parameter. This avoids an
// explicit branch existence check.
func (p *GitLabProvider) CommitFiles(ctx context.Context, repo, branch, message string, changes []janitor.FileChange) error {
	if len(changes) == 0 {
		return nil
	}

	projectPath := repoPath(repo)

	// Determine the start branch (default branch) so GitLab can auto-create
	// the branch if it does not already exist.
	startBranch := p.getDefaultBranch(ctx, projectPath)

	actions := make([]map[string]string, 0, len(changes))
	for _, change := range changes {
		action := "create"
		switch change.Mode {
		case "delete":
			action = "delete"
		case "modify":
			action = "update"
		default:
			action = "create"
		}

		commitAction := map[string]string{
			"action":    action,
			"file_path": change.Path,
		}
		if action != "delete" {
			commitAction["content"] = string(change.Content)
		}
		actions = append(actions, commitAction)
	}

	commitBody := map[string]interface{}{
		"branch":         branch,
		"start_branch":   startBranch,
		"commit_message": message,
		"actions":        actions,
	}

	respBody, status, err := p.doPost(ctx, "/projects/"+projectPath+"/repository/commits", commitBody)
	if err != nil {
		return fmt.Errorf("committing files to %s/%s: %w", repo, branch, err)
	}
	if status != http.StatusCreated {
		var glErr gitLabError
		if json.Unmarshal(respBody, &glErr) == nil && len(glErr.Message) > 0 {
			return fmt.Errorf("committing files to %s/%s: %s", repo, branch, string(glErr.Message))
		}
		return mapError(status, fmt.Sprintf("committing files to %s/%s", repo, branch))
	}

	p.logger.LogAttrs(ctx, slog.LevelDebug, "committed files to branch",
		slog.String("repo", repo),
		slog.String("branch", branch),
		slog.Int("file_count", len(changes)),
	)

	return nil
}