// Package bitbucket provides tests for the Bitbucket Git provider MVP implementation.
package bitbucket

import (
	"context"
	"encoding/json"
	"errors"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/janitor"
)

// ─── Mock server ───────────────────────────────────────────────────────────

// testHandler returns an http.Handler that responds to Bitbucket API calls
// with canned data. Only covers endpoints used by the MVP methods.
func testHandler() http.Handler {
	mux := http.NewServeMux()

	// GET /2.0/user — ValidateToken
	mux.HandleFunc("/2.0/user", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"uuid":         "{user-uuid-123}",
			"display_name": "Test User",
			"account_id":   "account-123",
			"nickname":     "testuser",
		})
	})

	// GET /2.0/repositories — ListRepositories (user-scoped)
	mux.HandleFunc("/2.0/repositories", func(w http.ResponseWriter, r *http.Request) {
		// Only serve exact path /2.0/repositories (no trailing slash).
		if r.URL.Path != "/2.0/repositories" {
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"pagelen": 100,
			"page":    1,
			"size":    2,
			"values": []map[string]interface{}{
				{
					"uuid":        "{repo-uuid-1}",
					"name":        "test-repo",
					"full_name":   "test-workspace/test-repo",
					"description": "A test repository",
					"is_private":  false,
					"language":    "Go",
					"links": map[string]interface{}{
						"clone": []map[string]interface{}{
							{"name": "https", "href": "https://bitbucket.org/test-workspace/test-repo.git"},
						},
						"html": map[string]interface{}{
							"href": "https://bitbucket.org/test-workspace/test-repo",
						},
					},
					"mainbranch": map[string]interface{}{
						"name": "main",
					},
				},
				{
					"uuid":        "{repo-uuid-2}",
					"name":        "private-repo",
					"full_name":   "test-workspace/private-repo",
					"description": "A private repository",
					"is_private":  true,
					"language":    "TypeScript",
					"links": map[string]interface{}{
						"clone": []map[string]interface{}{
							{"name": "https", "href": "https://bitbucket.org/test-workspace/private-repo.git"},
						},
						"html": map[string]interface{}{
							"href": "https://bitbucket.org/test-workspace/private-repo",
						},
					},
					"mainbranch": map[string]interface{}{
						"name": "main",
					},
				},
			},
		})
	})

	// GET /2.0/repositories/{workspace} — ListRepositories (org-scoped)
	mux.HandleFunc("/2.0/repositories/", func(w http.ResponseWriter, r *http.Request) {
		workspace := strings.TrimPrefix(r.URL.Path, "/2.0/repositories/")
		if workspace == "" || workspace == "2.0/repositories" {
			return
		}

		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"pagelen": 100,
			"page":    1,
			"size":    1,
			"values": []map[string]interface{}{
				{
					"uuid":        "{repo-uuid-10}",
					"name":        "org-repo",
					"full_name":   workspace + "/org-repo",
					"description": "An org repository",
					"is_private":  true,
					"language":    "Rust",
					"links": map[string]interface{}{
						"clone": []map[string]interface{}{
							{"name": "https", "href": "https://bitbucket.org/" + workspace + "/org-repo.git"},
						},
						"html": map[string]interface{}{
							"href": "https://bitbucket.org/" + workspace + "/org-repo",
						},
					},
					"mainbranch": map[string]interface{}{
						"name": "main",
					},
				},
			},
		})
	})

	// GET /2.0/repositories/test-workspace/test-repo — repository info
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo", func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path != "/2.0/repositories/test-workspace/test-repo" {
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"uuid":       "{repo-uuid-1}",
			"name":       "test-repo",
			"full_name":  "test-workspace/test-repo",
			"is_private": false,
			"mainbranch": map[string]interface{}{
				"name": "main",
			},
		})
	})

	// GET /2.0/repositories/test-workspace/test-repo/src/ — source tree and file content
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo/src/", func(w http.ResponseWriter, r *http.Request) {
		relative := strings.TrimPrefix(r.URL.Path, "/2.0/repositories/test-workspace/test-repo/src/")

		// If format=tar, return tar archive data for FetchRepository.
		if r.URL.RawQuery == "format=tar" {
			w.Header().Set("Content-Type", "application/octet-stream")
			w.Write([]byte("mock-tar-data"))
			return
		}

		// If there are other query params, this is a tree listing request.
		if r.URL.RawQuery != "" {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"pagelen": 100,
				"page":    1,
				"values": []map[string]interface{}{
					{"path": "README.md", "type": "commit_file"},
					{"path": "src/main.go", "type": "commit_file"},
					{"path": "src/util.go", "type": "commit_file"},
					{"path": "docs", "type": "commit_directory"},
				},
			})
			return
		}

		parts := strings.SplitN(relative, "/", 2)
		if len(parts) < 2 {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"pagelen": 100,
				"page":    1,
				"values": []map[string]interface{}{
					{"path": "README.md", "type": "commit_file"},
					{"path": "src/main.go", "type": "commit_file"},
					{"path": "src/util.go", "type": "commit_file"},
					{"path": "docs", "type": "commit_directory"},
				},
			})
			return
		}

		filePath := parts[1]
		if filePath == "nonexistent.go" || strings.HasPrefix(filePath, "nonexistent") {
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": map[string]interface{}{
					"message": "file not found",
				},
			})
			return
		}

		w.Header().Set("Content-Type", "text/plain")
		w.Write([]byte("test content\n"))
	})

	// POST /2.0/repositories/test-workspace/test-repo/src — CommitFiles
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo/src", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"hash": "new-commit-sha",
			})
		}
	})

	// GET /2.0/repositories/test-workspace/test-repo/refs/branches/main — getBranchCommitSHA
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo/refs/branches/main", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"name": "main",
			"target": map[string]interface{}{
				"hash": "commit-sha-123",
			},
		})
	})

	// GET /2.0/repositories/test-workspace/test-repo/refs/branches/test-branch — branchExistsInternal (exists)
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo/refs/branches/test-branch", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodGet {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"name": "test-branch",
				"target": map[string]interface{}{
					"hash": "commit-sha-456",
				},
			})
			return
		}
	})

	// POST /2.0/repositories/test-workspace/test-repo/refs/branches — CreateBranch
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo/refs/branches", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"name": "new-branch",
				"target": map[string]interface{}{
					"hash": "commit-sha-123",
				},
			})
		}
	})

	// POST /2.0/repositories/test-workspace/test-repo/pullrequests — CreatePullRequest
	// GET /2.0/repositories/test-workspace/test-repo/pullrequests — ListPullRequests
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo/pullrequests", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.Method {
		case http.MethodPost:
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":          42,
				"title":       "Test PR",
				"description": "Test body",
				"state":       "OPEN",
				"links": map[string]interface{}{
					"html": map[string]interface{}{
						"href": "https://bitbucket.org/test-workspace/test-repo/pull-requests/42",
					},
				},
				"source": map[string]interface{}{
					"branch": map[string]interface{}{
						"name": "test-branch",
					},
					"commit": map[string]interface{}{
						"hash": "commit-sha-789",
					},
				},
				"destination": map[string]interface{}{
					"branch": map[string]interface{}{
						"name": "main",
					},
				},
				"created_on": "2025-01-01T00:00:00Z",
				"updated_on": "2025-01-01T00:00:00Z",
			})
		case http.MethodGet:
			json.NewEncoder(w).Encode(map[string]interface{}{
				"pagelen": 100,
				"page":    1,
				"size":    1,
				"values": []map[string]interface{}{
					{
						"id":          42,
						"title":       "Test PR",
						"description": "Test body",
						"state":       "OPEN",
						"links": map[string]interface{}{
							"html": map[string]interface{}{
								"href": "https://bitbucket.org/test-workspace/test-repo/pull-requests/42",
							},
						},
						"source": map[string]interface{}{
							"branch": map[string]interface{}{
								"name": "test-branch",
							},
							"commit": map[string]interface{}{
								"hash": "commit-sha-789",
							},
						},
						"destination": map[string]interface{}{
							"branch": map[string]interface{}{
								"name": "main",
							},
						},
						"created_on": "2025-01-01T00:00:00Z",
						"updated_on": "2025-01-01T00:00:00Z",
					},
				},
			})
		}
	})

	// GET /2.0/repositories/test-workspace/test-repo/pullrequests/42 — GetPullRequest
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo/pullrequests/42", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":          42,
			"title":       "Test PR",
			"description": "Test body",
			"state":       "OPEN",
			"links": map[string]interface{}{
				"html": map[string]interface{}{
					"href": "https://bitbucket.org/test-workspace/test-repo/pull-requests/42",
				},
			},
			"source": map[string]interface{}{
				"branch": map[string]interface{}{
					"name": "test-branch",
				},
				"commit": map[string]interface{}{
					"hash": "commit-sha-789",
				},
			},
			"destination": map[string]interface{}{
				"branch": map[string]interface{}{
					"name": "main",
				},
			},
			"created_on": "2025-01-01T00:00:00Z",
			"updated_on": "2025-01-01T00:00:00Z",
		})
	})

	// DELETE /2.0/repositories/test-workspace/test-repo/refs/branches/delete-me — DeleteBranch
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo/refs/branches/delete-me", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			w.WriteHeader(http.StatusNoContent)
			return
		}
	})

	// POST /2.0/repositories/test-workspace/test-repo/pullrequests/42/merge — MergePullRequest
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo/pullrequests/42/merge", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"type":  "pullrequest_merge_parameters",
				"state": "MERGED",
			})
		}
	})

	// POST /2.0/repositories/test-workspace/test-repo/pullrequests/42/comments — AddPullRequestComment
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo/pullrequests/42/comments", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id": 101,
				"content": map[string]interface{}{
					"raw": "test comment",
				},
			})
		}
	})

	// POST /2.0/repositories/test-workspace/test-repo/hooks — CreateWebhook
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo/hooks", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"uuid":        "{webhook-uuid-123}",
				"description": "AI Janitor",
				"url":         "https://example.com/webhook",
				"active":      true,
			})
		}
	})

	// DELETE /2.0/repositories/test-workspace/test-repo/hooks/ — DeleteWebhook (prefix match for any uuid)
	mux.HandleFunc("/2.0/repositories/test-workspace/test-repo/hooks/", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			w.WriteHeader(http.StatusNoContent)
			return
		}
	})

	return mux
}

