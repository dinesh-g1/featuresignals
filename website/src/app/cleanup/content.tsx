"use client";

import { motion } from "framer-motion";
import {
  Lightbulb,
  ArrowRight,
  Clock,
  GitBranch,
  Trash2,
} from "lucide-react";
import { AiJanitorSimulator } from "@/components/ai-janitor-simulator";

const debtStats = [
  {
    icon: <Clock size={16} fill="var(--signal-fg-warning)" />,
    stat: "6 months",
    label: "Average time a stale flag sits in a codebase before anyone notices",
  },
  {
    icon: <GitBranch size={16} fill="var(--signal-fg-info)" />,
    stat: "1 in 4",
    label:
      "Feature flags in production are dead — fully rolled out or abandoned, adding zero value",
  },
  {
    icon: <Trash2 size={16} fill="var(--signal-fg-danger)" />,
    stat: "3 PRs",
    label:
      "Average tech debt cleanup per stale flag: the flag check, the branch logic, and the tests",
  },
];

export function CleanupPageContent() {
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)] border border-[var(--borderColor-danger-muted)] mb-6">
                <Lightbulb size={12} />
                Step 4 of 6
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--signal-fg-primary)] leading-[1.1]">
                Flags that outlive their purpose become technical debt.
              </h1>
              <p className="text-lg text-[var(--signal-fg-secondary)] mt-4 leading-relaxed">
                Feature flags are born to die. When a flag has been at 100% for
                six months, or hasn&apos;t been evaluated in a year, it&apos;s
                no longer a feature flag — it&apos;s dead code. The AI Janitor
                scans your codebase, identifies flags that have outlived their
                purpose, and generates the PRs to remove them. Permanently.
              </p>

              <div className="mt-6 space-y-4">
                {debtStats.map((item, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)]">
                      {item.icon}
                    </div>
                    <div>
                      <div className="text-lg font-bold text-[var(--signal-fg-primary)]">
                        {item.stat}
                      </div>
                      <div className="text-sm text-[var(--signal-fg-secondary)]">
                        {item.label}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <a
                  href="https://docs.featuresignals.com/concepts/ai-janitor"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
                >
                  Learn more about the AI Janitor
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
              <AiJanitorSimulator />
            </motion.div>
          </div>
        </div>
      </section>

      {/* Bottom nav */}
      <section className="py-10 border-t border-[var(--signal-border-subtle)] bg-[var(--signal-bg-secondary)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-xs font-semibold text-[var(--signal-fg-tertiary)] uppercase tracking-wider mb-4 text-center">
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
                active: true,
                icon: "🧹",
              },
              { label: "Migrate", href: "/migrate", active: false, icon: "📦" },
            ].map((step, i) => (
              <div key={step.label} className="flex items-center gap-2">
                <a
                  href={step.href}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors duration-150 ${
                    step.active
                      ? "bg-[var(--signal-bg-danger-emphasis)] text-white"
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
