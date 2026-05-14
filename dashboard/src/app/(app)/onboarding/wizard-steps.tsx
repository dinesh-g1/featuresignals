"use client";

import { useState, useCallback, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { useAppStore } from "@/stores/app-store";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormField } from "@/components/ui/form-field";
import {
  SparklesIcon,
  FolderOpenIcon,
  FlagIcon,
  KeyIcon,
  CheckIcon,
  XCircleFillIcon,
  RocketIcon,
} from "@/components/icons/nav-icons";
import { InstantFlagToggle, WhatJustHappened } from "./instant-flag";
import { SdkSnippet } from "./sdk-snippet";

/* ── Wizard state ────────────────────────────────────────────────── */

export interface WizardState {
  projectId: string | null;
  projectName: string;
  envId: string | null;
  flagKey: string;
  apiKey: string | null;
  flagEnabled: boolean;
}

const STORAGE_KEY = "fs-onboarding-wizard";

export function loadWizardState(): Partial<WizardState> | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as Partial<WizardState>;
  } catch {
    return null;
  }
}

export function saveWizardState(state: Partial<WizardState>): void {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // sessionStorage unavailable
  }
}

export function clearWizardState(): void {
  try {
    sessionStorage.removeItem(STORAGE_KEY);
  } catch {
    // sessionStorage unavailable
  }
}

/* ── Step 1: Welcome ──────────────────────────────────────────────── */

interface StepWelcomeProps {
  onContinue: () => void;
  onSkip: () => void;
  userName?: string;
}

export function StepWelcome({
  onContinue,
  onSkip: _onSkip,
  userName,
}: StepWelcomeProps) {
  const router = useRouter();
  const projectId = useAppStore((s) => s.currentProjectId);

  const handleSkip = () => {
    if (projectId) {
      router.push(`/projects/${projectId}/dashboard`);
    } else {
      router.push("/projects");
    }
  };

  return (
    <div className="flex flex-col items-center text-center py-8 sm:py-12">
      {/* Animated logo */}
      <div className="animate-scale-in mb-6">
        <div className="relative">
          <div className="absolute inset-0 animate-pulse rounded-full bg-[var(--signal-fg-accent)]/10 blur-2xl" />
          <div className="relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--signal-bg-accent-emphasis)] to-[#0757ba] shadow-[var(--signal-shadow-lg)]">
            <SparklesIcon className="h-10 w-10 text-white" />
          </div>
        </div>
      </div>

      {/* Headline */}
      <h1 className="animate-fade-in text-2xl sm:text-3xl font-bold tracking-tight text-[var(--signal-fg-primary)]">
        {userName
          ? `Welcome, ${userName.split(" ")[0]}`
          : "Welcome to FeatureSignals"}
      </h1>
      <p className="animate-fade-in mt-3 text-base sm:text-lg font-medium text-[var(--signal-fg-accent)]">
        Feature flags that don&apos;t cost a fortune.
      </p>
      <p className="animate-fade-in mt-2 max-w-md text-sm text-[var(--signal-fg-secondary)]">
        Ship faster, reduce risk, and toggle features without re-shipping. Get
        your first flag running in under 60 seconds.
      </p>

      {/* CTA */}
      <div className="animate-fade-in mt-8 flex flex-col items-center gap-3">
        <Button size="xl" variant="primary" onClick={onContinue}>
          <RocketIcon className="h-4 w-4" />
          Get Started
        </Button>
        <button
          type="button"
          onClick={handleSkip}
          className="text-sm font-medium text-[var(--signal-fg-tertiary)] transition-colors hover:text-[var(--signal-fg-secondary)]"
        >
          Skip to Dashboard
        </button>
      </div>
    </div>
  );
}

/* ── Step 2: Name Your First Project ──────────────────────────────── */

interface StepNameProjectProps {
  onComplete: (state: WizardState) => void;
  userName?: string;
  orgName?: string;
}

interface PreviewCard {
  orgName: string;
  projectName: string;
  envName: string;
}

