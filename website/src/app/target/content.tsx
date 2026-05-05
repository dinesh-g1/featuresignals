"use client";

import { motion } from "framer-motion";
import {
  GoalIcon,
  ArrowRightIcon,
  ChecklistIcon,
  ShieldCheckIcon,
} from "@primer/octicons-react";
import { TargetingBuilder } from "@/components/targeting-builder";

const targetingBenefits = [
  {
    icon: <GoalIcon size={16} fill="var(--fgColor-done)" />,
    title: "Attribute-based rules",
    desc: "Target by any user property — plan, country, email domain, beta status, or custom attributes.",
  },
  {
    icon: <ChecklistIcon size={16} fill="var(--fgColor-success)" />,
    title: "First-match wins",
    desc: "Rules are evaluated in order. The first matching rule determines the result. Predictable and debuggable.",
  },
  {
    icon: <ShieldCheckIcon size={16} fill="var(--fgColor-accent)" />,
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--bgColor-done-muted)] text-[var(--fgColor-done)] border border-[var(--borderColor-done-emphasis)] border-opacity-20 mb-6">
                <GoalIcon size={12} />
                Step 2 of 6
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--fgColor-default)] leading-[1.1]">
                Precision targeting. The right features, to the right users.
              </h1>
              <p className="text-lg text-[var(--fgColor-muted)] mt-4 leading-relaxed">
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
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bgColor-inset)] border border-[var(--borderColor-default)]">
                      {benefit.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--fgColor-default)]">
                        {benefit.title}
                      </div>
                      <div className="text-sm text-[var(--fgColor-muted)]">
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
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--fgColor-accent)] hover:underline"
                >
                  Learn more about targeting rules
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
                      ? "bg-[var(--bgColor-done-emphasis)] text-white"
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
