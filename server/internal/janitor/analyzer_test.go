package janitor

import (
	"context"
	"io"
	"log/slog"
	"os"
	"runtime"
	"strings"
	"testing"
)

// testdataPath returns the absolute path to the testdata directory.
func testdataPath(t *testing.T) string {
	t.Helper()
	_, filename, _, ok := runtime.Caller(0)
	if !ok {
		t.Fatal("failed to get caller info")
	}
	return dirname(filename) + "/testdata"
}

// dirname returns the directory portion of a file path.
func dirname(path string) string {
	for i := len(path) - 1; i >= 0; i-- {
		if path[i] == '/' {
			return path[:i]
		}
	}
	return "."
}

// mustReadFile reads a file or fails the test.
func mustReadFile(t *testing.T, path string) []byte {
	t.Helper()
	data, err := os.ReadFile(path)
	if err != nil {
		t.Fatalf("failed to read %s: %v", path, err)
	}
	return data
}

// newTestLogger returns a *slog.Logger that writes to io.Discard.
func newTestLogger(t *testing.T) *slog.Logger {
	t.Helper()
	return slog.New(slog.NewTextHandler(io.Discard, &slog.HandlerOptions{Level: slog.LevelDebug}))
}

func TestFindFlagReferences_JS(t *testing.T) {
	ctx := context.Background()
	content := mustReadFile(t, testdataPath(t)+"/sample_code.js")
	analyzer := NewAnalyzer(newTestLogger(t))

	tests := []struct {
		name    string
		flagKey string
		want    int
	}{
		{name: "existing flag key", flagKey: "new-checkout", want: 1},
		{name: "second existing flag key", flagKey: "summer-sale", want: 1},
		{name: "non-existent flag key", flagKey: "nonexistent-flag", want: 0},
		{name: "empty flag key", flagKey: "", want: 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			refs := analyzer.FindFlagReferences(ctx, content, tc.flagKey)
			if len(refs) != tc.want {
				t.Errorf("FindFlagReferences(%q) returned %d references, want %d", tc.flagKey, len(refs), tc.want)
			}
			for _, ref := range refs {
				if ref.Line <= 0 {
					t.Errorf("expected positive line number, got %d for ref %+v", ref.Line, ref)
				}
				if ref.Column <= 0 {
					t.Errorf("expected positive column number, got %d for ref %+v", ref.Column, ref)
				}
				if ref.Context == "" {
					t.Errorf("expected non-empty context for ref %+v", ref)
				}
				if !strings.Contains(ref.Context, tc.flagKey) {
					t.Errorf("expected context to contain %q, got %q", tc.flagKey, ref.Context)
				}
			}
		})
	}
}

func TestFindFlagReferences_Go(t *testing.T) {
	ctx := context.Background()
	content := mustReadFile(t, testdataPath(t)+"/sample_code.go")
	analyzer := NewAnalyzer(newTestLogger(t))

	tests := []struct {
		name    string
		flagKey string
		want    int
	}{
		{name: "existing flag key", flagKey: "new-pipeline", want: 1},
		{name: "non-existent flag key", flagKey: "nonexistent", want: 0},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			refs := analyzer.FindFlagReferences(ctx, content, tc.flagKey)
			if len(refs) != tc.want {
				t.Errorf("FindFlagReferences(%q) returned %d references, want %d", tc.flagKey, len(refs), tc.want)
			}
		})
	}
}

func TestFindFlagReferences_EmptyContent(t *testing.T) {
	ctx := context.Background()
	analyzer := NewAnalyzer(newTestLogger(t))

	refs := analyzer.FindFlagReferences(ctx, []byte{}, "some-flag")
	if len(refs) != 0 {
		t.Errorf("expected 0 references for empty content, got %d", len(refs))
	}
}

func TestFindFlagReferences_NoMatch(t *testing.T) {
	ctx := context.Background()
	content := []byte(`const x = 42;
function greet() {
  return "hello";
}`)
	analyzer := NewAnalyzer(newTestLogger(t))

	refs := analyzer.FindFlagReferences(ctx, content, "some-flag")
	if len(refs) != 0 {
		t.Errorf("expected 0 references when flag key is absent, got %d", len(refs))
	}
}

