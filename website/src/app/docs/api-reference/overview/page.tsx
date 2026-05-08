import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  PlayIcon,
  KeyIcon,
  LockIcon,
} from "lucide-react";
import { CodeBlock } from "@/components/ui/code-editor";
import apiCategories from "@/data/api-endpoints";

export const metadata: Metadata = {
  title: "API Overview",
  description:
    "Complete REST API reference for FeatureSignals — authentication, flag management, evaluation, webhooks, and team endpoints.",
};

export default function ApiOverviewPage() {
  const totalEndpoints = apiCategories.reduce(
    (sum, c) => sum + c.endpoints.length,
    0,
  );

  return (
    <div>
      <h1
        id="docs-main-heading"
        className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-3"
      >
        API Reference
      </h1>
      <p className="text-lg text-[var(--signal-fg-secondary)] mb-8 leading-relaxed">
        The FeatureSignals REST API provides programmatic access to all platform
        features. <strong>{totalEndpoints} endpoints</strong> across{" "}
        <strong>{apiCategories.length} categories</strong> — with an{" "}
        <Link
          href="/docs/api-reference/playground"
          className="text-[var(--signal-fg-accent)] hover:underline font-medium"
        >
          interactive playground
        </Link>{" "}
        to try every endpoint from your browser.
      </p>

      {/* Playground CTA */}
      <Link
        href="/docs/api-reference/playground"
        className="inline-flex items-center gap-2 px-4 py-3 mb-8 rounded-lg font-medium text-sm transition-colors"
        style={{
          backgroundColor: "var(--signal-bg-accent-muted)",
          color: "var(--signal-fg-accent)",
          border: "1px solid var(--signal-border-accent-emphasis)",
        }}
      >
        <PlayIcon size={16} />
        <span>Open Interactive Playground</span>
        <ArrowRight size={14} />
      </Link>

      {/* Base URL */}
      <SectionHeading>Base URL</SectionHeading>
      <CodeBlock language="text" code="https://api.featuresignals.com/v1" />
      <p className="text-sm text-[var(--signal-fg-secondary)] mt-2 mb-6">
        For self-hosted installations, replace with your own API server URL.
      </p>

      {/* Authentication */}
      <SectionHeading>Authentication</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        The API uses two authentication methods:
      </p>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Method</Th>
            <Th>Header</Th>
            <Th>Use Case</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>
              <strong>JWT Bearer Token</strong>
            </Td>
            <Td>
              <InlineCode>Authorization: Bearer &lt;token&gt;</InlineCode>
            </Td>
            <Td>Management API (Flag Engine, admin)</Td>
          </Tr>
          <Tr>
            <Td>
              <strong>API Key</strong>
            </Td>
            <Td>
              <InlineCode>X-API-Key: &lt;key&gt;</InlineCode>
            </Td>
            <Td>Evaluation API (SDKs, clients)</Td>
          </Tr>
        </tbody>
      </SimpleTable>
      <p className="text-sm text-[var(--signal-fg-secondary)] mt-2 mb-6">
        See{" "}
        <Link
          href="/docs/api-reference/authentication"
          className="text-[var(--signal-fg-accent)] hover:underline"
        >
          Authentication
        </Link>{" "}
        for details.
      </p>

      {/* All API Categories */}
      <SectionHeading>API Categories</SectionHeading>
      <p className="text-[var(--signal-fg-secondary)] mb-6">
        Every endpoint in the FeatureSignals API, organized by category. Click
        any category to see detailed endpoint specifications, or use the{" "}
        <Link
          href="/docs/api-reference/playground"
          className="text-[var(--signal-fg-accent)] hover:underline"
        >
          playground
        </Link>{" "}
        to execute requests directly.
      </p>

      <div className="grid gap-3 sm:grid-cols-2">
        {apiCategories.map((cat) => {
          const authTypes = [
            ...new Set(
              cat.endpoints.map((e) => e.auth).filter((a) => a !== "None"),
            ),
          ];
          return (
            <Link
              key={cat.slug}
              href={`/docs/api-reference/${cat.slug}`}
              className="group flex flex-col p-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] hover:border-[var(--signal-border-accent-emphasis)] hover:shadow-[var(--signal-shadow-md)] transition-all duration-200"
            >
              <div className="flex items-center justify-between mb-2">
                <h3 className="font-semibold text-[var(--signal-fg-primary)] group-hover:text-[var(--signal-fg-accent)] transition-colors">
                  {cat.name}
                </h3>
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium"
                  style={{
                    backgroundColor: "var(--signal-bg-secondary)",
                    color: "var(--signal-fg-secondary)",
                  }}
                >
                  {cat.endpoints.length} endpoint
                  {cat.endpoints.length !== 1 ? "s" : ""}
                </span>
              </div>
              <p className="text-xs text-[var(--signal-fg-secondary)] leading-relaxed mb-2">
                {cat.description}
              </p>
              {authTypes.length > 0 && (
                <div className="flex items-center gap-2 mt-auto">
                  {authTypes.map((a) => (
                    <span
                      key={a}
                      className="inline-flex items-center gap-1 text-[10px]"
                      style={{ color: "var(--signal-fg-secondary)" }}
                    >
                      {a === "Bearer JWT" ? (
                        <LockIcon size={10} />
                      ) : (
                        <KeyIcon size={10} />
                      )}
                      {a}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          );
        })}
      </div>

      {/* Pagination */}
      <SectionHeading>Pagination</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Parameter</Th>
            <Th>Default</Th>
            <Th>Max</Th>
            <Th>Description</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>
              <InlineCode>limit</InlineCode>
            </Td>
            <Td>50</Td>
            <Td>100</Td>
            <Td>Number of items per page</Td>
          </Tr>
          <Tr>
            <Td>
              <InlineCode>offset</InlineCode>
            </Td>
            <Td>0</Td>
            <Td>—</Td>
            <Td>Number of items to skip</Td>
          </Tr>
        </tbody>
      </SimpleTable>
      <p className="text-sm text-[var(--signal-fg-secondary)] mt-3 mb-2">
        Paginated responses use a consistent envelope:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "data": [ ... ],
  "total": 42,
  "limit": 50,
  "offset": 0,
  "has_more": false
}`}
      />

      {/* Error Responses */}
      <SectionHeading>Error Responses</SectionHeading>
      <p className="text-[var(--signal-fg-primary)] mb-4">
        All errors follow a consistent format:
      </p>
      <CodeBlock
        language="json"
        code={`{
  "error": "descriptive error message",
  "request_id": "correlation-id"
}`}
      />
      <SimpleTable>
        <thead>
          <tr>
            <Th>Code</Th>
            <Th>Meaning</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>
              <InlineCode>400</InlineCode>
            </Td>
            <Td>Bad request (validation error)</Td>
          </Tr>
          <Tr>
            <Td>
              <InlineCode>401</InlineCode>
            </Td>
            <Td>Unauthorized (missing/invalid auth)</Td>
          </Tr>
          <Tr>
            <Td>
              <InlineCode>403</InlineCode>
            </Td>
            <Td>Forbidden (insufficient permissions)</Td>
          </Tr>
          <Tr>
            <Td>
              <InlineCode>404</InlineCode>
            </Td>
            <Td>Not found</Td>
          </Tr>
          <Tr>
            <Td>
              <InlineCode>409</InlineCode>
            </Td>
            <Td>Conflict (duplicate resource)</Td>
          </Tr>
          <Tr>
            <Td>
              <InlineCode>429</InlineCode>
            </Td>
            <Td>Rate limit exceeded</Td>
          </Tr>
          <Tr>
            <Td>
              <InlineCode>500</InlineCode>
            </Td>
            <Td>Internal server error</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Rate Limiting */}
      <SectionHeading>Rate Limiting</SectionHeading>
      <SimpleTable>
        <thead>
          <tr>
            <Th>Header</Th>
            <Th>Meaning</Th>
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td>
              <InlineCode>X-RateLimit-Limit</InlineCode>
            </Td>
            <Td>Maximum requests allowed in the current window</Td>
          </Tr>
          <Tr>
            <Td>
              <InlineCode>X-RateLimit-Remaining</InlineCode>
            </Td>
            <Td>Requests remaining before the limit is hit</Td>
          </Tr>
          <Tr>
            <Td>
              <InlineCode>X-RateLimit-Reset</InlineCode>
            </Td>
            <Td>Unix timestamp when the window resets</Td>
          </Tr>
        </tbody>
      </SimpleTable>

      {/* Next Steps */}
      <SectionHeading>Next Steps</SectionHeading>
      <div className="grid gap-3 sm:grid-cols-2">
        {[
          {
            label: "Authentication",
            href: "/docs/api-reference/authentication",
          },
          { label: "Flags API", href: "/docs/api-reference/flags" },
          { label: "Evaluation API", href: "/docs/api-reference/evaluation" },
          { label: "Admin API", href: "/docs/api-reference/admin" },
        ].map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className="flex items-center gap-2 px-3 py-2 rounded-md text-sm text-[var(--signal-fg-accent)] hover:bg-[var(--signal-bg-accent-muted)] transition-colors font-medium"
          >
            <ArrowRight size={14} />
            <span>{step.label}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function SectionHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mt-10 mb-4 pb-2 border-b border-[var(--signal-border-default)]">
      {children}
    </h2>
  );
}

function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 text-[0.85em] font-mono rounded bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-primary)] border border-[var(--signal-border-default)]">
      {children}
    </code>
  );
}

function Badge({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  let bg = "var(--signal-bg-success-muted)";
  let fg = "var(--signal-fg-success)";
  if (className === "put") {
    bg = "var(--signal-bg-warning-muted)";
    fg = "var(--signal-fg-warning)";
  } else if (className === "delete") {
    bg = "var(--signal-bg-danger-muted)";
    fg = "var(--signal-fg-danger)";
  }

  return (
    <span
      className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-semibold font-mono"
      style={{ backgroundColor: bg, color: fg }}
    >
      {children}
    </span>
  );
}

function SimpleTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto border border-[var(--signal-border-default)] rounded-lg mb-6">
      <table className="w-full text-sm text-left">{children}</table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th className="px-4 py-2.5 font-semibold bg-[var(--signal-bg-secondary)] border-b border-[var(--signal-border-default)] text-[var(--signal-fg-primary)]">
      {children}
    </th>
  );
}

function Tr({ children }: { children: React.ReactNode }) {
  return (
    <tr className="border-b border-[var(--signal-border-default)] last:border-b-0">
      {children}
    </tr>
  );
}

function Td({ children }: { children: React.ReactNode }) {
  return (
    <td className="px-4 py-2.5 text-[var(--signal-fg-primary)]">{children}</td>
  );
}
