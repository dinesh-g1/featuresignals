// Package github implements the GitProvider interface for GitHub.
// It uses go-github v69 and oauth2 for API authentication.
package github

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"net/http"
	"net/url"
	"strconv"
	"strings"

	"github.com/google/go-github/v69/github"
	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/janitor"
	"golang.org/x/oauth2"
)

// ─── Compile-time interface check ──────────────────────────────────────────

var _ janitor.GitProvider = (*GitHubProvider)(nil)

// ─── Provider metadata ─────────────────────────────────────────────────────

// GitHubProvider implements janitor.GitProvider for GitHub.
type GitHubProvider struct {
	client *github.Client
	logger *slog.Logger
	config janitor.GitProviderConfig
}

// NewGitHubProvider creates a new GitHubProvider using the given config.
// It sets up an oauth2 HTTP client with the token, creates a go-github client,
// and validates the connection by calling GET /user.
func NewGitHubProvider(config janitor.GitProviderConfig) (janitor.GitProvider, error) {
	if config.Token == "" {
		return nil, fmt.Errorf("%w: github token is required", domain.ErrValidation)
	}

	logger := slog.Default().With("provider", "github")

	ts := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: config.Token})
	tc := oauth2.NewClient(context.Background(), ts)

	var client *github.Client
	if config.BaseURL != "" {
		baseURL := strings.TrimRight(config.BaseURL, "/") + "/"
		parsedURL, err := url.Parse(baseURL)
		if err != nil {
			return nil, fmt.Errorf("parsing base url: %w", err)
		}
		client = github.NewClient(tc)
		client.BaseURL = parsedURL
	} else {
		client = github.NewClient(tc)
	}

	provider := &GitHubProvider{
		client: client,
		logger: logger,
		config: config,
	}

	// Validate the token by fetching the authenticated user.
	if err := provider.ValidateToken(context.Background()); err != nil {
		return nil, fmt.Errorf("github token validation failed: %w", err)
	}

	return provider, nil
}

// Name returns the provider name.
func (p *GitHubProvider) Name() string {
	return "github"
}

// Scopes returns the required OAuth scopes for GitHub.
func (p *GitHubProvider) Scopes() []string {
	return []string{"repo", "admin:repo_hooks", "user"}
}

// ─── Repository operations ─────────────────────────────────────────────────

// FetchRepository downloads the repository archive (as a zipball) for the
// given repo and branch.
func (p *GitHubProvider) FetchRepository(ctx context.Context, repo, branch string) ([]byte, error) {
	owner, name := splitRepo(repo)

	u := fmt.Sprintf("repos/%v/%v/zipball/%v", owner, name, branch)
	req, err := p.client.NewRequest(http.MethodGet, u, nil)
	if err != nil {
		return nil, fmt.Errorf("creating zipball request: %w", err)
	}

	var buf bytes.Buffer
	if _, err = p.client.Do(ctx, req, &buf); err != nil {
		return nil, fmt.Errorf("downloading repository %s: %w", repo, err)
	}

	return buf.Bytes(), nil
}

// ListRepositories lists all repositories for the authenticated user or the
// configured organization.
func (p *GitHubProvider) ListRepositories(ctx context.Context) ([]janitor.Repository, error) {
	var allRepos []*github.Repository

	opts := &github.RepositoryListByAuthenticatedUserOptions{
		ListOptions: github.ListOptions{PerPage: 100},
	}

	if p.config.OrgOrGroup != "" {
		orgOpts := &github.RepositoryListByOrgOptions{
			ListOptions: github.ListOptions{PerPage: 100},
		}
		for {
			repos, resp, err := p.client.Repositories.ListByOrg(ctx, p.config.OrgOrGroup, orgOpts)
			if err != nil {
				return nil, fmt.Errorf("listing org repos %s: %w", p.config.OrgOrGroup, err)
			}
			allRepos = append(allRepos, repos...)
			if resp.NextPage == 0 {
				break
			}
			orgOpts.Page = resp.NextPage
		}
	} else {
		for {
			repos, resp, err := p.client.Repositories.ListByAuthenticatedUser(ctx, opts)
			if err != nil {
				return nil, fmt.Errorf("listing user repos: %w", err)
			}
			allRepos = append(allRepos, repos...)
			if resp.NextPage == 0 {
				break
			}
			opts.Page = resp.NextPage
		}
	}

	result := make([]janitor.Repository, 0, len(allRepos))
	for _, r := range allRepos {
		result = append(result, ghRepoToJanitor(r))
	}
	return result, nil
}

