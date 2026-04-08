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
import { Check, CreditCard, ExternalLink, ShieldCheck, Lock, Sparkles, PartyPopper, Clock, ArrowRight, Zap } from "lucide-react";
import type { BillingInfo, CheckoutResponse, UsageInfo } from "@/lib/types";

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  past_due: "bg-amber-50 text-amber-700 ring-amber-100",
  canceled: "bg-red-50 text-red-700 ring-red-100",
  trialing: "bg-blue-50 text-blue-700 ring-blue-100",
  unpaid: "bg-red-50 text-red-700 ring-red-100",
};

const planBadgeVariant: Record<string, "default" | "primary" | "purple" | "info"> = {
  free: "default",
  trial: "info",
  pro: "primary",
  enterprise: "purple",
};

const statusBadgeVariant: Record<string, "success" | "warning" | "danger" | "info"> = {
  active: "success",
  past_due: "warning",
  canceled: "danger",
  trialing: "info",
  unpaid: "danger",
};

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
  const [showGatewaySelect, setShowGatewaySelect] = useState(false);
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    api.getPricing().then(setPricing).catch(() => {});
  }, []);

  const refreshToken = useAppStore((s) => s.refreshToken);
  const setAuth = useAppStore((s) => s.setAuth);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      setShowCelebration(true);
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
    setLoading(true);
    setError("");
    Promise.all([
      api.getSubscription(token).catch(() => null),
      api.getUsage(token).catch(() => null),
    ])
      .then(([sub, usg]) => {
        setSubscription(sub);
        setUsage(usg);
      })
      .catch(() => setError("Failed to load billing information"))
      .finally(() => setLoading(false));
  }, [token]);

  const plan = subscription?.plan || "free";
  const status = subscription?.status;
  const isUpgradeable = plan === "free" || plan === "trial";
  const isPaid = !isUpgradeable;
  const gateway = subscription?.gateway || "payu";
  const canManage = subscription?.can_manage ?? false;

  async function handleUpgrade() {
    if (!token) return;
    setUpgrading(true);
    try {
      const data = await api.createCheckout(token);

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
      setUpgrading(false);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to start checkout", "error");
      setUpgrading(false);
    }
  }

  async function handleCancel() {
    if (!token) return;
    setCanceling(true);
    try {
      await api.cancelSubscription(token, true);
      toast("Subscription will be canceled at the end of the current billing period.", "success");
      const sub = await api.getSubscription(token).catch(() => null);
      setSubscription(sub);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to cancel subscription", "error");
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
      toast(err instanceof Error ? err.message : "Failed to open billing portal", "error");
    }
  }

  async function handleGatewayChange(newGateway: string) {
    if (!token) return;
    try {
      await api.updatePaymentGateway(token, newGateway);
      toast(`Payment gateway updated to ${newGateway === "stripe" ? "Stripe" : "PayU"}.`, "success");
      const sub = await api.getSubscription(token).catch(() => null);
      setSubscription(sub);
      setShowGatewaySelect(false);
    } catch (err: unknown) {
      toast(err instanceof Error ? err.message : "Failed to update payment gateway", "error");
    }
  }

  const trialDaysLeft = (() => {
    const expiresAt = organization?.trial_expires_at;
    if (!expiresAt || plan !== "trial") return null;
    const diff = new Date(expiresAt).getTime() - Date.now();
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  })();

  return (
    <div className="space-y-6">
      {showCelebration && <CelebrationModal onDismiss={() => setShowCelebration(false)} />}

      {loading ? (
        <LoadingSpinner fullPage />
      ) : error ? (
        <Card className="border-red-200 bg-red-50 p-4 sm:p-6 text-center">
          <p className="text-sm font-medium text-red-700">{error}</p>
          <Button variant="destructive-ghost" size="sm" onClick={() => window.location.reload()} className="mt-2">
            Try again
          </Button>
        </Card>
      ) : (
        <>
          {/* Hero CTA for upgradeable users */}
          {isUpgradeable && (
            <div className="relative overflow-hidden rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-purple-700 p-6 sm:p-8 text-white shadow-lg">
              <div className="absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/5" />
              <div className="absolute -right-4 -bottom-4 h-24 w-24 rounded-full bg-white/5" />

              <div className="relative">
                {plan === "trial" && trialDaysLeft !== null && (
                  <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-white/15 px-3 py-1.5 text-sm font-medium backdrop-blur-sm">
                    <Clock className="h-4 w-4" />
                    {trialDaysLeft === 0 ? "Trial expires today" : `${trialDaysLeft} day${trialDaysLeft === 1 ? "" : "s"} left in trial`}
                  </div>
                )}

                <h2 className="text-xl sm:text-2xl font-bold">
                  {plan === "trial" ? "Subscribe to keep Pro features" : "Unlock the full power of FeatureSignals"}
                </h2>
                <p className="mt-2 max-w-lg text-sm text-indigo-100">
                  {plan === "trial"
                    ? "Your trial gives you full access to Pro features. Subscribe now to ensure uninterrupted access when your trial ends."
                    : "Unlimited projects, environments, team members, RBAC, webhooks, and priority support — all for one flat price."}
                </p>

                <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center">
                  <Button
                    onClick={handleUpgrade}
                    disabled={upgrading}
                    className="bg-white text-indigo-700 hover:bg-indigo-50 shadow-md"
                  >
                    <Zap className="mr-2 h-4 w-4" />
                    {upgrading ? "Redirecting..." : plan === "trial" ? "Subscribe to Pro" : "Upgrade to Pro"}
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                  <span className="text-sm text-indigo-200">
                    {pricing?.plans?.pro?.display_price ?? "₹999"}/{pricing?.plans?.pro?.billing_period ?? "month"} &middot; Cancel anytime
                  </span>
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1">
                  {["Unlimited projects", "Unlimited environments", "Unlimited seats", "RBAC & audit logs"].map((f) => (
                    <span key={f} className="inline-flex items-center gap-1.5 text-xs text-indigo-200">
                      <Check className="h-3 w-3" />
                      {f}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Current Plan — compact for paid, informational for upgradeable */}
          <Card className="p-4 sm:p-6">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-4">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
                <p className="mt-0.5 text-sm text-slate-500">Manage your subscription and billing</p>
              </div>
              <div className="flex items-center gap-3">
                <Badge
                  variant={planBadgeVariant[plan] || "default"}
                  className="px-3 py-1 text-sm font-semibold"
                >
                  {plan.charAt(0).toUpperCase() + plan.slice(1)}
                </Badge>
                {status && status !== "none" && (
                  <Badge variant={statusBadgeVariant[status] || "success"} className="px-2.5 py-0.5 text-xs">
                    {status.replace("_", " ")}
                  </Badge>
                )}
              </div>
            </div>

            {subscription?.current_period_end && (
              <p className="mb-3 text-xs text-slate-500">
                {status === "canceled" || subscription?.cancel_at_period_end ? "Access expires" : "Next billing date"}:{" "}
                <span className="font-medium text-slate-700">
                  {new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </p>
            )}

            {subscription?.cancel_at_period_end && (
              <div className="mb-3 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                <p className="text-sm text-amber-800">Your subscription is set to cancel at the end of the current billing period.</p>
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
                      <Button variant="destructive-ghost" size="sm" onClick={handleCancel} disabled={canceling}>
                        {canceling ? "Canceling..." : "Cancel Subscription"}
                      </Button>
                    )}
                  </>
                )}
                {!canManage && (
                  <p className="text-sm text-slate-500">
                    To manage or cancel your subscription, please contact{" "}
                    <a href="mailto:support@featuresignals.com" className="font-medium text-indigo-600 hover:text-indigo-700">
                      support@featuresignals.com
                    </a>
                  </p>
                )}
              </div>
            )}
          </Card>

          {/* Usage */}
          {usage && (
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-slate-900">Usage</h2>
                {isUpgradeable && (
                  <span className="text-xs text-slate-400">Limits apply to free/trial plans</span>
                )}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <UsageCard label="Team Seats" used={usage.seats_used ?? 0} limit={usage.seats_limit ?? 3} />
                <UsageCard label="Projects" used={usage.projects_used ?? 0} limit={usage.projects_limit ?? 1} />
                <UsageCard label="Environments" used={usage.environments_used ?? 0} limit={usage.environments_limit ?? 2} />
              </div>
            </Card>
          )}

          {/* Payment Gateway + Trust Signals */}
          {isUpgradeable && (
            <Card className="p-4 sm:p-6">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-lg font-semibold text-slate-900">Payment Gateway</h2>
                {!showGatewaySelect && (
                  <Button variant="ghost" size="sm" onClick={() => setShowGatewaySelect(true)}>
                    Change
                  </Button>
                )}
              </div>
              <p className="text-sm text-slate-500 mb-3">
                Your checkout will use <span className="font-medium text-slate-700">{gateway === "stripe" ? "Stripe" : "PayU"}</span>.
              </p>
              {showGatewaySelect && (
                <div className="flex gap-3 mb-4">
                  <Button
                    variant={gateway === "payu" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => handleGatewayChange("payu")}
                  >
                    PayU (India)
                  </Button>
                  <Button
                    variant={gateway === "stripe" ? "primary" : "secondary"}
                    size="sm"
                    onClick={() => handleGatewayChange("stripe")}
                  >
                    Stripe (Global)
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setShowGatewaySelect(false)}>
                    Cancel
                  </Button>
                </div>
              )}
              <PaymentTrustSignals gateway={gateway} />
            </Card>
          )}

          {/* Plan Comparison */}
          <div>
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Compare Plans</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <PlanCard
                name={pricing?.plans?.free?.name ?? "Free"}
                price={pricing?.plans?.free?.display_price ?? "₹0"}
                period={pricing?.plans?.free?.billing_period ? `/${pricing.plans.free.billing_period}` : "/month"}
                features={pricing?.plans?.free?.features ?? ["1 project", "2 environments", "3 team members", "Community support"]}
                current={plan === "free"}
              />
              <PlanCard
                name={pricing?.plans?.pro?.name ?? "Pro"}
                price={pricing?.plans?.pro?.display_price ?? "₹999"}
                period={pricing?.plans?.pro?.billing_period ? `/${pricing.plans.pro.billing_period}` : "/month"}
                features={pricing?.plans?.pro?.features ?? ["Unlimited projects", "Unlimited environments", "Unlimited team members", "Priority support"]}
                current={plan === "pro" || plan === "trial"}
                highlighted
                action={
                  isUpgradeable
                    ? { label: upgrading ? "Redirecting..." : (plan === "trial" ? "Subscribe to Pro" : "Upgrade to Pro"), onClick: handleUpgrade, disabled: upgrading }
                    : undefined
                }
              />
              <PlanCard
                name={pricing?.plans?.enterprise?.name ?? "Enterprise"}
                price={pricing?.plans?.enterprise?.display_price ?? "Custom"}
                period=""
                features={pricing?.plans?.enterprise?.features ?? ["Everything in Pro", "Dedicated support", "Custom SLA", "Self-hosted option"]}
                current={plan === "enterprise"}
                action={
                  plan !== "enterprise"
                    ? { label: "Contact Sales", href: "mailto:support@featuresignals.com" }
                    : undefined
                }
              />
            </div>
          </div>
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

function UsageCard({ label, used, limit }: { label: string; used: number; limit: number }) {
  const pct = limit > 0 ? Math.min((used / limit) * 100, 100) : 0;
  const isNearLimit = pct >= 80;
  return (
    <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">
        {used} <span className="text-sm font-normal text-slate-400">/ {limit}</span>
      </p>
      <div className="mt-2 h-1.5 w-full rounded-full bg-slate-200">
        <div
          className={cn("h-1.5 rounded-full transition-all", isNearLimit ? "bg-amber-500" : "bg-indigo-500")}
          style={{ width: `${pct}%` }}
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
  action?: { label: string; onClick?: () => void; href?: string; disabled?: boolean };
}) {
  return (
    <Card
      className={cn(
        "p-4 sm:p-6",
        highlighted
          ? "border-indigo-300 bg-indigo-50/30 ring-1 ring-indigo-100 shadow-sm"
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
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-indigo-500" strokeWidth={2} />
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
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-indigo-100 to-purple-100">
          <PartyPopper className="h-8 w-8 text-indigo-600" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900">Welcome to Pro!</h2>
        <p className="mt-2 text-sm text-slate-600">
          Your upgrade is complete. You now have unlimited projects, environments, and team members.
          All Pro features are unlocked and ready to use.
        </p>
        <div className="mt-4 flex flex-wrap justify-center gap-2">
          {["Unlimited Projects", "Unlimited Environments", "Unlimited Seats", "Approvals", "Webhooks", "RBAC"].map((f) => (
            <span key={f} className="inline-flex items-center gap-1 rounded-full bg-indigo-50 px-2.5 py-1 text-xs font-medium text-indigo-700">
              <Check className="h-3 w-3" />
              {f}
            </span>
          ))}
        </div>
        <button
          onClick={onDismiss}
          className="mt-6 w-full rounded-lg bg-indigo-600 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-indigo-700 transition-colors"
        >
          Start Exploring
        </button>
      </div>
    </div>
  );
}

function PaymentTrustSignals({ gateway }: { gateway: string }) {
  return (
    <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2 rounded-lg border border-slate-100 bg-slate-50/50 px-4 py-3">
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Lock className="h-3.5 w-3.5 text-slate-400" />
        256-bit SSL encrypted
      </span>
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <ShieldCheck className="h-3.5 w-3.5 text-emerald-500" />
        PCI DSS compliant
      </span>
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <CreditCard className="h-3.5 w-3.5 text-slate-400" />
        Processed by {gateway === "stripe" ? "Stripe" : "PayU"}
      </span>
      <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
        <Sparkles className="h-3.5 w-3.5 text-amber-500" />
        14-day money-back guarantee
      </span>
    </div>
  );
}
