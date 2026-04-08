"use client";

import { useEffect, useState, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Check, Sparkles, Copy, ClipboardCheck, Key, ArrowRight } from "lucide-react";
import { api } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const STEPS = [
  { key: "flag_created", label: "Create Flag" },
  { key: "sdk_installed", label: "Connect SDK" },
  { key: "completed", label: "All Set!" },
];

const SDK_TABS = [
  { id: "node", label: "Node.js" },
  { id: "go", label: "Go" },
  { id: "python", label: "Python" },
  { id: "react", label: "React" },
  { id: "java", label: "Java" },
  { id: "csharp", label: "C#" },
  { id: "ruby", label: "Ruby" },
  { id: "vue", label: "Vue" },
] as const;

const SDK_INSTALL: Record<string, string> = {
  go: "go get github.com/featuresignals/sdk-go",
  node: "npm install @featuresignals/sdk",
  python: "pip install featuresignals",
  java: `<dependency>
  <groupId>com.featuresignals</groupId>
  <artifactId>sdk</artifactId>
  <version>1.0.0</version>
</dependency>`,
  csharp: "dotnet add package FeatureSignals.SDK",
  ruby: "gem install featuresignals",
  react: "npm install @featuresignals/react",
  vue: "npm install @featuresignals/vue",
};

function sdkSnippet(lang: string, apiKey: string): string {
  const key = apiKey || "YOUR_API_KEY";
  const snippets: Record<string, string> = {
    go: `import fs "github.com/featuresignals/sdk-go"

client := fs.NewClient("${key}")
defer client.Close()

enabled := client.IsEnabled("my-flag", fs.User{Key: "user-123"})
if enabled {
    // new feature code
}`,
    node: `import { FeatureSignals } from "@featuresignals/sdk";

const client = new FeatureSignals("${key}");

const enabled = await client.isEnabled("my-flag", {
  key: "user-123",
});`,
    python: `from featuresignals import FeatureSignals

client = FeatureSignals("${key}")

if client.is_enabled("my-flag", {"key": "user-123"}):
    # new feature code
    pass`,
    java: `import com.featuresignals.SDK;

SDK client = new SDK("${key}");

boolean enabled = client.isEnabled("my-flag",
    Map.of("key", "user-123"));`,
    csharp: `using FeatureSignals;

var client = new FSClient("${key}");

bool enabled = client.IsEnabled("my-flag",
    new User { Key = "user-123" });`,
    ruby: `require "featuresignals"

client = FeatureSignals::Client.new("${key}")

if client.enabled?("my-flag", key: "user-123")
  # new feature code
end`,
    react: `import { FSProvider, useFlag } from "@featuresignals/react";

function App() {
  return (
    <FSProvider apiKey="${key}" user={{ key: "user-123" }}>
      <MyComponent />
    </FSProvider>
  );
}

function MyComponent() {
  const enabled = useFlag("my-flag");
  return enabled ? <NewFeature /> : <OldFeature />;
}`,
    vue: `<script setup>
import { useFlag } from "@featuresignals/vue";

const showFeature = useFlag("my-flag");
</script>

<template>
  <NewFeature v-if="showFeature" />
  <OldFeature v-else />
</template>`,
  };
  return snippets[lang] ?? snippets.node;
}

function OnboardingContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = useAppStore((s) => s.token);
  const refreshToken = useAppStore((s) => s.refreshToken);
  const setAuth = useAppStore((s) => s.setAuth);
  const projectId = useAppStore((s) => s.currentProjectId);
  const currentEnvId = useAppStore((s) => s.currentEnvId);
  const userName = useAppStore((s) => s.user?.name);

  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});
  const [hasPlanIntent, setHasPlanIntent] = useState(false);

  useEffect(() => {
    setHasPlanIntent(localStorage.getItem("fs_plan_intent") === "pro");
  }, []);

  const [flagForm, setFlagForm] = useState({ key: "", name: "" });
  const [creatingFlag, setCreatingFlag] = useState(false);

  const [selectedSdk, setSelectedSdk] = useState<string>("node");
  const [apiKey, setApiKey] = useState<string>("");

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast("Payment successful! Your plan has been upgraded to Pro.", "success");
      if (refreshToken) {
        api.refresh(refreshToken).then((data) => {
          if (data?.access_token) {
            const user = data.user ?? useAppStore.getState().user;
            const org = data.organization ?? useAppStore.getState().organization;
            setAuth(data.access_token, data.refresh_token, user, org, data.expires_at, data.onboarding_completed);
          }
        }).catch(() => {});
      }
    } else if (status === "failed") {
      toast("Payment failed. Please try again or contact support.", "error");
    } else if (status === "canceled") {
      toast("Checkout canceled. No charges were made.");
    }
  }, [searchParams, refreshToken, setAuth]);

  useEffect(() => {
    if (!token) return;

    async function loadState() {
      try {
        const data = await api.getOnboarding(token!);
        if (data) {
          const steps: Record<string, boolean> = {
            flag_created: data.first_flag_created,
            sdk_installed: data.first_sdk_connected,
            completed: data.completed,
          };
          setCompleted(steps);
          const firstIncomplete = STEPS.findIndex((s) => !steps[s.key]);
          setCurrentStep(firstIncomplete === -1 ? STEPS.length - 1 : firstIncomplete);
        }
      } catch {
        // continue with defaults
      }

      if (!data?.plan_selected && token) {
        try {
          await api.updateOnboarding(token, { plan_chosen: true });
        } catch {
          // non-critical
        }
      }

      setLoading(false);
    }

    let data: { plan_selected?: boolean } | undefined;
    api.getOnboarding(token)
      .then((d) => { data = d ?? undefined; })
      .catch(() => {})
      .finally(() => loadState());
  }, [token]);

  useEffect(() => {
    if (!token || !currentEnvId) return;
    api.listAPIKeys(token, currentEnvId).then((keys) => {
      if (keys && keys.length > 0) {
        const serverKey = keys.find((k) => k.type === "server") ?? keys[0];
        if (serverKey?.key_prefix) {
          setApiKey(serverKey.key_prefix + "...");
        }
      }
    }).catch(() => {});
  }, [token, currentEnvId]);

  async function markStepComplete(stepKey: string) {
    if (!token) return;
    const updated = { ...completed, [stepKey]: true };
    setCompleted(updated);
    try {
      await api.updateOnboarding(token, { [stepKey]: true });
    } catch {
      // continue even if save fails
    }
    const nextIncomplete = STEPS.findIndex((s) => !updated[s.key]);
    setCurrentStep(nextIncomplete === -1 ? STEPS.length - 1 : nextIncomplete);
  }

  async function handleCreateFlag(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) {
      toast("No project selected. Please select a project from the sidebar.", "error");
      return;
    }
    setCreatingFlag(true);
    try {
      await api.createFlag(token, projectId, {
        key: flagForm.key,
        name: flagForm.name,
        flag_type: "boolean",
      });
      toast("Flag created successfully!", "success");
      setFlagForm({ key: "", name: "" });
      await markStepComplete("flag_created");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to create flag", "error");
    } finally {
      setCreatingFlag(false);
    }
  }

  async function handleSdkComplete() {
    await markStepComplete("sdk_installed");
  }

  async function handleFinish() {
    await markStepComplete("completed");
    const planIntent = localStorage.getItem("fs_plan_intent");
    if (planIntent === "pro") {
      localStorage.removeItem("fs_plan_intent");
      router.push("/settings/billing");
    } else {
      router.push("/dashboard");
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  const greeting = userName ? `, ${userName.split(" ")[0]}` : "";

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Welcome{greeting} to <span className="text-indigo-600">FeatureSignals</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500">
          Your workspace is ready. Let&apos;s get your first flag live in under 5 minutes.
        </p>
      </div>

      {hasPlanIntent && (
        <div className="rounded-lg bg-gradient-to-r from-indigo-50 to-purple-50 border border-indigo-200 px-4 py-3 text-center">
          <p className="text-sm text-indigo-800">
            Your <span className="font-bold">Pro trial</span> is active. Complete onboarding, then subscribe to keep all Pro features.
          </p>
          <Link
            href="/settings/billing"
            className="mt-1 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:text-indigo-700"
          >
            Subscribe now <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      )}

      {/* Progress Steps */}
      <div className="flex items-center justify-center gap-0">
        {STEPS.map((step, idx) => {
          const done = completed[step.key];
          const active = currentStep === idx;
          return (
            <div key={step.key} className="flex items-center">
              <div className="flex flex-col items-center">
                <button
                  onClick={() => setCurrentStep(idx)}
                  className={cn(
                    "flex h-8 w-8 sm:h-10 sm:w-10 items-center justify-center rounded-full text-xs sm:text-sm font-bold transition-all",
                    done
                      ? "bg-emerald-500 text-white shadow-sm"
                      : active
                        ? "bg-indigo-600 text-white shadow-md ring-4 ring-indigo-100"
                        : "bg-slate-200 text-slate-500",
                  )}
                >
                  {done ? <Check className="h-4 w-4 sm:h-5 sm:w-5" /> : idx + 1}
                </button>
                <span className={cn(
                  "mt-1.5 sm:mt-2 text-[10px] sm:text-xs font-medium",
                  active ? "text-indigo-700" : done ? "text-emerald-700" : "text-slate-400",
                )}>
                  {step.label}
                </span>
              </div>
              {idx < STEPS.length - 1 && (
                <div className={cn("mx-1 sm:mx-2 h-0.5 w-10 sm:w-16 md:w-24", done ? "bg-emerald-400" : "bg-slate-200")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="p-4 sm:p-6 md:p-8 shadow-sm">
        {currentStep === 0 && (
          <StepCreateFlag
            form={flagForm}
            setForm={setFlagForm}
            onSubmit={handleCreateFlag}
            creating={creatingFlag}
            completed={!!completed.flag_created}
            onSkip={() => markStepComplete("flag_created")}
          />
        )}
        {currentStep === 1 && (
          <StepInstallSdk
            selectedSdk={selectedSdk}
            setSelectedSdk={setSelectedSdk}
            onComplete={handleSdkComplete}
            completed={!!completed.sdk_installed}
            apiKey={apiKey}
          />
        )}
        {currentStep === 2 && <StepComplete onFinish={handleFinish} />}
      </Card>

      <div className="flex items-center justify-center gap-6">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
        >
          Skip onboarding
        </button>
        <Link
          href="/settings/billing"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-indigo-500 transition-colors hover:text-indigo-700"
        >
          View plans & pricing <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </div>
  );
}

export default function OnboardingPage() {
  return (
    <Suspense fallback={
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    }>
      <OnboardingContent />
    </Suspense>
  );
}

function StepCreateFlag({
  form,
  setForm,
  onSubmit,
  creating,
  completed,
  onSkip,
}: {
  form: { key: string; name: string };
  setForm: (f: { key: string; name: string }) => void;
  onSubmit: (e: React.FormEvent) => void;
  creating: boolean;
  completed: boolean;
  onSkip: () => void;
}) {
  if (completed) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <p className="mt-4 text-lg font-semibold text-slate-900">Flag created!</p>
        <p className="mt-1 text-sm text-slate-500">You can manage flags from the Flags page.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">Create Your First Flag</h2>
      <p className="mt-1 text-sm text-slate-500">
        Feature flags let you toggle functionality without redeploying. Try creating one now.
      </p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Flag Key</Label>
          <Input
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-") })}
            placeholder="new-checkout-flow"
            required
          />
          <p className="text-xs text-slate-400">Lowercase letters, numbers, dashes, and underscores only.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Display Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="New Checkout Flow"
            required
          />
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button type="submit" disabled={creating}>
            {creating ? "Creating..." : "Create Flag"}
          </Button>
          <Button type="button" variant="secondary" onClick={onSkip}>
            Skip this step
          </Button>
        </div>
      </form>
    </div>
  );
}

function StepInstallSdk({
  selectedSdk,
  setSelectedSdk,
  onComplete,
  completed,
  apiKey,
}: {
  selectedSdk: string;
  setSelectedSdk: (s: string) => void;
  onComplete: () => void;
  completed: boolean;
  apiKey: string;
}) {
  const [copied, setCopied] = useState<string | null>(null);

  function copyText(text: string, label: string) {
    navigator.clipboard.writeText(text);
    setCopied(label);
    setTimeout(() => setCopied(null), 2000);
  }

  if (completed) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <p className="mt-4 text-lg font-semibold text-slate-900">SDK ready!</p>
        <p className="mt-1 text-sm text-slate-500">You&apos;re all set to start using feature flags in your app.</p>
      </div>
    );
  }

  const snippet = sdkSnippet(selectedSdk, apiKey);

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">Connect Your App</h2>
      <p className="mt-1 text-sm text-slate-500">Install the SDK in your language and start evaluating flags.</p>

      {apiKey && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-indigo-100 bg-indigo-50/50 px-3 py-2">
          <Key className="h-4 w-4 shrink-0 text-indigo-500" />
          <span className="text-xs font-medium text-indigo-700">
            Your API key is pre-filled in the snippets below
          </span>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-1.5">
        {SDK_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setSelectedSdk(tab.id)}
            className={cn(
              "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
              selectedSdk === tab.id
                ? "bg-indigo-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="mt-4 space-y-3">
        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Installation</span>
            <button onClick={() => copyText(SDK_INSTALL[selectedSdk], "install")} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              {copied === "install" ? <><ClipboardCheck className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 sm:p-4 text-xs sm:text-sm text-slate-100">
            <code>{SDK_INSTALL[selectedSdk]}</code>
          </pre>
        </div>

        <div>
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs font-medium text-slate-500">Quick Start</span>
            <button onClick={() => copyText(snippet, "snippet")} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              {copied === "snippet" ? <><ClipboardCheck className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 sm:p-4 text-xs sm:text-sm text-slate-100">
            <code>{snippet}</code>
          </pre>
        </div>
      </div>

      <div className="mt-6 flex flex-col sm:flex-row gap-3">
        <Button onClick={onComplete}>
          I&apos;ve connected the SDK
        </Button>
        <Button variant="secondary" asChild>
          <a href="https://docs.featuresignals.com/getting-started/quickstart" target="_blank" rel="noopener noreferrer">
            View full docs
          </a>
        </Button>
      </div>
    </div>
  );
}

function StepComplete({ onFinish }: { onFinish: () => void }) {
  return (
    <div className="text-center py-8">
      <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
        <Sparkles className="h-10 w-10 text-indigo-600" />
      </div>

      <h2 className="mt-6 text-2xl font-bold text-slate-900">You&apos;re All Set!</h2>
      <p className="mt-2 text-sm text-slate-500">
        Your workspace is ready. Start managing feature flags and ship confidently.
      </p>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Button variant="secondary" asChild>
          <Link href="/flags">View Flags</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/segments">Segments</Link>
        </Button>
        <Button variant="secondary" asChild>
          <Link href="/settings/billing">Plans & Billing</Link>
        </Button>
      </div>

      <Button onClick={onFinish} className="mt-6" size="lg">
        Go to Flag Engine
      </Button>
    </div>
  );
}
