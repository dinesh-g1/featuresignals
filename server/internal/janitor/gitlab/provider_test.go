// Package gitlab provides tests for the GitLab provider implementation.
package gitlab

import (
	"context"
	"encoding/json"
	"errors"
	"io"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/janitor"
)

// ─── Mock server ───────────────────────────────────────────────────────────

// testHandler returns an http.Handler that responds to GitLab API calls with
// canned data. This covers all endpoints used by the provider implementation.
func testHandler() http.Handler {
	mux := http.NewServeMux()

	// GET /api/v4/user — ValidateToken
	mux.HandleFunc("/api/v4/user", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodGet {
			http.Error(w, "method not allowed", http.StatusMethodNotAllowed)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":       12345,
			"username": "test-user",
		})
	})

	// GET /api/v4/projects — ListRepositories (page 1 has data, page 2 is empty)
	mux.HandleFunc("/api/v4/projects", func(w http.ResponseWriter, r *http.Request) {
		page := r.URL.Query().Get("page")

		w.Header().Set("Content-Type", "application/json")
		if page == "2" {
			w.Write([]byte("[]"))
			return
		}

		json.NewEncoder(w).Encode([]map[string]interface{}{
			{
				"id":                  1,
				"name":                "test-repo",
				"path_with_namespace": "test-user/test-repo",
				"http_url_to_repo":    "https://gitlab.com/test-user/test-repo.git",
				"web_url":             "https://gitlab.com/test-user/test-repo",
				"default_branch":      "main",
				"visibility":          "public",
			},
			{
				"id":                  2,
				"name":                "another-repo",
				"path_with_namespace": "test-user/another-repo",
				"http_url_to_repo":    "https://gitlab.com/test-user/another-repo.git",
				"web_url":             "https://gitlab.com/test-user/another-repo",
				"default_branch":      "main",
				"visibility":          "private",
			},
		})
	})

	// GET /api/v4/projects/1 — GetProject
	mux.HandleFunc("/api/v4/projects/1", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":                  1,
			"name":                "test-repo",
			"path_with_namespace": "test-user/test-repo",
			"http_url_to_repo":    "https://gitlab.com/test-user/test-repo.git",
			"web_url":             "https://gitlab.com/test-user/test-repo",
			"default_branch":      "main",
			"visibility":          "public",
		})
	})

	// GET /api/v4/projects/test-user%2Ftest-repo — GetProject (URL-encoded path)
	mux.HandleFunc("/api/v4/projects/test-user%2Ftest-repo", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":                  1,
			"name":                "test-repo",
			"path_with_namespace": "test-user/test-repo",
			"http_url_to_repo":    "https://gitlab.com/test-user/test-repo.git",
			"web_url":             "https://gitlab.com/test-user/test-repo",
			"default_branch":      "main",
			"visibility":          "public",
		})
	})

	// GET /api/v4/projects/1/repository/files/<path>/raw — GetFileContents
	mux.HandleFunc("/api/v4/projects/1/repository/files/", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("test content"))
	})

	// GET /api/v4/projects/test-user%2Ftest-repo/repository/files/<path>/raw — GetFileContents (path repo)
	mux.HandleFunc("/api/v4/projects/test-user%2Ftest-repo/repository/files/", func(w http.ResponseWriter, r *http.Request) {
		ref := r.URL.Query().Get("ref")
		if ref == "" {
			w.WriteHeader(http.StatusBadRequest)
			return
		}
		w.Header().Set("Content-Type", "text/plain")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("test content"))
	})

	// GET /api/v4/projects/1/repository/tree — ListFiles
	mux.HandleFunc("/api/v4/projects/1/repository/tree", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode([]map[string]interface{}{
			{"id": "a1", "name": "README.md", "type": "blob", "path": "README.md"},
			{"id": "a2", "name": "main.go", "type": "blob", "path": "src/main.go"},
			{"id": "a3", "name": "util.go", "type": "blob", "path": "src/util.go"},
			{"id": "a4", "name": "helper.go", "type": "blob", "path": "internal/helper.go"},
			{"id": "a5", "name": "docs", "type": "tree", "path": "docs"},
		})
	})

	// POST /api/v4/projects/1/repository/branches — CreateBranch
	mux.HandleFunc("/api/v4/projects/1/repository/branches", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			body, _ := io.ReadAll(r.Body)
			var req struct {
				Branch string `json:"branch"`
				Ref    string `json:"ref"`
			}
			json.Unmarshal(body, &req)

			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"name": req.Branch,
				"commit": map[string]interface{}{
					"id": "commit-sha-123",
				},
			})
		}
	})

	// GET /api/v4/projects/1/repository/branches/main — BranchExists
	mux.HandleFunc("/api/v4/projects/1/repository/branches/main", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"name": "main",
			"commit": map[string]interface{}{
				"id": "commit-sha-123",
			},
		})
	})

	// GET /api/v4/projects/1/repository/branches/nonexistent — BranchExists (404)
	mux.HandleFunc("/api/v4/projects/1/repository/branches/nonexistent", func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNotFound)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"message": "404 Branch Not Found",
		})
	})

	// GET /api/v4/projects/1/repository/branches/test-branch — BranchExists (GET) / DeleteBranch (DELETE)
	mux.HandleFunc("/api/v4/projects/1/repository/branches/test-branch", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"name": "test-branch",
			"commit": map[string]interface{}{
				"id": "commit-sha-456",
			},
		})
	})

	// POST /api/v4/projects/1/repository/commits — CommitFiles
	mux.HandleFunc("/api/v4/projects/1/repository/commits", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		json.NewEncoder(w).Encode(map[string]interface{}{
			"id":         "commit-sha-new",
			"short_id":   "abc123",
			"title":      "test commit",
			"message":    "test commit",
			"created_at": "2025-01-01T00:00:00Z",
		})
	})

	// POST /api/v4/projects/1/merge_requests — CreatePullRequest
	// GET /api/v4/projects/1/merge_requests — ListPullRequests
	mux.HandleFunc("/api/v4/projects/1/merge_requests", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		switch r.Method {
		case http.MethodPost:
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"iid":           42,
				"title":         "Test MR",
				"description":   "Test body",
				"state":         "opened",
				"web_url":       "https://gitlab.com/test-user/test-repo/-/merge_requests/42",
				"source_branch": "test-branch",
				"target_branch": "main",
				"sha":           "commit-sha-new",
				"created_at":    "2025-01-01T00:00:00Z",
				"updated_at":    "2025-01-01T00:00:00Z",
			})
		case http.MethodGet:
			json.NewEncoder(w).Encode([]map[string]interface{}{
				{
					"iid":           42,
					"title":         "Test MR",
					"description":   "Test body",
					"state":         "opened",
					"web_url":       "https://gitlab.com/test-user/test-repo/-/merge_requests/42",
					"source_branch": "test-branch",
					"target_branch": "main",
					"sha":           "commit-sha-new",
					"created_at":    "2025-01-01T00:00:00Z",
					"updated_at":    "2025-01-01T00:00:00Z",
				},
			})
		}
	})

	// GET /api/v4/projects/1/merge_requests/42 — GetPullRequest
	mux.HandleFunc("/api/v4/projects/1/merge_requests/42", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/json")
		json.NewEncoder(w).Encode(map[string]interface{}{
			"iid":           42,
			"title":         "Test MR",
			"description":   "Test body",
			"state":         "opened",
			"web_url":       "https://gitlab.com/test-user/test-repo/-/merge_requests/42",
			"source_branch": "test-branch",
			"target_branch": "main",
			"sha":           "commit-sha-new",
			"created_at":    "2025-01-01T00:00:00Z",
			"updated_at":    "2025-01-01T00:00:00Z",
		})
	})

	// GET /api/v4/projects/1/repository/archive.tar.gz — FetchRepository
	mux.HandleFunc("/api/v4/projects/1/repository/archive.tar.gz", func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Content-Type", "application/gzip")
		w.WriteHeader(http.StatusOK)
		w.Write([]byte("fake-tar-gz-content"))
	})

	// (DeleteBranch handler is merged into the repository/branches/test-branch handler above)

	// PUT /api/v4/projects/1/merge_requests/42/merge — MergePullRequest
	mux.HandleFunc("/api/v4/projects/1/merge_requests/42/merge", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPut {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusOK)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":       42,
				"state":    "merged",
				"title":    "Test MR",
			})
			return
		}
	})

	// POST /api/v4/projects/1/merge_requests/42/notes — AddPullRequestComment
	mux.HandleFunc("/api/v4/projects/1/merge_requests/42/notes", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":   1,
				"body": "comment text",
			})
			return
		}
	})

	// POST /api/v4/projects/1/hooks — CreateWebhook
	// DELETE /api/v4/projects/1/hooks/99 — DeleteWebhook
	mux.HandleFunc("/api/v4/projects/1/hooks", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodPost {
			w.Header().Set("Content-Type", "application/json")
			w.WriteHeader(http.StatusCreated)
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id": 99,
				"url": "https://example.com/hook",
			})
			return
		}
	})

	// DELETE /api/v4/projects/1/hooks/99 — DeleteWebhook
	mux.HandleFunc("/api/v4/projects/1/hooks/99", func(w http.ResponseWriter, r *http.Request) {
		if r.Method == http.MethodDelete {
			w.WriteHeader(http.StatusNoContent)
			return
		}
	})

	return mux
}

