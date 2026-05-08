"use client";

import { motion } from "framer-motion";
import {
  Rocket,
  ArrowRight,
  ShieldCheck,
  Users,
  Zap,
} from "lucide-react";
import { RolloutSlider } from "@/components/rollout-slider";

const rolloutPrinciples = [
  {
    icon: <Users size={16} fill="var(--signal-fg-accent)" />,
    title: "Canary releases",
    desc: "Roll out to 5% of users first. Watch error rates. If clean, expand to 25%, 50%, then 100%. Roll back instantly if needed.",
  },
  {
    icon: <ShieldCheck size={16} fill="var(--signal-fg-success)" />,
    title: "Ring deployment model",
    desc: "Internal team → beta users → half production → full rollout. Each ring validates before the next. Progressive delivery built in.",
  },
  {
    icon: <Zap size={16} fill="var(--signal-fg-warning)" />,
    title: "Instant rollback",
    desc: "Set the slider back to 0%. All users immediately return to the default variant. No deploy, no revert PR, no waiting for CI.",
  },
];

export function RolloutPageContent() {
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)] border border-[var(--signal-border-warning-muted)] mb-6">
                <Rocket size={12} />
                Step 3 of 6
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--signal-fg-primary)] leading-[1.1]">
                Ship with confidence.
              </h1>
              <p className="text-lg text-[var(--signal-fg-secondary)] mt-4 leading-relaxed">
                The gap between &ldquo;code merged&rdquo; and &ldquo;feature
                live&rdquo; is where things break. Percentage rollouts let you
                close that gap safely. Start with 5% canary. Monitor real
                metrics. Expand when you&apos;re confident. Roll back instantly
                if something goes wrong — no deploy, no waiting.
              </p>

              <div className="mt-6 space-y-4">
                {rolloutPrinciples.map((principle, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--signal-bg-secondary)] border border-[var(--signal-border-default)]">
                      {principle.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--signal-fg-primary)]">
                        {principle.title}
                      </div>
                      <div className="text-sm text-[var(--signal-fg-secondary)]">
                        {principle.desc}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-6">
                <a
                  href="https://docs.featuresignals.com/concepts/rollouts"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--signal-fg-accent)] hover:underline"
                >
                  Learn more about gradual rollouts
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
              <RolloutSlider />
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
                active: true,
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
                      ? "bg-[var(--signal-bg-warning-emphasis)] text-white"
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
