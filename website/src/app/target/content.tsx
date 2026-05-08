"use client";

import { motion } from "framer-motion";
import {
  Target,
  ArrowRight,
  ListChecks,
  ShieldCheck,
} from "lucide-react";
import { TargetingBuilder } from "@/components/targeting-builder";

const targetingBenefits = [
  {
    icon: <Target size={16} fill="var(--signal-fg-info)" />,
    title: "Attribute-based rules",
    desc: "Target by any user property — plan, country, email domain, beta status, or custom attributes.",
  },
  {
    icon: <ListChecks size={16} fill="var(--signal-fg-success)" />,
    title: "First-match wins",
    desc: "Rules are evaluated in order. The first matching rule determines the result. Predictable and debuggable.",
  },
  {
    icon: <ShieldCheck size={16} fill="var(--signal-fg-accent)" />,
    title: "Default safety net",
    desc: "Every flag has a default value. If no rules match, the default is served. No surprises in production.",
  },
];

export function TargetPageContent() {
  return (
    <>
      <section className="relative py-16 sm:py-20 bg-glow-orbs">
        <div className="mx-auto max-w-7xl px-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-16 items-center">
            {/* Left: Demo */}
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
            >
              <TargetingBuilder />
            </motion.div>

            {/* Right: Text */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                duration: 0.5,
                delay: 0.1,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)] border border-[var(--borderColor-done-emphasis)] border-opacity-20 mb-6">
                <Target size={12} />
                Step 2 of 6
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--signal-fg-primary)] leading-[1.1]">
                Precision targeting. The right features, to the right users.
              </h1>
              <p className="text-lg text-[var(--signal-fg-secondary)] mt-4 leading-relaxed">
                A feature flag without targeting is just a kill switch. Add
                rules to route features to specific user segments — enterprise
                customers, users in a particular country, beta testers, or any
                custom attribute. The evaluation engine runs in under a
                millisecond, so you never have to choose between precision and
                performance.
              </p>

              <div className="mt-6 space-y-4">
                {targetingBenefits.map((benefit, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)]">
                      {benefit.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                        {benefit.title}
                      </div>
                      <div className="text-sm text-[var(--signal-fg-secondary)]">
                        {benefit.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <a
                  href="https://docs.featuresignals.com/concepts/targeting"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
                >
                  Learn more about targeting rules
                  <ArrowRight size={14} />
                </a>
              </div>
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
              { label: "Target", href: "/target", active: true, icon: "🎯" },
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
                      ? "bg-[var(--signal-bg-info-emphasis)] text-white"
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
