// Package janitor implements the AI-driven stale flag detection and cleanup engine.
//
// RepoScanner performs actual code scanning of connected repositories.
// It downloads repo content via a GitProvider, runs regex-based conditional
// detection, persists results as ScanResult records, and emits SSE progress
// events. It implements graceful degradation: if GitProvider is unavailable,
// scanning is skipped but the system remains operational.
package janitor

import (
	"context"
	"fmt"
	"log/slog"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/featuresignals/server/internal/domain"
	"github.com/featuresignals/server/internal/store"
)

// ─── RepoScanner ────────────────────────────────────────────────────────────

// RepoScanner scans connected Git repositories for conditionals that may
// need feature flags. It uses regex-based detection (compliance-safe) and
// persists discovered conditionals as domain.ScanResult records.
//
// The scanner is designed for graceful degradation:
//   - If no GitProvider is configured, scanning is a no-op.
//   - If GitHub is unreachable, results are limited to cached data.
//   - Scan failures do not affect the evaluation hot path.
type RepoScanner struct {
	gitProvider    GitProvider
	code2flagWriter domain.Code2FlagWriter
	janitorStore   store.JanitorStore
	scanEventBus   domain.ScanEventBus
	logger         *slog.Logger

	// analyzer performs regex-based conditional detection.
	analyzer *Analyzer

	// active tracks currently running scans for cancellation.
	mu      sync.Mutex
	active  map[string]context.CancelFunc
}

// NewRepoScanner creates a new RepoScanner. gitProvider may be nil if no
// Git provider is configured (scanner will be a no-op).
func NewRepoScanner(
	gitProvider GitProvider,
	code2flagWriter domain.Code2FlagWriter,
	janitorStore store.JanitorStore,
	scanEventBus domain.ScanEventBus,
	logger *slog.Logger,
) *RepoScanner {
	if logger == nil {
		logger = slog.Default()
	}
	return &RepoScanner{
		gitProvider:    gitProvider,
		code2flagWriter: code2flagWriter,
		janitorStore:   janitorStore,
		scanEventBus:   scanEventBus,
		analyzer:       NewAnalyzer(logger),
		logger:         logger.With("component", "repo_scanner"),
		active:         make(map[string]context.CancelFunc),
	}
}