// ─── Test helpers ──────────────────────────────────────────────────────────

// newTestProvider creates a GitLabProvider pointed at the given test server URL
// without calling ValidateToken (which would require a real server).
func newTestProvider(baseURL string) *GitLabProvider {
	return &GitLabProvider{
		client:  &http.Client{},
		logger:  slog.Default().With("provider", "gitlab"),
		config:  janitor.GitProviderConfig{Provider: "gitlab", Token: "test-token"},
		baseURL: baseURL + "/api/v4",
	}
}

// ─── Provider metadata tests ───────────────────────────────────────────────

func TestNewGitLabProvider_MissingToken(t *testing.T) {
	_, err := NewGitLabProvider(janitor.GitProviderConfig{
		Provider: "gitlab",
		Token:    "",
	})
	if err == nil {
		t.Fatal("expected error for missing token, got nil")
	}
}

func TestNewGitLabProvider_ValidateCalled(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	// Manually validate to test the happy path.
	if err := provider.ValidateToken(context.Background()); err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
}

func TestGitLabProvider_Name(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	if name := provider.Name(); name != "gitlab" {
		t.Errorf("expected 'gitlab', got %q", name)
	}
}

func TestGitLabProvider_Scopes(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	scopes := provider.Scopes()
	if len(scopes) == 0 {
		t.Fatal("expected non-empty scopes")
	}
}