// GetFileContents retrieves the contents of a file at the given path and branch.
func (p *GitHubProvider) GetFileContents(ctx context.Context, repo, path, branch string) ([]byte, error) {
	owner, name := splitRepo(repo)

	opts := &github.RepositoryContentGetOptions{}
	if branch != "" {
		opts.Ref = branch
	}

	fileContent, dirContent, resp, err := p.client.Repositories.GetContents(ctx, owner, name, path, opts)
	if err != nil {
		if resp != nil && resp.StatusCode == http.StatusNotFound {
			return nil, fmt.Errorf("file %s in %s: %w", path, repo, domain.ErrNotFound)
		}
		return nil, fmt.Errorf("getting file contents %s/%s: %w", repo, path, err)
	}

	if dirContent != nil {
		return nil, fmt.Errorf("path %s is a directory, not a file", path)
	}
	if fileContent == nil {
		return nil, fmt.Errorf("file %s in %s: %w", path, repo, domain.ErrNotFound)
	}

	content, err := fileContent.GetContent()
	if err != nil {
		return nil, fmt.Errorf("decoding file content %s/%s: %w", repo, path, err)
	}

	return []byte(content), nil
}

// ListFiles recursively lists all files in the given path and branch.
func (p *GitHubProvider) ListFiles(ctx context.Context, repo, path, branch string) ([]string, error) {
	owner, name := splitRepo(repo)

	// Determine the branch to use; fall back to default branch if empty.
	if branch == "" {
		r, _, err := p.client.Repositories.Get(ctx, owner, name)
		if err != nil {
			return nil, fmt.Errorf("getting repository %s: %w", repo, err)
		}
		if r.DefaultBranch != nil {
			branch = *r.DefaultBranch
		} else {
			branch = "main"
		}
	}

	// Get the SHA of the branch's HEAD commit.
	ref := "heads/" + branch
	refObj, _, err := p.client.Git.GetRef(ctx, owner, name, ref)
	if err != nil {
		return nil, fmt.Errorf("getting ref %s for %s: %w", ref, repo, err)
	}
	if refObj.Object == nil || refObj.Object.SHA == nil {
		return nil, fmt.Errorf("ref %s has no object SHA", ref)
	}

	commit, _, err := p.client.Git.GetCommit(ctx, owner, name, *refObj.Object.SHA)
	if err != nil {
		return nil, fmt.Errorf("getting commit for %s: %w", repo, err)
	}
	if commit.Tree == nil || commit.Tree.SHA == nil {
		return nil, fmt.Errorf("commit has no tree SHA")
	}

	tree, _, err := p.client.Git.GetTree(ctx, owner, name, *commit.Tree.SHA, true)
	if err != nil {
		return nil, fmt.Errorf("getting tree for %s: %w", repo, err)
	}

	var files []string
	prefix := strings.TrimSuffix(path, "/")
	if prefix != "" {
		prefix += "/"
	}

	for _, entry := range tree.Entries {
		if entry == nil || entry.Type == nil || entry.Path == nil {
			continue
		}
		if *entry.Type != "blob" {
			continue
		}
		if prefix != "" && !strings.HasPrefix(*entry.Path, prefix) {
			continue
		}
		files = append(files, *entry.Path)
	}

	return files, nil
}

// ─── Branch operations ─────────────────────────────────────────────────────