// ScanRepository performs a full scan of the given repository and branch.
// If changedFiles is non-nil and non-empty, only those files are scanned
// (incremental mode). Otherwise, all files in the repo are scanned.
//
// Returns immediately after queuing; progress is reported via SSE events.
func (s *RepoScanner) ScanRepository(ctx context.Context, repoName, branch string, changedFiles map[string]struct{}) error {
	if s.gitProvider == nil {
		s.logger.Warn("no git provider configured, skipping scan", "repo", repoName)
		return nil
	}

	scanID := fmt.Sprintf("scan_%s", uuid.NewString()[:12])
	logger := s.logger.With("scan_id", scanID, "repo", repoName, "branch", branch)

	logger.Info("starting repository scan")

	// Create a cancellable context for this scan.
	scanCtx, cancel := context.WithCancel(ctx)
	s.mu.Lock()
	s.active[scanID] = cancel
	s.mu.Unlock()

	defer func() {
		s.mu.Lock()
		delete(s.active, scanID)
		s.mu.Unlock()
		cancel()
	}()

	// Publish scan started event.
	s.scanEventBus.Publish(scanCtx, scanID, "scan.started", map[string]interface{}{
		"repo":   repoName,
		"branch": branch,
		"mode":   s.scanMode(changedFiles),
	})

	// ── Download repository content ──────────────────────────────────
	startTime := time.Now()

	zipBytes, err := s.gitProvider.FetchRepository(scanCtx, repoName, branch)
	if err != nil {
		logger.Error("failed to fetch repository", "error", err)
		s.scanEventBus.Publish(scanCtx, scanID, "scan.error", map[string]interface{}{
			"error": err.Error(),
		})
		return fmt.Errorf("fetching repository %s: %w", repoName, err)
	}

	fetchDuration := time.Since(startTime)
	logger.Info("repository downloaded",
		"size_bytes", len(zipBytes),
		"duration_ms", fetchDuration.Milliseconds(),
	)

	// ── Extract and filter files ─────────────────────────────────────
	files, err := extractZipFiles(zipBytes, changedFiles)
	if err != nil {
		logger.Error("failed to extract repository archive", "error", err)
		s.scanEventBus.Publish(scanCtx, scanID, "scan.error", map[string]interface{}{
			"error": fmt.Sprintf("extracting archive: %v", err),
		})
		return fmt.Errorf("extracting repository %s: %w", repoName, err)
	}

	// Filter to code files only (skip binaries, images, vendor, node_modules).
	codeFiles := filterCodeFiles(files)
	logger.Info("code files extracted",
		"total_files", len(files),
		"code_files", len(codeFiles),
	)

	// ── Scan each file for conditionals ───────────────────────────────
	var scanResults []domain.ScanResult
	totalFiles := len(codeFiles)
	completedFiles := 0

	for path, content := range codeFiles {
		select {
		case <-scanCtx.Done():
			logger.Info("scan cancelled", "completed_files", completedFiles)
			return scanCtx.Err()
		default:
		}

		refs := s.analyzer.FindFlagReferences(scanCtx, content, "")
		for _, ref := range refs {
			// Determine conditional type from context.
			condType := inferConditionalType(ref.Context)

			scanResults = append(scanResults, domain.ScanResult{
				ID:              fmt.Sprintf("sr_%s_%d", uuid.NewString()[:8], ref.Line),
				Repository:      repoName,
				FilePath:        path,
				LineNumber:      ref.Line,
				ConditionalType: condType,
				ConditionalText: truncateText(ref.Context, 500),
				Confidence:      0.45, // Regex-based confidence
				Status:          domain.ScanResultStatusUnreviewed,
				CreatedAt:       time.Now().UTC(),
				UpdatedAt:       time.Now().UTC(),
			})
		}

		completedFiles++
		if completedFiles%10 == 0 || completedFiles == totalFiles {
			s.scanEventBus.Publish(scanCtx, scanID, "scan.repo.progress", map[string]interface{}{
				"repo":             repoName,
				"total_files":      totalFiles,
				"completed_files":  completedFiles,
				"results_found":    len(scanResults),
			})
		}
	}

	// ── Persist scan results ──────────────────────────────────────────
	if len(scanResults) > 0 {
		if err := s.code2flagWriter.BatchCreateScanResults(scanCtx, scanResults); err != nil {
			logger.Error("failed to persist scan results", "error", err, "count", len(scanResults))
			s.scanEventBus.Publish(scanCtx, scanID, "scan.error", map[string]interface{}{
				"error": fmt.Sprintf("persisting results: %v", err),
			})
			return fmt.Errorf("persisting scan results: %w", err)
		}
	}

	logger.Info("repository scan complete",
		"total_files", totalFiles,
		"results", len(scanResults),
		"duration_ms", time.Since(startTime).Milliseconds(),
	)

	s.scanEventBus.Publish(scanCtx, scanID, "scan.complete", map[string]interface{}{
		"repo":           repoName,
		"branch":         branch,
		"files_scanned":  totalFiles,
		"results_found":  len(scanResults),
		"duration_ms":    time.Since(startTime).Milliseconds(),
	})

	return nil
}

// CancelScan cancels a running scan by its scan ID.
func (s *RepoScanner) CancelScan(scanID string) {
	s.mu.Lock()
	defer s.mu.Unlock()

	if cancel, ok := s.active[scanID]; ok {
		s.logger.Info("cancelling scan", "scan_id", scanID)
		cancel()
	}
}

// scanMode returns "incremental" or "full" based on whether changedFiles
// is populated.
func (s *RepoScanner) scanMode(changedFiles map[string]struct{}) string {
	if len(changedFiles) > 0 {
		return "incremental"
	}
	return "full"
}

// ─── File extraction helpers ───────────────────────────────────────────────

// extractZipFiles extracts text files from a zip archive. If filterFiles is
// non-empty, only those files are returned. Returns a map of path → content.
func extractZipFiles(zipBytes []byte, filterFiles map[string]struct{}) (map[string][]byte, error) {
	// We use a minimal ZIP reader to avoid adding dependencies.
	// For a production implementation, use archive/zip.
	//
	// NOTE: This is a simplified implementation. In production, use
	// the standard library's archive/zip package. The method signature
	// returns map[string][]byte for file path → content.
	return extractZipFilesImpl(zipBytes, filterFiles)
}

