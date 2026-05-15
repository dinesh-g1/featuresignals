"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useAppStore } from "@/stores/app-store";
import { PageHeader } from "@/components/ui/page-header";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
  CardFooter,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Code2FlagSpec, Code2FlagImplementation } from "@/lib/api";
import {
  FlagIcon,
  CodeIcon,
  AlertIcon,
  ArrowLeftIcon,
  GitPullRequestIcon,
  ExternalLinkIcon,
  CopyIcon,
  CheckIcon,
} from "@/components/icons/nav-icons";
import { DocsLink } from "@/components/docs-link";

// ─── Language options for code generation ───────────────────────────────

const LANGUAGES = [
  { value: "typescript", label: "TypeScript" },
  { value: "javascript", label: "JavaScript" },
  { value: "go", label: "Go" },
  { value: "python", label: "Python" },
  { value: "java", label: "Java" },
  { value: "ruby", label: "Ruby" },
];

// ─── Confidence display ─────────────────────────────────────────────────

function confidenceColor(confidence: number): string {
  if (confidence >= 0.9) return "text-[var(--signal-fg-success)]";
  if (confidence >= 0.7) return "text-[var(--signal-fg-warning)]";
  return "text-[var(--signal-fg-danger)]";
}

function confidenceBg(confidence: number): string {
  if (confidence >= 0.9) return "bg-[var(--signal-bg-success-muted)]";
  if (confidence >= 0.7) return "bg-[var(--signal-bg-warning-muted)]";
  return "bg-[var(--signal-bg-danger-muted)]";
}

// ─── Skeleton ───────────────────────────────────────────────────────────

function FlagDetailSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="h-6 w-32 animate-pulse rounded bg-[var(--signal-border-default)]" />
      <div className="h-8 w-64 animate-pulse rounded bg-[var(--signal-border-default)]" />
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="h-24 animate-pulse rounded-xl bg-[var(--signal-border-default)]"
          />
        ))}
      </div>
      <div className="h-48 animate-pulse rounded-xl bg-[var(--signal-border-default)]" />
    </div>
  );
}

// ─── Page ───────────────────────────────────────────────────────────────