// CreateBranch creates a new branch from the given base branch.
func (p *GitHubProvider) CreateBranch(ctx context.Context, repo, branch, baseBranch string) error {
	owner, name := splitRepo(repo)

	// Get the SHA of the base branch's HEAD ref.
	baseRef := "heads/" + baseBranch
	refObj, _, err := p.client.Git.GetRef(ctx, owner, name, baseRef)
	if err != nil {
		return fmt.Errorf("getting base ref %s for %s: %w", baseRef, repo, err)
	}
	if refObj.Object == nil || refObj.Object.SHA == nil {
		return fmt.Errorf("base ref %s has no SHA", baseRef)
	}

	newRef := "refs/heads/" + branch
	if _, _, err = p.client.Git.CreateRef(ctx, owner, name, &github.Reference{
		Ref:    github.String(newRef),
		Object: &github.GitObject{SHA: refObj.Object.SHA},
	}); err != nil {
		return fmt.Errorf("creating branch %s in %s: %w", branch, repo, err)
	}

	return nil
}

// DeleteBranch deletes the specified branch.
func (p *GitHubProvider) DeleteBranch(ctx context.Context, repo, branch string) error {
	owner, name := splitRepo(repo)

	ref := "heads/" + branch
	if _, err := p.client.Git.DeleteRef(ctx, owner, name, ref); err != nil {
		return fmt.Errorf("deleting branch %s in %s: %w", branch, repo, err)
	}

	return nil
}

// BranchExists checks whether the specified branch exists.
func (p *GitHubProvider) BranchExists(ctx context.Context, repo, branch string) (bool, error) {
	owner, name := splitRepo(repo)

	ref := "heads/" + branch
	if _, resp, err := p.client.Git.GetRef(ctx, owner, name, ref); err != nil {
		if resp != nil && resp.StatusCode == http.StatusNotFound {
			return false, nil
		}
		return false, fmt.Errorf("checking branch %s in %s: %w", branch, repo, err)
	}

	return true, nil
}

// ─── PR operations ─────────────────────────────────────────────────────────

// CreatePullRequest creates a commit with the given file changes on the branch,
// then creates a pull request from that branch into the default branch.
func (p *GitHubProvider) CreatePullRequest(ctx context.Context, repo, branch, title, body string, changes []janitor.FileChange) (*janitor.PR, error) {
	owner, name := splitRepo(repo)

	// First, commit the files to the branch.
	if err := p.CommitFiles(ctx, repo, branch, title, changes); err != nil {
		return nil, fmt.Errorf("committing files for PR: %w", err)
	}

	// Determine the base branch (default branch).
	r, _, err := p.client.Repositories.Get(ctx, owner, name)
	if err != nil {
		return nil, fmt.Errorf("getting repository %s: %w", repo, err)
	}
	baseBranch := "main"
	if r.DefaultBranch != nil {
		baseBranch = *r.DefaultBranch
	}

	pr, _, err := p.client.PullRequests.Create(ctx, owner, name, &github.NewPullRequest{
		Title: github.String(title),
		Head:  github.String(branch),
		Base:  github.String(baseBranch),
		Body:  github.String(body),
	})
	if err != nil {
		return nil, fmt.Errorf("creating pull request in %s: %w", repo, err)
	}

	return ghPRToJanitor(pr), nil
}

// UpdatePullRequest updates the pull request's branch with new file changes.
func (p *GitHubProvider) UpdatePullRequest(ctx context.Context, repo string, prNumber int, changes []janitor.FileChange) error {
	// Get the PR to find its head branch.
	owner, name := splitRepo(repo)
	pr, _, err := p.client.PullRequests.Get(ctx, owner, name, prNumber)
	if err != nil {
		return fmt.Errorf("getting pull request #%d in %s: %w", prNumber, repo, err)
	}
	if pr.Head == nil || pr.Head.Ref == nil {
		return fmt.Errorf("pull request #%d has no head ref", prNumber)
	}

	return p.CommitFiles(ctx, repo, *pr.Head.Ref, "Update pull request with changes", changes)
}

