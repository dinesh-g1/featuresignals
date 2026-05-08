"use client";

import { useState, useCallback, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { toast } from "@/components/toast";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import {
  StepWelcome,
  StepNameProject,
  StepInstantFlag,
  loadWizardState,
  clearWizardState,
  type WizardState,
} from "./wizard-steps";

/* ── Step Indicator ──────────────────────────────────────────────── */

const STEP_LABELS = ["Welcome", "Create Project", "See It Work"];

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="flex items-center justify-center gap-0 mb-8">
      {STEP_LABELS.map((label, idx) => {
        const isActive = currentStep === idx;
        const isDone = currentStep > idx;
        return (
          <div key={label} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-full text-xs font-bold transition-all duration-300",
                  isDone
                    ? "bg-[var(--signal-bg-success-emphasis)] text-white shadow-sm"
                    : isActive
                      ? "bg-[var(--signal-bg-accent-emphasis)] text-white shadow-md ring-4 ring-[var(--signal-fg-accent)]/10"
                      : "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]",
                )}
              >
                {isDone ? (
                  <svg
                    className="h-4 w-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                    strokeWidth={2.5}
                    aria-hidden="true"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                ) : (
                  idx + 1
                )}
              </div>
              <span
                className={cn(
                  "mt-1.5 text-[10px] sm:text-xs font-medium whitespace-nowrap transition-colors",
                  isActive
                    ? "text-[var(--signal-fg-accent)]"
                    : isDone
                      ? "text-[var(--signal-fg-success)]"
                      : "text-[var(--signal-fg-tertiary)]",
                )}
              >
                {label}
              </span>
            </div>
            {idx < STEP_LABELS.length - 1 && (
              <div
                className={cn(
                  "mx-2 sm:mx-3 h-0.5 w-6 sm:w-12 md:w-20 transition-colors duration-300",
                  isDone
                    ? "bg-[var(--signal-bg-success-emphasis)]"
                    : "bg-[var(--signal-bg-secondary)]",
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ── Main Content ─────────────────────────────────────────────────── */

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAppStore((s) => s.token);
  const refreshToken = useAppStore((s) => s.refreshToken);
  const setAuth = useAppStore((s) => s.setAuth);
  const userName = useAppStore((s) => s.user?.name);
  const orgName = useAppStore((s) => s.organization?.name);
  const currentProjectId = useAppStore((s) => s.currentProjectId);

  const [currentStep, setCurrentStep] = useState(0);
  const [wizardState, setWizardState] = useState<WizardState | null>(null);
  const [loading, setLoading] = useState(true);

  // Handle post-checkout status params
  useState(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast(
        "Payment successful! Your plan has been upgraded to Pro.",
        "success",
      );
      if (refreshToken) {
        api
          .refresh(refreshToken)
          .then((data) => {
            if (data?.access_token) {
              const user = data.user ?? useAppStore.getState().user;
              const org =
                data.organization ?? useAppStore.getState().organization;
              setAuth(
                data.access_token,
                data.refresh_token,
                user,
                org,
                data.expires_at,
                data.onboarding_completed,
              );
            }
          })
          .catch(() => {});
      }
    } else if (status === "failed") {
      toast("Payment failed. Please try again or contact support.", "error");
    } else if (status === "canceled") {
      toast("Checkout canceled. No charges were made.");
    }
  });

  // Restore persisted wizard state on mount
  useState(() => {
    const saved = loadWizardState();
    if (saved && saved.projectId && saved.envId) {
      setWizardState(saved as WizardState);
      setCurrentStep(2); // Jump to step 3
    } else if (currentProjectId) {
      // User already has a project, skip to step 2 or 3
      setCurrentStep(1);
    }
    setLoading(false);
  });

  const handleStep1Continue = useCallback(() => {
    setCurrentStep(1);
  }, []);

  const handleStep1Skip = useCallback(() => {
    // Already handled inside StepWelcome via router
  }, []);

  const handleStep2Complete = useCallback((state: WizardState) => {
    setWizardState(state);
    setCurrentStep(2);
  }, []);

  const handleFinish = useCallback(() => {
    // Mark onboarding as complete on the server
    if (token) {
      api
        .updateOnboarding(token, {
          first_flag_created: true,
          first_sdk_connected: true,
          first_evaluation: true,
          completed: true,
        })
        .catch(() => {});
    }
    clearWizardState();
    sessionStorage.setItem("fs-tour-eligible", "true");
  }, [token]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--signal-border-accent-muted)] border-t-[var(--signal-fg-accent)]" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl px-4 py-8 sm:px-6">
      {/* Step Indicator */}
      <StepIndicator currentStep={currentStep} />

      {/* Step Content */}
      <Card className="p-6 sm:p-8 shadow-[var(--signal-shadow-md)]">
        {currentStep === 0 && (
          <StepWelcome
            onContinue={handleStep1Continue}
            onSkip={handleStep1Skip}
            userName={userName}
          />
        )}

        {currentStep === 1 && (
          <StepNameProject
            onComplete={handleStep2Complete}
            userName={userName}
            orgName={orgName}
          />
        )}

        {currentStep === 2 && wizardState && (
          <StepInstantFlag state={wizardState} onFinish={handleFinish} />
        )}

        {/* Edge case: step 3 without state (shouldn't happen normally) */}
        {currentStep === 2 && !wizardState && (
          <div className="text-center py-12">
            <p className="text-sm text-[var(--signal-fg-secondary)]">
              Something went wrong. Please refresh the page or{" "}
              <button
                type="button"
                onClick={() => {
                  setCurrentStep(0);
                  clearWizardState();
                }}
                className="font-medium text-[var(--signal-fg-accent)] hover:underline"
              >
                start over
              </button>
              .
            </p>
          </div>
        )}
      </Card>

      {/* Bottom links (only in step 1 and 2) */}
      {currentStep < 2 && (
        <div className="mt-6 flex items-center justify-center gap-6">
          <button
            type="button"
            onClick={() => {
              if (currentProjectId) {
                router.push(`/projects/${currentProjectId}/dashboard`);
              } else {
                router.push("/projects");
              }
            }}
            className="text-sm font-medium text-[var(--signal-fg-tertiary)] transition-colors hover:text-[var(--signal-fg-secondary)]"
          >
            Skip onboarding
          </button>
        </div>
      )}
    </div>
  );
}

/* ── Page Export ──────────────────────────────────────────────────── */

export default function OnboardingPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--signal-border-accent-muted)] border-t-[var(--signal-fg-accent)]" />
        </div>
      }
    >
      <OnboardingContent />
    </Suspense>
  );
}
