// Package janitor implements the AI-driven code cleanup engine that scans
// source files for stale feature flag references and removes the associated
// conditional blocks, keeping else branches when present. The output is
// syntactically valid code with the feature flag logic removed.
//
// The Analyzer supports common SDK patterns across Go, JavaScript/TypeScript,
// and other C-family languages that use similar boolean variation or
// is-enabled checks.
package janitor

import (
	"bytes"
	"context"
	"fmt"
	"log/slog"
	"strings"
	"unicode"
)

// FlagReference represents a single reference to a feature flag key found
// in source code content.
type FlagReference struct {
	Line    int    `json:"line"`
	Column  int    `json:"column"`
	Context string `json:"context"`
}

// Analyzer scans source code for stale feature flag references and generates
// cleaned code with those references and their associated conditional blocks
// removed.
type Analyzer struct {
	logger *slog.Logger
}

// NewAnalyzer creates a new Analyzer with the given logger.
func NewAnalyzer(logger *slog.Logger) *Analyzer {
	return &Analyzer{logger: logger}
}

// FindFlagReferences scans the given content for all references to the
// specified flag key within feature flag SDK method invocations. It returns
// a slice of FlagReference with line numbers (1-based), column positions
// (1-based), and the trimmed line content as context.
func (a *Analyzer) FindFlagReferences(ctx context.Context, content []byte, flagKey string) []FlagReference {
	if len(content) == 0 || flagKey == "" {
		return nil
	}

	var refs []FlagReference
	lines := strings.Split(string(content), "\n")
	quotedKey := `"` + flagKey + `"`

	for lineIdx, line := range lines {
		col := flagKeyColumn(line, quotedKey)
		if col > 0 {
			refs = append(refs, FlagReference{
				Line:    lineIdx + 1,
				Column:  col,
				Context: strings.TrimSpace(line),
			})
		}
	}

	a.logger.LogAttrs(ctx, slog.LevelDebug, "found flag references",
		slog.String("flag_key", flagKey),
		slog.Int("count", len(refs)),
	)

	return refs
}

// flagKeyColumn returns the 1-based column of the flag key string if it
// appears within a recognized feature flag SDK method call, or 0 otherwise.
func flagKeyColumn(line, quotedKey string) int {
	lower := strings.ToLower(line)
	idx := strings.Index(lower, quotedKey)
	if idx < 0 {
		return 0
	}

	// Look backwards up to 80 characters to find an SDK method name.
	start := idx - 80
	if start < 0 {
		start = 0
	}
	preceding := lower[start:idx]

	sdkPatterns := []string{
		"boolvariation(",
		"isenabled(",
		"is_enabled(",
		"getvariation(",
		"get_variation(",
		"evaluate(",
	}
	for _, p := range sdkPatterns {
		if strings.Contains(preceding, p) {
			quotePos := strings.Index(line[idx:], `"`)
			if quotePos >= 0 {
				return idx + quotePos + 1
			}
		}
	}

	return 0
}