// GetPullRequest retrieves a pull request by number.
func (p *GitHubProvider) GetPullRequest(ctx context.Context, repo string, prNumber int) (*janitor.PR, error) {
	owner, name := splitRepo(repo)

	pr, _, err := p.client.PullRequests.Get(ctx, owner, name, prNumber)
	if err != nil {
		return nil, fmt.Errorf("getting pull request #%d in %s: %w", prNumber, repo, err)
	}

	return ghPRToJanitor(pr), nil
}

// ListPullRequests lists pull requests filtered by state ("open", "closed", "all").
func (p *GitHubProvider) ListPullRequests(ctx context.Context, repo, state string) ([]janitor.PR, error) {
	owner, name := splitRepo(repo)

	if state == "" {
		state = "open"
	}

	opts := &github.PullRequestListOptions{
		State:       state,
		ListOptions: github.ListOptions{PerPage: 100},
	}

	var allPRs []*github.PullRequest
	for {
		prs, resp, err := p.client.PullRequests.List(ctx, owner, name, opts)
		if err != nil {
			return nil, fmt.Errorf("listing pull requests for %s: %w", repo, err)
		}
		allPRs = append(allPRs, prs...)
		if resp.NextPage == 0 {
			break
		}
		opts.Page = resp.NextPage
	}

	result := make([]janitor.PR, 0, len(allPRs))
	for _, pr := range allPRs {
		result = append(result, *ghPRToJanitor(pr))
	}
	return result, nil
}

// MergePullRequest merges the specified pull request.
func (p *GitHubProvider) MergePullRequest(ctx context.Context, repo string, prNumber int) error {
	owner, name := splitRepo(repo)

	result, _, err := p.client.PullRequests.Merge(ctx, owner, name, prNumber, "", nil)
	if err != nil {
		return fmt.Errorf("merging pull request #%d in %s: %w", prNumber, repo, err)
	}
	if result == nil || !result.GetMerged() {
		msg := "pull request was not merged"
		if result != nil && result.Message != nil {
			msg = *result.Message
		}
		return fmt.Errorf("merging pull request #%d in %s: %s", prNumber, repo, msg)
	}

	return nil
}

// ─── Comment operations ────────────────────────────────────────────────────

// AddPullRequestComment adds a comment to the specified pull request.
func (p *GitHubProvider) AddPullRequestComment(ctx context.Context, repo string, prNumber int, body string) error {
	owner, name := splitRepo(repo)

	if _, _, err := p.client.Issues.CreateComment(ctx, owner, name, prNumber, &github.IssueComment{
		Body: github.String(body),
	}); err != nil {
		return fmt.Errorf("adding comment to pull request #%d in %s: %w", prNumber, repo, err)
	}

	return nil
}

// ─── Webhook operations ────────────────────────────────────────────────────

// CreateWebhook creates a webhook on the repository.
// Returns the webhook ID as a string.
func (p *GitHubProvider) CreateWebhook(ctx context.Context, repo, urlStr, secret string, events []string) (string, error) {
	owner, name := splitRepo(repo)

	hook, _, err := p.client.Repositories.CreateHook(ctx, owner, name, &github.Hook{
		Events: events,
		Config: &github.HookConfig{
			URL:         github.String(urlStr),
			ContentType: github.String("json"),
			Secret:      github.String(secret),
		},
		Active: github.Bool(true),
	})
	if err != nil {
		return "", fmt.Errorf("creating webhook on %s: %w", repo, err)
	}
	if hook.ID == nil {
		return "", fmt.Errorf("webhook created with no ID")
	}

	return strconv.FormatInt(*hook.ID, 10), nil
}

// DeleteWebhook deletes a webhook from the repository by ID.
func (p *GitHubProvider) DeleteWebhook(ctx context.Context, repo, webhookID string) error {
	owner, name := splitRepo(repo)

	id, err := strconv.ParseInt(webhookID, 10, 64)
	if err != nil {
		return fmt.Errorf("invalid webhook ID %q: %w", webhookID, err)
	}

	if _, err = p.client.Repositories.DeleteHook(ctx, owner, name, id); err != nil {
		return fmt.Errorf("deleting webhook %d from %s: %w", id, repo, err)
	}

	return nil
}

