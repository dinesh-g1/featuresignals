// Package github provides tests for the GitHub provider implementation.
package github

import (
	"context"
	"encoding/json"
	"fmt"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/google/go-github/v69/github"
	"github.com/featuresignals/server/internal/janitor"
	"golang.org/x/oauth2"
)

// ─── Mock server ───────────────────────────────────────────────────────────

// testHandler returns an http.Handler that responds to GitHub API calls with
// canned data. This covers all endpoints used by the provider implementation.
func testHandler() http.Handler {
	mux := http.NewServeMux()

	// GET /user — ValidateToken
	mux.HandleFunc("/user", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"login": "test-user",
			"id":    12345,
		})
	})

	// GET /user/repos — ListRepositories (authenticated user)
	mux.HandleFunc("/user/repos", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{
			{
				"id":             1,
				"name":           "test-repo",
				"full_name":      "test-user/test-repo",
				"clone_url":      "https://github.com/test-user/test-repo.git",
				"html_url":       "https://github.com/test-user/test-repo",
				"default_branch": "main",
				"private":        false,
				"language":       "Go",
			},
			{
				"id":             2,
				"name":           "another-repo",
				"full_name":      "test-user/another-repo",
				"clone_url":      "https://github.com/test-user/another-repo.git",
				"html_url":       "https://github.com/test-user/another-repo",
				"default_branch": "main",
				"private":        true,
				"language":       "TypeScript",
			},
		})
	})

	// GET /orgs/:org/repos — ListRepositories (org-scoped)
	mux.HandleFunc("/orgs/test-org/repos", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{
			{
				"id":             10,
				"name":           "org-repo",
				"full_name":      "test-org/org-repo",
				"clone_url":      "https://github.com/test-org/org-repo.git",
				"html_url":       "https://github.com/test-org/org-repo",
				"default_branch": "main",
				"private":        true,
				"language":       "Rust",
			},
		})
	})

	// GET /repos/:owner/:repo — repository info
	mux.HandleFunc("/repos/test-user/test-repo", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":             1,
			"name":           "test-repo",
			"full_name":      "test-user/test-repo",
			"default_branch": "main",
			"private":        false,
		})
	})

	// GET /repos/:owner/:repo/contents/:path — GetFileContents
	// Returns 404 for "nonexistent.go" to test the not-found path.
	mux.HandleFunc("/repos/test-user/test-repo/contents/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		path := strings.TrimPrefix(r.URL.Path, "/repos/test-user/test-repo/contents/")
		if path == "nonexistent.go" {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"message": "Not Found",
			})
			return
		}
		json.NewEncoder(w).Encode(map[string]interface{}{
			"type":     "file",
			"encoding": "base64",
			"content":  "dGVzdCBjb250ZW50", // "test content"
			"name":     "test.go",
			"path":     "test.go",
			"sha":      "abc123",
			"size":     13,
		})
	})

	// GET /repos/:owner/:repo/git/trees/:sha — GetTree (used by ListFiles)
	mux.HandleFunc("/repos/test-user/test-repo/git/trees/base-tree-sha", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"sha": "base-tree-sha",
			"tree": []map[string]interface{}{
				{"path": "README.md", "type": "blob", "mode": "100644", "sha": "sha1", "size": 10},
				{"path": "src/main.go", "type": "blob", "mode": "100644", "sha": "sha2", "size": 20},
				{"path": "src/util.go", "type": "blob", "mode": "100644", "sha": "sha3", "size": 30},
				{"path": "internal/helper.go", "type": "blob", "mode": "100644", "sha": "sha4", "size": 40},
				{"path": "docs", "type": "tree", "mode": "040000", "sha": "sha5"},
			},
		})
	})

	// NOTE: go-github v69 GetRef strips "refs/" prefix and calls git/ref/{ref}.
	// GET /repos/:owner/:repo/git/ref/heads/main — GetRef for "main"
	mux.HandleFunc("/repos/test-user/test-repo/git/ref/heads/main", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ref": "refs/heads/main",
			"object": map[string]interface{}{
				"sha":  "commit-sha-123",
				"type": "commit",
			},
		})
	})

	// GET /repos/:owner/:repo/git/ref/heads/test-branch — GetRef for "test-branch"
	mux.HandleFunc("/repos/test-user/test-repo/git/ref/heads/test-branch", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ref": "refs/heads/test-branch",
			"object": map[string]interface{}{
				"sha":  "commit-sha-123",
				"type": "commit",
			},
		})
	})

	// GET /repos/:owner/:repo/git/ref/heads/delete-me — GetRef for delete-me
	mux.HandleFunc("/repos/test-user/test-repo/git/ref/heads/delete-me", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ref": "refs/heads/delete-me",
			"object": map[string]interface{}{
				"sha":  "commit-sha-123",
				"type": "commit",
			},
		})
	})

	// GET /repos/:owner/:repo/git/ref/heads/nonexistent — GetRef 404
	mux.HandleFunc("/repos/test-user/test-repo/git/ref/heads/nonexistent", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "Not Found",
		})
	})

	// GET /repos/:owner/:repo/git/commits/:sha — GetCommit
	mux.HandleFunc("/repos/test-user/test-repo/git/commits/commit-sha-123", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"sha": "commit-sha-123",
			"tree": map[string]interface{}{
				"sha": "base-tree-sha",
			},
		})
	})

	// POST /repos/:owner/:repo/git/blobs — CreateBlob
	mux.HandleFunc("/repos/test-user/test-repo/git/blobs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"sha": "blob-sha-new",
		})
	})

	// POST /repos/:owner/:repo/git/trees — CreateTree
	mux.HandleFunc("/repos/test-user/test-repo/git/trees", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"sha": "tree-sha-new",
		})
	})

	// POST /repos/:owner/:repo/git/commits — CreateCommit
	mux.HandleFunc("/repos/test-user/test-repo/git/commits", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"sha": "commit-sha-new",
		})
	})

	// POST /repos/:owner/:repo/git/refs — CreateRef
	mux.HandleFunc("/repos/test-user/test-repo/git/refs", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ref": "refs/heads/new-branch",
			"object": map[string]interface{}{
				"sha":  "commit-sha-123",
				"type": "commit",
			},
		})
	})

	// PATCH /repos/:owner/:repo/git/refs/heads/test-branch — UpdateRef
	mux.HandleFunc("/repos/test-user/test-repo/git/refs/heads/test-branch", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ref": "refs/heads/test-branch",
			"object": map[string]interface{}{
				"sha":  "commit-sha-new",
				"type": "commit",
			},
		})
	})

	// DELETE /repos/:owner/:repo/git/refs/heads/delete-me — DeleteRef
	mux.HandleFunc("/repos/test-user/test-repo/git/refs/heads/delete-me", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"ref": "refs/heads/delete-me",
			"object": map[string]interface{}{
				"sha":  "commit-sha-123",
				"type": "commit",
			},
		})
	})

	// POST /repos/:owner/:repo/pulls — CreatePullRequest
	// GET /repos/:owner/:repo/pulls — ListPullRequests
	mux.HandleFunc("/repos/test-user/test-repo/pulls", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.Method {
		case http.MethodPost:
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"number":   42,
				"title":    "Test PR",
				"body":     "Test body",
				"state":    "open",
				"html_url": "https://github.com/test-user/test-repo/pull/42",
				"head": map[string]interface{}{
					"ref": "test-branch",
					"sha": "commit-sha-new",
				},
				"base": map[string]interface{}{
					"ref": "main",
				},
				"created_at": "2025-01-01T00:00:00Z",
				"updated_at": "2025-01-01T00:00:00Z",
			})
		case http.MethodGet:
			json.NewEncoder(w).Encode([]map[string]interface{}{
				{
					"number":   42,
					"title":    "Test PR",
					"body":     "Test body",
					"state":    "open",
					"html_url": "https://github.com/test-user/test-repo/pull/42",
					"head": map[string]interface{}{
						"ref": "test-branch",
						"sha": "commit-sha-new",
					},
					"base": map[string]interface{}{
						"ref": "main",
					},
					"created_at": "2025-01-01T00:00:00Z",
					"updated_at": "2025-01-01T00:00:00Z",
				},
			})
		}
	})

	// GET /repos/:owner/:repo/pulls/42 — GetPullRequest
	mux.HandleFunc("/repos/test-user/test-repo/pulls/42", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"number":   42,
			"title":    "Test PR",
			"body":     "Test body",
			"state":    "open",
			"html_url": "https://github.com/test-user/test-repo/pull/42",
			"head": map[string]interface{}{
				"ref": "test-branch",
				"sha": "commit-sha-new",
			},
			"base": map[string]interface{}{
				"ref": "main",
			},
			"created_at": "2025-01-01T00:00:00Z",
			"updated_at": "2025-01-01T00:00:00Z",
		})
	})

	// PUT /repos/:owner/:repo/pulls/42/merge — MergePullRequest
	mux.HandleFunc("/repos/test-user/test-repo/pulls/42/merge", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"sha":     "merge-sha",
			"merged":  true,
			"message": "Pull Request successfully merged",
		})
	})

	// POST /repos/:owner/:repo/issues/:number/comments — AddPullRequestComment
	mux.HandleFunc("/repos/test-user/test-repo/issues/42/comments", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":   1,
			"body": "test comment",
		})
	})

	// POST /repos/:owner/:repo/hooks — CreateWebhook
	mux.HandleFunc("/repos/test-user/test-repo/hooks", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		if r.Method == http.MethodPost {
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":   99,
				"name": "web",
				"config": map[string]interface{}{
					"url":          "https://example.com/webhook",
					"content_type": "json",
				},
				"events": []string{"push", "pull_request"},
			})
		}
	})

	// DELETE /repos/:owner/:repo/hooks/:id — DeleteWebhook
	mux.HandleFunc("/repos/test-user/test-repo/hooks/99", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			w.WriteHeader(http.StatusNoContent)
			return
		}
	})

	return mux
}

