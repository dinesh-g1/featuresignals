"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Check, Sparkles, Copy, ClipboardCheck } from "lucide-react";
import { api, type PricingConfig } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";

const STEPS = [
  { key: "plan_chosen", label: "Choose Plan" },
  { key: "flag_created", label: "Create Flag" },
  { key: "sdk_installed", label: "Install SDK" },
  { key: "completed", label: "All Set!" },
];

const SDK_TABS = [
  { id: "go", label: "Go" },
  { id: "node", label: "Node.js" },
  { id: "python", label: "Python" },
  { id: "java", label: "Java" },
  { id: "csharp", label: "C#" },
  { id: "ruby", label: "Ruby" },
  { id: "react", label: "React" },
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
  ruby: 'gem install featuresignals',
  react: "npm install @featuresignals/react",
  vue: "npm install @featuresignals/vue",
};

const SDK_SNIPPET: Record<string, string> = {
  go: `import fs "github.com/featuresignals/sdk-go"

client := fs.NewClient("YOUR_API_KEY")
defer client.Close()

enabled := client.IsEnabled("my-flag", fs.User{Key: "user-123"})
if enabled {
    // new feature code
}`,
  node: `import { FeatureSignals } from "@featuresignals/sdk";

const client = new FeatureSignals("YOUR_API_KEY");

const enabled = await client.isEnabled("my-flag", {
  key: "user-123",
});`,
  python: `from featuresignals import FeatureSignals

client = FeatureSignals("YOUR_API_KEY")

if client.is_enabled("my-flag", {"key": "user-123"}):
    # new feature code
    pass`,
  java: `import com.featuresignals.SDK;

SDK client = new SDK("YOUR_API_KEY");

boolean enabled = client.isEnabled("my-flag",
    Map.of("key", "user-123"));`,
  csharp: `using FeatureSignals;

var client = new FSClient("YOUR_API_KEY");

bool enabled = client.IsEnabled("my-flag",
    new User { Key = "user-123" });`,
  ruby: `require "featuresignals"

client = FeatureSignals::Client.new("YOUR_API_KEY")

if client.enabled?("my-flag", key: "user-123")
  # new feature code
end`,
  react: `import { FSProvider, useFlag } from "@featuresignals/react";

function App() {
  return (
    <FSProvider apiKey="YOUR_API_KEY" user={{ key: "user-123" }}>
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

export default function OnboardingPage() {
  const router = useRouter();
  const token = useAppStore((s) => s.token);
  const projectId = useAppStore((s) => s.currentProjectId);

  const [loading, setLoading] = useState(true);
  const [currentStep, setCurrentStep] = useState(0);
  const [completed, setCompleted] = useState<Record<string, boolean>>({});

  // Step 2 state
  const [flagForm, setFlagForm] = useState({ key: "", name: "" });
  const [creatingFlag, setCreatingFlag] = useState(false);

  // Step 3 state
  const [selectedSdk, setSelectedSdk] = useState<string>("node");

  // Pricing
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  useEffect(() => {
    api.getPricing().then(setPricing).catch(() => {});
  }, []);

  useEffect(() => {
    if (!token) return;
    api.getOnboarding(token)
      .then((data) => {
        if (data) {
          const steps: Record<string, boolean> = {
            plan_chosen: data.plan_selected,
            flag_created: data.first_flag_created,
            sdk_installed: data.first_sdk_connected,
            completed: data.completed,
          };
          setCompleted(steps);
          const firstIncomplete = STEPS.findIndex((s) => !steps[s.key]);
          setCurrentStep(firstIncomplete === -1 ? STEPS.length - 1 : firstIncomplete);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [token]);

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

  async function handleChooseFree() {
    await markStepComplete("plan_chosen");
    toast("Continuing with Free plan", "success");
  }

  async function handleUpgradePro() {
    if (!token) return;
    try {
      const data = await api.createCheckout(token);
      if (!data) {
        toast("Failed to create checkout session", "error");
        return;
      }
      await markStepComplete("plan_chosen");

      if (data.gateway === "stripe" && data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }

      if (data.gateway === "payu" && data.payu_url) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.payu_url;
        const fields = ["key", "txnid", "hash", "amount", "productinfo", "firstname", "email", "phone", "surl", "furl"];
        for (const field of fields) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = field;
          input.value = (data as unknown as Record<string, string>)[field] ?? "";
          form.appendChild(input);
        }
        document.body.appendChild(form);
        form.submit();
        return;
      }

      toast("Unable to start checkout. Please try again.", "error");
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to start checkout", "error");
    }
  }

  async function handleCreateFlag(e: React.FormEvent) {
    e.preventDefault();
    if (!token || !projectId) {
      toast("No project selected — one will be created for you.", "error");
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
    router.push("/dashboard");
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-32">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-8 px-4 py-8 sm:px-6">
      <div className="text-center">
        <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
          Welcome to <span className="text-indigo-600">FeatureSignals</span>
        </h1>
        <p className="mt-2 text-sm text-slate-500">Let&apos;s get you set up in a few quick steps</p>
      </div>

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
                <div className={cn("mx-1 sm:mx-2 h-0.5 w-8 sm:w-12 md:w-20", done ? "bg-emerald-400" : "bg-slate-200")} />
              )}
            </div>
          );
        })}
      </div>

      {/* Step Content */}
      <Card className="p-4 sm:p-6 md:p-8 shadow-sm">
        {currentStep === 0 && <StepChoosePlan onChooseFree={handleChooseFree} onUpgradePro={handleUpgradePro} completed={!!completed.plan_chosen} pricing={pricing} />}
        {currentStep === 1 && (
          <StepCreateFlag
            form={flagForm}
            setForm={setFlagForm}
            onSubmit={handleCreateFlag}
            creating={creatingFlag}
            completed={!!completed.flag_created}
            onSkip={() => markStepComplete("flag_created")}
          />
        )}
        {currentStep === 2 && (
          <StepInstallSdk
            selectedSdk={selectedSdk}
            setSelectedSdk={setSelectedSdk}
            onComplete={handleSdkComplete}
            completed={!!completed.sdk_installed}
          />
        )}
        {currentStep === 3 && <StepComplete onFinish={handleFinish} />}
      </Card>

      <div className="text-center">
        <button
          onClick={() => router.push("/dashboard")}
          className="text-sm font-medium text-slate-400 transition-colors hover:text-slate-600"
        >
          Skip Onboarding
        </button>
      </div>
    </div>
  );
}

function StepChoosePlan({
  onChooseFree,
  onUpgradePro,
  completed,
  pricing,
}: {
  onChooseFree: () => void;
  onUpgradePro: () => void;
  completed: boolean;
  pricing: PricingConfig | null;
}) {
  const free = pricing?.plans?.free;
  const pro = pricing?.plans?.pro;
  const enterprise = pricing?.plans?.enterprise;

  if (completed) {
    return (
      <div className="text-center py-8">
        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100">
          <Check className="h-8 w-8 text-emerald-600" />
        </div>
        <p className="mt-4 text-lg font-semibold text-slate-900">Plan selected!</p>
        <p className="mt-1 text-sm text-slate-500">You can change your plan anytime in Billing settings.</p>
      </div>
    );
  }

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">Choose Your Plan</h2>
      <p className="mt-1 text-sm text-slate-500">Start free and upgrade as you grow.</p>

      <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
        {/* Free */}
        <Card className="p-5">
          <h3 className="text-base font-semibold text-slate-900">{free?.name ?? "Free"}</h3>
          <p className="mt-1 text-2xl font-bold text-slate-900">{free?.display_price ?? "₹0"}<span className="text-sm font-normal text-slate-400">/{free?.billing_period ?? "mo"}</span></p>
          <ul className="mt-4 space-y-1.5">
            {(free?.features ?? ["1 project", "2 environments", "3 team members"]).map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                {f}
              </li>
            ))}
          </ul>
          <Button variant="secondary" onClick={onChooseFree} className="mt-4 w-full">
            Continue with Free
          </Button>
        </Card>

        {/* Pro */}
        <Card className="border-2 border-indigo-300 bg-indigo-50/30 p-5 ring-1 ring-indigo-100 shadow-sm">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-slate-900">{pro?.name ?? "Pro"}</h3>
            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold text-indigo-700">POPULAR</span>
          </div>
          <p className="mt-1 text-2xl font-bold text-slate-900">{pro?.display_price ?? "₹999"}<span className="text-sm font-normal text-slate-400">/{pro?.billing_period ?? "mo"}</span></p>
          <ul className="mt-4 space-y-1.5">
            {(pro?.features ?? ["Unlimited projects", "Unlimited environments", "Unlimited team members"]).map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="h-3.5 w-3.5 shrink-0 text-indigo-500" />
                {f}
              </li>
            ))}
          </ul>
          <Button onClick={onUpgradePro} className="mt-4 w-full">
            Upgrade to Pro
          </Button>
        </Card>

        {/* Enterprise */}
        <Card className="p-5 sm:col-span-2 md:col-span-1">
          <h3 className="text-base font-semibold text-slate-900">{enterprise?.name ?? "Enterprise"}</h3>
          <p className="mt-1 text-2xl font-bold text-slate-900">{enterprise?.display_price ?? "Custom"}</p>
          <ul className="mt-4 space-y-1.5">
            {(enterprise?.features ?? ["Everything in Pro", "Dedicated support", "Custom SLA", "Self-hosted option"]).map((f) => (
              <li key={f} className="flex items-center gap-2 text-sm text-slate-600">
                <Check className="h-3.5 w-3.5 shrink-0 text-purple-500" />
                {f}
              </li>
            ))}
          </ul>
          <Button variant="secondary" asChild className="mt-4 w-full">
            <a href="mailto:support@featuresignals.com">Contact Sales</a>
          </Button>
        </Card>
      </div>
    </div>
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
      <p className="mt-1 text-sm text-slate-500">Feature flags let you toggle functionality without redeploying.</p>

      <form onSubmit={onSubmit} className="mt-6 space-y-4">
        <div className="space-y-1.5">
          <Label>Flag Key</Label>
          <Input
            value={form.key}
            onChange={(e) => setForm({ ...form, key: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "-") })}
            placeholder="my-new-feature"
            required
          />
          <p className="text-xs text-slate-400">Lowercase letters, numbers, dashes, and underscores only.</p>
        </div>
        <div className="space-y-1.5">
          <Label>Display Name</Label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="My New Feature"
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
}: {
  selectedSdk: string;
  setSelectedSdk: (s: string) => void;
  onComplete: () => void;
  completed: boolean;
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

  return (
    <div>
      <h2 className="text-xl font-semibold text-slate-900">Install the SDK</h2>
      <p className="mt-1 text-sm text-slate-500">Choose your language and follow the quick-start guide.</p>

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
            <button onClick={() => copyText(SDK_SNIPPET[selectedSdk], "snippet")} className="inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-700">
              {copied === "snippet" ? <><ClipboardCheck className="h-3 w-3" /> Copied!</> : <><Copy className="h-3 w-3" /> Copy</>}
            </button>
          </div>
          <pre className="overflow-x-auto rounded-lg bg-slate-900 p-3 sm:p-4 text-xs sm:text-sm text-slate-100">
            <code>{SDK_SNIPPET[selectedSdk]}</code>
          </pre>
        </div>
      </div>

      <Button onClick={onComplete} className="mt-6">
        Mark as Complete
      </Button>
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
          <Link href="/settings/general">Settings</Link>
        </Button>
      </div>

      <Button onClick={onFinish} className="mt-6" size="lg">
        Go to Flag Engine
      </Button>
    </div>
  );
}
