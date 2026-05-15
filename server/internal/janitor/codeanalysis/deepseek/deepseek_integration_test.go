// Package deepseek provides the DeepSeek LLM provider for AI Janitor code analysis.
//
// Integration tests require DEEPSEEK_API_KEY env var. These tests make real
// API calls to DeepSeek and are skipped if the key is not set.
package deepseek

import (
	"context"
	"os"
	"testing"
	"time"

	"github.com/featuresignals/server/internal/janitor/codeanalysis"
)

func testProvider(t *testing.T) codeanalysis.CodeAnalysisProvider {
	t.Helper()
	apiKey := os.Getenv("DEEPSEEK_API_KEY")
	if apiKey == "" {
		t.Skip("DEEPSEEK_API_KEY not set — skipping integration test")
	}
	p, err := NewDeepSeekProvider(codeanalysis.ProviderConfig{
		APIKey:      apiKey,
		Model:       "deepseek-chat",
		MaxTokens:   1024,
		Temperature: 0.1,
		Timeout:     30 * time.Second,
	})
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}
	return p
}

func TestDeepSeek_ProviderName(t *testing.T) {
	p := testProvider(t)
	if p.Name() != "deepseek" {
		t.Errorf("expected name 'deepseek', got %q", p.Name())
	}
}

func TestDeepSeek_AnalyzeFlagReferences(t *testing.T) {
	p := testProvider(t)
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	req := codeanalysis.AnalyzeRequest{
		FlagKey:    "dark-mode",
		FlagName:   "Dark Mode",
		TrueBranch: "true",
		DaysServed: 30,
		Files: map[string][]byte{
			"src/App.tsx": []byte(`import { useFlag } from '@featuresignals/react';
function App() {
  const darkMode = useFlag('dark-mode', false);
  return <div className={darkMode ? 'dark' : 'light'}>Hello</div>;
}`),
		},
		Language: "typescript",
	}

	resp, err := p.AnalyzeFlagReferences(ctx, req)
	if err != nil {
		t.Fatalf("AnalyzeFlagReferences failed: %v", err)
	}
	if resp == nil {
		t.Fatal("expected non-nil response")
	}
	t.Logf("Overall safe: %v, Confidence: %.2f", resp.OverallSafe, resp.Confidence)
	t.Logf("Summary: %s", resp.Summary)
	t.Logf("Token usage: prompt=%d, completion=%d", resp.TokenUsage.PromptTokens, resp.TokenUsage.CompletionTokens)
	for _, f := range resp.Files {
		t.Logf("  File: %s (safe=%v)", f.FilePath, f.Safe)
		for _, ref := range f.References {
			t.Logf("    Line %d:%d %s safe=%v keep=%s: %s",
				ref.Line, ref.Column, ref.ReferenceType, ref.SafeToRemove, ref.KeepBranch, ref.Reason)
		}
	}
}

func TestDeepSeek_GeneratePRDescription(t *testing.T) {
	p := testProvider(t)
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	changes := []codeanalysis.FileChange{
		{
			Path:    "src/App.tsx",
			Content: []byte("- const darkMode = useFlag('dark-mode', false);\n+ const darkMode = false;"),
			Mode:    "modify",
		},
	}

	desc, err := p.GeneratePRDescription(ctx, "dark-mode", "Dark Mode", changes)
	if err != nil {
		t.Fatalf("GeneratePRDescription failed: %v", err)
	}
	if desc == "" {
		t.Error("expected non-empty PR description")
	}
	t.Logf("PR Description:\n%s", desc)
}

func TestDeepSeek_ValidateCleanup(t *testing.T) {
	p := testProvider(t)
	ctx, cancel := context.WithTimeout(context.Background(), 60*time.Second)
	defer cancel()

	req := codeanalysis.ValidateRequest{
		FlagKey:      "dark-mode",
		OriginalCode: []byte(`const darkMode = useFlag('dark-mode', false);`),
		CleanedCode:  []byte(`const darkMode = false;`),
		ActiveBranch: "false",
	}

	resp, err := p.ValidateCleanup(ctx, req)
	if err != nil {
		t.Fatalf("ValidateCleanup failed: %v", err)
	}
	if resp == nil {
		t.Fatal("expected non-nil response")
	}
	t.Logf("Validation: valid=%v, confidence=%.2f", resp.Valid, resp.Confidence)
	t.Logf("Token usage: prompt=%d, completion=%d", resp.TokenUsage.PromptTokens, resp.TokenUsage.CompletionTokens)
}

func TestDeepSeek_ErrorHandling_InvalidAuth(t *testing.T) {
	// Test with an intentionally invalid API key
	p, err := NewDeepSeekProvider(codeanalysis.ProviderConfig{
		APIKey:      "sk-invalid-key-for-testing",
		Model:       "deepseek-chat",
		MaxTokens:   10,
		Temperature: 0.0,
		Timeout:     10 * time.Second,
	})
	if err != nil {
		t.Fatalf("failed to create provider: %v", err)
	}

	ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
	defer cancel()

	req := codeanalysis.AnalyzeRequest{
		FlagKey: "test",
		Files: map[string][]byte{
			"test.go": []byte("package main"),
		},
		Language: "go",
	}

	_, err = p.AnalyzeFlagReferences(ctx, req)
	if err == nil {
		t.Error("expected error with invalid API key, got nil")
	} else {
		t.Logf("Got expected error with invalid auth: %v", err)
	}
}
