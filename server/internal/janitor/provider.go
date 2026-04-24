// Package janitor implements the AI-driven stale flag detection and cleanup engine.
// This file defines the Git provider interface, types, and registry pattern that
// allows adding new Git platform support without modifying existing code.
package janitor

import (
	"context"
	"fmt"
	"sync"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Core Interface ─────────────────────────────────────────────────────────

// GitProvider defines the contract for interacting with Git platforms.
// Every implementation must support: repository access, file scanning,
// PR creation, webhook management, and OAuth authentication.
type GitProvider interface {
	// Provider metadata
	Name() string   // "github", "gitlab", "bitbucket", "azure-devops"
	Scopes() []string // Required OAuth scopes for this provider

	// Repository operations
	FetchRepository(ctx context.Context, repo string, branch string) ([]byte, error)
	ListRepositories(ctx context.Context) ([]Repository, error)
	GetFileContents(ctx context.Context, repo, path, branch string) ([]byte, error)
	ListFiles(ctx context.Context, repo, path, branch string) ([]string, error)

	// Branch operations
	CreateBranch(ctx context.Context, repo, branch, baseBranch string) error
	DeleteBranch(ctx context.Context, repo, branch string) error
	BranchExists(ctx context.Context, repo, branch string) (bool, error)

	// PR/merge request operations
	CreatePullRequest(ctx context.Context, repo, branch, title, body string, changes []FileChange) (*PR, error)
	UpdatePullRequest(ctx context.Context, repo string, prNumber int, changes []FileChange) error
	GetPullRequest(ctx context.Context, repo string, prNumber int) (*PR, error)
	ListPullRequests(ctx context.Context, repo, state string) ([]PR, error)
	MergePullRequest(ctx context.Context, repo string, prNumber int) error

	// Comment operations
	AddPullRequestComment(ctx context.Context, repo string, prNumber int, body string) error

	// Webhook operations (for auto-scan triggers)
	CreateWebhook(ctx context.Context, repo, url, secret string, events []string) (string, error)
	DeleteWebhook(ctx context.Context, repo, webhookID string) error

	// Authentication
	ValidateToken(ctx context.Context) error
	RefreshToken(ctx context.Context) error

	// File operations
	CommitFiles(ctx context.Context, repo, branch, message string, changes []FileChange) error
}

// ─── Data Types ─────────────────────────────────────────────────────────────

// Repository represents a Git repository on a provider.
type Repository struct {
	ID            string    `json:"id"`
	Name          string    `json:"name"`
	FullName      string    `json:"full_name"`
	CloneURL      string    `json:"clone_url"`
	HTMLURL       string    `json:"html_url"`
	DefaultBranch string    `json:"default_branch"`
	Private       bool      `json:"private"`
	Language      string    `json:"language"`
}

// FileChange represents a file to create or modify in a PR.
type FileChange struct {
	Path    string `json:"path"`
	Content []byte `json:"content"`
	Mode    string `json:"mode"` // "create", "modify", "delete"
}

// PR represents a pull request or merge request.
type PR struct {
	Number     int       `json:"number"`
	URL        string    `json:"url"`
	Title      string    `json:"title"`
	Body       string    `json:"body"`
	State      string    `json:"state"` // "open", "closed", "merged"
	Branch     string    `json:"branch"`
	BaseBranch string    `json:"base_branch"`
	CreatedAt  time.Time `json:"created_at"`
	UpdatedAt  time.Time `json:"updated_at"`
	HeadSHA    string    `json:"head_sha"`
}

// GitProviderConfig holds authentication and connection details.
type GitProviderConfig struct {
	Provider      string // "github", "gitlab", "bitbucket", "azure-devops"
	Token         string // OAuth token or personal access token
	BaseURL       string // For self-hosted instances (empty = cloud SaaS)
	OrgOrGroup    string // Organization or group scope
	WebhookSecret string // Secret for webhook verification
}

// ProviderHealth holds status information for a Git provider connection.
type ProviderHealth struct {
	Provider    string    `json:"provider"`
	Connected   bool      `json:"connected"`
	LastChecked time.Time `json:"last_checked"`
	Error       string    `json:"error,omitempty"`
	RateLimit   struct {
		Remaining int       `json:"remaining"`
		ResetAt   time.Time `json:"reset_at"`
	} `json:"rate_limit"`
	SelfHosted bool   `json:"self_hosted"`
	Version    string `json:"version,omitempty"`
}

// ProviderStatus tracks whether a provider is actively maintained.
type ProviderStatus struct {
	Name          string  `json:"name"`
	MarketShare   float64 `json:"market_share,omitempty"`
	MaintainedBy  string  `json:"maintained_by"` // "core", "community", "deprecated"
	DocsURL       string  `json:"docs_url,omitempty"`
	AddedInVersion string `json:"added_in_version"`
	DeprecatedIn  string  `json:"deprecated_in,omitempty"`
	RemovalDate   string  `json:"removal_date,omitempty"`
}

// ─── Registry Pattern ───────────────────────────────────────────────────────

// GitProviderRegistry holds all registered Git provider factory functions.
// New Git providers are added by implementing GitProvider and registering
// the factory in main(). No switch statements. No code changes to existing
// files. Open/Closed Principle.
type GitProviderRegistry struct {
	mu        sync.RWMutex
	factories map[string]GitProviderFactory
}

// GitProviderFactory creates a configured GitProvider instance.
type GitProviderFactory func(config GitProviderConfig) (GitProvider, error)

var gitProviderRegistry = &GitProviderRegistry{
	factories: make(map[string]GitProviderFactory),
}

// RegisterGitProvider adds a provider factory to the global registry.
// Called during application startup in main().
//
// Usage:
//
//	import "github.com/featuresignals/server/internal/janitor"
//	janitor.RegisterGitProvider("github", NewGitHubProvider)
func RegisterGitProvider(name string, factory GitProviderFactory) {
	gitProviderRegistry.mu.Lock()
	defer gitProviderRegistry.mu.Unlock()
	if _, exists := gitProviderRegistry.factories[name]; exists {
		panic(fmt.Sprintf("janitor: git provider %q already registered", name))
	}
	gitProviderRegistry.factories[name] = factory
}

// NewGitProvider creates the appropriate provider for the given config.
func NewGitProvider(config GitProviderConfig) (GitProvider, error) {
	gitProviderRegistry.mu.RLock()
	factory, ok := gitProviderRegistry.factories[config.Provider]
	gitProviderRegistry.mu.RUnlock()

	if !ok {
		return nil, fmt.Errorf("%w: unsupported git provider %q — "+
			"available: %v", domain.ErrValidation, config.Provider, ListGitProviders())
	}

	return factory(config)
}

// ListGitProviders returns all registered Git provider names.
func ListGitProviders() []string {
	gitProviderRegistry.mu.RLock()
	defer gitProviderRegistry.mu.RUnlock()

	names := make([]string, 0, len(gitProviderRegistry.factories))
	for name := range gitProviderRegistry.factories {
		names = append(names, name)
	}
	return names
}

// ProviderStatus returns the status of all registered and known providers.
func (r *GitProviderRegistry) ProviderStatus() []ProviderStatus {
	r.mu.RLock()
	defer r.mu.RUnlock()

	statuses := make([]ProviderStatus, 0, len(r.factories))
	for name := range r.factories {
		statuses = append(statuses, ProviderStatus{
			Name:           name,
			MaintainedBy:   "core",
			AddedInVersion: "1.0.0",
		})
	}
	return statuses
}

// HealthCheck pings all registered providers with a test token and returns
// their connection health status.
func (r *GitProviderRegistry) HealthCheck(ctx context.Context, tokens map[string]string) []ProviderHealth {
	r.mu.RLock()
	defer r.mu.RUnlock()

	var results []ProviderHealth
	for name, factory := range r.factories {
		health := ProviderHealth{
			Provider:    name,
			LastChecked: time.Now().UTC(),
			SelfHosted:  false,
		}

		token, ok := tokens[name]
		if !ok || token == "" {
			health.Connected = false
			health.Error = "no token configured"
			results = append(results, health)
			continue
		}

		provider, err := factory(GitProviderConfig{
			Provider: name,
			Token:    token,
		})
		if err != nil {
			health.Connected = false
			health.Error = err.Error()
			results = append(results, health)
			continue
		}

		if err := provider.ValidateToken(ctx); err != nil {
			health.Connected = false
			health.Error = err.Error()
		} else {
			health.Connected = true
		}

		results = append(results, health)
	}
	return results
}