export default function FlagDetailPage() {
  const params = useParams();
  const _router = useRouter();
  const flagId = params.flagId as string;
  const projectId = params.projectId as string;
  const token = useAppStore((s) => s.token);

  const [spec, setSpec] = useState<Code2FlagSpec | null>(null);
  const [implementation, setImplementation] =
    useState<Code2FlagImplementation | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [language, setLanguage] = useState("typescript");
  const [implementing, setImplementing] = useState(false);
  const [copied, setCopied] = useState(false);

  // Fetch flag info — since we don't have a GET endpoint for a single flag,
  // we reconstruct from references list
  const fetchFlagInfo = useCallback(async () => {
    if (!token || !projectId || !flagId) return;
    setLoading(true);
    setError(null);
    try {
      const result = await api.code2flag.listReferences(token, projectId, {
        limit: 200,
      });

      // Try to find the flag spec — either it matches a flag key, or we
      // construct a placeholder from existing data
      // In production, this would be a dedicated GET endpoint
      const matchingRefs = (result.data || []).filter(
        (r) =>
          r.file_path.includes(flagId) ||
          r.conditional_text.toLowerCase().includes(flagId.toLowerCase()),
      );

      if (matchingRefs.length > 0) {
        // Build a synthetic spec from references
        const _firstRef = matchingRefs[0];
        setSpec({
          flag_key: flagId,
          flag_name: flagId
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          flag_type: "boolean",
          suggested_variants: {
            true: matchingRefs
              .filter(
                (r) =>
                  r.conditional_text.includes("true") ||
                  r.conditional_text.includes("enabled"),
              )
              .map((r) => r.conditional_text)
              .slice(0, 3),
            false: matchingRefs
              .filter(
                (r) =>
                  r.conditional_text.includes("false") ||
                  r.conditional_text.includes("disabled"),
              )
              .map((r) => r.conditional_text)
              .slice(0, 3),
          },
          confidence:
            matchingRefs.reduce((sum, r) => sum + r.confidence, 0) /
            matchingRefs.length,
          created_at: new Date().toISOString(),
        });
      } else {
        // No references found — show a placeholder
        setSpec({
          flag_key: flagId,
          flag_name: flagId
            .replace(/-/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
          flag_type: "boolean",
          confidence: 0,
          created_at: new Date().toISOString(),
        });
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to load flag details",
      );
    } finally {
      setLoading(false);
    }
  }, [token, projectId, flagId]);

  useEffect(() => {
    fetchFlagInfo();
  }, [fetchFlagInfo]);

  // Handle implementation
  const handleImplement = useCallback(async () => {
    if (!token || !projectId || !spec) return;
    setImplementing(true);
    try {
      const result = await api.code2flag.createImplementation(
        token,
        projectId,
        {
          flag_key: spec.flag_key,
          repo_name: "owner/repo", // In production, this would come from the spec
          language,
          file_path: `src/features/${spec.flag_key}.ts`,
          line_number: 1,
        },
      );
      setImplementation(result);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to create implementation",
      );
    } finally {
      setImplementing(false);
    }
  }, [token, projectId, spec, language]);

  // Copy code snippet
  const handleCopy = useCallback(async () => {
    if (!implementation?.code_snippet) return;
    try {
      await navigator.clipboard.writeText(implementation.code_snippet);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API not available
    }
  }, [implementation]);

  if (loading) return <FlagDetailSkeleton />;

  return (
    <Suspense fallback={<FlagDetailSkeleton />}>
      <div className="space-y-6 animate-fade-in">
        {/* Back link */}
        <Link
          href={`/projects/${projectId}/discover`}
          className="inline-flex items-center gap-1 text-sm text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-accent)] transition-colors"
        >
          <ArrowLeftIcon className="h-4 w-4" />
          Back to Discover
        </Link>

        {/* Error state */}
        {error && !spec && (
          <div className="rounded-xl border border-red-200 bg-[var(--signal-bg-danger-muted)] p-6 flex flex-col items-center gap-3 text-center">
            <AlertIcon className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-sm font-semibold text-red-800">
                Flag not found
              </p>
              <p className="text-xs text-red-600 mt-1">{error}</p>
            </div>
            <Button size="sm" variant="default" onClick={fetchFlagInfo}>
              Retry
            </Button>
          </div>
        )}

        {spec && (
          <>
            {/* Header */}
            <PageHeader
              title={
                <div className="flex items-center gap-2">
                  <FlagIcon className="h-6 w-6 text-[var(--signal-fg-accent)]" />
                  <span>{spec.flag_name}</span>
                </div>
              }
              description={`Flag key: ${spec.flag_key}`}
            >
              <div className="flex items-center gap-2">
                <DocsLink
                  href="/docs/code2flag/implementation"
                  label="📚 Docs"
                />
                {!implementation && (
                  <Button
                    variant="default"
                    onClick={handleImplement}
                    loading={implementing}
                    disabled={implementing || spec.confidence === 0}
                  >
                    <GitPullRequestIcon className="h-4 w-4" />
                    Create Implementation PR
                  </Button>
                )}
              </div>
            </PageHeader>

            {/* Metadata cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider">
                    Flag Type
                  </p>
                  <p className="text-lg font-bold text-[var(--signal-fg-primary)] mt-1 capitalize">
                    {spec.flag_type}
                  </p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider">
                    Confidence
                  </p>
                  <span
                    className={cn(
                      "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-sm font-bold mt-1",
                      confidenceBg(spec.confidence),
                      confidenceColor(spec.confidence),
                    )}
                  >
                    {spec.confidence > 0
                      ? `${(spec.confidence * 100).toFixed(0)}%`
                      : "N/A"}
                  </span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4">
                  <p className="text-xs font-semibold text-[var(--signal-fg-secondary)] uppercase tracking-wider">
                    Created
                  </p>
                  <p className="text-sm font-medium text-[var(--signal-fg-primary)] mt-1">
                    {new Date(spec.created_at).toLocaleDateString(undefined, {
                      year: "numeric",
                      month: "short",
                      day: "numeric",
                    })}
                  </p>
                </CardContent>
              </Card>
            </div>

            {/* Suggested Variants */}
            {spec.suggested_variants && (
              <Card>
                <CardHeader>
                  <CardTitle>Suggested Variants</CardTitle>
                  <CardDescription>
                    Variants automatically detected from code usage patterns
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3">
                  {Object.entries(
                    spec.suggested_variants as Record<string, unknown>,
                  ).map(([variant, examples]) => (
                    <div
                      key={variant}
                      className="rounded-lg border border-[var(--signal-border-default)] p-3"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant="info">{variant}</Badge>
                        <span className="text-xs text-[var(--signal-fg-tertiary)]">
                          detected in code
                        </span>
                      </div>
                      {Array.isArray(examples) && examples.length > 0 ? (
                        <ul className="space-y-1">
                          {examples.map((ex: string, i: number) => (
                            <li
                              key={i}
                              className="text-xs font-mono text-[var(--signal-fg-secondary)] bg-[var(--signal-bg-secondary)] rounded px-2 py-1 truncate"
                            >
                              {ex}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-xs text-[var(--signal-fg-tertiary)] italic">
                          No usage examples detected yet
                        </p>
                      )}
                    </div>
                  ))}
                </CardContent>
              </Card>
            )}

            {/* Implementation section */}
            {!implementation && (
              <Card>
                <CardHeader>
                  <CardTitle>Implementation</CardTitle>
                  <CardDescription>
                    Generate the implementation code for this feature flag
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 max-w-xs">
                      <label
                        htmlFor="language-select"
                        className="block text-xs font-semibold text-[var(--signal-fg-secondary)] mb-1.5"
                      >
                        Language
                      </label>
                      <Select
                        value={language}
                        onValueChange={setLanguage}
                        options={LANGUAGES}
                        size="sm"
                        className="w-full"
                      />
                    </div>
                    <Button
                      variant="default"
                      onClick={handleImplement}
                      loading={implementing}
                      disabled={implementing}
                      className="mt-5"
                    >
                      <CodeIcon className="h-4 w-4" />
                      Generate Code
                    </Button>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Generated code */}
            {implementation && (
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>Generated Implementation</CardTitle>
                      <CardDescription>
                        {implementation.language} · {implementation.file_path}
                      </CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="default" size="sm" onClick={handleCopy}>
                        {copied ? (
                          <>
                            <CheckIcon className="h-3.5 w-3.5" />
                            Copied
                          </>
                        ) : (
                          <>
                            <CopyIcon className="h-3.5 w-3.5" />
                            Copy
                          </>
                        )}
                      </Button>
                      {implementation.pr_url && (
                        <a
                          href={implementation.pr_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 rounded-lg border border-[var(--signal-border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
                        >
                          View PR
                          <ExternalLinkIcon className="h-3 w-3" />
                        </a>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <pre className="overflow-x-auto rounded-lg bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] p-4 text-xs font-mono text-[var(--signal-fg-primary)] leading-relaxed">
                    <code>{implementation.code_snippet}</code>
                  </pre>
                </CardContent>
                {implementation.pr_url && (
                  <CardFooter>
                    <div className="flex items-center gap-2">
                      <Badge variant="success">PR Created</Badge>
                      <span className="text-xs text-[var(--signal-fg-secondary)]">
                        A pull request has been created with this
                        implementation.
                      </span>
                    </div>
                  </CardFooter>
                )}
              </Card>
            )}

            {/* Empty implementation state */}
            {!implementation && spec.confidence === 0 && (
              <div className="py-8">
                <EmptyState
                  icon={CodeIcon}
                  emoji="🔧"
                  title="This feature candidate hasn't been implemented yet"
                  description="This flag was detected but hasn't been confirmed with sufficient references. Run a survey with more code to improve confidence, or manually create this flag from the Flags page."
                >
                  <div className="flex items-center gap-2">
                    <Link
                      href={`/projects/${projectId}/flags/new`}
                      className="inline-flex items-center gap-1 rounded-lg bg-[var(--signal-bg-accent-emphasis)] px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-[var(--signal-bg-accent-emphasis)]"
                    >
                      Create Flag Manually
                    </Link>
                    <Link
                      href={`/projects/${projectId}/discover`}
                      className="inline-flex items-center gap-1 rounded-lg border border-[var(--signal-border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
                    >
                      <ArrowLeftIcon className="h-3 w-3" />
                      Back to Discover
                    </Link>
                  </div>
                </EmptyState>
              </div>
            )}
          </>
        )}

        {/* Not found state */}
        {!spec && !loading && !error && (
          <div className="py-12">
            <EmptyState
              icon={FlagIcon}
              emoji="🚩"
              title="Feature candidate not found"
              description="The feature candidate you're looking for doesn't exist or has been removed."
            >
              <Link
                href={`/projects/${projectId}/discover`}
                className="inline-flex items-center gap-1 rounded-lg border border-[var(--signal-border-default)] px-3 py-1.5 text-xs font-semibold text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
              >
                <ArrowLeftIcon className="h-3 w-3" />
                Back to Discover
              </Link>
            </EmptyState>
          </div>
        )}
      </div>
    </Suspense>
  );
}
