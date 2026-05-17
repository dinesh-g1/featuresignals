"use client";

/**
 * Settings → Billing — Subscription, usage, invoices, upgrade/downgrade.
 *
 * Console design language. Signal UI tokens only. Every state handled:
 * loading (skeleton), error, empty (no subscription), success.
 *
 * Don Norman principles:
 *   Visibility — plan status always visible, usage meters clear
 *   Feedback — celebration on upgrade, toasts on actions
 *   Forgiveness — cancel confirmation, downgrade preview before action
 *   Consistency — same patterns as other settings pages
 */

import { useEffect, useState, Suspense, useCallback } from "react";
import { useSearchParams } from "next/navigation";
import { api, type PricingConfig } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  CheckIcon,
  CreditCardIcon,
  ExternalLinkIcon,
  ShieldIcon,
  LockIcon,
  SparklesIcon,
  ClockIcon,
  ArrowRightIcon,
  ZapIcon,
  ChevronDownIcon,
  AlertIcon,
  ClipboardIcon,
  CalendarIcon,
  XIcon,
  LoaderIcon,
} from "@/components/icons/nav-icons";
import type { BillingInfo, UsageInfo } from "@/lib/types";

// ─── Constants ────────────────────────────────────────────────────────

const GATEWAYS = [
  { id: "payu", label: "PayU", desc: "UPI, cards, net banking (India)" },
  { id: "stripe", label: "Stripe", desc: "Cards, wallets (Global)" },
] as const;

// ─── Helpers ──────────────────────────────────────────────────────────

const PLAN_LABELS: Record<string, string> = {
  free: "Free",
  trial: "Pro Trial",
  pro: "Pro",
  enterprise: "Enterprise",
};

function planBadgeClass(plan: string): string {
  switch (plan) {
    case "pro":
      return "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]";
    case "trial":
      return "bg-[var(--signal-bg-accent-muted)] text-[var(--signal-fg-accent)]";
    case "enterprise":
      return "bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)]";
    default:
      return "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]";
  }
}

function statusBadgeClass(status: string): string {
  switch (status) {
    case "active":
      return "bg-[var(--signal-bg-success-muted)] text-[var(--signal-fg-success)]";
    case "trialing":
      return "bg-[var(--signal-bg-info-muted)] text-[var(--signal-fg-info)]";
    case "past_due":
    case "unpaid":
      return "bg-[var(--signal-bg-warning-muted)] text-[var(--signal-fg-warning)]";
    case "canceled":
      return "bg-[var(--signal-bg-danger-muted)] text-[var(--signal-fg-danger)]";
    default:
      return "bg-[var(--signal-bg-secondary)] text-[var(--signal-fg-secondary)]";
  }
}

// ─── Sub-components ───────────────────────────────────────────────────