// ─── Test helpers ──────────────────────────────────────────────────────────

// newTestProvider creates a BitbucketProvider pointed at the given test server
// URL without calling ValidateToken (which would require a running server).
func newTestProvider(baseURL string) (*BitbucketProvider, error) {
	config := janitor.GitProviderConfig{
		Provider: "bitbucket",
		Token:    "testuser:test-app-password",
	}

	return &BitbucketProvider{
		httpClient: &http.Client{Timeout: 5 * time.Second},
		logger:     slog.Default().With("provider", "bitbucket"),
		config:     config,
		baseURL:    baseURL,
	}, nil
}

// newTestProviderWithToken creates a provider with a custom token.
func newTestProviderWithToken(baseURL, token string) *BitbucketProvider {
	return &BitbucketProvider{
		httpClient: &http.Client{Timeout: 5 * time.Second},
		logger:     slog.Default().With("provider", "bitbucket"),
		config: janitor.GitProviderConfig{
			Provider: "bitbucket",
			Token:    token,
		},
		baseURL: baseURL,
	}
}

// ─── Factory tests ─────────────────────────────────────────────────────────

func TestNewBitbucketProvider_MissingToken(t *testing.T) {
	_, err := NewBitbucketProvider(janitor.GitProviderConfig{
		Provider: "bitbucket",
		Token:    "",
	})
	if err == nil {
		t.Fatal("expected error for missing token, got nil")
	}
}

