"use client";

import { useState, useCallback } from "react";
import { CopyIcon, CheckIcon } from "@primer/octicons-react";
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
      className={cn(
        "rounded-xl border border-[var(--borderColor-default)] overflow-hidden",
        className,
      )}
      style={{ boxShadow: "var(--shadow-resting-small)" }}
    >
      {/* Header bar */}
      <div className="flex items-center justify-between px-4 py-2 bg-[var(--bgColor-inset)] border-b border-[var(--borderColor-muted)]">
        <div className="flex items-center gap-0.5">
          {LANGUAGE_TABS.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveLang(tab.key)}
              className={cn(
                "px-3 py-1.5 text-xs font-medium rounded-md transition-colors duration-150",
                activeLang === tab.key
                  ? "bg-white text-[var(--fgColor-default)] shadow-[var(--shadow-resting-xsmall)]"
                  : "text-[var(--fgColor-muted)] hover:text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)]",
              )}
              aria-pressed={activeLang === tab.key}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-medium text-[var(--fgColor-muted)] hover:text-[var(--fgColor-default)] hover:bg-[var(--bgColor-muted)] rounded-md transition-colors duration-150"
          aria-label={copied ? "Copied!" : "Copy code"}
        >
          {copied ? (
            <>
              <CheckIcon size={12} />
              <span>Copied</span>
            </>
          ) : (
            <>
              <CopyIcon size={12} />
              <span>Copy</span>
            </>
          )}
        </button>
      </div>

      {/* Code area */}
      <div className="overflow-x-auto">
        <pre className="p-4 text-sm font-mono leading-relaxed text-[var(--fgColor-default)] bg-[var(--bgColor-default)] overflow-x-auto">
          <code className="language-typescript">{snippet.code}</code>
        </pre>
      </div>
    </div>
  );
}
