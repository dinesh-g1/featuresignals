// Package handlers provides HTTP handlers for the FeatureSignals API.
//
// GitHubWebhookHandler processes incoming GitHub webhooks for push and pull_request
// events. It verifies HMAC-SHA256 signatures, enforces idempotency, and dispatches
// work asynchronously to avoid blocking the GitHub delivery.
//
// Requirements addressed:
//
//	FS-S0-INT-001-WH-01 — HMAC-SHA256 webhook verification
//	FS-S0-INT-001-WH-02 — Idempotent webhook handling
package handlers

import (
	"context"
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log/slog"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/httputil"
	"github.com/featuresignals/server/internal/janitor"
	"github.com/featuresignals/server/internal/store"
)

// ─── GitHubWebhookHandler ──────────────────────────────────────────────────

// GitHubWebhookHandler processes incoming GitHub webhook events. It verifies
// HMAC-SHA256 signatures, ensures idempotent processing via delivery ID tracking,
// and dispatches work asynchronously.
//
// Single endpoint: POST /v1/hooks/github
//
// This handler sits on a public route (no JWT) because GitHub calls it.
// Security is enforced via webhook secret verification.
type GitHubWebhookHandler struct {
	tokenEncryptor  *janitor.TokenEncryptor
	janitorStore    store.JanitorStore
	code2flagReader domain.Code2FlagReader
	code2flagWriter domain.Code2FlagWriter
	logger          *slog.Logger

	idempotency   map[string]time.Time
	idempotencyMu sync.RWMutex
}

// NewGitHubWebhookHandler creates a GitHubWebhookHandler with the required dependencies.
func NewGitHubWebhookHandler(
	tokenEncryptor *janitor.TokenEncryptor,
	janitorStore store.JanitorStore,
	code2flagReader domain.Code2FlagReader,
	code2flagWriter domain.Code2FlagWriter,
	logger *slog.Logger,
) *GitHubWebhookHandler {
	if logger == nil {
		logger = slog.Default()
	}
	h := &GitHubWebhookHandler{
		tokenEncryptor:  tokenEncryptor,
		janitorStore:    janitorStore,
		code2flagReader: code2flagReader,
		code2flagWriter: code2flagWriter,
		logger:          logger.With("handler", "github_webhook"),
		idempotency:     make(map[string]time.Time),
	}
	return h
}

// ─── Handle (POST /v1/hooks/github) ────────────────────────────────────────

// Handle processes a GitHub webhook delivery. It verifies the HMAC-SHA256
// signature, checks idempotency, and dispatches event processing asynchronously.
// It always returns 200 quickly — GitHub requires a timely response.
func (h *GitHubWebhookHandler) Handle(w http.ResponseWriter, r *http.Request) {
	logger := h.logger.With("method", "Handle")

	// Step 1: Read headers.
	signature := r.Header.Get("X-Hub-Signature-256")
	eventType := r.Header.Get("X-GitHub-Event")
	deliveryID := r.Header.Get("X-GitHub-Delivery")

	if signature == "" {
		logger.Warn("missing X-Hub-Signature-256 header")
		httputil.Error(w, http.StatusUnauthorized, "missing signature header")
		return
	}
	if eventType == "" {
		logger.Warn("missing X-GitHub-Event header")
		httputil.Error(w, http.StatusBadRequest, "missing event type header")
		return
	}
	if deliveryID == "" {
		logger.Warn("missing X-GitHub-Delivery header")
		httputil.Error(w, http.StatusBadRequest, "missing delivery ID header")
		return
	}

	// Step 2: Read body (1MB limit).
	body, err := io.ReadAll(io.LimitReader(r.Body, 1<<20))
	if err != nil {
		logger.Error("failed to read request body", "error", err)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}

	// Step 3: Extract repository to look up webhook secret.
	var payload struct {
		Repository *struct {
			FullName string `json:"full_name"`
		} `json:"repository"`
	}
	if err := json.Unmarshal(body, &payload); err != nil {
		logger.Warn("failed to parse webhook payload", "error", err)
		httputil.Error(w, http.StatusBadRequest, "invalid JSON payload")
		return
	}

	repoFullName := ""
	if payload.Repository != nil {
		repoFullName = payload.Repository.FullName
	}

	// Look up webhook secret for this repository.
	webhookSecret, err := h.lookupWebhookSecret(r.Context(), repoFullName)
	if err != nil {
		logger.Warn("failed to lookup webhook secret", "error", err, "repo", repoFullName)
		httputil.Error(w, http.StatusInternalServerError, "internal error")
		return
	}
	if webhookSecret == "" {
		logger.Warn("no webhook secret configured for repository",
			"repo", repoFullName, "delivery", deliveryID)
		httputil.Error(w, http.StatusUnauthorized, "webhook not configured for this repository")
		return
	}

	// Step 4: Verify HMAC-SHA256 signature (MUST happen before any other processing).
	if !h.verifySignature(webhookSecret, body, signature) {
		logger.Warn("invalid webhook signature",
			"delivery", deliveryID,
			"repo", repoFullName,
		)
		httputil.Error(w, http.StatusUnauthorized, "invalid signature")
		return
	}

	// Step 5: Idempotency check.
	if h.isDuplicate(deliveryID) {
		logger.Info("duplicate delivery, skipping",
			"delivery", deliveryID,
			"event", eventType,
		)
		httputil.JSON(w, http.StatusOK, map[string]string{"status": "already_processed"})
		return
	}
	h.markProcessed(deliveryID)

	logger.Info("webhook received",
		"event", eventType,
		"delivery", deliveryID,
		"repo", repoFullName,
	)

	// Step 6: Dispatch processing asynchronously.
	go h.processEvent(eventType, repoFullName, body)

	// Step 7: Acknowledge immediately (< 500ms target).
	httputil.JSON(w, http.StatusOK, map[string]string{"status": "accepted"})
}

