"use client";

import { motion } from "framer-motion";
import { Rocket, ArrowRight, Workflow, GitBranch } from "lucide-react";
import { FlagCreator } from "@/components/flag-creator";

const lifecycleSteps = [
  "Define the flag key and type",
  "Set a default value for safety",
  "Target specific users or segments",
  "Roll out gradually with confidence",
  "Clean up automatically when done",
];

export function CreatePageContent() {
  return (
    <>
      <section className="relative py-16 sm:py-20 bg-glow-orbs">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Text */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)] border border-[var(--signal-border-accent-muted)] mb-6">
                <Rocket size={12} />
                Step 1 of 6
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--signal-fg-primary)] leading-[1.1]">
                Every flag has a lifecycle. Start here.
              </h1>
              <p className="text-lg text-[var(--signal-fg-secondary)] mt-4 leading-relaxed">
                Feature flags begin as a single configuration. A name, a type, a
                default value. That&apos;s it. What makes them powerful is
                everything that comes after — targeting, rollouts, monitoring,
                and automated cleanup. But it all starts with a clean
                definition.
              </p>

              <div className="mt-6 space-y-3">
                <div className="text-sm font-semibold text-[var(--signal-fg-primary)] flex items-center gap-2">
                  <Workflow size={14} fill="var(--signal-fg-accent)" />
                  The full lifecycle:
                </div>
                <ol className="space-y-2">
                  {lifecycleSteps.map((step, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-[var(--signal-fg-secondary)]"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)] text-[10px] font-bold text-[var(--signal-fg-tertiary)] mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-6">
                <a
                  href="https://featuresignals.com/docs/concepts/flags"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
                >
                  Learn more about flag configuration
                  <ArrowRight size={14} />
                </a>
              </div>
            </motion.div>

            {/* Right: Demo */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <FlagCreator />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bottom nav — lifecycle progress */}
      <section className="py-10 border-t border-[var(--signal-border-subtle)] bg-[var(--signal-bg-secondary)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wider mb-4 text-center">
            The Feature Flag Lifecycle
          </div>
          <div className="flex items-center justify-center gap-2 sm:gap-4 flex-wrap">
            {[
              { label: "Create", href: "/create", active: true, icon: "🚩" },
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
              { label: "Migrate", href: "/migrate", active: false, icon: "📦" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <a
                  href={step.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                    step.active
                      ? "bg-[var(--signal-bg-accent-emphasis)] text-white"
                      : "text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)] hover:bg-white border border-[var(--signal-border-default)]"
                  }`}
                >
                  <span aria-hidden="true">{step.icon}</span>
                  {step.label}
                </a>
                {i < 4 && (
                  <ArrowRight
                    size={12}
                    className="text-[var(--signal-fg-tertiary)] hidden sm:block"
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
