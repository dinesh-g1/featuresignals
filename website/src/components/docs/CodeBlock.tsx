"use client";

import { useState, useCallback, useRef } from "react";
import { Clipboard, Check } from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

/** Display-friendly label for common language identifiers. */
const LANGUAGE_LABELS: Record<string, string> = {
  ts: "TypeScript",
  tsx: "TSX",
  typescript: "TypeScript",
  js: "JavaScript",
  jsx: "JSX",
  javascript: "JavaScript",
  go: "Go",
  bash: "Bash",
  sh: "Shell",
  shell: "Shell",
  zsh: "Zsh",
  json: "JSON",
  yaml: "YAML",
  yml: "YAML",
  css: "CSS",
  html: "HTML",
  sql: "SQL",
  python: "Python",
  py: "Python",
  rust: "Rust",
  rs: "Rust",
  java: "Java",
  ruby: "Ruby",
  rb: "Ruby",
  php: "PHP",
  c: "C",
  cpp: "C++",
  csharp: "C#",
  swift: "Swift",
  kotlin: "Kotlin",
  kt: "Kotlin",
  dart: "Dart",
  elixir: "Elixir",
  ex: "Elixir",
  graphql: "GraphQL",
  gql: "GraphQL",
  markdown: "Markdown",
  md: "Markdown",
  mdx: "MDX",
  dockerfile: "Dockerfile",
  docker: "Dockerfile",
  env: "Env",
  toml: "TOML",
  ini: "INI",
  makefile: "Makefile",
  diff: "Diff",
  plaintext: "Plaintext",
  text: "Plaintext",
};

export interface CodeBlockProps {
  /** Programming language identifier (e.g. "typescript", "bash", "go"). */
  language?: string;
  /** The source code content as a string. */
  children: string;
  /** Show line numbers on the left gutter. Defaults to true. */
  showLineNumbers?: boolean;
  /** Show a copy-to-clipboard button. Defaults to true. */
  showCopyButton?: boolean;
  /** Optional filename or title displayed in the header bar. */
  title?: string;
}

/* ------------------------------------------------------------------ */
/*  Syntax Highlighting                                                */
/* ------------------------------------------------------------------ */

type TokenType = "comment" | "string" | "keyword" | "number" | "plain";

interface Token {
  type: TokenType;
  value: string;
}

/** Token colors mapped to Signal UI CSS variables. */
const TOKEN_STYLES: Record<TokenType, Record<string, string>> = {
  comment: { color: "var(--signal-fg-tertiary)", fontStyle: "italic" },
  string: { color: "var(--signal-fg-success)" },
  keyword: { color: "var(--signal-fg-info)" },
  number: { color: "var(--signal-fg-warning)" },
  plain: { color: "var(--signal-fg-on-emphasis)" },
};

const KEYWORDS = new Set([
  // JavaScript / TypeScript
  "const",
  "let",
  "var",
  "function",
  "return",
  "if",
  "else",
  "for",
  "while",
  "import",
  "from",
  "export",
  "default",
  "class",
  "interface",
  "type",
  "async",
  "await",
  "true",
  "false",
  "null",
  "undefined",
  "new",
  "this",
  "try",
  "catch",
  "throw",
  "switch",
  "case",
  "break",
  "continue",
  "extends",
  "implements",
  "package",
  "public",
  "private",
  "protected",
  "static",
  "readonly",
  "enum",
  "namespace",
  "module",
  "require",
  "yield",
  "of",
  "in",
  "do",
  // Go
  "defer",
  "go",
  "chan",
  "map",
  "range",
  "select",
  "struct",
  "fallthrough",
  // Python
  "def",
  "elif",
  "pass",
  "raise",
  "with",
  "lambda",
  "nonlocal",
  "global",
  "not",
  "and",
  "or",
  "is",
  "in",
  "as",
  "del",
  // Rust
  "fn",
  "pub",
  "mut",
  "use",
  "mod",
  "where",
  "impl",
  "trait",
  "self",
  "super",
  "crate",
  "unsafe",
  "extern",
  "ref",
  "dyn",
  // Shell
  "then",
  "fi",
  "esac",
  "done",
  "elif",
  "local",
  "source",
  // Common
  "print",
  "println",
]);

