"use client";

import { useState } from "react";
import Link from "next/link";
import { SectionReveal } from "@/components/section-reveal";
import {
  Building2,
  Mail,
  MessageSquare,
  Users,
  Check,
  Loader2,
  Shield,
  Globe,
  AlertCircle,
  Clock,
  ArrowRight,
} from "lucide-react";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL || "https://api.featuresignals.com";
const TEAM_SIZES = ["1-10", "11-50", "51-200", "201-1000", "1000+"];

export default function ContactPage() {
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitting(true);
    setError("");

    const form = e.currentTarget;
    const data = {
      contact_name: (form.elements.namedItem("name") as HTMLInputElement).value,
      email: (form.elements.namedItem("email") as HTMLInputElement).value,
      company: (form.elements.namedItem("company") as HTMLInputElement).value,
      team_size: (form.elements.namedItem("team-size") as HTMLSelectElement)
        .value,
      message: (form.elements.namedItem("message") as HTMLTextAreaElement)
        .value,
    };

    try {
      const res = await fetch(`${API_BASE}/v1/sales/inquiry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          body?.error || "Something went wrong. Please try again.",
        );
      }
      setSubmitted(true);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Network error. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <section className="mx-auto max-w-lg px-6 py-20 text-center">
        <SectionReveal>
          <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
            <Check className="h-8 w-8 text-emerald-600" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            Message Received
          </h1>
          <p className="mt-3 text-slate-600">
            Thank you for your interest. Our team will get back to you within
            one business day.
          </p>
          <Link
            href="/"
            className="mt-6 inline-block rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-medium text-white transition-colors hover:bg-indigo-700"
          >
            Back to Home
          </Link>
        </SectionReveal>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6 sm:py-20">
      <SectionReveal>
        <div className="text-center">
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 sm:text-4xl">
            Talk to our team
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-base text-slate-500">
            Get a personalized demo, discuss enterprise requirements, or start a
            proof-of-concept.
          </p>
        </div>
      </SectionReveal>

      <div className="mt-12 grid gap-8 md:grid-cols-5">
        <SectionReveal delay={0.05} className="md:col-span-2">
          <div className="space-y-6">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-6 space-y-4">
              <h2 className="font-semibold text-slate-900">
                Why teams choose FeatureSignals
              </h2>
              <div className="space-y-3">
                {[
                  { icon: Shield, text: "SOC 2, GDPR, HIPAA compliant" },
                  { icon: Globe, text: "US, EU, and IN data regions" },
                  { icon: Building2, text: "Self-hosted or managed cloud" },
                  { icon: Users, text: "Unlimited seats on all plans" },
                ].map(({ icon: Icon, text }) => (
                  <div
                    key={text}
                    className="flex items-center gap-2.5 text-sm text-slate-600"
                  >
                    <Icon className="h-4 w-4 shrink-0 text-indigo-500" />
                    {text}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white p-6">
              <h3 className="text-sm font-semibold text-slate-900">
                Prefer email?
              </h3>
              <p className="mt-1 text-sm text-slate-500">
                Reach us directly at{" "}
                <a
                  href="mailto:enterprise@featuresignals.com"
                  className="font-medium text-indigo-600 hover:text-indigo-700"
                >
                  enterprise@featuresignals.com
                </a>
              </p>
            </div>
          </div>
        </SectionReveal>

        <SectionReveal delay={0.1} className="md:col-span-3">
          <form
            onSubmit={handleSubmit}
            className="rounded-xl border border-slate-200 bg-white p-6 space-y-4"
          >
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="name"
                  className="block text-sm font-medium text-slate-700"
                >
                  Full Name
                </label>
                <input
                  id="name"
                  type="text"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                  placeholder="Jane Doe"
                />
              </div>
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-slate-700"
                >
                  Work Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                  placeholder="jane@company.com"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="company"
                  className="block text-sm font-medium text-slate-700"
                >
                  Company
                </label>
                <input
                  id="company"
                  type="text"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                  placeholder="Acme Inc."
                />
              </div>
              <div>
                <label
                  htmlFor="team-size"
                  className="block text-sm font-medium text-slate-700"
                >
                  Team Size
                </label>
                <select
                  id="team-size"
                  required
                  className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                >
                  <option value="">Select...</option>
                  {TEAM_SIZES.map((size) => (
                    <option key={size} value={size}>
                      {size} developers
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label
                htmlFor="message"
                className="block text-sm font-medium text-slate-700"
              >
                How can we help?
              </label>
              <textarea
                id="message"
                rows={4}
                required
                className="mt-1 w-full rounded-lg border border-slate-300 px-3 py-2 text-base text-slate-900 placeholder-slate-400 focus:border-indigo-300 focus:outline-none focus:ring-1 focus:ring-indigo-200"
                placeholder="Tell us about your use case, deployment requirements, or questions..."
              />
            </div>

            {error && (
              <div className="flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                <AlertCircle className="h-4 w-4 shrink-0" />
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="flex w-full items-center justify-center gap-2 rounded-lg bg-indigo-600 px-6 py-2.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-indigo-700 disabled:opacity-60 sm:w-auto"
            >
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <MessageSquare className="h-4 w-4" />
              )}
              {submitting ? "Sending..." : "Send Message"}
            </button>

            <p className="text-center text-xs text-slate-400">
              We typically respond within one business day.
            </p>
          </form>
        </SectionReveal>
      </div>

      <SectionReveal>
        <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {(
            [
              { icon: Clock, label: "Response within 24 hours" },
              { icon: Shield, label: "No spam, ever" },
              { icon: ArrowRight, label: "Free migration assistance" },
              { icon: Building2, label: "Enterprise support available" },
            ] as const
          ).map(({ icon: Icon, label }) => (
            <div
              key={label}
              className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-3"
            >
              <Icon
                className="h-4 w-4 shrink-0 text-indigo-600"
                strokeWidth={1.5}
              />
              <span className="text-xs font-medium text-slate-600">
                {label}
              </span>
            </div>
          ))}
        </div>
      </SectionReveal>
    </section>
  );
}