// ─── Signature Verification ────────────────────────────────────────────────

// verifySignature checks the HMAC-SHA256 signature against the webhook secret.
func (h *GitHubWebhookHandler) verifySignature(secret string, body []byte, signature string) bool {
	if !strings.HasPrefix(signature, "sha256=") {
		return false
	}

	sigBytes, err := hex.DecodeString(strings.TrimPrefix(signature, "sha256="))
	if err != nil {
		return false
	}

	mac := hmac.New(sha256.New, []byte(secret))
	mac.Write(body)
	expected := mac.Sum(nil)

	return hmac.Equal(sigBytes, expected)
}

// ─── Webhook Secret Lookup ─────────────────────────────────────────────────

// lookupWebhookSecret finds the webhook secret for a repository by matching
// the repository full name against connected janitor repositories.
func (h *GitHubWebhookHandler) lookupWebhookSecret(ctx context.Context, repoFullName string) (string, error) {
	if repoFullName == "" {
		return "", nil
	}

	repos, err := h.janitorStore.ListRepositories(ctx, "", 200, 0)
	if err != nil {
		return "", fmt.Errorf("listing repositories: %w", err)
	}

	for _, repo := range repos {
		if !repo.Connected {
			continue
		}
		if repo.FullName == repoFullName && repo.Provider == "github" {
			if repo.EncryptedToken == "" {
				return "", nil
			}
			if h.tokenEncryptor != nil {
				secret, err := h.tokenEncryptor.Decrypt(repo.EncryptedToken)
				if err != nil {
					h.logger.Warn("failed to decrypt token for webhook secret",
						"repo", repoFullName, "error", err)
					return "", nil
				}
				return secret, nil
			}
			return repo.EncryptedToken, nil
		}
	}

	return "", nil
}

// ─── Idempotency ───────────────────────────────────────────────────────────

func (h *GitHubWebhookHandler) isDuplicate(deliveryID string) bool {
	h.idempotencyMu.RLock()
	defer h.idempotencyMu.RUnlock()
	_, exists := h.idempotency[deliveryID]
	return exists
}

func (h *GitHubWebhookHandler) markProcessed(deliveryID string) {
	h.idempotencyMu.Lock()
	defer h.idempotencyMu.Unlock()
	h.idempotency[deliveryID] = time.Now().UTC()
}

func (h *GitHubWebhookHandler) reapExpiredDeliveries() {
	ticker := time.NewTicker(30 * time.Minute)
	defer ticker.Stop()
	for range ticker.C {
		h.reapOnce()
	}
}

