"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { ArrowRight, Check, ShieldCheck, Zap } from "lucide-react";

/** GitHub logo — inline SVG (no brand icon in lucide-react) */
function GithubIcon({ size = 16 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="currentColor"
      aria-hidden="true"
    >
      <path
        fillRule="evenodd"
        d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27.68 0 1.36.09 2 .27 1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.013 8.013 0 0016 8c0-4.42-3.58-8-8-8z"
      />
    </svg>
  );
}
import {
  CalculatorProvider,
  useCalculatorContext,
} from "@/lib/calculator-context";
import {
  type CompetitorProvider,
  calculateSavings,
  formatUSD,
  PROVIDER_META,
} from "@/lib/pricing";

/**
 * Signup page — split layout.
 *
 * Left: Value demo with savings counter from homepage calculator state.
 * Right: Signup form.
 *
 * The CalculatorProvider wrapping gives us access to the user's selections
 * from the homepage hero calculator. If no state exists, uses defaults.
 */

function SignupLeft() {
  const { teamSize, provider } = useCalculatorContext();
  const result = calculateSavings({ teamSize, provider });
  const [counted, setCounted] = useState(0);

  useEffect(() => {
    // Animate the savings number up from 0
    const target = result.savings.annual;
    if (target <= 0) {
      setCounted(target);
      return;
    }
    const duration = 1200;
    const steps = 30;
    const increment = target / steps;
    let current = 0;
    let step = 0;
    const timer = setInterval(() => {
      step++;
      current = Math.min(increment * step, target);
      setCounted(Math.round(current));
      if (step >= steps) {
        setCounted(target);
        clearInterval(timer);
      }
    }, duration / steps);
    return () => clearInterval(timer);
  }, [result.savings.annual]);

  const meta = PROVIDER_META[provider];

  return (
    <div className="flex flex-col justify-center h-full p-8 sm:p-12 lg:p-16">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)] border border-[var(--signal-border-success-muted)] mb-6">
          <Zap size={12} />
          Live savings estimate
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--signal-fg-primary)] mb-4">
          You&apos;re about to save{" "}
          <span className="text-[var(--signal-fg-success)] tabular-nums">
            {formatUSD(counted)}/year
          </span>
        </h1>

        <p className="text-lg text-[var(--signal-fg-secondary)] mb-8">
          Compared to what{" "}
          <span style={{ color: meta.logoColor }} className="font-semibold">
            {meta.name}
          </span>{" "}
          charges {teamSize} engineers. FeatureSignals Pro is a flat{" "}
          <strong className="text-[var(--signal-fg-primary)]">
            INR 1,999/month
          </strong>{" "}
          (~$29). Unlimited seats. Unlimited flags. No per-MAU fees. No
          surprises.
        </p>

        <ul className="space-y-3 mb-10">
          {[
            "No credit card required",
            "14-day Pro trial — all features unlocked",
            "Cancel anytime. Really.",
            "Self-host option if you prefer",
          ].map((item) => (
            <li
              key={item}
              className="flex items-start gap-2.5 text-sm text-[var(--signal-fg-secondary)]"
            >
              <Check
                size={16}
                fill="var(--signal-fg-success)"
                className="mt-0.5 shrink-0"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {/* Formula detail */}
        <div className="rounded-lg border border-[var(--signal-border-subtle)] bg-[var(--signal-bg-secondary)] p-4">
          <p className="text-xs text-[var(--signal-fg-tertiary)] font-mono">
            {result.formula}
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function SignupRight() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    // In production, this would POST to the auth service
    window.location.href = `https://app.featuresignals.com/register?email=${encodeURIComponent(email)}`;
  };

  return (
    <div className="flex flex-col justify-center h-full p-8 sm:p-12 lg:p-16 bg-[var(--signal-bg-primary)]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-sm mx-auto w-full"
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[var(--signal-fg-primary)] mb-2">
            Start your free trial
          </h2>
          <p className="text-sm text-[var(--signal-fg-secondary)]">
            No credit card required. 14-day trial included.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="signup-email"
              className="block text-sm font-medium text-[var(--signal-fg-primary)] mb-1.5"
            >
              Work email
            </label>
            <input
              id="signup-email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@company.com"
              className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-4 py-2.5 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)] transition-shadow"
            />
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="block text-sm font-medium text-[var(--signal-fg-primary)] mb-1.5"
            >
              Password
            </label>
            <input
              id="signup-password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-4 py-2.5 text-sm text-[var(--signal-fg-primary)] placeholder:text-[var(--signal-fg-tertiary)] focus:outline-none focus:ring-2 focus:ring-[var(--signal-border-accent-muted)] focus:border-[var(--signal-fg-accent)] transition-shadow"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--signal-bg-success-emphasis)] hover:bg-[#1c8139] active:bg-[#197935] transition-colors duration-150 disabled:opacity-50"
            style={{ boxShadow: "0 1px 0 0 #1f232826" }}
          >
            {submitting ? "Starting..." : "Start Free"}
            {!submitting && <ArrowRight size={16} />}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--signal-border-subtle)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[var(--signal-bg-primary)] px-3 text-[var(--signal-fg-tertiary)]">
                Or continue with
              </span>
            </div>
          </div>

          <a
            href="https://app.featuresignals.com/auth/github"
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] px-5 py-2.5 text-sm font-medium text-[var(--signal-fg-primary)] hover:bg-[#eff2f5] transition-colors duration-150"
          >
            <GithubIcon size={16} />
            GitHub
          </a>
        </div>

        <p className="mt-6 text-xs text-[var(--signal-fg-tertiary)] text-center">
          By signing up, you agree to our{" "}
          <a
            href="/terms-and-conditions"
            className="text-[var(--signal-fg-accent)] hover:underline"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="/privacy-policy"
            className="text-[var(--signal-fg-accent)] hover:underline"
          >
            Privacy Policy
          </a>
          .
        </p>
      </motion.div>
    </div>
  );
}

export default function SignupPage() {
  return (
    <CalculatorProvider>
      <div className="min-h-screen pt-16 flex">
        {/* Left: Value Demo */}
        <div className="hidden lg:flex lg:w-1/2 bg-[var(--signal-bg-secondary)] border-r border-[var(--signal-border-default)]">
          <SignupLeft />
        </div>

        {/* Right: Signup Form */}
        <div className="w-full lg:w-1/2">
          <SignupRight />
        </div>
      </div>
    </CalculatorProvider>
  );
}
