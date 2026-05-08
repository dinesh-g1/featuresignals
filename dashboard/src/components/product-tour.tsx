"use client";

import {
  useState,
  useCallback,
  useEffect,
  useRef,
  useLayoutEffect,
} from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

interface TourStep {
  title: string;
  description: string;
  targetSelector: string;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Sidebar Navigation",
    description:
      "Access your projects, flags, segments, and settings from the sidebar. Switch between different sections of your workspace here.",
    targetSelector: '[data-tour="sidebar-nav"]',
  },
  {
    title: "Project & Environment",
    description:
      "Switch between projects and environments here. Each environment has independent flag states for development, staging, and production.",
    targetSelector: '[data-tour="context-bar"]',
  },
  {
    title: "Create Your First FlagIcon",
    description:
      "This is your workspace. Create feature flags, set up targeting rules, and manage rollouts all from this central area.",
    targetSelector: '[data-tour="main-content"]',
  },
  {
    title: "Your Profile",
    description:
      "View your account details, manage settings, and sign out from here.",
    targetSelector: '[data-tour="sidebar-profile"]',
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const SPOTLIGHT_PAD = 6;
const TOOLTIP_GAP = 12;
const VIEWPORT_PAD = 12;

function getTargetRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return null;
  return {
    top: r.top - SPOTLIGHT_PAD,
    left: r.left - SPOTLIGHT_PAD,
    width: r.width + SPOTLIGHT_PAD * 2,
    height: r.height + SPOTLIGHT_PAD * 2,
  };
}

function clampToViewport(
  targetRect: Rect,
  tooltipW: number,
  tooltipH: number,
): React.CSSProperties {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  const rightOfTarget = targetRect.left + targetRect.width + TOOLTIP_GAP;
  const belowTarget = targetRect.top + targetRect.height + TOOLTIP_GAP;
  const fitsRight = rightOfTarget + tooltipW + VIEWPORT_PAD <= vw;
  const fitsBelow = belowTarget + tooltipH + VIEWPORT_PAD <= vh;

  let top: number;
  let left: number;

  if (fitsRight) {
    left = rightOfTarget;
    top = targetRect.top + targetRect.height / 2 - tooltipH / 2;
  } else if (fitsBelow) {
    top = belowTarget;
    left = targetRect.left;
  } else {
    top = targetRect.top - tooltipH - TOOLTIP_GAP;
    left = targetRect.left;
  }

  top = Math.max(VIEWPORT_PAD, Math.min(top, vh - tooltipH - VIEWPORT_PAD));
  left = Math.max(VIEWPORT_PAD, Math.min(left, vw - tooltipW - VIEWPORT_PAD));

  return { top, left };
}

function buildClipPath(rect: Rect): string {
  const { top, left, width, height } = rect;
  const r = left + width;
  const b = top + height;
  return `polygon(
    0% 0%, 100% 0%, 100% 100%, 0% 100%,
    0% ${top}px,
    ${left}px ${top}px,
    ${left}px ${b}px,
    0% ${b}px,
    0% 0%,
    100% 0%,
    100% 100%,
    ${r}px 100%,
    ${r}px ${top}px,
    ${left}px ${top}px,
    ${left}px ${b}px,
    ${r}px ${b}px,
    ${r}px ${top}px,
    100% ${top}px,
    100% 0%
  )`;
}

export function ProductTour({ onComplete }: { onComplete?: () => void }) {
  const token = useAppStore((s) => s.token);
  const setTourCompleted = useAppStore((s) => s.setTourCompleted);
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);
  const [targetRect, setTargetRect] = useState<Rect | null>(null);
  const [tooltipPos, setTooltipPos] = useState<React.CSSProperties>({});
  const tooltipRef = useRef<HTMLDivElement>(null);
  const rafRef = useRef(0);

  const step = TOUR_STEPS[currentStep];

  const measure = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      const rect = getTargetRect(step.targetSelector);
      setTargetRect(rect);
      if (rect && tooltipRef.current) {
        const { offsetWidth, offsetHeight } = tooltipRef.current;
        setTooltipPos(clampToViewport(rect, offsetWidth, offsetHeight));
      }
    });
  }, [step.targetSelector]);

  useEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [measure]);

  useLayoutEffect(() => {
    if (targetRect && tooltipRef.current) {
      const { offsetWidth, offsetHeight } = tooltipRef.current;
      setTooltipPos(clampToViewport(targetRect, offsetWidth, offsetHeight));
    }
  }, [targetRect, currentStep]);

  const finish = useCallback(async () => {
    setVisible(false);
    setTourCompleted();
    if (token) {
      try {
        await api.updateOnboarding(token, { tour_completed: true });
      } catch {
        // non-critical
      }
    }
    onComplete?.();
  }, [token, onComplete, setTourCompleted]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish();
    }
  }, [currentStep, finish]);

  if (!visible) return null;

  const isLast = currentStep === TOUR_STEPS.length - 1;
  const hasTarget = targetRect !== null;

  return (
    <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog">
      {/* Overlay */}
      {hasTarget ? (
        <div
          className="absolute inset-0 bg-slate-900/60 transition-all duration-300"
          style={{ clipPath: buildClipPath(targetRect) }}
        />
      ) : (
        <div className="absolute inset-0 bg-slate-900/60" />
      )}

      {/* Spotlight border */}
      {hasTarget && (
        <div
          className="pointer-events-none absolute rounded-lg ring-2 ring-accent ring-offset-2 transition-all duration-300"
          style={{
            top: targetRect.top,
            left: targetRect.left,
            width: targetRect.width,
            height: targetRect.height,
          }}
        />
      )}

      {/* Tooltip — positioned absolutely when target exists, centered otherwise */}
      <div
        ref={tooltipRef}
        className={
          hasTarget
            ? "absolute z-10 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-[var(--signal-border-default)] bg-white p-4 shadow-2xl transition-all duration-300 sm:p-5"
            : "fixed left-1/2 top-1/2 z-10 w-[min(20rem,calc(100vw-1.5rem))] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-[var(--signal-border-default)] bg-white p-4 shadow-2xl sm:p-5"
        }
        style={hasTarget ? tooltipPos : undefined}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-[var(--signal-fg-primary)]">{step.title}</h3>
          <span className="text-xs text-[var(--signal-fg-tertiary)]">
            {currentStep + 1} of {TOUR_STEPS.length}
          </span>
        </div>
        <p className="mb-3 text-sm leading-relaxed text-[var(--signal-fg-secondary)] sm:mb-4">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="mb-3 flex gap-1.5 sm:mb-4">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep
                  ? "w-6 bg-[var(--signal-bg-accent-emphasis)]"
                  : i < currentStep
                    ? "w-1.5 bg-[var(--signal-bg-accent-emphasis)]/40"
                    : "w-1.5 bg-[var(--signal-bg-secondary)]"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs font-medium text-[var(--signal-fg-tertiary)] transition-colors hover:text-[var(--signal-fg-secondary)]"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="rounded-lg border border-[var(--signal-border-default)] px-3 py-1.5 text-xs font-medium text-[var(--signal-fg-secondary)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="rounded-lg bg-[var(--signal-bg-accent-emphasis)] px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-[var(--signal-bg-accent-emphasis)]-dark"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