// ─── Test helpers ──────────────────────────────────────────────────────────

// newTestProvider creates a GitHubProvider pointed at the given test server URL
// without calling ValidateToken (which would require a real server).
func newTestProvider(baseURL string) (*GitHubProvider, error) {
	config := janitor.GitProviderConfig{
		Provider: "github",
		Token:    "test-token",
	}

	ts := oauth2.StaticTokenSource(&oauth2.Token{AccessToken: config.Token})
	tc := oauth2.NewClient(context.Background(), ts)

	client := github.NewClient(tc)
	parsedURL, err := url.Parse(strings.TrimRight(baseURL, "/") + "/")
	if err != nil {
		return nil, fmt.Errorf("parsing base URL: %w", err)
	}
	client.BaseURL = parsedURL

	return &GitHubProvider{
		client: client,
		logger: slog.Default().With("provider", "github"),
		config: config,
	}, nil
}

// ─── Provider metadata tests ───────────────────────────────────────────────

func TestNewGitHubProvider_MissingToken(t *testing.T) {
	_, err := NewGitHubProvider(janitor.GitProviderConfig{
		Provider: "github",
		Token:    "",
	})
	if err == nil {
		t.Fatal("expected error for missing token, got nil")
	}
}

func TestGitHubProvider_Name(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if name := provider.Name(); name != "github" {
		t.Errorf("expected 'github', got %q", name)
	}
}

