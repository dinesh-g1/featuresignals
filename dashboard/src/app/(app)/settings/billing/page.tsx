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
import { Check, CreditCard, ExternalLink } from "lucide-react";
import type { BillingInfo, CheckoutResponse, UsageInfo } from "@/lib/types";

const statusColors: Record<string, string> = {
  active: "bg-emerald-50 text-emerald-700 ring-emerald-100",
  past_due: "bg-amber-50 text-amber-700 ring-amber-100",
  canceled: "bg-red-50 text-red-700 ring-red-100",
  trialing: "bg-blue-50 text-blue-700 ring-blue-100",
  unpaid: "bg-red-50 text-red-700 ring-red-100",
};

const planBadgeVariant: Record<string, "default" | "primary" | "purple"> = {
  free: "default",
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

  useEffect(() => {
    api.getPricing().then(setPricing).catch(() => {});
  }, []);

  const refreshToken = useAppStore((s) => s.refreshToken);
  const setAuth = useAppStore((s) => s.setAuth);

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
  const isPaid = plan !== "free";
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

  const userRole = organization ? "owner" : null;

  return (
    <div className="space-y-6">
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
          {/* Current Plan */}
          <Card className="p-4 sm:p-6 hover:shadow-lg hover:border-slate-300">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Current Plan</h2>
                <p className="mt-1 text-sm text-slate-500">Manage your subscription and billing</p>
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
              <p className="mb-4 text-xs text-slate-500">
                {status === "canceled" || subscription?.cancel_at_period_end ? "Access expires" : "Next billing date"}:{" "}
                <span className="font-medium text-slate-700">
                  {new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </p>
            )}

            {subscription?.cancel_at_period_end && (
              <div className="mb-4 rounded-md bg-amber-50 border border-amber-200 px-3 py-2">
                <p className="text-sm text-amber-800">Your subscription is set to cancel at the end of the current billing period.</p>
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              {!isPaid && (
                <Button onClick={handleUpgrade} disabled={upgrading}>
                  {upgrading ? "Redirecting..." : "Upgrade to Pro"}
                </Button>
              )}
              {isPaid && canManage && (
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
              {isPaid && !canManage && (
                <p className="text-sm text-slate-500">
                  To manage or cancel your subscription, please contact{" "}
                  <a href="mailto:support@featuresignals.com" className="font-medium text-indigo-600 hover:text-indigo-700">
                    support@featuresignals.com
                  </a>
                </p>
              )}
            </div>
          </Card>

          {/* Payment Gateway */}
          {!isPaid && (
            <Card className="p-4 sm:p-6 hover:shadow-lg hover:border-slate-300">
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
                <div className="flex gap-3 mt-3">
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
            </Card>
          )}

          {/* Usage */}
          {usage && (
            <Card className="p-4 sm:p-6 hover:shadow-lg hover:border-slate-300">
              <h2 className="text-lg font-semibold text-slate-900 mb-4">Usage</h2>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <UsageCard label="Team Seats" used={usage.seats_used ?? 0} limit={usage.seats_limit ?? 3} />
                <UsageCard label="Projects" used={usage.projects_used ?? 0} limit={usage.projects_limit ?? 1} />
                <UsageCard label="Environments" used={usage.environments_used ?? 0} limit={usage.environments_limit ?? 2} />
              </div>
            </Card>
          )}

          {/* Plan Comparison */}
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
              current={plan === "pro"}
              highlighted
              action={
                plan === "free"
                  ? { label: upgrading ? "Redirecting..." : "Upgrade to Pro", onClick: handleUpgrade, disabled: upgrading }
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