// ─── Authentication tests ──────────────────────────────────────────────────

func TestGitLabProvider_ValidateToken(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	if err := provider.ValidateToken(context.Background()); err != nil {
		t.Fatalf("ValidateToken failed: %v", err)
	}
}

func TestGitLabProvider_ValidateToken_Invalid(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.URL.Path == "/api/v4/user" {
			w.WriteHeader(http.StatusUnauthorized)
			json.NewEncoder(w).Encode(map[string]string{"message": "401 Unauthorized"})
			return
		}
	}))
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	err := provider.ValidateToken(context.Background())
	if err == nil {
		t.Fatal("expected error for invalid token, got nil")
	}
	if !errors.Is(err, domain.ErrValidation) {
		t.Errorf("expected validation error, got %v", err)
	}
}

func TestGitLabProvider_RefreshToken(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	// RefreshToken is a no-op for PATs; should not return an error.
	if err := provider.RefreshToken(context.Background()); err != nil {
		t.Fatalf("RefreshToken failed: %v", err)
	}
}

// ─── Repository operation tests ────────────────────────────────────────────

func TestGitLabProvider_FetchRepository(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	data, err := provider.FetchRepository(context.Background(), "1", "main")
	if err != nil {
		t.Fatalf("FetchRepository failed: %v", err)
	}

	expected := "fake-tar-gz-content"
	if string(data) != expected {
		t.Errorf("expected %q, got %q", expected, string(data))
	}
}

