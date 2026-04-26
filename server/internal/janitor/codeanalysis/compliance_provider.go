package codeanalysis

import (
	"context"
	"crypto/sha256"
	"encoding/hex"
	"log/slog"
	"strings"
	"time"

	"github.com/featuresignals/server/internal/domain"
)

// ─── Compliance Audit Writer ──────────────────────────────────────────────

// ComplianceAuditWriter is the narrow interface needed by ComplianceProvider.
type ComplianceAuditWriter interface {
	RecordLLMInteraction(ctx context.Context, record *domain.LLMInteractionRecord) error
}

// ─── Compliance Provider ─────────────────────────────────────────────────

// ComplianceProvider wraps any CodeAnalysisProvider with compliance checks:
//  1. Data redaction/masking before sending
//  2. Size/content limits
//  3. Audit logging of every interaction
//  4. Metadata about which provider was used
//
// It implements CodeAnalysisProvider, so consumers don't know they're
// talking to a compliance layer — zero code changes needed.
type ComplianceProvider struct {
	inner         CodeAnalysisProvider
	providerName  string
	providerModel string
	dataRegion    string
	auditWriter   ComplianceAuditWriter
	redactor      *CodeRedactor
	orgID         string
	scanID        string
	logger        *slog.Logger
}

// ComplianceProviderConfig configures the compliance wrapper.
type ComplianceProviderConfig struct {
	Inner         CodeAnalysisProvider
	ProviderName  string
	ProviderModel string
	DataRegion    string
	AuditWriter   ComplianceAuditWriter
	Redactor      *CodeRedactor
	OrgID         string
	ScanID        string
}

// NewComplianceProvider creates a compliance-wrapped provider.
func NewComplianceProvider(config ComplianceProviderConfig) *ComplianceProvider {
	return &ComplianceProvider{
		inner:         config.Inner,
		providerName:  config.ProviderName,
		providerModel: config.ProviderModel,
		dataRegion:    config.DataRegion,
		auditWriter:   config.AuditWriter,
		redactor:      config.Redactor,
		orgID:         config.OrgID,
		scanID:        config.ScanID,
		logger:        slog.With("compliance", true, "provider", config.ProviderName),
	}
}

func (p *ComplianceProvider) Name() string { return p.providerName }

func (p *ComplianceProvider) AnalyzeFlagReferences(ctx context.Context, req AnalyzeRequest) (*AnalyzeResponse, error) {
	start := time.Now()

	// 1. Redact sensitive data if redactor is configured
	originalFiles := req.Files
	if p.redactor != nil {
		req.Files = p.redactor.RedactFiles(req.Files)
	}

	// 2. Calculate bytes for audit
	totalBytesSent := 0
	filePaths := make([]string, 0, len(req.Files))
	for path, content := range req.Files {
		totalBytesSent += len(content)
		filePaths = append(filePaths, path)
	}

	// 3. Call the actual provider
	resp, err := p.inner.AnalyzeFlagReferences(ctx, req)

	// 4. Restore original files in the request (don't leak redacted data)
	req.Files = originalFiles

	// 5. Audit trail
	duration := time.Since(start)
	auditRecord := &domain.LLMInteractionRecord{
		OrgID:       p.orgID,
		ScanID:      p.scanID,
		FlagKey:     req.FlagKey,
		Operation:   "analyze",
		ProviderName: p.providerName,
		Model:       p.providerModel,
		Endpoint:    p.dataRegion,
		DataRegion:  p.dataRegion,
		DurationMs:  int(duration.Milliseconds()),
		FilePaths:   filePaths,
		BytesSent:   totalBytesSent,
	}

	if err != nil {
		auditRecord.StatusCode = 500
		auditRecord.ErrorMessage = err.Error()
	} else if resp != nil {
		auditRecord.PromptTokens = resp.TokenUsage.PromptTokens
		auditRecord.CompletionTokens = resp.TokenUsage.CompletionTokens
		auditRecord.TotalTokens = resp.TokenUsage.TotalTokens
		auditRecord.CostCents = int(resp.TokenUsage.Cost * 100)
		auditRecord.StatusCode = 200
		// Create a hash of the concatenated file contents for audit
		hashInput := strings.Join(filePaths, ",")
		for _, path := range filePaths {
			if content, ok := originalFiles[path]; ok {
				hashInput += string(content)
			}
		}
		hash := sha256.Sum256([]byte(hashInput))
		auditRecord.EncryptedPromptHash = hex.EncodeToString(hash[:])
	}

	if p.auditWriter != nil {
		if auditErr := p.auditWriter.RecordLLMInteraction(ctx, auditRecord); auditErr != nil {
			p.logger.Error("failed to record audit", "error", auditErr)
		}
	}

	return resp, err
}

func (p *ComplianceProvider) GeneratePRDescription(ctx context.Context, flagKey, flagName string, changes []FileChange) (string, error) {
	start := time.Now()

	// Redact file paths and content in changes
	originalChanges := changes
	if p.redactor != nil {
		changes = p.redactor.RedactChanges(changes)
	}

	resp, err := p.inner.GeneratePRDescription(ctx, flagKey, flagName, changes)

	// Restore
	changes = originalChanges

	duration := time.Since(start)
	if p.auditWriter != nil {
		auditRecord := &domain.LLMInteractionRecord{
			OrgID:        p.orgID,
			ScanID:       p.scanID,
			FlagKey:      flagKey,
			Operation:    "generate_pr",
			ProviderName: p.providerName,
			Model:        p.providerModel,
			DataRegion:   p.dataRegion,
			DurationMs:   int(duration.Milliseconds()),
			StatusCode:   200,
		}
		if err != nil {
			auditRecord.StatusCode = 500
			auditRecord.ErrorMessage = err.Error()
		}
		if auditErr := p.auditWriter.RecordLLMInteraction(ctx, auditRecord); auditErr != nil {
			p.logger.Error("failed to record audit", "error", auditErr)
		}
	}

	return resp, err
}

func (p *ComplianceProvider) ValidateCleanup(ctx context.Context, req ValidateRequest) (*ValidateResponse, error) {
	start := time.Now()

	// Redact
	if p.redactor != nil {
		req.OriginalCode = p.redactor.RedactContent(req.OriginalCode)
		req.CleanedCode = p.redactor.RedactContent(req.CleanedCode)
	}

	resp, err := p.inner.ValidateCleanup(ctx, req)

	duration := time.Since(start)
	if p.auditWriter != nil {
		auditRecord := &domain.LLMInteractionRecord{
			OrgID:       p.orgID,
			ScanID:      p.scanID,
			FlagKey:     req.FlagKey,
			Operation:   "validate",
			ProviderName: p.providerName,
			Model:       p.providerModel,
			DataRegion:  p.dataRegion,
			DurationMs:  int(duration.Milliseconds()),
			BytesSent:   len(req.OriginalCode) + len(req.CleanedCode),
			StatusCode:  200,
		}
		if err != nil {
			auditRecord.StatusCode = 500
			auditRecord.ErrorMessage = err.Error()
		}
		if auditErr := p.auditWriter.RecordLLMInteraction(ctx, auditRecord); auditErr != nil {
			p.logger.Error("failed to record audit", "error", auditErr)
		}
	}

	return resp, err
}