func (h *GitHubWebhookHandler) reapOnce() {
	h.idempotencyMu.Lock()
	defer h.idempotencyMu.Unlock()
	cutoff := time.Now().UTC().Add(-24 * time.Hour)
	for id, ts := range h.idempotency {
		if ts.Before(cutoff) {
			delete(h.idempotency, id)
		}
	}
}

// ─── Event Processing ──────────────────────────────────────────────────────

// processEvent dispatches webhook events to the appropriate handler.
// Runs in a background goroutine with its own context and 30s timeout.
func (h *GitHubWebhookHandler) processEvent(eventType, repoFullName string, body []byte) {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Second)
	defer cancel()

	logger := h.logger.With("event", eventType, "repo", repoFullName)

	switch eventType {
	case "push":
		h.handlePushEvent(ctx, body, logger)
	case "pull_request":
		h.handlePullRequestEvent(ctx, body, logger)
	default:
		logger.Debug("unhandled event type, skipping")
	}
}

// ─── Push Event ────────────────────────────────────────────────────────────

type githubPushPayload struct {
	Ref        string `json:"ref"`
	Repository *struct {
		FullName string `json:"full_name"`
	} `json:"repository"`
	HeadCommit *struct {
		ID       string   `json:"id"`
		Added    []string `json:"added"`
		Removed  []string `json:"removed"`
		Modified []string `json:"modified"`
	} `json:"head_commit"`
}

func (h *GitHubWebhookHandler) handlePushEvent(ctx context.Context, body []byte, logger *slog.Logger) {
	var payload githubPushPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		logger.Warn("failed to parse push payload", "error", err)
		return
	}

	if payload.Repository == nil || payload.HeadCommit == nil {
		logger.Info("push event missing repository or head_commit", "ref", payload.Ref)
		return
	}

	repoFullName := payload.Repository.FullName
	commitID := payload.HeadCommit.ID

	changedFiles := append([]string{}, payload.HeadCommit.Added...)
	changedFiles = append(changedFiles, payload.HeadCommit.Modified...)

	if len(changedFiles) == 0 {
		logger.Info("push event has no changed files", "repo", repoFullName, "commit", commitID)
		return
	}

	orgID, err := h.findOrgForRepo(ctx, repoFullName)
	if err != nil {
		logger.Warn("could not find org for repository", "repo", repoFullName, "error", err)
		return
	}
	if orgID == "" {
		logger.Info("repository not connected to any org", "repo", repoFullName)
		return
	}

	now := time.Now().UTC()
	var results []domain.ScanResult
	for _, filePath := range changedFiles {
		results = append(results, domain.ScanResult{
			ID:              uuid.NewString(),
			OrgID:           orgID,
			ProjectID:       "",
			Repository:      repoFullName,
			FilePath:        filePath,
			LineNumber:      0,
			ConditionalType: domain.ConditionalTypeIfStatement,
			ConditionalText: "",
			Confidence:      0.5,
			Status:          domain.ScanResultStatusUnreviewed,
			ScanJobID:       commitID,
			CreatedAt:       now,
			UpdatedAt:       now,
		})
	}

	if len(results) > 0 {
		if err := h.code2flagWriter.BatchCreateScanResults(ctx, results); err != nil {
			logger.Error("failed to persist scan results from webhook",
				"error", err, "repo", repoFullName, "files", len(results), "commit", commitID)
			return
		}
		logger.Info("persisted scan results from webhook",
			"repo", repoFullName, "files", len(results), "commit", commitID)
	}
}

// ─── Pull Request Event ────────────────────────────────────────────────────

type githubPREventPayload struct {
	Action      string `json:"action"`
	PullRequest *struct {
		Number  int    `json:"number"`
		URL     string `json:"html_url"`
		Title   string `json:"title"`
		State   string `json:"state"`
		Merged  *bool  `json:"merged"`
		Head    *struct {
			Ref string `json:"ref"`
		} `json:"head"`
	} `json:"pull_request"`
	Repository *struct {
		FullName string `json:"full_name"`
	} `json:"repository"`
}