func TestGitHubProvider_Scopes(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	scopes := provider.Scopes()
	if len(scopes) == 0 {
		t.Fatal("expected non-empty scopes")
	}
}

// ─── Authentication tests ──────────────────────────────────────────────────

func TestGitHubProvider_ValidateToken(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.ValidateToken(context.Background()); err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
}

func TestGitHubProvider_RefreshToken(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	// RefreshToken is a no-op for PATs; should not return an error.
	if err := provider.RefreshToken(context.Background()); err != nil {
		t.Fatalf("RefreshToken failed: %v", err)
	}
}

// ─── Repository operation tests ────────────────────────────────────────────

func TestGitHubProvider_ListRepositories(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	repos, err := provider.ListRepositories(context.Background())
	if err != nil {
		t.Fatalf("ListRepositories failed: %v", err)
	}

	if len(repos) != 2 {
		t.Fatalf("expected 2 repos, got %d", len(repos))
	}

	if repos[0].Name != "test-repo" {
		t.Errorf("expected 'test-repo', got %q", repos[0].Name)
	}
	if repos[0].FullName != "test-user/test-repo" {
		t.Errorf("expected 'test-user/test-repo', got %q", repos[0].FullName)
	}
	if repos[0].Language != "Go" {
		t.Errorf("expected 'Go', got %q", repos[0].Language)
	}
	if repos[0].Private {
		t.Error("expected test-repo to be public")
	}
	if repos[1].Name != "another-repo" {
		t.Errorf("expected 'another-repo', got %q", repos[1].Name)
	}
	if !repos[1].Private {
		t.Error("expected another-repo to be private")
	}
}

