"use client";

import { motion } from "framer-motion";
import {
  Rocket,
  ArrowRight,
  Download,
  ShieldCheck,
} from "lucide-react";

export function FinalCta() {
  return (
    <section
      id="final-cta"
      className="relative py-24 sm:py-32 overflow-hidden bg-gradient-mesh-dark"
      aria-labelledby="final-cta-heading"
    >
      {/* Premium dot overlay */}
      <div
        className="absolute inset-0 bg-dots-dark pointer-events-none"
        aria-hidden="true"
      />

      <div className="relative mx-auto max-w-3xl px-6 text-center">
        {/* Rocket icon */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
        >
          <Rocket
            size={40}
            fill="#54aeff"
            className="mx-auto mb-6"
            aria-hidden="true"
          />
        </motion.div>

        {/* Heading */}
        <motion.h2
          id="final-cta-heading"
          className="text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight text-white mb-4"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
        >
          Ready to ship faster?
        </motion.h2>

        {/* Subtitle */}
        <motion.p
          className="text-lg mb-10"
          style={{ color: "#8b949e" }}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.45, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
          14-day Pro trial. Full features. No credit card.
          <br />
          If you don&apos;t like it, we&apos;ll help you migrate back. (You
          won&apos;t want to.)
        </motion.p>

        {/* CTAs */}
        <motion.div
          className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-14"
          initial={{ opacity: 0, y: 16 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.45, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
          <a
            href="https://app.featuresignals.com/register"
            className="btn-primary-success"
          >
            Start Free — No Credit Card
            <ArrowRight size={16} />
          </a>
          <a
            href="https://docs.featuresignals.com/getting-started/quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-secondary text-white border-white/20 hover:border-white/40 hover:bg-white/10"
          >
            <Download size={16} />
            Self-Host in 3 Minutes
          </a>
        </motion.div>

        {/* Badge row */}
        <motion.div
          className="flex flex-wrap items-center justify-center gap-3"
          initial={{ opacity: 0, y: 8 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{ duration: 0.4, delay: 0.4, ease: [0.16, 1, 0.3, 1] }}
        >
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "#8b949e",
              border: "1px solid #373e47",
            }}
          >
            <ShieldCheck size={12} />
            Apache-2.0
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "#8b949e",
              border: "1px solid #373e47",
            }}
          >
            8 SDKs
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "#8b949e",
              border: "1px solid #373e47",
            }}
          >
            Sub-millisecond
          </span>
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium"
            style={{
              backgroundColor: "rgba(255,255,255,0.06)",
              color: "#8b949e",
              border: "1px solid #373e47",
            }}
          >
            14-day Pro trial
          </span>
        </motion.div>
      </div>
    </section>
  );
}
