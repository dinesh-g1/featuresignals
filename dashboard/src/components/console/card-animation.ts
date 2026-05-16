/**
 * card-animation.ts — Shared framer-motion animation variants for the
 * FeatureSignals Console Lifecycle Canvas.
 *
 * Design tokens reference (from signal.css):
 *   --signal-duration-instant: 100ms
 *   --signal-duration-fast: 150ms
 *   --signal-duration-normal: 250ms
 *   --signal-duration-slow: 400ms
 *   --signal-easing-default: cubic-bezier(0.16, 1, 0.3, 1)
 *   --signal-easing-bounce: cubic-bezier(0.34, 1.56, 0.64, 1)
 *
 * All variants respect prefers-reduced-motion via the `useReducedMotion`
 * hook from framer-motion. When reduced motion is preferred, all
 * animations collapse to instant opacity-only transitions.
 *
 * Signal UI tokens only. Zero hardcoded hex colors. Zero `any`.
 */

import type { Variants, Transition } from "framer-motion";

// ══════════════════════════════════════════════════════════════════════
// Reduced Motion Helpers
// ══════════════════════════════════════════════════════════════════════

/**
 * Returns a transition that respects the user's motion preference.
 * When `useReducedMotion()` returns true, all motion collapses to
 * instant opacity-only transitions.
 */
export function safeTransition(
  reducedMotion: boolean | null,
  overrides?: Transition,
): Transition {
  if (reducedMotion) {
    return { duration: 0.01, ease: "linear" };
  }
  return {
    duration: 0.4,
    ease: [0.34, 1.56, 0.64, 1], // signal-easing-bounce
    ...overrides,
  };
}

/**
 * Returns variants where the "animate" state is effectively the same as
 * "initial" but with instant transitions — used when reduced motion is
 * preferred.
 */
function staticVariant(value: Variants[string]): Variants {
  return {
    hidden: value,
    visible: value,
    exit: {
      ...(value as Record<string, unknown>),
      opacity: 0,
      transition: { duration: 0.1 },
    },
  };
}

// ══════════════════════════════════════════════════════════════════════
// 1. Card Entrance (new card appearing in a column)
// ══════════════════════════════════════════════════════════════════════

export const cardEnter: Variants = {
  hidden: {
    opacity: 0,
    scale: 0.9,
    y: 10,
  },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1], // signal-easing-bounce
    },
  },
};

export const cardEnterReduced: Variants = staticVariant({
  opacity: 1,
  scale: 1,
  y: 0,
});

// ══════════════════════════════════════════════════════════════════════
// 2. Card Exit (card leaving a column)
// ══════════════════════════════════════════════════════════════════════

export const cardExit: Variants = {
  exit: {
    opacity: 0,
    scale: 0.9,
    y: -8,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1], // signal-easing-default
    },
  },
};

export const cardExitReduced: Variants = {
  exit: {
    opacity: 0,
    transition: { duration: 0.1 },
  },
};

// ══════════════════════════════════════════════════════════════════════
// 3. Stage Transition — Spring Physics
//    Applied via `layout` prop's `transition` on motion elements.
//    framer-motion's layout animation handles the position interpolation.
// ══════════════════════════════════════════════════════════════════════

export const stageTransition: Transition = {
  type: "spring",
  stiffness: 300,
  damping: 25,
  mass: 0.8,
};

export const stageTransitionReduced: Transition = {
  duration: 0.01,
};

// ══════════════════════════════════════════════════════════════════════
// 4. Card Hover Lift
//    Subtle y-axis lift + shadow elevation on hover.
// ══════════════════════════════════════════════════════════════════════