func TestNewBitbucketProvider_AppPasswordFormat(t *testing.T) {
	// Set up a server that validates the auth header.
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		user, pass, ok := r.BasicAuth()
		if !ok {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": map[string]interface{}{"message": "no basic auth"},
			})
			return
		}
		if user != "testuser" || pass != "test-app-password" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": map[string]interface{}{"message": "invalid credentials"},
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"uuid":         "{user-uuid-123}",
			"display_name": "Test User",
			"account_id":   "account-123",
			"nickname":     "testuser",
		})
	}))
	defer ts.Close()

	provider, err := NewBitbucketProvider(janitor.GitProviderConfig{
		Provider: "bitbucket",
		Token:    "testuser:test-app-password",
		BaseURL:  ts.URL + "/2.0",
	})
	if err != nil {
		t.Fatalf("expected success for app password token, got: %v", err)
	}
	if provider == nil {
		t.Fatal("expected non-nil provider")
	}
}

func TestNewBitbucketProvider_BearerTokenFormat(t *testing.T) {
	// Set up a server that validates the Bearer auth header.
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth != "Bearer my-oauth-token" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": map[string]interface{}{"message": "invalid auth"},
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"uuid":         "{user-uuid-456}",
			"display_name": "OAuth User",
			"account_id":   "account-456",
			"nickname":     "oauthuser",
		})
	}))
	defer ts.Close()

	provider, err := NewBitbucketProvider(janitor.GitProviderConfig{
		Provider: "bitbucket",
		Token:    "my-oauth-token",
		BaseURL:  ts.URL + "/2.0",
	})
	if err != nil {
		t.Fatalf("expected success for bearer token, got: %v", err)
	}
	if provider == nil {
		t.Fatal("expected non-nil provider")
	}
}