func TestGenerateCleanCode_JS_SimpleIfBlock(t *testing.T) {
	ctx := context.Background()
	content := mustReadFile(t, testdataPath(t)+"/sample_code.js")
	expected := mustReadFile(t, testdataPath(t)+"/expected_clean.js")
	analyzer := NewAnalyzer(newTestLogger(t))

	cleaned, err := analyzer.GenerateCleanCode(ctx, content, "new-checkout")
	if err != nil {
		t.Fatalf("GenerateCleanCode returned error: %v", err)
	}

	got := string(cleaned)
	want := strings.TrimRight(string(expected), "\n")
	if got != want {
		t.Errorf("GenerateCleanCode output mismatch\n--- got:\n%s\n\n--- want:\n%s", got, want)
	}
}

func TestGenerateCleanCode_Go_IfElseBlock(t *testing.T) {
	ctx := context.Background()
	content := mustReadFile(t, testdataPath(t)+"/sample_code.go")
	expected := mustReadFile(t, testdataPath(t)+"/expected_clean.go")
	analyzer := NewAnalyzer(newTestLogger(t))

	cleaned, err := analyzer.GenerateCleanCode(ctx, content, "new-pipeline")
	if err != nil {
		t.Fatalf("GenerateCleanCode returned error: %v", err)
	}

	got := string(cleaned)
	want := strings.TrimRight(string(expected), "\n")
	if got != want {
		t.Errorf("GenerateCleanCode output mismatch\n--- got:\n%s\n\n--- want:\n%s", got, want)
	}
}

func TestGenerateCleanCode_NonExistentFlag(t *testing.T) {
	ctx := context.Background()
	content := mustReadFile(t, testdataPath(t)+"/sample_code.js")
	analyzer := NewAnalyzer(newTestLogger(t))

	cleaned, err := analyzer.GenerateCleanCode(ctx, content, "nonexistent-flag")
	if err != nil {
		t.Fatalf("GenerateCleanCode returned error: %v", err)
	}

	if string(cleaned) != strings.TrimRight(string(content), "\n") {
		t.Error("expected unchanged content for non-existent flag key")
	}
}

func TestGenerateCleanCode_EmptyFlagKey(t *testing.T) {
	ctx := context.Background()
	content := []byte(`const x = 1;`)
	analyzer := NewAnalyzer(newTestLogger(t))

	cleaned, err := analyzer.GenerateCleanCode(ctx, content, "")
	if err != nil {
		t.Fatalf("GenerateCleanCode returned error: %v", err)
	}

	if string(cleaned) != strings.TrimRight(string(content), "\n") {
		t.Error("expected unchanged content for empty flag key")
	}
}

func TestGenerateCleanCode_EmptyContent(t *testing.T) {
	ctx := context.Background()
	analyzer := NewAnalyzer(newTestLogger(t))

	cleaned, err := analyzer.GenerateCleanCode(ctx, []byte{}, "flag")
	if err != nil {
		t.Fatalf("GenerateCleanCode returned error: %v", err)
	}

	if len(cleaned) != 0 {
		t.Errorf("expected empty output for empty content, got %q", string(cleaned))
	}
}

func TestGenerateCleanCode_Go_SimpleIfBlock(t *testing.T) {
	ctx := context.Background()
	content := []byte(`func handle() {
    user := currentUser()

    if features.IsEnabled("beta-feature", user) {
        betaHandler()
    }

    commonHandler()
}`)
	expected := []byte(`func handle() {
    user := currentUser()

    commonHandler()
}`)
	analyzer := NewAnalyzer(newTestLogger(t))

	cleaned, err := analyzer.GenerateCleanCode(ctx, content, "beta-feature")
	if err != nil {
		t.Fatalf("GenerateCleanCode returned error: %v", err)
	}

	got := string(cleaned)
	want := strings.TrimRight(string(expected), "\n")
	if got != want {
		t.Errorf("GenerateCleanCode output mismatch\n--- got:\n%s\n\n--- want:\n%s", got, want)
	}
}

func TestGenerateCleanCode_Go_IfElseOnSameLine(t *testing.T) {
	ctx := context.Background()
	content := []byte(`func handle() {
    user := currentUser()
    if features.IsEnabled("dark-mode", user) {
        enableDark()
    } else {
        enableLight()
    }
    render()
}`)
	expected := []byte(`func handle() {
    user := currentUser()
    enableLight()
    render()
}`)
	analyzer := NewAnalyzer(newTestLogger(t))

	cleaned, err := analyzer.GenerateCleanCode(ctx, content, "dark-mode")
	if err != nil {
		t.Fatalf("GenerateCleanCode returned error: %v", err)
	}

	got := string(cleaned)
	want := strings.TrimRight(string(expected), "\n")
	if got != want {
		t.Errorf("GenerateCleanCode output mismatch\n--- got:\n%s\n\n--- want:\n%s", got, want)
	}
}

