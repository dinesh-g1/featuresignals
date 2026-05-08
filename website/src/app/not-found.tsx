import Link from "next/link";
import { SearchIcon, HomeIcon } from "lucide-react";

/**
 * 404 Page — fun, on-brand, not corporate.
 *
 * "This page doesn't exist. Unlike your feature flags, which definitely exist.
 *  Maybe too many of them. When was the last time you cleaned those up?"
 */

export default function NotFound() {
  return (
    <div className="min-h-screen pt-16 flex items-center justify-center bg-[var(--signal-bg-primary)] bg-glow-orbs">
      <div className="max-w-lg mx-auto px-6 py-20 text-center">
        {/* Large 404 */}
        <p className="text-[120px] sm:text-[160px] font-bold leading-none tracking-tighter text-[var(--signal-fg-primary)] opacity-10 select-none">
          404
        </p>

        <div className="-mt-12 mb-8">
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--signal-fg-primary)] mb-3">
            This page doesn&apos;t exist.
          </h1>
          <p className="text-[var(--signal-fg-secondary)] leading-relaxed">
            Unlike your feature flags, which definitely exist. Maybe{" "}
            <em>too many</em> of them. When was the last time you cleaned those
            up?
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--signal-bg-accent-emphasis)] hover:bg-[#0757ba] transition-colors duration-150"
          >
            <HomeIcon size={16} />
            Go Home
          </Link>
          <a
            href="https://docs.featuresignals.com"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-[var(--signal-fg-primary)] bg-[var(--signal-bg-secondary)] hover:bg-[#eff2f5] border border-[var(--signal-border-default)] transition-colors duration-150"
          >
            <SearchIcon size={16} />
            Search Docs
          </a>
        </div>
      </div>
    </div>
  );
}
