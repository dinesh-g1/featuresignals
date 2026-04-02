"use client";

import { useState, useCallback } from "react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";

interface TourStep {
  title: string;
  description: string;
  spotlightArea: { top: string; left: string; width: string; height: string };
  tooltipPosition: { top: string; left: string };
}

const TOUR_STEPS: TourStep[] = [
  {
    title: "Sidebar Navigation",
    description: "Access your projects, flags, segments, and settings from the sidebar. Switch between different sections of your workspace here.",
    spotlightArea: { top: "0", left: "0", width: "256px", height: "100vh" },
    tooltipPosition: { top: "120px", left: "280px" },
  },
  {
    title: "Create a Flag",
    description: "Feature flags let you control who sees new features. Create your first flag to start managing rollouts safely.",
    spotlightArea: { top: "60px", left: "256px", width: "300px", height: "80px" },
    tooltipPosition: { top: "160px", left: "300px" },
  },
  {
    title: "Environment Switcher",
    description: "Switch between development, staging, and production environments. Each environment has independent flag states.",
    spotlightArea: { top: "0", left: "0", width: "256px", height: "60px" },
    tooltipPosition: { top: "80px", left: "280px" },
  },
  {
    title: "Targeting Rules",
    description: "Set up targeting rules to gradually roll out features to specific user segments, percentages, or individual users.",
    spotlightArea: { top: "200px", left: "256px", width: "calc(100vw - 256px)", height: "200px" },
    tooltipPosition: { top: "180px", left: "50%" },
  },
  {
    title: "Metrics Dashboard",
    description: "Monitor flag evaluations and track how your features are performing across environments in real time.",
    spotlightArea: { top: "420px", left: "256px", width: "calc(100vw - 256px)", height: "200px" },
    tooltipPosition: { top: "400px", left: "50%" },
  },
];

export function ProductTour({ onComplete }: { onComplete?: () => void }) {
  const token = useAppStore((s) => s.token);
  const [currentStep, setCurrentStep] = useState(0);
  const [visible, setVisible] = useState(true);

  const finish = useCallback(async () => {
    setVisible(false);
    if (token) {
      try {
        await api.updateOnboarding(token, { tour_completed: true });
      } catch {
        // non-critical
      }
    }
    onComplete?.();
  }, [token, onComplete]);

  const handleNext = useCallback(() => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep((s) => s + 1);
    } else {
      finish();
    }
  }, [currentStep, finish]);

  if (!visible) return null;

  const step = TOUR_STEPS[currentStep];
  const isLast = currentStep === TOUR_STEPS.length - 1;

  return (
    <div className="fixed inset-0 z-[100]">
      {/* Overlay using CSS clip-path to create spotlight cutout */}
      <div
        className="absolute inset-0 bg-slate-900/60 transition-all duration-300"
        style={{
          clipPath: `polygon(
            0% 0%, 100% 0%, 100% 100%, 0% 100%,
            0% ${step.spotlightArea.top},
            ${step.spotlightArea.left} ${step.spotlightArea.top},
            ${step.spotlightArea.left} calc(${step.spotlightArea.top} + ${step.spotlightArea.height}),
            0% calc(${step.spotlightArea.top} + ${step.spotlightArea.height})
          )`,
        }}
      />

      {/* Spotlight border */}
      <div
        className="pointer-events-none absolute rounded-lg ring-2 ring-indigo-400 ring-offset-2 transition-all duration-300"
        style={{
          top: step.spotlightArea.top,
          left: step.spotlightArea.left,
          width: step.spotlightArea.width,
          height: step.spotlightArea.height,
        }}
      />

      {/* Tooltip */}
      <div
        className="absolute z-10 w-80 rounded-xl border border-slate-200 bg-white p-5 shadow-2xl transition-all duration-300"
        style={{
          top: step.tooltipPosition.top,
          left: step.tooltipPosition.left,
        }}
      >
        <div className="mb-1 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-slate-900">{step.title}</h3>
          <span className="text-xs text-slate-400">{currentStep + 1} of {TOUR_STEPS.length}</span>
        </div>
        <p className="mb-4 text-sm leading-relaxed text-slate-500">{step.description}</p>

        {/* Progress dots */}
        <div className="mb-4 flex gap-1.5">
          {TOUR_STEPS.map((_, i) => (
            <div
              key={i}
              className={`h-1.5 rounded-full transition-all ${
                i === currentStep ? "w-6 bg-indigo-600" : i < currentStep ? "w-1.5 bg-indigo-300" : "w-1.5 bg-slate-200"
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