// ─── Authentication ────────────────────────────────────────────────────────

// ValidateToken validates the current token by fetching the authenticated user.
func (p *GitHubProvider) ValidateToken(ctx context.Context) error {
	user, resp, err := p.client.Users.Get(ctx, "")
	if err != nil {
		if resp != nil && resp.StatusCode == http.StatusUnauthorized {
			return fmt.Errorf("%w: github token is invalid or expired", domain.ErrValidation)
		}
		return fmt.Errorf("validating github token: %w", err)
	}
	if user == nil {
		return fmt.Errorf("%w: github returned empty user", domain.ErrValidation)
	}

	p.logger.LogAttrs(ctx, slog.LevelDebug, "github token validated",
		slog.String("user", user.GetLogin()),
	)

	return nil
}

// RefreshToken refreshes the OAuth token.
// GitHub personal access tokens don't support OAuth refresh; this is a no-op
// for PATs. For OAuth apps, the caller must use the refresh token flow externally.
func (p *GitHubProvider) RefreshToken(ctx context.Context) error {
	p.logger.LogAttrs(ctx, slog.LevelWarn, "github token refresh is a no-op for PATs; use OAuth refresh token flow for app tokens")
	return nil
}

// ─── File operations ───────────────────────────────────────────────────────

// CommitFiles creates commits for the given file changes on the specified branch.
// It creates the branch if it does not already exist.
func (p *GitHubProvider) CommitFiles(ctx context.Context, repo, branch, message string, changes []janitor.FileChange) error {
	owner, name := splitRepo(repo)

	if len(changes) == 0 {
		return nil
	}

	// Ensure the branch exists. If not, create it from the default branch.
	exists, err := p.BranchExists(ctx, repo, branch)
	if err != nil {
		return fmt.Errorf("checking if branch exists: %w", err)
	}

	var baseTreeSHA string
	var parentSHA string

	if exists {
		// Get the current HEAD commit's tree for the branch.
		refObj, _, err := p.client.Git.GetRef(ctx, owner, name, "heads/"+branch)
		if err != nil {
			return fmt.Errorf("getting branch ref heads/%s: %w", branch, err)
		}
		if refObj.Object == nil || refObj.Object.SHA == nil {
			return fmt.Errorf("branch ref has no SHA")
		}
		commit, _, err := p.client.Git.GetCommit(ctx, owner, name, *refObj.Object.SHA)
		if err != nil {
			return fmt.Errorf("getting commit for branch: %w", err)
		}
		if commit.Tree != nil && commit.Tree.SHA != nil {
			baseTreeSHA = *commit.Tree.SHA
		}
		parentSHA = *refObj.Object.SHA
	} else {
		// Create the branch from the default branch.
		r, _, err := p.client.Repositories.Get(ctx, owner, name)
		if err != nil {
			return fmt.Errorf("getting repository: %w", err)
		}
		defaultBranch := "main"
		if r.DefaultBranch != nil {
			defaultBranch = *r.DefaultBranch
		}
		if err := p.CreateBranch(ctx, repo, branch, defaultBranch); err != nil {
			return fmt.Errorf("creating branch %s: %w", branch, err)
		}
		// Get the tree SHA from the new branch's HEAD.
		refObj, _, err := p.client.Git.GetRef(ctx, owner, name, "heads/"+branch)
		if err != nil {
			return fmt.Errorf("getting new branch ref: %w", err)
		}
		if refObj.Object != nil && refObj.Object.SHA != nil {
			commit, _, err := p.client.Git.GetCommit(ctx, owner, name, *refObj.Object.SHA)
			if err == nil && commit.Tree != nil && commit.Tree.SHA != nil {
				baseTreeSHA = *commit.Tree.SHA
			}
		}
	}

	// Create blobs for each file change.
	entries := make([]*github.TreeEntry, 0, len(changes))
	for _, change := range changes {
		blob, _, err := p.client.Git.CreateBlob(ctx, owner, name, &github.Blob{
			Content:  github.String(string(change.Content)),
			Encoding: github.String("utf-8"),
		})
		if err != nil {
			return fmt.Errorf("creating blob for %s: %w", change.Path, err)
		}
		if blob.SHA == nil {
			return fmt.Errorf("blob created with no SHA for %s", change.Path)
		}

		entry := &github.TreeEntry{
			Path: github.String(change.Path),
			Mode: github.String("100644"),
			Type: github.String("blob"),
			SHA:  blob.SHA,
		}

		entries = append(entries, entry)
	}

	// Create the tree.
	newTree, _, err := p.client.Git.CreateTree(ctx, owner, name, baseTreeSHA, entries)
	if err != nil {
		return fmt.Errorf("creating tree: %w", err)
	}
	if newTree.SHA == nil {
		return fmt.Errorf("created tree has no SHA")
	}

	// Create the commit.
	commit := &github.Commit{
		Message: github.String(message),
		Tree:    &github.Tree{SHA: newTree.SHA},
	}
	if parentSHA != "" {
		commit.Parents = []*github.Commit{{SHA: github.String(parentSHA)}}
	}

	newCommit, _, err := p.client.Git.CreateCommit(ctx, owner, name, commit, nil)
	if err != nil {
		return fmt.Errorf("creating commit: %w", err)
	}
	if newCommit.SHA == nil {
		return fmt.Errorf("created commit has no SHA")
	}

	// Update the branch ref to point to the new commit.
	if _, _, err = p.client.Git.UpdateRef(ctx, owner, name, &github.Reference{
		Ref:    github.String("refs/heads/" + branch),
		Object: &github.GitObject{SHA: newCommit.SHA},
	}, false); err != nil {
		return fmt.Errorf("updating ref heads/%s: %w", branch, err)
	}

	p.logger.LogAttrs(ctx, slog.LevelDebug, "committed files to branch",
		slog.String("repo", repo),
		slog.String("branch", branch),
		slog.Int("file_count", len(changes)),
		slog.String("commit_sha", *newCommit.SHA),
	)

	return nil
}

