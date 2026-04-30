"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import {
  RocketIcon,
  GoalIcon,
  GraphIcon,
  LightBulbIcon,
  SyncIcon,
  ArrowRightIcon,
} from "@primer/octicons-react";

const lifecycleSteps = [
  {
    step: 1,
    title: "Create",
    description:
      "Define flag keys, types, and default values. Start the lifecycle.",
    href: "/create",
    icon: <RocketIcon size={20} fill="#ffffff" />,
    bgColor: "var(--bgColor-accent-emphasis)",
    mutedBg: "var(--bgColor-accent-muted)",
    fgColor: "var(--fgColor-accent)",
    emoji: "🚩",
  },
  {
    step: 2,
    title: "Target",
    description:
      "Route features to the right users with attribute-based rules.",
    href: "/target",
    icon: <GoalIcon size={20} fill="#ffffff" />,
    bgColor: "var(--bgColor-done-emphasis)",
    mutedBg: "var(--bgColor-done-muted)",
    fgColor: "var(--fgColor-done)",
    emoji: "🎯",
  },
  {
    step: 3,
    title: "Rollout",
    description:
      "Ship with confidence using gradual percentage rollouts and canary releases.",
    href: "/rollout",
    icon: <GraphIcon size={20} fill="#ffffff" />,
    bgColor: "var(--bgColor-attention-emphasis)",
    mutedBg: "var(--bgColor-attention-muted)",
    fgColor: "var(--fgColor-attention)",
    emoji: "📈",
  },
  {
    step: 4,
    title: "Clean Up",
    description:
      "AI Janitor detects stale flags and generates PRs to remove them.",
    href: "/cleanup",
    icon: <LightBulbIcon size={20} fill="#ffffff" />,
    bgColor: "var(--bgColor-danger-emphasis)",
    mutedBg: "var(--bgColor-danger-muted)",
    fgColor: "var(--fgColor-danger)",
    emoji: "🧹",
  },
  {
    step: 5,
    title: "Migrate",
    description:
      "Import flags from LaunchDarkly, ConfigCat, Flagsmith, or Unleash.",
    href: "/migrate",
    icon: <SyncIcon size={20} fill="#ffffff" />,
    bgColor: "var(--bgColor-success-emphasis)",
    mutedBg: "var(--bgColor-success-muted)",
    fgColor: "var(--fgColor-success)",
    emoji: "📦",
  },
];

export function LifecycleCards() {
  return (
    <section
      id="lifecycle"
      className="py-20 sm:py-28 bg-[var(--bgColor-inset)] border-y border-[var(--borderColor-muted)]"
      aria-labelledby="lifecycle-heading"
    >
      <div className="mx-auto max-w-7xl px-6">
        {/* Section header */}
        <motion.div
          className="text-center mb-12"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <h2
            id="lifecycle-heading"
            className="text-3xl sm:text-4xl font-bold text-[var(--fgColor-default)] tracking-tight"
          >
            The complete feature flag lifecycle.
          </h2>
          <p className="text-lg text-[var(--fgColor-muted)] mt-3 max-w-2xl mx-auto">
            Every flag moves through five stages. FeatureSignals handles each
            one — from creation to automated cleanup.
          </p>
        </motion.div>

        {/* Card grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {lifecycleSteps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{
                duration: 0.4,
                delay: i * 0.08,
                ease: [0.16, 1, 0.3, 1],
              }}
            >
              <Link
                href={step.href}
                className="group block rounded-xl border border-[var(--borderColor-default)] bg-white p-5 transition-all duration-200 hover:shadow-[var(--shadow-floating-small)] hover:border-[var(--borderColor-emphasis)] h-full"
              >
                {/* Step number + icon */}
                <div className="flex items-center justify-between mb-4">
                  <span className="text-[10px] font-bold text-[var(--fgColor-subtle)] uppercase tracking-wider">
                    Step {step.step}
                  </span>
                  <span className="text-lg" aria-hidden="true">
                    {step.emoji}
                  </span>
                </div>

                {/* Icon circle */}
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl mb-3"
                  style={{ backgroundColor: step.bgColor }}
                >
                  {step.icon}
                </div>

                {/* Title */}
                <h3 className="text-base font-bold text-[var(--fgColor-default)] mb-1.5">
                  {step.title}
                </h3>

                {/* Description */}
                <p className="text-sm text-[var(--fgColor-muted)] leading-relaxed mb-4">
                  {step.description}
                </p>

                {/* Arrow on hover */}
                <div className="flex items-center gap-1 text-xs font-medium transition-all duration-200 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0"
                  style={{ color: step.fgColor }}
                >
                  Explore
                  <ArrowRightIcon size={12} />
                </div>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* Bottom CTA */}
        <motion.div
          className="mt-12 text-center"
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <Link
            href="/create"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-success-emphasis)] hover:bg-[#1c8139] transition-colors duration-150"
            style={{ boxShadow: "0 1px 0 0 #1f232826" }}
          >
            Start the lifecycle
            <ArrowRightIcon size={16} />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
