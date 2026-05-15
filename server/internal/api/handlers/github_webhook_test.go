package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"log/slog"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store"
)

// ─── Mock Stores for Webhook Tests ──────────────────────────────────────────

type mockJanitorStore struct {
	repos []store.JanitorRepository
	scans []store.JanitorScan
	prs   []store.JanitorPR
}

func (m *mockJanitorStore) GetJanitorConfig(ctx context.Context, orgID string) (*store.JanitorConfig, error) {
	return nil, domain.ErrNotFound
}
func (m *mockJanitorStore) UpsertJanitorConfig(ctx context.Context, config *store.JanitorConfig) error {
	return nil
}
func (m *mockJanitorStore) ListRepositories(ctx context.Context, orgID string, limit, offset int) ([]store.JanitorRepository, error) {
	return m.repos, nil
}
func (m *mockJanitorStore) CountRepositories(ctx context.Context, orgID string) (int, error) {
	return len(m.repos), nil
}
func (m *mockJanitorStore) GetRepository(ctx context.Context, id string) (*store.JanitorRepository, error) {
	for _, r := range m.repos {
		if r.ID == id {
			return &r, nil
		}
	}
	return nil, domain.ErrNotFound
}
func (m *mockJanitorStore) ConnectRepository(ctx context.Context, repo *store.JanitorRepository) error {
	m.repos = append(m.repos, *repo)
	return nil
}
func (m *mockJanitorStore) DisconnectRepository(ctx context.Context, orgID, id string) error {
	return nil
}
func (m *mockJanitorStore) UpdateRepositoryLastScanned(ctx context.Context, id string, t time.Time) error {
	return nil
}
func (m *mockJanitorStore) CreateScan(ctx context.Context, scan *store.JanitorScan) error {
	m.scans = append(m.scans, *scan)
	return nil
}
func (m *mockJanitorStore) UpdateScan(ctx context.Context, id string, updates map[string]interface{}) error {
	return nil
}
func (m *mockJanitorStore) GetScan(ctx context.Context, id string) (*store.JanitorScan, error) {
	return nil, domain.ErrNotFound
}
func (m *mockJanitorStore) ListScans(ctx context.Context, orgID string, limit, offset int) ([]store.JanitorScan, error) {
	return m.scans, nil
}
func (m *mockJanitorStore) CountScans(ctx context.Context, orgID string) (int, error) {
	return len(m.scans), nil
}
func (m *mockJanitorStore) AppendScanEvent(ctx context.Context, event *store.ScanEventRecord) error {
	return nil
}
func (m *mockJanitorStore) GetScanEventsSince(ctx context.Context, scanID string, afterID int64) ([]store.ScanEventRecord, error) {
	return nil, nil
}
func (m *mockJanitorStore) ListStaleFlags(ctx context.Context, orgID string, dismissed *bool, limit, offset int) ([]store.StaleFlag, error) {
	return nil, nil
}
func (m *mockJanitorStore) CountStaleFlags(ctx context.Context, orgID string, dismissed *bool) (int, error) {
	return 0, nil
}
func (m *mockJanitorStore) GetStaleFlag(ctx context.Context, id string) (*store.StaleFlag, error) {
	return nil, domain.ErrNotFound
}
func (m *mockJanitorStore) UpsertStaleFlag(ctx context.Context, flag *store.StaleFlag) error {
	return nil
}
func (m *mockJanitorStore) DismissStaleFlag(ctx context.Context, orgID, flagKey, reason string) error {
	return nil
}
func (m *mockJanitorStore) CreateJanitorPR(ctx context.Context, pr *store.JanitorPR) error {
	m.prs = append(m.prs, *pr)
	return nil
}
func (m *mockJanitorStore) UpdateJanitorPR(ctx context.Context, id string, updates map[string]interface{}) error {
	return nil
}
func (m *mockJanitorStore) ListJanitorPRs(ctx context.Context, orgID string, status string, limit, offset int) ([]store.JanitorPR, error) {
	return m.prs, nil
}
func (m *mockJanitorStore) CountJanitorPRs(ctx context.Context, orgID string, status string) (int, error) {
	return len(m.prs), nil
}

// ─── mockWebhookStore implements both reader and writer for webhook tests. ──

type mockWebhookStore struct {
	scanResults    []domain.ScanResult
	generatedFlags []domain.GeneratedFlag
	cleanupEntries []domain.CleanupEntry
}

