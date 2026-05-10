"use client";

import { useState, useCallback, useMemo } from "react";
import { Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type SupportedLanguage,
  type CodeSnippet,
  generateSnippets,
} from "@/lib/eval-engine";

interface CodeEditorProps {
  flagKey: string;
  defaultLanguage?: SupportedLanguage;
  className?: string;
}

const LANGUAGE_TABS: { key: SupportedLanguage; label: string }[] = [
  { key: "node", label: "Node.js" },
  { key: "go", label: "Go" },
  { key: "python", label: "Python" },
  { key: "java", label: "Java" },
];

/* ------------------------------------------------------------------ */
/*  Syntax Highlighting (zero-dependency tokenizer)                    */
/* ------------------------------------------------------------------ */

const SYNTAX_COLORS: Record<string, string> = {
  keyword: "#c084fc",
  string: "#86efac",
  comment: "#6b7280",
  number: "#fbbf24",
  fn: "#60a5fa",
  type: "#f9a8d4",
  op: "#67e8f9",
  plain: "#e2e8f0",
};

interface Token {
  text: string;
  color: string;
}

const KEYWORDS = new Set([
  "func",
  "defer",
  "go",
  "chan",
  "select",
  "range",
  "package",
  "import",
  "type",
  "struct",
  "interface",
  "map",
  "var",
  "const",
  "return",
  "if",
  "else",
  "for",
  "switch",
  "case",
  "default",
  "break",
  "continue",
  "nil",
  "true",
  "false",
  "make",
  "new",
  "append",
  "len",
  "cap",
  "string",
  "int",
  "bool",
  "float64",
  "int64",
  "error",
  "let",
  "function",
  "async",
  "await",
  "class",
  "extends",
  "export",
  "from",
  "while",
  "do",
  "throw",
  "try",
  "catch",
  "finally",
  "delete",
  "typeof",
  "instanceof",
  "this",
  "super",
  "yield",
  "void",
  "null",
  "undefined",
  "enum",
  "implements",
  "abstract",
  "private",
  "public",
  "protected",
  "readonly",
  "static",
  "as",
  "is",
  "keyof",
  "namespace",
  "declare",
  "module",
  "require",
  "def",
  "elif",
  "not",
  "and",
  "or",
  "None",
  "except",
  "raise",
  "with",
  "lambda",
  "pass",
  "global",
  "nonlocal",
  "assert",
  "del",
  "print",
  "self",
  "cls",
  "long",
  "double",
  "float",
  "boolean",
  "char",
  "throws",
  "record",
  "using",
  "foreach",
  "internal",
  "virtual",
  "override",
  "sealed",
  "partial",
  "base",
  "get",
  "set",
  "decimal",
  "end",
  "elsif",
  "unless",
  "until",
  "begin",
  "rescue",
  "ensure",
  "include",
  "extend",
  "attr_accessor",
  "attr_reader",
  "attr_writer",
  "lambda",
  "proc",
  "then",
  "fi",
  "esac",
  "done",
  "set",
  "unset",
  "source",
  "local",
  "declare",
  "alias",
  "exec",
  "trap",
  "include",
  "define",
  "ifdef",
  "ifndef",
  "endif",
  "pragma",
  "echo",
  "exit",
  "cd",
  "ls",
  "cat",
  "curl",
  "git",
  "docker",
  "npm",
  "yarn",
  "pip",
  "gem",
  "bundle",
  "make",
  "div",
  "span",
  "button",
  "input",
  "form",
  "img",
  "ul",
  "ol",
  "li",
  "table",
  "tr",
  "td",
  "th",
  "thead",
  "tbody",
  "nav",
  "footer",
  "header",
  "main",
  "section",
  "article",
  "template",
  "script",
  "style",
  "link",
  "meta",
  "head",
  "body",
  "html",
  "Fragment",
  "Suspense",
  "Link",
]);