function PreviewCard({ orgName, projectName, envName }: PreviewCard) {
  return (
    <div className="rounded-xl border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-4 space-y-2">
      <div className="flex items-center gap-2.5 text-sm">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-[var(--signal-bg-accent-muted)]">
          <FolderOpenIcon className="h-3.5 w-3.5 text-[var(--signal-fg-accent)]" />
        </div>
        <span className="font-medium text-[var(--signal-fg-primary)]">
          {orgName}
        </span>
        <span className="text-[var(--signal-fg-tertiary)]">→</span>
        <span className="font-medium text-[var(--signal-fg-primary)]">
          {projectName}
        </span>
        <span className="text-[var(--signal-fg-tertiary)]">→</span>
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 rounded-full bg-[#1f883d]" />
          <span className="font-medium text-[var(--signal-fg-success)]">
            {envName}
          </span>
        </div>
      </div>
      <p className="text-xs text-[var(--signal-fg-secondary)]">
        A project groups your flags and environments. &ldquo;Production&rdquo;
        is created automatically — add staging or dev later.
      </p>
    </div>
  );
}

export function StepNameProject({
  onComplete,
  userName: _userName,
  orgName,
}: StepNameProjectProps) {
  const token = useAppStore((s) => s.token);
  const [projectName, setProjectName] = useState("");
  const [fieldError, setFieldError] = useState("");
  const [creating, setCreating] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  const computedOrgName = orgName || "My Organization";
  const displayProjectName = projectName.trim() || "My App";

  const handleSubmit = useCallback(
    async (e: FormEvent) => {
      e.preventDefault();
      if (!token) return;

      const name = projectName.trim();
      if (!name) {
        setFieldError("Please name your project");
        return;
      }
      setFieldError("");
      setApiError(null);
      setCreating(true);

      try {
        // 1. Create project
        const project = await api.createProject(token, { name });
        const projectId = project.id;

        // 2. Create "Production" environment
        let envId: string;
        try {
          const env = await api.createEnvironment(token, projectId, {
            name: "Production",
            slug: "production",
            color: "#1f883d",
          });
          envId = env.id;
        } catch {
          // Try to list environments if creation fails (might have auto-created)
          const envs = await api.listEnvironments(token, projectId);
          if (envs && envs.length > 0) {
            envId = envs[0].id;
          } else {
            throw new Error(
              "Could not create or find an environment. Please try again.",
            );
          }
        }

        // 3. Create demo "dark-mode" flag
        await api.createFlag(token, projectId, {
          key: "dark-mode",
          name: "Dark Mode",
          flag_type: "boolean",
          description: "Toggle dark mode across the application",
        });

        // 4. Enable the flag by default
        await api.updateFlagState(token, projectId, "dark-mode", envId, {
          enabled: true,
        });

        // 5. Create API key
        let apiKeyValue = "";
        try {
          const keyResp = await api.createAPIKey(token, envId, {
            name: `Onboarding Key — ${name}`,
            type: "server",
          });
          apiKeyValue = keyResp.key || keyResp.key_prefix || "";
        } catch {
          // Non-fatal: API key creation can fail, we'll show SDK snippet without key
        }

        // 6. Set store
        useAppStore.getState().setCurrentProject(projectId);
        useAppStore.getState().setCurrentEnv(envId);

        const state: WizardState = {
          projectId,
          projectName: name,
          envId,
          flagKey: "dark-mode",
          apiKey: apiKeyValue || null,
          flagEnabled: true,
        };
        saveWizardState(state);
        onComplete(state);
      } catch (err: unknown) {
        setApiError(
          err instanceof Error
            ? err.message
            : "Something went wrong. Please try again.",
        );
      } finally {
        setCreating(false);
      }
    },
    [token, projectName, onComplete],
  );

  return (
    <div>
      <div className="text-center mb-6">
        <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)]">
          What are you building?
        </h2>
        <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
          Give your first project a name. We&apos;ll set up everything else
          automatically.
        </p>
      </div>

      <form noValidate onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Project Name"
          htmlFor="onboarding-project-name"
          error={fieldError}
          required
        >
          <Input
            id="onboarding-project-name"
            value={projectName}
            onChange={(e) => {
              setProjectName(e.target.value);
              setFieldError("");
              setApiError(null);
            }}
            className="text-lg h-12"
            autoFocus
            disabled={creating}
          />
        </FormField>

        {/* Preview */}
        <PreviewCard
          orgName={computedOrgName}
          projectName={displayProjectName}
          envName="Production"
        />

        {/* Error */}
        {apiError && (
          <div className="flex items-start gap-2 rounded-lg bg-[var(--signal-bg-danger-muted)] px-3 py-2.5 text-sm text-[var(--signal-fg-danger)]">
            <XCircleFillIcon className="mt-0.5 h-4 w-4 shrink-0" />
            <p>{apiError}</p>
          </div>
        )}

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          loading={creating}
          disabled={creating || !projectName.trim()}
        >
          Create Project &amp; Continue
        </Button>
      </form>
    </div>
  );
}

