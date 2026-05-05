"use client";

import { motion } from "framer-motion";
import {
  RocketIcon,
  ArrowRightIcon,
  WorkflowIcon,
  GitBranchIcon,
} from "@primer/octicons-react";
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--bgColor-accent-muted)] text-[var(--fgColor-accent)] border border-[var(--borderColor-accent-muted)] mb-6">
                <RocketIcon size={12} />
                Step 1 of 6
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--fgColor-default)] leading-[1.1]">
                Every flag has a lifecycle. Start here.
              </h1>
              <p className="text-lg text-[var(--fgColor-muted)] mt-4 leading-relaxed">
                Feature flags begin as a single configuration. A name, a type, a
                default value. That&apos;s it. What makes them powerful is
                everything that comes after — targeting, rollouts, monitoring,
                and automated cleanup. But it all starts with a clean
                definition.
              </p>

              <div className="mt-6 space-y-3">
                <div className="text-sm font-semibold text-[var(--fgColor-default)] flex items-center gap-2">
                  <WorkflowIcon size={14} fill="var(--fgColor-accent)" />
                  The full lifecycle:
                </div>
                <ol className="space-y-2">
                  {lifecycleSteps.map((step, i) => (
                    <li
                      key={i}
                      className="flex items-start gap-3 text-sm text-[var(--fgColor-muted)]"
                    >
                      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--bgColor-inset)] border border-[var(--borderColor-default)] text-[10px] font-bold text-[var(--fgColor-subtle)] mt-0.5">
                        {i + 1}
                      </span>
                      {step}
                    </li>
                  ))}
                </ol>
              </div>

              <div className="mt-6">
                <a
                  href="https://docs.featuresignals.com/concepts/flags"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--fgColor-accent)] hover:underline"
                >
                  Learn more about flag configuration
                  <ArrowRightIcon size={14} />
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
      <section className="py-10 border-t border-[var(--borderColor-muted)] bg-[var(--bgColor-inset)]">
        <div className="mx-auto max-w-7xl px-6">
          <div className="text-xs font-semibold text-[var(--fgColor-subtle)] uppercase tracking-wider mb-4 text-center">
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
                      ? "bg-[var(--bgColor-accent-emphasis)] text-white"
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