func TestGenerateCleanCode_JS_TwoSiblingFlags(t *testing.T) {
	ctx := context.Background()
	content := []byte(`function render() {
    if (client.boolVariation("flag-a", user, false)) {
        return <ComponentA />;
    }

    if (client.boolVariation("flag-b", user, false)) {
        return <ComponentB />;
    }

    return <Default />;
}`)
	analyzer := NewAnalyzer(newTestLogger(t))

	// Remove flag-a only.
	cleanedA, err := analyzer.GenerateCleanCode(ctx, content, "flag-a")
	if err != nil {
		t.Fatalf("GenerateCleanCode returned error: %v", err)
	}
	if strings.Contains(string(cleanedA), "flag-a") {
		t.Error("expected flag-a references to be removed")
	}
	if !strings.Contains(string(cleanedA), "flag-b") {
		t.Error("expected flag-b references to remain")
	}

	// Remove flag-b only.
	cleanedB, err := analyzer.GenerateCleanCode(ctx, content, "flag-b")
	if err != nil {
		t.Fatalf("GenerateCleanCode returned error: %v", err)
	}
	if strings.Contains(string(cleanedB), "flag-b") {
		t.Error("expected flag-b references to be removed")
	}
	if !strings.Contains(string(cleanedB), "flag-a") {
		t.Error("expected flag-a references to remain")
	}
}

func TestGenerateCleanCode_Idempotent(t *testing.T) {
	ctx := context.Background()
	content := []byte(`if (client.boolVariation("feature", user, false)) {
    doSomething();
}`)
	analyzer := NewAnalyzer(newTestLogger(t))

	// First pass: remove the block.
	cleaned, err := analyzer.GenerateCleanCode(ctx, content, "feature")
	if err != nil {
		t.Fatalf("first pass returned error: %v", err)
	}

	// Second pass: should be a no-op (flag no longer present).
	cleanedAgain, err := analyzer.GenerateCleanCode(ctx, cleaned, "feature")
	if err != nil {
		t.Fatalf("second pass returned error: %v", err)
	}

	if string(cleaned) != string(cleanedAgain) {
		t.Error("GenerateCleanCode is not idempotent")
	}
}

func TestGenerateCleanCode_CSharpStyle(t *testing.T) {
	ctx := context.Background()
	content := []byte(`void Handle() {
    var user = GetUser();

    if (client.isEnabled("csharp-flag", user)) {
        HandleNew();
    }
    else {
        HandleOld();
    }

    Render();
}`)
	expected := []byte(`void Handle() {
    var user = GetUser();

    HandleOld();

    Render();
}`)
	analyzer := NewAnalyzer(newTestLogger(t))

	cleaned, err := analyzer.GenerateCleanCode(ctx, content, "csharp-flag")
	if err != nil {
		t.Fatalf("GenerateCleanCode returned error: %v", err)
	}

	got := string(cleaned)
	want := strings.TrimRight(string(expected), "\n")
	if got != want {
		t.Errorf("GenerateCleanCode output mismatch\n--- got:\n%s\n\n--- want:\n%s", got, want)
	}
}

func TestFlagReference_String(t *testing.T) {
	ref := FlagReference{Line: 5, Column: 12, Context: `if (client.boolVariation("flag", user, false))`}
	want := `5:12 if (client.boolVariation("flag", user, false))`
	got := ref.String()
	if got != want {
		t.Errorf("FlagReference.String() = %q, want %q", got, want)
	}
}

func TestGenerateCleanCode_MultipleCallsSameContent(t *testing.T) {
	ctx := context.Background()
	content := mustReadFile(t, testdataPath(t)+"/sample_code.js")
	analyzer := NewAnalyzer(newTestLogger(t))

	cleaned1, err := analyzer.GenerateCleanCode(ctx, content, "new-checkout")
	if err != nil {
		t.Fatalf("first call returned error: %v", err)
	}

	cleaned2, err := analyzer.GenerateCleanCode(ctx, content, "new-checkout")
	if err != nil {
		t.Fatalf("second call returned error: %v", err)
	}

	if string(cleaned1) != string(cleaned2) {
		t.Error("GenerateCleanCode is not deterministic across calls")
	}
}