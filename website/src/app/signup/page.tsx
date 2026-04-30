"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRightIcon,
  CheckIcon,
  MarkGithubIcon,
  ShieldCheckIcon,
  ZapIcon,
} from "@primer/octicons-react";
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
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium bg-[var(--bgColor-success-muted)] text-[var(--fgColor-success)] border border-[var(--borderColor-success-muted)] mb-6">
          <ZapIcon size={12} />
          Live savings estimate
        </div>

        <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-[var(--fgColor-default)] mb-4">
          You&apos;re about to save{" "}
          <span className="text-[var(--fgColor-success)] tabular-nums">
            {formatUSD(counted)}/year
          </span>
        </h1>

        <p className="text-lg text-[var(--fgColor-muted)] mb-8">
          Compared to what{" "}
          <span style={{ color: meta.logoColor }} className="font-semibold">
            {meta.name}
          </span>{" "}
          charges {teamSize} engineers. FeatureSignals Pro is a flat{" "}
          <strong className="text-[var(--fgColor-default)]">₹999/month</strong>{" "}
          (~$12). Unlimited seats. Unlimited flags. No per-MAU fees. No
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
              className="flex items-start gap-2.5 text-sm text-[var(--fgColor-muted)]"
            >
              <CheckIcon
                size={16}
                fill="var(--fgColor-success)"
                className="mt-0.5 shrink-0"
              />
              <span>{item}</span>
            </li>
          ))}
        </ul>

        {/* Formula detail */}
        <div className="rounded-lg border border-[var(--borderColor-muted)] bg-[var(--bgColor-inset)] p-4">
          <p className="text-xs text-[var(--fgColor-subtle)] font-mono">
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
    <div className="flex flex-col justify-center h-full p-8 sm:p-12 lg:p-16 bg-[var(--bgColor-default)]">
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        className="max-w-sm mx-auto w-full"
      >
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-[var(--fgColor-default)] mb-2">
            Start your free trial
          </h2>
          <p className="text-sm text-[var(--fgColor-muted)]">
            No credit card required. 14-day trial included.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="signup-email"
              className="block text-sm font-medium text-[var(--fgColor-default)] mb-1.5"
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
              className="w-full rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-4 py-2.5 text-sm text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)] focus:border-[var(--fgColor-accent)] transition-shadow"
            />
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="block text-sm font-medium text-[var(--fgColor-default)] mb-1.5"
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
              className="w-full rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-default)] px-4 py-2.5 text-sm text-[var(--fgColor-default)] placeholder:text-[var(--fgColor-subtle)] focus:outline-none focus:ring-2 focus:ring-[var(--borderColor-accent-muted)] focus:border-[var(--fgColor-accent)] transition-shadow"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-success-emphasis)] hover:bg-[#1c8139] active:bg-[#197935] transition-colors duration-150 disabled:opacity-50"
            style={{ boxShadow: "0 1px 0 0 #1f232826" }}
          >
            {submitting ? "Starting..." : "Start Free"}
            {!submitting && <ArrowRightIcon size={16} />}
          </button>
        </form>

        <div className="mt-6">
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-[var(--borderColor-muted)]" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-[var(--bgColor-default)] px-3 text-[var(--fgColor-subtle)]">
                Or continue with
              </span>
            </div>
          </div>

          <a
            href="https://app.featuresignals.com/auth/github"
            className="mt-4 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--borderColor-default)] bg-[var(--bgColor-muted)] px-5 py-2.5 text-sm font-medium text-[var(--fgColor-default)] hover:bg-[#eff2f5] transition-colors duration-150"
          >
            <MarkGithubIcon size={16} />
            GitHub
          </a>
        </div>

        <p className="mt-6 text-xs text-[var(--fgColor-subtle)] text-center">
          By signing up, you agree to our{" "}
          <a
            href="https://featuresignals.com/terms"
            className="text-[var(--fgColor-accent)] hover:underline"
          >
            Terms
          </a>{" "}
          and{" "}
          <a
            href="https://featuresignals.com/privacy"
            className="text-[var(--fgColor-accent)] hover:underline"
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
        <div className="hidden lg:flex lg:w-1/2 bg-[var(--bgColor-inset)] border-r border-[var(--borderColor-default)]">
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