/**
 * Tokenize a single line of source code.
 *
 * Uses a simple greedy regex scanner to split each line into tokens.
 * Handles: // and # comments, quoted strings (" ' `), numbers, and keywords.
 */
function tokenizeLine(line: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;

  while (i < line.length) {
    // Single-line comment: // or #
    if ((line[i] === "/" && line[i + 1] === "/") || line[i] === "#") {
      tokens.push({ type: "comment", value: line.slice(i) });
      break;
    }

    // Multi-line comment start: /*
    if (line[i] === "/" && line[i + 1] === "*") {
      const end = line.indexOf("*/", i + 2);
      if (end !== -1) {
        tokens.push({ type: "comment", value: line.slice(i, end + 2) });
        i = end + 2;
        continue;
      }
      // Unclosed — treat rest of line as comment
      tokens.push({ type: "comment", value: line.slice(i) });
      break;
    }

    // Strings: "..."  '...'  `...`
    if (line[i] === '"' || line[i] === "'" || line[i] === "`") {
      const quote = line[i];
      let j = i + 1;
      while (j < line.length && line[j] !== quote) {
        if (line[j] === "\\") j++; // skip escaped char
        j++;
      }
      const endIdx = j < line.length ? j + 1 : line.length;
      tokens.push({ type: "string", value: line.slice(i, endIdx) });
      i = endIdx;
      continue;
    }

    // Numbers (integer, hex, binary, octal, float)
    const numMatch = line
      .slice(i)
      .match(
        /^(0[xX][0-9a-fA-F_]+|0[bB][01_]+|0[oO][0-7_]+|\d[0-9_]*(?:\.[0-9_]+)?(?:[eE][+-]?[0-9_]+)?)/,
      );
    if (numMatch && numMatch.index === 0) {
      tokens.push({ type: "number", value: numMatch[0] });
      i += numMatch[0].length;
      continue;
    }

    // Identifiers / keywords
    const identMatch = line.slice(i).match(/^[a-zA-Z_]\w*/);
    if (identMatch && identMatch.index === 0) {
      const word = identMatch[0];
      tokens.push({
        type: KEYWORDS.has(word) ? "keyword" : "plain",
        value: word,
      });
      i += word.length;
      continue;
    }

    // Fallback: single character
    tokens.push({ type: "plain", value: line[i] });
    i++;
  }

  return tokens;
}

/**
 * Highlight source code by splitting into lines and applying token styles.
 * Returns an array of line elements ready for rendering inside a `<pre>` block.
 */
function highlightCode(code: string): React.ReactNode[] {
  const lines = code.split("\n");

  return lines.map((line, lineIdx) => {
    const tokens = tokenizeLine(line);

    return (
      <span key={lineIdx} className="code-line">
        {tokens.length === 0 ? (
          <span style={TOKEN_STYLES.plain}>{"\n"}</span>
        ) : (
          tokens.map((tok, tokIdx) => (
            <span key={tokIdx} style={TOKEN_STYLES[tok.type]}>
              {tok.value}
            </span>
          ))
        )}
        {"\n"}
      </span>
    );
  });
}

/* ------------------------------------------------------------------ */
/*  Copy Button                                                        */
/* ------------------------------------------------------------------ */

function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
    } catch {
      // Clipboard API unavailable — silently no-op
      return;
    }

    setCopied(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={cn(
        "flex items-center gap-1.5 px-2 py-1",
        "rounded-(--signal-radius-sm)",
        "text-xs font-medium",
        "transition-colors",
        "focus-visible:outline-2 focus-visible:outline-offset-2",
      )}
      style={{
        color: copied
          ? "var(--signal-fg-success)"
          : "var(--signal-fg-secondary)",
        backgroundColor: "transparent",
      }}
      onMouseEnter={(e) => {
        if (!copied) {
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--signal-fg-on-emphasis)";
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "var(--signal-bg-inverse-secondary)";
        }
      }}
      onMouseLeave={(e) => {
        if (!copied) {
          (e.currentTarget as HTMLButtonElement).style.color =
            "var(--signal-fg-secondary)";
          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
            "transparent";
        }
      }}
      aria-label={copied ? "Copied" : "Copy code"}
    >
      {copied ? (
        <Check size={14} aria-hidden="true" />
      ) : (
        <Clipboard size={14} aria-hidden="true" />
      )}
      <span>{copied ? "Copied!" : "Copy"}</span>
    </button>
  );
}