/* ── Step 3: See It Work Instantly ────────────────────────────────── */

interface StepInstantFlagProps {
  state: WizardState;
  onFinish: () => void;
}

export function StepInstantFlag({ state, onFinish }: StepInstantFlagProps) {
  const router = useRouter();
  const projectId = useAppStore((s) => s.currentProjectId);
  const [activeTab, setActiveTab] = useState<"snippet" | "toggle" | "explain">(
    "toggle",
  );
  const [flagEnabled, setFlagEnabled] = useState(state.flagEnabled);

  const handleToggle = useCallback((enabled: boolean) => {
    setFlagEnabled(enabled);
  }, []);

  const handleGoToDashboard = () => {
    clearWizardState();
    onFinish();
    if (projectId) {
      router.push(`/projects/${projectId}/dashboard`);
    } else {
      router.push("/projects");
    }
  };

  const flagKey = state.flagKey || "dark-mode";

  return (
    <div>
      <div className="text-center mb-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--signal-bg-success-muted)] mb-4">
          <CheckIcon className="h-7 w-7 text-[var(--signal-fg-success)]" />
        </div>
        <h2 className="text-xl font-semibold text-[var(--signal-fg-primary)]">
          Your project is ready!
        </h2>
        <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
          A demo flag called{" "}
          <code className="bg-[var(--signal-bg-secondary)] px-1 py-0.5 rounded text-[var(--signal-fg-accent)] font-mono text-[13px]">
            dark-mode
          </code>{" "}
          has been created and is enabled by default.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-[var(--signal-border-default)] mb-5">
        {[
          { id: "toggle" as const, label: "Toggle the Flag", icon: FlagIcon },
          { id: "snippet" as const, label: "Your SDK Snippet", icon: KeyIcon },
          {
            id: "explain" as const,
            label: "What Just Happened?",
            icon: SparklesIcon,
          },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 sm:px-4 py-2.5 text-xs sm:text-sm font-medium transition-all duration-200 border-b-2 -mb-[1px]",
                activeTab === tab.id
                  ? "border-[var(--signal-fg-accent)] text-[var(--signal-fg-accent)]"
                  : "border-transparent text-[var(--signal-fg-secondary)] hover:text-[var(--signal-fg-primary)]",
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div className="min-h-[300px]">
        {activeTab === "toggle" && (
          <InstantFlagToggle
            flagKey={flagKey}
            projectId={state.projectId!}
            envId={state.envId!}
            enabled={flagEnabled}
            onToggle={handleToggle}
          />
        )}

        {activeTab === "snippet" && (
          <div>
            {state.apiKey ? (
              <>
                <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
                  Copy and paste this snippet into your app. Your real API key
                  is pre-filled.
                </p>
                <SdkSnippet apiKey={state.apiKey} />
              </>
            ) : (
              <div className="text-center py-8">
                <KeyIcon className="mx-auto h-10 w-10 text-[var(--signal-fg-tertiary)]" />
                <p className="mt-3 text-sm font-medium text-[var(--signal-fg-secondary)]">
                  API key not available
                </p>
                <p className="mt-1 text-xs text-[var(--signal-fg-tertiary)]">
                  You can create one from the dashboard settings. The SDK
                  snippet below uses a placeholder.
                </p>
                <div className="mt-4">
                  <SdkSnippet apiKey="YOUR_API_KEY" />
                </div>
              </div>
            )}
          </div>
        )}

        {activeTab === "explain" && (
          <WhatJustHappened flagKey={flagKey} evalResult={null} />
        )}
      </div>

      {/* Bottom CTA */}
      <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3">
        <Button size="lg" variant="primary" onClick={handleGoToDashboard}>
          Go to Dashboard
        </Button>
        <Button
          size="lg"
          variant="secondary"
          onClick={handleGoToDashboard}
          asChild
        >
          <a href={projectId ? `/projects/${projectId}/flags` : "/flags"}>
            View Flags
          </a>
        </Button>
      </div>
    </div>
  );
}