func (m *mockWebhookStore) CreateScanResult(ctx context.Context, sr *domain.ScanResult) error {
	m.scanResults = append(m.scanResults, *sr)
	return nil
}
func (m *mockWebhookStore) BatchCreateScanResults(ctx context.Context, results []domain.ScanResult) error {
	m.scanResults = append(m.scanResults, results...)
	return nil
}
func (m *mockWebhookStore) UpdateScanResult(ctx context.Context, id string, updates map[string]interface{}) error {
	return nil
}
func (m *mockWebhookStore) CreateGeneratedFlag(ctx context.Context, gf *domain.GeneratedFlag) error {
	m.generatedFlags = append(m.generatedFlags, *gf)
	return nil
}
func (m *mockWebhookStore) UpdateGeneratedFlag(ctx context.Context, id string, updates map[string]interface{}) error {
	for i, gf := range m.generatedFlags {
		if gf.ID == id {
			if prURL, ok := updates["pr_url"].(string); ok {
				m.generatedFlags[i].PRURL = prURL
			}
			if status, ok := updates["status"].(string); ok {
				m.generatedFlags[i].Status = status
			}
			return nil
		}
	}
	return domain.ErrNotFound
}
func (m *mockWebhookStore) CreateCleanupEntry(ctx context.Context, ce *domain.CleanupEntry) error {
	m.cleanupEntries = append(m.cleanupEntries, *ce)
	return nil
}
func (m *mockWebhookStore) UpdateCleanupEntry(ctx context.Context, id string, updates map[string]interface{}) error {
	return nil
}
func (m *mockWebhookStore) DeleteCleanupEntry(ctx context.Context, id string) error {
	return nil
}

// Reader methods
func (m *mockWebhookStore) ListScanResults(ctx context.Context, orgID, projectID string, filter domain.ScanResultFilter, limit, offset int) ([]domain.ScanResult, error) {
	return m.scanResults, nil
}
func (m *mockWebhookStore) CountScanResults(ctx context.Context, orgID, projectID string, filter domain.ScanResultFilter) (int, error) {
	return len(m.scanResults), nil
}
func (m *mockWebhookStore) GetScanResult(ctx context.Context, id string) (*domain.ScanResult, error) {
	return nil, domain.ErrNotFound
}
func (m *mockWebhookStore) ListGeneratedFlags(ctx context.Context, orgID, projectID string, limit, offset int) ([]domain.GeneratedFlag, error) {
	return m.generatedFlags, nil
}
func (m *mockWebhookStore) CountGeneratedFlags(ctx context.Context, orgID, projectID string) (int, error) {
	return len(m.generatedFlags), nil
}
func (m *mockWebhookStore) GetGeneratedFlag(ctx context.Context, id string) (*domain.GeneratedFlag, error) {
	for _, gf := range m.generatedFlags {
		if gf.ID == id {
			return &gf, nil
		}
	}
	return nil, domain.ErrNotFound
}
func (m *mockWebhookStore) ListCleanupEntries(ctx context.Context, orgID string, filter domain.CleanupFilter, limit, offset int) ([]domain.CleanupEntry, error) {
	return m.cleanupEntries, nil
}
func (m *mockWebhookStore) CountCleanupEntries(ctx context.Context, orgID string, filter domain.CleanupFilter) (int, error) {
	return len(m.cleanupEntries), nil
}
func (m *mockWebhookStore) GetCleanupEntry(ctx context.Context, id string) (*domain.CleanupEntry, error) {
	return nil, domain.ErrNotFound
}

// ─── Helpers ────────────────────────────────────────────────────────────────

func makeSignature(secret string, body []byte) string {
	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	return "sha256=" + hex.EncodeToString(mac.Sum(nil))
}

func makeWebhookHandler() (*GitHubWebhookHandler, *mockJanitorStore, *mockWebhookStore) {
	janitorStore := &mockJanitorStore{
		repos: []store.JanitorRepository{
			{
				ID:             "repo-1",
				OrgID:          "org-1",
				Provider:       "github",
				ProviderRepoID: "123456",
				Name:           "myapp",
				FullName:       "myorg/myapp",
				DefaultBranch:  "main",
				Connected:      true,
			},
		},
	}
	c2fStore := &mockWebhookStore{}
	handler := &GitHubWebhookHandler{
		tokenEncryptor:  nil,
		janitorStore:    janitorStore,
		code2flagReader: c2fStore,
		code2flagWriter: c2fStore,
		logger:          slog.Default(),
		idempotency:     make(map[string]time.Time),
	}
	return handler, janitorStore, c2fStore
}

// ─── Tests ──────────────────────────────────────────────────────────────────