// ─── Provider metadata tests ───────────────────────────────────────────────

func TestBitbucketProvider_Name(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if name := provider.Name(); name != "bitbucket" {
		t.Errorf("expected 'bitbucket', got %q", name)
	}
}

func TestBitbucketProvider_Scopes(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	scopes := provider.Scopes()
	if len(scopes) == 0 {
		t.Fatal("expected non-empty scopes")
	}
	foundRepo := false
	foundPR := false
	for _, s := range scopes {
		if s == "repository" {
			foundRepo = true
		}
		if s == "pullrequest" {
			foundPR = true
		}
	}
	if !foundRepo {
		t.Error("expected scope 'repository'")
	}
	if !foundPR {
		t.Error("expected scope 'pullrequest'")
	}
}

// ─── Authentication tests ──────────────────────────────────────────────────

func TestBitbucketProvider_ValidateToken(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.ValidateToken(context.Background()); err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
}

func TestBitbucketProvider_ValidateToken_BearerAuth(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		if auth != "Bearer valid-bearer-token" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": map[string]interface{}{"message": "invalid auth"},
			})
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"uuid":         "{user-uuid-789}",
			"display_name": "Bearer User",
			"account_id":   "account-789",
			"nickname":     "beareruser",
		})
	}))
	defer ts.Close()

	provider := newTestProviderWithToken(ts.URL+"/2.0", "valid-bearer-token")

	if err := provider.ValidateToken(context.Background()); err != nil {
		t.Fatalf("ValidateToken with Bearer auth failed: %v", err)
	}
}

func TestBitbucketProvider_RefreshToken(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	// RefreshToken is a no-op; should not return an error.
	if err := provider.RefreshToken(context.Background()); err != nil {
		t.Fatalf("RefreshToken failed: %v", err)
	}
}

// ─── Repository operation tests ────────────────────────────────────────────

func TestBitbucketProvider_ListRepositories(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
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
	if repos[0].FullName != "test-workspace/test-repo" {
		t.Errorf("expected 'test-workspace/test-repo', got %q", repos[0].FullName)
	}
	if repos[0].Language != "Go" {
		t.Errorf("expected 'Go', got %q", repos[0].Language)
	}
	if repos[0].Private {
		t.Error("expected test-repo to be public")
	}
	if repos[1].Name != "private-repo" {
		t.Errorf("expected 'private-repo', got %q", repos[1].Name)
	}
	if !repos[1].Private {
		t.Error("expected private-repo to be private")
	}
}