// GenerateCleanCode removes stale feature flag conditional blocks from the
// given source code. When a flag check appears in an if condition:
//
//   - If the if-block has no else clause, the entire if-block is removed.
//   - If the if-block has an else clause, the if-block body is removed and
//     the else-block body is kept (adjusted to the enclosing scope's
//     indentation level).
//
// The returned code is syntactically valid. Consecutive blank lines left
// by block removal are collapsed into a single blank line.
//
// The method is idempotent: if the flag key has no references, the content
// is returned unchanged.
func (a *Analyzer) GenerateCleanCode(ctx context.Context, content []byte, flagKey string) ([]byte, error) {
	trimmed := bytes.TrimRight(content, "\n")

	if flagKey == "" {
		return trimmed, nil
	}

	text := string(trimmed)
	quotedKey := `"` + flagKey + `"`
	if !strings.Contains(text, quotedKey) {
		return trimmed, nil
	}

	lines := strings.Split(text, "\n")

	var out bytes.Buffer
	prevBlank := true // treat start-of-file as "blank" to avoid leading blank lines
	i := 0
	for i < len(lines) {
		if isFlagIfLine(lines[i], quotedKey) {
			blockStart := i

			// Find the opening brace for the if-block.
			openLine := findOpenBraceLine(lines, blockStart)
			if openLine < 0 {
				writeLine(&out, lines[i], &prevBlank)
				i++
				continue
			}

			// Find the closing brace for the if-block body.
			ifCloseLine := findCloseBraceLine(lines, openLine)
			if ifCloseLine < 0 {
				writeLine(&out, lines[i], &prevBlank)
				i++
				continue
			}

			// Check for an else clause.
			ei := findElseBlock(lines, ifCloseLine)

			if ei.found {
				// Compute indentation of the if/else body and of the
				// if-statement itself. The else-body lines need to be
				// un-indented by (bodyIndent - ifLineIndent) so they
				// align with the enclosing scope (the if-line's level).
				ifLineIndent := leadingWhitespace(lines[blockStart])
				bodyIndent := bodyIndentation(lines, openLine+1, ifCloseLine)
				dedent := bodyIndent - ifLineIndent
				if dedent < 0 {
					dedent = 0
				}

				for j := ei.bodyStart; j <= ei.bodyEnd; j++ {
					adjusted := stripIndent(lines[j], dedent)
					writeLine(&out, adjusted, &prevBlank)
				}

				i = ei.elseClose + 1
			} else {
				// No else: skip the entire if-block.
				i = ifCloseLine + 1
			}

			a.logger.LogAttrs(ctx, slog.LevelDebug, "removed flag block",
				slog.String("flag_key", flagKey),
				slog.Int("start_line", blockStart+1),
				slog.Int("end_line", ifCloseLine+1),
				slog.Bool("has_else", ei.found),
			)
		} else {
			writeLine(&out, lines[i], &prevBlank)
			i++
		}
	}

	return bytes.TrimRight(out.Bytes(), "\n"), nil
}

// writeLine writes a line to the buffer, adding a trailing newline. It
// collapses consecutive blank lines by tracking prevBlank across calls.
func writeLine(buf *bytes.Buffer, line string, prevBlank *bool) {
	isBlank := strings.TrimSpace(line) == ""
	if isBlank && *prevBlank {
		return
	}
	*prevBlank = isBlank
	buf.WriteString(line)
	buf.WriteByte('\n')
}

// isFlagIfLine reports whether line is an if-statement that references the
// given quoted flag key (e.g. `"new-checkout"`).
func isFlagIfLine(line, quotedKey string) bool {
	trimmed := strings.TrimLeftFunc(line, unicode.IsSpace)

	// Must look like an if-statement.
	if !strings.HasPrefix(trimmed, "if ") && !strings.HasPrefix(trimmed, "if(") {
		return false
	}

	return strings.Contains(line, quotedKey)
}

// findOpenBraceLine returns the line index of the first '{' at or after
// startLine, or -1 if none is found.
func findOpenBraceLine(lines []string, startLine int) int {
	for i := startLine; i < len(lines); i++ {
		if strings.ContainsRune(lines[i], '{') {
			return i
		}
	}
	return -1
}

// findCloseBraceLine finds the line index of the matching '}' for the
// opening '{' on openLine. It counts brace depth across all characters
// on and after openLine.
func findCloseBraceLine(lines []string, openLine int) int {
	depth := 0
	started := false

	for i := openLine; i < len(lines); i++ {
		for _, ch := range lines[i] {
			switch ch {
			case '{':
				depth++
				started = true
			case '}':
				depth--
				if started && depth == 0 {
					return i
				}
			}
		}
	}
	return -1
}

// elseBlock describes the bounds of an else clause body.
type elseBlock struct {
	found     bool
	bodyStart int // first line of else body content (after '{')
	bodyEnd   int // last line of else body content (before '}')
	elseClose int // line of the closing '}' for the else block
}