func TestGitHubWebhookHandler_ValidSignature(t *testing.T) {
	t.Parallel()

	handler, janitorStore, _ := makeWebhookHandler()
	janitorStore.repos[0].EncryptedToken = "test-secret"

	payload := `{"repository":{"full_name":"myorg/myapp"},"ref":"refs/heads/main","head_commit":null}`
	body := []byte(payload)

	req := httptest.NewRequest(http.MethodPost, "/v1/hooks/github", strings.NewReader(payload))
	req.Header.Set("X-Hub-Signature-256", makeSignature("test-secret", body))
	req.Header.Set("X-GitHub-Event", "push")
	req.Header.Set("X-GitHub-Delivery", "delivery-001")

	w := httptest.NewRecorder()
	handler.Handle(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("expected status 200, got %d: %s", w.Code, w.Body.String())
	}
}

func TestGitHubWebhookHandler_InvalidSignature(t *testing.T) {
	t.Parallel()

	handler, janitorStore, _ := makeWebhookHandler()
	janitorStore.repos[0].EncryptedToken = "test-secret"

	payload := `{"repository":{"full_name":"myorg/myapp"}}`

	req := httptest.NewRequest(http.MethodPost, "/v1/hooks/github", strings.NewReader(payload))
	req.Header.Set("X-Hub-Signature-256", "sha256=badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbad")
	req.Header.Set("X-GitHub-Event", "push")
	req.Header.Set("X-GitHub-Delivery", "delivery-002")

	w := httptest.NewRecorder()
	handler.Handle(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401 for invalid signature, got %d", w.Code)
	}
}

func TestGitHubWebhookHandler_MissingSignature(t *testing.T) {
	t.Parallel()

	handler, _, _ := makeWebhookHandler()

	payload := `{"repository":{"full_name":"myorg/myapp"}}`

	req := httptest.NewRequest(http.MethodPost, "/v1/hooks/github", strings.NewReader(payload))
	req.Header.Set("X-GitHub-Event", "push")
	req.Header.Set("X-GitHub-Delivery", "delivery-003")

	w := httptest.NewRecorder()
	handler.Handle(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected status 401 for missing signature, got %d", w.Code)
	}
}

func TestGitHubWebhookHandler_DuplicateDelivery(t *testing.T) {
	t.Parallel()

	handler, janitorStore, _ := makeWebhookHandler()
	janitorStore.repos[0].EncryptedToken = "test-secret"

	payload := `{"repository":{"full_name":"myorg/myapp"}}`
	body := []byte(payload)

	req1 := httptest.NewRequest(http.MethodPost, "/v1/hooks/github", strings.NewReader(payload))
	req1.Header.Set("X-Hub-Signature-256", makeSignature("test-secret", body))
	req1.Header.Set("X-GitHub-Event", "push")
	req1.Header.Set("X-GitHub-Delivery", "dup-001")

	w1 := httptest.NewRecorder()
	handler.Handle(w1, req1)
	if w1.Code != http.StatusOK {
		t.Errorf("first delivery: expected 200, got %d: %s", w1.Code, w1.Body.String())
	}

	// Create a fresh request with the same delivery ID.
	req2 := httptest.NewRequest(http.MethodPost, "/v1/hooks/github", strings.NewReader(payload))
	req2.Header.Set("X-Hub-Signature-256", makeSignature("test-secret", body))
	req2.Header.Set("X-GitHub-Event", "push")
	req2.Header.Set("X-GitHub-Delivery", "dup-001")

	w2 := httptest.NewRecorder()
	handler.Handle(w2, req2)
	if w2.Code != http.StatusOK {
		t.Errorf("duplicate delivery: expected 200, got %d: %s", w2.Code, w2.Body.String())
	}

	var resp map[string]interface{}
	if err := json.NewDecoder(w2.Body).Decode(&resp); err != nil {
		t.Fatalf("failed to decode response: %v", err)
	}
	if resp["status"] != "already_processed" {
		t.Errorf("expected already_processed status, got %q", resp["status"])
	}
}

func TestGitHubWebhookHandler_NoSecretConfigured(t *testing.T) {
	t.Parallel()

	handler, _, _ := makeWebhookHandler()
	// repos[0] has no EncryptedToken

	payload := `{"repository":{"full_name":"myorg/myapp"}}`
	body := []byte(payload)

	req := httptest.NewRequest(http.MethodPost, "/v1/hooks/github", strings.NewReader(payload))
	req.Header.Set("X-Hub-Signature-256", makeSignature("wrong-secret", body))
	req.Header.Set("X-GitHub-Event", "push")
	req.Header.Set("X-GitHub-Delivery", "delivery-004")

	w := httptest.NewRecorder()
	handler.Handle(w, req)

	if w.Code != http.StatusUnauthorized {
		t.Errorf("expected 401 when no webhook secret configured, got %d", w.Code)
	}
}