func TestBitbucketProvider_ListRepositories_OrgScoped(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	provider.config.OrgOrGroup = "test-org"

	repos, err := provider.ListRepositories(context.Background())
	if err != nil {
		t.Fatalf("ListRepositories failed: %v", err)
	}

	if len(repos) != 1 {
		t.Fatalf("expected 1 repo, got %d", len(repos))
	}

	if repos[0].Name != "org-repo" {
		t.Errorf("expected 'org-repo', got %q", repos[0].Name)
	}
	if repos[0].FullName != "test-org/org-repo" {
		t.Errorf("expected 'test-org/org-repo', got %q", repos[0].FullName)
	}
	if !repos[0].Private {
		t.Error("expected org-repo to be private")
	}
}

func TestBitbucketProvider_GetFileContents(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	content, err := provider.GetFileContents(context.Background(), "test-workspace/test-repo", "README.md", "main")
	if err != nil {
		t.Fatalf("GetFileContents failed: %v", err)
	}

	if string(content) != "test content\n" {
		t.Errorf("expected 'test content\\n', got %q", string(content))
	}
}

func TestBitbucketProvider_GetFileContents_NotFound(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	_, err = provider.GetFileContents(context.Background(), "test-workspace/test-repo", "nonexistent.go", "main")
	if err == nil {
		t.Fatal("expected error for nonexistent file, got nil")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound in error chain, got %v", err)
	}
}

func TestBitbucketProvider_ListFiles(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	files, err := provider.ListFiles(context.Background(), "test-workspace/test-repo", "", "main")
	if err != nil {
		t.Fatalf("ListFiles failed: %v", err)
	}

	if len(files) != 3 {
		t.Fatalf("expected 3 files, got %d: %v", len(files), files)
	}

	expectedFiles := map[string]bool{
		"README.md":   false,
		"src/main.go": false,
		"src/util.go": false,
	}
	for _, f := range files {
		if _, ok := expectedFiles[f]; ok {
			expectedFiles[f] = true
		}
	}
	for name, found := range expectedFiles {
		if !found {
			t.Errorf("expected file %q not found in listing", name)
		}
	}
}

func TestBitbucketProvider_ListFiles_WithPathPrefix(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	files, err := provider.ListFiles(context.Background(), "test-workspace/test-repo", "src", "main")
	if err != nil {
		t.Fatalf("ListFiles failed: %v", err)
	}

	if len(files) != 2 {
		t.Fatalf("expected 2 files in src/, got %d: %v", len(files), files)
	}
}

// ─── Branch operation tests (MVP implemented) ──────────────────────────────

func TestBitbucketProvider_CreateBranch(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.CreateBranch(context.Background(), "test-workspace/test-repo", "new-branch", "main"); err != nil {
		t.Fatalf("CreateBranch failed: %v", err)
	}
}

// ─── PR operation tests ────────────────────────────────────────────────────

func TestBitbucketProvider_CreatePullRequest(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	changes := []janitor.FileChange{
		{Path: "newfile.go", Content: []byte("package main"), Mode: "create"},
	}

	pr, err := provider.CreatePullRequest(context.Background(), "test-workspace/test-repo", "test-branch", "Test PR Title", "Test PR Body", changes)
	if err != nil {
		t.Fatalf("CreatePullRequest failed: %v", err)
	}

	if pr.Number != 42 {
		t.Errorf("expected PR number 42, got %d", pr.Number)
	}
	if pr.Title != "Test PR" {
		t.Errorf("expected title 'Test PR', got %q", pr.Title)
	}
	if pr.State != "OPEN" {
		t.Errorf("expected state 'OPEN', got %q", pr.State)
	}
	if pr.Branch != "test-branch" {
		t.Errorf("expected branch 'test-branch', got %q", pr.Branch)
	}
	if pr.BaseBranch != "main" {
		t.Errorf("expected base branch 'main', got %q", pr.BaseBranch)
	}
}