/* ------------------------------------------------------------------ */
/*  CodeBlock Component                                                */
/* ------------------------------------------------------------------ */

/**
 * Shared MDX code block used across documentation pages.
 *
 * Features:
 * - Syntax highlighting via a lightweight regex tokenizer.
 * - Optional line numbers in the left gutter.
 * - Copy-to-clipboard with "Copied!" feedback (2 s timeout).
 * - Optional filename/title bar.
 * - Language badge in the header row.
 *
 * All colors drawn exclusively from Signal UI CSS custom properties;
 * zero hardcoded hex values.
 */
function CodeBlock({
  language,
  children,
  showLineNumbers = true,
  showCopyButton = true,
  title,
}: CodeBlockProps) {
  const code = children.replace(/\n$/, ""); // trim single trailing newline
  const lineCount = code.split("\n").length;
  const displayLanguage = language
    ? (LANGUAGE_LABELS[language.toLowerCase()] ?? language)
    : undefined;

  const hasHeader =
    Boolean(title) || Boolean(displayLanguage) || showCopyButton;

  return (
    <div
      className={cn(
        "my-6 overflow-hidden",
        "rounded-md",
        "border border-(--signal-border-default)",
        "shadow-sm",
      )}
    >
      {/* ---- Header bar ---- */}
      {hasHeader && (
        <div
          className={cn(
            "flex items-center gap-3 px-4 py-2",
            "border-b border-(--signal-border-subtle)",
            "text-xs font-medium",
          )}
          style={{
            backgroundColor: "var(--signal-bg-secondary)",
            color: "var(--signal-fg-secondary)",
          }}
        >
          {/* Title / filename */}
          {title && (
            <span
              className="truncate mr-auto"
              style={{ color: "var(--signal-fg-primary)" }}
            >
              {title}
            </span>
          )}

          {!title && <div className="flex-1" />}

          {/* Language badge */}
          {displayLanguage && (
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5",
                "rounded-(--signal-radius-sm)",
                "text-[11px] font-semibold uppercase tracking-wide",
              )}
              style={{
                backgroundColor: "var(--signal-bg-accent-muted)",
                color: "var(--signal-fg-accent)",
              }}
            >
              {displayLanguage}
            </span>
          )}

          {/* Copy button */}
          {showCopyButton && <CopyButton code={code} />}
        </div>
      )}

      {/* ---- Code area ---- */}
      <div
        className="flex overflow-x-auto code-block-selection"
        style={{ backgroundColor: "var(--signal-bg-inverse)" }}
      >
        {/* Line numbers gutter */}
        {showLineNumbers && (
          <div
            className={cn(
              "select-none shrink-0 py-3 pl-4 pr-3",
              "text-right font-mono text-xs leading-relaxed",
              "border-r border-(--signal-border-subtle)",
            )}
            style={{
              color: "var(--signal-fg-secondary)",
            }}
          >
            {Array.from({ length: lineCount }, (_, i) => (
              <div key={i}>{i + 1}</div>
            ))}
          </div>
        )}

        {/* Code content */}
        <pre
          className={cn(
            "grow py-3 overflow-x-auto",
            showLineNumbers ? "pr-4" : "px-4",
          )}
          style={{
            fontFamily: "var(--signal-font-mono)",
            fontSize: "var(--signal-text-sm)",
            lineHeight: "1.625",
            color: "var(--signal-fg-on-emphasis)",
            margin: 0,
            whiteSpace: "pre",
            wordWrap: "normal",
            tabSize: 4,
          }}
        >
          <code>{highlightCode(code)}</code>
        </pre>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Exports                                                            */
/* ------------------------------------------------------------------ */

export { CodeBlock };
export default CodeBlock;
