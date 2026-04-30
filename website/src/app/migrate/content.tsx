"use client";

import { motion } from "framer-motion";
import {
  SyncIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  PackageIcon,
  DownloadIcon,
} from "@primer/octicons-react";
import { MigrationPreview } from "@/components/migration-preview";

const migrationFacts = [
  {
    icon: <SyncIcon size={16} fill="var(--fgColor-accent)" />,
    title: "Minutes, not months",
    desc: "Connect your existing provider. Our migration tool scans your flags, environments, and segments. Preview the results. Migrate with one click.",
  },
  {
    icon: <PackageIcon size={16} fill="var(--fgColor-done)" />,
    title: "OpenFeature native",
    desc: "All 8 SDKs support OpenFeature. Swap providers without changing a single line of application code. No vendor lock-in. Ever.",
  },
  {
    icon: <DownloadIcon size={16} fill="var(--fgColor-success)" />,
    title: "Export your data, anytime",
    desc: "Your flags, your data. Export everything in standard formats. We make it easy to leave — which is why most teams never do.",
  },
];

export function MigratePageContent() {
  return (
    <>
      <section className="py-16 sm:py-20">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Demo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <MigrationPreview />
            </motion.div>

            {/* Right: Text */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)] border border-[var(--borderColor-success-muted)] mb-6">
                <SyncIcon size={12} />
                Step 5 of 6
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--fgColor-default)] leading-[1.1]">
                Already on another platform? We&apos;ll get you out.
              </h1>
              <p className="text-lg text-[var(--fgColor-muted)] mt-4 leading-relaxed">
                We believe switching costs are the enemy of innovation. If
                you&apos;re on another feature flag platform, we&apos;ve built
                automated migration tools to bring your flags, environments, and
                targeting rules over in minutes — not months. No manual export.
                No configuration drift. No downtime.
              </p>

              <div className="mt-6 space-y-4">
                {migrationFacts.map((fact, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bgColor-inset)] border border-[var(--borderColor-default)]">
                      {fact.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--fgColor-default)]">
                        {fact.title}
                      </div>
                      <div className="text-sm text-[var(--fgColor-muted)]">
                        {fact.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <a
                  href="https://docs.featuresignals.com/migration"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--fgColor-accent)] hover:underline"
                >
                  Learn more about migration
                  <ArrowRightIcon size={14} />
                </a>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bottom nav */}
      <section className="py-10 border-t border-[var(--borderColor-muted)] bg-[var(--bgColor-inset)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-xs font-semibold text-[var(--fgColor-subtle)] uppercase tracking-wider mb-4 text-center">
            The Feature Flag Lifecycle
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
            {[
              { label: "Create", href: "/create", active: false, icon: "🚩" },
              { label: "Target", href: "/target", active: false, icon: "🎯" },
              {
                label: "Rollout",
                href: "/rollout",
                active: false,
                icon: "📈",
              },
              {
                label: "Clean Up",
                href: "/cleanup",
                active: false,
                icon: "🧹",
              },
              { label: "Migrate", href: "/migrate", active: true, icon: "📦" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <a
                  href={step.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                    step.active
                      ? "bg-[var(--bgColor-success-emphasis)] text-white"
                      : "text-[var(--fgColor-muted)] hover:text-[var(--fgColor-default)] hover:bg-white border border-[var(--borderColor-default)]"
                  }`}
                >
                  <span aria-hidden="true">{step.icon}</span>
                  {step.label}
                </a>
                {i < 4 && (
                  <ArrowRightIcon
                    size={12}
                    className="text-[var(--fgColor-subtle)] hidden sm:block"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