func TestBitbucketProvider_GetPullRequest(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	pr, err := provider.GetPullRequest(context.Background(), "test-workspace/test-repo", 42)
	if err != nil {
		t.Fatalf("GetPullRequest failed: %v", err)
	}

	if pr.Number != 42 {
		t.Errorf("expected PR number 42, got %d", pr.Number)
	}
	if pr.Title != "Test PR" {
		t.Errorf("expected title 'Test PR', got %q", pr.Title)
	}
	if pr.Body != "Test body" {
		t.Errorf("expected body 'Test body', got %q", pr.Body)
	}
	if pr.State != "OPEN" {
		t.Errorf("expected state 'OPEN', got %q", pr.State)
	}
	if pr.Branch != "test-branch" {
		t.Errorf("expected branch 'test-branch', got %q", pr.Branch)
	}
	if pr.URL != "https://bitbucket.org/test-workspace/test-repo/pull-requests/42" {
		t.Errorf("unexpected URL: %q", pr.URL)
	}
}

func TestBitbucketProvider_ListPullRequests(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	prs, err := provider.ListPullRequests(context.Background(), "test-workspace/test-repo", "open")
	if err != nil {
		t.Fatalf("ListPullRequests failed: %v", err)
	}

	if len(prs) != 1 {
		t.Fatalf("expected 1 PR, got %d", len(prs))
	}

	if prs[0].Number != 42 {
		t.Errorf("expected PR number 42, got %d", prs[0].Number)
	}
	if prs[0].Title != "Test PR" {
		t.Errorf("expected PR title 'Test PR', got %q", prs[0].Title)
	}
	if prs[0].State != "OPEN" {
		t.Errorf("expected state 'OPEN', got %q", prs[0].State)
	}
}

// ─── File operation tests ──────────────────────────────────────────────────

func TestBitbucketProvider_CommitFiles(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	changes := []janitor.FileChange{
		{Path: "newfile.go", Content: []byte("package main\n"), Mode: "create"},
	}

	if err := provider.CommitFiles(context.Background(), "test-workspace/test-repo", "test-branch", "Add newfile.go", changes); err != nil {
		t.Fatalf("CommitFiles failed: %v", err)
	}
}

func TestBitbucketProvider_CommitFiles_EmptyChanges(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.CommitFiles(context.Background(), "test-workspace/test-repo", "test-branch", "Empty commit", nil); err != nil {
		t.Fatalf("CommitFiles with empty changes failed: %v", err)
	}
}

func TestBitbucketProvider_CommitFiles_CreatesBranch(t *testing.T) {
	// Set up a server that:
	// - returns 404 for "new-feature" branch (branch doesn't exist)
	// - returns 200 for "main" branch
	// - allows POST to /refs/branches to create the branch
	// - allows POST to /src to commit files
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/user"):
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"uuid": "{user-uuid}",
			})

		case strings.HasSuffix(r.URL.Path, "/repositories/test-workspace/test-repo"):
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"uuid":       "{repo-uuid}",
				"name":       "test-repo",
				"full_name":  "test-workspace/test-repo",
				"is_private": false,
				"mainbranch": map[string]interface{}{
					"name": "main",
				},
			})

		case strings.HasSuffix(r.URL.Path, "/refs/branches/new-feature") && r.Method == http.MethodGet:
			w.WriteHeader(http.StatusNotFound)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": map[string]interface{}{"message": "branch not found"},
			})

		case strings.HasSuffix(r.URL.Path, "/refs/branches/main") && r.Method == http.MethodGet:
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"name": "main",
				"target": map[string]interface{}{
					"hash": "commit-sha-123",
				},
			})

		case strings.HasSuffix(r.URL.Path, "/refs/branches") && r.Method == http.MethodPost:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)

		case strings.HasSuffix(r.URL.Path, "/src") && r.Method == http.MethodPost:
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"hash": "new-commit-sha",
			})

		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer ts.Close()

	provider := newTestProviderWithToken(ts.URL+"/2.0", "testuser:test-app-password")

	changes := []janitor.FileChange{
		{Path: "newfile.go", Content: []byte("package main\n"), Mode: "create"},
	}

	if err := provider.CommitFiles(context.Background(), "test-workspace/test-repo", "new-feature", "Add newfile.go", changes); err != nil {
		t.Fatalf("CommitFiles (creating new branch) failed: %v", err)
	}
}

