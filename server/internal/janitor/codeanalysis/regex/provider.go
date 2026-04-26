package regex

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"

	"github.com/featuresignals/server/internal/janitor"
	"github.com/featuresignals/server/internal/janitor/codeanalysis"
)

// RegexProvider implements CodeAnalysisProvider using the existing
// regex-based analyzer. This is the compliance-safe fallback when
// LLM processing is disabled or unavailable.
type RegexProvider struct {
	analyzer *janitor.Analyzer
	logger   *slog.Logger
}

// NewRegexProvider creates a new regex-based analysis provider.
func NewRegexProvider(logger *slog.Logger) *RegexProvider {
	return &RegexProvider{
		analyzer: janitor.NewAnalyzer(logger),
		logger:   logger.With("provider", "regex"),
	}
}

func (p *RegexProvider) Name() string { return "regex" }

func (p *RegexProvider) AnalyzeFlagReferences(ctx context.Context, req codeanalysis.AnalyzeRequest) (*codeanalysis.AnalyzeResponse, error) {
	response := &codeanalysis.AnalyzeResponse{
		OverallSafe: true,
		Confidence:  0.35, // Low confidence — regex can't guarantee semantic equivalence
		Summary: "Analyzed using regex-based pattern matching. " +
			"Confidence is low because regex cannot verify semantic correctness. " +
			"Manual review is strongly recommended before merging any changes.",
		Files: make([]codeanalysis.FileAnalysisResult, 0),
	}

	for path, content := range req.Files {
		refs := p.analyzer.FindFlagReferences(ctx, content, req.FlagKey)
		if len(refs) == 0 {
			continue
		}

		// Generate cleaned code
		cleaned, err := p.analyzer.GenerateCleanCode(ctx, content, req.FlagKey)
		if err != nil {
			p.logger.Warn("failed to clean code", "file", path, "error", err)
			continue
		}

		fileRefs := make([]codeanalysis.FlagReferenceAnalysis, 0, len(refs))
		for _, ref := range refs {
			fileRefs = append(fileRefs, codeanalysis.FlagReferenceAnalysis{
				Line:          ref.Line,
				Column:        ref.Column,
				ReferenceType: "conditional",
				SafeToRemove:  true,
				KeepBranch:    "true_branch",
				Reason:        "Regex detected reference to flag key in SDK method call",
			})
		}

		response.Files = append(response.Files, codeanalysis.FileAnalysisResult{
			FilePath:    path,
			Safe:        true,
			References:  fileRefs,
			CleanedCode: cleaned,
			Issues: []string{
				"Regex-based analysis — verify semantic correctness manually",
			},
		})
	}

	return response, nil
}

func (p *RegexProvider) GeneratePRDescription(ctx context.Context, flagKey, flagName string, changes []codeanalysis.FileChange) (string, error) {
	var descriptionBuf bytes.Buffer
	descriptionBuf.WriteString(fmt.Sprintf(`## 🤖 AI Janitor — Automated Cleanup (Basic Mode)

This PR was generated using regex-based analysis (not AI).

### Flag Removed
- **Key:** %s
- **Name:** %s

### Changes
`, flagKey, flagName))

	for _, c := range changes {
		descriptionBuf.WriteString(fmt.Sprintf("- %s: %s\n", c.Mode, c.Path))
	}

	descriptionBuf.WriteString(`
### ⚠️ IMPORTANT: Manual Review Required
This PR was generated using regex-based pattern matching, NOT AI-powered analysis.
The regex analyzer can identify flag references but CANNOT verify semantic equivalence.

Please review carefully:
1. Verify the correct branch (true/false) was preserved
2. Check for edge cases the regex may have missed
3. Run your test suite before merging
4. Consider running an AI-powered scan for higher confidence
`)

	return descriptionBuf.String(), nil
}

func (p *RegexProvider) ValidateCleanup(ctx context.Context, req codeanalysis.ValidateRequest) (*codeanalysis.ValidateResponse, error) {
	// Regex provider cannot validate semantic equivalence
	return &codeanalysis.ValidateResponse{
		Valid:      true, // Assume valid — we can't prove otherwise
		Confidence: 0.2,  // Very low confidence
		Issues: []string{
			"Regex-based validation cannot verify semantic equivalence",
			"Manual review strongly recommended",
		},
	}, nil
}

// Register adds the Regex provider to the given registry.
func Register(r *codeanalysis.ProviderRegistry) error {
	return nil
	// Regex provider is internal, not registered in the main registry
}