func TestGitLabProvider_ListRepositories(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

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
	if repos[0].CloneURL != "https://gitlab.com/test-user/test-repo.git" {
		t.Errorf("expected 'https://gitlab.com/test-user/test-repo.git', got %q", repos[0].CloneURL)
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

func TestGitLabProvider_GetFileContents(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	content, err := provider.GetFileContents(context.Background(), "1", "test.go", "main")
	if err != nil {
		t.Fatalf("GetFileContents failed: %v", err)
	}

	expected := "test content"
	if string(content) != expected {
		t.Errorf("expected %q, got %q", expected, string(content))
	}
}

func TestGitLabProvider_GetFileContents_PathRepo(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	// Test with URL-encoded path-style repo.
	content, err := provider.GetFileContents(context.Background(), "test-user/test-repo", "test.go", "main")
	if err != nil {
		t.Fatalf("GetFileContents failed with path repo: %v", err)
	}

	expected := "test content"
	if string(content) != expected {
		t.Errorf("expected %q, got %q", expected, string(content))
	}
}

func TestGitLabProvider_ListFiles(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	files, err := provider.ListFiles(context.Background(), "1", "src", "main")
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

func TestGitLabProvider_ListFiles_Root(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	files, err := provider.ListFiles(context.Background(), "1", "", "main")
	if err != nil {
		t.Fatalf("ListFiles(root) failed: %v", err)
	}

	// All blob entries (excluding tree entries like "docs")
	if len(files) != 4 {
		t.Fatalf("expected 4 files at root, got %d: %v", len(files), files)
	}
}

// ─── Branch operation tests ────────────────────────────────────────────────

func TestGitLabProvider_BranchExists(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	exists, err := provider.BranchExists(context.Background(), "1", "main")
	if err != nil {
		t.Fatalf("BranchExists failed: %v", err)
	}
	if !exists {
		t.Error("expected 'main' branch to exist")
	}
}

func TestGitLabProvider_BranchExists_NotFound(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	exists, err := provider.BranchExists(context.Background(), "1", "nonexistent")
	if err != nil {
		t.Fatalf("BranchExists failed: %v", err)
	}
	if exists {
		t.Error("expected 'nonexistent' branch to not exist")
	}
}

func TestGitLabProvider_CreateBranch(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	if err := provider.CreateBranch(context.Background(), "1", "new-branch", "main"); err != nil {
		t.Fatalf("CreateBranch failed: %v", err)
	}
}

// ─── Commit / MR tests ─────────────────────────────────────────────────────

func TestGitLabProvider_CommitFiles(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	if err := provider.CommitFiles(context.Background(), "1", "test-branch", "test commit", []janitor.FileChange{
		{Path: "newfile.go", Content: []byte("package main\n"), Mode: "create"},
	}); err != nil {
		t.Fatalf("CommitFiles failed: %v", err)
	}
}

func TestGitLabProvider_CommitFiles_EmptyChanges(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	if err := provider.CommitFiles(context.Background(), "1", "test-branch", "empty commit", nil); err != nil {
		t.Fatalf("CommitFiles with nil changes failed: %v", err)
	}
}

func TestGitLabProvider_CreatePullRequest(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	pr, err := provider.CreatePullRequest(context.Background(), "1", "test-branch", "Test MR", "Test body", []janitor.FileChange{
		{Path: "newfile.go", Content: []byte("package main\n"), Mode: "create"},
	})
	if err != nil {
		t.Fatalf("CreatePullRequest failed: %v", err)
	}

	if pr.Number != 42 {
		t.Errorf("expected MR number 42, got %d", pr.Number)
	}
	if pr.Title != "Test MR" {
		t.Errorf("expected title 'Test MR', got %q", pr.Title)
	}
	if pr.State != "opened" {
		t.Errorf("expected state 'opened', got %q", pr.State)
	}
	if pr.Branch != "test-branch" {
		t.Errorf("expected branch 'test-branch', got %q", pr.Branch)
	}
	if pr.BaseBranch != "main" {
		t.Errorf("expected base branch 'main', got %q", pr.BaseBranch)
	}
}

func TestGitLabProvider_GetPullRequest(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	pr, err := provider.GetPullRequest(context.Background(), "1", 42)
	if err != nil {
		t.Fatalf("GetPullRequest failed: %v", err)
	}

	if pr.Number != 42 {
		t.Errorf("expected MR number 42, got %d", pr.Number)
	}
	if pr.State != "opened" {
		t.Errorf("expected state 'opened', got %q", pr.State)
	}
	if pr.URL != "https://gitlab.com/test-user/test-repo/-/merge_requests/42" {
		t.Errorf("unexpected URL: %q", pr.URL)
	}
}

func TestGitLabProvider_ListPullRequests(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	prs, err := provider.ListPullRequests(context.Background(), "1", "opened")
	if err != nil {
		t.Fatalf("ListPullRequests failed: %v", err)
	}

	if len(prs) != 1 {
		t.Fatalf("expected 1 MR, got %d", len(prs))
	}
	if prs[0].Number != 42 {
		t.Errorf("expected MR number 42, got %d", prs[0].Number)
	}
}

// ─── Not implemented tests ─────────────────────────────────────────────────

func TestGitLabProvider_UpdatePullRequest(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	err := provider.UpdatePullRequest(context.Background(), "1", 42, []janitor.FileChange{
		{Path: "updated.go", Content: []byte("package main\n"), Mode: "modify"},
	})
	if err != nil {
		t.Fatalf("UpdatePullRequest failed: %v", err)
	}
}

func TestGitLabProvider_MergePullRequest(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	err := provider.MergePullRequest(context.Background(), "1", 42)
	if err != nil {
		t.Fatalf("MergePullRequest failed: %v", err)
	}
}

func TestGitLabProvider_MergePullRequest_Conflict(t *testing.T) {
	ts := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		switch {
		case r.URL.Path == "/api/v4/user" && r.Method == http.MethodGet:
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":       12345,
				"username": "test-user",
			})
		case r.URL.Path == "/api/v4/projects/1" && r.Method == http.MethodGet:
			w.Header().Set("Content-Type", "application/json")
			json.NewEncoder(w).Encode(map[string]interface{}{
				"id":                  1,
				"name":                "test-repo",
				"path_with_namespace": "test-user/test-repo",
				"http_url_to_repo":    "https://gitlab.com/test-user/test-repo.git",
				"web_url":             "https://gitlab.com/test-user/test-repo",
				"default_branch":      "main",
				"visibility":          "public",
			})
		case r.URL.Path == "/api/v4/projects/1/merge_requests/42/merge" && r.Method == http.MethodPut:
			w.WriteHeader(http.StatusConflict)
			json.NewEncoder(w).Encode(map[string]string{"message": "409 Conflict: Merge request has conflicts"})
		default:
			http.Error(w, "not found", http.StatusNotFound)
		}
	}))
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	err := provider.MergePullRequest(context.Background(), "1", 42)
	if err == nil {
		t.Fatal("expected conflict error, got nil")
	}
	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict, got %v", err)
	}
}

