"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

type TooltipPlacement = "right" | "bottom" | "bottom-left";

interface TourStep {
  title: string;
  description: string;
  targetSelector: string;
  placement: TooltipPlacement;
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Sidebar Navigation",
    description:
      "Access your projects, flags, segments, and settings from the sidebar. Switch between different sections of your workspace here.",
    targetSelector: '[data-tour="sidebar-nav"]',
    placement: "right",
  },
  {
    title: "Project & Environment",
    description:
      "Switch between projects and environments here. Each environment has independent flag states for development, staging, and production.",
    targetSelector: '[data-tour="context-bar"]',
    placement: "bottom-left",
  },
  {
    title: "Create Your First Flag",
    description:
      "This is your workspace. Create feature flags, set up targeting rules, and manage rollouts all from this central area.",
    targetSelector: '[data-tour="main-content"]',
    placement: "bottom-left",
  },
  {
    title: "Your Profile",
    description:
      "View your account details, manage settings, and sign out from here.",
    targetSelector: '[data-tour="sidebar-profile"]',
    placement: "right",
  },
];

interface Rect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const PADDING = 6;

function getTargetRect(selector: string): Rect | null {
  const el = document.querySelector(selector);
  if (!el) return null;
  const r = el.getBoundingClientRect();
  return {
    top: r.top - PADDING,
    left: r.left - PADDING,
    width: r.width + PADDING * 2,
    height: r.height + PADDING * 2,
  };
}

function computeTooltipStyle(
  rect: Rect,
  placement: TooltipPlacement,
): React.CSSProperties {
  const TOOLTIP_GAP = 12;
  switch (placement) {
    case "right":
      return {
        top: rect.top,
        left: rect.left + rect.width + TOOLTIP_GAP,
      };
    case "bottom":
      return {
        top: rect.top + rect.height + TOOLTIP_GAP,
        left: rect.left + rect.width / 2,
        transform: "translateX(-50%)",
      };
    case "bottom-left":
      return {
        top: rect.top + rect.height + TOOLTIP_GAP,
        left: rect.left,
      };
  }
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
  const rafRef = useRef(0);

  const step = TOUR_STEPS[currentStep];

  const measureTarget = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(() => {
      setTargetRect(getTargetRect(step.targetSelector));
    });
  }, [step.targetSelector]);

  useEffect(() => {
    measureTarget();

    window.addEventListener("resize", measureTarget);
    window.addEventListener("scroll", measureTarget, true);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener("resize", measureTarget);
      window.removeEventListener("scroll", measureTarget, true);
    };
  }, [measureTarget]);

  const finish = useCallback(async () => {
    setVisible(false);
    setTourCompleted();
    if (token) {
      try {
        await api.updateOnboarding(token, { tour_completed: true });
      } catch {
        // non-critical — local persistence is the source of truth
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

  if (!visible || !targetRect) return null;

  const isLast = currentStep === TOUR_STEPS.length - 1;
  const tooltipStyle = computeTooltipStyle(targetRect, step.placement);

  return (
    <div className="fixed inset-0 z-[100]" aria-modal="true" role="dialog">
      {/* Overlay with spotlight cutout */}
      <div
        className="absolute inset-0 bg-slate-900/60 transition-all duration-300"
        style={{ clipPath: buildClipPath(targetRect) }}
      />

      {/* Spotlight border */}
      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-indigo-400 ring-offset-2 transition-all duration-300"
        style={{
          top: targetRect.top,
          left: targetRect.left,
          width: targetRect.width,
          height: targetRect.height,
        }}
      />

      {/* Tooltip */}
      <div
        className="absolute z-10 w-80 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl transition-all duration-300"
        style={tooltipStyle}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">
            {step.title}
          </h3>
          <span className="text-xs text-slate-400">
            {currentStep + 1} of {TOUR_STEPS.length}
          </span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-slate-500">
          {step.description}
        </p>

        {/* Progress dots */}
        <div className="mb-4 flex gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep
                  ? "w-6 bg-indigo-600"
                  : i < currentStep
                    ? "w-1.5 bg-indigo-300"
                    : "w-1.5 bg-slate-200"
              }`}
            />
          ))}
        </div>

        <div className="flex items-center justify-between">
          <button
            onClick={finish}
            className="text-xs font-medium text-slate-400 transition-colors hover:text-slate-600"
          >
            Skip tour
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep((s) => s - 1)}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-50"
              >
                Back
              </button>
            )}
            <button
              onClick={handleNext}
              className="rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white transition-all hover:bg-indigo-700"
            >
              {isLast ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