function tokenize(code: string): Token[] {
  const tokens: Token[] = [];
  const pattern =
    /(\/\/[^\n]*|#.*|--[^\n]*|\/\*[\s\S]*?\*\/)|("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|`(?:[^`\\]|\\.)*`)|(\b\d+\.?\d*\b)|(\b[A-Za-z_]\w*\b)|([^\s\w]+)/g;
  let match: RegExpExecArray | null;
  let lastIndex = 0;

  while ((match = pattern.exec(code)) !== null) {
    // Plain text before this match
    if (match.index > lastIndex) {
      tokens.push({
        text: code.slice(lastIndex, match.index),
        color: SYNTAX_COLORS.plain,
      });
    }
    const [full, comment, str, num, word, op] = match;
    if (comment) {
      tokens.push({ text: full, color: SYNTAX_COLORS.comment });
    } else if (str) {
      tokens.push({ text: full, color: SYNTAX_COLORS.string });
    } else if (num) {
      tokens.push({ text: full, color: SYNTAX_COLORS.number });
    } else if (word && KEYWORDS.has(word)) {
      tokens.push({ text: full, color: SYNTAX_COLORS.keyword });
    } else if (word) {
      const nextChar = code.charAt(pattern.lastIndex);
      if (nextChar === "(") {
        tokens.push({ text: full, color: SYNTAX_COLORS.fn });
      } else if (
        word[0] === word[0].toUpperCase() &&
        word[0] !== word[0].toLowerCase()
      ) {
        tokens.push({ text: full, color: SYNTAX_COLORS.type });
      } else {
        tokens.push({ text: full, color: SYNTAX_COLORS.plain });
      }
    } else if (op) {
      tokens.push({ text: full, color: SYNTAX_COLORS.op });
    }
    lastIndex = pattern.lastIndex;
  }

  // Remaining plain text
  if (lastIndex < code.length) {
    tokens.push({ text: code.slice(lastIndex), color: SYNTAX_COLORS.plain });
  }

  return tokens;
}

function HighlightedCode({
  code,
  showLineNumbers,
}: {
  code: string;
  showLineNumbers?: boolean;
}) {
  const tokens = useMemo(() => tokenize(code), [code]);
  const lines = code.split("\n");

  return (
    <div className="flex">
      {showLineNumbers && (
        <div
          className="select-none shrink-0 py-4 pl-4 pr-3 text-right font-mono text-[13px] leading-relaxed"
          style={{ color: "#484f58", backgroundColor: "#0d1117" }}
          aria-hidden="true"
        >
          {lines.map((_, i) => (
            <div key={i}>{i + 1}</div>
          ))}
        </div>
      )}
      <pre className="flex-1 p-4 text-[13px] font-mono leading-relaxed overflow-x-auto whitespace-pre">
        <code>
          {tokens.map((t, i) => (
            <span key={i} style={{ color: t.color }}>
              {t.text}
            </span>
          ))}
        </code>
      </pre>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Premium CodeBlock — dark themed, GitHub-style                      */
/* ------------------------------------------------------------------ */

interface CodeBlockProps {
  language?: string;
  code: string;
  className?: string;
  showLineNumbers?: boolean;
  title?: string;
}

export function CodeBlock({
  language,
  code,
  className,
  showLineNumbers,
  title,
}: CodeBlockProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  return (
    <div
      className={cn("rounded-xl overflow-hidden mb-6", className)}
      style={{
        borderColor: "#30363d",
        borderWidth: "1px",
        backgroundColor: "#0d1117",
        boxShadow:
          "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset",
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          borderBottom: "1px solid #21262d",
          backgroundColor: "#161b22",
        }}
      >
        <span
          className="text-[11px] font-semibold uppercase tracking-wider select-none"
          style={{ color: "#8b949e" }}
        >
          {title || language || "text"}
        </span>
        <button
          onClick={handleCopy}
          className={cn(
            "flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150",
          )}
          style={{
            color: copied ? "#3fb950" : "#8b949e",
            backgroundColor: copied ? "#1a3824" : "transparent",
          }}
          aria-label={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <>
              <Check size={12} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code area */}
      <div className="overflow-x-auto code-block-selection">
        <HighlightedCode code={code} showLineNumbers={showLineNumbers} />
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  CodeEditor — interactive tabbed code block for quickstart pages    */
/* ------------------------------------------------------------------ */

export function CodeEditor({
  flagKey,
  defaultLanguage = "node",
  className,
}: CodeEditorProps) {
  const [activeLang, setActiveLang] =
    useState<SupportedLanguage>(defaultLanguage);
  const [copied, setCopied] = useState(false);
  const snippets = generateSnippets(flagKey);
  const snippet: CodeSnippet = snippets[activeLang];

  const handleCopy = useCallback(async () => {
    await navigator.clipboard.writeText(snippet.code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [snippet.code]);

  return (
    <div
      className={cn("rounded-xl overflow-hidden", className)}
      style={{
        borderColor: "#30363d",
        borderWidth: "1px",
        backgroundColor: "#0d1117",
        boxShadow:
          "0 1px 3px rgba(0,0,0,0.3), 0 0 0 1px rgba(255,255,255,0.03) inset",
      }}
    >
      {/* Header bar */}
      <div
        className="flex items-center justify-between px-4 py-2"
        style={{
          borderBottom: "1px solid #21262d",
          backgroundColor: "#161b22",
        }}
      >
        <div className="flex items-center gap-0.5">
          {LANGUAGE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveLang(tab.key)}
              className="px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-150"
              style={{
                color: activeLang === tab.key ? "#e2e8f0" : "#8b949e",
                backgroundColor:
                  activeLang === tab.key ? "#21262d" : "transparent",
              }}
              aria-pressed={activeLang === tab.key}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium transition-all duration-150"
          style={{
            color: copied ? "#3fb950" : "#8b949e",
            backgroundColor: copied ? "#1a3824" : "transparent",
          }}
          aria-label={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <>
              <Check size={12} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <Copy size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code area */}
      <div className="overflow-x-auto code-block-selection">
        <HighlightedCode code={snippet.code} />
      </div>
    </div>
  );
}
