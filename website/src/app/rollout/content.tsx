"use client";

import { motion } from "framer-motion";
import {
  RocketIcon,
  ArrowRightIcon,
  ShieldCheckIcon,
  PeopleIcon,
  ZapIcon,
} from "@primer/octicons-react";
import { RolloutSlider } from "@/components/rollout-slider";

const rolloutPrinciples = [
  {
    icon: <PeopleIcon size={16} fill="var(--fgColor-accent)" />,
    title: "Canary releases",
    desc: "Roll out to 5% of users first. Watch error rates. If clean, expand to 25%, 50%, then 100%. Roll back instantly if needed.",
  },
  {
    icon: <ShieldCheckIcon size={16} fill="var(--fgColor-success)" />,
    title: "Ring deployment model",
    desc: "Internal team → beta users → half production → full rollout. Each ring validates before the next. Progressive delivery built in.",
  },
  {
    icon: <ZapIcon size={16} fill="var(--fgColor-attention)" />,
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
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-medium bg-[var(--bgColor-attention-muted)] text-[var(--fgColor-attention)] border border-[var(--borderColor-attention-muted)] mb-6">
                <RocketIcon size={12} />
                Step 3 of 6
              </div>
              <h1 className="text-4xl sm:text-5xl font-bold tracking-tight text-[var(--fgColor-default)] leading-[1.1]">
                Ship with confidence.
              </h1>
              <p className="text-lg text-[var(--fgColor-muted)] mt-4 leading-relaxed">
                The gap between &ldquo;code merged&rdquo; and &ldquo;feature
                live&rdquo; is where things break. Percentage rollouts let you
                close that gap safely. Start with 5% canary. Monitor real
                metrics. Expand when you&apos;re confident. Roll back instantly
                if something goes wrong — no deploy, no waiting.
              </p>

              <div className="mt-6 space-y-4">
                {rolloutPrinciples.map((principle, i) => (
                  <div key={i} className="flex gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[var(--bgColor-inset)] border border-[var(--borderColor-default)]">
                      {principle.icon}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-[var(--fgColor-default)]">
                        {principle.title}
                      </div>
                      <div className="text-sm text-[var(--fgColor-muted)]">
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
                  className="inline-flex items-center gap-2 text-sm font-medium text-[var(--fgColor-accent)] hover:underline"
                >
                  Learn more about gradual rollouts
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
              <RolloutSlider />
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
                      ? "bg-[var(--bgColor-attention-emphasis)] text-white"
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
