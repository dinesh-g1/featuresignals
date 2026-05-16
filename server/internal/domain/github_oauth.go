package domain

import (
	"context"
	"time"
)

// GitHubToken represents a stored GitHub OAuth token for an organization.
// The access token is stored encrypted at rest using the master encryption key.
type GitHubToken struct {
	ID             string    `json:"id"`
	OrgID          string    `json:"org_id"`
	EncryptedToken string    `json:"-"` // AES-256-GCM encrypted; never exposed in JSON
	GitHubUser     string    `json:"github_user"`
	RepoFullName   string    `json:"repo_full_name"`
	CreatedAt      time.Time `json:"created_at"`
	UpdatedAt      time.Time `json:"updated_at"`
}

// GitHubOAuthStore defines the persistence interface for GitHub OAuth tokens.
type GitHubOAuthStore interface {
	StoreGitHubToken(ctx context.Context, orgID, encryptedToken, githubUser, repoFullName string) error
	GetGitHubToken(ctx context.Context, orgID string) (*GitHubToken, error)
	DeleteGitHubToken(ctx context.Context, orgID string) error
}