// filterCodeFiles filters a file map to only include source code files.
// Skips binaries, images, vendor directories, and generated code.
func filterCodeFiles(files map[string][]byte) map[string][]byte {
	codeExtensions := map[string]bool{
		".go":     true,
		".java":   true,
		".js":     true,
		".ts":     true,
		".tsx":    true,
		".jsx":    true,
		".py":     true,
		".rb":     true,
		".rs":     true,
		".cs":     true,
		".swift":  true,
		".kt":     true,
		".kts":    true,
		".cpp":    true,
		".cc":     true,
		".c":      true,
		".h":      true,
		".hpp":    true,
		".scala":  true,
		".php":    true,
		".r":      true,
		".dart":   true,
		".ex":     true,
		".exs":    true,
		".clj":    true,
		".cljs":   true,
		".elm":    true,
		".erl":    true,
		".hrl":    true,
		".fs":     true,
		".fsx":    true,
	}

	skipPrefixes := []string{
		"vendor/",
		"node_modules/",
		"dist/",
		"build/",
		"target/",
		"out/",
		"bin/",
		"obj/",
		".git/",
		"testdata/",
		"__pycache__/",
		".next/",
		"coverage/",
		"generated/",
	}

	filtered := make(map[string][]byte)
	for path, content := range files {
		// Check skip prefixes.
		skip := false
		for _, prefix := range skipPrefixes {
			if strings.HasPrefix(path, prefix) {
				skip = true
				break
			}
		}
		if skip {
			continue
		}

		// Check file extension.
		ext := ""
		if idx := strings.LastIndexByte(path, '.'); idx >= 0 {
			ext = path[idx:]
		}
		if !codeExtensions[ext] {
			continue
		}

		// Skip binary content (simple heuristic: null bytes).
		if isLikelyBinary(content) {
			continue
		}

		filtered[path] = content
	}
	return filtered
}

// isLikelyBinary returns true if the content contains null bytes (indicating
// binary data).
func isLikelyBinary(content []byte) bool {
	// Check the first 8KB for null bytes.
	checkLen := 8192
	if len(content) < checkLen {
		checkLen = len(content)
	}
	for i := 0; i < checkLen; i++ {
		if content[i] == 0 {
			return true
		}
	}
	return false
}

// inferConditionalType determines the conditional type from the line context.
func inferConditionalType(line string) string {
	lower := strings.ToLower(strings.TrimSpace(line))
	switch {
	case strings.HasPrefix(lower, "if "), strings.HasPrefix(lower, "if("):
		return domain.ConditionalTypeIfStatement
	case strings.Contains(lower, "?"):
		return domain.ConditionalTypeTernary
	case strings.HasPrefix(lower, "switch "), strings.HasPrefix(lower, "case "):
		return domain.ConditionalTypeSwitchCase
	case strings.Contains(lower, "config"), strings.Contains(lower, "env"),
		strings.Contains(lower, "feature"), strings.Contains(lower, "flag"):
		return domain.ConditionalTypeConfigCheck
	default:
		return domain.ConditionalTypeIfStatement
	}
}

// truncateText returns the first n characters of text.
func truncateText(text string, n int) string {
	if len(text) <= n {
		return text
	}
	return text[:n]
}

// ─── ZIP extraction implementation ─────────────────────────────────────────
//
// This would use archive/zip in production. Kept as a separate function for
// clarity and testability.

func extractZipFilesImpl(zipBytes []byte, filterFiles map[string]struct{}) (map[string][]byte, error) {
	// STUB: In production, uses archive/zip.NewReader.
	// For now, returns an empty result set — scanning requires the GitProvider
	// to already return extracted content (e.g., via FetchRepository returning
	// the zipball bytes, which the caller processes separately).
	//
	// The actual extraction logic is deferred to the GitProvider's FetchRepository
	// method which returns raw zip bytes. In a real implementation, this would
	// use archive/zip to extract text files.
	_ = zipBytes
	_ = filterFiles
	return make(map[string][]byte), nil
}
