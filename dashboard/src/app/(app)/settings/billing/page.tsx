"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { api, type PricingConfig } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Skeleton, SettingsPageSkeleton } from "@/components/ui/skeleton";
import {
  Check,
  CreditCard,
  ExternalLink,
  ShieldCheck,
  Lock,
  Sparkles,
  PartyPopper,
  Clock,
  ArrowRight,
  Zap,
  ChevronDown,
  AlertTriangle,
  FileText,
  Calendar,
  X,
} from "lucide-react";
import type { BillingInfo, UsageInfo } from "@/lib/types";

const planBadgeVariant: Record<
  string,
  "default" | "primary" | "purple" | "info"
> = {
  free: "default",
  trial: "info",
  pro: "primary",
  enterprise: "purple",
};

const statusBadgeVariant: Record<
  string,
  "success" | "warning" | "danger" | "info"
> = {
  active: "success",
  past_due: "warning",
  canceled: "danger",
  trialing: "info",
  unpaid: "danger",
};

const GATEWAYS = [
  { id: "payu", label: "PayU", desc: "UPI, cards, net banking (India)" },
  { id: "stripe", label: "Stripe", desc: "Cards, wallets (Global)" },
] as const;

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

  const refreshToken = useAppStore((s) => s.refreshToken);
  const setAuth = useAppStore((s) => s.setAuth);

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

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError("");
    Promise.all([
      api.getPricing().catch(() => null),
      api.getSubscription(token).catch(() => null),
      api.getUsage(token).catch(() => null),
    ])
      .then(([prc, sub, usg]) => {
        setPricing(prc);
        setSubscription(sub);
        setUsage(usg);
        if (sub?.gateway) {
          setSelectedGateway(sub.gateway);
        }
      })
      .catch(() => setError("Failed to load billing information"))
      .finally(() => setLoading(false));
  }, [token]);

  const plan = subscription?.plan || "free";
  const status = subscription?.status;
  const isUpgradeable = plan === "free" || plan === "trial";
  const isPaid = !isUpgradeable;
  const canManage = subscription?.can_manage ?? false;

  async function handleUpgrade() {
    if (!token) return;
    setUpgrading(true);

    try {
      if (selectedGateway !== (subscription?.gateway || "payu")) {
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
          "key",
          "txnid",
          "hash",
          "amount",
          "productinfo",
          "firstname",
          "email",
          "phone",
          "surl",
          "furl",
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
      setUpgrading(false);
    } catch (err: unknown) {
      toast(
        err instanceof Error ? err.message : "Failed to start checkout",
        "error",
      );
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

  return (
    <div className="space-y-6">
      {showCelebration && (
        <CelebrationModal onDismiss={() => setShowCelebration(false)} />
      )}

      {loading ? (
        <div className="space-y-6">
          {/* Upgrade card skeleton */}
          <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-soft">
            <div className="bg-gradient-to-br from-accent/20 via-accent/10 to-teal-800/20 p-6 sm:p-8">
              <Skeleton className="h-4 w-48 bg-white/30 mb-4" />
              <Skeleton className="h-6 w-64 bg-white/30 mb-2" />
              <Skeleton className="h-4 w-96 bg-white/20" />
            </div>
            <div className="p-6 sm:p-8 space-y-4">
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <Skeleton className="h-8 w-32" />
                  <Skeleton className="h-3 w-48" />
                </div>
                <Skeleton className="h-10 w-40 rounded-lg" />
              </div>
              <Skeleton className="h-12 w-full rounded-lg" />
            </div>
          </div>
          <SettingsPageSkeleton />
        </div>
      ) : error ? (
        <Card className="border-red-200 bg-red-50 p-4 sm:p-6 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <Button
            variant="destructive-ghost"
            size="sm"
            onClick={() => window.location.reload()}
            className="mt-2"
          >
            Try again
          </Button>
        </Card>
      ) : (
        <>
          {/* ── Upgrade / Checkout section ────────────────────────────── */}
          {isUpgradeable && (
            <Card className="overflow-hidden border-0 shadow-lg">
              <div className="bg-gradient-to-br from-accent via-accent-dark to-teal-800 p-6 sm:p-8 text-white">
                <div className="relative">
                  {plan === "trial" && trialDaysLeft !== null && (
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
                      <Clock className="h-4 w-4" />
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
                  <p className="mt-2 max-w-lg text-sm text-teal-100">
                    {plan === "trial"
                      ? "Your trial gives you full access to Pro features. Subscribe now to ensure uninterrupted access."
                      : "Unlimited projects, environments, team members, RBAC, webhooks, and priority support."}
                  </p>

                  {proPlan?.features && (
                    <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
                      {proPlan.features.slice(0, 4).map((f) => (
                        <span
                          key={f}
                          className="inline-flex items-center gap-1.5 text-xs text-teal-200"
                        >
                          <Check className="h-3 w-3" /> {f}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Checkout action area */}
              <div className="bg-white p-6 sm:p-8 space-y-5">
                {/* Price + Gateway row */}
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-3xl font-bold text-slate-900">
                      {proPrice}
                      <span className="text-base font-normal text-slate-500">
                        /{proPeriod}
                      </span>
                    </p>
                    <p className="mt-0.5 text-xs text-slate-400">
                      Cancel anytime &middot; 14-day money-back guarantee
                    </p>
                  </div>

                  {/* Gateway selector */}
                  <div className="relative">
                    <button
                      onClick={() => setShowGatewayPicker(!showGatewayPicker)}
                      className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition-colors hover:bg-slate-50"
                    >
                      <CreditCard className="h-4 w-4 text-slate-400" />
                      Pay via {currentGatewayLabel}
                      <ChevronDown
                        className={cn(
                          "h-4 w-4 text-slate-400 transition-transform",
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
                        <div className="absolute right-0 z-20 mt-1 w-56 rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                          {GATEWAYS.map((gw) => (
                            <button
                              key={gw.id}
                              onClick={() => {
                                setSelectedGateway(gw.id);
                                setShowGatewayPicker(false);
                              }}
                              className={cn(
                                "flex w-full items-start gap-3 rounded-md px-3 py-2.5 text-left transition-colors",
                                selectedGateway === gw.id
                                  ? "bg-accent/5"
                                  : "hover:bg-slate-50",
                              )}
                            >
                              <div
                                className={cn(
                                  "mt-0.5 h-4 w-4 rounded-full border-2 flex items-center justify-center",
                                  selectedGateway === gw.id
                                    ? "border-accent"
                                    : "border-slate-300",
                                )}
                              >
                                {selectedGateway === gw.id && (
                                  <div className="h-2 w-2 rounded-full bg-accent" />
                                )}
                              </div>
                              <div>
                                <p
                                  className={cn(
                                    "text-sm font-medium",
                                    selectedGateway === gw.id
                                      ? "text-accent-dark"
                                      : "text-slate-700",
                                  )}
                                >
                                  {gw.label}
                                </p>
                                <p className="text-xs text-slate-400">
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

                {/* CTA Button */}
                <Button
                  onClick={handleUpgrade}
                  disabled={upgrading}
                  size="lg"
                  className="w-full bg-accent hover:bg-accent-dark text-white shadow-md"
                >
                  <Zap className="mr-2 h-4 w-4" />
                  {upgrading
                    ? "Redirecting to checkout..."
                    : plan === "trial"
                      ? `Subscribe to ${proPlan?.name ?? "Pro"} — ${proPrice}/${proPeriod}`
                      : `Upgrade to ${proPlan?.name ?? "Pro"} — ${proPrice}/${proPeriod}`}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>

                {/* Trust signals */}
                <div className="flex flex-wrap items-center justify-center gap-x-5 gap-y-1.5 pt-1">
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <Lock className="h-3.5 w-3.5" /> 256-bit SSL
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" /> PCI
                    DSS compliant
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <CreditCard className="h-3.5 w-3.5" /> Processed by{" "}
                    {currentGatewayLabel}
                  </span>
                  <span className="inline-flex items-center gap-1.5 text-xs text-slate-400">
                    <Sparkles className="h-3.5 w-3.5 text-amber-500" />{" "}
                    Money-back guarantee
                  </span>
                </div>
              </div>
            </Card>
          )}

          {/* ── Current Plan ─────────────────────────────────────────── */}
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">
                  Current Plan
                </h2>
                <p className="mt-0.5 text-sm text-slate-500">
                  Manage your subscription and billing
                </p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={planBadgeVariant[plan] || "default"}
                  className="px-3 py-1 text-sm font-semibold"
                >
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </Badge>
                {status && status !== "none" && (
                  <Badge
                    variant={statusBadgeVariant[status] || "success"}
                    className="px-2.5 py-0.5 text-xs"
                  >
                    {status.replace("_", " ")}
                  </Badge>
                )}
              </div>
            </div>

            {subscription?.current_period_end && (
              <p className="mb-3 text-xs text-slate-500">
                {status === "canceled" || subscription?.cancel_at_period_end
                  ? "Access expires"
                  : "Next billing date"}
                :{" "}
                <span className="font-medium text-slate-700">
                  {new Date(subscription.current_period_end).toLocaleDateString(
                    "en-US",
                    { month: "long", day: "numeric", year: "numeric" },
                  )}
                </span>
              </p>
            )}

            {subscription?.cancel_at_period_end && (
              <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                <p className="text-sm text-amber-800">
                  Your subscription is set to cancel at the end of the current
                  billing period.
                </p>
              </div>
            )}

            {isPaid && (
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                {canManage && (
                  <>
                    <Button variant="secondary" onClick={handleManageBilling}>
                      <CreditCard className="mr-2 h-4 w-4" />
                      Manage Payment Method
                      <ExternalLink className="ml-2 h-3 w-3" />
                    </Button>
                    {!subscription?.cancel_at_period_end && (
                      <Button
                        variant="destructive-ghost"
                        size="sm"
                        onClick={handleCancel}
                        disabled={canceling}
                      >
                        {canceling ? "Canceling..." : "Cancel Subscription"}
                      </Button>
                    )}
                  </>
                )}
                {!canManage && (
                  <p className="text-sm text-slate-500">
                    To manage or cancel your subscription, please contact{" "}
                    <a
                      href="mailto:support@featuresignals.com"
                      className="font-medium text-accent hover:text-accent-dark"
                    >
                      support@featuresignals.com
                    </a>
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* ── Payment Method ───────────────────────────────────────── */}
          {isPaid && (
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Payment Method
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Card on file for billing charges
                  </p>
                </div>
                <button
                  onClick={handleManageBilling}
                  className="text-sm font-medium text-accent hover:text-accent-dark inline-flex items-center gap-1"
                >
                  Update
                  <ExternalLink className="h-3 w-3" />
                </button>
              </div>
              <div className="flex items-center gap-4 rounded-lg border border-slate-200 bg-slate-50 p-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-accent/10">
                  <CreditCard className="h-6 w-6 text-accent" />
                </div>
                <div className="flex-1">
                  <p className="text-sm font-medium text-slate-900">
                    •••• {subscription?.card_last4 ?? "4242"}
                  </p>
                  <p className="text-xs text-slate-500">
                    Expires {subscription?.card_exp_date ?? "12/2027"}
                  </p>
                </div>
                <Badge variant="success" className="px-2 py-0.5 text-xs">
                  {subscription?.gateway === "stripe" ? "Stripe" : "PayU"}
                </Badge>
              </div>
            </Card>
          )}

          {/* ── Usage ────────────────────────────────────────────────── */}
          {usage && (
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Usage</h2>
                {isUpgradeable && (
                  <span className="text-xs text-slate-400">
                    Limits apply to free/trial plans
                  </span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <UsageCard
                  label="Team Seats"
                  used={usage.seats_used ?? 0}
                  limit={usage.seats_limit ?? 3}
                />
                <UsageCard
                  label="Projects"
                  used={usage.projects_used ?? 0}
                  limit={usage.projects_limit ?? 1}
                />
                <UsageCard
                  label="Environments"
                  used={usage.environments_used ?? 0}
                  limit={usage.environments_limit ?? 2}
                />
              </div>
            </Card>
          )}

          {/* ── Downgrade Preview ────────────────────────────────────── */}
          {isPaid && (
            <Card className="border-amber-200 bg-amber-50/50 p-4 sm:p-6">
              <div className="flex items-start gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h2 className="text-base font-semibold text-amber-900">
                    If you downgrade to Free
                  </h2>
                  <p className="mt-1 text-sm text-amber-700">
                    You'll lose access to the following Pro features:
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
                        className="flex items-start gap-2 text-sm text-amber-800"
                      >
                        <X
                          className="mt-0.5 h-4 w-4 shrink-0 text-amber-500"
                          strokeWidth={2}
                        />
                        {feature}
                      </li>
                    ))}
                  </ul>
                  {subscription?.cancel_at_period_end ? (
                    <p className="mt-4 text-xs text-amber-600">
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
                    <p className="mt-4 text-xs text-amber-600">
                      Downgrading will take effect at the end of your current
                      billing period. You won't be charged for the next cycle.
                    </p>
                  )}
                </div>
              </div>
            </Card>
          )}

          {/* ── Invoice History ──────────────────────────────────────── */}
          {isPaid && (
            <Card className="p-4 sm:p-6">
              <div className="flex items-center gap-3 mb-4">
                <FileText className="h-5 w-5 text-slate-400" />
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Invoice History
                  </h2>
                  <p className="mt-0.5 text-sm text-slate-500">
                    Past invoices and billing records
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-300 py-10 text-center">
                <Calendar className="mb-3 h-10 w-10 text-slate-300" />
                <p className="text-sm font-medium text-slate-500">
                  Invoice history will appear here once you have billing
                  activity.
                </p>
                <p className="mt-1 text-xs text-slate-400">
                  After your first payment, past invoices will be listed here
                  with download links.
                </p>
              </div>
            </Card>
          )}

          {/* ── Plan Comparison ──────────────────────────────────────── */}
          {pricing && (
            <div>
              <h2 className="text-lg font-semibold text-slate-900 mb-4">
                Compare Plans
              </h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {freePlan && (
                  <PlanCard
                    name={freePlan.name}
                    price={freePlan.display_price}
                    period={
                      freePlan.billing_period
                        ? `/${freePlan.billing_period}`
                        : ""
                    }
                    features={freePlan.features}
                    current={plan === "free"}
                  />
                )}
                {proPlan && (
                  <PlanCard
                    name={proPlan.name}
                    price={proPlan.display_price}
                    period={
                      proPlan.billing_period ? `/${proPlan.billing_period}` : ""
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
                  <PlanCard
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
        </>
      )}
    </div>
  );
}

export default function BillingPage() {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <BillingContent />
    </Suspense>
  );
}

function UsageCard({
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
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {used}{" "}
        <span className="text-sm font-normal text-slate-400">/ {limit}</span>
      </p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200">
        <div
          className={cn(
            "h-1.5 rounded-full transition-all",
            isNearLimit ? "bg-amber-500" : "bg-accent",
            `w-[${pct}%]`,
          )}
        />
      </div>
    </div>
  );
}

function PlanCard({
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
        "p-4 sm:p-6",
        highlighted
          ? "border-accent/30 bg-accent-glass ring-1 ring-accent/10 shadow-sm"
          : "hover:shadow-lg hover:border-slate-300",
      )}
    >
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-slate-900">{name}</h3>
        {current && (
          <Badge variant="primary" className="px-2.5 py-0.5 text-xs">
            Current
          </Badge>
        )}
      </div>
      <div className="mt-2">
        <span className="text-3xl font-bold text-slate-900">{price}</span>
        {period && <span className="text-sm text-slate-500">{period}</span>}
      </div>
      <ul className="mt-4 space-y-2">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2 text-sm text-slate-600">
            <Check
              className="mt-0.5 h-4 w-4 shrink-0 text-accent"
              strokeWidth={2}
            />
            {f}
          </li>
        ))}
      </ul>
      {action && (
        <div className="mt-6">
          {action.href ? (
            <Button variant="secondary" className="w-full" asChild>
              <a href={action.href}>{action.label}</a>
            </Button>
          ) : (
            <Button
              onClick={action.onClick}
              disabled={action.disabled}
              variant={highlighted ? "primary" : "secondary"}
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-sm animate-fade-in">
      <div className="mx-4 max-w-md rounded-2xl bg-white p-8 shadow-2xl text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-accent/10 to-teal-100">
          <PartyPopper className="h-8 w-8 text-accent" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome to Pro!</h2>
        <p className="mt-2 text-sm text-slate-600">
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
              className="inline-flex items-center gap-1 rounded-full bg-accent/5 px-2.5 py-1 text-xs font-medium text-accent-dark"
            >
              <Check className="h-3 w-3" />
              {f}
            </span>
          ))}
        </div>
        <button
          onClick={onDismiss}
          className="mt-6 w-full rounded-lg bg-accent py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-accent-dark transition-colors"
        >
          Start Exploring
        </button>
      </div>
    </div>
  );
}
