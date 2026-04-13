"use client";

import { cn } from "@/lib/utils";
import type { ReactNode } from "react";

interface FeatureCardProps {
  /** Icon element to display (pass as JSX: `<Icon className="..." strokeWidth={1.5} />`) */
  icon: ReactNode;
  /** Feature title */
  title: string;
  /** Feature description */
  description: string;
  /** Code example block (optional - card adapts if not provided) */
  code?: {
    lang: string;
    label: string;
    code: string;
  };
  /** Additional features list (optional) */
  features?: string[];
  /** Additional children below description (optional) */
  children?: ReactNode;
  /** Reverse layout (code on left, text on right) */
  reverse?: boolean;
}

/**
 * Standardized feature card used across all feature pages.
 * Layout: Left = icon + title + description + features
 *         Right = code example (if provided)
 * Fully responsive on all devices.
 */
export function FeatureCard({
  icon,
  title,
  description,
  code,
  features,
  children,
  reverse = false,
}: FeatureCardProps) {
  const hasCode = !!code;

  return (
    <article
      className={cn(
        "group rounded-2xl border border-slate-200 bg-white p-5 transition-all duration-200 hover:border-slate-300 hover:shadow-lg sm:p-8",
      )}
    >
      <div
        className={cn(
          "flex flex-col gap-6 sm:gap-8",
          hasCode ? "lg:flex-row" : "",
          hasCode && reverse ? "lg:flex-row-reverse" : "",
        )}
      >
        {/* Left: Icon + Copy */}
        <div className={cn(hasCode ? "lg:w-1/2" : "w-full")}>
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 ring-1 ring-indigo-100 transition-colors group-hover:bg-indigo-100 sm:h-12 sm:w-12">
            {icon}
          </div>

          <h3 className="mt-4 text-lg font-bold text-slate-900 sm:text-xl lg:text-2xl">
            {title}
          </h3>

          <p className="mt-2 text-sm leading-relaxed text-slate-600 sm:text-base">
            {description}
          </p>

          {features && features.length > 0 && (
            <ul className="mt-4 space-y-2">
              {features.map((f) => (
                <li
                  key={f}
                  className="flex items-start gap-2 text-sm text-slate-600"
                >
                  <svg
                    className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2}
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                  <span className="text-sm">{f}</span>
                </li>
              ))}
            </ul>
          )}

          {children}
        </div>

        {/* Right: Code Example */}
        {hasCode && (
          <div className="lg:w-1/2">
            <div className="overflow-hidden rounded-xl bg-slate-950 text-left shadow-xl ring-1 ring-white/10">
              <div className="flex items-center gap-2 border-b border-white/10 px-4 py-2.5">
                <span className="h-2.5 w-2.5 rounded-full bg-red-500/90" />
                <span className="h-2.5 w-2.5 rounded-full bg-amber-500/90" />
                <span className="h-2.5 w-2.5 rounded-full bg-emerald-500/90" />
                <span className="ml-auto font-mono text-[11px] text-slate-500 sm:text-xs">
                  {code.label}
                </span>
              </div>
              <pre className="overflow-x-auto p-4 font-mono text-[11px] leading-relaxed text-slate-300 sm:p-5 sm:text-xs sm:leading-loose">
                {code.code}
              </pre>
            </div>
          </div>
        )}
      </div>
    </article>
  );
}