// findElseBlock checks whether the closing brace at closeLine is followed
// by an else clause, and if so returns the bounds of the else body.
//
// Two patterns are handled:
//  1. "} else {" on the same line as closeLine.
//  2. "}" on closeLine and "else {" on closeLine+1 (separate lines).
func findElseBlock(lines []string, closeLine int) elseBlock {
	line := lines[closeLine]

	// Pattern 1: "} else {" on the same line.
	if _, ok := extractAfterElse(line); ok {
		// Find the '{' position in the original line.
		// The '{' comes after "else", so search from the end of "else".
		// Use LastIndexByte to find the last '{' which is the else block opener.
		braceInLine := strings.LastIndexByte(line, '{')
		if braceInLine < 0 {
			return elseBlock{}
		}

		elseClose := findCloseBraceFrom(lines, closeLine, braceInLine)
		if elseClose < 0 {
			return elseBlock{}
		}

		return elseBlock{
			found:     true,
			bodyStart: closeLine + 1,
			bodyEnd:   elseClose - 1,
			elseClose: elseClose,
		}
	}

	// Line must be exactly "}" for pattern 2.
	if strings.TrimSpace(line) != "}" {
		return elseBlock{}
	}

	// Pattern 2: "}" on closeLine, "else {" on the next.
	nextIdx := closeLine + 1
	if nextIdx >= len(lines) {
		return elseBlock{}
	}
	nextLine := strings.TrimSpace(lines[nextIdx])
	if !strings.HasPrefix(nextLine, "else") {
		return elseBlock{}
	}

	// Find the '{' — could be on the same line as "else" or the line after.
	elseBraceLine := nextIdx
	if !strings.ContainsRune(lines[nextIdx], '{') {
		elseBraceLine = nextIdx + 1
		if elseBraceLine >= len(lines) || !strings.ContainsRune(lines[elseBraceLine], '{') {
			return elseBlock{}
		}
	}

	bracePos := strings.IndexByte(lines[elseBraceLine], '{')
	elseClose := findCloseBraceFrom(lines, elseBraceLine, bracePos)
	if elseClose < 0 {
		return elseBlock{}
	}

	return elseBlock{
		found:     true,
		bodyStart: elseBraceLine + 1,
		bodyEnd:   elseClose - 1,
		elseClose: elseClose,
	}
}

// extractAfterElse checks if a line contains "else" after a '}', and if so
// returns the substring after the "else" keyword. It returns ok=false when
// no else clause is present on the line.
func extractAfterElse(line string) (after string, ok bool) {
	trimmed := strings.TrimSpace(line)
	closeIdx := strings.Index(trimmed, "}")
	if closeIdx < 0 {
		return "", false
	}
	rest := trimmed[closeIdx+1:]
	elseIdx := strings.Index(strings.TrimSpace(rest), "else")
	if elseIdx < 0 {
		return "", false
	}
	return strings.TrimSpace(rest[elseIdx+4:]), true
}

// findCloseBraceFrom finds the matching closing brace starting from a
// specific character position on startLine.
func findCloseBraceFrom(lines []string, startLine, startCol int) int {
	depth := 0
	started := false

	for i := startLine; i < len(lines); i++ {
		line := lines[i]
		for j := 0; j < len(line); j++ {
			if i == startLine && j < startCol {
				continue
			}
			switch line[j] {
			case '{':
				depth++
				started = true
			case '}':
				depth--
				if started && depth == 0 {
					return i
				}
			}
		}
	}
	return -1
}

// bodyIndentation returns the indentation (number of leading whitespace
// characters) of the first non-blank line in the given range.
func bodyIndentation(lines []string, startLine, endLine int) int {
	for i := startLine; i <= endLine && i < len(lines); i++ {
		if strings.TrimSpace(lines[i]) == "" {
			continue
		}
		return leadingWhitespace(lines[i])
	}
	return 0
}

// leadingWhitespace returns the number of leading space and tab characters
// in s.
func leadingWhitespace(s string) int {
	n := 0
	for _, ch := range s {
		if ch == ' ' || ch == '\t' {
			n++
		} else {
			break
		}
	}
	return n
}

// stripIndent removes up to n leading whitespace characters from s.
// It only removes characters that are spaces or tabs.
func stripIndent(s string, n int) string {
	if n <= 0 || s == "" {
		return s
	}
	removed := 0
	for i, ch := range s {
		if removed >= n {
			return s[i:]
		}
		if ch == ' ' || ch == '\t' {
			removed++
		} else {
			return s[i:]
		}
	}
	// Entire string was whitespace.
	if len(s) <= n {
		return ""
	}
	return s[n:]
}

// Compile-time interface checks.
var _ fmt.Stringer = FlagReference{}

func (f FlagReference) String() string {
	return fmt.Sprintf("%d:%d %s", f.Line, f.Column, f.Context)
}