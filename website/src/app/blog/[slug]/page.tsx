import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeftIcon, ClockIcon, CalendarIcon } from "@primer/octicons-react";
import { posts, getPostBySlug, type BlogSection } from "@/lib/blog-posts";
import { CodeBlock } from "@/components/ui/code-editor";
import { cn } from "@/lib/utils";

/* ==========================================================================
   Static Params — required for static export (`output: "export"`)
   ========================================================================== */

export function generateStaticParams() {
  return posts.map((p) => ({ slug: p.slug }));
}

/* ==========================================================================
   Metadata
   ========================================================================== */

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) {
    return { title: "Post Not Found" };
  }
  return {
    title: post.title,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author.name],
    },
  };
}

/* ==========================================================================
   Category color lookup
   ========================================================================== */

const categoryColors: Record<string, string> = {
  Engineering: "var(--signal-fg-accent)",
  Product: "var(--signal-fg-success)",
  Guides: "var(--signal-fg-info)",
  Security: "var(--signal-fg-warning)",
  DevOps: "var(--signal-fg-secondary)",
  "Open Source": "var(--signal-fg-info)",
};

/* ==========================================================================
   Page (Server Component)
   ========================================================================== */

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <article className="min-h-screen bg-[var(--signal-bg-primary)]">
      {/* Back link */}
      <div className="mx-auto max-w-3xl px-6 pt-8 pb-4">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-accent)] transition-colors"
        >
          <ArrowLeftIcon size={14} />
          Back to blog
        </Link>
      </div>

      {/* Header */}
      <header className="mx-auto max-w-3xl px-6 pb-8 border-b border-[var(--signal-border-default)]">
        <div className="mb-4">
          <span
            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
            style={{
              color: categoryColors[post.category] ?? "var(--signal-fg-secondary)",
              backgroundColor: "var(--signal-bg-accent-muted)",
              border: "1px solid var(--signal-border-accent-muted)",
            }}
          >
            {post.category}
          </span>
        </div>
        <h1 className="text-3xl sm:text-4xl font-bold text-[var(--signal-fg-primary)] tracking-tight mb-4">
          {post.title}
        </h1>
        <p className="text-lg text-[var(--signal-fg-secondary)] mb-6 leading-relaxed">
          {post.description}
        </p>
        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--signal-fg-secondary)]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-[var(--signal-bg-accent-muted)] flex items-center justify-center text-xs font-bold text-[var(--signal-fg-accent)]">
              {post.author.name
                .split(" ")
                .map((n) => n[0])
                .join("")
                .slice(0, 2)}
            </div>
            <span className="font-medium text-[var(--signal-fg-primary)]">
              {post.author.name}
            </span>
          </div>
          <span className="text-[var(--signal-border-emphasis)] hidden sm:inline">
            ·
          </span>
          <span className="hidden sm:inline">{post.author.role}</span>
          <span className="text-[var(--signal-border-emphasis)]">·</span>
          <span className="flex items-center gap-1">
            <CalendarIcon size={12} />
            {post.date}
          </span>
          <span className="text-[var(--signal-border-emphasis)]">·</span>
          <span className="flex items-center gap-1">
            <ClockIcon size={12} />
            {post.readTime}
          </span>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-3xl px-6 py-10">
        {post.sections.length === 0 ? (
          <ComingSoon />
        ) : (
          <div className="max-w-none">
            {post.sections.map((section, i) => (
              <BlogSectionRenderer key={i} section={section} />
            ))}
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mx-auto max-w-3xl px-6 pb-16 pt-8 border-t border-[var(--signal-border-default)]">
        <Link
          href="/blog"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
        >
          <ArrowLeftIcon size={14} />
          Read more articles
        </Link>
      </footer>
    </article>
  );
}

/* ==========================================================================
   Coming Soon Placeholder
   ========================================================================== */