func (h *GitHubWebhookHandler) handlePullRequestEvent(ctx context.Context, body []byte, logger *slog.Logger) {
	var payload githubPREventPayload
	if err := json.Unmarshal(body, &payload); err != nil {
		logger.Warn("failed to parse pull_request payload", "error", err)
		return
	}

	if payload.PullRequest == nil || payload.Repository == nil {
		logger.Info("pull_request event missing pull_request or repository")
		return
	}

	prURL := payload.PullRequest.URL

	switch payload.Action {
	case "opened":
		if payload.PullRequest.Head != nil {
			branchName := payload.PullRequest.Head.Ref
			logger.Info("PR opened", "pr_url", prURL,
				"pr_number", payload.PullRequest.Number, "branch", branchName)
			h.updateGeneratedFlagByBranch(ctx, branchName, prURL,
				domain.GeneratedFlagStatusPRCreated, logger)
		}

	case "closed":
		newStatus := domain.GeneratedFlagStatusRejected
		if payload.PullRequest.Merged != nil && *payload.PullRequest.Merged {
			newStatus = domain.GeneratedFlagStatusFlagCreated
		}
		logger.Info("PR closed", "pr_url", prURL,
			"merged", payload.PullRequest.Merged, "new_status", newStatus)
		h.updateGeneratedFlagByPRURL(ctx, prURL, newStatus, logger)
	}
}

// ─── Helpers ────────────────────────────────────────────────────────────────

func (h *GitHubWebhookHandler) findOrgForRepo(ctx context.Context, repoFullName string) (string, error) {
	repos, err := h.janitorStore.ListRepositories(ctx, "", 200, 0)
	if err != nil {
		return "", err
	}
	for _, repo := range repos {
		if repo.FullName == repoFullName && repo.Connected {
			return repo.OrgID, nil
		}
	}
	return "", nil
}

func (h *GitHubWebhookHandler) updateGeneratedFlagByBranch(
	ctx context.Context, branchName, prURL, status string, logger *slog.Logger,
) {
	flagKey := strings.TrimPrefix(branchName, "fs/flag-")
	if flagKey == branchName || flagKey == "" {
		logger.Debug("branch does not match flag naming pattern", "branch", branchName)
		return
	}

	repos, err := h.janitorStore.ListRepositories(ctx, "", 200, 0)
	if err != nil {
		logger.Error("failed to list repositories", "error", err)
		return
	}

	for _, repo := range repos {
		if !repo.Connected {
			continue
		}
		gfs, gErr := h.code2flagReader.ListGeneratedFlags(ctx, repo.OrgID, "", 200, 0)
		if gErr != nil {
			logger.Error("failed to list generated flags", "error", gErr, "org_id", repo.OrgID)
			continue
		}
		for _, gf := range gfs {
			if gf.Key == flagKey && gf.Status == domain.GeneratedFlagStatusProposed {
				updates := map[string]interface{}{"pr_url": prURL, "status": status}
				if err := h.code2flagWriter.UpdateGeneratedFlag(ctx, gf.ID, updates); err != nil {
					logger.Error("failed to update generated flag", "error", err, "flag_id", gf.ID)
					continue
				}
				logger.Info("updated generated flag from webhook",
					"flag_key", flagKey, "pr_url", prURL, "status", status)
				return
			}
		}
	}
}

func (h *GitHubWebhookHandler) updateGeneratedFlagByPRURL(
	ctx context.Context, prURL, status string, logger *slog.Logger,
) {
	repos, err := h.janitorStore.ListRepositories(ctx, "", 200, 0)
	if err != nil {
		logger.Error("failed to list repositories", "error", err)
		return
	}

	for _, repo := range repos {
		if !repo.Connected {
			continue
		}
		gfs, gErr := h.code2flagReader.ListGeneratedFlags(ctx, repo.OrgID, "", 200, 0)
		if gErr != nil {
			logger.Error("failed to list generated flags", "error", gErr, "org_id", repo.OrgID)
			continue
		}
		for _, gf := range gfs {
			if gf.PRURL == prURL && gf.Status == domain.GeneratedFlagStatusPRCreated {
				updates := map[string]interface{}{"status": status}
				if err := h.code2flagWriter.UpdateGeneratedFlag(ctx, gf.ID, updates); err != nil {
					logger.Error("failed to update generated flag", "error", err, "flag_id", gf.ID)
					continue
				}
				logger.Info("updated generated flag PR status",
					"flag_key", gf.Key, "pr_url", prURL, "status", status)
				return
			}
		}
	}
}

// Error sentinels for webhook-related errors.
var (
	ErrInvalidSignature = errors.New("invalid webhook signature")
	ErrMissingSecret    = errors.New("webhook secret not configured")
)
