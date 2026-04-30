"use client";

import { motion } from "framer-motion";
import type { ReactNode } from "react";

interface SectionRevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  /** Stagger children animation — wraps each child in its own reveal */
  stagger?: boolean;
  /** Direction of reveal */
  direction?: "up" | "none";
}

export function SectionReveal({
  children,
  className,
  delay = 0,
  stagger = false,
  direction = "up",
}: SectionRevealProps) {
  const yOffset = direction === "none" ? 0 : 12;

  return (
    <motion.div
      initial={{ opacity: 0, y: yOffset }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{
        duration: 0.45,
        delay,
        ease: [0.16, 1, 0.3, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered children — each direct child gets its own staggered reveal.
 * Mimics GitHub's progressive content reveal pattern.
 */
export function StaggerChildren({
  children,
  className,
  baseDelay = 0,
  staggerDelay = 0.08,
}: {
  children: ReactNode;
  className?: string;
  baseDelay?: number;
  staggerDelay?: number;
}) {
  if (!Array.isArray(children)) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-60px" }}
        transition={{
          duration: 0.4,
          delay: baseDelay,
          ease: [0.16, 1, 0.3, 1],
        }}
        className={className}
      >
        {children}
      </motion.div>
    );
  }

  return (
    <div className={className}>
      {children.map((child, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 12 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-40px" }}
          transition={{
            duration: 0.4,
            delay: baseDelay + i * staggerDelay,
            ease: [0.16, 1, 0.3, 1],
          }}
        >
          {child}
        </motion.div>
      ))}
    </div>
  );
}