function ComingSoon() {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center">
      <div className="w-16 h-16 rounded-2xl bg-[var(--signal-bg-accent-muted)] flex items-center justify-center mb-5">
        <svg
          width="28"
          height="28"
          viewBox="0 0 24 24"
          fill="none"
          stroke="var(--signal-fg-accent)"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      </div>
      <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)] mb-2">
        Full article coming soon
      </h2>
      <p className="text-sm text-[var(--signal-fg-secondary)] max-w-md">
        This article is currently in the works. Check back soon for the complete
        technical deep-dive, or{" "}
        <Link
          href="/blog"
          className="text-[var(--signal-fg-accent)] hover:underline"
        >
          browse other published articles
        </Link>
        .
      </p>
    </div>
  );
}

/* ==========================================================================
   Section Renderer
   ========================================================================== */

function BlogSectionRenderer({ section }: { section: BlogSection }) {
  switch (section.type) {
    case "heading": {
      const Tag = section.headingLevel === 3 ? "h3" : "h2";
      return (
        <Tag
          className={cn(
            "font-semibold text-[var(--signal-fg-primary)]",
            section.headingLevel === 3
              ? "text-lg mt-8 mb-3"
              : "text-2xl mt-12 mb-4 pb-2 border-b border-[var(--signal-border-default)]",
          )}
        >
          {section.content}
        </Tag>
      );
    }

    case "paragraph":
      return (
        <p className="text-[var(--signal-fg-primary)] leading-relaxed mb-5 text-[0.95rem]">
          {section.content}
        </p>
      );

    case "code":
      return (
        <CodeBlock
          language={section.language}
          code={section.code ?? ""}
          className="my-6"
          showLineNumbers={
            section.language !== "text" && section.language !== "markdown"
          }
        />
      );

    case "list":
      return <ListBlock items={section.items} ordered={section.ordered} />;

    case "callout":
      return (
        <CalloutBlock type={section.calloutType} text={section.calloutText} />
      );

    default:
      return null;
  }
}

/* ==========================================================================
   List Block
   ========================================================================== */

function ListBlock({
  items,
  ordered,
}: {
  items?: string[];
  ordered?: boolean;
}) {
  if (!items || items.length === 0) return null;
  const ListTag = ordered ? "ol" : "ul";
  return (
    <ListTag
      className={cn(
        "mb-5 space-y-1.5",
        ordered ? "list-decimal pl-6" : "list-disc pl-6",
      )}
    >
      {items.map((item, i) => (
        <li
          key={i}
          className="text-[var(--signal-fg-primary)] leading-relaxed text-[0.95rem] pl-1"
        >
          {item}
        </li>
      ))}
    </ListTag>
  );
}

/* ==========================================================================
   Callout Block
   ========================================================================== */

function CalloutBlock({
  type,
  text,
}: {
  type?: "info" | "warning" | "tip";
  text?: string;
}) {
  if (!text) return null;

  const config: Record<
    string,
    {
      icon: string;
      bg: string;
      border: string;
      fg: string;
      label: string;
    }
  > = {
    info: {
      icon: "\u2139\uFE0F",
      bg: "var(--signal-bg-accent-muted)",
      border: "var(--signal-border-accent-muted)",
      fg: "var(--signal-fg-accent)",
      label: "Info",
    },
    warning: {
      icon: "\u26A0\uFE0F",
      bg: "var(--signal-bg-warning-muted)",
      border: "var(--signal-border-warning-muted)",
      fg: "var(--signal-fg-warning)",
      label: "Warning",
    },
    tip: {
      icon: "\uD83D\uDCA1",
      bg: "var(--signal-bg-info-muted)",
      border: "var(--signal-border-accent-muted)",
      fg: "var(--signal-fg-info)",
      label: "Tip",
    },
  };

  const c = config[type ?? "info"];

  return (
    <div
      className="my-6 rounded-lg border p-4 flex gap-3"
      style={{
        backgroundColor: c.bg,
        borderColor: c.border,
      }}
    >
      <span className="text-lg shrink-0 mt-0.5" role="img" aria-label={c.label}>
        {c.icon}
      </span>
      <div>
        <p className="text-sm font-semibold mb-1" style={{ color: c.fg }}>
          {c.label}
        </p>
        <p className="text-sm text-[var(--signal-fg-primary)] leading-relaxed">
          {text}
        </p>
      </div>
    </div>
  );
}