export const cardHover: Variants = {
  rest: {
    scale: 1,
    y: 0,
    boxShadow: "var(--signal-shadow-xs)",
    transition: {
      duration: 0.15,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  hover: {
    scale: 1.02,
    y: -2,
    boxShadow: "var(--signal-shadow-sm)",
    transition: {
      duration: 0.15,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const cardHoverReduced: Variants = staticVariant({
  scale: 1,
  y: 0,
});

// ══════════════════════════════════════════════════════════════════════
// 5. Card States — Attention, Critical, AI-Suggested
//    Applied via `animate` prop on the motion element.
// ══════════════════════════════════════════════════════════════════════

/** Amber glow pulse + subtle shake for attention-needed cards. */
export const cardAttention: Variants = {
  animate: {
    boxShadow: [
      "var(--signal-shadow-sm), 0 0 0px var(--signal-bg-warning-muted)",
      "var(--signal-shadow-sm), 0 0 12px var(--signal-border-warning-muted)",
      "var(--signal-shadow-sm), 0 0 0px var(--signal-bg-warning-muted)",
    ],
    x: [0, -1, 1, -1, 1, 0],
    transition: {
      boxShadow: {
        duration: 2,
        ease: "easeInOut",
        repeat: Infinity,
      },
      x: {
        duration: 0.4,
        ease: "easeInOut",
        repeat: Infinity,
        repeatDelay: 1.6,
      },
    },
  },
};

export const cardAttentionReduced: Variants = {
  animate: {
    boxShadow:
      "var(--signal-shadow-sm), 0 0 8px var(--signal-border-warning-muted)",
    transition: { duration: 0.01 },
  },
};

/** Red rapid glow pulse for critical cards. */
export const cardCritical: Variants = {
  animate: {
    boxShadow: [
      "var(--signal-shadow-md), 0 0 0px var(--signal-bg-danger-muted)",
      "var(--signal-shadow-md), 0 0 16px var(--signal-bg-danger-muted)",
      "var(--signal-shadow-md), 0 0 0px var(--signal-bg-danger-muted)",
    ],
    transition: {
      duration: 1.2,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

export const cardCriticalReduced: Variants = {
  animate: {
    boxShadow:
      "var(--signal-shadow-md), 0 0 12px var(--signal-bg-danger-muted)",
    transition: { duration: 0.01 },
  },
};

/** Subtle purple border glow + gentle pulse for AI-suggested cards. */
export const cardAISuggested: Variants = {
  animate: {
    boxShadow: [
      "0 0 0px 1px var(--signal-border-accent-muted), 0 0 0px var(--signal-bg-info-muted)",
      "0 0 0px 1px var(--signal-border-accent-muted), 0 0 12px var(--signal-bg-info-muted)",
      "0 0 0px 1px var(--signal-border-accent-muted), 0 0 0px var(--signal-bg-info-muted)",
    ],
    transition: {
      duration: 2.5,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

export const cardAISuggestedReduced: Variants = {
  animate: {
    boxShadow:
      "0 0 0px 1px var(--signal-border-accent-muted), 0 0 8px var(--signal-bg-info-muted)",
    transition: { duration: 0.01 },
  },
};

// ══════════════════════════════════════════════════════════════════════
// 6. Health Dot Pulse
//    Three tiers: good (gentle), warning (medium), critical (rapid).
// ══════════════════════════════════════════════════════════════════════

/** Gentle green pulse for healthy features (score >= 80). */
export const healthDotGood: Variants = {
  animate: {
    scale: [1, 1.3, 1],
    opacity: [1, 0.7, 1],
    transition: {
      duration: 3,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

/** Medium amber pulse for warning features (score 40-79). */
export const healthDotWarning: Variants = {
  animate: {
    scale: [1, 1.4, 1],
    opacity: [1, 0.5, 1],
    transition: {
      duration: 2,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

/** Rapid red pulse for critical features (score < 40). */
export const healthDotCritical: Variants = {
  animate: {
    scale: [1, 1.5, 1],
    opacity: [1, 0.3, 1],
    transition: {
      duration: 1,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

/** Brief green flash — used when health improves after a transition. */
export const healthDotFlash: Variants = {
  animate: {
    scale: [1, 1.8, 1],
    boxShadow: [
      "0 0 0px var(--signal-fg-success)",
      "0 0 12px var(--signal-fg-success)",
      "0 0 0px var(--signal-fg-success)",
    ],
    transition: {
      duration: 0.6,
      ease: "easeOut",
    },
  },
};

// ══════════════════════════════════════════════════════════════════════
// 7. Column Highlight Pulse
//    Brief background pulse when a card enters the column.
// ══════════════════════════════════════════════════════════════════════

export const columnPulse: Variants = {
  animate: {
    backgroundColor: [
      "var(--signal-bg-secondary)",
      "var(--signal-bg-accent-muted)",
      "var(--signal-bg-secondary)",
    ],
    transition: {
      duration: 0.8,
      ease: "easeOut",
    },
  },
};

export const columnPulseReduced: Variants = staticVariant({
  backgroundColor: "var(--signal-bg-secondary)",
});

// ══════════════════════════════════════════════════════════════════════
// 8. Advance Button — Success Animation
//    Brief scale bounce + color flash after clicking "Advance to {stage}".
// ══════════════════════════════════════════════════════════════════════

export const advanceSuccess: Variants = {
  initial: { scale: 1 },
  success: {
    scale: [1, 1.05, 0.98, 1.02, 1],
    transition: {
      duration: 0.5,
      ease: [0.34, 1.56, 0.64, 1],
    },
  },
};

export const advanceSuccessReduced: Variants = staticVariant({ scale: 1 });

// ══════════════════════════════════════════════════════════════════════
// 9. Next-Stage Arrow — Subtle Rightward Drift
//    The arrow in "Advance to {stage} →" subtly pulses rightward.
// ══════════════════════════════════════════════════════════════════════

export const arrowDrift: Variants = {
  animate: {
    x: [0, 3, 0],
    transition: {
      duration: 1.5,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

export const arrowDriftReduced: Variants = staticVariant({ x: 0 });

// ══════════════════════════════════════════════════════════════════════
// 10. Advance Error — Slide In/Out
//     Applied via AnimatePresence on the error message.
// ══════════════════════════════════════════════════════════════════════

export const advanceError: Variants = {
  hidden: {
    opacity: 0,
    y: -4,
    height: 0,
    marginTop: 0,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  visible: {
    opacity: 1,
    y: 0,
    height: "auto",
    marginTop: 8,
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: 4,
    height: 0,
    marginTop: 0,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const advanceErrorReduced: Variants = {
  hidden: { opacity: 0, transition: { duration: 0.1 } },
  visible: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};

// ══════════════════════════════════════════════════════════════════════
// 11. Stagger Container
//     Orchestrates staggered children entrance within a column.
// ══════════════════════════════════════════════════════════════════════

export const cardStaggerContainer: Variants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.06,
      delayChildren: 0.1,
    },
  },
};

// ══════════════════════════════════════════════════════════════════════
// 12. Loading Shimmer Skeleton
//     Subtle shimmer animation for card loading state.
// ══════════════════════════════════════════════════════════════════════

export const shimmer: Variants = {
  animate: {
    backgroundPosition: ["200% 0", "-200% 0"],
    transition: {
      duration: 1.5,
      ease: "easeInOut",
      repeat: Infinity,
    },
  },
};

export const shimmerReduced: Variants = staticVariant({
  backgroundPosition: "0% 0",
});

// ══════════════════════════════════════════════════════════════════════
// 13. Panel Slide-In (for FeatureDetailPanel entrance)
// ══════════════════════════════════════════════════════════════════════

export const panelSlideIn: Variants = {
  hidden: {
    x: "100%",
    opacity: 0,
  },
  visible: {
    x: 0,
    opacity: 1,
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 30,
      mass: 0.9,
    },
  },
  exit: {
    x: "100%",
    opacity: 0,
    transition: {
      duration: 0.2,
      ease: [0.16, 1, 0.3, 1],
    },
  },
};

export const panelSlideInReduced: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.1 } },
  exit: { opacity: 0, transition: { duration: 0.1 } },
};