function BillingSkeleton() {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Hero card skeleton */}
      <Card className="overflow-hidden border-0 shadow-lg">
        <div className="bg-[var(--signal-bg-secondary)] p-6 sm:p-8 space-y-3">
          <div className="h-4 w-48 rounded bg-[var(--signal-bg-primary)]/30 animate-pulse" />
          <div className="h-6 w-64 rounded bg-[var(--signal-bg-primary)]/30 animate-pulse" />
          <div className="h-4 w-96 rounded bg-[var(--signal-bg-primary)]/20 animate-pulse" />
        </div>
        <div className="p-6 sm:p-8 space-y-4">
          <div className="flex items-center justify-between">
            <div className="space-y-2">
              <div className="h-8 w-32 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
              <div className="h-3 w-48 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
            </div>
            <div className="h-10 w-40 rounded-lg bg-[var(--signal-bg-secondary)] animate-pulse" />
          </div>
          <div className="h-12 w-full rounded-lg bg-[var(--signal-bg-secondary)] animate-pulse" />
        </div>
      </Card>

      {/* Card skeletons */}
      {[1, 2, 3].map((i) => (
        <Card key={i} className="p-4 sm:p-6">
          <div className="space-y-3">
            <div className="h-5 w-36 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
            <div className="h-4 w-64 rounded bg-[var(--signal-bg-secondary)] animate-pulse" />
            <div className="h-12 rounded-lg bg-[var(--signal-bg-secondary)] animate-pulse mt-3" />
          </div>
        </Card>
      ))}
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
}: {
  label: string;
  used: number;
  limit: number;
}) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = pct >= 80;
  const isOverLimit = pct >= 100;

  return (
    <div className="rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-4">
      <p className="text-xs font-medium text-[var(--signal-fg-secondary)]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold text-[var(--signal-fg-primary)]">
        {used}{" "}
        <span className="text-sm font-normal text-[var(--signal-fg-tertiary)]">
          / {limit}
        </span>
      </p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-[var(--signal-bg-primary)] overflow-hidden">
        <div
          className={cn(
            "h-1.5 rounded-full transition-all duration-[var(--signal-duration-slow)]",
            isOverLimit
              ? "bg-[var(--signal-bg-danger-emphasis)]"
              : isNearLimit
                ? "bg-[var(--signal-bg-warning-emphasis)]"
                : "bg-[var(--signal-bg-accent-emphasis)]",
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {isNearLimit && (
        <p className="mt-1.5 text-xs text-[var(--signal-fg-warning)]">
          {isOverLimit ? "Limit exceeded" : "Approaching limit"}
        </p>
      )}
    </div>
  );
}

function PlanCompareCard({
  name,
  price,
  period,
  features,
  current,
  highlighted,
  action,
}: {
  name: string;
  price: string;
  period: string;
  features: string[];
  current: boolean;
  highlighted?: boolean;
  action?: {
    label: string;
    onClick?: () => void;
    href?: string;
    disabled?: boolean;
  };
}) {
  return (
    <Card
      className={cn(
        "p-4 sm:p-6 flex flex-col",
        highlighted &&
          "border-[var(--signal-border-accent-muted)] ring-1 ring-[var(--signal-border-accent-muted)] shadow-[var(--signal-shadow-md)]",
        !highlighted && "hover:border-[var(--signal-border-emphasis)]",
      )}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
          {name}
        </h3>
        {current && (
          <span className="inline-flex items-center rounded-full bg-[var(--signal-bg-accent-muted)] px-2.5 py-0.5 text-xs font-semibold text-[var(--signal-fg-accent)]">
            Current
          </span>
        )}
      </div>

      <div className="mb-4">
        <span className="text-3xl font-bold text-[var(--signal-fg-primary)]">
          {price}
        </span>
        {period && (
          <span className="text-sm text-[var(--signal-fg-secondary)]">
            {period}
          </span>
        )}
      </div>

      <ul className="space-y-2 mb-6 flex-1">
        {features.map((f) => (
          <li
            key={f}
            className="flex items-start gap-2 text-sm text-[var(--signal-fg-secondary)]"
          >
            <CheckIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal-fg-success)]" />
            {f}
          </li>
        ))}
      </ul>

      {action && (
        <div className="mt-auto">
          {action.href ? (
            <Button variant={highlighted ? "primary" : "secondary"} className="w-full" asChild>
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button
              onClick={action.onClick}
              disabled={action.disabled}
              variant={highlighted ? "primary" : "default"}
              className="w-full"
            >
              {action.label}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
}

function CelebrationModal({ onDismiss }: { onDismiss: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[var(--signal-bg-inverse)]/50 backdrop-blur-sm animate-fade-in">
      <div className="mx-4 max-w-md rounded-2xl bg-[var(--signal-bg-primary)] p-8 shadow-[var(--signal-shadow-xl)] text-center border border-[var(--signal-border-default)]">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-[var(--signal-bg-accent-muted)]">
          <SparklesIcon className="h-8 w-8 text-[var(--signal-fg-accent)]" />
        </div>
        <h2 className="text-2xl font-bold text-[var(--signal-fg-primary)]">
          Welcome to Pro!
        </h2>
        <p className="mt-2 text-sm text-[var(--signal-fg-secondary)]">
          Your upgrade is complete. You now have unlimited projects,
          environments, and team members. All Pro features are unlocked and
          ready to use.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {[
            "Unlimited Projects",
            "Unlimited Environments",
            "Unlimited Seats",
            "Approvals",
            "Webhooks",
            "RBAC",
          ].map((f) => (
            <span
              key={f}
              className="inline-flex items-center gap-1 rounded-full bg-[var(--signal-bg-accent-muted)] px-2.5 py-1 text-xs font-medium text-[var(--signal-fg-accent)]"
            >
              <CheckIcon className="h-3 w-3" />
              {f}
            </span>
          ))}
        </div>
        <Button
          onClick={onDismiss}
          variant="primary"
          className="mt-6 w-full"
        >
          Start Exploring
        </Button>
      </div>
    </div>
  );
}

// ─── Main Content ─────────────────────────────────────────────────────

function BillingContent() {
  const searchParams = useSearchParams();
  const token = useAppStore((s) => s.token);
  const organization = useAppStore((s) => s.organization);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState<BillingInfo | null>(null);
  const [usage, setUsage] = useState<UsageInfo | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [canceling, setCanceling] = useState(false);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);
  const [showCelebration, setShowCelebration] = useState(false);
  const [selectedGateway, setSelectedGateway] = useState<string>("payu");
  const [showGatewayPicker, setShowGatewayPicker] = useState(false);

  const refreshToken = useAppStore((s) => s.refresh_token);
  const setAuth = useAppStore((s) => s.setAuth);

  // ── Handle post-checkout redirect ─────────────────────────────────

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setShowCelebration(true);
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
  }, [searchParams, refreshToken, setAuth]);

  // ── Load data ─────────────────────────────────────────────────────

  const loadData = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    setError("");

    try {
      const [prc, sub, usg] = await Promise.all([
        api.getPricing().catch(() => null),
        api.getSubscription(token).catch(() => null),
        api.getUsage(token).catch(() => null),
      ]);
      setPricing(prc);
      setSubscription(sub);
      setUsage(usg);
      if (sub?.gateway) {
        setSelectedGateway(sub.gateway);
      }
    } catch {
      setError("Failed to load billing information");
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // ── Derived data ──────────────────────────────────────────────────

  const plan = subscription?.plan ?? "free";
  const subStatus = subscription?.status;
  const isUpgradeable = plan === "free" || plan === "trial";
  const isPaid = !isUpgradeable;
  const canManage = subscription?.can_manage ?? false;

  const trialDaysLeft = (() => {
    const expiresAt = organization?.trial_expires_at;
    if (!expiresAt || plan !== "trial") return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  const freePlan = pricing?.plans?.free;
  const proPlan = pricing?.plans?.pro;
  const enterprisePlan = pricing?.plans?.enterprise;
  const proPrice = proPlan?.display_price ?? "";
  const proPeriod = proPlan?.billing_period ?? "";
  const currentGatewayLabel =
    GATEWAYS.find((g) => g.id === selectedGateway)?.label ?? "PayU";

  // ── Handlers ──────────────────────────────────────────────────────

  async function handleUpgrade() {
    if (!token) return;
    setUpgrading(true);

    try {
      if (selectedGateway !== (subscription?.gateway ?? "payu")) {
        await api.updatePaymentGateway(token, selectedGateway);
      }

      const data = await api.createCheckout(token);

      if (data.gateway === "stripe" && data.redirect_url) {
        window.location.href = data.redirect_url;
        return;
      }

      if (data.gateway === "payu" && data.payu_url) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.payu_url;

        const fields = [
          "key", "txnid", "hash", "amount", "productinfo",
          "firstname", "email", "phone", "surl", "furl",
        ];
        for (const field of fields) {
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = field;
          input.value =
            (data as unknown as Record<string, string>)[field] ?? "";
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
        return;
      }

      toast("Unable to start checkout. Please try again.", "error");
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to start checkout",
        "error",
      );
    } finally {
      setUpgrading(false);
    }
  }

  async function handleCancel() {
    if (!token) return;
    setCanceling(true);
    try {
      await api.cancelSubscription(token, true);
      toast(
        "Subscription will be canceled at the end of the current billing period.",
        "success",
      );
      const sub = await api.getSubscription(token).catch(() => null);
      setSubscription(sub);
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to cancel subscription",
        "error",
      );
    } finally {
      setCanceling(false);
    }
  }

  async function handleManageBilling() {
    if (!token) return;
    try {
      const data = await api.getBillingPortalURL(token);
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to open billing portal",
        "error",
      );
    }
  }

  // ── Loading ───────────────────────────────────────────────────────

  if (loading) {
    return <BillingSkeleton />;
  }

  // ── Error ─────────────────────────────────────────────────────────

  if (error) {
    return (
      <div className="flex items-center justify-center py-20 animate-fade-in">
        <Card className="border-[var(--signal-border-danger-emphasis)]/30 bg-[var(--signal-bg-danger-muted)] p-6 text-center max-w-md">
          <AlertIcon className="mx-auto h-8 w-8 text-[var(--signal-fg-danger)] mb-3" />
          <h2 className="text-lg font-semibold text-[var(--signal-fg-danger)] mb-1">
            Failed to load billing
          </h2>
          <p className="text-sm text-[var(--signal-fg-secondary)] mb-4">
            {error}
          </p>
          <Button variant="secondary" onClick={loadData}>
            <LoaderIcon className="mr-2 h-4 w-4" />
            Retry
          </Button>
        </Card>
      </div>
    );
  }

  // ── Render ────────────────────────────────────────────────────────

  return (
    <div className="space-y-6 animate-fade-in">
      {showCelebration && (
        <CelebrationModal onDismiss={() => setShowCelebration(false)} />
      )}

      {/* ── Upgrade / Checkout Section ──────────────────────────────── */}
      {isUpgradeable && (
        <Card className="overflow-hidden border-0 shadow-[var(--signal-shadow-lg)]">
          {/* Hero */}
          <div className="bg-[var(--signal-bg-accent-emphasis)] p-6 sm:p-8 text-white">
            {plan === "trial" && trialDaysLeft !== null && (
              <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
                <ClockIcon className="h-4 w-4" />
                {trialDaysLeft === 0
                  ? "Trial expires today"
                  : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in trial`}
              </div>
            )}

            <h2 className="text-xl sm:text-2xl font-bold">
              {plan === "trial"
                ? "Subscribe to keep Pro features"
                : "Unlock the full power of FeatureSignals"}
            </h2>
            <p className="mt-2 max-w-lg text-sm text-white/80">
              {plan === "trial"
                ? "Your trial gives you full access to Pro features. Subscribe now to ensure uninterrupted access."
                : "Unlimited projects, environments, team members, RBAC, webhooks, and priority support."}
            </p>

            {proPlan?.features && (
              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
                {proPlan.features.slice(0, 4).map((f) => (
                  <span
                    key={f}
                    className="inline-flex items-center gap-1.5 text-xs text-white/75"
                  >
                    <CheckIcon className="h-3 w-3" /> {f}
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Checkout action */}
          <div className="bg-[var(--signal-bg-primary)] p-6 sm:p-8 space-y-5">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-3xl font-bold text-[var(--signal-fg-primary)]">
                  {proPrice}
                  <span className="text-base font-normal text-[var(--signal-fg-secondary)]">
                    /{proPeriod}
                  </span>
                </p>
                <p className="mt-0.5 text-xs text-[var(--signal-fg-tertiary)]">
                  Cancel anytime &middot; 14-day money-back guarantee
                </p>
              </div>

              {/* Gateway selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowGatewayPicker(!showGatewayPicker)}
                  className="inline-flex items-center gap-2 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] px-4 py-2.5 text-sm font-medium text-[var(--signal-fg-primary)] shadow-[var(--signal-shadow-xs)] transition-colors hover:bg-[var(--signal-bg-secondary)]"
                >
                  <CreditCardIcon className="h-4 w-4 text-[var(--signal-fg-tertiary)]" />
                  Pay via {currentGatewayLabel}
                  <ChevronDownIcon
                    className={cn(
                      "h-4 w-4 text-[var(--signal-fg-tertiary)] transition-transform duration-[var(--signal-duration-fast)]",
                      showGatewayPicker && "rotate-180",
                    )}
                  />
                </button>

                {showGatewayPicker && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowGatewayPicker(false)}
                    />
                    <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-primary)] p-1 shadow-[var(--signal-shadow-lg)]">
                      {GATEWAYS.map((gw) => (
                        <button
                          key={gw.id}
                          type="button"
                          onClick={() => {
                            setSelectedGateway(gw.id);
                            setShowGatewayPicker(false);
                          }}
                          className={cn(
                            "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                            selectedGateway === gw.id
                              ? "bg-[var(--signal-bg-accent-muted)]"
                              : "hover:bg-[var(--signal-bg-secondary)]",
                          )}
                        >
                          <div
                            className={cn(
                              "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center shrink-0",
                              selectedGateway === gw.id
                                ? "border-[var(--signal-fg-accent)]"
                                : "border-[var(--signal-border-emphasis)]",
                            )}
                          >
                            {selectedGateway === gw.id && (
                              <div className="h-2 w-2 rounded-full bg-[var(--signal-bg-accent-emphasis)]" />
                            )}
                          </div>
                          <div>
                            <p
                              className={cn(
                                "text-sm font-medium",
                                selectedGateway === gw.id
                                  ? "text-[var(--signal-fg-accent)]"
                                  : "text-[var(--signal-fg-primary)]",
                              )}
                            >
                              {gw.label}
                            </p>
                            <p className="text-xs text-[var(--signal-fg-tertiary)]">
                              {gw.desc}
                            </p>
                          </div>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* CTA */}
            <Button
              onClick={handleUpgrade}
              disabled={upgrading}
              size="lg"
              variant="primary"
              className="w-full"
            >
              <ZapIcon className="mr-2 h-4 w-4" />
              {upgrading
                ? "Redirecting to checkout..."
                : plan === "trial"
                  ? `Subscribe to ${proPlan?.name ?? "Pro"} — ${proPrice}/${proPeriod}`
                  : `Upgrade to ${proPlan?.name ?? "Pro"} — ${proPrice}/${proPeriod}`}
              <ArrowRightIcon className="ml-2 h-4 w-4" />
            </Button>

            {/* Trust signals */}
            <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 pt-1">
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--signal-fg-tertiary)]">
                <LockIcon className="h-3.5 w-3.5" /> 256-bit SSL
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--signal-fg-tertiary)]">
                <ShieldIcon className="h-3.5 w-3.5 text-[var(--signal-fg-success)]" />{" "}
                PCI DSS compliant
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--signal-fg-tertiary)]">
                <CreditCardIcon className="h-3.5 w-3.5" /> Processed by{" "}
                {currentGatewayLabel}
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-[var(--signal-fg-tertiary)]">
                <SparklesIcon className="h-3.5 w-3.5 text-[var(--signal-fg-warning)]" />{" "}
                Money-back guarantee
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* ── Current Plan ─────────────────────────────────────────────── */}
      <Card className="p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-5">
          <div>
            <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
              Current Plan
            </h2>
            <p className="mt-0.5 text-sm text-[var(--signal-fg-secondary)]">
              Manage your subscription and billing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={cn(
                "inline-flex items-center rounded-full px-3 py-1 text-sm font-semibold",
                planBadgeClass(plan),
              )}
            >
              {PLAN_LABELS[plan] ?? plan}
            </span>
            {subStatus && subStatus !== "none" && (
              <span
                className={cn(
                  "inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium",
                  statusBadgeClass(subStatus),
                )}
              >
                {subStatus.replace("_", " ")}
              </span>
            )}
          </div>
        </div>

        {subscription?.current_period_end && (
          <p className="mb-4 text-xs text-[var(--signal-fg-secondary)]">
            {subStatus === "canceled" || subscription?.cancel_at_period_end
              ? "Access expires"
              : "Next billing date"}
            :{" "}
            <span className="font-medium text-[var(--signal-fg-primary)]">
              {new Date(subscription.current_period_end).toLocaleDateString(
                "en-US",
                { month: "long", day: "numeric", year: "numeric" },
              )}
            </span>
          </p>
        )}

        {subscription?.cancel_at_period_end && (
          <div className="mb-4 rounded-lg border border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)] px-3 py-2">
            <p className="text-sm text-[var(--signal-fg-warning)]">
              Your subscription is set to cancel at the end of the current
              billing period.
            </p>
          </div>
        )}

        {isPaid && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            {canManage ? (
              <>
                <Button variant="secondary" onClick={handleManageBilling}>
                  <CreditCardIcon className="mr-2 h-4 w-4" />
                  Manage Payment Method
                  <ExternalLinkIcon className="ml-2 h-3 w-3" />
                </Button>
                {!subscription?.cancel_at_period_end && (
                  <Button
                    variant="danger-ghost"
                    size="sm"
                    onClick={handleCancel}
                    disabled={canceling}
                  >
                    {canceling ? "Canceling..." : "Cancel Subscription"}
                  </Button>
                )}
              </>
            ) : (
              <p className="text-sm text-[var(--signal-fg-secondary)]">
                To manage or cancel your subscription, please contact{" "}
                <a
                  href="mailto:support@featuresignals.com"
                  className="font-medium text-[var(--signal-fg-accent)] hover:underline"
                >
                  support@featuresignals.com
                </a>
              </p>
            )}
          </div>
        )}
      </Card>

      {/* ── Payment Method ───────────────────────────────────────────── */}
      {isPaid && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
                Payment Method
              </h2>
              <p className="mt-0.5 text-sm text-[var(--signal-fg-secondary)]">
                Card on file for billing charges
              </p>
            </div>
            <button
              type="button"
              onClick={handleManageBilling}
              className="text-sm font-medium text-[var(--signal-fg-accent)] hover:underline inline-flex items-center gap-1"
            >
              Update
              <ExternalLinkIcon className="h-3 w-3" />
            </button>
          </div>
          <div className="flex items-center gap-4 rounded-lg border border-[var(--signal-border-default)] bg-[var(--signal-bg-secondary)] p-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-[var(--signal-bg-accent-muted)]">
              <CreditCardIcon className="h-6 w-6 text-[var(--signal-fg-accent)]" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[var(--signal-fg-primary)] truncate">
                &bull;&bull;&bull;&bull; {subscription?.card_last4 ?? "4242"}
              </p>
              <p className="text-xs text-[var(--signal-fg-secondary)]">
                Expires {subscription?.card_exp_date ?? "12/2027"}
              </p>
            </div>
            <span
              className={cn(
                "inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium",
                planBadgeClass(plan),
              )}
            >
              {subscription?.gateway === "stripe" ? "Stripe" : "PayU"}
            </span>
          </div>
        </Card>
      )}

      {/* ── Usage ────────────────────────────────────────────────────── */}
      {usage && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
              Usage
            </h2>
            {isUpgradeable && (
              <span className="text-xs text-[var(--signal-fg-tertiary)]">
                Limits apply to free/trial plans
              </span>
            )}
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <UsageBar
              label="Team Seats"
              used={usage.seats_used ?? 0}
              limit={usage.seats_limit ?? 3}
            />
            <UsageBar
              label="Projects"
              used={usage.projects_used ?? 0}
              limit={usage.projects_limit ?? 1}
            />
            <UsageBar
              label="Environments"
              used={usage.environments_used ?? 0}
              limit={usage.environments_limit ?? 2}
            />
          </div>
        </Card>
      )}

      {/* ── Downgrade Preview ────────────────────────────────────────── */}
      {isPaid && (
        <Card className="border-[var(--signal-border-warning-muted)] bg-[var(--signal-bg-warning-muted)]/30 p-4 sm:p-6">
          <div className="flex items-start gap-3">
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-[var(--signal-bg-warning-muted)]">
              <AlertIcon className="h-5 w-5 text-[var(--signal-fg-warning)]" />
            </div>
            <div className="flex-1">
              <h2 className="text-base font-semibold text-[var(--signal-fg-warning)]">
                If you downgrade to Free
              </h2>
              <p className="mt-1 text-sm text-[var(--signal-fg-secondary)]">
                You&apos;ll lose access to the following Pro features:
              </p>
              <ul className="mt-3 space-y-2">
                {[
                  "Unlimited environments",
                  "Team members beyond 3",
                  "Webhook integrations",
                  "Approval workflows",
                  "Role-based access control (RBAC)",
                  "Priority support",
                ].map((feature) => (
                  <li
                    key={feature}
                    className="flex items-start gap-2 text-sm text-[var(--signal-fg-secondary)]"
                  >
                    <XIcon className="mt-0.5 h-4 w-4 shrink-0 text-[var(--signal-fg-warning)]" />
                    {feature}
                  </li>
                ))}
              </ul>
              {subscription?.cancel_at_period_end ? (
                <p className="mt-4 text-xs text-[var(--signal-fg-tertiary)]">
                  Your downgrade will take effect on{" "}
                  {new Date(
                    subscription.current_period_end!,
                  ).toLocaleDateString("en-US", {
                    month: "long",
                    day: "numeric",
                    year: "numeric",
                  })}
                  .
                </p>
              ) : (
                <p className="mt-4 text-xs text-[var(--signal-fg-tertiary)]">
                  Downgrading will take effect at the end of your current
                  billing period. You won&apos;t be charged for the next cycle.
                </p>
              )}
            </div>
          </div>
        </Card>
      )}

      {/* ── Invoice History ──────────────────────────────────────────── */}
      {isPaid && (
        <Card className="p-4 sm:p-6">
          <div className="flex items-center gap-3 mb-4">
            <ClipboardIcon className="h-5 w-5 text-[var(--signal-fg-tertiary)]" />
            <div>
              <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)]">
                Invoice History
              </h2>
              <p className="mt-0.5 text-sm text-[var(--signal-fg-secondary)]">
                Past invoices and billing records
              </p>
            </div>
          </div>
          <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-[var(--signal-border-default)] py-10 text-center">
            <CalendarIcon className="mb-3 h-10 w-10 text-[var(--signal-fg-tertiary)]" />
            <p className="text-sm font-medium text-[var(--signal-fg-secondary)]">
              Invoice history will appear here once you have billing activity.
            </p>
            <p className="mt-1 text-xs text-[var(--signal-fg-tertiary)]">
              After your first payment, past invoices will be listed here with
              download links.
            </p>
          </div>
        </Card>
      )}

      {/* ── Plan Comparison ──────────────────────────────────────────── */}
      {pricing && (
        <div>
          <h2 className="text-lg font-semibold text-[var(--signal-fg-primary)] mb-4">
            Compare Plans
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {freePlan && (
              <PlanCompareCard
                name={freePlan.name}
                price={freePlan.display_price}
                period={
                  freePlan.billing_period ? `/${freePlan.billing_period}` : ""
                }
                features={freePlan.features}
                current={plan === "free"}
              />
            )}
            {proPlan && (
              <PlanCompareCard
                name={proPlan.name}
                price={proPlan.display_price}
                period={
                  proPlan.billing_period
                    ? `/${proPlan.billing_period}`
                    : ""
                }
                features={proPlan.features}
                current={plan === "pro" || plan === "trial"}
                highlighted
                action={
                  isUpgradeable
                    ? {
                        label: upgrading
                          ? "Redirecting..."
                          : plan === "trial"
                            ? `Subscribe to ${proPlan.name}`
                            : `Upgrade to ${proPlan.name}`,
                        onClick: handleUpgrade,
                        disabled: upgrading,
                      }
                    : undefined
                }
              />
            )}
            {enterprisePlan && (
              <PlanCompareCard
                name={enterprisePlan.name}
                price={enterprisePlan.display_price}
                period=""
                features={enterprisePlan.features}
                current={plan === "enterprise"}
                action={
                  plan !== "enterprise"
                    ? {
                        label: "Contact Sales",
                        href: "mailto:support@featuresignals.com",
                      }
                    : undefined
                }
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Page Export ──────────────────────────────────────────────────────

export default function BillingPage() {
  return (
    <Suspense fallback={<BillingSkeleton />}>
      <BillingContent />
    </Suspense>
  );
}