func TestGitHubProvider_ListRepositories_OrgScoped(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	provider.config.OrgOrGroup = "test-org"

	repos, err := provider.ListRepositories(context.Background())
	if err != nil {
		t.Fatalf("ListRepositories (org) failed: %v", err)
	}

	if len(repos) != 1 {
		t.Fatalf("expected 1 org repo, got %d", len(repos))
	}
	if repos[0].Name != "org-repo" {
		t.Errorf("expected 'org-repo', got %q", repos[0].Name)
	}
}

func TestGitHubProvider_GetFileContents(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	content, err := provider.GetFileContents(context.Background(), "test-user/test-repo", "test.go", "main")
	if err != nil {
		t.Fatalf("GetFileContents failed: %v", err)
	}

	expected := "test content"
	if string(content) != expected {
		t.Errorf("expected %q, got %q", expected, string(content))
	}
}

func TestGitHubProvider_GetFileContents_NotFound(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	_, err = provider.GetFileContents(context.Background(), "test-user/test-repo", "nonexistent.go", "main")
	if err == nil {
		t.Fatal("expected error for nonexistent file, got nil")
	}
}

func TestGitHubProvider_ListFiles(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	files, err := provider.ListFiles(context.Background(), "test-user/test-repo", "src", "main")
	if err != nil {
		t.Fatalf("ListFiles failed: %v", err)
	}

	if len(files) != 2 {
		t.Fatalf("expected 2 files in src/, got %d: %v", len(files), files)
	}
	if files[0] != "src/main.go" {
		t.Errorf("expected 'src/main.go', got %q", files[0])
	}
	if files[1] != "src/util.go" {
		t.Errorf("expected 'src/util.go', got %q", files[1])
	}
}

func TestGitHubProvider_ListFiles_Root(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	files, err := provider.ListFiles(context.Background(), "test-user/test-repo", "", "main")
	if err != nil {
		t.Fatalf("ListFiles(root) failed: %v", err)
	}

	// All blob entries (excluding tree entries like "docs")
	if len(files) != 4 {
		t.Fatalf("expected 4 files at root, got %d: %v", len(files), files)
	}
}

// ─── Branch operation tests ────────────────────────────────────────────────

func TestGitHubProvider_BranchExists(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	exists, err := provider.BranchExists(context.Background(), "test-user/test-repo", "main")
	if err != nil {
		t.Fatalf("BranchExists failed: %v", err)
	}
	if !exists {
		t.Error("expected 'main' branch to exist")
	}
}

func TestGitHubProvider_BranchExists_NotFound(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	exists, err := provider.BranchExists(context.Background(), "test-user/test-repo", "nonexistent")
	if err != nil {
		t.Fatalf("BranchExists failed: %v", err)
	}
	if exists {
		t.Error("expected 'nonexistent' branch to not exist")
	}
}

func TestGitHubProvider_CreateBranch(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.CreateBranch(context.Background(), "test-user/test-repo", "new-branch", "main"); err != nil {
		t.Fatalf("CreateBranch failed: %v", err)
	}
}