// ─── New method tests (replacing former ErrNotImplemented stubs) ──────────

func TestBitbucketProvider_FetchRepository(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	data, err := provider.FetchRepository(context.Background(), "test-workspace/test-repo", "main")
	if err != nil {
		t.Fatalf("FetchRepository failed: %v", err)
	}

	if string(data) != "mock-tar-data" {
		t.Errorf("expected 'mock-tar-data', got %q", string(data))
	}
}

func TestBitbucketProvider_DeleteBranch(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.DeleteBranch(context.Background(), "test-workspace/test-repo", "delete-me"); err != nil {
		t.Fatalf("DeleteBranch failed: %v", err)
	}
}

func TestBitbucketProvider_BranchExists(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	exists, err := provider.BranchExists(context.Background(), "test-workspace/test-repo", "main")
	if err != nil {
		t.Fatalf("BranchExists failed: %v", err)
	}
	if !exists {
		t.Error("expected branch 'main' to exist")
	}
}

func TestBitbucketProvider_MergePullRequest(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.MergePullRequest(context.Background(), "test-workspace/test-repo", 42); err != nil {
		t.Fatalf("MergePullRequest failed: %v", err)
	}
}

func TestBitbucketProvider_MergePullRequest_Conflict(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case strings.HasSuffix(r.URL.Path, "/user"):
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"uuid": "{user-uuid}",
			})

		case strings.HasSuffix(r.URL.Path, "/pullrequests/42/merge") && r.Method == http.MethodPost:
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"error": map[string]interface{}{
					"message": "merge conflict or already merged",
				},
			})

		default:
			w.WriteHeader(http.StatusNotFound)
		}
	}))
	defer ts.Close()

	provider := newTestProviderWithToken(ts.URL+"/2.0", "testuser:test-app-password")

	err := provider.MergePullRequest(context.Background(), "test-workspace/test-repo", 42)
	if err == nil {
		t.Fatal("expected ErrConflict for merge conflict, got nil")
	}
	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict, got %v", err)
	}
}

func TestBitbucketProvider_UpdatePullRequest(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	// nil changes is a no-op in CommitFiles, so UpdatePullRequest succeeds
	if err := provider.UpdatePullRequest(context.Background(), "test-workspace/test-repo", 42, nil); err != nil {
		t.Fatalf("UpdatePullRequest failed: %v", err)
	}
}

func TestBitbucketProvider_AddPullRequestComment(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.AddPullRequestComment(context.Background(), "test-workspace/test-repo", 42, "test comment"); err != nil {
		t.Fatalf("AddPullRequestComment failed: %v", err)
	}
}

func TestBitbucketProvider_CreateWebhook(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	webhookID, err := provider.CreateWebhook(context.Background(), "test-workspace/test-repo", "https://example.com/webhook", "secret", []string{"pullrequest:created"})
	if err != nil {
		t.Fatalf("CreateWebhook failed: %v", err)
	}

	if webhookID != "{webhook-uuid-123}" {
		t.Errorf("expected '{webhook-uuid-123}', got %q", webhookID)
	}
}

func TestBitbucketProvider_DeleteWebhook(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	if err := provider.DeleteWebhook(context.Background(), "test-workspace/test-repo", "{webhook-uuid}"); err != nil {
		t.Fatalf("DeleteWebhook failed: %v", err)
	}
}

// ─── Error mapping tests ───────────────────────────────────────────────────

func TestBitbucketProvider_MapHTTPError_NotFound(t *testing.T) {
	p := &BitbucketProvider{}
	err := p.mapHTTPError(http.StatusNotFound, []byte(`{"error":{"message":"resource not found"}}`))
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestBitbucketProvider_MapHTTPError_Conflict(t *testing.T) {
	p := &BitbucketProvider{}
	err := p.mapHTTPError(http.StatusConflict, []byte(`{"error":{"message":"already exists"}}`))
	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict, got %v", err)
	}
}