func TestGitLabProvider_AddPullRequestComment(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	err := provider.AddPullRequestComment(context.Background(), "1", 42, "comment text")
	if err != nil {
		t.Fatalf("AddPullRequestComment failed: %v", err)
	}
}

func TestGitLabProvider_CreateWebhook(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	hookID, err := provider.CreateWebhook(context.Background(), "1", "https://example.com/hook", "secret", []string{"push_events"})
	if err != nil {
		t.Fatalf("CreateWebhook failed: %v", err)
	}

	if hookID != "99" {
		t.Errorf("expected hook ID '99', got %q", hookID)
	}
}

func TestGitLabProvider_DeleteWebhook(t *testing.T) {
	ts := httptest.NewServer(testHandler())
	defer ts.Close()

	provider := newTestProvider(ts.URL)

	err := provider.DeleteWebhook(context.Background(), "1", "99")
	if err != nil {
		t.Fatalf("DeleteWebhook failed: %v", err)
	}
}

// ─── Helper tests ──────────────────────────────────────────────────────────

func TestRepoPath_Numeric(t *testing.T) {
	result := repoPath("123")
	if result != "123" {
		t.Errorf("expected '123', got %q", result)
	}
}

func TestRepoPath_Path(t *testing.T) {
	result := repoPath("group/project")
	if result != "group%2Fproject" {
		t.Errorf("expected 'group%%2Fproject', got %q", result)
	}
}

func TestEncodeFilePath(t *testing.T) {
	path := "src/main.go"
	encoded := encodeFilePath(path)

	// url.PathEscape encodes "/" as "%2F" for safe inclusion in URL paths.
	expected := "src%2Fmain.go"
	if encoded != expected {
		t.Errorf("expected %q, got %q", expected, encoded)
	}
}

// ─── Error mapping tests ───────────────────────────────────────────────────

func TestMapError_NotFound(t *testing.T) {
	err := mapError(http.StatusNotFound, "test")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, domain.ErrNotFound) {
		t.Errorf("expected ErrNotFound, got %v", err)
	}
}

func TestMapError_Conflict(t *testing.T) {
	err := mapError(http.StatusConflict, "test")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, domain.ErrConflict) {
		t.Errorf("expected ErrConflict, got %v", err)
	}
}

func TestMapError_Unauthorized(t *testing.T) {
	err := mapError(http.StatusUnauthorized, "test")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, domain.ErrValidation) {
		t.Errorf("expected validation error, got %v", err)
	}
}

func TestMapError_Forbidden(t *testing.T) {
	err := mapError(http.StatusForbidden, "test")
	if err == nil {
		t.Fatal("expected error, got nil")
	}
	if !errors.Is(err, domain.ErrValidation) {
		t.Errorf("expected validation error, got %v", err)
	}
}