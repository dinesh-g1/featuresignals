"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { api, type PricingConfig } from "@/lib/api";
import { useAppStore } from "@/stores/app-store";
import { toast } from "@/components/toast";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Check } from "lucide-react";

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

export default function BillingPage() {
  const searchParams = useSearchParams();
  const token = useAppStore((s) => s.token);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [subscription, setSubscription] = useState<any>(null);
  const [usage, setUsage] = useState<any>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [pricing, setPricing] = useState<PricingConfig | null>(null);

  useEffect(() => {
    api.getPricing().then(setPricing).catch(() => {});
  }, []);

  useEffect(() => {
    const status = searchParams.get("status");
    if (status === "success") {
      toast("Payment successful! Your plan has been upgraded to Pro.", "success");
    } else if (status === "failed") {
      toast("Payment failed. Please try again or contact support.", "error");
    }
  }, [searchParams]);

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

  async function handleUpgrade() {
    if (!token) return;
    setUpgrading(true);
    try {
      const data = await api.createCheckout(token);
      const form = document.createElement("form");
      form.method = "POST";
      form.action = data.payu_url;

      const fields = ["key", "txnid", "hash", "amount", "productinfo", "firstname", "email", "phone", "surl", "furl"];
      for (const field of fields) {
        const input = document.createElement("input");
        input.type = "hidden";
        input.name = field;
        input.value = (data as any)[field];
        form.appendChild(input);
      }

      document.body.appendChild(form);
      form.submit();
    } catch (err: any) {
      toast(err.message || "Failed to start checkout", "error");
      setUpgrading(false);
    }
  }

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
                {status === "canceled" ? "Access expires" : "Next billing date"}:{" "}
                <span className="font-medium text-slate-700">
                  {new Date(subscription.current_period_end).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </p>
            )}

            <div className="flex flex-col gap-3 sm:flex-row">
              {!isPaid && (
                <Button onClick={handleUpgrade} disabled={upgrading}>
                  {upgrading ? "Redirecting to PayU..." : "Upgrade to Pro"}
                </Button>
              )}
              {isPaid && (
                <p className="text-sm text-slate-500">
                  To manage or cancel your subscription, please contact{" "}
                  <a href="mailto:support@featuresignals.com" className="font-medium text-indigo-600 hover:text-indigo-700">
                    support@featuresignals.com
                  </a>
                </p>
              )}
            </div>
          </Card>

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