func TestBitbucketProvider_MapHTTPError_Unauthorized(t *testing.T) {
	p := &BitbucketProvider{}
	err := p.mapHTTPError(http.StatusUnauthorized, []byte(`{"error":{"message":"invalid credentials"}}`))
	var valErr *domain.ValidationError
	if !errors.As(err, &valErr) {
		t.Errorf("expected ValidationError, got %T: %v", err, err)
	}
	if valErr != nil && valErr.Field != "token" {
		t.Errorf("expected field 'token', got %q", valErr.Field)
	}
}

func TestBitbucketProvider_MapHTTPError_Forbidden(t *testing.T) {
	p := &BitbucketProvider{}
	err := p.mapHTTPError(http.StatusForbidden, []byte(`{"error":{"message":"insufficient permissions"}}`))
	var valErr *domain.ValidationError
	if !errors.As(err, &valErr) {
		t.Errorf("expected ValidationError, got %T: %v", err, err)
	}
	if valErr != nil && valErr.Field != "token" {
		t.Errorf("expected field 'token', got %q", valErr.Field)
	}
}

func TestBitbucketProvider_MapHTTPError_Generic(t *testing.T) {
	p := &BitbucketProvider{}
	err := p.mapHTTPError(http.StatusInternalServerError, []byte(`{"error":{"message":"internal error"}}`))
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if errors.Is(err, domain.ErrNotFound) {
		t.Errorf("unexpected ErrNotFound for 500")
	}
	if errors.Is(err, domain.ErrConflict) {
		t.Errorf("unexpected ErrConflict for 500")
	}
}

// ─── Auth helper tests ─────────────────────────────────────────────────────

func TestBitbucketProvider_IsAppPassword(t *testing.T) {
	tests := []struct {
		name  string
		token string
		want  bool
	}{
		{name: "app password with colon", token: "user:app-pass", want: true},
		{name: "bearer token no colon", token: "oauth2token123", want: false},
		{name: "multiple colons", token: "user:pass:extra", want: true},
		{name: "empty token", token: "", want: false},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			p := &BitbucketProvider{config: janitor.GitProviderConfig{Token: tc.token}}
			got := p.isAppPassword()
			if got != tc.want {
				t.Errorf("isAppPassword(%q) = %v, want %v", tc.token, got, tc.want)
			}
		})
	}
}

func TestBitbucketProvider_AuthParts(t *testing.T) {
	t.Run("app password returns username and password", func(t *testing.T) {
		p := &BitbucketProvider{config: janitor.GitProviderConfig{Token: "myuser:mypass"}}
		user, pass := p.authParts()
		if user != "myuser" {
			t.Errorf("expected username 'myuser', got %q", user)
		}
		if pass != "mypass" {
			t.Errorf("expected password 'mypass', got %q", pass)
		}
	})

	t.Run("bearer token returns empty strings", func(t *testing.T) {
		p := &BitbucketProvider{config: janitor.GitProviderConfig{Token: "justatoken"}}
		user, pass := p.authParts()
		if user != "" || pass != "" {
			t.Errorf("expected empty strings for bearer token, got %q, %q", user, pass)
		}
	})
}

// ─── Unauthorized error test ───────────────────────────────────────────────

func TestBitbucketProvider_Unauthorized(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusUnauthorized)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"error": map[string]interface{}{
				"message": "Invalid credentials",
			},
		})
	}))
	defer ts.Close()

	provider, err := newTestProvider(ts.URL + "/2.0")
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	err = provider.ValidateToken(context.Background())
	if err == nil {
		t.Fatal("expected error for unauthorized, got nil")
	}

	var valErr *domain.ValidationError
	if !errors.As(err, &valErr) {
		t.Errorf("expected ValidationError in error chain, got %T: %v", err, err)
	}
	if valErr != nil && valErr.Field != "token" {
		t.Errorf("expected field 'token', got %q", valErr.Field)
	}
}