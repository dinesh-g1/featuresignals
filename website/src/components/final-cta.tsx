"use client";

import { motion } from "framer-motion";
import {
  RocketIcon,
  ArrowRightIcon,
  DownloadIcon,
  ShieldCheckIcon,
} from "@primer/octicons-react";

export function FinalCta() {
  return (
    <section
      id="final-cta"
      className="relative py-24 sm:py-32 overflow-hidden"
      style={{ backgroundColor: "#25292e" }}
      aria-labelledby="final-cta-heading"
    >
      {/* Dotted overlay */}
      <div className="absolute inset-0 bg-dotted-dark" aria-hidden="true" />

      {/* Subtle gradient overlay */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(ellipse at 50% 0%, rgba(9,105,218,0.12) 0%, transparent 60%)",
        }}
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
          <RocketIcon
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
          Start a free trial with full Pro features for 14 days.
          <br />
          No credit card required.
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
            href="https://app.featuresignals.com/signup"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white bg-[var(--bgColor-success-emphasis)] hover:bg-[#1c8139] active:bg-[#197935] transition-colors duration-150"
            style={{ boxShadow: "0 1px 0 0 #1f232826" }}
          >
            Start Free — No Credit Card
            <ArrowRightIcon size={16} />
          </a>
          <a
            href="https://docs.featuresignals.com/getting-started/quickstart"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 px-6 py-3 rounded-lg text-sm font-semibold text-white border transition-colors duration-150"
            style={{
              borderColor: "#373e47",
              boxShadow: "0 1px 0 0 #ffffff14",
            }}
          >
            <DownloadIcon size={16} />
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
            <ShieldCheckIcon size={12} />
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