// ─── Helpers ───────────────────────────────────────────────────────────────

// splitRepo splits a "owner/repo" string into owner and name.
func splitRepo(repo string) (string, string) {
	parts := strings.SplitN(repo, "/", 2)
	if len(parts) == 2 {
		return parts[0], parts[1]
	}
	return parts[0], parts[0]
}

// ghRepoToJanitor converts a go-github Repository to a janitor.Repository.
func ghRepoToJanitor(r *github.Repository) janitor.Repository {
	return janitor.Repository{
		ID:            strconv.FormatInt(r.GetID(), 10),
		Name:          r.GetName(),
		FullName:      r.GetFullName(),
		CloneURL:      r.GetCloneURL(),
		HTMLURL:       r.GetHTMLURL(),
		DefaultBranch: r.GetDefaultBranch(),
		Private:       r.GetPrivate(),
		Language:      r.GetLanguage(),
	}
}

// ghPRToJanitor converts a go-github PullRequest to a janitor.PR.
func ghPRToJanitor(pr *github.PullRequest) *janitor.PR {
	jpr := &janitor.PR{
		Number: pr.GetNumber(),
		URL:    pr.GetHTMLURL(),
		Title:  pr.GetTitle(),
		Body:   pr.GetBody(),
		State:  pr.GetState(),
	}

	if pr.Head != nil {
		jpr.Branch = pr.Head.GetRef()
		jpr.HeadSHA = pr.Head.GetSHA()
	}
	if pr.Base != nil {
		jpr.BaseBranch = pr.Base.GetRef()
	}
	if pr.CreatedAt != nil {
		jpr.CreatedAt = pr.CreatedAt.Time
	}
	if pr.UpdatedAt != nil {
		jpr.UpdatedAt = pr.UpdatedAt.Time
	}

	return jpr
}