func TestGitHubProvider_DeleteBranch(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.DeleteBranch(context.Background(), "test-user/test-repo", "delete-me"); err != nil {
		t.Fatalf("DeleteBranch failed: %v", err)
	}
}

// ─── Commit / PR tests ─────────────────────────────────────────────────────

func TestGitHubProvider_CommitFiles(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.CommitFiles(context.Background(), "test-user/test-repo", "test-branch", "test commit", []janitor.FileChange{
		{Path: "newfile.go", Content: []byte("package main\n"), Mode: "create"},
	}); err != nil {
		t.Fatalf("CommitFiles failed: %v", err)
	}
}

func TestGitHubProvider_CommitFiles_EmptyChanges(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.CommitFiles(context.Background(), "test-user/test-repo", "test-branch", "empty commit", nil); err != nil {
		t.Fatalf("CommitFiles with nil changes failed: %v", err)
	}
}

func TestGitHubProvider_CreatePullRequest(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	pr, err := provider.CreatePullRequest(context.Background(), "test-user/test-repo", "test-branch", "Test PR", "Test body", []janitor.FileChange{
		{Path: "newfile.go", Content: []byte("package main\n"), Mode: "create"},
	})
	if err != nil {
		t.Fatalf("CreatePullRequest failed: %v", err)
	}

	if pr.Number != 42 {
		t.Errorf("expected PR number 42, got %d", pr.Number)
	}
	if pr.Title != "Test PR" {
		t.Errorf("expected title 'Test PR', got %q", pr.Title)
	}
	if pr.State != "open" {
		t.Errorf("expected state 'open', got %q", pr.State)
	}
	if pr.Branch != "test-branch" {
		t.Errorf("expected branch 'test-branch', got %q", pr.Branch)
	}
	if pr.BaseBranch != "main" {
		t.Errorf("expected base branch 'main', got %q", pr.BaseBranch)
	}
}

func TestGitHubProvider_GetPullRequest(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	pr, err := provider.GetPullRequest(context.Background(), "test-user/test-repo", 42)
	if err != nil {
		t.Fatalf("GetPullRequest failed: %v", err)
	}

	if pr.Number != 42 {
		t.Errorf("expected PR number 42, got %d", pr.Number)
	}
	if pr.State != "open" {
		t.Errorf("expected state 'open', got %q", pr.State)
	}
	if pr.URL != "https://github.com/test-user/test-repo/pull/42" {
		t.Errorf("unexpected URL: %q", pr.URL)
	}
}

func TestGitHubProvider_ListPullRequests(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	prs, err := provider.ListPullRequests(context.Background(), "test-user/test-repo", "open")
	if err != nil {
		t.Fatalf("ListPullRequests failed: %v", err)
	}

	if len(prs) != 1 {
		t.Fatalf("expected 1 PR, got %d", len(prs))
	}
	if prs[0].Number != 42 {
		t.Errorf("expected PR number 42, got %d", prs[0].Number)
	}
}

func TestGitHubProvider_MergePullRequest(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.MergePullRequest(context.Background(), "test-user/test-repo", 42); err != nil {
		t.Fatalf("MergePullRequest failed: %v", err)
	}
}

// ─── Comment tests ─────────────────────────────────────────────────────────

func TestGitHubProvider_AddPullRequestComment(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.AddPullRequestComment(context.Background(), "test-user/test-repo", 42, "test comment"); err != nil {
		t.Fatalf("AddPullRequestComment failed: %v", err)
	}
}

// ─── Webhook tests ─────────────────────────────────────────────────────────

func TestGitHubProvider_CreateWebhook(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	id, err := provider.CreateWebhook(context.Background(), "test-user/test-repo", "https://example.com/webhook", "mysecret", []string{"push", "pull_request"})
	if err != nil {
		t.Fatalf("CreateWebhook failed: %v", err)
	}

	if id != "99" {
		t.Errorf("expected webhook ID '99', got %q", id)
	}
}

func TestGitHubProvider_DeleteWebhook(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL)
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.DeleteWebhook(context.Background(), "test-user/test-repo", "99"); err != nil {
		t.Fatalf("DeleteWebhook failed: %v", err)
	}
}