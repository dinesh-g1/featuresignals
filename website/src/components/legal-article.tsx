interface LegalArticleProps {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}

export function LegalArticle({
  title,
  lastUpdated = "April 4, 2026",
  children,
}: LegalArticleProps) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6 sm:py-20">
      <span className="text-xs font-semibold uppercase tracking-wider text-indigo-600">
        Legal
      </span>
      <h1 className="mt-2 text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
        {title}
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Last updated: {lastUpdated}
      </p>
      <div className="mt-8 space-y-6 text-base leading-relaxed text-slate-600 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-semibold [&_h2]:text-slate-900 [&_ul]:list-disc [&_ul]:pl-6 [&_ul]:space-y-2 [&_a]:font-medium [&_a]:text-indigo-600 [&_a]:underline [&_a]:decoration-indigo-200 [&_a]:hover:text-indigo-700 [&_strong]:text-slate-800 [&_p]:leading-relaxed">
        {children}
      </div>
      <div className="mt-12 border-t border-slate-200 pt-6 text-sm text-slate-400">
        <p>
          Questions? Contact{" "}
          <a
            href="mailto:support@featuresignals.com"
            className="font-medium text-indigo-600 underline decoration-indigo-200 hover:text-indigo-700"
          >
            support@featuresignals.com
          </a>
        </p>
      </div>
    </section>
  );
}
